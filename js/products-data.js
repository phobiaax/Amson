/**
 * Product catalog cache, backed by the real Firestore "products" and
 * "categories" collections. SAMPLE_PRODUCTS/CATEGORY_LABELS stay as the
 * same shared, synchronous lookup shape every page already expects;
 * loadCatalogCache() just populates them from Firestore once per page
 * load instead of from a hardcoded array. Call and await it before any
 * code that reads product/category data.
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

/**
 * A batch's status is evaluated independently per batch, not aggregated
 * per product - two batches of the same product can show different
 * statuses (e.g. one near-expiry, one fine). Shared between
 * admin-inventory.js and admin-dashboard.js's alert counts.
 */
function getBatchStatus(batch) {
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

const DEFAULT_CATEGORIES = {
  otc: "OTC Medicines",
  vitamins: "Vitamins & Supplements",
  "personal-care": "Personal Care",
  "health-wellness": "Health & Wellness",
};

function loadCatalogCache() {
  if (catalogLoadPromise) return catalogLoadPromise;

  catalogLoadPromise = Promise.all([
    db.collection("categories").get(),
    db.collection("products").get(),
  ]).then(([categorySnapshot, productSnapshot]) => {
    CATEGORY_LABELS = {};
    categorySnapshot.docs.forEach((doc) => {
      CATEGORY_LABELS[doc.id] = doc.data().name;
    });

    SAMPLE_PRODUCTS = productSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Back-compat aliases: existing cart/checkout/payment/dashboard
        // code was written against "price" and "inStock" - keep those
        // working instead of touching every call site.
        price: data.retailPrice,
        inStock: data.status === "active",
      };
    });

    return { products: SAMPLE_PRODUCTS, categories: CATEGORY_LABELS };
  });

  return catalogLoadPromise;
}

function formatPeso(amount) {
  return `₱${(amount || 0).toLocaleString("en-PH")}`;
}

function getProductById(id) {
  return SAMPLE_PRODUCTS.find((p) => String(p.id) === String(id));
}

/**
 * FEFO (First-Expired-First-Out) stock deduction, shared by any flow that
 * needs to draw down real stock against a product (Wholesale Order
 * recording; Online Orders approval once that's wired up). Queries
 * stockBatches live instead of relying on a page's in-memory cache, so it
 * works correctly regardless of which admin page calls it.
 */
async function deductStockFEFO(productId, qty) {
  const snapshot = await db
    .collection("stockBatches")
    .where("productId", "==", productId)
    .where("status", "==", "active")
    .get();

  const batches = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((b) => b.quantity > 0)
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
    remaining -= deduct;
  }
}

/**
 * Shared audit log helper - writes one auditLog/{id} doc per call. `actor`
 * defaults to the currently signed-in admin (resolved via auth.currentUser
 * + a users lookup) when not passed explicitly. IP address is always
 * recorded as "-": a static client-only site has no reliable way to
 * determine its own public IP without a third-party lookup service, so
 * this stays an honest placeholder instead of a fabricated value.
 */
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
        <button type="button" class="btn btn-amson w-100 btn-add-cart" data-id="${product.id}" ${product.inStock ? "" : "disabled"}>
          ${product.inStock ? "+ Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  `;
}
