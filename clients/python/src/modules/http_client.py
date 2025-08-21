#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HTTP客户端模块

功能：
- HTTP轮询通信
- 心跳机制
- 配置同步
- 白名单同步
"""

import time
import json
import requests
from typing import Optional, Dict, Any
from datetime import datetime
import threading

from core.config import AppConfig
from utils.system_info import SystemInfoCollector


class SystemInfo:
    """系统信息简化接口"""
    
    def __init__(self):
        self.collector = SystemInfoCollector()
    
    def get_ip_address(self) -> str:
        return self.collector.get_ip_address()
    
    def get_hostname(self) -> str:
        return self.collector.get_computer_name()
    
    def get_os_info(self) -> str:
        return self.collector.get_os_version()


class HttpClient:
    """HTTP客户端"""
    
    def __init__(self, config: AppConfig, client_id: str, logger, whitelist_manager=None):
        """初始化HTTP客户端
        
        Args:
            config: 应用配置
            client_id: 客户端ID
            logger: 日志记录器
            whitelist_manager: 白名单管理器
        """
        self.config = config
        self.client_id = client_id
        self.logger = logger
        self.whitelist_manager = whitelist_manager
        
        # HTTP会话
        self.session = requests.Session()
        self.session.timeout = config.server.timeout
        
        # 基础URL - 从api_base_url中提取基础URL
        api_base_url = config.server.api_base_url
        if api_base_url.endswith('/api'):
            self.base_url = api_base_url[:-4]  # 移除 '/api' 后缀
        else:
            self.base_url = api_base_url.rstrip('/')
        
        # 运行状态
        self._running = False
        self._stop_event = threading.Event()
        
        # 上次同步时间
        self._last_heartbeat = 0
        self._last_config_sync = 0
        self._last_whitelist_sync = 0
        
        # 统计信息
        self._stats = {
            'heartbeats_sent': 0,
            'config_syncs': 0,
            'whitelist_syncs': 0,
            'http_requests': 0,
            'http_errors': 0
        }
        
        # 获取系统信息
        self.system_info = SystemInfo()
        
        self.logger.info("HTTP客户端初始化完成")
    
    def start(self) -> None:
        """启动HTTP客户端"""
        if self._running:
            self.logger.warning("HTTP客户端已在运行中")
            return
        
        self._running = True
        self._stop_event.clear()
        self.logger.info("HTTP客户端已启动")
        
        # 注意：心跳现在通过截图上传的合并API处理，不再单独发送
        self.logger.info("心跳将通过截图上传合并API自动处理")
    
    def stop(self) -> None:
        """停止HTTP客户端"""
        if not self._running:
            return
        
        self._running = False
        self._stop_event.set()
        
        # 关闭会话
        self.session.close()
        
        # 输出统计信息
        self.logger.info(f"HTTP客户端统计: {self._stats}")
        self.logger.info("HTTP客户端已停止")
    
    def run_polling_loop(self) -> None:
        """运行轮询循环"""
        self.logger.info("HTTP轮询循环已启动")
        
        while self._running and not self._stop_event.is_set():
            try:
                current_time = time.time()
                
                # 注意：心跳现在通过截图上传的合并API处理，这里不再单独发送心跳
                
                # 配置同步轮询
                config_interval = self.config.config_sync.interval
                if (current_time - self._last_config_sync) >= config_interval:
                    self._sync_config()
                    self._last_config_sync = current_time
                
                # 白名单同步轮询
                if self.config.whitelist.enabled:
                    if (current_time - self._last_whitelist_sync) >= self.config.whitelist.sync_interval:
                        self._sync_whitelist()
                        self._last_whitelist_sync = current_time
                
                # 等待5秒（增加间隔，因为不需要频繁轮询心跳）
                self._stop_event.wait(5)
                
            except Exception as e:
                self.logger.error(f"轮询循环异常: {e}")
                self._stop_event.wait(10)
    
    def _send_heartbeat(self) -> bool:
        """发送心跳
        
        Returns:
            是否发送成功
        """
        try:
            # 准备心跳数据
            heartbeat_data = {
                'clientId': self.client_id,
                'ipAddress': self.system_info.get_ip_address(),
                'hostname': self.system_info.get_hostname(),
                'osInfo': self.system_info.get_os_info(),
                'version': self.config.client.version,
                'metadata': {
                    'platform': 'Python',
                    'capabilities': {
                        'screenshot': True,
                        'clipboard_monitor': self.config.clipboard.enabled,
                        'blockchain_detection': True,
                        'whitelist_sync': self.config.whitelist.enabled
                    },
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            # 发送心跳请求
            url = f"{self.base_url}/api/clients/heartbeat"
            response = self._make_request('POST', url, json=heartbeat_data)
            
            if response and response.status_code == 200:
                self._stats['heartbeats_sent'] += 1
                self.logger.debug("心跳发送成功")
                return True
            else:
                self.logger.error(f"心跳发送失败: {response.status_code if response else 'No response'}")
                return False
                
        except Exception as e:
            self.logger.error(f"发送心跳异常: {e}")
            return False
    
    def _sync_config(self) -> bool:
        """同步配置
        
        Returns:
            是否同步成功
        """
        try:
            # 获取客户端配置
            url = f"{self.base_url}/api/client-config/client/{self.client_id}/effective"
            response = self._make_request('GET', url)
            
            if response and response.status_code == 200:
                config_data = response.json()
                self._stats['config_syncs'] += 1
                self.logger.debug("配置同步成功")
                
                # 这里可以处理配置更新逻辑
                self._handle_config_update(config_data)
                return True
            else:
                self.logger.error(f"配置同步失败: {response.status_code if response else 'No response'}")
                return False
                
        except Exception as e:
            self.logger.error(f"配置同步异常: {e}")
            return False
    
    def _sync_whitelist(self) -> bool:
        """同步白名单
        
        Returns:
            是否同步成功
        """
        try:
            # 获取活跃白名单地址
            url = f"{self.base_url}/api/whitelist/addresses/active"
            response = self._make_request('GET', url)
            
            if response and response.status_code == 200:
                whitelist_data = response.json()
                self._stats['whitelist_syncs'] += 1
                self.logger.debug("白名单同步成功")
                
                # 更新白名单管理器
                if self.whitelist_manager:
                    self._handle_whitelist_update(whitelist_data)
                return True
            else:
                self.logger.error(f"白名单同步失败: {response.status_code if response else 'No response'}")
                return False
                
        except Exception as e:
            self.logger.error(f"白名单同步异常: {e}")
            return False
    
    def _make_request(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        """发送HTTP请求
        
        Args:
            method: HTTP方法
            url: 请求URL
            **kwargs: 其他请求参数
        
        Returns:
            响应对象或None
        """
        try:
            self._stats['http_requests'] += 1
            response = self.session.request(method, url, **kwargs)
            return response
            
        except Exception as e:
            self._stats['http_errors'] += 1
            self.logger.error(f"HTTP请求失败 {method} {url}: {e}")
            return None
    
    def _handle_config_update(self, config_data: Dict[str, Any]) -> None:
        """处理配置更新
        
        Args:
            config_data: 配置数据
        """
        try:
            self.logger.info(f"收到配置更新: {config_data}")
            
            # 这里可以实现配置更新逻辑
            # 例如更新截图间隔、心跳间隔等
            if 'screenshotInterval' in config_data:
                new_interval = config_data['screenshotInterval']
                self.logger.info(f"截图间隔更新为: {new_interval}秒")
            
            if 'heartbeatInterval' in config_data:
                new_interval = config_data['heartbeatInterval']
                self.logger.info(f"心跳间隔更新为: {new_interval}秒")
                
        except Exception as e:
            self.logger.error(f"处理配置更新失败: {e}")
    
    def _handle_whitelist_update(self, whitelist_data: Dict[str, Any]) -> None:
        """处理白名单更新
        
        Args:
            whitelist_data: 白名单数据
        """
        try:
            if self.whitelist_manager:
                # 更新白名单管理器的数据
                addresses = whitelist_data.get('addresses', [])
                self.logger.info(f"更新白名单，共{len(addresses)}个地址")
                
                # 这里可以调用白名单管理器的更新方法
                # self.whitelist_manager.update_addresses(addresses)
                
        except Exception as e:
            self.logger.error(f"处理白名单更新失败: {e}")
    
    def is_running(self) -> bool:
        """检查是否在运行
        
        Returns:
            是否在运行
        """
        return self._running
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息
        
        Returns:
            统计信息字典
        """
        stats = self._stats.copy()
        stats['running'] = self._running
        stats['last_heartbeat'] = self._last_heartbeat
        stats['last_config_sync'] = self._last_config_sync
        stats['last_whitelist_sync'] = self._last_whitelist_sync
        return stats