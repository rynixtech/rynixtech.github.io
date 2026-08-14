import { db, storage } from '../admin-firebase.js';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

export async function render(container) {
    container.innerHTML = `
        <div class="images-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Image Manager</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="file" id="image-upload" accept="image/*" multiple style="display: none;">
                    <button onclick="document.getElementById('image-upload').click()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Upload Image</button>
                </div>
            </div>

            <div id="image-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading images...</div>
            </div>
            
            <div id="image-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; justify-content: center; align-items: center;">
                <div style="position: relative; max-width: 90%; max-height: 90%;">
                    <button onclick="document.getElementById('image-modal').style.display='none'" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    <img id="modal-img" src="" style="max-width: 100%; max-height: 90vh; object-fit: contain;">
                </div>
            </div>
        </div>
    `;

    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    loadImages();
}

async function loadImages() {
    const grid = document.getElementById('image-grid');
    try {
        const q = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const images = snapshot.docs.filter(d => d.data().contentType?.startsWith('image/'));
        
        if (images.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No images found</div>';
            return;
        }

        grid.innerHTML = images.map(doc => {
            const data = doc.data();
            return `
                <div style="position: relative; aspect-ratio: 1; background: #0f1425; border-radius: 8px; overflow: hidden; group" class="image-card">
                    <img src="${data.url}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(10,14,26,0.8); padding: 8px; color: #f4f7ff; font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${data.name}
                    </div>
                    <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; background: rgba(10,14,26,0.8); padding: 4px; border-radius: 4px;">
                        <button onclick="previewImage('${data.url}')" style="background: none; border: none; color: #fff; cursor: pointer;" title="Preview">👁️</button>
                        <button onclick="navigator.clipboard.writeText('${data.url}')" style="background: none; border: none; color: #55dcff; cursor: pointer;" title="Copy URL">📋</button>
                        <button onclick="deleteImage('${doc.id}', '${data.fullPath}')" style="background: none; border: none; color: #ff758f; cursor: pointer;" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading images</div>';
    }
}

window.previewImage = (url) => {
    document.getElementById('modal-img').src = url;
    document.getElementById('image-modal').style.display = 'flex';
};

window.deleteImage = async (docId, fullPath) => {
    if(!confirm('Delete this image?')) return;
    try {
        if(fullPath) await deleteObject(ref(storage, fullPath));
        await deleteDoc(doc(db, 'files', docId));
        loadImages();
    } catch(e) {
        alert('Error deleting');
    }
};

async function handleImageUpload(e) {
    const files = e.target.files;
    for (let file of files) {
        // Basic compression logic placeholder (can implement canvas here)
        const storageRef = ref(storage, 'admin/images/' + Date.now() + '_' + file.name);
        const uploadTask = uploadBytesResumable(storageRef, file);
        
        await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', null, reject, async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                await addDoc(collection(db, 'files'), {
                    name: file.name,
                    size: file.size,
                    contentType: file.type,
                    url: url,
                    fullPath: uploadTask.snapshot.ref.fullPath,
                    uploadedAt: serverTimestamp()
                });
                resolve();
            });
        });
    }
    document.getElementById('image-upload').value = '';
    loadImages();
}
