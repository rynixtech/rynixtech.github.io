export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Auto Repair Engine</h2>
            <div>
                <span style="background: #10b981; color: #000; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 0.85em;">● ENGINE ACTIVE</span>
            </div>
        </div>
        
        <div style="background: #0f1425; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3>Repair Policies</h3>
            <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 20px;">Configure which automated actions the system is allowed to take during a degraded state. Unsafe operations always require manual Admin approval.</p>
            
            <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">Retry Transient API Errors</div>
                        <div style="color: #aeb8d2; font-size: 0.85em;">Automatically retry failed Cloudflare Worker requests up to 3 times before escalating.</div>
                    </div>
                    <label class="toggle-switch" style="cursor:pointer; background: #4ade80; padding: 4px 12px; border-radius: 12px; color: #000; font-size: 0.8em; font-weight: bold;">ENABLED</label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">Frontend Cache Auto-Purge</div>
                        <div style="color: #aeb8d2; font-size: 0.85em;">Clear stale browser cache and force-reload modules if 'Invalid Token' SyntaxErrors are detected.</div>
                    </div>
                    <label class="toggle-switch" style="cursor:pointer; background: #4ade80; padding: 4px 12px; border-radius: 12px; color: #000; font-size: 0.8em; font-weight: bold;">ENABLED</label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">Auth Token Auto-Refresh</div>
                        <div style="color: #aeb8d2; font-size: 0.85em;">Proactively refresh Firebase ID tokens if 'Permission Denied' is received on valid routes.</div>
                    </div>
                    <label class="toggle-switch" style="cursor:pointer; background: #4ade80; padding: 4px 12px; border-radius: 12px; color: #000; font-size: 0.8em; font-weight: bold;">ENABLED</label>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 6px;">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">Automatic Rollback (Safe Configs)</div>
                        <div style="color: #aeb8d2; font-size: 0.85em;">Revert to the last known-good configuration if a new setting immediately triggers repeated 500 errors.</div>
                    </div>
                    <label class="toggle-switch" style="cursor:pointer; background: #4ade80; padding: 4px 12px; border-radius: 12px; color: #000; font-size: 0.8em; font-weight: bold;">ENABLED</label>
                </div>
            </div>
        </div>
        
        <div style="background: #1b1625; border: 1px solid #ff758f; padding: 20px; border-radius: 8px;">
            <h3 style="color: #ff758f;">Restricted / Manual Operations</h3>
            <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 15px;">The following actions are deemed UNSAFE for automated execution and will always trigger an Alert for manual Admin intervention.</p>
            <ul style="color: #ff758f; font-size: 0.9em; padding-left: 20px;">
                <li>Modifying Firestore Security Rules</li>
                <li>Deleting Production Collections or Documents</li>
                <li>Modifying the 4-Admin UID Authorization List</li>
                <li>Resetting Backblaze B2 Application Keys</li>
                <li>Bypassing Authentication Claims</li>
            </ul>
        </div>
    `;
}
