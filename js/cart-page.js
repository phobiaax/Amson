/**
 * Cart page.
 */

const cartHeading = document.getElementById("cartHeading");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartTotalText = document.getElementById("cartTotalText");
const clearCartLink = document.getElementById("clearCartLink");
const checkoutBtn = document.getElementById("checkoutBtn");
const selectAllRow = document.getElementById("selectAllRow");
const selectAllCartCheckbox = document.getElementById("selectAllCartCheckbox");
const selectedCountText = document.getElementById("selectedCountText");
const noSelectionNotice = document.getElementById("noSelectionNotice");

// ---- Item selection (checkout only what's checked, not the whole cart) ----
// Tracked in memory for this page load only - every item defaults to
// selected, same as "Proceed to Checkout" used to behave before this
// existed, so a customer who never touches a checkbox sees no change.
let selectedIds = new Set();
let knownIds = new Set();

function syncSelection(cart) {
  const cartIdSet = new Set(cart.map((item) => item.id));

  knownIds.forEach((id) => {
    if (!cartIdSet.has(id)) {
      knownIds.delete(id);
      selectedIds.delete(id);
    }
  });

  cartIdSet.forEach((id) => {
    if (!knownIds.has(id)) {
      knownIds.add(id);
      selectedIds.add(id);
    }
  });
}

function renderCartPage() {
  const cart = getCart();
  syncSelection(cart);
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
    selectedCountText.textContent = "0 of 0 items selected";
    noSelectionNotice.classList.add("d-none");
    selectAllRow.classList.add("d-none");
    checkoutBtn.classList.add("disabled");
    checkoutBtn.setAttribute("aria-disabled", "true");
    clearCartLink.classList.add("d-none");
    return;
  }

  clearCartLink.classList.remove("d-none");
  selectAllRow.classList.remove("d-none");

  cartItemsContainer.innerHTML = cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      const atLimit = item.qty >= product.totalStock;
      const isSelected = selectedIds.has(item.id);
      return `
        <div class="cart-item-row ${isSelected ? "" : "unselected"}" data-id="${product.id}">
          <input type="checkbox" class="cart-item-checkbox" data-id="${product.id}" ${isSelected ? "checked" : ""} aria-label="Select ${product.name} for checkout">
          <div class="cart-item-image" style="${cartItemImageCss(product.imageUrl)}"></div>
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

  updateSelectionSummary(cart);

  cartItemsContainer.querySelectorAll(".cart-item-row").forEach((row) => {
    const productId = row.dataset.id;

    row.querySelector(".cart-item-checkbox").addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedIds.add(productId);
      } else {
        selectedIds.delete(productId);
      }
      renderCartPage();
    });

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

function updateSelectionSummary(cart) {
  const selectedCart = cart.filter((item) => selectedIds.has(item.id));
  selectedCountText.textContent = `${selectedCart.length} of ${cart.length} items selected`;
  cartTotalText.textContent = formatPeso(cartTotal(selectedCart));

  const allSelected = selectedCart.length === cart.length;
  selectAllCartCheckbox.checked = selectedCart.length > 0 && allSelected;
  selectAllCartCheckbox.indeterminate = selectedCart.length > 0 && !allSelected;

  const hasSelection = selectedCart.length > 0;
  noSelectionNotice.classList.toggle("d-none", hasSelection);
  checkoutBtn.classList.toggle("disabled", !hasSelection);
  if (hasSelection) {
    checkoutBtn.removeAttribute("aria-disabled");
  } else {
    checkoutBtn.setAttribute("aria-disabled", "true");
  }
}

selectAllCartCheckbox.addEventListener("change", () => {
  const cart = getCart();
  if (selectAllCartCheckbox.checked) {
    cart.forEach((item) => selectedIds.add(item.id));
  } else {
    selectedIds.clear();
  }
  renderCartPage();
});

clearCartLink.addEventListener("click", (e) => {
  e.preventDefault();
  clearCart();
  renderCartPage();
});

checkoutBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (checkoutBtn.classList.contains("disabled")) return;
  sessionStorage.setItem("amsonCheckoutSelectedIds", JSON.stringify([...selectedIds]));
  window.location.href = "checkout.html";
});

(async function init() {
  await loadCatalogCache();
  renderCartPage();
})();
