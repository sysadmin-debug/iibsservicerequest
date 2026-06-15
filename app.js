// IIBS Service Ticketing System — Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // ===== State =====
  let tickets = [];
  
  // Google Sheets CSV Export URL
  const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1_jd5yNLlb52U28WTolxwFLWcWSA2hMeznIdD8WKwbH0/export?format=csv&gid=1802082833';

  // ===== Fetch Data from Google Sheets =====
  function fetchTicketsFromSheet() {
    fetch(SHEET_CSV_URL)
      .then(response => response.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: function(results) {
            const data = results.data;
            tickets = data.map((row, index) => {
              // Map Google Sheet columns to ticket object
              // Generating a pseudo-ID based on row index
              const pseudoId = `TKT-${1000 + index}`;
              
              // Normalize status string (Google sheet has 'Completed', 'Process', empty)
              const rawStatus = (row['Status '] || '').trim().toLowerCase();
              let normalizedStatus = 'open';
              if (rawStatus === 'completed') normalizedStatus = 'resolved';
              if (rawStatus === 'process') normalizedStatus = 'progress';

              return {
                id: pseudoId,
                date: row['Timestamp'] || new Date().toISOString(),
                name: row['Name'] || 'Unknown',
                iibsId: row['IIBS ID Number (Student/Staff ID)\n'] || row['IIBS ID Number'] || row['IIBS ID Number (Student/Staff ID)'] || '-',
                role: row['Student / Faculty /Staff'] || '-',
                department: row['Department \n'] || row['Department'] || '-',
                contact: row['Contact Number \n'] || row['Contact Number'] || '-',
                email: row['Email Address\n'] || row['Email Address'] || '-',
                ticketType: row['SECTION 2 - TICKET DETAILS\n'] || row['SECTION 2 - TICKET DETAILS'] || '-',
                otherRequest: row['For Other Request '] || row['For Other Request'] || '',
                status: normalizedStatus,
                resolution: row['Action Taken (Resolution )'] || row['Action Taken (Resolution)'] || ''
              };
            });
            
            // Re-render UI after data is loaded
            renderStats();
            renderRecentList();
            renderTickets();
          }
        });
      })
      .catch(error => {
        console.error('Error fetching Google Sheet:', error);
        // Fallback or show error
        document.getElementById('ticketList').innerHTML = `
          <div class="empty-state">
            <i data-lucide="wifi-off"></i>
            <p>Unable to sync with Google Sheets</p>
            <small>Please check your internet connection and try refreshing.</small>
          </div>
        `;
        lucide.createIcons();
      });
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

    // Sort: newest first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

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

      const resolutionBlock = t.resolution ? `<div class="ticket-resolution"><strong>Resolution:</strong> ${t.resolution}</div>` : '';

      return `
        <div class="ticket-item priority-${t.status === 'open' ? 'medium' : t.status === 'progress' ? 'high' : 'low'}">
          <div class="ticket-top">
            <div class="ticket-top-left">
              <span class="ticket-id">${t.id}</span>
              <span class="badge badge-${t.status}">${formatStatus(t.status)}</span>
              <span class="badge badge-category">${t.ticketType}</span>
            </div>
            <!-- Status is read-only since it is synced from Google Sheets -->
            <div class="status-readonly status-readonly-${t.status}">
              ${formatStatus(t.status)}
            </div>
          </div>
          <div class="ticket-subject">${descriptionText}</div>
          ${resolutionBlock}
          <div class="ticket-meta">
            <span><i data-lucide="user"></i> ${t.name}</span>
            <span><i data-lucide="id-card"></i> ${t.iibsId}</span>
            <span><i data-lucide="users"></i> ${t.role}</span>
            <span><i data-lucide="building-2"></i> ${t.department}</span>
            <span><i data-lucide="phone"></i> ${t.contact}</span>
            <span><i data-lucide="clock"></i> ${dateString}</span>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
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

  // ===== Form Submission =====
  const form = document.getElementById('serviceForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // We can't generate the final exact ID synchronously as it depends on Google Sheets row
      // We will generate a temporary one for the UI
      const tempId = `TKT-NEW-${Math.floor(Math.random()*10000)}`;

      const newTicket = {
        name: document.getElementById('userName').value.trim(),
        iibsId: document.getElementById('userIdNumber').value.trim(),
        role: document.getElementById('userRole').value,
        department: document.getElementById('userDepartment').value.trim(),
        contact: document.getElementById('userContact').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        ticketType: document.getElementById('ticketType').value,
        otherRequest: document.getElementById('otherRequest')?.value.trim() || ''
      };

      // Submit to Google Form / Google Sheet
      const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfwTPziyjUkdN3AW9eVl56wWcmFcIIimNf32d-ZAtWN7A1YcQ/formResponse';
      const formData = new URLSearchParams();
      formData.append('entry.1687135953', newTicket.name);
      formData.append('entry.632749992', newTicket.iibsId);
      formData.append('entry.887531768', newTicket.role);
      formData.append('entry.1298781396', newTicket.department);
      formData.append('entry.1892291400', newTicket.contact);
      formData.append('entry.1357677634', newTicket.email);
      formData.append('entry.921783959', newTicket.ticketType);
      
      if (newTicket.otherRequest) {
        formData.append('entry.893389411', newTicket.otherRequest);
      }

      // We show success immediately to avoid waiting for no-cors
      fetch(formUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      }).then(() => {
        // After submission, fetch latest data from sheets to update UI
        setTimeout(() => {
          fetchTicketsFromSheet();
        }, 2000);
      }).catch(err => {
        console.error('Error syncing to Google Sheet:', err);
      });

      form.reset();
      otherRequestGroup.style.display = 'none';

      // Show success modal
      document.getElementById('modalTicketId').textContent = "Submitted successfully!";
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

    // Refresh tickets from sheet when tracking tab is opened
    if (tabId === 'track') {
      fetchTicketsFromSheet();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const navContainer = document.getElementById('navLinks');
  if (navContainer) {
    navContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        switchTab(link.getAttribute('data-tab'));
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

  // ===== Init =====
  fetchTicketsFromSheet();
});
