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

# Read setup_autorun.bat from source_dir
with open(os.path.join(source_dir, "setup_autorun.bat"), "r") as f:
    bat_content = f.read()

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
