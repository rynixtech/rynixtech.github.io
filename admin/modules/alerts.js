import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>System Alerts</h2>
            <button class="btn btn-primary" style="background: #3b82f6;">Configure Alerts</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px;">
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Active Incidents</h3>
                
                <div id="alerts-list" style="margin-top: 15px; display: flex; flex-direction: column; gap: 12px;">
                    <div style="color: var(--muted); text-align: center;">Loading system alerts...</div>
                </div>
            </div>

            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Alert Rules</h3>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked disabled /> Critical System Failures
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked disabled /> Security/Auth Breaches
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked disabled /> Auto-Repair Failures (Rollbacks)
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" disabled /> Auto-Repair Successes (Info)
                    </label>
                </div>
                <hr style="border-color: rgba(255,255,255,0.05); margin: 20px 0;">
                <p style="color: #aeb8d2; font-size: 0.85em;">Alerts are delivered securely via Cloudflare Worker integration. Database: system_alerts.</p>
            </div>
        </div>
    `;

    const alertsList = document.getElementById('alerts-list');

    async function loadAlerts() {
        try {
            const q = query(collection(db, 'system_alerts'), orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            
            alertsList.innerHTML = '';
            
            if (snapshot.empty) {
                alertsList.innerHTML = \`<div style="color: #4ade80; text-align: center; padding: 20px;">✅ All systems operational. No active alerts.</div>\`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const d = data.timestamp ? (data.timestamp.toDate ? new Date(data.timestamp.toDate()) : new Date(data.timestamp)) : new Date();
                
                let icon = 'ℹ️';
                let borderColor = '#3b82f6';
                let bgColor = 'rgba(59,130,246,0.1)';
                
                if (data.severity === 'CRITICAL' || data.severity === 'ERROR') {
                    icon = '🚨';
                    borderColor = '#ff758f';
                    bgColor = 'rgba(255,117,143,0.1)';
                } else if (data.severity === 'WARNING') {
                    icon = '⚠️';
                    borderColor = '#f59e0b';
                    bgColor = 'rgba(245,158,11,0.1)';
                }

                const el = document.createElement('div');
                el.style.cssText = \`display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: \${bgColor}; border-left: 4px solid \${borderColor}; border-radius: 4px;\`;
                el.innerHTML = \`
                    <span style="font-size: 20px;">\${icon}</span>
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">\${escapeHTML(data.title || 'System Alert')}</div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 8px;">\${escapeHTML(data.message || '')}</div>
                        <div style="color: #6b7280; font-size: 0.8em;">Severity: \${escapeHTML(data.severity || 'INFO')} • \${d.toLocaleString()}</div>
                    </div>
                \`;
                alertsList.appendChild(el);
            });
        } catch(e) {
            console.error(e);
            alertsList.innerHTML = \`<div style="color: #ff758f;">Error loading alerts: \${escapeHTML(e.message)}</div>\`;
        }
    }

    loadAlerts();
}
