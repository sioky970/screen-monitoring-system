@echo off
chcp 65001 > nul
echo Starting console window test...
echo.

REM Set window title
title Screen Monitor System - Console Test

REM Run Python test script
python test_console_simple.py

echo.
echo Test completed, press any key to close window...
pause > nul