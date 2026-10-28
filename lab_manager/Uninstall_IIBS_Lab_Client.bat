@echo off
:: Self-elevate to Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

title Complete IIBS Lab Client Removal
color 0A
echo ========================================================
echo       IIBS LAB CLIENT UNINSTALLER ^& RESTORATION
echo ========================================================
echo.

echo [1/6] Stopping IIBS Lab Client processes...
taskkill /F /IM IIBS_Lab_Client.exe >nul 2>&1

echo [2/6] Deleting Startup Scheduled Tasks...
schtasks /delete /tn "IIBS_Lab_Client_Boot" /f >nul 2>&1

echo [3/6] Removing Registry Run Auto-Start Keys...
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /f >nul 2>&1

echo [4/6] Restoring Drive Visibility ^& Command Prompt...
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKLM\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1

echo [5/6] Deleting shortcuts from Desktop and Startup...
del /F /Q "%PUBLIC%\Desktop\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "%USERPROFILE%\Desktop\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "%USERPROFILE%\OneDrive\Desktop\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "D:\OneDrive\Desktop\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\Startup\IIBS Lab Client.lnk" >nul 2>&1

echo [6/6] Removing Installed Files...
rmdir /s /q "%ProgramFiles%\IIBS_Lab_Client" >nul 2>&1
rmdir /s /q "%LocalAppData%\IIBS_Lab_Client" >nul 2>&1

echo.
echo Restarting Windows Explorer to apply changes...
taskkill /F /IM explorer.exe >nul 2>&1
start explorer.exe

echo.
echo ========================================================
echo  IIBS Lab Client successfully uninstalled and removed!
echo ========================================================
echo You may now close this window.
pause
