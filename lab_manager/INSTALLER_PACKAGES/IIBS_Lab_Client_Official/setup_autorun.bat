@echo off
setlocal enabledelayedexpansion
title IIBS Lab Client Installer Setup
cls
echo ==========================================================
echo    IIBS COMPUTER LAB MANAGEMENT SYSTEM - AUTO INSTALLER
echo ==========================================================
echo.
echo Installing client to this computer...

set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%ProgramFiles%\IIBS_Lab_Client"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" 2>nul
if not exist "%TARGET_DIR%" (
    set "TARGET_DIR=%LocalAppData%\IIBS_Lab_Client"
    if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!" 2>nul
)

echo [1/4] Copying application files...
xcopy /E /Y /I /Q "%SOURCE_DIR%*" "!TARGET_DIR!\" >nul 2>&1

echo [2/4] Configuring Multi-Layer Windows Boot Auto-Start...
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1
schtasks /create /tn "IIBS_Lab_Client_Boot" /tr "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /sc onlogon /rl highest /f >nul 2>&1
powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $startup = [Environment]::GetFolderPath('CommonStartup'); if (-not (Test-Path $startup)) { $startup = [Environment]::GetFolderPath('Startup') }; $Shortcut = $WshShell.CreateShortcut($startup + '\\IIBS_Lab_Client.lnk'); $Shortcut.TargetPath = '!TARGET_DIR!\\IIBS_Lab_Client.exe'; $Shortcut.Arguments = 'client.py'; $Shortcut.WorkingDirectory = '!TARGET_DIR!'; $Shortcut.Save(); $d1 = [Environment]::GetFolderPath('CommonDesktopDirectory'); $d2 = [Environment]::GetFolderPath('Desktop'); foreach ($d in @($d1, $d2)) { if (Test-Path $d) { $sc = $WshShell.CreateShortcut($d + '\\IIBS Lab Client.lnk'); $sc.TargetPath = '!TARGET_DIR!\\IIBS_Lab_Client.exe'; $sc.Arguments = 'client.py'; $sc.WorkingDirectory = '!TARGET_DIR!'; $sc.IconLocation = '!TARGET_DIR!\\IIBS_Lab_Client.exe,0'; $sc.Save() } }" >nul 2>&1

echo [3/4] Locking drives and system files for students...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 4 /f >nul 2>&1

echo [4/4] Launching IIBS Lab Client...
start "" "!TARGET_DIR!\IIBS_Lab_Client.exe" client.py
exit /b 0
