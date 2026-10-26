/**
 * Inventory Management admin page.
 */

const INVENTORY_PAGE_SIZE = 8;
const PO_PAGE_SIZE = 8;

const PO_STATUS_LABELS = { pending: "Pending", received: "Received", discrepancy: "Discrepancy", closed: "Closed" };
const PO_STATUS_BADGE_CLASS = {
  pending: "text-bg-secondary",
  received: "text-bg-success",
  discrepancy: "text-bg-danger",
  closed: "text-bg-dark",
};

let allBatches = [];
let allSuppliers = [];
let allWriteOffs = [];
let allPurchaseOrders = [];
let allReconciliations = [];
let inventoryFilter = "all";
let inventorySearchTerm = "";
let inventorySortDesc = false;
let inventorySortField = "expirationDate";
let inventoryCurrentPage = 1;
let receiveItemCount = 0;
let writeOffItemCount = 0;
let poItemCount = 0;
let poFilter = "all";
let poSearchTerm = "";
let poCurrentPage = 1;

const filterButtons = Array.from(document.querySelectorAll("#stockPanel .order-filter-btn"));
const poFilterButtons = Array.from(document.querySelectorAll("#purchaseOrdersPanel .order-filter-btn"));
const inventorySearchInput = document.getElementById("inventorySearchInput");
const inventorySortBtn = document.getElementById("inventorySortBtn");
const inventorySortFieldSelect = document.getElementById("inventorySortFieldSelect");
const inventoryTableBody = document.getElementById("inventoryTableBody");
const inventoryTableEmpty = document.getElementById("inventoryTableEmpty");
const inventoryPagination = document.getElementById("inventoryPagination");
const exportInventoryBtn = document.getElementById("exportInventoryBtn");

const tabStockBtn = document.getElementById("tabStockBtn");
const tabPurchaseOrdersBtn = document.getElementById("tabPurchaseOrdersBtn");
const stockPanel = document.getElementById("stockPanel");
const purchaseOrdersPanel = document.getElementById("purchaseOrdersPanel");

const createPoBtn = document.getElementById("createPoBtn");
const createPoModalEl = document.getElementById("createPoModal");
const poSupplierSelect = document.getElementById("poSupplierSelect");
const poExpectedDateInput = document.getElementById("poExpectedDateInput");
const poItemsContainer = document.getElementById("poItemsContainer");
const poAddItemBtn = document.getElementById("poAddItemBtn");
const createPoAlert = document.getElementById("createPoAlert");
const savePoBtn = document.getElementById("savePoBtn");

const poSearchInput = document.getElementById("poSearchInput");
const poTableBody = document.getElementById("poTableBody");
const poTableEmpty = document.getElementById("poTableEmpty");
const poPagination = document.getElementById("poPagination");

const viewPoModalEl = document.getElementById("viewPoModal");

const receiveStockBtn = document.getElementById("receiveStockBtn");
const receiveStockModalEl = document.getElementById("receiveStockModal");
const receiveSupplierSelect = document.getElementById("receiveSupplierSelect");
const receiveDateInput = document.getElementById("receiveDateInput");
const receiveReceiptNoInput = document.getElementById("receiveReceiptNoInput");
const receiveItemsContainer = document.getElementById("receiveItemsContainer");
const receiveAddItemBtn = document.getElementById("receiveAddItemBtn");
const receiveModalAlert = document.getElementById("receiveModalAlert");
const saveReceiveStockBtn = document.getElementById("saveReceiveStockBtn");
const receiveUploadBatchBtn = document.getElementById("receiveUploadBatchBtn");
const receiveBatchFileInput = document.getElementById("receiveBatchFileInput");
const receiveBatchUploadStatus = document.getElementById("receiveBatchUploadStatus");
const receiveDownloadTemplateBtn = document.getElementById("receiveDownloadTemplateBtn");
const receiveNewSupplierBtn = document.getElementById("receiveNewSupplierBtn");

const quickAddSupplierModalEl = document.getElementById("quickAddSupplierModal");
const quickSupplierNameInput = document.getElementById("quickSupplierNameInput");
const quickSupplierContactInput = document.getElementById("quickSupplierContactInput");
const quickSupplierPhoneInput = document.getElementById("quickSupplierPhoneInput");
const quickAddSupplierAlert = document.getElementById("quickAddSupplierAlert");
const quickAddSupplierCancelBtn = document.getElementById("quickAddSupplierCancelBtn");
const quickAddSupplierSaveBtn = document.getElementById("quickAddSupplierSaveBtn");

const quickAddProductModalEl = document.getElementById("quickAddProductModal");
const quickProductNameInput = document.getElementById("quickProductNameInput");
const quickProductCategorySelect = document.getElementById("quickProductCategorySelect");
const quickProductPriceInput = document.getElementById("quickProductPriceInput");
const quickAddProductAlert = document.getElementById("quickAddProductAlert");
const quickAddProductCancelBtn = document.getElementById("quickAddProductCancelBtn");
const quickAddProductSaveBtn = document.getElementById("quickAddProductSaveBtn");

let quickAddProductTargetSelect = null;

const writeOffStockBtn = document.getElementById("writeOffStockBtn");
const writeOffModalEl = document.getElementById("writeOffModal");
const writeOffDateInput = document.getElementById("writeOffDateInput");
const writeOffItemsContainer = document.getElementById("writeOffItemsContainer");
const writeOffAddItemBtn = document.getElementById("writeOffAddItemBtn");
const writeOffModalAlert = document.getElementById("writeOffModalAlert");
const saveWriteOffBtn = document.getElementById("saveWriteOffBtn");

const tabReconciliationBtn = document.getElementById("tabReconciliationBtn");
const reconciliationPanel = document.getElementById("reconciliationPanel");
const reconciliationActiveView = document.getElementById("reconciliationActiveView");
const reconciliationEmptyState = document.getElementById("reconciliationEmptyState");
const reconciliationRcnNumber = document.getElementById("reconciliationRcnNumber");
const reconciliationMeta = document.getElementById("reconciliationMeta");
const reconciliationItemsBody = document.getElementById("reconciliationItemsBody");
const reconciliationAlert = document.getElementById("reconciliationAlert");
const submitCountBtn = document.getElementById("submitCountBtn");
const openReconciliationSessionBtn = document.getElementById("openReconciliationSessionBtn");
const pastSessionsList = document.getElementById("pastSessionsList");
const pastSessionsEmpty = document.getElementById("pastSessionsEmpty");

const openReconciliationModalEl = document.getElementById("openReconciliationModal");
const reconciliationPeriodInput = document.getElementById("reconciliationPeriodInput");
const openReconciliationAlert = document.getElementById("openReconciliationAlert");
const confirmOpenSessionBtn = document.getElementById("confirmOpenSessionBtn");

let currentAdminName = "Admin";
let currentAdminRole = null;
document.addEventListener("admin:ready", (e) => {
  const admin = e.detail && e.detail.admin;
  if (admin) currentAdminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Admin";
  if (admin) currentAdminRole = admin.role;
  if (currentAdminRole !== "admin" && currentAdminRole !== "branch_manager") {
    document.getElementById("submitCountBtn").textContent = "Save Count for Branch Manager";
  }
  loadInventory();
});

// Today on the branch's calendar (the UTC date is still yesterday until
// 8 AM in the Philippines).
function todayISO() {
  return sheetDateToISO(new Date());
}

/* ---------- Load ---------- */
async function loadInventory() {
  try {
    // loadInventory() is this page's "refresh everything" entry point -
    // called after every mutation (receive stock, write-off, reconciliation,
    // PO receiving), none of which used to invalidate the cached product
    // totals. That meant the just-received batch's unit never showed up in
    // a product's totalStock until a full page reload, so a product that
    // had just gone low/out of stock didn't get flagged until then.
    catalogLoadPromise = null;
    await loadCatalogCache();
    // The live listener's first snapshot doubles as this page's batch read
    // (a separate get() as well would read every batch twice).
    const [, supplierSnapshot, writeOffSnapshot, poSnapshot, reconciliationSnapshot] = await Promise.all([
      listenToBatches(),
      db.collection("suppliers").get(),
      db.collection("writeOffs").get(),
      db.collection("purchaseOrders").get(),
      db.collection("reconciliations").get(),
    ]);

    // Wholesale Only / Bad Order moves, on every refresh, from the batches
    // already in hand; the listener redraws the page with any changes.
    await enforceExpiryStatus(allBatches);
    allSuppliers = supplierSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allWriteOffs = writeOffSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allPurchaseOrders = poSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allReconciliations = reconciliationSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Product-level counts (not per-batch - see computeInventoryAlertCounts)
    // only need recomputing when the underlying data changes, not on every
    // filter/search/page click, so this stays separate from the table
    // re-render below.
    const alertCounts = await computeInventoryAlertCounts(allBatches);
    document.getElementById("lowStockCount").textContent = alertCounts.lowStock;
    document.getElementById("outOfStockCount").textContent = alertCounts.outOfStock;
    document.getElementById("nearExpiryCount").textContent = alertCounts.nearExpiry;
    document.getElementById("expiredCount").textContent = alertCounts.expired;

    renderInventoryTable();
    renderPoTable();
    renderReconciliationTab();
  } catch (error) {
    console.error("Failed to load inventory:", error);
  }
}

// Live stock (REQNF005): a sale, receipt or write-off anywhere updates this
// table and the tiles without a refresh.
let unsubscribeBatches = null;
let batchRefreshTimer = null;
let batchesReady = null;

// Resolves once allBatches holds the first snapshot; later snapshots keep
// it current and redraw the table and tiles.
function listenToBatches() {
  if (batchesReady) return batchesReady;
  let first = true;
  batchesReady = new Promise((resolve, reject) => {
    unsubscribeBatches = db.collection("stockBatches").onSnapshot(
      (snap) => {
        allBatches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        if (first) {
          first = false;
          resolve(allBatches);
          return; // loadInventory draws the page from this
        }
        clearTimeout(batchRefreshTimer);
        batchRefreshTimer = setTimeout(async () => {
          renderInventoryTable();
          try {
            const counts = await computeInventoryAlertCounts(allBatches);
            document.getElementById("lowStockCount").textContent = counts.lowStock;
            document.getElementById("outOfStockCount").textContent = counts.outOfStock;
            document.getElementById("nearExpiryCount").textContent = counts.nearExpiry;
            document.getElementById("expiredCount").textContent = counts.expired;
          } catch (error) {
            console.warn("Inventory tiles couldn't refresh:", error);
          }
        }, 400);
      },
      (error) => {
        console.warn("Live inventory unavailable:", error);
        // The next refresh (loadInventory) starts a new listener.
        batchesReady = null;
        unsubscribeBatches = null;
        if (first) {
          // Without the listener, read once so the page still works.
          db.collection("stockBatches").get().then((snap) => {
            allBatches = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            resolve(allBatches);
          }, reject);
        }
      }
    );
  });
  return batchesReady;
}

/* ---------- Tabs ---------- */
function setActiveInventoryTab(tab) {
  tabStockBtn.classList.toggle("active", tab === "stock");
  tabPurchaseOrdersBtn.classList.toggle("active", tab === "po");
  tabReconciliationBtn.classList.toggle("active", tab === "reconciliation");
  stockPanel.classList.toggle("d-none", tab !== "stock");
  purchaseOrdersPanel.classList.toggle("d-none", tab !== "po");
  reconciliationPanel.classList.toggle("d-none", tab !== "reconciliation");
}

tabStockBtn.addEventListener("click", () => setActiveInventoryTab("stock"));
tabPurchaseOrdersBtn.addEventListener("click", () => setActiveInventoryTab("po"));
tabReconciliationBtn.addEventListener("click", () => setActiveInventoryTab("reconciliation"));

/* ---------- PO number generation (same pattern as order numbers) ---------- */
async function generatePoNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`purchaseOrders-${year}`);
  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `PO-${year}-${String(nextCount).padStart(4, "0")}`;
}

/* ---------- Reconciliation number generation (2-digit) ---------- */
async function generateRcnNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`reconciliations-${year}`);
  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `SC-${year}-${String(nextCount).padStart(2, "0")}`;
}

/* ---------- Formatting ---------- */
function formatExpiryLabel(isoDate) {
  if (!isoDate) return "-";
  return formatDateMDY(isoDate);
}

function formatDateAdded(timestamp) {
  if (!timestamp) return "-";
  return formatDateMDY(timestamp);
}

function formatDateTime(timestamp) {
  if (!timestamp) return "-";
  return formatDateMDY(timestamp, true);
}

function inventorySortMillis(batch) {
  if (inventorySortField === "lastAdjustedAt") {
    const ts = batch.lastAdjustedAt || batch.createdAt;
    return ts && ts.toMillis ? ts.toMillis() : 0;
  }
  return new Date(batch.expirationDate).getTime();
}

/* ---------- Table ---------- */
function filteredBatches() {
  // Real total physical stock per product (every batch, any status) - not
  // SAMPLE_PRODUCTS.totalStock, which is deliberately active-only for the
  // storefront's sake. A wholesale_only batch's units still exist.
  const physicalStockByProduct = sumPhysicalStockByProduct(allBatches);
  let filtered = allBatches
    .map((b) => ({
      ...b,
      computedStatuses: getBatchStatuses(b, physicalStockByProduct[b.productId] || 0),
    }));

  if (inventoryFilter !== "all") {
    filtered = filtered.filter((b) => b.computedStatuses.includes(inventoryFilter));
  }

  if (inventorySearchTerm) {
    const term = inventorySearchTerm.toLowerCase();
    filtered = filtered.filter((b) => {
      const product = getProductById(b.productId);
      const categoryLabel = product ? CATEGORY_LABELS[product.category] || "" : "";
      return (
        (b.batchNo || "").toLowerCase().includes(term) ||
        (product && product.name.toLowerCase().includes(term)) ||
        categoryLabel.toLowerCase().includes(term)
      );
    });
  }

  filtered.sort((a, b) => {
    const aTime = inventorySortMillis(a);
    const bTime = inventorySortMillis(b);
    return inventorySortDesc ? bTime - aTime : aTime - bTime;
  });

  return filtered;
}

function renderInventoryTable() {
  const filtered = filteredBatches();
  const totalPages = Math.max(1, Math.ceil(filtered.length / INVENTORY_PAGE_SIZE));
  inventoryCurrentPage = Math.min(inventoryCurrentPage, totalPages);

  const start = (inventoryCurrentPage - 1) * INVENTORY_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + INVENTORY_PAGE_SIZE);

  if (pageItems.length === 0) {
    inventoryTableBody.innerHTML = "";
    inventoryTableEmpty.classList.remove("d-none");
  } else {
    inventoryTableEmpty.classList.add("d-none");
    inventoryTableBody.innerHTML = pageItems.map(renderBatchRow).join("");
    inventoryTableBody.querySelectorAll(".delete-orphan-batch-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteOrphanBatch(btn.dataset.id));
    });
    inventoryTableBody.querySelectorAll(".mark-disposed-btn").forEach((btn) => {
      btn.addEventListener("click", () => markBatchDisposed(btn.dataset.id));
    });
  }

  renderInventoryPagination(totalPages);
}

// Staff confirm a Bad Order batch was physically pulled out and disposed of.
async function markBatchDisposed(batchId) {
  const batch = allBatches.find((b) => b.id === batchId);
  if (!batch) return;
  const product = getProductById(batch.productId);
  const note = await showAppPrompt(`Confirm that batch ${batch.batchNo || "-"} of ${product ? product.name : "this product"} (${batch.badOrderQty || 0} units) was pulled out and disposed of. How was it disposed of?`, {
    title: "Mark Bad Order Disposed",
    confirmLabel: "Mark disposed",
    defaultValue: "",
  });
  if (note === null) return;
  try {
    await db.collection("stockBatches").doc(batchId).update({
      disposedAt: firebase.firestore.FieldValue.serverTimestamp(),
      disposedBy: currentAdminName,
      disposalNote: note.trim(),
    });
    await logAuditEvent({
      action: "Bad Order Disposed",
      details: `${product ? product.name : batch.productId} - Batch ${batch.batchNo || "-"}, ${batch.badOrderQty || 0} units${note.trim() ? `. ${note.trim()}` : ""}`,
    });
    await loadInventory();
  } catch (error) {
    showAppAlert("Something went wrong saving this. Please try again.");
  }
}

async function deleteOrphanBatch(batchId) {
  if (!(await showAppConfirm("This batch's product no longer exists. Delete this leftover inventory record? This can't be undone.", { confirmLabel: "Delete" }))) return;
  try {
    await db.collection("stockBatches").doc(batchId).delete();
    await loadInventory();
  } catch (error) {
    showAppAlert("Something went wrong deleting this record. Please try again.");
  }
}

// Supplier name plus the receipt/DR no. it came in on (REQ049).
function batchSupplierCell(batch) {
  const supplier = allSuppliers.find((s) => s.id === batch.supplierId);
  if (!supplier && !batch.supplierReceiptNo) return "-";
  const receipt = batch.supplierReceiptNo ? `<br><span class="text-muted" style="font-size:0.75rem;">DR ${escapeHtml(batch.supplierReceiptNo)}</span>` : "";
  return `${supplier ? escapeHtml(supplier.name) : "-"}${receipt}`;
}

function renderBatchRow(batch) {
  const product = getProductById(batch.productId);
  const reorderPoint = (product && product.reorderPoint) || DEFAULT_REORDER_POINT;

  return `
    <tr>
      <td class="fw-medium">${escapeHtml(batch.batchNo)}</td>
      <td>${formatDateAdded(batch.createdAt)}</td>
      <td>${formatExpiryLabel(batch.expirationDate)}</td>
      <td>${escapeHtml(product ? product.name : "Unknown product")}</td>
      <td>${product ? CATEGORY_LABELS[product.category] || "-" : "-"}</td>
      <td>${batchSupplierCell(batch)}</td>
      <td>${batch.quantity}</td>
      <td>${reorderPoint}</td>
      <td>
        ${batch.computedStatuses.map((s) => `<span class="batch-status-pill ${s}">${BATCH_STATUS_LABELS[s]}</span>`).join(" ")}
        ${batch.status === "wholesale_only" ? '<span class="badge rounded-pill text-bg-secondary ms-1">Wholesale Only</span>' : ""}
        ${batch.status === "bad_order" ? `<span class="badge rounded-pill text-bg-danger ms-1">Bad Order${batch.badOrderQty ? ` (${batch.badOrderQty} written off)` : ""}</span>${batch.disposedAt ? '<span class="badge rounded-pill text-bg-light border ms-1">Disposed</span>' : ""}` : ""}
      </td>
      <td>${formatDateTime(batch.lastAdjustedAt || batch.createdAt)}</td>
      <td>
        ${batch.status === "bad_order" && !batch.disposedAt ? `<button type="button" class="btn btn-outline-dark-amson btn-sm mark-disposed-btn" data-id="${batch.id}">Mark disposed</button>` : ""}
        ${product ? "" : `<button type="button" class="icon-btn delete-orphan-batch-btn" data-id="${batch.id}" aria-label="Delete orphaned batch" title="This batch's product was deleted - remove this leftover record"><i class="bi bi-trash text-danger"></i></button>`}
      </td>
    </tr>
  `;
}

function renderInventoryPagination(totalPages) {
  if (totalPages <= 1) {
    inventoryPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${inventoryCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === inventoryCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${inventoryCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  inventoryPagination.innerHTML = html;
}

inventoryPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") inventoryCurrentPage -= 1;
  else if (btn.dataset.page === "next") inventoryCurrentPage += 1;
  else inventoryCurrentPage = Number(btn.dataset.page);
  renderInventoryTable();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    inventoryFilter = btn.dataset.filter;
    inventoryCurrentPage = 1;
    renderInventoryTable();
  });
});

inventorySearchInput.addEventListener("input", () => {
  inventorySearchTerm = inventorySearchInput.value.trim();
  inventoryCurrentPage = 1;
  renderInventoryTable();
});

inventorySortBtn.addEventListener("click", () => {
  inventorySortDesc = !inventorySortDesc;
  renderInventoryTable();
});

inventorySortFieldSelect.addEventListener("change", () => {
  inventorySortField = inventorySortFieldSelect.value;
  renderInventoryTable();
});

/* ---------- Shared repeater helpers ---------- */
function makeSearchableSelect(selectEl) {
  return new Choices(selectEl, {
    searchEnabled: true,
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

function populateProductSelect(selectEl) {
  selectEl.innerHTML = SAMPLE_PRODUCTS.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  selectEl._choices = makeSearchableSelect(selectEl);
}

// Every delivery and purchase order needs a supplier - the first option is
// only a prompt and can't be saved.
function populateSupplierSelect(selectEl) {
  const options = ['<option value="">Choose a supplier</option>'].concat(
    allSuppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`)
  );
  selectEl.innerHTML = options.join("");
  selectEl._choices = makeSearchableSelect(selectEl);
}

// ---- Batch numbers ----
// The manufacturer prints a batch number and its expiry date on the box,
// and one product's batch always has one expiry date. So when stock comes
// in (Receive Stock form, Excel upload, PO delivery):
//   - same product + batch no. + expiry as a batch already in stock: the
//     units are added to that batch (each delivery is kept in its
//     `deliveries` list for the Supplier Purchases report);
//   - same product + batch no. with a different expiry: refused, it's a
//     typing mistake;
//   - a different product with the same batch no.: a separate batch
//     (manufacturers can use the same codes).
// lines: [{ productId, batchNo, expirationDate, qty, supplierId,
// supplierReceiptNo, unitCost, dateReceived, poId? }]
function batchKey(productId, batchNo) {
  return `${productId}|${String(batchNo || "").trim().toLowerCase()}`;
}

function planStockReceipt(lines) {
  const productName = (id) => (getProductById(id) || {}).name || "this product";
  const errors = [];
  const merged = new Map();
  lines.forEach((line) => {
    const key = batchKey(line.productId, line.batchNo);
    const prior = merged.get(key);
    if (!prior) return merged.set(key, { ...line });
    if (prior.expirationDate !== line.expirationDate) {
      errors.push(`Batch ${line.batchNo} of ${productName(line.productId)} is entered twice with different expiry dates.`);
    } else {
      prior.qty += line.qty;
    }
  });
  const newLines = [];
  const topUps = [];
  merged.forEach((line, key) => {
    const existing = allBatches.find((b) => batchKey(b.productId, b.batchNo) === key);
    if (!existing) return newLines.push(line);
    if (existing.expirationDate !== line.expirationDate) {
      errors.push(
        `Batch ${line.batchNo} of ${productName(line.productId)} is already recorded with expiry ${formatDateMDY(`${existing.expirationDate}T12:00:00`)}. Check the box: one batch has only one expiry date.`
      );
    } else if (existing.status === "bad_order") {
      errors.push(`Batch ${line.batchNo} of ${productName(line.productId)} was already written off as a Bad Order, so it can't be received again.`);
    } else {
      topUps.push({ batchId: existing.id, line });
    }
  });
  return { errors, newLines, topUps };
}

function deliveryRecord(src, qty) {
  return {
    qty,
    dateReceived: src.dateReceived || null,
    supplierId: src.supplierId || null,
    supplierReceiptNo: src.supplierReceiptNo || null,
    unitCost: src.unitCost == null || isNaN(src.unitCost) ? null : src.unitCost,
    poId: src.poId || null,
    source: src.source || null,
  };
}

// Inside a transaction. Reads first (Firestore needs every read before any
// write), then adds new batches and tops up existing ones.
async function applyStockReceipt(transaction, plan) {
  const refs = plan.topUps.map((t) => db.collection("stockBatches").doc(t.batchId));
  const docs = [];
  for (const ref of refs) docs.push(await transaction.get(ref));
  return () => {
    plan.newLines.forEach((line) => {
      const record = {
        productId: line.productId,
        batchNo: line.batchNo,
        expirationDate: line.expirationDate,
        quantity: line.qty,
        initialQuantity: line.qty,
        supplierId: line.supplierId || null,
        supplierReceiptNo: line.supplierReceiptNo || null,
        unitCost: line.unitCost == null || isNaN(line.unitCost) ? null : line.unitCost,
        dateReceived: line.dateReceived,
        status: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (line.poId) record.poId = line.poId;
      // "opening_stock": counted on the shelf when the branch started using
      // the system - not a purchase, so Supplier Purchases leaves it out.
      if (line.source) record.source = line.source;
      transaction.set(db.collection("stockBatches").doc(), record);
    });
    plan.topUps.forEach((t, i) => {
      if (!docs[i].exists) throw new Error(`Batch ${t.line.batchNo} no longer exists. Refresh the page and try again.`);
      const b = docs[i].data();
      const firstQty = b.initialQuantity != null ? b.initialQuantity : b.quantity || 0;
      const deliveries = (b.deliveries && b.deliveries.length ? b.deliveries : [deliveryRecord(b, firstQty)]).concat([deliveryRecord(t.line, t.line.qty)]);
      transaction.update(refs[i], {
        quantity: (b.quantity || 0) + t.line.qty,
        initialQuantity: firstQty + t.line.qty,
        deliveries,
        lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });
  };
}

function receiptSummary(plan) {
  const name = (id) => (getProductById(id) || {}).name || id;
  return plan.newLines
    .map((l) => `${name(l.productId)} x${l.qty} (Batch ${l.batchNo})`)
    .concat(plan.topUps.map((t) => `${name(t.line.productId)} x${t.line.qty} (added to existing Batch ${t.line.batchNo})`))
    .join("; ");
}

// One entry per received line, for the result pop-up.
function receiptLineNames(plan) {
  const name = (id) => (getProductById(id) || {}).name || id;
  return plan.newLines
    .map((l) => `${name(l.productId)} x${l.qty} (Batch ${l.batchNo})`)
    .concat(plan.topUps.map((t) => `${name(t.line.productId)} x${t.line.qty} (Batch ${t.line.batchNo}, topped up)`));
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

/* ---------- Receive Stock ---------- */
function addReceiveItemRow() {
  receiveItemCount += 1;
  const row = document.createElement("div");
  row.className = "repeater-item";
  row.innerHTML = `
    <p class="repeater-label">Item ${receiveItemCount}</p>
    <button type="button" class="repeater-remove-btn" aria-label="Remove item"><i class="bi bi-x-lg"></i></button>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="d-flex justify-content-between align-items-center">
          <label class="form-label mb-0">Product <span class="text-danger">*</span></label>
          <button type="button" class="btn btn-link btn-sm p-0 quick-add-product-btn" style="font-size:0.8rem;">+ New Product</button>
        </div>
        <select class="form-select receive-product-select"></select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Qty Received <span class="text-danger">*</span></label>
        <input type="number" min="1" class="form-control receive-qty-input">
      </div>
      <div class="col-md-6">
        <label class="form-label">Batch No. <span class="text-danger">*</span></label>
        <input type="text" class="form-control receive-batchno-input" placeholder="e.g. BIO-500-100">
      </div>
      <div class="col-md-6">
        <label class="form-label">Expiry Date <span class="text-danger">*</span></label>
        <input type="date" class="form-control receive-expiry-input">
      </div>
      <div class="col-md-6">
        <label class="form-label">Unit Cost (&#8369;) <span class="text-muted fw-normal">(optional)</span></label>
        <input type="number" min="0" step="0.01" class="form-control receive-unitcost-input">
      </div>
    </div>
  `;
  receiveItemsContainer.appendChild(row);
  populateProductSelect(row.querySelector(".receive-product-select"));
  updateRemoveButtonsVisibility(receiveItemsContainer);

  row.querySelector(".repeater-remove-btn").addEventListener("click", () => {
    destroyChoicesIn(row);
    row.remove();
    renumberItems(receiveItemsContainer);
    updateRemoveButtonsVisibility(receiveItemsContainer);
  });

  row.querySelector(".quick-add-product-btn").addEventListener("click", () => {
    openQuickAddProductModal(row.querySelector(".receive-product-select"));
  });
}

receiveAddItemBtn.addEventListener("click", addReceiveItemRow);

receiveStockBtn.addEventListener("click", () => {
  destroyChoicesIn(receiveItemsContainer);
  if (receiveSupplierSelect._choices) {
    receiveSupplierSelect._choices.destroy();
    receiveSupplierSelect._choices = null;
  }
  receiveItemsContainer.innerHTML = "";
  receiveItemCount = 0;
  addReceiveItemRow();
  receiveDateInput.value = todayISO();
  receiveReceiptNoInput.value = "";
  receiveModalAlert.classList.add("d-none");
  receiveBatchUploadStatus.textContent = "";
  populateSupplierSelect(receiveSupplierSelect);
  bootstrap.Modal.getOrCreateInstance(receiveStockModalEl).show();
});

saveReceiveStockBtn.addEventListener("click", async () => {
  const supplierId = receiveSupplierSelect.value;
  const dateReceived = receiveDateInput.value;
  const supplierReceiptNo = receiveReceiptNoInput.value.trim();
  const rows = Array.from(receiveItemsContainer.querySelectorAll(".repeater-item"));

  const items = rows.map((row) => ({
    productId: row.querySelector(".receive-product-select").value,
    qty: parseInt(row.querySelector(".receive-qty-input").value, 10),
    batchNo: row.querySelector(".receive-batchno-input").value.trim(),
    expirationDate: row.querySelector(".receive-expiry-input").value,
    unitCost: parseFloat(row.querySelector(".receive-unitcost-input").value),
  }));

  const showReceiveError = (text) => {
    receiveModalAlert.textContent = text;
    receiveModalAlert.classList.remove("d-none");
  };
  if (!supplierId || !dateReceived || !supplierReceiptNo) {
    return showReceiveError("Choose the supplier and fill in the date received and the supplier receipt / DR no.");
  }
  const invalid = items.some((it) => !it.productId || !it.qty || it.qty <= 0 || !it.batchNo || !it.expirationDate);
  if (invalid || items.length === 0) {
    return showReceiveError("Every item needs a product, quantity, batch number, and expiry date. Only the unit cost is optional.");
  }
  const plan = planStockReceipt(items.map((it) => ({ ...it, supplierId, supplierReceiptNo, dateReceived })));
  if (plan.errors.length) return showReceiveError(plan.errors.join(" "));

  saveReceiveStockBtn.disabled = true;
  receiveModalAlert.classList.add("d-none");

  try {
    // All lines or none, so a retry after an error can't add stock twice.
    await db.runTransaction(async (transaction) => {
      const write = await applyStockReceipt(transaction, plan);
      write();
    });

    const supplier = allSuppliers.find((sup) => sup.id === supplierId);
    await logAuditEvent({
      action: "Stock Received",
      details: `From ${supplier ? supplier.name : "unspecified supplier"}, Receipt/DR ${supplierReceiptNo}: ${receiptSummary(plan)}`,
    });

    bootstrap.Modal.getInstance(receiveStockModalEl).hide();
    await loadInventory();
    await showTaskResult({
      type: "success",
      title: "Stock received",
      message: `${plan.newLines.length + plan.topUps.length} line${plan.newLines.length + plan.topUps.length === 1 ? "" : "s"} added to inventory${supplier ? ` from ${supplier.name}` : ""} (Receipt/DR ${supplierReceiptNo}).`,
      list: receiptLineNames(plan),
    });
  } catch (error) {
    receiveModalAlert.textContent = error.message && error.message.startsWith("Batch ") ? error.message : "Something went wrong receiving this stock. Please try again.";
    receiveModalAlert.classList.remove("d-none");
  } finally {
    saveReceiveStockBtn.disabled = false;
  }
});

/* ---------- Receive Stock: batch upload (Excel .xlsx/.xls or .csv, via SheetJS) ---------- */
const RECEIVE_BATCH_TEMPLATE_HEADERS = ["sku", "batchNo", "expiryDate", "qtyReceived", "unitCost", "supplierName", "receiptNo", "dateReceived"];

receiveUploadBatchBtn.addEventListener("click", () => receiveBatchFileInput.click());

receiveDownloadTemplateBtn.addEventListener("click", () => {
  const exampleRow = {
    sku: "SKU-0001", batchNo: "B2026-001", expiryDate: "2027-06-30",
    qtyReceived: 100, unitCost: 3.5, supplierName: "Unilab", receiptNo: "DR-0001", dateReceived: todayISO(),
  };
  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: RECEIVE_BATCH_TEMPLATE_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock");
  XLSX.writeFile(wb, "amson-receive-stock-template.xlsx");
});

const receiveBatchReviewModalEl = document.getElementById("receiveBatchReviewModal");
const receiveBatchReviewTableBody = document.getElementById("receiveBatchReviewTableBody");
const receiveBatchReviewAlert = document.getElementById("receiveBatchReviewAlert");
const receiveBatchReviewCount = document.getElementById("receiveBatchReviewCount");
const receiveBatchReviewAddRowBtn = document.getElementById("receiveBatchReviewAddRowBtn");
const receiveBatchReviewConfirmBtn = document.getElementById("receiveBatchReviewConfirmBtn");

function receiveBatchReviewRowHtml(row = {}) {
  return `
    <tr>
      <td><input type="text" class="form-control form-control-sm rbr-sku" value="${row.sku || ""}" placeholder="e.g. SKU-0001"></td>
      <td><input type="text" class="form-control form-control-sm rbr-batchno" value="${row.batchno || ""}"></td>
      <td><input type="date" class="form-control form-control-sm rbr-expirydate" value="${row.expirydate || ""}"></td>
      <td><input type="number" min="1" step="1" class="form-control form-control-sm rbr-qty" value="${row.qtyreceived || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm rbr-unitcost" value="${row.unitcost || ""}"></td>
      <td><input type="text" class="form-control form-control-sm rbr-supplier" value="${escapeHtml(row.suppliername || "")}"></td>
      <td><input type="text" class="form-control form-control-sm rbr-receiptno" value="${row.receiptno || ""}"></td>
      <td><input type="date" class="form-control form-control-sm rbr-datereceived" value="${row.datereceived || todayISO()}"></td>
      <td><button type="button" class="icon-btn rbr-remove" aria-label="Remove row"><i class="bi bi-trash text-danger"></i></button></td>
    </tr>
  `;
}

function updateReceiveBatchReviewCount() {
  const count = receiveBatchReviewTableBody.querySelectorAll("tr").length;
  receiveBatchReviewCount.textContent = `${count} batch${count === 1 ? "" : "es"} ready to receive`;
}

function openReceiveBatchReviewModal(rows) {
  receiveBatchReviewAlert.classList.add("d-none");
  receiveBatchReviewTableBody.innerHTML = rows.map(receiveBatchReviewRowHtml).join("");
  updateReceiveBatchReviewCount();
  bootstrap.Modal.getOrCreateInstance(receiveBatchReviewModalEl).show();
}

receiveBatchReviewAddRowBtn.addEventListener("click", () => {
  receiveBatchReviewTableBody.insertAdjacentHTML("beforeend", receiveBatchReviewRowHtml());
  updateReceiveBatchReviewCount();
});

receiveBatchReviewTableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".rbr-remove");
  if (!btn) return;
  btn.closest("tr").remove();
  updateReceiveBatchReviewCount();
});

receiveBatchReviewConfirmBtn.addEventListener("click", async () => {
  const rowEls = Array.from(receiveBatchReviewTableBody.querySelectorAll("tr"));
  if (rowEls.length === 0) {
    receiveBatchReviewAlert.textContent = "There's nothing to receive - add a row or cancel.";
    receiveBatchReviewAlert.classList.remove("d-none");
    return;
  }

  let hasInvalid = false;
  rowEls.forEach((tr) => tr.classList.remove("table-danger"));
  const parsedRows = rowEls.map((tr) => {
    const get = (cls) => tr.querySelector(`.${cls}`);
    const sku = get("rbr-sku").value.trim();
    const batchNo = get("rbr-batchno").value.trim();
    const expiryDate = get("rbr-expirydate").value;
    const qty = parseInt(get("rbr-qty").value, 10);
    const product = SAMPLE_PRODUCTS.find((p) => (p.sku || "").toLowerCase() === sku.toLowerCase());

    const supplierName = get("rbr-supplier").value.trim();
    const supplier = allSuppliers.find((s) => s.name.toLowerCase() === supplierName.toLowerCase());
    const receiptNo = get("rbr-receiptno").value.trim();
    const dateReceived = get("rbr-datereceived").value;

    if (!product || !batchNo || !expiryDate || !qty || qty <= 0 || !supplier || !receiptNo || !dateReceived) {
      tr.classList.add("table-danger");
      hasInvalid = true;
    }

    return {
      product,
      batchNo,
      expiryDate,
      qty,
      supplierId: supplier ? supplier.id : null,
      supplierReceiptNo: receiptNo,
      unitCost: get("rbr-unitcost").value === "" ? null : parseFloat(get("rbr-unitcost").value),
      dateReceived,
    };
  });

  if (hasInvalid) {
    receiveBatchReviewAlert.textContent = "Every row needs a recognized SKU, batch number, expiry date, quantity above 0, a supplier name that matches a saved supplier, a receipt / DR no. and a date received (only the unit cost is optional). Fix the highlighted rows, or remove them.";
    receiveBatchReviewAlert.classList.remove("d-none");
    return;
  }
  const plan = planStockReceipt(
    parsedRows.map((r) => ({
      productId: r.product.id,
      batchNo: r.batchNo,
      expirationDate: r.expiryDate,
      qty: r.qty,
      supplierId: r.supplierId,
      supplierReceiptNo: r.supplierReceiptNo,
      unitCost: r.unitCost,
      dateReceived: r.dateReceived,
    }))
  );
  if (plan.errors.length) {
    receiveBatchReviewAlert.textContent = plan.errors.join(" ");
    receiveBatchReviewAlert.classList.remove("d-none");
    return;
  }

  receiveBatchReviewAlert.classList.add("d-none");
  receiveBatchReviewConfirmBtn.disabled = true;
  receiveBatchReviewConfirmBtn.textContent = "Receiving...";

  // Saved in groups of up to 400 lines, each group all-or-nothing, so a
  // failed group can be retried without duplicating the ones before it.
  const ops = plan.newLines.map((line) => ({ line })).concat(plan.topUps.map((t) => ({ topUp: t })));
  let imported = 0;
  let failed = 0;
  for (let start = 0; start < ops.length; start += 400) {
    const chunk = ops.slice(start, start + 400);
    const subPlan = { newLines: chunk.filter((o) => o.line).map((o) => o.line), topUps: chunk.filter((o) => o.topUp).map((o) => o.topUp) };
    try {
      await db.runTransaction(async (transaction) => {
        const write = await applyStockReceipt(transaction, subPlan);
        write();
      });
      imported += chunk.length;
    } catch (error) {
      failed = ops.length - imported;
      break;
    }
  }

  receiveBatchReviewConfirmBtn.disabled = false;
  receiveBatchReviewConfirmBtn.textContent = "Confirm Import";
  bootstrap.Modal.getInstance(receiveBatchReviewModalEl).hide();

  receiveBatchUploadStatus.textContent = "";
  if (imported > 0) {
    await logAuditEvent({ action: "Stock Received (Batch Upload)", details: `${imported} line${imported === 1 ? "" : "s"} imported from file: ${receiptSummary(plan)}` });
  }
  receiveBatchFileInput.value = "";
  await loadInventory();

  const lineCount = (n) => `${n} line${n === 1 ? "" : "s"}`;
  const topUpNote = plan.topUps.length ? `\n${lineCount(plan.topUps.length)} added to batches already in stock.` : "";
  await showTaskResult(
    failed
      ? {
          type: imported ? "warning" : "danger",
          title: imported ? "Stock received with problems" : "Stock not received",
          message: `${lineCount(imported)} received. ${lineCount(failed)} didn't save (check the connection) - check Inventory, then upload only the missing rows again.`,
          actions: [{ key: "done", label: "Close", primary: true }],
        }
      : {
          type: "success",
          title: "Stock received",
          message: `${lineCount(imported)} added to inventory.${topUpNote}`,
          list: receiptLineNames(plan),
        }
  );
});

// SheetJS reads both real Excel workbooks and plain CSV through the same
// API. cellDates converts an actual Excel date cell into a JS Date
// instead of a serial number, which gets normalized to YYYY-MM-DD below
// for the review table's <input type="date"> fields.
receiveBatchFileInput.addEventListener("change", async () => {
  const file = receiveBatchFileInput.files[0];
  if (!file) return;

  receiveBatchUploadStatus.textContent = "Reading file...";

  let rows;
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array", cellDates: true });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    rows = sheetRows.map((sheetRow) => {
      const row = {};
      Object.entries(sheetRow).forEach(([key, value]) => {
        const k = key.trim().toLowerCase();
        row[k] = value instanceof Date ? sheetDateToISO(value) : String(value).trim();
      });
      return row;
    });
  } catch (error) {
    receiveBatchUploadStatus.textContent = "Couldn't read that file - make sure it's a valid .xlsx, .xls, or .csv file.";
    return;
  }

  if (rows.length === 0) {
    receiveBatchUploadStatus.textContent = "That file doesn't have any stock rows.";
    return;
  }

  receiveBatchUploadStatus.textContent = "";
  openReceiveBatchReviewModal(rows);
});

/* ---------- Quick Add Supplier / Product (launched from within Receive Stock) ---------- */
quickAddSupplierModalEl.addEventListener("hidden.bs.modal", () => {
  bootstrap.Modal.getOrCreateInstance(receiveStockModalEl).show();
});
quickAddProductModalEl.addEventListener("hidden.bs.modal", () => {
  bootstrap.Modal.getOrCreateInstance(receiveStockModalEl).show();
});

function populateQuickProductCategorySelect() {
  quickProductCategorySelect.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(([id, name]) => `<option value="${id}">${escapeHtml(name)}</option>`)
    .join("");
}

function refreshSupplierSelects() {
  const options = [{ value: "", label: "Choose a supplier" }].concat(
    allSuppliers.map((s) => ({ value: s.id, label: s.name }))
  );
  [receiveSupplierSelect, poSupplierSelect].forEach((sel) => {
    if (sel._choices) sel._choices.setChoices(options, "value", "label", true);
  });
}

function refreshProductSelects(newProductId) {
  const options = SAMPLE_PRODUCTS.map((p) => ({ value: p.id, label: p.name }));
  document.querySelectorAll(".receive-product-select, .writeoff-product-select, .po-product-select").forEach((sel) => {
    if (!sel._choices) return;
    const previousValue = sel.value;
    sel._choices.setChoices(options, "value", "label", true);
    if (sel === quickAddProductTargetSelect && newProductId) {
      sel._choices.setChoiceByValue(newProductId);
    } else if (previousValue) {
      sel._choices.setChoiceByValue(previousValue);
    }
  });
}

receiveNewSupplierBtn.addEventListener("click", () => {
  quickSupplierNameInput.value = "";
  quickSupplierContactInput.value = "";
  quickSupplierPhoneInput.value = "";
  quickAddSupplierAlert.classList.add("d-none");
  bootstrap.Modal.getInstance(receiveStockModalEl).hide();
  receiveStockModalEl.addEventListener("hidden.bs.modal", function handler() {
    receiveStockModalEl.removeEventListener("hidden.bs.modal", handler);
    bootstrap.Modal.getOrCreateInstance(quickAddSupplierModalEl).show();
  });
});

function openQuickAddProductModal(targetSelect) {
  quickAddProductTargetSelect = targetSelect;
  quickProductNameInput.value = "";
  quickProductPriceInput.value = "";
  const pricesAllowed = currentAdminRole === "admin" || currentAdminRole === "branch_manager";
  quickProductPriceInput.disabled = !pricesAllowed;
  quickProductPriceInput.placeholder = pricesAllowed ? "0.00" : "Set by the Branch Manager";
  quickAddProductAlert.classList.add("d-none");
  populateQuickProductCategorySelect();
  bootstrap.Modal.getInstance(receiveStockModalEl).hide();
  receiveStockModalEl.addEventListener("hidden.bs.modal", function handler() {
    receiveStockModalEl.removeEventListener("hidden.bs.modal", handler);
    bootstrap.Modal.getOrCreateInstance(quickAddProductModalEl).show();
  });
}

quickAddSupplierCancelBtn.addEventListener("click", () => {
  bootstrap.Modal.getInstance(quickAddSupplierModalEl).hide();
});

quickAddProductCancelBtn.addEventListener("click", () => {
  bootstrap.Modal.getInstance(quickAddProductModalEl).hide();
});

quickAddSupplierSaveBtn.addEventListener("click", async () => {
  const name = quickSupplierNameInput.value.trim();
  if (!name) {
    quickAddSupplierAlert.textContent = "Company name is required.";
    quickAddSupplierAlert.classList.remove("d-none");
    return;
  }

  quickAddSupplierSaveBtn.disabled = true;
  quickAddSupplierAlert.classList.add("d-none");

  try {
    const supplierData = {
      name,
      contactPerson: quickSupplierContactInput.value.trim(),
      phone: quickSupplierPhoneInput.value.trim(),
      email: "",
      address: "",
      productIds: [],
      status: "active",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("suppliers").add(supplierData);
    allSuppliers.push({ id: docRef.id, ...supplierData });

    refreshSupplierSelects();
    if (receiveSupplierSelect._choices) receiveSupplierSelect._choices.setChoiceByValue(docRef.id);

    bootstrap.Modal.getInstance(quickAddSupplierModalEl).hide();
  } catch (error) {
    quickAddSupplierAlert.textContent = "Something went wrong adding this supplier. Please try again.";
    quickAddSupplierAlert.classList.remove("d-none");
  } finally {
    quickAddSupplierSaveBtn.disabled = false;
  }
});

quickAddProductSaveBtn.addEventListener("click", async () => {
  const name = quickProductNameInput.value.trim();
  const category = quickProductCategorySelect.value;
  // Only a Branch Manager sets prices (REQ071); anyone else's quick-add
  // product is saved Inactive with prices pending.
  const pricesAllowed = currentAdminRole === "admin" || currentAdminRole === "branch_manager";
  const retailPrice = pricesAllowed ? parseFloat(quickProductPriceInput.value) : 0;

  if (!name || !category || isNaN(retailPrice)) {
    quickAddProductAlert.textContent = "Product name, category, and retail price are required.";
    quickAddProductAlert.classList.remove("d-none");
    return;
  }

  quickAddProductSaveBtn.disabled = true;
  quickAddProductAlert.classList.add("d-none");

  try {
    const sku = await generateProductSku();
    const docRef = await db.collection("products").add({
      name,
      genericName: "",
      brand: "",
      category,
      costingPrice: 0,
      retailPrice,
      wholesalePrice: 0,
      reorderPoint: DEFAULT_REORDER_POINT,
      description: "",
      imageUrl: null,
      availableInPOS: true,
      availableInOnlineStore: true,
      rxRequired: false,
      status: pricesAllowed ? "active" : "inactive",
      pricePending: !pricesAllowed,
      sku,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    catalogLoadPromise = null; // force a fresh read so the new product shows up everywhere
    await loadCatalogCache();
    refreshProductSelects(docRef.id);

    bootstrap.Modal.getInstance(quickAddProductModalEl).hide();
  } catch (error) {
    quickAddProductAlert.textContent = "Something went wrong adding this product. Please try again.";
    quickAddProductAlert.classList.remove("d-none");
  } finally {
    quickAddProductSaveBtn.disabled = false;
  }
});

/* ---------- Write Off Stock ---------- */
function populateBatchSelectForProduct(batchSelectEl, productId) {
  const batches = allBatches.filter((b) => b.productId === productId && b.quantity > 0);
  const choicesData = batches.length
    ? batches.map((b) => ({
        value: b.id,
        label: `${b.batchNo} - Exp ${formatExpiryLabel(b.expirationDate)} - Qty ${b.quantity}`,
      }))
    : [{ value: "", label: "No stock available" }];

  if (batchSelectEl._choices) {
    batchSelectEl._choices.setChoices(choicesData, "value", "label", true);
  } else {
    batchSelectEl.innerHTML = choicesData.map((c) => `<option value="${c.value}">${c.label}</option>`).join("");
    batchSelectEl._choices = makeSearchableSelect(batchSelectEl);
  }
}

function addWriteOffItemRow() {
  writeOffItemCount += 1;
  const row = document.createElement("div");
  row.className = "repeater-item";
  row.innerHTML = `
    <p class="repeater-label">Item ${writeOffItemCount}</p>
    <button type="button" class="repeater-remove-btn" aria-label="Remove item"><i class="bi bi-x-lg"></i></button>
    <div class="row g-3">
      <div class="col-md-6">
        <label class="form-label">Product</label>
        <select class="form-select writeoff-product-select"></select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Batch</label>
        <select class="form-select writeoff-batch-select"></select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Qty to Write Off</label>
        <input type="number" min="1" class="form-control writeoff-qty-input">
      </div>
      <div class="col-md-6">
        <label class="form-label">Reason</label>
        <input type="text" class="form-control writeoff-reason-input" placeholder="e.g. Damaged packaging">
      </div>
    </div>
  `;
  receiveOrWriteOffAppend(row);

  const productSelect = row.querySelector(".writeoff-product-select");
  const batchSelect = row.querySelector(".writeoff-batch-select");
  populateProductSelect(productSelect);
  populateBatchSelectForProduct(batchSelect, productSelect.value);
  productSelect.addEventListener("change", () => populateBatchSelectForProduct(batchSelect, productSelect.value));

  updateRemoveButtonsVisibility(writeOffItemsContainer);

  row.querySelector(".repeater-remove-btn").addEventListener("click", () => {
    destroyChoicesIn(row);
    row.remove();
    renumberItems(writeOffItemsContainer);
    updateRemoveButtonsVisibility(writeOffItemsContainer);
  });
}

function receiveOrWriteOffAppend(row) {
  writeOffItemsContainer.appendChild(row);
}

writeOffAddItemBtn.addEventListener("click", addWriteOffItemRow);

writeOffStockBtn.addEventListener("click", () => {
  destroyChoicesIn(writeOffItemsContainer);
  writeOffItemsContainer.innerHTML = "";
  writeOffItemCount = 0;
  addWriteOffItemRow();
  writeOffDateInput.value = todayISO();
  writeOffModalAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(writeOffModalEl).show();
});

saveWriteOffBtn.addEventListener("click", async () => {
  const rows = Array.from(writeOffItemsContainer.querySelectorAll(".repeater-item"));
  const items = rows.map((row) => ({
    batchId: row.querySelector(".writeoff-batch-select").value,
    productId: row.querySelector(".writeoff-product-select").value,
    qty: parseInt(row.querySelector(".writeoff-qty-input").value, 10),
    reason: row.querySelector(".writeoff-reason-input").value.trim(),
  }));

  const invalid = items.some((it) => !it.batchId || !it.qty || it.qty <= 0 || !it.reason);
  if (invalid || items.length === 0) {
    writeOffModalAlert.textContent = "Every item needs a batch, a quantity, and a reason.";
    writeOffModalAlert.classList.remove("d-none");
    return;
  }

  const overQtyItem = items.find((it) => {
    const batch = allBatches.find((b) => b.id === it.batchId);
    return !batch || it.qty > batch.quantity;
  });
  if (overQtyItem) {
    writeOffModalAlert.textContent = "You can't write off more than a batch's current quantity.";
    writeOffModalAlert.classList.remove("d-none");
    return;
  }

  saveWriteOffBtn.disabled = true;
  writeOffModalAlert.classList.add("d-none");

  // Deducting each row against the page's cached allBatches snapshot (as
  // this used to) has two ways to go wrong: another change to the same
  // batch elsewhere (a sale, another write-off) between page load and
  // this click gets silently overwritten instead of compounded, and two
  // rows here writing off the same batch would each validate against
  // that same stale number instead of each other's deduction, letting
  // more be written off in one submission than the batch actually holds.
  // A single transaction that re-reads each distinct batch fresh and
  // validates the combined quantity against it closes both.
  const qtyByBatch = {};
  for (const item of items) {
    qtyByBatch[item.batchId] = (qtyByBatch[item.batchId] || 0) + item.qty;
  }

  try {
    await db.runTransaction(async (transaction) => {
      const batchIds = Object.keys(qtyByBatch);
      const batchDocs = await Promise.all(
        batchIds.map((id) => transaction.get(db.collection("stockBatches").doc(id)))
      );

      batchDocs.forEach((doc, idx) => {
        const batchId = batchIds[idx];
        if (!doc.exists || qtyByBatch[batchId] > doc.data().quantity) {
          throw new Error("You can't write off more than a batch's current quantity.");
        }
      });

      batchDocs.forEach((doc, idx) => {
        const batchId = batchIds[idx];
        transaction.update(doc.ref, {
          quantity: doc.data().quantity - qtyByBatch[batchId],
          lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });

      // The write-off records go in the same transaction, so a retry can't
      // deduct the stock a second time.
      for (const item of items) {
        const batch = allBatches.find((b) => b.id === item.batchId);
        transaction.set(db.collection("writeOffs").doc(), {
          batchId: item.batchId,
          productId: item.productId,
          batchNo: batch ? batch.batchNo : "",
          quantity: item.qty,
          reason: item.reason,
          writeOffDate: writeOffDateInput.value || todayISO(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    for (const item of items) {
      const batch = allBatches.find((b) => b.id === item.batchId);
      const product = getProductById(item.productId);
      await logAuditEvent({
        action: "Inventory Write-Off",
        details: `${product ? product.name : item.productId} - Batch ${batch ? batch.batchNo : item.batchId}, Qty ${item.qty}, Reason: ${item.reason}`,
        record: `${product ? product.name : item.productId} - Batch ${batch ? batch.batchNo : item.batchId}`,
        before: batch ? `${batch.quantity} units` : "",
        after: batch ? `${batch.quantity - item.qty} units` : `-${item.qty} units`,
        reason: item.reason,
      });
    }

    bootstrap.Modal.getInstance(writeOffModalEl).hide();
    await loadInventory();
  } catch (error) {
    writeOffModalAlert.textContent = error.message || "Something went wrong recording this write-off. Please try again.";
    writeOffModalAlert.classList.remove("d-none");
  } finally {
    saveWriteOffBtn.disabled = false;
  }
});

/* ---------- Stock Count (stored in "reconciliations") ---------- */
function findActiveSession() {
  return allReconciliations.find((r) => r.status === "in_progress") || null;
}

function formatPeriodLabel(period) {
  if (!period) return "-";
  const [year, month] = period.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function renderReconciliationTab() {
  const activeSession = findActiveSession();

  reconciliationActiveView.classList.toggle("d-none", !activeSession);
  reconciliationEmptyState.classList.toggle("d-none", !!activeSession);

  if (activeSession) {
    reconciliationRcnNumber.textContent = activeSession.rcnNumber;
    reconciliationMeta.textContent = `Month: ${formatPeriodLabel(activeSession.period)} - Started by: ${activeSession.openedBy}`;
    renderReconciliationItemsBody(activeSession);
  }

  renderPastSessions();
}

function renderReconciliationItemsBody(session) {
  reconciliationItemsBody.innerHTML = session.items
    .map((item, idx) => {
      const product = getProductById(item.productId);
      return `
        <tr data-idx="${idx}">
          <td>${escapeHtml(product ? product.name : "Unknown product")}</td>
          <td>${escapeHtml(item.batchNo)}</td>
          <td>${formatExpiryLabel(item.expirationDate)}</td>
          <td>${item.systemQty}</td>
          <td><input type="number" min="0" class="form-control form-control-sm reconciliation-counted-input" style="max-width:100px;" value="${item.countedQty == null ? "" : item.countedQty}" placeholder="Count"></td>
          <td class="reconciliation-variance-cell">-</td>
        </tr>
      `;
    })
    .join("");

  reconciliationItemsBody.querySelectorAll(".reconciliation-counted-input").forEach((input) => {
    input.addEventListener("input", () => {
      const row = input.closest("tr");
      const systemQty = session.items[Number(row.dataset.idx)].systemQty;
      const counted = parseInt(input.value, 10);
      const cell = row.querySelector(".reconciliation-variance-cell");
      if (isNaN(counted)) {
        cell.textContent = "-";
        return;
      }
      const diff = counted - systemQty;
      cell.textContent = diff === 0 ? "0" : diff > 0 ? `+${diff}` : `${diff}`;
    });
  });
}

// Differences on a finished count (stored on finalize; worked out for older
// or saved-but-unfinished counts).
function stockCountLines(session) {
  return (session.items || []).map((item) => {
    const counted = item.countedQty == null ? null : Number(item.countedQty);
    const diff = item.variance != null ? Number(item.variance) : counted == null ? null : counted - (item.systemQty || 0);
    return { ...item, countedQty: counted, diff };
  });
}

function stockCountSummary(session) {
  const lines = stockCountLines(session);
  const diffs = lines.filter((l) => l.diff);
  return {
    lines,
    batches: lines.length,
    differences: diffs.length,
    short: diffs.filter((l) => l.diff < 0).reduce((n, l) => n + l.diff, 0),
    over: diffs.filter((l) => l.diff > 0).reduce((n, l) => n + l.diff, 0),
  };
}

function renderPastSessions() {
  const pastSessions = allReconciliations
    .filter((r) => r.status === "finalized")
    .slice()
    .sort((a, b) => {
      const aTime = a.finalizedAt ? a.finalizedAt.toMillis() : 0;
      const bTime = b.finalizedAt ? b.finalizedAt.toMillis() : 0;
      return bTime - aTime;
    });

  pastSessionsEmpty.classList.toggle("d-none", pastSessions.length > 0);
  pastSessionsList.innerHTML = pastSessions
    .map((session) => {
      const sum = stockCountSummary(session);
      return `
        <button type="button" class="checkout-card p-3 d-flex justify-content-between align-items-center flex-wrap gap-2 text-start w-100 stock-count-card" data-session-id="${escapeHtml(session.id)}">
          <div>
            <p class="fw-bold mb-0">${escapeHtml(session.rcnNumber || "")} <span class="fw-normal text-muted">- ${escapeHtml(formatPeriodLabel(session.period))}</span></p>
            <p class="text-muted mb-0" style="font-size:0.85rem;">
              ${sum.batches} batch${sum.batches === 1 ? "" : "es"} counted - ${sum.differences ? `<span class="text-danger">${sum.differences} difference${sum.differences === 1 ? "" : "s"}</span>` : "all matched"}
              - finalized ${escapeHtml(formatDateMDY(session.finalizedAt))} by ${escapeHtml(session.finalizedBy || "-")}
            </p>
          </div>
          <span class="d-flex align-items-center gap-2">
            <span class="badge rounded-pill text-bg-success">Finalized</span>
            <span class="btn btn-outline-dark-amson btn-sm">View</span>
          </span>
        </button>
      `;
    })
    .join("");
}

/* ---------- View a past stock count ---------- */
const stockCountViewModalEl = document.getElementById("stockCountViewModal");
let viewedStockCount = null;
let scViewFilter = "all";

pastSessionsList.addEventListener("click", (e) => {
  const card = e.target.closest("[data-session-id]");
  if (!card) return;
  const session = allReconciliations.find((r) => r.id === card.dataset.sessionId);
  if (session) openStockCountView(session);
});

function openStockCountView(session) {
  viewedStockCount = session;
  scViewFilter = "all";
  document.getElementById("scViewSearch").value = "";
  const sum = stockCountSummary(session);
  document.getElementById("scViewNumber").textContent = session.rcnNumber || "Stock count";
  const status = document.getElementById("scViewStatus");
  status.textContent = session.status === "finalized" ? "Finalized" : "In Progress";
  status.className = `badge rounded-pill ${session.status === "finalized" ? "text-bg-success" : "text-bg-warning"}`;
  document.getElementById("scViewMeta").textContent =
    `Month: ${formatPeriodLabel(session.period)} - Started by ${session.openedBy || "-"}${session.openedAt ? ` on ${formatDateMDY(session.openedAt, true)}` : ""}` +
    (session.finalizedAt ? ` - Finalized by ${session.finalizedBy || "-"} on ${formatDateMDY(session.finalizedAt, true)}` : "");
  const tile = (label, value, cls = "") => `
    <div class="col-6 col-md-3"><div class="checkout-card p-3 h-100">
      <p class="text-muted mb-1" style="font-size:0.78rem;">${label}</p>
      <p class="fw-bold mb-0 ${cls}" style="font-size:1.25rem;">${value}</p>
    </div></div>`;
  document.getElementById("scViewTiles").innerHTML =
    tile("Batches counted", sum.batches) +
    tile("Matched the system", sum.batches - sum.differences, "text-success") +
    tile("Differences", sum.differences, sum.differences ? "text-danger" : "") +
    tile("Units short / over", `${sum.short} / +${sum.over}`, sum.short || sum.over ? "text-danger" : "");
  const reason = document.getElementById("scViewReason");
  reason.innerHTML = session.varianceReason ? `<strong>Reason given for the differences:</strong> ${escapeHtml(session.varianceReason)}` : "";
  reason.classList.toggle("d-none", !session.varianceReason);
  renderStockCountView();
  bootstrap.Modal.getOrCreateInstance(stockCountViewModalEl).show();
}

function stockCountViewRows() {
  const q = document.getElementById("scViewSearch").value.trim().toLowerCase();
  return stockCountLines(viewedStockCount)
    .map((l) => ({ ...l, productName: (getProductById(l.productId) || {}).name || "Unknown product" }))
    .filter((l) => scViewFilter === "all" || l.diff)
    .filter((l) => !q || `${l.productName} ${l.batchNo || ""}`.toLowerCase().includes(q))
    .sort((a, b) => Math.abs(b.diff || 0) - Math.abs(a.diff || 0) || a.productName.localeCompare(b.productName));
}

function renderStockCountView() {
  const lines = stockCountLines(viewedStockCount);
  document.getElementById("scViewCountAll").textContent = lines.length;
  document.getElementById("scViewCountDiff").textContent = lines.filter((l) => l.diff).length;
  document.querySelectorAll("#scViewFilters [data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === scViewFilter));
  const rows = stockCountViewRows();
  document.getElementById("scViewBody").innerHTML = rows
    .map((l) => `
      <tr class="${l.diff ? "table-warning" : ""}">
        <td>${escapeHtml(l.productName)}</td>
        <td>${escapeHtml(l.batchNo || "-")}</td>
        <td>${l.expirationDate ? escapeHtml(formatDateMDY(`${l.expirationDate}T12:00:00`)) : "-"}</td>
        <td class="text-end">${l.systemQty ?? "-"}</td>
        <td class="text-end">${l.countedQty == null ? "-" : l.countedQty}</td>
        <td class="text-end fw-bold ${l.diff < 0 ? "text-danger" : l.diff > 0 ? "text-success" : "text-muted"}">${l.diff == null ? "-" : l.diff > 0 ? `+${l.diff}` : l.diff}</td>
      </tr>`)
    .join("");
  document.getElementById("scViewEmpty").classList.toggle("d-none", rows.length > 0);
}

document.querySelectorAll("#scViewFilters [data-filter]").forEach((btn) =>
  btn.addEventListener("click", () => {
    scViewFilter = btn.dataset.filter;
    renderStockCountView();
  })
);
document.getElementById("scViewSearch").addEventListener("input", renderStockCountView);

document.getElementById("scViewExportBtn").addEventListener("click", () => {
  if (!viewedStockCount) return;
  exportTable({
    title: `Stock Count ${viewedStockCount.rcnNumber || ""}`.trim(),
    subtitle: `${formatPeriodLabel(viewedStockCount.period)}${viewedStockCount.finalizedBy ? ` - finalized by ${viewedStockCount.finalizedBy}` : ""}${scViewFilter === "diff" ? " - differences only" : ""}`,
    filenamePrefix: `amson-stock-count-${viewedStockCount.rcnNumber || viewedStockCount.period}`,
    rows: stockCountViewRows(),
    columns: [
      { label: "Product", value: (l) => l.productName, width: 3 },
      { label: "Batch #", value: (l) => l.batchNo || "" },
      { label: "Expiry", value: (l) => (l.expirationDate ? formatDateMDY(`${l.expirationDate}T12:00:00`) : "") },
      { label: "In System", value: (l) => l.systemQty ?? "", width: 0.8 },
      { label: "Counted", value: (l) => (l.countedQty == null ? "" : l.countedQty), width: 0.8 },
      { label: "Difference", value: (l) => (l.diff == null ? "" : l.diff > 0 ? `+${l.diff}` : l.diff), width: 0.8 },
    ],
  });
});

openReconciliationSessionBtn.addEventListener("click", () => {
  const now = new Date();
  reconciliationPeriodInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  openReconciliationAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(openReconciliationModalEl).show();
});

confirmOpenSessionBtn.addEventListener("click", async () => {
  const period = reconciliationPeriodInput.value;
  if (!period) {
    openReconciliationAlert.textContent = "Please choose the month.";
    openReconciliationAlert.classList.remove("d-none");
    return;
  }
  if (findActiveSession()) {
    openReconciliationAlert.textContent = "A stock count is already in progress - finish it first.";
    openReconciliationAlert.classList.remove("d-none");
    return;
  }

  confirmOpenSessionBtn.disabled = true;
  openReconciliationAlert.classList.add("d-none");

  try {
    const rcnNumber = await generateRcnNumber();
    const activeBatches = allBatches.filter((b) => b.status === "active" || b.status === "wholesale_only");
    const items = activeBatches.map((b) => ({
      batchId: b.id,
      productId: b.productId,
      batchNo: b.batchNo,
      expirationDate: b.expirationDate,
      systemQty: b.quantity,
      countedQty: null, // filled in by the count
    }));

    await db.collection("reconciliations").add({
      rcnNumber,
      period,
      status: "in_progress",
      items,
      openedBy: currentAdminName,
      openedAt: firebase.firestore.FieldValue.serverTimestamp(),
      finalizedBy: null,
      finalizedAt: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    bootstrap.Modal.getInstance(openReconciliationModalEl).hide();
    await loadInventory();
  } catch (error) {
    openReconciliationAlert.textContent = "Something went wrong starting the stock count. Please try again.";
    openReconciliationAlert.classList.remove("d-none");
  } finally {
    confirmOpenSessionBtn.disabled = false;
  }
});

submitCountBtn.addEventListener("click", async () => {
  const activeSession = findActiveSession();
  if (!activeSession) return;
  const rows = Array.from(reconciliationItemsBody.querySelectorAll("tr"));
  // A batch left blank would otherwise be saved as 0 on hand.
  const blank = rows.filter((row) => row.querySelector(".reconciliation-counted-input").value.trim() === "").length;
  if (blank > 0) {
    await showAppAlert(`Enter a count for every batch (${blank} left blank). Type 0 if none are on hand.`, { title: "Count Incomplete" });
    return;
  }
  const updatedItems = rows.map((row) => {
    const idx = Number(row.dataset.idx);
    const item = activeSession.items[idx];
    const countedQty = parseInt(row.querySelector(".reconciliation-counted-input").value, 10) || 0;
    return { ...item, countedQty, variance: countedQty - item.systemQty };
  });

  // Only the Branch Manager finalizes (REQ061). Anyone else's count is saved
  // on the session for the Branch Manager to review and submit.
  const canFinalize = currentAdminRole === "admin" || currentAdminRole === "branch_manager";
  if (!canFinalize) {
    try {
      await db.collection("reconciliations").doc(activeSession.id).update({
        items: updatedItems,
        countSavedBy: currentAdminName,
        countSavedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      activeSession.items = updatedItems;
      await showAppAlert("Count saved. Only the Branch Manager can finalize it and update the stock.", { title: "Count Saved" });
    } catch (error) {
      reconciliationAlert.textContent = "Something went wrong saving the count. Please try again.";
      reconciliationAlert.classList.remove("d-none");
    }
    return;
  }

  const variances = updatedItems.filter((i) => i.variance !== 0);
  let varianceReason = "";
  if (variances.length > 0) {
    const reason = await showAppPrompt(
      `${variances.length} batch${variances.length === 1 ? " doesn't" : "es don't"} match the system. Stock will be changed to the counted quantities. What's the reason for the difference?`,
      { title: "Finalize Count", confirmLabel: "Finalize", defaultValue: "" }
    );
    if (reason === null) return;
    varianceReason = reason.trim();
    if (!varianceReason) {
      await showAppAlert("A reason is required when the count differs from the system. Nothing was changed.");
      return;
    }
  } else if (!(await showAppConfirm("Submit this count? It matches the system, so no stock changes. This finalizes the stock count.", { confirmLabel: "Submit" }))) {
    return;
  }

  submitCountBtn.disabled = true;
  reconciliationAlert.classList.add("d-none");

  try {
    // Apply each batch's variance to its current quantity in one
    // transaction, so a sale made while counting isn't wiped out (with no
    // sales in between, this is exactly the counted quantity).
    const changed = updatedItems.filter((i) => i.variance !== 0);
    await db.runTransaction(async (transaction) => {
      const refs = changed.map((i) => db.collection("stockBatches").doc(i.batchId));
      const docs = [];
      for (const ref of refs) docs.push(await transaction.get(ref));
      docs.forEach((doc, idx) => {
        if (!doc.exists) return;
        transaction.update(refs[idx], {
          quantity: Math.max(0, (doc.data().quantity || 0) + changed[idx].variance),
          lastAdjustedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
    });

    await db.collection("reconciliations").doc(activeSession.id).update({
      items: updatedItems,
      status: "finalized",
      varianceReason: varianceReason || null,
      finalizedBy: currentAdminName,
      finalizedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    const adjustedCount = updatedItems.filter((i) => i.variance !== 0).length;
    await logAuditEvent({
      action: "Stock Count Finalized",
      details:
        `${activeSession.rcnNumber} (${formatPeriodLabel(activeSession.period)}) - ${adjustedCount} batch${adjustedCount === 1 ? "" : "es"} adjusted` +
        (variances.length
          ? `: ${variances
              .map((i) => `${(getProductById(i.productId) || {}).name || "Unknown"} batch ${i.batchNo} ${i.systemQty} -> ${i.countedQty}`)
              .join("; ")}. Reason: ${varianceReason}`
          : ""),
      record: `${activeSession.rcnNumber} (${formatPeriodLabel(activeSession.period)})`,
      before: variances.map((i) => `${(getProductById(i.productId) || {}).name || "Unknown"} ${i.batchNo}: ${i.systemQty}`).join("; "),
      after: variances.map((i) => `${(getProductById(i.productId) || {}).name || "Unknown"} ${i.batchNo}: ${i.countedQty}`).join("; "),
      reason: varianceReason || "",
    });

    await loadInventory();
  } catch (error) {
    reconciliationAlert.textContent = "Something went wrong submitting the count. Please try again.";
    reconciliationAlert.classList.remove("d-none");
  } finally {
    submitCountBtn.disabled = false;
  }
});

/* ---------- Export Report ---------- */
exportInventoryBtn.addEventListener("click", () => {
  const supplierName = (id) => ((allSuppliers.find((s) => s.id === id) || {}).name || "");
  exportTable({
    title: "Inventory",
    subtitle: inventoryFilter === "all" ? "All batches" : `Filter: ${BATCH_STATUS_LABELS[inventoryFilter] || inventoryFilter}`,
    filenamePrefix: "amson-inventory",
    rows: filteredBatches(),
    columns: [
      { label: "Product", value: (b) => (getProductById(b.productId) || {}).name || "Unknown product", width: 3 },
      { label: "Category", value: (b) => CATEGORY_LABELS[(getProductById(b.productId) || {}).category] || "", width: 1.5 },
      { label: "Batch No.", value: (b) => b.batchNo, width: 1.3 },
      { label: "Expiry", value: (b) => formatDateMDY(b.expirationDate) },
      { label: "Available Inventory", value: (b) => b.quantity, width: 0.9 },
      { label: "Reorder Pt.", value: (b) => (getProductById(b.productId) || {}).reorderPoint || DEFAULT_REORDER_POINT, width: 0.8 },
      { label: "Status", value: (b) => b.computedStatuses.map((s) => BATCH_STATUS_LABELS[s]).join(", ") + (b.status === "wholesale_only" ? ", Wholesale Only" : ""), width: 1.6 },
      { label: "Supplier", value: (b) => supplierName(b.supplierId), width: 1.5 },
      { label: "Receipt/DR No.", value: (b) => b.supplierReceiptNo || "", width: 1.2 },
      { label: "Unit Cost", value: (b) => (typeof b.unitCost === "number" ? b.unitCost.toFixed(2) : ""), width: 0.8 },
      { label: "Date Received", value: (b) => formatDateMDY(b.dateReceived) },
    ],
  });
});

/* ================= Purchase Orders ================= */

function filteredPos() {
  let filtered = allPurchaseOrders.slice();

  if (poFilter !== "all") {
    filtered = filtered.filter((po) => po.status === poFilter);
  }

  if (poSearchTerm) {
    const term = poSearchTerm.toLowerCase();
    filtered = filtered.filter((po) => {
      const supplier = allSuppliers.find((s) => s.id === po.supplierId);
      return (
        (po.poNumber || "").toLowerCase().includes(term) ||
        (supplier && supplier.name.toLowerCase().includes(term))
      );
    });
  }

  filtered.sort((a, b) => {
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });

  return filtered;
}

function renderPoTable() {
  const filtered = filteredPos();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PO_PAGE_SIZE));
  poCurrentPage = Math.min(poCurrentPage, totalPages);

  const start = (poCurrentPage - 1) * PO_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PO_PAGE_SIZE);

  if (pageItems.length === 0) {
    poTableBody.innerHTML = "";
    poTableEmpty.classList.remove("d-none");
  } else {
    poTableEmpty.classList.add("d-none");
    poTableBody.innerHTML = pageItems.map(renderPoRow).join("");
    poTableBody.querySelectorAll(".view-po-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const po = allPurchaseOrders.find((p) => p.id === btn.dataset.id);
        if (po) openViewPoModal(po);
      });
    });
  }

  renderPoPagination(totalPages);
}

function renderPoRow(po) {
  const supplier = allSuppliers.find((s) => s.id === po.supplierId);
  return `
    <tr>
      <td class="fw-medium">${escapeHtml(po.poNumber)}</td>
      <td>${escapeHtml(supplier ? supplier.name : "-")}</td>
      <td>${formatExpiryLabel(po.expectedDeliveryDate)}</td>
      <td>${po.items.length} item${po.items.length === 1 ? "" : "s"}</td>
      <td><span class="badge rounded-pill ${PO_STATUS_BADGE_CLASS[po.status]}">${PO_STATUS_LABELS[po.status]}</span></td>
      <td><button type="button" class="icon-btn view-po-btn" data-id="${po.id}" aria-label="View"><i class="bi bi-eye"></i></button></td>
    </tr>
  `;
}

function renderPoPagination(totalPages) {
  if (totalPages <= 1) {
    poPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${poCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === poCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${poCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  poPagination.innerHTML = html;
}

poPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") poCurrentPage -= 1;
  else if (btn.dataset.page === "next") poCurrentPage += 1;
  else poCurrentPage = Number(btn.dataset.page);
  renderPoTable();
});

poFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    poFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    poFilter = btn.dataset.poFilter;
    poCurrentPage = 1;
    renderPoTable();
  });
});

poSearchInput.addEventListener("input", () => {
  poSearchTerm = poSearchInput.value.trim();
  poCurrentPage = 1;
  renderPoTable();
});

/* ---------- Create Purchase Order ---------- */
function addPoItemRow() {
  poItemCount += 1;
  const row = document.createElement("div");
  row.className = "repeater-item";
  row.innerHTML = `
    <p class="repeater-label">Item ${poItemCount}</p>
    <button type="button" class="repeater-remove-btn" aria-label="Remove item"><i class="bi bi-x-lg"></i></button>
    <div class="row g-3">
      <div class="col-md-8">
        <label class="form-label">Product</label>
        <select class="form-select po-product-select"></select>
      </div>
      <div class="col-md-4">
        <label class="form-label">Expected Qty</label>
        <input type="number" min="1" class="form-control po-qty-input">
      </div>
    </div>
  `;
  poItemsContainer.appendChild(row);
  populateProductSelect(row.querySelector(".po-product-select"));
  updateRemoveButtonsVisibility(poItemsContainer);

  row.querySelector(".repeater-remove-btn").addEventListener("click", () => {
    destroyChoicesIn(row);
    row.remove();
    renumberItems(poItemsContainer);
    updateRemoveButtonsVisibility(poItemsContainer);
  });
}

poAddItemBtn.addEventListener("click", addPoItemRow);

/* ---------- Create Purchase Order: batch upload (Excel .xlsx/.xls or .csv) ----------
   The file fills the form's item rows (and the supplier / expected date when
   the file has them), so everything is checked in the form before saving. */
const PO_BATCH_TEMPLATE_HEADERS = ["sku", "expectedQty", "supplierName", "expectedDeliveryDate"];
const poUploadBatchBtn = document.getElementById("poUploadBatchBtn");
const poDownloadTemplateBtn = document.getElementById("poDownloadTemplateBtn");
const poBatchFileInput = document.getElementById("poBatchFileInput");

poUploadBatchBtn.addEventListener("click", () => poBatchFileInput.click());

poDownloadTemplateBtn.addEventListener("click", () => {
  const exampleRow = { sku: "SKU-0001", expectedQty: 100, supplierName: "Unilab", expectedDeliveryDate: todayISO() };
  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: PO_BATCH_TEMPLATE_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
  XLSX.writeFile(wb, "amson-purchase-order-template.xlsx");
});

poBatchFileInput.addEventListener("change", async () => {
  const file = poBatchFileInput.files[0];
  if (!file) return;
  poBatchFileInput.value = "";

  let rows;
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }).map((sheetRow) => {
      const row = {};
      Object.entries(sheetRow).forEach(([key, value]) => {
        row[key.trim().toLowerCase()] = value instanceof Date ? sheetDateToISO(value) : String(value).trim();
      });
      return row;
    });
  } catch (error) {
    createPoAlert.textContent = "Couldn't read that file - make sure it's a valid .xlsx, .xls, or .csv file.";
    createPoAlert.classList.remove("d-none");
    return;
  }

  rows = rows.filter((row) => row.sku || row.expectedqty);
  const unknown = [];
  const items = [];
  rows.forEach((row, i) => {
    const product = SAMPLE_PRODUCTS.find((p) => (p.sku || "").toLowerCase() === String(row.sku).toLowerCase());
    if (!product) unknown.push(`Row ${i + 2}: ${row.sku || "(no SKU)"}`);
    else items.push({ productId: product.id, qty: parseInt(row.expectedqty, 10) || "" });
  });

  if (!items.length) {
    createPoAlert.textContent = rows.length
      ? `None of the SKUs in that file match a product. ${unknown.slice(0, 10).join("; ")}`
      : "That file has no rows. Download the template (the ? button) for the columns to use.";
    createPoAlert.classList.remove("d-none");
    return;
  }

  // Replace the item rows with the file's rows.
  destroyChoicesIn(poItemsContainer);
  poItemsContainer.innerHTML = "";
  poItemCount = 0;
  items.forEach((item) => {
    addPoItemRow();
    const row = poItemsContainer.lastElementChild;
    const select = row.querySelector(".po-product-select");
    if (select._choices) select._choices.setChoiceByValue(item.productId);
    else select.value = item.productId;
    row.querySelector(".po-qty-input").value = item.qty;
  });

  const first = rows[0];
  const supplier = first.suppliername && allSuppliers.find((s) => s.name.toLowerCase() === first.suppliername.toLowerCase());
  if (supplier) {
    if (poSupplierSelect._choices) poSupplierSelect._choices.setChoiceByValue(supplier.id);
    else poSupplierSelect.value = supplier.id;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(first.expecteddeliverydate || "")) poExpectedDateInput.value = first.expecteddeliverydate;

  const notes = [];
  if (unknown.length) notes.push(`${unknown.length} row${unknown.length === 1 ? "" : "s"} skipped - SKU not found: ${unknown.slice(0, 10).join("; ")}${unknown.length > 10 ? "; ..." : ""}`);
  if (first.suppliername && !supplier) notes.push(`Supplier "${first.suppliername}" isn't saved yet - pick the supplier above.`);
  if (notes.length) {
    createPoAlert.textContent = notes.join(" ");
    createPoAlert.classList.remove("d-none");
  } else {
    createPoAlert.classList.add("d-none");
  }
});

createPoBtn.addEventListener("click", () => {
  destroyChoicesIn(poItemsContainer);
  if (poSupplierSelect._choices) {
    poSupplierSelect._choices.destroy();
    poSupplierSelect._choices = null;
  }
  poItemsContainer.innerHTML = "";
  poItemCount = 0;
  addPoItemRow();
  poExpectedDateInput.value = "";
  createPoAlert.classList.add("d-none");
  populateSupplierSelect(poSupplierSelect);
  bootstrap.Modal.getOrCreateInstance(createPoModalEl).show();
});

savePoBtn.addEventListener("click", async () => {
  const supplierId = poSupplierSelect.value;
  const expectedDeliveryDate = poExpectedDateInput.value;
  const rows = Array.from(poItemsContainer.querySelectorAll(".repeater-item"));

  const items = rows.map((row) => ({
    productId: row.querySelector(".po-product-select").value,
    expectedQty: parseInt(row.querySelector(".po-qty-input").value, 10),
  }));

  const invalid =
    !supplierId ||
    !expectedDeliveryDate ||
    items.length === 0 ||
    items.some((it) => !it.productId || !it.expectedQty || it.expectedQty <= 0);

  if (invalid) {
    createPoAlert.textContent = "Pick a supplier, an expected delivery date, and a quantity for every item.";
    createPoAlert.classList.remove("d-none");
    return;
  }

  savePoBtn.disabled = true;
  createPoAlert.classList.add("d-none");

  try {
    const poNumber = await generatePoNumber();
    await db.collection("purchaseOrders").add({
      poNumber,
      supplierId,
      expectedDeliveryDate,
      items,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    bootstrap.Modal.getInstance(createPoModalEl).hide();
    await loadInventory();
    const supplier = allSuppliers.find((sup) => sup.id === supplierId);
    await showTaskResult({
      type: "success",
      title: "Purchase order created",
      message: `${poNumber}${supplier ? ` for ${supplier.name}` : ""}, ${items.length} item${items.length === 1 ? "" : "s"}, expected ${formatDateMDY(`${expectedDeliveryDate}T12:00:00`)}.`,
      list: items.map((it) => `${(getProductById(it.productId) || {}).name || it.productId} x${it.expectedQty}`),
    });
  } catch (error) {
    createPoAlert.textContent = "Something went wrong creating this purchase order. Please try again.";
    createPoAlert.classList.remove("d-none");
  } finally {
    savePoBtn.disabled = false;
  }
});

/* ---------- View / Receive Purchase Order ---------- */
function openViewPoModal(po) {
  const supplier = allSuppliers.find((s) => s.id === po.supplierId);

  document.getElementById("viewPoTitle").textContent = po.poNumber;
  document.getElementById("viewPoSubtitle").textContent = `${supplier ? supplier.name : "Unknown supplier"} - Expected ${formatExpiryLabel(po.expectedDeliveryDate)}`;

  const badge = document.getElementById("viewPoStatusBadge");
  badge.textContent = PO_STATUS_LABELS[po.status];
  badge.className = `badge rounded-pill ${PO_STATUS_BADGE_CLASS[po.status]}`;

  document.getElementById("viewPoAlert").classList.add("d-none");
  document.getElementById("viewPoSuccess").classList.add("d-none");

  if (po.status === "pending") {
    renderPoReceivingForm(po);
  } else if (po.status === "discrepancy") {
    renderPoDiscrepancyReport(po);
  } else {
    renderPoReadOnlySummary(po);
  }

  bootstrap.Modal.getOrCreateInstance(viewPoModalEl).show();
}

function renderPoReceivingForm(po) {
  const content = document.getElementById("viewPoContent");
  content.innerHTML = `
    <p class="text-muted mb-3">Enter what was actually received for each item.</p>
    <div class="mb-3" style="max-width:320px;">
      <label class="form-label" for="poReceiptNoInput">Supplier Receipt / DR No.</label>
      <input type="text" class="form-control form-control-sm" id="poReceiptNoInput">
    </div>
    <table class="table admin-orders-table align-middle mb-0">
      <thead>
        <tr><th>Product</th><th>Expected Qty</th><th>Received Qty</th><th>Batch No.</th><th>Expiry Date</th><th>Unit Cost</th></tr>
      </thead>
      <tbody>
        ${po.items
          .map((item, idx) => {
            const product = getProductById(item.productId);
            return `
              <tr data-index="${idx}">
                <td>${escapeHtml(product ? product.name : "Unknown product")}</td>
                <td>${item.expectedQty}</td>
                <td><input type="number" min="0" class="form-control form-control-sm po-received-qty-input" style="max-width:100px;" value="${item.expectedQty}"></td>
                <td><input type="text" class="form-control form-control-sm po-received-batchno-input" placeholder="e.g. BIO-500-100"></td>
                <td><input type="date" class="form-control form-control-sm po-received-expiry-input"></td>
                <td><input type="number" min="0" step="0.01" class="form-control form-control-sm po-received-unitcost-input" style="max-width:110px;"></td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("viewPoActions").innerHTML = `
    <button type="button" class="btn btn-outline-dark-amson" data-bs-dismiss="modal">Close</button>
    <button type="button" class="btn btn-approve-payment" id="submitPoReceivingBtn">Submit Receiving</button>
  `;

  document.getElementById("submitPoReceivingBtn").addEventListener("click", () => submitPoReceiving(po));
}

async function submitPoReceiving(po) {
  const rows = Array.from(document.querySelectorAll("#viewPoContent tbody tr"));
  const receivedItems = rows.map((row) => {
    const idx = Number(row.dataset.index);
    const expected = po.items[idx];
    return {
      productId: expected.productId,
      expectedQty: expected.expectedQty,
      receivedQty: parseInt(row.querySelector(".po-received-qty-input").value, 10) || 0,
      batchNo: row.querySelector(".po-received-batchno-input").value.trim(),
      expirationDate: row.querySelector(".po-received-expiry-input").value,
      unitCost: row.querySelector(".po-received-unitcost-input").value === "" ? null : parseFloat(row.querySelector(".po-received-unitcost-input").value),
    };
  });
  const supplierReceiptNo = document.getElementById("poReceiptNoInput").value.trim() || null;

  const alertEl = document.getElementById("viewPoAlert");
  const missingBatchInfo = receivedItems.some((it) => it.receivedQty > 0 && (!it.batchNo || !it.expirationDate));
  if (missingBatchInfo) {
    alertEl.textContent = "Every item with a received quantity needs a batch number and expiry date.";
    alertEl.classList.remove("d-none");
    return;
  }
  const plan = planStockReceipt(
    receivedItems
      .filter((it) => it.receivedQty > 0)
      .map((it) => ({
        productId: it.productId,
        batchNo: it.batchNo,
        expirationDate: it.expirationDate,
        qty: it.receivedQty,
        supplierId: po.supplierId,
        supplierReceiptNo,
        unitCost: it.unitCost,
        dateReceived: todayISO(),
        poId: po.id,
      }))
  );
  if (plan.errors.length) {
    alertEl.textContent = plan.errors.join(" ");
    alertEl.classList.remove("d-none");
    return;
  }

  const submitBtn = document.getElementById("submitPoReceivingBtn");
  submitBtn.disabled = true;
  alertEl.classList.add("d-none");

  try {
    const discrepancies = receivedItems
      .filter((it) => it.receivedQty !== it.expectedQty)
      .map((it) => ({
        productId: it.productId,
        expectedQty: it.expectedQty,
        receivedQty: it.receivedQty,
        diff: it.receivedQty - it.expectedQty,
      }));
    const newStatus = discrepancies.length > 0 ? "discrepancy" : "received";

    // Stock and PO status together, and only once: if someone else already
    // recorded this delivery, nothing is added.
    const poRef = db.collection("purchaseOrders").doc(po.id);
    await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(poRef);
      if (!fresh.exists || fresh.data().status !== "pending") {
        throw new Error("This delivery was already recorded. Refresh the page to see it.");
      }
      const write = await applyStockReceipt(transaction, plan);
      write();
      transaction.update(poRef, {
        status: newStatus,
        receivingRecord: { items: receivedItems, discrepancies, supplierReceiptNo },
        receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    await logAuditEvent({
      action: "Purchase Order Received",
      details: `${po.poNumber}${supplierReceiptNo ? `, Receipt/DR ${supplierReceiptNo}` : ""} - ${discrepancies.length ? `${discrepancies.length} discrepanc${discrepancies.length === 1 ? "y" : "ies"}` : "all quantities matched"}`,
    });

    bootstrap.Modal.getInstance(viewPoModalEl).hide();
    await loadInventory();
  } catch (error) {
    alertEl.textContent =
      error.message && (error.message.startsWith("This delivery") || error.message.startsWith("Batch ")) ? error.message : "Something went wrong recording this delivery. Please try again.";
    alertEl.classList.remove("d-none");
  } finally {
    submitBtn.disabled = false;
  }
}

function renderPoDiscrepancyReport(po) {
  const content = document.getElementById("viewPoContent");
  const record = po.receivingRecord || { items: [], discrepancies: [] };

  content.innerHTML = `
    <p class="text-muted mb-3">What arrived doesn't match what was ordered. Acknowledge to close this record.</p>
    <table class="table admin-orders-table align-middle mb-0">
      <thead>
        <tr><th>Product</th><th>Expected</th><th>Received</th><th>Difference</th></tr>
      </thead>
      <tbody>
        ${record.items
          .map((item) => {
            const product = getProductById(item.productId);
            const diff = item.receivedQty - item.expectedQty;
            const diffLabel = diff === 0 ? "-" : diff > 0 ? `+${diff}` : String(diff);
            return `
              <tr>
                <td>${escapeHtml(product ? product.name : "Unknown product")}</td>
                <td>${item.expectedQty}</td>
                <td>${item.receivedQty}</td>
                <td style="${diff !== 0 ? "color:var(--amson-red); font-weight:600;" : ""}">${diffLabel}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("viewPoActions").innerHTML = `
    <button type="button" class="btn btn-outline-dark-amson" data-bs-dismiss="modal">Close</button>
    <button type="button" class="btn btn-approve-payment" id="acknowledgePoBtn">Acknowledge &amp; Close</button>
  `;

  document.getElementById("acknowledgePoBtn").addEventListener("click", () => acknowledgePo(po));
}

async function acknowledgePo(po) {
  const btn = document.getElementById("acknowledgePoBtn");
  const alertEl = document.getElementById("viewPoAlert");
  btn.disabled = true;

  try {
    await db.collection("purchaseOrders").doc(po.id).update({
      status: "closed",
      acknowledgedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    bootstrap.Modal.getInstance(viewPoModalEl).hide();
    await loadInventory();
  } catch (error) {
    alertEl.textContent = "Something went wrong closing this record. Please try again.";
    alertEl.classList.remove("d-none");
  } finally {
    btn.disabled = false;
  }
}

function renderPoReadOnlySummary(po) {
  const content = document.getElementById("viewPoContent");
  const record =
    po.receivingRecord || { items: po.items.map((it) => ({ ...it, receivedQty: it.expectedQty, batchNo: "-" })) };

  content.innerHTML = `
    <table class="table admin-orders-table align-middle mb-0">
      <thead>
        <tr><th>Product</th><th>Expected</th><th>Received</th><th>Batch No.</th></tr>
      </thead>
      <tbody>
        ${record.items
          .map((item) => {
            const product = getProductById(item.productId);
            return `
              <tr>
                <td>${escapeHtml(product ? product.name : "Unknown product")}</td>
                <td>${item.expectedQty}</td>
                <td>${item.receivedQty}</td>
                <td>${escapeHtml(item.batchNo || "-")}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  document.getElementById("viewPoActions").innerHTML = `
    <button type="button" class="btn btn-outline-dark-amson" data-bs-dismiss="modal">Close</button>
  `;
}
