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
document.addEventListener("admin:ready", (e) => {
  const admin = e.detail && e.detail.admin;
  if (admin) currentAdminName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Admin";
  loadInventory();
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------- Load ---------- */
async function loadInventory() {
  try {
    await loadCatalogCache();
    await enforceExpiryStatus();
    const batchSnapshot = await db.collection("stockBatches").get();
    const supplierSnapshot = await db.collection("suppliers").get();
    const writeOffSnapshot = await db.collection("writeOffs").get();
    const poSnapshot = await db.collection("purchaseOrders").get();
    const reconciliationSnapshot = await db.collection("reconciliations").get();

    allBatches = batchSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allSuppliers = supplierSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allWriteOffs = writeOffSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allPurchaseOrders = poSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allReconciliations = reconciliationSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    renderInventoryTable();
    renderPoTable();
    renderReconciliationTab();
  } catch (error) {
    console.error("Failed to load inventory:", error);
  }
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
  return `RCN-${year}-${String(nextCount).padStart(2, "0")}`;
}

/* ---------- Formatting ---------- */
function formatExpiryLabel(isoDate) {
  if (!isoDate) return "-";
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-PH", { month: "long", year: "numeric" });
}

function formatDateAdded(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
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
      <td>${formatDateAdded(batch.createdAt)}</td>
      <td>${formatExpiryLabel(batch.expirationDate)}</td>
      <td>${product ? product.name : "Unknown product"}</td>
      <td>${product ? CATEGORY_LABELS[product.category] || "-" : "-"}</td>
      <td>${batch.quantity}</td>
      <td>${reorderPoint}</td>
      <td>
        <span class="batch-status-pill ${batch.computedStatus}">${BATCH_STATUS_LABELS[batch.computedStatus]}</span>
        ${batch.status === "wholesale_only" ? '<span class="badge rounded-pill text-bg-secondary ms-1">Wholesale Only</span>' : ""}
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

/* ---------- Shared repeater helpers ---------- */
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
        <div class="d-flex justify-content-between align-items-center">
          <label class="form-label mb-0">Product</label>
          <button type="button" class="btn btn-link btn-sm p-0 quick-add-product-btn" style="font-size:0.8rem;">+ New Product</button>
        </div>
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

  // Stock this close to expiry gets auto-flagged as a Bad Order and its
  // quantity zeroed out the moment Inventory reloads (see
  // enforceExpiryStatus in products-data.js) - warn before that happens
  // silently, since it's easy to type in a near-term test/typo date.
  const badOrderThreshold = new Date();
  badOrderThreshold.setMonth(badOrderThreshold.getMonth() + BAD_ORDER_MONTHS);
  const nearExpiryItems = items.filter((it) => new Date(it.expirationDate) <= badOrderThreshold);
  if (nearExpiryItems.length > 0) {
    const productNames = nearExpiryItems
      .map((it) => (getProductById(it.productId) || {}).name || "Unknown product")
      .join(", ");
    const proceed = confirm(
      `${productNames} ${nearExpiryItems.length === 1 ? "has" : "have"} an expiry date within ${BAD_ORDER_MONTHS} months from today. Amson auto-flags stock this close to expiry as a Bad Order and sets its quantity to 0 as soon as it's received - it will NOT be sellable or show up in the storefront. Continue anyway?`
    );
    if (!proceed) return;
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
    skipped ? ` Skipped ${skipped} row(s) - check SKU, batch no., expiry date, and quantity.` : ""
  }`;
  receiveBatchFileInput.value = "";
  await loadInventory();
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
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join("");
}

function refreshSupplierSelects() {
  const options = [{ value: "", label: "No supplier / unspecified" }].concat(
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
  const retailPrice = parseFloat(quickProductPriceInput.value);

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
      status: "active",
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

      const product = getProductById(item.productId);
      await logAuditEvent({
        action: "Inventory Write-Off",
        details: `${product ? product.name : item.productId} - Batch ${batch.batchNo}, Qty ${item.qty}, Reason: ${item.reason}`,
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

/* ---------- Stock Reconciliation (session-based) ---------- */
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
    reconciliationMeta.textContent = `Period: ${formatPeriodLabel(activeSession.period)} - Opened by: ${activeSession.openedBy}`;
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
          <td>${product ? product.name : "Unknown product"}</td>
          <td>${item.batchNo}</td>
          <td>${formatExpiryLabel(item.expirationDate)}</td>
          <td>${item.systemQty}</td>
          <td><input type="number" min="0" class="form-control form-control-sm reconciliation-counted-input" style="max-width:100px;" value="${item.countedQty || 0}"></td>
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
    .map(
      (session) => `
        <div class="checkout-card p-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <p class="fw-bold mb-0">${session.rcnNumber}</p>
            <p class="text-muted mb-0" style="font-size:0.85rem;">
              Period: ${formatPeriodLabel(session.period)} - Opened by: ${session.openedBy} - Finalized by: ${session.finalizedBy}
            </p>
          </div>
          <span class="badge rounded-pill text-bg-success">Finalized</span>
        </div>
      `
    )
    .join("");
}

openReconciliationSessionBtn.addEventListener("click", () => {
  const now = new Date();
  reconciliationPeriodInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  openReconciliationAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(openReconciliationModalEl).show();
});

confirmOpenSessionBtn.addEventListener("click", async () => {
  const period = reconciliationPeriodInput.value;
  if (!period) {
    openReconciliationAlert.textContent = "Please select a period.";
    openReconciliationAlert.classList.remove("d-none");
    return;
  }
  if (findActiveSession()) {
    openReconciliationAlert.textContent = "A reconciliation session is already in progress.";
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
      countedQty: 0,
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
    openReconciliationAlert.textContent = "Something went wrong opening this session. Please try again.";
    openReconciliationAlert.classList.remove("d-none");
  } finally {
    confirmOpenSessionBtn.disabled = false;
  }
});

submitCountBtn.addEventListener("click", async () => {
  const activeSession = findActiveSession();
  if (!activeSession) return;
  if (!confirm("Submit this count? This finalizes the session and updates stock quantities to match what was counted.")) return;

  const rows = Array.from(reconciliationItemsBody.querySelectorAll("tr"));
  const updatedItems = rows.map((row) => {
    const idx = Number(row.dataset.idx);
    const item = activeSession.items[idx];
    const countedQty = parseInt(row.querySelector(".reconciliation-counted-input").value, 10) || 0;
    return { ...item, countedQty, variance: countedQty - item.systemQty };
  });

  submitCountBtn.disabled = true;
  reconciliationAlert.classList.add("d-none");

  try {
    for (const item of updatedItems) {
      if (item.variance !== 0) {
        await db.collection("stockBatches").doc(item.batchId).update({ quantity: item.countedQty });
      }
    }

    await db.collection("reconciliations").doc(activeSession.id).update({
      items: updatedItems,
      status: "finalized",
      finalizedBy: currentAdminName,
      finalizedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    const adjustedCount = updatedItems.filter((i) => i.variance !== 0).length;
    await logAuditEvent({
      action: "Stock Reconciliation Finalized",
      details: `${activeSession.rcnNumber} (${formatPeriodLabel(activeSession.period)}) - ${adjustedCount} batch${adjustedCount === 1 ? "" : "es"} adjusted`,
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
  exportBlankPdf("amson-inventory-report");
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
      <td class="fw-medium">${po.poNumber}</td>
      <td>${supplier ? supplier.name : "-"}</td>
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
    <p class="text-muted mb-3">Enter what was actually received for each item. Partial deliveries are fine - stock gets added either way, and any mismatch gets flagged as a discrepancy.</p>
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
            const diffLabel = diff === 0 ? "-" : diff > 0 ? `+${diff}` : String(diff);
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
                <td>${product ? product.name : "Unknown product"}</td>
                <td>${item.expectedQty}</td>
                <td>${item.receivedQty}</td>
                <td>${item.batchNo || "-"}</td>
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
