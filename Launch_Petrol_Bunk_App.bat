@echo off
title Babu Raju Ram Fuel Station - Attendance Manager
cd /d "%~dp0"

echo ========================================================
echo   Starting Babu Raju Ram Fuel Station Attendance App...
echo ========================================================

:: Check if server is already running on port 8765
netstat -ano | findstr :8765 >nul
if %errorlevel% neq 0 (
    echo Starting local background service...
    start "" /b powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0backend\server.ps1"
    timeout /t 2 /nobreak >nul
) else (
    echo Local service already active.
)

:: Launch browser in standalone app mode
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"

if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" --app="http://127.0.0.1:8765"
) else if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" --app="http://127.0.0.1:8765"
) else (
    start http://127.0.0.1:8765
)

exit
