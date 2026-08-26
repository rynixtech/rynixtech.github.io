import { auth } from '../admin-firebase.js';

const API_BASE = 'https://rynixtech-control-center-worker.rynixtech.workers.dev';

export async function render(container) {
    let currentPrefix = '';
    let currentCursor = null;
    let currentItems = { objects: [], folders: [] };
    let selectedItems = new Set();
    let searchQuery = '';
    let viewMode = 'list';
    
    container.innerHTML = `
        <div class="storage-manager" style="padding: 20px; color: #aeb8d2; font-family: sans-serif;">
            <style>
                .storage-manager input, .storage-manager button { font-family: inherit; }
                .storage-btn { background: rgba(85, 220, 255, 0.1); color: #55dcff; border: 1px solid rgba(85, 220, 255, 0.3); padding: 8px 16px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
                .storage-btn:hover:not(:disabled) { background: rgba(85, 220, 255, 0.2); }
                .storage-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .storage-btn.danger { color: #ff758f; border-color: rgba(255, 117, 143, 0.3); background: rgba(255, 117, 143, 0.1); }
                .storage-btn.danger:hover:not(:disabled) { background: rgba(255, 117, 143, 0.2); }
                .storage-input { background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: #f4f7ff; padding: 8px 12px; border-radius: 4px; outline: none; }
                .storage-input:focus { border-color: #55dcff; }
                
                .stat-card { background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 20px; border-radius: 8px; flex: 1; min-width: 200px; text-align: center; }
                .stat-card h3 { margin: 0 0 10px 0; color: #aeb8d2; font-size: 0.9em; font-weight: normal; }
                .stat-card .value { color: #f4f7ff; font-size: 1.8em; font-weight: bold; }
                
                .file-list { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .file-list th { text-align: left; padding: 12px; border-bottom: 1px solid rgba(183,202,255,0.12); color: #aeb8d2; font-weight: normal; }
                .file-list td { padding: 12px; border-bottom: 1px solid rgba(183,202,255,0.05); }
                .file-list tr:hover { background: rgba(183,202,255,0.02); }
                
                .file-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; margin-top: 20px; }
                .grid-item { background: #0f1425; border: 1px solid rgba(183,202,255,0.12); border-radius: 8px; padding: 15px; text-align: center; cursor: pointer; transition: all 0.2s; position: relative; }
                .grid-item:hover { border-color: rgba(85,220,255,0.5); }
                .grid-item.selected { border-color: #55dcff; background: rgba(85,220,255,0.05); }
                .grid-icon { font-size: 2.5em; margin-bottom: 10px; }
                .grid-name { font-size: 0.9em; color: #f4f7ff; word-break: break-all; margin-bottom: 5px; }
                .grid-meta { font-size: 0.8em; color: #aeb8d2; }
                .grid-checkbox { position: absolute; top: 10px; left: 10px; }

                .dropzone { border: 2px dashed rgba(85,220,255,0.3); border-radius: 8px; padding: 40px; text-align: center; background: #0f1425; margin-bottom: 20px; transition: all 0.2s; cursor: pointer; }
                .dropzone.dragover { border-color: #55dcff; background: rgba(85,220,255,0.05); }

                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.8); display: none; align-items: center; justify-content: center; z-index: 1000; }
                .modal-content { background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 30px; border-radius: 12px; width: 100%; max-width: 500px; }
                .modal-content h3 { margin-top: 0; color: #f4f7ff; }

                .breadcrumb { display: flex; gap: 8px; align-items: center; font-size: 1.1em; color: #f4f7ff; }
                .breadcrumb span { cursor: pointer; color: #55dcff; }
                .breadcrumb span:hover { text-decoration: underline; }
            </style>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #f4f7ff; margin: 0;">Storage Manager</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="storage-btn" id="btn-cleanup">🧹 Cleanup</button>
                    <button class="storage-btn" id="btn-refresh">↻ Refresh</button>
                </div>
            </div>

            <!-- Stats -->
            <div id="storage-stats" style="display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap;">
                <div class="stat-card"><h3>Loading stats...</h3></div>
            </div>

            <!-- Controls -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <div class="breadcrumb" id="breadcrumb-container"></div>
                
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" id="search-input" class="storage-input" placeholder="Search files...">
                    <button class="storage-btn" id="btn-view-toggle">Grid View</button>
                    <button class="storage-btn" id="btn-upload-click">Upload</button>
                    <input type="file" id="file-input-hidden" multiple style="display: none;">
                    <button class="storage-btn danger" id="btn-bulk-delete" style="display: none;">Delete Selected (0)</button>
                </div>
            </div>

            <!-- Upload Dropzone -->
            <div id="upload-dropzone" class="dropzone" style="display: none;">
                <div style="font-size: 2em; margin-bottom: 10px;">📤</div>
                <div>Drag & drop files here or click to browse</div>
                <div id="upload-progress" style="margin-top: 10px; color: #64dfac; display: none;">Uploading...</div>
            </div>

            <!-- File List/Grid Container -->
            <div id="files-container" style="min-height: 200px;">
                <div style="text-align: center; padding: 40px; color: #aeb8d2;">Loading files...</div>
            </div>

            <div style="text-align: center; margin-top: 20px;">
                <button class="storage-btn" id="btn-load-more" style="display: none;">Load More</button>
            </div>
        </div>

        <!-- Details Modal -->
        <div id="modal-details" class="modal-overlay">
            <div class="modal-content">
                <h3 id="modal-filename">File Details</h3>
                <div id="modal-fileinfo" style="margin-bottom: 20px; line-height: 1.6;"></div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="storage-btn" id="modal-btn-download">Download</button>
                    <button class="storage-btn" id="modal-btn-rename">Rename/Move</button>
                    <button class="storage-btn danger" id="modal-btn-delete">Delete</button>
                    <button class="storage-btn" id="modal-btn-close">Close</button>
                </div>
            </div>
        </div>

        <!-- Rename/Move Modal -->
        <div id="modal-rename" class="modal-overlay">
            <div class="modal-content">
                <h3>Rename / Move</h3>
                <p style="margin-bottom: 10px; color: #aeb8d2;">Enter new path/name:</p>
                <input type="text" id="rename-input" class="storage-input" style="width: 100%; box-sizing: border-box; margin-bottom: 20px;">
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button class="storage-btn" id="modal-rename-confirm">Confirm</button>
                    <button class="storage-btn" id="modal-rename-cancel">Cancel</button>
                </div>
            </div>
        </div>
    `;

    // --- UTILS ---
    const getToken = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        return await user.getIdToken();
    };

    const apiCall = async (endpoint, options = {}) => {
        const token = await getToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        if (options.body && typeof options.body === 'string' && !options.body.startsWith('FormData')) {
            headers['Content-Type'] = 'application/json';
        }
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...headers, ...(options.headers || {}) }
        });
        
        if (!res.ok) {
            let err = 'Unknown error';
            try {
                const data = await res.json();
                err = data.error || `HTTP ${res.status}`;
            } catch(e) { err = `HTTP ${res.status}`; }
            throw new Error(err);
        }
        
        if (endpoint.startsWith('/api/admin/storage/download')) {
            return res.blob();
        }
        
        return res.json();
    };

    const formatBytes = (bytes) => {
        if(bytes === 0 || !bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const getIcon = (filename, isFolder = false) => {
        if (isFolder) return '📁';
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️';
        if (['mp4','webm','mov'].includes(ext)) return '🎥';
        if (['pdf'].includes(ext)) return '📄';
        if (['zip','rar','tar','gz'].includes(ext)) return '🗜️';
        return '📄';
    };

    // --- DOM ELEMENTS ---
    const els = {
        stats: document.getElementById('storage-stats'),
        breadcrumb: document.getElementById('breadcrumb-container'),
        files: document.getElementById('files-container'),
        search: document.getElementById('search-input'),
        btnView: document.getElementById('btn-view-toggle'),
        btnUpload: document.getElementById('btn-upload-click'),
        fileInput: document.getElementById('file-input-hidden'),
        btnDeleteMany: document.getElementById('btn-bulk-delete'),
        btnRefresh: document.getElementById('btn-refresh'),
        btnLoadMore: document.getElementById('btn-load-more'),
        btnCleanup: document.getElementById('btn-cleanup'),
        dropzone: document.getElementById('upload-dropzone'),
        progress: document.getElementById('upload-progress'),
        
        modals: {
            details: document.getElementById('modal-details'),
            rename: document.getElementById('modal-rename')
        }
    };

    // --- STATE MANAGEMENT ---
    const updateBreadcrumbs = () => {
        if (!currentPrefix) {
            els.breadcrumb.innerHTML = `<span data-prefix="">Home</span>`;
        } else {
            const parts = currentPrefix.split('/').filter(Boolean);
            let html = `<span data-prefix="">Home</span>`;
            let accum = '';
            for (let i = 0; i < parts.length; i++) {
                accum += parts[i] + '/';
                html += ` &gt; <span data-prefix="${accum}">${parts[i]}</span>`;
            }
            els.breadcrumb.innerHTML = html;
        }
        
        els.breadcrumb.querySelectorAll('span').forEach(span => {
            span.onclick = () => {
                currentPrefix = span.getAttribute('data-prefix');
                currentCursor = null;
                searchQuery = '';
                els.search.value = '';
                loadFiles();
            };
        });
    };

    const updateSelection = () => {
        if (selectedItems.size > 0) {
            els.btnDeleteMany.style.display = 'inline-block';
            els.btnDeleteMany.textContent = `Delete Selected (${selectedItems.size})`;
        } else {
            els.btnDeleteMany.style.display = 'none';
        }
        
        document.querySelectorAll('.file-checkbox').forEach(cb => {
            cb.checked = selectedItems.has(cb.dataset.key);
        });
        document.querySelectorAll('.grid-item').forEach(item => {
            if (selectedItems.has(item.dataset.key)) item.classList.add('selected');
            else item.classList.remove('selected');
        });
    };

    // --- API CALLS ---
    const loadStats = async () => {
        try {
            const data = await apiCall('/api/admin/storage/stats');
            els.stats.innerHTML = `
                <div class="stat-card">
                    <h3>Total Size</h3>
                    <div class="value" style="color: #64dfac;">${formatBytes(data.totalSize)}</div>
                </div>
                <div class="stat-card">
                    <h3>Objects</h3>
                    <div class="value">${(data.totalObjects || 0).toLocaleString()}</div>
                </div>
                ${data.foldersCount !== undefined ? `
                <div class="stat-card">
                    <h3>Folders</h3>
                    <div class="value">${data.foldersCount.toLocaleString()}</div>
                </div>` : ''}
            `;
            if (data.usagePercent !== undefined) {
                 els.stats.innerHTML += `
                 <div class="stat-card">
                    <h3>Usage</h3>
                    <div class="value">${data.usagePercent}%</div>
                </div>`;
            }
        } catch(e) {
            els.stats.innerHTML = `<div class="stat-card"><h3 style="color: #ff758f;">Error loading stats: ${e.message}</h3></div>`;
        }
    };

    const loadFiles = async (append = false) => {
        if (!append) {
            currentItems = { objects: [], folders: [] };
            selectedItems.clear();
            updateSelection();
            els.files.innerHTML = '<div style="text-align: center; padding: 40px; color: #aeb8d2;">Loading...</div>';
            els.btnLoadMore.style.display = 'none';
        }

        updateBreadcrumbs();

        try {
            const url = new URL(`${API_BASE}/api/admin/storage/list`);
            if (currentPrefix) url.searchParams.set('prefix', currentPrefix);
            if (currentCursor) url.searchParams.set('cursor', currentCursor);
            if (searchQuery) url.searchParams.set('search', searchQuery);
            url.searchParams.set('limit', '50');

            const data = await apiCall(url.pathname + url.search);
            
            if (append) {
                currentItems.objects.push(...(data.objects || []));
                if (data.folders) {
                    const newFolders = data.folders.filter(f => !currentItems.folders.includes(f));
                    currentItems.folders.push(...newFolders);
                }
            } else {
                currentItems = { objects: data.objects || [], folders: data.folders || [] };
            }
            
            currentCursor = data.nextCursor || null;
            renderFiles();
            
            els.btnLoadMore.style.display = currentCursor ? 'inline-block' : 'none';
        } catch(e) {
            els.files.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff758f;">Error: ${e.message}</div>`;
        }
    };

    const renderFiles = () => {
        if (currentItems.objects.length === 0 && currentItems.folders.length === 0) {
            els.files.innerHTML = '<div style="text-align: center; padding: 40px; color: #aeb8d2;">No files found.</div>';
            return;
        }

        let html = '';
        if (viewMode === 'list') {
            html = `
                <table class="file-list">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="selectAllList" /></th>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Uploaded</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            currentItems.folders.forEach(folder => {
                const folderName = folder.replace(currentPrefix, '').replace('/', '');
                html += `
                    <tr>
                        <td></td>
                        <td style="cursor: pointer; color: #55dcff;" class="folder-link" data-prefix="${folder}">📁 ${folderName}</td>
                        <td>-</td>
                        <td>-</td>
                        <td></td>
                    </tr>
                `;
            });
            
            currentItems.objects.forEach(obj => {
                const name = obj.key.replace(currentPrefix, '');
                html += `
                    <tr>
                        <td><input type="checkbox" class="file-checkbox" data-key="${obj.key}" /></td>
                        <td style="cursor: pointer; color: #f4f7ff;" class="file-link" data-key="${obj.key}">${getIcon(name)} ${name}</td>
                        <td>${formatBytes(obj.size)}</td>
                        <td>${formatDate(obj.uploaded)}</td>
                        <td>
                            <button class="storage-btn file-link" style="padding: 4px 8px; font-size: 0.8em;" data-key="${obj.key}">Details</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `</tbody></table>`;
        } else {
            html = `<div class="file-grid">`;
            
            currentItems.folders.forEach(folder => {
                const folderName = folder.replace(currentPrefix, '').replace('/', '');
                html += `
                    <div class="grid-item folder-link" data-prefix="${folder}">
                        <div class="grid-icon">📁</div>
                        <div class="grid-name">${folderName}</div>
                    </div>
                `;
            });
            
            currentItems.objects.forEach(obj => {
                const name = obj.key.replace(currentPrefix, '');
                html += `
                    <div class="grid-item" data-key="${obj.key}">
                        <input type="checkbox" class="grid-checkbox file-checkbox" data-key="${obj.key}" />
                        <div class="grid-icon file-link" data-key="${obj.key}">${getIcon(name)}</div>
                        <div class="grid-name file-link" data-key="${obj.key}">${name}</div>
                        <div class="grid-meta">${formatBytes(obj.size)}</div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        els.files.innerHTML = html;
        bindFileEvents();
        updateSelection();
    };

    const bindFileEvents = () => {
        els.files.querySelectorAll('.folder-link').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type === 'checkbox') return;
                currentPrefix = el.dataset.prefix;
                currentCursor = null;
                loadFiles();
            };
        });
        
        els.files.querySelectorAll('.file-link').forEach(el => {
            el.onclick = (e) => {
                if (e.target.type === 'checkbox') return;
                const key = el.dataset.key;
                const obj = currentItems.objects.find(o => o.key === key);
                if (obj) openDetailsModal(obj);
            };
        });
        
        els.files.querySelectorAll('.file-checkbox').forEach(cb => {
            cb.onchange = (e) => {
                if (e.target.checked) selectedItems.add(e.target.dataset.key);
                else selectedItems.delete(e.target.dataset.key);
                updateSelection();
            };
        });

        const selectAll = document.getElementById('selectAllList');
        if (selectAll) {
            selectAll.onchange = (e) => {
                if (e.target.checked) {
                    currentItems.objects.forEach(o => selectedItems.add(o.key));
                } else {
                    currentItems.objects.forEach(o => selectedItems.delete(o.key));
                }
                updateSelection();
            };
        }
    };

    // --- UPLOAD LOGIC ---
    const handleUpload = async (files) => {
        if (!files || files.length === 0) return;
        
        els.progress.style.display = 'block';
        let successCount = 0;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            els.progress.textContent = `Uploading ${i+1} of ${files.length}: ${file.name}...`;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', currentPrefix + file.name);
            
            try {
                const token = await getToken();
                const res = await fetch(`${API_BASE}/api/admin/storage/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (!res.ok) throw new Error(await res.text());
                successCount++;
            } catch(e) {
                alert(`Failed to upload ${file.name}: ${e.message}`);
            }
        }
        
        els.progress.textContent = `Successfully uploaded ${successCount} files.`;
        setTimeout(() => {
            els.progress.style.display = 'none';
            els.dropzone.style.display = 'none';
            currentCursor = null;
            loadFiles();
            loadStats();
        }, 2000);
    };

    // --- MODALS ---
    let currentActiveFile = null;

    const openDetailsModal = (obj) => {
        currentActiveFile = obj;
        document.getElementById('modal-filename').textContent = obj.key.split('/').pop();
        document.getElementById('modal-fileinfo').innerHTML = `
            <div><strong style="color:#aeb8d2;">Path:</strong> <span style="word-break:break-all;color:#f4f7ff;">${obj.key}</span></div>
            <div><strong style="color:#aeb8d2;">Type:</strong> <span style="color:#f4f7ff;">${obj.type || 'Unknown'}</span></div>
            <div><strong style="color:#aeb8d2;">Size:</strong> <span style="color:#f4f7ff;">${formatBytes(obj.size)}</span></div>
            <div><strong style="color:#aeb8d2;">Uploaded:</strong> <span style="color:#f4f7ff;">${formatDate(obj.uploaded)}</span></div>
            <div><strong style="color:#aeb8d2;">ETag:</strong> <span style="color:#f4f7ff;">${obj.etag || '-'}</span></div>
        `;
        els.modals.details.style.display = 'flex';
    };

    const closeModals = () => {
        els.modals.details.style.display = 'none';
        els.modals.rename.style.display = 'none';
        currentActiveFile = null;
    };

    document.getElementById('modal-btn-close').onclick = closeModals;

    document.getElementById('modal-btn-download').onclick = async () => {
        if (!currentActiveFile) return;
        try {
            const blob = await apiCall(`/api/admin/storage/download?path=${encodeURIComponent(currentActiveFile.key)}`);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentActiveFile.key.split('/').pop();
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch(e) {
            alert("Download failed: " + e.message);
        }
    };

    document.getElementById('modal-btn-delete').onclick = async () => {
        if (!currentActiveFile) return;
        if (!confirm(`Are you sure you want to delete ${currentActiveFile.key}?`)) return;
        
        try {
            await apiCall('/api/admin/storage/delete', {
                method: 'POST',
                body: JSON.stringify({ path: currentActiveFile.key })
            });
            closeModals();
            currentCursor = null;
            loadFiles();
            loadStats();
        } catch(e) {
            alert("Delete failed: " + e.message);
        }
    };

    document.getElementById('modal-btn-rename').onclick = () => {
        if (!currentActiveFile) return;
        document.getElementById('rename-input').value = currentActiveFile.key;
        els.modals.details.style.display = 'none';
        els.modals.rename.style.display = 'flex';
    };

    document.getElementById('modal-rename-cancel').onclick = () => {
        els.modals.rename.style.display = 'none';
        if (currentActiveFile) els.modals.details.style.display = 'flex';
    };

    document.getElementById('modal-rename-confirm').onclick = async () => {
        const newPath = document.getElementById('rename-input').value;
        if (!newPath || newPath === currentActiveFile.key) return;
        
        try {
            await apiCall('/api/admin/storage/move', {
                method: 'POST',
                body: JSON.stringify({ oldPath: currentActiveFile.key, newPath })
            });
            closeModals();
            currentCursor = null;
            loadFiles();
        } catch(e) {
            alert("Rename/Move failed: " + e.message);
        }
    };

    // --- EVENT LISTENERS ---
    els.btnView.onclick = () => {
        viewMode = viewMode === 'list' ? 'grid' : 'list';
        els.btnView.textContent = viewMode === 'list' ? 'Grid View' : 'List View';
        renderFiles();
    };

    els.btnRefresh.onclick = () => {
        currentCursor = null;
        loadStats();
        loadFiles();
    };

    let searchTimeout;
    els.search.oninput = (e) => {
        clearTimeout(searchTimeout);
        searchQuery = e.target.value.trim();
        searchTimeout = setTimeout(() => {
            currentCursor = null;
            loadFiles();
        }, 500);
    };

    els.btnLoadMore.onclick = () => {
        if (currentCursor) loadFiles(true);
    };

    els.btnUpload.onclick = () => {
        els.dropzone.style.display = els.dropzone.style.display === 'none' ? 'block' : 'none';
    };
    
    els.dropzone.onclick = () => els.fileInput.click();
    
    els.fileInput.onchange = (e) => {
        handleUpload(e.target.files);
        e.target.value = '';
    };

    els.dropzone.ondragover = (e) => {
        e.preventDefault();
        els.dropzone.classList.add('dragover');
    };
    els.dropzone.ondragleave = () => {
        els.dropzone.classList.remove('dragover');
    };
    els.dropzone.ondrop = (e) => {
        e.preventDefault();
        els.dropzone.classList.remove('dragover');
        handleUpload(e.dataTransfer.files);
    };

    els.btnDeleteMany.onclick = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Delete ${selectedItems.size} items? This cannot be undone.`)) return;
        
        try {
            await apiCall('/api/admin/storage/bulk-delete', {
                method: 'POST',
                body: JSON.stringify({ paths: Array.from(selectedItems) })
            });
            selectedItems.clear();
            currentCursor = null;
            loadFiles();
            loadStats();
        } catch(e) {
            alert("Bulk delete failed: " + e.message);
        }
    };

    els.btnCleanup.onclick = () => {
        if (confirm("Switch to cleanup view? This will find the largest files (first 100).")) {
            currentPrefix = '';
            searchQuery = '';
            els.search.value = '';
            currentCursor = null;
            loadCleanupFiles();
        }
    };

    const loadCleanupFiles = async () => {
        els.files.innerHTML = '<div style="text-align: center; padding: 40px; color: #aeb8d2;">Finding largest files...</div>';
        try {
            const url = new URL(`${API_BASE}/api/admin/storage/list`);
            url.searchParams.set('limit', '100');
            
            const data = await apiCall(url.pathname + url.search);
            currentItems.objects = (data.objects || []).sort((a,b) => b.size - a.size);
            currentItems.folders = [];
            currentCursor = data.nextCursor || null;
            
            renderFiles();
            els.btnLoadMore.style.display = currentCursor ? 'inline-block' : 'none';
            els.breadcrumb.innerHTML = `<span data-prefix="">Cleanup View (Largest Files)</span>`;
        } catch(e) {
            els.files.innerHTML = `<div style="text-align: center; padding: 40px; color: #ff758f;">Error: ${e.message}</div>`;
        }
    };

    // INIT
    loadStats();
    loadFiles();
}
