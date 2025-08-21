#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Windows服务模块

功能：
- Windows服务安装/卸载
- 服务启动/停止
- 开机自启动
- 服务状态监控
"""

import os
import sys
import time
import threading
from pathlib import Path
from typing import Optional

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
    import win32api
    import win32con
except ImportError:
    print("警告: pywin32 未安装，Windows服务功能将不可用")
    win32serviceutil = None

from core.config import ConfigManager
from core.logger import setup_logger
from core.client import ScreenMonitorClient


class ScreenMonitorService:
    """屏幕监控Windows服务"""
    
    # 服务配置
    _svc_name_ = "ScreenMonitorService"
    _svc_display_name_ = "Screen Monitor Service"
    _svc_description_ = "屏幕监控系统客户端服务"
    
    def __init__(self, args=None):
        """初始化服务"""
        if win32serviceutil is None:
            raise ImportError("pywin32 未安装，无法创建Windows服务")
        
        # 服务控制事件
        self.hWaitStop = win32event.CreateEvent(None, 0, 0, None)
        
        # 客户端实例
        self.client: Optional[ScreenMonitorClient] = None
        self.logger = None
        
        # 运行状态
        self._running = False
        self._client_thread: Optional[threading.Thread] = None
    
    def SvcStop(self):
        """停止服务"""
        try:
            self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
            
            if self.logger:
                self.logger.info("正在停止屏幕监控服务...")
            
            # 停止客户端
            self._running = False
            if self.client:
                self.client.stop()
            
            # 等待客户端线程结束
            if self._client_thread and self._client_thread.is_alive():
                self._client_thread.join(timeout=10)
            
            # 设置停止事件
            win32event.SetEvent(self.hWaitStop)
            
            if self.logger:
                self.logger.info("屏幕监控服务已停止")
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"停止服务时出错: {e}")
            else:
                print(f"停止服务时出错: {e}")
    
    def SvcDoRun(self):
        """运行服务"""
        try:
            # 确保服务模式下隐藏控制台窗口
            self._hide_console_window()
            
            # 报告服务启动
            servicemanager.LogMsg(
                servicemanager.EVENTLOG_INFORMATION_TYPE,
                servicemanager.PYS_SERVICE_STARTED,
                (self._svc_name_, '')
            )
            
            # 初始化日志
            self._setup_logging()
            
            self.logger.info("屏幕监控服务正在启动...")
            
            # 初始化客户端
            self._initialize_client()
            
            # 启动客户端
            self._start_client()
            
            self.logger.info("屏幕监控服务启动成功")
            
            # 等待停止信号
            win32event.WaitForSingleObject(self.hWaitStop, win32event.INFINITE)
            
        except Exception as e:
            error_msg = f"服务运行异常: {e}"
            if self.logger:
                self.logger.error(error_msg)
            else:
                print(error_msg)
            
            # 报告服务错误
            servicemanager.LogErrorMsg(error_msg)
    
    def _hide_console_window(self):
        """隐藏控制台窗口"""
        try:
            import ctypes
            from ctypes import wintypes
            
            # Windows API常量
            SW_HIDE = 0
            
            # 获取控制台窗口句柄
            kernel32 = ctypes.windll.kernel32
            user32 = ctypes.windll.user32
            
            # 获取当前控制台窗口
            console_window = kernel32.GetConsoleWindow()
            if console_window:
                # 隐藏控制台窗口
                user32.ShowWindow(console_window, SW_HIDE)
                
        except Exception as e:
            # 隐藏控制台失败不应影响服务运行
            pass
    
    def _setup_logging(self):
        """设置日志"""
        try:
            # 获取服务目录
            service_dir = Path(sys.executable).parent
            config_path = service_dir / "config" / "config.yaml"
            
            # 如果配置文件不存在，使用默认路径
            if not config_path.exists():
                # 尝试从当前目录查找
                current_dir = Path.cwd()
                config_path = current_dir / "config" / "config.yaml"
                
                if not config_path.exists():
                    # 使用相对于脚本的路径
                    script_dir = Path(__file__).parent.parent.parent
                    config_path = script_dir / "config" / "config.yaml"
            
            # 加载配置
            config_manager = ConfigManager(str(config_path))
            config = config_manager.get_config()
            
            # 设置日志
            self.logger = setup_logger(config.logging)
            
        except Exception as e:
            # 如果日志设置失败，使用基本日志
            import logging
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            self.logger = logging.getLogger("ScreenMonitorService")
            self.logger.error(f"日志设置失败: {e}")
    
    def _initialize_client(self):
        """初始化客户端"""
        try:
            # 获取配置文件路径
            service_dir = Path(sys.executable).parent
            config_path = service_dir / "config" / "config.yaml"
            
            if not config_path.exists():
                current_dir = Path.cwd()
                config_path = current_dir / "config" / "config.yaml"
                
                if not config_path.exists():
                    script_dir = Path(__file__).parent.parent.parent
                    config_path = script_dir / "config" / "config.yaml"
            
            # 创建客户端
            self.client = ScreenMonitorClient(str(config_path))
            
        except Exception as e:
            self.logger.error(f"初始化客户端失败: {e}")
            raise
    
    def _start_client(self):
        """启动客户端"""
        try:
            self._running = True
            
            # 在单独线程中运行客户端
            self._client_thread = threading.Thread(
                target=self._run_client,
                name="ClientThread",
                daemon=True
            )
            self._client_thread.start()
            
        except Exception as e:
            self.logger.error(f"启动客户端失败: {e}")
            raise
    
    def _run_client(self):
        """运行客户端"""
        try:
            # 启动客户端
            self.client.start()
            
            # 保持运行
            while self._running:
                time.sleep(1)
                
                # 检查客户端状态
                if not self.client.is_running():
                    self.logger.warning("客户端已停止，尝试重启...")
                    try:
                        self.client.start()
                    except Exception as e:
                        self.logger.error(f"重启客户端失败: {e}")
                        time.sleep(30)  # 等待30秒后重试
        
        except Exception as e:
            self.logger.error(f"客户端运行异常: {e}")


class WindowsServiceManager:
    """Windows服务管理器"""
    
    def __init__(self, logger=None):
        """初始化服务管理器
        
        Args:
            logger: 日志记录器
        """
        self.logger = logger
        
        if win32serviceutil is None:
            raise ImportError("pywin32 未安装，无法管理Windows服务")
    
    def install_service(self, service_class=None, service_name=None, 
                       display_name=None, description=None, 
                       start_type=None, python_exe=None, script_path=None) -> bool:
        """安装Windows服务
        
        Args:
            service_class: 服务类
            service_name: 服务名称
            display_name: 显示名称
            description: 服务描述
            start_type: 启动类型
            python_exe: Python可执行文件路径
            script_path: 脚本路径
        
        Returns:
            是否安装成功
        """
        try:
            # 使用默认值
            if service_class is None:
                service_class = ScreenMonitorService
            
            if service_name is None:
                service_name = service_class._svc_name_
            
            if display_name is None:
                display_name = service_class._svc_display_name_
            
            if description is None:
                description = service_class._svc_description_
            
            if start_type is None:
                start_type = win32service.SERVICE_AUTO_START
            
            if python_exe is None:
                python_exe = sys.executable
            
            if script_path is None:
                script_path = __file__
            
            # 检查服务是否已存在
            if self.is_service_installed(service_name):
                if self.logger:
                    self.logger.warning(f"服务 {service_name} 已存在")
                return True
            
            # 安装服务
            if self.logger:
                self.logger.info(f"正在安装服务: {service_name}")
            
            win32serviceutil.InstallService(
                python_exe,
                service_class.__module__ + "." + service_class.__name__,
                service_name,
                displayName=display_name,
                description=description,
                startType=start_type
            )
            
            if self.logger:
                self.logger.info(f"服务 {service_name} 安装成功")
            
            return True
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"安装服务失败: {e}")
            else:
                print(f"安装服务失败: {e}")
            return False
    
    def uninstall_service(self, service_name: str = None) -> bool:
        """卸载Windows服务
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否卸载成功
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            # 检查服务是否存在
            if not self.is_service_installed(service_name):
                if self.logger:
                    self.logger.warning(f"服务 {service_name} 不存在")
                return True
            
            # 停止服务
            self.stop_service(service_name)
            
            # 卸载服务
            if self.logger:
                self.logger.info(f"正在卸载服务: {service_name}")
            
            win32serviceutil.RemoveService(service_name)
            
            if self.logger:
                self.logger.info(f"服务 {service_name} 卸载成功")
            
            return True
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"卸载服务失败: {e}")
            else:
                print(f"卸载服务失败: {e}")
            return False
    
    def start_service(self, service_name: str = None) -> bool:
        """启动Windows服务
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否启动成功
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            if self.logger:
                self.logger.info(f"正在启动服务: {service_name}")
            
            win32serviceutil.StartService(service_name)
            
            if self.logger:
                self.logger.info(f"服务 {service_name} 启动成功")
            
            return True
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"启动服务失败: {e}")
            else:
                print(f"启动服务失败: {e}")
            return False
    
    def stop_service(self, service_name: str = None) -> bool:
        """停止Windows服务
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否停止成功
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            if self.logger:
                self.logger.info(f"正在停止服务: {service_name}")
            
            win32serviceutil.StopService(service_name)
            
            if self.logger:
                self.logger.info(f"服务 {service_name} 停止成功")
            
            return True
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"停止服务失败: {e}")
            else:
                print(f"停止服务失败: {e}")
            return False
    
    def restart_service(self, service_name: str = None) -> bool:
        """重启Windows服务
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否重启成功
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            if self.logger:
                self.logger.info(f"正在重启服务: {service_name}")
            
            # 停止服务
            self.stop_service(service_name)
            time.sleep(2)
            
            # 启动服务
            self.start_service(service_name)
            
            if self.logger:
                self.logger.info(f"服务 {service_name} 重启成功")
            
            return True
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"重启服务失败: {e}")
            else:
                print(f"重启服务失败: {e}")
            return False
    
    def get_service_status(self, service_name: str = None) -> Optional[str]:
        """获取服务状态
        
        Args:
            service_name: 服务名称
        
        Returns:
            服务状态字符串
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            status = win32serviceutil.QueryServiceStatus(service_name)[1]
            
            status_map = {
                win32service.SERVICE_STOPPED: "已停止",
                win32service.SERVICE_START_PENDING: "正在启动",
                win32service.SERVICE_STOP_PENDING: "正在停止",
                win32service.SERVICE_RUNNING: "正在运行",
                win32service.SERVICE_CONTINUE_PENDING: "正在继续",
                win32service.SERVICE_PAUSE_PENDING: "正在暂停",
                win32service.SERVICE_PAUSED: "已暂停"
            }
            
            return status_map.get(status, f"未知状态({status})")
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"获取服务状态失败: {e}")
            return None
    
    def is_service_installed(self, service_name: str = None) -> bool:
        """检查服务是否已安装
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否已安装
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            win32serviceutil.QueryServiceStatus(service_name)
            return True
        
        except Exception:
            return False
    
    def is_service_running(self, service_name: str = None) -> bool:
        """检查服务是否正在运行
        
        Args:
            service_name: 服务名称
        
        Returns:
            是否正在运行
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            status = win32serviceutil.QueryServiceStatus(service_name)[1]
            return status == win32service.SERVICE_RUNNING
        
        except Exception:
            return False
    
    def set_service_startup_type(self, service_name: str = None, 
                                startup_type: str = "auto") -> bool:
        """设置服务启动类型
        
        Args:
            service_name: 服务名称
            startup_type: 启动类型 (auto, manual, disabled)
        
        Returns:
            是否设置成功
        """
        try:
            if service_name is None:
                service_name = ScreenMonitorService._svc_name_
            
            startup_map = {
                "auto": win32service.SERVICE_AUTO_START,
                "manual": win32service.SERVICE_DEMAND_START,
                "disabled": win32service.SERVICE_DISABLED
            }
            
            start_type = startup_map.get(startup_type.lower())
            if start_type is None:
                raise ValueError(f"无效的启动类型: {startup_type}")
            
            # 打开服务管理器
            hscm = win32service.OpenSCManager(
                None, None, win32service.SC_MANAGER_ALL_ACCESS
            )
            
            try:
                # 打开服务
                hs = win32service.OpenService(
                    hscm, service_name, win32service.SERVICE_ALL_ACCESS
                )
                
                try:
                    # 修改服务配置
                    win32service.ChangeServiceConfig(
                        hs,
                        win32service.SERVICE_NO_CHANGE,  # dwServiceType
                        start_type,  # dwStartType
                        win32service.SERVICE_NO_CHANGE,  # dwErrorControl
                        None,  # lpBinaryPathName
                        None,  # lpLoadOrderGroup
                        0,     # lpdwTagId
                        None,  # lpDependencies
                        None,  # lpServiceStartName
                        None,  # lpPassword
                        None   # lpDisplayName
                    )
                    
                    if self.logger:
                        self.logger.info(f"服务 {service_name} 启动类型已设置为: {startup_type}")
                    
                    return True
                
                finally:
                    win32service.CloseServiceHandle(hs)
            
            finally:
                win32service.CloseServiceHandle(hscm)
        
        except Exception as e:
            if self.logger:
                self.logger.error(f"设置服务启动类型失败: {e}")
            else:
                print(f"设置服务启动类型失败: {e}")
            return False


def main():
    """主函数 - 用于命令行操作"""
    if len(sys.argv) == 1:
        # 作为服务运行
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(ScreenMonitorService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        # 命令行操作
        win32serviceutil.HandleCommandLine(ScreenMonitorService)


if __name__ == '__main__':
    main()