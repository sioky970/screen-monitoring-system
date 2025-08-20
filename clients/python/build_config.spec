# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller配置文件 - 屏幕监控客户端
用于将Python客户端编译为独立的exe程序
"""

import os
import sys
from pathlib import Path

# 项目根目录
project_root = Path(SPECPATH)
src_dir = project_root / "src"

# 添加源码路径
sys.path.insert(0, str(src_dir))

# 数据文件和配置文件
datas = [
    # 配置文件
    (str(project_root / "config" / "config.yaml"), "config"),
    (str(project_root / "config" / "config.prod.yaml"), "config"),
    
    # 缓存目录（如果存在）
    (str(project_root / "cache"), "cache"),
]

# 隐藏导入的模块
hiddenimports = [
    # 核心模块
    'core.config',
    'core.logger', 
    'core.client',
    
    # 功能模块
    'modules.screenshot',
    'modules.clipboard',
    'modules.websocket_client',
    'modules.http_client',
    'modules.whitelist',
    'modules.violation',
    'modules.blockchain_detector',
    
    # 工具模块
    'utils.client_id',
    'utils.windows_service',
    'utils.system_info',
    
    # Windows服务相关
    'win32serviceutil',
    'win32service',
    'win32event',
    'servicemanager',
    'win32api',
    'win32con',
    'win32gui',
    'win32clipboard',
    'win32process',
    
    # 图像处理
    'PIL.Image',
    'PIL.ImageGrab',
    'PIL.ImageDraw',
    'PIL.ImageFont',
    
    # 网络和加密
    'requests',
    'websocket',
    'cryptography',
    'urllib3',
    
    # 系统相关
    'psutil',
    'platform',
    'socket',
    'threading',
    'multiprocessing',
    
    # 数据处理
    'json',
    'yaml',
    'base64',
    'hashlib',
    'uuid',
    'datetime',
    'time',
    're',
    
    # 文件系统
    'pathlib',
    'os',
    'sys',
    'shutil',
    'tempfile',
]

# 排除的模块（减少exe大小）
excludes = [
    'tkinter',
    'matplotlib',
    'numpy',
    'pandas',
    'scipy',
    'jupyter',
    'IPython',
    'pytest',
    'unittest',
    'doctest',
]

# 主程序分析
a = Analysis(
    ['main.py'],
    pathex=[str(src_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# 服务管理程序分析
service_a = Analysis(
    ['scripts/service_manager.py'],
    pathex=[str(src_dir)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excludes,
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# 合并分析结果
MERGE((a, 'screen_monitor', 'screen_monitor'), (service_a, 'service_manager', 'service_manager'))

# 主程序PYZ
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# 服务管理程序PYZ
service_pyz = PYZ(service_a.pure, service_a.zipped_data, cipher=None)

# 主程序EXE
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ScreenMonitor',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # 无控制台窗口（后台运行）
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # 可以添加图标文件路径
    version_file=None,  # 可以添加版本信息文件
)

# 服务管理程序EXE
service_exe = EXE(
    service_pyz,
    service_a.scripts,
    [],
    exclude_binaries=True,
    name='ServiceManager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,  # 有控制台窗口（管理工具）
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

# 收集所有文件
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    service_exe,
    service_a.binaries,
    service_a.zipfiles,
    service_a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ScreenMonitorClient'
)
