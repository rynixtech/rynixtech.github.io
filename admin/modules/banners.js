import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Banners</h2>
                <button onclick="window.openModal_banners()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="banners-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('banners-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = escapeHTML(data.title || 'No Title');
            const imageUrl = escapeHTML(data.imageUrl || '');
            const position = data.position || 'top';
            const sortOrder = data.sortOrder || 0;
            const active = data.active;
            
            const positionBadge = `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${position}</span>`;
            
            const activeBadge = active ? 
                '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Active</span>' : 
                '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    ${imageUrl ? `<img src="${imageUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; margin-bottom: 15px;" alt="Banner thumbnail" />` : '<div style="width: 100%; height: 120px; background: #0a0e1a; border-radius: 4px; margin-bottom: 15px; display: flex; align-items: center; justify-content: center; color: #aeb8d2;">No Image</div>'}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff;">${title}</h3>
                    </div>
                    <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
                        ${positionBadge} ${activeBadge} <span style="color: #aeb8d2; font-size: 0.85em;">Order: ${sortOrder}</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_banners('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_banners('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading banners:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_banners = () => {
    const content = `
        <form id="banners-form" onsubmit="window.save_banners(event)">
            <input type="hidden" id="banners-id">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Title</label>
                <input type="text" id="banners-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Image URL</label>
                <input type="url" id="banners-imageUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Link URL (Destination)</label>
                <input type="url" id="banners-linkUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Position</label>
                    <select id="banners-position" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="hero">Hero</option>
                        <option value="top">Top</option>
                        <option value="sidebar">Sidebar</option>
                        <option value="bottom">Bottom</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Sort Order</label>
                    <input type="number" id="banners-sortOrder" value="0" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Active</label>
                <select id="banners-active" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit Banner', content);
};

window.save_banners = async (e) => {
    e.preventDefault();
    const id = document.getElementById('banners-id').value;
    const data = {
        title: document.getElementById('banners-title').value,
        imageUrl: document.getElementById('banners-imageUrl').value,
        linkUrl: document.getElementById('banners-linkUrl').value,
        position: document.getElementById('banners-position').value,
        sortOrder: Number(document.getElementById('banners-sortOrder').value),
        active: document.getElementById('banners-active').value === 'true',
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'banners', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'banners'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_banners = async (id) => {
    try {
        const docRef = doc(db, 'banners', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_banners();
            document.getElementById('banners-id').value = id;
            document.getElementById('banners-title').value = data.title || '';
            document.getElementById('banners-imageUrl').value = data.imageUrl || '';
            document.getElementById('banners-linkUrl').value = data.linkUrl || '';
            document.getElementById('banners-position').value = data.position || 'top';
            document.getElementById('banners-sortOrder').value = data.sortOrder || 0;
            document.getElementById('banners-active').value = data.active ? 'true' : 'false';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_banners = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'banners', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
