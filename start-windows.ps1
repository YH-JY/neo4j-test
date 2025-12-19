# Cloud Native Graph Platform - PowerShell Startup Script
# Author: Cloud Native Platform Team
# Version: 1.0

param(
    [string]$BackendPort = "3001",
    [string]$FrontendPort = "3000",
    [switch]$InstallDependencies,
    [switch]$Force
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查Node.js
function Test-NodeJS {
    try {
        $nodeVersion = node --version
        if ($nodeVersion) {
            Write-ColorOutput "✓ Node.js is installed: $nodeVersion" "Green"
            return $true
        }
    }
    catch {
        Write-ColorOutput "✗ Node.js is not installed" "Red"
        Write-ColorOutput "Please download and install Node.js from: https://nodejs.org/" "Yellow"
        return $false
    }
    return $false
}

# 安装依赖
function Install-Dependencies {
    Write-ColorOutput "`nInstalling dependencies..." "Cyan"
    
    # 后端依赖
    if (Test-Path "backend\package.json") {
        Write-ColorOutput "Installing backend dependencies..." "Cyan"
        Set-Location backend
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install backend dependencies"
        }
        Set-Location ..
        Write-ColorOutput "✓ Backend dependencies installed" "Green"
    }
    
    # 前端依赖
    if (Test-Path "frontend\package.json") {
        Write-ColorOutput "Installing frontend dependencies..." "Cyan"
        Set-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install frontend dependencies"
        }
        Set-Location ..
        Write-ColorOutput "✓ Frontend dependencies installed" "Green"
    }
    
    # 创建日志目录
    if (!(Test-Path "backend\logs")) {
        New-Item -ItemType Directory -Path "backend\logs" | Out-Null
    }
    
    Write-ColorOutput "`n✓ All dependencies installed successfully!" "Green"
}

# 检查配置文件
function Test-Configuration {
    if (!(Test-Path "backend\.env")) {
        if (Test-Path "backend\.env.example") {
            Copy-Item "backend\.env.example" "backend\.env"
            Write-ColorOutput "`n⚠ Configuration file created: backend\.env" "Yellow"
            Write-ColorOutput "Please edit this file with your Neo4j and Kubernetes settings" "Yellow"
            Write-ColorOutput "  - NEO4J_URI and NEO4J_BOLT_URL should point to your Linux host" "Yellow"
            Write-ColorOutput "  - Update NEO4J_USER and NEO4J_PASSWORD" "Yellow"
            Write-ColorOutput "  - Set K8S_CONFIG_PATH to your kubeconfig location" "Yellow"
            return $false
        }
    }
    return $true
}

# 启动后端
function Start-Backend {
    Write-ColorOutput "`nStarting backend server..." "Cyan"
    $backendProcess = Start-Process -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory "backend" -PassThru
    return $backendProcess
}

# 启动前端
function Start-Frontend {
    Write-ColorOutput "`nStarting frontend server..." "Cyan"
    $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory "frontend" -PassThru
    return $frontendProcess
}

# 主函数
function Main {
    Write-ColorOutput "`n========================================" "White"
    Write-ColorOutput "Cloud Native Graph Platform" "White"
    Write-ColorOutput "PowerShell Startup Script" "White"
    Write-ColorOutput "========================================" "White"
    
    # 检查是否在项目目录
    if (!(Test-Path "backend\package.json") -or !(Test-Path "frontend\package.json")) {
        Write-ColorOutput "Error: Not in project directory or missing package.json files" "Red"
        exit 1
    }
    
    # 检查Node.js
    if (!(Test-NodeJS)) {
        exit 1
    }
    
    # 安装依赖（如果指定）
    if ($InstallDependencies) {
        try {
            Install-Dependencies
        }
        catch {
            Write-ColorOutput "Error: $_" "Red"
            exit 1
        }
    }
    
    # 检查配置
    $configOk = Test-Configuration
    if (!$configOk -and !$Force) {
        Write-ColorOutput "`nPlease edit backend\.env and run the script again" "Yellow"
        Write-ColorOutput "Or use -Force to skip this check" "Yellow"
        exit 1
    }
    
    Write-ColorOutput "`nStarting application..." "Green"
    Write-ColorOutput "Backend will run on: http://localhost:$BackendPort" "Cyan"
    Write-ColorOutput "Frontend will run on: http://localhost:$FrontendPort" "Cyan"
    Write-ColorOutput "`nPress Ctrl+C to stop all services`n" "Yellow"
    
    # 创建作业以管理进程
    try {
        $backendJob = Start-Job -ScriptBlock {
            param($WorkingDir, $Script)
            Set-Location $WorkingDir
            node $Script
        } -ArgumentList "$PWD\backend", "src/index.js"
        
        $frontendJob = Start-Job -ScriptBlock {
            param($WorkingDir)
            Set-Location $WorkingDir
            npm start
        } -ArgumentList "$PWD\frontend"
        
        Write-ColorOutput "Services started in background jobs" "Green"
        Write-ColorOutput "`nTo check job status:" "Cyan"
        Write-ColorOutput "  Get-Job" "Gray"
        Write-ColorOutput "`nTo view output:" "Cyan"
        Write-ColorOutput "  Receive-Job -Id <JobId>" "Gray"
        Write-ColorOutput "`nTo stop services:" "Cyan"
        Write-ColorOutput "  Stop-Job -Id <JobId>" "Gray"
        Write-ColorOutput "  Remove-Job -Id <JobId>" "Gray"
        
        # 等待用户输入来停止
        do {
            Write-Host "`nPress 'q' to quit, 's' to show status, 'o' to show output: " -NoNewline
            $input = Read-Host
            switch ($input.ToLower()) {
                's' {
                    Write-ColorOutput "`nJob Status:" "Cyan"
                    Get-Job | Format-Table -AutoSize
                }
                'o' {
                    Write-ColorOutput "`nBackend Output:" "Cyan"
                    Receive-Job -Id $backendJob -ErrorAction SilentlyContinue
                    Write-ColorOutput "`nFrontend Output:" "Cyan"
                    Receive-Job -Id $frontendJob -ErrorAction SilentlyContinue
                }
            }
        } while ($input.ToLower() -ne 'q')
        
        # 停止所有作业
        Write-ColorOutput "`nStopping services..." "Yellow"
        Stop-Job -Id $backendJob, $frontendJob
        Remove-Job -Id $backendJob, $frontendJob
        Write-ColorOutput "Services stopped" "Green"
    }
    catch {
        Write-ColorOutput "Error: $_" "Red"
    }
}

# 运行主函数
Main