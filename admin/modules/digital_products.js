import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Digital Products</h2>
                <button onclick="document.getElementById('digital_products-modal').style.display='block'" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>

            <div id="digital_products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>

            <div id="digital_products-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; padding: 20px; overflow-y: auto;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 24px; border-radius: 8px; max-width: 500px; margin: 40px auto; position: relative;">
                    <button onclick="document.getElementById('digital_products-modal').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #aeb8d2; font-size: 20px; cursor: pointer;">×</button>
                    <h3>Add/Edit Entry</h3>
                    <form id="digital_products-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="digital_products-doc-id">
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name / Title</label>
                            <input type="text" id="digital_products-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Details</label>
                            <textarea id="digital_products-details" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Upload File</label>
                            <input type="file" id="digital_products-file" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('digital_products-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveItem();
    });

    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('digital_products-grid');
    try {
        const q = query(collection(db, 'digital_products'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 40px;"><span style="font-size: 3rem; display: block; margin-bottom: 1rem;">📁</span><h3>Ready for Data</h3><p style="color: #aeb8d2;">Click "+ Add New" to get started.</p></div>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #f4f7ff;">${escapeHTML(data.title || 'Untitled')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 16px;">${escapeHTML(data.details || '')}</p>
                    ${data.fileUrl ? `<a href="${escapeHTML(data.fileUrl)}" target="_blank" style="display: block; margin-bottom: 16px; color: #55dcff; text-decoration: none;">View Attached File ↗</a>` : ''}
                    <div style="display: flex; gap: 8px;">
                        <button onclick="edit_digital_products('${escapeHTML(doc.id)}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="delete_digital_products('${escapeHTML(doc.id)}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading data (implement firestore rules)</div>';
    }
}

window.delete_digital_products = async (docId) => {
    if(!confirm('Delete this entry?')) return;
    try {
        const docSnap = await getDoc(doc(db, 'digital_products', docId));
        if (docSnap.exists() && docSnap.data().fullPath) {
            const { deleteB2Object } = await import('../admin-firebase.js');
            await deleteB2Object(docSnap.data().fullPath);
        }
        await deleteDoc(doc(db, 'digital_products', docId));
        loadItems();
    } catch(e) {
        alert('Error deleting: ' + e.message);
    }
}

window.edit_digital_products = async (docId) => {
    try {
        const docRef = doc(db, 'digital_products', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('digital_products-doc-id').value = docId;
            document.getElementById('digital_products-title').value = data.title || '';
            document.getElementById('digital_products-details').value = data.details || '';
            document.getElementById('digital_products-modal').style.display = 'block';
        } else {
            alert('Not found');
        }
    } catch(e) {
        console.error(e);
        alert('Error loading data');
    }
}

async function saveItem() {
    const docId = document.getElementById('digital_products-doc-id').value;
    const title = document.getElementById('digital_products-title').value;
    const details = document.getElementById('digital_products-details').value;
    const fileInput = document.getElementById('digital_products-file');

    const data = {
        title,
        details,
        updatedAt: serverTimestamp()
    };

    try {
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const { SystemUploader } = await import('../components/uploader.js');
            await SystemUploader.upload(file, 'digital-products', {
                maxSizeMB: 500,
                onSaveMetadata: async (result) => {
                    data.fileUrl = result.url;
                    data.fullPath = result.fullPath;
                    if(docId) {
                        await updateDoc(doc(db, 'digital_products', docId), data);
                    } else {
                        data.createdAt = serverTimestamp();
                        await addDoc(collection(db, 'digital_products'), data);
                    }
                }
            });
        } else {
            if(docId) {
                await updateDoc(doc(db, 'digital_products', docId), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'digital_products'), data);
            }
        }
        
        document.getElementById('digital_products-modal').style.display = 'none';
        document.getElementById('digital_products-form').reset();
        document.getElementById('digital_products-doc-id').value = '';
        loadItems();
    } catch(e) {
        console.error(e);
        alert('Error saving: ' + e.message);
    }
}
