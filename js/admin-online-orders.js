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
  // Not staff-selectable from the dropdown below - this hold is created
  // automatically when approving payment fails because stock ran out.
  out_of_stock: {
    label: "Out of Stock",
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
const issueAmountError = document.getElementById("issueAmountError");
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
  // Include orders the customer has resubmitted a fix for - their
  // paymentIssue record stays (for staff context) until fully resolved,
  // marked by resolvedByCustomerAt.
  let queue = allOrders.filter(
    (order) => order.status === "placed" && (!order.paymentIssue || order.paymentIssue.resolvedByCustomerAt)
  );

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
              ${order.paymentIssue && order.paymentIssue.resolvedByCustomerAt ? '<span class="badge rounded-pill text-bg-warning mt-1">Customer Resubmitted</span>' : ""}
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

  const issueNote = document.getElementById("reviewPaymentIssueNote");
  if (order.paymentIssue && order.paymentIssue.resolvedByCustomerAt) {
    const issue = order.paymentIssue;
    const originalIssue =
      issue.type === "invalid_payment"
        ? `flagged as invalid (${issue.reasonLabel || "unspecified reason"})`
        : `flagged as underpaid - received ${formatPeso(issue.amountReceived)} of ${formatPeso(order.total)}, ${formatPeso(issue.outstandingBalance)} short`;
    issueNote.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>This order was previously ${originalIssue}. The customer has resubmitted a corrected proof of payment and reference number below - review it like any other submission.`;
    issueNote.classList.remove("d-none");
  } else {
    issueNote.classList.add("d-none");
  }

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
        paymentIssue: firebase.firestore.FieldValue.delete(),
      });
      order.status = "delivered";
      delete order.paymentIssue;
    } else {
      await db.collection("orders").doc(orderId).update({
        status: "payment_confirmed",
        "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
        paymentIssue: firebase.firestore.FieldValue.delete(),
      });
      order.status = "payment_confirmed";
      delete order.paymentIssue;
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
    if (error.message === "Not enough stock available to fulfill this quantity.") {
      // The payment itself was fine - it's purely a fulfillment problem,
      // so this isn't a dead end: place the order on the same kind of
      // 7-day hold as a payment issue, giving time for a restock before
      // it closes (per the no-cancellation, no-refund policy).
      try {
        const paymentIssue = {
          type: "out_of_stock",
          note: "One or more items in this order are no longer in stock. We're checking for a restock before this can proceed.",
          flaggedAt: firebase.firestore.FieldValue.serverTimestamp(),
          holdUntil: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + HOLD_DURATION_MS)),
        };
        await db.collection("orders").doc(orderId).update({ paymentIssue });
        order.paymentIssue = paymentIssue;
        selectedVerificationId = null;
        renderVerificationQueue();
        renderOrdersTable();
        bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
      } catch (holdError) {
        reviewAlert.textContent = "Not enough stock to approve this order, and it couldn't be placed on hold automatically. Please try again.";
        reviewAlert.classList.remove("d-none");
      }
    } else {
      reviewAlert.textContent = error.message || "Something went wrong approving this payment. Please try again.";
      reviewAlert.classList.remove("d-none");
    }
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

  issueAmountError.classList.add("d-none");
  issueAmountReceivedInput.classList.remove("is-invalid");

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
  issueAmountError.classList.add("d-none");
  issueAmountReceivedInput.classList.remove("is-invalid");
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

  // Underpayment/overpayment both hinge entirely on this figure - the
  // outstanding balance or the excess credited to the customer is computed
  // directly from it, so it can't be left blank (which used to silently
  // fall back to 0 outstanding / the full order total as "received").
  if (issueType !== "invalid_payment") {
    const receivedRaw = issueAmountReceivedInput.value.trim();
    const receivedValid = receivedRaw !== "" && parseFloat(receivedRaw) >= 0;
    if (!receivedValid) {
      issueAmountError.classList.remove("d-none");
      issueAmountReceivedInput.classList.add("is-invalid");
      issueAmountReceivedInput.focus();
      return;
    }
  }
  issueAmountError.classList.add("d-none");
  issueAmountReceivedInput.classList.remove("is-invalid");

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
    if (error.message === "Not enough stock available to fulfill this quantity.") {
      try {
        const paymentIssue = {
          type: "out_of_stock",
          note: "One or more items in this order are no longer in stock. We're checking for a restock before this can proceed.",
          flaggedAt: firebase.firestore.FieldValue.serverTimestamp(),
          holdUntil: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + HOLD_DURATION_MS)),
        };
        await db.collection("orders").doc(orderId).update({ paymentIssue });
        order.paymentIssue = paymentIssue;
        selectedVerificationId = null;
        renderVerificationQueue();
        renderOrdersTable();
        bootstrap.Modal.getInstance(paymentIssueModalEl).hide();
        bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
      } catch (holdError) {
        alert("Not enough stock to approve this order, and it couldn't be placed on hold automatically. Please try again.");
      }
    } else {
      alert(error.message || "Something went wrong. Please try again.");
    }
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
  trackingLinkInput.value = order.trackingLink || "";
  trackingLinkInput.classList.remove("is-invalid");

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

    document.querySelectorAll(".advance-status-btn").forEach((btn) => {
      btn.addEventListener("click", () => advanceOrderStatus(btn));
    });
    document.querySelectorAll(".release-hold-btn").forEach((btn) => {
      btn.addEventListener("click", () => releaseOrderHold(btn));
    });
    document.querySelectorAll(".book-delivery-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = allOrders.find((o) => o.id === btn.dataset.id);
        if (order) openApprovedModal(order);
      });
    });
  }

  renderOrdersPagination(totalPages);
}

// One consistent visual language for every row's status, instead of the
// previous mix of plain badges, disabled-but-not-obviously-disabled
// dropdowns, and text+button holds: always a colored pill for the current
// state, plus a button underneath ONLY when there's something for staff to
// actually do next. Advancing "placed" to "payment_confirmed" is
// deliberately not offered here at all - that step has to go through
// Payment Verification, where the proof of payment actually gets reviewed,
// not skipped past from this table.
const STATUS_BADGE_CLASSES = {
  placed: "text-bg-light border",
  payment_confirmed: "text-bg-secondary",
  dispatched: "text-bg-warning",
  delivered: "text-bg-success",
  received: "text-bg-success",
  closed_unresolved: "text-bg-danger",
};

const ADVANCE_ACTION_LABELS = {
  delivered: "Mark as Delivered",
  payment_confirmed: "Mark as Payment Confirmed",
};

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
  // never skip ahead and never go back. Advancing out of "placed" also
  // isn't offered from here - see comment above.
  const staffCanAdvance =
    order.status !== "closed_unresolved" && order.status !== "placed" && !order.paymentIssue && nextStep && nextStep !== "received";

  const badgeClass = STATUS_BADGE_CLASSES[order.status] || "text-bg-light border";
  const badge = `<span class="badge rounded-pill ${badgeClass}">${order.status === "closed_unresolved" ? "Closed (Unresolved)" : labels[order.status]}</span>`;

  let actionHtml = "";
  let subtextHtml = "";
  if (order.paymentIssue) {
    // On hold - no status changes are offered here at all, so staff can't
    // accidentally skip past an unresolved issue. Resolve it via Payment
    // Verification (after the customer resubmits, or manually with
    // Release Hold below).
    const issueLabel = (PAYMENT_ISSUE_TYPES[order.paymentIssue.type] || {}).label || "Payment Issue";
    const waitingOn =
      order.paymentIssue.type === "out_of_stock"
        ? "Waiting on restock"
        : order.paymentIssue.resolvedByCustomerAt
        ? "Customer resubmitted - awaiting re-review"
        : "Awaiting customer response";
    subtextHtml = `<p class="hold-note text-muted mb-1" style="font-size:0.78rem;">On Hold: ${issueLabel} - ${waitingOn}</p>`;
    actionHtml = `<button type="button" class="btn btn-outline-dark-amson btn-sm release-hold-btn" data-id="${order.id}">Release Hold</button>`;
  } else if (staffCanAdvance && nextStep === "dispatched") {
    // Booking the courier needs the address/Lalamove link/tracking-link
    // form in the approved modal, not a bare status jump - reopen the same
    // modal shown right after approval so that info is never lost.
    actionHtml = `<button type="button" class="btn btn-outline-dark-amson btn-sm book-delivery-btn" data-id="${order.id}">Book Delivery</button>`;
  } else if (staffCanAdvance) {
    const actionLabel = ADVANCE_ACTION_LABELS[nextStep] || `Mark as ${labels[nextStep]}`;
    actionHtml = `<button type="button" class="btn btn-outline-dark-amson btn-sm advance-status-btn" data-id="${order.id}" data-next="${nextStep}">${actionLabel}</button>`;
  }

  const statusCell = `
    <div class="d-flex flex-column align-items-start gap-1">
      ${badge}
      ${subtextHtml}
      ${actionHtml}
    </div>`;

  return `
    <tr>
      <td class="fw-medium">${order.orderNumber}</td>
      <td>${formatOrderDateTime(order.createdAt)}</td>
      <td>${customerName(order)}</td>
      <td>${itemCount}</td>
      <td class="product-price">${formatPeso(order.total)}</td>
      <td>
        ${statusCell}
      </td>
    </tr>
  `;
}

async function advanceOrderStatus(btn) {
  const orderId = btn.dataset.id;
  const newStatus = btn.dataset.next;
  const order = allOrders.find((o) => o.id === orderId);
  const previousStatus = order.status;

  if (newStatus === previousStatus) return;

  // Defense in depth: only ever allow moving exactly one step forward,
  // regardless of what's in the DOM - never skip steps, never go
  // backward, and never let staff set "received" (that's customer-only).
  const steps = orderStatusSteps(order);
  const expectedNext = steps[steps.indexOf(previousStatus) + 1];
  if (newStatus !== expectedNext || newStatus === "received") return;

  const labels = orderStepLabels(order);
  const confirmed = confirm(
    `Change order ${order.orderNumber}'s status from "${labels[previousStatus] || previousStatus}" to "${labels[newStatus] || newStatus}"?`
  );
  if (!confirmed) return;

  btn.disabled = true;

  try {
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
    alert(error.message || "Something went wrong updating this order's status. Please try again.");
    btn.disabled = false;
  }
}

async function releaseOrderHold(btn) {
  const orderId = btn.dataset.id;
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  if (
    !confirm(
      `Release the hold on order ${order.orderNumber} without waiting for the customer to fix it themselves? This clears the flagged payment issue and sends the order back to Payment Verification for a normal review.`
    )
  )
    return;

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
