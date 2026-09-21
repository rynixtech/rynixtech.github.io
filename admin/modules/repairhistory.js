import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const MODULE_ID = 'repairhistory';
const MODULE_TITLE = 'Repair History';
const COLLECTION_NAME = 'brainEvents';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">${MODULE_TITLE}</h2>
            </div>
            <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; color: #aeb8d2; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); background: rgba(10, 14, 26, 0.5);">
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Incident ID</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Timestamp</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">System</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Detected Error</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Repair Action</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Result</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="${MODULE_ID}-tbody">
                        <tr><td colspan="7" style="padding: 40px; text-align: center;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Global functions
    window[`delete_${MODULE_ID}`] = deleteItem;

    await loadItems();
}

function getResultBadge(result) {
    const res = (result || '').toLowerCase();
    if (res === 'success') return `<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">SUCCESS</span>`;
    if (res === 'failed' || res === 'error') return `<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">FAILED</span>`;
    if (res === 'pending') return `<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">PENDING</span>`;
    return `<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${escapeHTML(result || '—')}</span>`;
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString();
    } catch (e) {
        return '—';
    }
}

async function loadItems() {
    const tbody = document.getElementById(`${MODULE_ID}-tbody`);
    if (!tbody) return;

    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 40px; text-align: center;">No repair events recorded</td></tr>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const incidentId = doc.id.substring(0, 8) + '...';
            const timestamp = formatTimestamp(data.createdAt);
            const system = data.system || data.source || '—';
            const error = data.error || data.message || '—';
            const action = data.action || data.repair || '—';
            const result = data.result || data.status || '—';
            
            html += `
                <tr style="border-bottom: 1px solid rgba(183,202,255,0.12);">
                    <td style="padding: 12px 16px; font-family: monospace;">${escapeHTML(incidentId)}</td>
                    <td style="padding: 12px 16px; font-size: 0.9em;">${escapeHTML(timestamp)}</td>
                    <td style="padding: 12px 16px;">${escapeHTML(system)}</td>
                    <td style="padding: 12px 16px; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHTML(error)}">${escapeHTML(error)}</td>
                    <td style="padding: 12px 16px;">${escapeHTML(action)}</td>
                    <td style="padding: 12px 16px;">${getResultBadge(result)}</td>
                    <td style="padding: 12px 16px;">
                        <button onclick="window.delete_${MODULE_ID}('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Delete</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading items:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 20px; text-align: center; color: #ff758f;">Error loading data: ${escapeHTML(error.message)}</td></tr>`;
    }
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this repair event log?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            loadItems();
        } catch (error) {
            alert('Error deleting event: ' + error.message);
        }
    }
}
