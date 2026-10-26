import os
import sys
import time
import socket
import json
import threading
import ctypes
import hashlib
import sqlite3
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
LOCAL_DB_FILE = os.path.join(EXE_DIR, "local_users.db")

PRIMARY_SERVER_5050 = "http://192.168.14.250:5050"
FALLBACK_SERVER_5050 = "http://192.168.6.189:5050"
PRIMARY_SERVER = "http://192.168.14.250:5050"
FALLBACK_SERVER = "http://192.168.6.189:5050"

def get_hash(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def init_local_db():
    try:
        conn = sqlite3.connect(LOCAL_DB_FILE)
        conn.execute('''CREATE TABLE IF NOT EXISTS local_users (
            username TEXT PRIMARY KEY,
            full_name TEXT,
            roll_no TEXT,
            password_hash TEXT,
            user_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        # Ensure default admin and test accounts always exist offline
        conn.execute('''INSERT OR IGNORE INTO local_users (username, full_name, roll_no, password_hash, user_type)
            VALUES (?, ?, ?, ?, ?)''', ('admin', 'Lab Administrator', 'ADMIN-01', get_hash('admin123'), 'admin'))
        conn.execute('''INSERT OR IGNORE INTO local_users (username, full_name, roll_no, password_hash, user_type)
            VALUES (?, ?, ?, ?, ?)''', ('faculty', 'Faculty Member', 'FACULTY-01', get_hash('faculty123'), 'faculty'))
        conn.execute('''INSERT OR IGNORE INTO local_users (username, full_name, roll_no, password_hash, user_type)
            VALUES (?, ?, ?, ?, ?)''', ('test', 'Test Account', 'TEST-001', get_hash('test123'), 'student'))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[LOCAL DB INIT ERROR] {e}")

init_local_db()

def save_local_user(username, full_name, roll_no, password, user_type):
    try:
        conn = sqlite3.connect(LOCAL_DB_FILE)
        conn.execute('''INSERT OR REPLACE INTO local_users (username, full_name, roll_no, password_hash, user_type)
            VALUES (?, ?, ?, ?, ?)''', (username, full_name, roll_no, get_hash(password), user_type))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def verify_local_user(username, password):
    try:
        conn = sqlite3.connect(LOCAL_DB_FILE)
        cursor = conn.cursor()
        cursor.execute("SELECT username, full_name, roll_no, password_hash, user_type FROM local_users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        if row and row[3] == get_hash(password):
            return {
                "success": True,
                "username": row[0],
                "full_name": row[1],
                "roll_no": row[2],
                "user_type": row[4],
                "is_offline": True
            }
    except Exception:
        pass
    return None

def test_reachability(url):
    try:
        req = urllib.request.Request(f"{url}/api/exam_status")
        with urllib.request.urlopen(req, timeout=1.2) as resp:
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

    # 2. Check Port 5050
    if test_reachability(PRIMARY_SERVER_5050):
        return PRIMARY_SERVER_5050
    if test_reachability(FALLBACK_SERVER_5050):
        return FALLBACK_SERVER_5050

    return PRIMARY_SERVER_5050

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

# ----------------- SYSTEM HARDENING & WEBSITE RESTRICTION ----------------- #
INTERNET_OPTION_SETTINGS_CHANGED = 39
INTERNET_OPTION_REFRESH = 37

def apply_social_media_block():
    """Restricts YouTube, Facebook, and Instagram system-wide using automatic PAC blackholing."""
    try:
        pac_path = os.path.join(EXE_DIR, "iibs_block.pac")
        pac_content = """function FindProxyForURL(url, host) {
    var blocked = [
        "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "googlevideo.com", "ytimg.com",
        "facebook.com", "www.facebook.com", "m.facebook.com", "fbcdn.net", "fb.com", "messenger.com",
        "instagram.com", "www.instagram.com", "cdninstagram.com"
    ];
    for (var i = 0; i < blocked.length; i++) {
        if (dnsDomainIs(host, blocked[i]) || host == blocked[i]) {
            return "PROXY 127.0.0.1:9";
        }
    }
    return "DIRECT";
}"""
        with open(pac_path, "w") as f:
            f.write(pac_content)

        pac_uri = "file:///" + pac_path.replace("\\", "/")
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Internet Settings", 0, winreg.KEY_SET_VALUE)
        winreg.SetValueEx(key, 'AutoConfigURL', 0, winreg.REG_SZ, pac_uri)
        winreg.CloseKey(key)

        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0)
        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_REFRESH, 0, 0)
    except Exception as e:
        print(f"[SOCIAL BLOCK ERROR] {e}")

apply_social_media_block()

def enforce_student_explorer_lockdown(active=True):
    """Restricts access to This PC drives, Windows Run, and Command Prompt in real-time."""
    try:
        # 1. Explorer Policies in HKCU
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer")
        if active:
            # 67108863 = 0x3FFFFFF (Restricts all 26 drive letters from A: to Z:)
            winreg.SetValueEx(key, 'NoViewOnDrive', 0, winreg.REG_DWORD, 67108863)
            winreg.SetValueEx(key, 'NoDrives', 0, winreg.REG_DWORD, 67108863)
            winreg.SetValueEx(key, 'NoRun', 0, winreg.REG_DWORD, 1)
        else:
            try: winreg.DeleteValue(key, 'NoViewOnDrive')
            except: pass
            try: winreg.DeleteValue(key, 'NoDrives')
            except: pass
            try: winreg.DeleteValue(key, 'NoRun')
            except: pass
        winreg.CloseKey(key)

        # 2. Disable CMD / PowerShell
        sys_key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Policies\Microsoft\Windows\System")
        if active:
            winreg.SetValueEx(sys_key, 'DisableCMD', 0, winreg.REG_DWORD, 1)
        else:
            try: winreg.DeleteValue(sys_key, 'DisableCMD')
            except: pass
        winreg.CloseKey(sys_key)
    except Exception as e:
        print(f"[EXPLORER LOCKDOWN ERROR] {e}")

def set_browser_internet_blocked(block=True):
    """Instantly kills HTTP/HTTPS browsing across Edge, Chrome, Firefox without needing Administrator privileges."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Internet Settings", 0, winreg.KEY_SET_VALUE)
        if block:
            winreg.SetValueEx(key, 'ProxyEnable', 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, 'ProxyServer', 0, winreg.REG_SZ, '127.0.0.1:9')
            # Whitelist local network so student client can still reach the Master Server
            winreg.SetValueEx(key, 'ProxyOverride', 0, winreg.REG_SZ, '192.168.*;10.*;172.16.*;127.0.0.1;<local>')
        else:
            winreg.SetValueEx(key, 'ProxyEnable', 0, winreg.REG_DWORD, 0)
            apply_social_media_block() # Re-apply social media block when general exam mode ends
        winreg.CloseKey(key)

        # Notify Windows network stack to apply immediately
        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0)
        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_REFRESH, 0, 0)
    except Exception as e:
        print(f"[PROXY BLOCK ERROR] {e}")

def set_firewall_internet_blocked(block=True):
    """Firewall level blocking (active when client is executed with elevated permissions)."""
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
    except Exception:
        pass

def set_internet_blocked(block=True):
    """Executes Dual-Layer blocking ensuring internet is completely cut regardless of Windows privilege level."""
    if is_master_server_host():
        return
    # Layer 1: Instant Browser Level Proxy Blackhole (Zero-privilege)
    set_browser_internet_blocked(block)
    # Layer 2: Deep Kernel Firewall Block
    set_firewall_internet_blocked(block)

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
        self.current_role = None
        self.current_user_folder = None
        self.is_logged_in = False
        self.exam_mode_active = False
        self.running = True
        self.downloaded_files = set()

        # Report System Specs to Server
        self.register_system_telemetry()

        # Check and enforce initial exam mode immediately upon launch
        self.sync_initial_exam_mode()

        # Start background polling thread
        self.worker_thread = threading.Thread(target=self.background_worker, daemon=True)
        self.worker_thread.start()

        # Keyboard Shortcut: Ctrl + Alt + Q to open Admin Exit
        self.root.bind("<Control-Alt-q>", lambda e: self.admin_exit_prompt())
        self.root.bind("<Control-Alt-Q>", lambda e: self.admin_exit_prompt())

        # Build Kiosk UI
        self.lock_system()

    def sync_initial_exam_mode(self):
        def _check():
            try:
                req = urllib.request.Request(f"{SERVER_URL}/api/exam_status")
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode())
                    if data.get("exam_mode", False):
                        self.exam_mode_active = True
                        set_internet_blocked(True)
            except Exception:
                pass
        threading.Thread(target=_check, daemon=True).start()

    def admin_exit_prompt(self):
        import tkinter.simpledialog as sd
        pwd = sd.askstring("Administrator Bypass", "Enter Admin Password to close client software:", show="*", parent=self.root)
        if pwd in ["admin123", "admin@123", "iibsadmin"]:
            self.running = False
            # Restore normal permissions upon admin exit
            try:
                enforce_student_explorer_lockdown(False)
            except Exception:
                pass
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

        # TAB 2: REGISTER (Student or Faculty)
        reg_tab = tk.Frame(self.notebook, bg="#1e293b", padx=30, pady=15)
        self.notebook.add(reg_tab, text=" New Registration ")

        # Register Role Selector
        reg_role_frame = tk.Frame(reg_tab, bg="#1e293b")
        reg_role_frame.pack(fill=tk.X, pady=(0, 6))
        tk.Label(reg_role_frame, text="Register As:", font=("Segoe UI", 9, "bold"), bg="#1e293b", fg="#94a3b8").pack(side=tk.LEFT, padx=(0, 10))
        self.reg_user_type = tk.StringVar(value="student")
        tk.Radiobutton(reg_role_frame, text="Student", variable=self.reg_user_type, value="student", command=self.update_reg_labels, bg="#1e293b", fg="#38bdf8", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=8)
        tk.Radiobutton(reg_role_frame, text="Faculty Member", variable=self.reg_user_type, value="faculty", command=self.update_reg_labels, bg="#1e293b", fg="#4ade80", selectcolor="#0f172a", activebackground="#1e293b", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=8)

        self.reg_id_label = tk.Label(reg_tab, text="Roll Number", font=("Segoe UI", 10, "bold"), bg="#1e293b", fg="#e2e8f0")
        self.reg_id_label.pack(anchor=tk.W, pady=(3, 2))
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
        self.reg_pass.pack(fill=tk.X, pady=(0, 10), ipady=3)

        btn_reg = tk.Button(reg_tab, text="CREATE ACCOUNT", font=("Segoe UI", 11, "bold"), bg="#16a34a", fg="#ffffff", bd=0, cursor="hand2", command=self.handle_register)
        btn_reg.pack(fill=tk.X, ipady=6)

        self.reg_status = tk.Label(reg_tab, text="", font=("Segoe UI", 10), bg="#1e293b", fg="#ef4444")
        self.reg_status.pack(pady=3)

    def update_reg_labels(self):
        if self.reg_user_type.get() == "faculty":
            self.reg_id_label.config(text="Faculty Employee ID")
        else:
            self.reg_id_label.config(text="Roll Number")

        footer = tk.Label(self.main_frame, text=f"Host: {HOSTNAME} | Server: {SERVER_URL}", font=("Segoe UI", 9), fg="#64748b", bg="#0b1120")
        footer.pack(side=tk.BOTTOM, pady=15)

    def handle_register(self):
        roll = self.reg_roll.get().strip()
        name = self.reg_name.get().strip()
        user = self.reg_user.get().strip()
        pwd = self.reg_pass.get().strip()
        u_type = self.reg_user_type.get()

        if not roll or not name or not user or not pwd:
            self.reg_status.config(text="Please fill in all details", fg="#ef4444")
            return

        payload = json.dumps({"roll_no": roll, "full_name": name, "username": user, "password": pwd, "user_type": u_type}).encode('utf-8')
        registered_on_server = False

        # Try server registration first
        try:
            req = urllib.request.Request(f"{SERVER_URL}/api/register", data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=3) as response:
                res_data = json.loads(response.read().decode())
                if res_data.get("success"):
                    registered_on_server = True
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode()).get("message", "Error")
            except:
                err = "Roll number or User ID already taken on server"
            self.reg_status.config(text=err, fg="#ef4444")
            return
        except Exception:
            pass # Server is offline, will save locally

        # Save to local database (ensures works even without internet or network)
        save_local_user(user, name, roll, pwd, u_type)

        # Create user's dedicated folder immediately on Desktop
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        clean_name = "".join([c for c in name if c.isalnum() or c in (' ', '_')]).strip()
        clean_user = "".join([c for c in user if c.isalnum() or c in (' ', '_')]).strip()
        user_folder = os.path.join(desktop, f"Student_Work_{clean_user}_{clean_name}")
        os.makedirs(user_folder, exist_ok=True)

        mode_msg = "Account created & synced with Server!" if registered_on_server else "Account created locally (Standalone / Offline Mode)!"
        messagebox.showinfo("Success", f"{mode_msg}\n\nYour personal workspace folder has been prepared on Desktop:\n{os.path.basename(user_folder)}")
        self.reg_roll.delete(0, tk.END)
        self.reg_name.delete(0, tk.END)
        self.reg_user.delete(0, tk.END)
        self.reg_pass.delete(0, tk.END)
        self.notebook.select(0)

    def handle_login(self):
        user = self.login_user.get().strip()
        pwd = self.login_pass.get().strip()

        if not user or not pwd:
            self.login_status.config(text="Enter User ID and Password", fg="#ef4444")
            return

        payload = json.dumps({"username": user, "password": pwd, "pc_name": HOSTNAME}).encode('utf-8')
        logged_in = False

        # 1. Try server login
        try:
            req = urllib.request.Request(f"{SERVER_URL}/api/login", data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=3) as response:
                res = json.loads(response.read().decode())
                if res.get("success"):
                    self.current_session_id = res.get("session_id")
                    self.current_user = user
                    self.current_fullname = res.get("full_name")
                    self.current_roll = res.get("roll_no")
                    self.current_role = res.get("role", self.login_role.get())
                    self.is_logged_in = True
                    logged_in = True
                    # Cache successful credentials locally for offline use
                    save_local_user(user, res.get("full_name"), res.get("roll_no"), pwd, self.current_role)
                    self.unlock_system()
                    return
                else:
                    self.login_status.config(text=res.get("message", "Invalid login"), fg="#ef4444")
                    return
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read().decode()).get("message", "Invalid User ID or Password")
            except:
                err = "Invalid credentials"
            self.login_status.config(text=err, fg="#ef4444")
            return
        except Exception:
            # Server unreachable - fallback to offline authentication!
            pass

        # 2. Standalone / Offline Authentication
        local_auth = verify_local_user(user, pwd)
        if local_auth:
            self.current_session_id = "OFFLINE"
            self.current_user = local_auth["username"]
            self.current_fullname = local_auth["full_name"]
            self.current_roll = local_auth["roll_no"]
            self.current_role = local_auth.get("user_type", "student")
            self.is_logged_in = True
            self.unlock_system()
        else:
            self.login_status.config(text="Invalid credentials (or user not registered)", fg="#ef4444")

    def unlock_system(self):
        """Unlocks kiosk window so student can use desktop with hardened restrictions."""
        self.root.attributes("-fullscreen", False)
        self.root.attributes("-topmost", False)
        self.root.geometry("480x85+20+20")
        self.root.resizable(False, False)

        for widget in self.root.winfo_children():
            widget.destroy()

        # Enforce file system lockdown for Student accounts
        if self.current_role != "admin":
            enforce_student_explorer_lockdown(True)

        # Ensure student's dedicated workspace folder exists on Desktop and make it visible
        desktop = os.path.join(os.path.expanduser("~"), "Desktop")
        clean_name = "".join([c for c in (self.current_fullname or "User") if c.isalnum() or c in (' ', '_')]).strip()
        clean_user = "".join([c for c in (self.current_user or "Student") if c.isalnum() or c in (' ', '_')]).strip()
        user_folder = os.path.join(desktop, f"Student_Work_{clean_user}_{clean_name}")
        os.makedirs(user_folder, exist_ok=True)
        self.current_user_folder = user_folder

        # Make student folder visible (remove hidden/system flags)
        try:
            ctypes.windll.kernel32.SetFileAttributesW(user_folder, 128) # FILE_ATTRIBUTE_NORMAL
        except Exception:
            pass

        # Hide any other old student folders on Desktop so they only see their own folder
        try:
            for item in os.listdir(desktop):
                item_path = os.path.join(desktop, item)
                if os.path.isdir(item_path) and item.startswith("Student_Work_") and item_path != user_folder:
                    ctypes.windll.kernel32.SetFileAttributesW(item_path, 2) # FILE_ATTRIBUTE_HIDDEN
        except Exception:
            pass

        bg_color = "#b91c1c" if self.exam_mode_active else "#0f172a"
        banner = tk.Frame(self.root, bg=bg_color, padx=12, pady=8)
        banner.pack(fill=tk.BOTH, expand=True)

        mode_text = "[EXAM MODE - NO INTERNET]" if self.exam_mode_active else "Hardened Lab Environment"
        info = tk.Label(
            banner,
            text=f"User: {self.current_fullname} ({self.current_roll})\n{mode_text}",
            font=("Segoe UI", 9, "bold"),
            fg="#ffffff",
            bg=bg_color,
            justify=tk.LEFT
        )
        info.pack(side=tk.LEFT, padx=6)

        btn_folder = tk.Button(
            banner,
            text="MY FOLDER",
            font=("Segoe UI", 8, "bold"),
            bg="#2563eb",
            fg="#ffffff",
            bd=0,
            padx=8,
            pady=4,
            cursor="hand2",
            command=lambda: os.startfile(user_folder)
        )
        btn_folder.pack(side=tk.RIGHT, padx=4)

        btn_logout = tk.Button(
            banner,
            text="SIGN OUT",
            font=("Segoe UI", 8, "bold"),
            bg="#ef4444" if not self.exam_mode_active else "#ffffff",
            fg="#ffffff" if not self.exam_mode_active else "#b91c1c",
            bd=0,
            padx=8,
            pady=4,
            cursor="hand2",
            command=self.handle_logout
        )
        btn_logout.pack(side=tk.RIGHT, padx=4)

    def handle_logout(self, status="logout"):
        # Hide the student's personal folder upon logout so next user cannot see it
        if hasattr(self, 'current_user_folder') and self.current_user_folder and os.path.exists(self.current_user_folder):
            try:
                ctypes.windll.kernel32.SetFileAttributesW(self.current_user_folder, 2) # FILE_ATTRIBUTE_HIDDEN
            except Exception:
                pass

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
        self.current_role = None

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
