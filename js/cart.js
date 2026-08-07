/**
 * Client-side shopping cart, backed by localStorage. Swap for a Firestore
 * cart/order write once checkout is wired to the backend - cartTotal(),
 * cartCount(), getCart() etc. can stay as the read layer.
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

function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveCart(cart);
}

function updateCartItemQty(productId, qty) {
  const cart = getCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

function removeFromCart(productId) {
  saveCart(getCart().filter((i) => i.id !== productId));
}

function clearCart() {
  saveCart([]);
}

function cartCount(cart = getCart()) {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function cartTotal(cart = getCart()) {
  return cart.reduce((sum, item) => {
    const product = getProductById(item.id);
    return sum + (product ? product.price * item.qty : 0);
  }, 0);
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

// ---- Global "+ Add to Cart" click delegation (product cards on any page) ----
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (!btn) return;
  addToCart(btn.dataset.id, 1);
  showCartToast("Added to cart.");
});

document.addEventListener("DOMContentLoaded", updateCartBadge);
