import { render as renderProducts } from './products.js';

export async function render(container) {
    await renderProducts(container);
    
    // Find the category input and set it, then trigger search
    const categoryInput = document.getElementById('prod-category');
    const searchInput = document.getElementById('prod-search');
    
    if (searchInput) {
        searchInput.value = 'media';
        searchInput.dispatchEvent(new Event('input'));
    }
}
