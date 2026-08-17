import { db } from '../admin-firebase.js';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { httpsCallable } from '../admin-firebase.js';

export async function render(container) {
    container.innerHTML = `
        <div class="dashboard-module">
            <div class="stats-skeleton">Loading stats...</div>
        </div>
    `;

    try {
        // We'll mock the counts if the cloud function isn't available
        let stats = { users: 0, products: 0, orders: 0, files: 0, apps: 0, errors: 0 };
        try {
            const getAdminStats = httpsCallable(null, 'getAdminStats');
            const result = await getAdminStats();
            const d = result.data || result;
            stats = {
              users: d.totalUsers || d.users || 0,
              products: d.totalProducts || d.products || 0,
              orders: d.totalOrders || d.orders || 0,
              files: d.totalFiles || d.files || 0,
              apps: d.totalApps || d.apps || 0,
              errors: d.activeErrors || d.errors || 0,
              revenue: d.revenue || 0,
              books: d.books || 0,
              storageUsed: d.storageUsed || '0 MB'
            };
        } catch (e) {
            console.warn("Cloud function getAdminStats failed, using fallback", e);
        }

        const formatNumber = (num) => new Intl.NumberFormat().format(num);

        container.innerHTML = `
            <div class="dashboard-module">
                <h2>Dashboard Overview</h2>
                
                <div class="quick-actions" style="margin-bottom: 32px; padding: 20px; background: #0f1425; border-radius: 8px;">
                    <h3 style="margin-top: 0;">Quick Actions</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                        <button class="btn btn-primary" onclick="window.location.hash='#products'">+ Add Product</button>
                        <button class="btn btn-primary" onclick="window.location.hash='#books'">+ Add Book</button>
                        <button class="btn btn-primary" onclick="window.location.hash='#images'">+ Upload Image</button>
                        <button class="btn btn-primary" onclick="window.location.hash='#videos'">+ Upload Video</button>
                        <button class="btn btn-primary" onclick="window.location.hash='#apk_manager'">+ Upload APK</button>
                        <button class="btn btn-ghost" onclick="window.location.hash='#coupons'">+ Create Coupon</button>
                        <button class="btn btn-ghost" onclick="window.location.hash='#banners'">+ Publish Banner</button>
                        <button class="btn btn-ghost" onclick="window.location.hash='#all_orders'">View Orders →</button>
                    </div>
                </div>

                <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 32px;">
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">👥 Total Users</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.users)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">📦 Products</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.products)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">🛒 Orders</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.orders)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">💰 Revenue</div>
                        <div style="font-size: 2em; color: #64dfac;">$${formatNumber(stats.revenue || 0)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">📁 Files</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.files)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">📱 Apps</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.apps)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">📖 Books</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.books || 0)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">💾 Storage Used</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${stats.storageUsed || '0 MB'}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">⚠️ Active Errors</div>
                        <div style="font-size: 2em; color: ${stats.errors > 0 ? '#ff758f' : '#64dfac'};">${formatNumber(stats.errors)}</div>
                    </div>
                </div>

                <div class="three-col-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                    <div class="list-section" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <h3>Recent Activity</h3>
                        <ul id="activity-list" style="list-style: none; padding: 0; margin: 0;">Loading...</ul>
                    </div>
                    <div class="list-section" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <h3>Recent Files</h3>
                        <ul id="files-list" style="list-style: none; padding: 0; margin: 0;">Loading...</ul>
                    </div>
                    <div class="list-section" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <h3>Recent Orders</h3>
                        <ul id="orders-list" style="list-style: none; padding: 0; margin: 0;">Loading...</ul>
                    </div>
                </div>
            </div>
        `;

        setupListeners();
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        container.innerHTML = `<div style="color: #ff758f;">Error loading dashboard data.</div>`;
    }
}

function getRelativeTime(timestamp) {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((new Date() - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    return Math.floor(diff / 86400) + ' days ago';
}

function setupListeners() {
    const activityList = document.getElementById('activity-list');
    const filesList = document.getElementById('files-list');
    const ordersList = document.getElementById('orders-list');

    window.retrySnapshot = window.retrySnapshot || {};

    const handleError = (element, error, retryKey, retryFn) => {
        console.error(`[Diagnostic] Firestore error for ${retryKey}:`, error.code, error.message);
        window.retrySnapshot[retryKey] = retryFn;
        element.innerHTML = `
            <li style="color: #ff758f; padding: 12px; background: rgba(255,117,143,0.1); border-radius: 6px; border: 1px solid rgba(255,117,143,0.2);">
                <div style="font-weight: bold; margin-bottom: 4px;">Error Loading Data</div>
                <div style="font-size: 0.85em; opacity: 0.9; margin-bottom: 8px; word-break: break-word;">${error.message || 'Permission denied or network error'}</div>
                <button onclick="window.retrySnapshot['${retryKey}']()" style="background: #ff758f; color: #0a0e1a; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85em; font-weight: bold;">Retry Connection</button>
            </li>
        `;
    };

    function setupActivity() {
        activityList.innerHTML = '<li style="color: #aeb8d2;">Loading...</li>';
        const activityQ = query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(8));
        onSnapshot(activityQ, (snapshot) => {
            if (snapshot.empty) {
                activityList.innerHTML = '<li style="color: #aeb8d2;">No activity yet</li>';
                return;
            }
            activityList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between;">
                    <span>${data.actionIcon || '📝'} ${data.actionText || 'Unknown Action'}</span>
                    <span style="color: #aeb8d2; font-size: 0.85em;">${getRelativeTime(data.timestamp)}</span>
                </li>`;
            }).join('');
        }, (error) => handleError(activityList, error, 'activity', setupActivity));
    }

    function setupFiles() {
        filesList.innerHTML = '<li style="color: #aeb8d2;">Loading...</li>';
        const filesQ = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'), limit(5));
        onSnapshot(filesQ, (snapshot) => {
            if (snapshot.empty) {
                filesList.innerHTML = '<li style="color: #aeb8d2;">No files uploaded</li>';
                return;
            }
            filesList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                const size = ((data.size || 0) / 1024).toFixed(1) + ' KB';
                return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between; align-items: center;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">
                        <div>${data.typeIcon || '📄'} ${data.name || 'Unnamed file'}</div>
                        <div style="color: #aeb8d2; font-size: 0.8em;">${size} • ${getRelativeTime(data.uploadedAt)}</div>
                    </div>
                </li>`;
            }).join('');
        }, (error) => handleError(filesList, error, 'files', setupFiles));
    }

    function setupOrders() {
        ordersList.innerHTML = '<li style="color: #aeb8d2;">Loading...</li>';
        const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
        onSnapshot(ordersQ, (snapshot) => {
            if (snapshot.empty) {
                ordersList.innerHTML = '<li style="color: #aeb8d2;">No orders yet</li>';
                return;
            }
            ordersList.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div>Order #${doc.id.substring(0, 8)}</div>
                        <div style="color: #aeb8d2; font-size: 0.8em;">$${data.amount || 0}</div>
                    </div>
                    <span style="padding: 4px 8px; border-radius: 4px; background: #55dcff22; color: #55dcff; font-size: 0.8em;">${data.status || 'pending'}</span>
                </li>`;
            }).join('');
        }, (error) => handleError(ordersList, error, 'orders', setupOrders));
    }

    setupActivity();
    setupFiles();
    setupOrders();
}
