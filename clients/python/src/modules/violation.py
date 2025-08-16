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
        """发送违规事件报告
        
        Args:
            violation_data: 违规事件数据
        
        Returns:
            是否发送成功
        """
        url = f"{self.config.server.api_base_url}/security/violations/report"
        
        # 重试发送
        for attempt in range(self.config.server.max_retries):
            try:
                response = self.session.post(
                    url,
                    json=violation_data,
                    timeout=self.config.server.timeout
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    if result.get('success'):
                        return True
                    else:
                        self.logger.warning(f"服务器返回错误: {result.get('message', '未知错误')}")
                else:
                    self.logger.warning(f"HTTP错误: {response.status_code} - {response.text}")
                
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