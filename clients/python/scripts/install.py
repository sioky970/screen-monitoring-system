#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屏幕监控系统安装脚本

功能：
- 检查系统环境
- 安装依赖包
- 配置服务
- 设置开机自启动
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path
from typing import List, Tuple


class ScreenMonitorInstaller:
    """屏幕监控系统安装器"""
    
    def __init__(self):
        """初始化安装器"""
        self.script_dir = Path(__file__).parent
        self.project_dir = self.script_dir.parent
        self.install_dir = Path("C:/Program Files/ScreenMonitor")
        self.config_dir = self.install_dir / "config"
        self.logs_dir = self.install_dir / "logs"
        
        # 检查管理员权限
        self.is_admin = self._check_admin_rights()
        
        print("屏幕监控系统安装器")
        print("=" * 50)
    
    def _check_admin_rights(self) -> bool:
        """检查管理员权限
        
        Returns:
            是否具有管理员权限
        """
        try:
            import ctypes
            return ctypes.windll.shell32.IsUserAnAdmin()
        except Exception:
            return False
    
    def _run_command(self, command: List[str], check: bool = True) -> Tuple[bool, str]:
        """运行命令
        
        Args:
            command: 命令列表
            check: 是否检查返回码
        
        Returns:
            (是否成功, 输出信息)
        """
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=check
            )
            return True, result.stdout
        
        except subprocess.CalledProcessError as e:
            return False, f"命令执行失败: {e.stderr}"
        
        except Exception as e:
            return False, f"命令执行异常: {e}"
    
    def check_requirements(self) -> bool:
        """检查系统要求
        
        Returns:
            是否满足要求
        """
        print("\n1. 检查系统要求...")
        
        # 检查Python版本
        python_version = sys.version_info
        if python_version < (3, 7):
            print(f"❌ Python版本过低: {python_version.major}.{python_version.minor}")
            print("   需要Python 3.7或更高版本")
            return False
        
        print(f"✅ Python版本: {python_version.major}.{python_version.minor}.{python_version.micro}")
        
        # 检查操作系统
        if sys.platform != "win32":
            print(f"❌ 不支持的操作系统: {sys.platform}")
            print("   仅支持Windows系统")
            return False
        
        print("✅ 操作系统: Windows")
        
        # 检查管理员权限
        if not self.is_admin:
            print("❌ 需要管理员权限")
            print("   请以管理员身份运行此脚本")
            return False
        
        print("✅ 管理员权限")
        
        # 检查pip
        success, output = self._run_command([sys.executable, "-m", "pip", "--version"])
        if not success:
            print("❌ pip未安装或不可用")
            return False
        
        print("✅ pip可用")
        
        return True
    
    def install_dependencies(self) -> bool:
        """安装依赖包
        
        Returns:
            是否安装成功
        """
        print("\n2. 安装依赖包...")
        
        requirements_file = self.project_dir / "requirements.txt"
        if not requirements_file.exists():
            print(f"❌ 依赖文件不存在: {requirements_file}")
            return False
        
        # 升级pip
        print("   升级pip...")
        success, output = self._run_command([
            sys.executable, "-m", "pip", "install", "--upgrade", "pip"
        ])
        
        if not success:
            print(f"⚠️  pip升级失败: {output}")
        else:
            print("   ✅ pip已升级")
        
        # 安装依赖
        print("   安装项目依赖...")
        success, output = self._run_command([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        
        if not success:
            print(f"❌ 依赖安装失败: {output}")
            return False
        
        print("   ✅ 依赖安装成功")
        return True
    
    def create_directories(self) -> bool:
        """创建目录结构
        
        Returns:
            是否创建成功
        """
        print("\n3. 创建目录结构...")
        
        try:
            # 创建安装目录
            self.install_dir.mkdir(parents=True, exist_ok=True)
            print(f"   ✅ 安装目录: {self.install_dir}")
            
            # 创建配置目录
            self.config_dir.mkdir(parents=True, exist_ok=True)
            print(f"   ✅ 配置目录: {self.config_dir}")
            
            # 创建日志目录
            self.logs_dir.mkdir(parents=True, exist_ok=True)
            print(f"   ✅ 日志目录: {self.logs_dir}")
            
            return True
        
        except Exception as e:
            print(f"❌ 创建目录失败: {e}")
            return False
    
    def copy_files(self) -> bool:
        """复制文件
        
        Returns:
            是否复制成功
        """
        print("\n4. 复制程序文件...")
        
        try:
            # 复制源代码
            src_dir = self.project_dir / "src"
            dst_src_dir = self.install_dir / "src"
            
            if dst_src_dir.exists():
                shutil.rmtree(dst_src_dir)
            
            shutil.copytree(src_dir, dst_src_dir)
            print(f"   ✅ 源代码: {src_dir} -> {dst_src_dir}")
            
            # 复制配置文件
            config_src = self.project_dir / "config" / "config.yaml"
            config_dst = self.config_dir / "config.yaml"
            
            if config_src.exists():
                shutil.copy2(config_src, config_dst)
                print(f"   ✅ 配置文件: {config_src} -> {config_dst}")
            
            # 复制主程序
            main_src = self.project_dir / "main.py"
            main_dst = self.install_dir / "main.py"
            
            if main_src.exists():
                shutil.copy2(main_src, main_dst)
                print(f"   ✅ 主程序: {main_src} -> {main_dst}")
            
            # 复制依赖文件
            req_src = self.project_dir / "requirements.txt"
            req_dst = self.install_dir / "requirements.txt"
            
            if req_src.exists():
                shutil.copy2(req_src, req_dst)
                print(f"   ✅ 依赖文件: {req_src} -> {req_dst}")
            
            return True
        
        except Exception as e:
            print(f"❌ 文件复制失败: {e}")
            return False
    
    def install_service(self) -> bool:
        """安装Windows服务
        
        Returns:
            是否安装成功
        """
        print("\n5. 安装Windows服务...")
        
        try:
            # 导入服务模块
            sys.path.insert(0, str(self.install_dir / "src"))
            
            from utils.windows_service import WindowsServiceManager
            
            # 创建服务管理器
            service_manager = WindowsServiceManager()
            
            # 安装服务
            success = service_manager.install_service(
                python_exe=sys.executable,
                script_path=str(self.install_dir / "src" / "utils" / "windows_service.py")
            )
            
            if not success:
                print("❌ 服务安装失败")
                return False
            
            print("   ✅ Windows服务安装成功")
            
            # 设置自动启动
            success = service_manager.set_service_startup_type(startup_type="auto")
            if success:
                print("   ✅ 服务已设置为自动启动")
            else:
                print("   ⚠️  设置自动启动失败")
            
            return True
        
        except Exception as e:
            print(f"❌ 服务安装异常: {e}")
            return False
    
    def create_shortcuts(self) -> bool:
        """创建快捷方式
        
        Returns:
            是否创建成功
        """
        print("\n6. 创建快捷方式...")
        
        try:
            # 创建桌面快捷方式（可选）
            desktop = Path.home() / "Desktop"
            if desktop.exists():
                # 这里可以添加创建快捷方式的代码
                print("   ✅ 桌面快捷方式（跳过）")
            
            # 创建开始菜单快捷方式（可选）
            start_menu = Path.home() / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs"
            if start_menu.exists():
                # 这里可以添加创建快捷方式的代码
                print("   ✅ 开始菜单快捷方式（跳过）")
            
            return True
        
        except Exception as e:
            print(f"❌ 创建快捷方式失败: {e}")
            return False
    
    def start_service(self) -> bool:
        """启动服务
        
        Returns:
            是否启动成功
        """
        print("\n7. 启动服务...")
        
        try:
            # 导入服务模块
            sys.path.insert(0, str(self.install_dir / "src"))
            
            from utils.windows_service import WindowsServiceManager
            
            # 创建服务管理器
            service_manager = WindowsServiceManager()
            
            # 启动服务
            success = service_manager.start_service()
            
            if not success:
                print("❌ 服务启动失败")
                return False
            
            print("   ✅ 服务启动成功")
            
            # 检查服务状态
            status = service_manager.get_service_status()
            print(f"   服务状态: {status}")
            
            return True
        
        except Exception as e:
            print(f"❌ 服务启动异常: {e}")
            return False
    
    def install(self) -> bool:
        """执行完整安装
        
        Returns:
            是否安装成功
        """
        print("开始安装屏幕监控系统...")
        
        # 检查系统要求
        if not self.check_requirements():
            return False
        
        # 安装依赖
        if not self.install_dependencies():
            return False
        
        # 创建目录
        if not self.create_directories():
            return False
        
        # 复制文件
        if not self.copy_files():
            return False
        
        # 安装服务
        if not self.install_service():
            return False
        
        # 创建快捷方式
        if not self.create_shortcuts():
            return False
        
        # 启动服务
        if not self.start_service():
            return False
        
        print("\n" + "=" * 50)
        print("✅ 屏幕监控系统安装完成！")
        print(f"   安装目录: {self.install_dir}")
        print(f"   配置文件: {self.config_dir / 'config.yaml'}")
        print(f"   日志目录: {self.logs_dir}")
        print("\n服务已启动并设置为开机自启动。")
        
        return True
    
    def uninstall(self) -> bool:
        """卸载系统
        
        Returns:
            是否卸载成功
        """
        print("开始卸载屏幕监控系统...")
        
        try:
            # 停止并卸载服务
            print("\n1. 卸载Windows服务...")
            
            try:
                sys.path.insert(0, str(self.install_dir / "src"))
                from utils.windows_service import WindowsServiceManager
                
                service_manager = WindowsServiceManager()
                
                # 停止服务
                service_manager.stop_service()
                print("   ✅ 服务已停止")
                
                # 卸载服务
                success = service_manager.uninstall_service()
                if success:
                    print("   ✅ 服务已卸载")
                else:
                    print("   ⚠️  服务卸载失败")
            
            except Exception as e:
                print(f"   ⚠️  服务卸载异常: {e}")
            
            # 删除文件
            print("\n2. 删除程序文件...")
            
            if self.install_dir.exists():
                try:
                    shutil.rmtree(self.install_dir)
                    print(f"   ✅ 已删除: {self.install_dir}")
                except Exception as e:
                    print(f"   ⚠️  删除失败: {e}")
            
            print("\n" + "=" * 50)
            print("✅ 屏幕监控系统卸载完成！")
            
            return True
        
        except Exception as e:
            print(f"❌ 卸载失败: {e}")
            return False


def main():
    """主函数"""
    installer = ScreenMonitorInstaller()
    
    if len(sys.argv) > 1 and sys.argv[1] == "uninstall":
        # 卸载
        success = installer.uninstall()
    else:
        # 安装
        success = installer.install()
    
    if not success:
        print("\n操作失败！")
        sys.exit(1)
    
    print("\n按任意键退出...")
    input()


if __name__ == "__main__":
    main()