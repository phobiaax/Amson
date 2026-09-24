/**
 * Product catalog cache.
 */

// ---- Stacked modal darkening ----
// Bootstrap gives every .modal and every .modal-backdrop the same fixed
// z-index regardless of how many are open, so a second modal's backdrop
// never actually paints on top of the first modal's box - nothing was
// ever going to look darker no matter the opacity. This re-numbers both
// on every open/close so each new modal (and its backdrop) stacks above
// everything already open, which is what actually makes modal 1 look
// dimmed once modal 2 is on top of it.
function restackModals() {
  document.querySelectorAll(".modal-backdrop").forEach((backdrop, i) => {
    backdrop.style.zIndex = 1050 + i * 20;
  });
  document.querySelectorAll(".modal.show").forEach((modal, i) => {
    modal.style.zIndex = 1055 + i * 20;
  });
}
document.addEventListener("shown.bs.modal", restackModals);
document.addEventListener("hidden.bs.modal", restackModals);

// ---- Shared dialog UI (replaces native alert()/confirm()) ----
// Native browser dialogs aren't acceptable UI here - everything routes
// through one Bootstrap modal, built once per page and reused.
function ensureAppDialogModal() {
  if (document.getElementById("appDialogModal")) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal fade" id="appDialogModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content p-4">
          <h2 class="h5 fw-bold mb-2" id="appDialogTitle"></h2>
          <p class="mb-4" id="appDialogMessage" style="white-space:pre-line;"></p>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-dark-amson d-none" id="appDialogCancelBtn">Cancel</button>
            <button type="button" class="btn btn-amson" id="appDialogOkBtn">OK</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);
}

// Replaces window.alert() - resolves once the user dismisses it.
function showAppAlert(message, { title = "Notice" } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    const cancelBtn = document.getElementById("appDialogCancelBtn");
    const okBtn = document.getElementById("appDialogOkBtn");
    cancelBtn.classList.add("d-none");
    okBtn.textContent = "OK";

    const modalEl = document.getElementById("appDialogModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    const onOk = () => modal.hide();
    const onHidden = () => {
      okBtn.removeEventListener("click", onOk);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve();
    };
    okBtn.addEventListener("click", onOk);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    modal.show();
  });
}

// Replaces window.confirm() - resolves true/false. Dismissing without
// clicking Confirm (Esc, or clicking Cancel) resolves false.
function showAppConfirm(message, { title = "Please Confirm", confirmLabel = "Confirm", cancelLabel = "Cancel" } = {}) {
  ensureAppDialogModal();
  return new Promise((resolve) => {
    document.getElementById("appDialogTitle").textContent = title;
    document.getElementById("appDialogMessage").textContent = message;
    const cancelBtn = document.getElementById("appDialogCancelBtn");
    const okBtn = document.getElementById("appDialogOkBtn");
    cancelBtn.classList.remove("d-none");
    cancelBtn.textContent = cancelLabel;
    okBtn.textContent = confirmLabel;

    const modalEl = document.getElementById("appDialogModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

    let confirmed = false;
    const onOk = () => {
      confirmed = true;
      modal.hide();
    };
    const onCancel = () => modal.hide();
    const onHidden = () => {
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      modalEl.removeEventListener("hidden.bs.modal", onHidden);
      resolve(confirmed);
    };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    modalEl.addEventListener("hidden.bs.modal", onHidden);
    modal.show();
  });
}

let SAMPLE_PRODUCTS = [];
let CATEGORY_LABELS = {};
let catalogLoadPromise = null;

const DEFAULT_REORDER_POINT = 20;
const NEAR_EXPIRY_MONTHS = 6;

const BATCH_STATUS_LABELS = {
  normal: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  near_expiry: "Near Expiry",
};

function getBatchStatus(batch) {
  if (batch.quantity === 0) return "out_of_stock";

  const expiry = new Date(batch.expirationDate);
  const nearExpiryThreshold = new Date();
  nearExpiryThreshold.setMonth(nearExpiryThreshold.getMonth() + NEAR_EXPIRY_MONTHS);
  if (expiry <= nearExpiryThreshold) return "near_expiry";

  // Low Stock is judged on the product's total stock across all its
  // batches, not this one batch alone - a product split across several
  // batches shouldn't look low just because any single lot is small.
  const product = getProductById(batch.productId);
  const reorderPoint = (product && product.reorderPoint) || DEFAULT_REORDER_POINT;
  const totalStock = product ? product.totalStock : batch.quantity;
  if (totalStock <= reorderPoint) return "low_stock";

  return "normal";
}

// ---- Near-expiry auto-handling (lazy, checked on Inventory page load) ----
// Stock this close to expiry is flagged wholesale_only so it doesn't get
// sold retail - quantity is never touched automatically; staff decide
// whether to write it off themselves.
async function enforceExpiryStatus() {
  const snapshot = await db.collection("stockBatches").where("status", "==", "active").get();
  const batches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const wholesaleOnlyThreshold = new Date();
  wholesaleOnlyThreshold.setMonth(wholesaleOnlyThreshold.getMonth() + NEAR_EXPIRY_MONTHS);

  for (const batch of batches) {
    if (batch.quantity <= 0) continue;
    const expiry = new Date(batch.expirationDate);

    if (expiry <= wholesaleOnlyThreshold) {
      await db.collection("stockBatches").doc(batch.id).update({ status: "wholesale_only" });
    }
  }
}

const DEFAULT_CATEGORIES = {
  otc: "OTC Medicines",
  vitamins: "Vitamins & Supplements",
  "personal-care": "Personal Care",
  "health-wellness": "Health & Wellness",
};

async function loadCatalogCache() {
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = (async () => {
    const categorySnapshot = await db.collection("categories").get();
    const productSnapshot = await db.collection("products").get();
    const batchSnapshot = await db.collection("stockBatches").where("status", "==", "active").get();

    CATEGORY_LABELS = {};
    categorySnapshot.docs.forEach((doc) => {
      CATEGORY_LABELS[doc.id] = doc.data().name;
    });

    const stockByProduct = {};
    batchSnapshot.docs.forEach((doc) => {
      const batch = doc.data();
      stockByProduct[batch.productId] = (stockByProduct[batch.productId] || 0) + (batch.quantity || 0);
    });

    SAMPLE_PRODUCTS = productSnapshot.docs.map((doc) => {
      const data = doc.data();
      const totalStock = stockByProduct[doc.id] || 0;
      return {
        id: doc.id,
        ...data,
        price: data.retailPrice,
        totalStock,
        inStock: data.status === "active" && totalStock > 0,
      };
    });

    return { products: SAMPLE_PRODUCTS, categories: CATEGORY_LABELS };
  })();

  return catalogLoadPromise;
}

// A product only appears in the storefront once staff have marked it
// available online (and it's active) - staff can create a product ahead
// of time without it showing to customers yet. Once it has appeared,
// running out of stock doesn't remove it - it stays visible, greyed out
// and not orderable (see renderProductCard), rather than disappearing.
function storefrontCatalog() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore);
}

/* ---------- SKU generation (same pattern as order numbers) ---------- */
async function generateProductSku() {
  const counterRef = db.collection("counters").doc("products");
  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `MED-${String(nextCount).padStart(4, "0")}`;
}

function formatPeso(amount) {
  return `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getProductById(id) {
  return SAMPLE_PRODUCTS.find((p) => String(p.id) === String(id));
}

function exportBlankPdf(filenamePrefix) {
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.save(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---- FEFO stock deduction for a single product ----
// Runs as a Firestore transaction so two staff approving two different
// orders for the same tightly-stocked product at nearly the same time
// can't both pass the availability check against stale reads and both
// succeed - Firestore detects the conflicting read and retries the
// transaction with fresh data, so the second one correctly re-checks
// against what the first one actually left behind. A thin wrapper around
// deductStockFEFOMultiple below - see there for why a multi-item order
// can't just call this once per item.
async function deductStockFEFO(productId, qty, opts = {}) {
  return deductStockFEFOMultiple([{ productId, qty }], opts);
}

// ---- FEFO stock deduction for a whole multi-item order, atomically ----
// deductStockFEFO deducts one product per call, each in its own
// transaction - fine for a single item, but a caller looping it across an
// order's items has no way to undo the ones that already succeeded if a
// later item runs out of stock. That left earlier items silently
// deducted with no order ever actually created/approved to account for
// it, and retrying the same loop later (once restocked) would deduct
// those already-decremented items a second time. This does every item in
// one transaction instead: it reads and validates all of them before
// writing any of them, so a shortfall on one item aborts the whole thing
// with nothing changed, exactly like deductStockFEFO does for a single
// product.
async function deductStockFEFOMultiple(items, { includeWholesaleOnly = false } = {}) {
  const allowedStatuses = includeWholesaleOnly ? ["active", "wholesale_only"] : ["active"];

  const itemsWithCandidates = await Promise.all(
    items.map(async (item) => {
      const candidates = await db
        .collection("stockBatches")
        .where("productId", "==", item.productId)
        .where("status", "in", allowedStatuses)
        .get();

      const refsInFefoOrder = candidates.docs
        .map((doc) => ({ ref: doc.ref, expirationDate: doc.data().expirationDate }))
        .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
        .map((b) => b.ref);

      return { productId: item.productId, qty: item.qty, refsInFefoOrder };
    })
  );

  await db.runTransaction(async (transaction) => {
    // Read and validate every item first - nothing is written until all
    // of them are confirmed available, so a shortfall on any one item
    // leaves every item untouched.
    const perItemBatches = [];
    for (const item of itemsWithCandidates) {
      const batches = [];
      for (const ref of item.refsInFefoOrder) {
        const doc = await transaction.get(ref);
        if (doc.exists && doc.data().quantity > 0) {
          batches.push({ ref, quantity: doc.data().quantity });
        }
      }

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAvailable < item.qty) {
        throw new Error("Not enough stock available to fulfill this quantity.");
      }

      perItemBatches.push({ qty: item.qty, batches });
    }

    for (const item of perItemBatches) {
      let remaining = item.qty;
      for (const batch of item.batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        transaction.update(batch.ref, { quantity: batch.quantity - deduct });
        remaining -= deduct;
      }
    }
  });
}

// ---- Audit log helper ----
async function logAuditEvent({ action, details, actor }) {
  try {
    let actorName = actor;
    if (!actorName && auth.currentUser) {
      const userDoc = await db.collection("users").doc(auth.currentUser.uid).get();
      if (userDoc.exists) {
        const u = userDoc.data();
        actorName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "Unknown";
      }
    }

    await db.collection("auditLog").add({
      action,
      details: details || "",
      user: actorName || "Unknown",
      ipAddress: "-",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write audit log entry:", error);
  }
}

// Shared by every "cart-item-image" thumbnail (cart, checkout, payment
// summary, order details, My Orders) so they all show the product photo
// the same way the catalog cards do, instead of an empty placeholder box.
// Returns bare CSS declarations (no surrounding style="..."), so callers
// with their own inline sizing can just append this to it.
function cartItemImageCss(imageUrl) {
  return imageUrl ? `background-image:url('${imageUrl}'); background-size:cover; background-position:center;` : "";
}

function renderProductCard(product) {
  return `
    <div class="col">
      <div class="product-card ${product.inStock ? "" : "out-of-stock"}">
        <a href="product-details.html?id=${product.id}" class="product-image-link">
          <div class="product-image" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}'); background-size:cover; background-position:center;"` : ""}>
            ${product.inStock ? "" : `<span class="product-image-badge">Out of Stock</span>`}
          </div>
        </a>
        <a href="product-details.html?id=${product.id}" class="product-name-link">
          <h3 class="product-name">${product.name}</h3>
        </a>
        <p class="product-desc">${product.description || ""}</p>
        <p class="product-price">${formatPeso(product.price)}</p>
        ${product.rxRequired ? `<p class="text-muted mb-2" style="font-size:0.78rem;"><i class="bi bi-file-medical me-1"></i>Prescription required</p>` : ""}
        <button type="button" class="btn btn-amson w-100 btn-add-cart" data-id="${product.id}" ${product.inStock ? "" : "disabled"}>
          ${product.inStock ? "+ Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  `;
}
