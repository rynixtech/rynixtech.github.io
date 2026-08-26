import fs from 'fs';
import path from 'path';

const modulesToGenerate = [
  { id: 'analytics', title: 'Analytics', collection: 'analytics_data' },
  { id: 'shopping_store', title: 'Shopping Store Settings', collection: 'shopping_store' },
  { id: 'book_store', title: 'Book Store Settings', collection: 'book_store' },
  { id: 'digital_products', title: 'Digital Products', collection: 'digital_products' },
  { id: 'media_store', title: 'Media Store Settings', collection: 'media_store' },
  { id: 'coupons', title: 'Coupons & Offers', collection: 'coupons' },
  { id: 'categories', title: 'Categories', collection: 'categories' },
  { id: 'inventory', title: 'Inventory', collection: 'inventory' },
  { id: 'reviews', title: 'Product Reviews', collection: 'reviews' },
  { id: 'admins', title: 'Admins', collection: 'admins' },
  { id: 'customer_activity', title: 'Customer Activity', collection: 'customer_activity' },
  { id: 'pending', title: 'Pending Orders', collection: 'orders' },
  { id: 'processing', title: 'Processing Orders', collection: 'orders' },
  { id: 'shipped', title: 'Shipped Orders', collection: 'orders' },
  { id: 'delivered', title: 'Delivered Orders', collection: 'orders' },
  { id: 'returns', title: 'Returns / Refunds', collection: 'returns' },
  { id: 'pages', title: 'Pages', collection: 'pages' },
  { id: 'banners', title: 'Banners', collection: 'banners' },
  { id: 'menus', title: 'Menus', collection: 'menus' },
  { id: 'announcements', title: 'Announcements', collection: 'announcements' },
  { id: 'seo', title: 'SEO Settings', collection: 'seo_settings' },
  { id: 'app_versions', title: 'App Versions', collection: 'app_versions' },
  { id: 'downloads', title: 'Downloads Tracking', collection: 'downloads' },
  { id: 'release_notes', title: 'Release Notes', collection: 'release_notes' },
  { id: 'books', title: 'Books', collection: 'books' },
  { id: 'authors', title: 'Authors', collection: 'authors' },
  { id: 'book_categories', title: 'Book Categories', collection: 'book_categories' },
  { id: 'ebooks', title: 'eBooks', collection: 'ebooks' },
  { id: 'book_orders', title: 'Book Orders', collection: 'book_orders' },
  { id: 'media_audio', title: 'Audio Media', collection: 'audio_media' },
  { id: 'media_categories', title: 'Media Categories', collection: 'media_categories' },
  { id: 'storage', title: 'Storage Management', collection: 'storage_stats' },
  { id: 'security', title: 'Security Settings', collection: 'security_settings' },
  { id: 'store_settings', title: 'Store Settings', collection: 'store_settings' },
  { id: 'payment_settings', title: 'Payment Settings', collection: 'payment_settings' },
  { id: 'shipping_settings', title: 'Shipping Settings', collection: 'shipping_settings' },
  { id: 'notifications_settings', title: 'Notifications Settings', collection: 'notifications_settings' },
  { id: 'admin_settings', title: 'Admin Settings', collection: 'admin_settings' }
];

const template = (id, title, collection) => `import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = \`
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>${title}</h2>
                <button onclick="document.getElementById('${id}-modal').style.display='block'" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add New</button>
            </div>

            <div id="${id}-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
                <div style="grid-column: 1 / -1; text-align: center; color: #aeb8d2;">Loading...</div>
            </div>

            <div id="${id}-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; padding: 20px; overflow-y: auto;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 24px; border-radius: 8px; max-width: 500px; margin: 40px auto; position: relative;">
                    <button onclick="document.getElementById('${id}-modal').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #aeb8d2; font-size: 20px; cursor: pointer;">×</button>
                    <h3>Add/Edit Entry</h3>
                    <form id="${id}-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="${id}-doc-id">
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name / Title</label>
                            <input type="text" id="${id}-title" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Details</label>
                            <textarea id="${id}-details" rows="3" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;"></textarea>
                        </div>
                        <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save</button>
                    </form>
                </div>
            </div>
        </div>
    \`;
    
    document.getElementById('${id}-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveItem();
    });

    loadItems();
}

async function loadItems() {
    const grid = document.getElementById('${id}-grid');
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
                    <h3 style="margin: 0 0 10px 0; color: #f4f7ff;">\${escapeHTML(data.title || 'Untitled')}</h3>
                    <p style="color: #aeb8d2; font-size: 0.9em; margin-bottom: 16px;">\${escapeHTML(data.details || '')}</p>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="edit_${id}('\${escapeHTML(doc.id)}')" style="flex: 1; background: rgba(85,220,255,0.1); border: 1px solid rgba(85,220,255,0.2); color: #55dcff; padding: 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                        <button onclick="delete_${id}('\${escapeHTML(doc.id)}')" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.2); color: #ff758f; padding: 8px; border-radius: 4px; cursor: pointer;">Delete</button>
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

window.edit_${id} = async (docId) => {
    try {
        const docRef = doc(db, '${collection}', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('${id}-doc-id').value = docId;
            document.getElementById('${id}-title').value = data.title || '';
            document.getElementById('${id}-details').value = data.details || '';
            document.getElementById('${id}-modal').style.display = 'block';
        } else {
            alert('Not found');
        }
    } catch(e) {
        console.error(e);
        alert('Error loading data');
    }
}

async function saveItem() {
    const docId = document.getElementById('${id}-doc-id').value;
    const title = document.getElementById('${id}-title').value;
    const details = document.getElementById('${id}-details').value;

    const data = {
        title,
        details,
        updatedAt: serverTimestamp()
    };

    try {
        if(docId) {
            await updateDoc(doc(db, '${collection}', docId), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, '${collection}'), data);
        }
        
        document.getElementById('${id}-modal').style.display = 'none';
        document.getElementById('${id}-form').reset();
        document.getElementById('${id}-doc-id').value = '';
        loadItems();
    } catch(e) {
        console.error(e);
        alert('Error saving: ' + e.message);
    }
}
\`;

for (const mod of modulesToGenerate) {
    const p = path.join(process.cwd(), 'admin', 'modules', mod.id + '.js');
    if (!fs.existsSync(p)) {
        fs.writeFileSync(p, template(mod.id, mod.title, mod.collection));
        console.log("Generated", p);
    }
}

// Now update admin.js
const adminJsPath = path.join(process.cwd(), 'admin', 'admin.js');
let adminJs = fs.readFileSync(adminJsPath, 'utf-8');

// Replace coming_soon.js with the actual module file for these modules
modulesToGenerate.forEach(mod => {
    const regex = new RegExp(\`{ id: '\${mod.id}',(.*?)route: './modules/coming_soon.js' }\`, 'g');
    adminJs = adminJs.replace(regex, \`{ id: '\${mod.id}',$1route: './modules/\${mod.id}.js' }\`);
});

fs.writeFileSync(adminJsPath, adminJs);
console.log("Updated admin.js");
