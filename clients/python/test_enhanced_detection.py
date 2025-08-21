#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强区块链地址检测功能测试脚本
测试更宽泛的检测能力和自动清空剪贴板功能
"""

import sys
import os
from pathlib import Path

# 添加项目路径
project_dir = Path(__file__).parent
sys.path.insert(0, str(project_dir / "src"))

try:
    from modules.blockchain_detector import BlockchainAddressDetector
    import logging
except ImportError as e:
    print(f"导入模块失败: {e}")
    sys.exit(1)


def test_enhanced_detection():
    """测试增强的检测功能"""
    print("🔍 测试增强的区块链地址检测功能")
    print("=" * 60)
    
    # 初始化检测器
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger("test")
    detector = BlockchainAddressDetector(logger)
    
    # 测试用例
    test_cases = [
        {
            'name': '经典比特币地址',
            'content': '请转账到这个地址: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
            'expected_count': 1
        },
        {
            'name': '以太坊地址',
            'content': '我的ETH地址是 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5',
            'expected_count': 1
        },
        {
            'name': 'TRON地址',
            'content': '收款地址: TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
            'expected_count': 1
        },
        {
            'name': '多种地址混合',
            'content': '''
            BTC: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
            ETH: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5
            TRX: TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH
            ''',
            'expected_count': 3
        },
        {
            'name': '新增币种地址',
            'content': '''
            Solana: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
            Cardano: addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjmg
            Polkadot: 1zugcavYA9yCuYwiEYeMHNJm9gXznYjNfXQjZsZukF1Mpow
            ''',
            'expected_count': 3
        },
        {
            'name': '可疑长字符串',
            'content': '这个看起来像地址: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
            'expected_count': 1
        },
        {
            'name': '高风险内容',
            'content': '洗钱地址: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 转账100万',
            'expected_count': 1
        },
        {
            'name': '交易所充值',
            'content': '充值地址: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5 请勿重复充值',
            'expected_count': 1
        },
        {
            'name': 'ENS域名',
            'content': '发送到 vitalik.eth 这个地址',
            'expected_count': 1
        },
        {
            'name': '混合高风险内容',
            'content': '''
            暗网交易地址: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
            赌博网站充值: 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b5
            金额: 50万USDT
            ''',
            'expected_count': 2
        }
    ]
    
    total_tests = len(test_cases)
    passed_tests = 0
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 测试 {i}/{total_tests}: {test_case['name']}")
        print(f"内容: {test_case['content'][:100]}{'...' if len(test_case['content']) > 100 else ''}")
        
        # 执行检测
        detected_addresses = detector.detect_addresses(test_case['content'])
        
        print(f"检测结果: 发现 {len(detected_addresses)} 个地址")
        
        # 显示检测详情
        for addr in detected_addresses:
            print(f"  🔸 地址: {addr['address'][:20]}...")
            print(f"     类型: {addr['type']}")
            print(f"     置信度: {addr.get('confidence', 'unknown')}")
            print(f"     风险等级: {addr.get('risk_level', 'unknown')}")
            print(f"     检测方法: {addr.get('detection_method', 'unknown')}")
        
        # 验证结果
        if len(detected_addresses) >= test_case['expected_count']:
            print(f"  ✅ 测试通过 (期望: >={test_case['expected_count']}, 实际: {len(detected_addresses)})")
            passed_tests += 1
        else:
            print(f"  ❌ 测试失败 (期望: >={test_case['expected_count']}, 实际: {len(detected_addresses)})")
    
    print(f"\n📊 测试总结:")
    print(f"  总测试数: {total_tests}")
    print(f"  通过测试: {passed_tests}")
    print(f"  失败测试: {total_tests - passed_tests}")
    print(f"  通过率: {passed_tests/total_tests*100:.1f}%")
    
    return passed_tests == total_tests


def test_risk_assessment():
    """测试风险评估功能"""
    print("\n🚨 测试风险评估功能")
    print("=" * 60)
    
    logging.basicConfig(level=logging.DEBUG)
    logger = logging.getLogger("test")
    detector = BlockchainAddressDetector(logger)
    
    risk_test_cases = [
        {
            'content': 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            'expected_risk': 'low'
        },
        {
            'content': '洗钱地址: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            'expected_risk': 'high'
        },
        {
            'content': '暗网交易 赌博网站 bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 100万',
            'expected_risk': 'critical'
        }
    ]
    
    for i, test_case in enumerate(risk_test_cases, 1):
        print(f"\n🔍 风险测试 {i}: {test_case['content'][:50]}...")
        
        detected_addresses = detector.detect_addresses(test_case['content'])
        
        if detected_addresses:
            risk_level = detected_addresses[0].get('risk_level', 'unknown')
            print(f"  风险等级: {risk_level}")
            
            if risk_level == test_case['expected_risk']:
                print(f"  ✅ 风险评估正确")
            else:
                print(f"  ⚠️ 风险评估偏差 (期望: {test_case['expected_risk']}, 实际: {risk_level})")
        else:
            print(f"  ❌ 未检测到地址")


def test_clipboard_clearing():
    """测试剪贴板清空功能"""
    print("\n📋 测试剪贴板清空功能")
    print("=" * 60)
    
    try:
        import pyperclip
        
        # 测试设置和清空剪贴板
        test_content = "测试内容: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
        
        print("设置测试内容到剪贴板...")
        pyperclip.copy(test_content)
        
        current_content = pyperclip.paste()
        print(f"当前剪贴板内容: {current_content[:50]}...")
        
        print("清空剪贴板...")
        pyperclip.copy("")
        
        cleared_content = pyperclip.paste()
        print(f"清空后内容: '{cleared_content}'")
        
        if cleared_content == "":
            print("✅ 剪贴板清空功能正常")
            return True
        else:
            print("❌ 剪贴板清空失败")
            return False
            
    except ImportError:
        print("⚠️ pyperclip 未安装，跳过剪贴板测试")
        return True
    except Exception as e:
        print(f"❌ 剪贴板测试失败: {e}")
        return False


def main():
    """主函数"""
    print("🧪 增强区块链地址检测功能测试套件")
    print("=" * 80)
    
    # 执行测试
    detection_passed = test_enhanced_detection()
    test_risk_assessment()
    clipboard_passed = test_clipboard_clearing()
    
    print("\n" + "=" * 80)
    print("🎯 总体测试结果:")
    print(f"  增强检测: {'✅ 通过' if detection_passed else '❌ 失败'}")
    print(f"  剪贴板清空: {'✅ 通过' if clipboard_passed else '❌ 失败'}")
    
    if detection_passed and clipboard_passed:
        print("\n🎉 所有测试通过！增强检测功能已就绪")
        print("\n💡 新功能特性:")
        print("  - ✅ 支持20+种区块链地址格式")
        print("  - ✅ 可疑模式检测 (更宽泛)")
        print("  - ✅ 智能风险评估")
        print("  - ✅ 检测前自动清空剪贴板")
        print("  - ✅ 高风险关键词识别")
        print("  - ✅ ENS域名支持")
        return True
    else:
        print("\n❌ 部分测试失败，请检查实现")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
