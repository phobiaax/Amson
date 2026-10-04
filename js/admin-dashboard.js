/**
 * Admin dashboard.
 */

let lastLoadedStats = null;

document.addEventListener("admin:ready", (e) => {
  document.getElementById("welcomeName").textContent = e.detail.admin.firstName || "Admin";
  loadDashboardStats();
});

const tabTodayOnlineBtn = document.getElementById("tabTodayOnlineBtn");
const tabTodayWalkinBtn = document.getElementById("tabTodayWalkinBtn");
const todayOnlinePanel = document.getElementById("todayOnlinePanel");
const todayWalkinPanel = document.getElementById("todayWalkinPanel");

tabTodayOnlineBtn.addEventListener("click", () => {
  tabTodayOnlineBtn.classList.add("active");
  tabTodayWalkinBtn.classList.remove("active");
  todayOnlinePanel.classList.remove("d-none");
  todayWalkinPanel.classList.add("d-none");
});

tabTodayWalkinBtn.addEventListener("click", () => {
  tabTodayWalkinBtn.classList.add("active");
  tabTodayOnlineBtn.classList.remove("active");
  todayWalkinPanel.classList.remove("d-none");
  todayOnlinePanel.classList.add("d-none");
});

// Local-calendar-day match (not UTC) - a POS sale at 11pm Manila time
// shouldn't get counted as "yesterday" just because UTC has already
// rolled over.
function isToday(date) {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function loadDashboardStats() {
  try {
    await loadCatalogCache();
    const ordersSnapshot = await db.collection("orders").get();
    const posSalesSnapshot = await db.collection("posSales").get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());
    const posSales = posSalesSnapshot.docs.map((doc) => doc.data());

    const pendingVerification = orders.filter((o) => o.status === "placed").length;
    const activeOrders = orders.filter((o) => o.status !== "received").length;
    const { lowStock, nearExpiry } = await computeInventoryAlertCounts();

    document.getElementById("pendingVerificationCount").textContent = pendingVerification;
    document.getElementById("activeOrdersCount").textContent = activeOrders;
    document.getElementById("lowStockCount").textContent = lowStock;
    document.getElementById("nearExpiryCount").textContent = nearExpiry;

    // POS-only, intentionally separate from online sales - the walk-in
    // counter's own daily snapshot, not blended with the web.
    const posSalesToday = posSales.filter((s) => s.createdAt && isToday(s.createdAt.toDate()));
    const posTodayTotal = posSalesToday.reduce((sum, s) => sum + (s.total || 0), 0);
    document.getElementById("posTodaySalesValue").textContent = formatPeso(posTodayTotal);
    document.getElementById("posTodayTransactionsValue").textContent = posSalesToday.length;

    // Online, same "confirmed sale" definition used by the charts below -
    // an order still awaiting verification hasn't actually become
    // revenue yet, so it shouldn't count as a transaction here either.
    const onlineOrdersToday = orders.filter(
      (o) => isConfirmedSale(o) && o.createdAt && isToday(o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt))
    );
    const onlineTodayTotal = onlineOrdersToday.reduce((sum, o) => sum + (o.total || 0), 0);
    document.getElementById("onlineTodaySalesValue").textContent = formatPeso(onlineTodayTotal);
    document.getElementById("onlineTodayTransactionsValue").textContent = onlineOrdersToday.length;

    lastLoadedStats = { pendingVerification, activeOrders, lowStock, nearExpiry };

    renderSalesChart(orders, posSales);
    renderCategoryChart(orders, posSales);
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
  }
}

// "Sold" means the payment actually cleared verification - an order
// still awaiting review (or one that never got resolved and closed
// unpaid) hasn't actually become revenue yet, so counting it here would
// overstate real sales.
function isConfirmedSale(order) {
  return order.status !== "placed" && order.status !== "closed_unresolved";
}

function renderSalesChart(orders, posSales) {
  const canvas = document.getElementById("salesChart");
  const emptyState = document.getElementById("salesChartEmpty");
  const onlineDailyTotals = {};
  const posDailyTotals = {};

  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const isoKey = date.toISOString().slice(0, 10);
    onlineDailyTotals[isoKey] = (onlineDailyTotals[isoKey] || 0) + (order.total || 0);
  });

  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    const isoKey = date.toISOString().slice(0, 10);
    posDailyTotals[isoKey] = (posDailyTotals[isoKey] || 0) + (sale.total || 0);
  });

  const sortedKeys = Array.from(new Set([...Object.keys(onlineDailyTotals), ...Object.keys(posDailyTotals)])).sort();
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
          data: sortedKeys.map((key) => onlineDailyTotals[key] || 0),
          borderColor: "#EE3137",
          backgroundColor: "rgba(238, 49, 55, 0.08)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "POS Sales (₱)",
          data: sortedKeys.map((key) => posDailyTotals[key] || 0),
          borderColor: "#4A90D9",
          backgroundColor: "rgba(74, 144, 217, 0.08)",
          fill: true,
          tension: 0.35,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function renderCategoryChart(orders, posSales) {
  const canvas = document.getElementById("categoryChart");
  const emptyState = document.getElementById("categoryChartEmpty");
  const totals = {};

  orders.filter(isConfirmedSale).forEach((order) => {
    order.items.forEach((item) => {
      const product = getProductById(item.id);
      const category = product ? CATEGORY_LABELS[product.category] : "Other";
      totals[category] = (totals[category] || 0) + item.price * item.qty;
    });
  });

  // Blended with POS - a true per-channel split doesn't translate to a
  // pie chart the way it does to the line chart above, so walk-in and
  // online revenue are combined here by category.
  (posSales || []).forEach((sale) => {
    (sale.items || []).forEach((item) => {
      const product = getProductById(item.productId);
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
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

document.getElementById("exportReportBtn").addEventListener("click", () => {
  exportBlankPdf("amson-dashboard-report");
});
