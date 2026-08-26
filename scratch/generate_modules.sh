#!/bin/bash

# Array of module ID, Title, Collection
modules=(
  "analytics:Analytics:analytics_data"
  "shopping_store:Shopping Store Settings:shopping_store"
  "book_store:Book Store Settings:book_store"
  "digital_products:Digital Products:digital_products"
  "media_store:Media Store Settings:media_store"
  "coupons:Coupons & Offers:coupons"
  "categories:Categories:categories"
  "inventory:Inventory:inventory"
  "reviews:Product Reviews:reviews"
  "admins:Admins:admins"
  "customer_activity:Customer Activity:customer_activity"
  "pending:Pending Orders:orders"
  "processing:Processing Orders:orders"
  "shipped:Shipped Orders:orders"
  "delivered:Delivered Orders:orders"
  "returns:Returns / Refunds:returns"
  "pages:Pages:pages"
  "banners:Banners:banners"
  "menus:Menus:menus"
  "announcements:Announcements:announcements"
  "seo:SEO Settings:seo_settings"
  "app_versions:App Versions:app_versions"
  "downloads:Downloads Tracking:downloads"
  "release_notes:Release Notes:release_notes"
  "books:Books:books"
  "authors:Authors:authors"
  "book_categories:Book Categories:book_categories"
  "ebooks:eBooks:ebooks"
  "book_orders:Book Orders:book_orders"
  "media_audio:Audio Media:audio_media"
  "media_categories:Media Categories:media_categories"
  "storage:Storage Management:storage_stats"
  "security:Security Settings:security_settings"
  "store_settings:Store Settings:store_settings"
  "payment_settings:Payment Settings:payment_settings"
  "shipping_settings:Shipping Settings:shipping_settings"
  "notifications_settings:Notifications Settings:notifications_settings"
  "admin_settings:Admin Settings:admin_settings"
)

for item in "${modules[@]}"; do
  IFS=":" read -r id title collection <<< "$item"
  filepath="admin/modules/${id}.js"
  
  if [ ! -f "$filepath" ]; then
    cat << TEMPLATE > "$filepath"
import { db, escapeHTML } from '../admin-firebase.js';
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
TEMPLATE
    echo "Generated $filepath"
  fi

  # Update admin.js to point to the new module file instead of coming_soon.js
  sed -i "s/{ id: '${id}',\(.*\)route: '.\/modules\/coming_soon.js' }/{ id: '${id}',\1route: '.\/modules\/${id}.js' }/g" admin/admin.js

done
