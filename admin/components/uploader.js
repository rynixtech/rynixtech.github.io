import { storage, db } from '../admin-firebase.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export function createUploader(container, { accept = '*/*', multiple = true, maxSizeMB = 50, storagePath = 'uploads', category = 'general', onComplete, onError }) {
  container.innerHTML = `
    <div class="dropzone" style="border: 2px dashed rgba(183,202,255,0.2); border-radius: 8px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; background: #0f1425;">
      <div style="font-size: 3rem; margin-bottom: 10px;">☁️</div>
      <h3 style="margin: 0 0 10px 0; color: #f4f7ff; font-family: 'Space Grotesk', sans-serif;">Drag & Drop files here</h3>
      <p style="margin: 0; color: #aeb8d2; font-size: 0.9rem;">or click to browse (Max ${maxSizeMB}MB)</p>
      <input type="file" style="display: none;" accept="${accept}" ${multiple ? 'multiple' : ''}>
    </div>
    <div class="upload-list" style="margin-top: 20px; display: flex; flex-direction: column; gap: 10px;"></div>
  `;

  const dropzone = container.querySelector('.dropzone');
  const fileInput = container.querySelector('input[type="file"]');
  const uploadList = container.querySelector('.upload-list');

  dropzone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.style.borderColor = '#f6c657';
      dropzone.style.background = 'rgba(246, 198, 87, 0.05)';
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
      dropzone.style.borderColor = 'rgba(183,202,255,0.2)';
      dropzone.style.background = '#0f1425';
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  fileInput.addEventListener('change', function() {
    handleFiles(this.files);
  });

  function handleFiles(files) {
    [...files].forEach(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        if (onError) onError(new Error(`File ${file.name} exceeds ${maxSizeMB}MB limit`));
        return;
      }
      uploadFile(file);
    });
  }

  function uploadFile(file) {
    const fileId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${storagePath}/${fileId}_${safeName}`;
    const storageRef = ref(storage, path);
    
    const fileEl = document.createElement('div');
    fileEl.style.cssText = 'background: rgba(183,202,255,0.05); border: 1px solid rgba(183,202,255,0.1); border-radius: 6px; padding: 15px; display: flex; flex-direction: column; gap: 10px;';
    fileEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #f4f7ff; font-weight: 500; word-break: break-all;">${file.name}</span>
        <button class="btn-cancel" style="background: none; border: none; color: #ff758f; cursor: pointer;">Cancel</button>
      </div>
      <div style="width: 100%; height: 6px; background: rgba(183,202,255,0.1); border-radius: 3px; overflow: hidden;">
        <div class="progress-bar" style="width: 0%; height: 100%; background: #55dcff; transition: width 0.2s;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #aeb8d2;">
        <span class="status-text">Starting...</span>
        <span>${(file.size / 1024 / 1024).toFixed(2)} MB</span>
      </div>
    `;
    
    uploadList.appendChild(fileEl);
    
    const progressBar = fileEl.querySelector('.progress-bar');
    const statusText = fileEl.querySelector('.status-text');
    const cancelBtn = fileEl.querySelector('.btn-cancel');
    
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    cancelBtn.addEventListener('click', () => {
      uploadTask.cancel();
      fileEl.remove();
    });

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        progressBar.style.width = progress + '%';
        statusText.textContent = `Uploading ${Math.round(progress)}%`;
      }, 
      (error) => {
        statusText.textContent = 'Error: ' + error.message;
        statusText.style.color = '#ff758f';
        progressBar.style.background = '#ff758f';
        if (onError) onError(error);
      }, 
      async () => {
        statusText.textContent = 'Processing...';
        progressBar.style.background = '#64dfac';
        cancelBtn.style.display = 'none';
        
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const fileDoc = {
            name: file.name,
            storagePath: path,
            type: file.type,
            size: file.size,
            contentType: file.type,
            uploadedAt: serverTimestamp(),
            category,
            downloadURL
          };
          
          const docRef = await addDoc(collection(db, 'files'), fileDoc);
          
          statusText.textContent = 'Complete';
          if (onComplete) {
            onComplete({ name: file.name, downloadURL, storagePath: path, fileId: docRef.id });
          }
          
          setTimeout(() => {
            fileEl.style.opacity = '0';
            setTimeout(() => fileEl.remove(), 300);
          }, 3000);
        } catch (error) {
          statusText.textContent = 'Error saving metadata';
          statusText.style.color = '#ff758f';
          if (onError) onError(error);
        }
      }
    );
  }
}
