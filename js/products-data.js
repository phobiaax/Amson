// shared core for most pages, sections are listed in CODE_MAP.md

// =====================================================================
// ---- dialogs ----
// bootstrap popups instead of alert/confirm/prompt

// ---- stacked modal darkening ----
// each new modal and backdrop goes above the last one
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

// ---- shared dialog ui ----
// replaces the browsers own alert and confirm boxes
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
          <div class="alert alert-danger auth-alert d-none mb-3" id="appDialogError" role="alert" style="white-space:pre-line;"></div>
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

// replaces alert(), resolves when closed
function showAppAlert(message, { title = "Notice" } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    setAppDialogField(null);
    document.getElementById("appDialogError").classList.add("d-none");
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

// optional input inside the dialog, null hides it
function setAppDialogField(html) {
  const field = document.getElementById("appDialogField");
  field.innerHTML = html || "";
  field.classList.toggle("d-none", !html);
}

// replaces confirm(), closing without confirm counts as false
function showAppConfirm(message, { title = "Please Confirm", confirmLabel = "Confirm", cancelLabel = "Cancel", fieldHtml = null, onRender = null, validate = null } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    setAppDialogField(fieldHtml);
    const errorEl = document.getElementById("appDialogError");
    errorEl.classList.add("d-none");
    if (onRender) onRender();
    const cancelBtn = document.getElementById("appDialogCancelBtn");
    const okBtn = document.getElementById("appDialogOkBtn");
    cancelBtn.classList.remove("d-none");
    cancelBtn.textContent = cancelLabel;
    okBtn.textContent = confirmLabel;

    const modalEl = document.getElementById("appDialogModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    let confirmed = false;
    let busy = false;
    const onOk = async () => {
      if (validate) {
        busy = true;
        okBtn.disabled = true;
        cancelBtn.disabled = true;
        let problem = null;
        try {
          problem = await validate();
        } catch (error) {
          problem = (error && error.message) || "Something went wrong. Please try again.";
        }
        busy = false;
        okBtn.disabled = false;
        cancelBtn.disabled = false;
        if (problem) {
          showFormAlert(errorEl, problem);
          return;
        }
      }
      confirmed = true;
      modal.hide();
    };
    const onCancel = () => modal.hide();
    // cant close while a check or save is running
    const onHide = (e) => {
      if (busy) e.preventDefault();
    };
    const onHidden = () => {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modalEl.removeEventListener("hide.bs.modal", onHide);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve(confirmed);
    };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modalEl.addEventListener("hide.bs.modal", onHide);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    modal.show();
  });
}

// replaces prompt(), null if cancelled
async function showAppPrompt(message, { title = "Enter a value", defaultValue = "", confirmLabel = "Save" } = {}) {
  const ok = await showAppConfirm(message, {
    title,
    confirmLabel,
    fieldHtml: `<input type="text" class="form-control" id="appDialogInput" value="${escapeHtml(defaultValue)}">`,
  });
  return ok ? document.getElementById("appDialogInput").value : null;
}

// pick one option, null if cancelled
async function showAppSelect(message, options, { title = "Choose", confirmLabel = "Continue" } = {}) {
  const optionsHtml = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join("");
  const ok = await showAppConfirm(message, {
    title,
    confirmLabel,
    fieldHtml: `<select class="form-select" id="appDialogSelect">${optionsHtml}</select>`,
  });
  return ok ? document.getElementById("appDialogSelect").value : null;
}

// bootstrap cant stack modals so wait for one to close first
function hideModalAndWait(el) {
  const modal = bootstrap.Modal.getInstance(el);
  if (!modal || !el.classList.contains("show")) return Promise.resolve();
  // keeps asking a still-opening modal to hide, gives up after 3s
  return new Promise((resolve) => {
    const started = Date.now();
    const check = () => {
      const gone = !el.classList.contains("show") && el.style.display !== "block";
      if (gone || Date.now() - started > 3000) return resolve();
      modal.hide();
      setTimeout(check, 150);
    };
    check();
  });
}

// =====================================================================
// ---- shared limits ----
// firestore allows 500 writes per batch, 400 leaves room
const FIRESTORE_BATCH_LIMIT = 400;
// wholesale documents count as expiring this many days before
const DOCUMENT_EXPIRY_WARNING_DAYS = 30;
// excel limits, the backup cuts cells a bit earlier
const EXCEL_SHEET_NAME_MAX = 31;
const EXCEL_CELL_MAX_CHARS = 32000;
// live listener falls back to a plain read after this long offline
const LIVE_QUERY_OFFLINE_MS = 10000;

// =====================================================================
// ---- catalog ----

let CATALOG_PRODUCTS = [];

let CATEGORY_LABELS = {};

let catalogLoadPromise = null;

function getProductById(id) {
  return CATALOG_PRODUCTS.find((p) => String(p.id) === String(id));
}

// only active products marked available online show in the shop
function storefrontCatalog() {
  return CATALOG_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore);
}

// ---- duplicate product names ----
// same name ignoring caps, spaces and dots
function productNameKey(name) {
  return String(name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function findProductByName(name, exceptId = null) {
  const key = productNameKey(name);
  if (!key) return null;
  return CATALOG_PRODUCTS.find((p) => p.id !== exceptId && productNameKey(p.name) === key) || null;
}

// ---------- sku generation ----------
// never reuses a taken code, starts past the highest med- code
async function generateProductSku() {
  const counterRef = db.collection("counters").doc("products");
  const used = new Set(CATALOG_PRODUCTS.map((p) => String(p.sku || "").toUpperCase()));
  const highest = CATALOG_PRODUCTS.reduce((max, p) => {
    const m = String(p.sku || "").match(/^MED-(\d+)$/i);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);
  return db.runTransaction(async (tx) => {
    const counterDoc = await tx.get(counterRef);
    let next = Math.max(counterDoc.exists ? counterDoc.data().count || 0 : 0, highest) + 1;
    while (used.has(`MED-${String(next).padStart(4, "0")}`)) next += 1;
    tx.set(counterRef, { count: next }, { merge: true });
    return `MED-${String(next).padStart(4, "0")}`;
  });
}

// =====================================================================
// ---- stock levels and alerts ----

const DEFAULT_REORDER_POINT = 20;

const NEAR_EXPIRY_MONTHS = 6;

function nearExpiryCutoff() {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() + NEAR_EXPIRY_MONTHS);
  return cutoff;
}

// retail only sells active batches not close to expiry
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

// severity colors shared by the pills and notifications
const SEVERITY_COLORS = {
  danger: "#EE3137",
  warning: "#b8860b",
  info: "#4A90D9",
  success: "#1a9c4b",
};

// stock level and expiry are separate, a batch can be both
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

// every status that applies to this batch
function getBatchStatuses(batch, totalStockOverride) {
  const statuses = [getStockLevelStatus(batch, totalStockOverride), getExpiryStatus(batch)].filter((s) => s !== "normal");
  return statuses.length > 0 ? statuses : ["normal"];
}

// physical stock per product, any status
function sumPhysicalStockByProduct(batches) {
  const map = {};
  batches.forEach((b) => {
    map[b.productId] = (map[b.productId] || 0) + (b.quantity || 0);
  });
  return map;
}

// ---- inventory alert counts ----
// per product, used by the dashboard and inventory tiles
async function computeInventoryAlertCounts(batchesOverride = null) {
  await loadCatalogCache();
  const batches = batchesOverride || (await liveStockBatches()).docs.map((doc) => doc.data());
  const physicalStockByProduct = sumPhysicalStockByProduct(batches);

  let nearExpiry = 0;
  let expired = 0;
  batches.forEach((b) => {
    if (b.quantity === 0) return; // empty lots dont count for expiry
    const status = getExpiryStatus(b);
    if (status === "near_expiry") nearExpiry += 1;
    if (status === "expired") expired += 1;
  });

  const activeProducts = CATALOG_PRODUCTS.filter((p) => p.status === "active");
  const outOfStock = activeProducts.filter((p) => (physicalStockByProduct[p.id] || 0) === 0).length;
  const lowStock = activeProducts.filter((p) => {
    const stock = physicalStockByProduct[p.id] || 0;
    return stock > 0 && stock <= (p.reorderPoint || DEFAULT_REORDER_POINT);
  }).length;

  return { lowStock, outOfStock, nearExpiry, expired };
}

// =====================================================================
// ---- staff notifications ----

// ---- staff notifications ----
// built fresh from live data each time

// bell reuses the result for two minutes
const STAFF_NOTIF_CACHE_KEY = "amsonStaffNotifs";

const STAFF_NOTIF_CACHE_MS = 2 * 60 * 1000;

async function getStaffNotificationsCached() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(STAFF_NOTIF_CACHE_KEY));
    if (cached && Date.now() - cached.savedAt < STAFF_NOTIF_CACHE_MS && Array.isArray(cached.notifications)) return cached.notifications;
  } catch (error) {}
  return rememberStaffNotifications(await computeStaffNotifications());
}

// lets the notifications page share its fresh list with the bell
function rememberStaffNotifications(notifications, savedAt = Date.now()) {
  try {
    sessionStorage.setItem(STAFF_NOTIF_CACHE_KEY, JSON.stringify({ savedAt, notifications }));
  } catch (error) {}
  return notifications;
}

function staffNotificationsSavedAt() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(STAFF_NOTIF_CACHE_KEY));
    return cached && cached.savedAt ? cached.savedAt : Date.now();
  } catch (error) {
    return Date.now();
  }
}

// same order and chat alerts as the bells live listeners
function staffNotifMillis(v) {
  return v && v.toMillis ? v.toMillis() : v ? new Date(v).getTime() || 0 : 0;
}

function staffOrderNotifications(orderDocs) {
  return orderDocs
    .filter((doc) => doc.data().status === "placed")
    .map((doc) => {
      const o = doc.data();
      return {
        key: `payment_verification:${doc.id}`,
        category: "orders",
        at: Math.max(staffNotifMillis(o.createdAt), staffNotifMillis(o.paymentIssue && o.paymentIssue.resolvedByCustomerAt)),
        signature: o.status,
        severity: "info",
        icon: "bi-credit-card",
        message: `Order ${o.orderNumber} is awaiting payment verification.`,
        link: "online-orders.html",
      };
    });
}

function staffChatNotifications(waitingDocs) {
  if (!waitingDocs.length) return [];
  return [{
    key: "chat_waiting",
    category: "chat",
    at: Math.max(0, ...waitingDocs.map((d) => staffNotifMillis(d.data().handoffAt || d.data().lastMessageAt))),
    signature: waitingDocs.map((d) => d.id).sort().join(","),
    severity: "warning",
    icon: "bi-chat-dots",
    message: `${waitingDocs.length} chat${waitingDocs.length === 1 ? " is" : "s are"} waiting for a staff reply.`,
    link: "live-chat.html",
  }];
}

async function computeStaffNotifications() {
  await loadCatalogCache();
  const [batchSnapshot, orderSnapshot, poSnapshot] = await Promise.all([
    liveStockBatches(),
    liveQuery("orders:placed", db.collection("orders").where("status", "==", "placed")),
    liveQuery("purchaseOrders:discrepancy", db.collection("purchaseOrders").where("status", "==", "discrepancy")),
  ]);

  // each one has a category for the filters and a time
  const notifications = [
    ...stockLevelAlerts(batchSnapshot),
    ...expiryAlerts(batchSnapshot),
    ...staffOrderNotifications(orderSnapshot.docs),
    ...poDiscrepancyAlerts(poSnapshot),
    ...pricePendingAlerts(),
    ...badOrderAlerts(batchSnapshot),
    ...(await wholesaleDocumentAlerts()),
    ...(await wholesaleReleaseAlerts()),
    ...(await waitingChatAlerts()),
  ];

  // newest first
  notifications.sort((a, b) => (b.at || 0) - (a.at || 0));
  return notifications;
}

// low and out of stock, one per product
function stockLevelAlerts(batchSnapshot) {
  const notifications = [];
  const lastStockChange = {};
  batchSnapshot.docs.forEach((doc) => {
    const b = doc.data();
    lastStockChange[b.productId] = Math.max(lastStockChange[b.productId] || 0, staffNotifMillis(b.lastAdjustedAt || b.createdAt));
  });

  // based on physical stock across all batches
  const physicalStockByProduct = sumPhysicalStockByProduct(batchSnapshot.docs.map((doc) => doc.data()));
  CATALOG_PRODUCTS.filter((p) => p.status === "active").forEach((product) => {
    const stock = physicalStockByProduct[product.id] || 0;
    // products that never had a batch arent out of stock yet
    if (stock === 0 && !(product.id in lastStockChange)) return;
    if (stock === 0) {
      notifications.push({
        key: `out_of_stock:${product.id}`,
        category: "stock",
        at: lastStockChange[product.id] || staffNotifMillis(product.createdAt),
        signature: "0",
        severity: "danger",
        icon: "bi-box-seam",
        message: `${product.name} is out of stock.`,
        link: "inventory.html",
      });
    } else if (stock <= (product.reorderPoint || DEFAULT_REORDER_POINT)) {
      notifications.push({
        key: `low_stock:${product.id}`,
        category: "stock",
        at: lastStockChange[product.id] || 0,
        signature: `${stock}`,
        severity: "warning",
        icon: "bi-box-seam",
        message: `${product.name} is low on stock - ${stock} left.`,
        link: "inventory.html",
      });
    }
  });
  return notifications;
}

// expired and near expiry batches that still have stock
function expiryAlerts(batchSnapshot) {
  const notifications = [];
  batchSnapshot.docs.forEach((doc) => {
    const batch = { id: doc.id, ...doc.data() };
    // empty lots dont count for expiry
    if (batch.status !== "active" || !(batch.quantity > 0)) return;
    const product = getProductById(batch.productId);
    const productName = product ? product.name : "Unknown product";

    const expiryStatus = getExpiryStatus(batch);
    if (expiryStatus === "expired") {
      notifications.push({
        key: `expired:${batch.id}`,
        category: "stock",
        at: staffNotifMillis(`${batch.expirationDate}T00:00:00`),
        signature: `${batch.quantity}`,
        severity: "danger",
        icon: "bi-calendar-x",
        message: `${productName} (Batch ${batch.batchNo}) has expired - ${batch.expirationDate}.`,
        link: "inventory.html",
      });
    } else if (expiryStatus === "near_expiry") {
      notifications.push({
        key: `near_expiry:${batch.id}`,
        category: "stock",
        // the day it got close to expiring
        at: (() => {
          const d = new Date(`${batch.expirationDate}T00:00:00`);
          d.setMonth(d.getMonth() - NEAR_EXPIRY_MONTHS);
          return d.getTime() || 0;
        })(),
        signature: `${batch.quantity}:${batch.expirationDate}`,
        severity: "warning",
        icon: "bi-hourglass-split",
        message: `${productName} (Batch ${batch.batchNo}) is near expiry - ${batch.expirationDate}.`,
        link: "inventory.html",
      });
    }
  });
  return notifications;
}

// pos with a delivery discrepancy to acknowledge
function poDiscrepancyAlerts(poSnapshot) {
  const notifications = [];
  poSnapshot.docs.forEach((doc) => {
    const po = doc.data();
    notifications.push({
      key: `po_discrepancy:${doc.id}`,
      category: "stock",
      at: staffNotifMillis(po.receivedAt),
      signature: po.status,
      severity: "danger",
      icon: "bi-exclamation-triangle",
      message: `Purchase Order ${po.poNumber} has a delivery discrepancy pending acknowledgement.`,
      link: "inventory.html",
    });
  });
  return notifications;
}

// products waiting for prices
function pricePendingAlerts() {
  const notifications = [];
  // products added without prices stay inactive until priced
  const pricePending = CATALOG_PRODUCTS.filter((p) => p.pricePending);
  if (pricePending.length > 0) {
    notifications.push({
      key: "price_pending",
      category: "stock",
      at: Math.max(0, ...pricePending.map((p) => staffNotifMillis(p.updatedAt || p.createdAt))),
      signature: pricePending.map((p) => p.id).sort().join(","),
      severity: "info",
      icon: "bi-tag",
      message: `${pricePending.length} product${pricePending.length === 1 ? " is" : "s are"} waiting for a Branch Manager to set prices.`,
      link: "products.html",
    });
  }
  return notifications;
}

// bad order batches waiting for disposal
function badOrderAlerts(batchSnapshot) {
  const notifications = [];
  // bad order batches not disposed of yet
  const pending = batchSnapshot.docs.filter((d) => d.data().status === "bad_order" && !d.data().disposedAt);
  if (pending.length) {
    notifications.push({
      key: "bad_order_disposal",
      category: "stock",
      at: Math.max(0, ...pending.map((d) => staffNotifMillis(d.data().badOrderAt))),
      signature: pending.map((d) => d.id).sort().join(","),
      severity: "danger",
      icon: "bi-trash",
      message: `${pending.length} Bad Order batch${pending.length === 1 ? " needs" : "es need"} to be pulled out and disposed of.`,
      link: "inventory.html",
    });
  }
  return notifications;
}

// wholesale buyers with expired or expiring documents
async function wholesaleDocumentAlerts() {
  const notifications = [];
  // lto or business permit expired or expiring within 30 days
  try {
    const accounts = await db.collection("wholesaleAccounts").get();
    const soon = Date.now() + DOCUMENT_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000;
    const flagged = accounts.docs.filter((d) => {
      const a = d.data();
      if (a.status === "inactive") return false;
      return [a.ltoValidUntil, a.permitValidUntil].some((v) => v && new Date(`${v}T23:59:59`).getTime() < soon);
    });
    if (flagged.length) {
      notifications.push({
        key: "wholesale_documents",
        category: "orders",
        // 30 days before the first document expires
        at: Math.min(
          ...flagged.map((d) => Math.min(...[d.data().ltoValidUntil, d.data().permitValidUntil].filter(Boolean).map((v) => staffNotifMillis(`${v}T00:00:00`))))
        ) - DOCUMENT_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000,
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
  return notifications;
}

// wholesale orders not picked up or delivered
async function wholesaleReleaseAlerts() {
  const notifications = [];
  // wholesale orders still waiting for release
  try {
    const pending = await db.collection("wholesaleOrders").where("releaseStatus", "==", "pending").get();
    if (!pending.empty) {
      notifications.push({
        key: "wholesale_pending_release",
        category: "orders",
        at: Math.max(0, ...pending.docs.map((d) => staffNotifMillis(d.data().createdAt))),
        signature: pending.docs.map((d) => d.id).sort().join(","),
        severity: "info",
        icon: "bi-truck",
        message: `${pending.size} wholesale order${pending.size === 1 ? " is" : "s are"} waiting to be picked up or delivered.`,
        link: "wholesale-accounts.html#pendingReleaseCard",
      });
    }
  } catch (error) {
    console.warn("Wholesale order alerts unavailable:", error);
  }
  return notifications;
}

// chats handed to staff
async function waitingChatAlerts() {
  const notifications = [];
  // chats waiting for staff, never blocks the other alerts
  try {
    const waiting = await db.collection("chatThreads").where("status", "==", "waiting_staff").get();
    notifications.push(...staffChatNotifications(waiting.docs));
  } catch (error) {
    console.warn("Chat alerts unavailable:", error);
  }
  return notifications;
}

const STAFF_NOTIF_CATEGORY_LABELS = { stock: "Stock", orders: "Orders", chat: "Live Chat" };

async function getStaffNotifReadMap(uid) {
  const doc = await db.collection("notifications").doc(uid).get();
  return doc.exists ? doc.data().read || {} : {};
}

function isStaffNotifRead(readMap, notif) {
  return readMap[notif.key] === notif.signature;
}

// update() since set with merge doesnt handle dotted keys right
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

// =====================================================================
// ---- expiry rules (near-expiry, bad order, write-offs) ----

// ---- near expiry and bad order auto handling ----
const BAD_ORDER_MONTHS = 2;

// runs when inventory or the dashboard opens: near expiry goes wholesale only, then bad order
async function enforceExpiryStatus(batchesOverride = null) {
  const batches = batchesOverride
    ? batchesOverride.filter((b) => b.status === "active" || b.status === "wholesale_only")
    : (await liveStockBatches()).docs
        .filter((doc) => ["active", "wholesale_only"].includes(doc.data().status))
        .map((doc) => ({ id: doc.id, ...doc.data() }));

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
      const product = getProductById(batch.productId);
      await logAuditEvent({
        action: "Batch Moved to Wholesale Only",
        details: `${product ? product.name : batch.productId} - Batch ${batch.batchNo || "-"}, ${batch.quantity} units (within ${NEAR_EXPIRY_MONTHS} months of expiry ${formatDateMDY(`${batch.expirationDate}T12:00:00`)}), no longer sold retail`,
        actor: "System",
        record: `${product ? product.name : batch.productId} - Batch ${batch.batchNo || "-"}`,
        before: "Active (retail + wholesale)",
        after: "Wholesale only",
        reason: `Within ${NEAR_EXPIRY_MONTHS} months of expiry`,
      });
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
    const batch = doc.data();
    // another page may have done it already
    if (batch.status === "bad_order" || (batch.quantity || 0) <= 0) return;
    const reason = `Bad Order - within ${BAD_ORDER_MONTHS} months of expiry (${formatDateMDY(batch.expirationDate)}), deducted automatically`;
    tx.update(ref, {
      status: "bad_order",
      quantity: 0,
      badOrderQty: batch.quantity,
      badOrderAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    tx.set(writeOffRef, {
      batchId,
      productId: batch.productId,
      batchNo: batch.batchNo || "",
      quantity: batch.quantity,
      reason,
      automatic: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    result = { productId: batch.productId, batchNo: batch.batchNo, quantity: batch.quantity, reason };
  });
  if (result) {
    const product = getProductById(result.productId);
    await logAuditEvent({
      action: "Bad Order (Automatic Write-Off)",
      details: `${product ? product.name : result.productId} - Batch ${result.batchNo || "-"}, Qty ${result.quantity}. ${result.reason}`,
      actor: "System",
      record: `${product ? product.name : result.productId} - Batch ${result.batchNo || "-"}`,
      before: `${result.quantity} units`,
      after: "0 units (Bad Order)",
      reason: result.reason,
    });
  }
}

// write-off date staff picked, else when it was saved
function writeOffEffectiveDate(w) {
  if (w.writeOffDate) return new Date(`${w.writeOffDate}T12:00:00`);
  return w.createdAt && w.createdAt.toDate ? w.createdAt.toDate() : null;
}

// =====================================================================
// ---- catalog loading (live reads, short browser copy, staff-only prices) ----

// default categories, only used to seed a new project
const DEFAULT_CATEGORIES = {
  generics: "Generics",
  branded: "Branded",
  drugstore: "Drugstore (Per Piece)",
  "medical-supplies": "Medical Supplies",
};

// ---- live reads ----
// liveQuery works like get() but keeps listening
const liveQueries = new Map();

function liveQuery(key, query) {
  if (!LIVE_READS) return query.get();

  let entry = liveQueries.get(key);
  if (!entry) {
    entry = { latest: null, version: 0, waiters: [] };
    liveQueries.set(key, entry);
    entry.firstAnswer = new Promise((resolve, reject) => {
      let answered = false;
      const answer = (snapshot) => {
        if (answered) return;
        answered = true;
        clearTimeout(offlineTimer);
        entry.latest = snapshot;
        resolve();
      };
      // offline too long so answer from the browser copy
      const offlineTimer = setTimeout(() => {
        if (entry.latest) {
          answer(entry.latest);
          return;
        }
        if (answered) return;
        console.warn(`Live ${key} gave no answer; reading it directly.`);
        query.get().then(
          (snapshot) => {
            if (answered) return;
            answer(snapshot);
          },
          () => {}
        );
      }, LIVE_QUERY_OFFLINE_MS);
      // opens only after the sign-in check
      authGate.then(() => query.onSnapshot(
        { includeMetadataChanges: true },
        (snapshot) => {
          // counts real data changes, not just metadata
          if (snapshot.docChanges().length) {
            entry.version += 1;
            const waiters = entry.waiters;
            entry.waiters = [];
            waiters.forEach((w) => w(snapshot));
          }
          if (answered) entry.latest = snapshot;
          else if (!snapshot.metadata.fromCache) answer(snapshot);
          else entry.latest = snapshot;
        },
        () => {
          // listener failed so do a plain read instead
          liveQueries.delete(key);
          if (answered) return;
          answered = true;
          clearTimeout(offlineTimer);
          query.get().then((snapshot) => {
            entry.latest = snapshot;
            resolve();
          }, reject);
        }
      ));
    });
    entry.firstAnswer.catch(() => liveQueries.delete(key));
  }
  // newest snapshot after the first answer
  return entry.firstAnswer.then(() => entry.latest);
}

// current data version for a key, 0 if no listener
function liveVersion(key) {
  const entry = liveQueries.get(key);
  return entry ? entry.version : 0;
}

// waits for a change after the given version
function liveSnapshotAfter(key, version, timeoutMs = 3000) {
  const entry = liveQueries.get(key);
  if (!entry || !entry.latest) return Promise.resolve(false);
  if (entry.version > version) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    entry.waiters.push(() => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

// every stock batch, live, shared by everything that reads batches
function liveStockBatches() {
  return liveQuery("stockBatches", db.collection("stockBatches"));
}

// shop pages keep the catalog in the browser for a few minutes
const CATALOG_CACHE_KEY = "amsonCatalogCache";

const CATALOG_CACHE_MS = 5 * 60 * 1000;

function catalogBrowserCacheAllowed() {
  return !/\/admin\//.test(window.location.pathname);
}

function clearCatalogCache() {
  catalogLoadPromise = null;
  try {
    localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch (error) {}
}

// timestamps saved as {__ms} and turned back on read
function catalogCacheReplacer(key, value) {
  return value && typeof value === "object" && typeof value.toMillis === "function" ? { __ms: value.toMillis() } : value;
}

function catalogCacheReviver(key, value) {
  return value && typeof value === "object" && typeof value.__ms === "number" ? firebase.firestore.Timestamp.fromMillis(value.__ms) : value;
}

function readCatalogBrowserCache() {
  if (!catalogBrowserCacheAllowed()) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY), catalogCacheReviver);
    if (cached && Date.now() - cached.savedAt < CATALOG_CACHE_MS && Array.isArray(cached.products)) return cached;
  } catch (error) {}
  return null;
}

function writeCatalogBrowserCache() {
  if (!catalogBrowserCacheAllowed()) return;
  try {
    // replacer converts timestamps before stringify
    const toJson = (v) => JSON.stringify(v, function (key) {
      return catalogCacheReplacer(key, this[key]);
    });
    localStorage.setItem(CATALOG_CACHE_KEY, toJson({ savedAt: Date.now(), categories: CATEGORY_LABELS, products: CATALOG_PRODUCTS }));
  } catch (error) {
    // storage full or blocked, read live next time
  }
}

// first load uses the live listeners
let catalogLoadedOnce = false;

// ---- staff-only prices ----
// cost and wholesale prices live in their own staff-only docs
const PRIVATE_PRICE_FIELDS = ["costingPrice", "wholesalePrice"];

function isStaffPage() {
  return /\/admin\//.test(window.location.pathname);
}

// productId -> { costingPrice, wholesalePrice }, empty if not allowed
async function loadPrivatePrices(useLive) {
  if (!isStaffPage()) return new Map();
  try {
    const query = db.collection("productPrices");
    const snap = useLive ? await liveQuery("productPrices", query) : await query.get();
    const prices = new Map();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      const entry = {};
      PRIVATE_PRICE_FIELDS.forEach((field) => {
        if (typeof data[field] === "number") entry[field] = data[field];
      });
      prices.set(doc.id, entry);
    });
    return prices;
  } catch (error) {
    console.warn("Staff prices unavailable:", error.code || error);
    return new Map();
  }
}

// writes a products staff-only prices
function setPrivatePrices(writer, productId, prices) {
  const data = {};
  PRIVATE_PRICE_FIELDS.forEach((field) => {
    if (prices[field] !== undefined) data[field] = Number(prices[field]) || 0;
  });
  data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
  writer.set(db.collection("productPrices").doc(productId), data, { merge: true });
}

// puts batch costs back for staff exports and reports
async function attachBatchCosts(batches) {
  let snap;
  try {
    snap = await db.collection("batchCosts").get();
  } catch (error) {
    console.warn("Batch costs unavailable:", error.code || error);
    return batches;
  }
  const costs = new Map(snap.docs.map((doc) => [doc.id, doc.data()]));
  return batches.map((b) => {
    const c = costs.get(b.id);
    if (!c) return b;
    const out = { ...b, unitCost: c.unitCost != null ? c.unitCost : b.unitCost != null ? b.unitCost : null };
    if (Array.isArray(b.deliveries) && Array.isArray(c.deliveryCosts)) {
      out.deliveries = b.deliveries.map((d, i) => ({ ...d, unitCost: c.deliveryCosts[i] != null ? c.deliveryCosts[i] : d.unitCost != null ? d.unitCost : null }));
    }
    return out;
  });
}

async function loadCatalogCache({ afterStockChange = null } = {}) {
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const cached = readCatalogBrowserCache();
    if (cached) {
      CATEGORY_LABELS = cached.categories || {};
      CATALOG_PRODUCTS = cached.products;
      return { products: CATALOG_PRODUCTS, categories: CATEGORY_LABELS };
    }

    await authGate;
    // in parallel so pages dont wait on three trips
    let useLive = !catalogLoadedOnce;
    if (!useLive && afterStockChange != null) useLive = await liveSnapshotAfter("stockBatches", afterStockChange);
    const [categorySnapshot, productSnapshot, allBatchSnapshot, privatePrices] = await Promise.all(
      (useLive
        ? [liveQuery("categories", db.collection("categories")), liveQuery("products", db.collection("products")), liveStockBatches()]
        : [db.collection("categories").get(), db.collection("products").get(), db.collection("stockBatches").where("status", "==", "active").get()]
      ).concat([loadPrivatePrices(useLive)])
    );
    const batchSnapshot = { docs: allBatchSnapshot.docs.filter((doc) => doc.data().status === "active") };
    catalogLoadedOnce = true;

    CATEGORY_LABELS = {};
    categorySnapshot.docs.forEach((doc) => {
      CATEGORY_LABELS[doc.id] = doc.data().name;
    });

    // retail stock is judged by expiry date right here
    const stockByProduct = {};
    batchSnapshot.docs.forEach((doc) => {
      const batch = doc.data();
      if (!isRetailSellableBatch(batch)) return;
      stockByProduct[batch.productId] = (stockByProduct[batch.productId] || 0) + (batch.quantity || 0);
    });

    CATALOG_PRODUCTS = productSnapshot.docs.map((doc) => {
      const data = doc.data();
      const totalStock = stockByProduct[doc.id] || 0;
      return {
        id: doc.id,
        ...data,
        ...(privatePrices.get(doc.id) || {}),
        shopSection: resolveShopSection(data.shopSection),
        price: data.retailPrice,
        totalStock,
        inStock: data.status === "active" && totalStock > 0,
      };
    });

    writeCatalogBrowserCache();
    return { products: CATALOG_PRODUCTS, categories: CATEGORY_LABELS };
  })();
  // a failed load shouldnt stick
  catalogLoadPromise.catch(() => {
    catalogLoadPromise = null;
  });

  return catalogLoadPromise;
}

// =====================================================================
// ---- progress pop-up for long jobs ----

// ---- progress / result popup ----
// built on first use
let taskModalEl = null;

function ensureTaskModal() {
  if (taskModalEl) return taskModalEl;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="modal fade" id="taskModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
      <div class="modal-dialog modal-dialog-centered" style="max-width:460px;">
        <div class="modal-content p-4 text-center">
          <div id="taskModalIcon" class="task-modal-icon"></div>
          <h2 class="h4 fw-bold mb-1" id="taskModalTitle"></h2>
          <p class="text-muted mb-3" id="taskModalMessage" style="white-space:pre-line;"></p>
          <div class="progress mb-2 d-none" id="taskModalProgressWrap" style="height:10px;">
            <div class="progress-bar" id="taskModalProgressBar" role="progressbar" style="width:0%; background-color:var(--amson-red);"></div>
          </div>
          <p class="text-muted mb-0 d-none" id="taskModalProgressText" style="font-size:0.85rem;"></p>
          <ul class="text-start small mb-3 d-none" id="taskModalList" style="max-height:160px; overflow:auto;"></ul>
          <div class="d-flex justify-content-center gap-2 flex-wrap d-none" id="taskModalActions"></div>
        </div>
      </div>
    </div>`
  );
  taskModalEl = document.getElementById("taskModal");
  return taskModalEl;
}

const TASK_ICONS = {
  success: '<i class="bi bi-check-circle-fill"></i>',
  warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
  danger: '<i class="bi bi-x-circle-fill"></i>',
};

function showTaskProgress(title, message) {
  ensureTaskModal();
  document.getElementById("taskModalIcon").className = "task-modal-icon";
  document.getElementById("taskModalIcon").innerHTML = '<div class="spinner-border" style="color:var(--amson-red);" role="status"></div>';
  document.getElementById("taskModalTitle").textContent = title;
  document.getElementById("taskModalMessage").textContent = message || "";
  document.getElementById("taskModalProgressWrap").classList.remove("d-none");
  document.getElementById("taskModalProgressText").classList.remove("d-none");
  document.getElementById("taskModalList").classList.add("d-none");
  document.getElementById("taskModalActions").classList.add("d-none");
  updateTaskProgress(0, 1);
  bootstrap.Modal.getOrCreateInstance(taskModalEl).show();
}

function updateTaskProgress(done, total, label = "") {
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById("taskModalProgressBar").style.width = `${pct}%`;
  document.getElementById("taskModalProgressText").textContent = total > 1 || done ? `${done} of ${total}${label ? ` - ${label}` : ""}` : "";
}

// resolves with the clicked action after the popup closes
function showTaskResult({ type = "success", title, message = "", list = [], actions = [{ key: "done", label: "Done", primary: true }] }) {
  ensureTaskModal();
  const icon = document.getElementById("taskModalIcon");
  icon.className = `task-modal-icon ${type}`;
  icon.innerHTML = TASK_ICONS[type] || "";
  document.getElementById("taskModalTitle").textContent = title;
  document.getElementById("taskModalMessage").textContent = message;
  document.getElementById("taskModalProgressWrap").classList.add("d-none");
  document.getElementById("taskModalProgressText").classList.add("d-none");
  const listEl = document.getElementById("taskModalList");
  listEl.innerHTML = list.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  listEl.classList.toggle("d-none", list.length === 0);
  const actionsEl = document.getElementById("taskModalActions");
  actionsEl.innerHTML = actions
    .map((a) => `<button type="button" class="btn ${a.primary ? "btn-amson" : "btn-outline-dark-amson"}" data-task-action="${a.key}">${escapeHtml(a.label)}</button>`)
    .join("");
  actionsEl.classList.remove("d-none");
  const modal = bootstrap.Modal.getOrCreateInstance(taskModalEl);
  modal.show();
  return new Promise((resolve) => {
    actionsEl.querySelectorAll("[data-task-action]").forEach((btn) =>
      btn.addEventListener("click", () => {
        taskModalEl.addEventListener("hidden.bs.modal", () => resolve(btn.dataset.taskAction), { once: true });
        modal.hide();
      })
    );
  });
}

// =====================================================================
// ---- staff form helpers (toggles, searchable dropdowns, item lists) ----

// ---- form alert messages ----
function showFormAlert(el, message) {
  el.textContent = message;
  el.classList.remove("d-none");
}

// ---- on/off toggles on staff forms ----
function wireSegmentedToggle(container) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".segmented-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function setToggleValue(container, value) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
}

function getToggleValue(container) {
  return container.querySelector(".segmented-toggle-btn.active").dataset.value;
}

// ---- searchable dropdowns and item lists ----

// products a-z for dropdowns, catalog stays in db order
function productsByName(products = CATALOG_PRODUCTS) {
  return products.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function makeSearchableSelect(selectEl) {
  return new Choices(selectEl, {
    searchEnabled: true,
    searchPlaceholderValue: "Type to search...",
    position: "bottom",
    allowHTML: false,
    itemSelectText: "",
    shouldSort: false,
    searchResultLimit: 50,
    fuseOptions: { threshold: 0.3 },
  });
}

function destroyChoicesIn(container) {
  container.querySelectorAll("select").forEach((sel) => {
    if (sel._choices) {
      sel._choices.destroy();
      sel._choices = null;
    }
  });
}

function updateRemoveButtonsVisibility(container) {
  const items = container.querySelectorAll(".repeater-item");
  items.forEach((item) => {
    const btn = item.querySelector(".repeater-remove-btn");
    if (btn) btn.classList.toggle("d-none", items.length <= 1);
  });
}

function renumberItems(container) {
  container.querySelectorAll(".repeater-item").forEach((item, idx) => {
    item.querySelector(".repeater-label").textContent = `Item ${idx + 1}`;
  });
}

// =====================================================================
// ---- storefront: home page category cards ----

function renderHomeCategoryCards() {
  const row = document.getElementById("homeCategoryCards");
  if (!row) return;
  const cards = SHOP_SECTIONS.map((sec) => ({
    href: `products.html?section=${encodeURIComponent(sec.id)}`,
    name: sec.label,
    icon: sec.icon,
    count: storefrontCatalog().filter((p) => p.shopSection === sec.id).length,
  }));
  row.innerHTML = cards
    .map(
      (c) => `
        <div class="col">
          <a href="${c.href}" class="category-card">
            <span class="category-icon"><i class="bi ${c.icon}"></i></span>
            <h3>${escapeHtml(c.name)}</h3>
            <p>${c.count} product${c.count === 1 ? "" : "s"}</p>
          </a>
        </div>
      `
    )
    .join("");
}

if (document.querySelector(".category-nav") || document.getElementById("homeCategoryCards")) {
  loadCatalogCache()
    .then(() => {
      renderShopSectionNav();
      renderHomeCategoryCards();
    })
    .catch((error) => console.error("Failed to load categories:", error));
}

// =====================================================================
// ---- formatting (dates, money, text, links, pdf) ----

// yyyy-mm-dd on the local calendar, not toISOString
function localISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// mm/dd/yyyy for a timestamp, date or iso string
function formatDateMDY(value, withTime = false) {
  if (!value) return "";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (isNaN(date)) return "";
  const mdy = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
  return withTime ? `${mdy} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : mdy;
}

function formatPeso(amount) {
  return `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---- storefront category links ----
// built from the categories collection
function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : "#";
}

// jspdf fonts cant draw some characters like the peso sign so swap them
const PDF_TEXT_SWAPS = [
  [/₱\s?/g, "PHP "],
  [/→/g, "->"],
  [/[✓✔]/g, "(ok)"],
];

function pdfSafeText(text) {
  if (Array.isArray(text)) return text.map(pdfSafeText);
  if (typeof text !== "string") return text;
  return PDF_TEXT_SWAPS.reduce((t, [pattern, plain]) => t.replace(pattern, plain), text);
}

// opens the pdf in the print window, downloads if blocked
function printPdf(doc, filename) {
  doc.autoPrint();
  const win = window.open(doc.output("bloburl"), "_blank");
  if (!win) doc.save(filename);
}

function createPdf(options) {
  const doc = new window.jspdf.jsPDF(options);
  const text = doc.text.bind(doc);
  doc.text = (value, ...rest) => text(pdfSafeText(value), ...rest);
  const split = doc.splitTextToSize.bind(doc);
  doc.splitTextToSize = (value, ...rest) => split(pdfSafeText(value), ...rest);
  return doc;
}

// =====================================================================
// ---- receipts ----

// ---- walk-in sale receipt ----
// used by the pos and when reopening a sale
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

// shows the receipt popup
function showSaleReceipt(receipt) {
  const modalEl = document.getElementById("posReceiptModal");
  fillReceipt(receipt);
  setReceiptButtons(modalEl, receipt);
  showVoidBanner(modalEl, receipt);
  bootstrap.Modal.getOrCreateInstance(modalEl).show();
  // print window opens by itself once the receipt shows
  if (receipt.autoPrint) setTimeout(() => window.print(), 500);
}

// receipt details: store, date, si no., customer, items, payment
function fillReceipt({
  items,
  total,
  paymentMethod,
  amountPaid,
  change,
  cashier,
  branch,
  completedAt,
  invoiceNo = null,
  customerName = "",
  referenceNo = "",
  title = "Sale Receipt",
  onConfirm = null,
}) {
  document.getElementById("posReceiptModalTitle").textContent = title;
  document.getElementById("posReceiptBranch").textContent = branch;
  document.getElementById("posReceiptDate").textContent = formatDateMDY(completedAt);
  document.getElementById("posReceiptTime").textContent = completedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  // si no. only exists after confirm
  document.getElementById("posReceiptRef").textContent = invoiceNo || (onConfirm ? "Assigned on confirm" : "-");
  document.getElementById("posReceiptCustomer").textContent = customerName || "Walk-in";
  document.getElementById("posReceiptCashier").textContent = cashier;

  document.getElementById("posReceiptItemsBody").innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}${item.voidedQty ? `<div class="text-danger" style="font-size:0.75rem;">${item.voidedQty} voided</div>` : ""}${
            item.returnedQty ? `<div class="text-muted" style="font-size:0.75rem;">${item.returnedQty} returned (exchanged)</div>` : ""
          }</td>
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

  document.getElementById("posReceiptRefNoRow").classList.toggle("d-none", !referenceNo);
  document.getElementById("posReceiptRefNo").textContent = referenceNo || "-";

  const changeRow = document.getElementById("posReceiptChangeRow");
  if (paymentMethod === "cash") {
    changeRow.classList.remove("d-none");
    document.getElementById("posReceiptChange").textContent = formatPeso(change);
  } else {
    changeRow.classList.add("d-none");
  }
}

// receipt buttons, edit and confirm before the sale is saved
function setReceiptButtons(modalEl, { onConfirm = null, onEdit = null, onVoid = null, onExchange = null }) {
  const footer = document.getElementById("posReceiptModalFooter");
  if (onConfirm) {
    // preview mode so the cashier can catch mistakes
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
        // true means the preview was already replaced by the final receipt
        const keepOpen = await onConfirm();
        if (!keepOpen) bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      } finally {
        btn.disabled = false;
      }
    });
  } else {
    // view mode: print, plus void or return if allowed
    footer.innerHTML = `
      ${onVoid ? `<button type="button" class="btn btn-outline-danger" id="posReceiptVoidBtn">Void</button>` : ""}
      ${onExchange ? `<button type="button" class="btn btn-outline-dark-amson" id="posReceiptExchangeBtn">Return / Exchange</button>` : ""}
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
    if (onExchange) {
      document.getElementById("posReceiptExchangeBtn").addEventListener("click", () => {
        modalEl.addEventListener("hidden.bs.modal", () => onExchange(), { once: true });
        bootstrap.Modal.getOrCreateInstance(modalEl).hide();
      });
    }
  }
}

// voided sales still open but are marked
function showVoidBanner(modalEl, { voidInfo = null, partialVoidInfo = null }) {
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
}

// =====================================================================
// ---- voids ----

// ---- walk-in sale void ----
// only roles allowed to void
function roleCanVoidSales(role) {
  return ["admin", "branch_manager", "technical_staff"].includes(role);
}

// asks which items to void and why, null if cancelled
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
  let details = null;
  const ok = await showAppConfirm(`Void items from SI No. ${sale.invoiceNo || "-"} (${formatPeso(sale.total)})? Voided items go back into stock.`, {
    title: "Void Walk-in Sale",
    confirmLabel: "Void Selected",
    fieldHtml: `
      <p class="detail-label mb-2">Items to void (untick or lower the quantity to keep an item)</p>
      ${rows}
      <label class="form-label mt-2" for="voidReasonInput">Reason for void *</label>
      <textarea class="form-control" id="voidReasonInput" rows="2" placeholder="e.g. Wrong item rung up"></textarea>
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
    // errors show in the dialog
    validate: async () => {
      const read = readVoidDialog(items);
      if (read.problem) return read.problem;
      let approvedBy = null;
      if (requireApproval) {
        try {
          approvedBy = await verifyVoidApprover(document.getElementById("voidApproverEmail").value.trim(), document.getElementById("voidApproverPassword").value);
        } catch (error) {
          return error.message;
        }
      }
      details = { ...read.details, approvedBy };
      return null;
    },
  });
  return ok ? details : null;
}

// what staff entered in the void dialog
function readVoidDialog(items) {
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
  if (invalidQty) return { problem: "Each quantity to void must be between 1 and the quantity sold." };
  if (lines.length === 0) return { problem: "Select at least one item to void." };
  const reason = document.getElementById("voidReasonInput").value.trim();
  if (!reason) return { problem: "A reason is required to void a sale." };
  return { details: { reason, lines } };
}

// checks the managers login on a separate app so staff stay signed in
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

// voids the lines in one transaction, units go back to their batches
async function voidPosSale(sale, { reason, lines, approvedBy }, voidedBy) {
  const saleRef = db.collection("posSales").doc(sale.id);
  const fallbackRefs = await findFallbackBatches(sale, lines);

  let voidedLines = [];
  let fullVoid = false;
  let voidedAmount = 0;

  await db.runTransaction(async (transaction) => {
    const saleDoc = await transaction.get(saleRef);
    if (!saleDoc.exists) throw new Error("This sale no longer exists.");
    const data = saleDoc.data();
    if (data.voided) throw new Error("This sale was already voided.");

    const items = JSON.parse(JSON.stringify(data.items || []));
    let returns;
    ({ returns, voidedLines, voidedAmount } = takeVoidedUnits(items, lines, fallbackRefs));
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
      // keeps the sold quantities, voided true removes it from totals
      transaction.update(saleRef, {
        voided: true,
        voidReason: reason,
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
          { lines: voidedLines, amount: voidedAmount, reason, voidedBy, approvedBy, voidedAt: new Date() },
        ]),
      });
    }
  });

  await logVoid(sale, { fullVoid, voidedAmount, voidedLines, reason, approvedBy });
  return { fullVoid, voidedAmount, voidedLines };
}

// old sales without batches go back on the latest expiring batch
async function findFallbackBatches(sale, lines) {
  const fallbackRefs = {};
  for (const { index } of lines) {
    const item = (sale.items || [])[index];
    const noFallbackNeeded = !item || (item.batches && item.batches.length) || fallbackRefs[item.productId];
    if (noFallbackNeeded) continue;
    const snap = await db.collection("stockBatches").where("productId", "==", item.productId).where("status", "==", "active").get();
    const latest = snap.docs.sort((a, b) => new Date(b.data().expirationDate) - new Date(a.data().expirationDate))[0];
    if (!latest) throw new Error(`No active batch of ${item.name} to return the stock to. Receive stock first, then void.`);
    fallbackRefs[item.productId] = latest.ref;
  }
  return fallbackRefs;
}

// takes voided units off the items and works out the batches
function takeVoidedUnits(items, lines, fallbackRefs) {
  const returns = new Map(); // batchId -> units to put back
  const voidedLines = [];
  let voidedAmount = 0;
  for (const { index, qty } of lines) {
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
  return { returns, voidedLines, voidedAmount };
}

// audit log entry for a void
async function logVoid(sale, { fullVoid, voidedAmount, voidedLines, reason, approvedBy }) {
  await logAuditEvent({
    action: fullVoid ? "Walk-in Sale Voided" : "Walk-in Sale Items Voided",
    details:
      `SI ${sale.invoiceNo || sale.id} - ${formatPeso(voidedAmount)} voided - Reason: ${reason}` +
      (approvedBy ? ` - Approved by ${approvedBy}` : "") +
      ` - Items returned to stock: ${voidedLines.map((l) => `${l.name} x${l.qty}`).join(", ")}`,
    record: `SI ${sale.invoiceNo || sale.id}`,
    before: `Total ${formatPeso(sale.total || 0)}`,
    after: fullVoid ? "Voided" : `Total ${formatPeso(Math.round(((sale.total || 0) - voidedAmount) * 100) / 100)}`,
    reason,
  });
}

// receipt banner text for a void, or null
function partialVoidSummary(sale) {
  if (!sale.partialVoids || !sale.partialVoids.length) return null;
  return sale.partialVoids
    .map((v) => {
      const items = v.lines.map((l) => `${l.name} x${l.qty}`).join(", ");
      const when = v.voidedAt ? formatDateMDY(v.voidedAt, true) : "";
      return `${items} (${formatPeso(v.amount)}) - ${v.reason}` + voidByText(v.voidedBy, when, v.approvedBy);
    })
    .join("; ");
}

function voidSummary(sale) {
  if (!sale.voided) return null;
  const when = sale.voidedAt && sale.voidedAt.toDate ? formatDateMDY(sale.voidedAt, true) : "";
  return (sale.voidReason || "") + voidByText(sale.voidedBy, when, sale.voidApprovedBy);
}

// who voided and who approved
function voidByText(voidedBy, when, approvedBy) {
  let text = "";
  if (voidedBy) text += when ? ` (by ${voidedBy}, ${when})` : ` (by ${voidedBy})`;
  if (approvedBy) text += `, approved by ${approvedBy}`;
  return text;
}

// =====================================================================
// ---- exports ----

// ---- table export (pdf or excel) ----
// exports exactly the rows the page shows
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
    XLSX.utils.book_append_sheet(wb, sheet, title.slice(0, EXCEL_SHEET_NAME_MAX));
    XLSX.writeFile(wb, `${filenamePrefix}-${stamp}.xlsx`);
    return;
  }

  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const doc = createPdf({ orientation: "landscape" });
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

// =====================================================================
// ---- stock (fefo) and sales invoice numbers ----

// ---- fefo stock deduction ----
// oldest expiry gets sold first, all items in one transaction
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
    // checks every item before writing anything
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
    for (const returnLine of returns) {
      const doc = await transaction.get(db.collection("stockBatches").doc(returnLine.batchId));
      if (!doc.exists) throw new Error("The batch the item came from no longer exists; it can't be returned to stock automatically.");
      returnDocs.push({ doc, qty: returnLine.qty });
    }
    const extraDocs = [];
    for (const ref of extraReads) extraDocs.push(await transaction.get(ref));
    // check can throw to stop the sale if the record changed
    if (record && record.check) record.check(await transaction.get(record.ref));

    // firestore needs all reads before writes
    let invoiceNo = null;
    if (record) {
      const counterDoc = await transaction.get(SALES_INVOICE_COUNTER_REF());
      const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
      transaction.set(SALES_INVOICE_COUNTER_REF(), { count: next }, { merge: true });
      invoiceNo = formatInvoiceNo(next);
    }

    // one write per batch even if used twice
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
      // other writes that must save together with the sale
      if (record.alsoWrite) record.alsoWrite(transaction, invoiceNo);
    }
    if (afterWrite) afterWrite(transaction, { allocations, invoiceNo, extraDocs });
    return { allocations, invoiceNo };
  });
}

// flattens the batch list into sale fields
function batchFieldsFromAllocation(used) {
  return {
    batches: used,
    batchNo: used.map((b) => b.batchNo).filter(Boolean).join(", "),
    expirationDate: used.length ? used[0].expirationDate : "",
  };
}

// ---- sales invoice numbers ----
// one running number for walk-in, online and wholesale
function SALES_INVOICE_COUNTER_REF() {
  return db.collection("counters").doc("salesInvoices");
}

function formatInvoiceNo(n) {
  return String(n).padStart(8, "0");
}

// =====================================================================
// ---- returns and exchanges ----

// which batches returned units go back to, latest expiry first
function planBatchReturn(line, returnQty) {
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
  return { batches, returnParts, need };
}

// ---- wholesale exchange ----
// no refunds, returned units swap for a replacement
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

  // batches the returned units go back to
  const { batches, returnParts, need } = planBatchReturn(line, returnQty);
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
    record: `${exchangeNo} (SI ${order.invoiceNo || "-"})`,
    before: `${line.productName} x${returnQty} (${formatPeso(returnedValue)})`,
    after: `${replacementProduct ? replacementProduct.name : replacement.productId} x${replacement.qty} (${formatPeso(replacementValue)})`,
    reason: reason.trim(),
  });

  const saved = await exchangeRef.get();
  return { id: exchangeRef.id, ...saved.data() };
}

// ---- walk-in return / exchange ----
// no refunds, customer swaps for something worth the same or more
async function processWalkinExchange(request) {
  const facts = await checkWalkinExchange(request);
  const { exchangeRef, exchangeNo } = await saveWalkinExchange(request, facts);
  await logWalkinExchange(request, facts, exchangeNo);
  const saved = await exchangeRef.get();
  return { id: exchangeRef.id, ...saved.data() };
}

// checks the return is allowed
async function checkWalkinExchange({ saleId, lineIndex, returnQty, replacement, reason, customerName }) {
  const saleRef = db.collection("posSales").doc(saleId);
  const saleSnap = await saleRef.get();
  if (!saleSnap.exists) throw new Error("This sale no longer exists.");
  const sale = saleSnap.data();
  if (sale.voided) throw new Error("This sale was voided, so nothing on it can be returned.");
  const line = (sale.items || [])[lineIndex];
  if (!line) throw new Error("That item isn't on this sale.");
  const remaining = (line.qty || 0) - (line.returnedQty || 0);
  if (!(returnQty > 0) || returnQty > remaining) throw new Error(`Only ${remaining} of ${line.name} can still be returned from this sale.`);
  if (!reason || !reason.trim()) throw new Error("A reason for the return is required.");
  // no name means walk-in customer
  const buyerName = (customerName || "").trim() || "Walk-in";
  if (!replacement || !replacement.productId || !(replacement.qty > 0)) throw new Error("Choose the replacement item and quantity.");
  const replacementProduct = getProductById(replacement.productId);
  if (!replacementProduct) throw new Error("That replacement item isn't in the catalog.");

  const unitPrice = line.price || 0;
  const returnedValue = Math.round(returnQty * unitPrice * 100) / 100;
  const replacementUnit = replacementProduct.price || 0;
  const replacementValue = Math.round(replacement.qty * replacementUnit * 100) / 100;
  if (replacementValue < returnedValue) {
    throw new Error(`The replacement (${formatPeso(replacementValue)}) must be of equal or higher value than the returned items (${formatPeso(returnedValue)}). Refunds aren't given.`);
  }
  return { saleRef, sale, line, buyerName, replacementProduct, unitPrice, returnedValue, replacementUnit, replacementValue };
}

// saves the exchange in one transaction
async function saveWalkinExchange(
  { saleId, lineIndex, returnQty, replacement, restock, reason, processedBy },
  { saleRef, sale, line, buyerName, replacementProduct, unitPrice, returnedValue, replacementUnit, replacementValue }
) {
  // batches the returned units came from
  const { batches, returnParts, need } = planBatchReturn(line, returnQty);
  if (need > 0 && restock) {
    throw new Error("This sale has no batch record for that item, so it can't go back to a batch automatically. Choose \"Set aside\" or receive it as new stock.");
  }
  if (need > 0) returnParts.push({ batchId: null, batchNo: "", expirationDate: "", qty: need });

  const counterRef = db.collection("counters").doc("wholesaleExchanges");
  const exchangeRef = db.collection("wholesaleExchanges").doc();
  const todayIso = localISODate(new Date());
  let exchangeNo = null;

  await deductStockFEFOMultiple([{ productId: replacement.productId, qty: replacement.qty }], {
    returns: restock ? returnParts.map((p) => ({ batchId: p.batchId, qty: p.qty })) : [],
    extraReads: [saleRef, counterRef],
    afterWrite: (tx, { allocations, extraDocs }) => {
      const [freshSale, counterDoc] = extraDocs;
      const freshLine = (freshSale.data().items || [])[lineIndex];
      const saleChangedMeanwhile = freshSale.data().voided || !freshLine || (freshLine.qty || 0) - (freshLine.returnedQty || 0) < returnQty;
      if (saleChangedMeanwhile) {
        throw new Error("This sale was changed by someone else. Reopen it and try again.");
      }
      const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
      exchangeNo = `EX-${String(next).padStart(5, "0")}`;
      tx.set(counterRef, { count: next }, { merge: true });

      const items = freshSale.data().items.map((it, idx) =>
        idx === lineIndex ? { ...it, returnedQty: (it.returnedQty || 0) + returnQty, batches } : it
      );
      tx.update(saleRef, { items });

      // not sellable so it becomes a pull-out record
      if (!restock) {
        returnParts.forEach((part) =>
          tx.set(db.collection("writeOffs").doc(), {
            batchId: part.batchId,
            productId: line.productId,
            batchNo: part.batchNo || "",
            quantity: part.qty,
            reason: `Customer return (${exchangeNo}), not resold: ${reason.trim()}`,
            writeOffDate: todayIso,
            fromCustomerReturn: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          })
        );
      }

      tx.set(exchangeRef, {
        kind: "walkin",
        exchangeNo,
        posSaleId: saleId,
        invoiceNo: sale.invoiceNo || "",
        buyerName: buyerName,
        purchasedAt: sale.createdAt || null,
        restocked: !!restock,
        returned: { productId: line.productId, productName: line.name, qty: returnQty, unitPrice, value: returnedValue, batches: returnParts },
        replacement: {
          productId: replacement.productId,
          productName: replacementProduct.name,
          qty: replacement.qty,
          unitPrice: replacementUnit,
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
  return { exchangeRef, exchangeNo };
}

// audit log entry for a walk-in return
async function logWalkinExchange({ returnQty, replacement, restock, reason }, { sale, line, buyerName, replacementProduct, returnedValue, replacementValue }, exchangeNo) {
  await logAuditEvent({
    action: "Walk-in Return / Exchange",
    details:
      `${exchangeNo} - ${buyerName}, SI ${sale.invoiceNo || "-"}: returned ${line.name} x${returnQty} (${formatPeso(returnedValue)}, ` +
      `${restock ? "back to stock" : "set aside / pulled out"}), replaced with ${replacementProduct.name} x${replacement.qty} (${formatPeso(replacementValue)}), ` +
      `difference ${formatPeso(replacementValue - returnedValue)}. Reason: ${reason.trim()}`,
    record: `${exchangeNo} (SI ${sale.invoiceNo || "-"})`,
    before: `${line.name} x${returnQty} (${formatPeso(returnedValue)})`,
    after: `${replacementProduct.name} x${replacement.qty} (${formatPeso(replacementValue)})`,
    reason: reason.trim(),
  });
}

// return / exchange dialog, null if cancelled
async function openWalkinExchangeDialog(sale, processedBy) {
  if (!sale) return null;
  if (sale.voided) {
    await showAppAlert(`SI No. ${sale.invoiceNo || "-"} was voided, so nothing on it can be returned.`);
    return null;
  }
  const lines = (sale.items || [])
    .map((it, idx) => ({ idx, it, left: (it.qty || 0) - (it.returnedQty || 0) }))
    .filter((l) => l.left > 0);
  if (!lines.length) {
    await showAppAlert(`Every item on SI No. ${sale.invoiceNo || "-"} has already been returned or voided.`);
    return null;
  }

  let exchange = null;
  const ok = await showAppConfirm(
    `Return items from SI No. ${sale.invoiceNo || "-"}. No refunds: the customer takes a replacement of equal or higher value and pays any difference.`,
    {
      title: "Walk-in Return / Exchange",
      confirmLabel: "Process Exchange",
      fieldHtml: exchangeDialogHtml(sale, lines),
      onRender: () => wireExchangeDialog(sale),
      // saves here so errors show in the dialog
      validate: async () => {
        try {
          exchange = await processWalkinExchange(readExchangeDialog(sale, processedBy));
          return null;
        } catch (error) {
          return error.message || "Something went wrong recording the exchange. Please try again.";
        }
      },
    }
  );
  if (!ok) return null;

  const print = await showAppConfirm(
    `Exchange ${exchange.exchangeNo} recorded. ${exchange.restocked ? "The returned item is back in stock" : "The returned item was set aside (pull-out)"}, and the replacement was taken from stock.${
      exchange.priceDifference > 0 ? ` Collect ${formatPeso(exchange.priceDifference)} from the customer.` : ""
    }`,
    { title: "Exchange Recorded", confirmLabel: "Print Exchange Slip", cancelLabel: "Close" }
  );
  if (print) printWalkinExchangeSlip(exchange);
  return exchange;
}

// exchange dialog form
function exchangeDialogHtml(sale, lines) {
  const productOptions = CATALOG_PRODUCTS.filter((p) => p.status === "active" && p.availableInPOS !== false && p.inStock)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)} - ${formatPeso(p.price || 0)} (${p.totalStock} in stock)</option>`)
    .join("");
  return `
    <label class="form-label" for="wxCustomer">Customer name (optional)</label>
    <input type="text" class="form-control mb-2" id="wxCustomer" maxlength="80" value="${escapeHtml(sale.customerName && sale.customerName !== "Walk-in" ? sale.customerName : "")}" placeholder="Leave blank for Walk-in">
    <label class="form-label" for="wxLine">Item being returned</label>
    <select class="form-select mb-2" id="wxLine">
      ${lines.map((l) => `<option value="${l.idx}">${escapeHtml(l.it.name)} - ${l.left} returnable @ ${formatPeso(l.it.price || 0)}</option>`).join("")}
    </select>
    <label class="form-label" for="wxQty">Quantity returned</label>
    <input type="number" class="form-control mb-2" id="wxQty" min="1" step="1" value="1">
    <p class="form-label mb-1">Can the returned item be sold again?</p>
    <div class="form-check"><input class="form-check-input" type="radio" name="wxRestock" id="wxRestockYes" value="yes" checked><label class="form-check-label" for="wxRestockYes">Yes, back to stock (same batch and expiry)</label></div>
    <div class="form-check mb-3"><input class="form-check-input" type="radio" name="wxRestock" id="wxRestockNo" value="no"><label class="form-check-label" for="wxRestockNo">No, set aside (recorded as a pull-out)</label></div>
    <label class="form-label" for="wxProduct">Replacement item</label>
    <select class="form-select mb-2" id="wxProduct">${productOptions}</select>
    <label class="form-label" for="wxRepQty">Replacement quantity</label>
    <input type="number" class="form-control mb-2" id="wxRepQty" min="1" step="1" value="1">
    <p class="mb-3" style="font-size:0.85rem;" id="wxDiff"></p>
    <label class="form-label" for="wxReason">Reason for return *</label>
    <textarea class="form-control" id="wxReason" rows="2" placeholder="e.g. Wrong item bought / damaged box"></textarea>
  `;
}

// keeps the customer pays line updated
function wireExchangeDialog(sale) {
  const lineSel = document.getElementById("wxLine");
  const qty = document.getElementById("wxQty");
  const prodSel = document.getElementById("wxProduct");
  const repQty = document.getElementById("wxRepQty");
  const diffEl = document.getElementById("wxDiff");
  // searchable like the pos picker
  const prodChoices = makeSearchableSelect(prodSel);
  const line = () => sale.items[Number(lineSel.value)];
  const update = () => {
    const returned = (parseInt(qty.value, 10) || 0) * (line().price || 0);
    const p = getProductById(prodSel.value);
    const repl = (parseInt(repQty.value, 10) || 0) * (p ? p.price || 0 : 0);
    const diff = repl - returned;
    diffEl.innerHTML = `Returned <strong>${formatPeso(returned)}</strong> - Replacement <strong>${formatPeso(repl)}</strong> - ${
      diff >= 0 ? `Customer pays <strong>${formatPeso(diff)}</strong>` : '<span class="text-danger">Replacement is worth less than the return (not allowed)</span>'
    }`;
  };
  const setDefaults = () => {
    if (getProductById(line().productId) && prodSel.querySelector(`option[value="${line().productId}"]`)) prodChoices.setChoiceByValue(line().productId);
    qty.max = String((line().qty || 0) - (line().returnedQty || 0));
    update();
  };
  lineSel.addEventListener("change", setDefaults);
  [prodSel, qty, repQty].forEach((el) => el.addEventListener("input", update));
  prodSel.addEventListener("change", update);
  setDefaults();
}

// what staff entered in the exchange dialog
function readExchangeDialog(sale, processedBy) {
  return {
    saleId: sale.id,
    lineIndex: Number(document.getElementById("wxLine").value),
    returnQty: parseInt(document.getElementById("wxQty").value, 10),
    restock: document.getElementById("wxRestockYes").checked,
    replacement: { productId: document.getElementById("wxProduct").value, qty: parseInt(document.getElementById("wxRepQty").value, 10) },
    reason: document.getElementById("wxReason").value,
    customerName: document.getElementById("wxCustomer").value,
    processedBy,
  };
}

function printWalkinExchangeSlip(ex) {
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const doc = createPdf({ format: "a5" });
  const right = 134;
  let y = 16;
  doc.setFontSize(13);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals", 12, y);
  doc.text(ex.exchangeNo || "", right, y, { align: "right" });
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  y += 5;
  doc.text("Walk-in Return / Exchange", 12, y);
  doc.text(`Date: ${formatDateMDY(ex.createdAt || new Date())}`, right, y, { align: "right" });
  y += 8;
  [
    `Returned by (customer): ${ex.buyerName || ""}`,
    `Original SI No.: ${ex.invoiceNo || "-"} (purchased ${formatDateMDY(ex.purchasedAt)})`,
    `Returned item: ${ex.restocked ? "back to stock" : "set aside (pull-out)"}`,
    `Reason: ${ex.reason || ""}`,
  ].forEach((t) => {
    doc.text(doc.splitTextToSize(t, 122), 12, y);
    y += 5;
  });
  const part = (title, p) => {
    y += 3;
    doc.setFont(undefined, "bold");
    doc.text(title, 12, y);
    doc.setFont(undefined, "normal");
    y += 5;
    doc.text(doc.splitTextToSize(`${p.productName || ""}`, 122), 12, y);
    y += 5;
    (p.batches || []).forEach((b) => {
      if (!b.batchNo && !b.expirationDate) return;
      doc.text(`Batch ${b.batchNo || "-"}, Exp ${b.expirationDate ? formatDateMDY(b.expirationDate) : "-"}, Qty ${b.qty}`, 16, y);
      y += 5;
    });
    doc.text(`Qty ${p.qty} x ${Number(p.unitPrice || 0).toFixed(2)} = ${Number(p.value || 0).toFixed(2)}`, right, y, { align: "right" });
    y += 4;
  };
  part("Returned", ex.returned || {});
  part("Replacement", ex.replacement || {});
  y += 5;
  doc.setFont(undefined, "bold");
  doc.text(`Difference paid by customer: PHP ${Number(ex.priceDifference || 0).toFixed(2)}`, 12, y);
  doc.setFont(undefined, "normal");
  y += 14;
  doc.text("Customer: __________________", 12, y);
  doc.text("Processed by: __________________", 72, y);
  y += 5;
  doc.text(ex.processedBy || "", 72, y);
  printPdf(doc, `Amson-${ex.exchangeNo || "exchange"}.pdf`);
}

// =====================================================================
// ---- audit log ----

// ---- audit log helper ----
// record, before, after and reason are optional
async function logAuditEvent({ action, details, actor, record, before, after, reason }) {
  try {
    let actorName = actor;
    if (!actorName && auth.currentUser) {
      const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        actorName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || userData.email || "Unknown";
      }
    }

    const entry = {
      action,
      details: details || "",
      user: actorName || "Unknown",
      ipAddress: "-",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (record) entry.record = String(record);
    if (before != null && before !== "") entry.before = String(before);
    if (after != null && after !== "") entry.after = String(after);
    if (reason) entry.reason = String(reason);
    await db.collection("auditLog").add(entry);
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

// =====================================================================
// ---- storefront: product cards and quick view ----

// shared thumbnail url for cart and order images
function cloudinaryImageUrl(url, width) {
  if (typeof url !== "string" || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

function cartItemImageCss(imageUrl, width = 160) {
  return imageUrl ? `background-image:url('${cloudinaryImageUrl(imageUrl, width)}'); background-size:cover; background-position:center;` : "";
}

// small rx tag after prescription product names
function rxTag(productOrId) {
  const product = productOrId && typeof productOrId === "object" ? productOrId : getProductById(productOrId);
  return product && product.rxRequired ? ' <span class="rx-tag" title="Prescription required">Rx</span>' : "";
}

function renderProductCard(product) {
  return `
    <div class="col">
      <div class="product-card ${product.inStock ? "" : "out-of-stock"}">
        <a href="product-details.html?id=${product.id}" class="product-image-link product-quickview-trigger" data-product-id="${product.id}">
          <div class="product-image" ${product.imageUrl ? `style="background-image:url('${cloudinaryImageUrl(product.imageUrl, 400)}'); background-size:cover; background-position:center;"` : ""}>
            ${product.inStock ? "" : `<span class="product-image-badge">Out of Stock</span>`}
          </div>
        </a>
        <a href="product-details.html?id=${product.id}" class="product-name-link product-quickview-trigger" data-product-id="${product.id}">
          <h3 class="product-name">${escapeHtml(product.name)}${rxTag(product)}</h3>
        </a>
        <p class="product-desc">${escapeHtml(product.description || "")}</p>
        <p class="product-price">${formatPeso(product.price)}</p>
        ${product.inStock ? `<p class="text-muted mb-1" style="font-size:0.78rem;">${product.totalStock} in stock</p>` : ""}
        ${product.rxRequired ? `<p class="text-muted mb-2" style="font-size:0.78rem;"><i class="bi bi-file-medical me-1"></i>Prescription required</p>` : ""}
        <div class="d-flex flex-column gap-2">
          <button type="button" class="btn btn-amson w-100 btn-add-cart" data-id="${product.id}" ${product.inStock ? "" : "disabled"}>
            ${product.inStock ? "+ Add to Cart" : "Out of Stock"}
          </button>
          ${
            product.inStock
              ? `<button type="button" class="btn btn-outline-dark-amson w-100 btn-buy-now" data-id="${product.id}">Buy Now</button>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

// order summary list for checkout and payment
function checkoutSummaryItemsHtml(cart) {
  return cart
    .map((item) => {
      const product = getProductById(item.id);
      if (!product) return "";
      return `
        <div class="checkout-summary-item">
          <div class="cart-item-image" style="width:56px;height:56px;flex-shrink:0;${cartItemImageCss(product.imageUrl)}"></div>
          <div class="flex-grow-1">
            <p class="mb-0 fw-medium">${escapeHtml(product.name)}${rxTag(product)}</p>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
            <p class="product-price mb-0" style="font-size:1rem;">${formatPeso(product.price * item.qty)}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

// qty buttons, subtotal, add to cart and buy now
function wireProductBuyControls(product, ids) {
  const qtyInput = document.getElementById(ids.qty);
  const subtotalText = document.getElementById(ids.subtotal);
  const maxQty = Math.max(product.totalStock || 0, 0);

  function currentQty() {
    const val = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    return maxQty > 0 ? Math.min(val, maxQty) : val;
  }

  function updateSubtotal() {
    subtotalText.textContent = formatPeso(product.price * currentQty());
  }

  document.getElementById(ids.minus).addEventListener("click", () => {
    qtyInput.value = Math.max(1, currentQty() - 1);
    updateSubtotal();
  });

  document.getElementById(ids.plus).addEventListener("click", () => {
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

  const addToCartBtn = document.getElementById(ids.addToCart);
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

  const buyNowBtn = document.getElementById(ids.buyNow);
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", () => buyNow(product.id, currentQty()));
  }
}

// ---- product quick view ----
// popup instead of opening the product page
document.addEventListener("click", (e) => {
  const trigger = e.target.closest(".product-quickview-trigger");
  if (!trigger) return;
  // special clicks are left to the browser
  const isSpecialClick = e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;
  if (isSpecialClick) return;

  const modalEl = document.getElementById("productQuickViewModal");
  if (!modalEl) return;

  e.preventDefault();
  showProductQuickView(trigger.dataset.productId);
});

async function showProductQuickView(productId) {
  const modalEl = document.getElementById("productQuickViewModal");
  if (!modalEl) return;

  await loadCatalogCache();
  const product = storefrontCatalog().find((p) => p.id === productId) || null;
  const bodyEl = document.getElementById("productQuickViewBody");

  if (!product) {
    bodyEl.innerHTML = `<p class="text-center mb-0 py-4">This product could not be found.</p>`;
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    return;
  }

  bodyEl.innerHTML = `
    <div class="row g-4">
      <div class="col-md-5">
        <div class="product-detail-image" ${product.imageUrl ? `style="background-image:url('${cloudinaryImageUrl(product.imageUrl, 800)}'); background-size:cover; background-position:center;"` : ""}></div>
      </div>
      <div class="col-md-7">
        <h2 class="h4 fw-bold mb-1">${escapeHtml(product.name)}${rxTag(product)}</h2>
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
        <div class="d-flex flex-column gap-2">
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-amson flex-fill py-2" id="quickViewAddToCartBtn" ${product.inStock ? "" : "disabled"}>
              <i class="bi bi-cart3 me-2"></i>${product.inStock ? "Add to Cart" : "Out of Stock"}
            </button>
            <a href="product-details.html?id=${product.id}" class="btn btn-outline-dark-amson py-2" title="Open full page">
              <i class="bi bi-arrows-fullscreen"></i>
            </a>
          </div>
          ${
            product.inStock
              ? `<button type="button" class="btn btn-outline-dark-amson w-100 py-2" id="quickViewBuyNowBtn">Buy Now</button>`
              : ""
          }
        </div>
      </div>
    </div>

    <div class="product-about mt-4">
      <h3 class="h6 fw-bold">About the Product</h3>
      <p class="mb-0">${escapeHtml(product.description || "No description available yet.")}</p>
      ${product.dosageNotes ? `<h3 class="h6 fw-bold mt-3">Dosage / Usage</h3><p class="mb-0">${escapeHtml(product.dosageNotes)}</p>` : ""}
    </div>
  `;

  wireProductBuyControls(product, {
    qty: "quickViewQtyInput",
    subtotal: "quickViewSubtotalText",
    minus: "quickViewQtyMinus",
    plus: "quickViewQtyPlus",
    addToCart: "quickViewAddToCartBtn",
    buyNow: "quickViewBuyNowBtn",
  });

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}
