#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置验证脚本
验证客户端配置是否使用了正确的生产环境URL
"""

import sys
from pathlib import Path

# 添加src目录到Python路径
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

from core.config import ConfigManager

def main():
    print("=" * 60)
    print("🔧 屏幕监控系统 - 配置验证")
    print("=" * 60)
    
    try:
        # 加载配置
        config_path = Path(__file__).parent / "config" / "config.yaml"
        config_manager = ConfigManager(config_path)
        config = config_manager.get_config()
        
        print("\n=== 服务器配置验证 ===")
        print(f"API 基础地址: {config.server.api_base_url}")
        print(f"WebSocket 地址: {config.server.websocket_url}")
        print(f"请求超时: {config.server.timeout}秒")
        print(f"最大重试次数: {config.server.max_retries}")
        
        # 验证是否使用生产环境端口
        expected_api_url = "http://localhost:47831/api"
        expected_ws_url = "ws://localhost:3005/monitor"
        
        print("\n=== 配置验证结果 ===")
        
        if config.server.api_base_url == expected_api_url:
            print("✅ API地址配置正确 (生产环境端口 47831)")
        else:
            print(f"❌ API地址配置错误")
            print(f"   期望: {expected_api_url}")
            print(f"   实际: {config.server.api_base_url}")
            
        if config.server.websocket_url == expected_ws_url:
            print("✅ WebSocket地址配置正确 (生产环境端口 3005)")
        else:
            print(f"❌ WebSocket地址配置错误")
            print(f"   期望: {expected_ws_url}")
            print(f"   实际: {config.server.websocket_url}")
            
        print("\n=== 客户端配置 ===")
        print(f"客户端名称: {config.client.name}")
        print(f"客户端版本: {config.client.version}")
        print(f"是否启用: {config.client.enabled}")
        
        print("\n=== 截图配置 ===")
        print(f"截图间隔: {config.screenshot.interval}秒")
        print(f"图片质量: {config.screenshot.quality}")
        print(f"最大长边: {config.screenshot.max_long_side}像素")
        
        print("\n" + "=" * 60)
        print("🎉 配置验证完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ 配置验证失败: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit(main())