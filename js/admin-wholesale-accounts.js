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
const processOrderPaymentSelect = document.getElementById("processOrderPaymentSelect");
const processOrderTotal = document.getElementById("processOrderTotal");
const confirmProcessOrderBtn = document.getElementById("confirmProcessOrderBtn");
const wholesaleLtoExpiryInput = document.getElementById("wholesaleLtoExpiryInput");
const wholesalePermitExpiryInput = document.getElementById("wholesalePermitExpiryInput");
const processOrderFreeCheck = document.getElementById("processOrderFreeCheck");
const processOrderFreeReasonInput = document.getElementById("processOrderFreeReasonInput");

// LTO / Business Permit validity (REQ086): "expired", "expiring" (within
// 30 days), "valid", or "missing" when no date is on file.
function documentValidity(dateStr) {
  if (!dateStr) return "missing";
  const end = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  if (end < now) return "expired";
  if (end - now < 30 * 24 * 60 * 60 * 1000) return "expiring";
  return "valid";
}

function documentBadges(account) {
  const badge = (label, dateStr) => {
    const v = documentValidity(dateStr);
    if (v === "expired") return `<span class="badge rounded-pill text-bg-danger me-1">${label} expired ${formatDateMDY(dateStr)}</span>`;
    if (v === "expiring") return `<span class="badge rounded-pill text-bg-warning me-1">${label} expires ${formatDateMDY(dateStr)}</span>`;
    if (v === "missing") return `<span class="badge rounded-pill text-bg-light border me-1">${label} date not set</span>`;
    return `<span class="badge rounded-pill text-bg-success me-1">${label} valid to ${formatDateMDY(dateStr)}</span>`;
  };
  return badge("LTO", account.ltoValidUntil) + badge("Permit", account.permitValidUntil);
}

document.addEventListener("admin:ready", loadWholesaleAccounts);

/* ---------- Load ---------- */
// Orders recorded but not yet picked up / delivered, per buyer. Orders
// saved before this existed have no releaseStatus and count as released.
let pendingReleaseByAccount = {};
async function loadPendingReleaseCounts() {
  pendingReleaseByAccount = {};
  try {
    const pending = await db.collection("wholesaleOrders").where("releaseStatus", "==", "pending").get();
    pending.docs.forEach((d) => {
      const id = d.data().wholesaleAccountId;
      pendingReleaseByAccount[id] = (pendingReleaseByAccount[id] || 0) + 1;
    });
  } catch (error) {
    console.warn("Couldn't load pending wholesale orders:", error);
  }
}

async function loadWholesaleAccounts() {
  try {
    await loadCatalogCache();
    const snapshot = await db.collection("wholesaleAccounts").get();
    allWholesaleAccounts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    await loadPendingReleaseCounts();
    renderWholesaleGrid();
    // Opened from the Dashboard's "Find a sale by SI No.": show that
    // buyer's purchase history once.
    const historyFor = new URLSearchParams(window.location.search).get("history");
    if (historyFor && !openedLinkedHistory) {
      openedLinkedHistory = true;
      const account = allWholesaleAccounts.find((w) => w.id === historyFor);
      if (account) openHistoryModal(account);
    }
  } catch (error) {
    console.error("Failed to load wholesale accounts:", error);
  }
}
let openedLinkedHistory = false;

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
    document.querySelectorAll(".wholesale-history-btn").forEach((btn) => {
      btn.addEventListener("click", () => openHistoryModal(allWholesaleAccounts.find((w) => w.id === btn.dataset.id)));
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
              <p class="fw-bold mb-0">${escapeHtml(account.name)}</p>
              <p class="text-muted mb-0" style="font-size:0.88rem;">${escapeHtml(account.contactPerson || "-")}</p>
            </div>
          </div>
          <span class="badge rounded-pill ${account.status === "active" ? "text-bg-success" : "text-bg-secondary"}">
            ${account.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
        <p class="contact-line"><i class="bi bi-briefcase"></i> ${BUSINESS_TYPE_LABELS[account.businessType] || "-"}</p>
        <p class="contact-line"><i class="bi bi-telephone"></i> ${escapeHtml(account.phone || "-")}</p>
        <p class="contact-line"><i class="bi bi-envelope"></i> ${escapeHtml(account.email || "-")}</p>
        <p class="contact-line mb-2"><i class="bi bi-geo-alt"></i> ${escapeHtml(account.address || "-")}</p>
        <div class="mb-3" style="font-size:0.75rem;">${documentBadges(account)}${
          pendingReleaseByAccount[account.id]
            ? ` <span class="badge text-bg-warning">${pendingReleaseByAccount[account.id]} order${pendingReleaseByAccount[account.id] === 1 ? "" : "s"} pending release</span>`
            : ""
        }</div>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <button type="button" class="btn btn-amson flex-fill process-order-btn" data-id="${account.id}"><i class="bi bi-cart-check me-1"></i>Process Order</button>
          <button type="button" class="icon-btn wholesale-history-btn" data-id="${account.id}" aria-label="Purchase history" title="Purchase history"><i class="bi bi-clock-history"></i></button>
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

// Agreed prices (REQ085) are set from Process Order; here they can be
// reviewed and removed.
let editingAgreedPrices = {};

function renderAgreedPrices() {
  const el = document.getElementById("wholesaleAgreedPrices");
  // The list isn't shown in the form any more; prices still prefill orders.
  if (!el) return;
  const entries = Object.entries(editingAgreedPrices);
  if (!entries.length) {
    el.innerHTML = '<p class="text-muted mb-0" style="font-size:0.82rem;">None yet. Tick "Save these prices" when processing an order to set them.</p>';
    return;
  }
  el.innerHTML = entries
    .map(([pid, price]) => `
      <div class="d-flex justify-content-between align-items-center border-bottom py-1" style="font-size:0.85rem;">
        <span>${escapeHtml((getProductById(pid) || {}).name || pid)}</span>
        <span>${formatPeso(price)} <button type="button" class="icon-btn agreed-price-remove-btn" data-id="${pid}" aria-label="Remove agreed price"><i class="bi bi-x-lg"></i></button></span>
      </div>`)
    .join("");
  el.querySelectorAll(".agreed-price-remove-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      delete editingAgreedPrices[btn.dataset.id];
      renderAgreedPrices();
    })
  );
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
  wholesaleLtoExpiryInput.value = "";
  wholesalePermitExpiryInput.value = "";
  editingAgreedPrices = {};
  renderAgreedPrices();
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
  editingAgreedPrices = { ...(account.agreedPrices || {}) };
  renderAgreedPrices();
  wholesaleLtoExpiryInput.value = account.ltoValidUntil || "";
  wholesalePermitExpiryInput.value = account.permitValidUntil || "";
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
    if (selectedLtoFile) ltoDocumentUrl = await uploadToCloudinary(selectedLtoFile, { kind: "document" });

    let permitDocumentUrl = existingPermitUrl;
    if (selectedPermitFile) permitDocumentUrl = await uploadToCloudinary(selectedPermitFile, { kind: "document" });

    const accountData = {
      name,
      contactPerson: wholesaleContactPersonInput.value.trim(),
      businessType: wholesaleBusinessTypeSelect.value,
      phone: wholesalePhoneInput.value.trim(),
      email: wholesaleEmailInput.value.trim(),
      address: wholesaleAddressInput.value.trim(),
      ltoDocumentUrl: ltoDocumentUrl || null,
      permitDocumentUrl: permitDocumentUrl || null,
      agreedPrices: editingAgreedPrices,
      ltoValidUntil: wholesaleLtoExpiryInput.value || null,
      permitValidUntil: wholesalePermitExpiryInput.value || null,
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
  if (!(await showAppConfirm("Delete this wholesale account? This can't be undone.", { confirmLabel: "Delete" }))) return;

  try {
    await db.collection("wholesaleAccounts").doc(editingWholesaleId).delete();
    bootstrap.Modal.getInstance(wholesaleModalEl).hide();
    await loadWholesaleAccounts();
  } catch (error) {
    showAppAlert("Something went wrong deleting this account. Please try again.");
  }
});

async function deleteWholesaleAccount(id) {
  if (!(await showAppConfirm("Delete this wholesale account? This can't be undone.", { confirmLabel: "Delete" }))) return;
  try {
    await db.collection("wholesaleAccounts").doc(id).delete();
    await loadWholesaleAccounts();
  } catch (error) {
    showAppAlert("Something went wrong deleting this account. Please try again.");
  }
}

/* ---------- Process Wholesale Order ---------- */
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

function populateOrderProductSelect(selectEl) {
  // Only products that can be sold: active and already priced.
  selectEl.innerHTML = SAMPLE_PRODUCTS.filter((p) => p.status === "active" && !p.pricePending)
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");
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
        <div class="form-check mt-1">
          <input class="form-check-input order-free-check" type="checkbox" id="orderFreeCheck${processOrderItemCount}">
          <label class="form-check-label" for="orderFreeCheck${processOrderItemCount}" style="font-size:0.85rem;">Free (&#8369;0)</label>
        </div>
      </div>
    </div>
  `;
  processOrderItemsContainer.appendChild(row);

  row.querySelector(".repeater-remove-btn").addEventListener("click", () => {
    destroyChoicesIn(row);
    row.remove();
    renumberItems(processOrderItemsContainer);
    updateRemoveButtonsVisibility(processOrderItemsContainer);
    updateFreeReasonVisibility();
    recalcProcessOrderTotal();
  });

  const productSelect = row.querySelector(".order-product-select");
  populateOrderProductSelect(productSelect);

  const priceInput = row.querySelector(".order-price-input");
  const freeCheck = row.querySelector(".order-free-check");
  const priceNote = document.createElement("p");
  priceNote.className = "text-muted mb-0 mt-1";
  priceNote.style.fontSize = "0.75rem";
  priceInput.insertAdjacentElement("afterend", priceNote);
  // This buyer's agreed price (REQ085) when there is one, else the
  // product's standard wholesale price.
  const setDefaultPrice = () => {
    const product = getProductById(productSelect.value);
    const account = allWholesaleAccounts.find((w) => w.id === processingAccountId);
    const agreed = account && account.agreedPrices ? account.agreedPrices[productSelect.value] : undefined;
    // No wholesale price on the product: left empty (the order can't be
    // saved until a price is typed), never a silent 0.
    const standard = product && product.wholesalePrice > 0 ? product.wholesalePrice : null;
    // Free: the whole order (free-of-cost distribution) or just this item.
    const free = processOrderFreeCheck.checked || freeCheck.checked;
    priceInput.disabled = free;
    freeCheck.disabled = processOrderFreeCheck.checked;
    if (free) priceInput.value = 0;
    else priceInput.value = agreed != null ? agreed : standard != null ? standard : "";
    const missing = !free && agreed == null && standard == null;
    priceNote.textContent = free
      ? "Free item"
      : agreed != null ? "Agreed price for this buyer" : standard != null ? "Standard wholesale price" : "No wholesale price set for this product - type the price";
    priceNote.classList.toggle("text-danger", missing);
    priceNote.classList.toggle("text-muted", !missing);
    updateFreeReasonVisibility();
    recalcProcessOrderTotal();
  };
  row._setDefaultPrice = setDefaultPrice;
  setDefaultPrice();
  productSelect.addEventListener("change", setDefaultPrice);
  freeCheck.addEventListener("change", setDefaultPrice);
  priceInput.addEventListener("input", recalcProcessOrderTotal);
  row.querySelector(".order-qty-input").addEventListener("input", recalcProcessOrderTotal);

  updateRemoveButtonsVisibility(processOrderItemsContainer);
}

processOrderAddItemBtn.addEventListener("click", addProcessOrderItemRow);

// One reason covers a free-of-cost order or any items given free in it.
function updateFreeReasonVisibility() {
  const anyFreeItem = !!processOrderItemsContainer.querySelector(".order-free-check:checked");
  processOrderFreeReasonInput.classList.toggle("d-none", !(processOrderFreeCheck.checked || anyFreeItem));
}

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
  processOrderPaymentSelect.value = "cash";
  processOrderFreeCheck.checked = false;
  document.getElementById("processOrderSavePricesCheck").checked = false;
  processOrderFreeReasonInput.value = "";
  processOrderFreeReasonInput.classList.add("d-none");

  const expiredDocs = [
    documentValidity(account.ltoValidUntil) === "expired" ? "LTO" : null,
    documentValidity(account.permitValidUntil) === "expired" ? "Business Permit" : null,
  ].filter(Boolean);
  if (expiredDocs.length) {
    processOrderAlert.textContent = `This buyer's ${expiredDocs.join(" and ")} has expired. Ask for an updated copy before selling - the order can't be recorded until it's updated.`;
    processOrderAlert.classList.remove("d-none");
  }

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
    free: row.querySelector(".order-free-check").checked,
  }));

  const buyer = allWholesaleAccounts.find((w) => w.id === processingAccountId);
  if (buyer && (documentValidity(buyer.ltoValidUntil) === "expired" || documentValidity(buyer.permitValidUntil) === "expired")) {
    processOrderAlert.textContent = "This buyer's LTO or Business Permit has expired. Update the document and its date in Edit first.";
    processOrderAlert.classList.remove("d-none");
    return;
  }

  const freeOfCost = processOrderFreeCheck.checked;
  const freeReason = processOrderFreeReasonInput.value.trim();
  if (freeOfCost) items.forEach((it) => (it.free = false));
  items.forEach((it) => {
    if (freeOfCost || it.free) it.unitPrice = 0;
  });
  const freeItems = items.filter((it) => it.free);
  if ((freeOfCost || freeItems.length) && !freeReason) {
    processOrderAlert.textContent = freeOfCost
      ? "A reason is required for a free-of-cost distribution."
      : "A reason is required for the items given free.";
    processOrderAlert.classList.remove("d-none");
    return;
  }

  const invalid = items.some((it) => !it.productId || !it.qty || it.qty <= 0 || isNaN(it.unitPrice) || it.unitPrice < 0);
  if (invalid || items.length === 0) {
    processOrderAlert.textContent = "Every item needs a product, a quantity, and a unit price (type one where it says no wholesale price is set).";
    processOrderAlert.classList.remove("d-none");
    return;
  }

  confirmProcessOrderBtn.disabled = true;
  processOrderAlert.classList.add("d-none");

  try {
    // Upload first: a failed upload shouldn't leave stock already deducted.
    let poDocumentUrl = null;
    if (selectedPoDocFile) poDocumentUrl = await uploadToCloudinary(selectedPoDocFile, { kind: "document" });

    let total = 0;
    for (const it of items) {
      total += it.qty * it.unitPrice;
    }
    const account = allWholesaleAccounts.find((w) => w.id === processingAccountId);
    const paymentMethod = processOrderPaymentSelect.value;

    const orderItems = items.map((it) => {
      const product = getProductById(it.productId);
      return {
        productId: it.productId,
        productName: product ? product.name : it.productId,
        qty: it.qty,
        unitPrice: it.unitPrice,
        subtotal: it.qty * it.unitPrice,
        ...(it.free ? { free: true } : {}),
      };
    });

    // Stock deduction, SI# and the order record in one transaction.
    const orderRef = db.collection("wholesaleOrders").doc();
    const { invoiceNo } = await deductStockFEFOMultiple(items, {
      includeWholesaleOnly: true,
      record: {
        ref: orderRef,
        mode: "set",
        build: (allocations, invoiceNo) => ({
          invoiceNo,
          wholesaleAccountId: processingAccountId,
          buyerName: account ? account.name : "",
          items: orderItems.map((item, idx) => ({ ...item, ...batchFieldsFromAllocation(allocations[idx]) })),
          total,
          paymentMethod: freeOfCost ? "free_of_cost" : paymentMethod,
          freeOfCost,
          freeOfCostReason: freeOfCost ? freeReason : null,
          freeItemsReason: !freeOfCost && freeItems.length ? freeReason : null,
          contactPerson: account ? account.contactPerson || "" : "",
          buyerAddress: account ? account.address || "" : "",
          poRefNumber: processOrderPoRefInput.value.trim(),
          poDocumentUrl,
          notes: processOrderNotesInput.value.trim(),
          // Pending until the client picks it up or it's delivered.
          releaseStatus: "pending",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }),
      },
    });

    await logAuditEvent(
      freeOfCost
        ? {
            action: "Free-of-Cost Distribution",
            details: `SI ${invoiceNo} - ${account ? account.name : ""} - ${orderItems.map((it) => `${it.productName} x${it.qty}`).join(", ")}. Reason: ${freeReason}`,
            record: `SI ${invoiceNo} - ${account ? account.name : ""}`,
            after: `${orderItems.map((it) => `${it.productName} x${it.qty}`).join(", ")} at ${formatPeso(0)}`,
            reason: freeReason,
          }
        : {
            action: "Wholesale Order Recorded",
            details: `SI ${invoiceNo} - ${account ? account.name : ""} - ${orderItems.length} item(s), Total ${formatPeso(total)}, ${SALE_RECEIPT_PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod}`,
          }
    );
    if (!freeOfCost && freeItems.length) {
      const freeList = orderItems.filter((it) => it.free).map((it) => `${it.productName} x${it.qty}`).join(", ");
      await logAuditEvent({
        action: "Wholesale Free Items",
        details: `SI ${invoiceNo} - ${account ? account.name : ""} - free: ${freeList}. Reason: ${freeReason}`,
        record: `SI ${invoiceNo} - ${account ? account.name : ""}`,
        after: `${freeList} at ${formatPeso(0)}`,
        reason: freeReason,
      });
    }

    // Remember the prices used as this buyer's agreed prices (REQ085).
    if (!freeOfCost && document.getElementById("processOrderSavePricesCheck").checked && account) {
      const agreedPrices = { ...(account.agreedPrices || {}) };
      // A free item's 0 is a one-off, not the buyer's price.
      items.filter((it) => !it.free).forEach((it) => (agreedPrices[it.productId] = it.unitPrice));
      try {
        await db.collection("wholesaleAccounts").doc(account.id).update({ agreedPrices });
        account.agreedPrices = agreedPrices;
        await logAuditEvent({
          action: "Wholesale Agreed Prices Saved",
          details: `${account.name}: ${items.map((it) => `${(getProductById(it.productId) || {}).name || it.productId} ${formatPeso(it.unitPrice)}`).join(", ")}`,
        });
      } catch (error) {
        console.error("Failed to save agreed prices:", error);
      }
    }

    bootstrap.Modal.getInstance(processOrderModalEl).hide();
    await loadWholesaleAccounts();
    const saved = await orderRef.get();
    const print = await showAppConfirm(`Wholesale order recorded (SI No. ${invoiceNo}) and stock deducted. Mark it Released in the buyer's purchase history once it's picked up or delivered.`, {
      title: "Order Recorded",
      confirmLabel: "Print Sales Invoice",
      cancelLabel: "Close",
    });
    if (print && saved.exists) downloadWholesaleInvoice({ id: saved.id, ...saved.data() }, { print: true });
  } catch (error) {
    processOrderAlert.textContent = error.message || "Something went wrong recording this order. Please try again.";
    processOrderAlert.classList.remove("d-none");
  } finally {
    confirmProcessOrderBtn.disabled = false;
  }
});

processOrderFreeCheck.addEventListener("change", () => {
  // Each row sets its own price: 0 while the whole order is free, back to
  // its usual price (unless that item is ticked free) when unticked.
  processOrderItemsContainer.querySelectorAll(".repeater-item").forEach((row) => row._setDefaultPrice && row._setDefaultPrice());
  updateFreeReasonVisibility();
  recalcProcessOrderTotal();
});

/* ---------- Purchase history (REQ089) ---------- */
let historyOrders = [];

async function openHistoryModal(account) {
  if (!account) return;
  document.getElementById("wholesaleHistoryBuyer").textContent = account.name;
  const body = document.getElementById("wholesaleHistoryBody");
  const empty = document.getElementById("wholesaleHistoryEmpty");
  body.innerHTML = '<tr><td colspan="7" class="text-muted">Loading...</td></tr>';
  empty.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("wholesaleHistoryModal")).show();

  try {
    const snapshot = await db.collection("wholesaleOrders").where("wholesaleAccountId", "==", account.id).get();
    historyOrders = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0) - (a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0));
  } catch (error) {
    body.innerHTML = '<tr><td colspan="7" class="text-danger">Could not load the history. Please try again.</td></tr>';
    return;
  }

  if (!historyOrders.length) {
    body.innerHTML = "";
    empty.classList.remove("d-none");
    return;
  }
  body.innerHTML = historyOrders
    .map(
      (o) => `<tr>
        <td class="fw-medium">${escapeHtml(o.invoiceNo || "-")}</td>
        <td>${formatDateMDY(o.createdAt)}</td>
        <td>${(o.items || []).map((it) => `${escapeHtml(it.productName)} x${it.qty}${it.free ? ` <span class="text-success">(free)</span>` : ""}${it.returnedQty ? ` <span class="text-danger">(${it.returnedQty} exchanged)</span>` : ""}`).join(", ")}</td>
        <td>${formatPeso(o.total || 0)}</td>
        <td>${o.freeOfCost ? "Free of cost" : escapeHtml(SALE_RECEIPT_PAYMENT_METHOD_LABELS[o.paymentMethod] || o.paymentMethod || "-")}</td>
        <td>${
          o.releaseStatus === "pending"
            ? '<span class="badge text-bg-warning">Pending</span>'
            : `<span class="badge text-bg-success">Released</span>${o.releasedAt ? `<div class="text-muted" style="font-size:0.75rem;">${formatDateMDY(o.releasedAt)}${o.releasedBy ? ` - ${escapeHtml(o.releasedBy)}` : ""}</div>` : ""}`
        }</td>
        <td class="text-nowrap">
          ${o.releaseStatus === "pending" ? `<button type="button" class="btn btn-amson btn-sm wholesale-release-btn" data-id="${o.id}">Mark Released</button>` : ""}
          <button type="button" class="btn btn-outline-dark-amson btn-sm wholesale-invoice-btn" data-id="${o.id}"><i class="bi bi-printer me-1"></i>Print Invoice</button>
          <button type="button" class="btn btn-outline-dark-amson btn-sm wholesale-exchange-btn" data-id="${o.id}">Exchange</button>
        </td>
      </tr>`
    )
    .join("");
  body.querySelectorAll(".wholesale-invoice-btn").forEach((btn) => {
    btn.addEventListener("click", () => downloadWholesaleInvoice(historyOrders.find((o) => o.id === btn.dataset.id), { print: true }));
  });
  body.querySelectorAll(".wholesale-exchange-btn").forEach((btn) => {
    btn.addEventListener("click", () => openExchangeDialog(historyOrders.find((o) => o.id === btn.dataset.id), account));
  });
  body.querySelectorAll(".wholesale-release-btn").forEach((btn) => {
    btn.addEventListener("click", () => markWholesaleOrderReleased(historyOrders.find((o) => o.id === btn.dataset.id), account, btn));
  });
}

// The client has picked up the order, or it has been delivered.
async function markWholesaleOrderReleased(order, account, btn) {
  if (!order) return;
  const ok = await showAppConfirm(`Mark SI ${order.invoiceNo || ""} as released to ${account.name} (picked up or delivered)?`, {
    title: "Release Wholesale Order",
    confirmLabel: "Mark Released",
  });
  if (!ok) return;
  btn.disabled = true;
  try {
    await db.collection("wholesaleOrders").doc(order.id).update({
      releaseStatus: "released",
      releasedAt: firebase.firestore.FieldValue.serverTimestamp(),
      releasedBy: wholesaleStaffName,
    });
    await logAuditEvent({ action: "Wholesale Order Released", details: `SI ${order.invoiceNo || order.id} - ${account.name}` });
    await loadWholesaleAccounts();
    openHistoryModal(account);
  } catch (error) {
    btn.disabled = false;
    showAppAlert("Couldn't update this order. Please try again.");
  }
}

/* ---------- Wholesale exchange (REQ090, Fig 2.15) ---------- */
let wholesaleStaffName = "Staff";
document.addEventListener("admin:ready", (e) => {
  const admin = e.detail && e.detail.admin;
  if (admin) wholesaleStaffName = `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Staff";
});

async function openExchangeDialog(order, account) {
  if (!order) return;
  const lines = (order.items || []).map((it, idx) => ({ idx, it, left: it.qty - (it.returnedQty || 0) })).filter((l) => l.left > 0);
  if (!lines.length) {
    await showAppAlert("Every item on this order has already been returned.");
    return;
  }
  const productOptions = SAMPLE_PRODUCTS.filter((p) => p.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join("");

  const ok = await showAppConfirm(`Exchange items from SI No. ${order.invoiceNo || "-"} (${order.buyerName || ""}). No refunds: the replacement must be of equal or higher value.`, {
    title: "Wholesale Exchange",
    confirmLabel: "Process Exchange",
    fieldHtml: `
      <label class="form-label" for="exReturnLine">Item being returned</label>
      <select class="form-select mb-2" id="exReturnLine">
        ${lines.map((l) => `<option value="${l.idx}">${escapeHtml(l.it.productName)} - ${l.left} returnable @ ${formatPeso(l.it.unitPrice || 0)}</option>`).join("")}
      </select>
      <label class="form-label" for="exReturnQty">Quantity returned</label>
      <input type="number" class="form-control mb-3" id="exReturnQty" min="1" step="1" value="1">
      <label class="form-label" for="exReplacementProduct">Replacement item</label>
      <select class="form-select mb-2" id="exReplacementProduct">${productOptions}</select>
      <div class="row g-2 mb-2">
        <div class="col-6">
          <label class="form-label" for="exReplacementQty">Quantity</label>
          <input type="number" class="form-control" id="exReplacementQty" min="1" step="1" value="1">
        </div>
        <div class="col-6">
          <label class="form-label" for="exReplacementPrice">Unit price (₱)</label>
          <input type="number" class="form-control" id="exReplacementPrice" min="0" step="0.01">
        </div>
      </div>
      <p class="mb-3" style="font-size:0.85rem;" id="exDifferenceText"></p>
      <label class="form-label" for="exReason">Reason for exchange *</label>
      <textarea class="form-control" id="exReason" rows="2" placeholder="e.g. Wrong item delivered / damaged packaging"></textarea>
    `,
    onRender: () => {
      const lineSel = document.getElementById("exReturnLine");
      const retQty = document.getElementById("exReturnQty");
      const prodSel = document.getElementById("exReplacementProduct");
      const repQty = document.getElementById("exReplacementQty");
      const repPrice = document.getElementById("exReplacementPrice");
      const diffText = document.getElementById("exDifferenceText");
      const line = () => order.items[Number(lineSel.value)];
      const update = () => {
        const returned = (parseInt(retQty.value, 10) || 0) * (line().unitPrice || 0);
        const repl = (parseInt(repQty.value, 10) || 0) * (parseFloat(repPrice.value) || 0);
        const diff = repl - returned;
        diffText.innerHTML = `Returned value <strong>${formatPeso(returned)}</strong> - Replacement value <strong>${formatPeso(repl)}</strong> - ${
          diff >= 0 ? `Buyer pays <strong>${formatPeso(diff)}</strong>` : '<span class="text-danger">Replacement is worth less than the return (not allowed)</span>'
        }`;
      };
      const setDefaults = () => {
        prodSel.value = line().productId;
        const p = getProductById(prodSel.value);
        // Same product: the price this buyer actually paid on the order.
        repPrice.value = line().unitPrice || (p ? p.wholesalePrice || 0 : 0);
        retQty.max = String(order.items[Number(lineSel.value)].qty - (order.items[Number(lineSel.value)].returnedQty || 0));
        update();
      };
      lineSel.addEventListener("change", setDefaults);
      prodSel.addEventListener("change", () => {
        const p = getProductById(prodSel.value);
        const agreed = account && account.agreedPrices ? account.agreedPrices[prodSel.value] : null;
        repPrice.value =
          prodSel.value === line().productId ? line().unitPrice || 0 : agreed != null ? agreed : p ? p.wholesalePrice || 0 : 0;
        update();
      });
      [retQty, repQty, repPrice].forEach((el) => el.addEventListener("input", update));
      setDefaults();
    },
  });
  if (!ok) return;

  const payload = {
    orderId: order.id,
    lineIndex: Number(document.getElementById("exReturnLine").value),
    returnQty: parseInt(document.getElementById("exReturnQty").value, 10),
    replacement: {
      productId: document.getElementById("exReplacementProduct").value,
      qty: parseInt(document.getElementById("exReplacementQty").value, 10),
      unitPrice: parseFloat(document.getElementById("exReplacementPrice").value) || 0,
    },
    reason: document.getElementById("exReason").value,
    processedBy: wholesaleStaffName,
  };
  try {
    const exchange = await processWholesaleExchange(payload);
    catalogLoadPromise = null;
    await loadCatalogCache();
    const download = await showAppConfirm(
      `Exchange ${exchange.exchangeNo} recorded. Returned items are back in stock and the replacement was taken from stock (earliest expiry first).${exchange.priceDifference > 0 ? ` Collect ${formatPeso(exchange.priceDifference)} from the buyer.` : ""}`,
      { title: "Exchange Recorded", confirmLabel: "Download Exchange Document", cancelLabel: "Close" }
    );
    if (download) downloadExchangeDocument(exchange);
    openHistoryModal(account);
  } catch (error) {
    await showAppAlert(error.message || "Something went wrong recording the exchange. Please try again.");
  }
}

function downloadExchangeDocument(ex) {
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const doc = createPdf();
  let y = 18;
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text("Wholesale Exchange - Las Pinas Branch", 14, y);
  doc.setFont(undefined, "bold");
  doc.text(ex.exchangeNo || "", 196, 18, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.text(`Date: ${formatDateMDY(ex.createdAt || new Date())}`, 196, 24, { align: "right" });
  y += 10;
  [`Buyer: ${ex.buyerName || ""}`, `Original SI No.: ${ex.invoiceNo || "-"}  (purchased ${formatDateMDY(ex.purchasedAt)})`, `Reason: ${ex.reason || ""}`].forEach((line) => {
    doc.text(doc.splitTextToSize(line, 180), 14, y);
    y += 6;
  });
  const section = (title, part) => {
    y += 4;
    doc.setFont(undefined, "bold");
    doc.text(title, 14, y);
    doc.setFont(undefined, "normal");
    y += 6;
    (part.batches || []).forEach((b) => {
      doc.text(doc.splitTextToSize(`${part.productName}  -  Batch ${b.batchNo || "-"}, Exp ${b.expirationDate ? formatDateMDY(b.expirationDate) : "-"}  -  Qty ${b.qty}`, 182), 14, y);
      y += 6;
    });
    doc.text(`Qty ${part.qty} x ${reportSafeNumber(part.unitPrice)} = ${reportSafeNumber(part.value)}`, 196, y, { align: "right" });
    y += 4;
  };
  section("Returned", ex.returned || {});
  section("Replacement", ex.replacement || {});
  y += 6;
  doc.setFont(undefined, "bold");
  doc.text(`Price difference paid by buyer: ${reportSafeNumber(ex.priceDifference)}`, 14, y);
  doc.setFont(undefined, "normal");
  y += 16;
  doc.text("Received by: ______________________", 14, y);
  doc.text("Processed by: ______________________", 110, y);
  y += 6;
  doc.setFontSize(9);
  doc.text(ex.processedBy || "", 110, y);
  doc.save(`Amson-${ex.exchangeNo || "exchange"}.pdf`);
}

// Plain numbers for PDFs (the PDF font has no peso sign).
function reportSafeNumber(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- Wholesale sales invoice (REQ092) ---------- */
// The branch's own copy with buyer details, batch and expiry per line.
function downloadWholesaleInvoice(order, { print = false } = {}) {
  if (!order) return;
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }
  const doc = createPdf();
  let y = 18;
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text("Wholesale Sales Invoice - Las Pinas Branch", 14, y);
  doc.setFont(undefined, "bold");
  doc.text(`SI No. ${order.invoiceNo || "-"}`, 196, 18, { align: "right" });
  doc.setFont(undefined, "normal");
  doc.text(`Date: ${formatDateMDY(order.createdAt)}`, 196, 24, { align: "right" });

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Sold to", 14, y);
  doc.setFont(undefined, "normal");
  const buyerLines = [
    order.buyerName,
    order.contactPerson ? `Attn: ${order.contactPerson}` : "",
    order.buyerAddress,
    order.poRefNumber ? `Buyer PO No.: ${order.poRefNumber}` : "",
    `Terms: ${order.freeOfCost ? "Free of cost" : SALE_RECEIPT_PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod || "-"}`,
  ].filter(Boolean);
  buyerLines.forEach((line) => {
    y += 5;
    doc.text(String(line), 14, y);
  });

  y += 10;
  doc.setFont(undefined, "bold");
  const cols = [14, 86, 116, 140, 156, 176];
  ["Item", "Batch", "Expiry", "Qty", "Unit Price", "Amount"].forEach((h, i) => doc.text(h, i === 5 ? 196 : cols[i], y, i === 5 ? { align: "right" } : undefined));
  y += 2;
  doc.line(14, y, 196, y);
  doc.setFont(undefined, "normal");
  (order.items || []).forEach((it) => {
    y += 6;
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(doc.splitTextToSize(String(it.productName || ""), 70)[0], cols[0], y);
    doc.text(doc.splitTextToSize(String(it.batchNo || "-"), 28)[0], cols[1], y);
    doc.text(it.expirationDate ? formatDateMDY(it.expirationDate) : "-", cols[2], y);
    doc.text(String(it.qty), cols[3], y);
    // jsPDF's built-in font has no peso sign.
    doc.text(it.free ? "FREE" : reportSafeNumber(it.unitPrice), cols[4], y);
    doc.text(reportSafeNumber(it.subtotal), 196, y, { align: "right" });
  });
  y += 3;
  doc.line(14, y, 196, y);
  y += 7;
  doc.setFont(undefined, "bold");
  doc.text("Total", 14, y);
  doc.text(`PHP ${reportSafeNumber(order.total || 0)}`, 196, y, { align: "right" });
  doc.setFont(undefined, "normal");
  if (order.freeOfCost && order.freeOfCostReason) {
    y += 7;
    doc.text(`Free-of-cost distribution: ${order.freeOfCostReason}`, 14, y);
  }
  if (order.freeItemsReason) {
    y += 7;
    doc.text(doc.splitTextToSize(`Items marked FREE: ${order.freeItemsReason}`, 182)[0], 14, y);
  }
  y += 14;
  doc.text("Received by: ______________________", 14, y);
  doc.text("Released by: ______________________", 110, y);
  if (print) printPdf(doc, `Amson-SI-${order.invoiceNo || order.id}.pdf`);
  else doc.save(`Amson-SI-${order.invoiceNo || order.id}.pdf`);
}
