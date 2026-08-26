import { auth } from '../admin-firebase.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Live Storage Metrics</h2>
                <button onclick="loadStorageStats()" id="refresh-storage-btn" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">↻ Refresh</button>
            </div>

            <div id="storage-container">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 40px; border-radius: 8px; text-align: center;">
                    <div style="color: #aeb8d2; font-size: 1.2em; margin-bottom: 16px;">Connecting to Backblaze B2...</div>
                    <div class="spinner" style="margin: 0 auto; width: 40px; height: 40px; border: 4px solid rgba(85,220,255,0.3); border-radius: 50%; border-top-color: #55dcff; animation: spin 1s ease-in-out infinite;"></div>
                </div>
            </div>
            
            <style>
            @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </div>
    `;
    
    window.loadStorageStats = async () => {
        const btn = document.getElementById('refresh-storage-btn');
        if (btn) btn.disabled = true;
        const containerNode = document.getElementById('storage-container');
        if (containerNode && containerNode.innerHTML.indexOf('spinner') === -1) {
             containerNode.innerHTML = '<div style="text-align: center; color: #aeb8d2; padding: 40px;">Refreshing live metrics...</div>';
        }
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");
            const token = await user.getIdToken();
            
            const res = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/admin/storage-stats', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            
            const data = await res.json();
            
            // Format bytes
            const formatBytes = (bytes) => {
                if(bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            };
            
            if (containerNode) {
                containerNode.innerHTML = `
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 30px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">💾</div>
                            <div style="color: #aeb8d2; font-size: 1.1em; margin-bottom: 8px;">Total Storage Used</div>
                            <div style="color: #64dfac; font-size: 2.5em; font-weight: bold;">${formatBytes(data.totalSize)}</div>
                        </div>
                        <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 30px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 3rem; margin-bottom: 10px;">📦</div>
                            <div style="color: #aeb8d2; font-size: 1.1em; margin-bottom: 8px;">Total Objects / Files</div>
                            <div style="color: #f4f7ff; font-size: 2.5em; font-weight: bold;">${data.totalObjects.toLocaleString()}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); padding: 15px; border-radius: 8px; color: #aeb8d2; font-size: 0.9em; text-align: center;">
                        This data is fetched live from your Backblaze B2 bucket via the Cloudflare Worker.
                    </div>
                `;
            }
        } catch (err) {
            console.error(err);
            if (containerNode) {
                containerNode.innerHTML = `
                    <div style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); padding: 30px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">⚠️</div>
                        <h3 style="color: #ff758f; margin-top: 0;">Error Loading Storage Stats</h3>
                        <p style="color: #aeb8d2;">${err.message}</p>
                    </div>
                `;
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    };
    
    // Auto load
    setTimeout(window.loadStorageStats, 100);
}
