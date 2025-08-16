#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebSocket客户端模块

功能：
- WebSocket连接管理
- 心跳机制
- 事件处理
- 自动重连
"""

import asyncio
import json
import time
from typing import Optional, Dict, Callable
from datetime import datetime

import socketio

from core.config import AppConfig


class WebSocketClient:
    """WebSocket客户端"""
    
    def __init__(self, config: AppConfig, client_id: str, logger, whitelist_manager=None):
        """初始化WebSocket客户端
        
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
        
        # Socket.IO客户端
        self.sio = socketio.AsyncClient(
            reconnection=True,
            reconnection_attempts=0,  # 无限重连
            reconnection_delay=1,
            reconnection_delay_max=30,
            logger=False,  # 禁用socketio的日志
            engineio_logger=False
        )
        
        # 连接状态
        self._connected = False
        self._running = False
        self._last_heartbeat = 0
        
        # 统计信息
        self._stats = {
            'connection_attempts': 0,
            'successful_connections': 0,
            'disconnections': 0,
            'heartbeats_sent': 0,
            'messages_received': 0,
            'messages_sent': 0
        }
        
        # 注册事件处理器
        self._register_event_handlers()
        
        self.logger.info("WebSocket客户端初始化完成")
    
    def _register_event_handlers(self) -> None:
        """注册事件处理器"""
        
        @self.sio.event
        async def connect():
            """连接成功事件"""
            self._connected = True
            self._stats['successful_connections'] += 1
            self.logger.info("WebSocket连接已建立")
            
            # 发送客户端注册信息
            await self._register_client()
        
        @self.sio.event
        async def disconnect():
            """断开连接事件"""
            self._connected = False
            self._stats['disconnections'] += 1
            self.logger.warning("WebSocket连接已断开")
        
        @self.sio.event
        async def connect_error(data):
            """连接错误事件"""
            self.logger.error(f"WebSocket连接错误: {data}")
        
        @self.sio.event
        async def screenshot_request(data):
            """截图请求事件"""
            self._stats['messages_received'] += 1
            self.logger.info("收到截图请求")
            await self._handle_screenshot_request(data)
        
        @self.sio.event
        async def whitelist_updated(data):
            """白名单更新事件"""
            self._stats['messages_received'] += 1
            self.logger.info("收到白名单更新通知")
            await self._handle_whitelist_update(data)
        
        @self.sio.event
        async def client_config_updated(data):
            """客户端配置更新事件"""
            self._stats['messages_received'] += 1
            self.logger.info("收到客户端配置更新通知")
            await self._handle_config_update(data)
        
        @self.sio.event
        async def heartbeat_response(data):
            """心跳响应事件"""
            self._stats['messages_received'] += 1
            self.logger.debug("收到心跳响应")
    
    async def start(self) -> None:
        """启动WebSocket客户端"""
        if self._running:
            self.logger.warning("WebSocket客户端已在运行中")
            return
        
        self._running = True
        self.logger.info("正在启动WebSocket客户端...")
        
        try:
            # 连接到服务器
            await self._connect()
            
            # 启动心跳任务
            if self.config.heartbeat.enabled:
                asyncio.create_task(self._heartbeat_task())
            
            self.logger.info("WebSocket客户端启动成功")
            
        except Exception as e:
            self.logger.error(f"WebSocket客户端启动失败: {e}")
            raise
    
    async def stop(self) -> None:
        """停止WebSocket客户端"""
        if not self._running:
            return
        
        self._running = False
        self.logger.info("正在停止WebSocket客户端...")
        
        try:
            # 断开连接
            if self._connected:
                await self.sio.disconnect()
            
            # 输出统计信息
            self.logger.info(f"WebSocket统计: {self._stats}")
            self.logger.info("WebSocket客户端已停止")
            
        except Exception as e:
            self.logger.error(f"停止WebSocket客户端时出错: {e}")
    
    async def _connect(self) -> None:
        """连接到WebSocket服务器"""
        url = self.config.server.websocket_url
        
        # 连接参数
        auth = {
            'clientId': self.client_id,
            'clientName': self.config.client.name,
            'clientVersion': self.config.client.version
        }
        
        try:
            self._stats['connection_attempts'] += 1
            self.logger.info(f"正在连接到WebSocket服务器: {url}")
            
            await self.sio.connect(
                url,
                auth=auth,
                transports=['websocket'],
                wait_timeout=self.config.server.timeout
            )
            
        except Exception as e:
            self.logger.error(f"WebSocket连接失败: {e}")
            raise
    
    async def _register_client(self) -> None:
        """注册客户端"""
        try:
            registration_data = {
                'clientId': self.client_id,
                'clientName': self.config.client.name,
                'clientVersion': self.config.client.version,
                'platform': 'Python',
                'capabilities': {
                    'screenshot': True,
                    'clipboard_monitor': self.config.clipboard.enabled,
                    'blockchain_detection': True,
                    'whitelist_sync': self.config.whitelist.enabled
                },
                'timestamp': datetime.now().isoformat()
            }
            
            await self.sio.emit('client_register', registration_data)
            self._stats['messages_sent'] += 1
            self.logger.info("客户端注册信息已发送")
            
        except Exception as e:
            self.logger.error(f"客户端注册失败: {e}")
    
    async def _heartbeat_task(self) -> None:
        """心跳任务"""
        self.logger.info("心跳任务已启动")
        
        while self._running:
            try:
                current_time = time.time()
                
                # 检查是否需要发送心跳
                if (current_time - self._last_heartbeat) >= self.config.heartbeat.interval:
                    await self._send_heartbeat()
                    self._last_heartbeat = current_time
                
                # 等待1秒
                await asyncio.sleep(1)
                
            except Exception as e:
                self.logger.error(f"心跳任务异常: {e}")
                await asyncio.sleep(5)
    
    async def _send_heartbeat(self) -> None:
        """发送心跳"""
        if not self._connected:
            return
        
        try:
            heartbeat_data = {
                'clientId': self.client_id,
                'timestamp': datetime.now().isoformat(),
                'status': 'active'
            }
            
            await self.sio.emit('heartbeat', heartbeat_data)
            self._stats['heartbeats_sent'] += 1
            self._stats['messages_sent'] += 1
            self.logger.debug("心跳已发送")
            
        except Exception as e:
            self.logger.error(f"发送心跳失败: {e}")
    
    async def _handle_screenshot_request(self, data: Dict) -> None:
        """处理截图请求
        
        Args:
            data: 请求数据
        """
        try:
            # 这里可以触发立即截图
            # 由于截图管理器在另一个线程中运行，我们发送一个响应确认收到请求
            response_data = {
                'clientId': self.client_id,
                'requestId': data.get('requestId'),
                'status': 'received',
                'timestamp': datetime.now().isoformat()
            }
            
            await self.sio.emit('screenshot_response', response_data)
            self._stats['messages_sent'] += 1
            
        except Exception as e:
            self.logger.error(f"处理截图请求失败: {e}")
    
    async def _handle_whitelist_update(self, data: Dict) -> None:
        """处理白名单更新
        
        Args:
            data: 更新数据
        """
        try:
            if self.whitelist_manager:
                # 触发白名单同步
                # 由于白名单管理器在另一个线程中运行，我们只记录日志
                self.logger.info("触发白名单同步")
            
            # 发送确认响应
            response_data = {
                'clientId': self.client_id,
                'updateId': data.get('updateId'),
                'status': 'received',
                'timestamp': datetime.now().isoformat()
            }
            
            await self.sio.emit('whitelist_update_response', response_data)
            self._stats['messages_sent'] += 1
            
        except Exception as e:
            self.logger.error(f"处理白名单更新失败: {e}")
    
    async def _handle_config_update(self, data: Dict) -> None:
        """处理配置更新
        
        Args:
            data: 配置数据
        """
        try:
            # 记录配置更新
            self.logger.info(f"收到配置更新: {data}")
            
            # 发送确认响应
            response_data = {
                'clientId': self.client_id,
                'configId': data.get('configId'),
                'status': 'received',
                'timestamp': datetime.now().isoformat()
            }
            
            await self.sio.emit('config_update_response', response_data)
            self._stats['messages_sent'] += 1
            
        except Exception as e:
            self.logger.error(f"处理配置更新失败: {e}")
    
    async def send_message(self, event: str, data: Dict) -> bool:
        """发送消息
        
        Args:
            event: 事件名称
            data: 消息数据
        
        Returns:
            是否发送成功
        """
        if not self._connected:
            self.logger.warning("WebSocket未连接，无法发送消息")
            return False
        
        try:
            await self.sio.emit(event, data)
            self._stats['messages_sent'] += 1
            self.logger.debug(f"消息已发送: {event}")
            return True
            
        except Exception as e:
            self.logger.error(f"发送消息失败: {e}")
            return False
    
    def is_connected(self) -> bool:
        """检查是否已连接
        
        Returns:
            是否已连接
        """
        return self._connected
    
    def get_stats(self) -> Dict:
        """获取统计信息
        
        Returns:
            统计信息字典
        """
        stats = self._stats.copy()
        stats['connected'] = self._connected
        stats['running'] = self._running
        stats['last_heartbeat'] = self._last_heartbeat
        return stats
    
    async def wait_for_connection(self, timeout: float = 30.0) -> bool:
        """等待连接建立
        
        Args:
            timeout: 超时时间（秒）
        
        Returns:
            是否连接成功
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self._connected:
                return True
            await asyncio.sleep(0.1)
        
        return False