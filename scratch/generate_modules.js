const fs = require('fs');
const path = require('path');

const modulesToGenerate = [
  { id: 'admins', title: 'Admins', collection: 'admins' },
  { id: 'admin_settings', title: 'Admin Settings', collection: 'admin_settings' },
  { id: 'analytics', title: 'Analytics Data', collection: 'analytics' },
  { id: 'announcements', title: 'Announcements', collection: 'announcements' },
  { id: 'app_versions', title: 'App Versions', collection: 'app_versions' },
  { id: 'authors', title: 'Authors', collection: 'authors' },
  { id: 'banners', title: 'Banners', collection: 'banners' },
  { id: 'book_categories', title: 'Book Categories', collection: 'book_categories' },
  { id: 'book_orders', title: 'Book Orders', collection: 'book_orders' },
  { id: 'books', title: 'Books', collection: 'books' },
  { id: 'book_store', title: 'Book Store', collection: 'book_store' },
  { id: 'categories', title: 'Categories', collection: 'categories' },
  { id: 'coupons', title: 'Coupons', collection: 'coupons' },
  { id: 'customer_activity', title: 'Customer Activity', collection: 'customer_activity' },
  { id: 'delivered', title: 'Delivered', collection: 'delivered' },
  { id: 'digital_products', title: 'Digital Products', collection: 'digital_products' },
  { id: 'downloads', title: 'Downloads', collection: 'downloads' },
  { id: 'ebooks', title: 'eBooks', collection: 'ebooks' },
  { id: 'inventory', title: 'Inventory', collection: 'inventory' },
  { id: 'media_audio', title: 'Media Audio', collection: 'media_audio' },
  { id: 'media_categories', title: 'Media Categories', collection: 'media_categories' },
  { id: 'media_store', title: 'Media Store', collection: 'media_store' },
  { id: 'menus', title: 'Menus', collection: 'menus' },
  { id: 'notifications_settings', title: 'Notifications Settings', collection: 'notifications_settings' },
  { id: 'pages', title: 'Pages', collection: 'pages' },
  { id: 'payment_settings', title: 'Payment Settings', collection: 'payment_settings' },
  { id: 'pending', title: 'Pending', collection: 'pending' },
  { id: 'processing', title: 'Processing', collection: 'processing' },
  { id: 'release_notes', title: 'Release Notes', collection: 'release_notes' },
  { id: 'returns', title: 'Returns', collection: 'returns' },
  { id: 'reviews', title: 'Reviews', collection: 'reviews' },
  { id: 'security', title: 'Security Settings', collection: 'security_settings' },
  { id: 'seo', title: 'SEO Settings', collection: 'seo' },
  { id: 'shipped', title: 'Shipped', collection: 'shipped' },
  { id: 'shipping_settings', title: 'Shipping Settings', collection: 'shipping_settings' },
  { id: 'shopping_store', title: 'Shopping Store', collection: 'shopping_store' },
  { id: 'store_settings', title: 'Store Settings', collection: 'store_settings' }
];

const template = (id, title, collection) => `import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { showModal, hideModal } from '../components/modal.js';

export async function render(container) {
    container.innerHTML = \`
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>${title}</h2>
                <button onclick="window.openModal_${id}()" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>

            <div id="${id}-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>
        </div>
    \`;
    
    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('${id}-grid');
    if (!grid) return;
    try {
        const q = query(collection(db, '${collection}'), orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">No data found</div>';
            return;
        }

        grid.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return \`
                <div style="background: #0f1425; border-radius: 8px; border: 1px solid rgba(183,202,255,0.12); padding: 20px;">
                    <h3 style="margin: 0 0 10px 0; color: #f4f7ff;">\${escapeHTML(data.title || data.name || 'Untitled')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 16px;">\${escapeHTML(data.details || data.description || '')}</p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="window.edit_${id}('\${escapeHTML(doc.id)}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="window.delete_${id}('\${escapeHTML(doc.id)}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
                    </div>
                </div>
            \`;
        }).join('');
    } catch(e) {
        console.error(e);
        grid.innerHTML = '<div style="color: #ff758f;">Error loading data (implement firestore rules)</div>';
    }
}

window.delete_${id} = async (docId) => {
    if(!confirm('Delete this entry?')) return;
    try {
        await deleteDoc(doc(db, '${collection}', docId));
        loadItems();
    } catch(e) {
        alert('Error deleting: ' + e.message);
    }
}

window.openModal_${id} = (docId = '', title = '', details = '') => {
    const content = document.createElement('div');
    content.innerHTML = \`
        <form id="${id}-form" style="display: flex; flex-direction: column; gap: 16px;">
            <input type="hidden" id="${id}-doc-id" value="\${escapeHTML(docId)}">
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name / Title</label>
                <input type="text" id="${id}-title" required value="\${escapeHTML(title)}" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
            </div>
            <div>
                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Details</label>
                <textarea id="${id}-details" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">\${escapeHTML(details)}</textarea>
            </div>
            <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save</button>
        </form>
    \`;

    content.querySelector('#${id}-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = document.getElementById('${id}-title').value;
        const d = document.getElementById('${id}-details').value;
        const did = document.getElementById('${id}-doc-id').value;
        
        const data = {
            title: t,
            details: d,
            updatedAt: serverTimestamp()
        };

        try {
            if(did) {
                await updateDoc(doc(db, '${collection}', did), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, '${collection}'), data);
            }
            hideModal();
            loadItems();
        } catch(err) {
            console.error(err);
            alert('Error saving: ' + err.message);
        }
    });

    showModal({
        title: docId ? 'Edit Entry' : 'Add Entry',
        content: content,
        size: 'md'
    });
}

window.edit_${id} = async (docId) => {
    try {
        const docRef = doc(db, '${collection}', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            window.openModal_${id}(docId, data.title || data.name || '', data.details || data.description || '');
        } else {
            alert('Not found');
        }
    } catch(e) {
        console.error(e);
        alert('Error loading data');
    }
}
`;

for (const mod of modulesToGenerate) {
    const p = path.join(process.cwd(), 'admin', 'modules', mod.id + '.js');
    // REMOVED fs.existsSync(p) check to explicitly overwrite files with the new fixed architecture
    fs.writeFileSync(p, template(mod.id, mod.title, mod.collection));
    console.log("Generated", p);
}

// Now update admin.js
const adminJsPath = path.join(process.cwd(), 'admin', 'admin.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf-8');

// Replace coming_soon.js with the actual module file for these modules
modulesToGenerate.forEach(mod => {
    const regex = new RegExp(`{ id: '${mod.id}',(.*?)route: './modules/coming_soon.js' }`, 'g');
    adminJs = adminJs.replace(regex, `{ id: '${mod.id}',$1route: './modules/${mod.id}.js' }`);
});

fs.writeFileSync(adminJsPath, adminJs);
console.log("Updated admin.js");
