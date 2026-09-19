import { render as renderOrders } from './orders.js';

export async function render(container) {
    await renderOrders(container);
    
    const statusFilter = document.getElementById('status-filter');
    if (statusFilter) {
        statusFilter.value = 'refunded';
        statusFilter.dispatchEvent(new Event('change'));
    }
}
