import { db } from '../admin-firebase.js';
import { collection, query, orderBy, getDocs, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="products-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Products Manager</h2>
                <button onclick="document.getElementById('prod-modal').style.display='block'" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">+ Add Product</button>
            </div>

            <div style="background: #0f1425; border-radius: 8px; overflow: hidden; border: 1px solid rgba(183,202,255,0.12);">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); background: rgba(10,14,26,0.5);">
                            <th style="padding: 12px 16px; color: #aeb8d2;">Product</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Price</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Stock</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Status</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody">
                        <tr><td colspan="5" style="padding: 16px; text-align: center;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Modal Form -->
            <div id="prod-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; padding: 20px; overflow-y: auto;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 24px; border-radius: 8px; max-width: 600px; margin: 40px auto; position: relative;">
                    <button onclick="document.getElementById('prod-modal').style.display='none'" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #aeb8d2; font-size: 20px; cursor: pointer;">×</button>
                    <h3>Add/Edit Product</h3>
                    <form id="prod-form" onsubmit="event.preventDefault(); saveProduct();" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="prod-id">
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name</label>
                            <input type="text" id="prod-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Price ($)</label>
                            <input type="number" step="0.01" id="prod-price" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Stock</label>
                            <input type="number" id="prod-stock" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                            <select id="prod-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>
                        <button type="submit" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save Product</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    window.saveProduct = saveProduct;
    loadProducts();
}

async function loadProducts() {
    const tbody = document.getElementById('products-tbody');
    try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center;">No products found</td></tr>';
            return;
        }

        tbody.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            let statusBadge = '';
            if (data.status === 'active') statusBadge = '<span style="background: rgba(100,223,172,0.1); color: #64dfac; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Active</span>';
            else if (data.status === 'out_of_stock') statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Out of Stock</span>';
            else statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Draft</span>';

            return `
                <tr style="border-bottom: 1px solid rgba(183,202,255,0.05);">
                    <td style="padding: 12px 16px; font-weight: bold;">${data.name}</td>
                    <td style="padding: 12px 16px;">$${Number(data.price).toFixed(2)}</td>
                    <td style="padding: 12px 16px;">${data.stock}</td>
                    <td style="padding: 12px 16px;">${statusBadge}</td>
                    <td style="padding: 12px 16px;">
                        <button onclick="deleteProduct('${doc.id}')" style="background: none; border: none; color: #ff758f; cursor: pointer;" title="Delete">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: #ff758f;">Error loading products</td></tr>';
    }
}

window.deleteProduct = async (id) => {
    if(!confirm('Delete this product?')) return;
    try {
        await deleteDoc(doc(db, 'products', id));
        loadProducts();
    } catch(e) {
        alert('Error deleting');
    }
}

async function saveProduct() {
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const stock = document.getElementById('prod-stock').value;
    const status = document.getElementById('prod-status').value;

    const data = {
        name,
        price: Number(price),
        stock: Number(stock),
        status,
        updatedAt: serverTimestamp()
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'products', id), data);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), data);
        }
        
        document.getElementById('prod-modal').style.display = 'none';
        document.getElementById('prod-form').reset();
        loadProducts();
    } catch(e) {
        console.error(e);
        alert('Error saving product');
    }
}
