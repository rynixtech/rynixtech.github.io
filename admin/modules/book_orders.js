import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">Book Orders</h2>
                <button onclick="window.openModal_book_orders()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="book_orders-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('book_orders-grid');
    try {
        const q = query(collection(db, 'book_orders'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            
            let statusBadge = '';
            if (data.status === 'pending') statusBadge = '<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Pending</span>';
            else if (data.status === 'confirmed') statusBadge = '<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Confirmed</span>';
            else if (data.status === 'shipped') statusBadge = '<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Shipped</span>';
            else if (data.status === 'delivered') statusBadge = '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Delivered</span>';
            else if (data.status === 'cancelled') statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Cancelled</span>';
            else statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Unknown</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #aeb8d2; font-size: 0.85em;">${escapeHTML(data.orderId || doc.id)}</span>
                        ${statusBadge}
                    </div>
                    <h3 style="margin-top: 0; color: #f4f7ff;">${escapeHTML(data.bookTitle || 'Unknown Book')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em;">Email: ${escapeHTML(data.userEmail || 'N/A')}</p>
                    <p style="color: #aeb8d2; font-size: 0.9em;">Amount: $${Number(data.amount || 0).toFixed(2)} | Qty: ${data.quantity || 1}</p>
                    
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_book_orders('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_book_orders('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading book orders:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_book_orders = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="book_orders-form" onsubmit="window.save_book_orders(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Book Title *</label>
                <input type="text" id="bo-bookTitle" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Quantity *</label>
                    <input type="number" id="bo-quantity" required min="1" value="1" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Amount *</label>
                    <input type="number" step="0.01" id="bo-amount" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">User Email</label>
                <input type="email" id="bo-userEmail" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">User ID</label>
                <input type="text" id="bo-userId" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="bo-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Shipping Address</label>
                <textarea id="bo-shippingAddress" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Notes</label>
                <textarea id="bo-notes" rows="2" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Order</button>
        </form>
    `;
    showModal('Add Order', formHtml);
};

window.edit_book_orders = async function(id) {
    try {
        const docRef = doc(db, 'book_orders', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_book_orders();
            document.querySelector('.modal-header h3').textContent = 'Edit Order';
            
            document.getElementById('bo-bookTitle').value = data.bookTitle || '';
            document.getElementById('bo-quantity').value = data.quantity || 1;
            document.getElementById('bo-amount').value = data.amount || 0;
            document.getElementById('bo-userEmail').value = data.userEmail || '';
            document.getElementById('bo-userId').value = data.userId || '';
            document.getElementById('bo-status').value = data.status || 'pending';
            document.getElementById('bo-shippingAddress').value = data.shippingAddress || '';
            document.getElementById('bo-notes').value = data.notes || '';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_book_orders = async function(event) {
    event.preventDefault();
    const data = {
        bookTitle: document.getElementById('bo-bookTitle').value,
        quantity: Number(document.getElementById('bo-quantity').value),
        amount: Number(document.getElementById('bo-amount').value),
        userEmail: document.getElementById('bo-userEmail').value,
        userId: document.getElementById('bo-userId').value,
        status: document.getElementById('bo-status').value,
        shippingAddress: document.getElementById('bo-shippingAddress').value,
        notes: document.getElementById('bo-notes').value,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'book_orders', currentEditingId), data);
        } else {
            data.orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'book_orders'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_book_orders = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'book_orders', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
