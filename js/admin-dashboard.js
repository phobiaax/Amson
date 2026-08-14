/**
 * Admin dashboard: populates real stats from the orders collection
 * (Active Online Orders, Pending Payment Verification) and renders two
 * Chart.js visualizations built from real order history. Today's Total
 * Sales, Transactions Today, Low Stock, and Near-Expiry need the POS and
 * Inventory modules - neither exists yet, so those stay as placeholders
 * until those modules are built.
 */

let lastLoadedStats = null;

document.addEventListener("admin:ready", (e) => {
  document.getElementById("welcomeName").textContent = e.detail.admin.firstName || "Admin";
  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    await loadCatalogCache();
    // Fetching the whole collection is fine at today's scale; revisit
    // with date-range filtering once order volume actually grows.
    const ordersSnapshot = await db.collection("orders").get();
    const batchesSnapshot = await db.collection("stockBatches").get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());
    const batches = batchesSnapshot.docs.map((doc) => doc.data());

    const pendingVerification = orders.filter((o) => o.status === "placed").length;
    const activeOrders = orders.filter((o) => o.status !== "received").length;
    const batchStatuses = batches.map((b) => getBatchStatus(b));
    const lowStock = batchStatuses.filter((s) => s === "low_stock").length;
    const nearExpiry = batchStatuses.filter((s) => s === "near_expiry").length;

    document.getElementById("pendingVerificationCount").textContent = pendingVerification;
    document.getElementById("activeOrdersCount").textContent = activeOrders;
    document.getElementById("lowStockCount").textContent = lowStock;
    document.getElementById("nearExpiryCount").textContent = nearExpiry;

    lastLoadedStats = { pendingVerification, activeOrders, lowStock, nearExpiry };

    renderSalesChart(orders);
    renderCategoryChart(orders);
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
  }
}

function renderSalesChart(orders) {
  const canvas = document.getElementById("salesChart");
  const emptyState = document.getElementById("salesChartEmpty");
  // Keyed by sortable ISO date so chronological order doesn't depend on
  // whatever order Firestore happened to return the orders in.
  const dailyTotals = {};

  orders.forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const isoKey = date.toISOString().slice(0, 10);
    dailyTotals[isoKey] = (dailyTotals[isoKey] || 0) + (order.total || 0);
  });

  const sortedKeys = Object.keys(dailyTotals).sort();
  if (sortedKeys.length === 0) {
    canvas.classList.add("d-none");
    emptyState.classList.remove("d-none");
    return;
  }

  const labels = sortedKeys.map((isoKey) =>
    new Date(isoKey).toLocaleDateString("en-PH", { month: "short", day: "numeric" })
  );

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Online Sales (₱)",
          data: sortedKeys.map((key) => dailyTotals[key]),
          borderColor: "#EE3137",
          backgroundColor: "rgba(238, 49, 55, 0.08)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderCategoryChart(orders) {
  const canvas = document.getElementById("categoryChart");
  const emptyState = document.getElementById("categoryChartEmpty");
  const totals = {};

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const product = getProductById(item.id);
      const category = product ? CATEGORY_LABELS[product.category] : "Other";
      totals[category] = (totals[category] || 0) + item.price * item.qty;
    });
  });

  const labels = Object.keys(totals);
  if (labels.length === 0) {
    canvas.classList.add("d-none");
    emptyState.classList.remove("d-none");
    return;
  }

  new Chart(canvas, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data: Object.values(totals),
          backgroundColor: ["#EE3137", "#F5A623", "#4A90D9", "#7ED957", "#9B59B6", "#2ECC71"],
        },
      ],
    },
  });
}

document.getElementById("exportReportBtn").addEventListener("click", () => {
  exportBlankPdf("amson-dashboard-report");
});
