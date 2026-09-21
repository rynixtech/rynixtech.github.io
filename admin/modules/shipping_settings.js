import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Shipping Settings</h2>
                <button onclick="window.openModal_shipping_settings()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="shipping_settings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    await loadItems();
}

async function loadItems() {
    const grid = document.getElementById('shipping_settings-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, 'shipping_settings'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>';
            return;
        }
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            
            const statusBadgeStyle = data.enabled ? 'background: rgba(74,222,128,0.1); color: #4ade80;' : 'background: rgba(255,117,143,0.1); color: #ff758f;';
            const rateStr = parseFloat(data.rate) === 0 ? 'Free' : \`$\${parseFloat(data.rate || 0).toFixed(2)}\`;
            const freeAboveStr = data.freeAbove ? \`Free > $\${parseFloat(data.freeAbove).toFixed(2)}\` : '';
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column; gap: 10px;';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: bold; color: #f4f7ff; font-size: 1.1em;">${escapeHTML(data.method || 'Unnamed Method')}</div>
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85em; ${statusBadgeStyle}">${data.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: baseline;">
                    <span style="color: #55dcff; font-size: 1.2em; font-weight: bold;">${escapeHTML(rateStr)}</span>
                    ${freeAboveStr ? \`<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">\${escapeHTML(freeAboveStr)}</span>\` : ''}
                </div>
                <div style="color: #aeb8d2; font-size: 0.85em; display: flex; flex-direction: column; gap: 4px; margin-top: 5px;">
                    <div><strong style="color: white;">ETA:</strong> ${escapeHTML(data.estimatedDays || 'N/A')}</div>
                    <div><strong style="color: white;">Regions:</strong> ${escapeHTML(data.regions || 'All')}</div>
                </div>
                <div style="margin-top: auto; display: flex; gap: 10px; padding-top: 15px;">
                    <button onclick="window.edit_shipping_settings('${id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button onclick="window.delete_shipping_settings('${id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 20px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

window.openModal_shipping_settings = (id = null, data = null) => {
    const isEdit = !!id;
    const title = isEdit ? 'Edit Shipping Method' : 'Add Shipping Method';
    const formHtml = `
        <form id="ss-form" onsubmit="window.save_shipping_settings(event, '${id || ''}')" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Method Name *</label>
                <input type="text" id="ss-method" value="${escapeHTML(data?.method || '')}" required placeholder="e.g. Standard Shipping" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Rate Cost ($) *</label>
                    <input type="number" step="0.01" min="0" id="ss-rate" value="${data?.rate !== undefined ? data.rate : ''}" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Free Above ($)</label>
                    <input type="number" step="0.01" min="0" id="ss-freeAbove" value="${data?.freeAbove !== undefined ? data.freeAbove : ''}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Estimated Days</label>
                <input type="text" id="ss-estimatedDays" value="${escapeHTML(data?.estimatedDays || '')}" placeholder="e.g. 3-5 business days" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Regions (Comma-separated)</label>
                <input type="text" id="ss-regions" value="${escapeHTML(data?.regions || '')}" placeholder="US, CA, UK or Worldwide" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Enabled?</label>
                <select id="ss-enabled" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true" ${data?.enabled !== false ? 'selected' : ''}>Yes</option>
                    <option value="false" ${data?.enabled === false ? 'selected' : ''}>No</option>
                </select>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">${isEdit ? 'Update' : 'Create'}</button>
        </form>
    `;
    showModal(title, formHtml);
};

window.save_shipping_settings = async (e, id) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
        const payload = {
            method: document.getElementById('ss-method').value,
            rate: parseFloat(document.getElementById('ss-rate').value) || 0,
            freeAbove: document.getElementById('ss-freeAbove').value ? parseFloat(document.getElementById('ss-freeAbove').value) : null,
            estimatedDays: document.getElementById('ss-estimatedDays').value,
            regions: document.getElementById('ss-regions').value,
            enabled: document.getElementById('ss-enabled').value === 'true',
            updatedAt: serverTimestamp()
        };
        
        if (id) {
            await updateDoc(doc(db, 'shipping_settings', id), payload);
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'shipping_settings'), payload);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.edit_shipping_settings = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'shipping_settings', id));
        if (docSnap.exists()) {
            window.openModal_shipping_settings(id, docSnap.data());
        }
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
};

window.delete_shipping_settings = async (id) => {
    if (confirm('Are you sure you want to delete this shipping method?')) {
        try {
            await deleteDoc(doc(db, 'shipping_settings', id));
            loadItems();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
};
