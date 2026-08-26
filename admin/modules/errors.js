import { db , escapeHTML} from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Error Tracking</h2>
            <div id="error-stats" class="stats">Loading...</div>
        </div>
        <div class="table-container" id="errors-container">
            <table id="errors-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Page URL</th>
                        <th>Count</th>
                        <th>Last Seen</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="errors-tbody"></tbody>
            </table>
        </div>
    `;

    const tbody = document.getElementById('errors-tbody');
    const containerDiv = document.getElementById('errors-container');
    
    window.retryErrors = () => {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #aeb8d2;">Loading errors...</td></tr>';
        loadErrors();
    };

    async function loadErrors() {
        try {
            const q = query(collection(db, 'errors'), orderBy('timestamp', 'desc'), limit(50));
            const snapshot = await getDocs(q);
            
            tbody.innerHTML = '';
            let openCount = 0;
            let totalCount = 0;
            
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No errors found</td></tr>';
                document.getElementById('error-stats').innerHTML = `<span class="badge">Total: 0</span> <span class="badge success">Open: 0</span>`;
                return;
            }

            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                totalCount++;
                if (data.status !== 'resolved') openCount++;
                
                let icon = '🔴';
                if (data.type === 'Promise Rejection') icon = '🟡';
                if (data.type === 'Firebase') icon = '🔵';
                if (data.type === 'Network') icon = '🟠';
                
                let dateStr = 'N/A';
                if (data.timestamp) {
                    try {
                        dateStr = new Date(data.timestamp.toDate ? data.timestamp.toDate() : data.timestamp).toLocaleString();
                    } catch(e) {}
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHTML(icon)} ${escapeHTML(data.type || data.system || 'Error')}</td>
                    <td>${(data.message || data.error || '').substring(0, 50)}...</td>
                    <td>${escapeHTML(data.pageUrl || data.component || 'N/A')}</td>
                    <td>${escapeHTML(data.count || 1)}</td>
                    <td>${escapeHTML(dateStr)}</td>
                    <td><span class="badge ${data.status === 'Resolved' ? 'success' : 'danger'}">${escapeHTML(data.status || 'Unresolved')}</span></td>
                    <td>
                        <button class="btn success toggle-status" data-id="${escapeHTML(docSnap.id)}" data-status="${escapeHTML(data.status || 'Unresolved')}">${data.status === 'Resolved' ? 'Reopen' : 'Resolve'}</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            document.getElementById('error-stats').innerHTML = `
                <span class="badge">Total: ${escapeHTML(totalCount)}</span>
                <span class="badge danger">Open: ${escapeHTML(openCount)}</span>
            `;
            
            document.querySelectorAll('.toggle-status').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const currentStatus = e.target.getAttribute('data-status');
                    const newStatus = currentStatus === 'Resolved' ? 'Unresolved' : 'Resolved';
                    await updateDoc(doc(db, 'errors', id), { status: newStatus });
                    loadErrors();
                });
            });
        } catch (error) {
            console.error('[Diagnostic] Firestore error for errors:', error.code, error.message);
            containerDiv.innerHTML = `
                <div style="color: #ff758f; padding: 20px; background: rgba(255,117,143,0.1); border-radius: 8px; border: 1px solid rgba(255,117,143,0.2); margin-top: 20px;">
                    <h3 style="margin-top: 0;">Error Loading Error Center</h3>
                    <p style="opacity: 0.9;">${escapeHTML(error.message || 'Permission denied or network error')}</p>
                    <button onclick="window.retryErrors()" style="background: #ff758f; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">Retry Connection</button>
                </div>
            `;
            document.getElementById('error-stats').innerHTML = `<span class="badge danger">Error</span>`;
        }
    }

    loadErrors();
}
