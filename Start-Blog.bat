@echo off
setlocal
cd /d "%~dp0LSBlogs"

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found. Please install Node.js first.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [LSBlogs] Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Check the network and Node.js installation.
        pause
        exit /b 1
    )
)

echo [LSBlogs] Starting the blog at http://localhost:3000
echo Close this window to stop the local blog server.
call npm run dev

if %errorlevel% neq 0 (
    echo [ERROR] The blog failed to start. Keep the error output above.
    pause
    exit /b 1
)
