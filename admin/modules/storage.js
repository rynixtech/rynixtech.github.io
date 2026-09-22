import { auth } from '../admin-firebase.js';
import { SystemUploader } from '../components/uploader.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px; color: #f4f7ff;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2>Storage Manager (B2)</h2>
                <div style="display: flex; gap: 10px;">
                    <button id="btn-refresh" class="btn btn-secondary" style="background: rgba(183,202,255,0.1); border: 1px solid rgba(183,202,255,0.2); color: #fff; padding: 8px 16px; border-radius: 4px; cursor: pointer;">↻ Refresh</button>
                    <button id="btn-upload" class="btn btn-primary" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">⬆ Upload File</button>
                    <input type="file" id="file-input" style="display: none;" multiple>
                </div>
            </div>

            <div id="stats-container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">Total Size</div>
                    <div id="stat-size" style="color: #64dfac; font-size: 1.8em; font-weight: bold;">--</div>
                </div>
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 5px;">Total Objects</div>
                    <div id="stat-count" style="color: #f4f7ff; font-size: 1.8em; font-weight: bold;">--</div>
                </div>
            </div>

            <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;">
                <div style="padding: 15px; border-bottom: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2);">
                    <div id="breadcrumb" style="display: flex; gap: 5px; font-size: 1.1em; align-items: center;">
                        <span class="nav-link" data-prefix="" style="color: #55dcff; cursor: pointer;">Root</span>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="search-input" placeholder="Search files..." style="padding: 6px 12px; border-radius: 4px; border: 1px solid rgba(183,202,255,0.2); background: rgba(0,0,0,0.3); color: #fff; outline: none;">
                        <button id="btn-bulk-delete" style="background: #ff4d4d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; display: none;">Delete Selected</button>
                    </div>
                </div>
                
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left;">
                        <thead style="background: rgba(183,202,255,0.05); color: #aeb8d2; font-size: 0.9em;">
                            <tr>
                                <th style="padding: 12px 15px; width: 40px;"><input type="checkbox" id="select-all"></th>
                                <th style="padding: 12px 15px;">Name</th>
                                <th style="padding: 12px 15px; width: 120px;">Size</th>
                                <th style="padding: 12px 15px; width: 150px;">Type</th>
                                <th style="padding: 12px 15px; width: 180px;">Uploaded</th>
                                <th style="padding: 12px 15px; width: 120px; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="file-list">
                            <tr><td colspan="6" style="text-align: center; padding: 30px; color: #aeb8d2;">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="pagination" style="padding: 15px; border-top: 1px solid rgba(183,202,255,0.12); display: flex; justify-content: center; gap: 10px; display: none;">
                    <button id="btn-load-more" style="background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.3); color: #55dcff; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Load More</button>
                </div>
            </div>
        </div>
    `;

    let currentPrefix = '';
    let currentCursor = null;
    let allObjects = [];
    let allFolders = [];
    let isSearch = false;

    const WORKER_URL = 'https://rynixtech-github-io.rynixtech.workers.dev';

    async function apiCall(endpoint, method = 'GET', body = null) {
        const token = await auth.currentUser.getIdToken();
        const options = {
            method,
            headers: { 'Authorization': `Bearer ${token}` }
        };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const res = await fetch(`${WORKER_URL}${endpoint}`, options);
        if (!res.ok) {
            let errStr = `HTTP ${res.status}`;
            try { const errObj = await res.json(); errStr = errObj.error || errStr; } catch(e){}
            throw new Error(errStr);
        }
        return res.json();
    }

    const formatBytes = (bytes) => {
        if(bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    async function loadStats() {
        try {
            const data = await apiCall('/api/admin/storage/stats');
            document.getElementById('stat-size').textContent = formatBytes(data.totalSize);
            document.getElementById('stat-count').textContent = data.totalObjects.toLocaleString();
        } catch (e) {
            console.error("Stats error", e);
        }
    }

    async function loadList(append = false) {
        if (!append) {
            document.getElementById('file-list').innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #aeb8d2;">Loading...</td></tr>`;
            currentCursor = null;
            allObjects = [];
            allFolders = [];
        }

        const searchQ = document.getElementById('search-input').value.trim();
        isSearch = !!searchQ;
        
        let url = `/api/admin/storage/list?limit=100`;
        if (isSearch) url += `&search=${encodeURIComponent(searchQ)}`;
        else if (currentPrefix) url += `&prefix=${encodeURIComponent(currentPrefix)}`;
        if (currentCursor) url += `&cursor=${encodeURIComponent(currentCursor)}`;

        try {
            const data = await apiCall(url);
            if (!append) {
                allObjects = data.objects || [];
                allFolders = data.folders || [];
            } else {
                allObjects = allObjects.concat(data.objects || []);
                allFolders = allFolders.concat(data.folders || []);
            }
            currentCursor = data.nextCursor;
            
            renderList();
            
            if (currentCursor) {
                document.getElementById('pagination').style.display = 'flex';
            } else {
                document.getElementById('pagination').style.display = 'none';
            }
        } catch (e) {
            document.getElementById('file-list').innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #ff4d4d;">Error loading files: ${e.message}</td></tr>`;
        }
    }

    function renderList() {
        updateBreadcrumbs();
        const tbody = document.getElementById('file-list');
        tbody.innerHTML = '';

        if (allFolders.length === 0 && allObjects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: #aeb8d2;">No files found.</td></tr>`;
            return;
        }

        allFolders.forEach(folder => {
            const name = folder.replace(currentPrefix, '').replace(/\/$/, '');
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(183,202,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 12px 15px;"></td>
                <td style="padding: 12px 15px; cursor: pointer; color: #55dcff; font-weight: 500;" class="folder-link" data-prefix="${folder}">
                    📁 ${name}
                </td>
                <td style="padding: 12px 15px; color: #aeb8d2;">--</td>
                <td style="padding: 12px 15px; color: #aeb8d2;">Folder</td>
                <td style="padding: 12px 15px; color: #aeb8d2;">--</td>
                <td style="padding: 12px 15px; text-align: right;"></td>
            `;
            tbody.appendChild(tr);
        });

        allObjects.forEach(obj => {
            let name = isSearch ? obj.key : obj.key.replace(currentPrefix, '');
            if (name === '' || name.endsWith('/')) return;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(183,202,255,0.05)';
            tr.innerHTML = `
                <td style="padding: 12px 15px;"><input type="checkbox" class="file-cb" data-key="${obj.key}"></td>
                <td style="padding: 12px 15px; word-break: break-all;">📄 ${name}</td>
                <td style="padding: 12px 15px; color: #aeb8d2;">${formatBytes(obj.size)}</td>
                <td style="padding: 12px 15px; color: #aeb8d2; font-size: 0.85em;">${obj.type}</td>
                <td style="padding: 12px 15px; color: #aeb8d2; font-size: 0.85em;">${new Date(obj.uploaded).toLocaleString()}</td>
                <td style="padding: 12px 15px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
                    <a href="${WORKER_URL}/api/admin/storage/download?path=${encodeURIComponent(obj.key)}" target="_blank" class="btn-action" style="color: #4ade80; text-decoration: none; cursor: pointer;" title="Download">⬇</a>
                    <span class="btn-action btn-del" data-key="${obj.key}" style="color: #ff4d4d; cursor: pointer;" title="Delete">🗑</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
        updateBulkDeleteBtn();
    }

    function updateBreadcrumbs() {
        const bc = document.getElementById('breadcrumb');
        bc.innerHTML = `<span class="nav-link" data-prefix="" style="color: #55dcff; cursor: pointer;">Root</span>`;
        if (!currentPrefix || isSearch) return;

        const parts = currentPrefix.split('/').filter(p => p);
        let path = '';
        parts.forEach((part, idx) => {
            path += part + '/';
            bc.innerHTML += ` <span style="color: #aeb8d2;">/</span> <span class="nav-link" data-prefix="${path}" style="color: #55dcff; cursor: pointer;">${part}</span>`;
        });
    }

    function updateBulkDeleteBtn() {
        const checked = document.querySelectorAll('.file-cb:checked').length;
        const btn = document.getElementById('btn-bulk-delete');
        btn.style.display = checked > 0 ? 'inline-block' : 'none';
        btn.textContent = `Delete Selected (${checked})`;
    }

    container.addEventListener('click', async (e) => {
        if (e.target.classList.contains('nav-link') || e.target.closest('.folder-link')) {
            const target = e.target.classList.contains('nav-link') ? e.target : e.target.closest('.folder-link');
            currentPrefix = target.dataset.prefix;
            document.getElementById('search-input').value = '';
            loadList();
        }

        if (e.target.classList.contains('btn-del')) {
            const key = e.target.dataset.key;
            if (confirm(`Are you sure you want to delete ${key}?`)) {
                try {
                    await apiCall('/api/storage/delete', 'POST', { path: key });
                    loadList();
                    loadStats();
                } catch (err) {
                    alert('Delete failed: ' + err.message);
                }
            }
        }

        if (e.target.id === 'select-all') {
            const cbs = document.querySelectorAll('.file-cb');
            cbs.forEach(cb => cb.checked = e.target.checked);
            updateBulkDeleteBtn();
        }

        if (e.target.classList.contains('file-cb')) {
            updateBulkDeleteBtn();
        }
    });

    document.getElementById('btn-bulk-delete').addEventListener('click', async () => {
        const keys = Array.from(document.querySelectorAll('.file-cb:checked')).map(cb => cb.dataset.key);
        if (!keys.length) return;
        if (confirm(`Delete ${keys.length} selected files?`)) {
            try {
                await apiCall('/api/admin/storage/bulk-delete', 'POST', { paths: keys });
                document.getElementById('select-all').checked = false;
                loadList();
                loadStats();
            } catch (err) {
                alert('Bulk delete failed: ' + err.message);
            }
        }
    });

    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadList();
    });

    document.getElementById('btn-refresh').addEventListener('click', () => {
        loadStats();
        loadList();
    });

    document.getElementById('btn-load-more').addEventListener('click', () => {
        loadList(true);
    });

    document.getElementById('btn-upload').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        
        const category = currentPrefix ? currentPrefix.replace(/\/$/, '') : 'general';
        
        for (const file of files) {
            try {
                await SystemUploader.upload(file, category);
            } catch (err) {
                console.error("Upload failed", err);
            }
        }
        e.target.value = '';
        setTimeout(() => {
            loadList();
            loadStats();
        }, 1500);
    });

    loadStats();
    loadList();
}
