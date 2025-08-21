#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
区块链地址检测模块

功能：
- 本地检测剪贴板中的区块链地址
- 支持多种区块链地址格式
- 与白名单模块集成
- 生成违规事件
"""

import re
import time
from typing import List, Dict, Optional, Set
from datetime import datetime


class BlockchainAddressDetector:
    """区块链地址检测器"""
    
    def __init__(self, logger, whitelist_manager=None, violation_reporter=None):
        """
        初始化区块链地址检测器
        
        Args:
            logger: 日志记录器
            whitelist_manager: 白名单管理器
            violation_reporter: 违规事件上报器
        """
        self.logger = logger
        self.whitelist_manager = whitelist_manager
        self.violation_reporter = violation_reporter
        
        # 地址检测正则表达式 - 增强版，支持更多格式
        self._address_patterns = {
            'BTC': [
                # Legacy P2PKH addresses (1...)
                re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
                # P2SH addresses (3...)
                re.compile(r'\b3[a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
                # Bech32 addresses (bc1...)
                re.compile(r'\bbc1[a-z0-9]{39,59}\b'),
                # Taproot addresses (bc1p...)
                re.compile(r'\bbc1p[a-z0-9]{58}\b')
            ],
            'ETH': [
                # Ethereum addresses (0x...)
                re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
                # ENS domains (.eth)
                re.compile(r'\b[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.eth\b', re.IGNORECASE)
            ],
            'TRX': [
                # TRON addresses (T...)
                re.compile(r'\bT[A-Za-z1-9]{33}\b')
            ],
            'LTC': [
                # Litecoin Legacy addresses (L, M...)
                re.compile(r'\b[LM][a-km-zA-HJ-NP-Z1-9]{26,33}\b'),
                # Litecoin P2SH addresses (3...)
                re.compile(r'\b3[a-km-zA-HJ-NP-Z1-9]{26,33}\b'),
                # Litecoin Bech32 addresses (ltc1...)
                re.compile(r'\bltc1[a-z0-9]{39,59}\b')
            ],
            'DOGE': [
                # Dogecoin addresses (D...)
                re.compile(r'\bD{1}[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}\b'),
                # Dogecoin P2SH addresses (9, A...)
                re.compile(r'\b[9A][a-km-zA-HJ-NP-Z1-9]{33}\b')
            ],
            'BCH': [
                # Bitcoin Cash Legacy addresses
                re.compile(r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b'),
                # CashAddr format (bitcoincash:)
                re.compile(r'\bbitcoincash:[qp][a-z0-9]{41}\b'),
                # CashAddr format (q, p...)
                re.compile(r'\b[qp][a-z0-9]{41}\b')
            ],
            'XRP': [
                # Ripple Classic addresses (r...)
                re.compile(r'\br[a-zA-Z0-9]{24,34}\b'),
                # Ripple X-addresses (X...)
                re.compile(r'\bX[a-zA-Z0-9]{46,47}\b')
            ],
            'ADA': [
                # Cardano Shelley addresses (addr1...)
                re.compile(r'\baddr1[a-z0-9]{98}\b'),
                # Cardano Byron addresses (Ae2...)
                re.compile(r'\bAe2[a-zA-Z0-9]{51}\b'),
                # Cardano stake addresses (stake1...)
                re.compile(r'\bstake1[a-z0-9]{53}\b')
            ],
            'DOT': [
                # Polkadot addresses (1...)
                re.compile(r'\b1[a-zA-Z0-9]{47}\b'),
                # Kusama addresses (similar format)
                re.compile(r'\b[A-HJ-NP-Z][a-zA-Z0-9]{47}\b')
            ],
            'SOL': [
                # Solana addresses (base58, 32-44 chars)
                re.compile(r'\b[1-9A-HJ-NP-Za-km-z]{32,44}\b')
            ],
            'BNB': [
                # Binance Smart Chain (0x...)
                re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
                # Binance Chain (bnb...)
                re.compile(r'\bbnb[a-z0-9]{39}\b')
            ],
            'MATIC': [
                # Polygon addresses (0x...)
                re.compile(r'\b0x[a-fA-F0-9]{40}\b')
            ],
            'AVAX': [
                # Avalanche C-Chain (0x...)
                re.compile(r'\b0x[a-fA-F0-9]{40}\b'),
                # Avalanche X-Chain (X-avax...)
                re.compile(r'\bX-avax[a-z0-9]{39}\b'),
                # Avalanche P-Chain (P-avax...)
                re.compile(r'\bP-avax[a-z0-9]{39}\b')
            ],
            'ATOM': [
                # Cosmos addresses (cosmos...)
                re.compile(r'\bcosmos[a-z0-9]{39}\b')
            ],
            'XMR': [
                # Monero addresses (4...)
                re.compile(r'\b4[a-zA-Z0-9]{94}\b'),
                # Monero integrated addresses (4...)
                re.compile(r'\b4[a-zA-Z0-9]{106}\b')
            ],
            'ZEC': [
                # Zcash transparent addresses (t1...)
                re.compile(r'\bt1[a-zA-Z0-9]{33}\b'),
                # Zcash shielded addresses (zs1...)
                re.compile(r'\bzs1[a-z0-9]{75}\b')
            ],
            'DASH': [
                # Dash addresses (X...)
                re.compile(r'\bX[a-km-zA-HJ-NP-Z1-9]{33}\b')
            ],
            'ETC': [
                # Ethereum Classic addresses (0x...)
                re.compile(r'\b0x[a-fA-F0-9]{40}\b')
            ],
            'XLM': [
                # Stellar addresses (G...)
                re.compile(r'\bG[A-Z2-7]{55}\b')
            ],
            'NEO': [
                # NEO addresses (A...)
                re.compile(r'\bA[a-km-zA-HJ-NP-Z1-9]{33}\b')
            ],
            'IOTA': [
                # IOTA addresses (90 chars, A-Z and 9)
                re.compile(r'\b[A-Z9]{90}\b')
            ],
            'ALGO': [
                # Algorand addresses (base32, 58 chars)
                re.compile(r'\b[A-Z2-7]{58}\b')
            ],
            'FIL': [
                # Filecoin addresses (f1...)
                re.compile(r'\bf1[a-z0-9]{38}\b'),
                # Filecoin addresses (f3...)
                re.compile(r'\bf3[a-z0-9]{84}\b')
            ]
        }

        # 可疑模式检测 - 更宽泛的检测
        self._suspicious_patterns = {
            'GENERIC_CRYPTO': [
                # 长字符串数字字母组合 (可能是地址)
                re.compile(r'\b[a-zA-Z0-9]{25,100}\b'),
                # 包含数字和字母的长字符串
                re.compile(r'\b(?=.*[0-9])(?=.*[a-zA-Z])[a-zA-Z0-9]{20,}\b'),
                # Base58字符集 (常用于加密货币)
                re.compile(r'\b[1-9A-HJ-NP-Za-km-z]{25,}\b'),
                # 十六进制长字符串
                re.compile(r'\b[a-fA-F0-9]{32,}\b')
            ],
            'WALLET_KEYWORDS': [
                # 钱包相关关键词后的地址
                re.compile(r'(?:wallet|address|addr|钱包|地址|收款|转账|充值|提现)[:：\s]*([a-zA-Z0-9]{20,})', re.IGNORECASE),
                # 收款码、付款码等
                re.compile(r'(?:收款码|付款码|转账码|充币|提币)[:：\s]*([a-zA-Z0-9]{20,})', re.IGNORECASE)
            ],
            'EXCHANGE_PATTERNS': [
                # 交易所充值地址模式
                re.compile(r'(?:充值|deposit|recharge)[:：\s]*([a-zA-Z0-9]{20,})', re.IGNORECASE),
                # 提现地址模式
                re.compile(r'(?:提现|withdraw|提币)[:：\s]*([a-zA-Z0-9]{20,})', re.IGNORECASE)
            ]
        }

        # 高风险关键词
        self._high_risk_keywords = [
            '洗钱', '黑钱', '跑分', '代收', '代付', '刷流水', 'money laundering',
            '暗网', 'dark web', '匿名交易', 'anonymous', '混币', 'mixer',
            '赌博', 'gambling', '博彩', '投注', 'betting', '下注',
            '诈骗', 'scam', '欺诈', 'fraud', '钓鱼', 'phishing',
            '勒索', 'ransom', '敲诈', 'extortion', '黑客', 'hacker'
        ]

        # 统计信息
        self._stats = {
            'total_detections': 0,
            'addresses_found': 0,
            'suspicious_patterns_found': 0,
            'high_risk_content_found': 0,
            'whitelisted_addresses': 0,
            'violations_reported': 0,
            'last_detection_time': None
        }

        self.logger.info("区块链地址检测器初始化完成 - 增强检测模式已启用")
    
    def detect_addresses(self, content: str) -> List[Dict[str, str]]:
        """
        检测文本中的区块链地址 - 增强版

        Args:
            content: 要检测的文本内容

        Returns:
            检测到的地址列表，每个元素包含 {'address': str, 'type': str, 'confidence': str, 'risk_level': str}
        """
        if not content or not isinstance(content, str):
            return []

        self._stats['total_detections'] += 1
        detected_addresses = []

        # 1. 精确匹配已知地址格式
        for address_type, patterns in self._address_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(content)
                for match in matches:
                    # 去重检查
                    if not any(addr['address'] == match for addr in detected_addresses):
                        detected_addresses.append({
                            'address': match,
                            'type': address_type,
                            'confidence': 'high',
                            'risk_level': self._assess_risk_level(content, match),
                            'detection_method': 'exact_pattern'
                        })

        # 2. 可疑模式检测 (更宽泛)
        suspicious_addresses = self._detect_suspicious_patterns(content)
        for addr_info in suspicious_addresses:
            # 避免重复添加已经精确匹配的地址
            if not any(addr['address'] == addr_info['address'] for addr in detected_addresses):
                detected_addresses.append(addr_info)

        # 3. 额外验证检测到的地址
        validated_addresses = []
        for addr_info in detected_addresses:
            if self._validate_address_enhanced(addr_info['address'], addr_info['type']):
                validated_addresses.append(addr_info)

        if validated_addresses:
            self._stats['addresses_found'] += len(validated_addresses)
            self._stats['last_detection_time'] = datetime.now().isoformat()

            # 统计可疑模式
            suspicious_count = len([addr for addr in validated_addresses if addr.get('confidence') == 'medium'])
            if suspicious_count > 0:
                self._stats['suspicious_patterns_found'] += suspicious_count

            self.logger.debug(f"检测到 {len(validated_addresses)} 个地址 (精确: {len(validated_addresses) - suspicious_count}, 可疑: {suspicious_count})")

        return validated_addresses

    def _detect_suspicious_patterns(self, content: str) -> List[Dict[str, str]]:
        """
        检测可疑模式 - 更宽泛的检测

        Args:
            content: 要检测的文本内容

        Returns:
            可疑地址列表
        """
        suspicious_addresses = []

        # 检测通用加密货币模式
        for pattern_type, patterns in self._suspicious_patterns.items():
            for pattern in patterns:
                matches = pattern.findall(content)
                for match in matches:
                    # 提取地址部分（如果是分组匹配）
                    address = match if isinstance(match, str) else match[0] if match else ""

                    if address and len(address) >= 20:  # 最小长度过滤
                        # 进一步验证是否可能是地址
                        if self._is_likely_crypto_address(address):
                            suspicious_addresses.append({
                                'address': address,
                                'type': 'UNKNOWN_CRYPTO',
                                'confidence': 'medium',
                                'risk_level': self._assess_risk_level(content, address),
                                'detection_method': f'suspicious_pattern_{pattern_type.lower()}'
                            })

        return suspicious_addresses

    def _is_likely_crypto_address(self, address: str) -> bool:
        """
        判断字符串是否可能是加密货币地址

        Args:
            address: 待检测的字符串

        Returns:
            是否可能是地址
        """
        # 长度检查
        if len(address) < 20 or len(address) > 120:
            return False

        # 字符集检查
        if not re.match(r'^[a-zA-Z0-9]+$', address):
            return False

        # 排除纯数字或纯字母
        if address.isdigit() or address.isalpha():
            return False

        # 检查是否包含数字和字母
        has_digit = any(c.isdigit() for c in address)
        has_alpha = any(c.isalpha() for c in address)

        if not (has_digit and has_alpha):
            return False

        # 排除常见的非地址模式
        excluded_patterns = [
            r'^[0-9a-f]{32}$',  # 可能是哈希值
            r'^[A-Z]{20,}$',    # 全大写字母
            r'^[a-z]{20,}$',    # 全小写字母
        ]

        for pattern in excluded_patterns:
            if re.match(pattern, address):
                return False

        return True

    def _assess_risk_level(self, content: str, address: str) -> str:
        """
        评估地址的风险等级

        Args:
            content: 完整内容
            address: 地址

        Returns:
            风险等级: 'low', 'medium', 'high', 'critical'
        """
        risk_score = 0

        # 检查高风险关键词
        content_lower = content.lower()
        for keyword in self._high_risk_keywords:
            if keyword.lower() in content_lower:
                risk_score += 10
                self._stats['high_risk_content_found'] += 1

        # 检查地址长度和复杂度
        if len(address) > 60:
            risk_score += 2

        # 检查是否包含特殊前缀
        high_risk_prefixes = ['bc1p', 'zs1', '4', 'X-avax', 'P-avax']
        for prefix in high_risk_prefixes:
            if address.startswith(prefix):
                risk_score += 3
                break

        # 检查内容中的数量信息
        amount_patterns = [
            r'\d+\.?\d*\s*(?:BTC|ETH|USDT|USD|CNY|RMB)',
            r'[¥$€£]\s*\d+',
            r'\d+\s*万',
            r'\d+\s*千'
        ]

        for pattern in amount_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                risk_score += 5
                break

        # 风险等级判定
        if risk_score >= 20:
            return 'critical'
        elif risk_score >= 10:
            return 'high'
        elif risk_score >= 5:
            return 'medium'
        else:
            return 'low'

    def _validate_address_enhanced(self, address: str, address_type: str) -> bool:
        """
        增强的地址验证

        Args:
            address: 地址字符串
            address_type: 地址类型

        Returns:
            是否为有效地址
        """
        # 基本验证
        if not self._validate_address(address, address_type):
            return False

        # 对于未知类型的地址，进行额外验证
        if address_type == 'UNKNOWN_CRYPTO':
            return self._is_likely_crypto_address(address)

        return True

    def detect_and_validate(self, content: str, client_id: str = None) -> Dict:
        """
        检测并验证内容中的区块链地址
        
        Args:
            content: 要检测的文本内容
            client_id: 客户端ID
        
        Returns:
            检测结果字典，包含：
            - detected_addresses: 检测到的地址列表
            - has_violations: 是否有违规地址
            - violations: 违规地址列表
        """
        detected_addresses = self.detect_addresses(content)
        violations = []
        
        if not detected_addresses:
            return {
                'detected_addresses': [],
                'has_violations': False,
                'violations': []
            }
        
        # 检查违规
        for addr_info in detected_addresses:
            address = addr_info['address']
            address_type = addr_info['type']
            
            # 检查是否在白名单中
            if not self._check_whitelist(address):
                violation_data = {
                    'address': address,
                    'type': address_type,
                    'detected_at': datetime.now().isoformat()
                }
                violations.append(violation_data)
                
                # 上报违规事件
                if self.violation_reporter:
                    try:
                        full_violation_data = {
                            'clientId': client_id or 'unknown',
                            'violationType': 'BLOCKCHAIN_ADDRESS',
                            'violationContent': address,
                            'report_time': datetime.now().isoformat(),
                            'additionalData': {
                                'address_type': address_type,
                                'fullClipboardContent': content[:500],  # 限制内容长度
                                'detected_at': datetime.now().isoformat(),
                                'detection_method': 'clipboard_monitor',
                                'risk_level': 'HIGH'
                            }
                        }
                        self.violation_reporter.report_violation(full_violation_data)
                        self._stats['violations_reported'] += 1
                        self.logger.warning(f"检测到违规区块链地址: {address} (类型: {address_type})")
                    except Exception as e:
                        self.logger.error(f"上报违规事件失败: {e}")
                else:
                    self.logger.warning(f"检测到违规区块链地址但无法上报: {address} (类型: {address_type})")
            else:
                self._stats['whitelisted_addresses'] += 1
                self.logger.debug(f"地址在白名单中，跳过: {address}")
        
        return {
            'detected_addresses': detected_addresses,
            'has_violations': len(violations) > 0,
            'violations': violations
        }
    
    def check_violations(self, content: str, client_id: str = None) -> List[Dict]:
        """
        检查内容中的违规地址并生成违规事件
        
        Args:
            content: 要检测的文本内容
            client_id: 客户端ID
        
        Returns:
            违规事件列表
        """
        detected_addresses = self.detect_addresses(content)
        violations = []
        
        if not detected_addresses:
            return violations
        
        # 批量验证检测到的地址
        if self.whitelist_manager:
            addresses = [addr_info['address'] for addr_info in detected_addresses]
            try:
                validation_result = self.whitelist_manager.validate_addresses(addresses)
                whitelisted_addresses = validation_result.get('whitelisted', [])
                violation_addresses = validation_result.get('violations', [])
                
                self._stats['whitelisted_addresses'] += len(whitelisted_addresses)
                
                # 构建违规地址信息
                for addr_info in detected_addresses:
                    address = addr_info['address']
                    address_type = addr_info['type']
                    
                    if address in whitelisted_addresses:
                        self.logger.debug(f"地址在白名单中，跳过: {address}")
                        continue
                    
                    if address in violation_addresses:
                        # 创建违规事件
                        violation_data = {
                            'clientId': client_id or 'unknown',
                            'violationType': 'BLOCKCHAIN_ADDRESS',
                            'violationContent': address,
                            'additionalData': {
                                'address_type': address_type,
                                'fullClipboardContent': content[:500],  # 限制内容长度
                                'detected_at': datetime.now().isoformat()
                            }
                        }
                        
                        violations.append(violation_data)
                        
                        # 上报违规事件
                        if self.violation_reporter:
                            try:
                                # 更新违规数据格式
                                enhanced_violation_data = {
                                    'clientId': client_id or 'unknown',
                                    'violationType': 'BLOCKCHAIN_ADDRESS',
                                    'violationContent': address,
                                    'report_time': datetime.now().isoformat(),
                                    'additionalData': {
                                        'address_type': address_type,
                                        'fullClipboardContent': content[:500],
                                        'detected_at': datetime.now().isoformat(),
                                        'detection_method': 'batch_validation',
                                        'risk_level': 'HIGH'
                                    }
                                }
                                self.violation_reporter.report_violation(enhanced_violation_data)
                                self._stats['violations_reported'] += 1
                                self.logger.warning(f"检测到违规区块链地址: {address} (类型: {address_type})")
                            except Exception as e:
                                self.logger.error(f"上报违规事件失败: {e}")
                        else:
                            self.logger.warning(f"检测到违规区块链地址但无法上报: {address} (类型: {address_type})")
            except Exception as e:
                self.logger.error(f"批量验证地址时出错: {e}")
                # 回退到单个验证
                for addr_info in detected_addresses:
                    address = addr_info['address']
                    address_type = addr_info['type']
                    
                    # 检查是否在白名单中
                    is_whitelisted = self._check_whitelist(address)
                    
                    if is_whitelisted:
                        self._stats['whitelisted_addresses'] += 1
                        self.logger.debug(f"地址在白名单中，跳过: {address}")
                        continue
                    
                    # 创建违规事件
                    violation_data = {
                        'clientId': client_id or 'unknown',
                        'violationType': 'BLOCKCHAIN_ADDRESS',
                        'violationContent': address,
                        'additionalData': {
                            'address_type': address_type,
                            'fullClipboardContent': content[:500],  # 限制内容长度
                            'detected_at': datetime.now().isoformat()
                        }
                    }
                    
                    violations.append(violation_data)
                    
                    # 上报违规事件
                    if self.violation_reporter:
                        try:
                            # 更新违规数据格式
                            enhanced_violation_data = {
                                'clientId': client_id or 'unknown',
                                'violationType': 'BLOCKCHAIN_ADDRESS',
                                'violationContent': address,
                                'report_time': datetime.now().isoformat(),
                                'additionalData': {
                                    'address_type': address_type,
                                    'fullClipboardContent': content[:500],
                                    'detected_at': datetime.now().isoformat(),
                                    'detection_method': 'fallback_validation',
                                    'risk_level': 'HIGH'
                                }
                            }
                            self.violation_reporter.report_violation(enhanced_violation_data)
                            self._stats['violations_reported'] += 1
                            self.logger.warning(f"检测到违规区块链地址: {address} (类型: {address_type})")
                        except Exception as e:
                            self.logger.error(f"上报违规事件失败: {e}")
                    else:
                        self.logger.warning(f"检测到违规区块链地址但无法上报: {address} (类型: {address_type})")
        else:
            # 没有白名单管理器时，所有地址都视为违规
            for addr_info in detected_addresses:
                address = addr_info['address']
                address_type = addr_info['type']
                
                # 创建违规事件
                violation_data = {
                    'clientId': client_id or 'unknown',
                    'violationType': 'BLOCKCHAIN_ADDRESS',
                    'violationContent': address,
                    'additionalData': {
                        'address_type': address_type,
                        'fullClipboardContent': content[:500],  # 限制内容长度
                        'detected_at': datetime.now().isoformat()
                    }
                }
                
                violations.append(violation_data)
                
                # 上报违规事件
                if self.violation_reporter:
                    try:
                        # 更新违规数据格式
                        enhanced_violation_data = {
                            'clientId': client_id or 'unknown',
                            'violationType': 'BLOCKCHAIN_ADDRESS',
                            'violationContent': address,
                            'report_time': datetime.now().isoformat(),
                            'additionalData': {
                                'address_type': address_type,
                                'fullClipboardContent': content[:500],
                                'detected_at': datetime.now().isoformat(),
                                'detection_method': 'no_whitelist',
                                'risk_level': 'HIGH'
                            }
                        }
                        self.violation_reporter.report_violation(enhanced_violation_data)
                        self._stats['violations_reported'] += 1
                        self.logger.warning(f"检测到违规区块链地址: {address} (类型: {address_type})")
                    except Exception as e:
                        self.logger.error(f"上报违规事件失败: {e}")
                else:
                    self.logger.warning(f"检测到违规区块链地址但无法上报: {address} (类型: {address_type})")
        
        return violations
    
    def _validate_address(self, address: str, address_type: str) -> bool:
        """
        验证地址格式的有效性
        
        Args:
            address: 地址字符串
            address_type: 地址类型
        
        Returns:
            是否为有效地址
        """
        if not address or len(address) < 10:
            return False
        
        # 基本长度检查
        length_limits = {
            'BTC': (25, 62),
            'ETH': (42, 42),
            'TRX': (34, 34),
            'LTC': (26, 34),
            'DOGE': (34, 34),
            'BCH': (25, 54),
            'XRP': (25, 34),
            'ADA': (103, 103),
            'DOT': (47, 47),
            'SOL': (32, 44)
        }
        
        if address_type in length_limits:
            min_len, max_len = length_limits[address_type]
            if not (min_len <= len(address) <= max_len):
                return False
        
        # 特殊验证
        if address_type == 'ETH':
            # 以太坊地址必须以0x开头
            return address.startswith('0x') and len(address) == 42
        elif address_type == 'TRX':
            # TRON地址必须以T开头
            return address.startswith('T') and len(address) == 34
        elif address_type == 'BTC':
            # Bitcoin地址验证
            return (address.startswith(('1', '3')) or address.startswith('bc1'))
        
        return True
    
    def _check_whitelist(self, address: str) -> bool:
        """
        检查地址是否在白名单中
        
        Args:
            address: 区块链地址
        
        Returns:
            是否在白名单中
        """
        if not self.whitelist_manager:
            self.logger.warning("白名单管理器未初始化，默认允许所有地址")
            return True
        
        try:
            # 兼容不同版本白名单接口
            if hasattr(self.whitelist_manager, 'is_whitelisted'):
                return self.whitelist_manager.is_whitelisted(address)
            elif hasattr(self.whitelist_manager, 'is_address_whitelisted'):
                return self.whitelist_manager.is_address_whitelisted(address, None)
            elif hasattr(self.whitelist_manager, 'validate_addresses'):
                res = self.whitelist_manager.validate_addresses([address])
                return address in res.get('whitelisted', [])
            else:
                self.logger.warning("白名单管理器不支持检查接口，默认不在白名单")
                return False
        except Exception as e:
            self.logger.error(f"检查白名单时出错: {e}")
            return False  # 出错时默认为不在白名单中
    
    def get_stats(self) -> Dict:
        """
        获取检测统计信息
        
        Returns:
            统计信息字典
        """
        return self._stats.copy()
    
    def reset_stats(self) -> None:
        """
        重置统计信息
        """
        self._stats = {
            'total_detections': 0,
            'addresses_found': 0,
            'whitelisted_addresses': 0,
            'violations_reported': 0,
            'last_detection_time': None
        }
        self.logger.info("检测统计信息已重置")
    
    def test_detection(self, test_content: str) -> Dict:
        """
        测试地址检测功能
        
        Args:
            test_content: 测试内容
        
        Returns:
            测试结果
        """
        start_time = time.time()
        detected = self.detect_addresses(test_content)
        end_time = time.time()
        
        return {
            'detected_addresses': detected,
            'detection_time_ms': round((end_time - start_time) * 1000, 2),
            'address_count': len(detected)
        }