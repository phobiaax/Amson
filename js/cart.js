// shopping cart

const CART_STORAGE_KEY = "amsonCart";

// logged in carts are saved to the account so they follow you, guests keep a local one
const CART_OWNER_KEY = "amsonCartOwner";
let cartOwnerUid = null;
try {
  cartOwnerUid = localStorage.getItem(CART_OWNER_KEY);
} catch (error) {}
let cartSyncTimer = null;

function cartStorageKey() {
  return cartOwnerUid ? `${CART_STORAGE_KEY}:${cartOwnerUid}` : CART_STORAGE_KEY;
}

function readCartKey(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch (error) {
    return [];
  }
}

function getCart() {
  return readCartKey(cartStorageKey());
}

// newer copy wins on load so a last second add isnt lost
let pendingCartSync = null;

function saveCart(cart) {
  const updatedAt = Date.now();
  try {
    localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
    localStorage.setItem(`${cartStorageKey()}:at`, String(updatedAt));
  } catch (error) {
    // storage blocked, account copy still saves
  }
  updateCartBadge();
  if (cartOwnerUid) {
    pendingCartSync = { uid: cartOwnerUid, cart, updatedAt };
    clearTimeout(cartSyncTimer);
    cartSyncTimer = setTimeout(flushCartSync, 400);
  }
}

// saves a pending cart change right now
function flushCartSync() {
  clearTimeout(cartSyncTimer);
  if (!pendingCartSync) return Promise.resolve();
  const { uid, cart, updatedAt } = pendingCartSync;
  pendingCartSync = null;
  return db
    .collection("users")
    .doc(uid)
    .update({ cart, cartUpdatedAt: updatedAt })
    .catch((error) => console.error("Failed to save cart:", error));
}
window.addEventListener("pagehide", () => {
  flushCartSync();
});

function mergeCarts(a, b) {
  const merged = a.map((item) => ({ ...item }));
  b.forEach((item) => {
    const existing = merged.find((m) => m.id === item.id);
    if (existing) existing.qty = Math.max(existing.qty, item.qty);
    else merged.push({ ...item });
  });
  return merged;
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    cartOwnerUid = null;
    try {
      localStorage.removeItem(CART_OWNER_KEY);
    } catch (error) {}
    updateCartBadge();
    return;
  }
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || doc.data().role !== "customer") return;
    const accountCart = Array.isArray(doc.data().cart) ? doc.data().cart : [];
    const accountAt = doc.data().cartUpdatedAt || 0;
    const guestCart = readCartKey(CART_STORAGE_KEY);
    cartOwnerUid = user.uid;
    try {
      localStorage.setItem(CART_OWNER_KEY, user.uid);
    } catch (error) {}
    // local copy if its newer than the account one
    const localCart = getCart();
    let localAt = 0;
    try {
      localAt = Number(localStorage.getItem(`${cartStorageKey()}:at`)) || 0;
    } catch (error) {}
    const localIsNewer = localAt > accountAt;
    const merged = mergeCarts(localIsNewer ? localCart : accountCart, guestCart);
    if (guestCart.length) localStorage.removeItem(CART_STORAGE_KEY);
    if (guestCart.length || localIsNewer || JSON.stringify(merged) !== JSON.stringify(localCart)) saveCart(merged);
    else updateCartBadge();
    document.dispatchEvent(new CustomEvent("cart:synced"));
  } catch (error) {
    console.error("Failed to load the account cart:", error);
  }
});

// capped means the qty was cut down to the stock
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

// removes only the ordered items, unchecked ones stay
function removeItemsFromCart(productIds) {
  const idSet = new Set(productIds);
  saveCart(getCart().filter((i) => !idSet.has(i.id)));
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

// small popup that closes itself
let cartToastTimer = null;

function ensureCartToastModal() {
  if (document.getElementById("cartToastModal")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal fade" id="cartToastModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content text-center border-0" style="border-radius:18px; padding:2rem 1.5rem;">
          <div id="cartToastIconWrap" class="mx-auto mb-3 d-flex align-items-center justify-content-center" style="width:60px; height:60px; border-radius:50%;">
            <i id="cartToastIcon" class="bi" style="font-size:1.9rem;"></i>
          </div>
          <p class="mb-0 fw-medium" id="cartToastMessage" style="color:var(--amson-dark); font-size:0.98rem;"></p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
}

const CART_TOAST_STYLES = {
  success: { bg: "#e5f7ec", color: "#1a9c53", icon: "bi-check-lg" },
  warning: { bg: "#fdf1e0", color: "#d98a12", icon: "bi-exclamation-lg" },
};

function showCartToast(message, type = "success") {
  if (typeof bootstrap === "undefined") return;
  ensureCartToastModal();

  const style = CART_TOAST_STYLES[type] || CART_TOAST_STYLES.success;
  const iconWrap = document.getElementById("cartToastIconWrap");
  const icon = document.getElementById("cartToastIcon");
  iconWrap.style.backgroundColor = style.bg;
  icon.style.color = style.color;
  icon.className = `bi ${style.icon}`;
  document.getElementById("cartToastMessage").textContent = message;

  const modalEl = document.getElementById("cartToastModal");
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  clearTimeout(cartToastTimer);
  modal.show();
  cartToastTimer = setTimeout(() => modal.hide(), 1400);
}

// ---- add to cart ----
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-add-cart");
  if (!btn) return;
  const result = addToCart(btn.dataset.id, 1);
  if (result.capped && result.qty === 0) {
    showCartToast("Sorry, that item is out of stock.", "warning");
  } else if (result.capped) {
    showCartToast(`Only ${result.qty} in stock - your cart is now at the limit.`, "warning");
  } else {
    showCartToast("Added to cart.");
  }
});

// ---- buy now ----
// adds the item then goes straight to the cart
async function buyNow(productId, qty = 1) {
  const result = addToCart(productId, qty);
  if (result.capped && result.qty === 0) {
    showCartToast("Sorry, that item is out of stock.", "warning");
    return;
  }
  // saves to the account first (max 2s) so the cart page isnt behind
  await Promise.race([flushCartSync(), new Promise((resolve) => setTimeout(resolve, 2000))]);
  window.location.href = "cart.html";
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn-buy-now");
  if (!btn) return;
  buyNow(btn.dataset.id, 1);
});

document.addEventListener("DOMContentLoaded", updateCartBadge);
