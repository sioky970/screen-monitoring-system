#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试配置加载功能
"""

import sys
from pathlib import Path

# 添加src目录到Python路径
sys.path.insert(0, str(Path(__file__).parent / "src"))

from core.config import AppConfig

def test_config():
    """测试配置加载"""
    print("=== 测试配置加载 ===")
    
    try:
        config = AppConfig()
        
        print("普通截图配置:")
        print(f"  质量: {config.screenshot.quality}")
        print(f"  最大尺寸: {config.screenshot.max_long_side}")
        print(f"  最大文件大小: {config.screenshot.max_file_size}")
        
        print("违规截图配置:")
        print(f"  质量: {config.screenshot.violation.quality}")
        print(f"  最大尺寸: {config.screenshot.violation.max_long_side}")
        print(f"  最大文件大小: {config.screenshot.violation.max_file_size}")
        print(f"  保留原始分辨率: {config.screenshot.violation.preserve_resolution}")
        print(f"  无损优化: {config.screenshot.violation.lossless_optimization}")
        
        print("配置加载成功!")
        
    except Exception as e:
        print(f"配置加载失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_config()
