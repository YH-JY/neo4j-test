@echo off
echo ========================================
echo Network Connection Test
echo Testing connection to Linux host services
echo ========================================

REM 设置Linux主机IP
set LINUX_IP=192.168.40.129

echo.
echo Testing Neo4j HTTP Port (7474)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://%LINUX_IP%:7474' -TimeoutSec 5; Write-Host 'Neo4j HTTP: SUCCESS' } catch { Write-Host 'Neo4j HTTP: FAILED - ' $_.Exception.Message }"

echo.
echo Testing Neo4j Bolt Port (7687)...
powershell -Command "try { $tcpClient = New-Object System.Net.Sockets.TcpClient; $tcpClient.Connect('%LINUX_IP%', 7687); $tcpClient.Close(); Write-Host 'Neo4j Bolt: SUCCESS' } catch { Write-Host 'Neo4j Bolt: FAILED - Connection refused' }"

echo.
echo Testing Kubernetes API (6443)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'https://%LINUX_IP%:6443' -TimeoutSec 5; Write-Host 'K8s API: SUCCESS' } catch { Write-Host 'K8s API: FAILED - ' $_.Exception.Message }"

echo.
echo Ping test to Linux host...
ping -n 4 %LINUX_IP%

echo.
echo ========================================
echo Test completed!
echo ========================================
pause