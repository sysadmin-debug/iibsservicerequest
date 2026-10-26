@echo off
title IIBS Computer Lab Master Server Launcher
cd /d "%~dp0server"
echo ====================================================
echo   IIBS COMPUTER LAB MANAGEMENT SYSTEM - MASTER SERVER
echo ====================================================
echo Server Console URL:
echo   - Local Browser: http://127.0.0.1:5050/admin
echo   - Wi-Fi LAN:     http://192.168.14.250:5050/admin
echo   - Ethernet LAN:  http://192.168.6.189:5050/admin
echo ====================================================
python -m pip install flask werkzeug >nul 2>&1
python server.py
pause
