import { db, escapeHTML, deleteB2Object } from '../admin-firebase.js';
import { collection, query, orderBy, limit, startAfter, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { SystemUploader } from '../components/uploader.js';

export async function render(container) {
    container.innerHTML = `
        <div class="products-module">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Products Manager</h2>
                <button id="add-prod-btn" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight:bold;">+ Add Product</button>
            </div>
            
            <div class="controls" style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" id="prod-search" placeholder="Search products (local)..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: rgba(0,0,0,0.2); color: var(--text);" />
                <select id="prod-status-filter" style="padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: rgba(0,0,0,0.2); color: var(--text);">
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="out_of_stock">Out of Stock</option>
                </select>
            </div>

            <div style="background: rgba(11, 16, 35, 0.82); border-radius: 12px; overflow-x: auto; border: 1px solid rgba(183,202,255,0.12);">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid rgba(183,202,255,0.12); background: rgba(10,14,26,0.5);">
                            <th style="padding: 12px 16px; color: #aeb8d2;">Image</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Product</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Category</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Price</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Stock</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Status</th>
                            <th style="padding: 12px 16px; color: #aeb8d2;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody">
                        <tr><td colspan="7" style="padding: 16px; text-align: center;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <button id="prev-page" class="btn btn-quiet" disabled>← Previous</button>
                <span id="page-info" style="color: var(--muted);">Page 1</span>
                <button id="next-page" class="btn btn-primary" disabled>Next →</button>
            </div>

            <!-- Modal Form -->
            <div id="prod-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10,14,26,0.9); z-index: 1000; padding: 20px; overflow-y: auto;">
                <div style="background: #0f1425; border: 1px solid rgba(183,202,255,0.12); padding: 24px; border-radius: 8px; max-width: 600px; margin: 40px auto; position: relative;">
                    <button id="close-prod-modal" style="position: absolute; top: 16px; right: 16px; background: none; border: none; color: #aeb8d2; font-size: 20px; cursor: pointer;">×</button>
                    <h3>Add/Edit Product</h3>
                    <form id="prod-form" style="display: flex; flex-direction: column; gap: 16px;">
                        <input type="hidden" id="prod-id">
                        <input type="hidden" id="prod-image-url">
                        
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Product Image</label>
                            <input type="file" id="prod-image-file" accept="image/*" style="width: 100%; color: var(--text);">
                            <div id="img-preview-container" style="margin-top:10px; display:none;">
                                <img id="img-preview" src="" style="max-height: 100px; border-radius: 8px; border: 1px solid var(--line);">
                            </div>
                        </div>

                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Name *</label>
                            <input type="text" id="prod-name" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Category</label>
                            <input type="text" id="prod-category" placeholder="e.g. Laptops, Accessories" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                        </div>
                        <div style="display: flex; gap: 16px;">
                            <div style="flex:1;">
                                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Price ($) *</label>
                                <input type="number" step="0.01" min="0" id="prod-price" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                            </div>
                            <div style="flex:1;">
                                <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Stock *</label>
                                <input type="number" id="prod-stock" min="0" required style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                            </div>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; color:#aeb8d2;">Status</label>
                            <select id="prod-status" style="width: 100%; padding: 8px; background: #0a0e1a; border: 1px solid rgba(183,202,255,0.12); color: white; border-radius: 4px;">
                                <option value="active">Active</option>
                                <option value="draft">Draft</option>
                                <option value="out_of_stock">Out of Stock</option>
                            </select>
                        </div>
                        <button type="submit" id="save-prod-btn" style="background: #55dcff; color: #0a0e1a; border: none; padding: 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: 8px;">Save Product</button>
                    </form>
                </div>
            </div>
        </div>
    `;

    const tbody = document.getElementById('products-tbody');
    const searchInput = document.getElementById('prod-search');
    const statusFilter = document.getElementById('prod-status-filter');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    const PAGE_SIZE = 10;
    let pageSnapshots = [];
    let currentPage = 0;
    let allLoadedProducts = [];
    let currentFiltered = [];

    async function loadProducts() {
        try {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center;">Loading...</td></tr>';
            
            let q;
            if (currentPage === 0) {
                q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
            } else {
                const lastDoc = pageSnapshots[currentPage - 1];
                q = query(collection(db, 'products'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(PAGE_SIZE));
            }
            
            const snapshot = await getDocs(q);
            allLoadedProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (snapshot.docs.length > 0) {
                pageSnapshots[currentPage] = snapshot.docs[snapshot.docs.length - 1];
            }
            
            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = snapshot.docs.length < PAGE_SIZE;
            pageInfo.innerText = \`Page \${currentPage + 1}\`;
            
            applyFilter();
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center; color: #ff758f;">Error loading products</td></tr>';
        }
    }

    function applyFilter() {
        const searchVal = searchInput.value.toLowerCase().trim();
        const statVal = statusFilter.value;
        
        currentFiltered = allLoadedProducts;
        if (statVal) {
            currentFiltered = currentFiltered.filter(p => p.status === statVal);
        }
        if (searchVal) {
            currentFiltered = currentFiltered.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchVal)) || 
                (p.category && p.category.toLowerCase().includes(searchVal))
            );
        }
        
        renderTable();
    }

    function renderTable() {
        if (currentFiltered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 16px; text-align: center;">No products found</td></tr>';
            return;
        }

        tbody.innerHTML = currentFiltered.map(data => {
            let statusBadge = '';
            if (data.status === 'active') statusBadge = '<span style="background: rgba(100,223,172,0.1); color: #4ade80; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Active</span>';
            else if (data.status === 'out_of_stock') statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Out of Stock</span>';
            else statusBadge = '<span style="background: rgba(174,184,210,0.1); color: #aeb8d2; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">Draft</span>';

            const imgHtml = data.imageUrl 
                ? \`<img src="\${escapeHTML(data.imageUrl)}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid var(--line);">\` 
                : \`<div style="width:40px; height:40px; background:var(--line); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:0.7em;">No Img</div>\`;

            return \`
                <tr style="border-bottom: 1px solid rgba(183,202,255,0.05);">
                    <td style="padding: 12px 16px;">\${imgHtml}</td>
                    <td style="padding: 12px 16px; font-weight: bold;">\${escapeHTML(data.name || 'Unnamed')}</td>
                    <td style="padding: 12px 16px; color: var(--muted);">\${escapeHTML(data.category || '—')}</td>
                    <td style="padding: 12px 16px;">$\${Number(data.price || 0).toFixed(2)}</td>
                    <td style="padding: 12px 16px;">\${escapeHTML(data.stock || 0)}</td>
                    <td style="padding: 12px 16px;">\${statusBadge}</td>
                    <td style="padding: 12px 16px; display: flex; gap: 8px;">
                        <button class="btn edit-prod" data-id="\${escapeHTML(data.id)}" style="background: var(--line); padding: 6px 12px; font-size: 0.8rem; cursor: pointer; color:#f4f7ff; border:none; border-radius:4px;">Edit</button>
                        <button class="btn delete-prod" data-id="\${escapeHTML(data.id)}" style="background: rgba(255,117,143,0.1); border: 1px solid rgba(255,117,143,0.3); color: #ff758f; cursor: pointer; padding: 6px 12px; font-size: 0.8rem; border-radius:4px;" title="Delete">Delete</button>
                    </td>
                </tr>
            \`;
        }).join('');

        attachRowEvents();
    }

    function attachRowEvents() {
        document.querySelectorAll('.delete-prod').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if(!confirm('Delete this product permanently?')) return;
                try {
                    e.target.disabled = true;
                    e.target.innerText = '...';
                    const docSnap = await getDoc(doc(db, 'products', id));
                    if (docSnap.exists() && docSnap.data().imageUrl) {
                        const url = docSnap.data().imageUrl;
                        if (url.includes('/public/')) {
                            const objectKey = 'public/' + url.split('/public/')[1];
                            await deleteB2Object(objectKey).catch(e => console.warn('B2 delete error:', e));
                        }
                    }
                    await deleteDoc(doc(db, 'products', id));
                    loadProducts();
                } catch(err) {
                    alert('Error deleting: ' + err.message);
                    e.target.disabled = false;
                    e.target.innerText = 'Delete';
                }
            });
        });

        document.querySelectorAll('.edit-prod').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const product = currentFiltered.find(p => p.id === id);
                if(product) {
                    document.getElementById('prod-id').value = product.id;
                    document.getElementById('prod-name').value = product.name || '';
                    document.getElementById('prod-category').value = product.category || '';
                    document.getElementById('prod-price').value = product.price || 0;
                    document.getElementById('prod-stock').value = product.stock || 0;
                    document.getElementById('prod-status').value = product.status || 'active';
                    document.getElementById('prod-image-url').value = product.imageUrl || '';
                    document.getElementById('prod-image-file').value = '';
                    
                    const previewContainer = document.getElementById('img-preview-container');
                    if (product.imageUrl) {
                        document.getElementById('img-preview').src = product.imageUrl;
                        previewContainer.style.display = 'block';
                    } else {
                        previewContainer.style.display = 'none';
                    }
                    
                    document.getElementById('prod-modal').style.display = 'block';
                }
            });
        });
    }

    document.getElementById('add-prod-btn').addEventListener('click', () => {
        document.getElementById('prod-form').reset();
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-image-url').value = '';
        document.getElementById('img-preview-container').style.display = 'none';
        document.getElementById('prod-modal').style.display = 'block';
    });

    document.getElementById('close-prod-modal').addEventListener('click', () => {
        document.getElementById('prod-modal').style.display = 'none';
    });
    
    document.getElementById('prod-search').addEventListener('input', applyFilter);
    document.getElementById('prod-status-filter').addEventListener('change', applyFilter);

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadProducts();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (pageSnapshots[currentPage]) {
            currentPage++;
            loadProducts();
        }
    });

    document.getElementById('prod-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-prod-btn');
        btn.disabled = true;
        btn.innerText = 'Saving...';

        try {
            const id = document.getElementById('prod-id').value;
            const name = document.getElementById('prod-name').value;
            const category = document.getElementById('prod-category').value;
            const price = Number(document.getElementById('prod-price').value);
            const stock = Number(document.getElementById('prod-stock').value);
            const status = document.getElementById('prod-status').value;
            let imageUrl = document.getElementById('prod-image-url').value;
            const fileInput = document.getElementById('prod-image-file');

            if (price < 0 || stock < 0) {
                throw new Error("Price and stock cannot be negative.");
            }

            // Upload image if selected
            if (fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const uploadResult = await SystemUploader.upload(file, 'public'); // Public images for products
                imageUrl = uploadResult.url;
            }

            const data = {
                name,
                category,
                price,
                stock,
                status,
                imageUrl,
                updatedAt: serverTimestamp()
            };

            if(id) {
                await updateDoc(doc(db, 'products', id), data);
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'products'), data);
            }
            
            document.getElementById('prod-modal').style.display = 'none';
            loadProducts();
        } catch(err) {
            console.error(err);
            alert('Error saving product: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Save Product';
        }
    });

    loadProducts();
}
