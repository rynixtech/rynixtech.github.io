import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>SEO Settings</h2>
                <button onclick="window.openModal_seo()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>
            <div id="seo-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    `;
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('seo-grid');
    if (!grid) return;

    try {
        const q = query(collection(db, 'seo_settings'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const pageName = escapeHTML(data.pageName || 'No Page Name');
            const metaTitle = escapeHTML(data.metaTitle || 'No Title');
            const keywords = escapeHTML(data.keywords || '');
            const robotsDirective = data.robotsDirective || 'index,follow';
            
            const robotsBadge = `<span style="background: rgba(85,220,255,0.1); color: #55dcff; padding: 4px 8px; border-radius: 12px; font-size: 0.85em;">${robotsDirective}</span>`;

            html += `
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #f4f7ff;">${pageName}</h3>
                        <div>${robotsBadge}</div>
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 10px;">
                        <strong>Title:</strong> ${metaTitle}
                    </div>
                    <div style="color: #aeb8d2; font-size: 0.85em; margin-bottom: 15px;">
                        <strong>Keywords:</strong> ${keywords.length > 50 ? keywords.substring(0, 50) + '...' : keywords}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.edit_seo('${docSnap.id}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_seo('${docSnap.id}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (error) {
        console.error("Error loading SEO settings:", error);
        grid.innerHTML = \`<div style="grid-column: 1 / -1; text-align: center; color: #ff758f;">Error loading data: \${error.message}</div>\`;
    }
}

window.openModal_seo = () => {
    const content = `
        <form id="seo-form" onsubmit="window.save_seo(event)">
            <input type="hidden" id="seo-id">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Page Name</label>
                <input type="text" id="seo-pageName" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Meta Title</label>
                <input type="text" id="seo-metaTitle" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Meta Description</label>
                <textarea id="seo-metaDescription" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Keywords (comma-separated)</label>
                <input type="text" id="seo-keywords" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">OG Image URL</label>
                    <input type="text" id="seo-ogImageUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
                <div style="flex: 1;">
                    <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Canonical URL</label>
                    <input type="text" id="seo-canonicalUrl" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                </div>
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Robots Directive</label>
                <select id="seo-robotsDirective" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                    <option value="index,follow">index, follow</option>
                    <option value="noindex,nofollow">noindex, nofollow</option>
                    <option value="noindex,follow">noindex, follow</option>
                </select>
            </div>
            <button type="submit" style="width: 100%; background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Save</button>
        </form>
    `;
    showModal('Add / Edit SEO Settings', content);
};

window.save_seo = async (e) => {
    e.preventDefault();
    const id = document.getElementById('seo-id').value;
    const data = {
        pageName: document.getElementById('seo-pageName').value,
        metaTitle: document.getElementById('seo-metaTitle').value,
        metaDescription: document.getElementById('seo-metaDescription').value,
        keywords: document.getElementById('seo-keywords').value,
        ogImageUrl: document.getElementById('seo-ogImageUrl').value,
        canonicalUrl: document.getElementById('seo-canonicalUrl').value,
        robotsDirective: document.getElementById('seo-robotsDirective').value,
    };

    try {
        if (id) {
            data.updatedAt = serverTimestamp();
            await updateDoc(doc(db, 'seo_settings', id), data);
        } else {
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp();
            await addDoc(collection(db, 'seo_settings'), data);
        }
        hideModal();
        loadItems();
    } catch (error) {
        console.error("Error saving:", error);
        alert("Error saving: " + error.message);
    }
};

window.edit_seo = async (id) => {
    try {
        const docRef = doc(db, 'seo_settings', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            const data = snap.data();
            window.openModal_seo();
            document.getElementById('seo-id').value = id;
            document.getElementById('seo-pageName').value = data.pageName || '';
            document.getElementById('seo-metaTitle').value = data.metaTitle || '';
            document.getElementById('seo-metaDescription').value = data.metaDescription || '';
            document.getElementById('seo-keywords').value = data.keywords || '';
            document.getElementById('seo-ogImageUrl').value = data.ogImageUrl || '';
            document.getElementById('seo-canonicalUrl').value = data.canonicalUrl || '';
            document.getElementById('seo-robotsDirective').value = data.robotsDirective || 'index,follow';
        }
    } catch (error) {
        console.error("Error fetching:", error);
        alert("Error loading item: " + error.message);
    }
};

window.delete_seo = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            await deleteDoc(doc(db, 'seo_settings', id));
            loadItems();
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Error deleting: " + error.message);
        }
    }
};
