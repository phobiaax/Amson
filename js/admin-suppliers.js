/**
 * Supplier Management admin page: CRUD for suppliers/{id}, each linked
 * to zero or more products via a productIds array (used later by the
 * Inventory module's Purchase Order flow to suggest which supplier can
 * fulfill a given product).
 */

const SUPPLIERS_PAGE_SIZE = 6;

let allSuppliers = [];
let suppliersSearchTerm = "";
let suppliersCurrentPage = 1;
let editingSupplierId = null;

const suppliersSearchInput = document.getElementById("suppliersSearchInput");
const suppliersGrid = document.getElementById("suppliersGrid");
const suppliersEmpty = document.getElementById("suppliersEmpty");
const suppliersPagination = document.getElementById("suppliersPagination");
const addSupplierBtn = document.getElementById("addSupplierBtn");
const exportSuppliersBtn = document.getElementById("exportSuppliersBtn");

const supplierModalEl = document.getElementById("supplierModal");
const supplierModalTitle = document.getElementById("supplierModalTitle");
const supplierModalAlert = document.getElementById("supplierModalAlert");
const supplierNameInput = document.getElementById("supplierNameInput");
const supplierContactPersonInput = document.getElementById("supplierContactPersonInput");
const supplierPhoneInput = document.getElementById("supplierPhoneInput");
const supplierEmailInput = document.getElementById("supplierEmailInput");
const supplierAddressInput = document.getElementById("supplierAddressInput");
const supplierProductChecklist = document.getElementById("supplierProductChecklist");
const supplierStatusToggle = document.getElementById("supplierStatusToggle");
const saveSupplierBtn = document.getElementById("saveSupplierBtn");
const deleteSupplierBtn = document.getElementById("deleteSupplierBtn");

const viewSupplierModalEl = document.getElementById("viewSupplierModal");

document.addEventListener("admin:ready", loadSuppliers);

/* ---------- Load ---------- */
async function loadSuppliers() {
  try {
    await loadCatalogCache();
    const snapshot = await db.collection("suppliers").get();
    allSuppliers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderProductChecklist();
    renderSuppliersGrid();
  } catch (error) {
    console.error("Failed to load suppliers:", error);
  }
}

function renderProductChecklist(checkedIds = []) {
  if (SAMPLE_PRODUCTS.length === 0) {
    supplierProductChecklist.innerHTML = '<p class="text-muted mb-0" style="font-size:0.85rem;">No products in the catalog yet.</p>';
    return;
  }

  supplierProductChecklist.innerHTML = SAMPLE_PRODUCTS.map(
    (p) => `
      <div class="form-check">
        <input class="form-check-input supplier-product-checkbox" type="checkbox" value="${p.id}" id="supplierProduct-${p.id}" ${checkedIds.includes(p.id) ? "checked" : ""}>
        <label class="form-check-label" for="supplierProduct-${p.id}">${p.name}</label>
      </div>
    `
  ).join("");
}

/* ---------- Grid ---------- */
function filteredSuppliers() {
  let filtered = allSuppliers.slice();

  if (suppliersSearchTerm) {
    const term = suppliersSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        (s.name || "").toLowerCase().includes(term) ||
        (s.contactPerson || "").toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => a.name.localeCompare(b.name));
  return filtered;
}

function renderSuppliersGrid() {
  const filtered = filteredSuppliers();
  const totalPages = Math.max(1, Math.ceil(filtered.length / SUPPLIERS_PAGE_SIZE));
  suppliersCurrentPage = Math.min(suppliersCurrentPage, totalPages);

  const start = (suppliersCurrentPage - 1) * SUPPLIERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + SUPPLIERS_PAGE_SIZE);

  if (pageItems.length === 0) {
    suppliersGrid.innerHTML = "";
    suppliersEmpty.classList.remove("d-none");
  } else {
    suppliersEmpty.classList.add("d-none");
    suppliersGrid.innerHTML = pageItems.map(renderSupplierCard).join("");
  }

  renderSuppliersPagination(totalPages);
}

function renderSupplierCard(supplier) {
  return `
    <div class="col-md-6 col-lg-4">
      <div class="supplier-card">
        <div class="d-flex justify-content-between align-items-start mb-3">
          <div class="d-flex gap-3">
            <div class="supplier-icon"><i class="bi bi-building"></i></div>
            <div>
              <p class="fw-bold mb-0">${supplier.name}</p>
              <p class="text-muted mb-0" style="font-size:0.88rem;">${supplier.contactPerson || "-"}</p>
            </div>
          </div>
          <span class="badge rounded-pill ${supplier.status === "active" ? "text-bg-success" : "text-bg-secondary"}">
            ${supplier.status === "active" ? "Active" : "Inactive"}
          </span>
        </div>
        <p class="contact-line"><i class="bi bi-telephone"></i> ${supplier.phone || "-"}</p>
        <p class="contact-line"><i class="bi bi-envelope"></i> ${supplier.email || "-"}</p>
        <p class="contact-line mb-3"><i class="bi bi-geo-alt"></i> ${supplier.address || "-"}</p>
        <div class="d-flex gap-2 align-items-center">
          <button type="button" class="icon-btn view-supplier-btn" data-id="${supplier.id}" aria-label="View"><i class="bi bi-eye"></i></button>
          <button type="button" class="btn btn-outline-dark-amson flex-fill edit-supplier-btn" data-id="${supplier.id}"><i class="bi bi-pencil me-1"></i>Edit</button>
          <button type="button" class="icon-btn icon-btn-danger delete-supplier-btn" data-id="${supplier.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>
  `;
}

function renderSuppliersPagination(totalPages) {
  if (totalPages <= 1) {
    suppliersPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${suppliersCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === suppliersCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${suppliersCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  suppliersPagination.innerHTML = html;
}

suppliersPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") suppliersCurrentPage -= 1;
  else if (btn.dataset.page === "next") suppliersCurrentPage += 1;
  else suppliersCurrentPage = Number(btn.dataset.page);
  renderSuppliersGrid();
});

suppliersSearchInput.addEventListener("input", () => {
  suppliersSearchTerm = suppliersSearchInput.value.trim();
  suppliersCurrentPage = 1;
  renderSuppliersGrid();
});

suppliersGrid.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".view-supplier-btn");
  const editBtn = e.target.closest(".edit-supplier-btn");
  const deleteBtn = e.target.closest(".delete-supplier-btn");

  if (viewBtn) openViewModal(allSuppliers.find((s) => s.id === viewBtn.dataset.id));
  if (editBtn) openEditModal(allSuppliers.find((s) => s.id === editBtn.dataset.id));
  if (deleteBtn) deleteSupplier(deleteBtn.dataset.id);
});

/* ---------- View modal ---------- */
function openViewModal(supplier) {
  if (!supplier) return;

  document.getElementById("viewSupplierName").textContent = supplier.name;
  document.getElementById("viewSupplierContactPerson").textContent = supplier.contactPerson || "-";
  document.getElementById("viewSupplierPhone").textContent = supplier.phone || "-";
  document.getElementById("viewSupplierEmail").textContent = supplier.email || "-";
  document.getElementById("viewSupplierAddress").textContent = supplier.address || "-";

  const statusEl = document.getElementById("viewSupplierStatus");
  statusEl.textContent = supplier.status === "active" ? "Active" : "Inactive";
  statusEl.className = `badge rounded-pill ${supplier.status === "active" ? "text-bg-success" : "text-bg-secondary"}`;

  const productNames = (supplier.productIds || [])
    .map((id) => getProductById(id))
    .filter(Boolean)
    .map((p) => p.name);
  document.getElementById("viewSupplierProducts").textContent =
    productNames.length ? productNames.join(", ") : "No products linked yet.";

  bootstrap.Modal.getOrCreateInstance(viewSupplierModalEl).show();
}

/* ---------- Add / Edit modal ---------- */
function wireSegmentedToggle(container) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".segmented-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}
wireSegmentedToggle(supplierStatusToggle);

function setToggleValue(container, value) {
  container.querySelectorAll(".segmented-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
}

function getToggleValue(container) {
  return container.querySelector(".segmented-toggle-btn.active").dataset.value;
}

function resetSupplierForm() {
  supplierNameInput.value = "";
  supplierContactPersonInput.value = "";
  supplierPhoneInput.value = "";
  supplierEmailInput.value = "";
  supplierAddressInput.value = "";
  setToggleValue(supplierStatusToggle, "active");
  renderProductChecklist();
  supplierModalAlert.classList.add("d-none");
}

addSupplierBtn.addEventListener("click", () => {
  editingSupplierId = null;
  resetSupplierForm();
  supplierModalTitle.textContent = "Add Supplier";
  saveSupplierBtn.textContent = "Add Supplier";
  deleteSupplierBtn.style.display = "none";
  bootstrap.Modal.getOrCreateInstance(supplierModalEl).show();
});

function openEditModal(supplier) {
  if (!supplier) return;
  editingSupplierId = supplier.id;
  resetSupplierForm();

  supplierNameInput.value = supplier.name || "";
  supplierContactPersonInput.value = supplier.contactPerson || "";
  supplierPhoneInput.value = supplier.phone || "";
  supplierEmailInput.value = supplier.email || "";
  supplierAddressInput.value = supplier.address || "";
  setToggleValue(supplierStatusToggle, supplier.status || "active");
  renderProductChecklist(supplier.productIds || []);

  supplierModalTitle.textContent = "Edit Supplier";
  saveSupplierBtn.textContent = "Save Changes";
  deleteSupplierBtn.style.display = "inline-block";
  bootstrap.Modal.getOrCreateInstance(supplierModalEl).show();
}

saveSupplierBtn.addEventListener("click", async () => {
  const name = supplierNameInput.value.trim();

  if (!name) {
    supplierModalAlert.textContent = "Company name is required.";
    supplierModalAlert.classList.remove("d-none");
    return;
  }

  saveSupplierBtn.disabled = true;
  supplierModalAlert.classList.add("d-none");

  const productIds = Array.from(
    supplierProductChecklist.querySelectorAll(".supplier-product-checkbox:checked")
  ).map((cb) => cb.value);

  const supplierData = {
    name,
    contactPerson: supplierContactPersonInput.value.trim(),
    phone: supplierPhoneInput.value.trim(),
    email: supplierEmailInput.value.trim(),
    address: supplierAddressInput.value.trim(),
    productIds,
    status: getToggleValue(supplierStatusToggle),
  };

  try {
    if (editingSupplierId) {
      await db.collection("suppliers").doc(editingSupplierId).update(supplierData);
    } else {
      supplierData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("suppliers").add(supplierData);
    }

    bootstrap.Modal.getInstance(supplierModalEl).hide();
    await loadSuppliers();
  } catch (error) {
    supplierModalAlert.textContent = "Something went wrong saving this supplier. Please try again.";
    supplierModalAlert.classList.remove("d-none");
  } finally {
    saveSupplierBtn.disabled = false;
  }
});

deleteSupplierBtn.addEventListener("click", async () => {
  if (!editingSupplierId) return;
  if (!confirm("Delete this supplier? This can't be undone.")) return;

  try {
    await db.collection("suppliers").doc(editingSupplierId).delete();
    bootstrap.Modal.getInstance(supplierModalEl).hide();
    await loadSuppliers();
  } catch (error) {
    alert("Something went wrong deleting this supplier. Please try again.");
  }
});

async function deleteSupplier(id) {
  if (!confirm("Delete this supplier? This can't be undone.")) return;
  try {
    await db.collection("suppliers").doc(id).delete();
    await loadSuppliers();
  } catch (error) {
    alert("Something went wrong deleting this supplier. Please try again.");
  }
}

/* ---------- Export ---------- */
exportSuppliersBtn.addEventListener("click", () => {
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals - Supplier Directory", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Company", 14, y);
  doc.text("Contact", 80, y);
  doc.text("Phone", 130, y);
  doc.text("Status", 175, y);
  y += 3;
  doc.line(14, y, 196, y);
  doc.setFont(undefined, "normal");

  filteredSuppliers().forEach((supplier) => {
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(supplier.name, 14, y);
    doc.text(supplier.contactPerson || "-", 80, y);
    doc.text(supplier.phone || "-", 130, y);
    doc.text(supplier.status === "active" ? "Active" : "Inactive", 175, y);
  });

  doc.save(`amson-suppliers-${new Date().toISOString().slice(0, 10)}.pdf`);
});
