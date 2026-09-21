import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Pages</h2>
                <button onclick="window.openModal_pages()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="pages-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('pages-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'pages'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const title = escapeHTML(data.title || 'No Title');
            const slug = escapeHTML(data.slug || '');
            const status = data.status || 'draft';
            const metaTitle = escapeHTML(data.metaTitle || 'No meta title');
            
            let statusBadge = '';
            if (status === 'published') statusBadge = '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Published</span>';
            else if (status === 'archived') statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Archived</span>';
            else statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Draft</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff;">${title}</h3>
                        <div>${statusBadge}</div>
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 10px; font-family: monospace;">/${slug}</div>
                    <div style="color: #aeb8d2; font-size: 0.85em; margin-bottom: 15px;">
                        <strong>Meta Title:</strong> ${metaTitle}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_pages('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_pages('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading pages:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_pages = () => {
    const content = `
        <form id="pages-form" onsubmit="window.save_pages(event)">
            <input type="hidden" id="pages-id">
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Title</label>
                    <input type="text" id="pages-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Slug</label>
                    <input type="text" id="pages-slug" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Content</label>
                <textarea id="pages-content" rows="8" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="pages-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Meta Title</label>
                <input type="text" id="pages-metaTitle" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Meta Description</label>
                <textarea id="pages-metaDescription" rows="2" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit Page', content);
};

window.save_pages = async (e) => {
    e.preventDefault();
    const id = document.getElementById('pages-id').value;
    const data = {
        title: document.getElementById('pages-title').value,
        slug: document.getElementById('pages-slug').value,
        content: document.getElementById('pages-content').value,
        status: document.getElementById('pages-status').value,
        metaTitle: document.getElementById('pages-metaTitle').value,
        metaDescription: document.getElementById('pages-metaDescription').value,
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'pages', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'pages'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_pages = async (id) => {
    try {
        const docRef = doc(db, 'pages', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_pages();
            document.getElementById('pages-id').value = id;
            document.getElementById('pages-title').value = data.title || '';
            document.getElementById('pages-slug').value = data.slug || '';
            document.getElementById('pages-content').value = data.content || '';
            document.getElementById('pages-status').value = data.status || 'draft';
            document.getElementById('pages-metaTitle').value = data.metaTitle || '';
            document.getElementById('pages-metaDescription').value = data.metaDescription || '';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_pages = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'pages', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
