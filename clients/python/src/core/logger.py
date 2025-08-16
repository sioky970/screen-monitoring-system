#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
日志管理模块

功能：
- 配置和初始化日志系统
- 支持文件和控制台输出
- 支持日志轮转
- 支持不同日志级别
"""

import sys
from pathlib import Path
from loguru import logger
from typing import Optional

from .config import LoggingConfig


def setup_logger(logging_config: LoggingConfig, debug: bool = False):
    """设置日志系统
    
    Args:
        logging_config: 日志配置
        debug: 是否启用调试模式
    
    Returns:
        配置好的logger实例
    """
    # 移除默认的logger
    logger.remove()
    
    # 确定日志级别
    log_level = "DEBUG" if debug else logging_config.level
    
    # 添加控制台输出
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
               "<level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
               "<level>{message}</level>",
        colorize=True
    )
    
    # 添加文件输出
    log_file_path = Path(logging_config.file)
    if not log_file_path.is_absolute():
        # 相对路径，相对于项目根目录
        project_root = Path(__file__).parent.parent.parent
        log_file_path = project_root / log_file_path
    
    # 确保日志目录存在
    log_file_path.parent.mkdir(parents=True, exist_ok=True)
    
    logger.add(
        str(log_file_path),
        level=log_level,
        format=logging_config.format,
        rotation=f"{logging_config.max_size} MB",
        retention=logging_config.backup_count,
        compression="zip",
        encoding="utf-8"
    )
    
    # 记录启动信息
    logger.info(f"日志系统初始化完成，级别: {log_level}")
    logger.info(f"日志文件: {log_file_path}")
    
    return logger


def get_logger(name: Optional[str] = None) -> logger:
    """获取logger实例
    
    Args:
        name: logger名称
    
    Returns:
        logger实例
    """
    if name:
        return logger.bind(name=name)
    return logger