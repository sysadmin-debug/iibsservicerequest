@echo off
title Configure Lab Server Firewall
echo ==========================================================
echo    OPENING FIREWALL PORTS FOR LAB CLIENTS (5050 and 5000)
echo ==========================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Must run as Administrator!
    echo Right-click this file and select 'Run as administrator'.
    echo.
    pause
    exit /b 1
)

netsh advfirewall firewall delete rule name="IIBS_Lab_Server_5050" >nul 2>&1
netsh advfirewall firewall add rule name="IIBS_Lab_Server_5050" dir=in action=allow protocol=TCP localport=5050 profile=any
netsh advfirewall firewall delete rule name="IIBS_Lab_Server_5000" >nul 2>&1
netsh advfirewall firewall add rule name="IIBS_Lab_Server_5000" dir=in action=allow protocol=TCP localport=5000 profile=any

echo.
echo ==========================================================
echo  [SUCCESS] Port 5050 and 5000 are now OPEN!
echo  Client PCs can now connect immediately.
echo ==========================================================
pause
