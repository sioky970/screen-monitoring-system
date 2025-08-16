#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屏幕监控系统主客户端

功能：
- 协调各个功能模块
- 管理客户端生命周期
- 处理异常和错误恢复
"""

import asyncio
import threading
import time
from typing import Optional
from pathlib import Path

from .config import AppConfig
from .logger import get_logger
from modules.screenshot import ScreenshotManager
from modules.clipboard import ClipboardMonitor
from modules.websocket_client import WebSocketClient
from modules.whitelist import WhitelistManager
from modules.violation import ViolationReporter
from utils.client_id import ClientIdManager


class ScreenMonitorClient:
    """屏幕监控系统主客户端"""
    
    def __init__(self, config: AppConfig, logger):
        """初始化客户端
        
        Args:
            config: 应用配置
            logger: 日志记录器
        """
        self.config = config
        self.logger = logger
        self._running = False
        self._stop_event = threading.Event()
        
        # 初始化各个管理器
        self.client_id_manager = ClientIdManager(config, logger)
        self.screenshot_manager = None
        self.clipboard_monitor = None
        self.websocket_client = None
        self.whitelist_manager = None
        self.violation_reporter = None
        
        # 工作线程
        self._threads = []
        
        self.logger.info("屏幕监控客户端初始化完成")
    
    def start(self) -> None:
        """启动客户端"""
        if self._running:
            self.logger.warning("客户端已在运行中")
            return
        
        try:
            self.logger.info("正在启动屏幕监控客户端...")
            
            # 获取或生成客户端ID
            client_id = self.client_id_manager.get_client_uid()
            self.logger.info(f"客户端ID: {client_id}")
            
            # 初始化各个模块
            self._initialize_modules(client_id)
            
            # 启动各个模块
            self._start_modules()
            
            self._running = True
            self.logger.info("屏幕监控客户端启动成功")
            
        except Exception as e:
            self.logger.error(f"客户端启动失败: {e}")
            self.stop()
            raise
    
    def stop(self) -> None:
        """停止客户端"""
        if not self._running:
            return
        
        self.logger.info("正在停止屏幕监控客户端...")
        
        # 设置停止事件
        self._stop_event.set()
        self._running = False
        
        # 停止各个模块
        self._stop_modules()
        
        # 等待所有线程结束
        for thread in self._threads:
            if thread.is_alive():
                thread.join(timeout=5)
        
        self._threads.clear()
        self.logger.info("屏幕监控客户端已停止")
    
    def is_running(self) -> bool:
        """检查客户端是否在运行"""
        return self._running
    
    def _initialize_modules(self, client_id: str) -> None:
        """初始化各个模块"""
        self.logger.info("正在初始化功能模块...")
        
        # 初始化违规事件上报器
        self.violation_reporter = ViolationReporter(
            self.config, 
            client_id, 
            self.logger
        )
        
        # 初始化白名单管理器
        self.whitelist_manager = WhitelistManager(
            self.config, 
            self.logger
        )
        
        # 初始化WebSocket客户端
        self.websocket_client = WebSocketClient(
            self.config, 
            client_id, 
            self.logger,
            self.whitelist_manager
        )
        
        # 初始化截图管理器
        self.screenshot_manager = ScreenshotManager(
            self.config, 
            self.logger,
            self.client_id_manager
        )
        
        # 初始化剪贴板监控器
        self.clipboard_monitor = ClipboardMonitor(
            self.config, 
            client_id, 
            self.logger,
            self.whitelist_manager,
            self.violation_reporter
        )
        
        self.logger.info("功能模块初始化完成")
    
    def _start_modules(self) -> None:
        """启动各个模块"""
        self.logger.info("正在启动功能模块...")
        
        # 启动白名单管理器
        if self.config.whitelist.enabled:
            thread = threading.Thread(
                target=self._run_whitelist_manager,
                name="WhitelistManager",
                daemon=True
            )
            thread.start()
            self._threads.append(thread)
            self.logger.info("白名单管理器已启动")
        
        # 启动WebSocket客户端
        thread = threading.Thread(
            target=self._run_websocket_client,
            name="WebSocketClient",
            daemon=True
        )
        thread.start()
        self._threads.append(thread)
        self.logger.info("WebSocket客户端已启动")
        
        # 等待WebSocket连接建立
        time.sleep(2)
        
        # WebSocket连接建立后，主动同步一次白名单
        if self.config.whitelist.enabled and self.whitelist_manager:
            try:
                self.logger.info("WebSocket连接建立后，主动同步白名单...")
                # 在单独线程中执行同步，避免阻塞主流程
                sync_thread = threading.Thread(
                    target=self._trigger_whitelist_sync,
                    name="InitialWhitelistSync",
                    daemon=True
                )
                sync_thread.start()
            except Exception as e:
                self.logger.error(f"触发白名单同步失败: {e}")
        
        # 启动截图管理器
        thread = threading.Thread(
            target=self._run_screenshot_manager,
            name="ScreenshotManager",
            daemon=True
        )
        thread.start()
        self._threads.append(thread)
        self.logger.info("截图管理器已启动")
        
        # 启动剪贴板监控器
        if self.config.clipboard.enabled:
            thread = threading.Thread(
                target=self._run_clipboard_monitor,
                name="ClipboardMonitor",
                daemon=True
            )
            thread.start()
            self._threads.append(thread)
            self.logger.info("剪贴板监控器已启动")
        
        self.logger.info("所有功能模块启动完成")
    
    def _stop_modules(self) -> None:
        """停止各个模块"""
        self.logger.info("正在停止功能模块...")
        
        # 停止各个模块
        modules = [
            (self.clipboard_monitor, "剪贴板监控器"),
            (self.screenshot_manager, "截图管理器"),
            (self.websocket_client, "WebSocket客户端"),
            (self.whitelist_manager, "白名单管理器"),
            (self.violation_reporter, "违规事件上报器")
        ]
        
        for module, name in modules:
            if module:
                try:
                    module.stop()
                    self.logger.info(f"{name}已停止")
                except Exception as e:
                    self.logger.error(f"停止{name}时出错: {e}")
    
    def _run_whitelist_manager(self) -> None:
        """运行白名单管理器"""
        try:
            self.whitelist_manager.start()
            while not self._stop_event.is_set():
                time.sleep(1)
        except Exception as e:
            self.logger.error(f"白名单管理器运行异常: {e}")
    
    def _run_websocket_client(self) -> None:
        """运行WebSocket客户端"""
        try:
            # 创建新的事件循环
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # 运行WebSocket客户端
            loop.run_until_complete(self.websocket_client.start())
            
            # 保持连接
            while not self._stop_event.is_set():
                time.sleep(1)
                
        except Exception as e:
            self.logger.error(f"WebSocket客户端运行异常: {e}")
        finally:
            try:
                loop.close()
            except:
                pass
    
    def _run_screenshot_manager(self) -> None:
        """运行截图管理器"""
        try:
            self.screenshot_manager.start()
            while not self._stop_event.is_set():
                time.sleep(1)
        except Exception as e:
            self.logger.error(f"截图管理器运行异常: {e}")
    
    def _run_clipboard_monitor(self) -> None:
        """运行剪贴板监控器"""
        try:
            self.clipboard_monitor.start()
            while not self._stop_event.is_set():
                time.sleep(0.1)  # 剪贴板监控需要更频繁的检查
        except Exception as e:
            self.logger.error(f"剪贴板监控器运行异常: {e}")
    
    def _trigger_whitelist_sync(self) -> None:
        """触发白名单同步"""
        try:
            if self.whitelist_manager:
                # 调用白名单管理器的同步方法
                success = self.whitelist_manager._sync_whitelist()
                if success:
                    self.logger.info("主动白名单同步成功")
                else:
                    self.logger.warning("主动白名单同步失败")
        except Exception as e:
            self.logger.error(f"主动白名单同步异常: {e}")