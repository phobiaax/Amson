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

// ---- Analytics period filter (Today / Week / Month / Year) ----
// All local-calendar-based, not rolling 24h/UTC windows, so "Today"
// matches the same definition as the Today's Total Sales tiles above.
let dashboardPeriod = "month";
let lastLoadedOrders = [];
let lastLoadedPosSales = [];

function periodStartDate(period) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") return start;
  if (period === "week") {
    start.setDate(start.getDate() - 6);
    return start;
  }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), 1); // month
}

function localDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// The bucket a given date falls into for the current period's chart -
// hourly for Today (a single day has nothing to group by otherwise),
// daily for Week/Month, monthly for Year (365 daily points would be
// unreadable).
function dashboardBucketKey(date, period) {
  if (period === "today") return String(date.getHours()).padStart(2, "0");
  if (period === "year") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  return localDayKey(date);
}

function dashboardBucketLabel(key, period) {
  if (period === "today") {
    const d = new Date();
    d.setHours(parseInt(key, 10), 0, 0, 0);
    return d.toLocaleTimeString("en-PH", { hour: "numeric" });
  }
  if (period === "year") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("en-PH", { month: "short" });
  }
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// Every bucket key that should appear on the chart for this period, in
// order, even if a given hour/day/month had zero sales - so the x-axis
// doesn't just skip around based on whichever days happened to have data.
function dashboardAllBucketKeys(period) {
  const now = new Date();
  if (period === "today") {
    const keys = [];
    for (let h = 0; h <= now.getHours(); h++) keys.push(String(h).padStart(2, "0"));
    return keys;
  }
  if (period === "year") {
    const keys = [];
    for (let m = 0; m <= now.getMonth(); m++) keys.push(`${now.getFullYear()}-${String(m + 1).padStart(2, "0")}`);
    return keys;
  }
  const keys = [];
  const cursor = new Date(periodStartDate(period));
  while (cursor <= now) {
    keys.push(localDayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function inPeriod(date, period) {
  return date >= periodStartDate(period);
}

document.querySelectorAll("#dashboardPeriodGroup .dashboard-period-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#dashboardPeriodGroup .dashboard-period-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    dashboardPeriod = btn.dataset.period;
    renderSalesChart(lastLoadedOrders, lastLoadedPosSales);
    renderCategoryChart(lastLoadedOrders, lastLoadedPosSales);
    renderMostBoughtItems(lastLoadedOrders, lastLoadedPosSales);
  });
});

async function loadDashboardStats() {
  try {
    await loadCatalogCache();
    const ordersSnapshot = await db.collection("orders").get();
    const posSalesSnapshot = await db.collection("posSales").get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());
    const posSales = posSalesSnapshot.docs.map((doc) => doc.data());

    const pendingVerification = orders.filter((o) => o.status === "placed").length;
    const activeOrders = orders.filter((o) => o.status !== "received").length;
    const { lowStock, nearExpiry, outOfStock } = await computeInventoryAlertCounts();

    document.getElementById("pendingVerificationCount").textContent = pendingVerification;
    document.getElementById("activeOrdersCount").textContent = activeOrders;
    document.getElementById("lowStockCount").textContent = lowStock;
    document.getElementById("nearExpiryCount").textContent = nearExpiry;
    document.getElementById("outOfStockCount").textContent = outOfStock;

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
    lastLoadedOrders = orders;
    lastLoadedPosSales = posSales;

    renderSalesChart(orders, posSales);
    renderCategoryChart(orders, posSales);
    renderMostBoughtItems(orders, posSales);
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

let salesChartInstance = null;

function renderSalesChart(orders, posSales) {
  const canvas = document.getElementById("salesChart");
  const emptyState = document.getElementById("salesChartEmpty");
  const period = dashboardPeriod;
  const onlineTotals = {};
  const posTotals = {};

  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
    const key = dashboardBucketKey(date, period);
    onlineTotals[key] = (onlineTotals[key] || 0) + (order.total || 0);
  });

  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    const key = dashboardBucketKey(date, period);
    posTotals[key] = (posTotals[key] || 0) + (sale.total || 0);
  });

  if (salesChartInstance) {
    salesChartInstance.destroy();
    salesChartInstance = null;
  }

  const keys = dashboardAllBucketKeys(period);
  if (Object.keys(onlineTotals).length === 0 && Object.keys(posTotals).length === 0) {
    canvas.classList.add("d-none");
    emptyState.classList.remove("d-none");
    return;
  }

  canvas.classList.remove("d-none");
  emptyState.classList.add("d-none");
  const labels = keys.map((key) => dashboardBucketLabel(key, period));

  salesChartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Online Sales (₱)",
          data: keys.map((key) => onlineTotals[key] || 0),
          borderColor: "#EE3137",
          backgroundColor: "rgba(238, 49, 55, 0.08)",
          fill: true,
          tension: 0.35,
        },
        {
          label: "POS Sales (₱)",
          data: keys.map((key) => posTotals[key] || 0),
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

let categoryChartInstance = null;

function renderCategoryChart(orders, posSales) {
  const canvas = document.getElementById("categoryChart");
  const emptyState = document.getElementById("categoryChartEmpty");
  const period = dashboardPeriod;
  const totals = {};

  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
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
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    (sale.items || []).forEach((item) => {
      const product = getProductById(item.productId);
      const category = product ? CATEGORY_LABELS[product.category] : "Other";
      totals[category] = (totals[category] || 0) + item.price * item.qty;
    });
  });

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
    categoryChartInstance = null;
  }

  const labels = Object.keys(totals);
  if (labels.length === 0) {
    canvas.classList.add("d-none");
    emptyState.classList.remove("d-none");
    return;
  }

  canvas.classList.remove("d-none");
  emptyState.classList.add("d-none");
  categoryChartInstance = new Chart(canvas, {
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

// ---- Most Bought Items (by quantity, within the selected period) ----
function renderMostBoughtItems(orders, posSales) {
  const listEl = document.getElementById("mostBoughtList");
  const emptyEl = document.getElementById("mostBoughtEmpty");
  const period = dashboardPeriod;
  const qtyByProduct = {};
  const nameByProduct = {};

  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
    order.items.forEach((item) => {
      qtyByProduct[item.id] = (qtyByProduct[item.id] || 0) + item.qty;
      const product = getProductById(item.id);
      nameByProduct[item.id] = product ? product.name : item.name || "Unknown product";
    });
  });

  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    (sale.items || []).forEach((item) => {
      qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.qty;
      const product = getProductById(item.productId);
      nameByProduct[item.productId] = product ? product.name : item.name || "Unknown product";
    });
  });

  const ranked = Object.keys(qtyByProduct)
    .map((id) => ({ id, name: nameByProduct[id], qty: qtyByProduct[id] }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  if (ranked.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("d-none");
    return;
  }

  emptyEl.classList.add("d-none");
  listEl.innerHTML = ranked
    .map(
      (item, idx) => `
        <div class="d-flex justify-content-between align-items-center">
          <span><strong>#${idx + 1}</strong> ${item.name}</span>
          <span class="text-muted">${item.qty} sold</span>
        </div>
      `
    )
    .join("");
}

document.getElementById("exportReportBtn").addEventListener("click", () => {
  exportBlankPdf("amson-dashboard-report");
});

// ---- Sales Analytics export (PDF / Excel) ----
// Reuses the exact same bucketing/filtering helpers the on-screen charts use,
// so the export always matches whatever period is currently selected -
// never a second, drifting definition of "this period's sales."
function dashboardPeriodLabel(period) {
  return { today: "Today", week: "This Week", month: "This Month", year: "This Year" }[period] || period;
}

function buildSalesAnalyticsReport() {
  const period = dashboardPeriod;
  const orders = lastLoadedOrders;
  const posSales = lastLoadedPosSales;

  const onlineTotals = {};
  const posTotals = {};
  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
    const key = dashboardBucketKey(date, period);
    onlineTotals[key] = (onlineTotals[key] || 0) + (order.total || 0);
  });
  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    const key = dashboardBucketKey(date, period);
    posTotals[key] = (posTotals[key] || 0) + (sale.total || 0);
  });
  const keys = dashboardAllBucketKeys(period);
  const timeSeries = keys.map((key) => ({
    label: dashboardBucketLabel(key, period),
    online: onlineTotals[key] || 0,
    pos: posTotals[key] || 0,
    total: (onlineTotals[key] || 0) + (posTotals[key] || 0),
  }));

  const categoryTotals = {};
  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
    order.items.forEach((item) => {
      const product = getProductById(item.id);
      const category = product ? CATEGORY_LABELS[product.category] : "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + item.price * item.qty;
    });
  });
  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    (sale.items || []).forEach((item) => {
      const product = getProductById(item.productId);
      const category = product ? CATEGORY_LABELS[product.category] : "Other";
      categoryTotals[category] = (categoryTotals[category] || 0) + item.price * item.qty;
    });
  });
  const categories = Object.keys(categoryTotals)
    .map((category) => ({ category, revenue: categoryTotals[category] }))
    .sort((a, b) => b.revenue - a.revenue);

  const qtyByProduct = {};
  const nameByProduct = {};
  orders.filter(isConfirmedSale).forEach((order) => {
    if (!order.createdAt) return;
    const date = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (!inPeriod(date, period)) return;
    order.items.forEach((item) => {
      qtyByProduct[item.id] = (qtyByProduct[item.id] || 0) + item.qty;
      const product = getProductById(item.id);
      nameByProduct[item.id] = product ? product.name : item.name || "Unknown product";
    });
  });
  (posSales || []).forEach((sale) => {
    if (!sale.createdAt) return;
    const date = sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(sale.createdAt);
    if (!inPeriod(date, period)) return;
    (sale.items || []).forEach((item) => {
      qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.qty;
      const product = getProductById(item.productId);
      nameByProduct[item.productId] = product ? product.name : item.name || "Unknown product";
    });
  });
  const mostBought = Object.keys(qtyByProduct)
    .map((id) => ({ name: nameByProduct[id], qty: qtyByProduct[id] }))
    .sort((a, b) => b.qty - a.qty);

  return { period, timeSeries, categories, mostBought };
}

document.getElementById("exportAnalyticsPdfBtn").addEventListener("click", () => {
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { period, timeSeries, categories, mostBought } = buildSalesAnalyticsReport();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const marginX = 14;
  let y = 18;

  doc.setFontSize(16);
  doc.text("Amson Pharmaceuticals - Sales Analytics", marginX, y);
  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Period: ${dashboardPeriodLabel(period)}  |  Generated: ${new Date().toLocaleString("en-PH")}`, marginX, y);
  doc.setTextColor(0);
  y += 10;

  function sectionHeading(title) {
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(title, marginX, y);
    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    y += 7;
  }

  function row(left, right) {
    if (y > 280) {
      doc.addPage();
      y = 18;
    }
    doc.text(left, marginX, y);
    if (right !== undefined) doc.text(right, 160, y, { align: "right" });
    y += 6;
  }

  sectionHeading("Sales Performance");
  if (timeSeries.length === 0) {
    row("No sales in this period.");
  } else {
    timeSeries.forEach((point) => row(point.label, formatPeso(point.total)));
  }
  y += 4;

  sectionHeading("Revenue by Category");
  if (categories.length === 0) {
    row("No sales data in this period.");
  } else {
    categories.forEach((c) => row(c.category, formatPeso(c.revenue)));
  }
  y += 4;

  sectionHeading("Most Bought Items");
  if (mostBought.length === 0) {
    row("No sales data in this period.");
  } else {
    mostBought.forEach((item, idx) => row(`#${idx + 1} ${item.name}`, `${item.qty} sold`));
  }

  doc.save(`amson-sales-analytics-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
});

document.getElementById("exportAnalyticsExcelBtn").addEventListener("click", () => {
  if (typeof XLSX === "undefined") {
    showAppAlert("Excel export isn't available right now. Please try again in a moment.");
    return;
  }

  const { period, timeSeries, categories, mostBought } = buildSalesAnalyticsReport();
  const wb = XLSX.utils.book_new();

  const salesSheet = XLSX.utils.json_to_sheet(
    timeSeries.map((point) => ({
      Period: point.label,
      "Online Sales": point.online,
      "POS Sales": point.pos,
      Total: point.total,
    }))
  );
  XLSX.utils.book_append_sheet(wb, salesSheet, "Sales Performance");

  const categorySheet = XLSX.utils.json_to_sheet(
    categories.map((c) => ({ Category: c.category, Revenue: c.revenue }))
  );
  XLSX.utils.book_append_sheet(wb, categorySheet, "Revenue by Category");

  const mostBoughtSheet = XLSX.utils.json_to_sheet(
    mostBought.map((item, idx) => ({ Rank: idx + 1, Product: item.name, "Quantity Sold": item.qty }))
  );
  XLSX.utils.book_append_sheet(wb, mostBoughtSheet, "Most Bought Items");

  XLSX.writeFile(wb, `amson-sales-analytics-${period}-${new Date().toISOString().slice(0, 10)}.xlsx`);
});
