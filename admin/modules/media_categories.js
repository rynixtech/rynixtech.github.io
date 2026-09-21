import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">Media Categories</h2>
                <button onclick="window.openModal_media_categories()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="media_categories-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('media_categories-grid');
    try {
        const q = query(collection(db, 'media_categories'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            
            let icon = '📁';
            if (data.type === 'audio') icon = '🎵';
            else if (data.type === 'video') icon = '🎬';
            else if (data.type === 'image') icon = '🖼️';
            else if (data.type === 'document') icon = '📄';

            let activeBadge = data.active 
                ? '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Active</span>'
                : '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

            const desc = data.description ? data.description.substring(0, 100) + (data.description.length > 100 ? '...' : '') : '';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin-top: 0; margin-bottom: 0; color: #f4f7ff;">${icon} ${escapeHTML(data.name || 'Unnamed')}</h3>
                        ${activeBadge}
                    </div>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-top: 5px;">
                        <span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 2px 6px; border-radius: 4px;">${escapeHTML(data.type || 'N/A')}</span>
                    </p>
                    <p style="color: #aeb8d2; font-size: 0.9em;">${escapeHTML(desc)}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_media_categories('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_media_categories('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading media categories:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_media_categories = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="media_categories-form" onsubmit="window.save_media_categories(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name *</label>
                <input type="text" id="mc-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Type</label>
                <select id="mc-type" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                    <option value="document">Document</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Description</label>
                <textarea id="mc-description" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Sort Order</label>
                    <input type="number" id="mc-sortOrder" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Active</label>
                    <select id="mc-active" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </div>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Category</button>
        </form>
    `;
    showModal('Add Media Category', formHtml);
};

window.edit_media_categories = async function(id) {
    try {
        const docRef = doc(db, 'media_categories', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_media_categories();
            document.querySelector('.modal-header h3').textContent = 'Edit Media Category';
            
            document.getElementById('mc-name').value = data.name || '';
            document.getElementById('mc-type').value = data.type || 'audio';
            document.getElementById('mc-description').value = data.description || '';
            document.getElementById('mc-sortOrder').value = data.sortOrder || 0;
            document.getElementById('mc-active').value = data.active !== false ? 'true' : 'false';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_media_categories = async function(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('mc-name').value,
        type: document.getElementById('mc-type').value,
        description: document.getElementById('mc-description').value,
        sortOrder: Number(document.getElementById('mc-sortOrder').value) || 0,
        active: document.getElementById('mc-active').value === 'true',
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'media_categories', currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'media_categories'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_media_categories = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'media_categories', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
