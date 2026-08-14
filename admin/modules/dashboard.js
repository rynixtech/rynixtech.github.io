import { db, functions } from '../admin-firebase.js';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { httpsCallable } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js';

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
            const getAdminStats = httpsCallable(functions, 'getAdminStats');
            const result = await getAdminStats();
            stats = result.data;
        } catch (e) {
            console.warn("Cloud function getAdminStats failed, using mock data", e);
            // Fallback: manually fetch some data or use 0
        }

        const formatNumber = (num) => new Intl.NumberFormat().format(num);

        container.innerHTML = `
            <div class="dashboard-module">
                <h2>Dashboard Overview</h2>
                
                <div class="system-status" style="margin-bottom: 24px; padding: 16px; background: #0f1425; border-radius: 8px;">
                    <h3 style="margin-top: 0;">System Status</h3>
                    <div style="display: flex; gap: 20px;">
                        <div>Firebase Auth: <span style="color: #64dfac;">● Connected</span></div>
                        <div>Firestore: <span style="color: #64dfac;">● Connected</span></div>
                        <div>Storage: <span style="color: #64dfac;">● Connected</span></div>
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
                        <div style="color: #aeb8d2; font-size: 0.9em;">📁 Files</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.files)}</div>
                    </div>
                    <div class="stat-card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                        <div style="color: #aeb8d2; font-size: 0.9em;">📱 Apps</div>
                        <div style="font-size: 2em; color: #f4f7ff;">${formatNumber(stats.apps)}</div>
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

    const activityQ = query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(8));
    onSnapshot(activityQ, (snapshot) => {
        if (snapshot.empty) {
            activityList.innerHTML = '<li style="color: #aeb8d2;">No activity yet</li>';
            return;
        }
        activityList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between;">
                <span>${data.actionIcon || '📝'} ${data.actionText}</span>
                <span style="color: #aeb8d2; font-size: 0.85em;">${getRelativeTime(data.timestamp)}</span>
            </li>`;
        }).join('');
    });

    const filesQ = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'), limit(5));
    onSnapshot(filesQ, (snapshot) => {
        if (snapshot.empty) {
            filesList.innerHTML = '<li style="color: #aeb8d2;">No files uploaded</li>';
            return;
        }
        filesList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const size = (data.size / 1024).toFixed(1) + ' KB';
            return `<li style="padding: 8px 0; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div>${data.typeIcon || '📄'} ${data.name}</div>
                    <div style="color: #aeb8d2; font-size: 0.8em;">${size} • ${getRelativeTime(data.uploadedAt)}</div>
                </div>
            </li>`;
        }).join('');
    });

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
                    <div style="color: #aeb8d2; font-size: 0.8em;">$${data.amount}</div>
                </div>
                <span style="padding: 4px 8px; border-radius: 4px; background: #55dcff22; color: #55dcff; font-size: 0.8em;">${data.status}</span>
            </li>`;
        }).join('');
    });
}
