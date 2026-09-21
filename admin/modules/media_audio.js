import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

let currentEditingId = null;

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">Media Audio</h2>
                <button onclick="window.openModal_media_audio()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Add New</button>
            </div>
            <div id="media_audio-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('media_audio-grid');
    try {
        const q = query(collection(db, 'media_audio'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    ${data.coverUrl ? `<img src="${escapeHTML(data.coverUrl)}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h3 style="margin-top: 0; margin-bottom: 5px; color: #f4f7ff;">${escapeHTML(data.title || 'Untitled')}</h3>
                        ${data.genre ? `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${escapeHTML(data.genre)}</span>` : ''}
                    </div>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-top: 5px;">Artist: ${escapeHTML(data.artist || 'Unknown')}</p>
                    ${data.album ? `<p style="color: #aeb8d2; font-size: 0.9em;">Album: ${escapeHTML(data.album)}</p>` : ''}
                    ${data.duration ? `<p style="color: #aeb8d2; font-size: 0.9em;">Duration: ${escapeHTML(data.duration)}</p>` : ''}
                    <div style="display: flex; gap: 10px; margin-top: 15px;">
                        <button onclick="window.edit_media_audio('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_media_audio('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading media audio:", error);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data. Check console.</div>';
    }
}

window.openModal_media_audio = function() {
    currentEditingId = null;
    const formHtml = `
        <form id="media_audio-form" onsubmit="window.save_media_audio(event)">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Title *</label>
                <input type="text" id="ma-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Artist *</label>
                <input type="text" id="ma-artist" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Album</label>
                    <input type="text" id="ma-album" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Genre</label>
                    <input type="text" id="ma-genre" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Duration (e.g. 3:45)</label>
                    <input type="text" id="ma-duration" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">File URL</label>
                <input type="text" id="ma-fileUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Cover Image URL</label>
                <input type="text" id="ma-coverUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save Audio</button>
        </form>
    `;
    showModal('Add Audio', formHtml);
};

window.edit_media_audio = async function(id) {
    try {
        const docRef = doc(db, 'media_audio', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditingId = id;
            const data = docSnap.data();
            window.openModal_media_audio();
            document.querySelector('.modal-header h3').textContent = 'Edit Audio';
            
            document.getElementById('ma-title').value = data.title || '';
            document.getElementById('ma-artist').value = data.artist || '';
            document.getElementById('ma-album').value = data.album || '';
            document.getElementById('ma-genre').value = data.genre || '';
            document.getElementById('ma-duration').value = data.duration || '';
            document.getElementById('ma-fileUrl').value = data.fileUrl || '';
            document.getElementById('ma-coverUrl').value = data.coverUrl || '';
        }
    } catch (error) {
        console.error("Error fetching doc:", error);
        alert("Failed to load details");
    }
};

window.save_media_audio = async function(event) {
    event.preventDefault();
    const data = {
        title: document.getElementById('ma-title').value,
        artist: document.getElementById('ma-artist').value,
        album: document.getElementById('ma-album').value,
        genre: document.getElementById('ma-genre').value,
        duration: document.getElementById('ma-duration').value,
        fileUrl: document.getElementById('ma-fileUrl').value,
        coverUrl: document.getElementById('ma-coverUrl').value,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditingId) {
            await updateDoc(doc(db, 'media_audio', currentEditingId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'media_audio'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving doc:", error);
        alert("Failed to save data");
    }
};

window.delete_media_audio = async function(id) {
    if (confirm("Are you sure you want to delete this item?")) {
        try {
            await deleteDoc(doc(db, 'media_audio', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting doc:", error);
            alert("Failed to delete item");
        }
    }
};
