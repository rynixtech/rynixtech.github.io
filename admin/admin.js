import { requireAdmin, handleLogout, getCurrentAdmin } from './admin-auth.js';

const sidebarStructure = [
  {
    group: 'MAIN',
    items: [
      { id: 'dashboard', icon: '📊', label: 'Dashboard', route: './modules/dashboard.js' },
      { id: 'analytics', icon: '📈', label: 'Analytics', route: './modules/coming_soon.js' },
      { id: 'notifications', icon: '🔔', label: 'Notifications', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'COMMERCE',
    items: [
      { id: 'shopping_store', icon: '🛍️', label: 'Shopping Store', route: './modules/coming_soon.js' },
      { id: 'book_store', icon: '📚', label: 'Book Store', route: './modules/coming_soon.js' },
      { id: 'digital_products', icon: '💻', label: 'Digital Products', route: './modules/coming_soon.js' },
      { id: 'app_store', icon: '📱', label: 'APK/App Store', route: './modules/apps.js' },
      { id: 'media_store', icon: '🎵', label: 'Media Store', route: './modules/coming_soon.js' },
      { id: 'coupons', icon: '🏷️', label: 'Coupons & Offers', route: './modules/coming_soon.js' },
      { id: 'categories', icon: '📁', label: 'Categories', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'CATALOG',
    items: [
      { id: 'products', icon: '📦', label: 'Products', route: './modules/products.js' },
      { id: 'inventory', icon: '🏢', label: 'Inventory', route: './modules/coming_soon.js' },
      { id: 'images', icon: '🖼️', label: 'Images', route: './modules/images.js' },
      { id: 'videos', icon: '🎬', label: 'Videos', route: './modules/videos.js' },
      { id: 'files', icon: '📄', label: 'Files', route: './modules/files.js' },
      { id: 'reviews', icon: '⭐', label: 'Product Reviews', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'CUSTOMERS',
    items: [
      { id: 'users', icon: '👥', label: 'Users', route: './modules/users.js' },
      { id: 'admins', icon: '🛡️', label: 'Admins', route: './modules/coming_soon.js' },
      { id: 'customer_activity', icon: '📉', label: 'Customer Activity', route: './modules/coming_soon.js' },
      { id: 'support', icon: '🎧', label: 'Support', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'ORDERS',
    items: [
      { id: 'all_orders', icon: '🛒', label: 'All Orders', route: './modules/orders.js' },
      { id: 'pending', icon: '⏳', label: 'Pending', route: './modules/coming_soon.js' },
      { id: 'processing', icon: '⚙️', label: 'Processing', route: './modules/coming_soon.js' },
      { id: 'shipped', icon: '🚚', label: 'Shipped', route: './modules/coming_soon.js' },
      { id: 'delivered', icon: '✅', label: 'Delivered', route: './modules/coming_soon.js' },
      { id: 'returns', icon: '↩️', label: 'Returns / Refunds', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'WEBSITE',
    items: [
      { id: 'homepage', icon: '🏠', label: 'Homepage', route: './modules/website.js' },
      { id: 'pages', icon: '📄', label: 'Pages', route: './modules/coming_soon.js' },
      { id: 'banners', icon: '🖼️', label: 'Banners', route: './modules/coming_soon.js' },
      { id: 'menus', icon: '🔗', label: 'Menus', route: './modules/coming_soon.js' },
      { id: 'announcements', icon: '📢', label: 'Announcements', route: './modules/coming_soon.js' },
      { id: 'seo', icon: '🔍', label: 'SEO', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'APPS',
    items: [
      { id: 'apk_manager', icon: '🤖', label: 'APK Manager', route: './modules/apps.js' },
      { id: 'app_versions', icon: '🔄', label: 'App Versions', route: './modules/coming_soon.js' },
      { id: 'downloads', icon: '📥', label: 'Downloads', route: './modules/coming_soon.js' },
      { id: 'release_notes', icon: '📝', label: 'Release Notes', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'BOOK STORE',
    items: [
      { id: 'books', icon: '📖', label: 'Books', route: './modules/coming_soon.js' },
      { id: 'authors', icon: '✍️', label: 'Authors', route: './modules/coming_soon.js' },
      { id: 'book_categories', icon: '📑', label: 'Categories', route: './modules/coming_soon.js' },
      { id: 'ebooks', icon: '📱', label: 'eBooks', route: './modules/coming_soon.js' },
      { id: 'book_orders', icon: '📦', label: 'Book Orders', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'MEDIA',
    items: [
      { id: 'media_videos', icon: '📽️', label: 'Videos', route: './modules/videos.js' },
      { id: 'media_audio', icon: '🎵', label: 'Audio', route: './modules/coming_soon.js' },
      { id: 'media_images', icon: '🖼️', label: 'Images', route: './modules/images.js' },
      { id: 'media_categories', icon: '📂', label: 'Media Categories', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'SYSTEM',
    items: [
      { id: 'health', icon: '❤️', label: 'System Health', route: './modules/health.js' },
      { id: 'brain_assistant', icon: '🧠', label: 'Brain Assistant', route: './modules/brain_assistant.js' },
      { id: 'errors', icon: '⚠️', label: 'Error Monitor', route: './modules/errors.js' },
      { id: 'autorepair', icon: '🔧', label: 'Auto Repair', route: './modules/autorepair.js' },
      { id: 'repairhistory', icon: '🕒', label: 'Repair History', route: './modules/repairhistory.js' },
      { id: 'alerts', icon: '🚨', label: 'Alerts', route: './modules/alerts.js' },
      { id: 'rollback', icon: '⏪', label: 'Recovery / Rollback', route: './modules/rollback.js' },
      { id: 'diagnostics', icon: '🔬', label: 'System Diagnostics', route: './modules/diagnostics.js' },
      { id: 'activity', icon: '📋', label: 'Activity Log', route: './modules/activity.js' },
      { id: 'storage', icon: '💾', label: 'Storage', route: './modules/coming_soon.js' },
      { id: 'security', icon: '🔒', label: 'Security', route: './modules/coming_soon.js' }
    ]
  },
  {
    group: 'SETTINGS',
    items: [
      { id: 'website_settings', icon: '🌐', label: 'Website Settings', route: './modules/settings.js' },
      { id: 'store_settings', icon: '🏪', label: 'Store Settings', route: './modules/coming_soon.js' },
      { id: 'payment_settings', icon: '💳', label: 'Payment Settings', route: './modules/coming_soon.js' },
      { id: 'shipping_settings', icon: '🚢', label: 'Shipping Settings', route: './modules/coming_soon.js' },
      { id: 'notifications_settings', icon: '📨', label: 'Notifications', route: './modules/coming_soon.js' },
      { id: 'admin_settings', icon: '🛠️', label: 'Admin Settings', route: './modules/coming_soon.js' }
    ]
  }
];

const routes = {};
const sectionTitles = {};

sidebarStructure.forEach(group => {
  group.items.forEach(item => {
    routes[item.id] = item.route;
    sectionTitles[item.id] = item.label;
  });
});

let appContent, sidebar, sidebarOverlay, headerTitle;

function getCurrentRoute() {
  return window.location.hash.substring(1) || 'dashboard';
}

async function loadModule(route) {
  if (!routes[route]) route = 'dashboard';

  appContent.classList.add('page-exit');

  try {
    const module = await import(routes[route]);

    setTimeout(() => {
      appContent.innerHTML = '';
      appContent.classList.remove('page-exit');
      appContent.classList.add('page-enter');
      if (module.render) module.render(appContent);
      if (headerTitle) headerTitle.textContent = sectionTitles[route] || route;
      setTimeout(() => appContent.classList.remove('page-enter'), 250);
    }, 180);

    updateSidebarActiveState(route);
  } catch (error) {
    console.error(`Error loading module "${route}":`, error);
    appContent.classList.remove('page-exit');
    appContent.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">⚠️</span>
        <h3>Module failed to load</h3>
        <p class="text-muted">${error.message}</p>
      </div>`;
  }
}

function updateSidebarActiveState(route) {
  sidebar.querySelectorAll('.sidebar-nav a[data-route]').forEach(link => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function toggleMobileSidebar() {
  sidebar.classList.toggle('open');
  sidebarOverlay.hidden = !sidebar.classList.contains('open');
}

function closeMobileSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.hidden = true;
}

function initSidebar(user) {
  let navHTML = '';
  
  sidebarStructure.forEach((group, index) => {
    // Keep the first two groups open by default, collapse the rest
    const isHidden = index > 1 ? 'hidden' : '';
    navHTML += `<div class="sidebar-group">
      <div class="sidebar-group-title" onclick="this.nextElementSibling.classList.toggle('hidden')">
        <span>${group.group}</span>
        <span class="sidebar-group-toggle">▼</span>
      </div>
      <div class="sidebar-group-items ${isHidden}">`;
      
    group.items.forEach(item => {
      navHTML += `<a href="#${item.id}" data-route="${item.id}">
        <span class="sidebar-item-icon">${item.icon}</span>
        ${item.label}
      </a>`;
    });
    
    navHTML += `</div></div>`;
  });

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-icon">✦</span>
      <div>
        <div class="sidebar-brand-name">RYNIX TECH</div>
        <div class="sidebar-brand-sub">Control Center</div>
      </div>
      <button class="sidebar-close-btn" id="sidebar-close-btn" aria-label="Close menu">✕</button>
    </div>
    <nav class="sidebar-nav" id="sidebar-nav-container">${navHTML}</nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${(user.email || 'A')[0].toUpperCase()}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.displayName || 'Admin'}</div>
          <div class="sidebar-user-email">${user.email || ''}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm sidebar-logout" id="sidebar-logout-btn">Logout</button>
    </div>
  `;

  document.getElementById('sidebar-logout-btn').addEventListener('click', handleLogout);
  document.getElementById('sidebar-close-btn').addEventListener('click', closeMobileSidebar);
}

function initHeader(user) {
  const header = document.getElementById('header');
  header.innerHTML = `
    <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Open menu">☰</button>
    <h2 class="header-title" id="header-title">${sectionTitles[getCurrentRoute()] || 'Dashboard'}</h2>
    <div class="header-search">
      <span class="header-search-icon">🔍</span>
      <input type="text" id="admin-search-input" placeholder="Search…" autocomplete="off">
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost btn-sm" id="header-switch-btn" title="Switch to Customer Mode" style="color: var(--primary); font-weight: bold;">👤 Customer</button>
      <button class="header-action-btn" id="notification-btn" title="Notifications">
        🔔<span class="notification-badge" id="notif-badge" hidden>0</span>
      </button>
      <div class="header-user">
        <span class="header-user-avatar">${(user.email || 'A')[0].toUpperCase()}</span>
        <span class="header-user-name">${user.displayName || user.email?.split('@')[0] || 'Admin'}</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="header-logout-btn" title="Logout">↪</button>
    </div>
  `;

  headerTitle = document.getElementById('header-title');
  document.getElementById('mobile-menu-btn').addEventListener('click', toggleMobileSidebar);
  document.getElementById('header-logout-btn').addEventListener('click', handleLogout);
  document.getElementById('header-switch-btn').addEventListener('click', () => {
    sessionStorage.setItem('rynix_admin_mode', 'customer');
    window.location.href = '../dashboard.html';
  });

  const searchInput = document.getElementById('admin-search-input');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('admin-search', { detail: { query: e.target.value } }));
    }, 300);
  });
}

// Initialize
window.addEventListener('hashchange', () => {
  loadModule(getCurrentRoute());
  closeMobileSidebar();
});

window.addEventListener('admin-ready', (e) => {
  appContent = document.getElementById('app-content');
  sidebar = document.getElementById('sidebar');
  sidebarOverlay = document.getElementById('sidebar-overlay');

  sidebarOverlay.addEventListener('click', closeMobileSidebar);

  const user = e.detail.user;
  initSidebar(user);
  initHeader(user);
  loadModule(getCurrentRoute());
});
