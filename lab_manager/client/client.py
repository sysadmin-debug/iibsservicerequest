import os
import sys
import time
import socket
import json
import threading
import ctypes
from ctypes import wintypes
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
EXE_DIR = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(EXE_DIR, "client_config.json")

PRIMARY_SERVER_5050 = "http://192.168.1.167:5050"
FALLBACK_SERVER_5050 = "http://192.168.6.189:5050"
LOCAL_SERVER_5050 = "http://127.0.0.1:5050"

def test_reachability(url):
    try:
        req = urllib.request.Request(f"{url}/api/exam_status")
        with urllib.request.urlopen(req, timeout=1.2) as resp:
            return resp.status == 200
    except Exception:
        return False

def determine_server_url():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                c = json.load(f)
                custom_url = c.get("server_url", "").strip().rstrip("/")
                if custom_url and test_reachability(custom_url):
                    return custom_url
        except Exception:
            pass

    for candidate in [PRIMARY_SERVER_5050, FALLBACK_SERVER_5050, LOCAL_SERVER_5050]:
        if test_reachability(candidate):
            return candidate

    return PRIMARY_SERVER_5050

SERVER_URL = determine_server_url()
SERVER_HOST_IP = urllib.parse.urlparse(SERVER_URL).hostname or "192.168.1.167"
HOSTNAME = socket.gethostname()

def get_real_desktop_path():
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders") as k:
            d, _ = winreg.QueryValueEx(k, "Desktop")
            if os.path.exists(d):
                return d
    except Exception:
        pass
    d = os.path.join(os.path.expanduser("~"), "Desktop")
    os.makedirs(d, exist_ok=True)
    return d

DESKTOP_PATH = get_real_desktop_path()
EXAM_FOLDER_PATH = os.path.join(DESKTOP_PATH, "data for exam")
SUBMIT_FOLDER_PATH = os.path.join(EXAM_FOLDER_PATH, "Submit_To_Teacher")

os.makedirs(EXAM_FOLDER_PATH, exist_ok=True)
os.makedirs(SUBMIT_FOLDER_PATH, exist_ok=True)

# ----------------- SYSTEM TELEMETRY ----------------- #
def get_hardware_specs():
    cpu_name = platform.processor() or "Generic CPU"
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"HARDWARE\DESCRIPTION\System\CentralProcessor\0")
        cpu_name, _ = winreg.QueryValueEx(key, "ProcessorNameString")
        winreg.CloseKey(key)
    except Exception:
        pass

    ram_gb = 8.0
    try:
        class MEMORYSTATUSEX(ctypes.Structure):
            _fields_ = [
                ("dwLength", ctypes.c_ulong),
                ("dwMemoryLoad", ctypes.c_ulong),
                ("ullTotalPhys", ctypes.c_ulonglong),
                ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong),
                ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong),
                ("ullAvailVirtual", ctypes.c_ulonglong),
                ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
            ]
        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            ram_gb = round(stat.ullTotalPhys / (1024**3), 1)
    except Exception:
        pass

    disk_free_gb = 50.0
    try:
        import shutil
        total, used, free = shutil.disk_usage("C:\\")
        disk_free_gb = round(free / (1024**3), 1)
    except Exception:
        pass

    mac_str = ""
    try:
        node = uuid.getnode()
        mac_str = ':'.join(['{:02x}'.format((node >> el) & 0xff) for el in range(0, 12, 2)][::-1])
    except Exception:
        pass

    return {
        "pc_name": HOSTNAME,
        "cpu_info": cpu_name,
        "ram_gb": ram_gb,
        "disk_free_gb": disk_free_gb,
        "mac_address": mac_str,
        "os_version": f"{platform.system()} {platform.release()}"
    }

# ----------------- RESTORE DRIVES & REGISTRY CLEANUP ----------------- #
def cleanup_drive_restrictions():
    """Ensures drives and cmd are never blocked."""
    reg_cleanups = [
        (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer", ["NoDrives", "NoViewOnDrive", "NoRun", "NoCommonGroups"]),
        (winreg.HKEY_LOCAL_MACHINE, r"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer", ["NoDrives", "NoViewOnDrive", "NoRun"]),
        (winreg.HKEY_CURRENT_USER, r"Software\Policies\Microsoft\Windows\Explorer", ["NoDrives", "NoViewOnDrive"]),
        (winreg.HKEY_CURRENT_USER, r"Software\Policies\Microsoft\Windows\System", ["DisableCMD"]),
    ]
    for root_k, sub_k, vals in reg_cleanups:
        try:
            with winreg.OpenKey(root_k, sub_k, 0, winreg.KEY_SET_VALUE) as key:
                for v in vals:
                    try:
                        winreg.DeleteValue(key, v)
                    except Exception:
                        pass
        except Exception:
            pass

    # Restore USB access
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Services\USBSTOR", 0, winreg.KEY_SET_VALUE) as k:
            winreg.SetValueEx(k, "Start", 0, winreg.REG_DWORD, 3)
    except Exception:
        pass

# ----------------- EXAM MODE: INTERNET CONTROLS ----------------- #
INTERNET_OPTION_SETTINGS_CHANGED = 39
INTERNET_OPTION_REFRESH = 37

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

def set_browser_internet_blocked(block=True):
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Internet Settings", 0, winreg.KEY_SET_VALUE)
        if block:
            winreg.SetValueEx(key, 'ProxyEnable', 0, winreg.REG_DWORD, 1)
            winreg.SetValueEx(key, 'ProxyServer', 0, winreg.REG_SZ, '127.0.0.1:9')
            winreg.SetValueEx(key, 'ProxyOverride', 0, winreg.REG_SZ, '192.168.*;10.*;172.16.*;127.0.0.1;<local>')
        else:
            winreg.SetValueEx(key, 'ProxyEnable', 0, winreg.REG_DWORD, 0)
        winreg.CloseKey(key)

        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0)
        ctypes.windll.Wininet.InternetSetOptionW(0, INTERNET_OPTION_REFRESH, 0, 0)
    except Exception as e:
        print(f"[PROXY BLOCK ERROR] {e}")

def set_firewall_internet_blocked(block=True):
    try:
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_HTTP"], capture_output=True)
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_HTTPS"], capture_output=True)
        subprocess.run(["netsh", "advfirewall", "firewall", "delete", "rule", "name=IIBS_BLOCK_DNS"], capture_output=True)

        if block:
            subprocess.run(["netsh", "advfirewall", "firewall", "add", "rule", "name=IIBS_BLOCK_HTTP", "dir=out", "action=block", "protocol=TCP", "remoteport=80"], capture_output=True)
            subprocess.run(["netsh", "advfirewall", "firewall", "add", "rule", "name=IIBS_BLOCK_HTTPS", "dir=out", "action=block", "protocol=TCP", "remoteport=443"], capture_output=True)
            subprocess.run(["netsh", "advfirewall", "firewall", "add", "rule", "name=IIBS_BLOCK_DNS", "dir=out", "action=block", "protocol=UDP", "remoteport=53"], capture_output=True)
    except Exception:
        pass

def set_internet_blocked(block=True):
    if is_master_server_host():
        return
    set_browser_internet_blocked(block)
    set_firewall_internet_blocked(block)

# ----------------- APP CLIENT UI (CLEAN FLOATING WIDGET) ----------------- #
class LabClientApp:
    def __init__(self, root):
        self.root = root
        self.root.title("IIBS Lab File Manager & Exam Client")
        
        # Cleanup any previous drive restrictions
        cleanup_drive_restrictions()

        self.running = True
        self.exam_mode_active = False
        self.downloaded_files = set()
        self.synced_files_cache = {}

        # Non-intrusive floating bar at top right of screen
        self.root.geometry("460x78+50+20")
        self.root.resizable(False, False)
        self.root.attributes("-topmost", True)
        self.root.configure(bg="#0f172a")

        self.build_ui()
        self.register_system_telemetry()

        # Background worker
        self.worker_thread = threading.Thread(target=self.background_worker, daemon=True)
        self.worker_thread.start()

    def build_ui(self):
        main = tk.Frame(self.root, bg="#0f172a", padx=10, pady=8)
        main.pack(fill=tk.BOTH, expand=True)

        # Left: Status badge & PC name
        info_frame = tk.Frame(main, bg="#0f172a")
        info_frame.pack(side=tk.LEFT, fill=tk.Y)

        self.pc_lbl = tk.Label(info_frame, text=f"💻 {HOSTNAME}", font=("Segoe UI", 10, "bold"), fg="#38bdf8", bg="#0f172a")
        self.pc_lbl.pack(anchor=tk.W)

        self.status_lbl = tk.Label(info_frame, text="🟢 Ready | Normal Mode", font=("Segoe UI", 8), fg="#4ade80", bg="#0f172a")
        self.status_lbl.pack(anchor=tk.W)

        # Right: Action Buttons
        btn_frame = tk.Frame(main, bg="#0f172a")
        btn_frame.pack(side=tk.RIGHT, fill=tk.Y)

        btn_teacher_files = tk.Button(
            btn_frame,
            text="📁 Data for Exam",
            font=("Segoe UI", 8, "bold"),
            bg="#2563eb",
            fg="#ffffff",
            bd=0,
            padx=8,
            pady=4,
            cursor="hand2",
            command=lambda: os.startfile(EXAM_FOLDER_PATH)
        )
        btn_teacher_files.pack(side=tk.LEFT, padx=3)

        btn_submit = tk.Button(
            btn_frame,
            text="📤 Submit Output",
            font=("Segoe UI", 8, "bold"),
            bg="#059669",
            fg="#ffffff",
            bd=0,
            padx=8,
            pady=4,
            cursor="hand2",
            command=lambda: os.startfile(SUBMIT_FOLDER_PATH)
        )
        btn_submit.pack(side=tk.LEFT, padx=3)

        btn_min = tk.Button(
            btn_frame,
            text="🗕",
            font=("Segoe UI", 8, "bold"),
            bg="#334155",
            fg="#ffffff",
            bd=0,
            padx=6,
            pady=4,
            cursor="hand2",
            command=self.root.iconify
        )
        btn_min.pack(side=tk.LEFT, padx=3)

    def set_exam_ui(self, active):
        if active:
            self.root.configure(bg="#7f1d1d")
            self.status_lbl.config(text="🔴 EXAM MODE ACTIVE (Net Blocked)", fg="#fca5a5", bg="#7f1d1d")
            self.pc_lbl.config(bg="#7f1d1d")
        else:
            self.root.configure(bg="#0f172a")
            self.status_lbl.config(text="🟢 Ready | Normal Mode", fg="#4ade80", bg="#0f172a")
            self.pc_lbl.config(bg="#0f172a")

    def register_system_telemetry(self):
        def _send():
            specs = get_hardware_specs()
            try:
                payload = json.dumps(specs).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/system_register", data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=5)
            except Exception:
                pass
        threading.Thread(target=_send, daemon=True).start()

    def send_remote_log(self, event, details=""):
        def _log():
            try:
                payload = json.dumps({"event": event, "details": details, "pc_name": HOSTNAME}).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/log_event", data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req, timeout=3)
            except Exception:
                pass
        threading.Thread(target=_log, daemon=True).start()

    def handle_remote_command(self, cmd):
        if not cmd:
            return
        cmd = cmd.strip().lower()

        if cmd == "shutdown":
            self.send_remote_log("REMOTE_SHUTDOWN", "Shutdown command received from Admin.")
            subprocess.run(["shutdown", "/s", "/t", "5", "/c", "Admin initiated Lab Shutdown."])
        elif cmd == "reboot":
            self.send_remote_log("REMOTE_REBOOT", "Reboot command received from Admin.")
            subprocess.run(["shutdown", "/r", "/t", "5", "/c", "Admin initiated Lab Reboot."])
        elif cmd == "unlock_drives":
            cleanup_drive_restrictions()

    def background_worker(self):
        while self.running:
            time.sleep(4)

            # 1. HEARTBEAT & REMOTE COMMANDS
            try:
                payload = json.dumps({
                    "pc_name": HOSTNAME,
                    "status": "ready" if not self.exam_mode_active else "active",
                    "current_user": "Student",
                    "session_id": None
                }).encode('utf-8')
                req = urllib.request.Request(f"{SERVER_URL}/api/heartbeat", data=payload, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    res = json.loads(resp.read().decode())
                    cmd = res.get("command", "")
                    if cmd:
                        self.handle_remote_command(cmd)
            except Exception:
                pass

            # 2. EXAM MODE SYNC
            try:
                req = urllib.request.Request(f"{SERVER_URL}/api/exam_status")
                with urllib.request.urlopen(req, timeout=3) as resp:
                    data = json.loads(resp.read().decode())
                    server_exam_state = data.get("exam_mode", False)

                    if server_exam_state and not self.exam_mode_active:
                        self.exam_mode_active = True
                        set_internet_blocked(True)
                        self.send_remote_log("EXAM_INTERNET_BLOCKED", "Internet blocked: Exam mode in progress.")
                        self.root.after(0, lambda: self.set_exam_ui(True))

                    elif not server_exam_state and self.exam_mode_active:
                        self.exam_mode_active = False
                        set_internet_blocked(False)
                        self.send_remote_log("EXAM_INTERNET_RESTORED", "Exam mode ended: Internet restored.")
                        self.root.after(0, lambda: self.set_exam_ui(False))
            except Exception:
                pass

            # 3. 2-WAY FILE BROADCAST (Teacher -> Client: saved to Desktop\data for exam)
            try:
                req = urllib.request.Request(f"{SERVER_URL}/api/shared_files/latest")
                with urllib.request.urlopen(req, timeout=4) as resp:
                    data = json.loads(resp.read().decode())
                    for f_info in data.get("files", []):
                        fid = f_info["id"]
                        fname = f_info["file_name"]
                        if fid not in self.downloaded_files:
                            target_path = os.path.join(EXAM_FOLDER_PATH, fname)
                            if not os.path.exists(target_path):
                                urllib.request.urlretrieve(f"{SERVER_URL}/api/download/{fid}", target_path)
                                self.send_remote_log("FILE_DOWNLOADED", f"Received exam file: {fname}")
                            self.downloaded_files.add(fid)
            except Exception:
                pass

            # 4. 2-WAY FILE BROADCAST (Client -> Teacher Upload)
            try:
                if os.path.exists(SUBMIT_FOLDER_PATH):
                    for fname in os.listdir(SUBMIT_FOLDER_PATH):
                        fpath = os.path.join(SUBMIT_FOLDER_PATH, fname)
                        if os.path.isfile(fpath) and not fname.startswith('.'):
                            mtime = os.path.getmtime(fpath)
                            if self.synced_files_cache.get(fname) != mtime:
                                with open(fpath, 'rb') as f_obj:
                                    f_content = f_obj.read()
                                boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
                                body = (
                                    f'--{boundary}\r\n'
                                    f'Content-Disposition: form-data; name="username"\r\n\r\n{HOSTNAME}\r\n'
                                    f'--{boundary}\r\n'
                                    f'Content-Disposition: form-data; name="full_name"\r\n\r\nLab Client ({HOSTNAME})\r\n'
                                    f'--{boundary}\r\n'
                                    f'Content-Disposition: form-data; name="roll_no"\r\n\r\n{HOSTNAME}\r\n'
                                    f'--{boundary}\r\n'
                                    f'Content-Disposition: form-data; name="pc_name"\r\n\r\n{HOSTNAME}\r\n'
                                    f'--{boundary}\r\n'
                                    f'Content-Disposition: form-data; name="file"; filename="{fname}"\r\n'
                                    f'Content-Type: application/octet-stream\r\n\r\n'
                                ).encode('utf-8') + f_content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

                                req = urllib.request.Request(
                                    f"{SERVER_URL}/api/student_files/sync",
                                    data=body,
                                    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
                                )
                                with urllib.request.urlopen(req, timeout=5) as u_resp:
                                    if u_resp.status == 200:
                                        self.synced_files_cache[fname] = mtime
                                        self.send_remote_log("STUDENT_FILE_SUBMITTED", f"Submitted work to teacher: {fname}")
            except Exception:
                pass

if __name__ == "__main__":
    root = tk.Tk()
    app = LabClientApp(root)
    root.mainloop()
