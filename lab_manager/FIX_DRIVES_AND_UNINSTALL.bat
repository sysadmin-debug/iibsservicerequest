@echo off
:: Revert Student Hardening & Drive/File Lockdown Script
echo Restoring full access to drives and system files...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator Privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo [1/4] Restoring drive visibility in This PC...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1

echo [2/4] Restoring Run dialog (Win + R)...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1

echo [3/4] Restoring Command Prompt (CMD)...
reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1
reg delete "HKLM\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1

echo [4/4] Restoring USB external storage access...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 3 /f >nul 2>&1

echo [5/5] Removing IIBS Boot Scheduled Task and App Files...
schtasks /delete /tn "IIBS_Lab_Client_Boot" /f >nul 2>&1
rmdir /s /q "%ProgramFiles%\IIBS_Lab_Client" >nul 2>&1
rmdir /s /q "%LocalAppData%\IIBS_Lab_Client" >nul 2>&1
del /F /Q "%PUBLIC%\Desktop\IIBS Lab Client.lnk" >nul 2>&1
del /F /Q "%USERPROFILE%\Desktop\IIBS Lab Client.lnk" >nul 2>&1

echo Restarting Windows Explorer...
taskkill /F /IM explorer.exe >nul 2>&1
start explorer.exe

echo.
echo ==========================================================
echo  SUCCESS! All drives (C:, D:) and CMD are now unlocked!
echo ==========================================================
echo You can close this window now.
pause
