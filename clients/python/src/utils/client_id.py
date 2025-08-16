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
        
        如果本地存在有效的客户端UID，则使用本地UID进行认证
        否则进行首次注册（UID为空），服务端生成UID并返回
        
        Returns:
            客户端UID
        """
        # 尝试从本地文件加载UID
        local_client_uid = self._load_local_client_uid()
        
        if local_client_uid:
            # 使用本地UID进行认证
            auth_result = self._authenticate_client(local_client_uid)
            if auth_result and auth_result.get('data', {}).get('uid'):
                self.logger.info(f"使用本地客户端UID认证成功: {local_client_uid}")
                return auth_result['data']['uid']
            else:
                self.logger.warning("本地客户端UID认证失败，将重新注册")
        
        # 进行首次注册（UID为空）
        auth_result = self._authenticate_client(None)
        if auth_result and auth_result.get('data', {}).get('uid'):
            new_uid = auth_result['data']['uid']
            # 保存到本地文件
            self._save_local_client_uid(new_uid)
            if auth_result.get('data', {}).get('isNewClient'):
                self.logger.info(f"客户端首次注册成功，获得UID: {new_uid}")
            else:
                self.logger.info(f"客户端认证成功，UID: {new_uid}")
            return new_uid
        else:
            # 认证失败，生成临时UID并保存
            temp_uid = str(uuid.uuid4())
            self._save_local_client_uid(temp_uid)
            self.logger.warning(f"客户端认证失败，使用临时UID: {temp_uid}")
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
    
    def _authenticate_client(self, client_uid: Optional[str]) -> Optional[Dict]:
        """客户端认证
        
        Args:
            client_uid: 客户端UID，首次注册时为None
        
        Returns:
            认证结果字典，包含uid、isNewClient等信息
        """
        try:
            url = f"{self.config.server.api_base_url}/auth/client"
            
            # 构建认证数据
            auth_data = {
                'clientNumber': self.system_info['clientNumber'],
                'clientName': self.config.client.name,
                'computerName': self.system_info['computerName'],
                'username': self.system_info['username'],
                'ipAddress': self.system_info['ipAddress'],
                'macAddress': self.system_info['macAddress'],
                'osVersion': self.system_info['osVersion'],
                'clientVersion': self.config.client.version,
                'screenResolution': self.system_info['screenResolution']
            }
            
            # 如果有UID，则添加到请求中
            if client_uid:
                auth_data['uid'] = client_uid
            
            response = self.session.post(
                url, 
                json=auth_data, 
                timeout=self.config.server.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                self.logger.info(f"客户端认证成功: {result.get('message', '')}")
                self.logger.debug(f"认证响应数据: {result}")
                return result
            else:
                self.logger.warning(f"客户端认证失败: HTTP {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            self.logger.warning("客户端认证超时")
            return None
        except requests.exceptions.ConnectionError:
            self.logger.warning("客户端认证连接失败")
            return None
        except Exception as e:
            self.logger.error(f"客户端认证异常: {e}")
            return None
    
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