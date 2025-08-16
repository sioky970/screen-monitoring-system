#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
服务管理脚本

功能：
- 服务安装/卸载
- 服务启动/停止/重启
- 服务状态查询
- 配置管理
"""

import sys
import argparse
from pathlib import Path

# 添加项目路径
project_dir = Path(__file__).parent.parent
sys.path.insert(0, str(project_dir / "src"))

try:
    from utils.windows_service import WindowsServiceManager, ScreenMonitorService
    from core.config import ConfigManager
    from core.logger import setup_logger
except ImportError as e:
    print(f"导入模块失败: {e}")
    print("请确保已安装所有依赖包")
    sys.exit(1)


class ServiceManagerCLI:
    """服务管理命令行界面"""
    
    def __init__(self):
        """初始化服务管理器"""
        self.service_manager = None
        self.logger = None
        
        try:
            # 初始化日志
            config_path = project_dir / "config" / "config.yaml"
            if config_path.exists():
                config_manager = ConfigManager(str(config_path))
                config = config_manager.get_config()
                self.logger = setup_logger(config.logging)
            
            # 创建服务管理器
            self.service_manager = WindowsServiceManager(self.logger)
            
        except Exception as e:
            print(f"初始化失败: {e}")
            sys.exit(1)
    
    def install(self, args) -> bool:
        """安装服务
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        print("正在安装屏幕监控服务...")
        
        try:
            # 检查服务是否已存在
            if self.service_manager.is_service_installed():
                print("服务已安装")
                
                if not args.force:
                    choice = input("是否重新安装? (y/N): ")
                    if choice.lower() != 'y':
                        return True
                
                # 卸载现有服务
                print("卸载现有服务...")
                self.service_manager.uninstall_service()
            
            # 安装服务
            success = self.service_manager.install_service(
                python_exe=args.python_exe or sys.executable,
                script_path=args.script_path
            )
            
            if success:
                print("✅ 服务安装成功")
                
                # 设置启动类型
                if args.startup_type:
                    self.service_manager.set_service_startup_type(
                        startup_type=args.startup_type
                    )
                    print(f"✅ 启动类型已设置为: {args.startup_type}")
                
                # 自动启动服务
                if args.start:
                    self.start(args)
                
                return True
            else:
                print("❌ 服务安装失败")
                return False
        
        except Exception as e:
            print(f"❌ 安装服务时出错: {e}")
            return False
    
    def uninstall(self, args) -> bool:
        """卸载服务
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        print("正在卸载屏幕监控服务...")
        
        try:
            # 检查服务是否存在
            if not self.service_manager.is_service_installed():
                print("服务未安装")
                return True
            
            # 确认卸载
            if not args.force:
                choice = input("确定要卸载服务吗? (y/N): ")
                if choice.lower() != 'y':
                    return True
            
            # 卸载服务
            success = self.service_manager.uninstall_service()
            
            if success:
                print("✅ 服务卸载成功")
                return True
            else:
                print("❌ 服务卸载失败")
                return False
        
        except Exception as e:
            print(f"❌ 卸载服务时出错: {e}")
            return False
    
    def start(self, args) -> bool:
        """启动服务
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        print("正在启动屏幕监控服务...")
        
        try:
            # 检查服务是否已安装
            if not self.service_manager.is_service_installed():
                print("❌ 服务未安装")
                return False
            
            # 检查服务是否已运行
            if self.service_manager.is_service_running():
                print("服务已在运行中")
                return True
            
            # 启动服务
            success = self.service_manager.start_service()
            
            if success:
                print("✅ 服务启动成功")
                return True
            else:
                print("❌ 服务启动失败")
                return False
        
        except Exception as e:
            print(f"❌ 启动服务时出错: {e}")
            return False
    
    def stop(self, args) -> bool:
        """停止服务
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        print("正在停止屏幕监控服务...")
        
        try:
            # 检查服务是否已安装
            if not self.service_manager.is_service_installed():
                print("❌ 服务未安装")
                return False
            
            # 检查服务是否已停止
            if not self.service_manager.is_service_running():
                print("服务已停止")
                return True
            
            # 停止服务
            success = self.service_manager.stop_service()
            
            if success:
                print("✅ 服务停止成功")
                return True
            else:
                print("❌ 服务停止失败")
                return False
        
        except Exception as e:
            print(f"❌ 停止服务时出错: {e}")
            return False
    
    def restart(self, args) -> bool:
        """重启服务
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        print("正在重启屏幕监控服务...")
        
        try:
            # 检查服务是否已安装
            if not self.service_manager.is_service_installed():
                print("❌ 服务未安装")
                return False
            
            # 重启服务
            success = self.service_manager.restart_service()
            
            if success:
                print("✅ 服务重启成功")
                return True
            else:
                print("❌ 服务重启失败")
                return False
        
        except Exception as e:
            print(f"❌ 重启服务时出错: {e}")
            return False
    
    def status(self, args) -> bool:
        """查询服务状态
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        try:
            print("屏幕监控服务状态:")
            print("-" * 30)
            
            # 检查服务是否已安装
            installed = self.service_manager.is_service_installed()
            print(f"已安装: {'是' if installed else '否'}")
            
            if installed:
                # 获取服务状态
                status = self.service_manager.get_service_status()
                print(f"状态: {status}")
                
                # 检查是否正在运行
                running = self.service_manager.is_service_running()
                print(f"运行中: {'是' if running else '否'}")
            
            return True
        
        except Exception as e:
            print(f"❌ 查询服务状态时出错: {e}")
            return False
    
    def config(self, args) -> bool:
        """配置管理
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        try:
            config_path = project_dir / "config" / "config.yaml"
            
            if args.config_action == "show":
                # 显示配置
                print(f"配置文件路径: {config_path}")
                
                if config_path.exists():
                    with open(config_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    print("\n配置内容:")
                    print("-" * 30)
                    print(content)
                else:
                    print("配置文件不存在")
            
            elif args.config_action == "edit":
                # 编辑配置
                import os
                if config_path.exists():
                    os.system(f'notepad "{config_path}"')
                else:
                    print("配置文件不存在")
            
            elif args.config_action == "validate":
                # 验证配置
                if config_path.exists():
                    try:
                        config_manager = ConfigManager(str(config_path))
                        config = config_manager.get_config()
                        print("✅ 配置文件有效")
                        print(f"服务器地址: {config.server.api_url}")
                        print(f"客户端名称: {config.client.name}")
                    except Exception as e:
                        print(f"❌ 配置文件无效: {e}")
                        return False
                else:
                    print("配置文件不存在")
                    return False
            
            return True
        
        except Exception as e:
            print(f"❌ 配置管理时出错: {e}")
            return False
    
    def logs(self, args) -> bool:
        """日志管理
        
        Args:
            args: 命令行参数
        
        Returns:
            是否成功
        """
        try:
            logs_dir = project_dir / "logs"
            
            if args.log_action == "show":
                # 显示日志目录
                print(f"日志目录: {logs_dir}")
                
                if logs_dir.exists():
                    log_files = list(logs_dir.glob("*.log"))
                    if log_files:
                        print("\n日志文件:")
                        for log_file in sorted(log_files):
                            size = log_file.stat().st_size
                            print(f"  {log_file.name} ({size} bytes)")
                    else:
                        print("没有日志文件")
                else:
                    print("日志目录不存在")
            
            elif args.log_action == "tail":
                # 显示最新日志
                log_file = logs_dir / "screen_monitor.log"
                if log_file.exists():
                    lines = args.lines or 50
                    with open(log_file, 'r', encoding='utf-8') as f:
                        content = f.readlines()
                    
                    print(f"\n最新 {lines} 行日志:")
                    print("-" * 50)
                    for line in content[-lines:]:
                        print(line.rstrip())
                else:
                    print("日志文件不存在")
            
            elif args.log_action == "clear":
                # 清除日志
                if logs_dir.exists():
                    log_files = list(logs_dir.glob("*.log"))
                    for log_file in log_files:
                        log_file.unlink()
                    print(f"✅ 已清除 {len(log_files)} 个日志文件")
                else:
                    print("日志目录不存在")
            
            return True
        
        except Exception as e:
            print(f"❌ 日志管理时出错: {e}")
            return False


def create_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器
    
    Returns:
        参数解析器
    """
    parser = argparse.ArgumentParser(
        description="屏幕监控服务管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest="command", help="可用命令")
    
    # 安装命令
    install_parser = subparsers.add_parser("install", help="安装服务")
    install_parser.add_argument("--python-exe", help="Python可执行文件路径")
    install_parser.add_argument("--script-path", help="服务脚本路径")
    install_parser.add_argument("--startup-type", choices=["auto", "manual", "disabled"], 
                               default="auto", help="启动类型")
    install_parser.add_argument("--start", action="store_true", help="安装后立即启动")
    install_parser.add_argument("--force", action="store_true", help="强制重新安装")
    
    # 卸载命令
    uninstall_parser = subparsers.add_parser("uninstall", help="卸载服务")
    uninstall_parser.add_argument("--force", action="store_true", help="强制卸载")
    
    # 启动命令
    subparsers.add_parser("start", help="启动服务")
    
    # 停止命令
    subparsers.add_parser("stop", help="停止服务")
    
    # 重启命令
    subparsers.add_parser("restart", help="重启服务")
    
    # 状态命令
    subparsers.add_parser("status", help="查询服务状态")
    
    # 配置命令
    config_parser = subparsers.add_parser("config", help="配置管理")
    config_parser.add_argument("config_action", choices=["show", "edit", "validate"], 
                              help="配置操作")
    
    # 日志命令
    logs_parser = subparsers.add_parser("logs", help="日志管理")
    logs_parser.add_argument("log_action", choices=["show", "tail", "clear"], 
                            help="日志操作")
    logs_parser.add_argument("--lines", type=int, help="显示行数（用于tail）")
    
    return parser


def main():
    """主函数"""
    parser = create_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # 创建服务管理器
    try:
        cli = ServiceManagerCLI()
    except Exception as e:
        print(f"初始化失败: {e}")
        sys.exit(1)
    
    # 执行命令
    command_map = {
        "install": cli.install,
        "uninstall": cli.uninstall,
        "start": cli.start,
        "stop": cli.stop,
        "restart": cli.restart,
        "status": cli.status,
        "config": cli.config,
        "logs": cli.logs
    }
    
    command_func = command_map.get(args.command)
    if command_func:
        try:
            success = command_func(args)
            if not success:
                sys.exit(1)
        except KeyboardInterrupt:
            print("\n操作已取消")
            sys.exit(1)
        except Exception as e:
            print(f"执行命令时出错: {e}")
            sys.exit(1)
    else:
        print(f"未知命令: {args.command}")
        sys.exit(1)


if __name__ == "__main__":
    main()