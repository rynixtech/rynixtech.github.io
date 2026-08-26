import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Notifications</h2>
            <button id="mark-all-read" class="btn btn-primary" style="background: #3b82f6;">Mark All as Read</button>
        </div>
        <div id="notifications-list" style="display: flex; flex-direction: column; gap: 15px;">
            <div style="padding: 20px; text-align: center; color: var(--muted);">Loading notifications...</div>
        </div>
    `;

    const listDiv = document.getElementById('notifications-list');
    let notifications = [];

    async function loadNotifications() {
        try {
            const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            renderList();
        } catch(err) {
            listDiv.innerHTML = \`<div style="color:#ff758f; padding: 20px;">Failed to load: \${err.message}</div>\`;
        }
    }

    function renderList() {
        listDiv.innerHTML = '';
        if (notifications.length === 0) {
            listDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No notifications yet.</div>';
            return;
        }

        notifications.forEach(notif => {
            const el = document.createElement('div');
            el.style.cssText = \`
                background: \${notif.read ? '#0f1425' : 'rgba(59,130,246,0.1)'}; 
                border-left: 4px solid \${notif.read ? 'transparent' : '#3b82f6'}; 
                padding: 15px; 
                border-radius: 4px; 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                transition: background 0.3s;
            \`;
            
            const d = notif.createdAt ? (notif.createdAt.toDate ? new Date(notif.createdAt.toDate()) : new Date(notif.createdAt)) : new Date();

            el.innerHTML = \`
                <div>
                    <div style="font-weight: bold; margin-bottom: 5px; color: \${notif.read ? '#aeb8d2' : '#f4f7ff'};">\${escapeHTML(notif.title || 'Notification')}</div>
                    <div style="color: #aeb8d2; font-size: 0.9rem; margin-bottom: 5px;">\${escapeHTML(notif.message || '')}</div>
                    <div style="color: var(--muted); font-size: 0.75rem;">\${d.toLocaleString()}</div>
                </div>
                \${!notif.read ? \`<button class="btn btn-quiet mark-read" data-id="\${notif.id}">Mark Read</button>\` : ''}
            \`;
            listDiv.appendChild(el);
        });

        document.querySelectorAll('.mark-read').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                try {
                    await updateDoc(doc(db, 'admin_notifications', id), { read: true });
                    loadNotifications();
                } catch(err) {
                    console.error(err);
                }
            });
        });
    }

    document.getElementById('mark-all-read').addEventListener('click', async () => {
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        
        try {
            const batch = writeBatch(db);
            unread.forEach(n => {
                batch.update(doc(db, 'admin_notifications', n.id), { read: true });
            });
            await batch.commit();
            loadNotifications();
        } catch(err) {
            alert('Failed to mark all as read: ' + err.message);
        }
    });

    loadNotifications();
}
