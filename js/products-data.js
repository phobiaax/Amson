/**
 * Product catalog cache.
 */

// ---- Stacked modal darkening ----
// Bootstrap gives every .modal and every .modal-backdrop the same fixed
// z-index regardless of how many are open, so a second modal's backdrop
// never actually paints on top of the first modal's box - nothing was
// ever going to look darker no matter the opacity. This re-numbers both
// on every open/close so each new modal (and its backdrop) stacks above
// everything already open, which is what actually makes modal 1 look
// dimmed once modal 2 is on top of it.
function restackModals() {
  document.querySelectorAll(".modal-backdrop").forEach((backdrop, i) => {
    backdrop.style.zIndex = 1050 + i * 20;
  });
  document.querySelectorAll(".modal.show").forEach((modal, i) => {
    modal.style.zIndex = 1055 + i * 20;
  });
}
document.addEventListener("shown.bs.modal", restackModals);
document.addEventListener("hidden.bs.modal", restackModals);

// ---- Shared dialog UI (replaces native alert()/confirm()) ----
// Native browser dialogs aren't acceptable UI here - everything routes
// through one Bootstrap modal, built once per page and reused.
function ensureAppDialogModal() {
  if (document.getElementById("appDialogModal")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal fade" id="appDialogModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content p-4">
          <h2 class="h5 fw-bold mb-2" id="appDialogTitle"></h2>
          <p class="mb-3" id="appDialogMessage" style="white-space:pre-line;"></p>
          <div class="mb-4 d-none" id="appDialogField"></div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-dark-amson d-none" id="appDialogCancelBtn">Cancel</button>
            <button type="button" class="btn btn-amson" id="appDialogOkBtn">OK</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
}

// Replaces window.alert() - resolves once the user dismisses it.
function showAppAlert(message, { title = "Notice" } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    setAppDialogField(null);
    const cancelBtn = document.getElementById("appDialogCancelBtn");
    const okBtn = document.getElementById("appDialogOkBtn");
    cancelBtn.classList.add("d-none");
    okBtn.textContent = "OK";

    const modalEl = document.getElementById("appDialogModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const onOk = () => modal.hide();
    const onHidden = () => {
      okBtn.removeEventListener("click", onOk);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve();
    };
    okBtn.addEventListener("click", onOk);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    modal.show();
  });
}

// Optional input shown inside the shared dialog (for prompt/select);
// null hides it.
function setAppDialogField(html) {
  const field = document.getElementById("appDialogField");
  field.innerHTML = html || "";
  field.classList.toggle("d-none", !html);
}

// Replaces window.confirm() - resolves true/false. Dismissing without
// clicking Confirm (Esc, or clicking Cancel) resolves false.
function showAppConfirm(message, { title = "Please Confirm", confirmLabel = "Confirm", cancelLabel = "Cancel", fieldHtml = null, onRender = null } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    setAppDialogField(fieldHtml);
    if (onRender) onRender();
    const cancelBtn = document.getElementById("appDialogCancelBtn");
    const okBtn = document.getElementById("appDialogOkBtn");
    cancelBtn.classList.remove("d-none");
    cancelBtn.textContent = cancelLabel;
    okBtn.textContent = confirmLabel;

    const modalEl = document.getElementById("appDialogModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    let confirmed = false;
    const onOk = () => {
      confirmed = true;
      modal.hide();
    };
    const onCancel = () => modal.hide();
    const onHidden = () => {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve(confirmed);
    };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    modal.show();
  });
}

// Replaces window.prompt() - resolves the entered text, or null if cancelled.
async function showAppPrompt(message, { title = "Enter a value", defaultValue = "", confirmLabel = "Save" } = {}) {
  const ok = await showAppConfirm(message, {
    title,
    confirmLabel,
    fieldHtml: `<input type="text" class="form-control" id="appDialogInput" value="${escapeHtml(defaultValue)}">`,
  });
  return ok ? document.getElementById("appDialogInput").value : null;
}

// Pick one of several options - resolves the chosen value, or null.
async function showAppSelect(message, options, { title = "Choose", confirmLabel = "Continue" } = {}) {
  const optionsHtml = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
  const ok = await showAppConfirm(message, {
    title,
    confirmLabel,
    fieldHtml: `<select class="form-select" id="appDialogSelect">${optionsHtml}</select>`,
  });
  return ok ? document.getElementById("appDialogSelect").value : null;
}

let SAMPLE_PRODUCTS = [];
let CATEGORY_LABELS = {};
let catalogLoadPromise = null;

const DEFAULT_REORDER_POINT = 20;
const NEAR_EXPIRY_MONTHS = 6;

function nearExpiryCutoff() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + NEAR_EXPIRY_MONTHS);
  return cutoff;
}

// Retail (online + POS) can only ever sell a batch that's active and more
// than NEAR_EXPIRY_MONTHS from expiring (REQ066). Wholesale may also take
// near-expiry and wholesale_only stock, but nobody may sell an expired batch.
function isRetailSellableBatch(batch) {
  return batch.status === "active" && (batch.quantity || 0) > 0 && new Date(batch.expirationDate) > nearExpiryCutoff();
}

function isWholesaleSellableBatch(batch) {
  return (
    (batch.status === "active" || batch.status === "wholesale_only") &&
    (batch.quantity || 0) > 0 &&
    new Date(batch.expirationDate) > new Date()
  );
}

const BATCH_STATUS_LABELS = {
  normal: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  near_expiry: "Near Expiry",
  expired: "Expired",
};

// Shared severity -> color so the inventory status pills, both
// notification dropdowns, and the Notifications page all agree on what
// each urgency level looks like. Backed by research (see conversation):
// green = good stock, amber = needs attention (low stock or near expiry -
// same color, told apart by icon/label per WCAG 1.4.1), charcoal = out of
// stock (neutral/unavailable, not "dangerous"), red = reserved for the
// genuinely hazardous case - expired medication.
const SEVERITY_COLORS = {
  danger: "#EE3137",
  warning: "#b8860b",
  info: "#4A90D9",
  success: "#1a9c4b",
};

// A visible background tint to go with the border above - a thin colored
// edge alone was easy to miss in a quick glance at the notification
// dropdowns, so each row now gets a light wash of its severity color too.
const SEVERITY_BACKGROUNDS = {
  danger: "rgba(238, 49, 55, 0.12)",
  warning: "rgba(184, 134, 11, 0.12)",
  info: "rgba(74, 144, 217, 0.12)",
  success: "rgba(26, 156, 75, 0.12)",
};

// Stock level and expiry are two INDEPENDENT dimensions, not one
// mutually-exclusive status - a batch can be both low on stock and near
// expiry at the same time (e.g. 1 unit left, expiring tomorrow), and both
// need their own flag. These used to be collapsed into a single
// getBatchStatus() with a fixed priority order (expired > near_expiry >
// low_stock), so a near-expiry batch that was ALSO low on stock only ever
// reported "near_expiry" - the low-stock condition was silently masked
// and never showed up on the pill, in notifications, or in the Low Stock
// count. Keep each axis separate everywhere it matters.
// totalStockOverride lets a caller that already has every batch in hand
// (the Inventory table) pass the product's REAL total physical stock
// (every batch, any status) instead of falling back to
// SAMPLE_PRODUCTS.totalStock, which is deliberately active-only (that
// number also drives the storefront's "in stock" check, which must never
// promise a customer stock that's actually reserved for wholesale). For
// inventory ALERTING, a wholesale_only batch's units still physically
// exist and still count - see sumPhysicalStockByProduct.
function getStockLevelStatus(batch, totalStockOverride) {
  const product = getProductById(batch.productId);
  const reorderPoint = (product && product.reorderPoint) || DEFAULT_REORDER_POINT;
  const totalStock = totalStockOverride !== undefined ? totalStockOverride : product ? product.totalStock : batch.quantity;
  if (totalStock === 0) return "out_of_stock";
  if (totalStock <= reorderPoint) return "low_stock";

  return "normal";
}

function getExpiryStatus(batch) {
  const expiry = new Date(batch.expirationDate);
  const now = new Date();
  if (expiry < now) return "expired";

  const nearExpiryThreshold = new Date();
  nearExpiryThreshold.setMonth(nearExpiryThreshold.getMonth() + NEAR_EXPIRY_MONTHS);
  if (expiry <= nearExpiryThreshold) return "near_expiry";

  return "normal";
}

// Every status that currently applies to this batch - 1 entry normally,
// 2 when both a stock-level and an expiry condition are both true at
// once. Used wherever something needs to check or display all of them,
// not just whichever one used to "win."
function getBatchStatuses(batch, totalStockOverride) {
  const statuses = [getStockLevelStatus(batch, totalStockOverride), getExpiryStatus(batch)].filter((s) => s !== "normal");
  return statuses.length > 0 ? statuses : ["normal"];
}

// Sums every batch's own quantity per product, regardless of status - a
// wholesale_only batch still physically exists on a shelf, it's just
// blocked from RETAIL sale. That's a separate, correct restriction
// (SAMPLE_PRODUCTS.totalStock stays active-only on purpose, so the
// storefront never promises a customer stock that's actually reserved for
// wholesale). But for INVENTORY alerting - "how much do we physically
// have, are we running low" - counting only active stock made a product
// whose only batch had gone wholesale_only (because it's near expiry)
// read as having 0 units, even while that unit still sits on the shelf.
function sumPhysicalStockByProduct(batches) {
  const map = {};
  batches.forEach((b) => {
    map[b.productId] = (map[b.productId] || 0) + (b.quantity || 0);
  });
  return map;
}

// ---- Accurate inventory alert counts (Dashboard's Low Stock/Near-Expiry
// tiles, Inventory's stat tiles) ----
// Low stock and out of stock are PRODUCT-level facts (judged on a
// product's combined physical stock across all its batches) - counting
// every batch that reports them, as the two pages used to do separately,
// double-counts a product split across several lots. Near-expiry/expired
// stay per-batch, since each physical lot has its own expiry and needs
// its own decision - these counts simply mirror whatever the Inventory
// table itself labels a batch, so the tile and the row never disagree.
async function computeInventoryAlertCounts(batchesOverride = null) {
  await loadCatalogCache();
  const batches = batchesOverride || (await db.collection("stockBatches").get()).docs.map((doc) => doc.data());
  const physicalStockByProduct = sumPhysicalStockByProduct(batches);

  let nearExpiry = 0;
  let expired = 0;
  batches.forEach((b) => {
    if (b.quantity === 0) return; // an already-empty lot isn't a live expiry concern
    const status = getExpiryStatus(b);
    if (status === "near_expiry") nearExpiry += 1;
    if (status === "expired") expired += 1;
  });

  const activeProducts = SAMPLE_PRODUCTS.filter((p) => p.status === "active");
  const outOfStock = activeProducts.filter((p) => (physicalStockByProduct[p.id] || 0) === 0).length;
  const lowStock = activeProducts.filter((p) => {
    const stock = physicalStockByProduct[p.id] || 0;
    return stock > 0 && stock <= (p.reorderPoint || DEFAULT_REORDER_POINT);
  }).length;

  return { lowStock, outOfStock, nearExpiry, expired };
}

// ---- Staff notifications (bell dropdown, sidebar badge, Notifications
// page) - computed fresh from live data every time, same as before, so an
// alert can never go stale or get missed. What's new is read/unread: each
// notification carries a stable `key` (what it's about) and a `signature`
// (a snapshot of the part that can change, like quantity). A per-staff
// "read" map records the signature that was current when they last saw it,
// so if the same batch goes low, gets read, then drops further, it's
// unread again - marking read never permanently silences a recurring
// problem. ----
const STAFF_NOTIF_SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };

async function computeStaffNotifications() {
  await loadCatalogCache();
  const [batchSnapshot, orderSnapshot, poSnapshot] = await Promise.all([
    db.collection("stockBatches").get(),
    db.collection("orders").get(),
    db.collection("purchaseOrders").get(),
  ]);

  const notifications = [];

  batchSnapshot.docs.forEach((doc) => {
    const b = { id: doc.id, ...doc.data() };
    if (b.status !== "active") return;
    const product = getProductById(b.productId);
    const productName = product ? product.name : "Unknown product";

    // Checked independently, not as an either/or - a batch can be both
    // low on stock and near expiry at once, and both deserve their own
    // notification rather than one masking the other.
    const stockStatus = getStockLevelStatus(b);
    if (stockStatus === "out_of_stock") {
      notifications.push({
        key: `out_of_stock:${b.id}`,
        signature: `${b.quantity}`,
        severity: "danger",
        icon: "bi-box-seam",
        message: `${productName} (Batch ${b.batchNo}) is out of stock.`,
        link: "inventory.html",
      });
    } else if (stockStatus === "low_stock") {
      notifications.push({
        key: `low_stock:${b.id}`,
        signature: `${b.quantity}`,
        severity: "warning",
        icon: "bi-box-seam",
        message: `${productName} (Batch ${b.batchNo}) is low on stock - ${b.quantity} left.`,
        link: "inventory.html",
      });
    }

    const expiryStatus = getExpiryStatus(b);
    if (expiryStatus === "expired") {
      notifications.push({
        key: `expired:${b.id}`,
        signature: `${b.quantity}`,
        severity: "danger",
        icon: "bi-calendar-x",
        message: `${productName} (Batch ${b.batchNo}) has expired - ${b.expirationDate}.`,
        link: "inventory.html",
      });
    } else if (expiryStatus === "near_expiry") {
      notifications.push({
        key: `near_expiry:${b.id}`,
        signature: `${b.quantity}:${b.expirationDate}`,
        severity: "warning",
        icon: "bi-hourglass-split",
        message: `${productName} (Batch ${b.batchNo}) is near expiry - ${b.expirationDate}.`,
        link: "inventory.html",
      });
    }
  });

  orderSnapshot.docs.forEach((doc) => {
    const o = doc.data();
    if (o.status !== "placed") return;
    notifications.push({
      key: `payment_verification:${doc.id}`,
      signature: o.status,
      severity: "info",
      icon: "bi-credit-card",
      message: `Order ${o.orderNumber} is awaiting payment verification.`,
      link: "online-orders.html",
    });
  });

  poSnapshot.docs.forEach((doc) => {
    const po = doc.data();
    if (po.status !== "discrepancy") return;
    notifications.push({
      key: `po_discrepancy:${doc.id}`,
      signature: po.status,
      severity: "danger",
      icon: "bi-exclamation-triangle",
      message: `Purchase Order ${po.poNumber} has a delivery discrepancy pending acknowledgement.`,
      link: "inventory.html",
    });
  });

  // Products other staff added without prices stay Inactive until the
  // Branch Manager prices them - make sure that's visible.
  const pricePending = SAMPLE_PRODUCTS.filter((p) => p.pricePending);
  if (pricePending.length > 0) {
    notifications.push({
      key: "price_pending",
      signature: pricePending.map((p) => p.id).sort().join(","),
      severity: "info",
      icon: "bi-tag",
      message: `${pricePending.length} product${pricePending.length === 1 ? " is" : "s are"} waiting for a Branch Manager to set prices.`,
      link: "products.html",
    });
  }

  // Bad Order batches still waiting to be physically disposed of (REQ067).
  try {
    const bo = await db.collection("stockBatches").where("status", "==", "bad_order").get();
    const pending = bo.docs.filter((d) => !d.data().disposedAt);
    if (pending.length) {
      notifications.push({
        key: "bad_order_disposal",
        signature: pending.map((d) => d.id).sort().join(","),
        severity: "danger",
        icon: "bi-trash",
        message: `${pending.length} Bad Order batch${pending.length === 1 ? " needs" : "es need"} to be pulled out and disposed of.`,
        link: "inventory.html",
      });
    }
  } catch (error) {
    console.warn("Bad Order alerts unavailable:", error);
  }

  // Wholesale buyers whose LTO or Business Permit has expired or expires
  // within 30 days (REQ086).
  try {
    const accounts = await db.collection("wholesaleAccounts").get();
    const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const flagged = accounts.docs.filter((d) => {
      const a = d.data();
      if (a.status === "inactive") return false;
      return [a.ltoValidUntil, a.permitValidUntil].some((v) => v && new Date(`${v}T23:59:59`).getTime() < soon);
    });
    if (flagged.length) {
      notifications.push({
        key: "wholesale_documents",
        signature: flagged.map((d) => `${d.id}:${d.data().ltoValidUntil}:${d.data().permitValidUntil}`).sort().join(","),
        severity: "warning",
        icon: "bi-file-earmark-text",
        message: `${flagged.length} wholesale buyer${flagged.length === 1 ? " has" : "s have"} an LTO or Business Permit that is expired or expires within 30 days.`,
        link: "wholesale-accounts.html",
      });
    }
  } catch (error) {
    console.warn("Wholesale document alerts unavailable:", error);
  }

  // Wholesale orders recorded but not yet picked up or delivered.
  try {
    const pending = await db.collection("wholesaleOrders").where("releaseStatus", "==", "pending").get();
    if (!pending.empty) {
      notifications.push({
        key: "wholesale_pending_release",
        signature: pending.docs.map((d) => d.id).sort().join(","),
        severity: "info",
        icon: "bi-truck",
        message: `${pending.size} wholesale order${pending.size === 1 ? " is" : "s are"} waiting to be picked up or delivered.`,
        link: "wholesale-accounts.html",
      });
    }
  } catch (error) {
    console.warn("Wholesale order alerts unavailable:", error);
  }

  // Chats the assistant handed to staff (REQ038). Never blocks the other
  // alerts if chat isn't set up yet.
  try {
    const waiting = await db.collection("chatThreads").where("status", "==", "waiting_staff").get();
    if (!waiting.empty) {
      notifications.push({
        key: "chat_waiting",
        signature: waiting.docs.map((d) => d.id).sort().join(","),
        severity: "warning",
        icon: "bi-chat-dots",
        message: `${waiting.size} chat${waiting.size === 1 ? " is" : "s are"} waiting for a staff reply.`,
        link: "live-chat.html",
      });
    }
  } catch (error) {
    console.warn("Chat alerts unavailable:", error);
  }

  notifications.sort((a, b) => STAFF_NOTIF_SEVERITY_RANK[a.severity] - STAFF_NOTIF_SEVERITY_RANK[b.severity]);
  return notifications;
}

async function getStaffNotifReadMap(uid) {
  const doc = await db.collection("notifications").doc(uid).get();
  return doc.exists ? doc.data().read || {} : {};
}

function isStaffNotifRead(readMap, notif) {
  return readMap[notif.key] === notif.signature;
}

// set(..., {merge:true}) does NOT reliably merge into a nested map via a
// dotted-string key - only update() does that. update() fails outright if
// the document doesn't exist yet (true the first time a given staff member
// ever reads a notification), so ensure it exists first with a harmless
// empty merge, then do the real nested-field write with update().
async function markStaffNotifRead(uid, notif) {
  const ref = db.collection("notifications").doc(uid);
  await ref.set({}, { merge: true });
  await ref.update({ [`read.${notif.key}`]: notif.signature });
}

async function markAllStaffNotifsRead(uid, notifications) {
  const updates = {};
  notifications.forEach((n) => {
    updates[`read.${n.key}`] = n.signature;
  });
  if (Object.keys(updates).length === 0) return;
  const ref = db.collection("notifications").doc(uid);
  await ref.set({}, { merge: true });
  await ref.update(updates);
}

// ---- Near-expiry auto-handling (lazy, checked on Inventory page load) ----
// Stock this close to expiry is flagged wholesale_only so it doesn't get
// sold retail - quantity is never touched automatically; staff decide
// whether to write it off themselves.
const BAD_ORDER_MONTHS = 2;

// Expiry rules, run whenever staff open Inventory or the Dashboard:
//   - within 6 months: Wholesale Only (no retail sale) - REQ066
//   - within 2 months (or expired): Bad Order - the remaining units are
//     written off automatically, recorded as a write-off and in the Audit
//     Log, and staff get a disposal alert until someone marks the batch
//     disposed - REQ067
async function enforceExpiryStatus() {
  const snapshot = await db.collection("stockBatches").where("status", "in", ["active", "wholesale_only"]).get();
  const batches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const wholesaleOnlyThreshold = new Date();
  wholesaleOnlyThreshold.setMonth(wholesaleOnlyThreshold.getMonth() + NEAR_EXPIRY_MONTHS);
  const badOrderThreshold = new Date();
  badOrderThreshold.setMonth(badOrderThreshold.getMonth() + BAD_ORDER_MONTHS);

  for (const batch of batches) {
    if (batch.quantity <= 0) continue;
    const expiry = new Date(batch.expirationDate);
    if (isNaN(expiry)) continue;

    if (expiry <= badOrderThreshold) {
      await markBatchBadOrder(batch.id);
    } else if (batch.status === "active" && expiry <= wholesaleOnlyThreshold) {
      await db.collection("stockBatches").doc(batch.id).update({ status: "wholesale_only" });
    }
  }
}

async function markBatchBadOrder(batchId) {
  const ref = db.collection("stockBatches").doc(batchId);
  const writeOffRef = db.collection("writeOffs").doc();
  let result = null;
  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) return;
    const b = doc.data();
    // Another staff page may have done it a moment ago.
    if (b.status === "bad_order" || (b.quantity || 0) <= 0) return;
    const reason = `Bad Order - within ${BAD_ORDER_MONTHS} months of expiry (${formatDateMDY(b.expirationDate)}), deducted automatically`;
    tx.update(ref, {
      status: "bad_order",
      quantity: 0,
      badOrderQty: b.quantity,
      badOrderAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(writeOffRef, {
      batchId,
      productId: b.productId,
      batchNo: b.batchNo || "",
      quantity: b.quantity,
      reason,
      automatic: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    result = { productId: b.productId, batchNo: b.batchNo, quantity: b.quantity, reason };
  });
  if (result) {
    const product = getProductById(result.productId);
    await logAuditEvent({
      action: "Bad Order (Automatic Write-Off)",
      details: `${product ? product.name : result.productId} - Batch ${result.batchNo || "-"}, Qty ${result.quantity}. ${result.reason}`,
      actor: "System",
    });
  }
}

// The branch's own groupings (one sheet each in its month-end inventory
// report). Only used to seed a brand-new project - after that, categories
// are whatever staff manage under Products > Manage Categories.
const DEFAULT_CATEGORIES = {
  generics: "Generics",
  branded: "Branded",
  drugstore: "Drugstore (Per Piece)",
  "medical-supplies": "Medical Supplies",
  grocery: "Grocery",
};

async function loadCatalogCache() {
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const categorySnapshot = await db.collection("categories").get();
    const productSnapshot = await db.collection("products").get();
    const batchSnapshot = await db.collection("stockBatches").where("status", "==", "active").get();

    CATEGORY_LABELS = {};
    categorySnapshot.docs.forEach((doc) => {
      CATEGORY_LABELS[doc.id] = doc.data().name;
    });

    // Sellable retail stock is judged by expiry date right here, not only by
    // the wholesale_only flag - that flag is only applied when someone opens
    // the Inventory page (enforceExpiryStatus), so relying on it alone left
    // near-expiry batches buyable online and at the POS until then.
    const stockByProduct = {};
    batchSnapshot.docs.forEach((doc) => {
      const batch = doc.data();
      if (!isRetailSellableBatch(batch)) return;
      stockByProduct[batch.productId] = (stockByProduct[batch.productId] || 0) + (batch.quantity || 0);
    });

    SAMPLE_PRODUCTS = productSnapshot.docs.map((doc) => {
      const data = doc.data();
      const totalStock = stockByProduct[doc.id] || 0;
      return {
        id: doc.id,
        ...data,
        price: data.retailPrice,
        totalStock,
        inStock: data.status === "active" && totalStock > 0,
      };
    });

    return { products: SAMPLE_PRODUCTS, categories: CATEGORY_LABELS };
  })();

  return catalogLoadPromise;
}

// ---- Storefront category links ----
// Built from the categories collection, so a category staff add or rename
// in Manage Categories shows up in the shop header (and on the home page)
// without editing every page's HTML.
function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function renderStorefrontCategoryNav() {
  const nav = document.querySelector(".category-nav .nav");
  if (!nav) return;
  const links = Object.entries(CATEGORY_LABELS)
    .map(([id, name]) => `<li class="nav-item"><a class="nav-link" href="products.html?category=${encodeURIComponent(id)}">${escapeHtml(name)}</a></li>`)
    .join("");
  nav.innerHTML = `<li class="nav-item"><a class="nav-link" href="products.html">All Products</a></li>${links}`;
}

function renderHomeCategoryCards() {
  const row = document.getElementById("homeCategoryCards");
  if (!row) return;
  row.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(([id, name]) => {
      const count = storefrontCatalog().filter((p) => p.category === id).length;
      return `
        <div class="col">
          <a href="products.html?category=${encodeURIComponent(id)}" class="category-card">
            <span class="category-icon"><i class="bi bi-star-fill"></i></span>
            <h3>${escapeHtml(name)}</h3>
            <p>${count} product${count === 1 ? "" : "s"}</p>
          </a>
        </div>
      `;
    })
    .join("");
}

if (document.querySelector(".category-nav") || document.getElementById("homeCategoryCards")) {
  loadCatalogCache()
    .then(() => {
      renderStorefrontCategoryNav();
      renderHomeCategoryCards();
    })
    .catch((error) => console.error("Failed to load categories:", error));
}

// A product only appears in the storefront once staff have marked it
// available online (and it's active) - staff can create a product ahead
// of time without it showing to customers yet. Once it has appeared,
// running out of stock doesn't remove it - it stays visible, greyed out
// and not orderable (see renderProductCard), rather than disappearing.
function storefrontCatalog() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore);
}

/* ---------- SKU generation (same pattern as order numbers) ---------- */
async function generateProductSku() {
  const counterRef = db.collection("counters").doc("products");
  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `MED-${String(nextCount).padStart(4, "0")}`;
}

function formatPeso(amount) {
  return `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProductById(id) {
  return SAMPLE_PRODUCTS.find((p) => String(p.id) === String(id));
}

// ---- Shared walk-in sale receipt - used both right after a POS checkout
// (admin-pos.js) and when staff reopen a past sale from the Walk-in
// Orders tab (admin-online-orders.js). Both pages include the same
// #posReceiptModal markup so this one renderer works for either. ----
// "card" and "ewallet" are the older POS values, kept so past sales still
// display correctly.
const SALE_RECEIPT_PAYMENT_METHOD_LABELS = {
  cash: "Cash",
  gcash: "G-Cash / QR Ph",
  bank_transfer: "Bank Transfer",
  free_of_cost: "Free of Cost",
  terminal: "Terminal (Card)",
  credit: "Credit",
  card: "Card",
  ewallet: "E-Wallet",
};
const POS_BRANCH_NAME = "Amson Pharmaceuticals";

function showSaleReceipt({
  items,
  total,
  paymentMethod,
  isCash,
  amountPaid,
  change,
  cashier,
  branch,
  completedAt,
  invoiceNo = null,
  customerName = "",
  title = "Sale Receipt",
  onConfirm = null,
  onEdit = null,
  onVoid = null,
  voidInfo = null,
  partialVoidInfo = null,
}) {
  const titleEl = document.getElementById("posReceiptModalTitle");
  if (titleEl) titleEl.textContent = title;
  document.getElementById("posReceiptBranch").textContent = branch;
  document.getElementById("posReceiptDate").textContent = formatDateMDY(completedAt);
  document.getElementById("posReceiptTime").textContent = completedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  // The SI# is only assigned when the sale is actually confirmed, so the
  // pre-confirm review can't show it yet.
  document.getElementById("posReceiptRef").textContent = invoiceNo || (onConfirm ? "Assigned on confirm" : "-");
  const customerEl = document.getElementById("posReceiptCustomer");
  if (customerEl) customerEl.textContent = customerName || "Walk-in";
  document.getElementById("posReceiptCashier").textContent = cashier;

  document.getElementById("posReceiptItemsBody").innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.name}${item.voidedQty ? `<div class="text-danger" style="font-size:0.75rem;">${item.voidedQty} voided</div>` : ""}</td>
          <td class="text-end">${item.qty}</td>
          <td class="text-end">${formatPeso(item.price)}</td>
          <td class="text-end">${formatPeso(item.price * item.qty)}</td>
        </tr>
      `
    )
    .join("");

  document.getElementById("posReceiptGrandTotal").textContent = formatPeso(total);
  document.getElementById("posReceiptPaymentMode").textContent =
    SALE_RECEIPT_PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
  document.getElementById("posReceiptAmountPaid").textContent =
    paymentMethod === "credit" ? "Charged on credit" : formatPeso(amountPaid);

  const changeRow = document.getElementById("posReceiptChangeRow");
  if (isCash) {
    changeRow.classList.remove("d-none");
    document.getElementById("posReceiptChange").textContent = formatPeso(change);
  } else {
    changeRow.classList.add("d-none");
  }

  const modalEl = document.getElementById("posReceiptModal");
  const footer = document.getElementById("posReceiptModalFooter");
  if (footer) {
    if (onConfirm) {
      // Preview mode (POS, before the sale is actually committed) - give
      // the cashier a chance to catch a mistake before stock gets deducted
      // and the sale gets written, rather than after.
      footer.innerHTML = `
        <button type="button" class="btn btn-outline-dark-amson flex-fill" id="posReceiptEditBtn">Edit Transaction</button>
        <button type="button" class="btn btn-amson flex-fill" id="posReceiptConfirmBtn">Confirm Transaction</button>
      `;
      document.getElementById("posReceiptEditBtn").addEventListener("click", () => {
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        if (onEdit) onEdit();
      });
      document.getElementById("posReceiptConfirmBtn").addEventListener("click", async (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        try {
          // onConfirm returns true when it has already replaced this
          // preview with the finished receipt (which must stay open).
          const keepOpen = await onConfirm();
          if (!keepOpen) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        } finally {
          btn.disabled = false;
        }
      });
    } else {
      // View mode (Walk-in Orders, Today's Sales, or right after a sale is
      // confirmed): print it, and - for authorized roles - void it.
      footer.innerHTML = `
        ${onVoid ? `<button type="button" class="btn btn-outline-dark-amson" id="posReceiptVoidBtn" style="border-color:var(--amson-red); color:var(--amson-red);">Void</button>` : ""}
        <button type="button" class="btn btn-outline-dark-amson flex-fill" id="posReceiptPrintBtn"><i class="bi bi-printer me-1"></i>Print</button>
        <button type="button" class="btn btn-amson flex-fill" data-bs-dismiss="modal">Close</button>
      `;
      document.getElementById("posReceiptPrintBtn").addEventListener("click", () => window.print());
      if (onVoid) {
        document.getElementById("posReceiptVoidBtn").addEventListener("click", () => {
          bootstrap.Modal.getOrCreateInstance(modalEl).hide();
          onVoid();
        });
      }
    }
  }

  // A voided sale still opens (it's a record), clearly marked.
  let voidBanner = document.getElementById("posReceiptVoidBanner");
  if (!voidBanner) {
    voidBanner = document.createElement("div");
    voidBanner.id = "posReceiptVoidBanner";
    voidBanner.className = "alert alert-danger py-2 mb-3 d-none";
    modalEl.querySelector(".modal-body").prepend(voidBanner);
  }
  const bannerLines = [];
  if (voidInfo) bannerLines.push(`VOIDED - ${voidInfo}`);
  if (partialVoidInfo) bannerLines.push(`ITEMS VOIDED - ${partialVoidInfo}`);
  voidBanner.classList.toggle("d-none", bannerLines.length === 0);
  voidBanner.textContent = bannerLines.join(" | ");

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

// ---- Walk-in sale void (REQ083, Fig 2.6/2.14) ----
// Only roles with void authorization (Branch Manager, Technical Staff)
// can void - never Sales Staff alone, per the client.
function roleCanVoidSales(role) {
  return ["admin", "branch_manager", "technical_staff"].includes(role);
}

// Asks which items (and how many of each) to void, the reason (required)
// and, if the customer is exchanging, what they're taking instead and the
// price difference. Resolves the details or null if cancelled. Leaving every
// item at its full quantity voids the whole sale.
// requireApproval: the client's rule that a void is never done by one
// junior staff member alone - a Branch Manager signs off with their own
// email and password (checked without signing anyone out).
async function promptVoidDetails(sale, { requireApproval = false } = {}) {
  const items = sale.items || [];
  const rows = items
    .map((item, idx) =>
      item.qty > 0
        ? `
        <div class="d-flex align-items-center gap-2 mb-2">
          <input class="form-check-input mt-0 void-line-check" type="checkbox" data-idx="${idx}" checked aria-label="Void ${escapeHtml(item.name)}">
          <span class="flex-fill" style="font-size:0.88rem;">${escapeHtml(item.name)} <span class="text-muted">(${formatPeso(item.price)} each)</span></span>
          <input type="number" class="form-control form-control-sm void-line-qty" data-idx="${idx}" min="1" max="${item.qty}" step="1" value="${item.qty}" style="width:80px;" aria-label="Quantity to void">
          <span class="text-muted" style="font-size:0.8rem;">of ${item.qty}</span>
        </div>`
        : ""
    )
    .join("");
  const ok = await showAppConfirm(`Void items from SI No. ${sale.invoiceNo || "-"} (${formatPeso(sale.total)})? Voided items go back into stock.`, {
    title: "Void Walk-in Sale",
    confirmLabel: "Void Selected",
    fieldHtml: `
      <p class="detail-label mb-2">Items to void (untick or lower the quantity to keep an item)</p>
      ${rows}
      <label class="form-label mt-2" for="voidReasonInput">Reason for void *</label>
      <textarea class="form-control mb-3" id="voidReasonInput" rows="2" placeholder="e.g. Wrong item rung up"></textarea>
      <div class="form-check mb-2">
        <input class="form-check-input" type="checkbox" id="voidExchangeCheck">
        <label class="form-check-label" for="voidExchangeCheck">Customer is exchanging for other items</label>
      </div>
      <input type="text" class="form-control mb-2" id="voidExchangeItemsInput" placeholder="Replacement item(s), e.g. Biogesic 500mg x10">
      <input type="number" step="0.01" class="form-control" id="voidExchangeDiffInput" placeholder="Price difference paid by customer (₱)">
      <p class="text-muted mt-2 mb-0" style="font-size:0.78rem;">Ring up the replacement as a new sale in the POS.</p>
      ${
        requireApproval
          ? `
      <hr>
      <p class="detail-label mb-2">Branch Manager approval *</p>
      <input type="email" class="form-control mb-2" id="voidApproverEmail" placeholder="Branch Manager's email" autocomplete="off">
      <input type="password" class="form-control" id="voidApproverPassword" placeholder="Branch Manager's password" autocomplete="new-password">`
          : ""
      }
    `,
  });
  if (!ok) return null;
  let approvedBy = null;
  if (requireApproval) {
    try {
      approvedBy = await verifyVoidApprover(document.getElementById("voidApproverEmail").value.trim(), document.getElementById("voidApproverPassword").value);
    } catch (error) {
      await showAppAlert(`${error.message} Nothing was changed.`);
      return null;
    }
  }

  const lines = [];
  let invalidQty = false;
  document.querySelectorAll(".void-line-check").forEach((check) => {
    if (!check.checked) return;
    const idx = Number(check.dataset.idx);
    const qtyInput = document.querySelector(`.void-line-qty[data-idx="${idx}"]`);
    const qty = parseInt(qtyInput.value, 10);
    if (!qty || qty < 1 || qty > items[idx].qty) invalidQty = true;
    else lines.push({ index: idx, qty });
  });
  if (invalidQty) {
    await showAppAlert("Each quantity to void must be between 1 and the quantity sold. Nothing was changed.");
    return null;
  }
  if (lines.length === 0) {
    await showAppAlert("Select at least one item to void. Nothing was changed.");
    return null;
  }
  const reason = document.getElementById("voidReasonInput").value.trim();
  if (!reason) {
    await showAppAlert("A reason is required to void a sale. Nothing was changed.");
    return null;
  }
  const exchanging = document.getElementById("voidExchangeCheck").checked;
  const diff = parseFloat(document.getElementById("voidExchangeDiffInput").value);
  return {
    reason,
    lines,
    approvedBy,
    exchange: exchanging
      ? {
          replacementItems: document.getElementById("voidExchangeItemsInput").value.trim(),
          priceDifference: isNaN(diff) ? 0 : diff,
        }
      : null,
  };
}

// Checks a Branch Manager's email and password on a separate Firebase app
// instance, so the signed-in staff member stays signed in. Resolves the
// approver's name.
async function verifyVoidApprover(email, password) {
  if (!email || !password) throw new Error("The Branch Manager's email and password are required to approve this void.");
  const app = firebase.initializeApp(firebaseConfig, `VoidApproval${Date.now()}`);
  try {
    const cred = await app.auth().signInWithEmailAndPassword(email, password);
    const doc = await db.collection("users").doc(cred.user.uid).get();
    const data = doc.exists ? doc.data() : {};
    await app.auth().signOut();
    if (!["branch_manager", "admin"].includes(data.role)) throw new Error("That account isn't a Branch Manager, so it can't approve voids.");
    if (data.accountStatus === "deactivated") throw new Error("That Branch Manager account is deactivated.");
    return `${data.firstName || ""} ${data.lastName || ""}`.trim() || email;
  } catch (error) {
    if (error && error.code && String(error.code).startsWith("auth/")) throw new Error("The Branch Manager's email or password is incorrect.");
    throw error;
  } finally {
    await app.delete();
  }
}

// Voids the given lines ([{ index, qty }], or every remaining unit when
// omitted), all in one transaction. Units go back to the exact batches
// they were taken from, latest-expiring first. Voiding everything left
// marks the whole sale voided; anything less is a partial void: the item
// quantities and the sale total drop by what was voided (so every report
// counts only what was really sold) and the void is kept in partialVoids.
async function voidPosSale(sale, { reason, exchange, lines = null, approvedBy = null }, voidedBy) {
  const saleRef = db.collection("posSales").doc(sale.id);
  const requested = lines || (sale.items || []).map((item, index) => ({ index, qty: item.qty }));

  // Sales made before batches were recorded: put the units back on the
  // product's latest-expiring active batch.
  const fallbackRefs = {};
  for (const { index } of requested) {
    const item = (sale.items || [])[index];
    if (!item || (item.batches && item.batches.length) || fallbackRefs[item.productId]) continue;
    const snap = await db.collection("stockBatches").where("productId", "==", item.productId).where("status", "==", "active").get();
    const latest = snap.docs.sort((a, b) => new Date(b.data().expirationDate) - new Date(a.data().expirationDate))[0];
    if (!latest) throw new Error(`No active batch of ${item.name} to return the stock to. Receive stock first, then void.`);
    fallbackRefs[item.productId] = latest.ref;
  }

  let voidedLines = [];
  let fullVoid = false;
  let voidedAmount = 0;

  await db.runTransaction(async (transaction) => {
    const saleDoc = await transaction.get(saleRef);
    if (!saleDoc.exists) throw new Error("This sale no longer exists.");
    const data = saleDoc.data();
    if (data.voided) throw new Error("This sale was already voided.");

    const items = JSON.parse(JSON.stringify(data.items || []));
    const returns = new Map(); // batchId -> units to put back
    voidedLines = [];
    voidedAmount = 0;
    for (const { index, qty } of requested) {
      const item = items[index];
      if (!item) throw new Error("An item in this void is no longer on the sale. Reopen the sale and try again.");
      if (qty > item.qty) throw new Error(`Only ${item.qty} of ${item.name} is left on this sale to void.`);
      if (qty <= 0) continue;
      let need = qty;
      if (item.batches && item.batches.length) {
        for (let i = item.batches.length - 1; i >= 0 && need > 0; i--) {
          const take = Math.min(item.batches[i].qty, need);
          if (take <= 0) continue;
          returns.set(item.batches[i].batchId, (returns.get(item.batches[i].batchId) || 0) + take);
          item.batches[i].qty -= take;
          need -= take;
        }
        if (need > 0) throw new Error(`The batch record for ${item.name} doesn't cover this quantity; void the whole sale instead.`);
      } else {
        const fallback = fallbackRefs[item.productId];
        returns.set(fallback.id, (returns.get(fallback.id) || 0) + qty);
      }
      item.qty -= qty;
      item.voidedQty = (item.voidedQty || 0) + qty;
      voidedAmount += qty * (item.price || 0);
      voidedLines.push({ name: item.name, qty, amount: qty * (item.price || 0) });
    }
    if (voidedLines.length === 0) throw new Error("Nothing was selected to void.");
    fullVoid = items.every((item) => item.qty === 0);

    const batchDocs = [];
    for (const batchId of returns.keys()) {
      batchDocs.push(await transaction.get(db.collection("stockBatches").doc(batchId)));
    }
    batchDocs.forEach((doc) => {
      if (!doc.exists) throw new Error("A batch from this sale no longer exists; the stock can't be returned automatically.");
      transaction.update(doc.ref, {
        quantity: (doc.data().quantity || 0) + returns.get(doc.id),
        lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (fullVoid) {
      // The record keeps the quantities as sold; voided: true takes the
      // whole sale out of every total.
      transaction.update(saleRef, {
        voided: true,
        voidReason: reason,
        voidExchange: exchange,
        voidedBy,
        voidApprovedBy: approvedBy,
        voidedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(saleRef, {
        items,
        total: Math.round(((data.total || 0) - voidedAmount) * 100) / 100,
        originalTotal: data.originalTotal != null ? data.originalTotal : data.total || 0,
        voidedAmount: Math.round(((data.voidedAmount || 0) + voidedAmount) * 100) / 100,
        partialVoids: (data.partialVoids || []).concat([
          { lines: voidedLines, amount: voidedAmount, reason, exchange, voidedBy, approvedBy, voidedAt: new Date() },
        ]),
      });
    }
  });

  await logAuditEvent({
    action: fullVoid ? "Walk-in Sale Voided" : "Walk-in Sale Items Voided",
    details:
      `SI ${sale.invoiceNo || sale.id} - ${formatPeso(voidedAmount)} voided - Reason: ${reason}` +
      (approvedBy ? ` - Approved by ${approvedBy}` : "") +
      (exchange ? ` - Exchange: ${exchange.replacementItems || "unspecified"}, price difference ${formatPeso(exchange.priceDifference)}` : "") +
      ` - Items returned to stock: ${voidedLines.map((l) => `${l.name} x${l.qty}`).join(", ")}`,
  });

  return { fullVoid, voidedAmount, voidedLines };
}

// Receipt banner text for a voided or partly voided sale, or null.
function partialVoidSummary(sale) {
  if (!sale.partialVoids || !sale.partialVoids.length) return null;
  return sale.partialVoids
    .map((v) => {
      const when = v.voidedAt ? formatDateMDY(v.voidedAt, true) : "";
      return `${v.lines.map((l) => `${l.name} x${l.qty}`).join(", ")} (${formatPeso(v.amount)}) - ${v.reason}${v.voidedBy ? ` (by ${v.voidedBy}${when ? `, ${when}` : ""})` : ""}${v.approvedBy ? `, approved by ${v.approvedBy}` : ""}`;
    })
    .join("; ");
}

function voidSummary(sale) {
  if (!sale.voided) return null;
  const when = sale.voidedAt && sale.voidedAt.toDate ? formatDateMDY(sale.voidedAt, true) : "";
  return `${sale.voidReason || ""}${sale.voidedBy ? ` (by ${sale.voidedBy}${when ? `, ${when}` : ""})` : ""}${sale.voidApprovedBy ? `, approved by ${sale.voidApprovedBy}` : ""}`;
}

// MM/DD/YYYY (REQNF028) for a Firestore Timestamp, Date, or ISO string.
function formatDateMDY(value, withTime = false) {
  if (!value) return "";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (isNaN(date)) return "";
  const mdy = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  return withTime ? `${mdy} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : mdy;
}

// ---- Table export (PDF or Excel) ----
// Exports exactly the rows a page is showing (after its search/filters).
// columns: [{ label, value: (row) => text, width? }] - width is a share
// of the PDF page width (defaults to equal shares).
async function exportTable({ title, subtitle = "", filenamePrefix, columns, rows }) {
  const format = await showAppSelect(
    `${rows.length} row${rows.length === 1 ? "" : "s"} will be exported.`,
    [
      { value: "pdf", label: "PDF" },
      { value: "xlsx", label: "Excel (.xlsx)" },
    ],
    { title: `Export ${title}`, confirmLabel: "Export" }
  );
  if (!format) return;

  const stamp = new Date().toISOString().slice(0, 10);
  const cells = rows.map((row) => columns.map((col) => {
    const v = col.value(row);
    return v === null || v === undefined ? "" : v;
  }));

  if (format === "xlsx") {
    if (typeof XLSX === "undefined") {
      showAppAlert("Excel export isn't available right now. Please try again in a moment.");
      return;
    }
    const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), ...cells]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, title.slice(0, 31));
    XLSX.writeFile(wb, `${filenamePrefix}-${stamp}.xlsx`);
    return;
  }

  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape" });
  const marginX = 10;
  const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const totalShare = columns.reduce((sum, c) => sum + (c.width || 1), 0);
  const widths = columns.map((c) => ((c.width || 1) / totalShare) * pageWidth);
  const lineHeight = 4.2;
  let y = 14;

  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text(`${POS_BRANCH_NAME} - ${title}`, marginX, y);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(`${subtitle ? `${subtitle}  |  ` : ""}Generated ${formatDateMDY(new Date(), true)}  |  ${rows.length} row(s)`, marginX, y);
  y += 7;

  const drawRow = (values, bold) => {
    doc.setFont(undefined, bold ? "bold" : "normal");
    const wrapped = values.map((v, i) => doc.splitTextToSize(String(v), widths[i] - 2));
    const height = Math.max(...wrapped.map((w) => w.length)) * lineHeight + 1.5;
    if (y + height > pageHeight - 10) {
      doc.addPage();
      y = 14;
      if (!bold) drawRow(columns.map((c) => c.label), true);
    }
    let x = marginX;
    wrapped.forEach((lines, i) => {
      doc.text(lines, x, y);
      x += widths[i];
    });
    y += height;
    doc.setDrawColor(220);
    doc.line(marginX, y - 1.5, marginX + pageWidth, y - 1.5);
  };

  doc.setFontSize(8);
  drawRow(columns.map((c) => c.label), true);
  if (cells.length === 0) {
    doc.text("No rows match the current filters.", marginX, y + 2);
  }
  cells.forEach((row) => drawRow(row, false));
  doc.save(`${filenamePrefix}-${stamp}.pdf`);
}

// ---- FEFO stock deduction for a single product ----
// Runs as a Firestore transaction so two staff approving two different
// orders for the same tightly-stocked product at nearly the same time
// can't both pass the availability check against stale reads and both
// succeed - Firestore detects the conflicting read and retries the
// transaction with fresh data, so the second one correctly re-checks
// against what the first one actually left behind. A thin wrapper around
// deductStockFEFOMultiple below - see there for why a multi-item order
// can't just call this once per item.
async function deductStockFEFO(productId, qty, opts = {}) {
  return deductStockFEFOMultiple([{ productId, qty }], opts);
}

// ---- FEFO stock deduction for a whole multi-item order, atomically ----
// deductStockFEFO deducts one product per call, each in its own
// transaction - fine for a single item, but a caller looping it across an
// order's items has no way to undo the ones that already succeeded if a
// later item runs out of stock. That left earlier items silently
// deducted with no order ever actually created/approved to account for
// it, and retrying the same loop later (once restocked) would deduct
// those already-decremented items a second time. This does every item in
// one transaction instead: it reads and validates all of them before
// writing any of them, so a shortfall on one item aborts the whole thing
// with nothing changed, exactly like deductStockFEFO does for a single
// product.
//
// Returns { allocations, invoiceNo }. allocations lists, per input item
// (same order), the batches it was actually taken from - [{ batchId,
// batchNo, expirationDate, qty }] - so every sale can record batch numbers
// and expiry dates for the daily reports.
//
// Pass `record` to write the sale itself in the same transaction:
// { ref, mode: "set" | "update", build(allocations, invoiceNo) => data,
//   alsoWrite?(transaction, invoiceNo), check?(doc) }.
// A record also gets the next Sales Invoice number (SI#), allocated inside
// the same transaction so a failed sale never burns a number and two sales
// can never share one.
// Options beyond the sale record, for exchanges:
//   returns:    [{ batchId, qty }] units put back on those batches in the
//               same transaction (a returned item)
//   extraReads: document refs read inside the transaction; their snapshots
//               are passed to afterWrite
//   afterWrite: (transaction, { allocations, invoiceNo, extraDocs }) => more
//               writes that must succeed or fail together with the stock
async function deductStockFEFOMultiple(items, { includeWholesaleOnly = false, record = null, returns = [], extraReads = [], afterWrite = null } = {}) {
  const allowedStatuses = includeWholesaleOnly ? ["active", "wholesale_only"] : ["active"];
  const isSellable = includeWholesaleOnly ? isWholesaleSellableBatch : isRetailSellableBatch;

  const itemsWithCandidates = await Promise.all(
    items.map(async (item) => {
      const candidates = await db
        .collection("stockBatches")
        .where("productId", "==", item.productId)
        .where("status", "in", allowedStatuses)
        .get();

      const refsInFefoOrder = candidates.docs
        .map((doc) => ({ ref: doc.ref, expirationDate: doc.data().expirationDate }))
        .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
        .map((b) => b.ref);

      return { productId: item.productId, qty: item.qty, refsInFefoOrder };
    })
  );

  return db.runTransaction(async (transaction) => {
    // Read and validate every item first - nothing is written until all
    // of them are confirmed available, so a shortfall on any one item
    // leaves every item untouched.
    const perItemBatches = [];
    for (const item of itemsWithCandidates) {
      const batches = [];
      for (const ref of item.refsInFefoOrder) {
        const doc = await transaction.get(ref);
        if (doc.exists && isSellable(doc.data())) {
          const data = doc.data();
          batches.push({ ref, quantity: data.quantity, batchNo: data.batchNo || "", expirationDate: data.expirationDate || "" });
        }
      }

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < item.qty) {
        throw new Error("Not enough stock available to fulfill this quantity.");
      }

      perItemBatches.push({ qty: item.qty, batches });
    }

    const returnDocs = [];
    for (const r of returns) {
      const doc = await transaction.get(db.collection("stockBatches").doc(r.batchId));
      if (!doc.exists) throw new Error("The batch the item came from no longer exists; it can't be returned to stock automatically.");
      returnDocs.push({ doc, qty: r.qty });
    }
    const extraDocs = [];
    for (const ref of extraReads) extraDocs.push(await transaction.get(ref));
    // record.check(doc) may throw to stop the sale if the record changed
    // since it was loaded (e.g. another staff member already approved it).
    if (record && record.check) record.check(await transaction.get(record.ref));

    // Firestore transactions need every read before any write.
    let invoiceNo = null;
    if (record) {
      const counterDoc = await transaction.get(SALES_INVOICE_COUNTER_REF());
      const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
      transaction.set(SALES_INVOICE_COUNTER_REF(), { count: next }, { merge: true });
      invoiceNo = formatInvoiceNo(next);
    }

    // New quantity per batch, so a batch both deducted and returned to (or
    // used by two items) is written once with the right figure.
    const newQty = new Map();
    const batchRefs = new Map();
    const allocations = [];
    for (const item of perItemBatches) {
      let remaining = item.qty;
      const used = [];
      for (const batch of item.batches) {
        if (remaining <= 0) break;
        const current = newQty.has(batch.ref.id) ? newQty.get(batch.ref.id) : batch.quantity;
        const deduct = Math.min(current, remaining);
        if (deduct <= 0) continue;
        newQty.set(batch.ref.id, current - deduct);
        batchRefs.set(batch.ref.id, batch.ref);
        used.push({ batchId: batch.ref.id, batchNo: batch.batchNo, expirationDate: batch.expirationDate, qty: deduct });
        remaining -= deduct;
      }
      if (remaining > 0) throw new Error("Not enough stock available to fulfill this quantity.");
      allocations.push(used);
    }
    returnDocs.forEach(({ doc, qty }) => {
      const current = newQty.has(doc.id) ? newQty.get(doc.id) : doc.data().quantity || 0;
      newQty.set(doc.id, current + qty);
      batchRefs.set(doc.id, doc.ref);
    });
    newQty.forEach((quantity, id) => {
      transaction.update(batchRefs.get(id), {
        quantity,
        lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    if (record) {
      const data = record.build(allocations, invoiceNo);
      if (record.mode === "update") transaction.update(record.ref, data);
      else transaction.set(record.ref, data);
      // Any other writes that must succeed or fail together with the sale
      // (e.g. crediting an overpayment to the customer's balance).
      if (record.alsoWrite) record.alsoWrite(transaction, invoiceNo);
    }
    if (afterWrite) afterWrite(transaction, { allocations, invoiceNo, extraDocs });
    return { allocations, invoiceNo };
  });
}

// ---- Wholesale exchange (REQ090, Fig 2.15) ----
// No refunds: the buyer returns units from a recorded wholesale order and
// takes a replacement of equal or higher value, paying any difference. In
// one transaction the returned units go back to the batch they came from
// (latest-expiring first), the replacement is taken by FEFO, the order line
// remembers what was returned, and the exchange record is written.
async function processWholesaleExchange({ orderId, lineIndex, returnQty, replacement, reason, processedBy }) {
  const orderRef = db.collection("wholesaleOrders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("This wholesale order no longer exists.");
  const order = orderSnap.data();
  const line = (order.items || [])[lineIndex];
  if (!line) throw new Error("That item isn't on this order.");
  const remaining = line.qty - (line.returnedQty || 0);
  if (!(returnQty > 0) || returnQty > remaining) throw new Error(`Only ${remaining} of ${line.productName} can still be returned from this order.`);
  if (!reason || !reason.trim()) throw new Error("A reason for the exchange is required.");
  if (!replacement || !replacement.productId || !(replacement.qty > 0)) throw new Error("Choose the replacement item and quantity.");

  const returnedValue = Math.round(returnQty * (line.unitPrice || 0) * 100) / 100;
  const replacementValue = Math.round(replacement.qty * (replacement.unitPrice || 0) * 100) / 100;
  if (replacementValue < returnedValue) {
    throw new Error(`The replacement (${formatPeso(replacementValue)}) must be of equal or higher value than the returned items (${formatPeso(returnedValue)}). Refunds aren't given.`);
  }

  // Which batches the returned units go back to, latest-expiring first,
  // skipping units already returned earlier.
  const batches = (line.batches || []).map((b) => ({ ...b }));
  const returnParts = [];
  let need = returnQty;
  for (let i = batches.length - 1; i >= 0 && need > 0; i--) {
    const left = (batches[i].qty || 0) - (batches[i].returnedQty || 0);
    const take = Math.min(left, need);
    if (take <= 0) continue;
    returnParts.push({ batchId: batches[i].batchId, batchNo: batches[i].batchNo, expirationDate: batches[i].expirationDate, qty: take });
    batches[i].returnedQty = (batches[i].returnedQty || 0) + take;
    need -= take;
  }
  if (need > 0) throw new Error("This order line has no batch record to return the stock to. Record the return with a write-off/receiving entry instead.");

  const counterRef = db.collection("counters").doc("wholesaleExchanges");
  const exchangeRef = db.collection("wholesaleExchanges").doc();
  const replacementProduct = getProductById(replacement.productId);
  let exchangeNo = null;

  await deductStockFEFOMultiple([{ productId: replacement.productId, qty: replacement.qty }], {
    includeWholesaleOnly: true,
    returns: returnParts.map((p) => ({ batchId: p.batchId, qty: p.qty })),
    extraReads: [orderRef, counterRef],
    afterWrite: (tx, { allocations, extraDocs }) => {
      const [freshOrder, counterDoc] = extraDocs;
      const freshLine = (freshOrder.data().items || [])[lineIndex];
      if (!freshLine || freshLine.qty - (freshLine.returnedQty || 0) < returnQty) {
        throw new Error("This order was changed by someone else. Reopen it and try again.");
      }
      const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
      exchangeNo = `EX-${String(next).padStart(5, "0")}`;
      tx.set(counterRef, { count: next }, { merge: true });

      const items = freshOrder.data().items.map((it, idx) =>
        idx === lineIndex ? { ...it, returnedQty: (it.returnedQty || 0) + returnQty, batches } : it
      );
      tx.update(orderRef, { items });
      tx.set(exchangeRef, {
        exchangeNo,
        wholesaleOrderId: orderId,
        invoiceNo: order.invoiceNo || "",
        wholesaleAccountId: order.wholesaleAccountId || null,
        buyerName: order.buyerName || "",
        purchasedAt: order.createdAt || null,
        returned: { productId: line.productId, productName: line.productName, qty: returnQty, unitPrice: line.unitPrice || 0, value: returnedValue, batches: returnParts },
        replacement: {
          productId: replacement.productId,
          productName: replacementProduct ? replacementProduct.name : replacement.productId,
          qty: replacement.qty,
          unitPrice: replacement.unitPrice || 0,
          value: replacementValue,
          batches: allocations[0],
        },
        priceDifference: Math.round((replacementValue - returnedValue) * 100) / 100,
        reason: reason.trim(),
        processedBy: processedBy || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    },
  });

  await logAuditEvent({
    action: "Wholesale Exchange",
    details:
      `${exchangeNo} - ${order.buyerName || ""}, SI ${order.invoiceNo || "-"}: returned ${line.productName} x${returnQty} (${formatPeso(returnedValue)}), ` +
      `replaced with ${replacementProduct ? replacementProduct.name : replacement.productId} x${replacement.qty} (${formatPeso(replacementValue)}), ` +
      `difference ${formatPeso(replacementValue - returnedValue)}. Reason: ${reason.trim()}`,
  });

  const saved = await exchangeRef.get();
  return { id: exchangeRef.id, ...saved.data() };
}

// ---- Sales Invoice numbers ----
// One running number across walk-in, online and wholesale sales, matching
// the branch's existing SI# sequence (e.g. 00008247). To continue from the
// current paper booklet, set counters/salesInvoices.count to the last used
// number once.
function SALES_INVOICE_COUNTER_REF() {
  return db.collection("counters").doc("salesInvoices");
}

function formatInvoiceNo(n) {
  return String(n).padStart(8, "0");
}

// Flattens an allocation list into the line-level fields stored on a sale.
function batchFieldsFromAllocation(used) {
  return {
    batches: used,
    batchNo: used.map((b) => b.batchNo).filter(Boolean).join(", "),
    expirationDate: used.length ? used[0].expirationDate : "",
  };
}

// ---- Audit log helper ----
async function logAuditEvent({ action, details, actor }) {
  try {
    let actorName = actor;
    if (!actorName && auth.currentUser) {
      const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        actorName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Unknown";
      }
    }

    await db.collection("auditLog").add({
      action,
      details: details || "",
      user: actorName || "Unknown",
      ipAddress: "-",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

// Shared by every "cart-item-image" thumbnail (cart, checkout, payment
// summary, order details, My Orders) so they all show the product photo
// the same way the catalog cards do, instead of an empty placeholder box.
// Returns bare CSS declarations (no surrounding style="..."), so callers
// with their own inline sizing can just append this to it.
function cartItemImageCss(imageUrl) {
  return imageUrl ? `background-image:url('${imageUrl}'); background-size:cover; background-position:center;` : "";
}

function renderProductCard(product) {
  return `
    <div class="col">
      <div class="product-card ${product.inStock ? "" : "out-of-stock"}">
        <a href="product-details.html?id=${product.id}" class="product-image-link product-quickview-trigger" data-product-id="${product.id}">
          <div class="product-image" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}'); background-size:cover; background-position:center;"` : ""}>
            ${product.inStock ? "" : `<span class="product-image-badge">Out of Stock</span>`}
          </div>
        </a>
        <a href="product-details.html?id=${product.id}" class="product-name-link product-quickview-trigger" data-product-id="${product.id}">
          <h3 class="product-name">${product.name}</h3>
        </a>
        <p class="product-desc">${product.description || ""}</p>
        <p class="product-price">${formatPeso(product.price)}</p>
        ${product.inStock ? `<p class="text-muted mb-1" style="font-size:0.78rem;">${product.totalStock} in stock</p>` : ""}
        ${product.rxRequired ? `<p class="text-muted mb-2" style="font-size:0.78rem;"><i class="bi bi-file-medical me-1"></i>Prescription required</p>` : ""}
        <button type="button" class="btn btn-amson w-100 btn-add-cart" data-id="${product.id}" ${product.inStock ? "" : "disabled"}>
          ${product.inStock ? "+ Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  `;
}

// ---- Product quick-view (popup instead of a full page navigation) ----
// Clicking a product card's image/name used to be a full page load to
// product-details.html - jarring for just glancing at a product. Cards
// still carry that href (so middle-click/ctrl-click/right-click "open in
// new tab" and no-JS access keep working), but a plain left-click is
// intercepted here and opens this shared modal instead. Pages that don't
// include #productQuickViewModal (like product-details.html itself) just
// fall through to the normal link, so that page still works as a direct,
// shareable, bookmarkable URL.
document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".product-quickview-trigger");
  if (!trigger) return;
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const modalEl = document.getElementById("productQuickViewModal");
  if (!modalEl) return;

  e.preventDefault();
  showProductQuickView(trigger.dataset.productId);
});

async function showProductQuickView(productId) {
  const modalEl = document.getElementById("productQuickViewModal");
  if (!modalEl) return;

  await loadCatalogCache();
  const product = getProductById(productId);
  const bodyEl = document.getElementById("productQuickViewBody");

  if (!product) {
    bodyEl.innerHTML = `<p class="text-center mb-0 py-4">This product could not be found.</p>`;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    return;
  }

  bodyEl.innerHTML = `
    <div class="row g-4">
      <div class="col-md-5">
        <div class="product-detail-image" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}'); background-size:cover; background-position:center;"` : ""}></div>
      </div>
      <div class="col-md-7">
        <h2 class="h4 fw-bold mb-1">${product.name}</h2>
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
            <button type="button" id="quickViewQtyMinus" aria-label="Decrease quantity">&minus;</button>
            <input type="text" id="quickViewQtyInput" value="1" inputmode="numeric">
            <button type="button" id="quickViewQtyPlus" aria-label="Increase quantity">+</button>
          </div>
          <span class="text-muted">Subtotal: <strong id="quickViewSubtotalText">${formatPeso(product.price)}</strong></span>
        </div>

        ${
          product.rxRequired
            ? `<p class="text-muted mb-3" style="font-size:0.85rem;">This medicine requires a valid prescription. You'll be asked to upload it at checkout.</p>`
            : ""
        }
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-amson flex-fill py-2" id="quickViewAddToCartBtn" ${product.inStock ? "" : "disabled"}>
            <i class="bi bi-cart3 me-2"></i>${product.inStock ? "Add to Cart" : "Out of Stock"}
          </button>
          <a href="product-details.html?id=${product.id}" class="btn btn-outline-dark-amson py-2" title="Open full page">
            <i class="bi bi-arrows-fullscreen"></i>
          </a>
        </div>
      </div>
    </div>

    <div class="product-about mt-4">
      <h3 class="h6 fw-bold">About the Product</h3>
      <p class="mb-0">${product.description || "No description available yet."}</p>
      ${product.dosageNotes ? `<h3 class="h6 fw-bold mt-3">Dosage / Usage</h3><p class="mb-0">${escapeHtml(product.dosageNotes)}</p>` : ""}
    </div>
  `;

  const qtyInput = document.getElementById("quickViewQtyInput");
  const subtotalText = document.getElementById("quickViewSubtotalText");
  const maxQty = Math.max(product.totalStock || 0, 0);

  function currentQty() {
    const val = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    return maxQty > 0 ? Math.min(val, maxQty) : val;
  }

  function updateSubtotal() {
    subtotalText.textContent = formatPeso(product.price * currentQty());
  }

  document.getElementById("quickViewQtyMinus").addEventListener("click", () => {
    qtyInput.value = Math.max(1, currentQty() - 1);
    updateSubtotal();
  });

  document.getElementById("quickViewQtyPlus").addEventListener("click", () => {
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

  const addToCartBtn = document.getElementById("quickViewAddToCartBtn");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const result = addToCart(product.id, currentQty());
      if (result.capped && result.qty === 0) {
        showCartToast("Sorry, that item is out of stock.", "warning");
      } else if (result.capped) {
        showCartToast(`Only ${result.qty} in stock - your cart is now at the limit.`, "warning");
      } else {
        showCartToast(`Added ${currentQty()} × ${product.name} to cart.`);
      }
    });
  }

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
