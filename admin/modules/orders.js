import { db , escapeHTML, httpsCallable } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, startAfter, where } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header" style="display: flex; justify-content: space-between; align-items: center;">
            <h2>Orders</h2>
            <div class="stats" id="order-stats" style="color: var(--muted);">Loading stats...</div>
        </div>
        <div class="controls" style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="order-search" placeholder="Search by ID or Email (local)..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: rgba(0,0,0,0.2); color: var(--text);" />
            <select id="status-filter" style="padding: 10px; border-radius: 8px; border: 1px solid var(--line); background: rgba(0,0,0,0.2); color: var(--text);">
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
            </select>
        </div>
        <div class="table-container" style="background: rgba(11, 16, 35, 0.82); border-radius: 12px; border: 1px solid var(--line); overflow-x: auto;">
            <table id="orders-table" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--line); background: rgba(255,255,255,0.02);">
                        <th style="padding: 12px 16px;">Order ID</th>
                        <th style="padding: 12px 16px;">Customer</th>
                        <th style="padding: 12px 16px;">Items</th>
                        <th style="padding: 12px 16px;">Total</th>
                        <th style="padding: 12px 16px;">Date</th>
                        <th style="padding: 12px 16px;">Status</th>
                        <th style="padding: 12px 16px;">Update</th>
                        <th style="padding: 12px 16px;">Details</th>
                    </tr>
                </thead>
                <tbody id="orders-tbody"></tbody>
            </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
            <button id="prev-page" class="btn btn-quiet" disabled>← Previous</button>
            <span id="page-info" style="color: var(--muted);">Page 1</span>
            <button id="next-page" class="btn btn-primary" disabled>Next →</button>
        </div>

        <div id="order-modal" class="modal" style="display:none; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
            <div class="modal-content" style="background: #0f1425; padding: 30px; border-radius: 12px; width: 600px; max-width: 90%; border: 1px solid var(--line); max-height: 80vh; overflow-y: auto;">
                <h3 style="margin-top: 0; color: var(--gold-soft);">Order Details</h3>
                <div id="order-details-body" style="color: #f4f7ff; line-height: 1.6; margin-bottom: 20px;"></div>
                <div style="display: flex; justify-content: flex-end;">
                    <button id="close-modal" class="btn btn-quiet">Close</button>
                </div>
            </div>
        </div>
    `;

    const tbody = document.getElementById('orders-tbody');
    const searchInput = document.getElementById('order-search');
    const statusFilter = document.getElementById('status-filter');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    const updateOrderStatus = httpsCallable(null, 'updateOrderStatus');
    
    let allLoadedOrders = []; 
    let currentFiltered = [];
    
    // Firestore Pagination
    const PAGE_SIZE = 15;
    let pageSnapshots = []; // Stores the last document of each page. Index 0 = page 1's last doc.
    let currentPage = 0;
    
    async function fetchOrdersForPage() {
        try {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center;">Loading orders...</td></tr>';
            let q;
            const filterVal = statusFilter.value;
            
            let baseConstraints = [];
            if (filterVal) {
                baseConstraints.push(where("status", "==", filterVal));
            }
            
            // Note: If using where + orderBy, it requires an index. 
            // In a real prod environment we'd need a composite index on status + date.
            // Assuming index exists or we just rely on date desc if no filter.
            if (filterVal) {
                // If it fails due to missing index, it will throw.
                baseConstraints.push(orderBy('date', 'desc'));
            } else {
                baseConstraints.push(orderBy('date', 'desc'));
            }

            if (currentPage === 0) {
                q = query(collection(db, 'orders'), ...baseConstraints, limit(PAGE_SIZE));
            } else {
                const lastDoc = pageSnapshots[currentPage - 1];
                q = query(collection(db, 'orders'), ...baseConstraints, startAfter(lastDoc), limit(PAGE_SIZE));
            }

            const snapshot = await getDocs(q);
            
            allLoadedOrders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            if (snapshot.docs.length > 0) {
                pageSnapshots[currentPage] = snapshot.docs[snapshot.docs.length - 1];
            }
            
            prevBtn.disabled = currentPage === 0;
            nextBtn.disabled = snapshot.docs.length < PAGE_SIZE;
            pageInfo.innerText = \`Page \${currentPage + 1}\`;
            
            applyLocalFilter();
        } catch (error) {
            console.error(error);
            tbody.innerHTML = \`<tr><td colspan="8" style="padding:20px; text-align:center; color:#ff758f;">Error: \${escapeHTML(error.message)}. You may need to create a Firestore composite index.</td></tr>\`;
        }
    }

    function applyLocalFilter() {
        const searchVal = searchInput.value.toLowerCase().trim();
        if (!searchVal) {
            currentFiltered = allLoadedOrders;
        } else {
            currentFiltered = allLoadedOrders.filter(o => 
                (o.id && o.id.toLowerCase().includes(searchVal)) ||
                (o.customerEmail && o.customerEmail.toLowerCase().includes(searchVal)) ||
                (o.customerName && o.customerName.toLowerCase().includes(searchVal))
            );
        }
        renderTable();
    }

    function renderTable() {
        tbody.innerHTML = '';
        if (currentFiltered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:20px; text-align:center;">No orders found on this page.</td></tr>';
            return;
        }
        
        currentFiltered.forEach(data => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            const orderDate = data.date ? (data.date.toDate ? new Date(data.date.toDate()) : new Date(data.date)) : null;
            const itemsCount = Array.isArray(data.items) ? data.items.length : (Array.isArray(data.products) ? data.products.length : 0);
            
            tr.innerHTML = \`
                <td style="padding: 12px 16px; font-family: monospace;">\${escapeHTML(data.id.substring(0, 8))}</td>
                <td style="padding: 12px 16px;">
                    \${escapeHTML(data.customerName || 'N/A')}<br>
                    <small style="color:var(--muted);">\${escapeHTML(data.customerEmail || '')}</small>
                </td>
                <td style="padding: 12px 16px;">\${itemsCount} items</td>
                <td style="padding: 12px 16px; font-weight:bold;">$\${escapeHTML(data.amount || data.total || 0)}</td>
                <td style="padding: 12px 16px; font-size: 0.9rem;">\${orderDate ? orderDate.toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 12px 16px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; background: rgba(255,255,255,0.1);">\${escapeHTML(data.status || 'pending')}</span>
                </td>
                <td style="padding: 12px 16px;">
                    <select class="status-select" data-id="\${escapeHTML(data.id)}" data-current="\${escapeHTML(data.status || 'pending')}" style="padding: 4px; background: rgba(0,0,0,0.3); color: #f4f7ff; border: 1px solid var(--line); border-radius: 4px;">
                        <option value="pending" \${data.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" \${data.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" \${data.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" \${data.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" \${data.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        <option value="refunded" \${data.status === 'refunded' ? 'selected' : ''}>Refunded</option>
                    </select>
                </td>
                <td style="padding: 12px 16px;">
                    <button class="btn view-order" data-id="\${escapeHTML(data.id)}" style="padding: 6px 12px; font-size: 0.8rem; background: var(--line);">Details</button>
                </td>
            \`;
            tbody.appendChild(tr);
        });

        attachRowEvents();
    }

    function attachRowEvents() {
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const oldStatus = e.target.getAttribute('data-current');
                const newStatus = e.target.value;
                
                if (oldStatus === newStatus) return;
                
                const isDestructive = newStatus === 'cancelled' || newStatus === 'refunded';
                if (!confirm(\`Are you sure you want to change order \${id.substring(0,8)} from \${oldStatus} to \${newStatus}?\${isDestructive ? ' This will restore inventory.' : ''}\`)) {
                    e.target.value = oldStatus;
                    return;
                }
                
                try {
                    e.target.disabled = true;
                    // Call backend to ensure atomic inventory deduction and safe status update
                    const res = await updateOrderStatus({ orderId: id, newStatus });
                    alert('Order updated successfully.');
                    await fetchOrdersForPage();
                } catch(err) {
                    alert('Failed to update order: ' + err.message);
                    e.target.value = oldStatus;
                    e.target.disabled = false;
                }
            });
        });

        document.querySelectorAll('.view-order').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const order = currentFiltered.find(o => o.id === id);
                if(!order) return;
                
                const orderDate = order.date ? (order.date.toDate ? new Date(order.date.toDate()) : new Date(order.date)) : null;
                const items = Array.isArray(order.items) ? order.items : (Array.isArray(order.products) ? order.products : []);
                
                let itemsHtml = '<ul style="list-style:none; padding:0;">';
                items.forEach(item => {
                    itemsHtml += \`<li style="padding: 10px; background: rgba(0,0,0,0.2); margin-bottom: 5px; border-radius: 6px; display:flex; justify-content:space-between;">
                        <span>\${escapeHTML(item.name || item.productId || 'Unknown Item')} (x\${item.quantity || 1})</span>
                        <span>$\${escapeHTML(item.price || 0)}</span>
                    </li>\`;
                });
                itemsHtml += '</ul>';

                document.getElementById('order-details-body').innerHTML = \`
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">Order ID:</strong> \${escapeHTML(order.id)}</p>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">Date:</strong> \${orderDate ? orderDate.toLocaleString() : 'N/A'}</p>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">Status:</strong> \${escapeHTML(order.status || 'pending').toUpperCase()}</p>
                        </div>
                        <div>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">Customer:</strong> \${escapeHTML(order.customerName || 'N/A')}</p>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">Email:</strong> \${escapeHTML(order.customerEmail || 'N/A')}</p>
                            <p style="margin:5px 0;"><strong style="color:var(--muted);">UID:</strong> \${escapeHTML(order.userId || 'N/A')}</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <h4 style="color:var(--gold-soft); margin-bottom:10px;">Order Items</h4>
                        \${itemsHtml}
                    </div>
                    <div style="text-align: right; font-size: 1.2rem;">
                        <strong>Total: $\${escapeHTML(order.amount || order.total || 0)}</strong>
                    </div>
                \`;
                document.getElementById('order-modal').style.display = 'flex';
            });
        });
    }

    searchInput.addEventListener('input', applyLocalFilter);
    
    statusFilter.addEventListener('change', () => {
        currentPage = 0;
        pageSnapshots = [];
        fetchOrdersForPage();
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            fetchOrdersForPage();
        }
    });

    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchOrdersForPage();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('order-modal').style.display = 'none';
    });
    
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-modal') e.target.style.display = 'none';
    });

    fetchOrdersForPage();
}
