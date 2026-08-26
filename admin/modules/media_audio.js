import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Media Audio</h2>
                <button onclick="window.openModal_media_audio()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
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
    if (!grid) return;
    try {
        const q = query(collection(db, 'media_audio'), orderBy('createdAt', 'desc'), limit(50));
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
                        <button onclick="window.edit_media_audio('${escapeHTML(doc.id)}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_media_audio('${escapeHTML(doc.id)}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading data (implement firestore rules)</div>';
    }
}

window.delete_media_audio = async (docId) => {
    if(!confirm('Delete this entry?')) return;
    try {
        await deleteDoc(doc(db, 'media_audio', docId));
        loadItems();
    } catch(e) {
        alert('Error deleting: ' + e.message);
    }
}

window.openModal_media_audio = (docId = '', title = '', details = '') => {
    const content = document.createElement('div');
    content.innerHTML = `
        <form id="media_audio-form" style="display: flex; flex-direction: column; gap: 16px;">
            <input type="hidden" id="media_audio-doc-id" value="${escapeHTML(docId)}">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name / Title</label>
                <input type="text" id="media_audio-title" required value="${escapeHTML(title)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Details</label>
                <textarea id="media_audio-details" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(details)}</textarea>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save</button>
        </form>
    `;

    content.querySelector('#media_audio-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = document.getElementById('media_audio-title').value;
        const d = document.getElementById('media_audio-details').value;
        const did = document.getElementById('media_audio-doc-id').value;
        
        const data = {
            title: t,
            details: d,
            updatedAt: serverTimestamp()
        };

        try {
            if(did) {
                await updateDoc(doc(db, 'media_audio', did), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'media_audio'), data);
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

window.edit_media_audio = async (docId) => {
    try {
        const docRef = doc(db, 'media_audio', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.openModal_media_audio(docId, data.title || data.name || '', data.details || data.description || '');
        } else {
            alert('Not found');
        }
    } catch(e) {
        console.error(e);
        alert('Error loading data');
    }
}
