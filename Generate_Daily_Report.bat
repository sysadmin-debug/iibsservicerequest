@echo off
title Babu Raju Ram Fuel Station - Daily Attendance Audit & Report
cd /d "%~dp0"
echo =================================================================
echo   Babu Raju Ram Fuel Station - Biometric Audit & Report Engine
echo =================================================================
echo.
powershell.exe -ExecutionPolicy Bypass -File "%~dp0Daily_Attendance_Sync_And_Report.ps1"
echo.
echo =================================================================
echo Report files have been generated to your Desktop!
echo Press any key to close this window.
pause >nul