#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
白名单管理模块

功能：
- 白名单数据同步
- 本地缓存管理
- 地址验证
- 定时更新
"""

import json
import time
import threading
from typing import Set, Dict, List, Optional
from datetime import datetime, timedelta
from pathlib import Path

import requests

from core.config import AppConfig


class WhitelistManager:
    """白名单管理器"""
    
    def __init__(self, config: AppConfig, logger):
        """初始化白名单管理器
        
        Args:
            config: 应用配置
            logger: 日志记录器
        """
        self.config = config
        self.logger = logger
        
        # 白名单数据
        self._whitelist: Set[str] = set()
        self._last_update = 0
        
        # 创建缓存目录和文件路径
        cache_dir = Path(__file__).parent.parent.parent / "cache"
        cache_dir.mkdir(exist_ok=True)
        self._cache_file = cache_dir / "whitelist.json"
        
        # 线程控制
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.RLock()
        
        # 统计信息
        self._stats = {
            'total_addresses': 0,
            'last_sync_time': None,
            'sync_attempts': 0,
            'successful_syncs': 0,
            'failed_syncs': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
        
        # 加载本地缓存
        self._load_cache()
        
        self.logger.info("白名单管理器初始化完成")
    
    def start(self) -> None:
        """启动白名单管理器"""
        if not self.config.whitelist.enabled:
            self.logger.info("白名单功能已禁用")
            return
        
        if self._running:
            self.logger.warning("白名单管理器已在运行中")
            return
        
        self._running = True
        self.logger.info("正在启动白名单管理器...")
        
        try:
            # 立即同步一次
            self._sync_whitelist()
            
            # 启动定时同步线程
            if self.config.whitelist.sync_interval > 0:
                self._thread = threading.Thread(
                    target=self._sync_task,
                    name="WhitelistSync",
                    daemon=True
                )
                self._thread.start()
            
            self.logger.info("白名单管理器启动成功")
            
        except Exception as e:
            self.logger.error(f"白名单管理器启动失败: {e}")
            self._running = False
            raise
    
    def stop(self) -> None:
        """停止白名单管理器"""
        if not self._running:
            return
        
        self._running = False
        self.logger.info("正在停止白名单管理器...")
        
        try:
            # 等待线程结束
            if self._thread and self._thread.is_alive():
                self._thread.join(timeout=5)
            
            # 保存缓存
            self._save_cache()
            
            # 输出统计信息
            self.logger.info(f"白名单统计: {self._stats}")
            self.logger.info("白名单管理器已停止")
            
        except Exception as e:
            self.logger.error(f"停止白名单管理器时出错: {e}")
    
    def _sync_task(self) -> None:
        """定时同步任务"""
        self.logger.info("白名单同步任务已启动")
        
        while self._running:
            try:
                current_time = time.time()
                
                # 检查是否需要同步
                if (current_time - self._last_update) >= self.config.whitelist.sync_interval:
                    self._sync_whitelist()
                
                # 等待一段时间
                time.sleep(min(60, self.config.whitelist.sync_interval // 10))
                
            except Exception as e:
                self.logger.error(f"白名单同步任务异常: {e}")
                time.sleep(60)
    
    def _sync_whitelist(self) -> bool:
        """同步白名单数据
        
        Returns:
            是否同步成功
        """
        if not self.config.whitelist.enabled:
            return False
        
        with self._lock:
            self._stats['sync_attempts'] += 1
            
            try:
                self.logger.info("正在同步白名单数据...")
                
                # 构建请求URL
                url = f"{self.config.server.api_base_url}/whitelist/addresses/active"
                
                # 请求参数
                params = {
                    'lastUpdate': int(self._last_update) if self._last_update > 0 else 0
                }
                
                # 发送请求
                response = requests.get(
                    url,
                    params=params,
                    timeout=self.config.server.timeout,
                    headers={
                        'User-Agent': f"PythonClient/{self.config.client.version}",
                        'Content-Type': 'application/json'
                    }
                )
                
                response.raise_for_status()
                data = response.json()
                
                # 调试：打印完整的API响应
                self.logger.debug(f"白名单API响应: {data}")
                
                # 处理响应数据
                # API返回格式: {code: 200, data: {addresses: [string], lastUpdated: Date}}
                api_data = data.get('data', {})
                addresses = api_data.get('addresses', [])
                
                # 调试：打印解析后的地址
                self.logger.debug(f"解析到的地址列表: {addresses}")
                
                # 更新白名单
                if addresses:
                    old_count = len(self._whitelist)
                    # 清空旧数据，使用新数据
                    self._whitelist.clear()
                    # 标准化地址并添加到白名单
                    for addr in addresses:
                        if isinstance(addr, str):
                            self._whitelist.add(addr.lower().strip())
                    
                    new_count = len(self._whitelist)
                    self.logger.info(f"白名单已更新: {old_count} -> {new_count}")
                
                # 更新时间戳
                self._last_update = time.time()
                self._stats['last_sync_time'] = datetime.now().isoformat()
                self._stats['successful_syncs'] += 1
                self._stats['total_addresses'] = len(self._whitelist)
                
                # 保存缓存
                self._save_cache()
                
                self.logger.info(f"白名单同步成功，共 {len(self._whitelist)} 个地址")
                return True
                
            except requests.exceptions.RequestException as e:
                self.logger.error(f"白名单同步网络错误: {e}")
                self._stats['failed_syncs'] += 1
                return False
            
            except Exception as e:
                self.logger.error(f"白名单同步异常: {e}")
                self._stats['failed_syncs'] += 1
                return False
    
    def is_whitelisted(self, address: str) -> bool:
        """检查地址是否在白名单中
        
        Args:
            address: 区块链地址
        
        Returns:
            是否在白名单中
        """
        if not self.config.whitelist.enabled:
            return True  # 如果白名单功能禁用，则认为所有地址都是合法的
        
        with self._lock:
            # 标准化地址（转换为小写）
            normalized_address = address.lower().strip()
            
            # 检查白名单
            is_whitelisted = normalized_address in self._whitelist
            
            # 更新统计
            if is_whitelisted:
                self._stats['cache_hits'] += 1
            else:
                self._stats['cache_misses'] += 1
            
            return is_whitelisted
    
    def add_address(self, address: str) -> bool:
        """添加地址到白名单
        
        Args:
            address: 区块链地址
        
        Returns:
            是否添加成功
        """
        with self._lock:
            try:
                # 标准化地址
                normalized_address = address.lower().strip()
                
                if normalized_address not in self._whitelist:
                    self._whitelist.add(normalized_address)
                    self._stats['total_addresses'] = len(self._whitelist)
                    
                    # 保存缓存
                    self._save_cache()
                    
                    self.logger.info(f"地址已添加到白名单: {address}")
                    return True
                
                return True  # 地址已存在
                
            except Exception as e:
                self.logger.error(f"添加地址到白名单失败: {e}")
                return False
    
    def remove_address(self, address: str) -> bool:
        """从白名单中移除地址
        
        Args:
            address: 区块链地址
        
        Returns:
            是否移除成功
        """
        with self._lock:
            try:
                # 标准化地址
                normalized_address = address.lower().strip()
                
                if normalized_address in self._whitelist:
                    self._whitelist.remove(normalized_address)
                    self._stats['total_addresses'] = len(self._whitelist)
                    
                    # 保存缓存
                    self._save_cache()
                    
                    self.logger.info(f"地址已从白名单移除: {address}")
                    return True
                
                return True  # 地址不存在
                
            except Exception as e:
                self.logger.error(f"从白名单移除地址失败: {e}")
                return False
    
    def get_whitelist(self) -> List[str]:
        """获取白名单列表
        
        Returns:
            白名单地址列表
        """
        with self._lock:
            return list(self._whitelist)
    
    def get_stats(self) -> Dict:
        """获取统计信息
        
        Returns:
            统计信息字典
        """
        with self._lock:
            stats = self._stats.copy()
            stats['enabled'] = self.config.whitelist.enabled
            stats['running'] = self._running
            stats['cache_file'] = str(self._cache_file)
            return stats
    
    def force_sync(self) -> bool:
        """强制同步白名单
        
        Returns:
            是否同步成功
        """
        self.logger.info("强制同步白名单")
        return self._sync_whitelist()
    
    def _load_cache(self) -> None:
        """加载本地缓存"""
        try:
            if self._cache_file.exists():
                with open(self._cache_file, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                
                # 加载白名单数据
                addresses = cache_data.get('addresses', [])
                self._whitelist = set(addresses)
                
                # 加载时间戳
                self._last_update = cache_data.get('last_update', 0)
                
                # 检查缓存是否过期
                cache_age = time.time() - self._last_update
                max_age = self.config.whitelist.cache_ttl
                
                if cache_age > max_age:
                    self.logger.warning(f"白名单缓存已过期 ({cache_age:.0f}s > {max_age}s)")
                    self._whitelist.clear()
                    self._last_update = 0
                else:
                    self.logger.info(f"白名单缓存已加载，共 {len(self._whitelist)} 个地址")
                
                self._stats['total_addresses'] = len(self._whitelist)
            
            else:
                self.logger.info("白名单缓存文件不存在，将创建新缓存")
        
        except Exception as e:
            self.logger.error(f"加载白名单缓存失败: {e}")
            self._whitelist.clear()
            self._last_update = 0
    
    def _save_cache(self) -> None:
        """保存本地缓存"""
        try:
            # 确保目录存在
            self._cache_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 准备缓存数据
            cache_data = {
                'addresses': list(self._whitelist),
                'last_update': self._last_update,
                'created_at': datetime.now().isoformat(),
                'version': self.config.client.version
            }
            
            # 写入文件
            with open(self._cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
            self.logger.debug(f"白名单缓存已保存: {self._cache_file}")
        
        except Exception as e:
            self.logger.error(f"保存白名单缓存失败: {e}")
    
    def clear_cache(self) -> None:
        """清除缓存"""
        with self._lock:
            try:
                self._whitelist.clear()
                self._last_update = 0
                self._stats['total_addresses'] = 0
                
                if self._cache_file.exists():
                    self._cache_file.unlink()
                
                self.logger.info("白名单缓存已清除")
            
            except Exception as e:
                self.logger.error(f"清除白名单缓存失败: {e}")
    
    def is_cache_valid(self) -> bool:
        """检查缓存是否有效
        
        Returns:
            缓存是否有效
        """
        if not self._whitelist:
            return False
        
        cache_age = time.time() - self._last_update
        return cache_age <= self.config.whitelist.cache_ttl