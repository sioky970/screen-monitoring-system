#!/usr/bin/env python3
"""
测试客户端本地区块链地址检测功能
"""

import sys
import os
import pyperclip
import time

# 添加项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, src_dir)

try:
    from modules.blockchain_detector import BlockchainAddressDetector
    from modules.whitelist import WhitelistManager
    from modules.violation import ViolationReporter
except ImportError as e:
    print(f"导入模块失败: {e}")
    print("请确保在客户端目录下运行此脚本")
    print(f"当前目录: {current_dir}")
    print(f"src目录: {src_dir}")
    sys.exit(1)

def test_blockchain_detection():
    """测试区块链地址检测功能"""
    print("=== 测试区块链地址检测功能 ===\n")
    
    # 初始化模块
    from core.logger import setup_logger
    from core.config import LoggingConfig, AppConfig
    logging_config = LoggingConfig()
    logger = setup_logger(logging_config)
    
    # 创建配置和依赖
    config = AppConfig()
    client_id = "test-client-123"
    whitelist_manager = WhitelistManager(config, logger)
    violation_reporter = ViolationReporter(config, client_id, logger)
    detector = BlockchainAddressDetector(logger, whitelist_manager, violation_reporter)
    
    # 测试用例
    test_cases = [
        {
            "name": "Bitcoin地址测试",
            "content": "请转账到这个地址: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
            "expected_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"]
        },
        {
            "name": "Ethereum地址测试", 
            "content": "ETH地址: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
            "expected_addresses": ["0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"]
        },
        {
            "name": "TRON地址测试",
            "content": "TRX: TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH",
            "expected_addresses": ["TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH"]
        },
        {
            "name": "多个地址测试",
            "content": "BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa ETH: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
            "expected_addresses": ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6"]
        },
        {
            "name": "无地址测试",
            "content": "这是一段普通的文本，没有区块链地址",
            "expected_addresses": []
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"{i}. {test_case['name']}")
        print(f"   输入: {test_case['content']}")
        
        # 检测地址
        detected_addresses = detector.detect_addresses(test_case['content'])
        
        print(f"   检测结果: {len(detected_addresses)} 个地址")
        for addr in detected_addresses:
            print(f"   - {addr['type']}: {addr['address']}")
        
        # 提取地址字符串进行比较
        detected_addr_strings = [addr['address'] for addr in detected_addresses]
        print(f"   检测到的地址: {detected_addr_strings}")
        print(f"   预期地址: {test_case['expected_addresses']}")
        
        # 验证结果
        if set(detected_addr_strings) == set(test_case['expected_addresses']):
            print("   ✅ 测试通过")
        else:
            print("   ❌ 测试失败")
        
        print()

def test_clipboard_detection():
    """测试剪贴板地址检测功能"""
    print("=== 测试剪贴板地址检测功能 ===\n")
    
    # 初始化模块
    from core.logger import setup_logger
    from core.config import LoggingConfig, AppConfig
    logging_config = LoggingConfig()
    logger = setup_logger(logging_config)
    
    # 创建配置和依赖
    config = AppConfig()
    client_id = "test-client-123"
    whitelist_manager = WhitelistManager(config, logger)
    violation_reporter = ViolationReporter(config, client_id, logger)
    detector = BlockchainAddressDetector(logger, whitelist_manager, violation_reporter)
    
    # 测试地址
    test_address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    test_content = f"请转账到: {test_address}"
    
    print(f"将测试内容复制到剪贴板: {test_content}")
    
    try:
        # 设置剪贴板内容
        pyperclip.copy(test_content)
        time.sleep(0.5)  # 等待剪贴板更新
        
        # 获取剪贴板内容
        clipboard_content = pyperclip.paste()
        print(f"从剪贴板获取的内容: {clipboard_content}")
        
        # 检测地址
        detected_addresses = detector.detect_addresses(clipboard_content)
        
        print(f"检测结果: {len(detected_addresses)} 个地址")
        for addr in detected_addresses:
            print(f"- {addr['type']}: {addr['address']}")
        
        # 提取地址字符串进行比较
        detected_addr_strings = [addr['address'] for addr in detected_addresses]
        
        if test_address in detected_addr_strings:
            print("✅ 剪贴板检测测试通过")
        else:
            print("❌ 剪贴板检测测试失败")
            
    except Exception as e:
        print(f"❌ 剪贴板测试失败: {e}")
    
    print()

def test_whitelist_validation():
    """测试白名单验证功能"""
    print("=== 测试白名单验证功能 ===\n")
    
    # 初始化模块
    from core.logger import setup_logger
    from core.config import LoggingConfig, AppConfig
    logging_config = LoggingConfig()
    logger = setup_logger(logging_config)
    
    # 创建配置和依赖
    config = AppConfig()
    client_id = "test-client-123"
    whitelist_manager = WhitelistManager(config, logger)
    violation_reporter = ViolationReporter(config, client_id, logger)
    detector = BlockchainAddressDetector(logger, whitelist_manager, violation_reporter)
    
    # 等待白名单加载
    print("等待白名单加载...")
    time.sleep(2)
    
    # 测试地址（假设这些地址不在白名单中）
    test_addresses = [
        "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",  # Bitcoin
        "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",  # Ethereum
        "TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH"  # TRON
    ]
    
    for address in test_addresses:
        print(f"测试地址: {address}")
        
        # 检测单个地址
        content = f"转账地址: {address}"
        detected_addresses = detector.detect_addresses(content)
        
        print(f"  检测结果: {len(detected_addresses)} 个地址")
        for addr in detected_addresses:
            print(f"  - {addr['type']}: {addr['address']}")
        
        # 提取地址字符串进行比较
        detected_addr_strings = [addr['address'] for addr in detected_addresses]
        
        if address in detected_addr_strings:
            print("  ✅ 地址检测成功")
        else:
            print("  ❌ 地址检测失败")
        
        print()

if __name__ == "__main__":
    print("开始测试客户端本地区块链地址检测功能\n")
    
    try:
        # 运行测试
        test_blockchain_detection()
        test_clipboard_detection()
        test_whitelist_validation()
        
        print("=== 测试完成 ===")
        
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()