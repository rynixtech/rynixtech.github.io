import { db } from '../admin-firebase.js';
import { collection, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Error Tracking</h2>
            <div id="error-stats" class="stats">Loading...</div>
        </div>
        <div class="table-container">
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
    
    async function loadErrors() {
        const q = query(collection(db, 'errors'), orderBy('lastSeen', 'desc'));
        const snapshot = await getDocs(q);
        
        tbody.innerHTML = '';
        let openCount = 0;
        let totalCount = 0;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            totalCount++;
            if (data.status !== 'resolved') openCount++;
            
            let icon = '🔴';
            if (data.type === 'Promise Rejection') icon = '🟡';
            if (data.type === 'Firebase') icon = '🔵';
            if (data.type === 'Network') icon = '🟠';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>\${icon} \${data.type || 'Error'}</td>
                <td>\${(data.message || '').substring(0, 50)}...</td>
                <td>\${data.pageUrl || 'N/A'}</td>
                <td>\${data.count || 1}</td>
                <td>\${data.lastSeen ? new Date(data.lastSeen.toDate()).toLocaleString() : 'N/A'}</td>
                <td><span class="badge \${data.status === 'resolved' ? 'success' : 'danger'}">\${data.status || 'open'}</span></td>
                <td>
                    \${data.status !== 'resolved' ? \`<button class="btn resolve-btn" data-id="\${docSnap.id}">Resolve</button>\` : ''}
                    <button class="btn danger delete-btn" data-id="\${docSnap.id}">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('error-stats').innerHTML = `
            <span class="badge">Total: \${totalCount}</span>
            <span class="badge danger">Open: \${openCount}</span>
        `;
        
        document.querySelectorAll('.resolve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                await updateDoc(doc(db, 'errors', id), { status: 'resolved', resolvedAt: new Date() });
                loadErrors();
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if (confirm('Delete this error log?')) {
                    const id = e.target.getAttribute('data-id');
                    await deleteDoc(doc(db, 'errors', id));
                    loadErrors();
                }
            });
        });
    }

    loadErrors();
}
