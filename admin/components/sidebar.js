export function renderSidebar(container, { user, activeSection }) {
  const sections = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'files', icon: '📁', label: 'Files' },
    { id: 'images', icon: '🖼️', label: 'Images' },
    { id: 'videos', icon: '🎬', label: 'Videos' },
    { id: 'apps', icon: '📱', label: 'Apps' },
    { id: 'products', icon: '📦', label: 'Products' },
    { id: 'orders', icon: '🛒', label: 'Orders' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'website', icon: '🌐', label: 'Website' },
    { id: 'errors', icon: '⚠️', label: 'Errors' },
    { id: 'activity', icon: '📋', label: 'Activity' },
    { id: 'settings', icon: '⚙️', label: 'Settings' }
  ];

  container.innerHTML = `
    <div class="sidebar-header" style="padding: 20px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <h2 style="margin: 0; color: #f4f7ff; font-family: 'Space Grotesk', sans-serif;">✦ RYNIX TECH</h2>
        <span style="color: #aeb8d2; font-size: 0.8rem;">Control Center</span>
      </div>
      <button class="mobile-close" style="display: none; background: none; border: none; color: #aeb8d2; font-size: 1.5rem; cursor: pointer;">×</button>
    </div>
    <nav class="sidebar-nav" style="padding: 10px 0; overflow-y: auto; flex: 1;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${sections.map(s => `
          <li>
            <a href="#${s.id}" data-section="${s.id}" class="nav-link ${s.id === activeSection ? 'active' : ''}" style="display: flex; align-items: center; padding: 12px 20px; color: ${s.id === activeSection ? '#f6c657' : '#f4f7ff'}; text-decoration: none; border-left: 3px solid ${s.id === activeSection ? '#f6c657' : 'transparent'}; transition: all 0.2s;">
              <span style="margin-right: 12px; font-size: 1.2rem;">${s.icon}</span>
              ${s.label}
            </a>
          </li>
        `).join('')}
      </ul>
    </nav>
    <div class="sidebar-footer" style="padding: 20px; border-top: 1px solid rgba(183,202,255,0.12);">
      <div style="color: #aeb8d2; font-size: 0.9rem; margin-bottom: 10px; word-break: break-all;">${user?.email || 'Admin'}</div>
      <button id="sidebar-logout" style="width: 100%; padding: 8px; background: rgba(183,202,255,0.12); border: none; color: #ff758f; border-radius: 4px; cursor: pointer;">Logout</button>
    </div>
  `;

  // Mobile close handling
  const closeBtn = container.querySelector('.mobile-close');
  if (window.innerWidth <= 768) {
    closeBtn.style.display = 'block';
  }
  closeBtn.addEventListener('click', () => {
    container.classList.remove('open');
  });

  container.querySelector('#sidebar-logout')?.addEventListener('click', async () => {
    const { handleLogout } = await import('../admin-auth.js');
    handleLogout();
  });
}

export function updateActiveSection(section) {
  const links = document.querySelectorAll('.sidebar-nav .nav-link');
  links.forEach(link => {
    if (link.dataset.section === section) {
      link.classList.add('active');
      link.style.color = '#f6c657';
      link.style.borderLeftColor = '#f6c657';
    } else {
      link.classList.remove('active');
      link.style.color = '#f4f7ff';
      link.style.borderLeftColor = 'transparent';
    }
  });
}
