import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Coupons</h2>
                <button onclick="window.openModal_coupons()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="coupons-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('coupons-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const code = escapeHTML(data.code || '');
            const discountType = data.discountType || 'percentage';
            const discountValue = data.discountValue || 0;
            const maxUses = data.maxUses || 0;
            const usedCount = data.usedCount || 0;
            const expiresAt = escapeHTML(data.expiresAt || 'No Expiry');
            const active = data.active;
            
            const activeBadge = active ? 
                '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Active</span>' : 
                '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

            const discountText = discountType === 'percentage' ? `${discountValue}% OFF` : `$${discountValue} OFF`;

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff; font-family: monospace; letter-spacing: 1px;">${code}</h3>
                        <div>${activeBadge}</div>
                    </div>
                    <div style="color: #55dcff; font-size: 1.2em; font-weight: bold; margin-bottom: 10px;">
                        ${discountText}
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">
                        Usage: ${usedCount} / ${maxUses ? maxUses : 'Unlimited'}
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 15px;">
                        Expires: ${expiresAt}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_coupons('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_coupons('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading coupons:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_coupons = () => {
    const content = `
        <form id="coupons-form" onsubmit="window.save_coupons(event)">
            <input type="hidden" id="coupons-id">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Code (Uppercase)</label>
                <input type="text" id="coupons-code" required style="text-transform: uppercase; width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Discount Type</label>
                    <select id="coupons-discountType" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Discount Value</label>
                    <input type="number" step="0.01" id="coupons-discountValue" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Min Purchase</label>
                    <input type="number" step="0.01" id="coupons-minPurchase" value="0" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Max Uses (0 = unlimited)</label>
                    <input type="number" id="coupons-maxUses" value="0" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Used Count</label>
                    <input type="number" id="coupons-usedCount" readonly value="0" style="width: 100%; padding: 8px; background: rgba(10,14,26,0.5); border: 1px solid rgba(183,202,255,0.12); color: #aeb8d2; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Expires At</label>
                    <input type="date" id="coupons-expiresAt" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Active</label>
                <select id="coupons-active" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit Coupon', content);
};

window.save_coupons = async (e) => {
    e.preventDefault();
    const id = document.getElementById('coupons-id').value;
    const data = {
        code: document.getElementById('coupons-code').value.toUpperCase(),
        discountType: document.getElementById('coupons-discountType').value,
        discountValue: Number(document.getElementById('coupons-discountValue').value),
        minPurchase: Number(document.getElementById('coupons-minPurchase').value),
        maxUses: Number(document.getElementById('coupons-maxUses').value),
        usedCount: Number(document.getElementById('coupons-usedCount').value),
        expiresAt: document.getElementById('coupons-expiresAt').value,
        active: document.getElementById('coupons-active').value === 'true',
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'coupons', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'coupons'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_coupons = async (id) => {
    try {
        const docRef = doc(db, 'coupons', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_coupons();
            document.getElementById('coupons-id').value = id;
            document.getElementById('coupons-code').value = data.code || '';
            document.getElementById('coupons-discountType').value = data.discountType || 'percentage';
            document.getElementById('coupons-discountValue').value = data.discountValue || 0;
            document.getElementById('coupons-minPurchase').value = data.minPurchase || 0;
            document.getElementById('coupons-maxUses').value = data.maxUses || 0;
            document.getElementById('coupons-usedCount').value = data.usedCount || 0;
            document.getElementById('coupons-expiresAt').value = data.expiresAt || '';
            document.getElementById('coupons-active').value = data.active ? 'true' : 'false';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_coupons = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'coupons', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
