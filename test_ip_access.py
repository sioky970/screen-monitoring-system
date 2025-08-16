#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Docker前后端IP访问测试脚本
测试前后端服务是否支持IP访问
"""

import requests
import socket
import time
from urllib.parse import urlparse

def get_local_ip():
    """获取本机IP地址"""
    try:
        # 连接到一个远程地址来获取本机IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def test_http_endpoint(url, description):
    """测试HTTP端点访问"""
    print(f"\n测试 {description}:")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, timeout=10)
        print(f"✅ 状态码: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ 响应正常")
            return True
        else:
            print(f"⚠️ 响应状态异常")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ 连接失败 - 服务可能未启动或端口未开放")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ 请求超时")
        return False
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        return False

def test_websocket_port(host, port, description):
    """测试WebSocket端口连通性"""
    print(f"\n测试 {description}:")
    print(f"地址: {host}:{port}")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ 端口 {port} 可访问")
            return True
        else:
            print(f"❌ 端口 {port} 不可访问")
            return False
    except Exception as e:
        print(f"❌ 连接测试失败: {e}")
        return False

def main():
    print("=" * 60)
    print("Docker前后端IP访问测试")
    print("=" * 60)
    
    # 获取本机IP
    local_ip = get_local_ip()
    print(f"本机IP地址: {local_ip}")
    
    # 测试配置
    test_configs = [
        {
            "name": "前端服务 (localhost)",
            "url": "http://localhost:47830",
            "type": "http"
        },
        {
            "name": "前端服务 (本机IP)",
            "url": f"http://{local_ip}:47830",
            "type": "http"
        },
        {
            "name": "后端API健康检查 (localhost)",
            "url": "http://localhost:47831/health",
            "type": "http"
        },
        {
            "name": "后端API健康检查 (本机IP)",
            "url": f"http://{local_ip}:47831/health",
            "type": "http"
        },
        {
            "name": "后端API文档 (localhost)",
            "url": "http://localhost:47831/api/docs",
            "type": "http"
        },
        {
            "name": "后端API文档 (本机IP)",
            "url": f"http://{local_ip}:47831/api/docs",
            "type": "http"
        }
    ]
    
    # WebSocket端口测试
    websocket_configs = [
        {
            "name": "WebSocket端口 (localhost)",
            "host": "localhost",
            "port": 3005
        },
        {
            "name": "WebSocket端口 (本机IP)",
            "host": local_ip,
            "port": 3005
        }
    ]
    
    # 执行HTTP测试
    http_results = []
    for config in test_configs:
        result = test_http_endpoint(config["url"], config["name"])
        http_results.append((config["name"], result))
    
    # 执行WebSocket端口测试
    ws_results = []
    for config in websocket_configs:
        result = test_websocket_port(config["host"], config["port"], config["name"])
        ws_results.append((config["name"], result))
    
    # 汇总结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    print("\nHTTP服务测试:")
    for name, result in http_results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    print("\nWebSocket端口测试:")
    for name, result in ws_results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name}: {status}")
    
    # 分析结果
    localhost_http_success = any(result for name, result in http_results if "localhost" in name)
    ip_http_success = any(result for name, result in http_results if local_ip in name)
    localhost_ws_success = any(result for name, result in ws_results if "localhost" in name)
    ip_ws_success = any(result for name, result in ws_results if local_ip in name)
    
    print("\n" + "=" * 60)
    print("IP访问支持分析")
    print("=" * 60)
    
    if localhost_http_success and ip_http_success:
        print("✅ HTTP服务支持IP访问")
    elif localhost_http_success:
        print("⚠️ HTTP服务仅支持localhost访问，不支持IP访问")
    else:
        print("❌ HTTP服务访问失败，请检查服务是否启动")
    
    if localhost_ws_success and ip_ws_success:
        print("✅ WebSocket服务支持IP访问")
    elif localhost_ws_success:
        print("⚠️ WebSocket服务仅支持localhost访问，不支持IP访问")
    else:
        print("❌ WebSocket服务访问失败，请检查服务是否启动")
    
    print("\n配置建议:")
    print("1. 确保Docker容器端口正确映射到主机")
    print("2. 检查防火墙设置，确保端口47830、47831、3005开放")
    print("3. 确认Nginx配置server_name为 '_' (通配符)")
    print("4. 确认后端CORS配置包含所需的IP地址")
    print("5. 确认WebSocket CORS_ORIGIN环境变量设置正确")

if __name__ == "__main__":
    main()