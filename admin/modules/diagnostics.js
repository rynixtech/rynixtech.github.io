export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>System Diagnostics</h2>
            <button class="btn btn-primary" id="btn-run-diagnostics">Run Full Diagnostic Scan</button>
        </div>
        
        <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
            <div id="diagnostics-terminal" style="background: #050711; padding: 20px; border-radius: 6px; font-family: monospace; color: #aeb8d2; min-height: 300px; max-height: 500px; overflow-y: auto;">
                <div>[SYSTEM] Ready for diagnostic scan.</div>
                <div style="color: #6b7280; font-size: 0.9em; margin-top: 10px;">Click "Run Full Diagnostic Scan" to begin checks across Cloudflare Worker, Firebase Auth, Firestore Security Rules, Backblaze B2 bindings, and Client Asset integrity.</div>
            </div>
        </div>
    `;

    const btn = document.getElementById('btn-run-diagnostics');
    const term = document.getElementById('diagnostics-terminal');

    if(btn) {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerText = "Scanning...";
            term.innerHTML = '<div>[SCAN] Initiating multi-system diagnostic...</div>';
            
            const log = (msg, color = '#aeb8d2') => {
                term.innerHTML += `<div style="margin-top: 8px; color: ${color};">${msg}</div>`;
                term.scrollTop = term.scrollHeight;
            };

            try {
                const { httpsCallable } = await import('../admin-firebase.js');
                const checkHealth = httpsCallable(null, 'healthCheck');
                const res = await checkHealth();
                const data = res.data || res;
                
                log(`[FIRESTORE] ${data.services?.firestore === 'Healthy' ? '✔ OK' : '✖ FAILED'}`, data.services?.firestore === 'Healthy' ? '#4ade80' : '#ff758f');
                log(`[WORKER] ${data.services?.worker === 'Healthy' ? '✔ OK' : '✖ FAILED'}`, data.services?.worker === 'Healthy' ? '#4ade80' : '#ff758f');
                log(`[STORAGE] ${data.services?.b2 === 'Healthy' ? '✔ OK' : '✖ FAILED'}`, data.services?.b2 === 'Healthy' ? '#4ade80' : '#ff758f');

                if(data.status === 'Healthy') {
                    log('[SYSTEM] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#6b7280');
                    log('[SYSTEM] ALL DIAGNOSTIC CHECKS PASSED.', '#4ade80');
                } else {
                    log('[SYSTEM] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '#6b7280');
                    log('[SYSTEM] SOME DIAGNOSTIC CHECKS FAILED.', '#ff758f');
                }
            } catch(e) {
                log(`[SYSTEM] DIAGNOSTIC ERROR: ${e.message}`, '#ff758f');
            }

            btn.disabled = false;
            btn.innerText = "Run Full Diagnostic Scan";
        });
    }
}
