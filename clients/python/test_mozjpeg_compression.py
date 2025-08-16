#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MozJPEG压缩功能测试脚本

测试内容：
- 截图压缩效果
- 违规截图压缩效果
- 压缩比例统计
"""

import io
import time
from pathlib import Path
from PIL import Image, ImageGrab

try:
    from mozjpeg_lossless_optimization import optimize
    MOZJPEG_AVAILABLE = True
    print("✅ MozJPEG库可用")
except ImportError as e:
    MOZJPEG_AVAILABLE = False
    print(f"❌ MozJPEG库不可用: {e}")
except Exception as e:
    MOZJPEG_AVAILABLE = False
    print(f"❌ MozJPEG库加载异常: {e}")

def test_screenshot_compression():
    """测试截图压缩"""
    print("\n=== 测试截图压缩 ===")
    
    try:
        # 捕获屏幕截图
        print("正在捕获屏幕截图...")
        screenshot = ImageGrab.grab()
        
        # 转换为RGB模式
        if screenshot.mode != 'RGB':
            screenshot = screenshot.convert('RGB')
        
        print(f"原始截图尺寸: {screenshot.size}")
        
        # 测试不同质量的压缩
        qualities = [95, 85, 75, 65]
        
        for quality in qualities:
            print(f"\n--- 质量 {quality} ---")
            
            # 标准JPEG压缩
            buffer = io.BytesIO()
            screenshot.save(buffer, format='JPEG', quality=quality, optimize=True)
            standard_data = buffer.getvalue()
            standard_size = len(standard_data)
            
            print(f"标准JPEG大小: {standard_size:,} bytes ({standard_size/1024/1024:.2f} MB)")
            
            # MozJPEG优化
            if MOZJPEG_AVAILABLE:
                try:
                    optimized_data = optimize(standard_data)
                    optimized_size = len(optimized_data)
                    compression_ratio = (standard_size - optimized_size) / standard_size * 100
                    
                    print(f"MozJPEG大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
                    print(f"压缩比例: {compression_ratio:.2f}%")
                    print(f"节省空间: {standard_size - optimized_size:,} bytes")
                    
                except Exception as e:
                    print(f"MozJPEG优化失败: {e}")
            else:
                print("MozJPEG不可用，跳过优化测试")
        
        return True
        
    except Exception as e:
        print(f"截图压缩测试失败: {e}")
        return False

def test_violation_screenshot_compression():
    """测试违规截图压缩（模拟）"""
    print("\n=== 测试违规截图压缩 ===")
    
    try:
        # 捕获屏幕截图（模拟违规时的截图）
        print("正在捕获违规截图...")
        screenshot = ImageGrab.grab()
        
        # 转换为RGB模式
        if screenshot.mode != 'RGB':
            screenshot = screenshot.convert('RGB')
        
        # 缩放到违规截图的标准尺寸
        max_dimension = 1920
        width, height = screenshot.size
        max_side = max(width, height)
        
        if max_side > max_dimension:
            scale = max_dimension / max_side
            new_width = int(width * scale)
            new_height = int(height * scale)
            screenshot = screenshot.resize((new_width, new_height), Image.Resampling.LANCZOS)
            print(f"缩放后尺寸: {screenshot.size}")
        
        # 违规截图压缩（质量85）
        quality = 85
        buffer = io.BytesIO()
        screenshot.save(buffer, format='JPEG', quality=quality, optimize=True)
        standard_data = buffer.getvalue()
        standard_size = len(standard_data)
        
        print(f"标准JPEG大小: {standard_size:,} bytes ({standard_size/1024/1024:.2f} MB)")
        
        # MozJPEG优化
        if MOZJPEG_AVAILABLE:
            try:
                optimized_data = optimize(standard_data)
                optimized_size = len(optimized_data)
                compression_ratio = (standard_size - optimized_size) / standard_size * 100
                
                print(f"MozJPEG大小: {optimized_size:,} bytes ({optimized_size/1024/1024:.2f} MB)")
                print(f"压缩比例: {compression_ratio:.2f}%")
                print(f"节省空间: {standard_size - optimized_size:,} bytes")
                
                # 计算Base64编码后的大小（用于网络传输）
                import base64
                base64_size = len(base64.b64encode(optimized_data))
                print(f"Base64编码大小: {base64_size:,} bytes ({base64_size/1024/1024:.2f} MB)")
                
                return True
                
            except Exception as e:
                print(f"MozJPEG优化失败: {e}")
                return False
        else:
            print("MozJPEG不可用，无法测试优化")
            return False
        
    except Exception as e:
        print(f"违规截图压缩测试失败: {e}")
        return False

def test_compression_performance():
    """测试压缩性能"""
    print("\n=== 测试压缩性能 ===")
    
    if not MOZJPEG_AVAILABLE:
        print("MozJPEG不可用，跳过性能测试")
        return False
    
    try:
        # 创建一个测试图片
        test_image = Image.new('RGB', (1920, 1080), color='red')
        
        # 添加一些复杂内容
        from PIL import ImageDraw
        draw = ImageDraw.Draw(test_image)
        for i in range(0, 1920, 50):
            for j in range(0, 1080, 50):
                draw.rectangle([i, j, i+25, j+25], fill=(i%255, j%255, (i+j)%255))
        
        # 测试压缩时间
        buffer = io.BytesIO()
        test_image.save(buffer, format='JPEG', quality=85, optimize=True)
        jpeg_data = buffer.getvalue()
        
        print(f"测试图片大小: {len(jpeg_data):,} bytes")
        
        # 测试MozJPEG优化时间
        start_time = time.time()
        optimized_data = optimize(jpeg_data)
        end_time = time.time()
        
        optimization_time = end_time - start_time
        compression_ratio = (len(jpeg_data) - len(optimized_data)) / len(jpeg_data) * 100
        
        print(f"优化时间: {optimization_time:.3f} 秒")
        print(f"压缩比例: {compression_ratio:.2f}%")
        print(f"优化后大小: {len(optimized_data):,} bytes")
        
        return True
        
    except Exception as e:
        print(f"性能测试失败: {e}")
        return False

def main():
    """主函数"""
    print("MozJPEG压缩功能测试")
    print("=" * 50)
    
    # 运行测试
    tests = [
        ("截图压缩测试", test_screenshot_compression),
        ("违规截图压缩测试", test_violation_screenshot_compression),
        ("压缩性能测试", test_compression_performance)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name}执行异常: {e}")
            results.append((test_name, False))
    
    # 输出测试结果
    print("\n" + "=" * 50)
    print("测试结果汇总:")
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
    
    # 总体结果
    passed_count = sum(1 for _, result in results if result)
    total_count = len(results)
    print(f"\n总体结果: {passed_count}/{total_count} 测试通过")
    
    if passed_count == total_count:
        print("🎉 所有测试通过！MozJPEG压缩功能集成成功。")
    else:
        print("⚠️ 部分测试失败，请检查相关配置。")

if __name__ == "__main__":
    main()