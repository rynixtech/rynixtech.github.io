import { db, escapeHTML } from '../admin-firebase.js';
import { collection, query, orderBy, getDocs, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="module-container" style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Inventory Management</h2>
                <button id="refresh-inventory" style="background: #55dcff; color: #0a0e1a; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">↻ Refresh</button>
            </div>
            
            <div style="background: rgba(11, 16, 35, 0.82); border-radius: 12px; border: 1px solid var(--line); overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.02);">
                            <th style="padding: 12px 16px;">Product Name</th>
                            <th style="padding: 12px 16px;">Category</th>
                            <th style="padding: 12px 16px;">Current Stock</th>
                            <th style="padding: 12px 16px;">Status</th>
                            <th style="padding: 12px 16px; text-align: right;">Update Stock</th>
                        </tr>
                    </thead>
                    <tbody id="inventory-tbody">
                        <tr><td colspan="5" style="padding:20px; text-align:center;">Loading inventory...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    async function loadInventory() {
        const tbody = document.getElementById('inventory-tbody');
        if(!tbody) return;
        
        try {
            const q = query(collection(db, 'products'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">No products found in the database.</td></tr>';
                return;
            }

            tbody.innerHTML = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const stock = Number(data.stock) || 0;
                
                let statusBadge = '';
                if (stock === 0 || data.status === 'out_of_stock') {
                    statusBadge = '<span style="background: rgba(255,117,143,0.1); color: #ff758f; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">Out of Stock</span>';
                } else if (stock <= 5) {
                    statusBadge = '<span style="background: rgba(255,193,7,0.1); color: #ffc107; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">Low Stock</span>';
                } else {
                    statusBadge = '<span style="background: rgba(100,223,172,0.1); color: #64dfac; padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">In Stock</span>';
                }

                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 12px 16px; font-weight: 500;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                ${data.imageUrl ? `<img src="${escapeHTML(data.imageUrl)}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">` : `<div style="width:40px; height:40px; background:rgba(255,255,255,0.1); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:20px;">📦</div>`}
                                <span>${escapeHTML(data.name || 'Unnamed')}</span>
                            </div>
                        </td>
                        <td style="padding: 12px 16px; color: var(--muted);">${escapeHTML(data.category || 'N/A')}</td>
                        <td style="padding: 12px 16px; font-size: 1.1em; font-weight: bold; color: ${stock <= 5 ? '#ffc107' : '#f4f7ff'};">${stock}</td>
                        <td style="padding: 12px 16px;">${statusBadge}</td>
                        <td style="padding: 12px 16px; text-align: right;">
                            <div style="display: flex; gap: 5px; justify-content: flex-end;">
                                <input type="number" id="stock-input-${escapeHTML(docSnap.id)}" value="${stock}" min="0" style="width: 70px; padding: 6px; border-radius: 4px; border: 1px solid var(--line); background: rgba(0,0,0,0.3); color: #fff;">
                                <button class="btn-update-stock" data-id="${escapeHTML(docSnap.id)}" style="background: rgba(85,220,255,0.1); color: #55dcff; border: 1px solid rgba(85,220,255,0.2); padding: 6px 12px; border-radius: 4px; cursor: pointer;">Save</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            document.querySelectorAll('.btn-update-stock').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    const input = document.getElementById(`stock-input-${id}`);
                    const newStock = Number(input.value);
                    
                    if (newStock < 0) {
                        alert("Stock cannot be negative.");
                        return;
                    }
                    
                    try {
                        e.target.textContent = '...';
                        e.target.disabled = true;
                        
                        let updateData = { stock: newStock };
                        if (newStock === 0) {
                            updateData.status = 'out_of_stock';
                        } else if (newStock > 0) {
                            updateData.status = 'active';
                        }
                        
                        await updateDoc(doc(db, 'products', id), updateData);
                        
                        e.target.style.background = 'rgba(100,223,172,0.2)';
                        e.target.style.color = '#64dfac';
                        e.target.textContent = 'Saved!';
                        
                        setTimeout(() => {
                            loadInventory();
                        }, 1000);
                        
                    } catch (err) {
                        console.error(err);
                        alert("Failed to update stock: " + err.message);
                        e.target.textContent = 'Save';
                        e.target.disabled = false;
                    }
                });
            });

        } catch (e) {
            console.error(e);
            tbody.innerHTML = `<tr><td colspan="5" style="padding:20px; text-align:center; color:#ff758f;">Error: ${escapeHTML(e.message)}</td></tr>`;
        }
    }

    document.getElementById('refresh-inventory').addEventListener('click', loadInventory);
    loadInventory();
}
