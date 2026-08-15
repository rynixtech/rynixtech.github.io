import { db } from '../admin-firebase.js';
import { collection, query, orderBy, limit, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

export async function render(container) {
    container.innerHTML = `
        <div class="header">
            <h2>Orders</h2>
            <div class="stats" id="order-stats">Loading stats...</div>
        </div>
        <div class="controls">
            <input type="text" id="order-search" placeholder="Search by ID or Email..." />
            <select id="status-filter">
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
        <div class="table-container">
            <table id="orders-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Summary</th>
                        <th>Amount</th>
                        <th>Payment Status</th>
                        <th>Order Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="orders-tbody"></tbody>
            </table>
        </div>
    `;

    const tbody = document.getElementById('orders-tbody');
    
    async function loadOrders() {
        const q = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        
        tbody.innerHTML = '';
        let stats = { total: 0, pending: 0, delivered: 0 };
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            stats.total++;
            if (data.status) stats[data.status] = (stats[data.status] || 0) + 1;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${docSnap.id.substring(0, 8)}...</td>
                <td>${data.customerName || 'N/A'}<br><small>${data.customerEmail || ''}</small></td>
                <td>${(data.products || []).length} items</td>
                <td>$${data.amount || 0}</td>
                <td><span class="badge payment-${data.paymentStatus || 'pending'}">${data.paymentStatus || 'pending'}</span></td>
                <td><span class="badge status-${data.status || 'pending'}">${data.status || 'pending'}</span></td>
                <td>${data.date ? new Date(data.date.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <select class="status-select" data-id="${docSnap.id}">
                        <option value="pending" ${data.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${data.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${data.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${data.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('order-stats').innerHTML = `
            <span class="badge">Total: ${stats.total}</span>
            <span class="badge status-pending">Pending: ${stats.pending || 0}</span>
            <span class="badge status-delivered">Delivered: ${stats.delivered || 0}</span>
        `;
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStatus = e.target.value;
                await updateDoc(doc(db, 'orders', id), { status: newStatus });
                await addDoc(collection(db, 'activityLog'), {
                    action: 'status-change',
                    resource: \`order ${id}\`,
                    details: \`Status changed to ${newStatus}\`,
                    timestamp: serverTimestamp()
                });
                loadOrders();
            });
        });
    }

    loadOrders();
}
