// product details page

const productId = new URLSearchParams(window.location.search).get("id");
const contentEl = document.getElementById("productDetailContent");
const breadcrumbEl = document.getElementById("breadcrumbProductName");

(async function init() {
  await loadCatalogCache();
  // only products that are in the online store
  const product = storefrontCatalog().find((p) => p.id === productId) || null;

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
          <div class="product-detail-image" ${product.imageUrl ? `style="background-image:url('${cloudinaryImageUrl(product.imageUrl, 800)}'); background-size:cover; background-position:center;"` : ""}></div>
        </div>
        <div class="col-lg-7">
          <h1 class="h3 fw-bold mb-1">${escapeHtml(product.name)}${rxTag(product)}</h1>
          ${product.genericName ? `<p class="text-muted mb-3">Generic Name: ${escapeHtml(product.genericName)}</p>` : ""}
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
              <input type="text" id="qtyInput" value="1" inputmode="numeric" aria-label="Quantity">
              <button type="button" id="qtyPlus" aria-label="Increase quantity">+</button>
            </div>
            <span class="text-muted">Subtotal: <strong id="subtotalText">${formatPeso(product.price)}</strong></span>
          </div>

          ${
            product.rxRequired
              ? `<p class="text-muted mb-3" style="font-size:0.85rem;">This medicine requires a valid prescription. You'll be asked to upload it at checkout.</p>`
              : ""
          }
          <div class="d-flex flex-column gap-2">
            <button type="button" class="btn btn-amson w-100 py-2" id="addToCartBtn" ${product.inStock ? "" : "disabled"}>
              <i class="bi bi-cart3 me-2"></i>${product.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
            ${
              product.inStock
                ? `<button type="button" class="btn btn-outline-dark-amson w-100 py-2" id="buyNowBtn">Buy Now</button>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="product-about">
        <h2>About the Product</h2>
        <p class="mb-0">${escapeHtml(product.description || "No description available yet.")}</p>
        ${product.dosageNotes ? `<h2 class="h6 fw-bold mt-3">Dosage / Usage</h2><p class="mb-0">${escapeHtml(product.dosageNotes)}</p>` : ""}
      </div>
    </div>
  `;

  wireProductBuyControls(product, {
    qty: "qtyInput",
    subtotal: "subtotalText",
    minus: "qtyMinus",
    plus: "qtyPlus",
    addToCart: "addToCartBtn",
    buyNow: "buyNowBtn",
  });
})();
