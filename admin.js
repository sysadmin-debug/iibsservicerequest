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
        attendedBy: row.attended_by || ''
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

    let cctvApprovalBtn = '';
    if (ticket.ticketType === 'CCTV Footage Checking') {
      const approveUrl = `https://${window.location.host}/api/tickets/approve/${ticket.id}`;
      cctvApprovalBtn = `
        <div style="margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong style="display: block; margin-bottom: 0.5rem; color: #0f172a;">Manual Approval Link:</strong>
          <div style="display: flex; gap: 0.5rem;">
            <input type="text" readonly value="${approveUrl}" style="flex: 1; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 0.85rem;" id="approvalLinkText_${ticket.id}" />
            <button type="button" class="btn" style="padding: 0.5rem 1rem;" onclick="navigator.clipboard.writeText(document.getElementById('approvalLinkText_${ticket.id}').value); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy Link', 2000);">Copy Link</button>
          </div>
          <small style="display: block; margin-top: 0.5rem; color: #64748b;">Copy and send this link to the approver via WhatsApp or Email. Once they click it, the ticket will be approved.</small>
        </div>
      `;
    }

    document.getElementById('detailModalTitle').textContent = `Ticket ${ticket.id}`;
    document.getElementById('detailModalBody').innerHTML = `
      <div style="margin-bottom: 1rem;">
        <span class="badge badge-${ticket.status}" style="margin-right: 0.5rem;">${formatStatus(ticket.status)}</span>
        <span class="badge badge-category">${ticket.ticketType}</span>
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
      
      ${cctvApprovalBtn}

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
    csvContent += "Ticket ID,Name,IIBS ID,Role,Department,Course,Classroom,Contact,Email,Ticket Type,Details/Other Request,Status,Date Submitted,Resolution\n";
    
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
    const map = { open: 'Open', progress: 'In Progress', resolved: 'Resolved' };
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

    if (inventoryItems.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i data-lucide="box"></i>
          <p>No inventory items found</p>
          <small>Click "Add New Item" to start tracking stock</small>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = inventoryItems.map(item => {
      let dateString = item.last_updated;
      try {
        dateString = new Date(item.last_updated).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch(e) {}

      // Calculate health badge
      let badgeClass = 'resolved'; // green
      let healthText = 'In Stock';
      if (item.quantity === 0) {
        badgeClass = 'critical';
        healthText = 'Out of Stock';
      } else if (item.quantity <= 5) {
        badgeClass = 'open'; // yellow
        healthText = 'Low Stock';
      }

      return `
        <div class="ticket-item" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="ticket-top-left" style="margin-bottom: 0.5rem;">
              <span class="badge badge-${badgeClass}">${healthText}</span>
              <span class="badge badge-category">${item.category}</span>
            </div>
            <div class="ticket-subject" style="font-size: 1.2rem;">${item.item_name}</div>
            <div class="ticket-meta" style="margin-top: 0.5rem;">
              <span><i data-lucide="clock"></i> Last updated: ${dateString}</span>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary); line-height: 1;">${item.quantity}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 0.5rem;">Total Available</div>
            <button class="btn-secondary btn-history-stock" data-id="${item.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 0.25rem;">
              <i data-lucide="clock"></i> History
            </button>
            <button class="btn-secondary btn-update-stock" data-id="${item.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; margin-right: 0.25rem;">
              <i data-lucide="edit-3"></i> Update
            </button>
            <button class="btn-secondary btn-delete-stock" data-id="${item.id}" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; color: var(--accent-rose); border-color: rgba(244, 63, 94, 0.3);">
              <i data-lucide="trash-2"></i> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Attach update listeners
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
        const item = inventoryItems.find(i => i.id === id);
        if (!item) return;
        
        if (confirm(`Are you sure you want to permanently delete "${item.item_name}"?\nThis will also delete all of its history logs.`)) {
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

  // Add Item Modal
  document.getElementById('addStockBtn')?.addEventListener('click', () => {
    document.getElementById('invNewItemName').value = '';
    document.getElementById('invNewQuantity').value = '0';
    addInventoryModal.classList.add('visible');
  });

  document.getElementById('invAddCloseBtn')?.addEventListener('click', () => {
    addInventoryModal.classList.remove('visible');
  });

  document.getElementById('invAddSaveBtn')?.addEventListener('click', async () => {
    const name = document.getElementById('invNewItemName').value.trim();
    const category = document.getElementById('invNewCategory').value;
    const qty = parseInt(document.getElementById('invNewQuantity').value) || 0;

    if (!name) {
      alert("Please enter an Item Name.");
      return;
    }

    const btn = document.getElementById('invAddSaveBtn');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: name,
          category: category,
          quantity: qty
        })
      });

      if (!res.ok) throw new Error('API failed');

      addInventoryModal.classList.remove('visible');
      fetchInventoryFromSupabase();
    } catch (error) {
      alert("Error adding item. Please try again.");
    }

    btn.textContent = 'Save Item';
    btn.disabled = false;
  });

  // Update Stock Modal
  function openUpdateInventoryModal(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    currentUpdatingItemId = id;
    document.getElementById('updateInvTitle').textContent = `Update: ${item.item_name}`;
    document.getElementById('updateInvDesc').textContent = `Current Quantity: ${item.quantity}`;
    document.getElementById('invUpdateAction').value = 'add';
    document.getElementById('invUpdateAmount').value = '1';
    document.getElementById('invUpdateRemarks').value = '';
    
    // Purchase details reset
    document.getElementById('invSupplier').value = '';
    document.getElementById('invCost').value = '';
    document.getElementById('invBillFile').value = '';
    document.getElementById('purchaseDetailsContainer').style.display = 'block';

    updateInventoryModal.classList.add('visible');
  }

  // Toggle purchase details container
  document.getElementById('invUpdateAction')?.addEventListener('change', (e) => {
    const container = document.getElementById('purchaseDetailsContainer');
    if (e.target.value === 'add') {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }
  });

  document.getElementById('invUpdateCloseBtn')?.addEventListener('click', () => {
    updateInventoryModal.classList.remove('visible');
  });

  document.getElementById('invUpdateSaveBtn')?.addEventListener('click', async () => {
    if (!currentUpdatingItemId) return;
    
    const item = inventoryItems.find(i => i.id === currentUpdatingItemId);
    const action = document.getElementById('invUpdateAction').value;
    const amount = parseInt(document.getElementById('invUpdateAmount').value) || 0;
    
    if (amount <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    let newQty = item.quantity;
    if (action === 'add') newQty += amount;
    else if (action === 'subtract') newQty -= amount;

    if (newQty < 0) {
      alert("Cannot reduce stock below 0.");
      return;
    }

    const btn = document.getElementById('invUpdateSaveBtn');
    btn.textContent = 'Updating...';
    btn.disabled = true;

    // 1. Update Inventory Table
    try {
      const resInv = await fetch(`/api/inventory/${currentUpdatingItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty })
      });
      if (!resInv.ok) throw new Error('Failed to update inventory');

      // 2. Upload File (if present)
      let billUrl = null;
      let supplierName = null;
      let purchaseCost = null;

      if (action === 'add') {
        supplierName = document.getElementById('invSupplier').value.trim();
        purchaseCost = parseFloat(document.getElementById('invCost').value) || null;
        
        const fileInput = document.getElementById('invBillFile');
        if (fileInput && fileInput.files.length > 0) {
          const file = fileInput.files[0];
          
          btn.textContent = 'Uploading Bill...';
          const formData = new FormData();
          formData.append('file', file);

          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            billUrl = uploadData.publicUrl;
          } else {
            console.error('File upload failed');
          }
        }
      }

      // 3. Insert into Stock Log
      const remarks = document.getElementById('invUpdateRemarks').value.trim();
      await fetch('/api/stock_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          item_name: item.item_name,
          action: action.toUpperCase(),
          amount: amount,
          remarks: remarks,
          supplier_name: supplierName,
          purchase_cost: purchaseCost,
          bill_photo_url: billUrl
        })
      });

      updateInventoryModal.classList.remove('visible');
      fetchInventoryFromSupabase();
    } catch (error) {
      console.error(error);
      alert("Error updating stock. Please try again.");
    }

    btn.textContent = 'Update Quantity';
    btn.disabled = false;
  });

  // History Modal Logic
  async function openHistoryInventoryModal(id) {
    const item = inventoryItems.find(i => i.id === id);
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

  // ===== Init =====
  fetchTicketsFromSupabase();
});
