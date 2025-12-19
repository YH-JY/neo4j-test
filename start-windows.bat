@echo off
echo ========================================
echo Cloud Native Graph Platform - Windows
echo ========================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js is installed

REM 后端设置
echo.
echo Setting up backend...
cd backend

REM 检查node_modules是否存在
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM 创建logs目录
if not exist "logs" mkdir logs

REM 创建.env文件（如果不存在）
if not exist ".env" (
    echo Creating .env configuration file...
    copy .env.example .env
    echo.
    echo IMPORTANT: Please edit backend\.env with your configuration:
    echo   - NEO4J_URI and NEO4J_BOLT_URL should point to your Linux host
    echo   - NEO4J_USER and NEO4J_PASSWORD
    pause
)

REM 前端设置
echo.
echo Setting up frontend...
cd ..\frontend

REM 检查node_modules是否存在
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

REM 返回根目录
cd ..

echo.
echo ========================================
echo Starting application...
echo ========================================
echo.
echo Backend will run on: http://localhost:3001
echo Frontend will run on: http://localhost:3000
echo.
echo Make sure your K8s cluster and Neo4j are accessible from this Windows machine
echo.

REM 启动后端（新窗口）
start "Backend Server" cmd /k "cd backend && npm start"

REM 等待后端启动
echo Starting backend...
timeout /t 5 /nobreak >nul

REM 启动前端（新窗口）
start "Frontend Server" cmd /k "cd frontend && npm start"

echo.
echo ========================================
echo Application is starting...
echo Two new windows have been opened for backend and frontend
echo.
echo Access the application at: http://localhost:3000
echo.
echo Press any key to exit this window (servers will continue running)
echo ========================================
pause >nul