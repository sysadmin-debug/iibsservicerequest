import os
import sqlite3
import hashlib
import time
import io
import csv
from datetime import datetime
from flask import Flask, request, jsonify, render_template_string, send_from_directory, Response
from werkzeug.utils import secure_filename

import sys

app = Flask(__name__)

# Ensure persistent database location even if packaged as .exe
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DB_PATH = os.path.join(BASE_DIR, "lab_database.db")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "shared_files")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ----------------- DATABASE SETUP ----------------- #
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    # Students table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            roll_no TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Lab Systems table (Specs and Live state for up to 100+ PCs)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lab_systems (
            pc_name TEXT PRIMARY KEY,
            ip_address TEXT,
            mac_address TEXT,
            cpu_info TEXT,
            ram_gb REAL,
            disk_free_gb REAL,
            os_version TEXT,
            status TEXT DEFAULT 'ready',
            current_user TEXT,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            pending_command TEXT DEFAULT ''
        )
    ''')
    # Session logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS session_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            full_name TEXT,
            roll_no TEXT,
            pc_name TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            logout_time TIMESTAMP,
            duration_minutes INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active'
        )
    ''')
    # Shared files table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS shared_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Comprehensive System & Audit Logs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            username TEXT,
            pc_name TEXT,
            ip_address TEXT,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Key-value settings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('exam_mode', '0')")
    conn.commit()
    conn.close()

init_db()

def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def log_event(event_type, username=None, pc_name=None, ip_address=None, details=None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO system_logs (event_type, username, pc_name, ip_address, details) VALUES (?, ?, ?, ?, ?)",
            (event_type, username, pc_name, ip_address, details)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[LOG ERROR] {e}")

# ----------------- CLIENT API ROUTES ----------------- #

@app.route('/api/system_register', methods=['POST'])
def system_register():
    """Called by client on launch to report PC hardware specs."""
    data = request.json or {}
    pc_name = data.get('pc_name', 'Unknown-PC').strip()
    ip_addr = request.remote_addr or data.get('ip_address', '127.0.0.1')
    mac_addr = data.get('mac_address', '')
    cpu_info = data.get('cpu_info', 'Unknown CPU')
    ram_gb = data.get('ram_gb', 0.0)
    disk_free_gb = data.get('disk_free_gb', 0.0)
    os_version = data.get('os_version', 'Windows')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO lab_systems (pc_name, ip_address, mac_address, cpu_info, ram_gb, disk_free_gb, os_version, status, last_seen)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', CURRENT_TIMESTAMP)
        ON CONFLICT(pc_name) DO UPDATE SET
            ip_address = excluded.ip_address,
            mac_address = excluded.mac_address,
            cpu_info = excluded.cpu_info,
            ram_gb = excluded.ram_gb,
            disk_free_gb = excluded.disk_free_gb,
            os_version = excluded.os_version,
            status = CASE WHEN lab_systems.status = 'active' THEN 'active' ELSE 'ready' END,
            last_seen = CURRENT_TIMESTAMP
    ''', (pc_name, ip_addr, mac_addr, cpu_info, ram_gb, disk_free_gb, os_version))
    conn.commit()
    conn.close()

    log_event("SYSTEM_ONLINE", pc_name=pc_name, ip_address=ip_addr, details=f"Specs: {cpu_info} | {ram_gb}GB RAM | Free Disk: {disk_free_gb}GB")
    return jsonify({"success": True, "message": "System registered successfully"})

@app.route('/api/register', methods=['POST'])
def register_student():
    data = request.json or {}
    username = data.get('username', '').strip()
    full_name = data.get('full_name', '').strip()
    roll_no = data.get('roll_no', '').strip()
    password = data.get('password', '').strip()
    user_type = data.get('user_type', 'student').strip().lower()
    ip_addr = request.remote_addr or '127.0.0.1'

    if not username or not full_name or not roll_no or not password:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO students (username, full_name, roll_no, password_hash, user_type) VALUES (?, ?, ?, ?, ?)",
            (username, full_name, roll_no, hash_password(password), user_type)
        )
        conn.commit()
        log_type = "FACULTY_REGISTER" if user_type == "faculty" else "STUDENT_REGISTER"
        log_event(log_type, username=username, ip_address=ip_addr, details=f"ID/Roll: {roll_no}, Name: {full_name}, Role: {user_type.title()}")
        return jsonify({"success": True, "message": f"{user_type.title()} registration successful! You can now log in."})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "User ID or Roll/Employee Number already registered!"}), 409
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login_student():
    data = request.json or {}
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    pc_name = data.get('pc_name', 'Unknown-PC').strip()
    ip_addr = request.remote_addr or '127.0.0.1'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE username = ?", (username,))
    student = cursor.fetchone()

    if not student or student['password_hash'] != hash_password(password):
        conn.close()
        log_event("LOGIN_FAILED", username=username, pc_name=pc_name, ip_address=ip_addr, details="Invalid credentials")
        return jsonify({"success": False, "message": "Invalid Username or Password"}), 401

    if 'is_active' in student.keys() and student['is_active'] == 0:
        conn.close()
        log_event("LOGIN_BLOCKED", username=username, pc_name=pc_name, ip_address=ip_addr, details="Account disabled by admin")
        return jsonify({"success": False, "message": "Your account has been deactivated. Please contact the Lab Administrator."}), 403

    # Close previous active sessions for this PC or user
    cursor.execute("""
        UPDATE session_logs 
        SET status = 'replaced', logout_time = CURRENT_TIMESTAMP,
            duration_minutes = CAST((strftime('%s', 'now') - strftime('%s', login_time)) / 60 AS INTEGER)
        WHERE (username = ? OR pc_name = ?) AND status = 'active'
    """, (username, pc_name))

    # Create new active session
    cursor.execute(
        "INSERT INTO session_logs (username, full_name, roll_no, pc_name, ip_address, status) VALUES (?, ?, ?, ?, ?, 'active')",
        (username, student['full_name'], student['roll_no'], pc_name, ip_addr)
    )
    session_id = cursor.lastrowid

    # Update lab_systems status to active and assign current_user
    cursor.execute("""
        UPDATE lab_systems 
        SET status = 'active', current_user = ?, last_seen = CURRENT_TIMESTAMP, ip_address = ?
        WHERE pc_name = ?
    """, (username, ip_addr, pc_name))

    conn.commit()
    conn.close()

    log_event("LOGIN_SUCCESS", username=username, pc_name=pc_name, ip_address=ip_addr, details=f"Roll: {student['roll_no']}, Session ID: {session_id}")

    return jsonify({
        "success": True,
        "session_id": session_id,
        "full_name": student['full_name'],
        "roll_no": student['roll_no']
    })

@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    data = request.json or {}
    session_id = data.get('session_id')
    status = data.get('status', 'active')
    username = data.get('username')
    pc_name = data.get('pc_name')
    ip_addr = request.remote_addr or '127.0.0.1'

    conn = get_db()
    cursor = conn.cursor()

    # Check for pending remote command for this PC
    cursor.execute("SELECT pending_command FROM lab_systems WHERE pc_name = ?", (pc_name,))
    row = cursor.fetchone()
    cmd = row['pending_command'] if row and row['pending_command'] else ""

    # Clear command after delivery
    if cmd:
        cursor.execute("UPDATE lab_systems SET pending_command = '' WHERE pc_name = ?", (pc_name,))

    if session_id and status in ['logout', 'idle_shutdown', 'admin_logout']:
        cursor.execute("""
            UPDATE session_logs 
            SET status = ?, logout_time = CURRENT_TIMESTAMP,
                duration_minutes = CAST((strftime('%s', 'now') - strftime('%s', login_time)) / 60 AS INTEGER)
            WHERE id = ?
        """, (status, session_id))
        log_event(f"SESSION_{status.upper()}", username=username, pc_name=pc_name, ip_address=ip_addr, details=f"Session ID {session_id} ended")
        
        cursor.execute("UPDATE lab_systems SET status = 'ready', current_user = NULL, last_seen = CURRENT_TIMESTAMP WHERE pc_name = ?", (pc_name,))
    else:
        # Normal heartbeat update
        cursor.execute("UPDATE lab_systems SET last_seen = CURRENT_TIMESTAMP WHERE pc_name = ?", (pc_name,))

    conn.commit()
    conn.close()

    return jsonify({"success": True, "command": cmd})

@app.route('/api/exam_status', methods=['GET'])
def get_exam_status():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key = 'exam_mode'")
    row = cursor.fetchone()
    conn.close()
    is_exam = (row['value'] == '1') if row else False
    return jsonify({"success": True, "exam_mode": is_exam})

@app.route('/api/log_event', methods=['POST'])
def client_log_event():
    data = request.json or {}
    log_event(
        event_type=data.get('event_type', 'CLIENT_EVENT'),
        username=data.get('username'),
        pc_name=data.get('pc_name'),
        ip_address=request.remote_addr or '127.0.0.1',
        details=data.get('details')
    )
    return jsonify({"success": True})

@app.route('/api/shared_files/latest', methods=['GET'])
def get_latest_files():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, file_name, file_size, uploaded_at FROM shared_files ORDER BY id DESC LIMIT 10")
    files = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "files": files})

@app.route('/api/download/<int:file_id>', methods=['GET'])
def download_file(file_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM shared_files WHERE id = ?", (file_id,))
    file_record = cursor.fetchone()
    conn.close()

    if not file_record:
        return jsonify({"error": "File not found"}), 404

    return send_from_directory(UPLOAD_FOLDER, file_record['file_name'], as_attachment=True)

# ----------------- ADMIN DASHBOARD ----------------- #

ADMIN_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IIBS Computer Lab Master Control</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body { background-color: #0b1120; color: #f8fafc; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
        .sidebar { background: #0f172a; border-right: 1px solid #1e293b; min-height: 100vh; }
        .nav-link { color: #94a3b8; border-radius: 8px; margin-bottom: 4px; font-weight: 500; font-size: 0.95rem; }
        .nav-link:hover, .nav-link.active { background: #1e293b; color: #38bdf8; }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; }
        .card-custom { background: #1e293b; border: 1px solid #334155; border-radius: 12px; }
        .table { color: #e2e8f0; }
        .table thead th { background: #0f172a; color: #94a3b8; border-bottom: 2px solid #334155; font-size: 0.85rem; text-transform: uppercase; }
        .table td { border-bottom: 1px solid #334155; }
        .pc-tile {
            background: #0f172a;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
        }
        .pc-tile:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            border-color: #38bdf8;
        }
        .pc-tile.status-active { border-top: 4px solid #22c55e; }
        .pc-tile.status-ready { border-top: 4px solid #38bdf8; }
        .pc-tile.status-offline { border-top: 4px solid #64748b; opacity: 0.7; }
        .badge-active { background-color: #166534; color: #4ade80; }
        .badge-ready { background-color: #075985; color: #38bdf8; }
        .badge-offline { background-color: #334155; color: #94a3b8; }
    </style>
</head>
<body>

<div class="container-fluid">
    <div class="row">
        <!-- Sidebar -->
        <div class="col-md-2 p-3 sidebar">
            <div class="d-flex align-items-center mb-4 px-2">
                <i class="fa-solid fa-server fa-2x text-primary me-2"></i>
                <div>
                    <h5 class="mb-0 fw-bold text-white">IIBS Lab</h5>
                    <small class="text-secondary">Master Control Server</small>
                </div>
            </div>

            <ul class="nav flex-column mb-auto">
                <li class="nav-item">
                    <a href="#systems-grid" class="nav-link active" onclick="showTab('systems-grid')">
                        <i class="fa-solid fa-desktop me-2"></i> 100 PC Grid
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#active-sessions" class="nav-link" onclick="showTab('active-sessions')">
                        <i class="fa-solid fa-users me-2"></i> Active Sessions
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#students-mgmt" class="nav-link" onclick="showTab('students-mgmt')">
                        <i class="fa-solid fa-id-card me-2"></i> Student Logins
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#usage-history" class="nav-link" onclick="showTab('usage-history')">
                        <i class="fa-solid fa-clock-rotate-left me-2"></i> Usage History
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#audit-logs" class="nav-link" onclick="showTab('audit-logs')">
                        <i class="fa-solid fa-shield-halved me-2"></i> System Audit Logs
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#file-broadcast" class="nav-link text-warning" onclick="showTab('file-broadcast')">
                        <i class="fa-solid fa-cloud-arrow-up me-2"></i> File Broadcast
                    </a>
                </li>
                <li class="nav-item">
                    <a href="#service-requests" class="nav-link text-info" onclick="showTab('service-requests')">
                        <i class="fa-solid fa-headset me-2"></i> IIBS Service Portal
                    </a>
                </li>
            </ul>

            <hr class="border-secondary my-4">

            <div class="px-2">
                <div class="small text-muted mb-2">MASTER ACTIONS</div>
                <button class="btn btn-sm btn-outline-danger w-100 mb-2" onclick="batchCommand('lock')">
                    <i class="fa-solid fa-lock me-1"></i> Lock All PCs
                </button>
                <button class="btn btn-sm btn-outline-warning w-100 mb-2" onclick="batchCommand('shutdown')">
                    <i class="fa-solid fa-power-off me-1"></i> Shutdown All PCs
                </button>
                <a href="/admin/api/export_history" class="btn btn-sm btn-outline-info w-100 mb-2">
                    <i class="fa-solid fa-file-csv me-1"></i> Export Usage (CSV)
                </a>
            </div>
        </div>

        <!-- Main Content -->
        <div class="col-md-10 p-4" style="max-height: 100vh; overflow-y: auto;">
            
            <!-- Top Controls Banner -->
            <div class="card-custom p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                    <h4 class="mb-0 fw-bold">Computer Lab Control Console</h4>
                    <span class="text-secondary small">Server LAN IP: <code class="text-info">http://192.168.14.250:5000</code> / <code class="text-info">http://192.168.6.189:5000</code></span>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <a href="https://iibsservicerequest.vercel.app/admin.html" target="_blank" class="btn btn-outline-info btn-sm px-3 fw-bold">
                        <i class="fa-solid fa-arrow-up-right-from-square me-1"></i> Open Service Request Portal
                    </a>
                    <span id="examStatusBadge" class="badge bg-secondary p-2">Exam Mode: Inactive</span>
                    <button id="examToggleBtn" class="btn btn-danger btn-sm px-3 fw-bold" onclick="toggleExamMode()">
                        <i class="fa-solid fa-ban me-1"></i> Enable Exam Mode (Block Internet)
                    </button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="stat-card p-3">
                        <div class="text-secondary small">CONNECTED SYSTEMS</div>
                        <h2 class="fw-bold mb-0 text-info" id="stat-total-systems">0 / 100</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card p-3">
                        <div class="text-secondary small">ACTIVE STUDENT SESSIONS</div>
                        <h2 class="fw-bold mb-0 text-success" id="stat-active-sessions">0</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card p-3">
                        <div class="text-secondary small">REGISTERED STUDENTS</div>
                        <h2 class="fw-bold mb-0 text-white" id="stat-total-students">0</h2>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card p-3">
                        <div class="text-secondary small">TOTAL LOGS RECORDED</div>
                        <h2 class="fw-bold mb-0 text-warning" id="stat-total-logs">0</h2>
                    </div>
                </div>
            </div>

            <!-- TAB 1: 100 PC GRID & SYSTEM DETAILS -->
            <div id="tab-systems-grid" class="tab-content">
                <div class="card-custom p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0"><i class="fa-solid fa-network-wired text-info me-2"></i>Lab Systems Hardware & Live Status</h5>
                        <div class="d-flex gap-2">
                            <span class="badge badge-active p-2"><i class="fa-solid fa-circle fa-2xs me-1"></i> In Use (Logged In)</span>
                            <span class="badge badge-ready p-2"><i class="fa-solid fa-circle fa-2xs me-1"></i> Ready (Locked)</span>
                            <span class="badge badge-offline p-2"><i class="fa-solid fa-circle fa-2xs me-1"></i> Offline / Unreachable</span>
                        </div>
                    </div>
                    
                    <div class="row g-2" id="systemsGridContainer">
                        <div class="col-12 text-center text-secondary py-5">Scanning lab systems...</div>
                    </div>
                </div>
            </div>

            <!-- TAB 2: ACTIVE SESSIONS -->
            <div id="tab-active-sessions" class="tab-content" style="display: none;">
                <div class="card-custom p-4 mb-4">
                    <h5 class="fw-bold mb-3"><i class="fa-solid fa-user-check text-success me-2"></i>Currently Active Student Sessions</h5>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>PC Hostname</th>
                                    <th>Student Name</th>
                                    <th>Roll Number</th>
                                    <th>User ID</th>
                                    <th>LAN IP</th>
                                    <th>Login Time</th>
                                    <th>Session Duration</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody id="activeSessionsTable">
                                <tr><td colspan="8" class="text-center text-secondary">No active sessions</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 3: STUDENT MANAGEMENT & PASSWORDS -->
            <div id="tab-students-mgmt" class="tab-content" style="display: none;">
                <div class="card-custom p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                            <h5 class="fw-bold mb-0"><i class="fa-solid fa-users-gear text-primary me-2"></i>Student Accounts & Password Reset</h5>
                            <small class="text-secondary">Students cannot change passwords themselves. Passwords are reset exclusively by you here.</small>
                        </div>
                        <input type="text" id="searchStudentInput" class="form-control form-control-sm w-25 bg-dark text-white border-secondary" placeholder="Search Roll No / Name..." onkeyup="filterStudents()">
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>Roll No</th>
                                    <th>Full Name</th>
                                    <th>User ID</th>
                                    <th>Registered Date</th>
                                    <th>Total Sessions</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="studentsTable">
                                <tr><td colspan="6" class="text-center text-secondary">Loading students...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 4: USAGE HISTORY -->
            <div id="tab-usage-history" class="tab-content" style="display: none;">
                <div class="card-custom p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <div>
                            <h5 class="fw-bold mb-0"><i class="fa-solid fa-chart-line text-warning me-2"></i>Complete Lab System Usage History</h5>
                            <small class="text-secondary">Track session duration, student who used each PC, and exact sign-off reason.</small>
                        </div>
                        <div class="d-flex gap-2">
                            <input type="text" id="searchHistoryInput" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="Filter by PC or Student..." onkeyup="filterHistory()">
                            <a href="/admin/api/export_history" class="btn btn-sm btn-outline-info text-nowrap">
                                <i class="fa-solid fa-download me-1"></i> Export History CSV
                            </a>
                        </div>
                    </div>
                    <div class="table-responsive" style="max-height: 550px; overflow-y: auto;">
                        <table class="table table-hover align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Date & Time</th>
                                    <th>PC Hostname</th>
                                    <th>Student Name</th>
                                    <th>Roll Number</th>
                                    <th>Login Time</th>
                                    <th>Logout Time</th>
                                    <th>Duration</th>
                                    <th>Status / Sign-off</th>
                                </tr>
                            </thead>
                            <tbody id="usageHistoryTable">
                                <tr><td colspan="8" class="text-center text-secondary">No history recorded yet</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 5: SYSTEM AUDIT LOGS -->
            <div id="tab-audit-logs" class="tab-content" style="display: none;">
                <div class="card-custom p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0"><i class="fa-solid fa-shield-halved text-danger me-2"></i>System & Security Audit Trail</h5>
                        <a href="/admin/api/export_logs" class="btn btn-sm btn-outline-success">
                            <i class="fa-solid fa-file-csv me-1"></i> Export Audit Logs
                        </a>
                    </div>
                    <div class="table-responsive" style="max-height: 550px; overflow-y: auto;">
                        <table class="table table-sm table-striped align-middle">
                            <thead class="sticky-top">
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Event</th>
                                    <th>Student</th>
                                    <th>PC Name</th>
                                    <th>LAN IP</th>
                                    <th>Event Details</th>
                                </tr>
                            </thead>
                            <tbody id="auditLogsTable">
                                <tr><td colspan="6" class="text-center text-secondary">No logs recorded yet</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 6: FILE BROADCAST TO ALL STUDENT PCS -->
            <div id="tab-file-broadcast" class="tab-content" style="display: none;">
                <div class="card-custom p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="fw-bold mb-0"><i class="fa-solid fa-cloud-arrow-up text-warning me-2"></i>One-Click File Broadcast to All Student PCs</h5>
                            <small class="text-secondary">Upload any file (question paper, code template, software setup) and it automatically downloads to every connected student's Desktop.</small>
                        </div>
                    </div>
                    
                    <div class="row g-3 align-items-center p-3 mb-4 rounded bg-dark border border-secondary">
                        <div class="col-md-8">
                            <label class="form-label text-secondary small">CHOOSE FILE TO COPY TO ALL PCS</label>
                            <input type="file" class="form-control bg-dark text-white border-secondary" id="broadcastFileInput" required>
                        </div>
                        <div class="col-md-4 d-flex align-items-end">
                            <button type="button" class="btn btn-warning w-100 fw-bold py-2 mt-4" onclick="uploadAndBroadcastFile()">
                                <i class="fa-solid fa-paper-plane me-2"></i> Broadcast File to All PCs
                            </button>
                        </div>
                        <div class="col-12">
                            <div id="broadcastStatusText" class="small fw-bold text-info"></div>
                        </div>
                    </div>

                    <h6 class="fw-bold text-white mb-2"><i class="fa-solid fa-clock-rotate-left me-2"></i>Recently Broadcasted Files</h6>
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th>File Name</th>
                                    <th>Size</th>
                                    <th>Uploaded At</th>
                                    <th>Destination on Student PCs</th>
                                </tr>
                            </thead>
                            <tbody id="broadcastFilesTable">
                                <tr><td colspan="4" class="text-center text-secondary">No files shared yet</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB 6: IIBS SERVICE REQUEST PORTAL EMBED -->
            <div id="tab-service-requests" class="tab-content" style="display: none;">
                <div class="card-custom p-3 mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h5 class="fw-bold mb-0"><i class="fa-solid fa-headset text-info me-2"></i>IIBS Service Request Portal</h5>
                            <small class="text-secondary">Direct access to <a href="https://iibsservicerequest.vercel.app/admin.html" target="_blank" class="text-info">https://iibsservicerequest.vercel.app/admin.html</a></small>
                        </div>
                        <a href="https://iibsservicerequest.vercel.app/admin.html" target="_blank" class="btn btn-sm btn-info text-dark fw-bold">
                            <i class="fa-solid fa-external-link me-1"></i> Open in New Window
                        </a>
                    </div>
                    <div style="border-radius: 8px; overflow: hidden; border: 1px solid #334155; height: 75vh; background: #0f172a;">
                        <iframe src="https://iibsservicerequest.vercel.app/admin.html" style="width: 100%; height: 100%; border: none;"></iframe>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>

<!-- Modal: PC Details & Individual Remote Control -->
<div class="modal fade" id="pcDetailModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white border-secondary">
            <div class="modal-header border-secondary">
                <h5 class="modal-title fw-bold" id="modalPcTitle">PC System Details</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="modalPcBody">
                <!-- Dynamically populated -->
            </div>
            <div class="modal-footer border-secondary d-flex justify-content-between">
                <div>
                    <button class="btn btn-sm btn-outline-warning" onclick="sendPcCommand('lock')"><i class="fa-solid fa-lock me-1"></i>Lock</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="sendPcCommand('logout')"><i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Log Out</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="sendPcCommand('shutdown')"><i class="fa-solid fa-power-off me-1"></i>Shutdown</button>
                    <button class="btn btn-sm btn-outline-info" onclick="sendPcCommand('reboot')"><i class="fa-solid fa-rotate-right me-1"></i>Reboot</button>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>

<!-- Modal: Admin Password Reset -->
<div class="modal fade" id="passwordResetModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-white border-secondary">
            <div class="modal-header border-secondary">
                <h5 class="modal-title fw-bold">Reset Student Password</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <p>Resetting password for: <strong class="text-info" id="resetUsernameDisplay"></strong> (<span id="resetRollDisplay"></span>)</p>
                <div class="mb-3">
                    <label class="form-label text-secondary small">NEW PASSWORD</label>
                    <input type="password" id="adminNewPassword" class="form-control bg-dark text-white border-secondary" placeholder="Enter new password for student">
                </div>
            </div>
            <div class="modal-footer border-secondary">
                <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary btn-sm px-3" onclick="confirmPasswordReset()">Save New Password</button>
            </div>
        </div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
let globalData = {};
let selectedPcName = "";
let selectedResetUser = "";

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    document.getElementById('tab-' + tabName).style.display = 'block';
    event.target.classList.add('active');
}

async function loadData() {
    try {
        const res = await fetch('/admin/api/full_overview');
        const data = await res.json();
        globalData = data;

        // Update stats
        document.getElementById('stat-total-systems').innerText = data.systems.length + " / 100";
        document.getElementById('stat-active-sessions').innerText = data.active_sessions.length;
        document.getElementById('stat-total-students').innerText = data.students.length;
        document.getElementById('stat-total-logs').innerText = data.system_logs.length;

        // Exam status
        const examBtn = document.getElementById('examToggleBtn');
        const examBadge = document.getElementById('examStatusBadge');
        if (data.exam_mode) {
            examBadge.className = 'badge bg-danger p-2';
            examBadge.innerText = 'Exam Mode: ACTIVE (Internet Disabled)';
            examBtn.className = 'btn btn-outline-success btn-sm px-3 fw-bold';
            examBtn.innerHTML = '<i class="fa-solid fa-check me-1"></i> End Exam & Restore Internet';
        } else {
            examBadge.className = 'badge bg-secondary p-2';
            examBadge.innerText = 'Exam Mode: Inactive';
            examBtn.className = 'btn btn-danger btn-sm px-3 fw-bold';
            examBtn.innerHTML = '<i class="fa-solid fa-ban me-1"></i> Enable Exam Mode (Block Internet)';
        }

        renderSystemsGrid(data.systems);
        renderActiveSessions(data.active_sessions);
        renderStudents(data.students);
        renderHistory(data.history);
        renderAuditLogs(data.system_logs);
        renderBroadcastFiles(data.shared_files);
    } catch(e) {
        console.error("Data load error:", e);
    }
}

function renderBroadcastFiles(files) {
    const tbody = document.getElementById('broadcastFilesTable');
    if (!files || files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary py-3">No files broadcasted yet</td></tr>';
        return;
    }
    tbody.innerHTML = files.map(f => `
        <tr>
            <td><strong class="text-white"><i class="fa-solid fa-file me-2 text-warning"></i>${f.file_name}</strong></td>
            <td>${Math.round(f.file_size / 1024)} KB</td>
            <td class="text-secondary small">${f.uploaded_at}</td>
            <td><code class="text-info">Desktop\\Lab_Shared_Files\\${f.file_name}</code></td>
        </tr>
    `).join('');
}

async function uploadAndBroadcastFile() {
    const fileInput = document.getElementById('broadcastFileInput');
    const statusText = document.getElementById('broadcastStatusText');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Please select a file to broadcast");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    statusText.innerText = `Broadcasting "${file.name}" to all student systems...`;

    try {
        const res = await fetch('/admin/api/upload_file', {
            method: 'POST',
            body: formData
        });
        const result = await res.json();
        if (result.success) {
            statusText.innerText = `SUCCESS: "${file.name}" uploaded and queued for all student PCs!`;
            fileInput.value = '';
            loadData();
        } else {
            statusText.innerText = "Error: " + (result.message || "Failed to broadcast");
        }
    } catch(err) {
        statusText.innerText = "Error uploading file: " + err;
    }
}

function renderSystemsGrid(systems) {
    const grid = document.getElementById('systemsGridContainer');
    if (!systems || systems.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center text-secondary py-5">No lab PCs have registered with the master server yet.<br><small>Start `start_client.bat` on the lab systems to see them appear here.</small></div>';
        return;
    }

    grid.innerHTML = systems.map(pc => {
        let statusClass = 'status-offline';
        let badgeClass = 'badge-offline';
        let displayStatus = 'Offline';

        if (pc.is_online) {
            if (pc.status === 'active') {
                statusClass = 'status-active';
                badgeClass = 'badge-active';
                displayStatus = pc.current_user || 'Active';
            } else {
                statusClass = 'status-ready';
                badgeClass = 'badge-ready';
                displayStatus = 'Ready / Locked';
            }
        }

        return `
            <div class="col-xl-2 col-lg-3 col-md-4 col-sm-6">
                <div class="pc-tile ${statusClass}" onclick="openPcModal('${pc.pc_name}')">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <i class="fa-solid fa-desktop ${pc.is_online ? 'text-info' : 'text-secondary'}"></i>
                        <span class="badge ${badgeClass} small" style="font-size: 0.65rem;">${displayStatus}</span>
                    </div>
                    <div class="fw-bold text-white small text-truncate" title="${pc.pc_name}">${pc.pc_name}</div>
                    <div class="text-secondary" style="font-size: 0.72rem;">${pc.ip_address || 'No IP'}</div>
                    <div class="text-secondary" style="font-size: 0.70rem;">RAM: ${pc.ram_gb || '?'}GB | ${pc.disk_free_gb || '?'}GB Free</div>
                </div>
            </div>
        `;
    }).join('');
}

function openPcModal(pcName) {
    selectedPcName = pcName;
    const pc = (globalData.systems || []).find(s => s.pc_name === pcName);
    if (!pc) return;

    document.getElementById('modalPcTitle').innerText = pc.pc_name;
    document.getElementById('modalPcBody').innerHTML = `
        <div class="row g-2 small">
            <div class="col-6"><span class="text-secondary">LAN IP:</span> <code class="text-info">${pc.ip_address}</code></div>
            <div class="col-6"><span class="text-secondary">MAC Address:</span> <code>${pc.mac_address || 'N/A'}</code></div>
            <div class="col-12"><span class="text-secondary">Processor:</span> <span class="text-white">${pc.cpu_info || 'Unknown'}</span></div>
            <div class="col-6"><span class="text-secondary">RAM:</span> <span class="text-white">${pc.ram_gb} GB</span></div>
            <div class="col-6"><span class="text-secondary">Free Disk:</span> <span class="text-white">${pc.disk_free_gb} GB</span></div>
            <div class="col-12"><span class="text-secondary">Operating System:</span> <span class="text-white">${pc.os_version || 'Windows'}</span></div>
            <div class="col-6"><span class="text-secondary">Status:</span> <span class="badge ${pc.status === 'active' ? 'bg-success' : 'bg-primary'}">${pc.status}</span></div>
            <div class="col-6"><span class="text-secondary">Current User:</span> <strong class="text-info">${pc.current_user || 'None (Locked)'}</strong></div>
            <div class="col-12"><span class="text-secondary">Last Seen:</span> <span class="text-muted">${pc.last_seen}</span></div>
        </div>
    `;
    const modal = new bootstrap.Modal(document.getElementById('pcDetailModal'));
    modal.show();
}

async function sendPcCommand(cmd) {
    if (!selectedPcName) return;
    if (!confirm(`Send remote command "${cmd.toUpperCase()}" to ${selectedPcName}?`)) return;

    const res = await fetch('/admin/api/send_command', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pc_name: selectedPcName, command: cmd })
    });
    const result = await res.json();
    alert(result.message || 'Command queued!');
    bootstrap.Modal.getInstance(document.getElementById('pcDetailModal')).hide();
    loadData();
}

async function batchCommand(cmd) {
    if (!confirm(`Are you sure you want to broadcast "${cmd.toUpperCase()}" to ALL Lab PCs?`)) return;
    const res = await fetch('/admin/api/batch_command', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ command: cmd })
    });
    const result = await res.json();
    alert(result.message);
    loadData();
}

function renderActiveSessions(sessions) {
    const tbody = document.getElementById('activeSessionsTable');
    if (!sessions || sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-3">No active sessions</td></tr>';
        return;
    }
    tbody.innerHTML = sessions.map(s => `
        <tr>
            <td><strong class="text-white">${s.pc_name}</strong></td>
            <td>${s.full_name || 'N/A'}</td>
            <td><span class="badge bg-secondary">${s.roll_no || 'N/A'}</span></td>
            <td><code class="text-info">${s.username}</code></td>
            <td>${s.ip_address}</td>
            <td>${s.login_time}</td>
            <td><span class="badge bg-primary">${calculateDuration(s.login_time)}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-danger" onclick="forceLogoutUser('${s.username}', '${s.pc_name}')">
                    <i class="fa-solid fa-arrow-right-from-bracket me-1"></i> Force Logout
                </button>
            </td>
        </tr>
    `).join('');
}

function calculateDuration(startTimeStr) {
    try {
        const start = new Date(startTimeStr.replace(' ', 'T'));
        const now = new Date();
        const diffMs = now - start;
        const mins = Math.floor(diffMs / 60000);
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return hrs > 0 ? `${hrs}h ${remMins}m` : `${mins}m`;
    } catch(e) {
        return 'Active';
    }
}

async function forceLogoutUser(username, pcName) {
    if (!confirm(`Force log out student ${username} from ${pcName}?`)) return;
    await fetch('/admin/api/send_command', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pc_name: pcName, command: 'logout' })
    });
    alert(`Logout command sent to ${pcName}`);
    loadData();
}

function renderStudents(students) {
    const tbody = document.getElementById('studentsTable');
    if (!students || students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-3">No registered students yet</td></tr>';
        return;
    }
    tbody.innerHTML = students.map(st => `
        <tr>
            <td><strong class="text-info">${st.roll_no}</strong></td>
            <td>${st.full_name}</td>
            <td><code>${st.username}</code></td>
            <td>${st.created_at}</td>
            <td>${st.total_sessions || 0}</td>
            <td>
                <button class="btn btn-sm btn-outline-warning" onclick="openResetModal('${st.username}', '${st.roll_no}')">
                    <i class="fa-solid fa-key me-1"></i> Reset Password
                </button>
            </td>
        </tr>
    `).join('');
}

function openResetModal(username, rollNo) {
    selectedResetUser = username;
    document.getElementById('resetUsernameDisplay').innerText = username;
    document.getElementById('resetRollDisplay').innerText = rollNo;
    document.getElementById('adminNewPassword').value = '';
    const modal = new bootstrap.Modal(document.getElementById('passwordResetModal'));
    modal.show();
}

async function confirmPasswordReset() {
    const newPwd = document.getElementById('adminNewPassword').value.trim();
    if (!newPwd) {
        alert("Please enter a new password");
        return;
    }
    const res = await fetch('/admin/api/reset_password', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: selectedResetUser, new_password: newPwd })
    });
    const result = await res.json();
    alert(result.message || 'Password updated successfully!');
    bootstrap.Modal.getInstance(document.getElementById('passwordResetModal')).hide();
}

function renderHistory(history) {
    const tbody = document.getElementById('usageHistoryTable');
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary py-3">No history recorded yet</td></tr>';
        return;
    }
    tbody.innerHTML = history.map(h => {
        let durationText = h.duration_minutes ? `${h.duration_minutes} mins` : '-';
        let statusBadge = '<span class="badge bg-secondary">Completed</span>';
        if (h.status === 'active') statusBadge = '<span class="badge bg-success">Active Now</span>';
        else if (h.status === 'idle_shutdown') statusBadge = '<span class="badge bg-warning text-dark">Idle Auto-Shutdown</span>';
        else if (h.status === 'logout') statusBadge = '<span class="badge bg-primary">Logged Out</span>';

        return `
            <tr>
                <td>${h.login_time}</td>
                <td><strong class="text-white">${h.pc_name}</strong></td>
                <td>${h.full_name || 'N/A'}</td>
                <td><span class="badge bg-secondary">${h.roll_no || 'N/A'}</span></td>
                <td>${h.login_time}</td>
                <td>${h.logout_time || 'In Progress'}</td>
                <td><strong>${durationText}</strong></td>
                <td>${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function renderAuditLogs(logs) {
    const tbody = document.getElementById('auditLogsTable');
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-secondary py-3">No audit logs recorded</td></tr>';
        return;
    }
    tbody.innerHTML = logs.map(l => `
        <tr>
            <td class="text-secondary small">${l.timestamp}</td>
            <td><span class="badge bg-dark border border-secondary">${l.event_type}</span></td>
            <td>${l.username || '-'}</td>
            <td>${l.pc_name || '-'}</td>
            <td><code>${l.ip_address || '-'}</code></td>
            <td class="small text-muted">${l.details || ''}</td>
        </tr>
    `).join('');
}

function filterStudents() {
    const term = document.getElementById('searchStudentInput').value.toLowerCase();
    const filtered = (globalData.students || []).filter(s => 
        (s.roll_no && s.roll_no.toLowerCase().includes(term)) ||
        (s.full_name && s.full_name.toLowerCase().includes(term)) ||
        (s.username && s.username.toLowerCase().includes(term))
    );
    renderStudents(filtered);
}

function filterHistory() {
    const term = document.getElementById('searchHistoryInput').value.toLowerCase();
    const filtered = (globalData.history || []).filter(h => 
        (h.pc_name && h.pc_name.toLowerCase().includes(term)) ||
        (h.roll_no && h.roll_no.toLowerCase().includes(term)) ||
        (h.full_name && h.full_name.toLowerCase().includes(term)) ||
        (h.username && h.username.toLowerCase().includes(term))
    );
    renderHistory(filtered);
}

async function toggleExamMode() {
    const current = globalData.exam_mode;
    const actionStr = current ? "End Exam Mode and Restore Internet" : "Enable Exam Mode and Block Internet";
    if (!confirm(`Are you sure you want to ${actionStr} across all 100 Lab PCs?`)) return;

    await fetch('/admin/api/toggle_exam', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ enable: !current })
    });
    loadData();
}

// Refresh every 5 seconds
setInterval(loadData, 5000);
loadData();
</script>
</body>
</html>
"""

@app.route('/')
def root_redirect():
    from flask import redirect
    return redirect('/admin')

@app.route('/admin')
def admin_portal():
    return render_template_string(ADMIN_HTML)

@app.route('/admin/api/full_overview')
def full_overview():
    conn = get_db()
    cursor = conn.cursor()

    # Systems with computed online state (< 25s threshold)
    cursor.execute("""
        SELECT *, 
            CASE WHEN (strftime('%s', 'now') - strftime('%s', last_seen)) < 25 THEN 1 ELSE 0 END AS is_online
        FROM lab_systems 
        ORDER BY pc_name ASC
    """)
    systems = [dict(row) for row in cursor.fetchall()]

    # Active sessions
    cursor.execute("SELECT * FROM session_logs WHERE status = 'active' ORDER BY login_time DESC")
    active_sessions = [dict(row) for row in cursor.fetchall()]

    # Registered students with session counts
    cursor.execute("""
        SELECT s.id, s.username, s.full_name, s.roll_no, s.created_at, 
               COUNT(sl.id) as total_sessions
        FROM students s
        LEFT JOIN session_logs sl ON s.username = sl.username
        GROUP BY s.id
        ORDER BY s.id DESC
    """)
    students = [dict(row) for row in cursor.fetchall()]

    # Complete history
    cursor.execute("SELECT * FROM session_logs ORDER BY id DESC LIMIT 200")
    history = [dict(row) for row in cursor.fetchall()]

    # System Logs
    cursor.execute("SELECT * FROM system_logs ORDER BY id DESC LIMIT 150")
    system_logs = [dict(row) for row in cursor.fetchall()]

    # Shared Files
    cursor.execute("SELECT id, file_name, file_size, uploaded_at FROM shared_files ORDER BY id DESC LIMIT 20")
    shared_files = [dict(row) for row in cursor.fetchall()]

    # Exam Mode
    cursor.execute("SELECT value FROM system_settings WHERE key = 'exam_mode'")
    row = cursor.fetchone()
    exam_mode = (row['value'] == '1') if row else False

    conn.close()

    return jsonify({
        "systems": systems,
        "active_sessions": active_sessions,
        "students": students,
        "history": history,
        "system_logs": system_logs,
        "shared_files": shared_files,
        "exam_mode": exam_mode
    })

@app.route('/admin/api/send_command', methods=['POST'])
def send_command():
    data = request.json or {}
    pc_name = data.get('pc_name')
    cmd = data.get('command')

    if not pc_name or not cmd:
        return jsonify({"success": False, "message": "Missing PC name or command"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE lab_systems SET pending_command = ? WHERE pc_name = ?", (cmd, pc_name))
    conn.commit()
    conn.close()

    log_event("ADMIN_COMMAND", pc_name=pc_name, details=f"Admin sent command: {cmd.upper()}")
    return jsonify({"success": True, "message": f"Command '{cmd.upper()}' queued for {pc_name}"})

@app.route('/admin/api/batch_command', methods=['POST'])
def batch_command():
    data = request.json or {}
    cmd = data.get('command')

    if not cmd:
        return jsonify({"success": False, "message": "Missing command"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE lab_systems SET pending_command = ?", (cmd,))
    conn.commit()
    conn.close()

    log_event("ADMIN_BATCH_COMMAND", details=f"Admin queued batch command: {cmd.upper()} to all lab systems")
    return jsonify({"success": True, "message": f"Batch command '{cmd.upper()}' dispatched to all lab systems"})

@app.route('/admin/api/reset_password', methods=['POST'])
def reset_password():
    data = request.json or {}
    username = data.get('username')
    new_pwd = data.get('new_password')

    if not username or not new_pwd:
        return jsonify({"success": False, "message": "Missing username or password"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE students SET password_hash = ? WHERE username = ?", (hash_password(new_pwd), username))
    conn.commit()
    conn.close()

    log_event("ADMIN_PASSWORD_RESET", username=username, details="Admin reset student password upon in-person request")
    return jsonify({"success": True, "message": f"Password for {username} updated successfully!"})

@app.route('/admin/api/toggle_exam', methods=['POST'])
def admin_toggle_exam():
    data = request.json or {}
    enable = data.get('enable', False)
    val = '1' if enable else '0'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE system_settings SET value = ? WHERE key = 'exam_mode'", (val,))
    conn.commit()
    conn.close()

    event_txt = "EXAM_MODE_ENABLED" if enable else "EXAM_MODE_DISABLED"
    detail_txt = "Exam mode started: external internet disabled across all lab PCs." if enable else "Exam mode ended: normal internet restored across all lab PCs."
    log_event(event_txt, details=detail_txt)

    return jsonify({"success": True, "exam_mode": enable})

@app.route('/admin/api/upload_file', methods=['POST'])
def admin_upload_file():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file attached"}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Empty filename"}), 400

    filename = secure_filename(file.filename)
    dest_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(dest_path)
    file_size = os.path.getsize(dest_path)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO shared_files (file_name, file_path, file_size) VALUES (?, ?, ?)",
        (filename, dest_path, file_size)
    )
    conn.commit()
    conn.close()

    log_event("FILE_BROADCAST", details=f"Broadcasted file: {filename} ({round(file_size/1024, 1)} KB)")
    return jsonify({"success": True, "message": f"File '{filename}' broadcasted to all lab PCs!"})

@app.route('/admin/api/export_history')
def export_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, pc_name, username, full_name, roll_no, ip_address, login_time, logout_time, duration_minutes, status FROM session_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Session ID", "PC Hostname", "User ID", "Full Name", "Roll Number", "IP Address", "Login Time", "Logout Time", "Duration (Minutes)", "Sign-off Reason"])
    for r in rows:
        writer.writerow(list(r))

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=IIBS_Lab_Usage_History_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@app.route('/admin/api/export_logs')
def export_logs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, timestamp, event_type, username, pc_name, ip_address, details FROM system_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Log ID", "Timestamp", "Event Type", "Student Username", "PC Hostname", "IP Address", "Event Details"])
    for r in rows:
        writer.writerow(list(r))

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": f"attachment; filename=IIBS_Lab_Audit_Logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

if __name__ == '__main__':
    import webbrowser
    import threading

    def _open_browser():
        time.sleep(1.5)
        webbrowser.open("http://127.0.0.1:5050/admin")

    threading.Thread(target=_open_browser, daemon=True).start()

    print("=" * 60)
    print(" IIBS Computer Lab Master Server is running!")
    print(" Access Admin Portal locally at: http://127.0.0.1:5050/admin")
    print(" Access from other LAN PCs at: http://192.168.14.250:5050/admin")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5050, debug=False)
