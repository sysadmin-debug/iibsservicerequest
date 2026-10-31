@echo off
setlocal enabledelayedexpansion
title IIBS Lab Client Installer Setup
cls
echo ==========================================================
echo    IIBS COMPUTER LAB MANAGEMENT SYSTEM - CLIENT SETUP
echo ==========================================================
echo.
echo Installing lightweight Lab Client (2-Way File Share + Exam Mode)...

set "SOURCE_DIR=%~dp0"
set "TARGET_DIR=%ProgramFiles%\IIBS_Lab_Client"

if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%" 2>nul
if not exist "%TARGET_DIR%" (
    set "TARGET_DIR=%LocalAppData%\IIBS_Lab_Client"
    if not exist "!TARGET_DIR!" mkdir "!TARGET_DIR!" 2>nul
)

echo [1/5] Terminating any existing client processes...
taskkill /f /im IIBS_Lab_Client.exe >nul 2>&1
timeout /t 1 /nobreak >nul 2>&1

echo [2/5] Copying application files...
xcopy /Y /Q "%SOURCE_DIR%*" "!TARGET_DIR!\" >nul 2>&1

echo [3/5] Extracting components...
if exist "!TARGET_DIR!\runtime_libs.zip" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '!TARGET_DIR!\runtime_libs.zip' -DestinationPath '!TARGET_DIR!' -Force; Remove-Item '!TARGET_DIR!\runtime_libs.zip' -Force -ErrorAction SilentlyContinue" >nul 2>&1
)

echo [4/5] Completely UNLOCKING all drives, CMD, and USB in Windows Registry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1
reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoRun" /f >nul 2>&1
reg delete "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 3 /f >nul 2>&1

echo [5/5] Configuring Windows Startup and Desktop Shortcuts...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1

set "VBS_HELPER=!TARGET_DIR!\make_shortcuts.vbs"
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo Set fso = CreateObject^("Scripting.FileSystemObject"^)
echo.
echo Function CreateLnk^(destDir, target, args, workDir^)
echo     If destDir ^<^> "" And fso.FolderExists^(destDir^) Then
echo         On Error Resume Next
echo         Set sc = WshShell.CreateShortcut^(destDir ^& "\IIBS Lab Client.lnk"^)
echo         sc.TargetPath = target
echo         sc.Arguments = args
echo         sc.WorkingDirectory = workDir
echo         sc.Save
echo     End If
echo End Function
echo.
echo exePath = "!TARGET_DIR!\IIBS_Lab_Client.exe"
echo workDir = "!TARGET_DIR!"
echo args = "client.py"
echo.
echo CreateLnk WshShell.SpecialFolders^("Desktop"^), exePath, args, workDir
echo CreateLnk WshShell.SpecialFolders^("AllUsersDesktop"^), exePath, args, workDir
echo CreateLnk WshShell.SpecialFolders^("Startup"^), exePath, args, workDir
echo CreateLnk WshShell.SpecialFolders^("AllUsersStartup"^), exePath, args, workDir
echo userProfile = WshShell.ExpandEnvironmentStrings^("%%USERPROFILE%%"^)
echo CreateLnk userProfile ^& "\Desktop", exePath, args, workDir
echo oneDrive = WshShell.ExpandEnvironmentStrings^("%%OneDrive%%"^)
echo If oneDrive ^<^> "" Then CreateLnk oneDrive ^& "\Desktop", exePath, args, workDir
) > "!VBS_HELPER!"
cscript //nologo "!VBS_HELPER!" >nul 2>&1
del /f /q "!VBS_HELPER!" >nul 2>&1

echo.
echo Launching IIBS Lab Client...
cd /d "!TARGET_DIR!"
start "" "!TARGET_DIR!\IIBS_Lab_Client.exe" client.py
exit /b 0
