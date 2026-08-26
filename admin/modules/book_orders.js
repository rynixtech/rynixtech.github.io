import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Book Orders</h2>
                <button onclick="window.openModal_book_orders()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
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
    if (!grid) return;
    try {
        const q = query(collection(db, 'book_orders'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found</div>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #f4f7ff;">${escapeHTML(data.title || data.name || 'Untitled')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 16px;">${escapeHTML(data.details || data.description || '')}</p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.edit_book_orders('${escapeHTML(doc.id)}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_book_orders('${escapeHTML(doc.id)}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading data (implement firestore rules)</div>';
    }
}

window.delete_book_orders = async (docId) => {
    if(!confirm('Delete this entry?')) return;
    try {
        await deleteDoc(doc(db, 'book_orders', docId));
        loadItems();
    } catch(e) {
        alert('Error deleting: ' + e.message);
    }
}

window.openModal_book_orders = (docId = '', title = '', details = '') => {
    const content = document.createElement('div');
    content.innerHTML = `
        <form id="book_orders-form" style="display: flex; flex-direction: column; gap: 16px;">
            <input type="hidden" id="book_orders-doc-id" value="${escapeHTML(docId)}">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name / Title</label>
                <input type="text" id="book_orders-title" required value="${escapeHTML(title)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Details</label>
                <textarea id="book_orders-details" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(details)}</textarea>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save</button>
        </form>
    `;

    content.querySelector('#book_orders-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = document.getElementById('book_orders-title').value;
        const d = document.getElementById('book_orders-details').value;
        const did = document.getElementById('book_orders-doc-id').value;
        
        const data = {
            title: t,
            details: d,
            updatedAt: serverTimestamp()
        };

        try {
            if(did) {
                await updateDoc(doc(db, 'book_orders', did), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'book_orders'), data);
            }
            hideModal();
            loadItems();
        } catch(err) {
            console.error(err);
            alert('Error saving: ' + err.message);
        }
    });

    showModal({
        title: docId ? 'Edit Entry' : 'Add Entry',
        content: content,
        size: 'md'
    });
}

window.edit_book_orders = async (docId) => {
    try {
        const docRef = doc(db, 'book_orders', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.openModal_book_orders(docId, data.title || data.name || '', data.details || data.description || '');
        } else {
            alert('Not found');
        }
    } catch(e) {
        console.error(e);
        alert('Error loading data');
    }
}
