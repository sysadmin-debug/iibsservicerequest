// IIBS Service Request Portal — Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // ===== State =====
  let requests = [];
  let ticketCounter = 1000;

  // ===== Init Data =====
  function initData() {
    const stored = localStorage.getItem('iibs_requests');
    const storedCounter = localStorage.getItem('iibs_counter');

    if (stored) {
      requests = JSON.parse(stored);
    } else {
      // Demo data
      requests = [
        {
          id: 'SR-1001',
          name: 'Rajesh Kumar',
          email: 'rajesh.k@iibs.org',
          department: 'IT',
          phone: '9876543210',
          category: 'Network',
          priority: 'high',
          location: 'Block A, Room 102',
          subject: 'WiFi not working in Conference Room',
          description: 'The WiFi connectivity in Conference Room A has been down since morning. Multiple staff members are unable to connect. This is affecting ongoing meetings and presentations.',
          status: 'progress',
          date: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
          id: 'SR-1002',
          name: 'Priya Sharma',
          email: 'priya.s@iibs.org',
          department: 'Finance',
          phone: '9876543211',
          category: 'AC/HVAC',
          priority: 'medium',
          location: 'Block B, Finance Dept, 3rd Floor',
          subject: 'AC not cooling properly',
          description: 'The split AC unit in the Finance department is running but not cooling. The temperature display shows 28°C even at the lowest setting. Needs servicing or gas refill.',
          status: 'open',
          date: new Date(Date.now() - 3600000 * 8).toISOString()
        },
        {
          id: 'SR-1003',
          name: 'Dr. Meena Reddy',
          email: 'meena.r@iibs.org',
          department: 'Academic',
          phone: '9876543212',
          category: 'Hardware',
          priority: 'medium',
          location: 'Computer Lab 2, Desk 15',
          subject: 'Desktop PC not booting',
          description: 'The desktop computer at workstation 15 in Lab 2 shows a blank screen on startup. The power LED turns on but nothing appears on the monitor. Tried a different monitor, same issue.',
          status: 'open',
          date: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'SR-1004',
          name: 'Amit Patel',
          email: 'amit.p@iibs.org',
          department: 'Administration',
          phone: '9876543213',
          category: 'Plumbing',
          priority: 'high',
          location: 'Ground Floor Washroom, Block A',
          subject: 'Water leakage in washroom',
          description: 'There is a significant water leak from the ceiling of the ground floor washroom in Block A. Water is dripping continuously and the floor is slippery, creating a safety hazard.',
          status: 'resolved',
          date: new Date(Date.now() - 3600000 * 48).toISOString()
        }
      ];
      saveData();
    }

    if (storedCounter) {
      ticketCounter = parseInt(storedCounter);
    } else {
      ticketCounter = 1004;
      localStorage.setItem('iibs_counter', ticketCounter);
    }
  }

  function saveData() {
    localStorage.setItem('iibs_requests', JSON.stringify(requests));
    localStorage.setItem('iibs_counter', ticketCounter);
  }

  // ===== Render Stats =====
  function renderStats() {
    document.getElementById('statTotal').textContent = requests.length;
    document.getElementById('statOpen').textContent = requests.filter(r => r.status === 'open').length;
    document.getElementById('statProgress').textContent = requests.filter(r => r.status === 'progress').length;
    document.getElementById('statResolved').textContent = requests.filter(r => r.status === 'resolved').length;

    // Animate stat numbers
    document.querySelectorAll('.stat-value').forEach(el => {
      el.style.animation = 'none';
      el.offsetHeight; // trigger reflow
      el.style.animation = 'statPop 0.4s ease-out';
    });
  }

  // ===== Render Recent List (Home) =====
  function renderRecentList() {
    const list = document.getElementById('recentList');
    if (!list) return;

    if (requests.length === 0) {
      list.innerHTML = '<div class="recent-empty"><p>No service requests yet. Raise your first request to get started!</p></div>';
      return;
    }

    // Show last 5 requests
    const recent = [...requests].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    list.innerHTML = recent.map(r => {
      const timeAgo = getTimeAgo(r.date);
      return `
        <div class="recent-item">
          <div class="recent-left">
            <span class="recent-id">${r.id}</span>
            <span class="recent-subject">${r.subject}</span>
          </div>
          <div class="recent-meta">
            <span class="badge badge-${r.status}">${formatStatus(r.status)}</span>
            <span class="badge badge-${r.priority}">${r.priority}</span>
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
    const filterCategory = document.getElementById('filterCategory')?.value || 'all';
    const filterPriority = document.getElementById('filterPriority')?.value || 'all';

    let filtered = [...requests];

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    if (filterCategory !== 'all') {
      filtered = filtered.filter(r => r.category === filterCategory);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(r => r.priority === filterPriority);
    }
    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.id.toLowerCase().includes(searchTerm) ||
        r.name.toLowerCase().includes(searchTerm) ||
        r.subject.toLowerCase().includes(searchTerm) ||
        r.description.toLowerCase().includes(searchTerm) ||
        r.category.toLowerCase().includes(searchTerm)
      );
    }

    // Sort: open/progress first, then by date
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
          <p>No service requests found</p>
          <small>Try adjusting your filters or raise a new request</small>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    list.innerHTML = filtered.map(r => {
      const formattedDate = new Date(r.date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="ticket-item priority-${r.priority}">
          <div class="ticket-top">
            <div class="ticket-top-left">
              <span class="ticket-id">${r.id}</span>
              <span class="badge badge-${r.status}">${formatStatus(r.status)}</span>
              <span class="badge badge-${r.priority}">${r.priority}</span>
              <span class="badge badge-category">${r.category}</span>
            </div>
            <select class="status-updater" data-id="${r.id}" aria-label="Update status for ${r.id}">
              <option value="open" ${r.status === 'open' ? 'selected' : ''}>Open</option>
              <option value="progress" ${r.status === 'progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${r.status === 'resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
          <div class="ticket-subject">${r.subject}</div>
          <div class="ticket-desc">${r.description}</div>
          <div class="ticket-meta">
            <span><i data-lucide="user"></i> ${r.name}</span>
            <span><i data-lucide="building-2"></i> ${r.department}</span>
            <span><i data-lucide="map-pin"></i> ${r.location}</span>
            <span><i data-lucide="clock"></i> ${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();

    // Status updater events
    document.querySelectorAll('.status-updater').forEach(select => {
      select.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        const req = requests.find(r => r.id === id);
        if (req) {
          req.status = newStatus;
          saveData();
          renderStats();
          renderTickets();
          renderRecentList();
        }
      });
    });
  }

  // ===== Form Submission =====
  const form = document.getElementById('serviceForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      ticketCounter++;
      const ticketId = `SR-${ticketCounter}`;

      const newRequest = {
        id: ticketId,
        name: document.getElementById('requesterName').value.trim(),
        email: document.getElementById('requesterEmail').value.trim(),
        department: document.getElementById('requesterDept').value,
        phone: document.getElementById('requesterPhone').value.trim(),
        category: document.getElementById('serviceCategory').value,
        priority: document.getElementById('priorityLevel').value,
        location: document.getElementById('location').value.trim(),
        subject: document.getElementById('issueSubject').value.trim(),
        description: document.getElementById('issueDescription').value.trim(),
        status: 'open',
        date: new Date().toISOString()
      };

      requests.push(newRequest);
      saveData();
      form.reset();

      // Show success modal
      document.getElementById('modalTicketId').textContent = ticketId;
      document.getElementById('successModal').classList.add('visible');

      renderStats();
      renderRecentList();
      renderTickets();
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

    // Refresh tickets when switching to track
    if (tabId === 'track') {
      renderTickets();
    }

    // Scroll to top
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
  document.getElementById('heroRaiseBtn')?.addEventListener('click', () => switchTab('newrequest'));
  document.getElementById('heroTrackBtn')?.addEventListener('click', () => switchTab('track'));

  // ===== Category Cards (go to form with category pre-selected) =====
  document.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      const category = card.getAttribute('data-category');
      switchTab('newrequest');
      const catSelect = document.getElementById('serviceCategory');
      if (catSelect) {
        catSelect.value = category;
      }
    });
  });

  // ===== Filters =====
  document.getElementById('searchInput')?.addEventListener('input', () => renderTickets());
  document.getElementById('filterStatus')?.addEventListener('change', () => renderTickets());
  document.getElementById('filterCategory')?.addEventListener('change', () => renderTickets());
  document.getElementById('filterPriority')?.addEventListener('change', () => renderTickets());

  // ===== FAQ Accordion =====
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('open'));

      // Toggle current
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

  // ===== Utility: Time Ago =====
  function getTimeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  // ===== Utility: Format Status =====
  function formatStatus(status) {
    const map = { open: 'Open', progress: 'In Progress', resolved: 'Resolved' };
    return map[status] || status;
  }

  // ===== Init =====
  initData();
  renderStats();
  renderRecentList();
  renderTickets();
});
