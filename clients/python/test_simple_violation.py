#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的违规上报测试
"""

import sys
import json
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.config import AppConfig
from modules.violation import ViolationReporter
from utils.client_id import ClientIdManager
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_simple_violation():
    """简单的违规上报测试"""
    print("=== 简单违规上报测试 ===")
    
    try:
        # 加载配置
        config = AppConfig()
        print(f"违规截图质量配置: {config.screenshot.violation.quality}")
        
        # 获取客户端ID
        client_id_manager = ClientIdManager(config, logger)
        client_id = client_id_manager.get_client_uid()
        print(f"客户端ID: {client_id}")
        
        # 创建违规上报器
        violation_reporter = ViolationReporter(config, client_id, logger)
        
        # 测试数据格式转换
        test_data = {
            'clientId': client_id,
            'violationType': 'BLOCKCHAIN_ADDRESS',
            'violationContent': '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
            'report_time': '2025-08-22T12:00:00.000Z',
            'additionalData': {
                'address_type': 'BTC',
                'fullClipboardContent': '测试高质量违规截图',
                'detected_at': '2025-08-22T12:00:00.000Z'
            }
        }
        
        print("准备违规数据...")
        files_data, form_data = violation_reporter._prepare_violation_data(test_data)
        
        print("表单数据:")
        for key, value in form_data.items():
            if key == 'additionalData':
                print(f"  {key}: [JSON数据]")
            else:
                print(f"  {key}: {value}")
        
        print("文件数据:")
        for key, (filename, data, content_type) in files_data.items():
            print(f"  {key}: {filename} ({content_type}, {len(data)} bytes)")
        
        print("测试完成!")
        
    except Exception as e:
        print(f"测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_simple_violation()
