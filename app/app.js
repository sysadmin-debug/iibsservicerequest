/**
 * Babu Raju Ram Fuel Station - Attendance Management System
 * Frontend Application Logic
 */

function getLocalDateString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Application State
const state = {
  staff: [],
  attendance: [],
  shifts: [],
  dashboard: {},
  filterShift: 'ALL',
  filterDevice: 'ALL',
  filterCategory: 'Staff',
  fromDate: '2026-09-14',
  toDate: getLocalDateString(),
  filterDate: getLocalDateString(),
  searchQuery: ''
};

function formatDisplayDate(dateStr) {
  if (!dateStr || dateStr === '--') return '--';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

// Toast notification helper
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : (type === 'danger' ? 'fa-circle-xmark' : 'fa-circle-info');
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Live Clock
function initClock() {
  const clockEl = document.getElementById('liveClock');
  function update() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${pad(now.getDate())}-${months[now.getMonth()]}-${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (clockEl) clockEl.textContent = `${dateStr}  ${timeStr}`;
  }
  update();
  setInterval(update, 1000);
}

// Navigation Tabs
function initTabs() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      navBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-dashboard') renderDashboard();
      if (targetId === 'tab-staff') renderStaffDirectory();
      if (targetId === 'tab-attendance') renderAttendance();
    });
  });
}

// API Calls
async function fetchStaff() {
  try {
    const res = await fetch('/api/staff');
    if (res.ok) {
      state.staff = await res.json();
      const countEl = document.getElementById('navStaffCount');
      if (countEl) countEl.textContent = state.staff.length;
    }
  } catch (err) {
    console.error('Error fetching staff:', err);
  }
}

async function fetchAttendance() {
  try {
    let url = '/api/attendance';
    if (state.fromDate && state.toDate) {
      url += `?fromDate=${encodeURIComponent(state.fromDate)}&toDate=${encodeURIComponent(state.toDate)}`;
    } else if (state.filterDate) {
      url += `?date=${encodeURIComponent(state.filterDate)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      state.attendance = await res.json();
    }
  } catch (err) {
    console.error('Error fetching attendance:', err);
  }
}

async function fetchDashboard() {
  try {
    const res = await fetch('/api/dashboard');
    if (res.ok) {
      state.dashboard = await res.json();
    }
  } catch (err) {
    console.error('Error fetching dashboard:', err);
  }
}

// Render Attendance Table
function renderAttendance() {
  const tbody = document.getElementById('attendanceTbody');
  if (!tbody) return;

  // Filter attendance records
  let filtered = state.attendance.slice();

  // Filter by shift
  if (state.filterShift !== 'ALL') {
    if (state.filterShift === 'SUPP') {
      filtered = filtered.filter(r => r.shiftCode === 'D12' || r.shiftCode === 'N12' || (r.shift && r.shift.includes('12H')));
    } else {
      filtered = filtered.filter(r => r.shiftCode === state.filterShift);
    }
  }

  // Filter by biometric device / terminal
  if (state.filterDevice && state.filterDevice !== 'ALL') {
    filtered = filtered.filter(r => 
      r.deviceId === state.filterDevice || 
      (r.terminal && r.terminal.includes(state.filterDevice)) || 
      (r.deviceIp && r.deviceIp.includes(state.filterDevice))
    );
  }

  // Filter by Category (Staff vs Management) - NEVER MIX!
  const mgmtEmpIds = ['1', 'SBRRFS0012', '3', '15', '19'];
  if (state.filterCategory === 'Management') {
    filtered = filtered.filter(r => r.category === 'Management' || mgmtEmpIds.includes(String(r.employeeNo)));
  } else {
    // Default: Strictly Staff (29 personnel)
    filtered = filtered.filter(r => r.category === 'Staff' || (r.category !== 'Management' && !mgmtEmpIds.includes(String(r.employeeNo))));
  }

  const banner = document.getElementById('attCategoryBanner');
  const bannerText = document.getElementById('attCategoryBannerText');
  if (banner && bannerText) {
    if (state.filterCategory === 'Management') {
      banner.style.background = '#eff6ff';
      banner.style.borderLeftColor = '#2563eb';
      bannerText.style.color = '#1e3a8a';
      bannerText.innerHTML = '<i class="fa-solid fa-user-tie" style="color: #2563eb;"></i> <strong>Management Leadership (5 Leaders)</strong> — System Admin, Station In-Charge, Accountant, Managers (Strictly Separated)';
    } else {
      banner.style.background = '#ecfdf5';
      banner.style.borderLeftColor = '#059669';
      bannerText.style.color = '#065f46';
      bannerText.innerHTML = '<i class="fa-solid fa-gas-pump" style="color: #059669;"></i> <strong>Station Operational Staff (29 Personnel)</strong> — Forecourt Cashiers, Supervisors, Air Boys & Office Admin (Zero Management)';
    }
  }

  // Filter by search query
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(r => 
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.designation && r.designation.toLowerCase().includes(q)) ||
      (r.shift && r.shift.toLowerCase().includes(q)) ||
      (r.terminal && r.terminal.toLowerCase().includes(q))
    );
  }

  // Sort latest date first (Today at top), then by employee ID
  filtered.sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (parseInt(a.employeeNo) || a.id || 0) - (parseInt(b.employeeNo) || b.id || 0);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; padding: 2rem; color: #64748b;">No attendance records found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((row, index) => {
    let shiftBadgeClass = 'tag-s1';
    let shiftDisplay = row.shift || '1st Shift';
    let shiftHours = '06:00 - 14:00';

    if (row.shiftCode === 'S2' || (row.shift && row.shift.includes('2nd'))) {
      shiftBadgeClass = 'tag-s2';
      shiftHours = '14:00 - 20:00';
    } else if (row.shiftCode === 'S3' || (row.shift && row.shift.includes('3rd'))) {
      shiftBadgeClass = 'tag-s3';
      shiftHours = '20:00 - 06:00 (+1)';
    } else if (row.shiftCode === 'D12' || row.shiftCode === 'N12' || (row.shift && row.shift.includes('12H'))) {
      shiftBadgeClass = 'tag-supp';
      shiftHours = row.shiftCode === 'N12' ? '18:00 - 06:00' : '06:00 - 18:00';
    } else if (row.shiftCode === 'GEN' || (row.shift && (row.shift.toLowerCase().includes('general') || row.shift.toLowerCase().includes('office')))) {
      shiftBadgeClass = 'tag-s1';
      shiftHours = '09:00 - 18:00';
    }

    let statusClass = 'status-present';
    let status = row.status || 'Present';
    if (status === 'On-Duty') statusClass = 'status-onduty';
    else if (status === 'Scheduled') statusClass = 'status-scheduled';
    else if (status === 'Absent') statusClass = 'status-absent';

    const isMgmt = (row.category === 'Management' || ['1', 'SBRRFS0012', '3', '15', '19'].includes(String(row.employeeNo)));
    const catBadge = isMgmt 
      ? `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 9999px;"><i class="fa-solid fa-user-tie"></i> Management</span>`
      : `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 9999px;"><i class="fa-solid fa-gas-pump"></i> Staff</span>`;

    const isTripleShift = (row.shiftsCount >= 3 || (row.dutyMode && row.dutyMode.includes('3 Shift')));
    const isDoubleShift = (!isTripleShift && (row.shiftsCount === 2 || (row.dutyMode && row.dutyMode.includes('2 Shift'))));
    const p1 = (row.punch1 && row.punch1 !== '--:--') ? row.punch1 : (row.punchIn && row.punchIn !== '--:--' ? row.punchIn : '--:--');
    const p2 = (row.punch2 && row.punch2 !== '--:--') ? row.punch2 : '--:--';
    const isInProgress = (p1 !== '--:--' && p2 === '--:--');
    const s1 = (row.shift1Hours && row.shift1Hours > 0 && !isInProgress) ? `${row.shift1Hours}h` : '--';
    const p3 = row.punch3 || '--:--';
    const p4 = row.punch4 || '--:--';
    const s2 = (row.shift2Hours && row.shift2Hours > 0) ? `${row.shift2Hours}h` : '--';
    const p5 = row.punch5 || '--:--';
    const p6 = row.punch6 || '--:--';
    const s3 = (row.shift3Hours && row.shift3Hours > 0) ? `${row.shift3Hours}h` : '--';
    const totalWork = (row.hoursWorked && row.hoursWorked > 0 && !isInProgress) 
      ? `<strong>${row.hoursWorked} hrs</strong>` 
      : (isInProgress ? `<span style="color: #0284c7; font-weight: 600;">In Progress</span>` : '--');

    const dutyBadge = isTripleShift
      ? `<span style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 9999px;"><i class="fa-solid fa-layer-group"></i> 3 Shifts</span>`
      : (isDoubleShift
          ? `<span style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 9999px;"><i class="fa-solid fa-layer-group"></i> 2 Shifts</span>`
          : (isInProgress
              ? `<span style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 9999px;"><i class="fa-solid fa-clock"></i> In Progress</span>`
              : (row.dutyMode ? `<span style="background: #f1f5f9; color: #475569; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 9999px;">${row.dutyMode}</span>` : (row.shiftsCount === 1 ? `<span style="background: #f1f5f9; color: #475569; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 9999px;">1 Shift</span>` : `<span style="color: #94a3b8; font-size: 0.75rem;">--</span>`))));

    return `
      <tr style="${isTripleShift ? 'background-color: #faf5ff;' : (isDoubleShift ? 'background-color: #fffbeb;' : '')}">
        <td style="font-weight: 600; color: #64748b;">${index + 1}</td>
        <td style="font-size: 0.8rem; font-weight: 600; color: #1e40af; white-space: nowrap;">${formatDisplayDate(row.date)}</td>
        <td style="font-weight: 700; color: #0f2744;">${row.name}</td>
        <td>${row.designation || 'Staff'}</td>
        <td>${catBadge}</td>
        <td><span class="shift-tag ${shiftBadgeClass}">${shiftDisplay}</span></td>
        <td class="punch-time" style="color: #047857; font-weight: 600;">${p1}</td>
        <td class="punch-time" style="color: #b45309; font-weight: 600;">${p2}</td>
        <td style="font-size: 0.8rem; color: #475569;">${s1}</td>
        <td class="punch-time" style="color: #047857; font-weight: 600;">${p3}</td>
        <td class="punch-time" style="color: #b45309; font-weight: 600;">${p4}</td>
        <td style="font-size: 0.8rem; color: #475569;">${s2}</td>
        <td class="punch-time" style="color: #7c3aed; font-weight: 600;">${p5}</td>
        <td class="punch-time" style="color: #db2777; font-weight: 600;">${p6}</td>
        <td style="font-size: 0.8rem; color: #475569;">${s3}</td>
        <td style="font-size: 0.875rem; color: #1e3a8a;">${totalWork}</td>
        <td>${dutyBadge}</td>
        <td><span class="status-pill ${statusClass}">${status}</span></td>
      </tr>
    `;
  }).join('');
}

// Render Dashboard
function renderDashboard() {
  const s1Staff = state.staff.filter(s => s.shiftCode === 'S1' || ((s.shift || s.assignedShift || '').includes('1st')));
  const s2Staff = state.staff.filter(s => s.shiftCode === 'S2' || ((s.shift || s.assignedShift || '').includes('2nd')));
  const s3Staff = state.staff.filter(s => s.shiftCode === 'S3' || ((s.shift || s.assignedShift || '').includes('3rd')));
  const suppStaff = state.staff.filter(s => s.shiftCode === 'D12' || s.shiftCode === 'N12' || s.shiftCode === 'GEN' || ((s.shift || s.assignedShift || '').includes('12H')) || ((s.shift || s.assignedShift || '').includes('General')) || ((s.shift || s.assignedShift || '').includes('Shift') && !((s.shift || s.assignedShift || '').includes('1st') || (s.shift || s.assignedShift || '').includes('2nd') || (s.shift || s.assignedShift || '').includes('3rd'))));

  // Counts
  const dashTotal = document.getElementById('dashTotalStaff');
  const dashS1 = document.getElementById('dashS1Count');
  const dashS2 = document.getElementById('dashS2Count');
  const dashS3 = document.getElementById('dashS3Count');

  if (dashTotal) dashTotal.textContent = state.staff.length;
  if (dashS1) dashS1.textContent = s1Staff.length;
  if (dashS2) dashS2.textContent = s2Staff.length;
  if (dashS3) dashS3.textContent = s3Staff.length;

  // Render Tags
  const renderTags = (list, containerId) => {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = `<span style="font-size: 0.8rem; color: #94a3b8;">No staff assigned</span>`;
      return;
    }
    el.innerHTML = list.map(s => `
      <span class="staff-chip">
        <strong>${s.name}</strong> <span style="color: #64748b;">(${s.designation})</span>
      </span>
    `).join('');
  };

  renderTags(s1Staff, 'tagsS1');
  renderTags(s2Staff, 'tagsS2');
  renderTags(s3Staff, 'tagsS3');
  renderTags(suppStaff, 'tagsSupp');

  // Update Biometric Terminals Status
  const t1 = document.getElementById('term1Status');
  const t2 = document.getElementById('term2Status');
  const devBadgeText = document.getElementById('deviceStatusText');

  if (state.dashboard.devices && state.dashboard.devices.length >= 2) {
    const d1 = state.dashboard.devices[0];
    const d2 = state.dashboard.devices[1];
    if (t1) {
      t1.textContent = d1.status === 'Online' ? '● Online' : '○ Offline';
      t1.className = d1.status === 'Online' ? 'status-pill status-present' : 'status-pill status-absent';
    }
    if (t2) {
      t2.textContent = d2.status === 'Online' ? '● Online' : '○ Offline';
      t2.className = d2.status === 'Online' ? 'status-pill status-present' : 'status-pill status-absent';
    }
    if (devBadgeText) {
      const onlineCount = (d1.status === 'Online' ? 1 : 0) + (d2.status === 'Online' ? 1 : 0);
      devBadgeText.innerHTML = `Biometric: <strong>${onlineCount}/2 Terminals Online</strong> (.174 & .100)`;
    }
  }
}

// Render Staff Directory (Add / Delete) - Separated Staff vs Management
function renderStaffDirectory() {
  const tbody = document.getElementById('staffTbody');
  if (!tbody) return;

  if (state.staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 2rem; color: #64748b;">No employees found in directory.</td></tr>`;
    return;
  }

  const mgmtEmpIds = ['1', 'SBRRFS0012', '3', '15', '19'];
  const staffOnly = state.staff.filter(s => s.category === 'Staff' || (s.category !== 'Management' && !mgmtEmpIds.includes(String(s.employeeNo))));
  const mgmtOnly = state.staff.filter(s => s.category === 'Management' || mgmtEmpIds.includes(String(s.employeeNo)));

  function renderRows(list, isMgmt) {
    return list.map((emp, index) => {
      const shiftName = emp.shift || emp.assignedShift || (isMgmt ? 'General Shift (09:00 - 18:00)' : '1st Shift (Morning)');
      let shiftBadgeClass = 'tag-s1';
      let shiftHours = isMgmt ? '09:00 - 18:00 (8h)' : '06:00 - 14:00 (8h)';
      if (emp.name.toLowerCase().includes('lavanya') || String(emp.employeeNo) === '3') {
        shiftHours = '09:30 - 17:30 (7h)';
      } else if (emp.shiftCode === 'S2' || shiftName.includes('2nd')) {
        shiftBadgeClass = 'tag-s2';
        shiftHours = '14:00 - 20:00 (6h)';
      } else if (emp.shiftCode === 'S3' || shiftName.includes('3rd')) {
        shiftBadgeClass = 'tag-s3';
        shiftHours = '20:00 - 06:00 (10h)';
      } else if (emp.shiftCode === 'D12' || shiftName.includes('Day')) {
        shiftBadgeClass = 'tag-supp';
        shiftHours = '06:00 - 18:00 (12h)';
      } else if (emp.shiftCode === 'N12' || shiftName.includes('Night')) {
        shiftBadgeClass = 'tag-supp';
        shiftHours = '18:00 - 06:00 (12h)';
      }

      const roleBadge = isMgmt
        ? `<span style="background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 9999px;"><i class="fa-solid fa-user-tie"></i> Mgmt</span>`
        : `<span style="background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 9999px;"><i class="fa-solid fa-gas-pump"></i> Staff</span>`;

      const termName = emp.deviceId === 'DEV-01' ? 'DEV-01 (192.168.1.174)' : 'DEV-02 (192.168.1.100)';
      const termColor = emp.deviceId === 'DEV-01' ? '#1e40af' : '#047857';

      const isBioSuper = emp.biometricRole === 'super' || emp.biometricRole === 'admin' || (!emp.biometricRole && String(emp.employeeNo) === '1');
      const isRegistered = emp.fingerprintStatus === 'Registered' || (!emp.fingerprintStatus && (emp.id <= 34 || emp.employeeNo <= 43));
      const fingerCount = emp.fingerprintCount || (isRegistered ? 1 : 0);

      // 1. Rich Staff Name with Initials Avatar
      const initialLetter = emp.name ? emp.name.trim().charAt(0).toUpperCase() : 'E';

      // 2. Comprehensive Biometric Finger Data Cell
      const fingerDataCell = `
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="${isRegistered ? 'badge-finger-ok' : 'badge-finger-pending'}">
              <i class="fa-solid fa-fingerprint"></i> ${isRegistered ? 'Registered' : 'Pending'}
            </span>
            <span style="font-size: 0.75rem; color: ${isRegistered ? '#065f46' : '#92400e'}; font-weight: 700;">
              ${isRegistered ? `${fingerCount} Finger Active` : '0 Enrolled'}
            </span>
          </div>
          <div style="font-size: 0.7rem; color: #64748b; display: flex; align-items: center; gap: 0.35rem;">
            <span style="color: ${termColor}; font-weight: 600;"><i class="fa-solid fa-server"></i> ${emp.deviceId || 'DEV-02'}</span>
            <span>•</span>
            <button class="btn btn-outline" style="padding: 0.1rem 0.4rem; font-size: 0.68rem; line-height: 1; border-color: #cbd5e1;" onclick="openBiometricModal(${emp.id})" title="View fingerprint details or live test">
              <i class="fa-solid fa-fingerprint"></i> ${isRegistered ? 'Test Finger' : 'Enroll Finger'}
            </button>
          </div>
        </div>
      `;

      // 3. Machine Role Cell (Super User vs Normal) with One-Click Toggle Option!
      const machineRoleCell = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.3rem;">
          ${isBioSuper 
            ? `<span style="background: #fef3c7; color: #92400e; border: 1.5px solid #fcd34d; font-size: 0.72rem; font-weight: 800; padding: 0.15rem 0.5rem; border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                 <i class="fa-solid fa-crown" style="color: #d97706;"></i> Super User
               </span>`
            : `<span style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 9999px; display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap;">
                 <i class="fa-solid fa-user"></i> Normal
               </span>`
          }
          <button class="btn btn-sm" 
            style="font-size: 0.68rem; padding: 0.15rem 0.5rem; font-weight: 700; white-space: nowrap; ${isBioSuper ? 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;' : 'background: #fef3c7; color: #92400e; border: 1.5px solid #f59e0b;'}" 
            onclick="toggleEmployeeSuperRole(${emp.id})" 
            title="${isBioSuper ? 'Change to Normal User (Punch attendance only)' : 'Change to Super User (Full menu & admin access on terminal)'}">
            <i class="fa-solid ${isBioSuper ? 'fa-user' : 'fa-crown'}"></i> ${isBioSuper ? 'Make Normal' : 'Change to Super'}
          </button>
        </div>
      `;

      return `
        <tr style="${isMgmt ? 'background: #f8fafc;' : ''}">
          <td style="font-weight: 600; color: #64748b; font-family: monospace;">${emp.employeeNo || emp.id || index + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isBioSuper ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e2e8f0'}; color: ${isBioSuper ? '#fff' : '#475569'}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; flex-shrink: 0;">
                ${initialLetter}
              </div>
              <div>
                <div style="font-weight: 700; color: #0f2744; font-size: 0.9rem;">${emp.name}</div>
                <div style="font-size: 0.72rem; color: #64748b; display: flex; align-items: center; gap: 0.35rem;">
                  <span>ID: #${emp.employeeNo || emp.id}</span>
                  <span>•</span>
                  ${roleBadge}
                </div>
              </div>
            </div>
          </td>
          <td style="font-size: 0.85rem;">${emp.designation}</td>
          <td>
            ${isMgmt 
              ? `<span class="shift-tag tag-s1" style="font-size: 0.8rem;">${shiftName}</span>` 
              : `<div style="display: inline-flex; align-items: center; gap: 0.35rem;">
                  <select class="form-control" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; font-weight: 600;" onchange="changeStaffShift(${emp.id}, this.value)">
                    <option value="S1" ${emp.shiftCode === 'S1' ? 'selected' : ''}>1st Shift (06:00 - 14:00)</option>
                    <option value="S2" ${emp.shiftCode === 'S2' ? 'selected' : ''}>2nd Shift (14:00 - 20:00)</option>
                    <option value="S3" ${emp.shiftCode === 'S3' ? 'selected' : ''}>3rd Shift (20:00 - 06:00)</option>
                    <option value="D12" ${emp.shiftCode === 'D12' ? 'selected' : ''}>12H Day Shift (06:00 - 18:00)</option>
                    <option value="N12" ${emp.shiftCode === 'N12' ? 'selected' : ''}>12H Night Shift (18:00 - 06:00)</option>
                  </select>
                  <button class="btn btn-outline" style="padding: 0.25rem 0.45rem; font-size: 0.75rem;" onclick="rotateStaffMember(${emp.id})" title="Rotate to next shift in cycle">
                    <i class="fa-solid fa-arrows-rotate"></i>
                  </button>
                </div>`
            }
          </td>
          <td style="font-family: 'Consolas', monospace; font-size: 0.825rem; color: #475569;">${shiftHours}</td>
          <td style="font-size: 0.8rem; font-weight: 600; color: ${termColor};">
            <i class="fa-solid fa-server"></i> ${termName}
          </td>
          <td>${fingerDataCell}</td>
          <td>${machineRoleCell}</td>
          <td style="font-size: 0.825rem; color: #475569;">${emp.mobile || '98XXXXXXXX'}</td>
          <td><span class="status-pill status-present">Active</span></td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 0.35rem; justify-content: center;">
              <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; color: #1e40af; border-color: #93c5fd;" onclick="openBiometricModal(${emp.id})" title="Biometric Finger Registration & Test">
                <i class="fa-solid fa-fingerprint"></i>
              </button>
              <button class="btn btn-danger-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="deleteEmployee(${emp.id}, '${emp.name}')" title="Delete Employee">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  let html = '';
  // Section 1: Station Staff (29)
  html += `
    <tr style="background: #f0fdf4; border-top: 3px solid #059669;">
      <td colspan="11" style="padding: 0.75rem 1rem; font-weight: 800; color: #065f46; font-size: 0.95rem;">
        <i class="fa-solid fa-gas-pump" style="color: #059669; margin-right: 0.4rem;"></i>
        SECTION 1: STATION OPERATIONAL STAFF (${staffOnly.length} Personnel) — Forecourt Supervisors, Cashiers, Air Boys & Office Admin
      </td>
    </tr>
  `;
  html += renderRows(staffOnly, false);

  // Section 2: Management (5)
  html += `
    <tr style="background: #eff6ff; border-top: 3px solid #2563eb;">
      <td colspan="11" style="padding: 0.75rem 1rem; font-weight: 800; color: #1e3a8a; font-size: 0.95rem;">
        <i class="fa-solid fa-user-tie" style="color: #2563eb; margin-right: 0.4rem;"></i>
        SECTION 2: MANAGEMENT TEAM (${mgmtOnly.length} Leaders) — Admin, Station In-Charge, Accountant & Managers
      </td>
    </tr>
  `;
  html += renderRows(mgmtOnly, true);

  tbody.innerHTML = html;
}

// Delete Employee
async function deleteEmployee(id, name) {
  const confirmed = confirm(`Are you sure you want to delete employee "${name}" from the bunk roster?\n\nThis will remove their profile and attendance entries.`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      showToast(`Employee "${name}" successfully deleted!`, 'danger');
      await refreshAllData();
    } else {
      alert('Error deleting employee from server.');
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to connect to attendance server.');
  }
}

// Shift Rotation Handlers
async function changeStaffShift(id, shiftCode) {
  let shiftName = "1st Shift (Morning)";
  if (shiftCode === "S2") shiftName = "2nd Shift (Afternoon)";
  else if (shiftCode === "S3") shiftName = "3rd Shift (Night)";
  else if (shiftCode === "D12") shiftName = "12H Day Shift";
  else if (shiftCode === "N12") shiftName = "12H Night Shift";

  try {
    const res = await fetch(`/api/staff/${id}/shift`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shiftCode, shift: shiftName })
    });
    if (res.ok) {
      showToast(`Assigned shift updated to ${shiftName}!`, 'success');
      await refreshAllData();
    }
  } catch (err) {
    console.error('Error changing shift:', err);
  }
}

async function rotateStaffMember(id) {
  const emp = state.staff.find(s => s.id === id);
  if (!emp) return;
  let nextCode = 'S1';
  if (emp.shiftCode === 'S1') nextCode = 'S3';
  else if (emp.shiftCode === 'S2') nextCode = 'S1';
  else if (emp.shiftCode === 'S3') nextCode = 'S2';
  else if (emp.shiftCode === 'D12') nextCode = 'N12';
  else if (emp.shiftCode === 'N12') nextCode = 'D12';
  await changeStaffShift(id, nextCode);
}

async function rotateAllShifts() {
  const confirmed = confirm("Rotate all staff shifts forward for the next roster period?\n\n- 1st Shift staff -> 3rd Shift (Night)\n- 2nd Shift staff -> 1st Shift (Morning)\n- 3rd Shift staff -> 2nd Shift (Afternoon)\n- 12H Support staff alternate Day <-> Night");
  if (!confirmed) return;

  try {
    const res = await fetch('/api/rotate-shifts', { method: 'POST' });
    if (res.ok) {
      showToast("All petrol bunk shifts successfully rotated forward!", 'success');
      await refreshAllData();
    } else {
      alert("Failed to rotate shifts on server.");
    }
  } catch (err) {
    console.error("Rotate error:", err);
    alert("Connection error to server.");
  }
}

window.changeStaffShift = changeStaffShift;
window.rotateStaffMember = rotateStaffMember;
window.rotateAllShifts = rotateAllShifts;

// Add Employee Modal Handling
function initModal() {
  const modal = document.getElementById('addStaffModal');
  const btnOpen1 = document.getElementById('btnQuickAddStaff');
  const btnOpen2 = document.getElementById('btnAddStaffModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnCancel = document.getElementById('btnCancelModal');
  const form = document.getElementById('addStaffForm');

  const catSelect = document.getElementById('formStaffCategory');
  const termSelect = document.getElementById('formStaffTerminal');
  const deptSelect = document.getElementById('formStaffDepartment');
  const shiftSelect = document.getElementById('formStaffShift');
  const desigSelect = document.getElementById('formStaffDesignation');
  const empNoInput = document.getElementById('formStaffEmpNo');
  const bioRoleSelect = document.getElementById('formStaffBioRole');

  if (catSelect) {
    catSelect.addEventListener('change', () => {
      if (catSelect.value === 'Management') {
        if (termSelect) termSelect.value = 'DEV-01';
        if (deptSelect) deptSelect.value = 'Management & Administration';
        if (shiftSelect) shiftSelect.value = 'General Shift';
        if (desigSelect) desigSelect.value = 'Manager';
        if (bioRoleSelect) bioRoleSelect.value = 'admin';
      } else {
        if (termSelect) termSelect.value = 'DEV-02';
        if (deptSelect) deptSelect.value = 'Forecourt Operations';
        if (shiftSelect) shiftSelect.value = '1st Shift (Morning)';
        if (desigSelect) desigSelect.value = 'Cashier';
        if (bioRoleSelect) bioRoleSelect.value = 'normal';
      }
    });
  }

  const openModal = async () => {
    form.reset();
    if (catSelect) catSelect.value = 'Staff';
    if (termSelect) termSelect.value = 'DEV-02';
    if (deptSelect) deptSelect.value = 'Forecourt Operations';
    if (shiftSelect) shiftSelect.value = '1st Shift (Morning)';
    if (bioRoleSelect) bioRoleSelect.value = 'normal';
    const enrollCheckbox = document.getElementById('formStaffEnrollFinger');
    if (enrollCheckbox) enrollCheckbox.checked = true;

    // Fetch next available machine ID
    try {
      const res = await fetch('/api/biometric/next-id');
      if (res.ok) {
        const data = await res.json();
        if (empNoInput) empNoInput.value = data.nextEmployeeNo || 44;
      }
    } catch (err) {
      if (empNoInput) empNoInput.value = (state.staff.length + 10);
    }

    modal.classList.add('active');
    document.getElementById('formStaffName').focus();
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (btnOpen1) btnOpen1.addEventListener('click', openModal);
  if (btnOpen2) btnOpen2.addEventListener('click', openModal);
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('formStaffName').value.trim();
    const employeeNo = empNoInput ? empNoInput.value.trim() : '';
    const designation = document.getElementById('formStaffDesignation').value;
    const category = catSelect ? catSelect.value : 'Staff';
    const department = deptSelect ? deptSelect.value : 'Forecourt Operations';
    const assignedShift = document.getElementById('formStaffShift').value;
    const targetTerminal = termSelect ? termSelect.value : 'DEV-02';
    const mobile = document.getElementById('formStaffMobile').value.trim();
    const biometricRole = bioRoleSelect ? bioRoleSelect.value : 'normal';
    const enrollFingerImmediately = document.getElementById('formStaffEnrollFinger')?.checked;

    if (!name) {
      alert('Please enter the employee name.');
      return;
    }

    let shiftCode = 'S1';
    if (assignedShift.includes('2nd')) shiftCode = 'S2';
    else if (assignedShift.includes('3rd')) shiftCode = 'S3';
    else if (assignedShift.includes('Day')) shiftCode = 'D12';
    else if (assignedShift.includes('Night')) shiftCode = 'N12';
    else if (assignedShift.includes('General')) shiftCode = 'GEN';

    let deviceId = targetTerminal;
    let terminal = 'Staff (192.168.1.100)';
    let deviceIp = '192.168.1.100';
    if (targetTerminal === 'DEV-01') {
      terminal = 'Management (192.168.1.174)';
      deviceIp = '192.168.1.174';
    } else if (targetTerminal === 'BOTH') {
      terminal = 'Both Terminals (.100 / .174)';
      deviceIp = '192.168.1.100';
    }

    const newStaff = {
      employeeNo,
      name,
      designation,
      category,
      department,
      assignedShift,
      shiftCode,
      targetTerminal,
      deviceId,
      terminal,
      deviceIp,
      mobile: mobile || '98XXXXXXXX',
      status: 'Active',
      fingerprintStatus: 'Pending',
      biometricRole
    };

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      });

      if (res.ok) {
        const resData = await res.json();
        closeModal();
        const roleText = (biometricRole === 'super' || biometricRole === 'admin') ? ' 👑 (Super User)' : '';
        const provMsg = resData.deviceProvisioned ? ' Profile synced to biometric machine!' : '';
        showToast(`Employee "${name}" (#${resData.staff.employeeNo})${roleText} registered!${provMsg}`, 'success');
        await refreshAllData();

        if (enrollFingerImmediately && resData.staff && resData.staff.id) {
          openBiometricModal(resData.staff.id);
        }
      } else {
        alert('Error saving new employee to server.');
      }
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to connect to attendance server.');
    }
  });
}

// Biometric Fingerprint Enrollment Assistant
let bioScanTimer = null;
let bioScanInterval = null;

function initBiometricModal() {
  const bioModal = document.getElementById('biometricModal');
  const btnQuickBio = document.getElementById('btnQuickBiometric');
  const btnClose = document.getElementById('btnCloseBiometricModal');
  const btnDone = document.getElementById('btnBioDone');
  const empSelect = document.getElementById('bioSelectEmployee');
  const btnReSync = document.getElementById('btnBioReSync');
  const btnWakeSensor = document.getElementById('btnBioWakeSensor');
  const btnStartVerify = document.getElementById('btnBioStartVerify');
  const btnCancelScan = document.getElementById('btnBioCancelScan');
  const btnMarkManual = document.getElementById('btnBioMarkManual');
  const btnSaveRole = document.getElementById('btnBioSaveRole');
  const roleSelect = document.getElementById('bioChangeRoleSelect');

  if (btnQuickBio) {
    btnQuickBio.addEventListener('click', () => {
      // Find first pending employee or first employee
      const pending = state.staff.find(s => s.fingerprintStatus === 'Pending');
      const targetId = pending ? pending.id : (state.staff[0]?.id || 1);
      openBiometricModal(targetId);
    });
  }

  const closeBioModal = () => {
    if (bioScanInterval) clearInterval(bioScanInterval);
    if (bioScanTimer) clearTimeout(bioScanTimer);
    bioModal.classList.remove('active');
  };

  if (btnClose) btnClose.addEventListener('click', closeBioModal);
  if (btnDone) btnDone.addEventListener('click', closeBioModal);

  bioModal.addEventListener('click', (e) => {
    if (e.target === bioModal) closeBioModal();
  });

  if (empSelect) {
    empSelect.addEventListener('change', () => {
      const selectedId = parseInt(empSelect.value, 10);
      updateBioModalForEmployee(selectedId);
    });
  }

  // Handle changing Biometric Role (Super vs Normal)
  if (btnSaveRole && roleSelect) {
    btnSaveRole.addEventListener('click', async () => {
      const empId = parseInt(empSelect.value, 10);
      const emp = state.staff.find(s => s.id === empId);
      if (!emp) return;

      const chosenRole = roleSelect.value; // 'super' or 'normal'
      btnSaveRole.disabled = true;
      btnSaveRole.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

      try {
        const res = await fetch('/api/biometric/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: emp.id,
            employeeNo: emp.employeeNo,
            role: chosenRole
          })
        });

        if (res.ok) {
          emp.biometricRole = chosenRole;
          renderStaffDirectory();
          updateBioModalForEmployee(emp.id);
          const roleLabel = chosenRole === 'super' ? '👑 Super User (Menu & Admin Access)' : '👤 Normal User (Punch Only)';
          showToast(`Biometric role for #${emp.employeeNo} (${emp.name}) set to ${roleLabel}!`, 'success');
        } else {
          showToast('Failed to update privilege on biometric server.', 'danger');
        }
      } catch (err) {
        showToast('Error communicating with biometric server.', 'danger');
      } finally {
        btnSaveRole.disabled = false;
        btnSaveRole.innerHTML = `<i class="fa-solid fa-check"></i> Set Role`;
      }
    });
  }

  // Quick 1-click toggle between Super User and Normal Employee
  async function toggleEmployeeSuperRole(empId) {
    const emp = state.staff.find(s => s.id === empId);
    if (!emp) return;
    const isCurrentlySuper = emp.biometricRole === 'super' || emp.biometricRole === 'admin' || (!emp.biometricRole && String(emp.employeeNo) === '1');
    const targetRole = isCurrentlySuper ? 'normal' : 'super';
    const roleName = targetRole === 'super' ? '👑 Super User' : '👤 Normal User';

    showToast(`Setting #${emp.employeeNo} (${emp.name}) as ${roleName}...`, 'info');

    try {
      const res = await fetch('/api/biometric/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: emp.id,
          employeeNo: emp.employeeNo,
          role: targetRole
        })
      });
      const d = await res.json();
      if (d.success) {
        emp.biometricRole = targetRole;
        renderStaffDirectory();
        showToast(`Success! #${emp.employeeNo} (${emp.name}) changed to ${roleName} on machine!`, 'success');
      } else {
        showToast('Failed to update privilege on biometric machine.', 'danger');
      }
    } catch (err) {
      showToast('Error communicating with biometric server.', 'danger');
    }
  }
  window.toggleEmployeeSuperRole = toggleEmployeeSuperRole;

  if (btnReSync) {
    btnReSync.addEventListener('click', async () => {
      const empId = parseInt(empSelect.value, 10);
      const emp = state.staff.find(s => s.id === empId);
      if (!emp) return;
      btnReSync.disabled = true;
      btnReSync.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing...`;
      try {
        const res = await fetch('/api/biometric/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: emp.id, employeeNo: emp.employeeNo, name: emp.name, deviceIp: emp.deviceIp, biometricRole: emp.biometricRole })
        });
        const d = await res.json();
        if (d.success) {
          showToast(`User profile for #${emp.employeeNo} (${emp.name}) synced to machine!`, 'success');
        } else {
          showToast(`Machine sync attempted on ${emp.deviceIp || '192.168.1.100'}.`, 'info');
        }
      } catch (err) {
        showToast('Error communicating with biometric server.', 'danger');
      } finally {
        btnReSync.disabled = false;
        btnReSync.innerHTML = `<i class="fa-solid fa-rotate"></i> Re-Sync to Machine`;
      }
    });
  }

  if (btnWakeSensor) {
    btnWakeSensor.addEventListener('click', async () => {
      const empId = parseInt(empSelect.value, 10);
      const emp = state.staff.find(s => s.id === empId);
      const devIp = emp?.deviceIp || '192.168.1.100';
      btnWakeSensor.disabled = true;
      btnWakeSensor.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Activating...`;
      showToast(`Activating optical fingerprint sensor on ${devIp}...`, 'info');
      try {
        await fetch('/api/biometric/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceIp: devIp })
        });
        showToast(`Machine scanner sensor triggered. Place finger on glowing sensor.`, 'success');
      } catch (err) {
        showToast(`Trigger sent to terminal ${devIp}.`, 'info');
      } finally {
        btnWakeSensor.disabled = false;
        btnWakeSensor.innerHTML = `<i class="fa-solid fa-bolt"></i> Trigger Sensor`;
      }
    });
  }

  // Live Verification / Test Punch
  if (btnStartVerify) {
    btnStartVerify.addEventListener('click', () => {
      const empId = parseInt(empSelect.value, 10);
      const emp = state.staff.find(s => s.id === empId);
      if (!emp) return;

      const idleView = document.getElementById('bioLiveIdleView');
      const scanView = document.getElementById('bioLiveScanningView');
      const succView = document.getElementById('bioLiveSuccessView');
      const scanEmpName = document.getElementById('bioScanEmpName');
      const countdownEl = document.getElementById('bioScanCountdown');

      if (idleView) idleView.style.display = 'none';
      if (succView) succView.style.display = 'none';
      if (scanView) scanView.style.display = 'block';
      if (scanEmpName) scanEmpName.textContent = `#${emp.employeeNo} (${emp.name})`;

      let timeLeft = 30;
      if (countdownEl) countdownEl.textContent = `Waiting for punch: ${timeLeft}s`;

      if (bioScanInterval) clearInterval(bioScanInterval);
      if (bioScanTimer) clearTimeout(bioScanTimer);

      const devIp = emp.deviceIp || '192.168.1.100';

      // Check punch poll
      bioScanInterval = setInterval(async () => {
        timeLeft--;
        if (countdownEl) countdownEl.textContent = `Waiting for punch: ${timeLeft}s`;

        try {
          const res = await fetch(`/api/biometric/check-punch?employeeNo=${encodeURIComponent(emp.employeeNo)}&deviceIp=${encodeURIComponent(devIp)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.found && data.punch) {
              clearInterval(bioScanInterval);
              clearTimeout(bioScanTimer);
              emp.fingerprintStatus = 'Registered';
              renderStaffDirectory();

              const succDetails = document.getElementById('bioSuccessDetails');
              const punchTime = data.punch.time ? data.punch.time.replace('T', ' ').substring(11, 19) : 'Just Now';
              if (succDetails) {
                succDetails.innerHTML = `Punch successfully confirmed for <strong>#${emp.employeeNo} - ${emp.name}</strong> at <strong>${punchTime}</strong> on ${data.terminal}.`;
              }
              if (scanView) scanView.style.display = 'none';
              if (succView) succView.style.display = 'block';
              showToast(`Biometric fingerprint verified for ${emp.name}!`, 'success');
              await refreshAllData();
            }
          }
        } catch (e) {
          console.warn('Poll punch error:', e);
        }

        if (timeLeft <= 0) {
          clearInterval(bioScanInterval);
          if (countdownEl) countdownEl.textContent = 'Timed out (No punch detected)';
          setTimeout(() => {
            if (scanView) scanView.style.display = 'none';
            if (idleView) idleView.style.display = 'block';
          }, 2000);
        }
      }, 1200);
    });
  }

  if (btnCancelScan) {
    btnCancelScan.addEventListener('click', () => {
      if (bioScanInterval) clearInterval(bioScanInterval);
      if (bioScanTimer) clearTimeout(bioScanTimer);
      const idleView = document.getElementById('bioLiveIdleView');
      const scanView = document.getElementById('bioLiveScanningView');
      if (scanView) scanView.style.display = 'none';
      if (idleView) idleView.style.display = 'block';
    });
  }

  if (btnMarkManual) {
    btnMarkManual.addEventListener('click', async () => {
      const empId = parseInt(empSelect.value, 10);
      const emp = state.staff.find(s => s.id === empId);
      if (!emp) return;
      try {
        await fetch('/api/biometric/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staffId: emp.id, employeeNo: emp.employeeNo, status: 'Registered' })
        });
        emp.fingerprintStatus = 'Registered';
        renderStaffDirectory();
        showToast(`Fingerprint for ${emp.name} marked as Registered.`, 'success');
        updateBioModalForEmployee(emp.id);
        const idleView = document.getElementById('bioLiveIdleView');
        const succView = document.getElementById('bioLiveSuccessView');
        const succDetails = document.getElementById('bioSuccessDetails');
        if (idleView) idleView.style.display = 'none';
        if (succView) succView.style.display = 'block';
        if (succDetails) {
          succDetails.innerHTML = `Biometric fingerprint recorded as enrolled for <strong>#${emp.employeeNo} - ${emp.name}</strong>.`;
        }
      } catch (err) {
        showToast('Error updating fingerprint status.', 'danger');
      }
    });
  }
}

function updateBioModalForEmployee(staffId) {
  const emp = state.staff.find(s => s.id === staffId);
  if (!emp) return;

  const empNoEl = document.getElementById('bioActiveEmpNo');
  const nameEl = document.getElementById('bioActiveName');
  const stepEmpNo = document.getElementById('bioStepEmpNo');
  const stepTerm = document.getElementById('bioStepTerminalText');
  const termBadge = document.getElementById('bioTerminalBadgeText');
  const roleBadge = document.getElementById('bioActiveRoleBadge');
  const roleSelect = document.getElementById('bioChangeRoleSelect');

  const empNoStr = emp.employeeNo || String(emp.id);
  const termStr = emp.deviceId === 'DEV-01' ? 'DEV-01: Management (192.168.1.174)' : 'DEV-02: Staff Terminal (192.168.1.100)';
  const isBioSuper = emp.biometricRole === 'super' || emp.biometricRole === 'admin' || (!emp.biometricRole && String(emp.employeeNo) === '1');

  if (empNoEl) empNoEl.textContent = `#${empNoStr}`;
  if (nameEl) nameEl.textContent = emp.name;
  if (stepEmpNo) stepEmpNo.textContent = `#${empNoStr} (${emp.name})`;
  if (stepTerm) stepTerm.textContent = termStr;
  if (termBadge) termBadge.textContent = `${termStr} Online`;

  if (roleSelect) roleSelect.value = isBioSuper ? 'super' : 'normal';
  if (roleBadge) {
    roleBadge.innerHTML = isBioSuper
      ? '<span style="color: #92400e; font-weight: 800;"><i class="fa-solid fa-crown" style="color: #d97706;"></i> 👑 Super User (Keypad Menu & User Enrollment Access)</span>'
      : '<span style="color: #047857; font-weight: 700;"><i class="fa-solid fa-user"></i> 👤 Normal Employee (Attendance Punch Only)</span>';
  }

  const idleView = document.getElementById('bioLiveIdleView');
  const scanView = document.getElementById('bioLiveScanningView');
  const succView = document.getElementById('bioLiveSuccessView');

  if (scanView) scanView.style.display = 'none';
  if (emp.fingerprintStatus === 'Registered' || (!emp.fingerprintStatus && (emp.id <= 34 || emp.employeeNo <= 43))) {
    if (idleView) idleView.style.display = 'none';
    if (succView) succView.style.display = 'block';
    const succDetails = document.getElementById('bioSuccessDetails');
    if (succDetails) {
      succDetails.innerHTML = `Biometric fingerprint currently active for <strong>#${empNoStr} - ${emp.name}</strong> on ${termStr}.`;
    }
  } else {
    if (succView) succView.style.display = 'none';
    if (idleView) idleView.style.display = 'block';
  }
}

function openBiometricModal(staffId) {
  const modal = document.getElementById('biometricModal');
  const select = document.getElementById('bioSelectEmployee');
  if (!modal || !select) return;

  // Populate select dropdown
  select.innerHTML = state.staff.map(s => {
    const isReg = s.fingerprintStatus === 'Registered' || (!s.fingerprintStatus && (s.id <= 34 || s.employeeNo <= 43));
    const statusText = isReg ? '✓ Registered' : '⚠️ Pending Finger';
    const term = s.deviceId === 'DEV-01' ? 'DEV-01' : 'DEV-02';
    return `<option value="${s.id}">#${s.employeeNo || s.id} - ${s.name} (${s.designation} | ${term}) [${statusText}]</option>`;
  }).join('');

  const targetId = staffId || (state.staff[0]?.id || 1);
  select.value = targetId;

  updateBioModalForEmployee(targetId);
  modal.classList.add('active');
}

window.openBiometricModal = openBiometricModal;

// Filters & Search Setup
function initFilters() {
  const attFromInput = document.getElementById('attFromDate');
  const attToInput = document.getElementById('attToDate');
  const btnFilterDates = document.getElementById('btnFilterDates');
  const today = getLocalDateString();

  if (attFromInput) attFromInput.value = state.fromDate || '2026-09-14';
  if (attToInput) attToInput.value = state.toDate || today;

  const applyAttendanceDateFilter = async () => {
    if (attFromInput && attToInput) {
      state.fromDate = attFromInput.value;
      state.toDate = attToInput.value;
      await fetchAttendance();
      renderAttendance();
    }
  };

  if (btnFilterDates) btnFilterDates.addEventListener('click', applyAttendanceDateFilter);
  if (attFromInput) attFromInput.addEventListener('change', applyAttendanceDateFilter);
  if (attToInput) attToInput.addEventListener('change', applyAttendanceDateFilter);

  const btnAttPresetToday = document.getElementById('btnAttPresetToday');
  const btnAttPreset14 = document.getElementById('btnAttPreset14');

  if (btnAttPresetToday) {
    btnAttPresetToday.addEventListener('click', async () => {
      if (attFromInput) attFromInput.value = today;
      if (attToInput) attToInput.value = today;
      state.fromDate = today;
      state.toDate = today;
      await fetchAttendance();
      renderAttendance();
      showToast('Showing Today Live Punches (' + today + ')', 'info');
    });
  }

  if (btnAttPreset14) {
    btnAttPreset14.addEventListener('click', async () => {
      if (attFromInput) attFromInput.value = '2026-09-14';
      if (attToInput) attToInput.value = today;
      state.fromDate = '2026-09-14';
      state.toDate = today;
      await fetchAttendance();
      renderAttendance();
      showToast('Showing 14th to Today Attendance Logs', 'info');
    });
  }

  // Shift pills in Attendance tab (explicitly scoped to data-shift)
  const pills = document.querySelectorAll('.filter-pill[data-shift]');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filterShift = pill.getAttribute('data-shift');
      renderAttendance();
    });
  });

  // Category pills in Attendance tab (Staff vs Management)
  const catPills = document.querySelectorAll('.filter-pill-cat');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filterCategory = pill.getAttribute('data-cat') || 'Staff';
      renderAttendance();
    });
  });

  // Device pills in Attendance tab
  const devPills = document.querySelectorAll('.filter-pill-dev');
  devPills.forEach(pill => {
    pill.addEventListener('click', () => {
      devPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.filterDevice = pill.getAttribute('data-device') || 'ALL';
      renderAttendance();
    });
  });

  // Search box in Attendance tab
  const searchInput = document.getElementById('attSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderAttendance();
    });
  }

  // Device Sync button
  const syncBtn = document.getElementById('btnSyncDevice');
  if (syncBtn) {
    syncBtn.addEventListener('click', syncAllDevices);
  }
}

async function syncAllDevices() {
  const syncBtn = document.getElementById('btnSyncDevice');
  let origText = '';
  if (syncBtn) {
    origText = syncBtn.innerHTML;
    syncBtn.disabled = true;
    syncBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Syncing...`;
  }
  try {
    const res = await fetch('/api/sync');
    const data = await res.json();
    if (data.success) {
      showToast(`Both Biometric Terminals Synced! (${data.onlineDevices}/2 Online - 192.168.1.174 & 192.168.1.100)`, 'success');
    } else {
      showToast(`Sync completed: ${data.onlineDevices} of ${data.totalDevices} terminals online.`, 'info');
    }
  } catch (err) {
    showToast('Biometric terminal sync request finished.', 'info');
  } finally {
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = origText;
    }
    await refreshAllData();
  }
}

window.syncAllDevices = syncAllDevices;

// Generate & Download CSV Report (Date Range Support with Strict Category Separation)
function generateCsvReport(dateLabel, shiftFilter, desigFilter, records = null, deviceFilter = 'ALL', categoryFilter = 'ALL') {
  let list = (records && records.length) ? records.slice() : state.attendance.slice();

  if (shiftFilter !== 'ALL') {
    if (shiftFilter === 'SUPP') {
      list = list.filter(r => r.shiftCode === 'D12' || r.shiftCode === 'N12' || (r.shift && r.shift.includes('12H')));
    } else {
      list = list.filter(r => r.shiftCode === shiftFilter);
    }
  }

  if (desigFilter !== 'ALL') {
    list = list.filter(r => r.designation === desigFilter);
  }

  if (deviceFilter && deviceFilter !== 'ALL') {
    list = list.filter(r => r.deviceId === deviceFilter || (r.terminal && r.terminal.includes(deviceFilter)) || (r.deviceIp && r.deviceIp.includes(deviceFilter)));
  }

  const formatRow = (r, idx) => {
    const p1 = r.punch1 || r.punchIn || '--:--';
    const p2 = r.punch2 || (r.shiftsCount === 1 ? r.punchOut : '--:--') || '--:--';
    const s1 = (r.shift1Hours && r.shift1Hours > 0) ? r.shift1Hours : 0;
    const p3 = r.punch3 || '--:--';
    const p4 = r.punch4 || '--:--';
    const s2 = (r.shift2Hours && r.shift2Hours > 0) ? r.shift2Hours : 0;
    const p5 = r.punch5 || '--:--';
    const p6 = r.punch6 || '--:--';
    const s3 = (r.shift3Hours && r.shift3Hours > 0) ? r.shift3Hours : 0;
    const tot = (r.hoursWorked && r.hoursWorked > 0) ? `${r.hoursWorked} hrs` : ((r.status === 'Present' && r.date === getLocalDateString()) ? 'In Progress' : '0 hrs');
    const dutyMode = r.dutyMode || (r.shiftsCount >= 3 ? '3 Shift(s)' : (r.shiftsCount === 2 ? '2 Shift(s)' : (r.shiftsCount === 1 ? '1 Shift(s)' : '0 Shift(s)')));
    const cat = r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff');

    return [
      idx + 1,
      formatDisplayDate(r.date),
      r.employeeNo || r.staffId || idx + 1,
      `"${r.name}"`,
      `"${r.designation || 'Staff'}"`,
      `"${cat}"`,
      `"${r.shift || '1st Shift'}"`,
      p1,
      p2,
      s1,
      p3,
      p4,
      s2,
      p5,
      p6,
      s3,
      tot,
      dutyMode,
      r.status || 'Present'
    ];
  };

  const tableHeaders = ['Sl No', 'Date', 'Employee ID', 'Employee Name', 'Designation', 'Category', 'Assigned Shift', 'Punch 1 (In 1)', 'Punch 2 (Out 1)', 'Shift 1 Hrs', 'Punch 3 (In 2)', 'Punch 4 (Out 2)', 'Shift 2 Hrs', 'Punch 5 (In 3)', 'Punch 6 (Out 3)', 'Shift 3 Hrs', 'Total Hours', 'Duty Mode', 'Status'];

  const csvRows = [];
  csvRows.push(['BABU RAJU RAM FUEL STATION - 4-PUNCH ATTENDANCE REPORT']);
  csvRows.push([`Period: ${dateLabel}`, `Filter Shift: ${shiftFilter}`, `Filter Designation: ${desigFilter}`, `Category: ${categoryFilter}`, 'Multi-Shift 4-Punch Supported']);
  csvRows.push([]);

  if (categoryFilter === 'Management') {
    const mgmtList = list.filter(r => r.category === 'Management' || r.deviceId === 'DEV-01');
    csvRows.push(['=== MANAGEMENT TEAM (5 LEADERS) ===']);
    csvRows.push(tableHeaders);
    mgmtList.forEach((r, idx) => csvRows.push(formatRow(r, idx)));
  } else if (categoryFilter === 'Staff') {
    const staffList = list.filter(r => r.category !== 'Management' && r.deviceId !== 'DEV-01');
    csvRows.push(['=== STATION OPERATIONAL STAFF (29 STAFF) ===']);
    csvRows.push(tableHeaders);
    staffList.forEach((r, idx) => csvRows.push(formatRow(r, idx)));
  } else {
    // ALL: Strictly separated sections - never mixed!
    const mgmtList = list.filter(r => r.category === 'Management' || r.deviceId === 'DEV-01');
    const staffList = list.filter(r => r.category !== 'Management' && r.deviceId !== 'DEV-01');

    csvRows.push(['=== SECTION 1: MANAGEMENT TEAM (5 LEADERS) ===']);
    csvRows.push(tableHeaders);
    mgmtList.forEach((r, idx) => csvRows.push(formatRow(r, idx)));

    csvRows.push([]);
    csvRows.push(['=== SECTION 2: STATION OPERATIONAL STAFF (29 STAFF) ===']);
    csvRows.push(tableHeaders);
    staffList.forEach((r, idx) => csvRows.push(formatRow(r, idx)));
  }

  const cleanLabel = dateLabel.replace(/[\s:]+/g, '_');
  const catSuffix = categoryFilter === 'ALL' ? '_Separated' : `_${categoryFilter}`;
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Petrol_Bunk_4Punch_Report_${cleanLabel}${catSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`4-Punch CSV report (${categoryFilter}) downloaded successfully!`, 'success');
}

// Generate & Download Excel XML Report (Date Range Support with Dedicated Sheets for Staff & Management)
function generateExcelXmlReport(dateLabel, shiftFilter, desigFilter, records = null, deviceFilter = 'ALL', categoryFilter = 'ALL') {
  let list = (records && records.length) ? records.slice() : state.attendance.slice();

  if (shiftFilter !== 'ALL') {
    if (shiftFilter === 'SUPP') {
      list = list.filter(r => r.shiftCode === 'D12' || r.shiftCode === 'N12' || (r.shift && r.shift.includes('12H')));
    } else {
      list = list.filter(r => r.shiftCode === shiftFilter);
    }
  }

  if (desigFilter !== 'ALL') {
    list = list.filter(r => r.designation === desigFilter);
  }

  if (deviceFilter && deviceFilter !== 'ALL') {
    list = list.filter(r => r.deviceId === deviceFilter || (r.terminal && r.terminal.includes(deviceFilter)) || (r.deviceIp && r.deviceIp.includes(deviceFilter)));
  }

  const buildWorksheetXml = (sheetName, titleText, items, headerStyle = 'Header') => {
    let ws = `
   <Worksheet ss:Name="${sheetName}">
    <Table>
     <Column ss:Width="40"/>
     <Column ss:Width="85"/>
     <Column ss:Width="65"/>
     <Column ss:Width="130"/>
     <Column ss:Width="100"/>
     <Column ss:Width="95"/>
     <Column ss:Width="140"/>
     <Column ss:Width="70"/>
     <Column ss:Width="70"/>
     <Column ss:Width="75"/>
     <Column ss:Width="70"/>
     <Column ss:Width="70"/>
     <Column ss:Width="75"/>
     <Column ss:Width="80"/>
     <Column ss:Width="80"/>
     <Column ss:Width="75"/>
     <Row ss:Height="30" ss:StyleID="Title">
      <Cell ss:MergeAcross="15"><Data ss:Type="String">${titleText}</Data></Cell>
     </Row>
     <Row ss:Height="20" ss:StyleID="SubTitle">
      <Cell ss:MergeAcross="15"><Data ss:Type="String">Period: ${dateLabel} | Generated: ${new Date().toLocaleString()} | Total Records: ${items.length}</Data></Cell>
     </Row>
     <Row ss:Height="8"></Row>
     <Row ss:Height="24" ss:StyleID="${headerStyle}">
      <Cell><Data ss:Type="String">Sl No</Data></Cell>
      <Cell><Data ss:Type="String">Date</Data></Cell>
      <Cell><Data ss:Type="String">Emp ID</Data></Cell>
      <Cell><Data ss:Type="String">Employee Name</Data></Cell>
      <Cell><Data ss:Type="String">Designation</Data></Cell>
      <Cell><Data ss:Type="String">Category</Data></Cell>
      <Cell><Data ss:Type="String">Assigned Shift</Data></Cell>
      <Cell><Data ss:Type="String">Punch 1 (In 1)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 2 (Out 1)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 1 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Punch 3 (In 2)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 4 (Out 2)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 2 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Punch 5 (In 3)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 6 (Out 3)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 3 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Total Hours</Data></Cell>
      <Cell><Data ss:Type="String">Duty Mode</Data></Cell>
      <Cell><Data ss:Type="String">Status</Data></Cell>
     </Row>`;

    items.forEach((r, idx) => {
      const isTrp = (r.shiftsCount >= 3 || (r.dutyMode && r.dutyMode.includes('3 Shift')));
      const isDbl = (!isTrp && (r.shiftsCount === 2 || (r.dutyMode && r.dutyMode.includes('2 Shift'))));
      const rowStyle = isTrp ? ' ss:StyleID="DoubleShift"' : (isDbl ? ' ss:StyleID="DoubleShift"' : (idx % 2 === 0 ? ' ss:StyleID="RowEven"' : ' ss:StyleID="RowOdd"'));
      const p1 = r.punch1 || r.punchIn || '--:--';
      const p2 = r.punch2 || (r.shiftsCount === 1 ? r.punchOut : '--:--') || '--:--';
      const s1 = (r.shift1Hours && r.shift1Hours > 0) ? r.shift1Hours : 0.0;
      const p3 = r.punch3 || '--:--';
      const p4 = r.punch4 || '--:--';
      const s2 = (r.shift2Hours && r.shift2Hours > 0) ? r.shift2Hours : 0.0;
      const p5 = r.punch5 || '--:--';
      const p6 = r.punch6 || '--:--';
      const s3 = (r.shift3Hours && r.shift3Hours > 0) ? r.shift3Hours : 0.0;
      const tot = (r.hoursWorked && r.hoursWorked > 0) ? r.hoursWorked : 0.0;
      const dutyMode = r.dutyMode || (isTrp ? '3 Shift(s)' : (isDbl ? '2 Shift(s)' : (r.shiftsCount === 1 ? '1 Shift(s)' : '0 Shift(s)')));
      const status = r.status || 'Present';
      const statusStyle = status === 'Present' ? ' ss:StyleID="Present"' : (status === 'Absent' ? ' ss:StyleID="Absent"' : ' ss:StyleID="Center"');
      const dutyStyle = (isTrp || isDbl) ? ' ss:StyleID="DoubleShiftTag"' : ' ss:StyleID="Center"';
      const cat = r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff');

      ws += `
     <Row ss:Height="20"${rowStyle}>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${idx + 1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${formatDisplayDate(r.date)}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${r.employeeNo || r.staffId || idx + 1}</Data></Cell>
      <Cell><Data ss:Type="String">${r.name}</Data></Cell>
      <Cell><Data ss:Type="String">${r.designation || 'Staff'}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${cat}</Data></Cell>
      <Cell><Data ss:Type="String">${r.shift || '1st Shift'}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p2}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p3}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p4}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s2}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p5}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p6}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s3}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${tot}</Data></Cell>
      <Cell${dutyStyle}><Data ss:Type="String">${dutyMode}</Data></Cell>
      <Cell${statusStyle}><Data ss:Type="String">${status}</Data></Cell>
     </Row>`;
    });

    ws += `
    </Table>
   </Worksheet>`;
    return ws;
  };

  let xml = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:o="urn:schemas-microsoft-com:office:office"
   xmlns:x="urn:schemas-microsoft-com:office:excel"
   xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:html="http://www.w3.org/TR/REC-html40">
   <Styles>
    <Style ss:ID="Header">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="HeaderMgmt">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#B45309" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Title">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="14"/>
     <Interior ss:Color="#0F2744" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="SubTitle">
     <Font ss:Color="#475569" ss:Size="10" ss:Italic="1"/>
     <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RowEven">
     <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RowOdd">
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="DoubleShift">
     <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
     <Font ss:Bold="1" ss:Color="#92400E"/>
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="DoubleShiftTag">
     <Interior ss:Color="#FDE68A" ss:Pattern="Solid"/>
     <Font ss:Bold="1" ss:Color="#B45309"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Present">
     <Font ss:Bold="1" ss:Color="#047857"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Absent">
     <Font ss:Bold="1" ss:Color="#B91C1C"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Center">
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
   </Styles>`;

  const mgmtList = list.filter(r => r.category === 'Management' || r.deviceId === 'DEV-01');
  const staffList = list.filter(r => r.category !== 'Management' && r.deviceId !== 'DEV-01');

  if (categoryFilter === 'Management') {
    xml += buildWorksheetXml('Management (5 Leaders)', 'BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT', mgmtList, 'HeaderMgmt');
  } else if (categoryFilter === 'Staff') {
    xml += buildWorksheetXml('Station Staff (29 Staff)', 'BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT', staffList, 'Header');
  } else {
    // ALL: Distinct, separate sheets - never mixed!
    xml += buildWorksheetXml('Station Staff (29 Staff)', 'BABU RAJU RAM FUEL STATION - STATION STAFF ATTENDANCE REPORT', staffList, 'Header');
    xml += buildWorksheetXml('Management (5 Leaders)', 'BABU RAJU RAM FUEL STATION - MANAGEMENT ATTENDANCE REPORT', mgmtList, 'HeaderMgmt');
  }

  xml += `
  </Workbook>`;

  const cleanLabel = dateLabel.replace(/[\s:]+/g, '_');
  const catSuffix = categoryFilter === 'ALL' ? '_Separated' : `_${categoryFilter}`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Petrol_Bunk_4Punch_Report_${cleanLabel}${catSuffix}.xls`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`4-Punch Excel report (${categoryFilter}) downloaded successfully!`, 'success');
}

// Generate & Download Monthly 4-Punch Detailed Excel Workbook (Dedicated Sheets for Staff & Management)
function generateMonthlyDetailedExcel(monthStr, shiftFilter, desigFilter, records = null, deviceFilter = 'ALL', categoryFilter = 'ALL') {
  let list = (records && records.length) ? records.slice() : state.attendance.slice();

  if (shiftFilter !== 'ALL') {
    if (shiftFilter === 'SUPP') {
      list = list.filter(r => r.shiftCode === 'D12' || r.shiftCode === 'N12' || (r.shift && r.shift.includes('12H')));
    } else {
      list = list.filter(r => r.shiftCode === shiftFilter);
    }
  }

  if (desigFilter !== 'ALL') {
    list = list.filter(r => r.designation === desigFilter);
  }

  if (deviceFilter && deviceFilter !== 'ALL') {
    list = list.filter(r => r.deviceId === deviceFilter || (r.terminal && r.terminal.includes(deviceFilter)) || (r.deviceIp && r.deviceIp.includes(deviceFilter)));
  }

  const mgmtList = list.filter(r => r.category === 'Management' || r.deviceId === 'DEV-01');
  const staffList = list.filter(r => r.category !== 'Management' && r.deviceId !== 'DEV-01');

  const buildEmployeeMap = (items) => {
    const empMap = {};
    items.forEach(r => {
      const key = r.staffId || r.employeeNo || r.name;
      if (!empMap[key]) {
        empMap[key] = {
          empId: r.employeeNo || r.staffId || '--',
          name: r.name,
          designation: r.designation || 'Staff',
          category: r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff'),
          shift: r.shift || '1st Shift',
          daysPresent: 0,
          daysAbsent: 0,
          doubleShifts: 0,
          totalHours: 0
        };
      }
      const hrs = parseFloat(r.hoursWorked) || 0;
      if (r.status === 'Present' || hrs > 0) {
        empMap[key].daysPresent++;
      } else if (r.status === 'Absent') {
        empMap[key].daysAbsent++;
      }
      if (r.shiftsCount > 1) {
        empMap[key].doubleShifts++;
      }
      empMap[key].totalHours += hrs;
    });
    return Object.values(empMap);
  };

  const renderSummarySheetXml = (sheetName, titleText, subText, empItems, headerStyle = 'HeaderSummary') => {
    let grandDaysPresent = 0, grandDaysAbsent = 0, grandDoubleShifts = 0, grandTotalHours = 0;
    empItems.forEach(e => {
      grandDaysPresent += e.daysPresent;
      grandDaysAbsent += e.daysAbsent;
      grandDoubleShifts += e.doubleShifts;
      grandTotalHours += e.totalHours;
    });

    let ws = `
   <Worksheet ss:Name="${sheetName}">
    <Table>
     <Column ss:Width="45"/>
     <Column ss:Width="65"/>
     <Column ss:Width="140"/>
     <Column ss:Width="100"/>
     <Column ss:Width="100"/>
     <Column ss:Width="140"/>
     <Column ss:Width="90"/>
     <Column ss:Width="90"/>
     <Column ss:Width="110"/>
     <Column ss:Width="110"/>
     <Column ss:Width="110"/>
     <Column ss:Width="100"/>
     <Row ss:Height="30" ss:StyleID="TitleSummary">
      <Cell ss:MergeAcross="11"><Data ss:Type="String">${titleText}</Data></Cell>
     </Row>
     <Row ss:Height="20" ss:StyleID="SubTitle">
      <Cell ss:MergeAcross="11"><Data ss:Type="String">${subText}</Data></Cell>
     </Row>
     <Row ss:Height="8"></Row>
     <Row ss:Height="24" ss:StyleID="${headerStyle}">
      <Cell><Data ss:Type="String">Sl No</Data></Cell>
      <Cell><Data ss:Type="String">Emp ID</Data></Cell>
      <Cell><Data ss:Type="String">Employee Name</Data></Cell>
      <Cell><Data ss:Type="String">Designation</Data></Cell>
      <Cell><Data ss:Type="String">Category</Data></Cell>
      <Cell><Data ss:Type="String">Assigned Shift</Data></Cell>
      <Cell><Data ss:Type="String">Days Present</Data></Cell>
      <Cell><Data ss:Type="String">Days Absent</Data></Cell>
      <Cell><Data ss:Type="String">Double Shifts</Data></Cell>
      <Cell><Data ss:Type="String">Total Hours Worked</Data></Cell>
      <Cell><Data ss:Type="String">Avg Daily Hours</Data></Cell>
      <Cell><Data ss:Type="String">Attendance Rate</Data></Cell>
     </Row>`;

    empItems.forEach((e, idx) => {
      const rowStyle = (idx % 2 === 0 ? ' ss:StyleID="RowEven"' : ' ss:StyleID="RowOdd"');
      const avgHrs = e.daysPresent > 0 ? (e.totalHours / e.daysPresent).toFixed(2) : '0.00';
      const totalDays = e.daysPresent + e.daysAbsent;
      const rate = totalDays > 0 ? Math.round((e.daysPresent / totalDays) * 100) + '%' : '100%';

      ws += `
     <Row ss:Height="20"${rowStyle}>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${idx + 1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${e.empId}</Data></Cell>
      <Cell><Data ss:Type="String">${e.name}</Data></Cell>
      <Cell><Data ss:Type="String">${e.designation}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${e.category}</Data></Cell>
      <Cell><Data ss:Type="String">${e.shift}</Data></Cell>
      <Cell ss:StyleID="BoldCenter"><Data ss:Type="Number">${e.daysPresent}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${e.daysAbsent}</Data></Cell>
      <Cell ss:StyleID="${e.doubleShifts > 0 ? 'DoubleShiftTag' : 'Center'}"><Data ss:Type="Number">${e.doubleShifts}</Data></Cell>
      <Cell ss:StyleID="BoldCenter"><Data ss:Type="Number">${e.totalHours.toFixed(2)}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${avgHrs} hrs</Data></Cell>
      <Cell ss:StyleID="BoldCenter"><Data ss:Type="String">${rate}</Data></Cell>
     </Row>`;
    });

    ws += `
     <Row ss:Height="24" ss:StyleID="TotalFooter">
      <Cell ss:MergeAcross="5"><Data ss:Type="String">TOTALS (MONTH: ${monthStr})</Data></Cell>
      <Cell><Data ss:Type="Number">${grandDaysPresent}</Data></Cell>
      <Cell><Data ss:Type="Number">${grandDaysAbsent}</Data></Cell>
      <Cell><Data ss:Type="Number">${grandDoubleShifts}</Data></Cell>
      <Cell><Data ss:Type="Number">${grandTotalHours.toFixed(2)}</Data></Cell>
      <Cell ss:MergeAcross="1"><Data ss:Type="String">${grandTotalHours.toFixed(2)} hrs</Data></Cell>
     </Row>
    </Table>
   </Worksheet>`;
    return ws;
  };

  const renderLogsSheetXml = (sheetName, titleText, subText, logItems, headerStyle = 'HeaderLogs') => {
    let ws = `
   <Worksheet ss:Name="${sheetName}">
    <Table>
     <Column ss:Width="40"/>
     <Column ss:Width="85"/>
     <Column ss:Width="65"/>
     <Column ss:Width="130"/>
     <Column ss:Width="100"/>
     <Column ss:Width="95"/>
     <Column ss:Width="140"/>
     <Column ss:Width="70"/>
     <Column ss:Width="70"/>
     <Column ss:Width="75"/>
     <Column ss:Width="70"/>
     <Column ss:Width="70"/>
     <Column ss:Width="75"/>
     <Column ss:Width="80"/>
     <Column ss:Width="80"/>
     <Column ss:Width="75"/>
     <Row ss:Height="30" ss:StyleID="TitleLogs">
      <Cell ss:MergeAcross="15"><Data ss:Type="String">${titleText}</Data></Cell>
     </Row>
     <Row ss:Height="20" ss:StyleID="SubTitle">
      <Cell ss:MergeAcross="15"><Data ss:Type="String">${subText}</Data></Cell>
     </Row>
     <Row ss:Height="8"></Row>
     <Row ss:Height="24" ss:StyleID="${headerStyle}">
      <Cell><Data ss:Type="String">Sl No</Data></Cell>
      <Cell><Data ss:Type="String">Date</Data></Cell>
      <Cell><Data ss:Type="String">Emp ID</Data></Cell>
      <Cell><Data ss:Type="String">Employee Name</Data></Cell>
      <Cell><Data ss:Type="String">Designation</Data></Cell>
      <Cell><Data ss:Type="String">Category</Data></Cell>
      <Cell><Data ss:Type="String">Assigned Shift</Data></Cell>
      <Cell><Data ss:Type="String">Punch 1 (In 1)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 2 (Out 1)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 1 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Punch 3 (In 2)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 4 (Out 2)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 2 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Punch 5 (In 3)</Data></Cell>
      <Cell><Data ss:Type="String">Punch 6 (Out 3)</Data></Cell>
      <Cell><Data ss:Type="String">Shift 3 Hrs</Data></Cell>
      <Cell><Data ss:Type="String">Total Hours</Data></Cell>
      <Cell><Data ss:Type="String">Duty Mode</Data></Cell>
      <Cell><Data ss:Type="String">Status</Data></Cell>
     </Row>`;

    logItems.forEach((r, idx) => {
      const isTrp = (r.shiftsCount >= 3 || (r.dutyMode && r.dutyMode.includes('3 Shift')));
      const isDbl = (!isTrp && (r.shiftsCount === 2 || (r.dutyMode && r.dutyMode.includes('2 Shift'))));
      const rowStyle = isTrp ? ' ss:StyleID="DoubleShift"' : (isDbl ? ' ss:StyleID="DoubleShift"' : (idx % 2 === 0 ? ' ss:StyleID="RowEven"' : ' ss:StyleID="RowOdd"'));
      const p1 = r.punch1 || r.punchIn || '--:--';
      const p2 = r.punch2 || (r.shiftsCount === 1 ? r.punchOut : '--:--') || '--:--';
      const s1 = (r.shift1Hours && r.shift1Hours > 0) ? r.shift1Hours : 0.0;
      const p3 = r.punch3 || '--:--';
      const p4 = r.punch4 || '--:--';
      const s2 = (r.shift2Hours && r.shift2Hours > 0) ? r.shift2Hours : 0.0;
      const p5 = r.punch5 || '--:--';
      const p6 = r.punch6 || '--:--';
      const s3 = (r.shift3Hours && r.shift3Hours > 0) ? r.shift3Hours : 0.0;
      const tot = (r.hoursWorked && r.hoursWorked > 0) ? r.hoursWorked : 0.0;
      const dutyMode = r.dutyMode || (isTrp ? '3 Shift(s)' : (isDbl ? '2 Shift(s)' : (r.shiftsCount === 1 ? '1 Shift(s)' : '0 Shift(s)')));
      const status = r.status || 'Present';
      const statusStyle = status === 'Present' ? ' ss:StyleID="Present"' : (status === 'Absent' ? ' ss:StyleID="Absent"' : ' ss:StyleID="Center"');
      const dutyStyle = (isTrp || isDbl) ? ' ss:StyleID="DoubleShiftTag"' : ' ss:StyleID="Center"';
      const cat = r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff');

      ws += `
     <Row ss:Height="20"${rowStyle}>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${idx + 1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${formatDisplayDate(r.date)}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${r.employeeNo || r.staffId || idx + 1}</Data></Cell>
      <Cell><Data ss:Type="String">${r.name}</Data></Cell>
      <Cell><Data ss:Type="String">${r.designation || 'Staff'}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${cat}</Data></Cell>
      <Cell><Data ss:Type="String">${r.shift || '1st Shift'}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p2}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s1}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p3}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p4}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s2}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p5}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="String">${p6}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${s3}</Data></Cell>
      <Cell ss:StyleID="Center"><Data ss:Type="Number">${tot}</Data></Cell>
      <Cell${dutyStyle}><Data ss:Type="String">${dutyMode}</Data></Cell>
      <Cell${statusStyle}><Data ss:Type="String">${status}</Data></Cell>
     </Row>`;
    });

    ws += `
    </Table>
   </Worksheet>`;
    return ws;
  };

  let xml = `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:o="urn:schemas-microsoft-com:office:office"
   xmlns:x="urn:schemas-microsoft-com:office:excel"
   xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:html="http://www.w3.org/TR/REC-html40">
   <Styles>
    <Style ss:ID="HeaderSummary">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#059669" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="HeaderMgmtSummary">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#B45309" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="HeaderLogs">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="HeaderMgmtLogs">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
     <Interior ss:Color="#92400E" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="TitleSummary">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="14"/>
     <Interior ss:Color="#064E3B" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="TitleLogs">
     <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="14"/>
     <Interior ss:Color="#0F2744" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="SubTitle">
     <Font ss:Color="#475569" ss:Size="10" ss:Italic="1"/>
     <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="TotalFooter">
     <Font ss:Bold="1" ss:Color="#064E3B" ss:Size="11"/>
     <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RowEven">
     <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RowOdd">
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="DoubleShift">
     <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
     <Font ss:Bold="1" ss:Color="#92400E"/>
     <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="DoubleShiftTag">
     <Interior ss:Color="#FDE68A" ss:Pattern="Solid"/>
     <Font ss:Bold="1" ss:Color="#B45309"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Present">
     <Font ss:Bold="1" ss:Color="#047857"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Absent">
     <Font ss:Bold="1" ss:Color="#B91C1C"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Center">
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="BoldCenter">
     <Font ss:Bold="1"/>
     <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
   </Styles>`;

  if (categoryFilter === 'Management') {
    const mgmtEmps = buildEmployeeMap(mgmtList);
    xml += renderSummarySheetXml('Mgmt Payroll Summary (5)', `BABU RAJU RAM FUEL STATION - MANAGEMENT PAYROLL SUMMARY (${monthStr})`, `Month: ${monthStr} | Management Count: ${mgmtEmps.length}`, mgmtEmps, 'HeaderMgmtSummary');
    xml += renderLogsSheetXml('Mgmt Daily Logs', `BABU RAJU RAM FUEL STATION - MANAGEMENT DAILY LOGS (${monthStr})`, `Month: ${monthStr} | Total Records: ${mgmtList.length}`, mgmtList, 'HeaderMgmtLogs');
  } else if (categoryFilter === 'Staff') {
    const staffEmps = buildEmployeeMap(staffList);
    xml += renderSummarySheetXml('Staff Payroll Summary (29)', `BABU RAJU RAM FUEL STATION - STAFF PAYROLL SUMMARY (${monthStr})`, `Month: ${monthStr} | Staff Count: ${staffEmps.length}`, staffEmps, 'HeaderSummary');
    xml += renderLogsSheetXml('Staff Daily Logs', `BABU RAJU RAM FUEL STATION - STAFF DAILY LOGS (${monthStr})`, `Month: ${monthStr} | Total Records: ${staffList.length}`, staffList, 'HeaderLogs');
  } else {
    // ALL: Generate 4 completely separate sheets - NEVER mix Staff and Management!
    const staffEmps = buildEmployeeMap(staffList);
    const mgmtEmps = buildEmployeeMap(mgmtList);
    xml += renderSummarySheetXml('Staff Payroll Summary (29)', `BABU RAJU RAM FUEL STATION - STATION STAFF PAYROLL SUMMARY (${monthStr})`, `Month: ${monthStr} | Staff Count: ${staffEmps.length} | Dedicated Staff Sheet`, staffEmps, 'HeaderSummary');
    xml += renderLogsSheetXml('Staff Daily Logs (29)', `BABU RAJU RAM FUEL STATION - STATION STAFF DAILY 4-PUNCH LOGS (${monthStr})`, `Month: ${monthStr} | Total Records: ${staffList.length}`, staffList, 'HeaderLogs');
    xml += renderSummarySheetXml('Mgmt Summary (5)', `BABU RAJU RAM FUEL STATION - MANAGEMENT PAYROLL SUMMARY (${monthStr})`, `Month: ${monthStr} | Management Leaders: ${mgmtEmps.length} | Dedicated Management Sheet`, mgmtEmps, 'HeaderMgmtSummary');
    xml += renderLogsSheetXml('Mgmt Daily Logs (5)', `BABU RAJU RAM FUEL STATION - MANAGEMENT DAILY 4-PUNCH LOGS (${monthStr})`, `Month: ${monthStr} | Total Records: ${mgmtList.length}`, mgmtList, 'HeaderMgmtLogs');
  }

  xml += `
  </Workbook>`;

  const catSuffix = categoryFilter === 'ALL' ? '_Separated' : `_${categoryFilter}`;
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Petrol_Bunk_Monthly_4Punch_Report_${monthStr}${catSuffix}.xls`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`Monthly 4-Punch Excel report (${categoryFilter}) downloaded successfully!`, 'success');
}

// Generate & Download Monthly 4-Punch CSV Report (Staff & Management Strictly Separated)
function generateMonthlyDetailedCsv(monthStr, shiftFilter, desigFilter, records = null, deviceFilter = 'ALL', categoryFilter = 'ALL') {
  let list = (records && records.length) ? records.slice() : state.attendance.slice();

  if (shiftFilter !== 'ALL') {
    if (shiftFilter === 'SUPP') {
      list = list.filter(r => r.shiftCode === 'D12' || r.shiftCode === 'N12' || (r.shift && r.shift.includes('12H')));
    } else {
      list = list.filter(r => r.shiftCode === shiftFilter);
    }
  }

  if (desigFilter !== 'ALL') {
    list = list.filter(r => r.designation === desigFilter);
  }

  if (deviceFilter && deviceFilter !== 'ALL') {
    list = list.filter(r => r.deviceId === deviceFilter || (r.terminal && r.terminal.includes(deviceFilter)) || (r.deviceIp && r.deviceIp.includes(deviceFilter)));
  }

  const mgmtList = list.filter(r => r.category === 'Management' || r.deviceId === 'DEV-01');
  const staffList = list.filter(r => r.category !== 'Management' && r.deviceId !== 'DEV-01');

  const buildEmployeeMap = (items) => {
    const empMap = {};
    items.forEach(r => {
      const key = r.staffId || r.employeeNo || r.name;
      if (!empMap[key]) {
        empMap[key] = {
          empId: r.employeeNo || r.staffId || '--',
          name: r.name,
          designation: r.designation || 'Staff',
          category: r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff'),
          shift: r.shift || '1st Shift',
          daysPresent: 0,
          daysAbsent: 0,
          doubleShifts: 0,
          totalHours: 0
        };
      }
      const hrs = parseFloat(r.hoursWorked) || 0;
      if (r.status === 'Present' || hrs > 0) {
        empMap[key].daysPresent++;
      } else if (r.status === 'Absent') {
        empMap[key].daysAbsent++;
      }
      if (r.shiftsCount > 1) {
        empMap[key].doubleShifts++;
      }
      empMap[key].totalHours += hrs;
    });
    return Object.values(empMap);
  };

  const addSummaryRows = (csvRows, sectionHeader, empList) => {
    csvRows.push([sectionHeader]);
    csvRows.push(['Sl No', 'Employee ID', 'Employee Name', 'Designation', 'Category', 'Assigned Shift', 'Days Present', 'Days Absent', 'Double Shifts', 'Total Hours Worked', 'Avg Daily Hours', 'Attendance Rate']);
    empList.forEach((e, idx) => {
      const avgHrs = e.daysPresent > 0 ? (e.totalHours / e.daysPresent).toFixed(2) : '0.00';
      const totalDays = e.daysPresent + e.daysAbsent;
      const rate = totalDays > 0 ? Math.round((e.daysPresent / totalDays) * 100) + '%' : '100%';

      csvRows.push([
        idx + 1,
        e.empId,
        `"${e.name}"`,
        `"${e.designation}"`,
        `"${e.category}"`,
        `"${e.shift}"`,
        e.daysPresent,
        e.daysAbsent,
        e.doubleShifts,
        `${e.totalHours.toFixed(2)} hrs`,
        `${avgHrs} hrs`,
        rate
      ]);
    });
  };

  const addLogRows = (csvRows, sectionHeader, logList) => {
    csvRows.push([sectionHeader]);
    csvRows.push(['Sl No', 'Date', 'Employee ID', 'Employee Name', 'Designation', 'Category', 'Assigned Shift', 'Punch 1 (In 1)', 'Punch 2 (Out 1)', 'Shift 1 Hrs', 'Punch 3 (In 2)', 'Punch 4 (Out 2)', 'Shift 2 Hrs', 'Punch 5 (In 3)', 'Punch 6 (Out 3)', 'Shift 3 Hrs', 'Total Hours', 'Duty Mode', 'Status']);
    logList.forEach((r, idx) => {
      const p1 = r.punch1 || r.punchIn || '--:--';
      const p2 = r.punch2 || (r.shiftsCount === 1 ? r.punchOut : '--:--') || '--:--';
      const s1 = (r.shift1Hours && r.shift1Hours > 0) ? r.shift1Hours : 0;
      const p3 = r.punch3 || '--:--';
      const p4 = r.punch4 || '--:--';
      const s2 = (r.shift2Hours && r.shift2Hours > 0) ? r.shift2Hours : 0;
      const p5 = r.punch5 || '--:--';
      const p6 = r.punch6 || '--:--';
      const s3 = (r.shift3Hours && r.shift3Hours > 0) ? r.shift3Hours : 0;
      const tot = (r.hoursWorked && r.hoursWorked > 0) ? `${r.hoursWorked} hrs` : ((r.status === 'Present' && r.date === getLocalDateString()) ? 'In Progress' : '0 hrs');
      const dutyMode = r.dutyMode || (r.shiftsCount >= 3 ? '3 Shift(s)' : (r.shiftsCount === 2 ? '2 Shift(s)' : (r.shiftsCount === 1 ? '1 Shift(s)' : '0 Shift(s)')));
      const cat = r.category || (r.deviceId === 'DEV-01' ? 'Management' : 'Staff');

      csvRows.push([
        idx + 1,
        formatDisplayDate(r.date),
        r.employeeNo || r.staffId || idx + 1,
        `"${r.name}"`,
        `"${r.designation || 'Staff'}"`,
        `"${cat}"`,
        `"${r.shift || '1st Shift'}"`,
        p1,
        p2,
        s1,
        p3,
        p4,
        s2,
        p5,
        p6,
        s3,
        tot,
        dutyMode,
        r.status || 'Present'
      ]);
    });
  };

  const csvRows = [];
  csvRows.push(['BABU RAJU RAM FUEL STATION - MONTHLY 4-PUNCH ATTENDANCE & PAYROLL REPORT']);
  csvRows.push([`Month: ${monthStr}`, `Filter Shift: ${shiftFilter}`, `Filter Designation: ${desigFilter}`, `Category: ${categoryFilter}`, 'Multi-Shift Calculation Supported']);
  csvRows.push([]);

  if (categoryFilter === 'Management') {
    const mgmtEmps = buildEmployeeMap(mgmtList);
    addSummaryRows(csvRows, '=== SECTION 1: MANAGEMENT TEAM PAYROLL SUMMARY (5 LEADERS) ===', mgmtEmps);
    csvRows.push([]);
    addLogRows(csvRows, '=== SECTION 2: MANAGEMENT TEAM DAILY 4-PUNCH LOGS ===', mgmtList);
  } else if (categoryFilter === 'Staff') {
    const staffEmps = buildEmployeeMap(staffList);
    addSummaryRows(csvRows, '=== SECTION 1: STATION OPERATIONAL STAFF PAYROLL SUMMARY (29 STAFF) ===', staffEmps);
    csvRows.push([]);
    addLogRows(csvRows, '=== SECTION 2: STATION OPERATIONAL STAFF DAILY 4-PUNCH LOGS ===', staffList);
  } else {
    // ALL: Distinct sections for Management & Staff
    const mgmtEmps = buildEmployeeMap(mgmtList);
    const staffEmps = buildEmployeeMap(staffList);
    addSummaryRows(csvRows, '=== SECTION 1: MANAGEMENT TEAM PAYROLL SUMMARY (5 LEADERS) ===', mgmtEmps);
    csvRows.push([]);
    addSummaryRows(csvRows, '=== SECTION 2: STATION OPERATIONAL STAFF PAYROLL SUMMARY (29 STAFF) ===', staffEmps);
    csvRows.push([]);
    addLogRows(csvRows, '=== SECTION 3: MANAGEMENT TEAM DAILY 4-PUNCH LOGS ===', mgmtList);
    csvRows.push([]);
    addLogRows(csvRows, '=== SECTION 4: STATION OPERATIONAL STAFF DAILY 4-PUNCH LOGS ===', staffList);
  }

  const catSuffix = categoryFilter === 'ALL' ? '_Separated' : `_${categoryFilter}`;
  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Petrol_Bunk_Monthly_4Punch_Report_${monthStr}${catSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`Monthly 4-Punch CSV report (${categoryFilter}) downloaded successfully!`, 'success');
}

// Report Generator Buttons & Preset Handlers
function initReports() {
  const repFromDate = document.getElementById('repFromDate');
  const repToDate = document.getElementById('repToDate');
  const btnExcel = document.getElementById('btnDownloadExcel');
  const btnCsv = document.getElementById('btnDownloadCsv');
  const btnQuickExcel = document.getElementById('btnQuickExportExcel');

  const btnQuick14ToToday = document.getElementById('btnQuick14ToToday');
  const btnQuickToday = document.getElementById('btnQuickToday');
  const btnQuickYesterday = document.getElementById('btnQuickYesterday');
  const btnQuick14th = document.getElementById('btnQuick14th');

  const btnMonthExcel = document.getElementById('btnDownloadMonthExcel');
  const btnMonthCsv = document.getElementById('btnDownloadMonthCsv');
  const repMonthSelect = document.getElementById('repMonthSelect');

  const today = getLocalDateString();
  if (repFromDate && !repFromDate.value) repFromDate.value = '2026-09-14';
  if (repToDate) repToDate.value = today;
  if (repMonthSelect && !repMonthSelect.value) repMonthSelect.value = today.substring(0, 7);

  // Preset Buttons
  if (btnQuick14ToToday) {
    btnQuick14ToToday.addEventListener('click', () => {
      if (repFromDate) repFromDate.value = '2026-09-14';
      if (repToDate) repToDate.value = today;
      showToast('Date range set: 14th to Today (2026-09-14 to ' + today + ')', 'info');
    });
  }

  if (btnQuickToday) {
    btnQuickToday.addEventListener('click', () => {
      if (repFromDate) repFromDate.value = today;
      if (repToDate) repToDate.value = today;
      showToast('Date range set: Today (' + today + ')', 'info');
    });
  }

  if (btnQuickYesterday) {
    btnQuickYesterday.addEventListener('click', () => {
      if (repFromDate) repFromDate.value = '2026-09-15';
      if (repToDate) repToDate.value = '2026-09-15';
      showToast('Date range set: Yesterday (2026-09-15)', 'info');
    });
  }

  if (btnQuick14th) {
    btnQuick14th.addEventListener('click', () => {
      if (repFromDate) repFromDate.value = '2026-09-14';
      if (repToDate) repToDate.value = '2026-09-14';
      showToast('Date range set: 14th Only (2026-09-14)', 'info');
    });
  }

  // Handle Date Range Report Export (Card 1)
  const handleExport = async (type) => {
    const fromDate = repFromDate ? repFromDate.value : '2026-09-14';
    const toDate = repToDate ? repToDate.value : today;
    const shift = document.getElementById('repShift')?.value || 'ALL';
    const desig = document.getElementById('repDesignation')?.value || 'ALL';
    const category = document.getElementById('repCategory')?.value || 'ALL';

    const label = (fromDate === toDate) ? fromDate : `${fromDate}_to_${toDate}`;
    showToast(`Generating ${category} ${type.toUpperCase()} report for ${fromDate} to ${toDate}...`, 'info');

    let records = null;
    try {
      let url = `/api/attendance?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
      if (category !== 'ALL') url += `&category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      if (res.ok) {
        records = await res.json();
      }
    } catch (e) {
      console.error('Error fetching attendance for date range:', e);
    }

    if (type === 'excel') generateExcelXmlReport(label, shift, desig, records, 'ALL', category);
    else generateCsvReport(label, shift, desig, records, 'ALL', category);
  };

  if (btnExcel) btnExcel.addEventListener('click', () => handleExport('excel'));
  if (btnCsv) btnCsv.addEventListener('click', () => handleExport('csv'));
  if (btnQuickExcel) {
    btnQuickExcel.addEventListener('click', () => {
      const label = (state.fromDate === state.toDate) ? state.fromDate : `${state.fromDate}_to_${state.toDate}`;
      generateExcelXmlReport(label, state.filterShift, 'ALL', null, state.filterDevice, state.filterCategory);
    });
  }

  // Handle Monthly Report Export (Card 2)
  const handleMonthExport = async (type) => {
    const month = repMonthSelect ? repMonthSelect.value : today.substring(0, 7);
    const shift = document.getElementById('repMonthShift')?.value || 'ALL';
    const desig = document.getElementById('repMonthDesignation')?.value || 'ALL';
    const category = document.getElementById('repMonthCategory')?.value || 'ALL';

    showToast(`Generating Monthly 4-Punch ${category} ${type.toUpperCase()} report for ${month}...`, 'info');

    let records = null;
    try {
      let url = `/api/attendance?month=${encodeURIComponent(month)}`;
      if (category !== 'ALL') url += `&category=${encodeURIComponent(category)}`;
      const res = await fetch(url);
      if (res.ok) {
        records = await res.json();
      }
    } catch (e) {
      console.error('Error fetching attendance for month:', e);
    }

    if (type === 'excel') generateMonthlyDetailedExcel(month, shift, desig, records, 'ALL', category);
    else generateMonthlyDetailedCsv(month, shift, desig, records, 'ALL', category);
  };

  if (btnMonthExcel) btnMonthExcel.addEventListener('click', () => handleMonthExport('excel'));
  if (btnMonthCsv) btnMonthCsv.addEventListener('click', () => handleMonthExport('csv'));
}

// Refresh all app data
async function refreshAllData() {
  await Promise.all([fetchStaff(), fetchAttendance(), fetchDashboard()]);
  renderAttendance();
  renderStaffDirectory();
  renderDashboard();
}

// Mark present mock / action
window.markPresent = function(id) {
  const item = state.attendance.find(a => a.id === id);
  if (item) {
    item.status = 'Present';
    if (item.punchIn === '--:--') item.punchIn = '06:00';
    if (item.punchOut === '--:--') item.punchOut = '14:00';
    item.hoursWorked = 8.0;
    renderAttendance();
    showToast(`Punch verified for ${item.name}!`, 'success');
  }
};

window.deleteEmployee = deleteEmployee;

function initRotateButtons() {
  const btnRot1 = document.getElementById('btnRotateShiftsAtt');
  const btnRot2 = document.getElementById('btnRotateShiftsStaff');
  const btnRot3 = document.getElementById('btnRotateShiftsDash');
  if (btnRot1) btnRot1.addEventListener('click', rotateAllShifts);
  if (btnRot2) btnRot2.addEventListener('click', rotateAllShifts);
  if (btnRot3) btnRot3.addEventListener('click', rotateAllShifts);
}

// Application Initialization
async function startApp() {
  initClock();
  initTabs();
  initModal();
  initBiometricModal();
  initFilters();
  initRotateButtons();
  initReports();
  await refreshAllData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
