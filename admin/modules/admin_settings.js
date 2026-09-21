import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentContainer;

export async function render(container) {
    currentContainer = container;
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Admin Settings</h2>
                <button onclick="window.openModal_admin_settings()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="admin_settings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    await loadItems();
}

async function loadItems() {
    const grid = document.getElementById('admin_settings-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, 'admin_settings'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const categoryBadgeStyle = 'background: rgba(174,184,210,0.1); color: #aeb8d2;';
            const displayValue = data.isSecret ? '••••••••' : escapeHTML(data.settingValue || '');
            const descPreview = data.description ? (data.description.length > 50 ? escapeHTML(data.description.substring(0, 50)) + '...' : escapeHTML(data.description)) : '';
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column; gap: 10px;';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: bold; font-family: monospace; color: #f4f7ff; font-size: 1.1em; word-break: break-all;">${escapeHTML(data.settingKey || 'unnamed_key')}</div>
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85em; ${categoryBadgeStyle}">${escapeHTML(data.category || 'general')}</span>
                </div>
                <div style="color: #4ade80; font-size: 0.9em; font-family: monospace; background: rgba(74,222,128,0.05); padding: 8px; border-radius: 4px; word-break: break-all;">${displayValue}</div>
                ${descPreview ? \`<div style="color: #aeb8d2; font-size: 0.85em; font-style: italic;">\${descPreview}</div>\` : ''}
                <div style="margin-top: auto; display: flex; gap: 10px; padding-top: 15px;">
                    <button onclick="window.edit_admin_settings('${id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button onclick="window.delete_admin_settings('${id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 20px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

window.openModal_admin_settings = (id = null, data = null) => {
    const isEdit = !!id;
    const title = isEdit ? 'Edit Setting' : 'Add Setting';
    const formHtml = `
        <form id="admin_settings-form" onsubmit="window.save_admin_settings(event, '${id || ''}')" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Setting Key *</label>
                <input type="text" id="as-settingKey" value="${escapeHTML(data?.settingKey || '')}" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Setting Value *</label>
                <input type="text" id="as-settingValue" value="${escapeHTML(data?.settingValue || '')}" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Category</label>
                <select id="as-category" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="general" ${data?.category === 'general' ? 'selected' : ''}>General</option>
                    <option value="security" ${data?.category === 'security' ? 'selected' : ''}>Security</option>
                    <option value="notifications" ${data?.category === 'notifications' ? 'selected' : ''}>Notifications</option>
                    <option value="appearance" ${data?.category === 'appearance' ? 'selected' : ''}>Appearance</option>
                    <option value="integrations" ${data?.category === 'integrations' ? 'selected' : ''}>Integrations</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Description</label>
                <textarea id="as-description" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(data?.description || '')}</textarea>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Is Secret?</label>
                <select id="as-isSecret" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="false" ${data?.isSecret === false ? 'selected' : ''}>No</option>
                    <option value="true" ${data?.isSecret === true ? 'selected' : ''}>Yes</option>
                </select>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">${isEdit ? 'Update' : 'Create'}</button>
        </form>
    `;
    showModal(title, formHtml);
};

window.save_admin_settings = async (e, id) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
        const payload = {
            settingKey: document.getElementById('as-settingKey').value,
            settingValue: document.getElementById('as-settingValue').value,
            category: document.getElementById('as-category').value,
            description: document.getElementById('as-description').value,
            isSecret: document.getElementById('as-isSecret').value === 'true',
            updatedAt: serverTimestamp()
        };
        
        if (id) {
            await updateDoc(doc(db, 'admin_settings', id), payload);
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'admin_settings'), payload);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.edit_admin_settings = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'admin_settings', id));
        if (docSnap.exists()) {
            window.openModal_admin_settings(id, docSnap.data());
        }
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
};

window.delete_admin_settings = async (id) => {
    if (confirm('Are you sure you want to delete this setting?')) {
        try {
            await deleteDoc(doc(db, 'admin_settings', id));
            loadItems();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
};
