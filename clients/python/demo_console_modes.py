#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
控制台模式演示脚本

演示不同模式下客户端的启动效果
"""

import os
import sys
import time
import subprocess
from pathlib import Path


def demo_debug_mode():
    """演示调试模式"""
    print("\n=== 调试模式演示 ===")
    print("启动客户端（调试模式，显示控制台）")
    print("命令: python main.py --debug --test")
    print("预期效果: 控制台窗口保持可见，显示详细日志")
    
    input("按回车键开始演示...")
    
    try:
        # 启动调试模式客户端
        process = subprocess.Popen(
            [sys.executable, "main.py", "--debug", "--test"],
            creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
        )
        
        print(f"客户端已启动 (PID: {process.pid})")
        print("观察新打开的控制台窗口...")
        
        # 等待一段时间
        time.sleep(10)
        
        # 终止进程
        process.terminate()
        process.wait(timeout=5)
        print("调试模式演示完成")
        
    except Exception as e:
        print(f"演示失败: {e}")


def demo_release_mode():
    """演示发布模式"""
    print("\n=== 发布模式演示 ===")
    print("启动客户端（发布模式，隐藏控制台）")
    print("命令: python main.py --test")
    print("预期效果: 控制台窗口隐藏，后台运行")
    
    input("按回车键开始演示...")
    
    try:
        # 启动发布模式客户端
        process = subprocess.Popen(
            [sys.executable, "main.py", "--test"],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        
        print(f"客户端已启动 (PID: {process.pid})")
        print("客户端在后台运行，无控制台窗口...")
        
        # 等待一段时间
        time.sleep(10)
        
        # 检查进程状态
        if process.poll() is None:
            print("客户端仍在运行")
        else:
            print(f"客户端已退出，返回码: {process.returncode}")
        
        # 终止进程
        process.terminate()
        process.wait(timeout=5)
        print("发布模式演示完成")
        
    except Exception as e:
        print(f"演示失败: {e}")


def demo_environment_variable():
    """演示环境变量控制"""
    print("\n=== 环境变量控制演示 ===")
    print("通过环境变量启用调试模式")
    print("环境变量: SCREEN_MONITOR_DEBUG=1")
    print("命令: python main.py --test")
    print("预期效果: 即使没有--debug参数，也会显示控制台")
    
    input("按回车键开始演示...")
    
    try:
        # 设置环境变量
        env = os.environ.copy()
        env['SCREEN_MONITOR_DEBUG'] = '1'
        
        # 启动客户端
        process = subprocess.Popen(
            [sys.executable, "main.py", "--test"],
            env=env,
            creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0
        )
        
        print(f"客户端已启动 (PID: {process.pid})")
        print("观察控制台窗口（应该显示）...")
        
        # 等待一段时间
        time.sleep(10)
        
        # 终止进程
        process.terminate()
        process.wait(timeout=5)
        print("环境变量控制演示完成")
        
    except Exception as e:
        print(f"演示失败: {e}")


def show_configuration():
    """显示当前配置"""
    print("=== 当前配置 ===")
    
    config_path = Path("config/config.yaml")
    if config_path.exists():
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # 提取调试相关配置
            lines = content.split('\n')
            debug_section = False
            print("调试配置:")
            
            for line in lines:
                if 'debug:' in line:
                    debug_section = True
                    print(f"  {line.strip()}")
                elif debug_section and line.startswith('    '):
                    print(f"  {line.strip()}")
                elif debug_section and not line.startswith('    ') and line.strip():
                    break
                    
        except Exception as e:
            print(f"读取配置失败: {e}")
    else:
        print("配置文件不存在")


def main():
    """主函数"""
    print("控制台模式演示")
    print(f"当前目录: {os.getcwd()}")
    print(f"操作系统: {sys.platform}")
    
    if not Path("main.py").exists():
        print("错误: main.py 文件不存在")
        return
    
    show_configuration()
    
    while True:
        print("\n=== 演示菜单 ===")
        print("1. 调试模式演示（显示控制台）")
        print("2. 发布模式演示（隐藏控制台）")
        print("3. 环境变量控制演示")
        print("4. 显示当前配置")
        print("0. 退出")
        
        choice = input("\n请选择演示项目 (0-4): ").strip()
        
        if choice == '1':
            demo_debug_mode()
        elif choice == '2':
            demo_release_mode()
        elif choice == '3':
            demo_environment_variable()
        elif choice == '4':
            show_configuration()
        elif choice == '0':
            print("演示结束")
            break
        else:
            print("无效选择，请重试")


if __name__ == "__main__":
    main()