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
        
        尝试从本地文件加载UID，如果不存在则生成新的UID并进行注册
        
        Returns:
            客户端UID
        """
        # 尝试从本地文件加载UID
        local_client_uid = self._load_local_client_uid()
        
        if local_client_uid:
            self.logger.info(f"从本地文件加载客户端UID: {local_client_uid}")
            return local_client_uid
        
        # 生成新的UID
        new_uid = str(uuid.uuid4())
        
        # 使用新UID进行客户端注册
        register_result = self._authenticate_client(new_uid)
        if register_result and register_result.get('data', {}).get('uid'):
            # 保存到本地文件
            self._save_local_client_uid(new_uid)
            self.logger.info(f"客户端注册成功，UID: {new_uid}")
            return new_uid
        else:
            # 注册失败，仍然保存UID以便下次使用
            self._save_local_client_uid(new_uid)
            self.logger.warning(f"客户端注册失败，但已保存UID: {new_uid}")
            return new_uid
    
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
    
    def _authenticate_client(self, client_uid: str) -> Optional[Dict]:
        """客户端注册
        
        Args:
            client_uid: 客户端UID，将作为clientNumber使用
        
        Returns:
            注册结果字典，包含id、clientNumber等信息
        """
        try:
            url = f"{self.config.server.api_base_url}/clients"
            
            # 构建注册数据，使用UID作为clientNumber
            register_data = {
                'clientNumber': client_uid,  # 使用UID作为客户端编号
                'clientName': f"客户端-{client_uid[:8]}",  # 使用UID前8位作为客户端名称
                'computerName': self.system_info['computerName'],
                'os': self.system_info['osVersion'],
                'version': self.config.client.version,
                'remark': f"Python客户端 - {self.system_info['username']}@{self.system_info['computerName']}"
            }
            
            response = self.session.post(
                url, 
                json=register_data,
                headers={'Content-Type': 'application/json'},
                timeout=self.config.server.timeout
            )
            
            if response.status_code == 200 or response.status_code == 201:
                result = response.json()
                self.logger.info(f"客户端注册成功: {result.get('clientName', '')}")
                self.logger.debug(f"注册响应数据: {result}")
                # 将服务器返回的id作为客户端UID
                return {
                    'data': {
                        'uid': result.get('id'),
                        'isNewClient': True
                    }
                }
            else:
                self.logger.warning(f"客户端注册失败: HTTP {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            self.logger.warning("客户端注册超时")
            return None
        except requests.exceptions.ConnectionError:
            self.logger.warning("客户端注册连接失败")
            return None
        except Exception as e:
            self.logger.error(f"客户端注册异常: {e}")
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