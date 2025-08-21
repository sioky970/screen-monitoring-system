#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试违规截图高质量压缩功能

功能：
- 测试违规截图的高质量设置
- 对比普通截图和违规截图的质量差异
- 验证配置参数的效果
"""

import sys
import os
import time
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.config import AppConfig
from modules.violation import ViolationReporter
from utils.client_id import ClientIdManager
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s'
)
logger = logging.getLogger(__name__)

def test_screenshot_quality():
    """测试截图质量设置"""
    logger.info("=== 测试违规截图质量设置 ===")
    
    # 加载配置
    config = AppConfig()
    
    # 显示配置信息
    logger.info("当前截图配置:")
    logger.info(f"  普通截图质量: {config.screenshot.quality}")
    logger.info(f"  普通截图最大尺寸: {config.screenshot.max_long_side}")
    logger.info(f"  普通截图最大文件大小: {config.screenshot.max_file_size} bytes")
    
    logger.info("违规截图配置:")
    logger.info(f"  违规截图质量: {config.screenshot.violation.quality}")
    logger.info(f"  违规截图最大尺寸: {config.screenshot.violation.max_long_side}")
    logger.info(f"  违规截图最大文件大小: {config.screenshot.violation.max_file_size} bytes")
    logger.info(f"  保留原始分辨率: {config.screenshot.violation.preserve_resolution}")
    logger.info(f"  无损优化: {config.screenshot.violation.lossless_optimization}")
    
    # 获取客户端ID
    client_id_manager = ClientIdManager(config, logger)
    client_id = client_id_manager.get_client_uid()
    
    # 创建违规上报器
    violation_reporter = ViolationReporter(config, client_id, logger)
    
    # 测试截图获取
    logger.info("开始获取违规截图...")
    screenshot_data = violation_reporter._get_current_screenshot()
    
    if screenshot_data:
        logger.info(f"违规截图获取成功!")
        logger.info(f"  文件大小: {len(screenshot_data)} bytes ({len(screenshot_data)/1024:.1f} KB)")
        
        # 保存测试截图到文件
        test_file = Path("test_violation_screenshot.jpg")
        with open(test_file, 'wb') as f:
            f.write(screenshot_data)
        logger.info(f"测试截图已保存到: {test_file}")
        
        # 分析截图质量
        try:
            from PIL import Image
            import io
            
            # 加载截图分析
            image = Image.open(io.BytesIO(screenshot_data))
            logger.info(f"  图片分辨率: {image.size[0]}x{image.size[1]}")
            logger.info(f"  图片模式: {image.mode}")
            logger.info(f"  图片格式: {image.format}")
            
            # 计算压缩比
            uncompressed_size = image.size[0] * image.size[1] * 3  # RGB
            compression_ratio = len(screenshot_data) / uncompressed_size
            logger.info(f"  压缩比: {compression_ratio:.3f} ({compression_ratio*100:.1f}%)")
            
        except Exception as e:
            logger.error(f"分析截图失败: {e}")
    else:
        logger.warning("违规截图获取失败")

def test_quality_comparison():
    """测试不同质量设置的对比"""
    logger.info("=== 测试不同质量设置对比 ===")
    
    try:
        from PIL import ImageGrab, Image
        import io
        
        # 获取屏幕截图
        screenshot = ImageGrab.grab()
        logger.info(f"原始截图分辨率: {screenshot.size}")
        
        # 测试不同质量设置
        quality_levels = [60, 75, 85, 90, 95]
        
        for quality in quality_levels:
            output = io.BytesIO()
            
            # 保存截图
            save_kwargs = {
                'format': 'JPEG',
                'quality': quality,
                'optimize': True,
                'progressive': True,
                'subsampling': 0,
                'qtables': 'web_high'
            }
            
            screenshot.save(output, **save_kwargs)
            data = output.getvalue()
            output.close()
            
            # 保存测试文件
            test_file = Path(f"test_quality_{quality}.jpg")
            with open(test_file, 'wb') as f:
                f.write(data)
            
            logger.info(f"质量 {quality}: {len(data)} bytes ({len(data)/1024:.1f} KB) -> {test_file}")
            
    except ImportError:
        logger.warning("PIL.ImageGrab不可用，跳过质量对比测试")
    except Exception as e:
        logger.error(f"质量对比测试失败: {e}")

def test_violation_data_preparation():
    """测试违规数据准备（包含高质量截图）"""
    logger.info("=== 测试违规数据准备 ===")
    
    # 加载配置
    config = AppConfig()
    
    # 获取客户端ID
    client_id_manager = ClientIdManager(config, logger)
    client_id = client_id_manager.get_client_uid()
    
    # 创建违规上报器
    violation_reporter = ViolationReporter(config, client_id, logger)
    
    # 测试违规数据
    test_violation_data = {
        'clientId': client_id,
        'violationType': 'BLOCKCHAIN_ADDRESS',
        'violationContent': '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2',
        'report_time': '2025-08-22T12:00:00.000Z',
        'additionalData': {
            'address_type': 'BTC',
            'fullClipboardContent': '测试高质量违规截图',
            'detected_at': '2025-08-22T12:00:00.000Z',
            'detection_method': 'test_high_quality',
            'risk_level': 'HIGH'
        }
    }
    
    # 准备违规数据
    logger.info("准备违规数据（包含高质量截图）...")
    files_data, form_data = violation_reporter._prepare_violation_data(test_violation_data)
    
    # 显示结果
    logger.info("准备完成!")
    logger.info("表单数据:")
    for key, value in form_data.items():
        if key == 'additionalData':
            logger.info(f"  {key}: [JSON数据]")
        else:
            logger.info(f"  {key}: {value}")
    
    logger.info("文件数据:")
    for key, (filename, data, content_type) in files_data.items():
        logger.info(f"  {key}: {filename} ({content_type}, {len(data)} bytes, {len(data)/1024:.1f} KB)")

def cleanup_test_files():
    """清理测试文件"""
    logger.info("清理测试文件...")
    
    test_files = [
        "test_violation_screenshot.jpg",
        "test_quality_60.jpg",
        "test_quality_75.jpg", 
        "test_quality_85.jpg",
        "test_quality_90.jpg",
        "test_quality_95.jpg"
    ]
    
    for filename in test_files:
        test_file = Path(filename)
        if test_file.exists():
            try:
                test_file.unlink()
                logger.info(f"已删除: {filename}")
            except Exception as e:
                logger.warning(f"删除文件失败 {filename}: {e}")

if __name__ == "__main__":
    logger.info("开始测试违规截图高质量压缩功能")
    
    try:
        # 测试截图质量设置
        test_screenshot_quality()
        
        print("\n" + "="*50 + "\n")
        
        # 测试质量对比
        test_quality_comparison()
        
        print("\n" + "="*50 + "\n")
        
        # 测试违规数据准备
        test_violation_data_preparation()
        
        print("\n" + "="*50 + "\n")
        
        # 等待用户查看文件
        input("按回车键清理测试文件...")
        cleanup_test_files()
        
    except Exception as e:
        logger.error(f"测试过程中发生错误: {e}", exc_info=True)
    
    logger.info("测试完成")
