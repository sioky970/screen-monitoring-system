@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   屏幕监控客户端卸载程序
echo ========================================
echo.

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 请以管理员身份运行此脚本
    pause
    exit /b 1
)

:: 设置安装目录
set INSTALL_DIR=C:\ScreenMonitor
set APP_DIR=%INSTALL_DIR%\app

echo 📁 安装目录: %INSTALL_DIR%
echo.

:: 检查是否已安装
if not exist "%INSTALL_DIR%" (
    echo ❌ 屏幕监控客户端未安装
    pause
    exit /b 1
)

:: 确认卸载
echo ⚠️ 即将卸载屏幕监控客户端
echo    这将删除所有程序文件和配置
echo.
set /p confirm=确定要继续吗? (y/N): 
if /i not "%confirm%"=="y" (
    echo 取消卸载
    pause
    exit /b 0
)

echo.
echo 🔧 开始卸载...

:: 停止并卸载服务
if exist "%APP_DIR%\ServiceManager.exe" (
    echo 🛑 停止服务...
    "%APP_DIR%\ServiceManager.exe" stop
    
    echo 🗑️ 卸载服务...
    "%APP_DIR%\ServiceManager.exe" uninstall --force
)

:: 等待服务完全停止
timeout /t 3 /nobreak >nul

:: 删除安装目录
echo 🗂️ 删除程序文件...
rmdir /s /q "%INSTALL_DIR%" 2>nul

if exist "%INSTALL_DIR%" (
    echo ⚠️ 部分文件可能正在使用中，请重启后手动删除: %INSTALL_DIR%
) else (
    echo ✅ 程序文件删除完成
)

echo.
echo 🎉 屏幕监控客户端卸载完成！
echo.
pause
