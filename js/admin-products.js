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

let currentAdminRole = "admin";
document.addEventListener("admin:ready", (e) => {
  currentAdminRole = (e.detail && e.detail.admin && e.detail.admin.role) || "admin";
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
          <div class="product-thumb" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}');"` : ""}></div>
          <span>${product.name}</span>
        </div>
      </td>
      <td>${product.brand || "-"}</td>
      <td>${CATEGORY_LABELS[product.category] || "-"}</td>
      <td class="product-price">${formatPeso(product.retailPrice)}</td>
      <td>${product.rxRequired ? '<span class="badge rounded-pill text-bg-danger">Yes</span>' : '<span class="badge rounded-pill text-bg-light text-dark">No</span>'}</td>
      <td>${product.status === "active" ? '<span class="badge rounded-pill text-bg-success">Active</span>' : '<span class="badge rounded-pill text-bg-secondary">Inactive</span>'}</td>
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

  const priceLocked = !!editingProductId && !canEditPrices();
  productCostingInput.disabled = priceLocked;
  productRetailPriceInput.disabled = priceLocked;
  productWholesalePriceInput.disabled = priceLocked;
  priceRestrictedNote.classList.toggle("d-none", !priceLocked);
}

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
  productAvailablePOS.checked = !!product.availableInPOS;
  productAvailableOnline.checked = !!product.availableInOnlineStore;
  setToggleValue(productRxToggle, product.rxRequired ? "yes" : "no");
  setToggleValue(productStatusToggle, product.status || "active");

  if (product.imageUrl) {
    existingImageUrl = product.imageUrl;
    productImagePreview.style.backgroundImage = `url('${product.imageUrl}')`;
    productImageEmptyState.classList.add("d-none");
    productImagePreviewState.classList.remove("d-none");
  }

  productModalTitle.textContent = "Edit Product";
  productModalSubtitle.textContent = `SKU ${product.sku}`;
  saveProductBtn.textContent = "Save Changes";
  deleteProductBtn.style.display = "inline-block";
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

  if (!name || !category || isNaN(retailPrice)) {
    productModalAlert.textContent = "Product name, category, and retail price are required.";
    productModalAlert.classList.remove("d-none");
    return;
  }

  saveProductBtn.disabled = true;
  productModalAlert.classList.add("d-none");

  try {
    let imageUrl = existingImageUrl;
    if (selectedImageFile) {
      imageUrl = await uploadToCloudinary(selectedImageFile);
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
      imageUrl: imageUrl || null,
      availableInPOS: productAvailablePOS.checked,
      availableInOnlineStore: productAvailableOnline.checked,
      rxRequired: getToggleValue(productRxToggle) === "yes",
      status: getToggleValue(productStatusToggle),
    };

    if (editingProductId) {
      const priceFields = [
        ["costingPrice", "Costing price"],
        ["retailPrice", "Retail price"],
        ["wholesalePrice", "Wholesale price"],
      ];
      const priceChanges = priceFields
        .filter(([field]) => editingProductOriginal && editingProductOriginal[field] !== productData[field])
        .map(([field, label]) => `${label}: ${formatPeso(editingProductOriginal[field])} → ${formatPeso(productData[field])}`);

      if (priceChanges.length > 0 && !confirm(`Confirm price change for ${productData.name}?\n\n${priceChanges.join("\n")}`)) {
        saveProductBtn.disabled = false;
        return;
      }

      await db.collection("products").doc(editingProductId).update(productData);

      if (priceChanges.length > 0) {
        await logAuditEvent({
          action: "Price Change",
          details: `${productData.name} (${editingProductOriginal.sku || ""}) - ${priceChanges.join("; ")}`,
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

  if (!confirm("Delete this product? This can't be undone.")) return;

  try {
    await db.collection("products").doc(editingProductId).delete();
    catalogLoadPromise = null;
    bootstrap.Modal.getInstance(productModalEl).hide();
    await loadProducts();
  } catch (error) {
    alert("Something went wrong deleting this product. Please try again.");
  }
});

/* ---------- Batch upload (Excel .xlsx/.xls or .csv, via SheetJS) ---------- */
const BATCH_TEMPLATE_HEADERS = [
  "name", "genericName", "brand", "category", "costingPrice", "retailPrice",
  "wholesalePrice", "description", "availableInPOS", "availableInOnlineStore",
  "rxRequired", "status",
];

uploadBatchBtn.addEventListener("click", () => batchFileInput.click());

downloadTemplateBtn.addEventListener("click", () => {
  const exampleRow = {
    name: "Biogesic 500mg", genericName: "Paracetamol", brand: "Biogesic", category: "Pain Relief",
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
      <td><input type="text" class="form-control form-control-sm br-name" value="${row.name || ""}"></td>
      <td><input type="text" class="form-control form-control-sm br-genericname" value="${row.genericname || ""}"></td>
      <td><input type="text" class="form-control form-control-sm br-brand" value="${row.brand || ""}"></td>
      <td><input type="text" class="form-control form-control-sm br-category" value="${row.category || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-costingprice" value="${row.costingprice || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-retailprice" value="${row.retailprice || ""}"></td>
      <td><input type="number" min="0" step="0.01" class="form-control form-control-sm br-wholesaleprice" value="${row.wholesaleprice || ""}"></td>
      <td><input type="text" class="form-control form-control-sm br-description" value="${row.description || ""}"></td>
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

function updateBatchReviewCount() {
  const count = batchReviewTableBody.querySelectorAll("tr").length;
  batchReviewCount.textContent = `${count} product${count === 1 ? "" : "s"} ready to import`;
}

function openBatchReviewModal(rows) {
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
  const btn = e.target.closest(".br-remove");
  if (!btn) return;
  btn.closest("tr").remove();
  updateBatchReviewCount();
});

batchReviewConfirmBtn.addEventListener("click", async () => {
  const rowEls = Array.from(batchReviewTableBody.querySelectorAll("tr"));
  if (rowEls.length === 0) {
    batchReviewAlert.textContent = "There's nothing to import - add a row or cancel.";
    batchReviewAlert.classList.remove("d-none");
    return;
  }

  let hasInvalid = false;
  rowEls.forEach((tr) => tr.classList.remove("table-danger"));
  const parsedRows = rowEls.map((tr) => {
    const get = (cls) => tr.querySelector(`.${cls}`);
    const name = get("br-name").value.trim();
    const retailPrice = get("br-retailprice").value;
    if (!name || retailPrice === "") {
      tr.classList.add("table-danger");
      hasInvalid = true;
    }
    return {
      tr,
      name,
      genericName: get("br-genericname").value.trim(),
      brand: get("br-brand").value.trim(),
      category: get("br-category").value.trim(),
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
    batchReviewAlert.textContent = "Every product needs a Name and a Retail Price - fix the highlighted rows, or remove them.";
    batchReviewAlert.classList.remove("d-none");
    return;
  }

  batchReviewAlert.classList.add("d-none");
  batchReviewConfirmBtn.disabled = true;
  batchReviewConfirmBtn.textContent = "Importing...";

  let imported = 0;
  let failed = 0;
  for (const row of parsedRows) {
    try {
      const categoryId = await resolveCategoryByName(row.category);
      const sku = await generateProductSku();
      await db.collection("products").add({
        sku,
        name: row.name,
        genericName: row.genericName,
        brand: row.brand,
        category: categoryId,
        costingPrice: row.costingPrice,
        retailPrice: row.retailPrice,
        wholesalePrice: row.wholesalePrice,
        description: row.description,
        imageUrl: null,
        availableInPOS: row.availableInPOS,
        availableInOnlineStore: row.availableInOnlineStore,
        rxRequired: row.rxRequired,
        status: row.status,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      imported += 1;
    } catch (error) {
      failed += 1;
    }
  }

  batchReviewConfirmBtn.disabled = false;
  batchReviewConfirmBtn.textContent = "Confirm Import";
  bootstrap.Modal.getInstance(batchReviewModalEl).hide();

  batchUploadStatus.textContent = `Imported ${imported} product${imported === 1 ? "" : "s"}.${failed ? ` ${failed} failed to save - please try those again.` : ""}`;
  batchFileInput.value = "";
  catalogLoadPromise = null;
  await loadProducts();
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
          <span>${name}</span>
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
  const newName = prompt("Rename category to:", CATEGORY_LABELS[id]);
  if (!newName || !newName.trim()) return;
  await db.collection("categories").doc(id).update({ name: newName.trim() });
  CATEGORY_LABELS[id] = newName.trim();
  renderCategoriesList();
  renderCategorySelect();
  renderProductsTable();
}

async function deleteCategory(id) {
  const inUse = allProducts.some((p) => p.category === id);
  if (inUse) {
    categoriesAlert.textContent = "This category is still used by at least one product. Reassign those products first.";
    categoriesAlert.classList.remove("d-none");
    return;
  }
  if (!confirm(`Delete the "${CATEGORY_LABELS[id]}" category?`)) return;
  await db.collection("categories").doc(id).delete();
  delete CATEGORY_LABELS[id];
  renderCategoriesList();
  renderCategorySelect();
}

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
