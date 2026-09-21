import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">eBooks</h2>
                <button onclick="window.openModal_ebooks()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="ebooks-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('ebooks-grid');
    try {
        const q = query(collection(db, 'ebooks'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            
            let statusBadge = '';
            if (data.status === 'published') statusBadge = '<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Published</span>';
            else if (data.status === 'draft') statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Draft</span>';
            else if (data.status === 'archived') statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Archived</span>';
            else statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Unknown</span>';

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    ${data.coverUrl ? `<img src="${escapeHTML(data.coverUrl)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;">` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                        <h3 style="margin-top: 0; margin-bottom: 0; color: #f4f7ff;">${escapeHTML(data.title || 'Untitled')}</h3>
                        ${statusBadge}
                    </div>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-top: 5px;">by ${escapeHTML(data.author || 'Unknown')}</p>
                    <p style="color: #aeb8d2; font-size: 0.9em;">Price: $${Number(data.price || 0).toFixed(2)} | Pages: ${data.pageCount || 'N/A'}</p>
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_ebooks('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_ebooks('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading ebooks:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_ebooks = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="ebooks-form" onsubmit="window.save_ebooks(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Title *</label>
                <input type="text" id="eb-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Author *</label>
                <input type="text" id="eb-author" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Price *</label>
                    <input type="number" step="0.01" id="eb-price" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Page Count</label>
                    <input type="number" id="eb-pageCount" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">ISBN</label>
                    <input type="text" id="eb-isbn" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Language</label>
                    <input type="text" id="eb-language" value="English" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">File URL</label>
                <input type="text" id="eb-fileUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Cover Image URL</label>
                <input type="text" id="eb-coverUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="eb-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                </select>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Description</label>
                <textarea id="eb-description" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save eBook</button>
        </form>
    `;
    showModal('Add eBook', formHtml);
};

window.edit_ebooks = async function(id) {
    try {
        const docRef = doc(db, 'ebooks', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_ebooks();
            document.querySelector('.modal-header h3').textContent = 'Edit eBook';
            
            document.getElementById('eb-title').value = data.title || '';
            document.getElementById('eb-author').value = data.author || '';
            document.getElementById('eb-price').value = data.price || 0;
            document.getElementById('eb-pageCount').value = data.pageCount || '';
            document.getElementById('eb-isbn').value = data.isbn || '';
            document.getElementById('eb-language').value = data.language || 'English';
            document.getElementById('eb-fileUrl').value = data.fileUrl || '';
            document.getElementById('eb-coverUrl').value = data.coverUrl || '';
            document.getElementById('eb-status').value = data.status || 'draft';
            document.getElementById('eb-description').value = data.description || '';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_ebooks = async function(event) {
    event.preventDefault();
    const data = {
        title: document.getElementById('eb-title').value,
        author: document.getElementById('eb-author').value,
        price: Number(document.getElementById('eb-price').value),
        pageCount: Number(document.getElementById('eb-pageCount').value) || null,
        isbn: document.getElementById('eb-isbn').value,
        language: document.getElementById('eb-language').value,
        fileUrl: document.getElementById('eb-fileUrl').value,
        coverUrl: document.getElementById('eb-coverUrl').value,
        status: document.getElementById('eb-status').value,
        description: document.getElementById('eb-description').value,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'ebooks', currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'ebooks'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_ebooks = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'ebooks', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
