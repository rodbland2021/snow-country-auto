// Snow Country Auto — Shop JS
(function() {
  'use strict';

  let products = [];
  let cart = JSON.parse(localStorage.getItem('sca-cart') || '[]');
  let activeCategory = 'all';

  // --- Init ---
  async function init() {
    try {
      const res = await fetch('products.json');
      products = await res.json();
    } catch (e) {
      console.error('Failed to load products:', e);
      products = [];
    }
    buildFilterPills();
    renderProducts();
    renderCart();
    updateCartCount();

    document.getElementById('shopSearch').addEventListener('input', renderProducts);
  }

  // --- Filter pills ---
  function buildFilterPills() {
    const cats = [...new Set(products.map(p => p.category))];
    const container = document.getElementById('filterPills');
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-pill';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        renderProducts();
      });
      container.appendChild(btn);
    });

    // Wire "All" button
    container.querySelector('[data-cat="all"]').addEventListener('click', () => {
      activeCategory = 'all';
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      container.querySelector('[data-cat="all"]').classList.add('active');
      renderProducts();
    });
  }

  // --- Render products ---
  function renderProducts() {
    const query = document.getElementById('shopSearch').value.toLowerCase().trim();
    const grid = document.getElementById('productGrid');
    const empty = document.getElementById('shopEmpty');

    let filtered = products;
    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (query) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      );
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';

    grid.innerHTML = filtered.map(p => {
      const stockBadge = p.stock > 10
        ? '<span class="badge badge-stock">In Stock</span>'
        : p.stock > 0
          ? '<span class="badge badge-low">Low Stock (' + p.stock + ')</span>'
          : '<span class="badge badge-out">Out of Stock</span>';
      const installBadge = p.installation
        ? '<span class="badge badge-install">🔧 Installation Available</span>'
        : '';

      return '<div class="product-card" onclick="openProduct(\'' + p.id + '\')">' +
        '<img class="product-image" src="' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy">' +
        '<div class="product-body">' +
          '<div class="product-brand">' + escapeHtml(p.brand) + '</div>' +
          '<div class="product-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="product-price">$' + p.price.toFixed(2) + ' <small>inc GST</small></div>' +
          '<div class="product-badges">' + stockBadge + installBadge + '</div>' +
          '<button class="product-add-btn" onclick="event.stopPropagation(); addToCart(\'' + p.id + '\');">' +
            (p.stock > 0 ? 'Add to Cart' : 'Out of Stock') +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  // --- Product modal ---
  window.openProduct = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('modalImage').src = p.image;
    document.getElementById('modalBrand').textContent = p.brand;
    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalDesc').textContent = p.description;

    const specs = p.specs.split(' | ').map(s => '<span>' + escapeHtml(s) + '</span>').join('');
    document.getElementById('modalSpecs').innerHTML = specs;

    document.getElementById('modalPrice').textContent = '$' + p.price.toFixed(2);

    let badges = '';
    if (p.stock > 10) badges += '<span class="badge badge-stock">In Stock</span> ';
    else if (p.stock > 0) badges += '<span class="badge badge-low">Low Stock (' + p.stock + ')</span> ';
    else badges += '<span class="badge badge-out">Out of Stock</span> ';
    if (p.installation) badges += '<span class="badge badge-install">🔧 Installation Available</span>';
    document.getElementById('modalBadges').innerHTML = badges;

    const btn = document.getElementById('modalAddBtn');
    btn.textContent = p.stock > 0 ? 'Add to Cart' : 'Out of Stock';
    btn.disabled = p.stock <= 0;
    btn.onclick = function() { addToCart(p.id); closeModal(); };

    document.getElementById('productModal').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function() {
    document.getElementById('productModal').classList.remove('open');
    document.body.style.overflow = '';
  };

  // Close modal on overlay click
  document.getElementById('productModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // --- Cart ---
  window.addToCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p || p.stock <= 0) return;

    const existing = cart.find(c => c.id === id);
    if (existing) {
      existing.qty = Math.min(existing.qty + 1, p.stock);
    } else {
      cart.push({ id: id, qty: 1 });
    }
    saveCart();
    renderCart();
    updateCartCount();
    showCartDrawer();
  };

  function removeFromCart(id) {
    cart = cart.filter(c => c.id !== id);
    saveCart();
    renderCart();
    updateCartCount();
  }

  function updateQty(id, delta) {
    const item = cart.find(c => c.id === id);
    if (!item) return;
    const p = products.find(x => x.id === id);
    item.qty = Math.max(1, Math.min(item.qty + delta, p ? p.stock : 99));
    saveCart();
    renderCart();
    updateCartCount();
  }

  function saveCart() {
    localStorage.setItem('sca-cart', JSON.stringify(cart));
  }

  function updateCartCount() {
    const count = cart.reduce((sum, c) => sum + c.qty, 0);
    document.getElementById('cartCount').textContent = count > 0 ? count : '';
  }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');

    if (cart.length === 0) {
      container.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>';
      footer.style.display = 'none';
      return;
    }

    footer.style.display = 'block';
    let totalInc = 0;

    container.innerHTML = cart.map(c => {
      const p = products.find(x => x.id === c.id);
      if (!p) return '';
      const lineTotal = p.price * c.qty;
      totalInc += lineTotal;

      return '<div class="cart-item">' +
        '<img class="cart-item-img" src="' + p.image + '" alt="">' +
        '<div>' +
          '<div class="cart-item-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="cart-item-price">$' + lineTotal.toFixed(2) + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div class="cart-item-qty">' +
            '<button class="cart-qty-btn" onclick="window._updateQty(\'' + c.id + '\', -1)">−</button>' +
            '<span class="cart-qty-num">' + c.qty + '</span>' +
            '<button class="cart-qty-btn" onclick="window._updateQty(\'' + c.id + '\', 1)">+</button>' +
          '</div>' +
          '<button class="cart-item-remove" onclick="window._removeFromCart(\'' + c.id + '\')">Remove</button>' +
        '</div>' +
      '</div>';
    }).join('');

    const gst = totalInc / 11;
    const subtotalExGst = totalInc - gst;

    document.getElementById('cartSubtotal').textContent = '$' + subtotalExGst.toFixed(2);
    document.getElementById('cartGST').textContent = '$' + gst.toFixed(2);
    document.getElementById('cartTotal').textContent = '$' + totalInc.toFixed(2);
  }

  // Expose cart functions to onclick handlers
  window._updateQty = updateQty;
  window._removeFromCart = removeFromCart;

  // --- Cart drawer toggle ---
  window.toggleCart = function(e) {
    if (e) e.preventDefault();
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartOverlay');
    const isOpen = drawer.classList.contains('open');
    drawer.classList.toggle('open');
    overlay.classList.toggle('open');
    document.body.style.overflow = isOpen ? '' : 'hidden';
  };

  function showCartDrawer() {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer.classList.contains('open')) {
      drawer.classList.add('open');
      document.getElementById('cartOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  // --- Checkout ---
  window.checkout = function() {
    // Phase 2: this will call Cloudflare Worker → Stripe Checkout
    // For now, show a placeholder message
    alert('Checkout coming soon! For now, please call us on 02 6456 2170 or visit the workshop to complete your purchase.');
  };

  // --- Helpers ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // --- Keyboard ---
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
      if (document.getElementById('cartDrawer').classList.contains('open')) {
        toggleCart();
      }
    }
  });

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
