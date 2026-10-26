@echo off
:: IIBS Computer Lab - Student Hardening & Drive/File Lockdown Script
:: Run this script once on student PCs as Administrator

echo ==========================================================
echo    IIBS LAB CLIENT - STORAGE & FILE ACCESS LOCKDOWN
echo ==========================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please right-click this script and "Run as administrator"!
    pause
    exit /b 1
)

echo [1/4] Blocking access to This PC / My Computer Drives (C:, D:, etc.)...
:: 67108863 (0x3FFFFFF) restricts all 26 drive letters from A: to Z:
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f

echo [2/4] Disabling Windows Run dialog (Win + R)...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /t REG_DWORD /d 1 /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /t REG_DWORD /d 1 /f

echo [3/4] Disabling Command Prompt (CMD) & PowerShell for students...
reg add "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /t REG_DWORD /d 1 /f

echo [4/4] Blocking USB Pendrives / External Storage Devices...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 4 /f

echo ==========================================================
echo Lockdown applied successfully!
echo Students can no longer open This PC, view drives, or access system files.
echo ==========================================================
pause
