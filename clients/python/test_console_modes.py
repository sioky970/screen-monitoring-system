#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
控制台模式测试脚本

测试不同模式下的控制台窗口显示效果：
1. 调试模式（显示控制台）
2. 发布模式（隐藏控制台）
3. 环境变量控制
4. 命令行参数控制
"""

import os
import sys
import time
import subprocess
from pathlib import Path


def test_debug_mode():
    """测试调试模式"""
    print("\n=== 测试调试模式 ===")
    
    # 测试1: 通过命令行参数启用调试模式
    print("1. 测试命令行参数 --debug")
    cmd = [sys.executable, "main.py", "--debug", "--test"]
    print(f"执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        print(f"返回码: {result.returncode}")
        if result.stdout:
            print(f"标准输出: {result.stdout[:500]}..." if len(result.stdout) > 500 else f"标准输出: {result.stdout}")
        if result.stderr:
            print(f"错误输出: {result.stderr[:500]}..." if len(result.stderr) > 500 else f"错误输出: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("测试超时（正常，因为是测试模式）")
    except Exception as e:
        print(f"测试失败: {e}")


def test_release_mode():
    """测试发布模式"""
    print("\n=== 测试发布模式 ===")
    
    # 测试2: 不使用调试参数（默认发布模式）
    print("2. 测试默认模式（发布模式）")
    cmd = [sys.executable, "main.py", "--test"]
    print(f"执行命令: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
        print(f"返回码: {result.returncode}")
        if result.stdout:
            print(f"标准输出: {result.stdout[:500]}..." if len(result.stdout) > 500 else f"标准输出: {result.stdout}")
        if result.stderr:
            print(f"错误输出: {result.stderr[:500]}..." if len(result.stderr) > 500 else f"错误输出: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("测试超时（正常，因为是测试模式）")
    except Exception as e:
        print(f"测试失败: {e}")


def test_environment_variable():
    """测试环境变量控制"""
    print("\n=== 测试环境变量控制 ===")
    
    # 测试3: 通过环境变量启用调试模式
    print("3. 测试环境变量 SCREEN_MONITOR_DEBUG=1")
    
    env = os.environ.copy()
    env['SCREEN_MONITOR_DEBUG'] = '1'
    
    cmd = [sys.executable, "main.py", "--test"]
    print(f"执行命令: {' '.join(cmd)}")
    print("环境变量: SCREEN_MONITOR_DEBUG=1")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=35, env=env)
        print(f"返回码: {result.returncode}")
        if result.stdout:
            print(f"标准输出: {result.stdout[:500]}..." if len(result.stdout) > 500 else f"标准输出: {result.stdout}")
        if result.stderr:
            print(f"错误输出: {result.stderr[:500]}..." if len(result.stderr) > 500 else f"错误输出: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("测试超时（正常，因为是测试模式）")
    except Exception as e:
        print(f"测试失败: {e}")


def test_config_file():
    """测试配置文件控制"""
    print("\n=== 测试配置文件控制 ===")
    
    # 检查配置文件中的调试设置
    config_path = Path("config/config.yaml")
    if config_path.exists():
        print("4. 检查配置文件中的调试设置")
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'debug:' in content:
                    # 提取调试相关配置
                    lines = content.split('\n')
                    debug_section = False
                    for line in lines:
                        if 'debug:' in line:
                            debug_section = True
                            print(f"  {line.strip()}")
                        elif debug_section and line.startswith('    '):
                            print(f"  {line.strip()}")
                        elif debug_section and not line.startswith('    ') and line.strip():
                            break
                else:
                    print("  配置文件中未找到调试设置")
        except Exception as e:
            print(f"  读取配置文件失败: {e}")
    else:
        print("  配置文件不存在")


def main():
    """主测试函数"""
    print("控制台模式测试开始")
    print(f"当前工作目录: {os.getcwd()}")
    print(f"Python版本: {sys.version}")
    print(f"操作系统: {sys.platform}")
    
    # 检查main.py是否存在
    if not Path("main.py").exists():
        print("错误: main.py 文件不存在")
        return
    
    # 运行各项测试
    test_config_file()
    test_debug_mode()
    test_release_mode()
    test_environment_variable()
    
    print("\n=== 测试总结 ===")
    print("1. 调试模式应该显示控制台窗口和详细日志")
    print("2. 发布模式应该隐藏控制台窗口")
    print("3. 环境变量可以覆盖配置文件设置")
    print("4. 命令行参数具有最高优先级")
    print("\n注意: 在Windows上，控制台窗口的显示/隐藏效果需要在实际运行时观察")


if __name__ == "__main__":
    main()