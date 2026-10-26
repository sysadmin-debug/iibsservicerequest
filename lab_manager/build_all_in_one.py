import os

zip_path = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\IIBS_Lab_Client_Setup.zip"
out_bat = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\Install_IIBS_Lab_Client_Complete.bat"

with open(zip_path, "rb") as f:
    zip_bytes = f.read()

header = """@echo off
setlocal enabledelayedexpansion
title IIBS Computer Lab - Client Automated 1-Click Installer
cls
echo ==========================================================
echo    IIBS COMPUTER LAB MANAGEMENT SYSTEM - AUTO INSTALLER
echo ==========================================================
echo.
echo  [+] Installing IIBS Lab Client Standalone System...
echo.

set "TARGET_DIR=%ProgramFiles%\\IIBS_Lab_Client"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" 2>nul
if not exist "%TARGET_DIR%" (
    set "TARGET_DIR=%LocalAppData%\\IIBS_Lab_Client"
    if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!" 2>nul
)

set "TEMP_ZIP=%TEMP%\\IIBS_Payload_%RANDOM%.zip"

powershell -NoProfile -Command "$bytes = [System.IO.File]::ReadAllBytes('%~f0'); $marker = [System.Text.Encoding]::ASCII.GetBytes('---PAYLOAD_START---`r`n'); $idx = -1; for ($i = 0; $i -le $bytes.Length - $marker.Length; $i++) { $match = $true; for ($j = 0; $j -lt $marker.Length; $j++) { if ($bytes[$i + $j] -ne $marker[$j]) { $match = $false; break } }; if ($match) { $idx = $i + $marker.Length; break } }; if ($idx -gt 0) { $payload = New-Object byte[] ($bytes.Length - $idx); [System.Array]::Copy($bytes, $idx, $payload, 0, $payload.Length); [System.IO.File]::WriteAllBytes('%TEMP_ZIP%', $payload); Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '!TARGET_DIR!' -Force; Remove-Item '%TEMP_ZIP%' -Force; } else { exit 1 }"

if not exist "!TARGET_DIR!\\IIBS_Lab_Client.exe" (
    echo [ERROR] Extraction failed. Please right-click this installer and select "Run as administrator".
    pause
    exit /b 1
)

echo  [+] Setting up Windows Boot Auto-Start...
powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $startup = [Environment]::GetFolderPath('CommonStartup'); if (-not (Test-Path $startup)) { $startup = [Environment]::GetFolderPath('Startup') }; $Shortcut = $WshShell.CreateShortcut($startup + '\\IIBS_Lab_Client.lnk'); $Shortcut.TargetPath = '!TARGET_DIR!\\IIBS_Lab_Client.exe'; $Shortcut.Arguments = 'client.py'; $Shortcut.WorkingDirectory = '!TARGET_DIR!'; $Shortcut.Save()" 2>nul

echo  [+] Applying Student Drive and System File Protection...
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\\Software\\Policies\\Microsoft\\Windows\\System" /v "DisableCMD" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR" /v "Start" /t REG_DWORD /d 4 /f >nul 2>&1

echo.
echo ==========================================================
echo  [SUCCESS] IIBS Lab Client Installation Complete!
echo  Client software will now launch and auto-protect this PC.
echo ==========================================================
start "" "!TARGET_DIR!\\IIBS_Lab_Client.exe" client.py
exit /b 0

---PAYLOAD_START---
"""

with open(out_bat, "wb") as f:
    f.write(header.encode("ascii"))
    f.write(zip_bytes)

print(f"Created all-in-one installer at: {out_bat} (Size: {os.path.getsize(out_bat)} bytes)")
