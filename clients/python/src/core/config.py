#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置管理模块

功能：
- 加载和解析YAML配置文件
- 提供配置项访问接口
- 支持配置验证和默认值
- 支持环境变量覆盖
"""

import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from dataclasses import dataclass, field
from urllib.parse import urlparse


@dataclass
class ServerConfig:
    """服务器配置"""
    api_base_url: str = "http://localhost:47831/api"
    websocket_url: str = "ws://localhost:3005/monitor"
    timeout: int = 30
    max_retries: int = 3
    retry_delay: int = 1


@dataclass
class DebugConfig:
    """调试模式配置"""
    enabled: bool = False
    show_console: bool = True
    verbose_console: bool = True


@dataclass
class ClientConfig:
    """客户端配置"""
    name: str = "Python监控客户端"
    version: str = "1.0.0"
    enabled: bool = True
    client_id_file: str = "client_id.txt"
    debug: DebugConfig = field(default_factory=DebugConfig)


@dataclass
class ScreenshotConfig:
    """屏幕截图配置"""
    interval: int = 15
    quality: int = 60
    max_long_side: int = 1600
    max_file_size: int = 307200  # 300KB
    format: str = "JPEG"
    primary_screen_only: bool = True


@dataclass
class ClipboardConfig:
    """剪贴板监控配置"""
    check_interval: float = 0.5
    enabled: bool = True
    max_content_length: int = 10000
    auto_clear_on_violation: bool = True


@dataclass
class HeartbeatConfig:
    """心跳配置"""
    interval: int = 30
    enabled: bool = True


@dataclass
class ConfigSyncConfig:
    """配置同步配置"""
    interval: int = 300  # 5分钟


@dataclass
class WhitelistConfig:
    """白名单配置"""
    sync_interval: int = 180  # 3分钟同步间隔
    cache_file: str = "whitelist_cache.json"
    cache_ttl: int = 3600  # 缓存过期时间（秒），默认1小时
    enabled: bool = True


@dataclass
class BlockchainConfig:
    """区块链地址检测配置"""
    patterns: Dict[str, Any] = field(default_factory=lambda: {
        "bitcoin": [
            r"\b[13][a-km-z1-9A-HJ-NP-Z]{25,34}\b",
            r"\bbc1[a-z0-9]{39,59}\b"
        ],
        "ethereum": r"\b0x[a-fA-F0-9]{40}\b",
        "tron": r"\bT[A-Za-z1-9]{33}\b",
        "litecoin": r"\b[LM3][a-km-z1-9A-HJ-NP-Z]{26,33}\b",
        "dogecoin": r"\bD{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b"
    })


@dataclass
class LoggingConfig:
    """日志配置"""
    level: str = "INFO"
    file: str = "logs/client.log"
    max_size: int = 10
    backup_count: int = 7
    format: str = "{time:YYYY-MM-DD HH:mm:ss} | {level} | {name}:{function}:{line} | {message}"


@dataclass
class ServiceConfig:
    """Windows服务配置"""
    name: str = "ScreenMonitorPython"
    display_name: str = "屏幕监控系统 Python 客户端"
    description: str = "屏幕监控系统的Python客户端服务，用于屏幕截图采集和安全监控"
    auto_start: bool = True


@dataclass
class SecurityConfig:
    """安全配置"""
    encryption_enabled: bool = False
    encryption_key: str = ""
    verify_ssl: bool = False


@dataclass
class PerformanceConfig:
    """性能配置"""
    worker_threads: int = 2
    memory_limit: int = 100
    cpu_limit: int = 10


@dataclass
class AppConfig:
    """应用程序总配置"""
    server: ServerConfig = field(default_factory=ServerConfig)
    client: ClientConfig = field(default_factory=ClientConfig)
    screenshot: ScreenshotConfig = field(default_factory=ScreenshotConfig)
    clipboard: ClipboardConfig = field(default_factory=ClipboardConfig)
    heartbeat: HeartbeatConfig = field(default_factory=HeartbeatConfig)
    config_sync: ConfigSyncConfig = field(default_factory=ConfigSyncConfig)
    whitelist: WhitelistConfig = field(default_factory=WhitelistConfig)
    blockchain: BlockchainConfig = field(default_factory=BlockchainConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    service: ServiceConfig = field(default_factory=ServiceConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    performance: PerformanceConfig = field(default_factory=PerformanceConfig)


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_path: Path):
        """初始化配置管理器
        
        Args:
            config_path: 配置文件路径
        """
        self.config_path = Path(config_path)
        self._config: Optional[AppConfig] = None
        self._load_config()
    
    def _load_config(self) -> None:
        """加载配置文件"""
        try:
            if not self.config_path.exists():
                raise FileNotFoundError(f"配置文件不存在: {self.config_path}")
            
            with open(self.config_path, 'r', encoding='utf-8') as f:
                config_data = yaml.safe_load(f)
            
            if not config_data:
                config_data = {}
            
            # 应用环境变量覆盖
            config_data = self._apply_env_overrides(config_data)
            
            # 创建配置对象
            self._config = self._create_config_from_dict(config_data)
            
            # 验证配置
            self._validate_config()
            
        except Exception as e:
            raise RuntimeError(f"配置加载失败: {e}")
    
    def _apply_env_overrides(self, config_data: Dict[str, Any]) -> Dict[str, Any]:
        """应用环境变量覆盖
        
        支持的环境变量格式：
        - SM_SERVER_API_BASE_URL
        - SM_CLIENT_NAME
        - SM_SCREENSHOT_INTERVAL
        等等
        """
        env_mappings = {
            'SM_SERVER_API_BASE_URL': ['server', 'api_base_url'],
            'SM_SERVER_WEBSOCKET_URL': ['server', 'websocket_url'],
            'SM_CLIENT_NAME': ['client', 'name'],
            'SM_SCREENSHOT_INTERVAL': ['screenshot', 'interval'],
            'SM_SCREENSHOT_QUALITY': ['screenshot', 'quality'],
            'SM_CLIPBOARD_ENABLED': ['clipboard', 'enabled'],
            'SM_HEARTBEAT_INTERVAL': ['heartbeat', 'interval'],
            'SM_LOG_LEVEL': ['logging', 'level'],
        }
        
        for env_var, config_path in env_mappings.items():
            env_value = os.getenv(env_var)
            if env_value is not None:
                # 转换数据类型
                if config_path[-1] in ['interval', 'quality', 'max_retries', 'timeout']:
                    try:
                        env_value = int(env_value)
                    except ValueError:
                        continue
                elif config_path[-1] in ['enabled']:
                    env_value = env_value.lower() in ('true', '1', 'yes', 'on')
                elif config_path[-1] in ['check_interval']:
                    try:
                        env_value = float(env_value)
                    except ValueError:
                        continue
                
                # 设置配置值
                current = config_data
                for key in config_path[:-1]:
                    if key not in current:
                        current[key] = {}
                    current = current[key]
                current[config_path[-1]] = env_value
        
        return config_data
    
    def _create_config_from_dict(self, config_data: Dict[str, Any]) -> AppConfig:
        """从字典创建配置对象"""
        # 创建各个子配置
        server_config = ServerConfig(**config_data.get('server', {}))
        client_config = ClientConfig(**config_data.get('client', {}))
        screenshot_config = ScreenshotConfig(**config_data.get('screenshot', {}))
        clipboard_config = ClipboardConfig(**config_data.get('clipboard', {}))
        heartbeat_config = HeartbeatConfig(**config_data.get('heartbeat', {}))
        whitelist_config = WhitelistConfig(**config_data.get('whitelist', {}))
        
        # 区块链配置需要特殊处理
        blockchain_data = config_data.get('blockchain', {})
        blockchain_config = BlockchainConfig()
        if 'patterns' in blockchain_data:
            blockchain_config.patterns = blockchain_data['patterns']
        
        logging_config = LoggingConfig(**config_data.get('logging', {}))
        service_config = ServiceConfig(**config_data.get('service', {}))
        security_config = SecurityConfig(**config_data.get('security', {}))
        performance_config = PerformanceConfig(**config_data.get('performance', {}))
        
        return AppConfig(
            server=server_config,
            client=client_config,
            screenshot=screenshot_config,
            clipboard=clipboard_config,
            heartbeat=heartbeat_config,
            whitelist=whitelist_config,
            blockchain=blockchain_config,
            logging=logging_config,
            service=service_config,
            security=security_config,
            performance=performance_config
        )
    
    def _validate_config(self) -> None:
        """验证配置"""
        if not self._config:
            raise ValueError("配置未加载")
        
        # 验证服务器URL
        try:
            parsed_api = urlparse(self._config.server.api_base_url)
            if not parsed_api.scheme or not parsed_api.netloc:
                raise ValueError("无效的API基础URL")
            
            parsed_ws = urlparse(self._config.server.websocket_url)
            if not parsed_ws.scheme or not parsed_ws.netloc:
                raise ValueError("无效的WebSocket URL")
        except Exception as e:
            raise ValueError(f"服务器URL验证失败: {e}")
        
        # 验证截图配置
        if self._config.screenshot.interval <= 0:
            raise ValueError("截图间隔必须大于0")
        
        if not (1 <= self._config.screenshot.quality <= 100):
            raise ValueError("图片质量必须在1-100之间")
        
        # 验证心跳配置
        if self._config.heartbeat.interval <= 0:
            raise ValueError("心跳间隔必须大于0")
        
        # 验证剪贴板配置
        if self._config.clipboard.check_interval <= 0:
            raise ValueError("剪贴板检查间隔必须大于0")
    
    def get_config(self) -> AppConfig:
        """获取配置对象"""
        if not self._config:
            raise RuntimeError("配置未加载")
        return self._config
    
    def reload(self) -> None:
        """重新加载配置"""
        self._load_config()
    
    def get_client_id_path(self) -> Path:
        """获取客户端ID文件路径"""
        client_id_file = self._config.client.client_id_file
        if Path(client_id_file).is_absolute():
            return Path(client_id_file)
        else:
            return self.config_path.parent.parent / client_id_file
    

    
    def get_log_file_path(self) -> Path:
        """获取日志文件路径"""
        log_file = self._config.logging.file
        if Path(log_file).is_absolute():
            return Path(log_file)
        else:
            return self.config_path.parent.parent / log_file
    
    def get_whitelist_cache_path(self) -> str:
        """获取白名单缓存文件路径
        
        Returns:
            白名单缓存文件路径
        """
        cache_dir = Path(self.config_path).parent.parent / "cache"
        cache_dir.mkdir(exist_ok=True)
        return str(cache_dir / "whitelist.json")
    
    def get_violation_cache_path(self) -> str:
        """获取违规事件缓存文件路径
        
        Returns:
            违规事件缓存文件路径
        """
        cache_dir = Path(self.config_path).parent.parent / "cache"
        cache_dir.mkdir(exist_ok=True)
        return str(cache_dir / "violations.json")