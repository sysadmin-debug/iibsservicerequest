@echo off
title IIBS Computer Lab Master Server Launcher
cd /d "%~dp0server"
echo ====================================================
echo   IIBS COMPUTER LAB MANAGEMENT SYSTEM - MASTER SERVER
echo ====================================================
echo Server IPs:
echo   - Wi-Fi:    http://192.168.14.250:5000/admin
echo   - Ethernet: http://192.168.6.189:5000/admin
echo   - Local:    http://127.0.0.1:5000/admin
echo ====================================================
python -m pip install flask werkzeug >nul 2>&1
python server.py
pause
