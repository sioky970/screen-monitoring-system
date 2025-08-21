#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试构建脚本
验证构建环境和依赖
"""

import sys
import importlib
from pathlib import Path

def test_dependencies():
    """测试构建依赖"""
    print("🔍 检查构建依赖...")
    
    # 必需的包
    required_packages = [
        'requests',
        'PIL',
        'yaml', 
        'psutil',
        'websocket',
    ]
    
    # Windows特定包
    windows_packages = [
        'win32serviceutil',
        'win32service', 
        'win32event',
        'servicemanager',
        'win32api',
        'win32con',
        'win32gui',
        'win32clipboard',
    ]
    
    missing_packages = []
    
    # 检查通用包
    for package in required_packages:
        try:
            importlib.import_module(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package}")
            missing_packages.append(package)
    
    # 检查Windows包（仅在Windows上）
    if sys.platform == 'win32':
        for package in windows_packages:
            try:
                importlib.import_module(package)
                print(f"  ✅ {package}")
            except ImportError:
                print(f"  ❌ {package}")
                missing_packages.append(package)
    else:
        print("  ⚠️ 非Windows系统，跳过Windows特定包检查")
    
    # 检查PyInstaller
    try:
        import PyInstaller
        print(f"  ✅ PyInstaller {PyInstaller.__version__}")
    except ImportError:
        print("  ❌ PyInstaller")
        missing_packages.append('PyInstaller')
    
    if missing_packages:
        print(f"\n❌ 缺少依赖包: {', '.join(missing_packages)}")
        print("请运行以下命令安装:")
        if 'PyInstaller' in missing_packages:
            print("  pip install pyinstaller")
        if any(pkg in windows_packages for pkg in missing_packages):
            print("  pip install pywin32")
        print("  pip install -r requirements.txt")
        return False
    else:
        print("\n✅ 所有依赖检查通过")
        return True

def test_project_structure():
    """测试项目结构"""
    print("\n🔍 检查项目结构...")
    
    project_root = Path(__file__).parent
    
    required_files = [
        "main.py",
        "src/core/client.py",
        "src/modules/screenshot.py",
        "src/utils/windows_service.py",
        "scripts/service_manager.py",
        "config/config.yaml",
        "requirements.txt"
    ]
    
    missing_files = []
    
    for file_path in required_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"  ✅ {file_path}")
        else:
            print(f"  ❌ {file_path}")
            missing_files.append(file_path)
    
    if missing_files:
        print(f"\n❌ 缺少文件: {', '.join(missing_files)}")
        return False
    else:
        print("\n✅ 项目结构检查通过")
        return True

def test_config():
    """测试配置文件"""
    print("\n🔍 检查配置文件...")
    
    try:
        sys.path.insert(0, str(Path(__file__).parent / "src"))
        from core.config import ConfigManager
        
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        print(f"  ✅ 配置加载成功")
        print(f"  📍 服务器地址: {config.server.api_base_url}")
        print(f"  🏷️ 客户端名称: {config.client.name}")
        print(f"  📸 截图间隔: {config.screenshot.interval}秒")
        
        return True
    except Exception as e:
        print(f"  ❌ 配置文件错误: {e}")
        return False

def main():
    """主函数"""
    print("🧪 屏幕监控客户端构建环境测试")
    print("=" * 50)
    
    all_passed = True
    
    # 测试依赖
    if not test_dependencies():
        all_passed = False
    
    # 测试项目结构
    if not test_project_structure():
        all_passed = False
    
    # 测试配置
    if not test_config():
        all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 所有测试通过！可以开始构建exe程序")
        print("\n下一步:")
        print("1. 在Windows环境中运行 build.bat")
        print("2. 或者运行 python build.py")
    else:
        print("❌ 测试失败，请修复上述问题后重试")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
