// Lab Control Portal Logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // State Management
  const TOTAL_STATIONS = 24;
  let workstations = [];
  let tickets = [];

  // Default Workstations data setup
  function initData() {
    // Try to load from LocalStorage
    const storedWS = localStorage.getItem('ws_status');
    const storedTickets = localStorage.getItem('ws_tickets');

    if (storedWS) {
      workstations = JSON.parse(storedWS);
    } else {
      // Create initial 24 workstations
      for (let i = 1; i <= TOTAL_STATIONS; i++) {
        // Preset two workstations with initial warning/danger status for demonstration
        let status = 'working';
        if (i === 5) status = 'warning';
        if (i === 12) status = 'danger';

        workstations.push({
          id: `WS-${i.toString().padStart(2, '0')}`,
          number: i,
          status: status
        });
      }
      saveToStorage();
    }

    if (storedTickets) {
      tickets = JSON.parse(storedTickets);
    } else {
      // Default demo tickets
      tickets = [
        {
          id: 'TKT-1001',
          workstationId: 'WS-05',
          category: 'Software',
          reporter: 'Alex Mercer',
          priority: 'medium',
          status: 'open',
          description: 'Photoshop license expired on this device.',
          date: new Date(Date.now() - 3600000 * 4).toISOString() // 4 hours ago
        },
        {
          id: 'TKT-1002',
          workstationId: 'WS-12',
          category: 'Hardware',
          reporter: 'Sarah Connor',
          priority: 'high',
          status: 'progress',
          description: 'PC does not power on. Power button feels loose.',
          date: new Date(Date.now() - 3600000 * 24).toISOString() // 24 hours ago
        }
      ];
      saveToStorage();
    }
  }

  function saveToStorage() {
    localStorage.setItem('ws_status', JSON.stringify(workstations));
    localStorage.setItem('ws_tickets', JSON.stringify(tickets));
  }

  // --- Rendering Functions ---

  // Render Workstation Map
  function renderLabGrid() {
    const grid = document.getElementById('labGrid');
    if (!grid) return;
    grid.innerHTML = '';

    workstations.forEach(ws => {
      const wsEl = document.createElement('div');
      wsEl.className = `workstation status-${ws.status}`;
      wsEl.innerHTML = `
        <i data-lucide="monitor" class="ws-icon" style="margin-bottom: 0.25rem;"></i>
        <div class="ws-number">${ws.id}</div>
        <div class="ws-status">${ws.status === 'working' ? 'Operational' : ws.status === 'warning' ? 'Issue' : 'Repairing'}</div>
      `;

      wsEl.addEventListener('click', () => {
        // Direct to report tab with this WS selected
        const select = document.getElementById('wsSelector');
        if (select) {
          select.value = ws.id;
          switchTab('report');
        }
      });

      grid.appendChild(wsEl);
    });

    // Re-trigger icon rendering
    lucide.createIcons();
  }

  // Populate Dropdown selector
  function populateSelector() {
    const select = document.getElementById('wsSelector');
    if (!select) return;
    select.innerHTML = '<option value="">Choose workstation...</option>';

    workstations.forEach(ws => {
      const opt = document.createElement('option');
      opt.value = ws.id;
      opt.textContent = `${ws.id} (${ws.status.toUpperCase()})`;
      select.appendChild(opt);
    });
  }

  // Render Stats Counts
  function renderStats() {
    document.getElementById('statTotal').textContent = TOTAL_STATIONS;
    document.getElementById('statWorking').textContent = workstations.filter(w => w.status === 'working').length;
    document.getElementById('statMaintenance').textContent = workstations.filter(w => w.status === 'danger').length;
    document.getElementById('statPending').textContent = tickets.filter(t => t.status !== 'resolved').length;
  }

  // Render Tickets list
  function renderTickets() {
    const list = document.getElementById('ticketList');
    if (!list) return;
    list.innerHTML = '';

    if (tickets.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">No active maintenance logs found.</div>';
      return;
    }

    // Render tickets, sorting open/in-progress first
    const sortedTickets = [...tickets].sort((a, b) => {
      if (a.status === 'resolved' && b.status !== 'resolved') return 1;
      if (a.status !== 'resolved' && b.status === 'resolved') return -1;
      return new Date(b.date) - new Date(a.date);
    });

    sortedTickets.forEach(tkt => {
      const item = document.createElement('div');
      item.className = 'ticket-item';
      
      const formattedDate = new Date(tkt.date).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      item.innerHTML = `
        <div class="ticket-info">
          <div class="ticket-header">
            <span class="ticket-id">${tkt.id}</span>
            <span class="ticket-ws">${tkt.workstationId}</span>
            <span class="badge badge-${tkt.priority}">${tkt.priority}</span>
            <span class="badge badge-${tkt.status}">${tkt.status === 'progress' ? 'In Progress' : tkt.status}</span>
          </div>
          <div class="ticket-desc">${tkt.description}</div>
          <div class="ticket-footer">
            <span><strong>By:</strong> ${tkt.reporter}</span>
            <span><strong>Cat:</strong> ${tkt.category}</span>
            <span><strong>Time:</strong> ${formattedDate}</span>
          </div>
        </div>
        <div class="ticket-actions">
          <select class="status-updater" data-id="${tkt.id}">
            <option value="open" ${tkt.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="progress" ${tkt.status === 'progress' ? 'selected' : ''}>In Progress</option>
            <option value="resolved" ${tkt.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>
      `;

      list.appendChild(item);
    });

    // Add event listeners for status updates
    document.querySelectorAll('.status-updater').forEach(select => {
      select.addEventListener('change', (e) => {
        const ticketId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        updateTicketStatus(ticketId, newStatus);
      });
    });
  }

  function updateTicketStatus(ticketId, newStatus) {
    const tkt = tickets.find(t => t.id === ticketId);
    if (!tkt) return;

    tkt.status = newStatus;

    // Update the corresponding workstation status
    const ws = workstations.find(w => w.id === tkt.workstationId);
    if (ws) {
      if (newStatus === 'resolved') {
        // If there are no other active tickets for this workstation, set it back to working
        const otherActive = tickets.some(t => t.workstationId === tkt.workstationId && t.id !== ticketId && t.status !== 'resolved');
        if (!otherActive) {
          ws.status = 'working';
        }
      } else if (newStatus === 'progress') {
        ws.status = 'danger'; // Under active repair
      } else if (newStatus === 'open') {
        ws.status = 'warning'; // Issue registered
      }
    }

    saveToStorage();
    renderStats();
    renderLabGrid();
    renderTickets();
    populateSelector();
  }

  // --- Form submission ---
  const form = document.getElementById('issueForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const wsId = document.getElementById('wsSelector').value;
      const category = document.getElementById('issueCategory').value;
      const reporter = document.getElementById('reporterName').value;
      const priority = document.getElementById('priorityLevel').value;
      const details = document.getElementById('issueDetails').value;

      if (!wsId || !reporter || !details) return;

      const ticketId = `TKT-${(1001 + tickets.length).toString()}`;
      
      const newTicket = {
        id: ticketId,
        workstationId: wsId,
        category: category,
        reporter: reporter,
        priority: priority,
        status: 'open',
        description: details,
        date: new Date().toISOString()
      };

      tickets.push(newTicket);

      // Update workstation status to warning initially
      const ws = workstations.find(w => w.id === wsId);
      if (ws) {
        ws.status = 'warning';
      }

      saveToStorage();
      
      // Reset form and refresh UI
      form.reset();
      renderStats();
      renderLabGrid();
      renderTickets();
      populateSelector();

      // Redirect to tickets tab
      switchTab('tickets');
    });
  }

  // --- Tab Navigation logic ---
  const navContainer = document.getElementById('navLinks');
  
  function switchTab(tabId) {
    // Update active tab buttons
    document.querySelectorAll('#navLinks a').forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update active tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  if (navContainer) {
    navContainer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.getAttribute('data-tab');
        switchTab(tabId);
      });
    });
  }

  // Quick report button on dashboard
  const quickBtn = document.getElementById('quickReportBtn');
  if (quickBtn) {
    quickBtn.addEventListener('click', () => {
      switchTab('report');
    });
  }

  // Clear resolved tickets
  const clearBtn = document.getElementById('clearResolvedBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      tickets = tickets.filter(t => t.status !== 'resolved');
      saveToStorage();
      renderStats();
      renderTickets();
    });
  }

  // Initialize and first render
  initData();
  renderStats();
  renderLabGrid();
  populateSelector();
  renderTickets();
});
