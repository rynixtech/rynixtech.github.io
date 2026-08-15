import { db, auth, deleteB2Object } from '../admin-firebase.js';
import { collection, query, where, orderBy, limit, startAfter, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="files-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>File Manager</h2>
                <button id="btn-upload" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Upload File</button>
            </div>
            
            <div class="controls-bar" style="display: flex; gap: 16px; margin-bottom: 20px; background: #0f1425; padding: 16px; border-radius: 8px;">
                <input type="text" id="file-search" placeholder="Search files..." style="flex: 1; padding: 8px; border: 1px solid rgba(183,202,255,0.12); background: #0a0e1a; color: #f4f7ff; border-radius: 4px;">
                <select id="file-filter" style="padding: 8px; border: 1px solid rgba(183,202,255,0.12); background: #0a0e1a; color: #f4f7ff; border-radius: 4px;">
                    <option value="all">All</option>
                    <option value="image/">Images</option>
                    <option value="video/">Videos</option>
                    <option value="application/pdf">Documents</option>
                    <option value="audio/">Audio</option>
                    <option value="application/vnd.android.package-archive">APKs</option>
                </select>
            </div>

            <div id="upload-zone" style="display: none; border: 2px dashed rgba(183,202,255,0.2); padding: 40px; text-align: center; border-radius: 8px; margin-bottom: 20px; background: #0f1425;">
                <input type="file" id="file-input" style="display: none;" multiple>
                <div style="margin-bottom: 16px;">Drag & Drop files here or</div>
                <button onclick="document.getElementById('file-input').click()" style="background: #0a0e1a; color: #f4f7ff; border: 1px solid #55dcff; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Browse Files</button>
                <div id="upload-progress" style="margin-top: 16px; color: #55dcff;"></div>
            </div>

            <div style="background: #0f1425; border-radius: 8px; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(183,202,255,0.12);">
                            <th style="padding: 12px 16px; color: #aeb8d2;">Name</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Type</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Size</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Uploaded</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="files-table-body">
                        <tr><td colspan="5" style="padding: 16px; text-align: center;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('btn-upload').addEventListener('click', () => {
        const zone = document.getElementById('upload-zone');
        zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('file-input').addEventListener('change', handleUpload);
    document.getElementById('file-filter').addEventListener('change', loadFiles);
    document.getElementById('file-search').addEventListener('input', loadFiles);

    loadFiles();
}

async function loadFiles() {
    const tbody = document.getElementById('files-table-body');
    const filter = document.getElementById('file-filter').value;
    const search = document.getElementById('file-search').value.toLowerCase();

    try {
        let q = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        let docs = snapshot.docs;
        if (filter !== 'all') {
            docs = docs.filter(d => d.data().contentType?.startsWith(filter));
        }
        if (search) {
            docs = docs.filter(d => d.data().name.toLowerCase().includes(search));
        }

        if (docs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center;">No files found</td></tr>';
            return;
        }

        tbody.innerHTML = docs.map(doc => {
            const data = doc.data();
            const size = formatSize(data.size);
            const date = new Date(data.uploadedAt?.toDate() || Date.now()).toLocaleDateString();
            return `
                <tr style="border-bottom: 1px solid rgba(183,202,255,0.05);">
                    <td style="padding: 12px 16px; display: flex; align-items: center; gap: 8px;">
                        📄 <span>${data.name}</span>
                    </td>
                    <td style="padding: 12px 16px;"><span style="padding: 2px 6px; background: rgba(85,220,255,0.1); border-radius: 4px; font-size: 0.85em;">${data.contentType || 'unknown'}</span></td>
                    <td style="padding: 12px 16px;">${size}</td>
                    <td style="padding: 12px 16px;">${date}</td>
                    <td style="padding: 12px 16px;">
                        <button onclick="navigator.clipboard.writeText('${data.url}'); alert('URL Copied!')" style="background: none; border: none; color: #55dcff; cursor: pointer;" title="Copy URL">📋</button>
                        <button onclick="deleteFile('${doc.id}', '${data.fullPath}')" style="background: none; border: none; color: #ff758f; cursor: pointer; margin-left: 8px;" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #ff758f;">Error loading files</td></tr>';
    }
}

async function handleUpload(e) {
    const files = e.target.files;
    const progressDiv = document.getElementById('upload-progress');
    const { SystemUploader } = await import('../components/uploader.js');
    
    for (let file of files) {
        try {
            await SystemUploader.upload(file, 'documents', { 
                maxSizeMB: 500,
                onSaveMetadata: async (result) => {
                    await addDoc(collection(db, 'files'), {
                        name: result.name,
                        size: result.size,
                        contentType: result.contentType,
                        url: result.url,
                        fullPath: result.fullPath,
                        storageProvider: 'b2',
                        visibility: 'private',
                        uploadedAt: serverTimestamp()
                    });
                    
                    await addDoc(collection(db, 'activityLog'), {
                        actionText: `Uploaded file ${result.name}`,
                        actionIcon: '📄',
                        timestamp: serverTimestamp()
                    });
                }
            });
        } catch (error) {
            console.error('Upload failed for', file.name, error);
        }
    }
    progressDiv.innerHTML = `All queued uploads processed.`;
    document.getElementById('file-input').value = '';
    loadFiles();
}

window.deleteFile = async (docId, fullPath) => {
    if(!confirm('Delete this file?')) return;
    try {
        if(fullPath) {
            await deleteB2Object(fullPath);
        }
        await deleteDoc(doc(db, 'files', docId));
        loadFiles();
        
        await addDoc(collection(db, 'activityLog'), {
            actionText: `Deleted a file`,
            actionIcon: '🗑️',
            timestamp: serverTimestamp()
        });
    } catch(e) {
        console.error(e);
        alert('Error deleting file');
    }
};

function formatSize(bytes) {
    if(bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
