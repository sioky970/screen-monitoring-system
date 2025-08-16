#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
剪贴板监控模块

功能：
- 监控剪贴板内容变化
- 检测区块链地址
- 白名单验证
- 违规事件上报
"""

import re
import time
import threading
import win32clipboard
import win32con
import io
import base64
from typing import Optional, Dict, List, Set
from datetime import datetime

from PIL import Image, ImageGrab
try:
    from mozjpeg_lossless_optimization import optimize
    MOZJPEG_AVAILABLE = True
except ImportError:
    MOZJPEG_AVAILABLE = False

from core.config import AppConfig


class ClipboardMonitor:
    """剪贴板监控器"""
    
    def __init__(self, config: AppConfig, client_id: str, logger, whitelist_manager, violation_reporter):
        """初始化剪贴板监控器
        
        Args:
            config: 应用配置
            client_id: 客户端ID
            logger: 日志记录器
            whitelist_manager: 白名单管理器
            violation_reporter: 违规事件上报器
        """
        self.config = config
        self.client_id = client_id
        self.logger = logger
        self.whitelist_manager = whitelist_manager
        self.violation_reporter = violation_reporter
        
        self._running = False
        self._stop_event = threading.Event()
        self._last_clipboard_content = ""
        self._last_check_time = 0
        
        # 编译区块链地址正则表达式
        self._blockchain_patterns = self._compile_blockchain_patterns()
        
        # 检测统计
        self._detection_stats = {
            'total_checks': 0,
            'content_changes': 0,
            'blockchain_detections': 0,
            'violations_reported': 0
        }
        
        self.logger.info("剪贴板监控器初始化完成")
    
    def _compile_blockchain_patterns(self) -> Dict[str, List[re.Pattern]]:
        """编译区块链地址正则表达式
        
        Returns:
            编译后的正则表达式字典
        """
        patterns = {}
        
        for blockchain_type, pattern_list in self.config.blockchain.patterns.items():
            compiled_patterns = []
            
            if isinstance(pattern_list, list):
                # 多个模式
                for pattern in pattern_list:
                    try:
                        compiled_patterns.append(re.compile(pattern, re.IGNORECASE))
                    except re.error as e:
                        self.logger.warning(f"无效的正则表达式 {blockchain_type}: {pattern} - {e}")
            else:
                # 单个模式
                try:
                    compiled_patterns.append(re.compile(pattern_list, re.IGNORECASE))
                except re.error as e:
                    self.logger.warning(f"无效的正则表达式 {blockchain_type}: {pattern_list} - {e}")
            
            if compiled_patterns:
                patterns[blockchain_type] = compiled_patterns
        
        self.logger.info(f"已编译 {len(patterns)} 种区块链地址模式")
        return patterns
    
    def start(self) -> None:
        """启动剪贴板监控器"""
        if self._running:
            self.logger.warning("剪贴板监控器已在运行中")
            return
        
        if not self.config.clipboard.enabled:
            self.logger.info("剪贴板监控已禁用")
            return
        
        self._running = True
        self.logger.info("剪贴板监控器已启动")
        
        # 获取初始剪贴板内容
        self._last_clipboard_content = self._get_clipboard_content() or ""
        
        # 主监控循环
        while self._running and not self._stop_event.is_set():
            try:
                current_time = time.time()
                
                # 检查是否需要检测
                if (current_time - self._last_check_time) >= self.config.clipboard.check_interval:
                    self._check_clipboard()
                    self._last_check_time = current_time
                
                # 短暂休眠
                time.sleep(0.1)
                
            except Exception as e:
                self.logger.error(f"剪贴板监控异常: {e}")
                time.sleep(1)  # 出错后等待1秒再继续
    
    def stop(self) -> None:
        """停止剪贴板监控器"""
        if not self._running:
            return
        
        self._running = False
        self._stop_event.set()
        
        # 输出统计信息
        self.logger.info(f"剪贴板监控统计: {self._detection_stats}")
        self.logger.info("剪贴板监控器已停止")
    
    def _check_clipboard(self) -> None:
        """检查剪贴板内容"""
        try:
            self._detection_stats['total_checks'] += 1
            
            # 获取当前剪贴板内容
            current_content = self._get_clipboard_content()
            
            if current_content is None:
                return
            
            # 检查内容是否发生变化
            if current_content != self._last_clipboard_content:
                self._detection_stats['content_changes'] += 1
                self.logger.debug(f"剪贴板内容发生变化，长度: {len(current_content)}")
                
                # 检测区块链地址
                self._detect_blockchain_addresses(current_content)
                
                # 更新最后内容
                self._last_clipboard_content = current_content
                
        except Exception as e:
            self.logger.error(f"剪贴板检查异常: {e}")
    
    def _get_clipboard_content(self) -> Optional[str]:
        """获取剪贴板文本内容
        
        Returns:
            剪贴板文本内容，如果获取失败返回None
        """
        try:
            win32clipboard.OpenClipboard()
            
            # 检查是否有文本格式
            if not win32clipboard.IsClipboardFormatAvailable(win32con.CF_UNICODETEXT):
                return None
            
            # 获取文本内容
            content = win32clipboard.GetClipboardData(win32con.CF_UNICODETEXT)
            
            # 限制内容长度
            if len(content) > self.config.clipboard.max_content_length:
                content = content[:self.config.clipboard.max_content_length]
                self.logger.debug(f"剪贴板内容过长，已截断到 {self.config.clipboard.max_content_length} 字符")
            
            return content
            
        except Exception as e:
            self.logger.debug(f"获取剪贴板内容失败: {e}")
            return None
        finally:
            try:
                win32clipboard.CloseClipboard()
            except:
                pass
    
    def _detect_blockchain_addresses(self, content: str) -> None:
        """检测区块链地址
        
        Args:
            content: 要检测的文本内容
        """
        if not content or not content.strip():
            return
        
        detected_addresses = []
        
        # 遍历所有区块链类型
        for blockchain_type, patterns in self._blockchain_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(content)
                
                for match in matches:
                    address = match.strip()
                    if address and address not in [addr['address'] for addr in detected_addresses]:
                        detected_addresses.append({
                            'type': blockchain_type,
                            'address': address,
                            'position': content.find(address)
                        })
        
        if detected_addresses:
            self._detection_stats['blockchain_detections'] += len(detected_addresses)
            self.logger.info(f"检测到 {len(detected_addresses)} 个区块链地址")
            
            # 处理检测到的地址
            self._process_detected_addresses(content, detected_addresses)
    
    def _process_detected_addresses(self, content: str, addresses: List[Dict]) -> None:
        """处理检测到的区块链地址
        
        Args:
            content: 原始剪贴板内容
            addresses: 检测到的地址列表
        """
        for addr_info in addresses:
            address = addr_info['address']
            blockchain_type = addr_info['type']
            
            self.logger.info(f"检测到{blockchain_type}地址: {address}")
            
            # 检查白名单
            is_whitelisted = self._check_whitelist(address, blockchain_type)
            
            if not is_whitelisted:
                # 不在白名单中，上报违规事件
                self._report_violation(content, addr_info)
            else:
                self.logger.debug(f"地址在白名单中: {address}")
    
    def _check_whitelist(self, address: str, blockchain_type: str) -> bool:
        """检查地址是否在白名单中
        
        Args:
            address: 区块链地址
            blockchain_type: 区块链类型
        
        Returns:
            是否在白名单中
        """
        if not self.whitelist_manager:
            return False
        
        try:
            return self.whitelist_manager.is_address_whitelisted(address, blockchain_type)
        except Exception as e:
            self.logger.error(f"白名单检查异常: {e}")
            return False
    
    def _report_violation(self, content: str, addr_info: Dict) -> None:
        """上报违规事件
        
        Args:
            content: 剪贴板内容
            addr_info: 地址信息
        """
        try:
            # 捕获违规截图
            screenshot_data = self._capture_violation_screenshot()
            
            violation_data = {
                'clientId': self.client_id,
                'violationType': 'BLOCKCHAIN_ADDRESS',
                'violationContent': addr_info['address'],
                'additionalData': {
                    'blockchainType': addr_info['type'],
                    'fullClipboardContent': content,
                    'detectionTime': datetime.now().isoformat(),
                    'position': addr_info['position'],
                    'contentLength': len(content),
                    'contentPreview': content[:200] if len(content) > 200 else content
                }
            }
            
            # 如果成功捕获截图，添加到违规数据中
            if screenshot_data:
                violation_data['screenshot'] = {
                    'data': base64.b64encode(screenshot_data).decode('utf-8'),
                    'format': 'jpeg',
                    'size': len(screenshot_data),
                    'compressed_with_mozjpeg': MOZJPEG_AVAILABLE
                }
                self.logger.debug(f"违规截图已捕获，大小: {len(screenshot_data)} bytes")
            
            if self.violation_reporter:
                success = self.violation_reporter.report_violation(violation_data)
                if success:
                    self._detection_stats['violations_reported'] += 1
                    self.logger.warning(f"已上报违规事件: {addr_info['type']}地址 {addr_info['address']}")
                else:
                    self.logger.error(f"违规事件上报失败: {addr_info['address']}")
            else:
                self.logger.warning(f"违规事件上报器未初始化，无法上报: {addr_info['address']}")
                
        except Exception as e:
            self.logger.error(f"上报违规事件异常: {e}")
    
    def _capture_violation_screenshot(self) -> Optional[bytes]:
        """捕获违规截图
        
        Returns:
            压缩后的截图数据，失败时返回None
        """
        try:
            # 捕获屏幕截图
            screenshot = ImageGrab.grab()
            
            # 转换为RGB模式
            if screenshot.mode != 'RGB':
                screenshot = screenshot.convert('RGB')
            
            # 压缩截图
            return self._compress_violation_screenshot(screenshot)
            
        except Exception as e:
            self.logger.error(f"捕获违规截图失败: {e}")
            return None
    
    def _compress_violation_screenshot(self, image: Image.Image) -> bytes:
        """压缩违规截图
        
        Args:
            image: PIL图片对象
        
        Returns:
            压缩后的图片数据
        """
        # 缩放图片到合适大小（违规截图不需要太高分辨率）
        max_dimension = 1920  # 最大边长
        width, height = image.size
        max_side = max(width, height)
        
        if max_side > max_dimension:
            scale = max_dimension / max_side
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # 压缩图片
        quality = 85  # 违规截图使用较高质量
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=quality, optimize=True)
        jpeg_data = buffer.getvalue()
        
        # 使用MozJPEG进行无损优化
        if MOZJPEG_AVAILABLE:
            try:
                optimized_data = optimize(jpeg_data)
                original_size = len(jpeg_data)
                optimized_size = len(optimized_data)
                compression_ratio = (original_size - optimized_size) / original_size * 100
                self.logger.debug(f"违规截图MozJPEG优化: {original_size} -> {optimized_size} bytes (减少 {compression_ratio:.1f}%)")
                return optimized_data
            except Exception as e:
                self.logger.warning(f"违规截图MozJPEG优化失败，使用原始压缩: {e}")
                return jpeg_data
        else:
            self.logger.debug("MozJPEG不可用，违规截图使用标准JPEG压缩")
            return jpeg_data
    
    def get_detection_stats(self) -> Dict:
        """获取检测统计信息
        
        Returns:
            统计信息字典
        """
        return self._detection_stats.copy()
    
    def test_detection(self, test_content: str) -> List[Dict]:
        """测试检测功能
        
        Args:
            test_content: 测试内容
        
        Returns:
            检测到的地址列表
        """
        detected_addresses = []
        
        for blockchain_type, patterns in self._blockchain_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(test_content)
                
                for match in matches:
                    address = match.strip()
                    if address and address not in [addr['address'] for addr in detected_addresses]:
                        detected_addresses.append({
                            'type': blockchain_type,
                            'address': address,
                            'position': test_content.find(address)
                        })
        
        return detected_addresses
    
    def add_test_content_to_clipboard(self, content: str) -> bool:
        """添加测试内容到剪贴板（用于测试）
        
        Args:
            content: 要添加的内容
        
        Returns:
            是否成功
        """
        try:
            win32clipboard.OpenClipboard()
            win32clipboard.EmptyClipboard()
            win32clipboard.SetClipboardText(content)
            self.logger.info(f"已添加测试内容到剪贴板: {content[:50]}...")
            return True
        except Exception as e:
            self.logger.error(f"添加测试内容到剪贴板失败: {e}")
            return False
        finally:
            try:
                win32clipboard.CloseClipboard()
            except:
                pass