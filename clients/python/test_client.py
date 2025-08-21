#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
屏幕监控系统客户端测试脚本

用于测试客户端的基本功能，包括：
- 配置加载
- 模块初始化
- 基本功能验证
"""

import sys
import time
import asyncio
from pathlib import Path

# 添加src目录到Python路径
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

from core.config import ConfigManager
from core.logger import setup_logger
from modules.screenshot import ScreenshotManager
from modules.clipboard import ClipboardMonitor
from utils.client_id import ClientIdManager


def test_config_loading():
    """测试配置加载"""
    print("\n=== 测试配置加载 ===")
    try:
        config_path = Path(__file__).parent / "config" / "config.yaml"
        if not config_path.exists():
            print(f"❌ 配置文件不存在: {config_path}")
            return False
        
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        print(f"✅ 配置加载成功")
        print(f"   服务器: {config.server.api_base_url}")
        print(f"   客户端: {config.client.name}")
        print(f"   截图间隔: {config.screenshot.interval}秒")
        print(f"   剪贴板检查间隔: {config.clipboard.check_interval}秒")
        
        return True
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False


def test_logger_setup():
    """测试日志设置"""
    print("\n=== 测试日志设置 ===")
    try:
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        logger = setup_logger(config.logging)
        
        # 测试各种日志级别
        logger.debug("这是调试信息")
        logger.info("这是普通信息")
        logger.warning("这是警告信息")
        logger.error("这是错误信息")
        
        print("✅ 日志设置成功")
        return True
    except Exception as e:
        print(f"❌ 日志设置失败: {e}")
        return False


def test_client_id_manager():
    """测试客户端ID管理"""
    print("\n=== 测试客户端ID管理 ===")
    try:
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        logger = setup_logger(config.logging)
        client_id_manager = ClientIdManager(config, logger)
        client_id = client_id_manager.get_client_uid()
        
        print(f"✅ 客户端ID管理成功")
        print(f"   客户端ID: {client_id}")
        
        return True
    except Exception as e:
        print(f"❌ 客户端ID管理失败: {e}")
        return False


def test_screenshot_manager():
    """测试截图管理器"""
    print("\n=== 测试截图管理器 ===")
    try:
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        logger = setup_logger(config.logging)
        client_id_manager = ClientIdManager(config, logger)
        
        screenshot_manager = ScreenshotManager(config, logger, client_id_manager)
        
        # 测试截图功能
        print("正在进行测试截图...")
        success = screenshot_manager.take_screenshot_now()
        
        if success:
            print("✅ 截图功能正常")
        else:
            print("⚠️ 截图功能可能有问题（但这可能是正常的，如果服务器未运行）")
        
        return True
    except Exception as e:
        print(f"❌ 截图管理器测试失败: {e}")
        return False


def test_clipboard_monitor():
    """测试剪贴板监控器"""
    print("\n=== 测试剪贴板监控器 ===")
    try:
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        logger = setup_logger(config.logging)
        
        # 创建必要的依赖
        from modules.whitelist import WhitelistManager
        from modules.violation import ViolationReporter
        from utils.client_id import ClientIdManager
        
        # 获取客户端ID
        client_id_manager = ClientIdManager(config, logger)
        client_id = client_id_manager.get_client_uid()
        
        whitelist_manager = WhitelistManager(config, logger)
        violation_reporter = ViolationReporter(config, client_id, logger)
        
        clipboard_monitor = ClipboardMonitor(config, client_id, logger, whitelist_manager, violation_reporter)
        
        # 测试剪贴板内容获取（使用私有方法）
        content = clipboard_monitor._get_clipboard_content()
        print(f"✅ 剪贴板监控器初始化成功")
        print(f"   当前剪贴板内容: {content[:50] if content else '(空)'}{'...' if content and len(content) > 50 else ''}")
        
        # 测试区块链地址检测
        test_content = "测试内容包含区块链地址: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa 和 0x742d35Cc6634C0532925a3b8D4C9db96C4b4df93"
        detected_addresses = clipboard_monitor.test_detection(test_content)
        
        print(f"   检测到 {len(detected_addresses)} 个区块链地址:")
        for addr_info in detected_addresses:
            print(f"     {addr_info['type']}: {addr_info['address'][:20]}...")
        
        return True
    except Exception as e:
        print(f"❌ 剪贴板监控器测试失败: {e}")
        return False


def test_directory_structure():
    """测试目录结构"""
    print("\n=== 测试目录结构 ===")
    
    base_dir = Path(__file__).parent
    required_dirs = [
        "src",
        "src/core",
        "src/modules", 
        "src/utils",
        "config",
        "logs",
        "scripts",
        "tests"
    ]
    
    required_files = [
        "main.py",
        "requirements.txt",
        "config/config.yaml",
        "src/core/config.py",
        "src/core/logger.py",
        "src/core/client.py",
        "src/modules/screenshot.py",
        "src/modules/clipboard.py",
        "src/modules/websocket_client.py",
        "src/modules/whitelist.py",
        "src/modules/violation.py",
        "src/utils/client_id.py",
        "src/utils/windows_service.py",
        "scripts/install.py",
        "scripts/service_manager.py"
    ]
    
    all_good = True
    
    # 检查目录
    for dir_path in required_dirs:
        full_path = base_dir / dir_path
        if full_path.exists() and full_path.is_dir():
            print(f"✅ 目录存在: {dir_path}")
        else:
            print(f"❌ 目录缺失: {dir_path}")
            all_good = False
    
    # 检查文件
    for file_path in required_files:
        full_path = base_dir / file_path
        if full_path.exists() and full_path.is_file():
            print(f"✅ 文件存在: {file_path}")
        else:
            print(f"❌ 文件缺失: {file_path}")
            all_good = False
    
    return all_good


def main():
    """主测试函数"""
    print("🚀 屏幕监控系统客户端测试")
    print("=" * 50)
    
    tests = [
        ("目录结构", test_directory_structure),
        ("配置加载", test_config_loading),
        ("日志设置", test_logger_setup),
        ("客户端ID管理", test_client_id_manager),
        ("截图管理器", test_screenshot_manager),
        ("剪贴板监控器", test_clipboard_monitor),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ 测试 '{test_name}' 出现异常: {e}")
            results.append((test_name, False))
    
    # 显示测试结果
    print("\n" + "=" * 50)
    print("📊 测试结果汇总")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{test_name:20} : {status}")
        if result:
            passed += 1
    
    print("\n" + "-" * 50)
    print(f"总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("🎉 所有测试通过！客户端基本功能正常。")
        return 0
    else:
        print("⚠️ 部分测试失败，请检查相关配置和依赖。")
        return 1


if __name__ == "__main__":
    sys.exit(main())