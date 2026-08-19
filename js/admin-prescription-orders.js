/**
 * Prescription Orders admin page.
 */

const RX_ADMIN_PAGE_SIZE = 8;

const RX_STATUS_LABELS = {
  pending_verification: "Pending Verification",
  ready_for_pickup: "Ready for Pick-up",
  rejected: "Rejected",
};

const RX_STATUS_BADGE_CLASS = {
  pending_verification: "text-bg-secondary",
  ready_for_pickup: "text-bg-success",
  rejected: "text-bg-danger",
};

let allRxOrders = [];
let selectedRxQueueId = null;
let rxAllFilter = "all";
let rxAllSearchTerm = "";
let rxAllCurrentPage = 1;

const rxTabVerificationBtn = document.getElementById("rxTabVerificationBtn");
const rxTabAllBtn = document.getElementById("rxTabAllBtn");
const rxVerificationPanel = document.getElementById("rxVerificationPanel");
const rxAllPanel = document.getElementById("rxAllPanel");

const rxQueueList = document.getElementById("rxQueueList");
const rxQueueEmpty = document.getElementById("rxQueueEmpty");
const rxReviewPanel = document.getElementById("rxReviewPanel");
const rxReviewEmpty = document.getElementById("rxReviewEmpty");
const rxReviewAlert = document.getElementById("rxReviewAlert");
const rxApproveBtn = document.getElementById("rxApproveBtn");
const rxRejectBtn = document.getElementById("rxRejectBtn");

const rxRejectModalEl = document.getElementById("rxRejectModal");
const rxRejectReasonInput = document.getElementById("rxRejectReasonInput");
const rxRejectModalAlert = document.getElementById("rxRejectModalAlert");
const rxConfirmRejectBtn = document.getElementById("rxConfirmRejectBtn");

const rxAllFilterButtons = Array.from(document.querySelectorAll("#rxAllPanel .order-filter-btn"));
const rxFilterAllCount = document.getElementById("rxFilterAllCount");
const rxSearchInput = document.getElementById("rxSearchInput");
const rxAllTableBody = document.getElementById("rxAllTableBody");
const rxAllTableEmpty = document.getElementById("rxAllTableEmpty");
const rxAllPagination = document.getElementById("rxAllPagination");

document.addEventListener("admin:ready", loadRxOrders);

/* ---------- Tabs ---------- */
function setActiveRxTab(tab) {
  const isVerification = tab === "verification";
  rxTabVerificationBtn.classList.toggle("active", isVerification);
  rxTabAllBtn.classList.toggle("active", !isVerification);
  rxVerificationPanel.classList.toggle("d-none", !isVerification);
  rxAllPanel.classList.toggle("d-none", isVerification);
}

rxTabVerificationBtn.addEventListener("click", () => setActiveRxTab("verification"));
rxTabAllBtn.addEventListener("click", () => setActiveRxTab("all"));

/* ---------- Load ---------- */
function customerNameForRxOrder(order) {
  return order.contact ? `${order.contact.firstName} ${order.contact.lastName}` : "-";
}

async function loadRxOrders() {
  try {
    await loadCatalogCache();
    const snapshot = await db.collection("prescriptionOrders").get();
    allRxOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderRxQueue();
    renderRxAllTable();
  } catch (error) {
    console.error("Failed to load prescription orders:", error);
  }
}

/* ---------- Verification Queue ---------- */
function rxQueue() {
  return allRxOrders
    .filter((o) => o.status === "pending_verification")
    .slice()
    .sort((a, b) => {
      const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
      return aTime - bTime;
    });
}

function renderRxQueue() {
  const queue = rxQueue();

  if (queue.length === 0) {
    rxQueueList.innerHTML = "";
    rxQueueEmpty.classList.remove("d-none");
  } else {
    rxQueueEmpty.classList.add("d-none");
    rxQueueList.innerHTML = queue
      .map(
        (order) => `
          <button type="button" class="verification-queue-item ${order.id === selectedRxQueueId ? "active" : ""}" data-id="${order.id}">
            <div>
              <p class="fw-bold mb-0">${order.orderNumber}</p>
              <p class="text-muted mb-0" style="font-size:0.85rem;">${customerNameForRxOrder(order)}</p>
            </div>
            <span class="fw-bold">${formatPeso(order.total)}</span>
          </button>
        `
      )
      .join("");

    document.querySelectorAll("#rxQueueList .verification-queue-item").forEach((btn) => {
      btn.addEventListener("click", () => selectRxQueueItem(btn.dataset.id));
    });
  }

  if (selectedRxQueueId && !queue.some((order) => order.id === selectedRxQueueId)) {
    selectedRxQueueId = null;
  }

  if (selectedRxQueueId) {
    renderRxReviewPanel(queue.find((order) => order.id === selectedRxQueueId));
  } else {
    rxReviewPanel.classList.add("d-none");
    rxReviewEmpty.classList.remove("d-none");
  }
}

function selectRxQueueItem(id) {
  selectedRxQueueId = id;
  rxReviewAlert.classList.add("d-none");
  renderRxQueue();
}

function renderRxReviewPanel(order) {
  rxReviewEmpty.classList.add("d-none");
  rxReviewPanel.classList.remove("d-none");

  document.getElementById("rxReviewOrderNumber").textContent = order.orderNumber;
  document.getElementById("rxReviewCustomerName").textContent = customerNameForRxOrder(order);
  document.getElementById("rxReviewOrderTotal").textContent = formatPeso(order.total);
  document.getElementById("rxReviewSubmittedAt").textContent = formatOrderDateTime(order.createdAt);

  document.getElementById("rxReviewItemsList").innerHTML = order.items
    .map((item) => `<p class="mb-1">${item.name} <span class="text-muted">× ${item.qty}</span></p>`)
    .join("");

  const prescriptionUrl = order.prescriptionImageUrl || "";
  document.getElementById("rxReviewPrescriptionLink").href = prescriptionUrl;
  document.getElementById("rxReviewPrescriptionImage").src = prescriptionUrl;

  const paymentUrl = order.proofOfPaymentUrl || "";
  document.getElementById("rxReviewPaymentLink").href = paymentUrl;
  document.getElementById("rxReviewPaymentImage").src = paymentUrl;
}

/* ---------- Approve ---------- */
rxApproveBtn.addEventListener("click", async () => {
  if (!selectedRxQueueId) return;
  const order = allRxOrders.find((o) => o.id === selectedRxQueueId);
  if (!order) return;

  if (!confirm(`Approve prescription pre-order ${order.orderNumber}? This will deduct stock and mark it Ready for Pick-up.`)) return;

  rxApproveBtn.disabled = true;
  rxReviewAlert.classList.add("d-none");

  try {
    for (const item of order.items) {
      await deductStockFEFO(item.id, item.qty);
    }

    await db.collection("prescriptionOrders").doc(order.id).update({
      status: "ready_for_pickup",
      "statusTimestamps.ready_for_pickup": firebase.firestore.FieldValue.serverTimestamp(),
    });

    await logAuditEvent({
      action: "Prescription Pre-Order Approved",
      details: `${order.orderNumber} - ${customerNameForRxOrder(order)}`,
    });

    selectedRxQueueId = null;
    await loadRxOrders();
  } catch (error) {
    rxReviewAlert.textContent = error.message || "Something went wrong approving this pre-order. Please try again.";
    rxReviewAlert.classList.remove("d-none");
  } finally {
    rxApproveBtn.disabled = false;
  }
});

/* ---------- Reject ---------- */
rxRejectBtn.addEventListener("click", () => {
  if (!selectedRxQueueId) return;
  rxRejectReasonInput.value = "";
  rxRejectModalAlert.classList.add("d-none");
  bootstrap.Modal.getOrCreateInstance(rxRejectModalEl).show();
});

rxConfirmRejectBtn.addEventListener("click", async () => {
  const order = allRxOrders.find((o) => o.id === selectedRxQueueId);
  const reason = rxRejectReasonInput.value.trim();
  if (!order) return;

  if (!reason) {
    rxRejectModalAlert.textContent = "Please state a reason for the rejection.";
    rxRejectModalAlert.classList.remove("d-none");
    return;
  }

  rxConfirmRejectBtn.disabled = true;
  rxRejectModalAlert.classList.add("d-none");

  try {
    await db.collection("prescriptionOrders").doc(order.id).update({
      status: "rejected",
      rejectionReason: reason,
      "statusTimestamps.rejected": firebase.firestore.FieldValue.serverTimestamp(),
    });

    await logAuditEvent({
      action: "Prescription Pre-Order Rejected",
      details: `${order.orderNumber} - ${customerNameForRxOrder(order)} - Reason: ${reason}`,
    });

    bootstrap.Modal.getInstance(rxRejectModalEl).hide();
    selectedRxQueueId = null;
    await loadRxOrders();
  } catch (error) {
    rxRejectModalAlert.textContent = "Something went wrong rejecting this pre-order. Please try again.";
    rxRejectModalAlert.classList.remove("d-none");
  } finally {
    rxConfirmRejectBtn.disabled = false;
  }
});

/* ---------- All Prescription Orders table ---------- */
function filteredRxOrders() {
  let filtered = allRxOrders.slice();

  if (rxAllFilter !== "all") {
    filtered = filtered.filter((o) => o.status === rxAllFilter);
  }

  if (rxAllSearchTerm) {
    const term = rxAllSearchTerm.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        (o.orderNumber || "").toLowerCase().includes(term) ||
        customerNameForRxOrder(o).toLowerCase().includes(term)
    );
  }

  filtered.sort((a, b) => {
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });

  return filtered;
}

function renderRxAllTable() {
  rxFilterAllCount.textContent = allRxOrders.length;

  const filtered = filteredRxOrders();
  const totalPages = Math.max(1, Math.ceil(filtered.length / RX_ADMIN_PAGE_SIZE));
  rxAllCurrentPage = Math.min(rxAllCurrentPage, totalPages);

  const start = (rxAllCurrentPage - 1) * RX_ADMIN_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + RX_ADMIN_PAGE_SIZE);

  if (pageItems.length === 0) {
    rxAllTableBody.innerHTML = "";
    rxAllTableEmpty.classList.remove("d-none");
  } else {
    rxAllTableEmpty.classList.add("d-none");
    rxAllTableBody.innerHTML = pageItems.map(renderRxAllRow).join("");
  }

  renderRxAllPagination(totalPages);
}

function renderRxAllRow(order) {
  return `
    <tr>
      <td class="fw-medium">${order.orderNumber}</td>
      <td>${formatOrderDateTime(order.createdAt)}</td>
      <td>${customerNameForRxOrder(order)}</td>
      <td class="product-price">${formatPeso(order.total)}</td>
      <td><span class="badge rounded-pill ${RX_STATUS_BADGE_CLASS[order.status]}">${RX_STATUS_LABELS[order.status] || order.status}</span></td>
    </tr>
  `;
}

function renderRxAllPagination(totalPages) {
  if (totalPages <= 1) {
    rxAllPagination.innerHTML = "";
    return;
  }

  let html = `<button type="button" data-page="prev" ${rxAllCurrentPage === 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button type="button" data-page="${i}" class="${i === rxAllCurrentPage ? "active" : ""}">${i}</button>`;
  }
  html += `<button type="button" data-page="next" ${rxAllCurrentPage === totalPages ? "disabled" : ""}><i class="bi bi-chevron-right"></i></button>`;

  rxAllPagination.innerHTML = html;
}

rxAllPagination.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-page]");
  if (!btn) return;
  if (btn.dataset.page === "prev") rxAllCurrentPage -= 1;
  else if (btn.dataset.page === "next") rxAllCurrentPage += 1;
  else rxAllCurrentPage = Number(btn.dataset.page);
  renderRxAllTable();
});

rxAllFilterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    rxAllFilterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    rxAllFilter = btn.dataset.filter;
    rxAllCurrentPage = 1;
    renderRxAllTable();
  });
});

rxSearchInput.addEventListener("input", () => {
  rxAllSearchTerm = rxSearchInput.value.trim();
  rxAllCurrentPage = 1;
  renderRxAllTable();
});
