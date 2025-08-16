#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化的控制台模式测试

快速测试控制台窗口显示控制功能
"""

import os
import sys
from pathlib import Path

# 添加src目录到路径
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

# 导入控制台控制函数
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes
    
    # Windows API常量
    SW_HIDE = 0
    SW_SHOW = 5
    
    def hide_console():
        """隐藏控制台窗口"""
        try:
            kernel32 = ctypes.windll.kernel32
            user32 = ctypes.windll.user32
            console_window = kernel32.GetConsoleWindow()
            if console_window:
                user32.ShowWindow(console_window, SW_HIDE)
                return True
        except Exception:
            pass
        return False
    
    def show_console():
        """显示控制台窗口"""
        try:
            kernel32 = ctypes.windll.kernel32
            user32 = ctypes.windll.user32
            console_window = kernel32.GetConsoleWindow()
            if console_window:
                user32.ShowWindow(console_window, SW_SHOW)
                return True
        except Exception:
            pass
        return False
else:
    def hide_console():
        return False
    
    def show_console():
        return False


def test_console_control():
    """测试控制台控制功能"""
    print("=== 控制台窗口控制测试 ===")
    print(f"操作系统: {sys.platform}")
    
    if sys.platform != "win32":
        print("非Windows系统，跳过控制台窗口控制测试")
        return
    
    print("\n1. 当前控制台窗口应该是可见的")
    input("按回车键继续...")
    
    print("\n2. 测试隐藏控制台窗口")
    print("控制台窗口将在3秒后隐藏...")
    import time
    time.sleep(3)
    
    if hide_console():
        print("控制台窗口已隐藏（你应该看不到这条消息）")
    else:
        print("隐藏控制台窗口失败")
    
    # 等待5秒后重新显示
    time.sleep(5)
    
    if show_console():
        print("\n3. 控制台窗口已重新显示")
    else:
        print("\n3. 显示控制台窗口失败")
    
    print("\n测试完成！")


def test_config_loading():
    """测试配置加载"""
    print("\n=== 配置加载测试 ===")
    
    try:
        from core.config import ConfigManager
        
        config_path = "config/config.yaml"
        if not Path(config_path).exists():
            print(f"配置文件不存在: {config_path}")
            return
        
        config_manager = ConfigManager(config_path)
        config = config_manager.get_config()
        
        print(f"配置加载成功")
        print(f"调试模式启用: {getattr(config.client.debug, 'enabled', False)}")
        print(f"显示控制台: {getattr(config.client.debug, 'show_console', True)}")
        print(f"详细控制台: {getattr(config.client.debug, 'verbose_console', True)}")
        
    except Exception as e:
        print(f"配置加载失败: {e}")


def test_environment_detection():
    """测试环境检测"""
    print("\n=== 环境检测测试 ===")
    
    # 检查环境变量
    env_debug = os.getenv('SCREEN_MONITOR_DEBUG', '').lower() in ('1', 'true', 'yes')
    print(f"环境变量调试模式: {env_debug}")
    
    # 检查命令行参数
    cmd_debug = '--debug' in sys.argv
    print(f"命令行调试模式: {cmd_debug}")
    
    # 综合判断
    is_debug = env_debug or cmd_debug
    print(f"最终调试模式: {is_debug}")


def main():
    """主函数"""
    print("简化控制台模式测试")
    print(f"当前目录: {os.getcwd()}")
    
    test_config_loading()
    test_environment_detection()
    test_console_control()


if __name__ == "__main__":
    main()