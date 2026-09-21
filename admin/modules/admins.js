import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentContainer;

export async function render(container) {
    currentContainer = container;
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Admins</h2>
                <button onclick="window.openModal_admins()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="admins-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    await loadItems();
}

async function loadItems() {
    const grid = document.getElementById('admins-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, 'admins'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const roleBadgeStyle = data.role === 'owner' ? 'background: rgba(246,198,87,0.15); color: #f6c657;' :
                                   data.role === 'admin' ? 'background: rgba(85,220,255,0.1); color: #55dcff;' :
                                   data.role === 'editor' ? 'background: rgba(74,222,128,0.1); color: #4ade80;' :
                                   'background: rgba(174,184,210,0.1); color: #aeb8d2;';
                                   
            const statusBadgeStyle = data.status === 'active' ? 'background: rgba(74,222,128,0.1); color: #4ade80;' : 'background: rgba(255,117,143,0.1); color: #ff758f;';
            const shortUid = data.uid ? (data.uid.substring(0,8) + '...') : 'N/A';
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column; gap: 10px;';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: bold; color: #f4f7ff; font-size: 1.1em;">${escapeHTML(data.displayName || 'Unnamed')}</div>
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85em; ${statusBadgeStyle}">${escapeHTML(data.status || 'unknown')}</span>
                </div>
                <div style="color: #aeb8d2; font-size: 0.9em;">${escapeHTML(data.email || 'No email')}</div>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85em; ${roleBadgeStyle}">${escapeHTML(data.role || 'viewer')}</span>
                    <span style="font-family: monospace; color: #aeb8d2; font-size: 0.85em;" title="${escapeHTML(data.uid || '')}">UID: ${escapeHTML(shortUid)}</span>
                </div>
                <div style="margin-top: auto; display: flex; gap: 10px; padding-top: 15px;">
                    <button onclick="window.edit_admins('${id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button onclick="window.delete_admins('${id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 20px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

window.openModal_admins = (id = null, data = null) => {
    const isEdit = !!id;
    const title = isEdit ? 'Edit Admin' : 'Add Admin';
    const formHtml = `
        <form id="admins-form" onsubmit="window.save_admins(event, '${id || ''}')" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Display Name *</label>
                <input type="text" id="admin-displayName" value="${escapeHTML(data?.displayName || '')}" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Email *</label>
                <input type="email" id="admin-email" value="${escapeHTML(data?.email || '')}" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Role</label>
                <select id="admin-role" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="viewer" ${data?.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                    <option value="editor" ${data?.role === 'editor' ? 'selected' : ''}>Editor</option>
                    <option value="admin" ${data?.role === 'admin' ? 'selected' : ''}>Admin</option>
                    <option value="owner" ${data?.role === 'owner' ? 'selected' : ''}>Owner</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Firebase UID</label>
                <input type="text" id="admin-uid" value="${escapeHTML(data?.uid || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="admin-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="active" ${data?.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="suspended" ${data?.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Notes</label>
                <textarea id="admin-notes" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(data?.notes || '')}</textarea>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">${isEdit ? 'Update' : 'Create'}</button>
        </form>
    `;
    showModal(title, formHtml);
};

window.save_admins = async (e, id) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
        const payload = {
            displayName: document.getElementById('admin-displayName').value,
            email: document.getElementById('admin-email').value,
            role: document.getElementById('admin-role').value,
            uid: document.getElementById('admin-uid').value,
            status: document.getElementById('admin-status').value,
            notes: document.getElementById('admin-notes').value,
            updatedAt: serverTimestamp()
        };
        
        if (id) {
            await updateDoc(doc(db, 'admins', id), payload);
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'admins'), payload);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.edit_admins = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'admins', id));
        if (docSnap.exists()) {
            window.openModal_admins(id, docSnap.data());
        }
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
};

window.delete_admins = async (id) => {
    if (confirm('Are you sure you want to delete this admin?')) {
        try {
            await deleteDoc(doc(db, 'admins', id));
            loadItems();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
};
