/**
 * Product catalog cache.
 */

let SAMPLE_PRODUCTS = [];
let CATEGORY_LABELS = {};
let catalogLoadPromise = null;

const DEFAULT_REORDER_POINT = 20;
const NEAR_EXPIRY_MONTHS = 6;
const BAD_ORDER_MONTHS = 2;

const BATCH_STATUS_LABELS = {
  normal: "Normal",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  near_expiry: "Near Expiry",
  bad_order: "Bad Order",
};

function getBatchStatus(batch) {
  // Auto-rejected on receiving for being too close to expiry (see
  // enforceExpiryStatus below) - call this out distinctly instead of
  // letting it fall through to the generic "Out of Stock" pill, since the
  // two mean very different things to staff.
  if (batch.status === "bad_order") return "bad_order";
  if (batch.quantity === 0) return "out_of_stock";

  const expiry = new Date(batch.expirationDate);
  const nearExpiryThreshold = new Date();
  nearExpiryThreshold.setMonth(nearExpiryThreshold.getMonth() + NEAR_EXPIRY_MONTHS);
  if (expiry <= nearExpiryThreshold) return "near_expiry";

  const product = getProductById(batch.productId);
  const reorderPoint = (product && product.reorderPoint) || DEFAULT_REORDER_POINT;
  if (batch.quantity <= reorderPoint) return "low_stock";

  return "normal";
}

// ---- Near-expiry auto-handling (lazy, checked on Inventory page load) ----
async function enforceExpiryStatus() {
  const snapshot = await db.collection("stockBatches").where("status", "==", "active").get();
  const batches = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const badOrderThreshold = new Date();
  badOrderThreshold.setMonth(badOrderThreshold.getMonth() + BAD_ORDER_MONTHS);

  const wholesaleOnlyThreshold = new Date();
  wholesaleOnlyThreshold.setMonth(wholesaleOnlyThreshold.getMonth() + NEAR_EXPIRY_MONTHS);

  for (const batch of batches) {
    if (batch.quantity <= 0) continue;
    const expiry = new Date(batch.expirationDate);

    if (expiry <= badOrderThreshold) {
      await db.collection("stockBatches").doc(batch.id).update({ status: "bad_order", quantity: 0 });
      await db.collection("writeOffs").add({
        batchId: batch.id,
        productId: batch.productId,
        batchNo: batch.batchNo,
        quantity: batch.quantity,
        reason: "Bad Order - within 2 months of expiry (auto-flagged)",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } else if (expiry <= wholesaleOnlyThreshold) {
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
async function deductStockFEFO(productId, qty, { includeWholesaleOnly = false } = {}) {
  const allowedStatuses = includeWholesaleOnly ? ["active", "wholesale_only"] : ["active"];
  const snapshot = await db
    .collection("stockBatches")
    .where("productId", "==", productId)
    .where("status", "in", allowedStatuses)
    .get();

  const batches = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((b) => b.quantity > 0)
    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

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
    await db.collection("stockBatches").doc(batch.id).update({ quantity: batch.quantity - deduct });
    remaining -= deduct;
  }
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
