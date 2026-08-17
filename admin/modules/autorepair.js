import { httpsCallable } from '../admin-firebase.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Brain Control Center</h2>
            <div>
                <button id="toggle-brain" class="btn btn-primary" style="transition: background 0.3s;">Loading...</button>
            </div>
        </div>
        
        <div style="background: #0f1425; padding: 20px; border-radius: 8px; margin-bottom: 20px;" id="brain-status-container">
            <p style="color: #aeb8d2;">Fetching real Brain state...</p>
        </div>

        <div style="background: #1b1625; border: 1px solid #4ade80; padding: 20px; border-radius: 8px;" id="brain-events-container">
            <p style="color: #aeb8d2;">Loading Brain events...</p>
        </div>
    `;

    try {
        const getBrainState = httpsCallable(null, 'getBrainState');
        const res = await getBrainState();
        const data = res.data || res;
        const state = data.state || {};
        const events = data.events || [];
        
        const isPaused = state.isPaused === true;
        const toggleBtn = document.getElementById('toggle-brain');
        toggleBtn.innerText = isPaused ? "Resume Brain" : "Pause Brain";
        toggleBtn.style.background = isPaused ? "#4ade80" : "#ff758f";

        toggleBtn.onclick = async () => {
            toggleBtn.disabled = true;
            toggleBtn.innerText = "Processing...";
            const toggle = httpsCallable(null, 'toggleBrain');
            await toggle({ isPaused: !isPaused });
            render(container); // reload UI
        };

        const lastRun = state.lastRun ? new Date(state.lastRun).toLocaleString() : 'Never';
        const lastSuccess = state.lastSuccessfulRun ? new Date(state.lastSuccessfulRun).toLocaleString() : 'Never';

        document.getElementById('brain-status-container').innerHTML = `
            <h3>Real Brain Status: ${isPaused ? '<span style="color:#ff758f">PAUSED</span>' : '<span style="color:#4ade80">ACTIVE</span>'}</h3>
            <div style="display: grid; gap: 15px; margin-top: 15px;">
                <p><strong>Scheduler Status:</strong> <span style="color: ${state.schedulerStatus === 'Active' ? '#4ade80' : '#ff758f'}">${state.schedulerStatus || 'Unknown'}</span></p>
                <p><strong>Last Run:</strong> ${lastRun}</p>
                <p><strong>Last Successful Run:</strong> ${lastSuccess}</p>
                <p><strong>Heartbeat:</strong> ${state.heartbeat || 'None'}</p>
                <p><strong>Version:</strong> ${state.currentVersion || 'Unknown'}</p>
            </div>
        `;

        document.getElementById('brain-events-container').innerHTML = `
            <h3 style="color: #4ade80;">Recent Brain Events</h3>
            <ul style="color: #aeb8d2; font-size: 0.9em; padding-left: 20px;">
                ${events.map(e => `
                    <li style="margin-bottom: 10px;">
                        <strong>[${e.timestamp ? new Date(e.timestamp).toLocaleString() : 'Recent'}]</strong> 
                        ${e.type || e.status} - ${e.message || e.error || 'Check passed'}
                    </li>
                `).join('') || '<li>No events found.</li>'}
            </ul>
        `;

    } catch (e) {
        document.getElementById('brain-status-container').innerHTML = `<p style="color:#ff758f">Failed to load Brain state: ${e.message}</p>`;
        document.getElementById('brain-events-container').innerHTML = '';
        const toggleBtn = document.getElementById('toggle-brain');
        if(toggleBtn) toggleBtn.style.display = 'none';
    }
}
