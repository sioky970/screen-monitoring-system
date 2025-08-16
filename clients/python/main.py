#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屏幕监控系统Python客户端

主要功能：
- 屏幕截图采集和上传
- 剪贴板监控和区块链地址检测
- WebSocket实时通信
- 白名单管理
- Windows服务支持
"""

import os
import sys
import signal
import argparse
import asyncio
import threading
import time
from pathlib import Path

# Windows控制台窗口控制
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes
    
    # Windows API常量
    SW_HIDE = 0
    SW_SHOW = 5
    
    def hide_console():
        """隐藏控制台窗口"""
        try:
            hwnd = ctypes.windll.kernel32.GetConsoleWindow()
            if hwnd:
                ctypes.windll.user32.ShowWindow(hwnd, SW_HIDE)
        except Exception:
            pass
    
    def show_console():
        """显示控制台窗口"""
        try:
            hwnd = ctypes.windll.kernel32.GetConsoleWindow()
            if hwnd:
                ctypes.windll.user32.ShowWindow(hwnd, SW_SHOW)
        except Exception:
            pass
else:
    def hide_console():
        """非Windows系统不支持隐藏控制台"""
        pass
    
    def show_console():
        """非Windows系统不支持显示控制台"""
        pass

# 添加src目录到Python路径
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

from core.config import ConfigManager
from core.logger import setup_logger
from core.client import ScreenMonitorClient


class ClientRunner:
    """客户端运行器"""
    
    def __init__(self, config_path: str):
        """初始化运行器
        
        Args:
            config_path: 配置文件路径
        """
        self.config_path = config_path
        self.client = None
        self.logger = None
        self._running = False
        self._stop_event = threading.Event()
    
    def setup_signal_handlers(self):
        """设置信号处理器"""
        def signal_handler(signum, frame):
            if self.logger:
                self.logger.info(f"收到信号 {signum}，正在停止客户端...")
            else:
                print(f"\n收到信号 {signum}，正在停止客户端...")
            
            self.stop()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def _setup_console_display(self, config):
        """设置控制台窗口显示
        
        Args:
            config: 应用配置
        """
        try:
            # 检查是否为调试模式
            debug_enabled = getattr(config.client.debug, 'enabled', False)
            show_console = getattr(config.client.debug, 'show_console', True)
            
            # 检查是否通过环境变量启用调试模式
            env_debug = os.getenv('SCREEN_MONITOR_DEBUG', '').lower() in ('1', 'true', 'yes')
            
            # 检查是否通过命令行参数启用调试模式
            is_debug_mode = debug_enabled or env_debug or '--debug' in sys.argv
            
            if is_debug_mode and show_console:
                # 调试模式下显示控制台
                show_console()
                print("[调试模式] 控制台窗口已显示")
            elif not is_debug_mode:
                # 非调试模式下隐藏控制台
                hide_console()
                
        except Exception as e:
            # 控制台显示控制失败不应影响程序运行
            pass
    
    def start(self) -> bool:
        """启动客户端
        
        Returns:
            是否启动成功
        """
        try:
            # 加载配置
            config_manager = ConfigManager(self.config_path)
            config = config_manager.get_config()
            
            # 控制台窗口显示控制
            self._setup_console_display(config)
            
            # 设置日志
            debug_enabled = getattr(config.client.debug, 'enabled', False)
            logger = setup_logger(config.logging, debug=debug_enabled)
            
            # 创建客户端
            self.client = ScreenMonitorClient(config, logger)
            self.logger = logger
            
            # 设置信号处理器
            self.setup_signal_handlers()
            
            # 启动客户端
            self.logger.info("正在启动屏幕监控客户端...")
            self.client.start()
            
            # 检查客户端是否成功启动
            if self.client.is_running():
                self._running = True
                self.logger.info("屏幕监控客户端启动成功")
                return True
            else:
                self.logger.error("屏幕监控客户端启动失败")
                return False
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"启动客户端时出错: {e}")
            else:
                print(f"启动客户端时出错: {e}")
            return False
    
    def stop(self):
        """停止客户端"""
        if not self._running:
            return
        
        self._running = False
        
        try:
            if self.client:
                if self.logger:
                    self.logger.info("正在停止屏幕监控客户端...")
                
                self.client.stop()
                
                if self.logger:
                    self.logger.info("屏幕监控客户端已停止")
            
            # 设置停止事件
            self._stop_event.set()
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"停止客户端时出错: {e}")
            else:
                print(f"停止客户端时出错: {e}")
    
    def wait_for_stop(self, timeout: float = None):
        """等待停止信号
        
        Args:
            timeout: 超时时间（秒）
        """
        try:
            while self._running:
                # 检查客户端状态
                if self.client and not self.client.is_running():
                    if self.logger:
                        self.logger.warning("客户端已停止运行")
                    break
                
                # 等待停止事件
                if self._stop_event.wait(timeout=1):
                    break
        
        except KeyboardInterrupt:
            if self.logger:
                self.logger.info("收到键盘中断信号")
            else:
                print("\n收到键盘中断信号")
            self.stop()
    
    def is_running(self) -> bool:
        """检查是否正在运行
        
        Returns:
            是否正在运行
        """
        return self._running and (self.client is None or self.client.is_running())


def run_as_daemon():
    """以守护进程模式运行"""
    try:
        # 创建子进程
        pid = os.fork()
        if pid > 0:
            # 父进程退出
            sys.exit(0)
    except OSError as e:
        print(f"创建子进程失败: {e}")
        sys.exit(1)
    
    # 子进程继续运行
    os.chdir("/")
    os.setsid()
    os.umask(0)
    
    # 重定向标准输入输出
    sys.stdin.close()
    sys.stdout.close()
    sys.stderr.close()


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="屏幕监控系统Python客户端")
    parser.add_argument(
        "--config", 
        default="config/config.yaml",
        help="配置文件路径"
    )
    parser.add_argument(
        "--daemon", 
        action="store_true",
        help="以守护进程模式运行（仅限Linux/macOS）"
    )
    parser.add_argument(
        "--service", 
        action="store_true",
        help="以Windows服务模式运行"
    )
    parser.add_argument(
        "--test", 
        action="store_true",
        help="测试模式（运行30秒后自动退出）"
    )
    parser.add_argument(
        "--debug", 
        action="store_true",
        help="调试模式（显示控制台窗口和详细日志）"
    )
    
    args = parser.parse_args()
    
    try:
        # 处理配置文件路径
        config_path = Path(args.config)
        if not config_path.is_absolute():
            config_path = Path(__file__).parent / config_path
        
        if not config_path.exists():
            print(f"配置文件不存在: {config_path}")
            sys.exit(1)
        
        # 守护进程模式（仅限非Windows系统）
        if args.daemon and sys.platform != "win32":
            print("以守护进程模式启动...")
            run_as_daemon()
        
        # Windows服务模式
        if args.service and sys.platform == "win32":
            try:
                from utils.windows_service import main as service_main
                service_main()
                return
            except ImportError:
                print("Windows服务模块不可用")
                sys.exit(1)
        
        # 创建客户端运行器
        runner = ClientRunner(str(config_path))
        
        # 启动客户端
        print("正在启动屏幕监控客户端...")
        success = runner.start()
        
        if not success:
            print("客户端启动失败")
            sys.exit(1)
        
        print("客户端启动成功，按 Ctrl+C 停止")
        
        # 测试模式
        if args.test:
            print("测试模式：30秒后自动退出")
            time.sleep(30)
            runner.stop()
        else:
            # 保持运行
            try:
                runner.wait_for_stop()
            except KeyboardInterrupt:
                print("\n收到中断信号，正在停止...")
                runner.stop()
        
        print("客户端已停止")
    
    except Exception as e:
        print(f"客户端运行失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()