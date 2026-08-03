/**
 * Admin dashboard: populates real stats from the orders collection
 * (Active Online Orders, Pending Payment Verification) and renders two
 * Chart.js visualizations built from real order history. Today's Total
 * Sales, Transactions Today, Low Stock, and Near-Expiry need the POS and
 * Inventory modules — neither exists yet, so those stay as placeholders
 * until those modules are built.
 */

let lastLoadedStats = null;

document.addEventListener("admin:ready", (e) => {
  document.getElementById("welcomeName").textContent = e.detail.admin.firstName || "Admin";
  loadDashboardStats();
});

async function loadDashboardStats() {
  try {
    // Fetching the whole collection is fine at today's scale; revisit
    // with date-range filtering once order volume actually grows.
    const snapshot = await db.collection("orders").get();
    const orders = snapshot.docs.map((doc) => doc.data());

    const pendingVerification = orders.filter((o) => o.status === "placed").length;
    const activeOrders = orders.filter((o) => o.status !== "received").length;

    document.getElementById("pendingVerificationCount").textContent = pendingVerification;
    document.getElementById("activeOrdersCount").textContent = activeOrders;

    lastLoadedStats = { pendingVerification, activeOrders };

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
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals — Dashboard Report", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, y);

  y += 12;
  doc.setFont(undefined, "bold");
  doc.text("Order Stats", 14, y);
  doc.setFont(undefined, "normal");
  y += 7;
  doc.text(
    `Pending Payment Verification: ${lastLoadedStats ? lastLoadedStats.pendingVerification : "—"}`,
    14,
    y
  );
  y += 7;
  doc.text(`Active Online Orders: ${lastLoadedStats ? lastLoadedStats.activeOrders : "—"}`, 14, y);

  y += 12;
  doc.setFont(undefined, "bold");
  doc.text("Note", 14, y);
  doc.setFont(undefined, "normal");
  y += 7;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Today's Total Sales, Transactions, Low Stock, and Near-Expiry figures", 14, y);
  y += 5;
  doc.text("require the POS and Inventory modules, not yet available in this report.", 14, y);

  doc.save(`amson-dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
});
