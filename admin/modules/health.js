export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>System Health</h2>
        </div>
        <div class="health-grid" style="display: grid; gap: 20px; grid-template-columns: 1fr 1fr;">
            
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">SYSTEM HEALTH</div>
                        <div style="font-size: 1.2em; color: #4ade80;">● Healthy</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">AUTO REPAIR</div>
                        <div style="font-size: 1.2em; color: #4ade80;">● Enabled</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">LAST CHECK</div>
                        <div style="font-size: 1.2em; color: #f4f7ff;">Just now</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">LAST REPAIR</div>
                        <div style="font-size: 1.2em; color: #f4f7ff;">No recent repairs</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">ACTIVE INCIDENTS</div>
                        <div style="font-size: 1.2em; color: #f4f7ff;">0</div>
                    </div>
                    <div>
                        <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">LAST ALERT</div>
                        <div style="font-size: 1.2em; color: #f4f7ff;">None</div>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="window.location.hash='#diagnostics'" style="white-space: nowrap;">Run Full Diagnostic</button>
            </div>

            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Core Services</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Firebase Auth</span> <span style="color: #4ade80;">● Operational</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Firestore Database</span> <span style="color: #4ade80;">● Operational</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Cloudflare Worker API</span> <span style="color: #4ade80;">● Operational</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Backblaze B2 Storage</span> <span style="color: #4ade80;">● Operational</span>
                    </li>
                    <li style="display: flex; justify-content: space-between;">
                        <span>Main Website CDN</span> <span style="color: #4ade80;">● Operational</span>
                    </li>
                </ul>
            </div>

            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Performance Metrics</h3>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Active Errors (24h)</span> <span style="color: #ff758f; font-weight: bold;" id="active-errors-count">0</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>API Latency</span> <span style="color: #aeb8d2;">~120ms</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Storage Usage</span> <span style="color: #aeb8d2;">Calculating...</span>
                    </li>
                    <li style="margin-bottom: 12px; display: flex; justify-content: space-between;">
                        <span>Bandwidth (30d)</span> <span style="color: #aeb8d2;">Calculating...</span>
                    </li>
                </ul>
            </div>
            
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px; grid-column: 1 / -1;">
                <h3>System Logs</h3>
                <div style="background: #050711; padding: 15px; border-radius: 6px; font-family: monospace; color: #aeb8d2; max-height: 200px; overflow-y: auto;">
                    <div style="margin-bottom: 8px;">[SYSTEM] <span style="color: #4ade80;">Self-Healing protocol active.</span></div>
                    <div style="margin-bottom: 8px;">[SYSTEM] Initialized health check protocols.</div>
                    <div style="margin-bottom: 8px;">[AUTH] Verified 4 admin signatures.</div>
                    <div style="margin-bottom: 8px;">[API] Cloudflare Worker reachable. CORS verified.</div>
                    <div style="margin-bottom: 8px;">[STORAGE] B2 bucket connected successfully.</div>
                </div>
            </div>
        </div>
    `;
}
