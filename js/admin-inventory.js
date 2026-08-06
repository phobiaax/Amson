/**
 * Inventory Management admin page: real stock tracked per batch
 * (stockBatches/{id}), Receive Stock, Write Off Stock, FEFO near-expiry
 * flagging, Stock Reconciliation, and an inventory/write-off PDF report.
 *
 * Not included yet (deliberately deferred, no mockup existed for
 * either): the Purchase Order sub-module (create a PO ahead of
 * delivery, compare actual receipt against it, discrepancy reports),
 * and wiring FEFO-based auto-deduction into the Online Orders approval
 * flow. deductStockFEFO() below is ready for that once it's scoped.
 */

const INVENTORY_PAGE_SIZE = 8;

let allBatches = [];
let allSuppliers = [];
let allWriteOffs = [];
let inventoryFilter = "all";
let inventorySearchTerm = "";
let inventorySortDesc = false;
let inventoryCurrentPage = 1;
let receiveItemCount = 0;
let writeOffItemCount = 0;

const filterButtons = Array.from(document.querySelectorAll(".order-filter-btn"));
const inventorySearchInput = document.getElementById("inventorySearchInput");
const inventorySortBtn = document.getElementById("inventorySortBtn");
const inventoryTableBody = document.getElementById("inventoryTableBody");
const inventoryTableEmpty = document.getElementById("inventoryTableEmpty");
const inventoryPagination = document.getElementById("inventoryPagination");
const exportInventoryBtn = document.getElementById("exportInventoryBtn");

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
    const [batchSnapshot, supplierSnapshot, writeOffSnapshot] = await Promise.all([
      db.collection("stockBatches").get(),
      db.collection("suppliers").get(),
      db.collection("writeOffs").get(),
    ]);

    allBatches = batchSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allSuppliers = supplierSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    allWriteOffs = writeOffSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    renderInventoryTable();
  } catch (error) {
    console.error("Failed to load inventory:", error);
  }
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

  doc.save(`amson-inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
});
