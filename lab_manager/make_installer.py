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

echo [1/4] Copying files...
xcopy /Y /Q "%SOURCE_DIR%*" "!TARGET_DIR!\" >nul 2>&1

echo [2/4] Extracting components...
powershell -NoProfile -Command "Expand-Archive -Path '!TARGET_DIR!\runtime_libs.zip' -DestinationPath '!TARGET_DIR!' -Force; Remove-Item '!TARGET_DIR!\runtime_libs.zip' -Force -ErrorAction SilentlyContinue" >nul 2>&1

echo [3/5] Configuring Multi-Layer Windows Boot Auto-Start...
:: Layer 1: HKLM Machine-Wide Run Key (Launches before user desktop loads)
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "IIBS_Lab_Client" /t REG_SZ /d "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /f >nul 2>&1

:: Layer 2: Windows Task Scheduler (Launches with Highest Elevation on any user logon)
schtasks /create /tn "IIBS_Lab_Client_Boot" /tr "\"!TARGET_DIR!\IIBS_Lab_Client.exe\" client.py" /sc onlogon /rl highest /f >nul 2>&1

:: Layer 3: Common Startup & User Startup shortcuts
powershell -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $startup = [Environment]::GetFolderPath('CommonStartup'); if (-not (Test-Path $startup)) { $startup = [Environment]::GetFolderPath('Startup') }; $Shortcut = $WshShell.CreateShortcut($startup + '\\IIBS_Lab_Client.lnk'); $Shortcut.TargetPath = '!TARGET_DIR!\\IIBS_Lab_Client.exe'; $Shortcut.Arguments = 'client.py'; $Shortcut.WorkingDirectory = '!TARGET_DIR!'; $Shortcut.Save(); $d1 = [Environment]::GetFolderPath('CommonDesktopDirectory'); $d2 = [Environment]::GetFolderPath('Desktop'); foreach ($d in @($d1, $d2)) { if (Test-Path $d) { $sc = $WshShell.CreateShortcut($d + '\\IIBS Lab Client.lnk'); $sc.TargetPath = '!TARGET_DIR!\\IIBS_Lab_Client.exe'; $sc.Arguments = 'client.py'; $sc.WorkingDirectory = '!TARGET_DIR!'; $sc.IconLocation = '!TARGET_DIR!\\IIBS_Lab_Client.exe,0'; $sc.Save() } }" >nul 2>&1

echo [4/4] Hardening student environment...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoViewOnDrive" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer" /v "NoDrives" /t REG_DWORD /d 67108863 /f >nul 2>&1
reg add "HKCU\Software\Policies\Microsoft\Windows\System" /v "DisableCMD" /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR" /v "Start" /t REG_DWORD /d 4 /f >nul 2>&1

echo.
echo Launching IIBS Lab Client...
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
