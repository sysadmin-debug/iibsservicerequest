import os
import subprocess
import shutil

source_dir = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\IIBS_Lab_Client_Official"
temp_dir = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\temp_iexpress"
target_exe = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\IIBS_Lab_Client_Setup.exe"
sed_path = r"D:\Antigravity\IIBS\lab_manager\INSTALLER_PACKAGES\installer.sed"

if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir, ignore_errors=True)
os.makedirs(temp_dir, exist_ok=True)

# Copy all top-level files to temp_dir
files = []
for entry in os.listdir(source_dir):
    full_path = os.path.join(source_dir, entry)
    if os.path.isfile(full_path):
        dest = os.path.join(temp_dir, entry)
        shutil.copy2(full_path, dest)
        files.append(entry)

# Note: Subdirectories (tcl, tkinter) need to be packaged as zip
zip_sub = os.path.join(temp_dir, "runtime_libs.zip")
import zipfile
with zipfile.ZipFile(zip_sub, 'w', zipfile.ZIP_DEFLATED) as z:
    for sub in ['tcl', 'tkinter']:
        sub_path = os.path.join(source_dir, sub)
        if os.path.exists(sub_path):
            for root, dirs, f_list in os.walk(sub_path):
                for f in f_list:
                    abs_f = os.path.join(root, f)
                    rel_f = os.path.relpath(abs_f, source_dir)
                    z.write(abs_f, rel_f)
files.append("runtime_libs.zip")

# Update setup_autorun.bat to extract runtime_libs.zip
bat_content = r'''@echo off
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

echo [1/4] Copying files to !TARGET_DIR!...
xcopy /Y /Q "%SOURCE_DIR%*" "!TARGET_DIR!\" >nul 2>&1

echo [2/4] Extracting components...
if exist "!TARGET_DIR!\runtime_libs.zip" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '!TARGET_DIR!\runtime_libs.zip' -DestinationPath '!TARGET_DIR!' -Force; Remove-Item '!TARGET_DIR!\runtime_libs.zip' -Force -ErrorAction SilentlyContinue" >nul 2>&1
)

echo [3/4] Configuring Windows Auto-Start and Desktop Shortcuts...
:: Layer 1: Run Keys
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1

:: Layer 2: Scheduled Task
schtasks /create /tn "IIBS_Lab_Client_Boot" /tr "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /sc onlogon /rl highest /f >nul 2>&1

:: Layer 3: Desktop and Startup Shortcuts across all Desktop directories (including OneDrive/Public)
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
echo.
echo ' Also check OneDrive desktop if redirected
echo userProfile = WshShell.ExpandEnvironmentStrings^("%%USERPROFILE%%"^)
echo CreateLnk userProfile ^& "\Desktop", exePath, args, workDir
echo oneDrive = WshShell.ExpandEnvironmentStrings^("%%OneDrive%%"^)
echo If oneDrive ^<^> "" Then CreateLnk oneDrive ^& "\Desktop", exePath, args, workDir
) > "!VBS_HELPER!"

cscript //nologo "!VBS_HELPER!" >nul 2>&1
del /f /q "!VBS_HELPER!" >nul 2>&1

echo [4/4] Hardening student environment...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 4 /f >nul 2>&1

echo.
echo Launching IIBS Lab Client...
cd /d "!TARGET_DIR!"
start "" "!TARGET_DIR!\IIBS_Lab_Client.exe" client.py
exit /b 0
'''

with open(os.path.join(temp_dir, "setup_autorun.bat"), "w") as f:
    f.write(bat_content)

# Build SED file
source_files_section = "\n".join([f"%FILE{i}%=" for i, f in enumerate(files)])
strings_files_section = "\n".join([f'FILE{i}="{f}"' for i, f in enumerate(files)])

sed_content = f'''[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=%InstallPrompt%
DisplayLicense=%DisplayLicense%
FinishMessage=%FinishMessage%
TargetName=%TargetName%
FriendlyName=%FriendlyName%
AppLaunched=%AppLaunched%
PostInstallCmd=%PostInstallCmd%
AdminQuietInstCmd=%AdminQuietInstCmd%
UserQuietInstCmd=%UserQuietInstCmd%
SourceFiles=SourceFiles
[Strings]
InstallPrompt=
DisplayLicense=
FinishMessage=
TargetName={target_exe}
FriendlyName=IIBS Lab Client Installer
AppLaunched=cmd.exe /c setup_autorun.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
{strings_files_section}
[SourceFiles]
SourceFiles0={temp_dir}\\
[SourceFiles0]
{source_files_section}
'''

with open(sed_path, "w") as f:
    f.write(sed_content)

print(f"Generated SED configuration with {len(files)} files.")
print("Running IExpress to build official EXE...")
ret = subprocess.run(["iexpress", "/N", "/Q", sed_path], capture_output=True)
print("IExpress return code:", ret.returncode)

if os.path.exists(target_exe):
    print(f"SUCCESS! Built standalone setup executable: {target_exe} (Size: {os.path.getsize(target_exe)} bytes)")
else:
    print("Failed to build with IExpress. Check SED configuration.")
