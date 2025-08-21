#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
服务器连接验证脚本
验证客户端配置的服务器地址是否可以正常连接
"""

import sys
import requests
import time
from pathlib import Path

# 添加项目路径
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir / "src"))

try:
    from core.config import ConfigManager
except ImportError as e:
    print(f"导入模块失败: {e}")
    print("请确保已安装所有依赖包")
    sys.exit(1)


def test_server_connection(api_url: str, timeout: int = 10) -> bool:
    """测试服务器连接
    
    Args:
        api_url: API基础URL
        timeout: 超时时间
    
    Returns:
        是否连接成功
    """
    try:
        # 测试健康检查端点
        health_url = api_url.replace('/api', '/health')
        print(f"  测试健康检查: {health_url}")
        
        response = requests.get(health_url, timeout=timeout)
        if response.status_code == 200:
            print(f"  ✅ 健康检查成功: {response.status_code}")
            return True
        else:
            print(f"  ⚠️ 健康检查返回: {response.status_code}")
    except requests.exceptions.ConnectTimeout:
        print(f"  ❌ 连接超时 ({timeout}秒)")
    except requests.exceptions.ConnectionError:
        print(f"  ❌ 连接失败 (无法连接到服务器)")
    except requests.exceptions.RequestException as e:
        print(f"  ❌ 请求异常: {e}")
    except Exception as e:
        print(f"  ❌ 未知错误: {e}")
    
    # 尝试测试数据库状态端点
    try:
        db_status_url = f"{api_url}/system/database/status"
        print(f"  测试数据库状态: {db_status_url}")
        
        response = requests.get(db_status_url, timeout=timeout)
        if response.status_code == 200:
            print(f"  ✅ 数据库状态检查成功: {response.status_code}")
            return True
        else:
            print(f"  ⚠️ 数据库状态返回: {response.status_code}")
    except Exception as e:
        print(f"  ❌ 数据库状态检查失败: {e}")
    
    return False


def test_api_endpoints(api_url: str, timeout: int = 10):
    """测试主要API端点
    
    Args:
        api_url: API基础URL
        timeout: 超时时间
    """
    print(f"\n🔍 测试API端点...")
    
    endpoints = [
        ("/clients/stats", "客户端统计"),
        ("/whitelist/stats", "白名单统计"),
        ("/security/stats", "安全统计"),
    ]
    
    for endpoint, description in endpoints:
        try:
            url = f"{api_url}{endpoint}"
            print(f"  测试 {description}: {url}")
            
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                print(f"    ✅ 成功: {response.status_code}")
            else:
                print(f"    ⚠️ 返回: {response.status_code}")
        except Exception as e:
            print(f"    ❌ 失败: {e}")


def main():
    """主函数"""
    print("🌐 服务器连接验证工具")
    print("=" * 50)
    
    # 加载配置
    try:
        config_path = project_dir / "config" / "config.yaml"
        config_manager = ConfigManager(str(config_path))
        config = config_manager.get_config()
        
        print(f"📁 配置文件: {config_path}")
        print(f"🏷️ 客户端名称: {config.client.name}")
        print(f"📍 服务器地址: {config.server.api_base_url}")
        print(f"⏱️ 超时时间: {config.server.timeout}秒")
        
    except Exception as e:
        print(f"❌ 配置加载失败: {e}")
        return False
    
    # 测试服务器连接
    print(f"\n🔗 测试服务器连接...")
    success = test_server_connection(config.server.api_base_url, config.server.timeout)
    
    if success:
        print(f"\n✅ 服务器连接成功！")
        
        # 测试API端点
        test_api_endpoints(config.server.api_base_url, config.server.timeout)
        
        print(f"\n🎉 服务器验证完成")
        print(f"📝 建议:")
        print(f"  - 服务器连接正常，可以启动客户端")
        print(f"  - 如需切换环境，使用: python switch_config.py prod")
        
        return True
    else:
        print(f"\n❌ 服务器连接失败！")
        print(f"📝 建议:")
        print(f"  1. 检查服务器是否正在运行")
        print(f"  2. 检查网络连接")
        print(f"  3. 检查防火墙设置")
        print(f"  4. 验证服务器地址和端口")
        
        # 显示当前配置的服务器信息
        print(f"\n📋 当前配置:")
        print(f"  API地址: {config.server.api_base_url}")
        print(f"  WebSocket: {config.server.websocket_url}")
        
        # 提供切换建议
        if "localhost" in config.server.api_base_url:
            print(f"\n💡 当前使用本地配置，如需连接生产服务器:")
            print(f"  python switch_config.py prod")
        else:
            print(f"\n💡 当前使用生产配置，如需连接本地服务器:")
            print(f"  python switch_config.py dev")
        
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
