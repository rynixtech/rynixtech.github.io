import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">Authors</h2>
                <button onclick="window.openModal_authors()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="authors-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('authors-grid');
    try {
        const q = query(collection(db, 'authors'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const bio = data.bio ? data.bio.substring(0, 100) + (data.bio.length > 100 ? '...' : '') : '';
            
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    ${data.imageUrl ? `<img src="${escapeHTML(data.imageUrl)}" style="width: 50px; height: 50px; border-radius: 25px; object-fit: cover; margin-bottom: 10px;">` : ''}
                    <h3 style="margin-top: 0; color: #f4f7ff;">${escapeHTML(data.name || 'Unnamed')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em;">${escapeHTML(bio)}</p>
                    ${data.email ? `<p style="color: #aeb8d2; font-size: 0.85em;">Email: ${escapeHTML(data.email)}</p>` : ''}
                    ${data.website ? `<p style="color: #aeb8d2; font-size: 0.85em;">Website: <a href="${escapeHTML(data.website)}" target="_blank" style="color: #55dcff;">Link</a></p>` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_authors('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_authors('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading authors:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_authors = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="authors-form" onsubmit="window.save_authors(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name *</label>
                <input type="text" id="authors-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Bio</label>
                <textarea id="authors-bio" rows="4" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Image URL</label>
                <input type="text" id="authors-imageUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Website URL</label>
                <input type="url" id="authors-website" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Email</label>
                <input type="email" id="authors-email" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Author</button>
        </form>
    `;
    showModal('Add Author', formHtml);
};

window.edit_authors = async function(id) {
    try {
        const docRef = doc(db, 'authors', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_authors();
            document.querySelector('.modal-header h3').textContent = 'Edit Author';
            
            document.getElementById('authors-name').value = data.name || '';
            document.getElementById('authors-bio').value = data.bio || '';
            document.getElementById('authors-imageUrl').value = data.imageUrl || '';
            document.getElementById('authors-website').value = data.website || '';
            document.getElementById('authors-email').value = data.email || '';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_authors = async function(event) {
    event.preventDefault();
    const data = {
        name: document.getElementById('authors-name').value,
        bio: document.getElementById('authors-bio').value,
        imageUrl: document.getElementById('authors-imageUrl').value,
        website: document.getElementById('authors-website').value,
        email: document.getElementById('authors-email').value,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'authors', currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'authors'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_authors = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'authors', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
