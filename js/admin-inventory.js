/**
 * Inventory Management admin page: real stock tracked per batch
 * (stockBatches/{id}), Receive Stock, Write Off Stock, FEFO near-expiry
 * flagging, Stock Reconciliation, Purchase Orders (create ahead of
 * delivery, receive against a PO with automatic discrepancy detection,
 * acknowledge to close), and an inventory/write-off/discrepancy PDF
 * report.
 *
 * Not wired up yet: automatic FEFO-based stock deduction when an online
 * order is approved/dispatched. deductStockFEFO() below is ready for
 * that once admin/online-orders.html's approval flow is scoped to call it.
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
let inventoryFilter = "all";
let inventorySearchTerm = "";
let inventorySortDesc = false;
let inventoryCurrentPage = 1;
let receiveItemCount = 0;
let writeOffItemCount = 0;
let poItemCount = 0;
let poFilter = "all";
let poSearchTerm = "";
let poCurrentPage = 1;

// Scoped to each tab's own panel — the Stock and Purchase Orders tabs
// both use .order-filter-btn, and without scoping, clicking a filter
// chip on one tab would also blow away the other tab's active state.
const filterButtons = Array.from(document.querySelectorAll("#stockPanel .order-filter-btn"));
const poFilterButtons = Array.from(document.querySelectorAll("#purchaseOrdersPanel .order-filter-btn"));
const inventorySearchInput = document.getElementById("inventorySearchInput");
const inventorySortBtn = document.getElementById("inventorySortBtn");
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
const receiveItemsContainer = document.getElementById("receiveItemsContainer");
const receiveAddItemBtn = document.getElementById("receiveAddItemBtn");
const receiveModalAlert = document.getElementById("receiveModalAlert");
const saveReceiveStockBtn = document.getElementById("saveReceiveStockBtn");
const receiveUploadBatchBtn = document.getElementById("receiveUploadBatchBtn");
const receiveBatchFileInput = document.getElementById("receiveBatchFileInput");
const receiveBatchUploadStatus = document.getElementById("receiveBatchUploadStatus");

const writeOffStockBtn = document.getElementById("writeOffStockBtn");
const writeOffModalEl = document.getElementById("writeOffModal");
const writeOffDateInput = document.getElementById("writeOffDateInput");
const writeOffItemsContainer = document.getElementById("writeOffItemsContainer");
const writeOffAddItemBtn = document.getElementById("writeOffAddItemBtn");
const writeOffModalAlert = document.getElementById("writeOffModalAlert");
const saveWriteOffBtn = document.getElementById("saveWriteOffBtn");

const stockReconciliationBtn = document.getElementById("stockReconciliationBtn");
const reconciliationModalEl = document.getElementById("reconciliationModal");
const reconciliationDateInput = document.getElementById("reconciliationDateInput");
const reconciliationTableBody = document.getElementById("reconciliationTableBody");
const reconciliationAlert = document.getElementById("reconciliationAlert");
const reconciliationSuccess = document.getElementById("reconciliationSuccess");
const submitReconciliationBtn = document.getElementById("submitReconciliationBtn");

document.addEventListener("admin:ready", loadInventory);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Load ---------- */
async function loadInventory() {
  try {
    await loadCatalogCache();
    const [batchSnapshot, supplierSnapshot, writeOffSnapshot, poSnapshot] = await Promise.all([
      db.collection("stockBatches").get(),
      db.collection("suppliers").get(),
      db.collection("writeOffs").get(),
      db.collection("purchaseOrders").get(),
    ]);

    allBatches = batchSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allSuppliers = supplierSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allWriteOffs = writeOffSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allPurchaseOrders = poSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    renderInventoryTable();
    renderPoTable();
  } catch (error) {
    console.error("Failed to load inventory:", error);
  }
}

/* ---------- Tabs ---------- */
function setActiveInventoryTab(tab) {
  const isStock = tab === "stock";
  tabStockBtn.classList.toggle("active", isStock);
  tabPurchaseOrdersBtn.classList.toggle("active", !isStock);
  stockPanel.classList.toggle("d-none", !isStock);
  purchaseOrdersPanel.classList.toggle("d-none", isStock);
}

tabStockBtn.addEventListener("click", () => setActiveInventoryTab("stock"));
tabPurchaseOrdersBtn.addEventListener("click", () => setActiveInventoryTab("po"));

/* ---------- PO number generation (same pattern as order numbers) ---------- */
async function generatePoNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`purchaseOrders-${year}`);
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
    transaction.set(counterRef, { count: nextCount }, { merge: true });
    return `PO-${year}-${String(nextCount).padStart(4, "0")}`;
  });
}

/* ---------- Formatting ---------- */
function formatExpiryLabel(isoDate) {
  if (!isoDate) return "—";
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

/* ---------- FEFO deduction helper (not wired into orders yet) ---------- */
async function deductStockFEFO(productId, qty) {
  const batches = allBatches
    .filter((b) => b.productId === productId && b.status === "active" && b.quantity > 0)
    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
  if (totalAvailable < qty) {
    throw new Error("Not enough stock available to fulfill this quantity.");
  }

  let remaining = qty;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    await db.collection("stockBatches").doc(batch.id).update({ quantity: batch.quantity - deduct });
    batch.quantity -= deduct;
    remaining -= deduct;
  }
}

/* ---------- Table ---------- */
function filteredBatches() {
  let filtered = allBatches.map((b) => ({ ...b, computedStatus: getBatchStatus(b) }));

  if (inventoryFilter !== "all") {
    filtered = filtered.filter((b) => b.computedStatus === inventoryFilter);
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
    const aTime = new Date(a.expirationDate).getTime();
    const bTime = new Date(b.expirationDate).getTime();
    return inventorySortDesc ? bTime - aTime : aTime - bTime;
  });

  return filtered;
}

function renderInventoryTable() {
  const allWithStatus = allBatches.map((b) => getBatchStatus(b));
  document.getElementById("lowStockCount").textContent = allWithStatus.filter((s) => s === "low_stock").length;
  document.getElementById("nearExpiryCount").textContent = allWithStatus.filter((s) => s === "near_expiry").length;

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
  }

  renderInventoryPagination(totalPages);
}

function renderBatchRow(batch) {
  const product = getProductById(batch.productId);
  const reorderPoint = (product && product.reorderPoint) || DEFAULT_REORDER_POINT;
  return `
    <tr>
      <td class="fw-medium">${batch.batchNo}</td>
      <td>${formatExpiryLabel(batch.expirationDate)}</td>
      <td>${product ? product.name : "Unknown product"}</td>
      <td>${product ? CATEGORY_LABELS[product.category] || "—" : "—"}</td>
      <td>${batch.quantity}</td>
      <td>${reorderPoint}</td>
      <td><span class="batch-status-pill ${batch.computedStatus}">${BATCH_STATUS_LABELS[batch.computedStatus]}</span></td>
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

/* ---------- Shared repeater helpers ----------
 * Product/supplier/batch pickers use Choices.js so admins can type to
 * search instead of scrolling a plain <select> — with a growing catalog
 * or many suppliers, a native dropdown gets unusable fast.
 */
function makeSearchableSelect(selectEl) {
  return new Choices(selectEl, {
    searchEnabled: true,
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
  selectEl.innerHTML = SAMPLE_PRODUCTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
  selectEl._choices = makeSearchableSelect(selectEl);
}

function populateSupplierSelect(selectEl) {
  const options = ['<option value="">No supplier / unspecified</option>'].concat(
    allSuppliers.map((s) => `<option value="${s.id}">${s.name}</option>`)
  );
  selectEl.innerHTML = options.join("");
  selectEl._choices = makeSearchableSelect(selectEl);
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
        <label class="form-label">Product</label>
        <select class="form-select receive-product-select"></select>
      </div>
      <div class="col-md-6">
        <label class="form-label">Qty Received</label>
        <input type="number" min="1" class="form-control receive-qty-input">
      </div>
      <div class="col-md-6">
        <label class="form-label">Batch No.</label>
        <input type="text" class="form-control receive-batchno-input" placeholder="e.g. BIO-500-100">
      </div>
      <div class="col-md-6">
        <label class="form-label">Expiry Date</label>
        <input type="date" class="form-control receive-expiry-input">
      </div>
    </div>
  `;
  receiveItemsContainer.appendChild(row);
  populateProductSelect(row.querySelector(".receive-product-select"));
  updateRemoveButtonsVisibility(receiveItemsContainer);
}

receiveAddItemBtn.addEventListener("click", addReceiveItemRow);

receiveItemsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".repeater-remove-btn");
  if (!btn) return;
  const row = btn.closest(".repeater-item");
  destroyChoicesIn(row);
  row.remove();
  renumberItems(receiveItemsContainer);
  updateRemoveButtonsVisibility(receiveItemsContainer);
});

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
  receiveModalAlert.classList.add("d-none");
  receiveBatchUploadStatus.textContent = "";
  populateSupplierSelect(receiveSupplierSelect);
  bootstrap.Modal.getOrCreateInstance(receiveStockModalEl).show();
});

saveReceiveStockBtn.addEventListener("click", async () => {
  const supplierId = receiveSupplierSelect.value;
  const dateReceived = receiveDateInput.value || todayISO();
  const rows = Array.from(receiveItemsContainer.querySelectorAll(".repeater-item"));

  const items = rows.map((row) => ({
    productId: row.querySelector(".receive-product-select").value,
    qty: parseInt(row.querySelector(".receive-qty-input").value, 10),
    batchNo: row.querySelector(".receive-batchno-input").value.trim(),
    expirationDate: row.querySelector(".receive-expiry-input").value,
  }));

  const invalid = items.some((it) => !it.productId || !it.qty || it.qty <= 0 || !it.batchNo || !it.expirationDate);
  if (invalid || items.length === 0) {
    receiveModalAlert.textContent = "Every item needs a product, quantity, batch number, and expiry date.";
    receiveModalAlert.classList.remove("d-none");
    return;
  }

  saveReceiveStockBtn.disabled = true;
  receiveModalAlert.classList.add("d-none");

  try {
    for (const item of items) {
      await db.collection("stockBatches").add({
        productId: item.productId,
        batchNo: item.batchNo,
        expirationDate: item.expirationDate,
        quantity: item.qty,
        initialQuantity: item.qty,
        supplierId: supplierId || null,
        dateReceived,
        status: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    bootstrap.Modal.getInstance(receiveStockModalEl).hide();
    await loadInventory();
  } catch (error) {
    receiveModalAlert.textContent = "Something went wrong receiving this stock. Please try again.";
    receiveModalAlert.classList.remove("d-none");
  } finally {
    saveReceiveStockBtn.disabled = false;
  }
});

/* ---------- Receive Stock: CSV batch upload ---------- */
receiveUploadBatchBtn.addEventListener("click", () => receiveBatchFileInput.click());

receiveBatchFileInput.addEventListener("change", async () => {
  const file = receiveBatchFileInput.files[0];
  if (!file) return;

  receiveBatchUploadStatus.textContent = "Reading file...";
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    receiveBatchUploadStatus.textContent = "That file doesn't have any stock rows.";
    return;
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] || ""));
    return row;
  });

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const product = SAMPLE_PRODUCTS.find((p) => (p.sku || "").toLowerCase() === (row.sku || "").toLowerCase());
    const qty = parseInt(row.qtyreceived, 10);

    if (!product || !row.batchno || !row.expirydate || !qty || qty <= 0) {
      skipped += 1;
      continue;
    }

    const supplier = allSuppliers.find((s) => s.name.toLowerCase() === (row.suppliername || "").toLowerCase());

    try {
      await db.collection("stockBatches").add({
        productId: product.id,
        batchNo: row.batchno,
        expirationDate: row.expirydate,
        quantity: qty,
        initialQuantity: qty,
        supplierId: supplier ? supplier.id : null,
        dateReceived: row.datereceived || todayISO(),
        status: "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      imported += 1;
    } catch (error) {
      skipped += 1;
    }
  }

  receiveBatchUploadStatus.textContent = `Imported ${imported} batch${imported === 1 ? "" : "es"}.${
    skipped ? ` Skipped ${skipped} row(s) — check SKU, batch no., expiry date, and quantity.` : ""
  }`;
  receiveBatchFileInput.value = "";
  await loadInventory();
});

/* ---------- Write Off Stock ---------- */
function populateBatchSelectForProduct(batchSelectEl, productId) {
  const batches = allBatches.filter((b) => b.productId === productId && b.quantity > 0);
  const choicesData = batches.length
    ? batches.map((b) => ({
        value: b.id,
        label: `${b.batchNo} — Exp ${formatExpiryLabel(b.expirationDate)} — Qty ${b.quantity}`,
      }))
    : [{ value: "", label: "No stock available" }];

  if (batchSelectEl._choices) {
    // Same instance, new options — the product just changed, so the
    // batch list needs to reflect that product's batches instead of
    // being torn down and rebuilt.
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
}

function receiveOrWriteOffAppend(row) {
  writeOffItemsContainer.appendChild(row);
}

writeOffAddItemBtn.addEventListener("click", addWriteOffItemRow);

writeOffItemsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".repeater-remove-btn");
  if (!btn) return;
  const row = btn.closest(".repeater-item");
  destroyChoicesIn(row);
  row.remove();
  renumberItems(writeOffItemsContainer);
  updateRemoveButtonsVisibility(writeOffItemsContainer);
});

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

  try {
    for (const item of items) {
      const batch = allBatches.find((b) => b.id === item.batchId);
      await db.collection("stockBatches").doc(item.batchId).update({ quantity: batch.quantity - item.qty });
      await db.collection("writeOffs").add({
        batchId: item.batchId,
        productId: item.productId,
        batchNo: batch.batchNo,
        quantity: item.qty,
        reason: item.reason,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    bootstrap.Modal.getInstance(writeOffModalEl).hide();
    await loadInventory();
  } catch (error) {
    writeOffModalAlert.textContent = "Something went wrong recording this write-off. Please try again.";
    writeOffModalAlert.classList.remove("d-none");
  } finally {
    saveWriteOffBtn.disabled = false;
  }
});

/* ---------- Stock Reconciliation ---------- */
stockReconciliationBtn.addEventListener("click", () => {
  reconciliationDateInput.value = todayISO();
  reconciliationAlert.classList.add("d-none");
  reconciliationSuccess.classList.add("d-none");
  submitReconciliationBtn.disabled = false;
  submitReconciliationBtn.textContent = "Submit Reconciliation";
  renderReconciliationTable();
  bootstrap.Modal.getOrCreateInstance(reconciliationModalEl).show();
});

function renderReconciliationTable() {
  const activeBatches = allBatches.filter((b) => b.status === "active");
  reconciliationTableBody.innerHTML = activeBatches
    .map((b) => {
      const product = getProductById(b.productId);
      return `
        <tr data-batch-id="${b.id}">
          <td>${b.batchNo}</td>
          <td>${product ? product.name : "Unknown product"}</td>
          <td>${formatExpiryLabel(b.expirationDate)}</td>
          <td>${b.quantity}</td>
          <td><input type="number" min="0" class="form-control form-control-sm reconciliation-counted-input" style="max-width:100px;" value="${b.quantity}"></td>
        </tr>
      `;
    })
    .join("");
}

submitReconciliationBtn.addEventListener("click", async () => {
  const rows = Array.from(reconciliationTableBody.querySelectorAll("tr"));
  const adjustments = [];

  rows.forEach((row) => {
    const batchId = row.dataset.batchId;
    const batch = allBatches.find((b) => b.id === batchId);
    const countedQty = parseInt(row.querySelector(".reconciliation-counted-input").value, 10) || 0;
    if (batch && countedQty !== batch.quantity) {
      adjustments.push({
        batchId,
        productId: batch.productId,
        batchNo: batch.batchNo,
        systemQty: batch.quantity,
        countedQty,
        diff: countedQty - batch.quantity,
      });
    }
  });

  submitReconciliationBtn.disabled = true;

  try {
    for (const adj of adjustments) {
      await db.collection("stockBatches").doc(adj.batchId).update({ quantity: adj.countedQty });
    }

    await db.collection("reconciliations").add({
      date: reconciliationDateInput.value || todayISO(),
      adjustments,
      locked: true,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    reconciliationSuccess.textContent = `Reconciliation submitted. ${adjustments.length} batch${adjustments.length === 1 ? "" : "es"} adjusted.`;
    reconciliationSuccess.classList.remove("d-none");
    reconciliationTableBody.querySelectorAll(".reconciliation-counted-input").forEach((input) => (input.disabled = true));
    submitReconciliationBtn.textContent = "Submitted";
    await loadInventory();
  } catch (error) {
    reconciliationAlert.textContent = "Something went wrong submitting the reconciliation. Please try again.";
    reconciliationAlert.classList.remove("d-none");
    submitReconciliationBtn.disabled = false;
  }
});

/* ---------- Export Report ---------- */
exportInventoryBtn.addEventListener("click", () => {
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals — Inventory Report", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Current Stock", 14, y);
  y += 6;
  doc.text("Batch No.", 14, y);
  doc.text("Product", 55, y);
  doc.text("Expiry", 120, y);
  doc.text("Qty", 155, y);
  doc.text("Status", 175, y);
  y += 3;
  doc.line(14, y, 196, y);
  doc.setFont(undefined, "normal");

  allBatches.forEach((batch) => {
    const product = getProductById(batch.productId);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(batch.batchNo, 14, y);
    doc.text(product ? product.name.slice(0, 26) : "Unknown", 55, y);
    doc.text(formatExpiryLabel(batch.expirationDate), 120, y);
    doc.text(String(batch.quantity), 155, y);
    doc.text(BATCH_STATUS_LABELS[getBatchStatus(batch)], 175, y);
  });

  y += 14;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont(undefined, "bold");
  doc.text("Write-Offs / Pull-Outs", 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  if (allWriteOffs.length === 0) {
    doc.text("None recorded.", 14, y);
  } else {
    allWriteOffs.forEach((writeOff) => {
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${writeOff.batchNo} — Qty ${writeOff.quantity} — ${writeOff.reason}`, 14, y);
    });
  }

  const posWithDiscrepancies = allPurchaseOrders.filter(
    (po) => po.receivingRecord && po.receivingRecord.discrepancies && po.receivingRecord.discrepancies.length > 0
  );

  y += 14;
  if (y > 260) {
    doc.addPage();
    y = 20;
  }
  doc.setFont(undefined, "bold");
  doc.text("Purchase Order Discrepancies", 14, y);
  y += 6;
  doc.setFont(undefined, "normal");

  if (posWithDiscrepancies.length === 0) {
    doc.text("None recorded.", 14, y);
  } else {
    posWithDiscrepancies.forEach((po) => {
      po.receivingRecord.discrepancies.forEach((d) => {
        const product = getProductById(d.productId);
        y += 7;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(
          `${po.poNumber} — ${product ? product.name : "Unknown"} — Expected ${d.expectedQty}, Received ${d.receivedQty} (${d.diff > 0 ? "+" : ""}${d.diff})`,
          14,
          y
        );
      });
    });
  }

  doc.save(`amson-inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
  }

  renderPoPagination(totalPages);
}

function renderPoRow(po) {
  const supplier = allSuppliers.find((s) => s.id === po.supplierId);
  return `
    <tr>
      <td class="fw-medium">${po.poNumber}</td>
      <td>${supplier ? supplier.name : "—"}</td>
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

poTableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-po-btn");
  if (!btn) return;
  const po = allPurchaseOrders.find((p) => p.id === btn.dataset.id);
  if (po) openViewPoModal(po);
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
}

poAddItemBtn.addEventListener("click", addPoItemRow);

poItemsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest(".repeater-remove-btn");
  if (!btn) return;
  const row = btn.closest(".repeater-item");
  destroyChoicesIn(row);
  row.remove();
  renumberItems(poItemsContainer);
  updateRemoveButtonsVisibility(poItemsContainer);
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
  document.getElementById("viewPoSubtitle").textContent = `${supplier ? supplier.name : "Unknown supplier"} — Expected ${formatExpiryLabel(po.expectedDeliveryDate)}`;

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
    <p class="text-muted mb-3">Enter what was actually received for each item. Partial deliveries are fine — stock gets added either way, and any mismatch gets flagged as a discrepancy.</p>
    <table class="table admin-orders-table align-middle mb-0">
      <thead>
        <tr><th>Product</th><th>Expected Qty</th><th>Received Qty</th><th>Batch No.</th><th>Expiry Date</th></tr>
      </thead>
      <tbody>
        ${po.items
          .map((item, idx) => {
            const product = getProductById(item.productId);
            return `
              <tr data-index="${idx}">
                <td>${product ? product.name : "Unknown product"}</td>
                <td>${item.expectedQty}</td>
                <td><input type="number" min="0" class="form-control form-control-sm po-received-qty-input" style="max-width:100px;" value="${item.expectedQty}"></td>
                <td><input type="text" class="form-control form-control-sm po-received-batchno-input" placeholder="e.g. BIO-500-100"></td>
                <td><input type="date" class="form-control form-control-sm po-received-expiry-input"></td>
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
    };
  });

  const alertEl = document.getElementById("viewPoAlert");
  const missingBatchInfo = receivedItems.some((it) => it.receivedQty > 0 && (!it.batchNo || !it.expirationDate));
  if (missingBatchInfo) {
    alertEl.textContent = "Every item with a received quantity needs a batch number and expiry date.";
    alertEl.classList.remove("d-none");
    return;
  }

  const submitBtn = document.getElementById("submitPoReceivingBtn");
  submitBtn.disabled = true;
  alertEl.classList.add("d-none");

  try {
    // Partial or full stock received still gets added to inventory,
    // independent of whether it matches what was expected.
    for (const item of receivedItems) {
      if (item.receivedQty <= 0) continue;
      await db.collection("stockBatches").add({
        productId: item.productId,
        batchNo: item.batchNo,
        expirationDate: item.expirationDate,
        quantity: item.receivedQty,
        initialQuantity: item.receivedQty,
        supplierId: po.supplierId,
        dateReceived: todayISO(),
        status: "active",
        poId: po.id,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    const discrepancies = receivedItems
      .filter((it) => it.receivedQty !== it.expectedQty)
      .map((it) => ({
        productId: it.productId,
        expectedQty: it.expectedQty,
        receivedQty: it.receivedQty,
        diff: it.receivedQty - it.expectedQty,
      }));

    const newStatus = discrepancies.length > 0 ? "discrepancy" : "received";

    await db.collection("purchaseOrders").doc(po.id).update({
      status: newStatus,
      receivingRecord: { items: receivedItems, discrepancies },
      receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    bootstrap.Modal.getInstance(viewPoModalEl).hide();
    await loadInventory();
  } catch (error) {
    alertEl.textContent = "Something went wrong recording this delivery. Please try again.";
    alertEl.classList.remove("d-none");
  } finally {
    submitBtn.disabled = false;
  }
}

function renderPoDiscrepancyReport(po) {
  const content = document.getElementById("viewPoContent");
  const record = po.receivingRecord || { items: [], discrepancies: [] };

  content.innerHTML = `
    <p class="text-muted mb-3">Variance detected between what was ordered and what arrived. Acknowledge to close this record.</p>
    <table class="table admin-orders-table align-middle mb-0">
      <thead>
        <tr><th>Product</th><th>Expected</th><th>Received</th><th>Difference</th></tr>
      </thead>
      <tbody>
        ${record.items
          .map((item) => {
            const product = getProductById(item.productId);
            const diff = item.receivedQty - item.expectedQty;
            const diffLabel = diff === 0 ? "—" : diff > 0 ? `+${diff}` : String(diff);
            return `
              <tr>
                <td>${product ? product.name : "Unknown product"}</td>
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
    po.receivingRecord || { items: po.items.map((it) => ({ ...it, receivedQty: it.expectedQty, batchNo: "—" })) };

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
                <td>${product ? product.name : "Unknown product"}</td>
                <td>${item.expectedQty}</td>
                <td>${item.receivedQty}</td>
                <td>${item.batchNo || "—"}</td>
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
