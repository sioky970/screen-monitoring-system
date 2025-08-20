#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屏幕截图管理模块

功能：
- 定时截取屏幕截图
- 图片压缩和优化
- 上传到服务器
- 错误处理和重试
"""

import io
import json
import time
import threading
import requests
import platform
from typing import Optional, Tuple
from pathlib import Path
from PIL import Image
from datetime import datetime

# 剪贴板支持
try:
    import pyperclip
    CLIPBOARD_AVAILABLE = True
except ImportError:
    CLIPBOARD_AVAILABLE = False

# 检查ImageGrab是否可用（主要在Windows和macOS上）
try:
    from PIL import ImageGrab
    IMAGEGRAB_AVAILABLE = True
except ImportError:
    IMAGEGRAB_AVAILABLE = False

# 在Linux上使用测试截图模式
if platform.system() == "Linux":
    # 在Linux环境下，直接使用测试截图模式
    LINUX_TEST_MODE = True
    GNOME_SCREENSHOT_AVAILABLE = False
else:
    LINUX_TEST_MODE = False
    # 在非Linux系统上尝试使用其他截图方法
    if not IMAGEGRAB_AVAILABLE:
        try:
            import subprocess
            # 检查是否有gnome-screenshot或scrot
            result = subprocess.run(['which', 'gnome-screenshot'], capture_output=True)
            if result.returncode == 0:
                GNOME_SCREENSHOT_AVAILABLE = True
            else:
                result = subprocess.run(['which', 'scrot'], capture_output=True)
                GNOME_SCREENSHOT_AVAILABLE = result.returncode == 0
        except:
            GNOME_SCREENSHOT_AVAILABLE = False
    else:
        GNOME_SCREENSHOT_AVAILABLE = False

try:
    from mozjpeg_lossless_optimization import optimize
    MOZJPEG_AVAILABLE = True
except ImportError:
    MOZJPEG_AVAILABLE = False

from core.config import AppConfig
from modules.blockchain_detector import BlockchainAddressDetector
from utils.system_info import SystemInfoCollector


class ScreenshotManager:
    """屏幕截图管理器"""
    
    def __init__(self, config: AppConfig, logger, client_id_manager, whitelist_manager=None, violation_reporter=None):
        """
        初始化截图管理器
        
        Args:
            config: 应用配置
            logger: 日志记录器
            client_id_manager: 客户端ID管理器
            whitelist_manager: 白名单管理器
            violation_reporter: 违规事件上报器
        """
        self.config = config
        self.logger = logger
        self.client_id_manager = client_id_manager
        self._running = False
        self._stop_event = threading.Event()
        self._last_screenshot_time = 0
        
        # HTTP会话
        self.session = requests.Session()
        self.session.timeout = config.server.timeout
        
        # 初始化区块链地址检测器
        self.blockchain_detector = BlockchainAddressDetector(
            logger=logger,
            whitelist_manager=whitelist_manager,
            violation_reporter=violation_reporter
        )

        # 系统信息收集器
        self.system_info = SystemInfoCollector()

        self.logger.info("截图管理器初始化完成")
    
    def start(self) -> None:
        """启动截图管理器"""
        if self._running:
            self.logger.warning("截图管理器已在运行中")
            return
        
        self._running = True
        self.logger.info("截图管理器已启动")
        
        # 主循环
        self.logger.info(f"截图管理器主循环开始，间隔: {self.config.screenshot.interval}秒")
        while self._running and not self._stop_event.is_set():
            try:
                current_time = time.time()
                time_since_last = current_time - self._last_screenshot_time
                
                self.logger.debug(f"检查截图时间: 当前时间={current_time}, 上次截图时间={self._last_screenshot_time}, 间隔={time_since_last}秒")
                
                # 检查是否需要截图
                if time_since_last >= self.config.screenshot.interval:
                    self.logger.info(f"开始截图，距离上次截图已过 {time_since_last:.1f} 秒")
                    self._take_and_upload_screenshot()
                    self._last_screenshot_time = current_time
                
                # 短暂休眠
                time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"截图管理器运行异常: {e}")
                time.sleep(5)  # 出错后等待5秒再继续
    
    def stop(self) -> None:
        """停止截图管理器"""
        if not self._running:
            return
        
        self._running = False
        self._stop_event.set()
        
        # 关闭HTTP会话
        try:
            self.session.close()
        except:
            pass
        
        self.logger.info("截图管理器已停止")
    
    def _take_and_upload_screenshot(self) -> None:
        """截取并上传屏幕截图"""
        try:
            self.logger.info("开始截取屏幕...")
            # 截取屏幕
            screenshot_data = self._capture_screen()
            if not screenshot_data:
                self.logger.warning("截图失败，跳过本次上传")
                return

            self.logger.info(f"截图成功，数据大小: {len(screenshot_data)} 字节")
            # 上传截图
            self.logger.info("开始上传截图...")
            success = self._upload_screenshot(screenshot_data)
            if success:
                self.logger.info("截图上传成功")
            else:
                self.logger.warning("截图上传失败")
                
        except Exception as e:
            self.logger.error(f"截图和上传过程异常: {e}")
            import traceback
            self.logger.error(f"异常详情: {traceback.format_exc()}")
    
    def _capture_screen(self) -> Optional[bytes]:
        """截取屏幕截图
        
        Returns:
            压缩后的图片数据，如果失败返回None
        """
        try:
            screenshot = None
            
            if LINUX_TEST_MODE:
                # Linux测试模式：直接使用测试截图
                screenshot = self._capture_screen_linux()
            elif IMAGEGRAB_AVAILABLE:
                # 使用PIL ImageGrab（Windows/macOS）
                if self.config.screenshot.primary_screen_only:
                    # 只截取主屏幕
                    screenshot = ImageGrab.grab()
                else:
                    # 截取所有屏幕
                    screenshot = ImageGrab.grab(all_screens=True)
            elif GNOME_SCREENSHOT_AVAILABLE:
                # 在Linux上使用gnome-screenshot或scrot
                screenshot = self._capture_screen_linux()
            else:
                self.logger.error("截图失败：当前平台不支持截图功能")
                return None
            
            if not screenshot:
                self.logger.error("截图失败：无法获取屏幕图像")
                return None
            
            # 压缩和优化图片
            compressed_data = self._compress_image(screenshot)
            
            self.logger.debug(f"截图成功，压缩后大小: {len(compressed_data)} 字节")
            return compressed_data
            
        except Exception as e:
            self.logger.error(f"截图失败: {e}")
            return None
    
    def _compress_image(self, image: Image.Image) -> bytes:
        """压缩图片
        
        Args:
            image: PIL图片对象
        
        Returns:
            压缩后的图片数据
        """
        # 获取原始尺寸
        width, height = image.size
        
        # 计算缩放比例
        max_long_side = self.config.screenshot.max_long_side
        if max(width, height) > max_long_side:
            if width > height:
                new_width = max_long_side
                new_height = int(height * max_long_side / width)
            else:
                new_height = max_long_side
                new_width = int(width * max_long_side / height)
            
            # 缩放图片
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            self.logger.debug(f"图片已缩放: {width}x{height} -> {new_width}x{new_height}")
        
        # 转换为RGB模式（如果需要）
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # 压缩图片
        quality = self.config.screenshot.quality
        max_file_size = self.config.screenshot.max_file_size
        
        # 尝试不同的质量设置，直到文件大小满足要求
        for attempt_quality in range(quality, 10, -10):
            buffer = io.BytesIO()
            image.save(
                buffer, 
                format=self.config.screenshot.format,
                quality=attempt_quality,
                optimize=True
            )
            
            compressed_data = buffer.getvalue()
            
            if len(compressed_data) <= max_file_size or attempt_quality <= 20:
                # 使用MozJPEG进行无损优化
                if MOZJPEG_AVAILABLE and self.config.screenshot.format.upper() == 'JPEG':
                    try:
                        optimized_data = optimize(compressed_data)
                        original_size = len(compressed_data)
                        optimized_size = len(optimized_data)
                        compression_ratio = (original_size - optimized_size) / original_size * 100
                        self.logger.debug(f"MozJPEG优化: {original_size} -> {optimized_size} bytes (减少 {compression_ratio:.1f}%)")
                        self.logger.debug(f"图片压缩完成，质量: {attempt_quality}, 大小: {optimized_size} 字节")
                        return optimized_data
                    except Exception as e:
                        self.logger.warning(f"MozJPEG优化失败，使用原始压缩: {e}")
                        self.logger.debug(f"图片压缩完成，质量: {attempt_quality}, 大小: {len(compressed_data)} 字节")
                        return compressed_data
                else:
                    self.logger.debug(f"图片压缩完成，质量: {attempt_quality}, 大小: {len(compressed_data)} 字节")
                    return compressed_data
        
        # 如果还是太大，使用最低质量
        buffer = io.BytesIO()
        image.save(
            buffer, 
            format=self.config.screenshot.format,
            quality=10,
            optimize=True
        )
        
        compressed_data = buffer.getvalue()
        
        # 尝试MozJPEG优化最低质量的结果
        if MOZJPEG_AVAILABLE and self.config.screenshot.format.upper() == 'JPEG':
            try:
                optimized_data = optimize(compressed_data)
                self.logger.debug(f"最低质量MozJPEG优化: {len(compressed_data)} -> {len(optimized_data)} bytes")
                return optimized_data
            except Exception as e:
                self.logger.warning(f"最低质量MozJPEG优化失败: {e}")
        
        return compressed_data
    
    def _upload_screenshot(self, screenshot_data: bytes) -> bool:
        """
        上传截图到服务器（使用合并API）

        Args:
            screenshot_data: 截图数据

        Returns:
            是否上传成功
        """
        client_id = self.client_id_manager.get_client_uid()
        url = f"{self.config.server.api_base_url}/security/screenshots/upload-with-heartbeat"
        
        # 获取剪贴板内容
        clipboard_content = self._get_clipboard_content()
        
        # 本地检测区块链地址
        detection_result = self.blockchain_detector.detect_and_validate(clipboard_content)
        
        # 如果检测到违规地址，记录日志并上报
        if detection_result['has_violations']:
            self.logger.warning(f"检测到违规区块链地址: {detection_result['violations']}")
            # 违规事件已在detector中自动上报
        
        # 准备文件数据
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.{self.config.screenshot.format.lower()}"
        
        files = {
            'file': (filename, screenshot_data, f'image/{self.config.screenshot.format.lower()}')
        }
        
        # 准备表单数据（合并API期望的字段）
        data = {
            'clientId': client_id,
            # 心跳相关字段
            'ipAddress': self.system_info.get_ip_address(),
            'hostname': self.system_info.get_computer_name(),
            'osInfo': self.system_info.get_os_version(),
            'version': self.config.client.version,
            'metadata': json.dumps({
                'platform': 'Python',
                'capabilities': {
                    'screenshot': True,
                    'clipboard_monitor': self.config.clipboard.enabled,
                    'blockchain_detection': True,
                    'whitelist_sync': self.config.whitelist.enabled
                },
                'timestamp': datetime.now().isoformat()
            })
        }

        # 只在有值时添加可选字段
        if clipboard_content:
            data['clipboardContent'] = clipboard_content

        detected_addresses = detection_result.get('detected_addresses', [])
        if detected_addresses:
            data['detectedAddresses'] = ','.join(detected_addresses)
            data['hasViolations'] = str(detection_result['has_violations']).lower()
        
        # 重试上传
        for attempt in range(self.config.server.max_retries):
            try:
                response = self.session.post(
                    url,
                    files=files,
                    data=data,
                    timeout=self.config.server.timeout
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    if result.get('success'):
                        self.logger.debug(f"截图上传成功: {filename}")
                        return True
                    else:
                        self.logger.warning(f"服务器返回错误: {result.get('message', '未知错误')}")
                else:
                    self.logger.warning(f"HTTP错误: {response.status_code} - {response.text}")
                
            except requests.exceptions.Timeout:
                self.logger.warning(f"上传超时 (尝试 {attempt + 1}/{self.config.server.max_retries})")
            except requests.exceptions.ConnectionError:
                self.logger.warning(f"连接错误 (尝试 {attempt + 1}/{self.config.server.max_retries})")
            except Exception as e:
                self.logger.error(f"上传异常: {e} (尝试 {attempt + 1}/{self.config.server.max_retries})")
            
            # 重试前等待
            if attempt < self.config.server.max_retries - 1:
                time.sleep(self.config.server.retry_delay)
        
        self.logger.error(f"截图上传失败，已重试 {self.config.server.max_retries} 次")
        return False
    
    def _get_clipboard_content(self) -> str:
        """
        获取剪贴板内容
        
        Returns:
            剪贴板文本内容，如果获取失败返回空字符串
        """
        if not CLIPBOARD_AVAILABLE:
            return ''
        
        try:
            content = pyperclip.paste()
            return content if content else ''
        except Exception as e:
            self.logger.debug(f"获取剪贴板内容失败: {e}")
            return ''
    
    def take_screenshot_now(self) -> bool:
        """立即截取并上传一张截图
        
        Returns:
            是否成功
        """
        try:
            self._take_and_upload_screenshot()
            return True
        except Exception as e:
            self.logger.error(f"立即截图失败: {e}")
            return False
    
    def _capture_screen_linux(self) -> Optional[Image.Image]:
        """在Linux上截取屏幕（使用指定的测试截图文件）
        
        Returns:
            PIL图片对象，如果失败返回None
        """
        try:
            # 使用用户指定的测试截图文件
            test_screenshot_path = Path(__file__).parent.parent.parent / "test_screenshots" / "wechat_2025-08-19_100645_444.jpg"
            
            if test_screenshot_path.exists():
                self.logger.debug(f"使用指定的测试截图: {test_screenshot_path.name}")
                
                # 读取并返回图片
                screenshot = Image.open(test_screenshot_path)
                return screenshot
            else:
                self.logger.warning(f"指定的测试截图文件不存在: {test_screenshot_path}")
            
            # 如果指定文件不存在，尝试使用其他测试截图
            test_screenshots_dir = Path(__file__).parent.parent.parent / "test_screenshots"
            
            if test_screenshots_dir.exists():
                # 获取所有测试截图文件
                screenshot_files = list(test_screenshots_dir.glob("*.jpg"))
                
                if screenshot_files:
                    # 使用第一个可用的测试截图
                    selected_file = screenshot_files[0]
                    self.logger.debug(f"使用备用测试截图: {selected_file.name}")
                    
                    # 读取并返回图片
                    screenshot = Image.open(selected_file)
                    return screenshot
                else:
                    self.logger.warning("测试截图目录中没有找到jpg文件")
            else:
                self.logger.warning(f"测试截图目录不存在: {test_screenshots_dir}")
            
            # 如果没有测试截图，尝试真实截图
            import tempfile
            import subprocess
            
            # 创建临时文件
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                tmp_path = tmp_file.name
            
            # 尝试使用gnome-screenshot
            result = subprocess.run([
                'gnome-screenshot', '-f', tmp_path
            ], capture_output=True, timeout=10)
            
            if result.returncode != 0:
                # 如果gnome-screenshot失败，尝试scrot
                result = subprocess.run([
                    'scrot', tmp_path
                ], capture_output=True, timeout=10)
            
            if result.returncode == 0:
                # 读取截图文件
                screenshot = Image.open(tmp_path)
                # 删除临时文件
                Path(tmp_path).unlink(missing_ok=True)
                return screenshot
            else:
                self.logger.error(f"Linux截图命令执行失败: {result.stderr.decode()}")
                Path(tmp_path).unlink(missing_ok=True)
                return None
                
        except Exception as e:
            self.logger.error(f"Linux截图失败: {e}")
            return None
    
    def get_screen_info(self) -> dict:
        """获取屏幕信息
        
        Returns:
            屏幕信息字典
        """
        try:
            screenshot = None
            
            if IMAGEGRAB_AVAILABLE:
                # 获取屏幕截图以获取尺寸信息
                screenshot = ImageGrab.grab()
            elif GNOME_SCREENSHOT_AVAILABLE:
                screenshot = self._capture_screen_linux()
            
            if screenshot:
                width, height = screenshot.size
            else:
                # 如果无法截图，返回默认值
                width, height = 1920, 1080
            
            return {
                'width': width,
                'height': height,
                'primary_screen_only': self.config.screenshot.primary_screen_only,
                'format': self.config.screenshot.format,
                'quality': self.config.screenshot.quality,
                'interval': self.config.screenshot.interval
            }
        except Exception as e:
            self.logger.error(f"获取屏幕信息失败: {e}")
            return {}