import { db, auth, deleteB2Object } from '../admin-firebase.js';
import { collection, query, where, orderBy, limit, getDocs, doc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="videos-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Video Manager</h2>
                <div style="display: flex; gap: 10px;">
                    <input type="file" id="video-upload" accept="video/*" multiple style="display: none;">
                    <button onclick="document.getElementById('video-upload').click()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Upload Video</button>
                </div>
            </div>

            <div id="video-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 16px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading videos...</div>
            </div>
            
            <div id="video-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; justify-content: center; align-items: center;">
                <div style="position: relative; max-width: 90%; max-height: 90%; width: 800px;">
                    <button onclick="document.getElementById('video-modal').style.display='none'; document.getElementById('modal-video').pause();" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    <video id="modal-video" controls style="width: 100%; max-height: 90vh; background: #000;"></video>
                </div>
            </div>
        </div>
    `;

    document.getElementById('video-upload').addEventListener('change', handleVideoUpload);
    loadVideos();
}

async function loadVideos() {
    const grid = document.getElementById('video-grid');
    try {
        const q = query(collection(db, 'files'), orderBy('uploadedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const videos = snapshot.docs.filter(d => d.data().contentType?.startsWith('video/'));
        
        if (videos.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No videos found</div>';
            return;
        }

        grid.innerHTML = videos.map(doc => {
            const data = doc.data();
            const size = (data.size / (1024*1024)).toFixed(2) + ' MB';
            return `
                <div style="background: #0f1425; border-radius: 8px; overflow: hidden; border: 1px solid rgba(183,202,255,0.12);" class="video-card">
                    <div style="aspect-ratio: 16/9; background: #0a0e1a; display: flex; align-items: center; justify-content: center; font-size: 40px;">
                        🎥
                    </div>
                    <div style="padding: 12px;">
                        <div style="font-weight: bold; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.name}</div>
                        <div style="color: #aeb8d2; font-size: 0.85em; margin-bottom: 12px;">${size}</div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="previewVideo('${data.url}')" style="flex:1; background: rgba(85,220,255,0.1); border: none; color: #55dcff; padding: 6px; border-radius: 4px; cursor: pointer;">Play</button>
                            <button onclick="navigator.clipboard.writeText('${data.url}')" style="background: rgba(183,202,255,0.1); border: none; color: #fff; padding: 6px; border-radius: 4px; cursor: pointer;">Copy</button>
                            <button onclick="deleteVideo('${doc.id}', '${data.fullPath}')" style="background: rgba(255,117,143,0.1); border: none; color: #ff758f; padding: 6px; border-radius: 4px; cursor: pointer;">Del</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading videos</div>';
    }
}

window.previewVideo = (url) => {
    const video = document.getElementById('modal-video');
    video.src = url;
    document.getElementById('video-modal').style.display = 'flex';
};

window.deleteVideo = async (docId, fullPath) => {
    if(!confirm('Delete this video?')) return;
    try {
        if(fullPath) await deleteB2Object(fullPath);
        await deleteDoc(doc(db, 'files', docId));
        loadVideos();
    } catch(e) {
        alert('Error deleting');
    }
};

async function handleVideoUpload(e) {
    const files = e.target.files;
    const { SystemUploader } = await import('../components/uploader.js');
    
    for (let file of files) {
        try {
            await SystemUploader.upload(file, 'videos', { 
                maxSizeMB: 500,
                onSaveMetadata: async (result) => {
                    await addDoc(collection(db, 'files'), {
                        name: result.name,
                        size: result.size,
                        contentType: result.contentType,
                        url: result.url,
                        fullPath: result.fullPath,
                        storageProvider: 'b2',
                        visibility: 'public',
                        uploadedAt: serverTimestamp()
                    });
                    
                    await addDoc(collection(db, 'activityLog'), {
                        actionText: `Uploaded video ${result.name}`,
                        actionIcon: '🎥',
                        timestamp: serverTimestamp()
                    });
                }
            });
        } catch (error) {
            console.error('Upload failed for', file.name, error);
        }
    }
    document.getElementById('video-upload').value = '';
    loadVideos();
}
