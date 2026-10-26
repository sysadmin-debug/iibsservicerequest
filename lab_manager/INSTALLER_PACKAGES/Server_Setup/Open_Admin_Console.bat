@echo off
title IIBS Computer Lab Master Server
cls
echo ==========================================================
echo    IIBS COMPUTER LAB MANAGEMENT SYSTEM - MASTER SERVER
echo ==========================================================
echo.
echo  The Master Server is active and listening on:
echo.
echo    [+] Wi-Fi Network:    http://192.168.14.250:5050/admin
echo    [+] Ethernet Cable:   http://192.168.6.189:5050/admin
echo    [+] This Computer:    http://127.0.0.1:5050/admin
echo.
echo ==========================================================
echo  Opening the Admin Portal in your web browser now...
echo ==========================================================
start "" "http://127.0.0.1:5050/admin"
pause
