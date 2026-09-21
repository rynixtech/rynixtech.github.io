import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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
    const grid = document.getElementById('product-grid');
    const loading = document.getElementById('loading-state');
    const searchInput = document.getElementById('store-search');
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartPanel = document.getElementById('cart-panel');
    const cartOverlay = document.getElementById('cart-overlay');
    const checkoutButton = document.getElementById('checkout-button');
    const cartButton = document.getElementById('cart-button');
    const cartClose = document.getElementById('cart-close');
    let currentUser = null;
    
    let allProducts = [];
    let cart = getCart();

    function getCart() {
        try { return JSON.parse(localStorage.getItem('rynix_cart') || '[]'); }
        catch { return []; }
    }

    function saveCart() {
        localStorage.setItem('rynix_cart', JSON.stringify(cart));
        renderCart();
    }

    function openCart() {
        cartPanel?.classList.add('is-open');
        cartOverlay?.classList.add('is-open');
        cartPanel?.setAttribute('aria-hidden', 'false');
    }

    function closeCart() {
        cartPanel?.classList.remove('is-open');
        cartOverlay?.classList.remove('is-open');
        cartPanel?.setAttribute('aria-hidden', 'true');
    }

    function renderCart() {
        const quantity = cart.reduce((sum, item) => sum + item.quantity, 0);
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (cartCount) {
            cartCount.textContent = quantity;
            cartCount.hidden = quantity === 0;
        }
        if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
        if (!cartItems) return;
        if (!cart.length) {
            cartItems.innerHTML = '<p class="cart-empty">Your cart is ready when you are.</p>';
            if (checkoutButton) checkoutButton.disabled = true;
            return;
        }
        if (checkoutButton) checkoutButton.disabled = false;
        cartItems.innerHTML = cart.map(item => `
          <article class="cart-item">
            <div class="cart-item-info"><strong>${escapeHTML(item.name)}</strong><span>$${item.price.toFixed(2)} each</span></div>
            <div class="cart-item-controls">
              <button type="button" data-cart-action="decrease" data-id="${escapeHTML(item.id)}" aria-label="Decrease quantity">−</button>
              <b>${item.quantity}</b>
              <button type="button" data-cart-action="increase" data-id="${escapeHTML(item.id)}" aria-label="Increase quantity">+</button>
              <button type="button" class="cart-remove" data-cart-action="remove" data-id="${escapeHTML(item.id)}">Remove</button>
            </div>
          </article>`).join('');
    }

    function addToCart(productId) {
        const product = allProducts.find(item => item.id === productId);
        if (!product) return;
        const stock = Number(product.stock) || 0;
        const existing = cart.find(item => item.id === productId);
        if (existing) {
            if (existing.quantity >= stock) return showNotice(`Only ${stock} available for ${product.name}.`);
            existing.quantity += 1;
        } else {
            cart.push({ id: product.id, name: product.name || 'Product', price: Number(product.price || 0), quantity: 1 });
        }
        saveCart();
        showNotice(`${product.name || 'Product'} added to cart.`);
    }

    function updateCart(productId, action) {
        const item = cart.find(cartItem => cartItem.id === productId);
        if (!item) return;
        if (action === 'increase') item.quantity += 1;
        if (action === 'decrease') item.quantity -= 1;
        if (action === 'remove' || item.quantity <= 0) cart = cart.filter(cartItem => cartItem.id !== productId);
        saveCart();
    }

    function showNotice(message) {
        const notice = document.getElementById('cart-notice');
        if (!notice) return;
        notice.textContent = message;
        notice.classList.add('is-visible');
        window.clearTimeout(showNotice.timeout);
        showNotice.timeout = window.setTimeout(() => notice.classList.remove('is-visible'), 2600);
    }

    async function checkout() {
        if (!cart.length) return;
        if (!currentUser) {
            sessionStorage.setItem('rynix_return_to', 'shopping.html');
            window.location.href = 'login.html';
            return;
        }
        checkoutButton.disabled = true;
        checkoutButton.textContent = 'Creating order…';
        try {
            const amount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
            await addDoc(collection(db, 'orders'), {
                userId: currentUser.uid,
                items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
                amount: Number(amount.toFixed(2)),
                status: 'pending',
                createdAt: serverTimestamp()
            });
            cart = [];
            saveCart();
            closeCart();
            showNotice('Order created. You can track it in your account.');
        } catch (error) {
            console.error('Unable to create order:', error);
            showNotice('Could not create your order. Please try again.');
        } finally {
            checkoutButton.textContent = 'Place order';
            checkoutButton.disabled = cart.length === 0;
        }
    }

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

    grid?.addEventListener('click', event => {
        const button = event.target.closest('.btn-cart');
        if (button && !button.disabled) addToCart(button.dataset.id);
    });

    cartItems?.addEventListener('click', event => {
        const button = event.target.closest('[data-cart-action]');
        if (button) updateCart(button.dataset.id, button.dataset.cartAction);
    });

    cartButton?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);
    checkoutButton?.addEventListener('click', checkout);
    onAuthStateChanged(auth, user => { currentUser = user; });

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

    renderCart();
    await loadProducts();
}

document.addEventListener('DOMContentLoaded', initShop);
