import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Announcements</h2>
                <button onclick="window.openModal_announcements()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="announcements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('announcements-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = escapeHTML(data.title || 'No Title');
            const message = escapeHTML(data.message || '');
            const type = data.type || 'info';
            const active = data.active;
            const startDate = escapeHTML(data.startDate || '');
            const endDate = escapeHTML(data.endDate || '');
            
            let typeBadge = '';
            if (type === 'urgent') typeBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Urgent</span>';
            else if (type === 'success') typeBadge = '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Success</span>';
            else if (type === 'warning') typeBadge = '<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Warning</span>';
            else typeBadge = '<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Info</span>';
            
            const activeBadge = active ? 
                '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Active</span>' : 
                '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff;">${title}</h3>
                        <div>${typeBadge} ${activeBadge}</div>
                    </div>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 10px;">${message.length > 80 ? message.substring(0, 80) + '...' : message}</p>
                    <div style="color: #aeb8d2; font-size: 0.85em; margin-bottom: 15px;">
                        ${startDate ? \`Start: \${startDate}\` : ''} ${endDate ? \`| End: \${endDate}\` : ''}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_announcements('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_announcements('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading announcements:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_announcements = () => {
    const content = `
        <form id="announcements-form" onsubmit="window.save_announcements(event)">
            <input type="hidden" id="announcements-id">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Title</label>
                <input type="text" id="announcements-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Message</label>
                <textarea id="announcements-message" required rows="4" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Type</label>
                    <select id="announcements-type" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="success">Success</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Priority</label>
                    <select id="announcements-priority" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Active</label>
                <select id="announcements-active" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Start Date</label>
                    <input type="date" id="announcements-startDate" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">End Date</label>
                    <input type="date" id="announcements-endDate" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit Announcement', content);
};

window.save_announcements = async (e) => {
    e.preventDefault();
    const id = document.getElementById('announcements-id').value;
    const data = {
        title: document.getElementById('announcements-title').value,
        message: document.getElementById('announcements-message').value,
        type: document.getElementById('announcements-type').value,
        priority: document.getElementById('announcements-priority').value,
        active: document.getElementById('announcements-active').value === 'true',
        startDate: document.getElementById('announcements-startDate').value,
        endDate: document.getElementById('announcements-endDate').value,
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'announcements', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'announcements'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_announcements = async (id) => {
    try {
        const docRef = doc(db, 'announcements', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_announcements();
            document.getElementById('announcements-id').value = id;
            document.getElementById('announcements-title').value = data.title || '';
            document.getElementById('announcements-message').value = data.message || '';
            document.getElementById('announcements-type').value = data.type || 'info';
            document.getElementById('announcements-priority').value = data.priority || 'normal';
            document.getElementById('announcements-active').value = data.active ? 'true' : 'false';
            document.getElementById('announcements-startDate').value = data.startDate || '';
            document.getElementById('announcements-endDate').value = data.endDate || '';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_announcements = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'announcements', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
