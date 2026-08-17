import { auth } from '../admin-firebase.js';

export class SystemUploader {
  static initUI() {
    if (document.getElementById('system-upload-manager')) return;
    const manager = document.createElement('div');
    manager.id = 'system-upload-manager';
    manager.style.cssText = 'position: fixed; bottom: 20px; right: 20px; width: 350px; max-height: 80vh; overflow-y: auto; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
    document.body.appendChild(manager);
  }

  static async upload(file, category = 'general', options = {}) {
    this.initUI();
    const manager = document.getElementById('system-upload-manager');
    
    // File validation
    const maxSize = (options.maxSizeMB || 500) * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`❌ Unsupported file size. Max allowed is ${options.maxSizeMB || 500}MB.`);
      throw new Error('FILE_TOO_LARGE');
    }

    const card = document.createElement('div');
    card.style.cssText = 'background: rgba(11, 16, 35, 0.95); border: 1px solid rgba(183,202,255,0.2); border-radius: 12px; padding: 15px; pointer-events: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px); transition: all 0.3s ease;';
    
    const sizeStr = (file.size / 1024 / 1024).toFixed(2);
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 0.95rem; color: #f4f7ff;" title="${file.name}">${file.name}</div>
        <button class="btn-cancel" style="background: none; border: none; color: #ff758f; cursor: pointer; padding: 0 0 0 10px; font-size: 1.2rem; line-height: 1;">×</button>
      </div>
      <div style="font-size: 0.8rem; color: #aeb8d2; margin-bottom: 8px; display: flex; justify-content: space-between;">
        <span class="status-text">VALIDATING...</span>
        <span class="progress-text">0% • 0 / ${sizeStr} MB</span>
      </div>
      <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
        <div class="progress-bar" style="width: 0%; height: 100%; background: #55dcff; transition: width 0.2s, background 0.3s;"></div>
      </div>
      <div class="actions" style="display: none; justify-content: flex-end; gap: 10px;">
        <button class="btn-retry" style="background: rgba(85,220,255,0.1); color: #55dcff; border: 1px solid rgba(85,220,255,0.3); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Retry</button>
      </div>
    `;
    manager.appendChild(card);

    return new Promise((resolve, reject) => {
      let xhr = null;
      let timeoutTimer = null;
      
      const statusText = card.querySelector('.status-text');
      const progressText = card.querySelector('.progress-text');
      const progressBar = card.querySelector('.progress-bar');
      const btnCancel = card.querySelector('.btn-cancel');
      const btnRetry = card.querySelector('.btn-retry');
      const actionsDiv = card.querySelector('.actions');

      const cleanup = () => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      };

      const setFailed = (msg) => {
        cleanup();
        statusText.textContent = `❌ ${msg}`;
        statusText.style.color = '#ff758f';
        progressBar.style.background = '#ff758f';
        actionsDiv.style.display = 'flex';
        btnCancel.innerHTML = 'Close';
      };

      const setSuccess = (msg) => {
        cleanup();
        statusText.textContent = `✅ ${msg}`;
        statusText.style.color = '#4ade80';
        progressBar.style.background = '#4ade80';
        progressBar.style.width = '100%';
        btnCancel.innerHTML = 'Close';
        setTimeout(() => {
          card.style.opacity = '0';
          setTimeout(() => card.remove(), 300);
        }, 5000);
      };

      btnCancel.addEventListener('click', () => {
        if (xhr) {
          xhr.abort();
          statusText.textContent = 'CANCELLED';
        }
        card.remove();
        reject(new Error('UPLOAD_CANCELLED'));
      });

      const startUpload = async () => {
        actionsDiv.style.display = 'none';
        progressBar.style.background = '#55dcff';
        statusText.style.color = '#aeb8d2';
        progressBar.style.width = '0%';
        progressText.textContent = `0% • 0 / ${sizeStr} MB`;
        
        try {
          statusText.textContent = 'AUTHORIZING...';
          const token = await auth.currentUser.getIdToken(true);
          
          statusText.textContent = 'REQUESTING URL...';
          const res = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/storage/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', category })
          });
          
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || data.error || `HTTP ${res.status}`);
          }
          const data = await res.json();
          if (!data.ok) {
            throw new Error(data.message || data.error || 'Upload authorization failed');
          }
          const { url, objectKey } = data;

          statusText.textContent = 'UPLOADING...';
          
          xhr = new XMLHttpRequest();
          xhr.open('PUT', url, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          
          // Timeout detection (30 seconds of no progress)
          const resetTimeout = () => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(() => {
              xhr.abort();
              setFailed('Upload timed out');
              reject(new Error('UPLOAD_TIMEOUT'));
            }, 30000);
          };
          resetTimeout();

          xhr.upload.onprogress = (e) => {
            resetTimeout();
            if (e.lengthComputable) {
              const percent = (e.loaded / e.total) * 100;
              const loadedMB = (e.loaded / 1024 / 1024).toFixed(2);
              progressBar.style.width = `${percent}%`;
              progressText.textContent = `${Math.round(percent)}% • ${loadedMB} / ${sizeStr} MB`;
            } else {
              progressBar.style.width = '100%';
              progressBar.style.background = 'repeating-linear-gradient(45deg, #55dcff, #55dcff 10px, #42b2ce 10px, #42b2ce 20px)';
              progressText.textContent = `Uploading... (indeterminate)`;
            }
          };

          xhr.onload = () => {
            cleanup();
            if (xhr.status >= 200 && xhr.status < 300) {
              const publicUrl = category === 'documents' 
                  ? `https://rynixtech-control-center-worker.rynixtech.workers.dev/api/documents/${objectKey.split('/').pop()}`
                  : `https://rynixtech-control-center-worker.rynixtech.workers.dev/${objectKey}`;

              const uploadResult = {
                name: file.name,
                size: file.size,
                contentType: file.type || 'application/octet-stream',
                url: publicUrl,
                fullPath: objectKey,
                category
              };

              if (options.onSaveMetadata) {
                statusText.textContent = 'SAVING METADATA...';
                options.onSaveMetadata(uploadResult)
                  .then(() => {
                    setSuccess('Upload successful');
                    resolve(uploadResult);
                  })
                  .catch((err) => {
                    setFailed('File uploaded, but metadata save failed.');
                    SystemUploader.logErrorToFirebase(file.name, category, 'METADATA_SAVE_FAILED: ' + err.message);
                    reject(new Error('Metadata save failed'));
                  });
              } else {
                setSuccess('Upload successful');
                resolve(uploadResult);
              }
            } else {
              setFailed(`HTTP ${xhr.status} Storage unavailable`);
              SystemUploader.logErrorToFirebase(file.name, category, `HTTP ${xhr.status} Storage unavailable`);
              reject(new Error(`Storage unavailable`));
            }
          };

          xhr.onerror = () => {
            cleanup();
            setFailed('Cannot reach upload server');
            SystemUploader.logErrorToFirebase(file.name, category, 'Cannot reach upload server (B2)');
            reject(new Error('Cannot reach upload server'));
          };

          xhr.send(file);
        } catch (err) {
          cleanup();
          let errorMsg = err.message || 'Unknown server error';
          if (errorMsg === 'Failed to fetch' || errorMsg.includes('NetworkError')) {
             errorMsg = 'Cannot reach upload server';
          }
          if (errorMsg.includes('Unauthorized') || errorMsg.includes('Missing or invalid Authorization')) {
             errorMsg = 'Authentication expired';
          }
          setFailed(errorMsg);
          SystemUploader.logErrorToFirebase(file.name, category, errorMsg);
          reject(err);
        }
      };

      btnRetry.addEventListener('click', startUpload);
      startUpload();
    });
  }

  static async logErrorToFirebase(filename, category, errorMessage) {
    try {
      const { db } = await import('../admin-firebase.js');
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js');
      await addDoc(collection(db, 'errors'), {
        system: 'Upload System',
        component: 'SystemUploader',
        category: category,
        filename: filename,
        error: errorMessage,
        timestamp: serverTimestamp(),
        severity: 'WARNING',
        status: 'Unresolved'
      });
    } catch (e) {
      console.error('Failed to log upload error to Firestore', e);
    }
  }
}
