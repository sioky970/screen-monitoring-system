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
import time
import threading
import requests
from typing import Optional, Tuple
from pathlib import Path
from PIL import Image, ImageGrab
from datetime import datetime

try:
    from mozjpeg_lossless_optimization import optimize
    MOZJPEG_AVAILABLE = True
except ImportError:
    MOZJPEG_AVAILABLE = False

from core.config import AppConfig


class ScreenshotManager:
    """屏幕截图管理器"""
    
    def __init__(self, config: AppConfig, logger, client_id_manager):
        """初始化截图管理器
        
        Args:
            config: 应用配置
            logger: 日志记录器
            client_id_manager: 客户端ID管理器
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
        
        self.logger.info("截图管理器初始化完成")
    
    def start(self) -> None:
        """启动截图管理器"""
        if self._running:
            self.logger.warning("截图管理器已在运行中")
            return
        
        self._running = True
        self.logger.info("截图管理器已启动")
        
        # 主循环
        while self._running and not self._stop_event.is_set():
            try:
                current_time = time.time()
                
                # 检查是否需要截图
                if (current_time - self._last_screenshot_time) >= self.config.screenshot.interval:
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
            # 截取屏幕
            screenshot_data = self._capture_screen()
            if not screenshot_data:
                self.logger.warning("截图失败，跳过本次上传")
                return
            
            # 上传截图
            success = self._upload_screenshot(screenshot_data)
            if success:
                self.logger.debug("截图上传成功")
            else:
                self.logger.warning("截图上传失败")
                
        except Exception as e:
            self.logger.error(f"截图和上传过程异常: {e}")
    
    def _capture_screen(self) -> Optional[bytes]:
        """截取屏幕截图
        
        Returns:
            压缩后的图片数据，如果失败返回None
        """
        try:
            # 截取屏幕
            if self.config.screenshot.primary_screen_only:
                # 只截取主屏幕
                screenshot = ImageGrab.grab()
            else:
                # 截取所有屏幕
                screenshot = ImageGrab.grab(all_screens=True)
            
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
        """上传截图到服务器
        
        Args:
            screenshot_data: 截图数据
        
        Returns:
            是否上传成功
        """
        client_id = self.client_id_manager.get_client_uid()
        url = f"{self.config.server.api_base_url}/security/screenshots/upload"
        
        # 准备文件数据
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.{self.config.screenshot.format.lower()}"
        
        files = {
            'file': (filename, screenshot_data, f'image/{self.config.screenshot.format.lower()}')
        }
        
        # 准备表单数据
        data = {
            'clientId': self.client_id_manager.get_client_uid(),
            'clipboardContent': ''  # 暂时为空，后续可以集成剪贴板监控
        }
        
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
    
    def get_screen_info(self) -> dict:
        """获取屏幕信息
        
        Returns:
            屏幕信息字典
        """
        try:
            # 获取屏幕截图以获取尺寸信息
            screenshot = ImageGrab.grab()
            width, height = screenshot.size
            
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