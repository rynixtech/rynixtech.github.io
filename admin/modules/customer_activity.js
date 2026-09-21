import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Customer Activity</h2>
            </div>
            <div id="customer_activity-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    await loadItems();
}

async function loadItems() {
    const grid = document.getElementById('customer_activity-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, 'customer_activity'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'Unknown date';
            const descPreview = data.details ? (data.details.length > 50 ? escapeHTML(data.details.substring(0, 50)) + '...' : escapeHTML(data.details)) : '';
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column; gap: 10px;';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: bold; color: #f4f7ff; text-transform: uppercase; font-size: 1.1em;">${escapeHTML(data.action || 'unknown')}</div>
                    <span style="color: #aeb8d2; font-size: 0.8em;">${escapeHTML(dateStr)}</span>
                </div>
                <div style="color: #55dcff; font-size: 0.9em; margin-top: -5px;">${escapeHTML(data.userEmail || 'Anonymous')}</div>
                ${data.page ? \`<div style="color: #aeb8d2; font-size: 0.85em;">Page: <span style="color: white;">\${escapeHTML(data.page)}</span></div>\` : ''}
                ${data.ipAddress ? \`<div style="color: #aeb8d2; font-size: 0.85em; font-family: monospace;">IP: \${escapeHTML(data.ipAddress)}</div>\` : ''}
                ${descPreview ? \`<div style="color: #aeb8d2; font-size: 0.85em; font-style: italic; background: rgba(183,202,255,0.05); padding: 8px; border-radius: 4px;">\${descPreview}</div>\` : ''}
                <div style="margin-top: auto; display: flex; padding-top: 15px;">
                    <button onclick="window.delete_customer_activity('${id}')" style="width: 100%; background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete Log</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 20px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

window.delete_customer_activity = async (id) => {
    if (confirm('Are you sure you want to delete this activity log?')) {
        try {
            await deleteDoc(doc(db, 'customer_activity', id));
            loadItems();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
};
