import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Payment Settings</h2>
                <button onclick="window.openModal_payment_settings()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="payment_settings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    await loadItems();
}

async function loadItems() {
    const grid = document.getElementById('payment_settings-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, 'payment_settings'), orderBy('createdAt', 'desc'), limit(50));
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
            const testModeHtml = data.testMode ? \`<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">TEST MODE</span>\` : '';
            
            let maskedApiKey = 'N/A';
            if (data.apiKey && data.apiKey.length > 4) {
                maskedApiKey = '••••' + data.apiKey.slice(-4);
            } else if (data.apiKey) {
                maskedApiKey = '••••';
            }
            
            const card = document.createElement('div');
            card.style.cssText = 'background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column; gap: 10px;';
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="font-weight: bold; color: #f4f7ff; text-transform: uppercase; font-size: 1.1em;">${escapeHTML(data.provider || 'unknown')}</div>
                    <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.85em; ${statusBadgeStyle}">${data.enabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    ${testModeHtml}
                    <span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Curr: ${escapeHTML(data.currency || 'USD')}</span>
                </div>
                <div style="color: #aeb8d2; font-size: 0.85em; font-family: monospace; background: rgba(183,202,255,0.05); padding: 8px; border-radius: 4px; margin-top: 5px;">
                    API Key: <span style="color: white;">${escapeHTML(maskedApiKey)}</span>
                </div>
                <div style="margin-top: auto; display: flex; gap: 10px; padding-top: 15px;">
                    <button onclick="window.edit_payment_settings('${id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button onclick="window.delete_payment_settings('${id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; color: #ff758f; text-align: center; padding: 20px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

window.openModal_payment_settings = (id = null, data = null) => {
    const isEdit = !!id;
    const title = isEdit ? 'Edit Provider' : 'Add Provider';
    const formHtml = `
        <form id="ps-form" onsubmit="window.save_payment_settings(event, '${id || ''}')" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Provider *</label>
                <select id="ps-provider" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="stripe" ${data?.provider === 'stripe' ? 'selected' : ''}>Stripe</option>
                    <option value="paypal" ${data?.provider === 'paypal' ? 'selected' : ''}>PayPal</option>
                    <option value="razorpay" ${data?.provider === 'razorpay' ? 'selected' : ''}>Razorpay</option>
                    <option value="manual" ${data?.provider === 'manual' ? 'selected' : ''}>Manual/Bank Transfer</option>
                    <option value="cod" ${data?.provider === 'cod' ? 'selected' : ''}>Cash on Delivery</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">API Key</label>
                <input type="text" id="ps-apiKey" value="${escapeHTML(data?.apiKey || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Secret Key</label>
                <input type="password" id="ps-secretKey" value="${escapeHTML(data?.secretKey || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Webhook URL</label>
                <input type="url" id="ps-webhookUrl" value="${escapeHTML(data?.webhookUrl || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div>
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Currency</label>
                    <input type="text" id="ps-currency" value="${escapeHTML(data?.currency || 'USD')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Test Mode?</label>
                    <select id="ps-testMode" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="true" ${data?.testMode !== false ? 'selected' : ''}>Yes</option>
                        <option value="false" ${data?.testMode === false ? 'selected' : ''}>No</option>
                    </select>
                </div>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Enabled?</label>
                <select id="ps-enabled" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true" ${data?.enabled !== false ? 'selected' : ''}>Yes</option>
                    <option value="false" ${data?.enabled === false ? 'selected' : ''}>No</option>
                </select>
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Notes</label>
                <textarea id="ps-notes" rows="2" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(data?.notes || '')}</textarea>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 10px;">${isEdit ? 'Update' : 'Create'}</button>
        </form>
    `;
    showModal(title, formHtml);
};

window.save_payment_settings = async (e, id) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;
    
    try {
        const payload = {
            provider: document.getElementById('ps-provider').value,
            apiKey: document.getElementById('ps-apiKey').value,
            secretKey: document.getElementById('ps-secretKey').value,
            webhookUrl: document.getElementById('ps-webhookUrl').value,
            currency: document.getElementById('ps-currency').value,
            testMode: document.getElementById('ps-testMode').value === 'true',
            enabled: document.getElementById('ps-enabled').value === 'true',
            notes: document.getElementById('ps-notes').value,
            updatedAt: serverTimestamp()
        };
        
        if (id) {
            await updateDoc(doc(db, 'payment_settings', id), payload);
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'payment_settings'), payload);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving: ' + error.message);
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

window.edit_payment_settings = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, 'payment_settings', id));
        if (docSnap.exists()) {
            window.openModal_payment_settings(id, docSnap.data());
        }
    } catch (error) {
        alert('Error loading data: ' + error.message);
    }
};

window.delete_payment_settings = async (id) => {
    if (confirm('Are you sure you want to delete this payment provider?')) {
        try {
            await deleteDoc(doc(db, 'payment_settings', id));
            loadItems();
        } catch (error) {
            alert('Error deleting: ' + error.message);
        }
    }
};
