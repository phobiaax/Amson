/**
 * Online Orders admin page.
 */

const ORDERS_PAGE_SIZE = 8;
const HOLD_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const PAYMENT_ISSUE_TYPES = {
  invalid_payment: {
    label: "Invalid payment",
    banner: "Customer will be notified to re-upload a valid GCash payment screenshot.",
    confirmLabel: "Confirm & place on hold",
    mode: "hold",
  },
  underpayment: {
    label: "Underpayment",
    banner: "Customer will be notified to top up the remaining balance via GCash before this order can proceed.",
    confirmLabel: "Confirm & place on hold",
    mode: "hold",
  },
  overpayment: {
    label: "Overpayment",
    banner: "Customer will be notified that the excess payment will be applied to their next transaction.",
    confirmLabel: "Confirm & approve payment",
    mode: "approve",
  },
};

const REJECTION_REASON_NOTES = {
  unclear_screenshot: "Please re-upload a clear screenshot showing completed GCash transaction.",
  incomplete_screenshot:
    "Please re-upload a screenshot showing the complete GCash transaction, including the reference number and amount.",
  payment_not_received:
    "We have not received your payment. Please double-check and re-upload proof of a completed GCash transaction.",
  other: "",
};

const UNDERPAYMENT_NOTE = "Please send the remaining balance to our GCash and re-upload your screenshot.";
const OVERPAYMENT_NOTE = "We've noted an excess payment. This will be applied to your next transaction.";

let allOrders = [];
let selectedVerificationId = null;
let approvedModalOrderId = null;
let issueType = null;
let issueNoteManuallyEdited = false;
let ordersFilter = "all";
let ordersSearchTerm = "";
let ordersSortDesc = true;
let ordersCurrentPage = 1;
let verificationSearchTerm = "";
let verificationSortDesc = true;

const tabVerificationBtn = document.getElementById("tabVerificationBtn");
const tabOrdersBtn = document.getElementById("tabOrdersBtn");
const verificationPanel = document.getElementById("verificationPanel");
const ordersPanel = document.getElementById("ordersPanel");

const verificationQueueList = document.getElementById("verificationQueueList");
const verificationQueueEmpty = document.getElementById("verificationQueueEmpty");
const verificationSearchInput = document.getElementById("verificationSearchInput");
const verificationSortBtn = document.getElementById("verificationSortBtn");
const verificationReviewPanel = document.getElementById("verificationReviewPanel");
const verificationReviewEmpty = document.getElementById("verificationReviewEmpty");
const reviewAlert = document.getElementById("reviewAlert");
const reviewReferenceNumber = document.getElementById("reviewReferenceNumber");
const paymentIssueSelect = document.getElementById("paymentIssueSelect");
const approvePaymentBtn = document.getElementById("approvePaymentBtn");

const filterButtons = Array.from(document.querySelectorAll("#ordersPanel .order-filter-btn"));
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
const pickupReadyModalEl = document.getElementById("pickupReadyModal");

const paymentIssueModalEl = document.getElementById("paymentIssueModal");
const issueModalTitle = document.getElementById("issueModalTitle");
const issueModalBanner = document.getElementById("issueModalBanner");
const issueModalOrderNumber = document.getElementById("issueModalOrderNumber");
const issueModalOrderTotal = document.getElementById("issueModalOrderTotal");
const issueReasonGroup = document.getElementById("issueReasonGroup");
const issueReasonSelect = document.getElementById("issueReasonSelect");
const issueAmountGroup = document.getElementById("issueAmountGroup");
const issueAmountReceivedInput = document.getElementById("issueAmountReceivedInput");
const issueAmountResultLabel = document.getElementById("issueAmountResultLabel");
const issueAmountResultValue = document.getElementById("issueAmountResultValue");
const issueNoteInput = document.getElementById("issueNoteInput");
const issueConfirmBtn = document.getElementById("issueConfirmBtn");

document.addEventListener("admin:ready", loadOrders);

async function loadOrders() {
  try {
    const snapshot = await db.collection("orders").get();
    allOrders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    for (const order of allOrders) {
      await enforceOrderDeadline(order.id, order);
    }

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
  return order.contact ? `${order.contact.firstName} ${order.contact.lastName}` : "-";
}

function verificationQueue() {
  let queue = allOrders.filter((order) => order.status === "placed" && !order.paymentIssue);

  if (verificationSearchTerm) {
    const term = verificationSearchTerm.toLowerCase();
    queue = queue.filter(
      (order) =>
        (order.orderNumber || "").toLowerCase().includes(term) ||
        customerName(order).toLowerCase().includes(term)
    );
  }

  queue.sort((a, b) => {
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return verificationSortDesc ? bTime - aTime : aTime - bTime;
  });

  return queue;
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
              <p class="text-muted mb-0" style="font-size:0.78rem;">${formatOrderDate(order.createdAt)}</p>
            </div>
            <span class="fw-bold">${formatPeso(order.total)}</span>
          </button>
        `
      )
      .join("");

    document.querySelectorAll("#verificationQueueList .verification-queue-item").forEach((btn) => {
      btn.addEventListener("click", () => selectVerificationItem(btn.dataset.id));
    });
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

function selectVerificationItem(id) {
  selectedVerificationId = id;
  reviewAlert.classList.add("d-none");
  paymentIssueSelect.value = "";
  renderVerificationQueue();
}

function renderReviewPanel(order) {
  verificationReviewEmpty.classList.add("d-none");
  verificationReviewPanel.classList.remove("d-none");

  document.getElementById("reviewOrderNumber").textContent = order.orderNumber;
  document.getElementById("reviewCustomerName").textContent = customerName(order);
  document.getElementById("reviewOrderTotal").textContent = formatPeso(order.total);
  document.getElementById("reviewSubmittedAt").textContent = formatOrderDateTime(order.createdAt);
  reviewReferenceNumber.textContent = order.paymentReferenceNumber || "-";

  const proofUrl = order.proofOfPaymentUrl || "";
  document.getElementById("reviewProofImageLink").href = proofUrl;
  document.getElementById("reviewProofImage").src = proofUrl;

  const prescriptionSection = document.getElementById("reviewPrescriptionSection");
  if (order.prescriptionPhotoUrl) {
    document.getElementById("reviewPrescriptionLink").href = order.prescriptionPhotoUrl;
    document.getElementById("reviewPrescriptionImage").src = order.prescriptionPhotoUrl;
    prescriptionSection.classList.remove("d-none");
  } else {
    prescriptionSection.classList.add("d-none");
  }
}

approvePaymentBtn.addEventListener("click", async () => {
  if (!selectedVerificationId) return;

  const orderId = selectedVerificationId;
  const order = allOrders.find((o) => o.id === orderId);

  approvePaymentBtn.disabled = true;
  reviewAlert.classList.add("d-none");

  try {
    for (const item of order.items || []) {
      await deductStockFEFO(item.id, item.qty);
    }

    if (order.requiresPrescription) {
      // Pick-up orders have no courier leg - go straight to "ready for pick-up".
      await db.collection("orders").doc(orderId).update({
        status: "delivered",
        "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
        "statusTimestamps.delivered": firebase.firestore.FieldValue.serverTimestamp(),
      });
      order.status = "delivered";
    } else {
      await db.collection("orders").doc(orderId).update({
        status: "payment_confirmed",
        "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
      });
      order.status = "payment_confirmed";
    }

    selectedVerificationId = null;

    renderVerificationQueue();
    renderOrdersTable();
    if (order.requiresPrescription) {
      bootstrap.Modal.getOrCreateInstance(pickupReadyModalEl).show();
    } else {
      openApprovedModal(order);
    }
  } catch (error) {
    reviewAlert.textContent = error.message || "Something went wrong approving this payment. Please try again.";
    reviewAlert.classList.remove("d-none");
  } finally {
    approvePaymentBtn.disabled = false;
  }
});

paymentIssueSelect.addEventListener("change", () => {
  const type = paymentIssueSelect.value;
  paymentIssueSelect.value = "";
  if (!type || !selectedVerificationId) return;
  openPaymentIssueModal(type);
});

function updateIssueAmountResult(order) {
  const received = parseFloat(issueAmountReceivedInput.value);
  const validReceived = isNaN(received) ? 0 : received;
  const diff = validReceived - order.total;

  if (issueType === "underpayment") {
    issueAmountResultLabel.textContent = "Outstanding balance";
    issueAmountResultValue.textContent = `${formatPeso(Math.max(0, -diff))} remaining`;
  } else {
    issueAmountResultLabel.textContent = "Excess amount (Unapplied payment)";
    issueAmountResultValue.textContent = `${formatPeso(Math.max(0, diff))} excess`;
  }
}

function openPaymentIssueModal(type) {
  const order = allOrders.find((o) => o.id === selectedVerificationId);
  if (!order) return;

  issueType = type;
  issueNoteManuallyEdited = false;
  const config = PAYMENT_ISSUE_TYPES[type];

  issueModalTitle.textContent = `Payment Issue: ${config.label}`;
  issueModalBanner.textContent = config.banner;
  issueModalOrderNumber.textContent = order.orderNumber;
  issueModalOrderTotal.textContent = formatPeso(order.total);
  issueConfirmBtn.textContent = config.confirmLabel;

  issueReasonGroup.classList.toggle("d-none", type !== "invalid_payment");
  issueAmountGroup.classList.toggle("d-none", type === "invalid_payment");

  if (type === "invalid_payment") {
    issueReasonSelect.value = "unclear_screenshot";
    issueNoteInput.value = REJECTION_REASON_NOTES.unclear_screenshot;
  } else {
    issueAmountReceivedInput.value = "";
    updateIssueAmountResult(order);
    issueNoteInput.value = type === "underpayment" ? UNDERPAYMENT_NOTE : OVERPAYMENT_NOTE;
  }

  bootstrap.Modal.getOrCreateInstance(paymentIssueModalEl).show();
}

issueReasonSelect.addEventListener("change", () => {
  if (!issueNoteManuallyEdited) {
    issueNoteInput.value = REJECTION_REASON_NOTES[issueReasonSelect.value] || "";
  }
});

issueAmountReceivedInput.addEventListener("input", () => {
  const order = allOrders.find((o) => o.id === selectedVerificationId);
  if (order) updateIssueAmountResult(order);
});

issueNoteInput.addEventListener("input", () => {
  issueNoteManuallyEdited = true;
});

issueConfirmBtn.addEventListener("click", async () => {
  const orderId = selectedVerificationId;
  const order = allOrders.find((o) => o.id === orderId);
  if (!order || !issueType) return;

  const config = PAYMENT_ISSUE_TYPES[issueType];
  const note = issueNoteInput.value.trim();

  issueConfirmBtn.disabled = true;

  try {
    if (config.mode === "hold") {
      const paymentIssue = {
        type: issueType,
        note,
        flaggedAt: firebase.firestore.FieldValue.serverTimestamp(),
        holdUntil: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + HOLD_DURATION_MS)),
      };

      if (issueType === "invalid_payment") {
        paymentIssue.reason = issueReasonSelect.value;
        paymentIssue.reasonLabel = issueReasonSelect.selectedOptions[0].textContent;
      } else {
        const received = parseFloat(issueAmountReceivedInput.value) || 0;
        paymentIssue.amountReceived = received;
        paymentIssue.outstandingBalance = Math.max(0, order.total - received);
      }

      await db.collection("orders").doc(orderId).update({ paymentIssue });

      order.paymentIssue = paymentIssue;
      selectedVerificationId = null;

      renderVerificationQueue();
      renderOrdersTable();
      bootstrap.Modal.getInstance(paymentIssueModalEl).hide();
      bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
    } else {
      const received = parseFloat(issueAmountReceivedInput.value) || order.total;

      for (const item of order.items || []) {
        await deductStockFEFO(item.id, item.qty);
      }

      const update = {
        status: order.requiresPrescription ? "delivered" : "payment_confirmed",
        "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
        paymentOverage: {
          amountReceived: received,
          excessAmount: Math.max(0, received - order.total),
          note,
        },
      };
      if (order.requiresPrescription) update["statusTimestamps.delivered"] = firebase.firestore.FieldValue.serverTimestamp();

      await db.collection("orders").doc(orderId).update(update);

      order.status = update.status;
      order.paymentOverage = update.paymentOverage;
      selectedVerificationId = null;

      renderVerificationQueue();
      renderOrdersTable();
      bootstrap.Modal.getInstance(paymentIssueModalEl).hide();
      if (order.requiresPrescription) {
        bootstrap.Modal.getOrCreateInstance(pickupReadyModalEl).show();
      } else {
        openApprovedModal(order);
      }
    }
  } catch (error) {
    alert(error.message || "Something went wrong. Please try again.");
  } finally {
    issueConfirmBtn.disabled = false;
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

    document.querySelectorAll(".order-status-select").forEach((select) => {
      select.addEventListener("change", () => handleOrderStatusChange(select));
    });
    document.querySelectorAll(".release-hold-btn").forEach((btn) => {
      btn.addEventListener("click", () => releaseOrderHold(btn));
    });
  }

  renderOrdersPagination(totalPages);
}

function renderOrderRow(order) {
  let itemCount = 0;
  for (const item of order.items || []) {
    itemCount += item.qty;
  }

  const steps = orderStatusSteps(order);
  const labels = orderStepLabels(order);
  const currentIndex = steps.indexOf(order.status);
  const nextStep = steps[currentIndex + 1];
  // "received" is confirmed by the customer, never set by staff - once the
  // only remaining step is "received", there's nothing left for staff to
  // do here. Staff can also only ever move forward one step at a time,
  // never skip ahead and never go back.
  const staffCanAdvance = order.status !== "cancelled" && nextStep && nextStep !== "received";

  let statusCell;
  if (order.status === "cancelled") {
    statusCell = `<span class="badge rounded-pill text-bg-danger">Cancelled</span>`;
  } else if (staffCanAdvance) {
    statusCell = `<select class="form-select form-select-sm order-status-select status-${order.status}" data-id="${order.id}" aria-label="Order status">
          <option value="${order.status}" selected>${labels[order.status]}</option>
          <option value="${nextStep}">${labels[nextStep]}</option>
        </select>`;
  } else {
    statusCell = `<select class="form-select form-select-sm order-status-select status-${order.status}" disabled aria-label="Order status">
          <option selected>${labels[order.status]}</option>
        </select>`;
  }

  return `
    <tr>
      <td class="fw-medium">${order.orderNumber}</td>
      <td>${formatOrderDateTime(order.createdAt)}</td>
      <td>${customerName(order)}</td>
      <td>${itemCount}</td>
      <td class="product-price">${formatPeso(order.total)}</td>
      <td>
        ${statusCell}
        ${
          order.paymentIssue
            ? `<span class="hold-note"><i class="bi bi-pause-fill"></i> On Hold</span>
               <button type="button" class="btn btn-outline-dark-amson btn-sm release-hold-btn mt-1" data-id="${order.id}">Release Hold</button>`
            : ""
        }
      </td>
    </tr>
  `;
}

async function handleOrderStatusChange(select) {
  const orderId = select.dataset.id;
  const newStatus = select.value;
  const order = allOrders.find((o) => o.id === orderId);
  const previousStatus = order.status;

  if (newStatus === previousStatus) return;

  // Defense in depth: only ever allow moving exactly one step forward,
  // regardless of what's in the DOM - never skip steps, never go
  // backward, and never let staff set "received" (that's customer-only).
  const steps = orderStatusSteps(order);
  const expectedNext = steps[steps.indexOf(previousStatus) + 1];
  if (newStatus !== expectedNext || newStatus === "received") {
    select.value = previousStatus;
    return;
  }

  const labels = orderStepLabels(order);
  const confirmed = confirm(
    `Change order ${order.orderNumber}'s status from "${labels[previousStatus] || previousStatus}" to "${labels[newStatus] || newStatus}"?`
  );
  if (!confirmed) {
    select.value = previousStatus;
    return;
  }

  select.disabled = true;

  try {
    if (newStatus === "payment_confirmed" && previousStatus === "placed") {
      for (const item of order.items || []) {
        await deductStockFEFO(item.id, item.qty);
      }
    }

    await db
      .collection("orders")
      .doc(orderId)
      .update({
        status: newStatus,
        [`statusTimestamps.${newStatus}`]: firebase.firestore.FieldValue.serverTimestamp(),
      });

    order.status = newStatus;
    renderVerificationQueue();
    renderOrdersTable();
  } catch (error) {
    order.status = previousStatus;
    alert(error.message || "Something went wrong updating this order's status. Please try again.");
    renderOrdersTable();
  } finally {
    select.disabled = false;
  }
}

async function releaseOrderHold(btn) {
  const orderId = btn.dataset.id;
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  if (!confirm(`Release the hold on order ${order.orderNumber}? It will return to the Payment Verification queue.`)) return;

  btn.disabled = true;
  try {
    await db.collection("orders").doc(orderId).update({ paymentIssue: firebase.firestore.FieldValue.delete() });
    delete order.paymentIssue;
    renderVerificationQueue();
    renderOrdersTable();
  } catch (error) {
    alert("Something went wrong releasing this hold. Please try again.");
    btn.disabled = false;
  }
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

verificationSearchInput.addEventListener("input", () => {
  verificationSearchTerm = verificationSearchInput.value.trim();
  renderVerificationQueue();
});

verificationSortBtn.addEventListener("click", () => {
  verificationSortDesc = !verificationSortDesc;
  renderVerificationQueue();
});

ordersExportBtn.addEventListener("click", () => {
  exportBlankPdf("amson-online-orders");
});
