#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试UID注册流程
验证首次注册时UID为空，服务端生成UID并返回的流程
"""

import os
import sys
from pathlib import Path

# 添加src目录到Python路径
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from core.config import ConfigManager
from core.logger import setup_logger
from utils.client_id import ClientIdManager
from utils.system_info import SystemInfoCollector

def test_system_info():
    """测试系统信息收集"""
    print("\n=== 测试系统信息收集 ===")
    try:
        system_info = SystemInfoCollector.collect_all_info()
        print("✅ 系统信息收集成功:")
        for key, value in system_info.items():
            print(f"  {key}: {value}")
        return True
    except Exception as e:
        print(f"❌ 系统信息收集失败: {e}")
        return False

def test_first_registration():
    """测试首次注册流程"""
    print("\n=== 测试首次注册流程 ===")
    try:
        # 删除现有的UID文件（如果存在）
        uid_file = Path(__file__).parent / "client_uid.txt"
        if uid_file.exists():
            uid_file.unlink()
            print("🗑️ 已删除现有UID文件")
        
        # 加载配置
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        # 设置日志
        logger = setup_logger(config.logging)
        
        # 创建客户端ID管理器
        client_id_manager = ClientIdManager(config, logger)
        
        # 获取客户端UID（首次注册）
        print("📝 开始首次注册...")
        client_uid = client_id_manager.get_client_uid()
        
        print(f"✅ 首次注册成功，获得UID: {client_uid}")
        
        # 验证UID文件是否已创建
        if uid_file.exists():
            with open(uid_file, 'r', encoding='utf-8') as f:
                saved_uid = f.read().strip()
            if saved_uid == client_uid:
                print(f"✅ UID已正确保存到文件: {saved_uid}")
            else:
                print(f"❌ UID保存错误，文件中的UID: {saved_uid}，实际UID: {client_uid}")
                return False
        else:
            print("❌ UID文件未创建")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ 首次注册失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_subsequent_authentication():
    """测试后续认证流程"""
    print("\n=== 测试后续认证流程 ===")
    try:
        # 加载配置
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        # 设置日志
        logger = setup_logger(config.logging)
        
        # 创建客户端ID管理器
        client_id_manager = ClientIdManager(config, logger)
        
        # 获取客户端UID（使用已保存的UID）
        print("🔐 开始后续认证...")
        client_uid = client_id_manager.get_client_uid()
        
        print(f"✅ 后续认证成功，UID: {client_uid}")
        
        return True
        
    except Exception as e:
        print(f"❌ 后续认证失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_client_info():
    """测试客户端信息获取"""
    print("\n=== 测试客户端信息获取 ===")
    try:
        # 加载配置
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        # 设置日志
        logger = setup_logger(config.logging)
        
        # 创建客户端ID管理器
        client_id_manager = ClientIdManager(config, logger)
        
        # 获取客户端信息
        client_info = client_id_manager.get_client_info()
        
        print("✅ 客户端信息获取成功:")
        for key, value in client_info.items():
            print(f"  {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ 客户端信息获取失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试UID注册流程")
    
    # 测试系统信息收集
    if not test_system_info():
        print("\n❌ 系统信息收集测试失败")
        return
    
    # 测试首次注册
    if not test_first_registration():
        print("\n❌ 首次注册测试失败")
        return
    
    # 测试后续认证
    if not test_subsequent_authentication():
        print("\n❌ 后续认证测试失败")
        return
    
    # 测试客户端信息获取
    if not test_client_info():
        print("\n❌ 客户端信息获取测试失败")
        return
    
    print("\n🎉 所有测试通过！UID注册流程工作正常")

if __name__ == "__main__":
    main()