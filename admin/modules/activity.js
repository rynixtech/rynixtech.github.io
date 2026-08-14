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
    
    async function loadActivity() {
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
            
            const dateStr = data.timestamp ? new Date(data.timestamp.toDate()).toLocaleString() : 'Unknown time';
            
            div.innerHTML = `
                <div style="font-size: 20px; float: left; margin-right: 10px;">\${icon}</div>
                <div>
                    <strong>\${data.action} \${data.resource}</strong><br>
                    <small style="color: #aeb8d2;">\${dateStr}</small>
                    \${data.details ? \`<br><span style="color: #f4f7ff;">\${data.details}</span>\` : ''}
                </div>
            `;
            timeline.appendChild(div);
        });
    }

    loadActivity();
}
