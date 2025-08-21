#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置环境切换脚本
用于在测试环境和生产环境配置之间快速切换
"""

import os
import sys
import shutil
import argparse
from pathlib import Path

def get_config_dir():
    """获取配置文件目录"""
    script_dir = Path(__file__).parent
    return script_dir / "config"

def backup_current_config():
    """备份当前配置文件"""
    config_dir = get_config_dir()
    current_config = config_dir / "config.yaml"
    backup_config = config_dir / "config.backup.yaml"
    
    if current_config.exists():
        shutil.copy2(current_config, backup_config)
        print(f"✓ 已备份当前配置到: {backup_config}")
        return True
    return False

def switch_to_dev():
    """切换到测试环境配置"""
    config_dir = get_config_dir()
    current_config = config_dir / "config.yaml"
    dev_config = config_dir / "config.dev.yaml"
    
    # 如果存在开发环境配置文件，直接使用
    if dev_config.exists():
        backup_current_config()
        shutil.copy2(dev_config, current_config)
        print("✓ 已切换到测试环境配置")
        return True
    
    # 否则修改当前配置文件
    if current_config.exists():
        backup_current_config()
        
        with open(current_config, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换为测试环境配置
        content = content.replace(
            'api_base_url: "http://43.160.250.175:3001/api"',
            'api_base_url: "http://localhost:3001/api"'
        )
        content = content.replace(
            'websocket_url: "ws://43.160.250.175:3001/monitor"',
            'websocket_url: "ws://localhost:3001/monitor"'
        )
        
        # 注释生产环境配置，取消注释测试环境配置
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            if 'api_base_url: "http://43.160.250.175:3001/api"' in line:
                new_lines.append(f"  # {line.strip()}")
            elif 'websocket_url: "ws://43.160.250.175:3001/monitor"' in line:
                new_lines.append(f"  # {line.strip()}")
            elif '# api_base_url: "http://localhost:3001/api"' in line:
                new_lines.append(line.replace('# ', ''))
            elif '# websocket_url: "ws://localhost:3001/monitor"' in line:
                new_lines.append(line.replace('# ', ''))
            else:
                new_lines.append(line)
        
        with open(current_config, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        
        print("✓ 已切换到测试环境配置")
        return True
    
    print("❌ 配置文件不存在")
    return False

def switch_to_prod():
    """切换到生产环境配置"""
    config_dir = get_config_dir()
    current_config = config_dir / "config.yaml"
    prod_config = config_dir / "config.prod.yaml"
    
    # 如果存在生产环境配置文件，直接使用
    if prod_config.exists():
        backup_current_config()
        shutil.copy2(prod_config, current_config)
        print("✓ 已切换到生产环境配置")
        return True
    
    # 否则修改当前配置文件
    if current_config.exists():
        backup_current_config()
        
        with open(current_config, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 注释测试环境配置，取消注释生产环境配置
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            if 'api_base_url: "http://localhost:3001/api"' in line and not line.strip().startswith('#'):
                new_lines.append(f"  # {line.strip()}")
            elif 'websocket_url: "ws://localhost:3001/monitor"' in line and not line.strip().startswith('#'):
                new_lines.append(f"  # {line.strip()}")
            elif '# api_base_url: "http://43.160.250.175:3001/api"' in line:
                new_lines.append(line.replace('# ', ''))
            elif '# websocket_url: "ws://43.160.250.175:3001/monitor"' in line:
                new_lines.append(line.replace('# ', ''))
            else:
                new_lines.append(line)
        
        with open(current_config, 'w', encoding='utf-8') as f:
            f.write('\n'.join(new_lines))
        
        print("✓ 已切换到生产环境配置")
        return True
    
    print("❌ 配置文件不存在")
    return False

def show_current_config():
    """显示当前配置信息"""
    config_dir = get_config_dir()
    current_config = config_dir / "config.yaml"
    
    if not current_config.exists():
        print("❌ 配置文件不存在")
        return
    
    with open(current_config, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查当前环境
    if 'api_base_url: "http://localhost:3001/api"' in content and not content.count('# api_base_url: "http://localhost:3001/api"'):
        env = "测试环境 (localhost:3001)"
    elif 'api_base_url: "http://43.160.250.175:3001/api"' in content and not content.count('# api_base_url: "http://43.160.250.175:3001/api"'):
        env = "生产环境 (43.160.250.175:3001)"
    else:
        env = "未知环境"
    
    print(f"当前配置环境: {env}")
    
    # 显示相关配置行
    lines = content.split('\n')
    print("\n相关配置:")
    for line in lines:
        if 'api_base_url:' in line or 'websocket_url:' in line:
            status = "✓ 激活" if not line.strip().startswith('#') else "  注释"
            print(f"  {status}: {line.strip()}")

def restore_backup():
    """恢复备份配置"""
    config_dir = get_config_dir()
    current_config = config_dir / "config.yaml"
    backup_config = config_dir / "config.backup.yaml"
    
    if backup_config.exists():
        shutil.copy2(backup_config, current_config)
        print("✓ 已恢复备份配置")
        return True
    else:
        print("❌ 备份配置文件不存在")
        return False

def main():
    parser = argparse.ArgumentParser(description='配置环境切换脚本')
    parser.add_argument('action', choices=['dev', 'prod', 'status', 'restore'], 
                       help='操作类型: dev(测试环境), prod(生产环境), status(查看状态), restore(恢复备份)')
    
    args = parser.parse_args()
    
    print("屏幕监控系统 - 配置环境切换工具")
    print("=" * 40)
    
    if args.action == 'dev':
        switch_to_dev()
    elif args.action == 'prod':
        switch_to_prod()
    elif args.action == 'status':
        show_current_config()
    elif args.action == 'restore':
        restore_backup()
    
    print("\n操作完成!")

if __name__ == '__main__':
    main()