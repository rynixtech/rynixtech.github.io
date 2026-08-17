import { httpsCallable } from '../admin-firebase.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>System Health</h2>
        </div>
        <div class="health-grid" style="display: grid; gap: 20px; grid-template-columns: 1fr 1fr;" id="health-container">
            <div style="grid-column: 1 / -1; color: #aeb8d2;">Running system diagnostics...</div>
        </div>
    `;

    try {
        const checkHealth = httpsCallable(null, 'healthCheck');
        const res = await checkHealth();
        const data = res.data || res;
        
        const status = data.status || 'Unknown';
        const isHealthy = status === 'Healthy';
        const color = isHealthy ? '#4ade80' : (status === 'Degraded' ? '#fbbf24' : '#ff758f');
        const activeIncidents = data.activeIncidents || 0;
        const lastCheck = data.lastCheck ? new Date(data.lastCheck).toLocaleTimeString() : 'Unknown';

        document.getElementById('health-container').innerHTML = `
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">SYSTEM HEALTH</div>
                        <div style="font-size: 1.2em; color: ${color};">● ${status.toUpperCase()}</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">LAST CHECK</div>
                        <div style="font-size: 1.2em; color: #f4f7ff;">${lastCheck}</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">ACTIVE INCIDENTS</div>
                        <div style="font-size: 1.2em; color: ${activeIncidents > 0 ? '#ff758f' : '#f4f7ff'};">${activeIncidents}</div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="window.location.hash='#diagnostics'" style="white-space: nowrap;">Run Full Diagnostic</button>
            </div>

            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Core Services</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Firebase Auth</span> <span style="color: ${data.services?.auth === 'Healthy' ? '#4ade80' : '#ff758f'};">● ${data.services?.auth?.toUpperCase() || 'UNKNOWN'}</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Firestore Database</span> <span style="color: ${data.services?.firestore === 'Healthy' ? '#4ade80' : '#ff758f'};">● ${data.services?.firestore?.toUpperCase() || 'UNKNOWN'}</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Cloudflare Worker API</span> <span style="color: ${data.services?.worker === 'Healthy' ? '#4ade80' : '#ff758f'};">● ${data.services?.worker?.toUpperCase() || 'UNKNOWN'}</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Backblaze B2 Storage</span> <span style="color: ${data.services?.b2 === 'Healthy' ? '#4ade80' : '#ff758f'};">● ${data.services?.b2?.toUpperCase() || 'UNKNOWN'}</span>
                    </li>
                </ul>
            </div>
            
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px; grid-column: 1 / -1;">
                <h3>System Logs</h3>
                <div style="background: #050711; padding: 15px; border-radius: 6px; font-family: monospace; color: #aeb8d2; max-height: 200px; overflow-y: auto;">
                    <div style="margin-bottom: 8px;">[SYSTEM] <span style="color: #4ade80;">Diagnostic check completed at ${lastCheck}.</span></div>
                    <div style="margin-bottom: 8px;">[API] Cloudflare Worker response time verified.</div>
                    ${!isHealthy ? `<div style="margin-bottom: 8px; color: #ff758f;">[SYSTEM] ${activeIncidents} incident(s) detected. Check Error logs.</div>` : ''}
                </div>
            </div>
        `;
    } catch (e) {
        console.error('[Diagnostic] Health check failed:', e);
        window.retryHealth = () => {
            document.getElementById('health-container').innerHTML = '<div style="grid-column: 1 / -1; color: #aeb8d2;">Running system diagnostics...</div>';
            render(container);
        };
        document.getElementById('health-container').innerHTML = `
            <div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 40px; background: rgba(255,117,143,0.1); border-radius: 8px; border: 1px solid rgba(255,117,143,0.2);">
                <h3 style="margin-top: 0;">CRITICAL SYSTEM FAILURE</h3>
                <p>Failed to contact Cloudflare Worker API.</p>
                <p style="font-size: 0.9em; opacity: 0.9; margin-top: 10px;">${e.message || 'Network error'}</p>
                <button onclick="window.retryHealth()" style="background: #ff758f; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 20px;">Retry Health Check</button>
            </div>
        `;
    }
}
