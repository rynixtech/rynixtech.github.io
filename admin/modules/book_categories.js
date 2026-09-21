import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">Book Categories</h2>
                <button onclick="window.openModal_book_categories()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="book_categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('book_categories-grid');
    try {
        const q = query(collection(db, 'book_categories'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const desc = data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') : '';
            
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <h3 style="margin-top: 0; color: #f4f7ff;">${escapeHTML(data.name || 'Unnamed')}</h3>
                    ${data.slug ? `<p style="color: #aeb8d2; font-size: 0.9em; font-family: monospace;">Slug: ${escapeHTML(data.slug)}</p>` : ''}
                    <p style="color: #aeb8d2; font-size: 0.9em;">${escapeHTML(desc)}</p>
                    ${data.sortOrder !== undefined ? `<p style="color: #aeb8d2; font-size: 0.85em;">Sort Order: ${data.sortOrder}</p>` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_book_categories('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_book_categories('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading book categories:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_book_categories = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="book_categories-form" onsubmit="window.save_book_categories(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name *</label>
                <input type="text" id="bc-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Slug</label>
                <input type="text" id="bc-slug" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Description</label>
                <textarea id="bc-description" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Parent Category</label>
                <input type="text" id="bc-parent" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Sort Order</label>
                <input type="number" id="bc-sortOrder" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Category</button>
        </form>
    `;
    showModal('Add Category', formHtml);
};

window.edit_book_categories = async function(id) {
    try {
        const docRef = doc(db, 'book_categories', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_book_categories();
            document.querySelector('.modal-header h3').textContent = 'Edit Category';
            
            document.getElementById('bc-name').value = data.name || '';
            document.getElementById('bc-slug').value = data.slug || '';
            document.getElementById('bc-description').value = data.description || '';
            document.getElementById('bc-parent').value = data.parentCategory || '';
            document.getElementById('bc-sortOrder').value = data.sortOrder || '';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_book_categories = async function(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('bc-name').value,
        slug: document.getElementById('bc-slug').value,
        description: document.getElementById('bc-description').value,
        parentCategory: document.getElementById('bc-parent').value,
        sortOrder: Number(document.getElementById('bc-sortOrder').value) || 0,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'book_categories', currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'book_categories'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_book_categories = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'book_categories', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
