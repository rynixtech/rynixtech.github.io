import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

const MODULE_ID = 'release_notes';
const MODULE_TITLE = 'Release Notes';
const COLLECTION_NAME = 'release_notes';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">${MODULE_TITLE}</h2>
                <button onclick="window.openModal_${MODULE_ID}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="${MODULE_ID}-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
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

function getTypeBadge(type) {
    type = (type || 'patch').toLowerCase();
    if (type === 'major') return `<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Major</span>`;
    if (type === 'minor') return `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Minor</span>`;
    if (type === 'hotfix') return `<span style="background: rgba(251,191,36,0.1); color: #fbbf24; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Hotfix</span>`;
    return `<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Patch</span>`;
}

function getPublishedBadge(published) {
    if (published) return `<span style="background: rgba(74,222,128,0.1); color: #4ade80; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Published</span>`;
    return `<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">Draft</span>`;
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
            const changes = data.changes || '';
            const preview = changes.length > 120 ? changes.substring(0, 120) + '...' : changes;
            
            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div>
                            <div style="font-weight: bold; color: #f4f7ff; font-size: 1.1em; margin-bottom: 4px;">${escapeHTML(data.appName || 'Unknown App')} <span style="color: #55dcff; font-weight: normal;">v${escapeHTML(data.version || '0.0.0')}</span></div>
                            <div style="color: #aeb8d2; font-size: 0.9em;">Release Date: ${escapeHTML(data.releaseDate || 'Not set')}</div>
                        </div>
                        <div style="display: flex; gap: 8px; flex-direction: column; align-items: flex-end;">
                            ${getTypeBadge(data.type)}
                            ${getPublishedBadge(data.published)}
                        </div>
                    </div>
                    <div style="color: #aeb8d2; flex: 1; margin-bottom: 16px; font-size: 0.95em; white-space: pre-wrap; font-family: monospace; background: rgba(10, 14, 26, 0.5); padding: 8px; border-radius: 4px;">${escapeHTML(preview)}</div>
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
    let data = { appName: '', version: '', releaseDate: '', type: 'patch', changes: '', published: false };
    
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
        <h3 style="color: #f4f7ff; margin-bottom: 20px;">${id ? 'Edit' : 'Add'} Release Note</h3>
        <input type="hidden" id="${MODULE_ID}-id" value="${id || ''}">
        
        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 2;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">App Name *</label>
                <input type="text" id="${MODULE_ID}-appName" value="${escapeHTML(data.appName)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Version *</label>
                <input type="text" id="${MODULE_ID}-version" value="${escapeHTML(data.version)}" placeholder="e.g. 2.1.0" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
            </div>
        </div>

        <div style="margin-bottom: 15px; display: flex; gap: 15px;">
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Release Date</label>
                <input type="date" id="${MODULE_ID}-releaseDate" value="${escapeHTML(data.releaseDate || '')}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; color-scheme: dark;">
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Type</label>
                <select id="${MODULE_ID}-type" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="major" ${data.type === 'major' ? 'selected' : ''}>Major</option>
                    <option value="minor" ${data.type === 'minor' ? 'selected' : ''}>Minor</option>
                    <option value="patch" ${data.type === 'patch' ? 'selected' : ''}>Patch</option>
                    <option value="hotfix" ${data.type === 'hotfix' ? 'selected' : ''}>Hotfix</option>
                </select>
            </div>
            <div style="flex: 1;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Published</label>
                <select id="${MODULE_ID}-published" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="true" ${data.published ? 'selected' : ''}>Yes</option>
                    <option value="false" ${!data.published ? 'selected' : ''}>No</option>
                </select>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Changes (Changelog) *</label>
            <textarea id="${MODULE_ID}-changes" rows="6" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;" required>${escapeHTML(data.changes)}</textarea>
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
    const releaseDate = document.getElementById(`${MODULE_ID}-releaseDate`).value;
    const type = document.getElementById(`${MODULE_ID}-type`).value;
    const published = document.getElementById(`${MODULE_ID}-published`).value === 'true';
    const changes = document.getElementById(`${MODULE_ID}-changes`).value.trim();

    if (!appName || !version || !changes) {
        alert('Please fill in all required fields (App Name, Version, Changes).');
        return;
    }

    const data = {
        appName,
        version,
        releaseDate,
        type,
        published,
        changes,
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
    if (confirm('Are you sure you want to delete this release note?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            loadItems();
        } catch (error) {
            alert('Error deleting item: ' + error.message);
        }
    }
}
