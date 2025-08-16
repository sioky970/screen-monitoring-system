#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
控制台窗口显示测试

测试在独立控制台窗口中的显示控制功能
"""

import os
import sys
import time
import subprocess
from pathlib import Path

# Windows控制台窗口控制
if sys.platform == "win32":
    import ctypes
    from ctypes import wintypes
    
    # Windows API常量
    SW_HIDE = 0
    SW_SHOW = 5
    SW_MAXIMIZE = 3
    SW_MINIMIZE = 6
    SW_RESTORE = 9
    
    # 获取Windows API函数
    kernel32 = ctypes.windll.kernel32
    user32 = ctypes.windll.user32
    
    def get_console_window():
        """获取控制台窗口句柄"""
        return kernel32.GetConsoleWindow()
    
    def show_console_window(show_state=SW_SHOW):
        """显示/隐藏控制台窗口"""
        console_window = get_console_window()
        if console_window:
            user32.ShowWindow(console_window, show_state)
            return True
        return False
    
    def set_console_title(title):
        """设置控制台窗口标题"""
        kernel32.SetConsoleTitleW(title)
    
    def allocate_console():
        """分配新的控制台窗口"""
        return kernel32.AllocConsole()
    
    def free_console():
        """释放控制台窗口"""
        return kernel32.FreeConsole()

else:
    def get_console_window():
        return None
    
    def show_console_window(show_state=None):
        return False
    
    def set_console_title(title):
        pass
    
    def allocate_console():
        return False
    
    def free_console():
        return False


def test_console_visibility():
    """测试控制台窗口可见性"""
    print("=== 控制台窗口可见性测试 ===")
    print(f"操作系统: {sys.platform}")
    
    if sys.platform != "win32":
        print("非Windows系统，跳过控制台窗口测试")
        return
    
    # 设置窗口标题
    set_console_title("屏幕监控系统 - 控制台测试")
    
    console_window = get_console_window()
    print(f"控制台窗口句柄: {console_window}")
    
    if not console_window:
        print("无法获取控制台窗口句柄")
        return
    
    print("\n1. 当前控制台窗口应该是可见的")
    print("   如果你能看到这条消息，说明控制台窗口正常显示")
    input("   按回车键继续...")
    
    print("\n2. 测试最大化窗口")
    show_console_window(SW_MAXIMIZE)
    time.sleep(2)
    
    print("\n3. 测试还原窗口")
    show_console_window(SW_RESTORE)
    time.sleep(2)
    
    print("\n4. 测试最小化窗口")
    print("   窗口将在3秒后最小化...")
    time.sleep(3)
    show_console_window(SW_MINIMIZE)
    
    # 等待5秒后还原
    time.sleep(5)
    
    print("\n5. 还原窗口")
    show_console_window(SW_RESTORE)
    
    print("\n6. 测试隐藏窗口")
    print("   窗口将在3秒后隐藏...")
    time.sleep(3)
    show_console_window(SW_HIDE)
    
    # 等待5秒后显示
    time.sleep(5)
    show_console_window(SW_SHOW)
    
    print("\n7. 窗口已重新显示")
    print("\n测试完成！")


def create_new_console_process():
    """创建新的控制台进程"""
    print("=== 创建新控制台进程 ===")
    
    if sys.platform != "win32":
        print("非Windows系统，跳过新控制台进程测试")
        return
    
    # 创建新的控制台窗口运行测试
    script_content = '''
import time
import ctypes

print("这是一个新的控制台窗口！")
print("窗口标题: 屏幕监控系统 - 新控制台")

# 设置窗口标题
ctypes.windll.kernel32.SetConsoleTitleW("屏幕监控系统 - 新控制台")

for i in range(10, 0, -1):
    print(f"窗口将在 {i} 秒后关闭...")
    time.sleep(1)

print("测试完成，窗口即将关闭")
time.sleep(2)
'''
    
    # 写入临时脚本文件
    temp_script = Path("temp_console_test.py")
    temp_script.write_text(script_content, encoding='utf-8')
    
    try:
        # 使用cmd启动新的控制台窗口
        cmd = f'start "屏幕监控系统测试" cmd /k "python {temp_script} && pause && exit"'
        subprocess.run(cmd, shell=True)
        print("新控制台窗口已启动")
        print("请查看是否出现了新的控制台窗口")
        
    except Exception as e:
        print(f"创建新控制台进程失败: {e}")
    
    finally:
        # 清理临时文件
        if temp_script.exists():
            time.sleep(15)  # 等待脚本执行完成
            try:
                temp_script.unlink()
            except:
                pass


def main():
    """主函数"""
    print("控制台窗口显示测试")
    print(f"当前目录: {os.getcwd()}")
    print(f"Python版本: {sys.version}")
    
    # 测试当前控制台窗口
    test_console_visibility()
    
    print("\n" + "="*50)
    input("按回车键测试创建新控制台窗口...")
    
    # 测试创建新控制台窗口
    create_new_console_process()
    
    print("\n所有测试完成！")
    input("按回车键退出...")


if __name__ == "__main__":
    main()