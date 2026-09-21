import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

const MODULE_ID = 'app_versions';
const MODULE_TITLE = 'App Versions';
const COLLECTION_NAME = 'app_versions';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">${MODULE_TITLE}</h2>
                <button onclick="window.openModal_${MODULE_ID}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="${MODULE_ID}-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;

    // Global functions
    window[`openModal_${MODULE_ID}`] = openModal;
    window[`edit_${MODULE_ID}`] = editItem;
    window[`delete_${MODULE_ID}`] = deleteItem;
    window[`save_${MODULE_ID}`] = saveItem;

    await loadItems();
}

function getStatusBadge(status) {
    status = (status || 'stable').toLowerCase();
    if (status === 'stable') return `<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Stable</span>`;
    if (status === 'beta') return `<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Beta</span>`;
    if (status === 'alpha') return `<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Alpha</span>`;
    if (status === 'deprecated') return `<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Deprecated</span>`;
    return `<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Unknown</span>`;
}

function getPlatformBadge(platform) {
    return `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${escapeHTML(platform || 'Web')}</span>`;
}

async function loadItems() {
    const grid = document.getElementById(`${MODULE_ID}-grid`);
    if (!grid) return;

    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2; padding: 40px; background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12);">No data found</div>`;
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: bold; color: #f4f7ff; font-size: 1.1em; margin-bottom: 4px;">${escapeHTML(data.appName || 'Unknown App')}</div>
                            <div style="color: #aeb8d2; font-size: 0.9em;">v${escapeHTML(data.version || '0.0.0')}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end;">
                            ${getStatusBadge(data.status)}
                            ${getPlatformBadge(data.platform)}
                        </div>
                    </div>
                    <div style="color: #aeb8d2; flex: 1; margin-bottom: 16px; font-size: 0.9em;">
                        <div style="margin-bottom: 4px;"><strong>Size:</strong> ${escapeHTML(data.fileSize || 'N/A')}</div>
                        <div style="margin-bottom: 4px;"><strong>Min OS:</strong> ${escapeHTML(data.minOsVersion || 'N/A')}</div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: auto;">
                        <button onclick="window.edit_${MODULE_ID}('${doc.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_${MODULE_ID}('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading items:', error);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ff758f; padding: 20px;">Error loading data: ${escapeHTML(error.message)}</div>`;
    }
}

async function openModal(id = null) {
    let data = { appName: '', version: '', platform: 'Web', downloadUrl: '', changelog: '', minOsVersion: '', fileSize: '', status: 'stable' };
    
    if (id) {
        try {
            const docRef = await getDoc(doc(db, COLLECTION_NAME, id));
            if (docRef.exists()) {
                data = { ...data, ...docRef.data() };
            }
        } catch (error) {
            alert('Error fetching details: ' + error.message);
            return;
        }
    }

    const modalContent = `
        <h3 style="color: #f4f7ff; margin-bottom: 20px;">${id ? 'Edit' : 'Add'} App Version</h3>
        <input type="hidden" id="${MODULE_ID}-id" value="${id || ''}">
        
        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 2;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">App Name *</label>
                <input type="text" id="${MODULE_ID}-appName" value="${escapeHTML(data.appName)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Version *</label>
                <input type="text" id="${MODULE_ID}-version" value="${escapeHTML(data.version)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
            </div>
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Platform</label>
                <select id="${MODULE_ID}-platform" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="Android" ${data.platform === 'Android' ? 'selected' : ''}>Android</option>
                    <option value="iOS" ${data.platform === 'iOS' ? 'selected' : ''}>iOS</option>
                    <option value="Windows" ${data.platform === 'Windows' ? 'selected' : ''}>Windows</option>
                    <option value="macOS" ${data.platform === 'macOS' ? 'selected' : ''}>macOS</option>
                    <option value="Linux" ${data.platform === 'Linux' ? 'selected' : ''}>Linux</option>
                    <option value="Web" ${data.platform === 'Web' ? 'selected' : ''}>Web</option>
                </select>
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                <select id="${MODULE_ID}-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="stable" ${data.status === 'stable' ? 'selected' : ''}>Stable</option>
                    <option value="beta" ${data.status === 'beta' ? 'selected' : ''}>Beta</option>
                    <option value="alpha" ${data.status === 'alpha' ? 'selected' : ''}>Alpha</option>
                    <option value="deprecated" ${data.status === 'deprecated' ? 'selected' : ''}>Deprecated</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Download URL</label>
            <input type="text" id="${MODULE_ID}-downloadUrl" value="${escapeHTML(data.downloadUrl || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Min OS Version</label>
                <input type="text" id="${MODULE_ID}-minOsVersion" value="${escapeHTML(data.minOsVersion || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">File Size</label>
                <input type="text" id="${MODULE_ID}-fileSize" value="${escapeHTML(data.fileSize || '')}" placeholder="e.g. 45 MB" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Changelog</label>
            <textarea id="${MODULE_ID}-changelog" rows="4" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">${escapeHTML(data.changelog || '')}</textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button onclick="hideModal()" style="background: transparent; border: 1px solid rgba(183,202,255,0.12); color: #aeb8d2; padding: 12px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button onclick="window.save_${MODULE_ID}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </div>
    `;
    
    showModal(modalContent);
}

async function saveItem() {
    const id = document.getElementById(`${MODULE_ID}-id`).value;
    const appName = document.getElementById(`${MODULE_ID}-appName`).value.trim();
    const version = document.getElementById(`${MODULE_ID}-version`).value.trim();
    const platform = document.getElementById(`${MODULE_ID}-platform`).value;
    const downloadUrl = document.getElementById(`${MODULE_ID}-downloadUrl`).value.trim();
    const changelog = document.getElementById(`${MODULE_ID}-changelog`).value.trim();
    const minOsVersion = document.getElementById(`${MODULE_ID}-minOsVersion`).value.trim();
    const fileSize = document.getElementById(`${MODULE_ID}-fileSize`).value.trim();
    const status = document.getElementById(`${MODULE_ID}-status`).value;

    if (!appName || !version) {
        alert('Please fill in all required fields (App Name, Version).');
        return;
    }

    const data = {
        appName,
        version,
        platform,
        downloadUrl,
        changelog,
        minOsVersion,
        fileSize,
        status,
        updatedAt: serverTimestamp()
    };

    try {
        if (id) {
            await updateDoc(doc(db, COLLECTION_NAME, id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, COLLECTION_NAME), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error saving data: ' + error.message);
    }
}

async function editItem(id) {
    await openModal(id);
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this app version?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            loadItems();
        } catch (error) {
            alert('Error deleting item: ' + error.message);
        }
    }
}
