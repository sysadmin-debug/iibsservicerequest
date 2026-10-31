@echo off
setlocal
title IIBS Lab Management Master Server
cls
echo ==========================================================
echo       IIBS COMPUTER LAB MANAGEMENT - MASTER SERVER
echo ==========================================================
echo.
echo Starting Master Server on Port 5050...
echo.

cd /d "%~dp0"

netsh advfirewall firewall delete rule name="IIBS_Server_Port_5050" >nul 2>&1
netsh advfirewall firewall add rule name="IIBS_Server_Port_5050" dir=in action=allow protocol=TCP localport=5050 >nul 2>&1

start "" "http://localhost:5050/admin"

IIBS_Lab_Server.exe
pause
