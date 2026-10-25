/**
 * Product Management admin page.
 */

const PRODUCTS_PAGE_SIZE = 8;

let allProducts = [];
let productsFilter = "all";
let productsSearchTerm = "";
let productsSortDesc = false;
let productsCurrentPage = 1;
let editingProductId = null;
let editingProductOriginal = null;
let selectedImageFile = null;
let existingImageUrl = null;

const filterButtons = Array.from(document.querySelectorAll(".order-filter-btn"));
const productsSearchInput = document.getElementById("productsSearchInput");
const productsSortBtn = document.getElementById("productsSortBtn");
const productsTableBody = document.getElementById("productsTableBody");
const productsTableEmpty = document.getElementById("productsTableEmpty");
const productsPagination = document.getElementById("productsPagination");
const addProductBtn = document.getElementById("addProductBtn");
const manageCategoriesBtn = document.getElementById("manageCategoriesBtn");

const productModalEl = document.getElementById("productModal");
const productModalTitle = document.getElementById("productModalTitle");
const productModalSubtitle = document.getElementById("productModalSubtitle");
const productModalAlert = document.getElementById("productModalAlert");
const productNameInput = document.getElementById("productNameInput");
const productGenericNameInput = document.getElementById("productGenericNameInput");
const productBrandInput = document.getElementById("productBrandInput");
const productCategorySelect = document.getElementById("productCategorySelect");
const productCostingInput = document.getElementById("productCostingInput");
const productRetailPriceInput = document.getElementById("productRetailPriceInput");
const productWholesalePriceInput = document.getElementById("productWholesalePriceInput");
const productReorderPointInput = document.getElementById("productReorderPointInput");
const productDescriptionInput = document.getElementById("productDescriptionInput");
const productDosageNotesInput = document.getElementById("productDosageNotesInput");
const productImageDropzone = document.getElementById("productImageDropzone");
const productImageInput = document.getElementById("productImageInput");
const productImageEmptyState = document.getElementById("productImageEmptyState");
const productImagePreviewState = document.getElementById("productImagePreviewState");
const productImagePreview = document.getElementById("productImagePreview");
const productAvailablePOS = document.getElementById("productAvailablePOS");
const productAvailableOnline = document.getElementById("productAvailableOnline");
const productRxToggle = document.getElementById("productRxToggle");
const productStatusToggle = document.getElementById("productStatusToggle");
const saveProductBtn = document.getElementById("saveProductBtn");
const deleteProductBtn = document.getElementById("deleteProductBtn");
const uploadBatchBtn = document.getElementById("uploadBatchBtn");
const downloadTemplateBtn = document.getElementById("downloadTemplateBtn");
const batchFileInput = document.getElementById("batchFileInput");
const batchUploadStatus = document.getElementById("batchUploadStatus");

const categoriesModalEl = document.getElementById("categoriesModal");
const categoriesList = document.getElementById("categoriesList");
const newCategoryNameInput = document.getElementById("newCategoryNameInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoriesAlert = document.getElementById("categoriesAlert");

const priceRestrictedNote = document.getElementById("priceRestrictedNote");
const priceRestrictedText = document.getElementById("priceRestrictedText");
const priceLockToggleBtn = document.getElementById("priceLockToggleBtn");

// Price lock state for the product open in the modal (REQ071-073 +
// Modules "price locking"): only a Branch Manager sets prices; a locked
// product's prices can't be edited until the Branch Manager unlocks them.
let priceLockedInForm = false;

let currentAdminRole = "admin";
document.addEventListener("admin:ready", (e) => {
  currentAdminRole = (e.detail && e.detail.admin && e.detail.admin.role) || "admin";
  if (!roleCanEditProducts(currentAdminRole)) {
    [manageCategoriesBtn, addProductBtn, uploadBatchBtn, downloadTemplateBtn].forEach((btn) => btn.classList.add("d-none"));
  }
});
document.addEventListener("admin:ready", loadProducts);

function canEditPrices() {
  return currentAdminRole === "admin" || currentAdminRole === "branch_manager";
}

/* ---------- Load ---------- */
async function ensureDefaultCategories() {
  const snapshot = await db.collection("categories").get();
  if (!snapshot.empty) return;

  const batch = db.batch();
  Object.entries(DEFAULT_CATEGORIES).forEach(([id, name]) => {
    batch.set(db.collection("categories").doc(id), { name });
  });
  await batch.commit();
}

async function loadProducts() {
  try {
    await ensureDefaultCategories();
    await loadCatalogCache();
    allProducts = SAMPLE_PRODUCTS.slice();
    renderCategorySelect();
    renderProductsTable();
  } catch (error) {
    console.error("Failed to load products:", error);
  }
}

const productShopSectionSelect = document.getElementById("productShopSectionSelect");
productShopSectionSelect.innerHTML =
  '<option value="">None (shows under All only)</option>' +
  SHOP_SECTIONS.map((sec) => `<option value="${sec.id}">${escapeHtml(sec.label)}</option>`).join("");

let categorySelectChoices = null;

function renderCategorySelect() {
  const choicesData = Object.entries(CATEGORY_LABELS).map(([id, name]) => ({ value: id, label: name }));

  if (categorySelectChoices) {
    categorySelectChoices.setChoices(choicesData, "value", "label", true);
  } else {
    productCategorySelect.innerHTML = choicesData
      .map((c) => `<option value="${c.value}">${c.label}</option>`)
      .join("");
    categorySelectChoices = new Choices(productCategorySelect, {
      searchEnabled: true,
      allowHTML: false,
      itemSelectText: "",
      shouldSort: false,
      fuseOptions: { threshold: 0.3 },
    });
  }
}

function setCategorySelectValue(value) {
  if (categorySelectChoices) {
    categorySelectChoices.setChoiceByValue(value);
  } else {
    productCategorySelect.value = value;
  }
}

/* ---------- Table ---------- */
function filteredProducts() {
  let filtered = allProducts.slice();

  if (productsFilter !== "all") {
    filtered = filtered.filter((p) => p.status === productsFilter);
  }

  if (productsSearchTerm) {
    const term = productsSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(term) ||
        (p.genericName || "").toLowerCase().includes(term) ||
        (p.sku || "").toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) =>
    productsSortDesc ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
  );

  return filtered;
}

function renderProductsTable() {
  const filtered = filteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PAGE_SIZE));
  productsCurrentPage = Math.min(productsCurrentPage, totalPages);

  const start = (productsCurrentPage - 1) * PRODUCTS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PRODUCTS_PAGE_SIZE);

  if (pageItems.length === 0) {
    productsTableBody.innerHTML = "";
    productsTableEmpty.classList.remove("d-none");
  } else {
    productsTableEmpty.classList.add("d-none");
    productsTableBody.innerHTML = pageItems.map(renderProductRow).join("");

    document.querySelectorAll(".view-product-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const product = allProducts.find((p) => p.id === btn.dataset.id);
        if (product) openEditModal(product);
      });
    });
  }

  renderProductsPagination(totalPages);
}

function renderProductRow(product) {
  return `
    <tr>
      <td class="fw-medium">${product.sku || "-"}</td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="product-thumb" ${product.imageUrl ? `style="background-image:url('${cloudinaryImageUrl(product.imageUrl, 120)}');"` : ""}></div>
          <span>${escapeHtml(product.name)}</span>
        </div>
      </td>
      <td>${escapeHtml(product.brand || "-")}</td>
      <td>${CATEGORY_LABELS[product.category] || "-"}</td>
      <td class="product-price">${formatPeso(product.retailPrice)}</td>
      <td>${product.rxRequired ? '<span class="badge rounded-pill text-bg-danger">Yes</span>' : '<span class="badge rounded-pill text-bg-light text-dark">No</span>'}</td>
      <td>
        ${product.status === "active" ? '<span class="badge rounded-pill text-bg-success">Active</span>' : '<span class="badge rounded-pill text-bg-secondary">Inactive</span>'}
        ${product.pricePending ? '<span class="badge rounded-pill text-bg-warning ms-1">Price pending</span>' : ""}
        ${product.priceLocked ? '<i class="bi bi-lock-fill text-muted ms-1" title="Prices locked"></i>' : ""}
      </td>
      <td><button type="button" class="icon-btn view-product-btn" data-id="${product.id}" aria-label="View / edit"><i class="bi bi-eye"></i></button></td>
    </tr>
  `;
}

function renderProductsPagination(totalPages) {
  if (totalPages <= 1) {
    productsPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${productsCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === productsCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${productsCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  productsPagination.innerHTML = html;
}

productsPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") productsCurrentPage -= 1;
  else if (btn.dataset.page === "next") productsCurrentPage += 1;
  else productsCurrentPage = Number(btn.dataset.page);
  renderProductsTable();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    productsFilter = btn.dataset.filter;
    productsCurrentPage = 1;
    renderProductsTable();
  });
});

productsSearchInput.addEventListener("input", () => {
  productsSearchTerm = productsSearchInput.value.trim();
  productsCurrentPage = 1;
  renderProductsTable();
});

productsSortBtn.addEventListener("click", () => {
  productsSortDesc = !productsSortDesc;
  renderProductsTable();
});


/* ---------- Segmented toggles ---------- */
function wireSegmentedToggle(container) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".segmented-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}
wireSegmentedToggle(productRxToggle);
wireSegmentedToggle(productStatusToggle);

function getToggleValue(container) {
  return container.querySelector(".segmented-toggle-btn.active").dataset.value;
}

function setToggleValue(container, value) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
}

/* ---------- Add / Edit modal ---------- */
function resetProductForm() {
  productNameInput.value = "";
  productGenericNameInput.value = "";
  productBrandInput.value = "";
  setCategorySelectValue(Object.keys(CATEGORY_LABELS)[0] || "");
  productCostingInput.value = "";
  productRetailPriceInput.value = "";
  productWholesalePriceInput.value = "";
  productReorderPointInput.value = "";
  productDescriptionInput.value = "";
  productDosageNotesInput.value = "";
  productShopSectionSelect.value = "";
  productAvailablePOS.checked = true;
  productAvailableOnline.checked = true;
  setToggleValue(productRxToggle, "no");
  setToggleValue(productStatusToggle, "active");
  selectedImageFile = null;
  existingImageUrl = null;
  productImageEmptyState.classList.remove("d-none");
  productImagePreviewState.classList.add("d-none");
  productModalAlert.classList.add("d-none");
  batchUploadStatus.textContent = "";

  productModalEl.querySelectorAll("input, textarea, select, .segmented-toggle-btn").forEach((el) => (el.disabled = false));
  if (categorySelectChoices) categorySelectChoices.enable();
  productImageDropzone.style.pointerEvents = "";
  saveProductBtn.classList.remove("d-none");
  priceLockedInForm = false;
  applyPriceFieldState();
}

function applyPriceFieldState() {
  const canEdit = canEditPrices();
  const disabled = !canEdit || priceLockedInForm;
  [productCostingInput, productRetailPriceInput, productWholesalePriceInput].forEach((input) => (input.disabled = disabled));

  let note = "";
  if (!canEdit) {
    note = editingProductId
      ? "Only a Branch Manager can change prices."
      : "Only a Branch Manager can set prices. This product will be saved as Inactive until a Branch Manager adds its prices.";
  } else if (priceLockedInForm) {
    note = "Prices are locked. Unlock them to make a change.";
  }
  priceRestrictedText.textContent = note;
  priceRestrictedNote.classList.toggle("d-none", !note);

  // Only a Branch Manager editing an existing product gets the lock switch.
  priceLockToggleBtn.classList.toggle("d-none", !(canEdit && editingProductId));
  priceLockToggleBtn.innerHTML = priceLockedInForm
    ? '<i class="bi bi-unlock me-1"></i>Unlock prices'
    : '<i class="bi bi-lock me-1"></i>Lock prices';
}

priceLockToggleBtn.addEventListener("click", () => {
  priceLockedInForm = !priceLockedInForm;
  applyPriceFieldState();
});

addProductBtn.addEventListener("click", () => {
  editingProductId = null;
  resetProductForm();
  productModalTitle.textContent = "Add Product";
  productModalSubtitle.textContent = "Add a product to the catalog";
  saveProductBtn.textContent = "Add Product";
  deleteProductBtn.style.display = "none";
  bootstrap.Modal.getOrCreateInstance(productModalEl).show();
});

function openEditModal(product) {
  editingProductId = product.id;
  editingProductOriginal = product;
  resetProductForm();

  productNameInput.value = product.name || "";
  productGenericNameInput.value = product.genericName || "";
  productBrandInput.value = product.brand || "";
  setCategorySelectValue(product.category || "");
  productCostingInput.value = product.costingPrice ?? "";
  productRetailPriceInput.value = product.retailPrice ?? "";
  productWholesalePriceInput.value = product.wholesalePrice ?? "";
  productReorderPointInput.value = product.reorderPoint ?? "";
  productDescriptionInput.value = product.description || "";
  productDosageNotesInput.value = product.dosageNotes || "";
  productShopSectionSelect.value = SHOP_SECTION_LABELS[product.shopSection] ? product.shopSection : "";
  productAvailablePOS.checked = !!product.availableInPOS;
  productAvailableOnline.checked = !!product.availableInOnlineStore;
  setToggleValue(productRxToggle, product.rxRequired ? "yes" : "no");
  setToggleValue(productStatusToggle, product.status || "active");
  priceLockedInForm = !!product.priceLocked;
  applyPriceFieldState();

  if (product.imageUrl) {
    existingImageUrl = product.imageUrl;
    productImagePreview.style.backgroundImage = `url('${cloudinaryImageUrl(product.imageUrl, 400)}')`;
    productImageEmptyState.classList.add("d-none");
    productImagePreviewState.classList.remove("d-none");
  }

  productModalTitle.textContent = "Edit Product";
  productModalSubtitle.textContent = `SKU ${product.sku}`;
  saveProductBtn.textContent = "Save Changes";
  deleteProductBtn.style.display = "inline-block";

  // Sales Staff can look up product details but not change them.
  const readOnly = !roleCanEditProducts(currentAdminRole);
  productModalEl.querySelectorAll("input, textarea, select, .segmented-toggle-btn").forEach((el) => (el.disabled = readOnly || el.disabled));
  if (categorySelectChoices) readOnly ? categorySelectChoices.disable() : categorySelectChoices.enable();
  productImageDropzone.style.pointerEvents = readOnly ? "none" : "";
  saveProductBtn.classList.toggle("d-none", readOnly);
  if (readOnly) {
    deleteProductBtn.style.display = "none";
    priceLockToggleBtn.classList.add("d-none");
    productModalTitle.textContent = "Product Details";
  }
  bootstrap.Modal.getOrCreateInstance(productModalEl).show();
}

productImageDropzone.addEventListener("click", () => productImageInput.click());

productImageInput.addEventListener("change", () => {
  const file = productImageInput.files[0];
  if (!file) return;
  selectedImageFile = file;
  productImagePreview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
  productImageEmptyState.classList.add("d-none");
  productImagePreviewState.classList.remove("d-none");
});

saveProductBtn.addEventListener("click", async () => {
  const name = productNameInput.value.trim();
  const category = productCategorySelect.value;
  const retailPrice = parseFloat(productRetailPriceInput.value);

  if (!name || !category || (canEditPrices() && isNaN(retailPrice))) {
    productModalAlert.textContent = canEditPrices()
      ? "Product name, category, and retail price are required."
      : "Product name and category are required.";
    productModalAlert.classList.remove("d-none");
    return;
  }

  const sameName = findProductByName(name, editingProductId);
  if (sameName) {
    productModalAlert.textContent = `"${sameName.name}" (${sameName.sku || "no SKU"}) is already in the catalog. Edit that product instead, or make this name different (for example add the brand or pack size).`;
    productModalAlert.classList.remove("d-none");
    return;
  }

  saveProductBtn.disabled = true;
  productModalAlert.classList.add("d-none");

  try {
    let imageUrl = existingImageUrl;
    if (selectedImageFile) {
      imageUrl = await uploadToCloudinary(selectedImageFile, { kind: "product" });
    }

    const productData = {
      name,
      genericName: productGenericNameInput.value.trim(),
      brand: productBrandInput.value.trim(),
      category,
      costingPrice: parseFloat(productCostingInput.value) || 0,
      retailPrice,
      wholesalePrice: parseFloat(productWholesalePriceInput.value) || 0,
      reorderPoint: parseInt(productReorderPointInput.value, 10) || DEFAULT_REORDER_POINT,
      description: productDescriptionInput.value.trim(),
      dosageNotes: productDosageNotesInput.value.trim(),
      shopSection: productShopSectionSelect.value || "",
      imageUrl: imageUrl || null,
      availableInPOS: productAvailablePOS.checked,
      availableInOnlineStore: productAvailableOnline.checked,
      rxRequired: getToggleValue(productRxToggle) === "yes",
      status: getToggleValue(productStatusToggle),
    };

    if (!canEditPrices()) {
      if (editingProductId) {
        // Keep whatever prices the Branch Manager set - never write them.
        delete productData.costingPrice;
        delete productData.retailPrice;
        delete productData.wholesalePrice;
        if (editingProductOriginal && editingProductOriginal.pricePending && productData.status === "active") {
          productData.status = "inactive";
          await showAppAlert("This product can't be made Active until a Branch Manager adds its prices. It was saved as Inactive.");
        }
      } else {
        productData.costingPrice = 0;
        productData.retailPrice = 0;
        productData.wholesalePrice = 0;
        productData.status = "inactive";
        productData.pricePending = true;
      }
    } else {
      productData.priceLocked = priceLockedInForm;
      productData.pricePending = false;
    }

    if (editingProductId) {
      const priceFields = [
        ["costingPrice", "Costing price"],
        ["retailPrice", "Retail price"],
        ["wholesalePrice", "Wholesale price"],
      ];
      const changedPriceFields = priceFields.filter(
        ([field]) => editingProductOriginal && field in productData && editingProductOriginal[field] !== productData[field]
      );
      const priceChanges = changedPriceFields.map(
        ([field, label]) => `${label}: ${formatPeso(editingProductOriginal[field])} → ${formatPeso(productData[field])}`
      );

      let priceChangeReason = "";
      if (priceChanges.length > 0) {
        // The client asked for a reason with every price change (Interview 2).
        priceChangeReason = (
          (await showAppPrompt(`Price change for ${productData.name}:\n${priceChanges.join("\n")}\n\nReason for the change:`, {
            title: "Confirm Price Change",
            confirmLabel: "Confirm Change",
          })) || ""
        ).trim();
        if (!priceChangeReason) {
          productModalAlert.textContent = "A reason is required to change a price. Nothing was saved.";
          productModalAlert.classList.remove("d-none");
          saveProductBtn.disabled = false;
          return;
        }
      }

      await db.collection("products").doc(editingProductId).update(productData);

      if (priceChanges.length > 0) {
        await logAuditEvent({
          action: "Price Change",
          details: `${productData.name} (${editingProductOriginal.sku || ""}) - ${priceChanges.join("; ")} - Reason: ${priceChangeReason}`,
          record: `${productData.name} (${editingProductOriginal.sku || ""})`,
          before: changedPriceFields.map(([field, label]) => `${label} ${formatPeso(editingProductOriginal[field])}`).join("; "),
          after: changedPriceFields.map(([field, label]) => `${label} ${formatPeso(productData[field])}`).join("; "),
          reason: priceChangeReason,
        });
      }
    } else {
      productData.sku = await generateProductSku();
      productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("products").add(productData);
    }

    catalogLoadPromise = null; // force a fresh read next time any page loads the cache
    bootstrap.Modal.getInstance(productModalEl).hide();
    await loadProducts();
  } catch (error) {
    productModalAlert.textContent = error.message || "Something went wrong saving this product. Please try again.";
    productModalAlert.classList.remove("d-none");
  } finally {
    saveProductBtn.disabled = false;
  }
});

deleteProductBtn.addEventListener("click", async () => {
  if (!editingProductId) return;

  const stockSnapshot = await db.collection("stockBatches").where("productId", "==", editingProductId).get();
  const hasStock = stockSnapshot.docs.some((doc) => (doc.data().quantity || 0) > 0);
  if (hasStock) {
    productModalAlert.textContent = "This product still has stock on hand. Write off its remaining batches in Inventory Management before deleting it.";
    productModalAlert.classList.remove("d-none");
    return;
  }

  if (!(await showAppConfirm("Delete this product? This can't be undone.", { confirmLabel: "Delete" }))) return;

  try {
    await db.collection("products").doc(editingProductId).delete();
    catalogLoadPromise = null;
    bootstrap.Modal.getInstance(productModalEl).hide();
    await loadProducts();
  } catch (error) {
    showAppAlert("Something went wrong deleting this product. Please try again.");
  }
});

/* ---------- Batch upload (Excel .xlsx/.xls or .csv, via SheetJS) ---------- */
const BATCH_TEMPLATE_HEADERS = [
  "name", "genericName", "brand", "category", "shopSection", "costingPrice", "retailPrice",
  "wholesalePrice", "description", "availableInPOS", "availableInOnlineStore",
  "rxRequired", "status",
];

uploadBatchBtn.addEventListener("click", () => batchFileInput.click());

downloadTemplateBtn.addEventListener("click", () => {
  const exampleRow = {
    name: "Biogesic 500mg", genericName: "Paracetamol", brand: "Biogesic", category: "Branded", shopSection: "Pain & Fever",
    costingPrice: 3.5, retailPrice: 8, wholesalePrice: 6.5, description: "For fever and pain relief",
    availableInPOS: "yes", availableInOnlineStore: "yes", rxRequired: "no", status: "active",
  };
  const ws = XLSX.utils.json_to_sheet([exampleRow], { header: BATCH_TEMPLATE_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  XLSX.writeFile(wb, "amson-product-import-template.xlsx");
});

const batchReviewModalEl = document.getElementById("batchReviewModal");
const batchReviewTableBody = document.getElementById("batchReviewTableBody");
const batchReviewAlert = document.getElementById("batchReviewAlert");
const batchReviewCount = document.getElementById("batchReviewCount");
const batchReviewAddRowBtn = document.getElementById("batchReviewAddRowBtn");
const batchReviewConfirmBtn = document.getElementById("batchReviewConfirmBtn");

function batchReviewRowHtml(row = {}) {
  const yes = (v) => /^(yes|true|1)$/i.test(v || "");
  return `
    <tr>
      <td>
        <div class="br-image-preview" style="width:40px;height:40px;border-radius:6px;background-color:#f2f2f4;background-size:cover;background-position:center;cursor:pointer;" title="Click to upload an image"></div>
        <input type="file" class="d-none br-image-input" accept="image/png,image/jpeg">
      </td>
      <td><input type="text" class="form-control form-control-sm br-name" value="${escapeHtml(row.name || "")}"><div class="br-dup-note d-none"></div></td>
      <td><input type="text" class="form-control form-control-sm br-genericname" value="${escapeHtml(row.genericname || "")}"></td>
      <td><input type="text" class="form-control form-control-sm br-brand" value="${escapeHtml(row.brand || "")}"></td>
      <td><input type="text" class="form-control form-control-sm br-category" value="${row.category || ""}"></td>
      <td>
        <select class="form-select form-select-sm br-shopsection">
          <option value="">None</option>
          ${SHOP_SECTIONS.map((sec) => `<option value="${sec.id}" ${resolveShopSection(row.shopsection || row["shop section"]) === sec.id ? "selected" : ""}>${escapeHtml(sec.label)}</option>`).join("")}
        </select>
      </td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-costingprice" value="${row.costingprice || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-retailprice" value="${row.retailprice || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-wholesaleprice" value="${row.wholesaleprice || ""}"></td>
      <td><input type="text" class="form-control form-control-sm br-description" value="${escapeHtml(row.description || "")}"></td>
      <td class="text-center"><input type="checkbox" class="form-check-input br-pos" ${!row.availableinpos || yes(row.availableinpos) ? "checked" : ""}></td>
      <td class="text-center"><input type="checkbox" class="form-check-input br-online" ${!row.availableinonlinestore || yes(row.availableinonlinestore) ? "checked" : ""}></td>
      <td class="text-center"><input type="checkbox" class="form-check-input br-rx" ${yes(row.rxrequired) ? "checked" : ""}></td>
      <td>
        <select class="form-select form-select-sm br-status">
          <option value="active" ${(row.status || "active").toLowerCase() !== "inactive" ? "selected" : ""}>Active</option>
          <option value="inactive" ${(row.status || "").toLowerCase() === "inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </td>
      <td><button type="button" class="icon-btn br-remove" aria-label="Remove row"><i class="bi bi-trash text-danger"></i></button></td>
    </tr>
  `;
}

// Marks rows whose product is already in the catalog, or that repeat an
// earlier row of the same file. Those rows are skipped on import.
function markBatchDuplicates() {
  const seen = new Map();
  let inCatalog = 0;
  let repeated = 0;
  Array.from(batchReviewTableBody.querySelectorAll("tr")).forEach((tr, index) => {
    const nameInput = tr.querySelector(".br-name");
    const note = tr.querySelector(".br-dup-note");
    const key = productNameKey(nameInput.value);
    let reason = "";
    const existing = key ? findProductByName(nameInput.value) : null;
    if (existing) {
      reason = `Already in the catalog (${existing.sku || existing.name}) - will be skipped`;
      inCatalog += 1;
    } else if (key && seen.has(key)) {
      reason = `Same as row ${seen.get(key) + 1} - will be skipped`;
      repeated += 1;
    } else if (key) {
      seen.set(key, index);
    }
    tr.classList.toggle("br-duplicate", !!reason);
    tr.dataset.duplicate = reason ? "1" : "";
    note.textContent = reason;
    note.classList.toggle("d-none", !reason);
  });
  return { inCatalog, repeated };
}

function updateBatchReviewCount() {
  const { inCatalog, repeated } = markBatchDuplicates();
  const rows = batchReviewTableBody.querySelectorAll("tr").length;
  const ready = rows - inCatalog - repeated;
  const skipped = [inCatalog ? `${inCatalog} already in the catalog` : "", repeated ? `${repeated} repeated in this file` : ""].filter(Boolean).join(", ");
  batchReviewCount.textContent = `${ready} product${ready === 1 ? "" : "s"} ready to import${skipped ? ` - ${skipped} will be skipped` : ""}`;
  batchReviewRemoveDupesBtn.classList.toggle("d-none", !(inCatalog + repeated));
  batchReviewRemoveDupesBtn.textContent = `Remove ${inCatalog + repeated} duplicate${inCatalog + repeated === 1 ? "" : "s"}`;
  batchReviewConfirmBtn.textContent = ready ? `Import ${ready} Product${ready === 1 ? "" : "s"}` : "Confirm Import";
}

const batchReviewRemoveDupesBtn = document.getElementById("batchReviewRemoveDupesBtn");
batchReviewRemoveDupesBtn.addEventListener("click", () => {
  batchReviewTableBody.querySelectorAll('tr[data-duplicate="1"]').forEach((tr) => tr.remove());
  updateBatchReviewCount();
});

let batchDupTimer = null;
batchReviewTableBody.addEventListener("input", (e) => {
  if (!e.target.classList.contains("br-name")) return;
  clearTimeout(batchDupTimer);
  batchDupTimer = setTimeout(updateBatchReviewCount, 250);
});

async function openBatchReviewModal(rows) {
  await hideModalAndWait(document.getElementById("productModal"));
  batchReviewAlert.classList.add("d-none");
  batchReviewTableBody.innerHTML = rows.map(batchReviewRowHtml).join("");
  updateBatchReviewCount();
  bootstrap.Modal.getOrCreateInstance(batchReviewModalEl).show();
}

batchReviewAddRowBtn.addEventListener("click", () => {
  batchReviewTableBody.insertAdjacentHTML("beforeend", batchReviewRowHtml());
  updateBatchReviewCount();
});

batchReviewTableBody.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".br-remove");
  if (removeBtn) {
    removeBtn.closest("tr").remove();
    updateBatchReviewCount();
    return;
  }

  const preview = e.target.closest(".br-image-preview");
  if (preview) {
    preview.closest("tr").querySelector(".br-image-input").click();
  }
});

batchReviewTableBody.addEventListener("change", (e) => {
  const input = e.target.closest(".br-image-input");
  if (!input) return;
  const file = input.files[0];
  if (!file) return;
  const preview = input.closest("tr").querySelector(".br-image-preview");
  preview.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
});

batchReviewConfirmBtn.addEventListener("click", async () => {
  const rowEls = Array.from(batchReviewTableBody.querySelectorAll("tr"));
  if (rowEls.length === 0) {
    batchReviewAlert.textContent = "There's nothing to import - add a row or cancel.";
    batchReviewAlert.classList.remove("d-none");
    return;
  }

  // Check against the catalog as it is now (someone may have added products
  // since the file was opened), then leave duplicates out.
  catalogLoadPromise = null;
  await loadCatalogCache();
  updateBatchReviewCount();
  const duplicateRows = rowEls.filter((tr) => tr.dataset.duplicate === "1");
  const importRows = rowEls.filter((tr) => tr.dataset.duplicate !== "1");
  if (!importRows.length) {
    batchReviewAlert.textContent = "Every product in this list is already in the catalog (or repeated) - there's nothing new to import.";
    batchReviewAlert.classList.remove("d-none");
    return;
  }

  let hasInvalid = false;
  rowEls.forEach((tr) => tr.classList.remove("table-danger"));
  const parsedRows = importRows.map((tr) => {
    const get = (cls) => tr.querySelector(`.${cls}`);
    const name = get("br-name").value.trim();
    const retailPrice = get("br-retailprice").value;
    if (!name || (canEditPrices() && retailPrice === "")) {
      tr.classList.add("table-danger");
      hasInvalid = true;
    }
    return {
      tr,
      imageFile: get("br-image-input").files[0] || null,
      name,
      genericName: get("br-genericname").value.trim(),
      brand: get("br-brand").value.trim(),
      category: get("br-category").value.trim(),
      shopSection: get("br-shopsection").value,
      costingPrice: parseFloat(get("br-costingprice").value) || 0,
      retailPrice: parseFloat(retailPrice) || 0,
      wholesalePrice: parseFloat(get("br-wholesaleprice").value) || 0,
      description: get("br-description").value.trim(),
      availableInPOS: get("br-pos").checked,
      availableInOnlineStore: get("br-online").checked,
      rxRequired: get("br-rx").checked,
      status: get("br-status").value,
    };
  });

  if (hasInvalid) {
    batchReviewAlert.textContent = canEditPrices()
      ? "Every product needs a Name and a Retail Price - fix the highlighted rows, or remove them."
      : "Every product needs a Name - fix the highlighted rows, or remove them.";
    batchReviewAlert.classList.remove("d-none");
    return;
  }

  batchReviewAlert.classList.add("d-none");
  batchReviewConfirmBtn.disabled = true;
  const skippedNames = duplicateRows.map((tr) => tr.querySelector(".br-name").value.trim());
  duplicateRows.forEach((tr) => tr.remove());
  await hideModalAndWait(batchReviewModalEl);
  showTaskProgress("Importing products", "Keep this page open until it finishes.");

  let imported = 0;
  const failedRows = [];
  for (const [index, row] of parsedRows.entries()) {
    updateTaskProgress(index, parsedRows.length, row.name);
    try {
      const categoryId = await resolveCategoryByName(row.category);
      const sku = await generateProductSku();
      const imageUrl = row.imageFile ? await uploadToCloudinary(row.imageFile, { kind: "product" }) : null;
      // Same price rule as the form: only a Branch Manager's import sets prices.
      const pricesAllowed = canEditPrices();
      await db.collection("products").add({
        sku,
        name: row.name,
        genericName: row.genericName,
        brand: row.brand,
        category: categoryId,
        shopSection: row.shopSection || "",
        costingPrice: pricesAllowed ? row.costingPrice : 0,
        retailPrice: pricesAllowed ? row.retailPrice : 0,
        wholesalePrice: pricesAllowed ? row.wholesalePrice : 0,
        pricePending: !pricesAllowed,
        description: row.description,
        imageUrl,
        availableInPOS: row.availableInPOS,
        availableInOnlineStore: row.availableInOnlineStore,
        rxRequired: row.rxRequired,
        status: pricesAllowed ? row.status : "inactive",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      imported += 1;
      row.tr.remove(); // saved - only failed rows stay in the review table
    } catch (error) {
      console.error("Import failed:", row.name, error);
      failedRows.push(row);
    }
  }
  updateTaskProgress(parsedRows.length, parsedRows.length);

  batchReviewConfirmBtn.disabled = false;
  batchUploadStatus.textContent = `Imported ${imported} product${imported === 1 ? "" : "s"}.${failedRows.length ? ` ${failedRows.length} failed to save - please try those again.` : ""}`;
  batchFileInput.value = "";
  if (imported) {
    await logAuditEvent({ action: "Products Imported", details: `${imported} product${imported === 1 ? "" : "s"} from a batch file${failedRows.length ? `; ${failedRows.length} failed` : ""}${skippedNames.length ? `; ${skippedNames.length} duplicates skipped` : ""}` });
  }
  catalogLoadPromise = null;
  await loadProducts();

  const plural = (n) => `${n} product${n === 1 ? "" : "s"}`;
  let choice;
  const skippedNote = skippedNames.length ? `\n${plural(skippedNames.length)} skipped - already in the catalog or repeated.` : "";
  if (!failedRows.length) {
    choice = await showTaskResult({
      type: "success",
      title: "Import complete",
      message: `${plural(imported)} added to the catalog.${skippedNote}${canEditPrices() ? "" : "\nThey stay Inactive until the Branch Manager sets their prices."}`,
      list: skippedNames.slice(0, 50).concat(skippedNames.length > 50 ? [`...and ${skippedNames.length - 50} more`] : []),
      actions: [
        { key: "photos", label: "Add photos" },
        { key: "done", label: "Done", primary: true },
      ],
    });
  } else {
    choice = await showTaskResult({
      type: imported ? "warning" : "danger",
      title: imported ? "Import finished with problems" : "Import failed",
      message: `${plural(imported)} added. ${plural(failedRows.length)} didn't save (check the connection); they're kept so you can try again.${skippedNote}`,
      list: failedRows.map((r) => r.name),
      actions: [
        { key: "done", label: "Close" },
        { key: "retry", label: "Try the failed ones again", primary: true },
      ],
    });
  }
  if (choice === "retry") {
    updateBatchReviewCount();
    bootstrap.Modal.getOrCreateInstance(batchReviewModalEl).show();
  } else if (choice === "photos" && typeof openPhotosModal === "function") {
    openPhotosModal();
  }
});

// SheetJS reads both real Excel workbooks and plain CSV through the same
// API, so one code path handles either - and it properly handles quoted
// CSV fields containing commas, which a naive split(",") did not.
batchFileInput.addEventListener("change", async () => {
  const file = batchFileInput.files[0];
  if (!file) return;

  batchUploadStatus.textContent = "Reading file...";

  let rows;
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    // defval keeps every declared column present (as "") even on a row
    // that leaves it blank, instead of just omitting the key.
    const sheetRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    rows = sheetRows.map((sheetRow) => {
      const row = {};
      Object.entries(sheetRow).forEach(([key, value]) => {
        row[key.trim().toLowerCase()] = String(value).trim();
      });
      return row;
    });
  } catch (error) {
    batchUploadStatus.textContent = "Couldn't read that file - make sure it's a valid .xlsx, .xls, or .csv file.";
    return;
  }

  if (rows.length === 0) {
    batchUploadStatus.textContent = "That file doesn't have any product rows.";
    return;
  }

  batchUploadStatus.textContent = "";
  openBatchReviewModal(rows);
});

async function resolveCategoryByName(name) {
  if (!name) return Object.keys(CATEGORY_LABELS)[0] || "";

  const existing = Object.entries(CATEGORY_LABELS).find(
    ([, label]) => label.toLowerCase() === name.toLowerCase()
  );
  if (existing) return existing[0];

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await db.collection("categories").doc(id).set({ name });
  CATEGORY_LABELS[id] = name;
  renderCategorySelect();
  return id;
}

/* ---------- Manage Categories ---------- */
manageCategoriesBtn.addEventListener("click", () => {
  renderCategoriesList();
  bootstrap.Modal.getOrCreateInstance(categoriesModalEl).show();
});

function renderCategoriesList() {
  categoriesList.innerHTML = Object.entries(CATEGORY_LABELS)
    .map(
      ([id, name]) => `
        <div class="d-flex justify-content-between align-items-center border rounded p-2" style="border-color:var(--amson-border) !important;">
          <span>${escapeHtml(name)}</span>
          <div class="d-flex gap-2">
            <button type="button" class="icon-btn rename-category-btn" data-id="${id}" aria-label="Rename"><i class="bi bi-pencil"></i></button>
            <button type="button" class="icon-btn delete-category-btn" data-id="${id}" aria-label="Delete"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      `
    )
    .join("");

  document.querySelectorAll(".rename-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => renameCategory(btn.dataset.id));
  });
  document.querySelectorAll(".delete-category-btn").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(btn.dataset.id));
  });
}

async function renameCategory(id) {
  const newName = await showAppPrompt("Rename category to:", { title: "Rename Category", defaultValue: CATEGORY_LABELS[id] });
  if (!newName || !newName.trim()) return;
  await db.collection("categories").doc(id).update({ name: newName.trim() });
  CATEGORY_LABELS[id] = newName.trim();
  renderCategoriesList();
  renderCategorySelect();
  renderProductsTable();
}

// A category that still has products can be deleted by moving those
// products into another category first, in the same step - that's how the
// old default categories get replaced by the branch's own.
async function deleteCategory(id) {
  categoriesAlert.classList.add("d-none");
  const productsInCategory = allProducts.filter((p) => p.category === id);
  const others = Object.entries(CATEGORY_LABELS).filter(([otherId]) => otherId !== id);

  let moveTo = null;
  if (productsInCategory.length > 0) {
    if (others.length === 0) {
      categoriesAlert.textContent = "Add another category first, so this category's products have somewhere to go.";
      categoriesAlert.classList.remove("d-none");
      return;
    }
    moveTo = await showAppSelect(
      `"${CATEGORY_LABELS[id]}" has ${productsInCategory.length} product${productsInCategory.length === 1 ? "" : "s"}. Move them to:`,
      others.map(([otherId, name]) => ({ value: otherId, label: name })),
      { title: "Delete Category", confirmLabel: "Move and Delete" }
    );
    if (!moveTo) return;
  } else if (!(await showAppConfirm(`Delete the "${CATEGORY_LABELS[id]}" category?`, { confirmLabel: "Delete" }))) {
    return;
  }

  try {
    // Firestore batches cap at 500 writes.
    for (let i = 0; i < productsInCategory.length; i += 400) {
      const batch = db.batch();
      productsInCategory.slice(i, i + 400).forEach((p) => batch.update(db.collection("products").doc(p.id), { category: moveTo }));
      await batch.commit();
    }
    await db.collection("categories").doc(id).delete();
    if (productsInCategory.length > 0) {
      await logAuditEvent({
        action: "Category Deleted",
        details: `${CATEGORY_LABELS[id]} - ${productsInCategory.length} product(s) moved to ${CATEGORY_LABELS[moveTo]}`,
      });
    }
    productsInCategory.forEach((p) => (p.category = moveTo));
    delete CATEGORY_LABELS[id];
    catalogLoadPromise = null;
    renderCategoriesList();
    renderCategorySelect();
    renderProductsTable();
  } catch (error) {
    categoriesAlert.textContent = "Something went wrong deleting this category. Please try again.";
    categoriesAlert.classList.remove("d-none");
  }
}

document.getElementById("addBranchCategoriesBtn").addEventListener("click", async () => {
  categoriesAlert.classList.add("d-none");
  const existingNames = new Set(Object.values(CATEGORY_LABELS).map((n) => n.toLowerCase()));
  const missing = Object.entries(DEFAULT_CATEGORIES).filter(([id, name]) => !CATEGORY_LABELS[id] && !existingNames.has(name.toLowerCase()));
  if (missing.length === 0) {
    categoriesAlert.textContent = "The branch's categories are already added.";
    categoriesAlert.classList.remove("d-none");
    return;
  }
  try {
    const batch = db.batch();
    missing.forEach(([id, name]) => batch.set(db.collection("categories").doc(id), { name }));
    await batch.commit();
    missing.forEach(([id, name]) => (CATEGORY_LABELS[id] = name));
    catalogLoadPromise = null;
    renderCategoriesList();
    renderCategorySelect();
  } catch (error) {
    categoriesAlert.textContent = "Something went wrong adding the categories. Please try again.";
    categoriesAlert.classList.remove("d-none");
  }
});

addCategoryBtn.addEventListener("click", async () => {
  const name = newCategoryNameInput.value.trim();
  if (!name) return;

  categoriesAlert.classList.add("d-none");
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  try {
    await db.collection("categories").doc(id).set({ name });
    CATEGORY_LABELS[id] = name;
    newCategoryNameInput.value = "";
    renderCategoriesList();
    renderCategorySelect();
  } catch (error) {
    categoriesAlert.textContent = "Something went wrong adding this category. Please try again.";
    categoriesAlert.classList.remove("d-none");
  }
});
