/**
 * Cart page.
 */

const cartHeading = document.getElementById("cartHeading");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartTotalText = document.getElementById("cartTotalText");
const clearCartLink = document.getElementById("clearCartLink");
const checkoutBtn = document.getElementById("checkoutBtn");

function renderCartPage() {
  const cart = getCart();
  const count = cartCount(cart);
  cartHeading.textContent = `Shopping Cart (${count})`;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="text-center py-4">
        <p class="text-muted mb-3">Your cart is empty.</p>
        <a href="products.html" class="btn btn-amson">Browse Products</a>
      </div>
    `;
    cartTotalText.textContent = formatPeso(0);
    checkoutBtn.classList.add("disabled");
    checkoutBtn.setAttribute("aria-disabled", "true");
    clearCartLink.classList.add("d-none");
    return;
  }

  clearCartLink.classList.remove("d-none");
  checkoutBtn.classList.remove("disabled");
  checkoutBtn.removeAttribute("aria-disabled");

  cartItemsContainer.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      const atLimit = item.qty >= product.totalStock;
      return `
        <div class="cart-item-row" data-id="${product.id}">
          <div class="cart-item-image"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-2">${product.name}</h3>
            <div class="d-flex align-items-center gap-3">
              <div class="qty-stepper">
                <button type="button" class="cart-qty-minus" aria-label="Decrease quantity">&minus;</button>
                <input type="text" class="cart-qty-input" value="${item.qty}" inputmode="numeric" readonly>
                <button type="button" class="cart-qty-plus" aria-label="Increase quantity" ${atLimit ? "disabled" : ""}>+</button>
              </div>
              <a href="#" class="remove-item-link"><i class="bi bi-trash"></i> Remove</a>
            </div>
            <p class="text-muted mb-0 mt-1" style="font-size:0.78rem;">${product.totalStock} available</p>
          </div>
          <div class="product-price mb-0">${formatPeso(product.price * item.qty)}</div>
        </div>
      `;
    })
    .join("");

  cartTotalText.textContent = formatPeso(cartTotal(cart));

  cartItemsContainer.querySelectorAll(".cart-item-row").forEach((row) => {
    const productId = row.dataset.id;

    row.querySelector(".cart-qty-plus").addEventListener("click", () => {
      const item = getCart().find((i) => i.id === productId);
      if (!item) return;
      const result = updateCartItemQty(productId, item.qty + 1);
      renderCartPage();
      if (result.capped) showCartToast(`Only ${result.qty} in stock - that's the most you can order.`);
    });

    row.querySelector(".cart-qty-minus").addEventListener("click", () => {
      const item = getCart().find((i) => i.id === productId);
      if (!item || item.qty <= 1) return;
      updateCartItemQty(productId, item.qty - 1);
      renderCartPage();
    });

    row.querySelector(".remove-item-link").addEventListener("click", (e) => {
      e.preventDefault();
      removeFromCart(productId);
      renderCartPage();
    });
  });
}

clearCartLink.addEventListener("click", (e) => {
  e.preventDefault();
  clearCart();
  renderCartPage();
});

(async function init() {
  await loadCatalogCache();
  renderCartPage();
})();
