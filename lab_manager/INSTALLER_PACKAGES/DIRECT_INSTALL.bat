@echo off
setlocal enabledelayedexpansion
title Deploy IIBS Lab Client
cls
echo ==========================================================
echo    IIBS LAB CLIENT - DIRECT QUICK INSTALLER
echo ==========================================================
echo.

set "SOURCE_DIR=%~dp0IIBS_Lab_Client_Official"
set "TARGET_DIR=%ProgramFiles%\IIBS_Lab_Client"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" 2>nul
if not exist "%TARGET_DIR%" (
    set "TARGET_DIR=%LocalAppData%\IIBS_Lab_Client"
    if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!" 2>nul
)

echo [1/4] Stopping previous instances...
taskkill /f /im IIBS_Lab_Client.exe >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

echo [2/4] Copying files to !TARGET_DIR!...
xcopy /E /Y /I /Q "%SOURCE_DIR%\*" "!TARGET_DIR!\" >nul 2>&1

echo [3/4] Ensuring all Windows drives are completely UNLOCKED...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 3 /f >nul 2>&1

echo [4/4] Starting IIBS Lab Client...
cd /d "!TARGET_DIR!"
start "" "!TARGET_DIR!\IIBS_Lab_Client.exe" client.py

echo.
echo ==========================================================
echo Done! Client is running and all drives are UNLOCKED.
echo ==========================================================
timeout /t 3 >nul
exit /b 0
