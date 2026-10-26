@echo off
:: Self-detecting launcher for IIBS Lab Client
set SCRIPT_DIR=%~dp0

:: Check if standalone executable exists (dist folder)
if exist "%SCRIPT_DIR%client\dist\IIBS_Lab_Client\IIBS_Lab_Client.exe" (
    cd /d "%SCRIPT_DIR%client\dist\IIBS_Lab_Client"
    start "" "IIBS_Lab_Client.exe"
    exit /b 0
)

:: Check if compiled executable is directly in client folder
if exist "%SCRIPT_DIR%client\IIBS_Lab_Client.exe" (
    cd /d "%SCRIPT_DIR%client"
    start "" "IIBS_Lab_Client.exe"
    exit /b 0
)

:: Fallback to python if installed
where python >nul 2>&1
if %errorlevel% equ 0 (
    cd /d "%SCRIPT_DIR%client"
    python client.py
    exit /b 0
)

echo ========================================================
echo [ERROR] Could not start IIBS Lab Client!
echo.
echo Neither IIBS_Lab_Client.exe nor Python was detected.
echo Please ensure the complete 'client' folder is present.
echo ========================================================
pause
