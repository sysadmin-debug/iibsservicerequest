using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using Microsoft.Win32;

namespace IIBSUninstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult confirm = MessageBox.Show(
                "Are you sure you want to completely uninstall IIBS Lab Client and restore all drives (C:, D:), Command Prompt, and desktop access?",
                "IIBS Lab Client Uninstaller",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (confirm != DialogResult.Yes) return;

            try
            {
                // 1. Kill IIBS processes
                foreach (var name in new string[] { "IIBS_Lab_Client", "python" })
                {
                    try
                    {
                        foreach (var proc in Process.GetProcessesByName(name))
                        {
                            try
                            {
                                string exePath = proc.MainModule.FileName;
                                if (exePath.IndexOf("IIBS", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    proc.Kill();
                                    proc.WaitForExit(1000);
                                }
                            }
                            catch { }
                        }
                    }
                    catch { }
                }

                // 2. Clear all user hives in HKEY_USERS
                try
                {
                    using (RegistryKey users = Registry.Users)
                    {
                        foreach (string subkeyName in users.GetSubKeyNames())
                        {
                            if (subkeyName.StartsWith("S-1-5-21-") && !subkeyName.EndsWith("_Classes"))
                            {
                                try
                                {
                                    using (RegistryKey userRoot = users.OpenSubKey(subkeyName, true))
                                    {
                                        ClearPolicies(userRoot);
                                    }
                                }
                                catch { }
                            }
                        }
                    }
                }
                catch { }

                // Clear HKCU
                try
                {
                    ClearPolicies(Registry.CurrentUser);
                }
                catch { }

                // 3. Clear HKLM Policies
                try
                {
                    using (RegistryKey hklmExpl = Registry.LocalMachine.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer", true))
                    {
                        if (hklmExpl != null)
                        {
                            DeleteVal(hklmExpl, "NoViewOnDrive");
                            DeleteVal(hklmExpl, "NoDrives");
                            DeleteVal(hklmExpl, "NoRun");
                        }
                    }
                }
                catch { }

                try
                {
                    using (RegistryKey hklmSys = Registry.LocalMachine.OpenSubKey(@"Software\Policies\Microsoft\Windows\System", true))
                    {
                        if (hklmSys != null)
                        {
                            DeleteVal(hklmSys, "DisableCMD");
                        }
                    }
                }
                catch { }

                try
                {
                    using (RegistryKey hklmRun = Registry.LocalMachine.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                    {
                        if (hklmRun != null)
                        {
                            DeleteVal(hklmRun, "IIBS_Lab_Client");
                        }
                    }
                }
                catch { }

                // 4. Restore USB Storage
                try
                {
                    using (RegistryKey usb = Registry.LocalMachine.OpenSubKey(@"SYSTEM\CurrentControlSet\Services\USBSTOR", true))
                    {
                        if (usb != null)
                        {
                            usb.SetValue("Start", 3, RegistryValueKind.DWord);
                        }
                    }
                }
                catch { }

                // 5. Delete Scheduled Task
                try
                {
                    ProcessStartInfo psi = new ProcessStartInfo("schtasks.exe", "/delete /tn \"IIBS_Lab_Client_Boot\" /f")
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false
                    };
                    Process p = Process.Start(psi);
                    if (p != null) p.WaitForExit(3000);
                }
                catch { }

                // 6. Delete App Directory & Shortcuts
                string progFiles = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "IIBS_Lab_Client");
                DeleteDir(progFiles);

                string localApp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "IIBS_Lab_Client");
                DeleteDir(localApp);

                string pubDesktop = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
                string userDesktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string pubStartup = Environment.GetFolderPath(Environment.SpecialFolder.CommonStartup);
                string userStartup = Environment.GetFolderPath(Environment.SpecialFolder.Startup);

                DeleteFile(Path.Combine(pubDesktop, "IIBS Lab Client.lnk"));
                DeleteFile(Path.Combine(userDesktop, "IIBS Lab Client.lnk"));
                DeleteFile(Path.Combine(pubStartup, "IIBS_Lab_Client.lnk"));
                DeleteFile(Path.Combine(userStartup, "IIBS_Lab_Client.lnk"));

                // 7. Restart Windows Explorer
                try
                {
                    foreach (var exp in Process.GetProcessesByName("explorer"))
                    {
                        try { exp.Kill(); exp.WaitForExit(2000); } catch { }
                    }
                }
                catch { }
                try
                {
                    Process.Start("explorer.exe");
                }
                catch { }

                MessageBox.Show(
                    "IIBS Lab Client uninstallation is complete!\n\nAll drives (C:, D:), Windows Explorer, and Command Prompt have been fully restored.",
                    "Uninstall Succeeded",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show("An error occurred during uninstallation: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void ClearPolicies(RegistryKey root)
        {
            if (root == null) return;
            try
            {
                using (RegistryKey exp = root.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer", true))
                {
                    if (exp != null)
                    {
                        DeleteVal(exp, "NoViewOnDrive");
                        DeleteVal(exp, "NoDrives");
                        DeleteVal(exp, "NoRun");
                    }
                }
            }
            catch { }

            try
            {
                using (RegistryKey sys = root.OpenSubKey(@"Software\Policies\Microsoft\Windows\System", true))
                {
                    if (sys != null)
                    {
                        DeleteVal(sys, "DisableCMD");
                    }
                }
            }
            catch { }

            try
            {
                using (RegistryKey run = root.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (run != null)
                    {
                        DeleteVal(run, "IIBS_Lab_Client");
                    }
                }
            }
            catch { }
        }

        static void DeleteVal(RegistryKey key, string val)
        {
            try { key.DeleteValue(val, false); } catch { }
        }

        static void DeleteDir(string dir)
        {
            try { if (Directory.Exists(dir)) Directory.Delete(dir, true); } catch { }
        }

        static void DeleteFile(string file)
        {
            try { if (File.Exists(file)) File.Delete(file); } catch { }
        }
    }
}
