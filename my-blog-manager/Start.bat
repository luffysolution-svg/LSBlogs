@echo off
setlocal
chcp 65001 >nul
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
cd /d "%~dp0"

echo [LSBlogs] 正在检查 Python 3.10+ 环境...
set "PYTHON_CMD="

where py >nul 2>&1
if %errorlevel% equ 0 (
    py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
    if %errorlevel% equ 0 set "PYTHON_CMD=py -3"
)

if not defined PYTHON_CMD (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>&1
        if %errorlevel% equ 0 set "PYTHON_CMD=python"
    )
)

if not defined PYTHON_CMD (
    echo [错误] 未找到 Python 3.10 或更高版本。
    echo 请安装 Python，并确认 py 或 python 命令可用。
    pause
    exit /b 1
)

echo [LSBlogs] 使用 %PYTHON_CMD% 启动管理端...
%PYTHON_CMD% run_me.py

if %errorlevel% neq 0 (
    echo [错误] 管理端启动失败，请保留此窗口中的错误信息。
    pause
    exit /b 1
)

echo [LSBlogs] 启动命令已完成。
exit /b 0
