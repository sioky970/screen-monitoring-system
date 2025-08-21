#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试更新后的违规上报接口

功能：
- 测试新的统一违规上报接口
- 验证数据格式转换
- 测试截图获取功能
"""

import sys
import json
import time
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.config import AppConfig
from modules.violation import ViolationReporter
from modules.blockchain_detector import BlockchainAddressDetector
from utils.client_id import ClientIdManager
import logging

# 配置日志
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def test_violation_reporter():
    """测试违规上报器"""
    logger.info("=== 测试违规上报器 ===")
    
    # 加载配置
    config = AppConfig()
    
    # 获取客户端ID
    client_id_manager = ClientIdManager(config, logger)
    client_id = client_id_manager.get_client_uid()
    logger.info(f"客户端ID: {client_id}")
    
    # 创建违规上报器
    violation_reporter = ViolationReporter(config, client_id, logger)
    violation_reporter.start()
    
    try:
        # 测试违规数据
        test_violation_data = {
            'clientId': client_id,
            'violationType': 'BLOCKCHAIN_ADDRESS',
            'violationContent': '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
            'report_time': '2025-08-22T12:00:00.000Z',
            'additionalData': {
                'address_type': 'BTC',
                'fullClipboardContent': '测试违规：发现比特币地址 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
                'detected_at': '2025-08-22T12:00:00.000Z',
                'detection_method': 'test',
                'risk_level': 'HIGH'
            }
        }
        
        logger.info("发送测试违规事件...")
        success = violation_reporter.report_violation(test_violation_data)
        
        if success:
            logger.info("违规事件已添加到队列")
            
            # 等待处理
            logger.info("等待违规事件处理...")
            time.sleep(5)
            
            # 检查统计信息
            stats = violation_reporter.get_stats()
            logger.info(f"违规上报统计: {stats}")
            
        else:
            logger.error("违规事件添加到队列失败")
            
    finally:
        violation_reporter.stop()
        logger.info("违规上报器已停止")

def test_blockchain_detector():
    """测试区块链检测器"""
    logger.info("=== 测试区块链检测器 ===")
    
    # 加载配置
    config = AppConfig()
    
    # 获取客户端ID
    client_id_manager = ClientIdManager(config, logger)
    client_id = client_id_manager.get_client_uid()
    
    # 创建违规上报器
    violation_reporter = ViolationReporter(config, client_id, logger)
    violation_reporter.start()
    
    try:
        # 创建区块链检测器
        blockchain_detector = BlockchainAddressDetector(
            logger=logger,
            whitelist_manager=None,  # 不使用白名单，所有地址都视为违规
            violation_reporter=violation_reporter
        )
        
        # 测试内容
        test_content = """
        这是一个测试内容，包含多种区块链地址：
        比特币地址: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
        以太坊地址: 0x742d35Cc6634C0532925a3b8D4C9db96DfbBfC88
        比特币Bech32地址: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
        """
        
        logger.info("开始检测区块链地址...")
        violations = blockchain_detector.check_violations(
            content=test_content,
            client_id=client_id
        )
        
        logger.info(f"检测到 {len(violations)} 个违规事件")
        for violation in violations:
            logger.info(f"违规地址: {violation.get('address')} (类型: {violation.get('type')})")
        
        # 等待处理
        logger.info("等待违规事件处理...")
        time.sleep(5)
        
        # 检查统计信息
        detector_stats = blockchain_detector.get_stats()
        reporter_stats = violation_reporter.get_stats()
        
        logger.info(f"检测器统计: {detector_stats}")
        logger.info(f"上报器统计: {reporter_stats}")
        
    finally:
        violation_reporter.stop()
        logger.info("测试完成")

def test_data_format():
    """测试数据格式转换"""
    logger.info("=== 测试数据格式转换 ===")
    
    # 加载配置
    config = AppConfig()
    
    # 获取客户端ID
    client_id_manager = ClientIdManager(config, logger)
    client_id = client_id_manager.get_client_uid()
    
    # 创建违规上报器
    violation_reporter = ViolationReporter(config, client_id, logger)
    
    # 测试数据
    test_data = {
        'clientId': client_id,
        'violationType': 'BLOCKCHAIN_ADDRESS',
        'violationContent': '0x742d35Cc6634C0532925a3b8D4C9db96DfbBfC88',
        'report_time': '2025-08-22T12:00:00.000Z',
        'additionalData': {
            'address_type': 'ETH',
            'fullClipboardContent': '测试以太坊地址',
            'detected_at': '2025-08-22T12:00:00.000Z'
        }
    }
    
    # 测试数据格式转换
    files_data, form_data = violation_reporter._prepare_violation_data(test_data)
    
    logger.info("转换后的表单数据:")
    for key, value in form_data.items():
        if key == 'additionalData':
            logger.info(f"  {key}: {json.dumps(json.loads(value), indent=2, ensure_ascii=False)}")
        else:
            logger.info(f"  {key}: {value}")
    
    logger.info("文件数据:")
    for key, (filename, data, content_type) in files_data.items():
        logger.info(f"  {key}: {filename} ({content_type}, {len(data)} bytes)")

if __name__ == "__main__":
    logger.info("开始测试更新后的违规上报功能")
    
    try:
        # 测试数据格式转换
        test_data_format()
        
        print("\n" + "="*50 + "\n")
        
        # 测试违规上报器
        test_violation_reporter()
        
        print("\n" + "="*50 + "\n")
        
        # 测试区块链检测器
        test_blockchain_detector()
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}", exc_info=True)
    
    logger.info("测试完成")
