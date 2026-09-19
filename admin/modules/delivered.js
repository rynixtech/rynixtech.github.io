import { render as renderOrders } from './orders.js';

export async function render(container) {
    await renderOrders(container);
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.value = 'delivered';
        statusFilter.dispatchEvent(new Event('change'));
    }
}
