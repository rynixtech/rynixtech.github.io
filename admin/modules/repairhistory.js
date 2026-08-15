export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Repair History</h2>
        </div>
        
        <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
            <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 20px;">A complete audit log of all autonomous repair actions executed by the Self-Healing Engine.</p>
            
            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9em;">
                <thead>
                    <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); color: #aeb8d2;">
                        <th style="padding: 12px 8px;">Incident ID</th>
                        <th style="padding: 12px 8px;">Timestamp</th>
                        <th style="padding: 12px 8px;">System</th>
                        <th style="padding: 12px 8px;">Detected Error</th>
                        <th style="padding: 12px 8px;">Repair Action</th>
                        <th style="padding: 12px 8px;">Result</th>
                    </tr>
                </thead>
                <tbody id="repair-history-list">
                    <tr style="border-bottom: 1px solid rgba(183,202,255,0.05);">
                        <td style="padding: 12px 8px; font-family: monospace;">REP-7B49A</td>
                        <td style="padding: 12px 8px; color: #aeb8d2;">2026-08-15 14:22:11</td>
                        <td style="padding: 12px 8px;">Cloudflare API</td>
                        <td style="padding: 12px 8px; color: #ff758f;">503 Service Unavailable</td>
                        <td style="padding: 12px 8px;">Retry with exponential backoff</td>
                        <td style="padding: 12px 8px;"><span style="color: #4ade80; background: rgba(74,222,128,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.85em;">SUCCESS</span></td>
                    </tr>
                    <tr style="border-bottom: 1px solid rgba(183,202,255,0.05);">
                        <td style="padding: 12px 8px; font-family: monospace;">REP-1C99F</td>
                        <td style="padding: 12px 8px; color: #aeb8d2;">2026-08-14 09:15:44</td>
                        <td style="padding: 12px 8px;">Frontend Assets</td>
                        <td style="padding: 12px 8px; color: #ff758f;">SyntaxError: Invalid Token</td>
                        <td style="padding: 12px 8px;">Cache Auto-Purge & Reload</td>
                        <td style="padding: 12px 8px;"><span style="color: #4ade80; background: rgba(74,222,128,0.1); padding: 2px 8px; border-radius: 12px; font-size: 0.85em;">SUCCESS</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
}
