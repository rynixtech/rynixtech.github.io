import { render as renderProducts } from './products.js';

export async function render(container) {
    await renderProducts(container);
    
    const searchInput = document.getElementById('prod-search');
    
    if (searchInput) {
        searchInput.value = 'digital';
        searchInput.dispatchEvent(new Event('input'));
    }
}
