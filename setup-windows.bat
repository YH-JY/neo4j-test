@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Cloud Native Graph Platform
echo Windows Environment Setup
echo ========================================
echo.

REM 检查Node.js
echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    echo     ✓ Node.js is installed: !NODE_VER!
) else (
    echo     ✗ Node.js is not installed
    echo.
    echo     Please download and install Node.js from:
    echo     https://nodejs.org/
    pause
    exit /b 1
)

REM 检查npm
echo.
echo [2/5] Checking npm...
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
    echo     ✓ npm is installed: !NPM_VER!
) else (
    echo     ✗ npm is not installed
)

REM 检查Git
echo.
echo [3/5] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VER=%%i
    echo     ✓ Git is installed: !GIT_VER!
) else (
    echo     ⚠ Git is not installed (optional for deployment)
    echo     Download from: https://git-scm.com/download/win
)

REM 检查项目文件
echo.
echo [4/5] Checking project files...
if exist "backend\package.json" (
    echo     ✓ backend package.json found
) else (
    echo     ✗ backend package.json not found
)

if exist "frontend\package.json" (
    echo     ✓ frontend package.json found
) else (
    echo     ✗ frontend package.json not found
)

REM 创建配置文件
echo.
echo [5/5] Setting up configuration...

if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo     ✓ Created .env from .env.example
        echo.
        echo     ⚠ IMPORTANT: Edit backend\.env and update:
        echo       - NEO4J_URI with your Linux host IP
        echo       - NEO4J_BOLT_URL with your Linux host IP
        echo       - K8S_CONFIG_PATH with path to kubeconfig
    ) else (
        echo     ⚠ .env.example not found
    )
) else (
    echo     ✓ .env file already exists
)

REM 检查PowerShell执行策略
echo.
echo [EXTRA] Checking PowerShell execution policy...
for /f "tokens=*" %%i in ('powershell -Command "Get-ExecutionPolicy"') do set PS_POLICY=%%i
echo     Current policy: !PS_POLICY!
if "!PS_POLICY!"=="Restricted" (
    echo     ⚠ PowerShell execution is restricted
    echo     Run as Administrator to enable:
    echo       Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
)

echo.
echo ========================================
echo Environment check completed!
echo ========================================
echo.
echo Next steps:
echo 1. Edit backend\.env with your configuration
echo 2. Run test-connection.bat to verify network
echo 3. Run start-windows.bat or start-windows.ps1
echo.
pause