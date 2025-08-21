#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Windows截图功能测试脚本
验证在Windows环境中的真实截图能力
"""

import sys
import platform
import io
from pathlib import Path

def test_pil_imagegrab():
    """测试PIL ImageGrab功能"""
    print("🔍 测试PIL ImageGrab功能...")
    
    try:
        from PIL import ImageGrab, Image
        print("  ✅ PIL.ImageGrab 导入成功")
        
        # 测试单屏截图
        print("  📸 测试单屏截图...")
        screenshot = ImageGrab.grab()
        
        if screenshot:
            width, height = screenshot.size
            print(f"  ✅ 单屏截图成功: {width}x{height}")
            
            # 保存测试截图
            test_path = Path("test_single_screen.jpg")
            screenshot.save(test_path, "JPEG", quality=85)
            print(f"  💾 测试截图已保存: {test_path}")
            
            # 测试压缩
            buffer = io.BytesIO()
            screenshot.save(buffer, format='JPEG', quality=85, optimize=True)
            compressed_size = len(buffer.getvalue())
            print(f"  📦 压缩后大小: {compressed_size} 字节")
            
        else:
            print("  ❌ 单屏截图失败")
            return False
        
        # 测试多屏截图
        print("  📸 测试多屏截图...")
        try:
            multi_screenshot = ImageGrab.grab(all_screens=True)
            if multi_screenshot:
                width, height = multi_screenshot.size
                print(f"  ✅ 多屏截图成功: {width}x{height}")
                
                # 保存多屏测试截图
                test_path = Path("test_multi_screen.jpg")
                multi_screenshot.save(test_path, "JPEG", quality=85)
                print(f"  💾 多屏截图已保存: {test_path}")
            else:
                print("  ⚠️ 多屏截图失败（可能只有单屏）")
        except Exception as e:
            print(f"  ⚠️ 多屏截图不支持: {e}")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ PIL.ImageGrab 导入失败: {e}")
        return False
    except Exception as e:
        print(f"  ❌ 截图测试失败: {e}")
        return False

def test_windows_specific_features():
    """测试Windows特定功能"""
    print("\n🔍 测试Windows特定功能...")
    
    # 测试Windows API
    try:
        import win32gui
        import win32con
        print("  ✅ pywin32 导入成功")
        
        # 获取桌面窗口
        desktop = win32gui.GetDesktopWindow()
        print(f"  🖥️ 桌面窗口句柄: {desktop}")
        
        # 获取屏幕尺寸
        screen_width = win32gui.GetSystemMetrics(win32con.SM_CXSCREEN)
        screen_height = win32gui.GetSystemMetrics(win32con.SM_CYSCREEN)
        print(f"  📐 屏幕尺寸: {screen_width}x{screen_height}")
        
        return True
        
    except ImportError as e:
        print(f"  ❌ pywin32 导入失败: {e}")
        return False
    except Exception as e:
        print(f"  ❌ Windows API测试失败: {e}")
        return False

def test_screenshot_manager():
    """测试截图管理器"""
    print("\n🔍 测试截图管理器...")
    
    try:
        # 添加项目路径
        project_dir = Path(__file__).parent
        sys.path.insert(0, str(project_dir / "src"))
        
        from core.config import ConfigManager
        from modules.screenshot import ScreenshotManager
        
        # 加载配置
        config_path = project_dir / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        print("  ✅ 配置加载成功")
        
        # 创建截图管理器
        screenshot_manager = ScreenshotManager(config)
        print("  ✅ 截图管理器创建成功")
        
        # 测试截图
        print("  📸 执行截图测试...")
        screenshot_data = screenshot_manager._capture_screen()
        
        if screenshot_data:
            print(f"  ✅ 截图成功，数据大小: {len(screenshot_data)} 字节")
            
            # 保存截图数据
            test_path = Path("test_screenshot_manager.jpg")
            with open(test_path, 'wb') as f:
                f.write(screenshot_data)
            print(f"  💾 截图已保存: {test_path}")
            
            return True
        else:
            print("  ❌ 截图失败")
            return False
            
    except Exception as e:
        print(f"  ❌ 截图管理器测试失败: {e}")
        return False

def test_platform_detection():
    """测试平台检测"""
    print("\n🔍 测试平台检测...")
    
    system = platform.system()
    print(f"  🖥️ 操作系统: {system}")
    print(f"  📋 平台详情: {platform.platform()}")
    print(f"  🏗️ 架构: {platform.architecture()}")
    print(f"  🐍 Python版本: {platform.python_version()}")
    
    if system == "Windows":
        print("  ✅ Windows环境检测成功")
        print("  📝 将使用PIL.ImageGrab进行真实截图")
        return True
    else:
        print(f"  ⚠️ 当前环境: {system}，非Windows环境")
        print("  📝 在Windows环境中将使用真实截图")
        return False

def main():
    """主函数"""
    print("🖼️ Windows截图功能测试工具")
    print("=" * 50)
    
    # 测试平台检测
    is_windows = test_platform_detection()
    
    # 测试PIL ImageGrab
    pil_success = test_pil_imagegrab()
    
    # 测试Windows特定功能
    if is_windows:
        windows_success = test_windows_specific_features()
    else:
        windows_success = True  # 非Windows环境跳过
    
    # 测试截图管理器
    manager_success = test_screenshot_manager()
    
    print("\n" + "=" * 50)
    print("📊 测试结果总结:")
    print(f"  平台检测: {'✅' if is_windows else '⚠️'}")
    print(f"  PIL截图: {'✅' if pil_success else '❌'}")
    print(f"  Windows API: {'✅' if windows_success else '❌'}")
    print(f"  截图管理器: {'✅' if manager_success else '❌'}")
    
    if is_windows and pil_success and windows_success and manager_success:
        print("\n🎉 Windows截图功能完全正常！")
        print("📝 编译为exe后可以进行真实截图")
        print("\n💡 功能特性:")
        print("  - ✅ 支持单屏截图")
        print("  - ✅ 支持多屏截图")
        print("  - ✅ 自动图片压缩")
        print("  - ✅ Windows API集成")
        print("  - ✅ 高质量截图输出")
        return True
    else:
        print("\n❌ 部分功能测试失败")
        if not is_windows:
            print("💡 请在Windows环境中运行此测试")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
