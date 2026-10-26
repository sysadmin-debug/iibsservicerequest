# IIBS Computer Lab Management System (100% Offline LAN)

This system provides complete session management, student registration & authentication, remote password reset, one-shot file sharing, 1-hour idle auto-shutdown, **1-Click Exam Mode (Internet Disabled)**, and **Comprehensive Audit Logging** across your local area network (LAN).

---

## 📁 System Structure
```
lab_manager/
│
├── server/
│   ├── server.py              # Central LAN Flask Server & Web Admin Portal
│   ├── lab_database.db        # SQLite database (auto-created on first run)
│   └── shared_files/          # Files uploaded by Admin for broadcast
│
├── client/
│   ├── client.py              # Fullscreen Kiosk Lock screen for student PCs
│   └── client_config.json     # Server IP address configuration
│
├── start_server.bat           # 1-Click launcher for Master Server (Teacher PC)
├── start_client.bat           # 1-Click launcher for Lab Client (Student PC)
└── README.md
```

---

## 🚀 Step 1: Set Up the Master Server (Teacher's PC)

1. Find the LAN IP of the Teacher's PC:
   - Open Command Prompt and type: `ipconfig`
   - Look for `IPv4 Address` (e.g. `192.168.1.100`).
2. Double-click `start_server.bat` in the `lab_manager/` folder.
3. Open any web browser on your PC and navigate to:
   ```
   http://127.0.0.1:5000/admin
   ```
   *(Or from any other laptop/phone on the same Wi-Fi/LAN: `http://192.168.1.100:5000/admin`)*

---

## 💻 Step 2: Set Up the Student Lab PCs

1. In `lab_manager/client/client_config.json`, enter your Teacher PC's LAN IP:
   ```json
   {
       "server_url": "http://192.168.1.100:5000"
   }
   ```
2. Double-click `start_client.bat` on the student PC.
3. The PC will lock into **Fullscreen Kiosk Mode**:
   - First-time students register with their **Roll Number**, **Full Name**, **Username**, and **Password**.
   - After registering, they log in.
   - The screen unlocks and session logging begins.

---

## 🎓 Step 3: Taking Exams (Internet Blocking in Normal Desktop Mode)

When an exam is being conducted:
1. Open the Admin Portal (`http://<SERVER_IP>:5000/admin`).
2. Click **"Enable Exam Mode (Block Internet)"**:
   - Every student PC instantly receives the command over LAN.
   - External Internet (Web HTTP 80, HTTPS 443, DNS 53) is immediately blocked via Windows Firewall.
   - The system remains in **Normal Desktop Mode** so students can use local exam applications, code editors, or office tools without cheating.
   - A red indicator bar appears showing: `[EXAM IN PROGRESS - NO INTERNET]`.
3. When the exam is over, click **"End Exam & Restore Internet"**:
   - The firewall block rules are removed and normal internet connectivity is restored.

---

## 📋 Step 4: Audit & System Logs

- Every significant event is recorded in real time:
  - Student registrations (Roll number, name, IP).
  - Successful and failed login attempts.
  - Exam Mode toggles (Internet blocked / restored).
  - Broadcasted file downloads.
  - Idle shutdowns.
- **Export to CSV:** Click the **"Export Logs (CSV)"** button in the Admin portal at any time to download an Excel-compatible audit report for institutional records.

---

## 🔒 Step 5: Block Student Administration Rights on Windows

To ensure students cannot close the software, kill processes in Task Manager, or install unapproved software:

1. **Create a Standard (Non-Admin) Account:**
   - Go to Windows **Settings** > **Accounts** > **Other users**.
   - Create a local account named `Student`.
   - Ensure the Account Type is set to **Standard User** (NOT Administrator).
2. **Prevent Task Manager Access:**
   - Press `Win + R`, type `gpedit.msc` and press Enter.
   - Go to: `User Configuration` > `Administrative Templates` > `System` > `Ctrl+Alt+Del Options`.
   - Double-click **Remove Task Manager** and set it to **Enabled**.
3. **Auto-Start on Boot:**
   - Press `Win + R`, type `shell:startup` and press Enter.
   - Create a shortcut to `start_client.bat` inside this startup folder.
   - Now, every time the student PC boots up, it automatically starts the lock screen.

---

## ⚡ Standalone Executable (Optional: No Python Needed on Student PCs)

If you don't want to install Python on every student PC, compile `client.py` into a single `.exe`:

```cmd
pip install pyinstaller
cd lab_manager/client
pyinstaller --onefile --noconsole client.py
```
This produces `dist/client.exe`. You can simply copy this `.exe` and `client_config.json` to any student PC!
