import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

async function fetchConfig() {
    try {
        const res = await fetch('https://rynixtech-control-center-worker.rynixtech.workers.dev/api/client-config');
        if(!res.ok) throw new Error('Failed to fetch config');
        return await res.json();
    } catch(e) {
        console.error("Using fallback config", e);
        return {
            projectId: "rynixtech-e0281",
            databaseURL: "https://rynixtech-e0281-default-rtdb.firebaseio.com"
        };
    }
}

function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
}

async function initShop() {
    const config = await fetchConfig();
    const app = initializeApp(config);
    const db = getFirestore(app);

    const grid = document.getElementById('product-grid');
    const loading = document.getElementById('loading-state');
    const searchInput = document.getElementById('store-search');
    
    let allProducts = [];

    async function loadProducts() {
        try {
            const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            
            allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.status !== 'draft'); 
            
            renderProducts(allProducts);
        } catch (e) {
            console.error("Error loading products:", e);
            if(loading) loading.innerHTML = `<span style="color:#ff758f;">Failed to load catalog. Please try again later.</span>`;
        }
    }

    function renderProducts(productsToRender) {
        if(loading) loading.style.display = 'none';
        if(grid) {
            grid.style.display = 'grid';
            grid.innerHTML = '';
        }

        if (productsToRender.length === 0) {
            if(grid) {
                grid.style.display = 'block';
                grid.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--muted);">No products found.</div>';
            }
            return;
        }

        productsToRender.forEach(p => {
            const stock = Number(p.stock) || 0;
            const isOutOfStock = stock <= 0 || p.status === 'out_of_stock';
            
            const card = document.createElement('article');
            card.className = 'product-card';
            
            const imageHtml = p.imageUrl 
                ? `<img src="${escapeHTML(p.imageUrl)}" alt="${escapeHTML(p.name)}">`
                : `<div style="font-size:3rem;">📦</div>`;

            let badgeHtml = '';
            if (isOutOfStock) {
                badgeHtml = `<span class="stock-badge" style="color:#ff758f;">Out of Stock</span>`;
            } else if (stock <= 5) {
                badgeHtml = `<span class="stock-badge" style="color:#ffc107;">Only ${stock} left</span>`;
            } else {
                badgeHtml = `<span class="stock-badge" style="color:#64dfac;">In Stock</span>`;
            }

            card.innerHTML = `
                <div class="product-image">
                    ${imageHtml}
                </div>
                <div class="product-details">
                    <h3>${escapeHTML(p.name || 'Unnamed Product')}</h3>
                    <p class="desc">${escapeHTML(p.description || '')}</p>
                    <div class="price-row">
                        <span class="price">$${Number(p.price || 0).toFixed(2)}</span>
                        ${badgeHtml}
                    </div>
                    <button class="btn-cart" data-id="${escapeHTML(p.id)}" ${isOutOfStock ? 'disabled' : ''}>
                        ${isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
            `;
            if(grid) grid.appendChild(card);
        });
    }

    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase().trim();
            if (!val) {
                renderProducts(allProducts);
                return;
            }
            const filtered = allProducts.filter(p => 
                (p.name && p.name.toLowerCase().includes(val)) ||
                (p.description && p.description.toLowerCase().includes(val)) ||
                (p.category && p.category.toLowerCase().includes(val))
            );
            renderProducts(filtered);
        });
    }

    await loadProducts();
}

document.addEventListener('DOMContentLoaded', initShop);
