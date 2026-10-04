/**
 * Online Orders admin page.
 */

const ORDERS_PAGE_SIZE = 8;
const HOLD_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const PAYMENT_ISSUE_TYPES = {
  invalid_payment: {
    label: "Invalid payment",
    banner: "Customer will be notified to re-upload a valid QR PH payment screenshot.",
    confirmLabel: "Confirm & place on hold",
    mode: "hold",
  },
  underpayment: {
    label: "Underpayment",
    banner: "Customer will be notified to top up the remaining balance via QR PH before this order can proceed.",
    confirmLabel: "Confirm & place on hold",
    mode: "hold",
  },
  overpayment: {
    label: "Overpayment",
    banner: "Customer will be notified that the excess payment will be applied automatically to their next order.",
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
  unclear_screenshot: "Please re-upload a clear screenshot showing completed QR PH transaction.",
  incomplete_screenshot:
    "Please re-upload a screenshot showing the complete QR PH transaction, including the reference number and amount.",
  payment_not_received:
    "We have not received your payment. Please double-check and re-upload proof of a completed QR PH transaction.",
  other: "",
};

const UNDERPAYMENT_NOTE = "Please send the remaining balance to our QR PH and re-upload your screenshot.";
const OVERPAYMENT_NOTE = "We've noted an excess payment. This will be applied automatically to your next order.";

let allOrders = [];
let selectedVerificationId = null;
let approvedModalOrderId = null;
let issueType = null;
let issueNoteManuallyEdited = false;
let ordersFilter = "all";
let ordersSearchTerm = "";
// Defaults to "most recently acted on first" - once an order is verified/
// updated it's the one staff were just working on, so it should surface at
// the top of the history list rather than staying buried under its
// original placement date.
let ordersSortDesc = true;
let ordersSortField = "lastUpdated";
let ordersCurrentPage = 1;
let verificationSearchTerm = "";
// First come, first served: the Payment Verification queue defaults to
// oldest-placed-first, so the order staff see at the top is always the one
// that's been waiting longest - not whichever order happened to come in
// most recently.
let verificationSortDesc = false;

const tabVerificationBtn = document.getElementById("tabVerificationBtn");
const tabOrdersBtn = document.getElementById("tabOrdersBtn");
const tabWalkinBtn = document.getElementById("tabWalkinBtn");
const verificationPanel = document.getElementById("verificationPanel");
const ordersPanel = document.getElementById("ordersPanel");
const walkinPanel = document.getElementById("walkinPanel");

let allPosSales = [];
let walkinSearchTerm = "";

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
const ordersSortFieldSelect = document.getElementById("ordersSortFieldSelect");
const ordersTableBody = document.getElementById("ordersTableBody");
const ordersTableEmpty = document.getElementById("ordersTableEmpty");
const ordersPagination = document.getElementById("ordersPagination");

const holdModalEl = document.getElementById("holdModal");
const approvedModalEl = document.getElementById("approvedModal");
const trackingLinkInput = document.getElementById("trackingLinkInput");
const trackingLinkError = document.getElementById("trackingLinkError");
const markDispatchedBtn = document.getElementById("markDispatchedBtn");
const pickupReadyModalEl = document.getElementById("pickupReadyModal");

// A real Lalamove share-tracking link (from the app/web portal's "Share"
// button) always looks like https://share.lalamove.com/?<order-id>&... -
// anchored to that exact scheme+host so a lookalike domain (e.g.
// share.lalamove.com.evil.com, or evil.com/share.lalamove.com) can't slip
// through, and requiring something after the slash so the bare domain
// alone isn't accepted as "a tracking link."
const LALAMOVE_TRACKING_LINK_REGEX = /^https:\/\/share\.lalamove\.com\/\S+$/i;

function trackingLinkValidationError(link) {
  if (!link) return "Please paste the Lalamove tracking link.";
  if (!LALAMOVE_TRACKING_LINK_REGEX.test(link)) {
    return "That doesn't look like a valid Lalamove tracking link. It should look like https://share.lalamove.com/...";
  }
  return null;
}

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
      await enforceOrderDeadline(order.id, order, { grantCreditToBalance: true });
    }

    renderVerificationQueue();
    renderOrdersTable();

    const posSnapshot = await db.collection("posSales").get();
    allPosSales = posSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderWalkinTable();
  } catch (error) {
    console.error("Failed to load orders:", error);
  }
}

/* ---------- Tabs ---------- */
function setActiveTab(tab) {
  tabVerificationBtn.classList.toggle("active", tab === "verification");
  tabOrdersBtn.classList.toggle("active", tab === "orders");
  tabWalkinBtn.classList.toggle("active", tab === "walkin");
  verificationPanel.classList.toggle("d-none", tab !== "verification");
  ordersPanel.classList.toggle("d-none", tab !== "orders");
  walkinPanel.classList.toggle("d-none", tab !== "walkin");
}

tabVerificationBtn.addEventListener("click", () => setActiveTab("verification"));
tabOrdersBtn.addEventListener("click", () => setActiveTab("orders"));
tabWalkinBtn.addEventListener("click", () => setActiveTab("walkin"));

/* ---------- Walk-in Orders (read-only POS sales log) ---------- */
const walkinSearchInput = document.getElementById("walkinSearchInput");
const walkinTableBody = document.getElementById("walkinTableBody");
const walkinTableEmpty = document.getElementById("walkinTableEmpty");
const PAYMENT_METHOD_LABELS_ORDERS = { cash: "Cash", card: "Card", ewallet: "E-Wallet" };

function renderWalkinTable() {
  let sales = [...allPosSales];

  if (walkinSearchTerm) {
    const term = walkinSearchTerm.toLowerCase();
    sales = sales.filter(
      (sale) =>
        (sale.cashier || "").toLowerCase().includes(term) ||
        (sale.items || []).some((item) => (item.name || "").toLowerCase().includes(term))
    );
  }

  sales.sort((a, b) => {
    const aTime = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
    const bTime = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });

  if (sales.length === 0) {
    walkinTableBody.innerHTML = "";
    walkinTableEmpty.classList.remove("d-none");
    return;
  }

  walkinTableEmpty.classList.add("d-none");
  walkinTableBody.innerHTML = sales
    .map((sale) => {
      const itemsSummary = (sale.items || []).map((item) => `${item.name} (x${item.qty})`).join(", ");
      return `
        <tr class="walkin-sale-row" data-id="${sale.id}">
          <td>${formatOrderDateTime(sale.createdAt)}</td>
          <td>${itemsSummary}</td>
          <td>${formatPeso(sale.total)}</td>
          <td>${PAYMENT_METHOD_LABELS_ORDERS[sale.paymentMethod] || sale.paymentMethod || "-"}</td>
          <td>${sale.cashier || "-"}</td>
          <td><button type="button" class="btn btn-outline-dark-amson btn-sm walkin-view-btn" data-id="${sale.id}">View</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".walkin-view-btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openWalkinSaleReceipt(btn.dataset.id);
    });
  });
}

function openWalkinSaleReceipt(saleId) {
  const sale = allPosSales.find((s) => s.id === saleId);
  if (!sale) return;
  const isCash = sale.paymentMethod === "cash";
  showSaleReceipt({
    items: sale.items || [],
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    isCash,
    amountPaid: sale.cashReceived,
    change: sale.change || 0,
    cashier: sale.cashier || "-",
    branch: sale.branch || POS_BRANCH_NAME,
    completedAt: sale.createdAt && sale.createdAt.toDate ? sale.createdAt.toDate() : new Date(),
    title: "Sale Receipt",
  });
}

if (walkinSearchInput) {
  walkinSearchInput.addEventListener("input", () => {
    walkinSearchTerm = walkinSearchInput.value.trim();
    renderWalkinTable();
  });
}

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
              ${!order.proofOfPaymentUrl ? '<p class="text-muted mb-0" style="font-size:0.75rem;">No payment made</p>' : ""}
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
  const reviewSubtotalRow = document.getElementById("reviewSubtotalRow");
  const reviewCreditRow = document.getElementById("reviewCreditRow");
  if (order.creditApplied > 0) {
    document.getElementById("reviewSubtotal").textContent = formatPeso(order.subtotal);
    document.getElementById("reviewCreditApplied").textContent = `-${formatPeso(order.creditApplied)}`;
    reviewSubtotalRow.classList.remove("d-none");
    reviewCreditRow.classList.remove("d-none");
  } else {
    reviewSubtotalRow.classList.add("d-none");
    reviewCreditRow.classList.add("d-none");
  }
  document.getElementById("reviewSubmittedAt").textContent = formatOrderDateTime(order.createdAt);
  reviewReferenceNumber.textContent = order.paymentReferenceNumber || "-";

  const issueNote = document.getElementById("reviewPaymentIssueNote");
  const previousIssueBreakdown = document.getElementById("reviewPreviousIssueBreakdown");
  if (order.paymentIssue && order.paymentIssue.resolvedByCustomerAt) {
    const issue = order.paymentIssue;
    const originalIssue =
      issue.type === "invalid_payment" ? `flagged as invalid (${issue.reasonLabel || "unspecified reason"})` : "flagged as underpaid";
    issueNote.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i>This order was previously ${originalIssue}. The customer has resubmitted a corrected proof of payment and reference number below.`;
    issueNote.classList.remove("d-none");

    if (issue.type === "underpayment") {
      document.getElementById("reviewPreviousReceived").textContent = formatPeso(issue.amountReceived);
      document.getElementById("reviewPreviousShortfall").textContent = formatPeso(issue.outstandingBalance);
      previousIssueBreakdown.classList.remove("d-none");
    } else {
      previousIssueBreakdown.classList.add("d-none");
    }
  } else {
    issueNote.classList.add("d-none");
    previousIssueBreakdown.classList.add("d-none");
  }

  const hasProof = !!order.proofOfPaymentUrl;
  document.getElementById("reviewNoProofNotice").classList.toggle("d-none", hasProof);
  document.getElementById("reviewProofSection").classList.toggle("d-none", !hasProof);
  if (hasProof) {
    document.getElementById("reviewProofImageLink").href = order.proofOfPaymentUrl;
    document.getElementById("reviewProofImage").src = order.proofOfPaymentUrl;
  }

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
    await deductStockFEFOMultiple((order.items || []).map((item) => ({ productId: item.id, qty: item.qty })));

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

    notifyCustomer(
      order.customerId,
      `Payment confirmed for order ${order.orderNumber}`,
      "We've verified your payment. Your order is now being prepared.",
      `order-details.html?id=${orderId}`,
      "success"
    );

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
        notifyCustomer(
          order.customerId,
          `Order ${order.orderNumber} - item out of stock`,
          paymentIssue.note,
          `order-details.html?id=${orderId}`,
          "danger"
        );
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
  const issueModalSubtotalRow = document.getElementById("issueModalSubtotalRow");
  const issueModalCreditRow = document.getElementById("issueModalCreditRow");
  if (order.creditApplied > 0) {
    document.getElementById("issueModalSubtotal").textContent = formatPeso(order.subtotal);
    document.getElementById("issueModalCreditApplied").textContent = `-${formatPeso(order.creditApplied)}`;
    issueModalSubtotalRow.classList.remove("d-none");
    issueModalCreditRow.classList.remove("d-none");
  } else {
    issueModalSubtotalRow.classList.add("d-none");
    issueModalCreditRow.classList.add("d-none");
  }
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
    const receivedAmount = parseFloat(receivedRaw);
    const receivedValid = receivedRaw !== "" && receivedAmount >= 0;
    // Beyond just "is a number" - underpayment only makes sense below the
    // order total, and overpayment only above it. Letting either through
    // at the wrong side would flag a hold/credit that doesn't reflect
    // what actually happened.
    const relationValid =
      receivedValid &&
      (issueType === "underpayment" ? receivedAmount < order.total : receivedAmount > order.total);
    if (!relationValid) {
      issueAmountError.textContent = !receivedValid
        ? "Please enter the amount received."
        : issueType === "underpayment"
        ? `Amount received must be less than the order total (${formatPeso(order.total)}) for an underpayment.`
        : `Amount received must be more than the order total (${formatPeso(order.total)}) for an overpayment.`;
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
      notifyCustomer(
        order.customerId,
        `Payment issue on order ${order.orderNumber}`,
        issueType === "invalid_payment"
          ? REJECTION_REASON_NOTES[paymentIssue.reason] || "Please check your order for details."
          : UNDERPAYMENT_NOTE,
        `order-details.html?id=${orderId}`,
        "danger"
      );

      order.paymentIssue = paymentIssue;
      selectedVerificationId = null;

      renderVerificationQueue();
      renderOrdersTable();
      bootstrap.Modal.getInstance(paymentIssueModalEl).hide();
      bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
    } else {
      const received = parseFloat(issueAmountReceivedInput.value) || order.total;

      await deductStockFEFOMultiple((order.items || []).map((item) => ({ productId: item.id, qty: item.qty })));

      const excessAmount = Math.max(0, received - order.total);
      const update = {
        status: order.requiresPrescription ? "delivered" : "payment_confirmed",
        "statusTimestamps.payment_confirmed": firebase.firestore.FieldValue.serverTimestamp(),
        paymentOverage: {
          amountReceived: received,
          excessAmount,
          note,
        },
      };
      if (order.requiresPrescription) update["statusTimestamps.delivered"] = firebase.firestore.FieldValue.serverTimestamp();

      const batch = db.batch();
      batch.update(db.collection("orders").doc(orderId), update);
      if (excessAmount > 0 && order.customerId) {
        batch.update(db.collection("users").doc(order.customerId), {
          creditBalance: firebase.firestore.FieldValue.increment(excessAmount),
        });
      }
      await batch.commit();

      if (excessAmount > 0 && order.customerId) {
        notifyCustomer(
          order.customerId,
          `You have ${formatPeso(excessAmount)} credit from order ${order.orderNumber}`,
          "Overpayment kept as credit - it'll be applied automatically to your next order.",
          `order-details.html?id=${orderId}`,
          "success"
        );
      }

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
        notifyCustomer(
          order.customerId,
          `Order ${order.orderNumber} - item out of stock`,
          paymentIssue.note,
          `order-details.html?id=${orderId}`,
          "danger"
        );
        order.paymentIssue = paymentIssue;
        selectedVerificationId = null;
        renderVerificationQueue();
        renderOrdersTable();
        bootstrap.Modal.getInstance(paymentIssueModalEl).hide();
        bootstrap.Modal.getOrCreateInstance(holdModalEl).show();
      } catch (holdError) {
        await showAppAlert("Not enough stock to approve this order, and it couldn't be placed on hold automatically. Please try again.");
      }
    } else {
      await showAppAlert(error.message || "Something went wrong. Please try again.");
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
  trackingLinkError.textContent = "";

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

  const validationError = trackingLinkValidationError(trackingLink);
  if (validationError) {
    trackingLinkError.textContent = validationError;
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
    await showAppAlert("Something went wrong marking this order as dispatched. Please try again.");
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
    const aTime = ordersSortField === "lastUpdated" ? orderLastUpdatedMillis(a) : orderCreatedMillis(a);
    const bTime = ordersSortField === "lastUpdated" ? orderLastUpdatedMillis(b) : orderCreatedMillis(b);
    return ordersSortDesc ? bTime - aTime : aTime - bTime;
  });

  return filtered;
}

function orderCreatedMillis(order) {
  return order.createdAt && order.createdAt.toMillis ? order.createdAt.toMillis() : 0;
}

// The most recent of this order's own status transitions - falls back to
// its creation time for an order that's never moved past "placed".
function orderLastUpdatedMillis(order) {
  let latest = orderCreatedMillis(order);
  const timestamps = order.statusTimestamps || {};
  Object.values(timestamps).forEach((ts) => {
    if (ts && ts.toMillis && ts.toMillis() > latest) latest = ts.toMillis();
  });
  return latest;
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
      <td class="product-price">
        ${formatPeso(order.total)}
        ${order.creditApplied > 0 ? `<p class="text-success mb-0" style="font-size:0.72rem;font-weight:normal;">${formatPeso(order.creditApplied)} credit applied</p>` : ""}
      </td>
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
  const confirmed = await showAppConfirm(
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
    await showAppAlert(error.message || "Something went wrong updating this order's status. Please try again.");
    btn.disabled = false;
  }
}

async function releaseOrderHold(btn) {
  const orderId = btn.dataset.id;
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  const confirmed = await showAppConfirm(
    `Release the hold on order ${order.orderNumber} without waiting for the customer to fix it themselves? This clears the flagged payment issue and sends the order back to Payment Verification for a normal review.`
  );
  if (!confirmed) return;

  btn.disabled = true;
  try {
    await db.collection("orders").doc(orderId).update({ paymentIssue: firebase.firestore.FieldValue.delete() });
    delete order.paymentIssue;
    renderVerificationQueue();
    renderOrdersTable();
  } catch (error) {
    await showAppAlert("Something went wrong releasing this hold. Please try again.");
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

ordersSortFieldSelect.addEventListener("change", () => {
  ordersSortField = ordersSortFieldSelect.value;
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
