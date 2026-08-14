export function renderHeader(container, { user }) {
  const hash = window.location.hash.slice(1) || 'dashboard';
  const title = hash.charAt(0).toUpperCase() + hash.slice(1);

  container.innerHTML = `
    <div class="header-left" style="display: flex; align-items: center; gap: 15px;">
      <button id="mobile-menu-toggle" style="background: none; border: none; color: #f4f7ff; font-size: 1.5rem; cursor: pointer; display: none;">☰</button>
      <h1 id="header-title" style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem;">${title}</h1>
    </div>
    <div class="header-center" style="flex: 1; max-width: 400px; margin: 0 20px;">
      <div style="position: relative;">
        <span style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #aeb8d2;">🔍</span>
        <input type="text" id="admin-search-input" placeholder="Search..." style="width: 100%; padding: 8px 10px 8px 35px; border-radius: 6px; border: 1px solid rgba(183,202,255,0.12); background: #0f1425; color: #f4f7ff;">
      </div>
    </div>
    <div class="header-right" style="display: flex; align-items: center; gap: 20px;">
      <div style="position: relative; cursor: pointer;">
        <span style="font-size: 1.2rem;">🔔</span>
        <span style="position: absolute; top: -5px; right: -5px; background: #ff758f; color: white; font-size: 0.6rem; padding: 2px 5px; border-radius: 10px;">3</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #aeb8d2; font-size: 0.9rem;">${user?.displayName || user?.email || 'Admin'}</span>
        <button id="header-logout" style="padding: 6px 12px; background: rgba(183,202,255,0.12); border: none; color: #ff758f; border-radius: 4px; cursor: pointer;">Logout</button>
      </div>
    </div>
  `;

  if (window.innerWidth <= 768) {
    container.querySelector('#mobile-menu-toggle').style.display = 'block';
  }

  container.querySelector('#mobile-menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  });

  const searchInput = container.querySelector('#admin-search-input');
  searchInput?.addEventListener('input', (e) => {
    const event = new CustomEvent('admin-search', { detail: { query: e.target.value } });
    document.dispatchEvent(event);
  });

  container.querySelector('#header-logout')?.addEventListener('click', async () => {
    const { handleLogout } = await import('../admin-auth.js');
    handleLogout();
  });
}

export function updateHeaderTitle(title) {
  const titleEl = document.getElementById('header-title');
  if (titleEl) {
    titleEl.textContent = title;
  }
}
