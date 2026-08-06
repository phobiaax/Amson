/**
 * Product Management admin page: CRUD for the real products/{id} and
 * categories/{id} Firestore collections that the storefront now reads
 * from (see products-data.js's loadCatalogCache()), plus a simple CSV
 * batch-upload path for adding many products at once.
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
const batchFileInput = document.getElementById("batchFileInput");
const batchUploadStatus = document.getElementById("batchUploadStatus");

const categoriesModalEl = document.getElementById("categoriesModal");
const categoriesList = document.getElementById("categoriesList");
const newCategoryNameInput = document.getElementById("newCategoryNameInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const categoriesAlert = document.getElementById("categoriesAlert");

document.addEventListener("admin:ready", loadProducts);

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

// Searchable select — a long, growing category list gets tedious to
// scroll through in a plain <select> otherwise.
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

/* ---------- SKU generation (same pattern as order numbers) ---------- */
async function generateProductSku() {
  const counterRef = db.collection("counters").doc("products");
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
    transaction.set(counterRef, { count: nextCount }, { merge: true });
    return `MED-${String(nextCount).padStart(4, "0")}`;
  });
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
  }

  renderProductsPagination(totalPages);
}

function renderProductRow(product) {
  return `
    <tr>
      <td class="fw-medium">${product.sku || "—"}</td>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="product-thumb" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}');"` : ""}></div>
          <span>${product.name}</span>
        </div>
      </td>
      <td>${product.brand || "—"}</td>
      <td>${CATEGORY_LABELS[product.category] || "—"}</td>
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

productsTableBody.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-product-btn");
  if (!btn) return;
  const product = allProducts.find((p) => p.id === btn.dataset.id);
  if (product) openEditModal(product);
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
      await db.collection("products").doc(editingProductId).update(productData);

      const priceFields = [
        ["costingPrice", "Costing price"],
        ["retailPrice", "Retail price"],
        ["wholesalePrice", "Wholesale price"],
      ];
      const priceChanges = priceFields
        .filter(([field]) => editingProductOriginal && editingProductOriginal[field] !== productData[field])
        .map(([field, label]) => `${label}: ${formatPeso(editingProductOriginal[field])} → ${formatPeso(productData[field])}`);
      if (priceChanges.length > 0) {
        await logAuditEvent({
          action: "Price Change",
          details: `${productData.name} (${editingProductOriginal.sku || ""}) — ${priceChanges.join("; ")}`,
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

/* ---------- CSV batch upload ---------- */
uploadBatchBtn.addEventListener("click", () => batchFileInput.click());

batchFileInput.addEventListener("change", async () => {
  const file = batchFileInput.files[0];
  if (!file) return;

  batchUploadStatus.textContent = "Reading file...";
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    batchUploadStatus.textContent = "That file doesn't have any product rows.";
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
    if (!row.name || !row.retailprice) {
      skipped += 1;
      continue;
    }

    try {
      const categoryId = await resolveCategoryByName(row.category);
      const sku = await generateProductSku();

      await db.collection("products").add({
        sku,
        name: row.name,
        genericName: row.genericname || "",
        brand: row.brand || "",
        category: categoryId,
        costingPrice: parseFloat(row.costingprice) || 0,
        retailPrice: parseFloat(row.retailprice) || 0,
        wholesalePrice: parseFloat(row.wholesaleprice) || 0,
        description: row.description || "",
        imageUrl: null,
        availableInPOS: /^(yes|true|1)$/i.test(row.availableinpos || "yes"),
        availableInOnlineStore: /^(yes|true|1)$/i.test(row.availableinonlinestore || "yes"),
        rxRequired: /^(yes|true|1)$/i.test(row.rxrequired || "no"),
        status: (row.status || "active").toLowerCase() === "inactive" ? "inactive" : "active",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      imported += 1;
    } catch (error) {
      skipped += 1;
    }
  }

  batchUploadStatus.textContent = `Imported ${imported} product${imported === 1 ? "" : "s"}.${skipped ? ` Skipped ${skipped} row(s) missing a name/retail price.` : ""}`;
  batchFileInput.value = "";
  catalogLoadPromise = null;
  await loadProducts();
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
}

categoriesList.addEventListener("click", async (e) => {
  const renameBtn = e.target.closest(".rename-category-btn");
  const deleteBtn = e.target.closest(".delete-category-btn");

  if (renameBtn) {
    const id = renameBtn.dataset.id;
    const newName = prompt("Rename category to:", CATEGORY_LABELS[id]);
    if (!newName || !newName.trim()) return;
    await db.collection("categories").doc(id).update({ name: newName.trim() });
    CATEGORY_LABELS[id] = newName.trim();
    renderCategoriesList();
    renderCategorySelect();
    renderProductsTable();
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
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
