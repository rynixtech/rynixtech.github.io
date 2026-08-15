export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>System Alerts</h2>
            <button class="btn btn-primary" style="background: #3b82f6;">Configure Notifications</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 20px;">
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Active Incidents</h3>
                
                <div style="margin-top: 15px;">
                    <div style="display: flex; align-items: flex-start; gap: 15px; padding: 15px; background: rgba(59,130,246,0.1); border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 12px;">
                        <span style="font-size: 20px;">ℹ️</span>
                        <div>
                            <div style="font-weight: bold; margin-bottom: 4px;">System Health Check Initialized</div>
                            <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 8px;">Monitoring systems are fully operational across all clusters.</div>
                            <div style="color: #6b7280; font-size: 0.8em;">Severity: INFO • Just now</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Notification Rules</h3>
                <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked /> Critical System Failures
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked /> Security/Auth Breaches
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" checked /> Auto-Repair Failures (Rollbacks)
                    </label>
                    <label style="display: flex; gap: 10px; align-items: center; color: #aeb8d2; font-size: 0.9em; cursor: pointer;">
                        <input type="checkbox" /> Auto-Repair Successes (Info)
                    </label>
                </div>
                <hr style="border-color: rgba(255,255,255,0.05); margin: 20px 0;">
                <p style="color: #aeb8d2; font-size: 0.85em;">Alerts are delivered securely via Cloudflare Worker integration. Frontend credentials are never exposed.</p>
            </div>
        </div>
    `;
}
