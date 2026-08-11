// IIBS Service Ticketing System — Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Simple password protection
  const pwd = prompt("Enter Admin Password to access the IT Dashboard:");
  if (pwd !== 'admin123') {
    document.body.innerHTML = `
      <div style="display:flex; justify-content:center; align-items:center; height:100vh; background: #0f172a; color: #fff; font-family: sans-serif;">
        <div style="text-align: center;">
          <h1 style="color: #ef4444; margin-bottom: 1rem;">Access Denied</h1>
          <p>Incorrect password.</p>
          <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
        </div>
      </div>
    `;
    return;
  }

  // Initialize Lucide Icons
  lucide.createIcons();

  // ===== State =====
  let tickets = [];
  
  // Supabase has been replaced with Local MongoDB Server

  // ===== Fetch Data from Backend =====
  async function fetchTicketsFromSupabase() { // Keeping function name to prevent breaking other logic
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      
      tickets = data.map(row => ({
        dbId: row.ticket_id,
        id: row.ticket_id,
        date: row.created_at,
        name: row.name,
        iibsId: row.iibs_id,
        role: row.role,
        department: row.department,
        course: row.course || '',
        classroom: row.classroom || '',
        contact: row.contact,
        email: row.email,
        ticketType: row.ticket_type,
        otherRequest: row.other_request || '',
        status: row.status,
        resolution: row.resolution || '',
        attendedBy: row.attended_by || '',
        approvalMailSent: row.approval_mail_sent || false,
        cctvApproverEmail: row.cctv_approver_email || ''
      }));
      
      renderStats();
      renderRecentList();
      renderTickets();
    } catch (error) {
      console.error('Error fetching Tickets:', error);
      document.getElementById('ticketList').innerHTML = `
        <div class="empty-state">
          <i data-lucide="wifi-off"></i>
          <p>Unable to connect to database</p>
          <small>Please check your backend server configuration.</small>
        </div>
      `;
      lucide.createIcons();
    }
  }

  // ===== Render Stats =====
  function renderStats() {
    document.getElementById('statTotal').textContent = tickets.length;
    document.getElementById('statOpen').textContent = tickets.filter(t => t.status === 'open').length;
    document.getElementById('statProgress').textContent = tickets.filter(t => t.status === 'progress').length;
    document.getElementById('statResolved').textContent = tickets.filter(t => t.status === 'resolved').length;
  }

  // ===== Render Recent List (Home) =====
  function renderRecentList() {
    const list = document.getElementById('recentList');
    if (!list) return;

    if (tickets.length === 0) {
      list.innerHTML = '<div class="recent-empty"><p>No service tickets yet. Raise your first ticket to get started!</p></div>';
      return;
    }

    // Sort by timestamp descending
    const recent = [...tickets].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    list.innerHTML = recent.map(t => {
      const timeAgo = getTimeAgo(t.date);
      return `
        <div class="recent-item">
          <div class="recent-left">
            <span class="recent-id">${t.id}</span>
            <span class="recent-subject">${t.ticketType}</span>
          </div>
          <div class="recent-meta">
            <span class="badge badge-${t.status}">${formatStatus(t.status)}</span>
            <span class="badge badge-category">${t.role}</span>
            <span>${timeAgo}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== Render Tickets (Track Tab) =====
  function renderTickets() {
    const list = document.getElementById('ticketList');
    if (!list) return;

    const searchTerm = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    const filterType = document.getElementById('filterType')?.value || 'all';
    const filterRole = document.getElementById('filterRole')?.value || 'all';

    let filtered = [...tickets];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.ticketType === filterType);
    }
    if (filterRole !== 'all') {
      filtered = filtered.filter(t => t.role === filterRole);
    }
    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(searchTerm) ||
        t.name.toLowerCase().includes(searchTerm) ||
        t.iibsId.toLowerCase().includes(searchTerm) ||
        t.ticketType.toLowerCase().includes(searchTerm) ||
        t.department.toLowerCase().includes(searchTerm) ||
        (t.otherRequest && t.otherRequest.toLowerCase().includes(searchTerm))
      );
    }

    // Sort: open/progress first, then newest
    filtered.sort((a, b) => {
      const statusOrder = { open: 0, progress: 1, resolved: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(b.date) - new Date(a.date);
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="inbox"></i>
          <p>No service tickets found</p>
          <small>Try adjusting your filters or raise a new ticket</small>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = filtered.map(t => {
      let dateString = t.date;
      try {
        dateString = new Date(t.date).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch(e) {}

      const descriptionText = t.ticketType === 'Request for Other' && t.otherRequest
        ? t.otherRequest
        : t.ticketType;

      return `
        <div class="ticket-item priority-${t.status === 'open' ? 'medium' : t.status === 'progress' ? 'high' : 'low'}" data-id="${t.id}" style="cursor: pointer;">
          <div class="ticket-top">
            <div class="ticket-top-left">
              <span class="ticket-id">${t.id}</span>
              <span class="badge badge-${t.status}">${formatStatus(t.status)}</span>
              <span class="badge badge-category">${t.ticketType}</span>
              ${t.ticketType === 'CCTV Footage Checking' && t.approvalMailSent && t.status === 'open' ? `<span class="badge" style="background: #fef3c7; color: #b45309;">Pending Approval</span>` : ''}
            </div>
            <!-- Visual indicator that it's clickable -->
            <i data-lucide="chevron-right" style="color: var(--text-secondary); width: 20px; height: 20px;"></i>
          </div>
          <div class="ticket-subject">${descriptionText}</div>
          
          <div class="ticket-meta">
            <span><i data-lucide="user"></i> ${t.name}</span>
            <span><i data-lucide="id-card"></i> ${t.iibsId}</span>
            <span><i data-lucide="users"></i> ${t.role}</span>
            ${t.role === 'Student' 
              ? `<span><i data-lucide="graduation-cap"></i> ${t.course}</span><span><i data-lucide="door-open"></i> ${t.classroom}</span>`
              : `<span><i data-lucide="building-2"></i> ${t.department}</span>`}
            <span><i data-lucide="phone"></i> ${t.contact}</span>
            <span><i data-lucide="clock"></i> ${dateString}</span>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Attach event listeners for opening modals
    document.querySelectorAll('.ticket-item').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        openTicketDetailModal(id);
      });
    });
  }

  // ===== Ticket Detail Modal Handling =====
  const detailModal = document.getElementById('ticketDetailModal');
  const detailCloseBtn = document.getElementById('detailCloseBtn');
  const detailSaveBtn = document.getElementById('detailSaveBtn');
  let currentEditingTicketId = null;

  function openTicketDetailModal(id) {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    currentEditingTicketId = id;
    
    let dateString = ticket.date;
    try {
      dateString = new Date(ticket.date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch(e) {}

    const desc = ticket.ticketType === 'Request for Other' && ticket.otherRequest
      ? ticket.otherRequest
      : ticket.ticketType;

    document.getElementById('detailModalTitle').textContent = `Ticket ${ticket.id}`;
    document.getElementById('detailModalBody').innerHTML = `
      <div style="margin-bottom: 1rem;">
        <span class="badge badge-${ticket.status}" style="margin-right: 0.5rem;">${formatStatus(ticket.status)}</span>
        <span class="badge badge-category">${ticket.ticketType}</span>
        ${ticket.ticketType === 'CCTV Footage Checking' && ticket.approvalMailSent ? 
          (ticket.status === 'approved' ? `<div style="background-color: #ecfdf5; color: #047857; padding: 10px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #10b981; display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="width: 18px; height: 18px;"></i> Approved by: <strong>${ticket.cctvApproverEmail || 'Approver'}</strong></div>` : 
           ticket.status === 'rejected' ? `<div style="background-color: #fef2f2; color: #b91c1c; padding: 10px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #ef4444; display: flex; align-items: center; gap: 8px;"><i data-lucide="x-circle" style="width: 18px; height: 18px;"></i> Rejected by: <strong>${ticket.cctvApproverEmail || 'Approver'}</strong></div>` :
           `<div style="background-color: #fffbeb; color: #b45309; padding: 10px; border-radius: 6px; margin-top: 10px; border-left: 4px solid #f59e0b; display: flex; align-items: center; gap: 8px;"><i data-lucide="mail" style="width: 18px; height: 18px;"></i> Pending Approval from: <strong>${ticket.cctvApproverEmail || 'Approver'}</strong></div>`) 
        : ''}
      </div>
      <p style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 1rem; font-weight: 500;">${desc}</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
        <div><strong>Name:</strong> ${ticket.name}</div>
        <div><strong>ID:</strong> ${ticket.iibsId}</div>
        <div><strong>Role:</strong> ${ticket.role}</div>
        ${ticket.role === 'Student'
          ? `<div><strong>Course:</strong> ${ticket.course}</div><div><strong>Classroom:</strong> ${ticket.classroom}</div>`
          : `<div><strong>Dept:</strong> ${ticket.department}</div>`}
        <div><strong>Contact:</strong> ${ticket.contact}</div>
        <div><strong>Email:</strong> ${ticket.email}</div>
        <div style="grid-column: 1 / -1;"><strong>Submitted:</strong> ${dateString}</div>
        ${ticket.attendedBy ? `<div style="grid-column: 1 / -1; color: #4f46e5;"><strong>Attended By:</strong> ${ticket.attendedBy}</div>` : ''}
      </div>

      ${ticket.resolution ? `
        <div style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-left: 3px solid #10b981; border-radius: 4px;">
          <h4 style="margin-bottom: 0.25rem; color: #10b981; font-size: 0.9rem;">Resolution</h4>
          <p style="font-size: 0.95rem; color: var(--text-primary); white-space: pre-wrap;">${ticket.resolution}</p>
        </div>
      ` : ''}
    `;

    document.getElementById('detailStatusUpdate').value = ticket.status;
    document.getElementById('detailResolutionInput').value = ticket.resolution || '';
    document.getElementById('detailAttendedBy').value = ticket.attendedBy || '';

    if (detailModal) detailModal.classList.add('visible');
  }

  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', () => {
      if (detailModal) detailModal.classList.remove('visible');
    });
  }

  const detailPrintBtn = document.getElementById('detailPrintBtn');
  if (detailPrintBtn) {
    detailPrintBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.remove('visible');
    });
  }

  if (detailSaveBtn) {
    detailSaveBtn.addEventListener('click', async () => {
      if (!currentEditingTicketId) return;
      
      const newStatus = document.getElementById('detailStatusUpdate').value;
      const newRes = document.getElementById('detailResolutionInput').value;
      const newAttendedBy = document.getElementById('detailAttendedBy').value;
      
      const ticket = tickets.find(t => t.id === currentEditingTicketId);
      if (ticket) {
        // Update Backend Database!
        detailSaveBtn.textContent = 'Saving...';
        detailSaveBtn.disabled = true;

        try {
          const res = await fetch(`/api/tickets/${ticket.dbId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, resolution: newRes, attended_by: newAttendedBy })
          });

          if (!res.ok) throw new Error('API failed');
          
          // Success! Update local state
          ticket.status = newStatus;
          ticket.resolution = newRes;
          ticket.attendedBy = newAttendedBy;
          renderStats();
          renderRecentList();
          renderTickets();
          detailModal.classList.remove('visible');

        } catch (error) {
          console.error('Error updating ticket:', error);
          alert("Failed to save. Please try again.");
        }

        detailSaveBtn.textContent = 'Save Updates';
        detailSaveBtn.disabled = false;
      }
    });
  }

  // ===== "Other Request" toggle =====
  const ticketTypeSelect = document.getElementById('ticketType');
  const otherRequestGroup = document.getElementById('otherRequestGroup');

  if (ticketTypeSelect) {
    ticketTypeSelect.addEventListener('change', () => {
      if (ticketTypeSelect.value === 'Request for Other') {
        otherRequestGroup.style.display = 'block';
      } else {
        otherRequestGroup.style.display = 'none';
      }
    });
  }

  // ===== Department Toggle Based on Role =====
  const userRoleEl = document.getElementById('userRole');
  const userDeptInput = document.getElementById('userDepartment');
  const userDeptSelect = document.getElementById('userDepartmentSelect');
  const departmentGroup = document.getElementById('departmentGroup');
  const studentFieldsGroup = document.getElementById('studentFieldsGroup');
  const userCourse = document.getElementById('userCourse');
  const userClassroom = document.getElementById('userClassroom');
  
  if (userRoleEl && departmentGroup && studentFieldsGroup) {
    userRoleEl.addEventListener('change', (e) => {
      if (e.target.value === 'Student') {
        departmentGroup.style.display = 'none';
        userDeptInput.removeAttribute('required');
        userDeptSelect.removeAttribute('required');
        
        studentFieldsGroup.style.display = 'block';
        userCourse.setAttribute('required', 'true');
        userClassroom.removeAttribute('required');
      } else if (e.target.value === 'Staff') {
        studentFieldsGroup.style.display = 'none';
        userCourse.removeAttribute('required');
        userClassroom.removeAttribute('required');
        
        departmentGroup.style.display = 'block';
        userDeptInput.style.display = 'none';
        userDeptInput.removeAttribute('required');
        userDeptSelect.style.display = 'block';
        userDeptSelect.setAttribute('required', 'true');
      } else {
        // Faculty or default
        studentFieldsGroup.style.display = 'none';
        userCourse.removeAttribute('required');
        userClassroom.removeAttribute('required');
        
        departmentGroup.style.display = 'block';
        userDeptSelect.style.display = 'none';
        userDeptSelect.removeAttribute('required');
        userDeptInput.style.display = 'block';
        userDeptInput.setAttribute('required', 'true');
      }
    });
  }

  // ===== Form Submission =====
  const form = document.getElementById('serviceForm');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (submitBtn) {
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
      }

      const dateStr = new Date();
      // Generate a nice TKT id using timestamp
      const tempId = `TKT-${dateStr.getTime().toString().substring(5)}`;

      const roleValue = document.getElementById('userRole').value;
      const deptValue = roleValue === 'Student' 
        ? '' 
        : (roleValue === 'Staff' ? document.getElementById('userDepartmentSelect').value : document.getElementById('userDepartment').value.trim());

      const newTicket = {
        ticket_id: tempId,
        name: document.getElementById('userName').value.trim(),
        iibs_id: document.getElementById('userIdNumber').value.trim(),
        role: roleValue,
        department: deptValue,
        course: roleValue === 'Student' ? document.getElementById('userCourse').value.trim() : '',
        classroom: roleValue === 'Student' ? document.getElementById('userClassroom').value.trim() : '',
        contact: document.getElementById('userContact').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        ticket_type: document.getElementById('ticketType').value,
        other_request: document.getElementById('otherRequest')?.value.trim() || '',
        status: 'open',
        resolution: ''
      };

      // Insert via API!
      try {
        const res = await fetch('/api/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTicket)
        });

        if (!res.ok) throw new Error('API failed');
      } catch (error) {
        console.error('Error inserting to DB:', error);
        alert('Failed to submit ticket. Please check your connection.');
        if (submitBtn) {
          submitBtn.textContent = 'Submit Service Ticket';
          submitBtn.disabled = false;
        }
        return;
      }

      // --- SEND TELEGRAM NOTIFICATION ---
      const botToken = '8723690135:AAEwhJhc5xZ5-_Q4OstXJcEDjxeMVR71L3I';
      const chatId = '1031181850';
      const message = `🚨 New IT Service Request\n\n` +
                      `ID: ${tempId}\n` +
                      `From: ${newTicket.name} (${newTicket.department})\n` +
                      `Type: ${newTicket.ticket_type}\n` +
                      `Contact: ${newTicket.contact}\n\n` +
                      `View Portal: https://iibsservicerequest.vercel.app/admin.html`;
      
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }).catch(err => console.error('Telegram notification failed:', err));

      // Success
      form.reset();
      otherRequestGroup.style.display = 'none';

      // Re-fetch all to get accurate IDs
      fetchTicketsFromSupabase();

      if (submitBtn) {
        submitBtn.textContent = 'Submit Service Ticket';
        submitBtn.disabled = false;
      }

      // Show success modal
      document.getElementById('modalTicketId').textContent = tempId;
      document.getElementById('successModal').classList.add('visible');
    });
  }

  // ===== Modal Handlers =====
  const modalTrackBtn = document.getElementById('modalTrackBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const successModal = document.getElementById('successModal');

  if (modalTrackBtn) {
    modalTrackBtn.addEventListener('click', () => {
      successModal.classList.remove('visible');
      switchTab('track');
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      successModal.classList.remove('visible');
    });
  }

  if (successModal) {
    successModal.addEventListener('click', (e) => {
      if (e.target === successModal) {
        successModal.classList.remove('visible');
      }
    });
  }

  // ===== Tab Navigation =====
  function switchTab(tabId) {
    document.querySelectorAll('#navLinks a').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabId);
    });

    // Close mobile menu
    document.getElementById('navLinks')?.classList.remove('open');

    // Refresh data when tabs are opened
    if (tabId === 'track') {
      fetchTicketsFromSupabase();
    } else if (tabId === 'inventory') {
      fetchInventoryFromSupabase();
    } else if (tabId === 'vendor') {
      fetchVendorReports();
      fetchSavedVendors();
    } else if (tabId === 'procurement') {
      fetchProcurement();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const navContainer = document.getElementById('navLinks');
  if (navContainer) {
    navContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        if (link.getAttribute('data-tab')) {
          e.preventDefault();
          switchTab(link.getAttribute('data-tab'));
        }
      });
    });
  }

  // Mobile menu toggle
  const mobileBtn = document.getElementById('mobileMenuBtn');
  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => {
      document.getElementById('navLinks')?.classList.toggle('open');
    });
  }

  // ===== Hero Buttons =====
  document.getElementById('heroRaiseBtn')?.addEventListener('click', () => switchTab('newticket'));
  document.getElementById('heroTrackBtn')?.addEventListener('click', () => switchTab('track'));

  // ===== Category Cards (pre-select ticket type) =====
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-ticket-type');
      switchTab('newticket');
      const typeSelect = document.getElementById('ticketType');
      if (typeSelect) {
        typeSelect.value = type;
        typeSelect.dispatchEvent(new Event('change'));
      }
    });
  });

  // ===== Filters =====
  document.getElementById('searchInput')?.addEventListener('input', () => renderTickets());
  document.getElementById('filterStatus')?.addEventListener('change', () => renderTickets());
  document.getElementById('filterType')?.addEventListener('change', () => renderTickets());
  document.getElementById('filterRole')?.addEventListener('change', () => renderTickets());

  // ===== Export Excel (CSV) =====
  document.getElementById('exportExcelBtn')?.addEventListener('click', () => {
    if (tickets.length === 0) {
      alert("No tickets to export.");
      return;
    }
    
    // Create CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Ticket ID,Name,IIBS ID,Role,Department,Course,Classroom,Contact,Email,Ticket Type,Details/Other Request,Status,Date Submitted,Work Details / Resolution\n";
    
    tickets.forEach(t => {
      // Helper to escape commas, quotes, and newlines
      const escapeCsv = (str) => {
        if (!str) return '""';
        const s = String(str).replace(/"/g, '""').replace(/\n/g, " ");
        return `"${s}"`;
      };
      
      let formattedDate = t.date;
      try {
        formattedDate = new Date(t.date).toLocaleString('en-IN');
      } catch(e) {}
      
      const row = [
        escapeCsv(t.id),
        escapeCsv(t.name),
        escapeCsv(t.iibsId),
        escapeCsv(t.role),
        escapeCsv(t.department),
        escapeCsv(t.course),
        escapeCsv(t.classroom),
        escapeCsv(t.contact),
        escapeCsv(t.email),
        escapeCsv(t.ticketType),
        escapeCsv(t.otherRequest),
        escapeCsv(t.status),
        escapeCsv(formattedDate),
        escapeCsv(t.resolution)
      ].join(",");
      
      csvContent += row + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `IIBS_Tickets_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ===== FAQ Accordion =====
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // ===== Header scroll effect =====
  window.addEventListener('scroll', () => {
    const header = document.getElementById('mainHeader');
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }
  });

  // ===== Logo click -> home =====
  document.getElementById('mainLogo')?.addEventListener('click', () => switchTab('home'));

  // ===== Utilities =====
  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      if (days < 7) return `${days}d ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch(e) {
      return dateStr;
    }
  }

  function formatStatus(status) {
    const map = { open: 'Open', progress: 'In Progress', resolved: 'Resolved', approved: 'Approved', rejected: 'Rejected' };
    return map[status] || status;
  }

  // ===== INVENTORY (STOCK REGISTER) LOGIC =====
  let inventoryItems = [];
  const addInventoryModal = document.getElementById('addInventoryModal');
  const updateInventoryModal = document.getElementById('updateInventoryModal');
  const historyInventoryModal = document.getElementById('historyInventoryModal');
  let currentUpdatingItemId = null;

  async function fetchInventoryFromSupabase() {
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

      inventoryItems = data || [];
      inventoryItems.sort((a, b) => new Date(a.date || a.last_updated || 0) - new Date(b.date || b.last_updated || 0));
      renderInventory();
    } catch (err) {
      console.error('Error fetching inventory:', err);
      // Fails silently if table doesn't exist yet, showing empty list
      document.getElementById('inventoryList').innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" style="color: var(--accent-rose);"></i>
          <p>Unable to load inventory.</p>
          <small>Did you create the "inventory" table in Supabase?</small>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderInventory() {
    const list = document.getElementById('inventoryList');
    if (!list) return;

    const searchInput = document.getElementById('inventorySearchInput');
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();

    let filtered = [...inventoryItems];
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const name = (item.particulars || item.item_name || item.item_description || '').toLowerCase();
        const serials = (item.serial_numbers || '').toLowerCase();
        const vendor = (item.vendor_name || '').toLowerCase();
        const billNo = (item.bill_no || '').toLowerCase();
        const dept = (item.department || '').toLowerCase();
        const assigned = (item.assigned_to || '').toLowerCase();
        return name.includes(searchTerm) || serials.includes(searchTerm) || vendor.includes(searchTerm) || billNo.includes(searchTerm) || dept.includes(searchTerm) || assigned.includes(searchTerm);
      });
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="box"></i>
          <p>No inventory items found</p>
          <small>${searchTerm ? 'Try clearing your search query' : 'Click "Add New Item" to start tracking stock'}</small>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = `
      <div class="inventory-table-card">
        <table class="stock-table">
          <thead>
            <tr>
              <th style="min-width: 105px;">Date</th>
              <th style="min-width: 150px;">Particulars</th>
              <th style="min-width: 190px;">Allocation / In Use By</th>
              <th style="min-width: 160px;">Vendor & Bill</th>
              <th class="col-center" style="width: 80px;">Opening</th>
              <th class="col-center" style="width: 80px;">Arrivals</th>
              <th class="col-center" style="width: 80px;">Total</th>
              <th class="col-center" style="width: 80px;">Closing</th>
              <th style="min-width: 200px;">Serial Numbers</th>
              <th class="col-right" style="min-width: 170px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(item => {
              let dateString = item.date || item.last_updated;
              try {
                const d = new Date(dateString);
                dateString = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
              } catch(e) {}
              
              const opening = item.opening_stock || 0;
              const arrivals = item.arrivals || 0;
              let total = opening + arrivals;
              if (opening === arrivals && opening > 0) {
                total = opening;
              }
              const closing = item.closing_stock !== undefined ? item.closing_stock : (item.quantity || 0);

              let vendorBillHtml = '<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>';
              if (item.vendor_name || item.bill_no || item.bill_amount) {
                const vName = item.vendor_name ? `<div style="font-weight: 600; color: var(--text-primary);">${item.vendor_name}</div>` : '';
                const bNo = item.bill_no ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">Bill: ${item.bill_no}</div>` : '';
                const bAmt = item.bill_amount ? `<div style="font-weight: 600; color: #10b981; font-size: 0.8rem;">₹${Number(item.bill_amount).toLocaleString('en-IN')}</div>` : '';
                let bDateStr = '';
                if (item.bill_date) {
                  try {
                    bDateStr = `<span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(item.bill_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>`;
                  } catch(e){}
                }
                vendorBillHtml = `
                  <div style="line-height: 1.35;">
                    ${vName}
                    ${bNo || bDateStr ? `<div>${bNo} ${bDateStr}</div>` : ''}
                    ${bAmt}
                  </div>
                `;
              }

              let allocationHtml = '<span style="color: var(--text-muted); font-size: 0.82rem; font-style: italic;">Unallocated</span>';
              if (item.department || item.assigned_to) {
                const deptBadge = item.department ? `<div class="stock-dept-badge"><i data-lucide="building-2" style="width: 12px; height: 12px;"></i> ${item.department}</div>` : '';
                const userBadge = item.assigned_to ? `<div class="stock-user-badge"><i data-lucide="user" style="width: 12px; height: 12px; color: var(--primary-color);"></i> ${item.assigned_to}</div>` : '';
                
                let statusPill = '';
                if (item.status) {
                  let statusClass = 'stock-status-other';
                  if (item.status === 'In Use') statusClass = 'stock-status-in-use';
                  else if (item.status === 'In Stock') statusClass = 'stock-status-in-stock';
                  else if (item.status === 'Under Maintenance') statusClass = 'stock-status-maintenance';
                  statusPill = `<span class="stock-status-pill ${statusClass}">${item.status}</span>`;
                }
                
                allocationHtml = `
                  <div style="line-height: 1.35;">
                    ${deptBadge}
                    ${userBadge}
                    ${statusPill}
                  </div>
                `;
              }

              let serialsHtml = '<span style="color: var(--text-muted); font-size: 0.85rem;">-</span>';
              const serialList = item.serial_numbers ? item.serial_numbers.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : [];
              if (serialList.length > 0) {
                const visibleSerials = serialList.slice(0, 3).map(sn => 
                  `<span style="display: inline-block; background: var(--bg-body, #f1f5f9); color: var(--primary-color, #4f46e5); font-family: monospace; font-size: 0.78rem; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color, #cbd5e1); margin: 2px 2px 2px 0;">${sn}</span>`
                ).join(' ');
                const remaining = serialList.length - 3;
                const moreBadge = remaining > 0 ? `<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; margin-left: 4px;">+${remaining} more</span>` : '';
                serialsHtml = `<div>${visibleSerials} ${moreBadge}</div>`;
              }

              const itemId = item.id || item._id;

              return `
                <tr>
                  <td style="white-space: nowrap; color: var(--text-secondary);">${dateString}</td>
                  <td style="font-weight: 600; color: var(--text-primary);">${item.particulars || item.item_name || item.item_description || '-'}</td>
                  <td>${allocationHtml}</td>
                  <td>${vendorBillHtml}</td>
                  <td class="col-num">${opening}</td>
                  <td class="col-num stock-badge-arrivals">${arrivals > 0 ? '+' + arrivals : arrivals}</td>
                  <td class="col-num" style="background: rgba(0,0,0,0.01);">${total}</td>
                  <td class="col-center"><span class="stock-badge-closing">${closing}</span></td>
                  <td>${serialsHtml}</td>
                  <td class="col-right" style="white-space: nowrap;">
                    <button class="btn-secondary btn-serials-stock" data-id="${itemId}" style="padding: 0.32rem 0.65rem; font-size: 0.82rem; margin-right: 0.25rem; color: #4f46e5; border-color: rgba(79, 70, 229, 0.3); font-weight: 500;"><i data-lucide="barcode" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Serials</button>
                    <button class="btn-secondary btn-update-stock" data-id="${itemId}" style="padding: 0.32rem 0.65rem; font-size: 0.82rem; margin-right: 0.25rem; color: var(--primary-color); border-color: rgba(79, 70, 229, 0.4); font-weight: 600; background: rgba(79, 70, 229, 0.05);"><i data-lucide="edit" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Edit</button>
                    <button class="btn-secondary btn-delete-stock" data-id="${itemId}" style="padding: 0.32rem 0.65rem; font-size: 0.82rem; color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3); font-weight: 500;"><i data-lucide="trash-2" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    lucide.createIcons();

    // Attach serials listeners
    document.querySelectorAll('.btn-serials-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openSerialsInventoryModal(id);
      });
    });

    // Attach edit listeners
    document.querySelectorAll('.btn-update-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openUpdateInventoryModal(id);
      });
    });

    // Attach history listeners
    document.querySelectorAll('.btn-history-stock').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openHistoryInventoryModal(id);
      });
    });

    // Attach delete listeners
    document.querySelectorAll('.btn-delete-stock').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const item = inventoryItems.find(i => (i.id || i._id) === id);
        if (!item) return;
        
        if (confirm(`Are you sure you want to permanently delete "${item.particulars || item.item_name}"?\nThis will also delete all of its history logs.`)) {
          btn.textContent = 'Deleting...';
          btn.disabled = true;
          try {
            const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('API failed');
            fetchInventoryFromSupabase();
          } catch (error) {
            alert("Error deleting item. Please try again.");
            btn.textContent = 'Delete';
            btn.disabled = false;
          }
        }
      });
    });
  }

  document.getElementById('inventorySearchInput')?.addEventListener('input', () => renderInventory());

  // Export Stock Register to CSV
  document.getElementById('exportStockBtn')?.addEventListener('click', () => {
    if (!inventoryItems || inventoryItems.length === 0) {
      alert("No stock items available to export.");
      return;
    }
    const headers = ["Date", "Particulars", "Department", "Assigned To / In Use By", "Allocation Status", "Vendor Name", "Bill No", "Bill Date", "Bill Amount", "Opening Stock", "Arrivals", "Issues", "Closing Stock", "Serial Numbers"];
    const rows = inventoryItems.map(item => {
      let dateString = item.date || item.last_updated || '';
      try { dateString = new Date(dateString).toISOString().split('T')[0]; } catch(e){}
      let billDateStr = item.bill_date ? new Date(item.bill_date).toISOString().split('T')[0] : '';
      return [
        `"${dateString}"`,
        `"${(item.particulars || item.item_name || '').replace(/"/g, '""')}"`,
        `"${(item.department || '').replace(/"/g, '""')}"`,
        `"${(item.assigned_to || '').replace(/"/g, '""')}"`,
        `"${(item.status || 'In Stock').replace(/"/g, '""')}"`,
        `"${(item.vendor_name || '').replace(/"/g, '""')}"`,
        `"${(item.bill_no || '').replace(/"/g, '""')}"`,
        `"${billDateStr}"`,
        item.bill_amount || 0,
        item.opening_stock || 0,
        item.arrivals || 0,
        item.issues || 0,
        item.closing_stock !== undefined ? item.closing_stock : (item.quantity || 0),
        `"${(item.serial_numbers || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Stock_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // ===== MULTIPLE STOCK ITEMS ENTRY LOGIC =====
  const invMultiItemsContainer = document.getElementById('invMultiItemsContainer');
  const addStockItemRowBtn = document.getElementById('addStockItemRowBtn');
  const invAddTopCloseBtn = document.getElementById('invAddTopCloseBtn');

  function calcStockRow(row) {
    const op = parseInt(row.querySelector('.stock-row-opening')?.value) || 0;
    const arr = parseInt(row.querySelector('.stock-row-arrivals')?.value) || 0;
    const iss = parseInt(row.querySelector('.stock-row-issues')?.value) || 0;

    let total = op + arr;
    if (op === arr && op > 0) {
      total = op;
    }

    const closing = Math.max(0, total - iss);
    
    const totalEl = row.querySelector('.stock-row-total');
    const closingEl = row.querySelector('.stock-row-closing');
    if (totalEl) totalEl.value = total;
    if (closingEl) closingEl.value = closing;

    updateStockOverallSummary();
  }

  function updateStockRowSerialsCount(row) {
    const textarea = row.querySelector('.stock-row-serials');
    const badge = row.querySelector('.stock-row-serials-badge');
    if (!textarea || !badge) return;

    const list = textarea.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const count = list.length;
    badge.textContent = count === 1 ? '1 Serial' : `${count} Serials`;
    badge.style.color = count > 0 ? '#4f46e5' : 'var(--text-muted)';
    badge.style.background = count > 0 ? 'rgba(79, 70, 229, 0.1)' : 'rgba(0,0,0,0.05)';
  }

  function updateStockRowIndices() {
    if (!invMultiItemsContainer) return;
    const rows = invMultiItemsContainer.querySelectorAll('.stock-entry-card');
    const total = rows.length;

    rows.forEach((row, idx) => {
      const badge = row.querySelector('.stock-item-badge');
      if (badge) badge.innerHTML = `<i data-lucide="box" style="width: 12px; height: 12px;"></i> #${idx + 1} Item`;
      
      const removeBtn = row.querySelector('.btn-remove-stock-row');
      if (removeBtn) {
        removeBtn.style.display = total > 1 ? 'inline-flex' : 'none';
      }
    });

    const countEl = document.getElementById('invItemCount');
    if (countEl) countEl.textContent = total;

    const saveBtnText = document.getElementById('invAddSaveBtnText');
    if (saveBtnText) {
      saveBtnText.textContent = total > 1 ? `Save ${total} Stock Items` : 'Save Stock Entry';
    }

    lucide.createIcons();
    updateStockOverallSummary();
  }

  function updateStockOverallSummary() {
    if (!invMultiItemsContainer) return;
    const rows = invMultiItemsContainer.querySelectorAll('.stock-entry-card');
    let totalItems = rows.length;
    let totalArrivals = 0;
    let totalClosing = 0;

    rows.forEach(row => {
      totalArrivals += parseInt(row.querySelector('.stock-row-arrivals')?.value) || 0;
      totalClosing += parseInt(row.querySelector('.stock-row-closing')?.value) || 0;
    });

    const totItemsEl = document.getElementById('invSummaryTotalItems');
    const totArrEl = document.getElementById('invSummaryArrivals');
    const totClosEl = document.getElementById('invSummaryClosing');

    if (totItemsEl) totItemsEl.textContent = totalItems;
    if (totArrEl) totArrEl.textContent = `${totalArrivals} units`;
    if (totClosEl) totClosEl.textContent = `${totalClosing} units`;
  }

  function createStockItemRow(initialData = {}) {
    if (!invMultiItemsContainer) return null;

    const row = document.createElement('div');
    row.className = 'stock-entry-card';
    row.innerHTML = `
      <div class="stock-entry-card-header">
        <span class="stock-item-badge">
          <i data-lucide="box" style="width: 12px; height: 12px;"></i> #1 Item
        </span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="stock-row-serials-badge" style="font-size: 0.76rem; font-weight: 600; padding: 2px 7px; border-radius: 12px; background: rgba(0,0,0,0.05); color: var(--text-muted);">0 Serials</span>
          <button type="button" class="btn-remove-stock-row" title="Remove this item row">
            <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i> Remove
          </button>
        </div>
      </div>

      <div class="stock-fields-row">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600;">Particulars / Item Name *</label>
          <input type="text" class="stock-row-particulars" placeholder="e.g. Dell Latitude 3420 / Keyboard" value="${initialData.particulars || ''}" required style="margin-top: 3px;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600; text-align: center; display: block;">Opening</label>
          <input type="number" class="stock-row-opening" value="${initialData.opening_stock !== undefined ? initialData.opening_stock : 0}" min="0" style="margin-top: 3px; text-align: center;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600; text-align: center; display: block;">Arrivals</label>
          <input type="number" class="stock-row-arrivals" value="${initialData.arrivals !== undefined ? initialData.arrivals : 0}" min="0" style="margin-top: 3px; text-align: center; color: #10b981; font-weight: 600;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600; text-align: center; display: block;">Issues</label>
          <input type="number" class="stock-row-issues" value="${initialData.issues !== undefined ? initialData.issues : 0}" min="0" style="margin-top: 3px; text-align: center;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600; text-align: center; display: block;">Total</label>
          <input type="number" class="stock-row-total stock-calc-field" value="0" readonly style="margin-top: 3px;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.8rem; font-weight: 600; text-align: center; display: block;">Closing</label>
          <input type="number" class="stock-row-closing stock-calc-field" value="0" readonly style="margin-top: 3px; font-weight: 700; color: #4f46e5;">
        </div>
      </div>

      <!-- Department & In-Use Person Allocation -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.06);">
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.78rem; font-weight: 600; color: #0284c7; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="building" style="width: 12px; height: 12px;"></i> Given to Department (Optional)
          </label>
          <input type="text" class="stock-row-department" list="stockDepartmentList" placeholder="e.g. Accounts / IT / Admin" value="${initialData.department || ''}" style="margin-top: 3px; font-size: 0.84rem;">
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label style="font-size: 0.78rem; font-weight: 600; color: #0284c7; display: flex; align-items: center; gap: 4px;">
            <i data-lucide="user-check" style="width: 12px; height: 12px;"></i> In Use By (Person / Staff Name)
          </label>
          <input type="text" class="stock-row-assigned-to" placeholder="e.g. Prof. Sharma / Dr. Ramesh" value="${initialData.assigned_to || ''}" style="margin-top: 3px; font-size: 0.84rem;">
        </div>
      </div>

      <div class="stock-serials-collapse">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <label style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
            <i data-lucide="barcode" style="width: 13px; height: 13px; color: var(--primary-color);"></i> Item Serial Numbers (Optional)
          </label>
          <span style="font-size: 0.74rem; color: var(--text-muted);">Separate by commas or new lines</span>
        </div>
        <textarea class="stock-row-serials" rows="2" placeholder="e.g. SN1001, SN1002, SN1003..." style="width: 100%; box-sizing: border-box; padding: 0.45rem 0.7rem; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-body); color: var(--text-primary); font-family: inherit; font-size: 0.84rem; resize: vertical;">${initialData.serial_numbers || ''}</textarea>
      </div>
    `;

    invMultiItemsContainer.appendChild(row);

    // Attach listeners for calculations
    const openingInput = row.querySelector('.stock-row-opening');
    const arrivalsInput = row.querySelector('.stock-row-arrivals');
    const issuesInput = row.querySelector('.stock-row-issues');
    const serialsInput = row.querySelector('.stock-row-serials');
    const removeBtn = row.querySelector('.btn-remove-stock-row');

    openingInput?.addEventListener('input', () => calcStockRow(row));
    arrivalsInput?.addEventListener('input', () => calcStockRow(row));
    issuesInput?.addEventListener('input', () => calcStockRow(row));
    serialsInput?.addEventListener('input', () => updateStockRowSerialsCount(row));

    removeBtn?.addEventListener('click', () => {
      row.remove();
      if (invMultiItemsContainer.querySelectorAll('.stock-entry-card').length === 0) {
        createStockItemRow();
      } else {
        updateStockRowIndices();
      }
    });

    calcStockRow(row);
    updateStockRowSerialsCount(row);
    updateStockRowIndices();
    return row;
  }

  if (addStockItemRowBtn) {
    addStockItemRowBtn.addEventListener('click', () => {
      const newRow = createStockItemRow();
      if (newRow) {
        const input = newRow.querySelector('.stock-row-particulars');
        if (input) input.focus();
      }
    });
  }

  // Open Add Modal
  document.getElementById('addStockBtn')?.addEventListener('click', () => {
    document.getElementById('invNewDate').value = new Date().toISOString().split('T')[0];
    if (document.getElementById('invNewVendor')) document.getElementById('invNewVendor').value = '';
    if (document.getElementById('invNewBillNo')) document.getElementById('invNewBillNo').value = '';
    if (document.getElementById('invNewBillDate')) document.getElementById('invNewBillDate').value = '';
    if (document.getElementById('invNewBillAmount')) document.getElementById('invNewBillAmount').value = '';

    if (invMultiItemsContainer) {
      invMultiItemsContainer.innerHTML = '';
      createStockItemRow();
    }

    addInventoryModal.classList.add('visible');
  });

  if (invAddTopCloseBtn) {
    invAddTopCloseBtn.addEventListener('click', () => {
      addInventoryModal.classList.remove('visible');
    });
  }

  document.getElementById('invAddCloseBtn')?.addEventListener('click', () => {
    addInventoryModal.classList.remove('visible');
  });

  // Save All Items
  document.getElementById('invAddSaveBtn')?.addEventListener('click', async () => {
    const date = document.getElementById('invNewDate')?.value;
    const vendor_name = document.getElementById('invNewVendor')?.value.trim() || '';
    const bill_no = document.getElementById('invNewBillNo')?.value.trim() || '';
    const bill_date = document.getElementById('invNewBillDate')?.value || null;
    const bill_amount = parseFloat(document.getElementById('invNewBillAmount')?.value) || 0;

    if (!date) {
      alert("Please specify the Date of Entry.");
      document.getElementById('invNewDate')?.focus();
      return;
    }

    const rows = invMultiItemsContainer ? Array.from(invMultiItemsContainer.querySelectorAll('.stock-entry-card')) : [];
    if (rows.length === 0) {
      alert("Please add at least one stock item.");
      return;
    }

    const itemsPayload = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const particulars = row.querySelector('.stock-row-particulars')?.value.trim();
      if (!particulars) {
        alert(`Please enter Particulars / Item Name for Item #${i + 1}.`);
        row.querySelector('.stock-row-particulars')?.focus();
        return;
      }

      const opening_stock = parseInt(row.querySelector('.stock-row-opening')?.value) || 0;
      const arrivals = parseInt(row.querySelector('.stock-row-arrivals')?.value) || 0;
      const issues = parseInt(row.querySelector('.stock-row-issues')?.value) || 0;
      const closing_stock = parseInt(row.querySelector('.stock-row-closing')?.value) || 0;
      const department = row.querySelector('.stock-row-department')?.value.trim() || '';
      const assigned_to = row.querySelector('.stock-row-assigned-to')?.value.trim() || '';
      const serial_numbers = row.querySelector('.stock-row-serials')?.value.trim() || '';
      const status = (assigned_to || department) ? 'In Use' : 'In Stock';

      itemsPayload.push({
        date: date,
        particulars: particulars,
        opening_stock: opening_stock,
        arrivals: arrivals,
        issues: issues,
        closing_stock: closing_stock,
        department: department,
        assigned_to: assigned_to,
        status: status,
        vendor_name: vendor_name,
        bill_no: bill_no,
        bill_date: bill_date,
        bill_amount: bill_amount,
        serial_numbers: serial_numbers,
        item_name: particulars,
        quantity: closing_stock
      });
    }

    const btn = document.getElementById('invAddSaveBtn');
    const origBtnHtml = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 16px; height: 16px;"></i> Saving ${itemsPayload.length} Items...`;
    btn.disabled = true;
    lucide.createIcons();

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemsPayload.length === 1 ? itemsPayload[0] : itemsPayload)
      });

      if (!res.ok) throw new Error('API failed');

      addInventoryModal.classList.remove('visible');
      fetchInventoryFromSupabase();
    } catch (error) {
      alert("Error adding stock entries. Please check server logs and try again.");
    } finally {
      btn.innerHTML = origBtnHtml;
      btn.disabled = false;
      lucide.createIcons();
    }
  });

  // Auto-calculate for Update Modal
  function calcUpdateModal() {
    const op = parseInt(document.getElementById('invUpdateOpening').value) || 0;
    const arr = parseInt(document.getElementById('invUpdateArrivals').value) || 0;
    const iss = parseInt(document.getElementById('invUpdateIssues').value) || 0;
    
    let total = op + arr;
    if (op === arr && op > 0) {
      total = op;
    }
    
    document.getElementById('invUpdateTotal').value = total;
    document.getElementById('invUpdateClosing').value = total - iss;
  }
  document.getElementById('invUpdateOpening')?.addEventListener('input', calcUpdateModal);
  document.getElementById('invUpdateArrivals')?.addEventListener('input', calcUpdateModal);
  document.getElementById('invUpdateIssues')?.addEventListener('input', calcUpdateModal);

  const invUpdateTopCloseBtn = document.getElementById('invUpdateTopCloseBtn');
  if (invUpdateTopCloseBtn) {
    invUpdateTopCloseBtn.addEventListener('click', () => {
      updateInventoryModal.classList.remove('visible');
    });
  }

  function updateEditModalSerialsCount() {
    const text = document.getElementById('invUpdateSerials')?.value || '';
    const badge = document.getElementById('invUpdateSerialsCountBadge');
    if (!badge) return;
    const list = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    badge.textContent = list.length === 1 ? '1 Serial' : `${list.length} Serials`;
  }
  document.getElementById('invUpdateSerials')?.addEventListener('input', updateEditModalSerialsCount);

  // Update / Edit Stock Modal
  function openUpdateInventoryModal(id) {
    const item = inventoryItems.find(i => (i.id || i._id) === id);
    if (!item) return;

    currentUpdatingItemId = id;
    
    // Format date for the date input
    let dateVal = new Date().toISOString().split('T')[0];
    if (item.date) {
      dateVal = new Date(item.date).toISOString().split('T')[0];
    } else if (item.last_updated) {
      dateVal = new Date(item.last_updated).toISOString().split('T')[0];
    }

    document.getElementById('invUpdateDate').value = dateVal;
    document.getElementById('invUpdateParticulars').value = item.particulars || item.item_name || '';
    document.getElementById('invUpdateOpening').value = item.opening_stock || 0;
    document.getElementById('invUpdateArrivals').value = item.arrivals || 0;
    document.getElementById('invUpdateIssues').value = item.issues || 0;
    document.getElementById('invUpdateClosing').value = item.closing_stock !== undefined ? item.closing_stock : (item.quantity || 0);
    
    if (document.getElementById('invUpdateDepartment')) {
      document.getElementById('invUpdateDepartment').value = item.department || '';
    }
    if (document.getElementById('invUpdateAssignedTo')) {
      document.getElementById('invUpdateAssignedTo').value = item.assigned_to || '';
    }
    if (document.getElementById('invUpdateIssueDate')) {
      document.getElementById('invUpdateIssueDate').value = item.issue_date ? new Date(item.issue_date).toISOString().split('T')[0] : '';
    }
    if (document.getElementById('invUpdateStatus')) {
      document.getElementById('invUpdateStatus').value = item.status || (item.assigned_to || item.department ? 'In Use' : 'In Stock');
    }

    if (document.getElementById('invUpdateVendor')) document.getElementById('invUpdateVendor').value = item.vendor_name || '';
    if (document.getElementById('invUpdateBillNo')) document.getElementById('invUpdateBillNo').value = item.bill_no || '';
    if (document.getElementById('invUpdateBillDate')) {
      document.getElementById('invUpdateBillDate').value = item.bill_date ? new Date(item.bill_date).toISOString().split('T')[0] : '';
    }
    if (document.getElementById('invUpdateBillAmount')) document.getElementById('invUpdateBillAmount').value = item.bill_amount || '';
    if (document.getElementById('invUpdateSerials')) document.getElementById('invUpdateSerials').value = item.serial_numbers || '';
    
    updateEditModalSerialsCount();
    calcUpdateModal();

    updateInventoryModal.classList.add('visible');
  }

  document.getElementById('invUpdateCloseBtn')?.addEventListener('click', () => {
    updateInventoryModal.classList.remove('visible');
  });

  document.getElementById('invUpdateSaveBtn')?.addEventListener('click', async () => {
    if (!currentUpdatingItemId) return;
    
    const date = document.getElementById('invUpdateDate').value;
    const particulars = document.getElementById('invUpdateParticulars').value.trim();
    const opening_stock = parseInt(document.getElementById('invUpdateOpening').value) || 0;
    const arrivals = parseInt(document.getElementById('invUpdateArrivals').value) || 0;
    const issues = parseInt(document.getElementById('invUpdateIssues').value) || 0;
    const closing_stock = parseInt(document.getElementById('invUpdateClosing').value) || 0;
    const department = document.getElementById('invUpdateDepartment')?.value.trim() || '';
    const assigned_to = document.getElementById('invUpdateAssignedTo')?.value.trim() || '';
    const issue_date = document.getElementById('invUpdateIssueDate')?.value || null;
    const status = document.getElementById('invUpdateStatus')?.value || 'In Stock';
    const vendor_name = document.getElementById('invUpdateVendor')?.value.trim() || '';
    const bill_no = document.getElementById('invUpdateBillNo')?.value.trim() || '';
    const bill_date = document.getElementById('invUpdateBillDate')?.value || null;
    const bill_amount = parseFloat(document.getElementById('invUpdateBillAmount')?.value) || 0;
    const serial_numbers = document.getElementById('invUpdateSerials')?.value.trim() || '';

    if (!particulars || !date) {
      alert("Please fill required fields (Date, Particulars).");
      return;
    }

    const btn = document.getElementById('invUpdateSaveBtn');
    const origBtnHtml = btn.innerHTML;
    btn.innerHTML = `<i data-lucide="loader" class="spin" style="width: 15px; height: 15px;"></i> Saving Changes...`;
    btn.disabled = true;
    lucide.createIcons();

    try {
      const resInv = await fetch(`/api/inventory/${currentUpdatingItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: date,
          particulars: particulars,
          opening_stock: opening_stock,
          arrivals: arrivals,
          issues: issues,
          closing_stock: closing_stock,
          department: department,
          assigned_to: assigned_to,
          issue_date: issue_date,
          status: status,
          vendor_name: vendor_name,
          bill_no: bill_no,
          bill_date: bill_date,
          bill_amount: bill_amount,
          serial_numbers: serial_numbers,
          item_name: particulars,
          quantity: closing_stock
        })
      });
      
      if (!resInv.ok) throw new Error('Failed to update inventory');

      updateInventoryModal.classList.remove('visible');
      fetchInventoryFromSupabase();
    } catch (error) {
      alert("Error updating entry. Please try again.");
    } finally {
      btn.innerHTML = origBtnHtml;
      btn.disabled = false;
      lucide.createIcons();
    }
  });

  // Manage Serials Modal Logic
  const serialsInventoryModal = document.getElementById('serialsInventoryModal');
  let currentSerialsItemId = null;

  function updateSerialsPreview() {
    const text = document.getElementById('invManageSerialsInput')?.value || '';
    const container = document.getElementById('serialsPreviewContainer');
    const badge = document.getElementById('serialsCountBadge');
    
    const item = inventoryItems.find(i => (i.id || i._id) === currentSerialsItemId);
    const closingQty = item ? (item.closing_stock !== undefined ? item.closing_stock : (item.quantity || 0)) : 0;
    
    const serialList = text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    
    if (badge) {
      badge.textContent = closingQty > 0 ? `${serialList.length} / ${closingQty} Serials` : `${serialList.length} Serials`;
      if (closingQty > 0 && serialList.length === closingQty) {
        badge.style.background = 'rgba(16, 185, 129, 0.15)';
        badge.style.color = '#10b981';
      } else {
        badge.style.background = 'rgba(79, 70, 229, 0.1)';
        badge.style.color = 'var(--primary-color)';
      }
    }
    
    if (!container) return;
    
    if (serialList.length === 0) {
      container.innerHTML = `<span style="color: var(--text-muted); font-size: 0.85rem;">No serial numbers added yet. Enter or paste them above.</span>`;
      return;
    }
    
    container.innerHTML = `
      <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
        ${serialList.map((sn, idx) => `
          <span style="display: inline-flex; align-items: center; gap: 4px; background: var(--bg-body, #f1f5f9); color: var(--primary-color, #4f46e5); font-family: monospace; font-size: 0.82rem; padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color, #cbd5e1);">
            ${sn}
            <i data-lucide="x" data-idx="${idx}" class="btn-remove-serial" style="width: 12px; height: 12px; cursor: pointer; opacity: 0.6; margin-left: 2px;" title="Remove"></i>
          </span>
        `).join('')}
      </div>
    `;
    lucide.createIcons();
    
    container.querySelectorAll('.btn-remove-serial').forEach(icon => {
      icon.addEventListener('click', (e) => {
        const idxToRemove = parseInt(e.target.getAttribute('data-idx'));
        if (!isNaN(idxToRemove)) {
          serialList.splice(idxToRemove, 1);
          document.getElementById('invManageSerialsInput').value = serialList.join('\n');
          updateSerialsPreview();
        }
      });
    });
  }

  function openSerialsInventoryModal(id) {
    const item = inventoryItems.find(i => (i.id || i._id) === id);
    if (!item) return;

    currentSerialsItemId = id;
    const titleEl = document.getElementById('serialsInvItemTitle');
    if (titleEl) {
      const closingQty = item.closing_stock !== undefined ? item.closing_stock : (item.quantity || 0);
      titleEl.textContent = `${item.particulars || item.item_name || 'Item'} (${closingQty} units)`;
    }
    
    const input = document.getElementById('invManageSerialsInput');
    if (input) {
      const rawSerials = item.serial_numbers || '';
      const serialList = rawSerials.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
      input.value = serialList.join('\n');
    }
    
    updateSerialsPreview();
    if (serialsInventoryModal) serialsInventoryModal.classList.add('visible');
  }

  document.getElementById('invManageSerialsInput')?.addEventListener('input', updateSerialsPreview);
  
  document.getElementById('serialsCloseBtn')?.addEventListener('click', () => {
    if (serialsInventoryModal) serialsInventoryModal.classList.remove('visible');
  });

  document.getElementById('serialsSaveBtn')?.addEventListener('click', async () => {
    if (!currentSerialsItemId) return;
    const item = inventoryItems.find(i => (i.id || i._id) === currentSerialsItemId);
    if (!item) return;

    const rawText = document.getElementById('invManageSerialsInput')?.value || '';
    const serialList = rawText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const serial_numbers = serialList.join(', ');

    const btn = document.getElementById('serialsSaveBtn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const resInv = await fetch(`/api/inventory/${currentSerialsItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...item,
          serial_numbers: serial_numbers
        })
      });
      
      if (!resInv.ok) throw new Error('Failed to update serial numbers');

      if (serialsInventoryModal) serialsInventoryModal.classList.remove('visible');
      fetchInventoryFromSupabase();
    } catch (error) {
      alert("Error saving serial numbers. Please try again.");
    }
    btn.innerHTML = `<i data-lucide="check" style="width: 16px; height: 16px; display: inline-block; vertical-align: middle;"></i> Save Serial Numbers`;
    btn.disabled = false;
  });

  // History Modal Logic
  async function openHistoryInventoryModal(id) {
    const item = inventoryItems.find(i => (i.id || i._id) === id);
    if (!item) return;

    document.getElementById('historyInvTitle').textContent = `History: ${item.item_name}`;
    const listBody = document.getElementById('historyInvList');
    listBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 1rem;"><i data-lucide="loader" class="spin"></i> Loading logs...</td></tr>`;
    lucide.createIcons();
    
    historyInventoryModal.classList.add('visible');

    try {
      const res = await fetch(`/api/stock_log?item_id=${id}`);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

    if (!data || data.length === 0) {
      listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1rem;">No movement history found.</td></tr>`;
      return;
    }

    listBody.innerHTML = data.map(log => {
      let dateString = log.created_at;
      try {
        dateString = new Date(log.created_at).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch(e) {}
      
      const badgeColor = log.action === 'ADD' ? 'resolved' : 'open';
      
      let purchaseHtml = '-';
      if (log.action === 'ADD' && (log.supplier_name || log.purchase_cost || log.bill_photo_url)) {
        purchaseHtml = `
          <div style="font-size: 0.8rem;">
            ${log.supplier_name ? `<strong>Supplier:</strong> ${log.supplier_name}<br>` : ''}
            ${log.purchase_cost ? `<strong>Cost:</strong> ₹${log.purchase_cost}<br>` : ''}
            ${log.bill_photo_url ? `<a href="${log.bill_photo_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;"><i data-lucide="image" style="width: 14px; height: 14px; vertical-align: middle;"></i> View Bill</a>` : ''}
          </div>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 0.75rem 0; color: var(--text-primary); vertical-align: top;">${dateString}</td>
          <td style="padding: 0.75rem 0; vertical-align: top;"><span class="badge badge-${badgeColor}">${log.action}</span></td>
          <td style="padding: 0.75rem 0; font-weight: 600; vertical-align: top;">${log.amount}</td>
          <td style="padding: 0.75rem 0; color: var(--text-secondary); vertical-align: top;">${log.remarks || '-'}</td>
          <td style="padding: 0.75rem 0; color: var(--text-secondary); vertical-align: top;">${purchaseHtml}</td>
        </tr>
      `;
    }).join('');

    } catch (err) {
      console.error(err);
      listBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--accent-rose); padding: 1rem;">Failed to load history</td></tr>`;
    }
  }

  document.getElementById('historyCloseBtn')?.addEventListener('click', () => {
    historyInventoryModal.classList.remove('visible');
  });

  // Close modals on overlay click
  [addInventoryModal, updateInventoryModal, historyInventoryModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
      });
    }
  });

  // ===== Vendor Report Form Submission & Management =====
  let vendorReports = [];
  let savedVendors = [];

  // Fetch unique saved vendors
  async function fetchSavedVendors() {
    try {
      const res = await fetch('/api/vendors');
      if (!res.ok) throw new Error('Failed to fetch saved vendors');
      savedVendors = await res.json();
      
      const datalist = document.getElementById('vendorNamesList');
      if (datalist) {
        datalist.innerHTML = savedVendors.map(v => `<option value="${v.vendor_name}">`).join('');
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  }

  // Handle vendor auto-fill
  const vendorNameInput = document.getElementById('vendorName');
  if (vendorNameInput) {
    vendorNameInput.addEventListener('input', (e) => {
      const selected = savedVendors.find(v => v.vendor_name === e.target.value);
      if (selected) {
        document.getElementById('vendorEmail').value = selected.vendor_email || '';
        document.getElementById('vendorContact').value = selected.contact_person || '';
      }
    });
  }

  // ===== VENDOR REPORTS API =====
  const addVendorModal = document.getElementById('addVendorModal');
  const addVendorBtn = document.getElementById('addVendorBtn');
  const vendorModalCloseBtn = document.getElementById('vendorModalCloseBtn');
  const vendorReportForm = document.getElementById('vendorReportForm');
  const vendorSubmitBtn = document.getElementById('vendorSubmitBtn');

  if (addVendorBtn) addVendorBtn.addEventListener('click', () => addVendorModal?.classList.add('visible'));
  if (vendorModalCloseBtn) vendorModalCloseBtn.addEventListener('click', () => addVendorModal?.classList.remove('visible'));
  
  if (addVendorModal) {
    addVendorModal.addEventListener('click', (e) => {
      if (e.target === addVendorModal) addVendorModal.classList.remove('visible');
    });
  }

  async function fetchVendorReports() {
    try {
      const res = await fetch('/api/vendor-report');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      vendorReports = data || [];
      vendorReports.sort((a, b) => new Date(a.service_date || a.createdAt || 0) - new Date(b.service_date || b.createdAt || 0));
      renderVendorReports();
    } catch (err) {
      console.error('Error fetching vendor reports:', err);
      document.getElementById('vendorListContainer').innerHTML = `
        <div class="empty-state">
          <i data-lucide="alert-triangle" style="color: var(--accent-rose);"></i>
          <p>Unable to load vendor reports.</p>
        </div>
      `;
      lucide.createIcons();
    }
  }

  function renderVendorReports() {
    const list = document.getElementById('vendorListContainer');
    if (!list) return;

    if (vendorReports.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="file-check"></i>
          <p>No vendor reports found</p>
          <small>Click "Add Service Entry" to log a new report</small>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = `
      <div style="overflow-x: auto; background: var(--bg-secondary); border-radius: 8px; padding: 1rem;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Date</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Vendor Name</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Contact Person</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Technician</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Service Details</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary);">Remarks</th>
              <th style="padding: 1rem 0.5rem; color: var(--text-secondary); text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${vendorReports.map(report => {
              let dateString = report.service_date;
              try {
                dateString = new Date(report.service_date).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                });
              } catch(e) {}
              
              return `
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 1rem 0.5rem; white-space: nowrap;">${dateString}</td>
                  <td style="padding: 1rem 0.5rem; font-weight: 500;">
                    ${report.vendor_name}<br>
                    <span style="font-size: 0.8rem; color: var(--text-secondary); font-weight: normal;">${report.vendor_email}</span>
                  </td>
                  <td style="padding: 1rem 0.5rem;">${report.contact_person || '-'}</td>
                  <td style="padding: 1rem 0.5rem;">${report.technician_name || '-'}</td>
                  <td style="padding: 1rem 0.5rem; max-width: 250px; white-space: normal; overflow-wrap: break-word;">${report.service_details}</td>
                  <td style="padding: 1rem 0.5rem;">${report.remarks || '-'}</td>
                  <td style="padding: 1rem 0.5rem; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <a href="/api/vendor-report/${report._id}/pdf" download class="btn-secondary" style="padding: 0.4rem 0.8rem; text-decoration: none; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #3b82f6; color: #3b82f6;" title="Download PDF">
                      <i data-lucide="download" style="width: 14px; height: 14px;"></i> PDF
                    </a>
                    <button class="btn-secondary" onclick="resendVendorEmail('${report._id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px; color: #10b981; border-color: #10b981;" title="Resend Email">
                      <i data-lucide="send" style="width: 14px; height: 14px;"></i> Resend
                    </button>
                    <button class="btn-secondary" onclick="openUpdateVendorModal('${report._id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px;" title="Update">
                      <i data-lucide="edit" style="width: 14px; height: 14px;"></i> Update
                    </button>
                    <button class="btn-secondary" onclick="deleteVendorReport('${report._id}')" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px; color: var(--accent-rose); border-color: var(--accent-rose);" title="Delete">
                      <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    lucide.createIcons();
  }

  if (vendorReportForm) {
    vendorReportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (vendorSubmitBtn) {
        vendorSubmitBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Sending...';
        vendorSubmitBtn.disabled = true;
      }

      const payload = {
        vendor_name: document.getElementById('vendorName').value.trim(),
        vendor_email: document.getElementById('vendorEmail').value.trim(),
        cc_email: document.getElementById('vendorCcEmail').value.trim(),
        service_date: document.getElementById('vendorDate').value,
        contact_person: document.getElementById('vendorContact').value.trim(),
        technician_name: document.getElementById('vendorTechnician').value.trim(),
        service_details: document.getElementById('vendorDetails').value.trim(),
        remarks: document.getElementById('vendorRemarks').value.trim()
      };

      try {
        const res = await fetch('/api/vendor-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to submit vendor report');

        if (data.emailError) {
          alert('Vendor Report saved, but email failed to send: ' + data.emailError);
        } else {
          alert('Vendor Report saved and email sent successfully!');
        }
        vendorReportForm.reset();
        addVendorModal?.classList.remove('visible');
        fetchVendorReports();
      } catch (err) {
        console.error('Error submitting vendor report:', err);
        alert(`Failed to submit vendor report: ${err.message}`);
      } finally {
        if (vendorSubmitBtn) {
          vendorSubmitBtn.innerHTML = '<i data-lucide="send" style="width: 18px; height: 18px;"></i> Save & Send Email';
          vendorSubmitBtn.disabled = false;
          lucide.createIcons();
        }
      }
    });
  }

  // Update Vendor Modal Logic
  const updateVendorModal = document.getElementById('updateVendorModal');
  const updateVendorReportForm = document.getElementById('updateVendorReportForm');
  const updateVendorModalCloseBtn = document.getElementById('updateVendorModalCloseBtn');

  if (updateVendorModalCloseBtn) {
    updateVendorModalCloseBtn.addEventListener('click', () => {
      updateVendorModal.classList.remove('visible');
    });
  }

  window.openUpdateVendorModal = function(id) {
    const report = vendorReports.find(r => r._id === id);
    if (!report) return;

    document.getElementById('updateVendorId').value = report._id;
    document.getElementById('updateVendorName').value = report.vendor_name;
    document.getElementById('updateVendorEmail').value = report.vendor_email;
    document.getElementById('updateVendorCcEmail').value = report.cc_email || '';
    
    let dt = report.service_date;
    try { dt = new Date(report.service_date).toISOString().split('T')[0]; } catch(e){}
    document.getElementById('updateVendorDate').value = dt;
    
    document.getElementById('updateVendorContact').value = report.contact_person || '';
    document.getElementById('updateVendorTechnician').value = report.technician_name || '';
    document.getElementById('updateVendorDetails').value = report.service_details;
    document.getElementById('updateVendorRemarks').value = report.remarks || '';

    updateVendorModal.classList.add('visible');
  };

  window.deleteVendorReport = async function(id) {
    if (!confirm('Are you sure you want to delete this vendor report?')) return;
    try {
      const res = await fetch(`/api/vendor-report/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete report');
      alert('Vendor report deleted successfully');
      fetchVendorReports();
    } catch (err) {
      console.error(err);
      alert('Failed to delete vendor report.');
    }
  };

  window.resendVendorEmail = async function(id) {
    if (!confirm('Are you sure you want to resend the email to the vendor for this report?')) return;
    try {
      const res = await fetch(`/api/vendor-report/${id}/resend-email`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to resend email');
      alert('Email has been resent successfully!');
    } catch (err) {
      console.error(err);
      alert(`Failed to resend email: ${err.message}`);
    }
  };

  if (updateVendorReportForm) {
    updateVendorReportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('updateVendorSubmitBtn');
      if (btn) {
        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Saving...';
        btn.disabled = true;
      }

      const id = document.getElementById('updateVendorId').value;
      const payload = {
        vendor_name: document.getElementById('updateVendorName').value.trim(),
        vendor_email: document.getElementById('updateVendorEmail').value.trim(),
        cc_email: document.getElementById('updateVendorCcEmail').value.trim(),
        service_date: document.getElementById('updateVendorDate').value,
        contact_person: document.getElementById('updateVendorContact').value.trim(),
        technician_name: document.getElementById('updateVendorTechnician').value.trim(),
        service_details: document.getElementById('updateVendorDetails').value.trim(),
        remarks: document.getElementById('updateVendorRemarks').value.trim()
      };

      try {
        const res = await fetch(`/api/vendor-report/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Failed to update vendor report');
        
        alert('Vendor Report updated successfully!');
        updateVendorModal.classList.remove('visible');
        fetchVendorReports();
      } catch (err) {
        console.error(err);
        alert(`Failed to update vendor report: ${err.message}`);
      } finally {
        if (btn) {
          btn.innerHTML = '<i data-lucide="save" style="width: 18px; height: 18px;"></i> Save Changes';
          btn.disabled = false;
          lucide.createIcons();
        }
      }
    });
  }

  // ===== PROCUREMENT MODULE =====
  let procurementRecords = [];

  const addProcBtn = document.getElementById('addProcurementBtn');
  const addProcModal = document.getElementById('addProcurementModal');
  const procModalCloseBtn = document.getElementById('procModalCloseBtn');
  const procForm = document.getElementById('procurementForm');
  const procItemsContainer = document.getElementById('procItemsContainer');
  const addProcItemBtn = document.getElementById('addProcItemBtn');
  const syncRepliesBtn = document.getElementById('syncRepliesBtn');

  if (addProcBtn) addProcBtn.addEventListener('click', () => {
    if (document.getElementById('procEditId')) document.getElementById('procEditId').value = '';
    if (addProcModal) addProcModal.classList.add('visible');
    if (procItemsContainer) {
      procItemsContainer.innerHTML = '';
      createLineItemRow();
    }
  });
  if (procModalCloseBtn) procModalCloseBtn.addEventListener('click', () => {
    if (addProcModal) addProcModal.classList.remove('visible');
    if (document.getElementById('procEditId')) document.getElementById('procEditId').value = '';
    if (procForm) procForm.reset();
  });

  window.createLineItemRow = function() {
    if (!procItemsContainer) return;
    const docType = document.getElementById('procDocType')?.value || 'RFQ';
    const isRfq = docType === 'RFQ';
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.marginBottom = '10px';
    row.className = 'proc-item-row';
    row.innerHTML = `
      <input type="text" class="proc-item-desc" placeholder="Item Description" required style="flex: 3;">
      <input type="number" class="proc-item-qty" placeholder="Qty" required min="1" style="flex: 1;">
      <input type="number" class="proc-item-price" placeholder="Price" ${isRfq ? '' : 'required'} min="0" step="0.01" style="flex: 1; ${isRfq ? 'display: none;' : ''}">
      <button type="button" class="btn-icon" style="color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 0 8px;" onclick="this.parentElement.remove()">
        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
      </button>
    `;
    procItemsContainer.appendChild(row);
    lucide.createIcons();
  }

  const procDocTypeEl = document.getElementById('procDocType');
  if (procDocTypeEl) {
    procDocTypeEl.addEventListener('change', (e) => {
      const isRfq = e.target.value === 'RFQ';
      document.querySelectorAll('.proc-item-price').forEach(input => {
        if (isRfq) {
          input.removeAttribute('required');
          input.style.display = 'none';
        } else {
          input.setAttribute('required', 'required');
          input.style.display = '';
        }
      });
    });
  }

  if (addProcItemBtn) {
    addProcItemBtn.addEventListener('click', window.createLineItemRow);
  }

  // Handle Procurement Auto-fill
  const procVendorNameInput = document.getElementById('procVendorName');
  if (procVendorNameInput) {
    procVendorNameInput.addEventListener('input', (e) => {
      const selected = savedVendors.find(v => v.vendor_name === e.target.value);
      if (selected) {
        document.getElementById('procVendorEmail').value = selected.vendor_email || '';
      }
    });
  }
  let skipEmailFlag = false;

  const procSavePdfBtn = document.getElementById('procSavePdfBtn');
  if (procSavePdfBtn) {
    procSavePdfBtn.addEventListener('click', (e) => {
      e.preventDefault();
      skipEmailFlag = true;
      if (procForm) procForm.dispatchEvent(new Event('submit', { cancelable: true }));
    });
  }

  const procSubmitBtnMain = document.getElementById('procSubmitBtn');
  if (procSubmitBtnMain) {
    procSubmitBtnMain.addEventListener('click', () => {
      skipEmailFlag = false;
    });
  }

  if (procForm) {
    procForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('procSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = skipEmailFlag ? 'Saving PDF...' : 'Generating PDF & Sending...';
      }

      const items = [];
      document.querySelectorAll('.proc-item-row').forEach(row => {
        items.push({
          description: row.querySelector('.proc-item-desc').value,
          quantity: parseInt(row.querySelector('.proc-item-qty').value) || 0,
          unit_price: parseFloat(row.querySelector('.proc-item-price').value) || 0
        });
      });

      const payload = {
        edit_id: document.getElementById('procEditId') ? document.getElementById('procEditId').value : '',
        doc_type: document.getElementById('procDocType').value,
        vendor_name: document.getElementById('procVendorName').value,
        vendor_email: document.getElementById('procVendorEmail').value,
        cc_email: document.getElementById('procCcEmail') ? document.getElementById('procCcEmail').value : '',
        items,
        remarks: document.getElementById('procRemarks').value,
        skipEmail: skipEmailFlag
      };

      try {
        const res = await fetch('/api/procurement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to create procurement doc');
        
        if (skipEmailFlag) {
          alert('Document saved successfully!');
          window.open(`/api/procurement/${data.record._id}/pdf`, '_blank');
        } else if (data.emailError) {
          alert('Document saved, but email failed to send: ' + data.emailError);
        } else {
          alert('Document generated and emailed successfully!');
        }
        if (addProcModal) addProcModal.classList.remove('visible');
        if (document.getElementById('procEditId')) document.getElementById('procEditId').value = '';
        procForm.reset();
        fetchProcurement();
      } catch (err) {
        console.error(err);
        alert(`Error: ${err.message}`);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generate & Send Email';
        }
        skipEmailFlag = false;
      }
    });
  }

  async function fetchProcurement() {
    try {
      const res = await fetch('/api/procurement');
      procurementRecords = await res.json();
      procurementRecords.sort((a, b) => new Date(a.po_date || a.createdAt || 0) - new Date(b.po_date || b.createdAt || 0));
      renderProcurement();
    } catch (err) {
      console.error(err);
    }
  }

  function renderProcurement() {
    const container = document.getElementById('procurementListContainer');
    if (!container) return;
    if (procurementRecords.length === 0) {
      container.innerHTML = `<div class="empty-state"><i data-lucide="file-x"></i><p>No procurement records found</p></div>`;
      lucide.createIcons();
      return;
    }

    container.innerHTML = procurementRecords.map(doc => {
      const statusColor = doc.status === 'Replied' ? '#10b981' : '#f59e0b';
      let repliesHtml = '';
      if (doc.replies && doc.replies.length > 0) {
        repliesHtml = `<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
          <h4 style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">Email Replies:</h4>
          ${doc.replies.map(r => {
            let attHtml = '';
            if (r.attachments && r.attachments.length > 0) {
              attHtml = `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                <strong>Attachments:</strong>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px;">
                  ${r.attachments.map((att, idx) => `
                    <a href="/api/procurement/${doc._id}/reply/${r._id}/attachment/${idx}" target="_blank" class="badge" style="background-color: #e2e8f0; color: #334155; text-decoration: none; display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
                      <i data-lucide="paperclip" style="width: 12px; height: 12px;"></i> ${att.filename || 'Download File'}
                    </a>
                  `).join('')}
                </div>
              </div>`;
            }
            return `
            <div style="background: #f1f5f9; padding: 10px; border-radius: 6px; margin-bottom: 10px; font-size: 0.85rem;">
              <strong>From:</strong> ${r.from} <span style="color: #64748b; font-size: 0.8rem; margin-left: 10px;">${new Date(r.date).toLocaleString()}</span><br>
              <div style="margin-top: 5px; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${r.body}</div>
              ${attHtml}
            </div>
            `;
          }).join('')}
        </div>`;
      }

      let itemsHtml = '';
      if (doc.items && doc.items.length > 0) {
        itemsHtml = `<div style="margin-top: 0.8rem; font-size: 0.85rem; color: var(--text-secondary);">
          <strong style="color: var(--text-primary);">Items:</strong> ${doc.items.map(i => `${i.quantity}x ${i.description}`).join(', ')}
        </div>`;
      }
      
      let remarksHtml = '';
      if (doc.remarks) {
        remarksHtml = `<div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-secondary);">
          <strong style="color: var(--text-primary);">Remarks:</strong> ${doc.remarks}
        </div>`;
      }

      const pdfUrl = `${window.location.origin}/api/procurement/${doc._id}/pdf`;
      const waText = encodeURIComponent(`Please find the ${doc.doc_type === 'PO' ? 'Purchase Order' : 'Request for Quotation'} (${doc.ref_id}) here:\n${pdfUrl}`);

      return `
        <div class="ticket-card" style="border-left: 4px solid ${doc.doc_type === 'PO' ? '#3b82f6' : '#8b5cf6'}">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; padding-right: 15px;">
              <div class="ticket-id">${doc.ref_id} &bull; ${new Date(doc.date).toLocaleDateString()}</div>
              <div class="ticket-subject" style="font-size: 1.15rem; margin-bottom: 0.2rem;">${doc.vendor_name}</div>
              <div style="font-size: 0.9rem; color: var(--text-secondary);"><i data-lucide="mail" style="width: 14px; height: 14px; vertical-align: middle;"></i> ${doc.vendor_email}</div>
              ${itemsHtml}
              ${remarksHtml}
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <span class="badge" style="background-color: ${statusColor}20; color: ${statusColor}; margin-bottom: 5px; display: inline-block;">${doc.status}</span>
              <div style="font-weight: 600; color: var(--text-primary);">₹${(doc.total_amount || 0).toLocaleString('en-IN')}</div>
              <div style="margin-top: 10px; display: flex; gap: 5px; justify-content: flex-end;">
                <a href="/api/procurement/${doc._id}/pdf" download class="btn-icon" style="color: #3b82f6; border: 1px solid #3b82f6; border-radius: 4px; padding: 4px 8px; text-decoration: none; font-size: 0.8rem; background: #fff; display: flex; align-items: center; gap: 4px;" title="Download PDF">
                  <i data-lucide="download" style="width: 14px; height: 14px;"></i> PDF
                </a>
                <a href="https://wa.me/?text=${waText}" target="_blank" class="btn-icon" style="color: #25D366; border: 1px solid #25D366; border-radius: 4px; padding: 4px 8px; text-decoration: none; font-size: 0.8rem; background: #fff; display: flex; align-items: center; gap: 4px;" title="Share via WhatsApp">
                  <i data-lucide="message-circle" style="width: 14px; height: 14px;"></i> WhatsApp
                </a>
                <button onclick="openManualReplyModal('${doc._id}')" class="btn-icon" style="color: #8b5cf6; border: 1px solid #8b5cf6; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; background: #fff; display: flex; align-items: center; gap: 4px; cursor: pointer;" title="Add Manual Note/Reply">
                  <i data-lucide="message-square-plus" style="width: 14px; height: 14px;"></i> Note
                </button>
                <button onclick="editProcurement('${doc._id}')" class="btn-icon" style="color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; background: #fff; display: flex; align-items: center; gap: 4px; cursor: pointer;" title="Edit Document">
                  <i data-lucide="edit" style="width: 14px; height: 14px;"></i> Edit
                </button>
                <button onclick="deleteProcurement('${doc._id}')" class="btn-icon" style="color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; background: #fff; display: flex; align-items: center; gap: 4px; cursor: pointer;" title="Delete Document">
                  <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i> Delete
                </button>
              </div>
            </div>
          </div>
          ${repliesHtml}
        </div>
      `;
    }).join('');
    lucide.createIcons();
  }

  if (syncRepliesBtn) {
    syncRepliesBtn.addEventListener('click', async () => {
      const originalText = syncRepliesBtn.innerHTML;
      syncRepliesBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Syncing...';
      syncRepliesBtn.disabled = true;
      try {
        const res = await fetch('/api/procurement/sync');
        const data = await res.json();
        if (data.success) {
          alert(`Synced ${data.synced} new email replies!`);
          fetchProcurement();
        } else {
          alert('Sync failed: ' + data.error);
        }
      } catch (err) {
        console.error(err);
        alert('Sync error. Check console.');
      } finally {
        syncRepliesBtn.innerHTML = originalText;
        syncRepliesBtn.disabled = false;
        lucide.createIcons();
      }
    });
  }

  // ===== Laptop Stats (Dashboard) =====
  async function fetchLaptopStats() {
    try {
      const res = await fetch('/api/laptop/list');
      if (!res.ok) throw new Error('API failed');
      const laptops = await res.json();
      
      let givenRegular = 0;
      let givenLetter = 0;
      let canceled = 0;

      const regularCourses = ['PGDM', 'MBA', 'UG'];
      const letterCourse = 'Student taken Laptop with Letter';
      const allCourses = [...regularCourses, letterCourse];

      laptops.forEach(laptop => {
        if (allCourses.includes(laptop.course)) {
          if (laptop.status === 'Received') {
            if (laptop.course === letterCourse) {
              givenLetter++;
            } else {
              givenRegular++;
            }
          } else if (laptop.status === 'Cancel') {
            canceled++;
          }
        }
      });

      const statGiven = document.getElementById('statLaptopGiven');
      const statLetter = document.getElementById('statLaptopLetter');
      const statCancel = document.getElementById('statLaptopCancel');

      // (Stats are hardcoded based on user request)
      // if (statGiven) statGiven.textContent = givenRegular;
      // if (statLetter) statLetter.textContent = givenLetter;
      // if (statCancel) statCancel.textContent = canceled;
    } catch (error) {
      console.error('Error fetching laptop stats:', error);
    }
  }

  // ===== Init =====
  fetchTicketsFromSupabase();
  fetchLaptopStats();
  window.deleteProcurement = async function(id) {
    if (!confirm('Are you sure you want to delete this procurement document? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/procurement/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete document');
      alert('Document deleted successfully');
      fetchProcurement();
    } catch (err) {
      console.error(err);
      alert(`Error: ${err.message}`);
    }
  };

  window.editProcurement = function(id) {
    const doc = procurementRecords.find(d => d._id === id);
    if (!doc) return;
    
    document.getElementById('procEditId').value = doc._id;
    document.getElementById('procDocType').value = doc.doc_type;
    document.getElementById('procVendorName').value = doc.vendor_name;
    document.getElementById('procVendorEmail').value = doc.vendor_email;
    if (document.getElementById('procCcEmail')) document.getElementById('procCcEmail').value = doc.cc_email || '';
    document.getElementById('procRemarks').value = doc.remarks || '';
    
    const itemsContainer = document.getElementById('procItemsContainer');
    if (itemsContainer) {
      itemsContainer.innerHTML = '';
      if (doc.items && doc.items.length > 0) {
        doc.items.forEach(item => {
          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '10px';
          row.style.marginBottom = '10px';
          row.className = 'proc-item-row';
          row.innerHTML = `
            <input type="text" class="proc-item-desc" placeholder="Item Description" required style="flex: 3;" value="${item.description}">
            <input type="number" class="proc-item-qty" placeholder="Qty" required min="1" style="flex: 1;" value="${item.quantity}">
            <input type="number" class="proc-item-price" placeholder="Price" ${doc.doc_type === 'RFQ' ? '' : 'required'} min="0" step="0.01" style="flex: 1; ${doc.doc_type === 'RFQ' ? 'display: none;' : ''}" value="${item.unit_price}">
            <button type="button" class="btn-icon" style="color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 0 8px;" onclick="this.parentElement.remove()">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          `;
          itemsContainer.appendChild(row);
        });
      } else {
        createLineItemRow();
      }
      lucide.createIcons();
    }
    document.getElementById('addProcurementModal').classList.add('visible');
  }

  // Manual Reply logic
  const manualReplyModal = document.getElementById('addManualReplyModal');
  const manualReplyForm = document.getElementById('addManualReplyForm');
  
  window.openManualReplyModal = function(id) {
    if (manualReplyModal) {
      document.getElementById('manualReplyProcId').value = id;
      if (manualReplyForm) manualReplyForm.reset();
      manualReplyModal.classList.add('visible');
    }
  };

  document.getElementById('manualReplyCloseBtn')?.addEventListener('click', () => {
    if (manualReplyModal) manualReplyModal.classList.remove('visible');
  });

  if (manualReplyForm) {
    manualReplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('manualReplyProcId').value;
      const from = document.getElementById('manualReplyFrom').value;
      const body = document.getElementById('manualReplyBody').value;
      
      const btn = document.getElementById('manualReplySubmitBtn');
      const originalText = btn.innerHTML;
      btn.innerHTML = 'Adding...';
      btn.disabled = true;

      try {
        const res = await fetch(`/api/procurement/${id}/reply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, body })
        });
        
        if (!res.ok) throw new Error('Failed to add note');
        
        alert('Note added successfully!');
        manualReplyModal.classList.remove('visible');
        fetchProcurement();
      } catch (err) {
        console.error(err);
        alert('Error: ' + err.message);
      } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }
    });
  }

  // ===== Mobile Register Logic =====
  const MOBILE_API_URL = '/api/mobiles';
  let mobilesData = [];
  
  const mobileForm = document.getElementById('mobileForm');
  if (mobileForm) {
    mobileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById('mobileSubmitBtn');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Saving...';
      submitBtn.disabled = true;

      const editId = document.getElementById('editMobileId').value;
      
      const payload = {
          name: document.getElementById('mobileName').value,
          designation: document.getElementById('mobileDesignation').value,
          mobile_model: document.getElementById('mobileModelInput').value,
          phone: document.getElementById('mobilePhone').value,
          imei1: document.getElementById('mobileImei1').value,
          imei2: document.getElementById('mobileImei2').value,
          date_issue: document.getElementById('mobileDateIssue').value,
          date_return: document.getElementById('mobileDateReturn').value
      };

      try {
          const url = editId ? `${MOBILE_API_URL}/${editId}` : MOBILE_API_URL;
          const method = editId ? 'PUT' : 'POST';
          
          const response = await fetch(url, {
              method: method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          if (response.ok) {
              window.resetMobileForm();
              await window.fetchMobiles();
              alert('Record saved successfully!');
          } else {
              alert('Error saving record');
          }
      } catch (error) {
          console.error('Save error:', error);
          alert('Connection error');
      } finally {
          submitBtn.innerHTML = originalText;
          submitBtn.disabled = false;
      }
    });
  }

  window.fetchMobiles = async function() {
    try {
        const response = await fetch(MOBILE_API_URL);
        if (response.ok) {
            mobilesData = await response.json();
            renderMobileTable();
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
  }

  function renderMobileTable() {
    const tbody = document.getElementById('mobileTableBody');
    if (!tbody) return;
    
    if (mobilesData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No mobile records found.</td></tr>`;
        return;
    }

    let html = '';
    mobilesData.forEach(item => {
        const isReturned = item.date_return && item.date_return.trim() !== '';
        const statusColor = isReturned ? '#94a3b8' : '#10b981';
        const statusText = isReturned ? 'Returned' : 'Active';

        html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px;">
                    <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${item.designation}</div>
                    <span class="badge" style="background-color: ${statusColor}20; color: ${statusColor}; font-size: 0.75rem;">${statusText}</span>
                </td>
                <td style="padding: 12px; font-weight: 500;">
                    ${item.mobile_model}
                </td>
                <td style="padding: 12px;">
                    <div style="font-size: 0.9rem;"><i data-lucide="phone" style="width:14px; height:14px;"></i> ${item.phone}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">
                        <div>1: ${item.imei1}</div>
                        ${item.imei2 ? `<div>2: ${item.imei2}</div>` : ''}
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="font-size: 0.9rem;"><strong>Iss:</strong> ${item.date_issue}</div>
                    ${isReturned ? `<div style="font-size: 0.85rem; color: var(--text-secondary);"><strong>Ret:</strong> ${item.date_return}</div>` : ''}
                </td>
                <td style="padding: 12px;">
                    <button onclick="editMobileRecord('${item._id}')" class="btn-icon" style="color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; background: #fff; cursor: pointer; margin-right: 5px;">
                      <i data-lucide="edit" style="width:14px; height:14px;"></i> Edit
                    </button>
                    <button onclick="deleteMobileRecord('${item._id}')" class="btn-icon" style="color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; background: #fff; cursor: pointer;">
                      <i data-lucide="trash-2" style="width:14px; height:14px;"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    lucide.createIcons();
  }

  window.editMobileRecord = function(id) {
    const item = mobilesData.find(m => m._id === id);
    if (!item) return;

    document.getElementById('editMobileId').value = item._id;
    document.getElementById('mobileName').value = item.name;
    document.getElementById('mobileDesignation').value = item.designation;
    document.getElementById('mobileModelInput').value = item.mobile_model;
    document.getElementById('mobilePhone').value = item.phone;
    document.getElementById('mobileImei1').value = item.imei1;
    document.getElementById('mobileImei2').value = item.imei2 || '';
    document.getElementById('mobileDateIssue').value = item.date_issue;
    document.getElementById('mobileDateReturn').value = item.date_return || '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('mobileSubmitBtn').innerHTML = 'Update Record';
  }

  window.deleteMobileRecord = async function(id) {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
        const response = await fetch(`${MOBILE_API_URL}/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await window.fetchMobiles();
        } else {
            alert('Error deleting record');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Connection error');
    }
  }

  window.resetMobileForm = function() {
    if (document.getElementById('mobileForm')) {
      document.getElementById('mobileForm').reset();
      document.getElementById('editMobileId').value = '';
      if(document.getElementById('mobileDateIssue')) {
         document.getElementById('mobileDateIssue').valueAsDate = new Date();
      }
      document.getElementById('mobileSubmitBtn').innerHTML = 'Save Record';
    }
  }

  // Fetch mobile data initially if needed or when tab is clicked
  const tabLinksForMobile = document.querySelectorAll('.nav-container nav a[data-tab]');
  tabLinksForMobile.forEach(link => {
    link.addEventListener('click', (e) => {
        if(e.currentTarget.getAttribute('data-tab') === 'mobileregister') {
           window.fetchMobiles();
           window.resetMobileForm();
        }
    });
  });

});
