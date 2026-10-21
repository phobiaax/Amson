/**
 * Client-side shopping cart.
 */

const CART_STORAGE_KEY = "amsonCart";

// A signed-in customer's cart belongs to the account (REQ014): it's saved on
// users/{uid}.cart so it follows them to any device, with a per-account
// local copy for speed. Guests keep a browser-only cart, which is merged
// into the account cart when they sign in.
// The last signed-in customer is remembered so pages read the right cart
// immediately, before Firebase Auth finishes restoring the session.
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

function saveCart(cart) {
  try {
    localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
  } catch (error) {
    // Storage blocked (private mode) - the account copy below still saves.
  }
  updateCartBadge();
  if (cartOwnerUid && typeof db !== "undefined") {
    const uid = cartOwnerUid;
    clearTimeout(cartSyncTimer);
    cartSyncTimer = setTimeout(() => {
      db.collection("users").doc(uid).update({ cart }).catch((error) => console.error("Failed to save cart:", error));
    }, 400);
  }
}

function mergeCarts(a, b) {
  const merged = a.map((item) => ({ ...item }));
  b.forEach((item) => {
    const existing = merged.find((m) => m.id === item.id);
    if (existing) existing.qty = Math.max(existing.qty, item.qty);
    else merged.push({ ...item });
  });
  return merged;
}

if (typeof auth !== "undefined") {
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
      const guestCart = readCartKey(CART_STORAGE_KEY);
      cartOwnerUid = user.uid;
      try {
        localStorage.setItem(CART_OWNER_KEY, user.uid);
      } catch (error) {}
      const merged = mergeCarts(accountCart, guestCart);
      if (guestCart.length) localStorage.removeItem(CART_STORAGE_KEY);
      if (guestCart.length || JSON.stringify(merged) !== JSON.stringify(getCart())) saveCart(merged);
      else updateCartBadge();
      document.dispatchEvent(new CustomEvent("cart:synced"));
    } catch (error) {
      console.error("Failed to load the account cart:", error);
    }
  });
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

// Removes just the given products from the cart - used after an order is
// placed for only a selected subset of the cart, so items the customer left
// unchecked stay put instead of getting wiped along with the ones they
// actually bought.
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

// Centered, self-dismissing modal instead of a corner toast that's easy
// to miss - no confirm button, it just shows briefly and closes itself.
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

// ---- Add to Cart ----
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

document.addEventListener("DOMContentLoaded", updateCartBadge);
