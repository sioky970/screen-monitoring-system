#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
客户端ID管理器
负责生成、验证和管理客户端UID
实现首次注册时UID为空，服务端生成UID并返回的流程
"""

import os
import time
import uuid
import json
import requests
from pathlib import Path
from typing import Optional, Dict

from core.config import AppConfig
from utils.system_info import SystemInfoCollector


class ClientIdManager:
    """客户端UID管理器"""
    
    def __init__(self, config: AppConfig, logger):
        """初始化客户端UID管理器
        
        Args:
            config: 应用配置
            logger: 日志记录器
        """
        self.config = config
        self.logger = logger
        
        # 客户端UID文件路径
        self.client_uid_file = self._get_client_uid_file_path()
        
        # HTTP会话
        self.session = requests.Session()
        self.session.timeout = config.server.timeout
        
        # 系统信息收集器
        self.system_info = SystemInfoCollector.collect_all_info()
        
        # 内存缓存的客户端UID，避免频繁文件读取
        self._cached_uid: Optional[str] = None
        
        self.logger.info(f"客户端UID管理器初始化完成，UID文件: {self.client_uid_file}")
    
    def _get_client_uid_file_path(self) -> str:
        """获取客户端UID文件路径
        
        Returns:
            客户端UID文件的完整路径
        """
        # 使用项目根目录下的client_uid.txt文件
        project_root = Path(__file__).parent.parent.parent
        return str(project_root / "client_uid.txt")
    
    def get_client_uid(self) -> str:
        """获取客户端UID

        实现正确的注册/认证逻辑：
        1. 如果本地有UID，尝试用该UID认证
        2. 如果认证成功，返回该UID
        3. 如果认证失败或没有本地UID，注册新客户端并获取新UID

        Returns:
            客户端UID
        """
        # 如果内存中已有缓存，直接返回
        if self._cached_uid:
            return self._cached_uid

        # 尝试从本地文件加载UID
        local_client_uid = self._load_local_client_uid()

        # 尝试注册/认证
        register_result = self._register_or_authenticate(local_client_uid)

        if register_result and register_result.get('uid'):
            final_uid = register_result['uid']
            is_new_client = register_result.get('isNewClient', False)

            # 保存UID到本地文件
            self._save_local_client_uid(final_uid)
            # 缓存到内存中
            self._cached_uid = final_uid

            if is_new_client:
                self.logger.info(f"新客户端注册成功，UID: {final_uid}")
            else:
                self.logger.info(f"客户端认证成功，UID: {final_uid}")

            return final_uid
        else:
            # 注册/认证失败，生成临时UID
            temp_uid = str(uuid.uuid4())
            self._save_local_client_uid(temp_uid)
            self._cached_uid = temp_uid
            self.logger.warning(f"客户端注册/认证失败，使用临时UID: {temp_uid}")
            return temp_uid
    
    def _load_local_client_uid(self) -> Optional[str]:
        """从本地文件加载客户端UID
        
        Returns:
            客户端UID，如果文件不存在或读取失败则返回None
        """
        try:
            if os.path.exists(self.client_uid_file):
                with open(self.client_uid_file, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        self.logger.debug(f"从本地文件加载客户端UID: {content}")
                        return content
            return None
        except Exception as e:
            self.logger.warning(f"加载本地客户端UID失败: {e}")
            return None
    
    def _save_local_client_uid(self, client_uid: str) -> bool:
        """保存客户端UID到本地文件
        
        Args:
            client_uid: 客户端UID
        
        Returns:
            是否保存成功
        """
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(self.client_uid_file), exist_ok=True)
            
            with open(self.client_uid_file, 'w', encoding='utf-8') as f:
                f.write(client_uid)
            
            self.logger.debug(f"客户端UID已保存到本地文件: {client_uid}")
            return True
        except Exception as e:
            self.logger.error(f"保存客户端UID失败: {e}")
            return False
    
    def _register_or_authenticate(self, existing_uid: Optional[str] = None) -> Optional[Dict]:
        """客户端注册/认证

        Args:
            existing_uid: 现有的客户端UID，如果为None则注册新客户端

        Returns:
            注册/认证结果字典，包含uid、isNewClient等信息
        """
        try:
            url = f"{self.config.server.api_base_url}/clients/register"

            # 构建注册/认证数据
            register_data = {
                'computerName': self.system_info['computerName'],
                'osInfo': self.system_info['osVersion'],
                'version': self.config.client.version,
                'username': self.system_info['username'],
                'ipAddress': self._get_local_ip(),
            }

            # 如果有现有UID，添加到请求中
            if existing_uid:
                register_data['uid'] = existing_uid
                self.logger.info(f"尝试使用现有UID认证: {existing_uid}")
            else:
                self.logger.info("首次注册，请求新UID")

            response = self.session.post(
                url,
                json=register_data,
                headers={'Content-Type': 'application/json'},
                timeout=self.config.server.timeout
            )

            if response.status_code in [200, 201]:
                result = response.json()
                self.logger.debug(f"注册/认证响应数据: {result}")
                # 提取data字段中的内容
                if result.get('success') and result.get('data'):
                    return result['data']
                return result
            else:
                self.logger.warning(f"客户端注册/认证失败: HTTP {response.status_code} - {response.text}")
                return None

        except requests.exceptions.Timeout:
            self.logger.warning("客户端注册/认证超时")
            return None
        except requests.exceptions.ConnectionError:
            self.logger.warning("客户端注册/认证连接失败")
            return None
        except Exception as e:
            self.logger.error(f"客户端注册/认证异常: {e}")
            return None

    def _get_local_ip(self) -> str:
        """获取本地IP地址"""
        try:
            import socket
            # 连接到一个远程地址来获取本地IP
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 80))
                return s.getsockname()[0]
        except Exception:
            return "127.0.0.1"
    
    def get_client_info(self) -> Dict[str, str]:
        """获取客户端信息
        
        Returns:
            客户端信息字典
        """
        return self.system_info.copy()
    
    def refresh_system_info(self) -> None:
        """刷新系统信息"""
        self.system_info = SystemInfoCollector.collect_all_info()
        self.logger.debug("系统信息已刷新")
    
    def cleanup(self) -> None:
        """清理资源"""
        try:
            self.session.close()
        except:
            pass