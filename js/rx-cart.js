/**
 * Prescription pre-order cart.
 */

const RX_CART_STORAGE_KEY = "amsonRxCart";

function getRxCart() {
  try {
    return JSON.parse(localStorage.getItem(RX_CART_STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveRxCart(cart) {
  localStorage.setItem(RX_CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToRxCart(productId, qty = 1) {
  const cart = getRxCart();
  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty });
  }
  saveRxCart(cart);
}

function updateRxCartItemQty(productId, qty) {
  const cart = getRxCart();
  const item = cart.find((i) => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveRxCart(cart);
}

function removeFromRxCart(productId) {
  saveRxCart(getRxCart().filter((i) => i.id !== productId));
}

function clearRxCart() {
  saveRxCart([]);
}

function rxCartCount(cart = getRxCart()) {
  let sum = 0;
  for (const item of cart) {
    sum += item.qty;
  }
  return sum;
}

function rxCartTotal(cart = getRxCart()) {
  let sum = 0;
  for (const item of cart) {
    const product = getProductById(item.id);
    if (product) sum += product.price * item.qty;
  }
  return sum;
}
