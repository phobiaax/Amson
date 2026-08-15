/**
 * Wholesale Accounts admin page.
 */

const WHOLESALE_PAGE_SIZE = 6;
const BUSINESS_TYPE_LABELS = {
  retail_pharmacy: "Retail Pharmacy",
  clinic: "Clinic",
  hospital: "Hospital",
  distributor: "Distributor",
  other: "Other",
};

let allWholesaleAccounts = [];
let wholesaleSearchTerm = "";
let wholesaleCurrentPage = 1;
let editingWholesaleId = null;
let existingLtoUrl = null;
let existingPermitUrl = null;
let selectedLtoFile = null;
let selectedPermitFile = null;

let processingAccountId = null;
let processOrderItemCount = 0;
let selectedPoDocFile = null;

const wholesaleSearchInput = document.getElementById("wholesaleSearchInput");
const wholesaleGrid = document.getElementById("wholesaleGrid");
const wholesaleEmpty = document.getElementById("wholesaleEmpty");
const wholesalePagination = document.getElementById("wholesalePagination");
const addWholesaleBtn = document.getElementById("addWholesaleBtn");

const wholesaleModalEl = document.getElementById("wholesaleModal");
const wholesaleModalTitle = document.getElementById("wholesaleModalTitle");
const wholesaleModalAlert = document.getElementById("wholesaleModalAlert");
const wholesaleNameInput = document.getElementById("wholesaleNameInput");
const wholesaleContactPersonInput = document.getElementById("wholesaleContactPersonInput");
const wholesaleBusinessTypeSelect = document.getElementById("wholesaleBusinessTypeSelect");
const wholesalePhoneInput = document.getElementById("wholesalePhoneInput");
const wholesaleEmailInput = document.getElementById("wholesaleEmailInput");
const wholesaleAddressInput = document.getElementById("wholesaleAddressInput");
const wholesaleLtoInput = document.getElementById("wholesaleLtoInput");
const wholesaleLtoStatus = document.getElementById("wholesaleLtoStatus");
const wholesalePermitInput = document.getElementById("wholesalePermitInput");
const wholesalePermitStatus = document.getElementById("wholesalePermitStatus");
const wholesaleStatusToggle = document.getElementById("wholesaleStatusToggle");
const saveWholesaleBtn = document.getElementById("saveWholesaleBtn");
const deleteWholesaleBtn = document.getElementById("deleteWholesaleBtn");

const processOrderModalEl = document.getElementById("processOrderModal");
const processOrderAlert = document.getElementById("processOrderAlert");
const processOrderBuyerName = document.getElementById("processOrderBuyerName");
const processOrderBuyerContact = document.getElementById("processOrderBuyerContact");
const processOrderDocuments = document.getElementById("processOrderDocuments");
const processOrderPoRefInput = document.getElementById("processOrderPoRefInput");
const processOrderPoDocInput = document.getElementById("processOrderPoDocInput");
const processOrderItemsContainer = document.getElementById("processOrderItemsContainer");
const processOrderAddItemBtn = document.getElementById("processOrderAddItemBtn");
const processOrderNotesInput = document.getElementById("processOrderNotesInput");
const processOrderTotal = document.getElementById("processOrderTotal");
const confirmProcessOrderBtn = document.getElementById("confirmProcessOrderBtn");

document.addEventListener("admin:ready", loadWholesaleAccounts);

/* ---------- Load ---------- */
async function loadWholesaleAccounts() {
  try {
    await loadCatalogCache();
    const snapshot = await db.collection("wholesaleAccounts").get();
    allWholesaleAccounts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderWholesaleGrid();
  } catch (error) {
    console.error("Failed to load wholesale accounts:", error);
  }
}

/* ---------- Grid ---------- */
function filteredWholesaleAccounts() {
  let filtered = allWholesaleAccounts.slice();

  if (wholesaleSearchTerm) {
    const term = wholesaleSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (w) =>
        (w.name || "").toLowerCase().includes(term) ||
        (w.contactPerson || "").toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));
  return filtered;
}

function renderWholesaleGrid() {
  const filtered = filteredWholesaleAccounts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / WHOLESALE_PAGE_SIZE));
  wholesaleCurrentPage = Math.min(wholesaleCurrentPage, totalPages);

  const start = (wholesaleCurrentPage - 1) * WHOLESALE_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + WHOLESALE_PAGE_SIZE);

  if (pageItems.length === 0) {
    wholesaleGrid.innerHTML = "";
    wholesaleEmpty.classList.remove("d-none");
  } else {
    wholesaleEmpty.classList.add("d-none");
    wholesaleGrid.innerHTML = pageItems.map(renderWholesaleCard).join("");

    document.querySelectorAll(".edit-wholesale-btn").forEach((btn) => {
      btn.addEventListener("click", () => openEditModal(allWholesaleAccounts.find((w) => w.id === btn.dataset.id)));
    });
    document.querySelectorAll(".delete-wholesale-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteWholesaleAccount(btn.dataset.id));
    });
    document.querySelectorAll(".process-order-btn").forEach((btn) => {
      btn.addEventListener("click", () => openProcessOrderModal(allWholesaleAccounts.find((w) => w.id === btn.dataset.id)));
    });
  }

  renderWholesalePagination(totalPages);
}

function renderWholesaleCard(account) {
  return `
    <div class="col-md-6 col-lg-4">
      <div class="supplier-card">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex gap-3">
            <div class="supplier-icon"><i class="bi bi-shop"></i></div>
            <div>
              <p class="fw-bold mb-0">${account.name}</p>
              <p class="text-muted mb-0" style="font-size:0.88rem;">${account.contactPerson || "-"}</p>
            </div>
          </div>
          <span class="badge rounded-pill ${account.status === "active" ? "text-bg-success" : "text-bg-secondary"}">
            ${account.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
        <p class="contact-line"><i class="bi bi-briefcase"></i> ${BUSINESS_TYPE_LABELS[account.businessType] || "-"}</p>
        <p class="contact-line"><i class="bi bi-telephone"></i> ${account.phone || "-"}</p>
        <p class="contact-line"><i class="bi bi-envelope"></i> ${account.email || "-"}</p>
        <p class="contact-line mb-3"><i class="bi bi-geo-alt"></i> ${account.address || "-"}</p>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <button type="button" class="btn btn-amson flex-fill process-order-btn" data-id="${account.id}"><i class="bi bi-cart-check me-1"></i>Process Order</button>
          <button type="button" class="icon-btn edit-wholesale-btn" data-id="${account.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
          <button type="button" class="icon-btn icon-btn-danger delete-wholesale-btn" data-id="${account.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  `;
}

function renderWholesalePagination(totalPages) {
  if (totalPages <= 1) {
    wholesalePagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${wholesaleCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === wholesaleCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${wholesaleCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  wholesalePagination.innerHTML = html;
}

wholesalePagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") wholesaleCurrentPage -= 1;
  else if (btn.dataset.page === "next") wholesaleCurrentPage += 1;
  else wholesaleCurrentPage = Number(btn.dataset.page);
  renderWholesaleGrid();
});

wholesaleSearchInput.addEventListener("input", () => {
  wholesaleSearchTerm = wholesaleSearchInput.value.trim();
  wholesaleCurrentPage = 1;
  renderWholesaleGrid();
});

/* ---------- Add / Edit modal ---------- */
function wireSegmentedToggle(container) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".segmented-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}
wireSegmentedToggle(wholesaleStatusToggle);

function setToggleValue(container, value) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
}

function getToggleValue(container) {
  return container.querySelector(".segmented-toggle-btn.active").dataset.value;
}

function resetWholesaleForm() {
  wholesaleNameInput.value = "";
  wholesaleContactPersonInput.value = "";
  wholesaleBusinessTypeSelect.value = "retail_pharmacy";
  wholesalePhoneInput.value = "";
  wholesaleEmailInput.value = "";
  wholesaleAddressInput.value = "";
  wholesaleLtoInput.value = "";
  wholesalePermitInput.value = "";
  wholesaleLtoStatus.textContent = "No file uploaded yet.";
  wholesalePermitStatus.textContent = "No file uploaded yet.";
  existingLtoUrl = null;
  existingPermitUrl = null;
  selectedLtoFile = null;
  selectedPermitFile = null;
  setToggleValue(wholesaleStatusToggle, "active");
  wholesaleModalAlert.classList.add("d-none");
}

addWholesaleBtn.addEventListener("click", () => {
  editingWholesaleId = null;
  resetWholesaleForm();
  wholesaleModalTitle.textContent = "Add Wholesale Account";
  saveWholesaleBtn.textContent = "Add Account";
  deleteWholesaleBtn.style.display = "none";
  bootstrap.Modal.getOrCreateInstance(wholesaleModalEl).show();
});

function openEditModal(account) {
  if (!account) return;
  editingWholesaleId = account.id;
  resetWholesaleForm();

  wholesaleNameInput.value = account.name || "";
  wholesaleContactPersonInput.value = account.contactPerson || "";
  wholesaleBusinessTypeSelect.value = account.businessType || "retail_pharmacy";
  wholesalePhoneInput.value = account.phone || "";
  wholesaleEmailInput.value = account.email || "";
  wholesaleAddressInput.value = account.address || "";
  setToggleValue(wholesaleStatusToggle, account.status || "active");

  if (account.ltoDocumentUrl) {
    existingLtoUrl = account.ltoDocumentUrl;
    wholesaleLtoStatus.textContent = "Existing file on record - choose a new file to replace it.";
  }
  if (account.permitDocumentUrl) {
    existingPermitUrl = account.permitDocumentUrl;
    wholesalePermitStatus.textContent = "Existing file on record - choose a new file to replace it.";
  }

  wholesaleModalTitle.textContent = "Edit Wholesale Account";
  saveWholesaleBtn.textContent = "Save Changes";
  deleteWholesaleBtn.style.display = "inline-block";
  bootstrap.Modal.getOrCreateInstance(wholesaleModalEl).show();
}

wholesaleLtoInput.addEventListener("change", () => {
  selectedLtoFile = wholesaleLtoInput.files[0] || null;
  if (selectedLtoFile) wholesaleLtoStatus.textContent = `Selected: ${selectedLtoFile.name}`;
});

wholesalePermitInput.addEventListener("change", () => {
  selectedPermitFile = wholesalePermitInput.files[0] || null;
  if (selectedPermitFile) wholesalePermitStatus.textContent = `Selected: ${selectedPermitFile.name}`;
});

saveWholesaleBtn.addEventListener("click", async () => {
  const name = wholesaleNameInput.value.trim();

  if (!name) {
    wholesaleModalAlert.textContent = "Company name is required.";
    wholesaleModalAlert.classList.remove("d-none");
    return;
  }

  saveWholesaleBtn.disabled = true;
  wholesaleModalAlert.classList.add("d-none");

  try {
    let ltoDocumentUrl = existingLtoUrl;
    if (selectedLtoFile) ltoDocumentUrl = await uploadToCloudinary(selectedLtoFile);

    let permitDocumentUrl = existingPermitUrl;
    if (selectedPermitFile) permitDocumentUrl = await uploadToCloudinary(selectedPermitFile);

    const accountData = {
      name,
      contactPerson: wholesaleContactPersonInput.value.trim(),
      businessType: wholesaleBusinessTypeSelect.value,
      phone: wholesalePhoneInput.value.trim(),
      email: wholesaleEmailInput.value.trim(),
      address: wholesaleAddressInput.value.trim(),
      ltoDocumentUrl: ltoDocumentUrl || null,
      permitDocumentUrl: permitDocumentUrl || null,
      status: getToggleValue(wholesaleStatusToggle),
    };

    if (editingWholesaleId) {
      await db.collection("wholesaleAccounts").doc(editingWholesaleId).update(accountData);
    } else {
      accountData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("wholesaleAccounts").add(accountData);
    }

    bootstrap.Modal.getInstance(wholesaleModalEl).hide();
    await loadWholesaleAccounts();
  } catch (error) {
    wholesaleModalAlert.textContent = error.message || "Something went wrong saving this account. Please try again.";
    wholesaleModalAlert.classList.remove("d-none");
  } finally {
    saveWholesaleBtn.disabled = false;
  }
});

deleteWholesaleBtn.addEventListener("click", async () => {
  if (!editingWholesaleId) return;
  if (!confirm("Delete this wholesale account? This can't be undone.")) return;

  try {
    await db.collection("wholesaleAccounts").doc(editingWholesaleId).delete();
    bootstrap.Modal.getInstance(wholesaleModalEl).hide();
    await loadWholesaleAccounts();
  } catch (error) {
    alert("Something went wrong deleting this account. Please try again.");
  }
});

async function deleteWholesaleAccount(id) {
  if (!confirm("Delete this wholesale account? This can't be undone.")) return;
  try {
    await db.collection("wholesaleAccounts").doc(id).delete();
    await loadWholesaleAccounts();
  } catch (error) {
    alert("Something went wrong deleting this account. Please try again.");
  }
}

/* ---------- Process Wholesale Order ---------- */
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

function populateOrderProductSelect(selectEl) {
  selectEl.innerHTML = SAMPLE_PRODUCTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("");
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

function addProcessOrderItemRow() {
  processOrderItemCount += 1;
  const row = document.createElement("div");
  row.className = "repeater-item";
  row.innerHTML = `
    <p class="repeater-label">Item ${processOrderItemCount}</p>
    <button type="button" class="repeater-remove-btn" aria-label="Remove item"><i class="bi bi-x-lg"></i></button>
    <div class="row g-3">
      <div class="col-md-5">
        <label class="form-label">Product</label>
        <select class="form-select order-product-select"></select>
      </div>
      <div class="col-md-3">
        <label class="form-label">Qty</label>
        <input type="number" min="1" class="form-control order-qty-input" value="1">
      </div>
      <div class="col-md-4">
        <label class="form-label">Unit Price (&#8369;)</label>
        <input type="number" min="0" step="0.01" class="form-control order-price-input">
      </div>
    </div>
  `;
  processOrderItemsContainer.appendChild(row);

  row.querySelector(".repeater-remove-btn").addEventListener("click", () => {
    destroyChoicesIn(row);
    row.remove();
    renumberItems(processOrderItemsContainer);
    updateRemoveButtonsVisibility(processOrderItemsContainer);
    recalcProcessOrderTotal();
  });

  const productSelect = row.querySelector(".order-product-select");
  populateOrderProductSelect(productSelect);

  const priceInput = row.querySelector(".order-price-input");
  const setDefaultPrice = () => {
    const product = getProductById(productSelect.value);
    priceInput.value = product ? product.wholesalePrice || 0 : 0;
    recalcProcessOrderTotal();
  };
  setDefaultPrice();
  productSelect.addEventListener("change", setDefaultPrice);
  priceInput.addEventListener("input", recalcProcessOrderTotal);
  row.querySelector(".order-qty-input").addEventListener("input", recalcProcessOrderTotal);

  updateRemoveButtonsVisibility(processOrderItemsContainer);
}

processOrderAddItemBtn.addEventListener("click", addProcessOrderItemRow);

function recalcProcessOrderTotal() {
  const rows = Array.from(processOrderItemsContainer.querySelectorAll(".repeater-item"));
  let total = 0;
  for (const row of rows) {
    const qty = parseFloat(row.querySelector(".order-qty-input").value) || 0;
    const price = parseFloat(row.querySelector(".order-price-input").value) || 0;
    total += qty * price;
  }
  processOrderTotal.textContent = formatPeso(total);
}

function openProcessOrderModal(account) {
  if (!account) return;
  processingAccountId = account.id;
  processOrderAlert.classList.add("d-none");

  processOrderBuyerName.textContent = account.name;
  processOrderBuyerContact.textContent = `${account.contactPerson || "-"} · ${account.phone || "-"} · ${account.email || "-"}`;

  const docLinks = [];
  if (account.ltoDocumentUrl) docLinks.push(`<a href="${account.ltoDocumentUrl}" target="_blank" rel="noopener">LTO</a>`);
  if (account.permitDocumentUrl) docLinks.push(`<a href="${account.permitDocumentUrl}" target="_blank" rel="noopener">Permit</a>`);
  processOrderDocuments.innerHTML = docLinks.length ? docLinks.join(" &middot; ") : '<span class="text-muted">No documents on file</span>';

  processOrderPoRefInput.value = "";
  processOrderPoDocInput.value = "";
  selectedPoDocFile = null;
  processOrderNotesInput.value = "";

  destroyChoicesIn(processOrderItemsContainer);
  processOrderItemsContainer.innerHTML = "";
  processOrderItemCount = 0;
  addProcessOrderItemRow();
  recalcProcessOrderTotal();

  bootstrap.Modal.getOrCreateInstance(processOrderModalEl).show();
}

processOrderPoDocInput.addEventListener("change", () => {
  selectedPoDocFile = processOrderPoDocInput.files[0] || null;
});

confirmProcessOrderBtn.addEventListener("click", async () => {
  if (!processingAccountId) return;

  const rows = Array.from(processOrderItemsContainer.querySelectorAll(".repeater-item"));
  const items = rows.map((row) => ({
    productId: row.querySelector(".order-product-select").value,
    qty: parseInt(row.querySelector(".order-qty-input").value, 10),
    unitPrice: parseFloat(row.querySelector(".order-price-input").value),
  }));

  const invalid = items.some((it) => !it.productId || !it.qty || it.qty <= 0 || isNaN(it.unitPrice) || it.unitPrice < 0);
  if (invalid || items.length === 0) {
    processOrderAlert.textContent = "Every item needs a product, a quantity, and a unit price.";
    processOrderAlert.classList.remove("d-none");
    return;
  }

  confirmProcessOrderBtn.disabled = true;
  processOrderAlert.classList.add("d-none");

  try {
    for (const item of items) {
      await deductStockFEFO(item.productId, item.qty);
    }

    let poDocumentUrl = null;
    if (selectedPoDocFile) poDocumentUrl = await uploadToCloudinary(selectedPoDocFile);

    let total = 0;
    for (const it of items) {
      total += it.qty * it.unitPrice;
    }
    const account = allWholesaleAccounts.find((w) => w.id === processingAccountId);

    const orderItems = items.map((it) => {
      const product = getProductById(it.productId);
      return {
        productId: it.productId,
        productName: product ? product.name : it.productId,
        qty: it.qty,
        unitPrice: it.unitPrice,
        subtotal: it.qty * it.unitPrice,
      };
    });

    await db.collection("wholesaleOrders").add({
      wholesaleAccountId: processingAccountId,
      buyerName: account ? account.name : "",
      items: orderItems,
      total,
      poRefNumber: processOrderPoRefInput.value.trim(),
      poDocumentUrl,
      notes: processOrderNotesInput.value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await logAuditEvent({
      action: "Wholesale Order Recorded",
      details: `${account ? account.name : ""} - ${orderItems.length} item(s), Total ${formatPeso(total)}`,
    });

    bootstrap.Modal.getInstance(processOrderModalEl).hide();
    alert("Wholesale order recorded and stock deducted successfully.");
  } catch (error) {
    processOrderAlert.textContent = error.message || "Something went wrong recording this order. Please try again.";
    processOrderAlert.classList.remove("d-none");
  } finally {
    confirmProcessOrderBtn.disabled = false;
  }
});
