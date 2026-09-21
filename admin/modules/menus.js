import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Menus</h2>
                <button onclick="window.openModal_menus()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="menus-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('menus-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'menus'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const label = escapeHTML(data.label || 'No Label');
            const url = escapeHTML(data.url || '#');
            const position = data.position || 'header';
            const icon = escapeHTML(data.icon || '🔗');
            const sortOrder = data.sortOrder || 0;
            const active = data.active;
            
            const positionBadge = `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${position}</span>`;
            
            const activeBadge = active ? 
                '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Active</span>' : 
                '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Inactive</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff;">
                            <span style="margin-right: 8px;">${icon}</span>${label}
                        </h3>
                        <div>${activeBadge}</div>
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 15px; word-break: break-all;">
                        <a href="${url}" target="_blank" style="color: #55dcff; text-decoration: none;">${url}</a>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                        ${positionBadge} <span style="color: #aeb8d2; font-size: 0.85em;">Order: ${sortOrder}</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_menus('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_menus('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading menus:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_menus = () => {
    const content = `
        <form id="menus-form" onsubmit="window.save_menus(event)">
            <input type="hidden" id="menus-id">
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Label</label>
                    <input type="text" id="menus-label" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">URL</label>
                    <input type="text" id="menus-url" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Position</label>
                    <select id="menus-position" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        <option value="header">Header</option>
                        <option value="sidebar">Sidebar</option>
                        <option value="footer">Footer</option>
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Parent Menu</label>
                    <input type="text" id="menus-parentMenu" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Icon</label>
                    <input type="text" id="menus-icon" value="🔗" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Sort Order</label>
                    <input type="number" id="menus-sortOrder" value="0" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Active</label>
                <select id="menus-active" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                </select>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit Menu', content);
};

window.save_menus = async (e) => {
    e.preventDefault();
    const id = document.getElementById('menus-id').value;
    const data = {
        label: document.getElementById('menus-label').value,
        url: document.getElementById('menus-url').value,
        position: document.getElementById('menus-position').value,
        parentMenu: document.getElementById('menus-parentMenu').value,
        icon: document.getElementById('menus-icon').value,
        sortOrder: Number(document.getElementById('menus-sortOrder').value),
        active: document.getElementById('menus-active').value === 'true',
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'menus', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'menus'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_menus = async (id) => {
    try {
        const docRef = doc(db, 'menus', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_menus();
            document.getElementById('menus-id').value = id;
            document.getElementById('menus-label').value = data.label || '';
            document.getElementById('menus-url').value = data.url || '';
            document.getElementById('menus-position').value = data.position || 'header';
            document.getElementById('menus-parentMenu').value = data.parentMenu || '';
            document.getElementById('menus-icon').value = data.icon || '🔗';
            document.getElementById('menus-sortOrder').value = data.sortOrder || 0;
            document.getElementById('menus-active').value = data.active ? 'true' : 'false';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_menus = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'menus', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
