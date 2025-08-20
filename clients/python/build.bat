@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   屏幕监控客户端构建脚本
echo ========================================
echo.

:: 检查Python环境
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ Python 未安装或未添加到PATH
    pause
    exit /b 1
)

:: 检查虚拟环境
if exist "venv\Scripts\activate.bat" (
    echo 🔧 激活虚拟环境...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️ 虚拟环境不存在，使用系统Python
)

:: 安装构建依赖
echo 📦 安装构建依赖...
pip install pyinstaller

:: 执行构建
echo 🔨 开始构建...
python build.py

echo.
echo 构建完成！
pause
