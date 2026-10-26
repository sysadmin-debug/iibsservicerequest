@echo off
:: Batch script to whitelist IIBS Lab Client in Windows Defender
echo ==========================================================
echo    IIBS LAB CLIENT - DEFENDER WHITELIST INSTALLER
echo ==========================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please right-click this file and choose "Run as administrator"!
    pause
    exit /b 1
)

echo Adding Windows Defender Exclusion for IIBS_Lab_Client.exe...

:: Add process exclusion
powershell -Command "Add-MpPreference -ExclusionProcess 'IIBS_Lab_Client.exe'" >nul 2>&1

:: Add folder exclusion for common installation paths
powershell -Command "Add-MpPreference -ExclusionPath 'C:\IIBS_Lab_Client'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath 'C:\Program Files\IIBS_Lab_Client'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%~dp0'" >nul 2>&1

echo ==========================================================
echo SUCCESS: IIBS_Lab_Client has been whitelisted!
echo Windows Defender will no longer block or quarantine it.
echo ==========================================================
pause
