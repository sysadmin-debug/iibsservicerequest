@echo off
title IIBS Lab - Emergency Unlock & Admin Restore
cls
echo ==========================================================
echo    IIBS LAB SYSTEM - INSTANT UNLOCK & RESTORE ADMIN
echo ==========================================================
echo.
echo Restoring full Windows permissions, all drives, CMD, Desktop, and Proxy...

:: 1. Terminate client process
taskkill /f /im IIBS_Lab_Client.exe >nul 2>&1

:: 2. Remove Explorer & System Drive/CMD/Run Restrictions from HKCU
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoCommonGroups" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoStartMenuMorePrograms" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoControlPanel" /f >nul 2>&1

reg delete "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\Explorer" /v "NoRun" /f >nul 2>&1

reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1

:: 3. Clear Internet Proxy
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v "AutoConfigURL" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings" /v "ProxyEnable" /t REG_DWORD /d 0 /f >nul 2>&1

:: 4. Restart Explorer to refresh drives and desktop
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 1 /nobreak >nul
start explorer.exe

echo.
echo ==========================================================
echo  [SUCCESS] All drives, CMD, Desktop, and Start Menu UNLOCKED!
echo ==========================================================
pause
