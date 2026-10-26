@echo off
:: Batch script to enable Windows Firewall port 5000 for Master Server
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please right-click this file and select "Run as Administrator"!
    pause
    exit /b 1
)

echo Adding Windows Firewall Rule for Port 5000 (IIBS Lab Server)...
netsh advfirewall firewall delete rule name="IIBS_Lab_Server_5000" >nul 2>&1
netsh advfirewall firewall add rule name="IIBS_Lab_Server_5000" dir=in action=allow protocol=TCP localport=5000 profile=any

echo ==========================================================
echo Firewall successfully configured!
echo Lab PCs can now connect to this server without blocking.
echo ==========================================================
pause
