/**
 * Product details page.
 */

const productId = new URLSearchParams(window.location.search).get("id");
const contentEl = document.getElementById("productDetailContent");
const breadcrumbEl = document.getElementById("breadcrumbProductName");

(async function init() {
  await loadCatalogCache();
  const product = getProductById(productId);

  if (!product) {
    contentEl.innerHTML = `
      <div class="product-detail-card text-center">
        <p class="mb-3">This product could not be found.</p>
        <a href="products.html" class="btn btn-amson">Back to All Products</a>
      </div>
    `;
    return;
  }

  document.title = `${product.name} | Amson Pharmaceuticals`;
  breadcrumbEl.textContent = product.name;

  contentEl.innerHTML = `
    <div class="product-detail-card">
      <div class="row g-4">
        <div class="col-lg-5">
          <div class="product-detail-image" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}'); background-size:cover; background-position:center;"` : ""}></div>
        </div>
        <div class="col-lg-7">
          <h1 class="h3 fw-bold mb-1">${product.name}</h1>
          ${product.genericName ? `<p class="text-muted mb-3">Generic Name: ${product.genericName}</p>` : ""}
          <p class="product-detail-price mb-2">${formatPeso(product.price)}</p>
          <div class="d-flex align-items-center gap-3 mb-4 flex-wrap">
            <p class="stock-badge ${product.inStock ? "in-stock" : "out-of-stock"} mb-0">
              <i class="bi ${product.inStock ? "bi-box-seam" : "bi-x-circle"}"></i>
              ${product.inStock ? `In Stock (${product.totalStock} available)` : "Out of Stock"}
            </p>
            ${product.rxRequired ? `<p class="stock-badge out-of-stock mb-0"><i class="bi bi-file-medical"></i> Prescription Required</p>` : ""}
          </div>

          <label class="form-label d-block">Quantity</label>
          <div class="d-flex align-items-center gap-3 mb-4">
            <div class="qty-stepper">
              <button type="button" id="qtyMinus" aria-label="Decrease quantity">&minus;</button>
              <input type="text" id="qtyInput" value="1" inputmode="numeric">
              <button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>
            </div>
            <span class="text-muted">Subtotal: <strong id="subtotalText">${formatPeso(product.price)}</strong></span>
          </div>

          ${
            product.rxRequired
              ? `<p class="text-muted mb-3" style="font-size:0.85rem;">This medicine requires a valid prescription. You'll be asked to upload it at checkout.</p>`
              : ""
          }
          <button type="button" class="btn btn-amson w-100 py-2" id="addToCartBtn" ${product.inStock ? "" : "disabled"}>
            <i class="bi bi-cart3 me-2"></i>${product.inStock ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>

      <div class="product-about">
        <h2>About the Product</h2>
        <p class="mb-0">${product.description || "No description available yet."}</p>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById("qtyInput");
  const subtotalText = document.getElementById("subtotalText");
  const maxQty = Math.max(product.totalStock || 0, 0);

  function currentQty() {
    const val = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    return maxQty > 0 ? Math.min(val, maxQty) : val;
  }

  function updateSubtotal() {
    subtotalText.textContent = formatPeso(product.price * currentQty());
  }

  document.getElementById("qtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, currentQty() - 1);
    updateSubtotal();
  });

  document.getElementById("qtyPlus").addEventListener("click", () => {
    if (maxQty > 0 && currentQty() >= maxQty) {
      qtyInput.value = maxQty;
    } else {
      qtyInput.value = currentQty() + 1;
    }
    updateSubtotal();
  });

  qtyInput.addEventListener("input", () => {
    qtyInput.value = qtyInput.value.replace(/[^0-9]/g, "");
    updateSubtotal();
  });

  qtyInput.addEventListener("blur", () => {
    qtyInput.value = currentQty();
    updateSubtotal();
  });

  const addToCartBtn = document.getElementById("addToCartBtn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const result = addToCart(product.id, currentQty());
      if (result.capped && result.qty === 0) {
        showCartToast("Sorry, that item is out of stock.");
      } else if (result.capped) {
        showCartToast(`Only ${result.qty} in stock - your cart is now at the limit.`);
      } else {
        showCartToast(`Added ${currentQty()} × ${product.name} to cart.`);
      }
    });
  }
})();
