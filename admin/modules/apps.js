import { db, storage } from '../admin-firebase.js';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';

export async function render(container) {
    container.innerHTML = `
        <div class="apps-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Apps Manager</h2>
                <button onclick="document.getElementById('app-modal').style.display='block'" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Create New App</button>
            </div>

            <div id="apps-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading apps...</div>
            </div>

            <div id="app-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; padding: 20px; overflow-y: auto;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 24px; border-radius: 8px; max-width: 500px; margin: 40px auto; position: relative;">
                    <button onclick="document.getElementById('app-modal').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #aeb8d2; font-size: 20px; cursor: pointer;">×</button>
                    <h3>Add/Edit App</h3>
                    <form id="app-form" onsubmit="event.preventDefault(); saveApp();" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="app-id">
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">App Name</label>
                            <input type="text" id="app-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Version</label>
                            <input type="text" id="app-version" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Description</label>
                            <textarea id="app-desc" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Upload APK</label>
                            <input type="file" id="app-file" accept=".apk" style="width: 100%; color: white;">
                        </div>
                        <div>
                            <label style="display:flex; align-items:center; gap:8px; color:#aeb8d2;">
                                <input type="checkbox" id="app-active" checked> Active / Downloads Enabled
                            </label>
                        </div>
                        <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save App</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    window.saveApp = saveApp; // Expose for form submit
    loadApps();
}

async function loadApps() {
    const grid = document.getElementById('apps-grid');
    try {
        const q = query(collection(db, 'apps'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No apps found</div>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const statusColor = data.active ? '#64dfac' : '#aeb8d2';
            return `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                        <div style="font-size: 40px;">📱</div>
                        <div>
                            <h3 style="margin: 0 0 4px 0; color: #f4f7ff;">${data.name}</h3>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="background: rgba(183,202,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.8em; color: #aeb8d2;">v${data.version}</span>
                                <span style="color: ${statusColor}; font-size: 0.8em;">● ${data.active ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 16px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${data.description || 'No description provided.'}
                    </p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editApp('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="navigator.clipboard.writeText('${data.downloadUrl}'); alert('Copied!')" style="background: rgba(183,202,255,0.1); border: none; color: #fff; padding: 8px; border-radius: 4px; cursor: pointer;" title="Copy Link">📋</button>
                        <button onclick="deleteApp('${doc.id}', '${data.fullPath}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading apps</div>';
    }
}

window.deleteApp = async (id, fullPath) => {
    if(!confirm('Delete this app entirely?')) return;
    try {
        if(fullPath) await deleteObject(ref(storage, fullPath));
        await deleteDoc(doc(db, 'apps', id));
        loadApps();
    } catch(e) {
        alert('Error deleting');
    }
}

window.editApp = async (id) => {
    // Basic implementation for edit mode
    alert('Edit mode not fully wired in mockup, implement firestore read');
}

async function saveApp() {
    const id = document.getElementById('app-id').value;
    const name = document.getElementById('app-name').value;
    const version = document.getElementById('app-version').value;
    const desc = document.getElementById('app-desc').value;
    const active = document.getElementById('app-active').checked;
    const fileInput = document.getElementById('app-file');

    const appData = {
        name,
        version,
        description: desc,
        active,
        updatedAt: serverTimestamp()
    };

    try {
        if(fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const { SystemUploader } = await import('../components/uploader.js');
            await SystemUploader.upload(file, 'apks', { 
                maxSizeMB: 500,
                onSaveMetadata: async (result) => {
                    appData.downloadUrl = result.url;
                    appData.fullPath = result.fullPath;
                    
                    if(id) {
                        await updateDoc(doc(db, 'apps', id), appData);
                    } else {
                        appData.createdAt = serverTimestamp();
                        await addDoc(collection(db, 'apps'), appData);
                    }
                    
                    await addDoc(collection(db, 'activityLog'), {
                        actionText: `Uploaded APK ${result.name}`,
                        actionIcon: '📦',
                        timestamp: serverTimestamp()
                    });
                }
            });
        } else {
            if(id) {
                await updateDoc(doc(db, 'apps', id), appData);
            } else {
                appData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'apps'), appData);
            }
        }
        
        document.getElementById('app-modal').style.display = 'none';
        document.getElementById('app-form').reset();
        loadApps();
    } catch(e) {
        console.error(e);
        alert('Error saving app');
    }
}
