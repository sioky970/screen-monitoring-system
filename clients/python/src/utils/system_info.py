#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统信息收集工具
用于收集客户端的系统信息，包括计算机名、用户名、IP地址、MAC地址等
"""

import os
import platform
import socket
import uuid
import subprocess
import psutil
from typing import Dict, Optional


class SystemInfoCollector:
    """系统信息收集器"""
    
    @staticmethod
    def get_computer_name() -> str:
        """获取计算机名"""
        try:
            return platform.node() or socket.gethostname()
        except Exception:
            return "Unknown"
    
    @staticmethod
    def get_username() -> str:
        """获取当前用户名"""
        try:
            return os.getlogin()
        except Exception:
            try:
                return os.environ.get('USERNAME') or os.environ.get('USER', 'Unknown')
            except Exception:
                return "Unknown"
    
    @staticmethod
    def get_ip_address() -> str:
        """获取本机IP地址"""
        try:
            # 连接到一个远程地址来获取本机IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            try:
                # 备用方法：获取hostname对应的IP
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "127.0.0.1"
    
    @staticmethod
    def get_mac_address() -> str:
        """获取MAC地址"""
        try:
            mac = uuid.getnode()
            mac_str = ':'.join([
                f"{(mac >> elements) & 0xff:02x}"
                for elements in range(0, 2*6, 8)
            ][::-1])
            return mac_str
        except Exception:
            return "00:00:00:00:00:00"
    
    @staticmethod
    def get_os_version() -> str:
        """获取操作系统版本"""
        try:
            system = platform.system()
            if system == "Windows":
                return f"Windows {platform.release()} {platform.version()}"
            elif system == "Darwin":
                return f"macOS {platform.mac_ver()[0]}"
            elif system == "Linux":
                try:
                    # 尝试读取发行版信息
                    with open('/etc/os-release', 'r') as f:
                        lines = f.readlines()
                        for line in lines:
                            if line.startswith('PRETTY_NAME='):
                                return line.split('=')[1].strip().strip('"')
                except Exception:
                    pass
                return f"Linux {platform.release()}"
            else:
                return f"{system} {platform.release()}"
        except Exception:
            return "Unknown OS"
    
    @staticmethod
    def get_screen_resolution() -> str:
        """获取屏幕分辨率"""
        try:
            if platform.system() == "Windows":
                import tkinter as tk
                root = tk.Tk()
                width = root.winfo_screenwidth()
                height = root.winfo_screenheight()
                root.destroy()
                return f"{width}x{height}"
            else:
                # 对于非Windows系统，使用默认值
                return "1920x1080"
        except Exception:
            return "1920x1080"
    
    @staticmethod
    def get_client_number() -> str:
        """生成客户端编号"""
        try:
            import time
            import random
            
            computer_name = SystemInfoCollector.get_computer_name()
            timestamp = str(int(time.time()))[-6:]  # 取时间戳后6位
            random_suffix = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=4))
            
            return f"CLIENT-{computer_name}-{timestamp}-{random_suffix}"
        except Exception:
            import time
            return f"CLIENT-{int(time.time())}"
    
    @classmethod
    def collect_all_info(cls) -> Dict[str, str]:
        """收集所有系统信息
        
        Returns:
            包含所有系统信息的字典
        """
        return {
            'computerName': cls.get_computer_name(),
            'username': cls.get_username(),
            'ipAddress': cls.get_ip_address(),
            'macAddress': cls.get_mac_address(),
            'osVersion': cls.get_os_version(),
            'screenResolution': cls.get_screen_resolution(),
            'clientNumber': cls.get_client_number()
        }