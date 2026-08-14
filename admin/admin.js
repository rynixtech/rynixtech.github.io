import { requireAdmin, handleLogout, getCurrentAdmin } from './admin-auth.js';

const routes = {
  dashboard: './modules/dashboard.js',
  files: './modules/files.js',
  images: './modules/images.js',
  videos: './modules/videos.js',
  apps: './modules/apps.js',
  products: './modules/products.js',
  orders: './modules/orders.js',
  users: './modules/users.js',
  website: './modules/website.js',
  errors: './modules/errors.js',
  activity: './modules/activity.js',
  settings: './modules/settings.js'
};

const sectionLabels = {
  dashboard: '📊 Dashboard',
  files: '📁 Files',
  images: '🖼️ Images',
  videos: '🎬 Videos',
  apps: '📱 Apps',
  products: '📦 Products',
  orders: '🛒 Orders',
  users: '👥 Users',
  website: '🌐 Website',
  errors: '⚠️ Errors',
  activity: '📋 Activity',
  settings: '⚙️ Settings'
};

const sectionTitles = {
  dashboard: 'Dashboard',
  files: 'File Manager',
  images: 'Image Manager',
  videos: 'Video Manager',
  apps: 'App Manager',
  products: 'Products',
  orders: 'Orders',
  users: 'Users',
  website: 'Website Content',
  errors: 'Error Center',
  activity: 'Activity Log',
  settings: 'Settings'
};

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
  const navItems = Object.entries(sectionLabels).map(([route, label]) =>
    `<a href="#${route}" data-route="${route}">${label}</a>`
  ).join('');

  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <span class="sidebar-brand-icon">✦</span>
      <div>
        <div class="sidebar-brand-name">RYNIX TECH</div>
        <div class="sidebar-brand-sub">Control Center</div>
      </div>
      <button class="sidebar-close-btn" id="sidebar-close-btn" aria-label="Close menu">✕</button>
    </div>
    <nav class="sidebar-nav">${navItems}</nav>
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
