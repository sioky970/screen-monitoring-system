#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地功能测试脚本
只测试不需要网络连接的功能
"""

import sys
import os
from pathlib import Path

# 添加src目录到Python路径
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

def test_config_loading():
    """测试配置加载"""
    try:
        from core.config import AppConfig
        config = AppConfig()
        print("✅ 配置加载成功")
        print(f"   服务器地址: {config.server.host}:{config.server.port}")
        print(f"   截图间隔: {config.screenshot.interval}秒")
        return True
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False

def test_logger_setup():
    """测试日志设置"""
    try:
        from core.logger import setup_logger
        logger = setup_logger()
        logger.info("测试日志消息")
        print("✅ 日志设置成功")
        return True
    except Exception as e:
        print(f"❌ 日志设置失败: {e}")
        return False

def test_directory_structure():
    """测试目录结构"""
    try:
        base_dir = Path(__file__).parent
        required_dirs = [
            "src",
            "src/core",
            "src/modules",
            "src/utils",
            "logs",
            "config"
        ]
        
        missing_dirs = []
        for dir_name in required_dirs:
            dir_path = base_dir / dir_name
            if not dir_path.exists():
                missing_dirs.append(dir_name)
        
        if missing_dirs:
            print(f"❌ 缺少目录: {', '.join(missing_dirs)}")
            return False
        else:
            print("✅ 目录结构完整")
            return True
    except Exception as e:
        print(f"❌ 目录结构检查失败: {e}")
        return False

def test_screen_info():
    """测试屏幕信息获取"""
    try:
        from core.config import AppConfig
        from core.logger import setup_logger
        from utils.client_id import ClientIdManager
        from modules.screenshot import ScreenshotManager
        
        config = AppConfig()
        logger = setup_logger()
        client_id_manager = ClientIdManager(config, logger)
        screenshot_manager = ScreenshotManager(config, logger, client_id_manager)
        
        screen_info = screenshot_manager.get_screen_info()
        if screen_info:
            print("✅ 屏幕信息获取成功")
            print(f"   屏幕尺寸: {screen_info.get('width')}x{screen_info.get('height')}")
            print(f"   图片格式: {screen_info.get('format')}")
            return True
        else:
            print("❌ 屏幕信息获取失败")
            return False
    except Exception as e:
        print(f"❌ 屏幕信息测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("=" * 50)
    print("🧪 屏幕监控系统 - 本地功能测试")
    print("=" * 50)
    
    tests = [
        ("目录结构", test_directory_structure),
        ("配置加载", test_config_loading),
        ("日志设置", test_logger_setup),
        ("屏幕信息", test_screen_info),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n=== 测试{test_name} ===")
        if test_func():
            passed += 1
    
    print("\n" + "=" * 50)
    print("📊 测试结果汇总")
    print("=" * 50)
    
    for i, (test_name, _) in enumerate(tests):
        status = "✅ 通过" if i < passed else "❌ 失败"
        print(f"{test_name:<20} : {status}")
    
    print("-" * 50)
    print(f"总计: {passed}/{total} 个测试通过")
    
    if passed == total:
        print("🎉 所有本地功能测试通过！")
    else:
        print("⚠️ 部分测试失败，请检查相关配置。")

if __name__ == "__main__":
    main()