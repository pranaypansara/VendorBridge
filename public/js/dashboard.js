document.addEventListener('DOMContentLoaded', async () => {
  const loadingScreen = document.getElementById('loading-screen');
  const logoutBtn = document.getElementById('logout-btn');

  // Verify user is authenticated
  let currentUser = null;
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      // Not authenticated, redirect to login page
      window.location.href = '/login.html';
      return;
    }
    const data = await response.json();
    currentUser = data.user;
  } catch (error) {
    console.error('Session verification failed:', error);
    window.location.href = '/login.html';
    return;
  }

  // Hide loading spinner
  if (loadingScreen) {
    loadingScreen.style.opacity = '0';
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 300);
  }

  // Populate Dashboard details
  if (currentUser) {
    // Top right menu
    document.getElementById('user-display-name').textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    document.getElementById('user-display-role').textContent = currentUser.role;
    
    // Set avatar initials
    const initials = `${currentUser.first_name.charAt(0)}${currentUser.last_name.charAt(0)}`.toUpperCase();
    document.getElementById('user-avatar').textContent = initials;

    // Welcome banner customization based on role
    const welcomeTitle = document.getElementById('welcome-message');
    const welcomeDesc = document.getElementById('welcome-description');
    welcomeTitle.textContent = `Welcome back, ${currentUser.first_name}!`;

    if (currentUser.role === 'Admin') {
      welcomeDesc.textContent = 'Procurement environment administrator panel. You have access to configure system controls, audit logs, and manage organizational workflows.';
    } else if (currentUser.role === 'Procurement Officer') {
      welcomeDesc.textContent = 'Procurement Officer Workspace. Create Request for Quotations (RFQs), map supplier groups, and review vendor quotations.';
    } else if (currentUser.role === 'Manager') {
      welcomeDesc.textContent = 'Manager Approval Terminal. Review quotation comparisons, inspect pricing options, and authorize purchase orders.';
    } else if (currentUser.role === 'Vendor') {
      welcomeDesc.textContent = 'Vendor Portal. View assigned RFQs, submit quotation pricing, and track invoice payments.';
    }

    // Session Details Card
    document.getElementById('sess-first-name').textContent = currentUser.first_name;
    document.getElementById('sess-last-name').textContent = currentUser.last_name;
    document.getElementById('sess-email').textContent = currentUser.email;
    document.getElementById('sess-phone').textContent = currentUser.phone || 'None provided';
    document.getElementById('sess-id').textContent = currentUser.id;
  }

  // Query database configuration status
  try {
    const dbResponse = await fetch('/api/db-status');
    const dbData = await dbResponse.json();
    
    const connIndicator = document.getElementById('db-conn-indicator');
    const connBadge = document.getElementById('db-conn-badge');

    if (dbData && dbData.configured) {
      connIndicator.textContent = 'Connected (Neon PG)';
      connIndicator.style.color = '#4ade80';
      connBadge.textContent = 'Online';
      connBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
      connBadge.style.color = '#4ade80';
    } else {
      connIndicator.textContent = 'Unconfigured (Offline)';
      connIndicator.style.color = '#f87171';
      connBadge.textContent = 'Missing Config';
      connBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
      connBadge.style.color = '#f87171';
    }
  } catch (error) {
    console.warn('Failed to audit database status:', error);
  }

  // Logout button handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/auth/logout', {
          method: 'POST'
        });
        if (response.ok) {
          window.location.href = '/login.html';
        } else {
          alert('Failed to log out. Please try again.');
        }
      } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
      }
    });
  }
});
