#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
违规事件上报模块

功能：
- 收集和上报违规事件
- 事件队列管理
- 重试机制
- 本地缓存
"""

import json
import time
import queue
import threading
import requests
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime

from core.config import AppConfig


class ViolationReporter:
    """违规事件上报器"""
    
    def __init__(self, config: AppConfig, client_id: str, logger):
        """初始化违规事件上报器
        
        Args:
            config: 应用配置
            client_id: 客户端ID
            logger: 日志记录器
        """
        self.config = config
        self.client_id = client_id
        self.logger = logger
        
        # 事件队列
        self._event_queue = queue.Queue(maxsize=1000)
        self._running = False
        self._stop_event = threading.Event()
        
        # HTTP会话
        self.session = requests.Session()
        self.session.timeout = config.server.timeout
        
        # 本地缓存文件
        self._cache_file = self._get_cache_file_path()
        
        # 统计信息
        self._stats = {
            'total_events': 0,
            'successful_reports': 0,
            'failed_reports': 0,
            'cached_events': 0
        }
        
        # 加载缓存的事件
        self._load_cached_events()
        
        self.logger.info("违规事件上报器初始化完成")
    
    def _get_cache_file_path(self) -> Path:
        """获取缓存文件路径"""
        project_root = Path(__file__).parent.parent.parent
        return project_root / "logs" / "violation_cache.json"
    
    def start(self) -> None:
        """启动违规事件上报器"""
        if self._running:
            self.logger.warning("违规事件上报器已在运行中")
            return
        
        self._running = True
        
        # 启动上报线程
        self._report_thread = threading.Thread(
            target=self._report_worker,
            name="ViolationReporter",
            daemon=True
        )
        self._report_thread.start()
        
        self.logger.info("违规事件上报器已启动")
    
    def stop(self) -> None:
        """停止违规事件上报器"""
        if not self._running:
            return
        
        self._running = False
        self._stop_event.set()
        
        # 等待上报线程结束
        if hasattr(self, '_report_thread') and self._report_thread.is_alive():
            self._report_thread.join(timeout=5)
        
        # 保存未上报的事件到缓存
        self._save_pending_events()
        
        # 关闭HTTP会话
        try:
            self.session.close()
        except:
            pass
        
        # 输出统计信息
        self.logger.info(f"违规事件上报统计: {self._stats}")
        self.logger.info("违规事件上报器已停止")
    
    def report_violation(self, violation_data: Dict) -> bool:
        """上报违规事件
        
        Args:
            violation_data: 违规事件数据
        
        Returns:
            是否成功添加到队列
        """
        try:
            # 添加基础信息
            violation_data.update({
                'client_id': self.client_id,
                'report_time': datetime.now().isoformat(),
                'event_id': f"{self.client_id}_{int(time.time() * 1000)}"
            })
            
            # 添加到队列
            self._event_queue.put(violation_data, block=False)
            self._stats['total_events'] += 1
            
            self.logger.debug(f"违规事件已添加到队列: {violation_data.get('type', 'unknown')}")
            return True
            
        except queue.Full:
            self.logger.error("违规事件队列已满，无法添加新事件")
            return False
        except Exception as e:
            self.logger.error(f"添加违规事件到队列失败: {e}")
            return False
    
    def _report_worker(self) -> None:
        """上报工作线程"""
        while self._running and not self._stop_event.is_set():
            try:
                # 从队列获取事件（超时1秒）
                try:
                    violation_data = self._event_queue.get(timeout=1)
                except queue.Empty:
                    continue
                
                # 尝试上报事件
                success = self._send_violation_report(violation_data)
                
                if success:
                    self._stats['successful_reports'] += 1
                    self.logger.debug(f"违规事件上报成功: {violation_data.get('event_id')}")
                else:
                    self._stats['failed_reports'] += 1
                    # 上报失败，重新加入队列（如果队列未满）
                    try:
                        self._event_queue.put(violation_data, block=False)
                    except queue.Full:
                        # 队列满了，保存到缓存
                        self._cache_event(violation_data)
                
                # 标记任务完成
                self._event_queue.task_done()
                
            except Exception as e:
                self.logger.error(f"违规事件上报工作线程异常: {e}")
                time.sleep(1)
    
    def _send_violation_report(self, violation_data: Dict) -> bool:
        """发送违规事件报告（使用新的统一接口）

        Args:
            violation_data: 违规事件数据

        Returns:
            是否发送成功
        """
        # 使用新的统一违规上报接口
        url = f"{self.config.server.api_base_url}/security/violations/report-with-screenshot"

        # 重试发送
        for attempt in range(self.config.server.max_retries):
            try:
                # 准备multipart/form-data格式的数据
                files_data, form_data = self._prepare_violation_data(violation_data)

                response = self.session.post(
                    url,
                    files=files_data,
                    data=form_data,
                    timeout=self.config.server.timeout
                )

                # 日志中输出服务器返回（状态码与响应体）
                status = response.status_code
                body_preview = ''
                try:
                    result = response.json()
                    body_preview = json.dumps(result, ensure_ascii=False)[:1000]
                except Exception:
                    body_preview = (response.text or '')[:1000]
                self.logger.info(f"违规上报响应: status={status}, body={body_preview}")

                if status in [200, 201]:
                    # 检查响应格式
                    try:
                        if isinstance(result, dict):
                            # 检查新接口的响应格式
                            if result.get('success') or (result.get('data', {}).get('success')):
                                return True
                            else:
                                self.logger.warning(f"服务器返回非成功结果: {result}")
                        else:
                            # 非JSON成功响应，按201视为成功
                            return True
                    except Exception:
                        # 非JSON成功响应，按201视为成功
                        return True
                else:
                    self.logger.warning(f"HTTP错误: {status} - {(response.text or '')[:500]}")

            except requests.exceptions.Timeout:
                self.logger.warning(f"上报超时 (尝试 {attempt + 1}/{self.config.server.max_retries})")
            except requests.exceptions.ConnectionError:
                self.logger.warning(f"连接错误 (尝试 {attempt + 1}/{self.config.server.max_retries})")
            except Exception as e:
                self.logger.error(f"上报异常: {e} (尝试 {attempt + 1}/{self.config.server.max_retries})")

            # 重试前等待
            if attempt < self.config.server.max_retries - 1:
                time.sleep(self.config.server.retry_delay)

        return False

    def _prepare_violation_data(self, violation_data: Dict) -> tuple:
        """准备违规数据为新接口格式

        Args:
            violation_data: 违规事件数据

        Returns:
            (files_data, form_data): 文件数据和表单数据的元组
        """
        # 准备表单数据
        form_data = {
            'clientId': violation_data.get('clientId', self.client_id),
            'violationType': violation_data.get('violationType', 'BLOCKCHAIN_ADDRESS'),
            'violationContent': violation_data.get('violationContent', ''),
            'timestamp': violation_data.get('report_time', datetime.now().isoformat()),
        }

        # 准备附加数据
        additional_data = {}
        if 'additionalData' in violation_data:
            if isinstance(violation_data['additionalData'], dict):
                additional_data = violation_data['additionalData']
            else:
                try:
                    additional_data = json.loads(violation_data['additionalData'])
                except:
                    additional_data = {'raw_data': str(violation_data['additionalData'])}

        # 添加其他有用的信息
        if 'fullClipboardContent' in violation_data:
            additional_data['clipboardContent'] = violation_data['fullClipboardContent']
        if 'address_type' in violation_data:
            additional_data['addressType'] = violation_data['address_type']
        if 'detected_at' in violation_data:
            additional_data['detectedAt'] = violation_data['detected_at']

        # 添加客户端信息
        additional_data['clientVersion'] = self.config.client.version
        additional_data['platform'] = 'Python'

        form_data['additionalData'] = json.dumps(additional_data, ensure_ascii=False)

        # 准备截图文件
        files_data = {}
        screenshot_data = self._get_current_screenshot()
        if screenshot_data:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"violation_screenshot_{timestamp}.jpg"
            files_data['file'] = (filename, screenshot_data, 'image/jpeg')
        else:
            # 如果无法获取截图，创建一个空的占位文件
            files_data['file'] = ('no_screenshot.txt', b'No screenshot available', 'text/plain')
            self.logger.warning("无法获取违规截图，使用占位文件")

        return files_data, form_data

    def _get_current_screenshot(self) -> Optional[bytes]:
        """获取当前屏幕截图（高质量违规截图）

        Returns:
            截图数据或None
        """
        try:
            # 尝试导入截图模块
            from PIL import ImageGrab, Image
            import io

            # 截取屏幕
            screenshot = ImageGrab.grab()

            # 获取违规截图配置
            violation_config = self.config.screenshot.violation

            # 处理分辨率
            if not violation_config.preserve_resolution and violation_config.max_long_side > 0:
                # 计算缩放比例
                width, height = screenshot.size
                max_side = max(width, height)

                if max_side > violation_config.max_long_side:
                    scale_ratio = violation_config.max_long_side / max_side
                    new_width = int(width * scale_ratio)
                    new_height = int(height * scale_ratio)
                    screenshot = screenshot.resize((new_width, new_height), Image.Resampling.LANCZOS)
                    self.logger.debug(f"违规截图已缩放: {width}x{height} -> {new_width}x{new_height}")

            # 高质量压缩截图
            output = io.BytesIO()

            # 使用高质量设置
            save_kwargs = {
                'format': 'JPEG',
                'quality': violation_config.quality,
                'optimize': True,
                'progressive': True,  # 渐进式JPEG，提高加载体验
                'subsampling': 0,     # 禁用色度子采样，保持更好的颜色质量
                'qtables': 'web_high' # 使用高质量量化表
            }

            screenshot.save(output, **save_kwargs)
            screenshot_data = output.getvalue()
            output.close()

            # 检查文件大小
            if len(screenshot_data) > violation_config.max_file_size:
                self.logger.warning(f"违规截图过大 ({len(screenshot_data)} bytes)，尝试降低质量")
                # 如果文件过大，逐步降低质量
                for quality in [85, 80, 75, 70]:
                    output = io.BytesIO()
                    save_kwargs['quality'] = quality
                    screenshot.save(output, **save_kwargs)
                    screenshot_data = output.getvalue()
                    output.close()

                    if len(screenshot_data) <= violation_config.max_file_size:
                        self.logger.debug(f"违规截图质量调整为 {quality}，大小: {len(screenshot_data)} bytes")
                        break

            # 尝试无损优化（如果启用且可用）
            if violation_config.lossless_optimization:
                try:
                    from mozjpeg_lossless_optimization import optimize
                    optimized_data = optimize(screenshot_data)
                    if len(optimized_data) < len(screenshot_data):
                        screenshot_data = optimized_data
                        self.logger.debug(f"违规截图无损优化成功，压缩率: {len(optimized_data)/len(screenshot_data)*100:.1f}%")
                except ImportError:
                    self.logger.debug("MozJPEG优化不可用，跳过无损优化")
                except Exception as e:
                    self.logger.warning(f"违规截图无损优化失败: {e}")

            self.logger.info(f"获取高质量违规截图成功，分辨率: {screenshot.size}, 质量: {violation_config.quality}, 大小: {len(screenshot_data)} bytes")
            return screenshot_data

        except ImportError:
            self.logger.warning("PIL.ImageGrab不可用，无法获取截图")
            return None
        except Exception as e:
            self.logger.error(f"获取违规截图失败: {e}")
            return None

    def _cache_event(self, violation_data: Dict) -> None:
        """缓存事件到本地文件
        
        Args:
            violation_data: 违规事件数据
        """
        try:
            # 确保缓存目录存在
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 读取现有缓存
            cached_events = []
            if self._cache_file.exists():
                try:
                    with open(self._cache_file, 'r', encoding='utf-8') as f:
                        cached_events = json.load(f)
                except:
                    pass
            
            # 添加新事件
            cached_events.append(violation_data)
            
            # 限制缓存大小（最多保留1000个事件）
            if len(cached_events) > 1000:
                cached_events = cached_events[-1000:]
            
            # 保存到文件
            with open(self._cache_file, 'w', encoding='utf-8') as f:
                json.dump(cached_events, f, indent=2, ensure_ascii=False)
            
            self._stats['cached_events'] += 1
            self.logger.debug(f"违规事件已缓存: {violation_data.get('event_id')}")
            
        except Exception as e:
            self.logger.error(f"缓存违规事件失败: {e}")
    
    def _load_cached_events(self) -> None:
        """加载缓存的事件"""
        try:
            if not self._cache_file.exists():
                return
            
            with open(self._cache_file, 'r', encoding='utf-8') as f:
                cached_events = json.load(f)
            
            # 将缓存的事件添加到队列
            loaded_count = 0
            for event in cached_events:
                try:
                    self._event_queue.put(event, block=False)
                    loaded_count += 1
                except queue.Full:
                    break
            
            if loaded_count > 0:
                self.logger.info(f"已加载 {loaded_count} 个缓存的违规事件")
                
                # 清空缓存文件
                try:
                    self._cache_file.unlink()
                except:
                    pass
            
        except Exception as e:
            self.logger.error(f"加载缓存事件失败: {e}")
    
    def _save_pending_events(self) -> None:
        """保存队列中未处理的事件"""
        try:
            pending_events = []
            
            # 从队列中获取所有未处理的事件
            while not self._event_queue.empty():
                try:
                    event = self._event_queue.get_nowait()
                    pending_events.append(event)
                except queue.Empty:
                    break
            
            if pending_events:
                # 读取现有缓存
                cached_events = []
                if self._cache_file.exists():
                    try:
                        with open(self._cache_file, 'r', encoding='utf-8') as f:
                            cached_events = json.load(f)
                    except:
                        pass
                
                # 合并事件
                all_events = cached_events + pending_events
                
                # 限制缓存大小
                if len(all_events) > 1000:
                    all_events = all_events[-1000:]
                
                # 确保缓存目录存在
                self._cache_file.parent.mkdir(parents=True, exist_ok=True)
                
                # 保存到文件
                with open(self._cache_file, 'w', encoding='utf-8') as f:
                    json.dump(all_events, f, indent=2, ensure_ascii=False)
                
                self.logger.info(f"已保存 {len(pending_events)} 个未处理的违规事件到缓存")
            
        except Exception as e:
            self.logger.error(f"保存未处理事件失败: {e}")
    
    def get_stats(self) -> Dict:
        """获取统计信息
        
        Returns:
            统计信息字典
        """
        stats = self._stats.copy()
        stats['queue_size'] = self._event_queue.qsize()
        stats['is_running'] = self._running
        return stats
    
    def get_queue_size(self) -> int:
        """获取队列大小
        
        Returns:
            队列中的事件数量
        """
        return self._event_queue.qsize()
    
    def clear_cache(self) -> bool:
        """清空缓存文件
        
        Returns:
            是否成功
        """
        try:
            if self._cache_file.exists():
                self._cache_file.unlink()
                self.logger.info("违规事件缓存已清空")
            return True
        except Exception as e:
            self.logger.error(f"清空缓存失败: {e}")
            return False