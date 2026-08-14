import { db } from '../admin-firebase.js';
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Settings</h2>
        </div>
        <div class="settings-grid" style="display: grid; gap: 20px; grid-template-columns: 1fr 1fr;">
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Website Settings</h3>
                <label>Site Name</label>
                <input type="text" id="site-name" class="form-control" style="width: 100%; margin-bottom: 10px; padding: 8px;" />
                <label>Tagline</label>
                <input type="text" id="site-tagline" class="form-control" style="width: 100%; margin-bottom: 10px; padding: 8px;" />
                <label><input type="checkbox" id="maintenance-mode" /> Maintenance Mode</label>
                <br><br>
                <button id="save-general" class="btn btn-primary">Save Settings</button>
            </div>
            
            <div class="card" style="background: #0f1425; padding: 20px; border-radius: 8px;">
                <h3>Error Tracking Snippet</h3>
                <p>Include this snippet in your main frontend website to enable error tracking:</p>
                <pre style="background: #0a0e1a; padding: 10px; overflow-x: auto; font-size: 12px; color: #64dfac;">
&lt;script type="module"&gt;
  // Make sure Firebase is initialized in your main app
  import { getFirestore, collection, addDoc, serverTimestamp } 
    from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
  
  window.addEventListener('error', (event) => {
    const db = getFirestore();
    addDoc(collection(db, 'errors'), {
      type: 'JS Error',
      message: event.message,
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      lastSeen: serverTimestamp(),
      status: 'open',
      count: 1
    });
  });
&lt;/script&gt;
                </pre>
            </div>
        </div>
    `;

    const settingsRef = doc(db, 'settings', 'general');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById('site-name').value = data.siteName || 'Rynix Tech';
        document.getElementById('site-tagline').value = data.tagline || '';
        document.getElementById('maintenance-mode').checked = !!data.maintenanceMode;
    }

    document.getElementById('save-general').addEventListener('click', async () => {
        await setDoc(settingsRef, {
            siteName: document.getElementById('site-name').value,
            tagline: document.getElementById('site-tagline').value,
            maintenanceMode: document.getElementById('maintenance-mode').checked,
            updatedAt: serverTimestamp()
        }, { merge: true });

        await addDoc(collection(db, 'activityLog'), {
            action: 'settings',
            resource: 'general settings',
            timestamp: serverTimestamp()
        });

        alert('Settings saved successfully!');
    });
}
