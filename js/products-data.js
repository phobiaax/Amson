/**
 * Product catalog cache.
 */

let SAMPLE_PRODUCTS = [];
let CATEGORY_LABELS = {};
let catalogLoadPromise = null;

const DEFAULT_REORDER_POINT = 20;
const NEAR_EXPIRY_MONTHS = 6;

const BATCH_STATUS_LABELS = {
  normal: "Normal",
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

// A product is only ready to sell online once it has real stock received
// through Inventory Management (Receive Stock) - staff can create a
// product ahead of time without it appearing to customers yet.
function storefrontCatalog() {
  return SAMPLE_PRODUCTS.filter((p) => p.status === "active" && p.availableInOnlineStore && p.totalStock > 0);
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
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.save(`${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---- FEFO stock deduction ----
// Runs as a Firestore transaction so two staff approving two different
// orders for the same tightly-stocked product at nearly the same time
// can't both pass the availability check against stale reads and both
// succeed - Firestore detects the conflicting read and retries the
// transaction with fresh data, so the second one correctly re-checks
// against what the first one actually left behind.
async function deductStockFEFO(productId, qty, { includeWholesaleOnly = false } = {}) {
  const allowedStatuses = includeWholesaleOnly ? ["active", "wholesale_only"] : ["active"];

  // The Firestore Web SDK only allows transaction.get() on a single
  // document reference, not on a query - so the set of candidate batches
  // (and the FEFO order between them) has to be discovered with a normal,
  // non-transactional query first. The transaction then re-reads each of
  // those specific docs (which IS transactional) to get a consistent
  // quantity right before deducting, so two concurrent orders still can't
  // both succeed against the same stale numbers.
  const candidates = await db
    .collection("stockBatches")
    .where("productId", "==", productId)
    .where("status", "in", allowedStatuses)
    .get();

  const refsInFefoOrder = candidates.docs
    .map((doc) => ({ ref: doc.ref, expirationDate: doc.data().expirationDate }))
    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
    .map((b) => b.ref);

  await db.runTransaction(async (transaction) => {
    const batches = [];
    for (const ref of refsInFefoOrder) {
      const doc = await transaction.get(ref);
      if (doc.exists && doc.data().quantity > 0) {
        batches.push({ ref, quantity: doc.data().quantity });
      }
    }

    let totalAvailable = 0;
    for (const b of batches) {
      totalAvailable += b.quantity;
    }
    if (totalAvailable < qty) {
      throw new Error("Not enough stock available to fulfill this quantity.");
    }

    let remaining = qty;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.quantity, remaining);
      transaction.update(batch.ref, { quantity: batch.quantity - deduct });
      remaining -= deduct;
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
      <div class="product-card">
        <a href="product-details.html?id=${product.id}" class="product-image-link">
          <div class="product-image" ${product.imageUrl ? `style="background-image:url('${product.imageUrl}'); background-size:cover; background-position:center;"` : ""}></div>
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
