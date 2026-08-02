/**
 * Cart page: renders items from getCart(), and wires quantity steppers,
 * remove links, "Clear All", and the running total.
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
      return `
        <div class="cart-item-row" data-id="${product.id}">
          <div class="cart-item-image"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-2">${product.name}</h3>
            <div class="d-flex align-items-center gap-3">
              <div class="qty-stepper">
                <button type="button" class="cart-qty-minus" aria-label="Decrease quantity">&minus;</button>
                <input type="text" class="cart-qty-input" value="${item.qty}" inputmode="numeric" readonly>
                <button type="button" class="cart-qty-plus" aria-label="Increase quantity">+</button>
              </div>
              <a href="#" class="remove-item-link"><i class="bi bi-trash"></i> Remove</a>
            </div>
          </div>
          <div class="product-price mb-0">${formatPeso(product.price * item.qty)}</div>
        </div>
      `;
    })
    .join("");

  cartTotalText.textContent = formatPeso(cartTotal(cart));
}

cartItemsContainer.addEventListener("click", (e) => {
  const row = e.target.closest(".cart-item-row");
  if (!row) return;
  const productId = Number(row.dataset.id);
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  if (e.target.closest(".cart-qty-plus")) {
    updateCartItemQty(productId, item.qty + 1);
    renderCartPage();
  } else if (e.target.closest(".cart-qty-minus")) {
    if (item.qty <= 1) return;
    updateCartItemQty(productId, item.qty - 1);
    renderCartPage();
  } else if (e.target.closest(".remove-item-link")) {
    e.preventDefault();
    removeFromCart(productId);
    renderCartPage();
  }
});

clearCartLink.addEventListener("click", (e) => {
  e.preventDefault();
  clearCart();
  renderCartPage();
});

renderCartPage();
