#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自动化构建脚本
将Python客户端编译为独立的exe程序
"""

import os
import sys
import shutil
import subprocess
import zipfile
from pathlib import Path
from datetime import datetime

class BuildManager:
    """构建管理器"""
    
    def __init__(self):
        """初始化构建管理器"""
        self.project_root = Path(__file__).parent
        self.src_dir = self.project_root / "src"
        self.build_dir = self.project_root / "build"
        self.dist_dir = self.project_root / "dist"
        self.output_dir = self.project_root / "output"
        
        # 版本信息
        self.version = "1.0.0"
        self.build_date = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        print(f"🔧 屏幕监控客户端构建工具 v{self.version}")
        print(f"📁 项目目录: {self.project_root}")
        print(f"📅 构建时间: {self.build_date}")
        print("-" * 60)
    
    def check_dependencies(self) -> bool:
        """检查构建依赖"""
        print("🔍 检查构建依赖...")
        
        try:
            # 检查PyInstaller
            import PyInstaller
            print(f"✅ PyInstaller: {PyInstaller.__version__}")
        except ImportError:
            print("❌ PyInstaller 未安装")
            print("请运行: pip install pyinstaller")
            return False
        
        try:
            # 检查项目依赖
            import requests
            import PIL
            import yaml
            import psutil
            print("✅ 项目依赖检查通过")
        except ImportError as e:
            print(f"❌ 项目依赖缺失: {e}")
            print("请运行: pip install -r requirements.txt")
            return False
        
        # 检查Windows服务依赖
        try:
            import win32serviceutil
            print("✅ Windows服务依赖检查通过")
        except ImportError:
            print("❌ pywin32 未安装")
            print("请运行: pip install pywin32")
            return False
        
        return True
    
    def clean_build(self):
        """清理构建目录"""
        print("🧹 清理构建目录...")
        
        dirs_to_clean = [self.build_dir, self.dist_dir, self.output_dir]
        
        for dir_path in dirs_to_clean:
            if dir_path.exists():
                shutil.rmtree(dir_path)
                print(f"  清理: {dir_path}")
        
        # 创建输出目录
        self.output_dir.mkdir(exist_ok=True)
        print("✅ 构建目录清理完成")
    
    def build_exe(self) -> bool:
        """构建exe程序"""
        print("🔨 开始构建exe程序...")
        
        try:
            # 切换到项目目录
            os.chdir(self.project_root)
            
            # 运行PyInstaller
            cmd = [
                sys.executable, "-m", "PyInstaller",
                "--clean",
                "--noconfirm", 
                "build_config.spec"
            ]
            
            print(f"执行命令: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print("✅ exe程序构建成功")
                return True
            else:
                print("❌ exe程序构建失败")
                print("错误输出:")
                print(result.stderr)
                return False
        
        except Exception as e:
            print(f"❌ 构建过程出错: {e}")
            return False
    
    def create_installer_package(self):
        """创建安装包"""
        print("📦 创建安装包...")
        
        # 源目录
        source_dir = self.dist_dir / "ScreenMonitorClient"
        if not source_dir.exists():
            print("❌ 构建输出目录不存在")
            return False
        
        # 创建安装包目录结构
        package_name = f"ScreenMonitorClient_v{self.version}_{self.build_date}"
        package_dir = self.output_dir / package_name
        package_dir.mkdir(exist_ok=True)
        
        # 复制程序文件
        print("  复制程序文件...")
        shutil.copytree(source_dir, package_dir / "app", dirs_exist_ok=True)
        
        # 创建配置目录
        config_dir = package_dir / "config"
        config_dir.mkdir(exist_ok=True)
        
        # 复制配置文件
        config_files = [
            self.project_root / "config" / "config.yaml",
            self.project_root / "config" / "config.prod.yaml"
        ]
        
        for config_file in config_files:
            if config_file.exists():
                shutil.copy2(config_file, config_dir)
                print(f"  复制配置: {config_file.name}")
        
        # 创建日志目录
        (package_dir / "logs").mkdir(exist_ok=True)
        
        # 创建缓存目录
        (package_dir / "cache").mkdir(exist_ok=True)
        
        # 创建安装脚本
        self._create_install_script(package_dir)

        # 创建配置切换脚本
        self._create_config_scripts(package_dir)

        # 创建使用说明
        self._create_readme(package_dir)
        
        # 创建ZIP压缩包
        zip_path = self.output_dir / f"{package_name}.zip"
        self._create_zip_package(package_dir, zip_path)
        
        print(f"✅ 安装包创建完成: {zip_path}")
        return True
    
    def _create_install_script(self, package_dir: Path):
        """创建安装脚本"""
        install_script = package_dir / "install.bat"
        
        script_content = f'''@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   屏幕监控客户端安装程序 v{self.version}
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 请以管理员身份运行此脚本
    pause
    exit /b 1
)

:: 设置安装目录
set INSTALL_DIR=C:\\ScreenMonitor
set APP_DIR=%INSTALL_DIR%\\app
set CONFIG_DIR=%INSTALL_DIR%\\config
set LOGS_DIR=%INSTALL_DIR%\\logs

echo 📁 安装目录: %INSTALL_DIR%
echo.

:: 创建安装目录
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%LOGS_DIR%" mkdir "%LOGS_DIR%"

:: 复制程序文件
echo 📋 复制程序文件...
xcopy /E /I /Y "app" "%APP_DIR%"
xcopy /E /I /Y "config" "%CONFIG_DIR%"

:: 安装Windows服务
echo 🔧 安装Windows服务...
cd /d "%APP_DIR%"
ServiceManager.exe install --startup-type auto

if %errorLevel% equ 0 (
    echo ✅ 服务安装成功
    
    :: 启动服务
    echo 🚀 启动服务...
    ServiceManager.exe start
    
    if %errorLevel% equ 0 (
        echo ✅ 服务启动成功
        echo.
        echo 🎉 屏幕监控客户端安装完成！
        echo.
        echo 服务管理命令:
        echo   启动服务: "%APP_DIR%\\ServiceManager.exe" start
        echo   停止服务: "%APP_DIR%\\ServiceManager.exe" stop
        echo   查看状态: "%APP_DIR%\\ServiceManager.exe" status
        echo   卸载服务: "%APP_DIR%\\ServiceManager.exe" uninstall
    ) else (
        echo ❌ 服务启动失败
    )
) else (
    echo ❌ 服务安装失败
)

echo.
pause
'''
        
        with open(install_script, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        print(f"  创建安装脚本: {install_script.name}")

    def _create_config_scripts(self, package_dir: Path):
        """创建配置管理脚本"""
        # 复制配置切换脚本
        switch_script_src = self.project_root / "switch_config.py"
        switch_script_dst = package_dir / "switch_config.py"

        if switch_script_src.exists():
            shutil.copy2(switch_script_src, switch_script_dst)
            print(f"  复制配置切换脚本: {switch_script_dst.name}")

        # 复制服务器连接验证脚本
        verify_script_src = self.project_root / "verify_server_connection.py"
        verify_script_dst = package_dir / "verify_server_connection.py"

        if verify_script_src.exists():
            shutil.copy2(verify_script_src, verify_script_dst)
            print(f"  复制连接验证脚本: {verify_script_dst.name}")

        # 创建配置管理批处理文件
        config_bat = package_dir / "config_manager.bat"
        bat_content = f'''@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   屏幕监控客户端配置管理工具
echo ========================================
echo.

if "%1"=="" (
    echo 用法: config_manager.bat [命令]
    echo.
    echo 可用命令:
    echo   status  - 查看当前配置状态
    echo   dev     - 切换到开发环境
    echo   prod    - 切换到生产环境
    echo   verify  - 验证服务器连接
    echo.
    pause
    exit /b 0
)

cd /d "%~dp0"

if "%1"=="verify" (
    echo 🔍 验证服务器连接...
    python verify_server_connection.py
) else (
    echo 🔧 配置环境切换...
    python switch_config.py %1
)

echo.
pause
'''

        with open(config_bat, 'w', encoding='utf-8') as f:
            f.write(bat_content)

        print(f"  创建配置管理脚本: {config_bat.name}")

    def _create_readme(self, package_dir: Path):
        """创建使用说明"""
        readme_file = package_dir / "README.txt"
        
        readme_content = f'''屏幕监控客户端 v{self.version}
构建时间: {self.build_date}

========================================
安装说明
========================================

1. 以管理员身份运行 install.bat
2. 按照提示完成安装
3. 服务将自动启动并设置为开机自启动

========================================
目录结构
========================================

app/                    - 程序文件目录
├── ScreenMonitor.exe   - 主程序（后台服务）
├── ServiceManager.exe  - 服务管理工具
└── ...                 - 其他依赖文件

config/                 - 配置文件目录
├── config.yaml         - 默认配置
└── config.prod.yaml    - 生产环境配置

logs/                   - 日志文件目录
cache/                  - 缓存文件目录

========================================
服务管理
========================================

安装服务:
ServiceManager.exe install --startup-type auto

启动服务:
ServiceManager.exe start

停止服务:
ServiceManager.exe stop

重启服务:
ServiceManager.exe restart

查看状态:
ServiceManager.exe status

卸载服务:
ServiceManager.exe uninstall

========================================
配置说明
========================================

主要配置文件: config/config.yaml

重要配置项:
- server.api_base_url: 服务器地址
- client.name: 客户端名称
- screenshot.interval: 截图间隔（秒）
- clipboard.enabled: 是否启用剪贴板监控

修改配置后需要重启服务生效。

========================================
环境配置管理
========================================

配置环境切换:
config_manager.bat status    - 查看当前环境
config_manager.bat dev       - 切换到开发环境 (localhost:3001)
config_manager.bat prod      - 切换到生产环境 (43.160.250.175:3001)
config_manager.bat verify    - 验证服务器连接

手动切换:
python switch_config.py status
python switch_config.py dev
python switch_config.py prod

验证连接:
python verify_server_connection.py

========================================
故障排除
========================================

1. 查看日志文件: logs/client.log
2. 检查服务状态: ServiceManager.exe status
3. 验证配置文件: ServiceManager.exe config validate
4. 查看最新日志: ServiceManager.exe logs tail

========================================
技术支持
========================================

如遇问题，请联系技术支持并提供:
1. 错误日志文件
2. 配置文件内容
3. 系统环境信息
'''
        
        with open(readme_file, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print(f"  创建使用说明: {readme_file.name}")
    
    def _create_zip_package(self, package_dir: Path, zip_path: Path):
        """创建ZIP压缩包"""
        print(f"  创建压缩包: {zip_path.name}")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in package_dir.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(package_dir)
                    zipf.write(file_path, arcname)
    
    def build(self) -> bool:
        """执行完整构建流程"""
        print("🚀 开始构建流程...")
        print()
        
        # 检查依赖
        if not self.check_dependencies():
            return False
        print()
        
        # 清理构建目录
        self.clean_build()
        print()
        
        # 构建exe
        if not self.build_exe():
            return False
        print()
        
        # 创建安装包
        if not self.create_installer_package():
            return False
        print()
        
        print("🎉 构建完成！")
        print(f"📦 输出目录: {self.output_dir}")
        print()
        
        return True


def main():
    """主函数"""
    try:
        builder = BuildManager()
        success = builder.build()
        
        if success:
            print("✅ 构建成功完成")
            sys.exit(0)
        else:
            print("❌ 构建失败")
            sys.exit(1)
    
    except KeyboardInterrupt:
        print("\n⚠️ 构建被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 构建过程出错: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
