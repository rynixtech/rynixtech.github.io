import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

const MODULE_ID = 'reviews';
const MODULE_TITLE = 'Reviews';
const COLLECTION_NAME = 'reviews';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">${MODULE_TITLE}</h2>
                <button onclick="window.openModal_${MODULE_ID}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="${MODULE_ID}-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;

    // Global functions
    window[`openModal_${MODULE_ID}`] = openModal;
    window[`edit_${MODULE_ID}`] = editItem;
    window[`delete_${MODULE_ID}`] = deleteItem;
    window[`save_${MODULE_ID}`] = saveItem;

    await loadItems();
}

function getStars(rating) {
    const num = parseInt(rating) || 0;
    const clamped = Math.max(1, Math.min(5, num));
    return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
}

function getStatusBadge(status) {
    status = (status || 'pending').toLowerCase();
    if (status === 'approved') return `<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Approved</span>`;
    if (status === 'rejected') return `<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Rejected</span>`;
    return `<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Pending</span>`;
}

async function loadItems() {
    const grid = document.getElementById(`${MODULE_ID}-grid`);
    if (!grid) return;

    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const comment = data.comment || '';
            const preview = comment.length > 100 ? comment.substring(0, 100) + '...' : comment;
            
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: bold; color: #f4f7ff; font-size: 1.1em; margin-bottom: 4px;">${escapeHTML(data.productName || 'Unknown Product')}</div>
                            <div style="color: #aeb8d2; font-size: 0.9em;">by ${escapeHTML(data.userName || 'Anonymous')}</div>
                        </div>
                        <div>${getStatusBadge(data.status)}</div>
                    </div>
                    <div style="color: #fbbf24; margin-bottom: 12px;">${getStars(data.rating)}</div>
                    <div style="color: #aeb8d2; flex: 1; margin-bottom: 16px; font-size: 0.95em;">
                        "${escapeHTML(preview)}"
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: auto;">
                        <button onclick="window.edit_${MODULE_ID}('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_${MODULE_ID}('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading items:', error);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ff758f; padding: 20px;">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

async function openModal(id = null) {
    let data = { productName: '', productId: '', userName: '', userId: '', rating: '5', comment: '', status: 'pending' };
    
    if (id) {
        try {
            const docRef = await getDoc(doc(db, COLLECTION_NAME, id));
            if (docRef.exists()) {
                data = { ...data, ...docRef.data() };
            }
        } catch (error) {
            alert('Error fetching details: ' + error.message);
            return;
        }
    }

    const modalContent = `
        <h3 style="color: #f4f7ff; margin-bottom: 20px;">${id ? 'Edit' : 'Add'} Review</h3>
        <input type="hidden" id="${MODULE_ID}-id" value="${id || ''}">
        
        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Product Name *</label>
            <input type="text" id="${MODULE_ID}-productName" value="${escapeHTML(data.productName)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
        </div>

        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Product ID</label>
            <input type="text" id="${MODULE_ID}-productId" value="${escapeHTML(data.productId || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">User Name</label>
                <input type="text" id="${MODULE_ID}-userName" value="${escapeHTML(data.userName || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">User ID</label>
                <input type="text" id="${MODULE_ID}-userId" value="${escapeHTML(data.userId || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Rating (1-5) *</label>
                <input type="number" id="${MODULE_ID}-rating" min="1" max="5" value="${escapeHTML(String(data.rating))}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="${MODULE_ID}-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="approved" ${data.status === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="rejected" ${data.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Comment *</label>
            <textarea id="${MODULE_ID}-comment" rows="4" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>${escapeHTML(data.comment)}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button onclick="hideModal()" style="background: transparent; border: 1px solid rgba(183,202,255,0.12); color: #aeb8d2; padding: 12px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button onclick="window.save_${MODULE_ID}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </div>
    `;
    
    showModal(modalContent);
}

async function saveItem() {
    const id = document.getElementById(`${MODULE_ID}-id`).value;
    const productName = document.getElementById(`${MODULE_ID}-productName`).value.trim();
    const productId = document.getElementById(`${MODULE_ID}-productId`).value.trim();
    const userName = document.getElementById(`${MODULE_ID}-userName`).value.trim();
    const userId = document.getElementById(`${MODULE_ID}-userId`).value.trim();
    const rating = parseInt(document.getElementById(`${MODULE_ID}-rating`).value);
    const comment = document.getElementById(`${MODULE_ID}-comment`).value.trim();
    const status = document.getElementById(`${MODULE_ID}-status`).value;

    if (!productName || !rating || !comment) {
        alert('Please fill in all required fields (Product Name, Rating, Comment).');
        return;
    }

    const data = {
        productName,
        productId,
        userName,
        userId,
        rating: isNaN(rating) ? 5 : rating,
        comment,
        status,
        updatedAt: serverTimestamp()
    };

    try {
        if (id) {
            await updateDoc(doc(db, COLLECTION_NAME, id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, COLLECTION_NAME), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving data: ' + error.message);
    }
}

async function editItem(id) {
    await openModal(id);
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this review?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            loadItems();
        } catch (error) {
            alert('Error deleting item: ' + error.message);
        }
    }
}
