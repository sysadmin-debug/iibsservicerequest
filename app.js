// IIBS Service Ticketing System — Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // ===== State =====
  let tickets = [];
  
  // Initialize Supabase
  const supabaseUrl = 'https://ttfpstdetevgkjnkqcxf.supabase.co';
  const supabaseKey = 'sb_publishable_MXV3EFM0dxohHYcieiptdA_p7UhMePb';
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  // ===== Remove Fetch All for Privacy =====
  // We no longer fetch all tickets on the public page.
  
  // ===== Check Ticket Status (Track Tab) =====
  const statusSearchBtn = document.getElementById('statusSearchBtn');
  const statusSearchInput = document.getElementById('statusSearchInput');
  const statusResultBox = document.getElementById('statusResultBox');

  if (statusSearchBtn) {
    statusSearchBtn.addEventListener('click', async () => {
      const queryId = statusSearchInput.value.trim().toUpperCase();
      if (!queryId) return;

      statusSearchBtn.textContent = 'Checking...';
      statusSearchBtn.disabled = true;
      statusResultBox.style.display = 'none';

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_id', queryId)
        .single();

      statusSearchBtn.textContent = 'Check';
      statusSearchBtn.disabled = false;

      if (error || !data) {
        statusResultBox.style.display = 'block';
        statusResultBox.innerHTML = `
          <div class="empty-state" style="padding: 2rem;">
            <i data-lucide="search-x"></i>
            <p>Ticket not found</p>
            <small>Please check the ID and try again (e.g. TKT-12345).</small>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      let dateString = data.created_at;
      try {
        dateString = new Date(data.created_at).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      } catch(e) {}

      statusResultBox.style.display = 'block';
      statusResultBox.innerHTML = `
        <div class="ticket-item priority-${data.status === 'open' ? 'medium' : data.status === 'progress' ? 'high' : 'low'}">
          <div class="ticket-top">
            <div class="ticket-top-left">
              <span class="ticket-id">${data.ticket_id}</span>
              <span class="badge badge-${data.status}">${formatStatus(data.status)}</span>
              <span class="badge badge-category">${data.ticket_type}</span>
            </div>
          </div>
          <div class="ticket-subject">${data.other_request || data.ticket_type}</div>
          
          <div class="ticket-meta" style="margin-top: 1rem;">
            <span><i data-lucide="user"></i> ${data.name}</span>
            <span><i data-lucide="building-2"></i> ${data.department}</span>
            <span><i data-lucide="clock"></i> ${dateString}</span>
          </div>

          ${data.resolution ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-body); border-radius: 8px; border-left: 4px solid var(--primary-color);">
              <h4 style="margin-bottom: 0.5rem; color: var(--text-primary);">Resolution / IT Notes</h4>
              <p style="color: var(--text-secondary); font-size: 0.95rem;">${data.resolution}</p>
            </div>
          ` : ''}
        </div>
      `;
      lucide.createIcons();
    });
  }

  // ===== Modal Handlers (Detail modal logic removed for public) =====

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

      const newTicket = {
        ticket_id: tempId,
        name: document.getElementById('userName').value.trim(),
        iibs_id: document.getElementById('userIdNumber').value.trim(),
        role: document.getElementById('userRole').value,
        department: document.getElementById('userDepartment').value.trim(),
        contact: document.getElementById('userContact').value.trim(),
        email: document.getElementById('userEmail').value.trim(),
        ticket_type: document.getElementById('ticketType').value,
        other_request: document.getElementById('otherRequest')?.value.trim() || '',
        status: 'open',
        resolution: ''
      };

      // Insert directly into Supabase!
      const { error } = await supabase
        .from('tickets')
        .insert([newTicket]);

      if (error) {
        console.error('Error inserting to Supabase:', error);
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
      const message = `🚨 *New IT Service Request*\n\n` +
                      `*ID:* ${tempId}\n` +
                      `*From:* ${newTicket.name} (${newTicket.department})\n` +
                      `*Type:* ${newTicket.ticket_type}\n` +
                      `*Contact:* ${newTicket.contact}\n\n` +
                      `[View Portal](https://sysadmin-debug.github.io/iibsservicerequest/)`;
      
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
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

    // Refresh tickets from supabase when tracking tab is opened
    if (tabId === 'track') {
      fetchTicketsFromSupabase();
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

  // Removed init fetch, no longer fetching all tickets on load
});
