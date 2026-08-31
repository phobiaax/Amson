/**
 * Client-side shopping cart.
 */

const CART_STORAGE_KEY = "amsonCart";

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// Both return { qty, capped } - capped is true if the requested quantity
// had to be reduced to stay within the product's real available stock.
function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  const product = typeof getProductById === "function" ? getProductById(productId) : null;
  const maxQty = product ? product.totalStock : Infinity;

  const currentQty = existing ? existing.qty : 0;
  const desiredQty = currentQty + qty;
  const finalQty = Math.min(desiredQty, maxQty);
  const capped = finalQty < desiredQty;

  if (finalQty <= 0) {
    return { qty: currentQty, capped: true };
  }

  if (existing) {
    existing.qty = finalQty;
  } else {
    cart.push({ id: productId, qty: finalQty });
  }
  saveCart(cart);
  return { qty: finalQty, capped };
}

function updateCartItemQty(productId, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return { qty: 0, capped: false };
  const product = typeof getProductById === "function" ? getProductById(productId) : null;
  const maxQty = product ? product.totalStock : Infinity;
  const desiredQty = Math.max(1, qty);
  const finalQty = Math.min(desiredQty, Math.max(maxQty, 1));
  const capped = finalQty < desiredQty;
  item.qty = finalQty;
  saveCart(cart);
  return { qty: finalQty, capped };
}

function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.id !== productId));
}

function clearCart() {
  saveCart([]);
}

function cartCount(cart = getCart()) {
  let sum = 0;
  for (const item of cart) {
    sum += item.qty;
  }
  return sum;
}

function cartTotal(cart = getCart()) {
  let sum = 0;
  for (const item of cart) {
    const product = getProductById(item.id);
    if (product) sum += product.price * item.qty;
  }
  return sum;
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.classList.toggle("d-none", count === 0);
}

function showCartToast(message) {
  const toastEl = document.getElementById("cartToast");
  if (!toastEl || typeof bootstrap === "undefined") return;
  toastEl.querySelector(".toast-body").textContent = message;
  bootstrap.Toast.getOrCreateInstance(toastEl).show();
}

// ---- Add to Cart ----
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (!btn) return;
  const result = addToCart(btn.dataset.id, 1);
  if (result.capped && result.qty === 0) {
    showCartToast("Sorry, that item is out of stock.");
  } else if (result.capped) {
    showCartToast(`Only ${result.qty} in stock - your cart is now at the limit.`);
  } else {
    showCartToast("Added to cart.");
  }
});

document.addEventListener("DOMContentLoaded", updateCartBadge);
