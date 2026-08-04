/**
 * Online Orders admin page: Payment Verification queue (approve/flag
 * proof-of-payment submissions) and the full Online Orders table
 * (filter/search/sort/paginate), built from real orders/{id} documents.
 */

const ORDERS_PAGE_SIZE = 8;
const HOLD_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

let allOrders = [];
let selectedVerificationId = null;
let approvedModalOrderId = null;
let ordersFilter = "all";
let ordersSearchTerm = "";
let ordersSortDesc = true;
let ordersCurrentPage = 1;

const tabVerificationBtn = document.getElementById("tabVerificationBtn");
const tabOrdersBtn = document.getElementById("tabOrdersBtn");
const verificationPanel = document.getElementById("verificationPanel");
const ordersPanel = document.getElementById("ordersPanel");

const verificationQueueList = document.getElementById("verificationQueueList");
const verificationQueueEmpty = document.getElementById("verificationQueueEmpty");
const verificationReviewPanel = document.getElementById("verificationReviewPanel");
const verificationReviewEmpty = document.getElementById("verificationReviewEmpty");
const reviewAlert = document.getElementById("reviewAlert");
const referenceNumberInput = document.getElementById("referenceNumberInput");
const paymentIssueSelect = document.getElementById("paymentIssueSelect");
const approvePaymentBtn = document.getElementById("approvePaymentBtn");

const filterButtons = Array.from(document.querySelectorAll(".order-filter-btn"));
const filterAllCount = document.getElementById("filterAllCount");
const ordersExportBtn = document.getElementById("ordersExportBtn");
const ordersSearchInput = document.getElementById("ordersSearchInput");
const ordersSortBtn = document.getElementById("ordersSortBtn");
const ordersTableBody = document.getElementById("ordersTableBody");
const ordersTableEmpty = document.getElementById("ordersTableEmpty");
const ordersPagination = document.getElementById("ordersPagination");

const holdModalEl = document.getElementById("holdModal");
const approvedModalEl = document.getElementById("approvedModal");
const trackingLinkInput = document.getElementById("trackingLinkInput");
const markDispatchedBtn = document.getElementById("markDispatchedBtn");

document.addEventListener("admin:ready", loadOrders);

async function loadOrders() {
  try {
    const snapshot = await db.collection("orders").get();
    allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderVerificationQueue();
    renderOrdersTable();
  } catch (error) {
    console.error("Failed to load orders:", error);
  }
}

/* ---------- Tabs ---------- */
function setActiveTab(tab) {
  const isVerification = tab === "verification";
  tabVerificationBtn.classList.toggle("active", isVerification);
  tabOrdersBtn.classList.toggle("active", !isVerification);
  verificationPanel.classList.toggle("d-none", !isVerification);
  ordersPanel.classList.toggle("d-none", isVerification);
}

tabVerificationBtn.addEventListener("click", () => setActiveTab("verification"));
tabOrdersBtn.addEventListener("click", () => setActiveTab("orders"));

/* ---------- Payment Verification queue ---------- */
function customerName(order) {
  return order.contact ? `${order.contact.firstName} ${order.contact.lastName}` : "—";
}

function verificationQueue() {
  return allOrders.filter((order) => order.status === "placed" && !order.paymentIssue);
}

function renderVerificationQueue() {
  const queue = verificationQueue();

  if (queue.length === 0) {
    verificationQueueList.innerHTML = "";
    verificationQueueEmpty.classList.remove("d-none");
  } else {
    verificationQueueEmpty.classList.add("d-none");
    verificationQueueList.innerHTML = queue
      .map(
        (order) => `
          <button type="button" class="verification-queue-item ${order.id === selectedVerificationId ? "active" : ""}" data-id="${order.id}">
            <div>
              <p class="fw-bold mb-0">${order.orderNumber}</p>
              <p class="text-muted mb-0" style="font-size:0.85rem;">${customerName(order)}</p>
            </div>
            <span class="fw-bold">${formatPeso(order.total)}</span>
          </button>
        `
      )
      .join("");
  }

  if (selectedVerificationId && !queue.some((order) => order.id === selectedVerificationId)) {
    selectedVerificationId = null;
  }

  if (selectedVerificationId) {
    renderReviewPanel(queue.find((order) => order.id === selectedVerificationId));
  } else {
    verificationReviewPanel.classList.add("d-none");
    verificationReviewEmpty.classList.remove("d-none");
  }
}

verificationQueueList.addEventListener("click", (e) => {
  const btn = e.target.closest(".verification-queue-item");
  if (!btn) return;
  selectedVerificationId = btn.dataset.id;
  reviewAlert.classList.add("d-none");
  paymentIssueSelect.value = "";
  renderVerificationQueue();
});

function renderReviewPanel(order) {
  verificationReviewEmpty.classList.add("d-none");
  verificationReviewPanel.classList.remove("d-none");

  document.getElementById("reviewOrderNumber").textContent = order.orderNumber;
  document.getElementById("reviewCustomerName").textContent = customerName(order);
  document.getElementById("reviewOrderTotal").textContent = formatPeso(order.total);
  document.getElementById("reviewSubmittedAt").textContent = formatOrderDateTime(order.createdAt);
  referenceNumberInput.value = "";

  const proofUrl = order.proofOfPaymentUrl || "";
  document.getElementById("reviewProofImageLink").href = proofUrl;
  document.getElementById("reviewProofImage").src = proofUrl;
}

approvePaymentBtn.addEventListener("click", async () => {
  if (!selectedVerificationId) return;
  const referenceNumber = referenceNumberInput.value.trim();

  if (!referenceNumber) {
    reviewAlert.textContent = "Please enter the reference number from the proof of payment before approving.";
    reviewAlert.classList.remove("d-none");
    return;
  }

  const orderId = selectedVerificationId;
  const order = allOrders.find((o) => o.id === orderId);

  approvePaymentBtn.disabled = true;
  reviewAlert.classList.add("d-none");

  try {
    await db.collection("orders").doc(orderId).update({
      status: "payment_confirmed",
      "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
      paymentReferenceNumber: referenceNumber,
    });

    order.status = "payment_confirmed";
    order.paymentReferenceNumber = referenceNumber;
    selectedVerificationId = null;

    renderVerificationQueue();
    renderOrdersTable();
    openApprovedModal(order);
  } catch (error) {
    reviewAlert.textContent = "Something went wrong approving this payment. Please try again.";
    reviewAlert.classList.remove("d-none");
  } finally {
    approvePaymentBtn.disabled = false;
  }
});

paymentIssueSelect.addEventListener("change", async () => {
  const reason = paymentIssueSelect.value;
  if (!reason || !selectedVerificationId) return;

  const orderId = selectedVerificationId;
  const order = allOrders.find((o) => o.id === orderId);
  const reasonLabel = paymentIssueSelect.selectedOptions[0].textContent;

  try {
    const paymentIssue = {
      reason,
      reasonLabel,
      flaggedAt: firebase.firestore.FieldValue.serverTimestamp(),
      holdUntil: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + HOLD_DURATION_MS)),
    };

    await db.collection("orders").doc(orderId).update({ paymentIssue });

    order.paymentIssue = paymentIssue;
    selectedVerificationId = null;
    paymentIssueSelect.value = "";

    renderVerificationQueue();
    renderOrdersTable();
    bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
  } catch (error) {
    reviewAlert.textContent = "Something went wrong flagging this order. Please try again.";
    reviewAlert.classList.remove("d-none");
    paymentIssueSelect.value = "";
  }
});

/* ---------- Payment approved modal ---------- */
function openApprovedModal(order) {
  approvedModalOrderId = order.id;
  const shipping = order.shipping || {};

  document.getElementById("approvedAddress").textContent =
    [shipping.streetAddress, shipping.city, shipping.province, shipping.zipCode].filter(Boolean).join(", ");
  document.getElementById("approvedCustomerName").textContent = customerName(order);
  document.getElementById("approvedContactNo").textContent = order.contact ? order.contact.contactNumber : "";
  document.getElementById("approvedDeliveryNotes").textContent = shipping.deliveryNotes || "None";
  trackingLinkInput.value = "";

  bootstrap.Modal.getOrCreateInstance(approvedModalEl).show();
}

approvedModalEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;

  const targetText = document.getElementById(btn.dataset.copyTarget).textContent;
  navigator.clipboard.writeText(targetText).then(() => {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
    }, 1500);
  });
});

markDispatchedBtn.addEventListener("click", async () => {
  if (!approvedModalOrderId) return;
  const trackingLink = trackingLinkInput.value.trim();

  if (!trackingLink) {
    trackingLinkInput.classList.add("is-invalid");
    return;
  }
  trackingLinkInput.classList.remove("is-invalid");

  const orderId = approvedModalOrderId;
  const order = allOrders.find((o) => o.id === orderId);

  markDispatchedBtn.disabled = true;

  try {
    await db.collection("orders").doc(orderId).update({
      status: "dispatched",
      "statusTimestamps.dispatched": firebase.firestore.FieldValue.serverTimestamp(),
      trackingLink,
    });

    order.status = "dispatched";
    order.trackingLink = trackingLink;
    approvedModalOrderId = null;

    bootstrap.Modal.getInstance(approvedModalEl).hide();
    renderOrdersTable();
  } catch (error) {
    alert("Something went wrong marking this order as dispatched. Please try again.");
  } finally {
    markDispatchedBtn.disabled = false;
  }
});

/* ---------- Online Orders table ---------- */
function statusIconFor(status) {
  if (status === "received" || status === "delivered") return "bi-check-circle-fill";
  if (status === "dispatched") return "bi-truck";
  return "bi-box-seam";
}

function isCompletedOrder(order) {
  return order.status === "delivered" || order.status === "received";
}

function filteredOrders() {
  let filtered = allOrders.slice();

  if (ordersFilter === "completed") {
    filtered = filtered.filter(isCompletedOrder);
  } else if (ordersFilter === "pending") {
    filtered = filtered.filter((order) => !isCompletedOrder(order));
  }

  if (ordersSearchTerm) {
    const term = ordersSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        (order.orderNumber || "").toLowerCase().includes(term) ||
        customerName(order).toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return ordersSortDesc ? bTime - aTime : aTime - bTime;
  });

  return filtered;
}

function renderOrdersTable() {
  filterAllCount.textContent = allOrders.length;

  const filtered = filteredOrders();
  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  ordersCurrentPage = Math.min(ordersCurrentPage, totalPages);

  const start = (ordersCurrentPage - 1) * ORDERS_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + ORDERS_PAGE_SIZE);

  if (pageItems.length === 0) {
    ordersTableBody.innerHTML = "";
    ordersTableEmpty.classList.remove("d-none");
  } else {
    ordersTableEmpty.classList.add("d-none");
    ordersTableBody.innerHTML = pageItems.map(renderOrderRow).join("");
  }

  renderOrdersPagination(totalPages);
}

function renderOrderRow(order) {
  const itemCount = (order.items || []).reduce((sum, item) => sum + item.qty, 0);
  const statusHtml = order.paymentIssue
    ? `<span class="order-status-badge" style="color:#b8860b;"><i class="bi bi-pause-fill"></i> On Hold</span>`
    : `<span class="order-status-badge status-${order.status}"><i class="bi ${statusIconFor(order.status)}"></i> ${ORDER_STATUS_BADGE_LABELS[order.status] || order.status}</span>`;

  return `
    <tr>
      <td class="fw-medium">${order.orderNumber}</td>
      <td>${formatOrderDateTime(order.createdAt)}</td>
      <td>${customerName(order)}</td>
      <td>${itemCount}</td>
      <td class="product-price">${formatPeso(order.total)}</td>
      <td>${statusHtml}</td>
    </tr>
  `;
}

function renderOrdersPagination(totalPages) {
  if (totalPages <= 1) {
    ordersPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${ordersCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === ordersCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${ordersCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  ordersPagination.innerHTML = html;
}

ordersPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;

  if (btn.dataset.page === "prev") ordersCurrentPage -= 1;
  else if (btn.dataset.page === "next") ordersCurrentPage += 1;
  else ordersCurrentPage = Number(btn.dataset.page);

  renderOrdersTable();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    ordersFilter = btn.dataset.filter;
    ordersCurrentPage = 1;
    renderOrdersTable();
  });
});

ordersSearchInput.addEventListener("input", () => {
  ordersSearchTerm = ordersSearchInput.value.trim();
  ordersCurrentPage = 1;
  renderOrdersTable();
});

ordersSortBtn.addEventListener("click", () => {
  ordersSortDesc = !ordersSortDesc;
  renderOrdersTable();
});

ordersExportBtn.addEventListener("click", () => {
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const orders = filteredOrders();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals — Online Orders Report", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString("en-PH")}`, 14, y);
  y += 6;
  doc.text(`Filter: ${ordersFilter} | Orders: ${orders.length}`, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Order No.", 14, y);
  doc.text("Customer", 70, y);
  doc.text("Status", 130, y);
  doc.text("Total", 196, y, { align: "right" });
  y += 3;
  doc.line(14, y, 196, y);
  doc.setFont(undefined, "normal");

  orders.forEach((order) => {
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(order.orderNumber, 14, y);
    doc.text(customerName(order), 70, y);
    doc.text(order.paymentIssue ? "On Hold" : ORDER_STATUS_BADGE_LABELS[order.status] || order.status, 130, y);
    doc.text(formatPeso(order.total), 196, y, { align: "right" });
  });

  doc.save(`amson-online-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
});
