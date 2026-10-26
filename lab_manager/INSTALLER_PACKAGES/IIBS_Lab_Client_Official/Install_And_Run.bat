@echo off
:: Self-installing batch launcher for official signed IIBS Lab Client
cd /d "%~dp0"

:: 1. Add auto-start shortcut on boot
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([Environment]::GetFolderPath('CommonStartup') + '\IIBS_Lab_Client.lnk'); $Shortcut.TargetPath = '%~dp0IIBS_Lab_Client.exe'; $Shortcut.Arguments = 'client.py'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Save()" >nul 2>&1

:: 2. Launch client immediately
start "" "%~dp0IIBS_Lab_Client.exe" client.py
exit /b 0
