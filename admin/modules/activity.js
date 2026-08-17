import { db } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Activity Log</h2>
        </div>
        <div class="timeline" id="activity-timeline" style="padding: 20px;">
            Loading activity...
        </div>
    `;

    const timeline = document.getElementById('activity-timeline');
    
    window.retryActivityLog = () => {
        timeline.innerHTML = '<p style="color: #aeb8d2;">Loading activity...</p>';
        loadActivity();
    };

    async function loadActivity() {
        try {
            const q = query(collection(db, 'activityLog'), orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                timeline.innerHTML = '<p>No activity recorded yet.</p>';
                return;
            }

            timeline.innerHTML = '';
            
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                let icon = '📋';
                switch (data.action) {
                    case 'upload': icon = '📤'; break;
                    case 'delete': icon = '🗑️'; break;
                    case 'edit': icon = '📝'; break;
                    case 'create': icon = '➕'; break;
                    case 'status-change': icon = '🔄'; break;
                    case 'settings': icon = '⚙️'; break;
                }
                
                const div = document.createElement('div');
                div.className = 'timeline-item';
                div.style.marginBottom = '15px';
                div.style.padding = '10px';
                div.style.borderLeft = '3px solid #55dcff';
                div.style.background = '#0f1425';
                
                let dateStr = 'Unknown time';
                if (data.timestamp) {
                    try {
                        dateStr = new Date(data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp).toLocaleString();
                    } catch (e) {}
                }
                const actionText = data.actionText || `${data.action} ${data.resource}`;
                const displayIcon = data.actionIcon || icon;
                
                div.innerHTML = `
                    <div style="font-size: 20px; float: left; margin-right: 10px;">${displayIcon}</div>
                    <div>
                        <strong>${actionText}</strong><br>
                        <small style="color: #aeb8d2;">${dateStr}</small>
                        ${data.details ? \`<br><span style="color: #f4f7ff;">${data.details}</span>\` : ''}
                    </div>
                `;
                timeline.appendChild(div);
            });
        } catch (error) {
            console.error('[Diagnostic] Firestore error for activityLog:', error.code, error.message);
            timeline.innerHTML = `
                <div style="color: #ff758f; padding: 20px; background: rgba(255,117,143,0.1); border-radius: 8px; border: 1px solid rgba(255,117,143,0.2);">
                    <h3 style="margin-top: 0;">Error Loading Activity Log</h3>
                    <p style="opacity: 0.9;">${error.message || 'Permission denied or network error'}</p>
                    <button onclick="window.retryActivityLog()" style="background: #ff758f; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">Retry Connection</button>
                </div>
            `;
        }
    }

    loadActivity();
}
