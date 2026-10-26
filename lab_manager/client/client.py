import os
import sys
import time
import socket
import json
import threading
import ctypes
import urllib.request
import urllib.parse
import urllib.error
import subprocess
import platform
import uuid
import winreg
import tkinter as tk
from tkinter import ttk, messagebox

# ----------------- CONFIGURATION ----------------- #
# Check config next to exe or py file
EXE_DIR = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(EXE_DIR, "client_config.json")

PRIMARY_SERVER = "http://192.168.14.250:5000"
FALLBACK_SERVER = "http://192.168.6.189:5000"

def test_reachability(url):
    try:
        req = urllib.request.Request(f"{url}/api/exam_status")
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            return resp.status == 200
    except Exception:
        return False

def determine_server_url():
    # 1. Custom config if present
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                data = json.load(f)
                custom = data.get("server_url")
                if custom and test_reachability(custom):
                    return custom
                elif custom:
                    return custom
        except Exception:
            pass

    # 2. Auto-detect Wi-Fi server (192.168.14.250)
    if test_reachability(PRIMARY_SERVER):
        return PRIMARY_SERVER

    # 3. Auto-detect Ethernet server (192.168.6.189)
    if test_reachability(FALLBACK_SERVER):
        return FALLBACK_SERVER

    # 4. Default to Wi-Fi server
    return PRIMARY_SERVER

SERVER_URL = determine_server_url()
HOSTNAME = socket.gethostname()

def get_server_host():
    try:
        parsed = urllib.parse.urlparse(SERVER_URL)
        return parsed.hostname or "127.0.0.1"
    except Exception:
        return "127.0.0.1"

SERVER_HOST_IP = get_server_host()

# Destination folder for broadcast files
DESKTOP_PATH = os.path.join(os.path.expanduser("~"), "Desktop", "Lab_Shared_Files")
os.makedirs(DESKTOP_PATH, exist_ok=True)

# ----------------- HARDWARE TELEMETRY ----------------- #
class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ('dwLength', ctypes.c_ulong),
        ('dwMemoryLoad', ctypes.c_ulong),
        ('ullTotalPhys', ctypes.c_ulonglong),
        ('ullAvailPhys', ctypes.c_ulonglong),
        ('ullTotalPageFile', ctypes.c_ulonglong),
        ('ullAvailPageFile', ctypes.c_ulonglong),
        ('ullTotalVirtual', ctypes.c_ulonglong),
        ('ullAvailVirtual', ctypes.c_ulonglong),
        ('sullAvailExtendedVirtual', ctypes.c_ulonglong)
    ]

def get_hardware_specs():
    # 1. CPU Name
    cpu_name = platform.processor() or "Unknown CPU"
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        cpu_name = winreg.QueryValueEx(key, "ProcessorNameString")[0].strip()
    except Exception:
        pass

    # 2. Total RAM GB
    ram_gb = 0.0
    try:
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            ram_gb = round(stat.ullTotalPhys / (1024 ** 3), 1)
    except Exception:
        pass

    # 3. Disk Free GB
    disk_free_gb = 0.0
    try:
        free_bytes = ctypes.c_ulonglong()
        if ctypes.windll.kernel32.GetDiskFreeSpaceExW(ctypes.c_wchar_p("C:\\"), None, None, ctypes.byref(free_bytes)):
            disk_free_gb = round(free_bytes.value / (1024 ** 3), 1)
    except Exception:
        pass

    # 4. MAC Address
    mac_str = ""
    try:
        node = uuid.getnode()
        mac_str = ':'.join(['{:02x}'.format((node >> el) & 0xff) for el in range(0, 12, 2)][::-1])
    except Exception:
        pass

    # 5. OS
    os_name = f"{platform.system()} {platform.release()}"

    return {
        "pc_name": HOSTNAME,
        "cpu_info": cpu_name,
        "ram_gb": ram_gb,
        "disk_free_gb": disk_free_gb,
        "mac_address": mac_str,
        "os_version": os_name
    }

# ----------------- WINDOWS IDLE DETECTION ----------------- #
class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

def get_idle_seconds():
    try:
        lii = LASTINPUTINFO()
        lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
        if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
            millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
            return millis / 1000.0
    except Exception:
        pass
    return 0

# ----------------- INTERNET BLOCKING / UNBLOCKING ----------------- #
def is_master_server_host():
    try:
        if SERVER_HOST_IP in ["127.0.0.1", "localhost"]:
            return True
        my_ips = socket.gethostbyname_ex(HOSTNAME)[2]
        if SERVER_HOST_IP in my_ips:
            return True
    except Exception:
        pass
    return False

def set_internet_blocked(block=True):
    if is_master_server_host():
        return
    try:
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_HTTP"], capture_output=True)
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_HTTPS"], capture_output=True)
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_DNS"], capture_output=True)

        if block:
            subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                "name=IIBS_BLOCK_HTTP", "dir=out", "action=block", "protocol=TCP", "remoteport=80"
            ], capture_output=True)
            subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                "name=IIBS_BLOCK_HTTPS", "dir=out", "action=block", "protocol=TCP", "remoteport=443"
            ], capture_output=True)
            subprocess.run([
                "netsh", "advfirewall", "firewall", "add", "rule",
                "name=IIBS_BLOCK_DNS", "dir=out", "action=block", "protocol=UDP", "remoteport=53"
            ], capture_output=True)
    except Exception as e:
        print(f"[FIREWALL ERROR] {e}")

# ----------------- LAB CLIENT APPLICATION ----------------- #
class LabClientApp:
    def __init__(self, root):
        self.root = root
        self.root.title("IIBS Computer Lab Management System")
        self.root.configure(bg="#0b1120")

        self.current_session_id = None
        self.current_user = None
        self.current_fullname = None
        self.current_roll = None
        self.is_logged_in = False
        self.exam_mode_active = False
        self.running = True
        self.downloaded_files = set()

        # Report System Specs to Server
        self.register_system_telemetry()

        # Start background polling thread
        self.worker_thread = threading.Thread(target=self.background_worker, daemon=True)
        self.worker_thread.start()

        # Keyboard Shortcut: Ctrl + Alt + Q to open Admin Exit
        self.root.bind("<Control-Alt-q>", lambda e: self.admin_exit_prompt())
        self.root.bind("<Control-Alt-Q>", lambda e: self.admin_exit_prompt())

        # Build Kiosk UI
        self.lock_system()

    def admin_exit_prompt(self):
        import tkinter.simpledialog as sd
        pwd = sd.askstring("Administrator Bypass", "Enter Admin Password to close client software:", show="*", parent=self.root)
        if pwd in ["admin123", "admin@123", "iibsadmin"]:
            self.running = False
            self.root.destroy()
            sys.exit(0)
        elif pwd is not None:
            messagebox.showerror("Access Denied", "Incorrect Admin Password!", parent=self.root)

    def register_system_telemetry(self):
        def _send():
            specs = get_hardware_specs()
            try:
                payload = json.dumps(specs).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/system_register", data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=5)
            except Exception as e:
                print(f"[REGISTER ERROR] Cannot reach master server: {e}")
        threading.Thread(target=_send, daemon=True).start()

    def send_remote_log(self, event_type, details):
        def _send():
            try:
                payload = json.dumps({
                    "event_type": event_type,
                    "username": self.current_user,
                    "pc_name": HOSTNAME,
                    "details": details
                }).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/log_event", data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=4)
            except Exception:
                pass
        threading.Thread(target=_send, daemon=True).start()

    def lock_system(self):
        self.root.attributes("-fullscreen", True)
        self.root.attributes("-topmost", True)
        self.root.protocol("WM_DELETE_WINDOW", lambda: None)
        self.build_kiosk_ui()

    def build_kiosk_ui(self):
        for widget in self.root.winfo_children():
            widget.destroy()

        # Top-right Admin Exit button (Emergency Admin Bypass)
        admin_bar = tk.Frame(self.root, bg="#0b1120")
        admin_bar.pack(fill=tk.X, padx=15, pady=10)
        
        btn_exit = tk.Button(
            admin_bar,
            text="Admin Exit (Close)",
            font=("Segoe UI", 9),
            bg="#1e293b",
            fg="#94a3b8",
            activebackground="#ef4444",
            activeforeground="#ffffff",
            bd=0,
            padx=10,
            pady=4,
            cursor="hand2",
            command=self.admin_exit_prompt
        )
        btn_exit.pack(side=tk.RIGHT)

        self.main_frame = tk.Frame(self.root, bg="#0b1120")
        self.main_frame.place(relx=0.5, rely=0.5, anchor=tk.CENTER)

        title = tk.Label(self.main_frame, text="IIBS COMPUTER LAB", font=("Segoe UI", 26, "bold"), fg="#38bdf8", bg="#0b1120")
        title.pack(pady=(0, 5))

        subtitle = tk.Label(self.main_frame, text="Authorized Student Access & Session Management", font=("Segoe UI", 12), fg="#94a3b8", bg="#0b1120")
        subtitle.pack(pady=(0, 20))

        # Notebook Tabs
        self.notebook = ttk.Notebook(self.main_frame)
        self.notebook.pack(pady=10, fill=tk.BOTH, expand=True)

        # TAB 1: LOGIN (Student / Faculty / Admin)
        login_tab = tk.Frame(self.notebook, bg="#1e293b", padx=30, pady=25)
        self.notebook.add(login_tab, text=" User Login ")

        # Account Type radio selector
        role_frame = tk.Frame(login_tab, bg="#1e293b")
        role_frame.pack(fill=tk.X, pady=(0, 10))
        tk.Label(role_frame, text="Login As:", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#94a3b8").pack(side=tk.LEFT, padx=(0, 10))
        
        self.login_role = tk.StringVar(value="student")
        tk.Radiobutton(role_frame, text="Student", variable=self.login_role, value="student", bg="#1e293b", fg="#38bdf8", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=5)
        tk.Radiobutton(role_frame, text="Faculty", variable=self.login_role, value="faculty", bg="#1e293b", fg="#4ade80", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=5)
        tk.Radiobutton(role_frame, text="Admin", variable=self.login_role, value="admin", bg="#1e293b", fg="#fbbf24", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=5)

        tk.Label(login_tab, text="User ID / Username", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(5, 3))
        self.login_user = tk.Entry(login_tab, font=("Segoe UI", 12), bd=1, relief=tk.SOLID, bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.login_user.pack(fill=tk.X, pady=(0, 15), ipady=5)

        tk.Label(login_tab, text="Password", font=("Segoe UI", 11, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(5, 3))
        self.login_pass = tk.Entry(login_tab, font=("Segoe UI", 12), bd=1, relief=tk.SOLID, show="*", bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.login_pass.pack(fill=tk.X, pady=(0, 15), ipady=5)

        btn_login = tk.Button(login_tab, text="LOGIN & UNLOCK PC", font=("Segoe UI", 12, "bold"), bg="#0284c7", fg="#ffffff", bd=0, cursor="hand2", command=self.handle_login)
        btn_login.pack(fill=tk.X, ipady=8, pady=(10, 8))

        # Notice for password change
        notice_lbl = tk.Label(login_tab, text="* Admin: admin / admin123  |  Faculty: faculty / faculty123\n* Students: Self-register in tab 2. Password resets done by Admin.", font=("Segoe UI", 8, "italic"), bg="#1e293b", fg="#94a3b8")
        notice_lbl.pack(pady=(0, 5))

        self.login_status = tk.Label(login_tab, text="", font=("Segoe UI", 10), bg="#1e293b", fg="#ef4444")
        self.login_status.pack(pady=5)

        # TAB 2: REGISTER
        reg_tab = tk.Frame(self.notebook, bg="#1e293b", padx=30, pady=15)
        self.notebook.add(reg_tab, text=" New Student Registration ")

        tk.Label(reg_tab, text="Roll Number", font=("Segoe UI", 10, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(5, 2))
        self.reg_roll = tk.Entry(reg_tab, font=("Segoe UI", 11), bd=1, relief=tk.SOLID, bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.reg_roll.pack(fill=tk.X, pady=(0, 8), ipady=3)

        tk.Label(reg_tab, text="Full Name", font=("Segoe UI", 10, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(3, 2))
        self.reg_name = tk.Entry(reg_tab, font=("Segoe UI", 11), bd=1, relief=tk.SOLID, bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.reg_name.pack(fill=tk.X, pady=(0, 8), ipady=3)

        tk.Label(reg_tab, text="Choose User ID", font=("Segoe UI", 10, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(3, 2))
        self.reg_user = tk.Entry(reg_tab, font=("Segoe UI", 11), bd=1, relief=tk.SOLID, bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.reg_user.pack(fill=tk.X, pady=(0, 8), ipady=3)

        tk.Label(reg_tab, text="Set Password", font=("Segoe UI", 10, "bold"), bg="#1e293b", fg="#e2e8f0").pack(anchor=tk.W, pady=(3, 2))
        self.reg_pass = tk.Entry(reg_tab, font=("Segoe UI", 11), bd=1, relief=tk.SOLID, show="*", bg="#0f172a", fg="#ffffff", insertbackground="#ffffff")
        self.reg_pass.pack(fill=tk.X, pady=(0, 12), ipady=3)

        btn_reg = tk.Button(reg_tab, text="CREATE ACCOUNT", font=("Segoe UI", 11, "bold"), bg="#16a34a", fg="#ffffff", bd=0, cursor="hand2", command=self.handle_register)
        btn_reg.pack(fill=tk.X, ipady=6)

        self.reg_status = tk.Label(reg_tab, text="", font=("Segoe UI", 10), bg="#1e293b", fg="#ef4444")
        self.reg_status.pack(pady=3)

        footer = tk.Label(self.main_frame, text=f"Host: {HOSTNAME} | Server: {SERVER_URL}", font=("Segoe UI", 9), fg="#64748b", bg="#0b1120")
        footer.pack(side=tk.BOTTOM, pady=15)

    def handle_register(self):
        roll = self.reg_roll.get().strip()
        name = self.reg_name.get().strip()
        user = self.reg_user.get().strip()
        pwd = self.reg_pass.get().strip()

        if not roll or not name or not user or not pwd:
            self.reg_status.config(text="Please fill in all details", fg="#ef4444")
            return

        payload = json.dumps({"roll_no": roll, "full_name": name, "username": user, "password": pwd}).encode('utf-8')
        try:
            req = urllib.request.Request(f"{SERVER_URL}/api/register", data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode())
                if res_data.get("success"):
                    messagebox.showinfo("Success", "Account created successfully! You can now log in with your User ID.")
                    self.reg_roll.delete(0, tk.END)
                    self.reg_name.delete(0, tk.END)
                    self.reg_user.delete(0, tk.END)
                    self.reg_pass.delete(0, tk.END)
                    self.notebook.select(0)
                else:
                    self.reg_status.config(text=res_data.get("message", "Registration failed"), fg="#ef4444")
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode()).get("message", "Error")
            except:
                err = "Roll number or User ID already taken"
            self.reg_status.config(text=err, fg="#ef4444")
        except Exception:
            self.reg_status.config(text="Cannot reach Master Server. Verify LAN cable or IP.", fg="#ef4444")

    def handle_login(self):
        user = self.login_user.get().strip()
        pwd = self.login_pass.get().strip()

        if not user or not pwd:
            self.login_status.config(text="Enter User ID and Password", fg="#ef4444")
            return

        payload = json.dumps({"username": user, "password": pwd, "pc_name": HOSTNAME}).encode('utf-8')
        try:
            req = urllib.request.Request(f"{SERVER_URL}/api/login", data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as response:
                res = json.loads(response.read().decode())
                if res.get("success"):
                    self.current_session_id = res.get("session_id")
                    self.current_user = user
                    self.current_fullname = res.get("full_name")
                    self.current_roll = res.get("roll_no")
                    self.is_logged_in = True
                    self.unlock_system()
                else:
                    self.login_status.config(text=res.get("message", "Invalid login"), fg="#ef4444")
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode()).get("message", "Invalid User ID or Password")
            except:
                err = "Invalid credentials"
            self.login_status.config(text=err, fg="#ef4444")
        except Exception:
            self.login_status.config(text="Master Server unreachable. Check network connection.", fg="#ef4444")

    def unlock_system(self):
        """Unlocks kiosk window so student can use desktop."""
        self.root.attributes("-fullscreen", False)
        self.root.attributes("-topmost", False)
        self.root.geometry("480x85+20+20")
        self.root.resizable(False, False)

        for widget in self.root.winfo_children():
            widget.destroy()

        bg_color = "#b91c1c" if self.exam_mode_active else "#0f172a"
        banner = tk.Frame(self.root, bg=bg_color, padx=15, pady=10)
        banner.pack(fill=tk.BOTH, expand=True)

        mode_text = "[EXAM IN PROGRESS - NO INTERNET]" if self.exam_mode_active else "Idle shutdown limit: 1 hr"
        info = tk.Label(
            banner,
            text=f"Student: {self.current_fullname} ({self.current_roll})\n{mode_text}",
            font=("Segoe UI", 9, "bold"),
            fg="#ffffff",
            bg=bg_color,
            justify=tk.LEFT
        )
        info.pack(side=tk.LEFT, padx=10)

        btn_logout = tk.Button(
            banner,
            text="SIGN OUT",
            font=("Segoe UI", 10, "bold"),
            bg="#ef4444" if not self.exam_mode_active else "#ffffff",
            fg="#ffffff" if not self.exam_mode_active else "#b91c1c",
            bd=0,
            padx=10,
            pady=5,
            cursor="hand2",
            command=self.handle_logout
        )
        btn_logout.pack(side=tk.RIGHT, padx=10)

    def handle_logout(self, status="logout"):
        if self.current_session_id:
            try:
                payload = json.dumps({
                    "session_id": self.current_session_id,
                    "status": status,
                    "username": self.current_user,
                    "pc_name": HOSTNAME
                }).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/heartbeat", data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=3)
            except Exception:
                pass

        self.is_logged_in = False
        self.current_session_id = None
        self.current_user = None

        self.lock_system()

    def execute_command(self, cmd):
        """Processes remote commands from Master Server."""
        if cmd == "lock":
            if self.is_logged_in:
                self.root.after(0, lambda: self.handle_logout("admin_lock"))
        elif cmd == "logout":
            if self.is_logged_in:
                self.root.after(0, lambda: self.handle_logout("admin_logout"))
        elif cmd == "shutdown":
            if self.is_logged_in:
                self.handle_logout("shutdown")
            subprocess.run(["shutdown", "/s", "/t", "5", "/c", "Admin initiated Lab Shutdown."])
        elif cmd == "reboot":
            if self.is_logged_in:
                self.handle_logout("reboot")
            subprocess.run(["shutdown", "/r", "/t", "5", "/c", "Admin initiated Lab Reboot."])

    def background_worker(self):
        """Heartbeat, remote commands, idle timeout, exam mode, and files."""
        while self.running:
            time.sleep(5)

            # 1. HEARTBEAT & REMOTE COMMANDS
            try:
                payload = json.dumps({
                    "session_id": self.current_session_id,
                    "status": "active" if self.is_logged_in else "ready",
                    "username": self.current_user,
                    "pc_name": HOSTNAME
                }).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/heartbeat", data=payload, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    res = json.loads(resp.read().decode())
                    cmd = res.get("command")
                    if cmd:
                        self.execute_command(cmd)
            except Exception:
                pass

            # 2. EXAM MODE STATUS
            try:
                req = urllib.request.Request(f"{SERVER_URL}/api/exam_status")
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode())
                    server_exam_state = data.get("exam_mode", False)

                    if server_exam_state and not self.exam_mode_active:
                        self.exam_mode_active = True
                        set_internet_blocked(True)
                        self.send_remote_log("EXAM_INTERNET_BLOCKED", "Internet blocked: normal desktop exam in progress.")
                        if self.is_logged_in:
                            self.root.after(0, self.unlock_system)

                    elif not server_exam_state and self.exam_mode_active:
                        self.exam_mode_active = False
                        set_internet_blocked(False)
                        self.send_remote_log("EXAM_INTERNET_RESTORED", "Exam mode ended: internet restored.")
                        if self.is_logged_in:
                            self.root.after(0, self.unlock_system)
            except Exception:
                pass

            # 3. IDLE SHUTDOWN (1 hour = 3600s)
            idle_sec = get_idle_seconds()
            if idle_sec >= 3600:
                self.send_remote_log("IDLE_SHUTDOWN", "PC idle for > 1 hour. Automated shutdown initiated.")
                self.handle_logout("idle_shutdown")
                subprocess.run(["shutdown", "/s", "/t", "30", "/c", "Notice: PC was idle for > 1 hour. Shutting down."])
                break

            # 4. SHARED FILES
            if self.is_logged_in:
                try:
                    req = urllib.request.Request(f"{SERVER_URL}/api/shared_files/latest")
                    with urllib.request.urlopen(req, timeout=4) as resp:
                        data = json.loads(resp.read().decode())
                        files = data.get("files", [])
                        for f_info in files:
                            fid = f_info["id"]
                            fname = f_info["file_name"]
                            if fid not in self.downloaded_files:
                                target_path = os.path.join(DESKTOP_PATH, fname)
                                if not os.path.exists(target_path):
                                    urllib.request.urlretrieve(f"{SERVER_URL}/api/download/{fid}", target_path)
                                    self.send_remote_log("FILE_DOWNLOADED", f"Downloaded shared file: {fname}")
                                self.downloaded_files.add(fid)
                except Exception:
                    pass

if __name__ == "__main__":
    root = tk.Tk()
    app = LabClientApp(root)
    root.mainloop()
