import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

const MODULE_ID = 'rollback';
const MODULE_TITLE = 'System Rollback';
const COLLECTION_NAME = 'restore_points';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff;">${MODULE_TITLE}</h2>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.emergencyRevert_${MODULE_ID}()" style="background: transparent; color: #ff758f; border: 1px solid #ff758f; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Emergency Revert</button>
                    <button onclick="window.openModal_${MODULE_ID}()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Create Restore Point</button>
                </div>
            </div>
            <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; color: #aeb8d2; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); background: rgba(10, 14, 26, 0.5);">
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Restore Point ID</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Created At</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Created By</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Target System</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Label</th>
                            <th style="padding: 12px 16px; font-weight: normal; color: #f4f7ff;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="${MODULE_ID}-tbody">
                        <tr><td colspan="6" style="padding: 40px; text-align: center;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Global functions
    window[`openModal_${MODULE_ID}`] = openModal;
    window[`delete_${MODULE_ID}`] = deleteItem;
    window[`save_${MODULE_ID}`] = saveItem;
    window[`restore_${MODULE_ID}`] = restoreItem;
    window[`emergencyRevert_${MODULE_ID}`] = () => alert('Emergency revert requires manual intervention. Contact system admin.');

    await loadItems();
}

function formatTimestamp(ts) {
    if (!ts) return '—';
    try {
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return date.toLocaleString();
    } catch (e) {
        return '—';
    }
}

async function loadItems() {
    const tbody = document.getElementById(`${MODULE_ID}-tbody`);
    if (!tbody) return;

    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="padding: 40px; text-align: center;">No restore points found</td></tr>`;
            return;
        }

        let html = '';
        let isFirst = true;
        snapshot.forEach(doc => {
            const data = doc.data();
            const timestamp = formatTimestamp(data.createdAt);
            const latestBadge = isFirst ? `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">Latest</span>` : '';
            isFirst = false;

            const isRestored = data.status === 'restored';
            const restoreBtnStyle = isRestored 
                ? `background: transparent; border: 1px solid rgba(174,184,210,0.5); color: #aeb8d2; padding: 4px 8px; border-radius: 4px; cursor: not-allowed; font-size: 0.9em;`
                : `background: transparent; border: 1px solid #3b82f6; color: #3b82f6; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.9em;`;
            
            html += `
                <tr style="border-bottom: 1px solid rgba(183,202,255,0.12);">
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 0.9em;">${escapeHTML(doc.id)}</td>
                    <td style="padding: 12px 16px; font-size: 0.9em;">${escapeHTML(timestamp)}</td>
                    <td style="padding: 12px 16px;">${escapeHTML(data.createdBy || 'Unknown')}</td>
                    <td style="padding: 12px 16px;">
                        <span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${escapeHTML(data.targetSystem || 'global')}</span>
                    </td>
                    <td style="padding: 12px 16px;">${escapeHTML(data.label || '—')}${latestBadge}</td>
                    <td style="padding: 12px 16px;">
                        <div style="display: flex; gap: 8px;">
                            <button ${isRestored ? 'disabled' : `onclick="window.restore_${MODULE_ID}('${doc.id}')"`} style="${restoreBtnStyle}">${isRestored ? 'Restored' : 'Restore'}</button>
                            <button onclick="window.delete_${MODULE_ID}('${doc.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.9em;">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (error) {
        console.error('Error loading items:', error);
        tbody.innerHTML = `<tr><td colspan="6" style="padding: 20px; text-align: center; color: #ff758f;">Error loading data: ${escapeHTML(error.message)}</td></tr>`;
    }
}

async function openModal() {
    const data = { label: '', targetSystem: 'global', snapshotData: '{\n  \n}', notes: '' };

    const modalContent = `
        <h3 style="color: #f4f7ff; margin-bottom: 20px;">Create Restore Point</h3>
        
        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Label *</label>
            <input type="text" id="${MODULE_ID}-label" placeholder="e.g. Pre-deployment backup" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;" required>
        </div>

        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Target System</label>
            <select id="${MODULE_ID}-targetSystem" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                <option value="global">Global</option>
                <option value="frontend">Frontend</option>
                <option value="backend">Backend</option>
                <option value="database">Database</option>
                <option value="worker">Worker</option>
            </select>
        </div>

        <div style="margin-bottom: 15px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Snapshot Data (JSON) *</label>
            <textarea id="${MODULE_ID}-snapshotData" rows="6" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px; font-family: monospace;" required>${escapeHTML(data.snapshotData)}</textarea>
        </div>

        <div style="margin-bottom: 20px;">
            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Notes</label>
            <textarea id="${MODULE_ID}-notes" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button onclick="hideModal()" style="background: transparent; border: 1px solid rgba(183,202,255,0.12); color: #aeb8d2; padding: 12px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
            <button onclick="window.save_${MODULE_ID}()" style="background: #3b82f6; color: white; border: none; padding: 12px 20px; border-radius: 4px; cursor: pointer; font-weight: bold;">Create Snapshot</button>
        </div>
    `;
    
    showModal(modalContent);
}

async function saveItem() {
    const label = document.getElementById(`${MODULE_ID}-label`).value.trim();
    const targetSystem = document.getElementById(`${MODULE_ID}-targetSystem`).value;
    const snapshotData = document.getElementById(`${MODULE_ID}-snapshotData`).value.trim();
    const notes = document.getElementById(`${MODULE_ID}-notes`).value.trim();

    if (!label || !snapshotData) {
        alert('Please fill in all required fields (Label, Snapshot Data).');
        return;
    }

    // Validate JSON
    try {
        JSON.parse(snapshotData);
    } catch (e) {
        alert('Snapshot Data must be valid JSON.');
        return;
    }

    const data = {
        label,
        targetSystem,
        snapshotData,
        notes,
        createdBy: 'Admin',
        status: 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, COLLECTION_NAME), data);
        hideModal();
        loadItems();
    } catch (error) {
        alert('Error creating restore point: ' + error.message);
    }
}

async function restoreItem(id) {
    if (confirm('Restore to this point? Current config will be overwritten.')) {
        try {
            await updateDoc(doc(db, COLLECTION_NAME, id), { 
                status: 'restored',
                restoredAt: serverTimestamp()
            });
            alert('Restore point activated. Changes may take a few minutes to propagate.');
            loadItems();
        } catch (error) {
            alert('Error activating restore point: ' + error.message);
        }
    }
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this restore point?')) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
            loadItems();
        } catch (error) {
            alert('Error deleting restore point: ' + error.message);
        }
    }
}
