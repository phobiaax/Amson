/**
 * Order tracking page.
 */

const orderNotFoundNotice = document.getElementById("orderNotFoundNotice");
const orderLoading = document.getElementById("orderLoading");
const orderDetailContent = document.getElementById("orderDetailContent");
const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");
const markReceivedBtn = document.getElementById("markReceivedBtn");

const paymentIssueSection = document.getElementById("paymentIssueSection");
const paymentIssueTitle = document.getElementById("paymentIssueTitle");
const paymentIssueDetail = document.getElementById("paymentIssueDetail");
const paymentIssueDeadline = document.getElementById("paymentIssueDeadline");
const issueUploadDropzone = document.getElementById("issueUploadDropzone");
const issueUploadEmptyState = document.getElementById("issueUploadEmptyState");
const issueUploadPreviewState = document.getElementById("issueUploadPreviewState");
const issueUploadPreviewImage = document.getElementById("issueUploadPreviewImage");
const issueUploadPreviewFilename = document.getElementById("issueUploadPreviewFilename");
const issueProofInput = document.getElementById("issueProofInput");
const issueReferenceNumberInput = document.getElementById("issueReferenceNumberInput");
const issueResubmitError = document.getElementById("issueResubmitError");
const issueResubmitSuccess = document.getElementById("issueResubmitSuccess");
const issueResubmitBtn = document.getElementById("issueResubmitBtn");
const issueActionsContainer = document.getElementById("issueActionsContainer");

const MAX_ISSUE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const orderId = new URLSearchParams(window.location.search).get("id");
let currentOrderRef = null;
let currentOrder = null;

function renderTimeline(order) {
  const steps = orderStatusSteps(order);
  const labels = orderStepLabels(order);
  const currentIdx = orderStatusIndex(order.status, steps);
  const timelineEl = document.getElementById("orderTimeline");

  timelineEl.innerHTML = steps.map((step, idx) => {
    const isCompleted = idx <= currentIdx;
    const timestamp = order.statusTimestamps ? order.statusTimestamps[step] : null;
    const icon = idx === steps.length - 1 && isCompleted ? "bi-check-circle-fill" : "bi-box-seam";

    return `
      <div class="timeline-step ${isCompleted ? "completed" : ""}">
        <div class="timeline-icon"><i class="bi ${icon}"></i></div>
        <div>
          <p class="timeline-title">${labels[step]}</p>
          <p class="timeline-time mb-0">${timestamp ? formatOrderDateTime(timestamp) : "Pending"}</p>
        </div>
      </div>
    `;
  }).join("");
}

function updateMarkReceivedButton(order) {
  if (order.status === "closed_unresolved") {
    markReceivedBtn.disabled = true;
    markReceivedBtn.textContent = "Order Closed";
    return;
  }

  const steps = orderStatusSteps(order);
  const idx = orderStatusIndex(order.status, steps);
  const readyIdx = orderStatusIndex("delivered", steps);
  const receivedIdx = orderStatusIndex("received", steps);
  const pickup = !!order.requiresPrescription;

  if (idx >= receivedIdx) {
    markReceivedBtn.disabled = true;
    markReceivedBtn.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>${pickup ? "Marked as Picked Up" : "Order Marked as Received"}`;
  } else if (idx === readyIdx) {
    markReceivedBtn.disabled = false;
    markReceivedBtn.textContent = pickup ? "Mark as Picked Up" : "Mark as Received";
  } else {
    markReceivedBtn.disabled = true;
    markReceivedBtn.textContent = pickup ? "Awaiting Pick-up Readiness" : "Awaiting Delivery";
  }
}

function renderPaymentIssue(order) {
  issueResubmitError.classList.add("d-none");
  issueResubmitSuccess.classList.add("d-none");
  issueProofInput.value = "";
  issueUploadEmptyState.classList.remove("d-none");
  issueUploadPreviewState.classList.add("d-none");
  issueReferenceNumberInput.value = "";
  updateResubmitButtonState();

  const issue = order.paymentIssue;
  // Once the customer has resubmitted, the order is back with staff for
  // re-review - nothing more for the customer to do until it's resolved.
  if (!issue || issue.resolvedByCustomerAt) {
    paymentIssueSection.classList.add("d-none");
    return;
  }

  paymentIssueSection.classList.remove("d-none");

  // Out of stock isn't something the customer can fix by uploading
  // anything - it's purely informational, so the resubmit form doesn't
  // apply here.
  issueActionsContainer.classList.toggle("d-none", issue.type === "out_of_stock");

  if (issue.type === "invalid_payment") {
    paymentIssueTitle.textContent = `Payment Issue: ${issue.reasonLabel || "Invalid Payment"}`;
    paymentIssueDetail.textContent = issue.note || "There's a problem with your proof of payment. Please upload a corrected screenshot below.";
  } else if (issue.type === "underpayment") {
    paymentIssueTitle.textContent = "Payment Issue: Underpayment";
    paymentIssueDetail.textContent =
      `We received ${formatPeso(issue.amountReceived)}, but your order total is ${formatPeso(order.total)} ` +
      `(${formatPeso(issue.outstandingBalance)} short). ${issue.note || "Please send the remaining balance and upload a screenshot of the new payment below."}`;
  } else if (issue.type === "out_of_stock") {
    paymentIssueTitle.textContent = "Order Issue: Item Out of Stock";
    paymentIssueDetail.textContent =
      issue.note ||
      "One or more items in your order are currently out of stock. We're checking on a restock - no action is needed from you right now.";
  } else {
    paymentIssueTitle.textContent = "Payment Issue";
    paymentIssueDetail.textContent = issue.note || "There's a problem with your payment. Please contact us or upload a corrected screenshot below.";
  }

  paymentIssueDeadline.textContent = issue.holdUntil
    ? `If this isn't resolved by ${formatOrderDateTime(issue.holdUntil)}, this order will be closed and any payment you've already made will be kept as credit toward a future purchase (in line with our no-refund policy).`
    : "";
}

function updateResubmitButtonState() {
  issueResubmitBtn.disabled = !(issueProofInput.files[0] && issueReferenceNumberInput.value.trim());
}

issueUploadDropzone.addEventListener("click", () => issueProofInput.click());

issueProofInput.addEventListener("change", () => {
  const file = issueProofInput.files[0];
  if (!file) return;

  issueResubmitError.classList.add("d-none");

  if (file.size > MAX_ISSUE_FILE_SIZE_BYTES) {
    issueResubmitError.textContent = "That file is too large. Please upload an image under 10MB.";
    issueResubmitError.classList.remove("d-none");
    issueProofInput.value = "";
    issueUploadEmptyState.classList.remove("d-none");
    issueUploadPreviewState.classList.add("d-none");
    updateResubmitButtonState();
    return;
  }

  issueUploadPreviewImage.src = URL.createObjectURL(file);
  issueUploadPreviewFilename.textContent = file.name;
  issueUploadEmptyState.classList.add("d-none");
  issueUploadPreviewState.classList.remove("d-none");
  updateResubmitButtonState();
});

issueReferenceNumberInput.addEventListener("input", updateResubmitButtonState);

issueResubmitBtn.addEventListener("click", async () => {
  const file = issueProofInput.files[0];
  const referenceNumber = issueReferenceNumberInput.value.trim();
  if (!currentOrderRef || !file || !referenceNumber) return;

  issueResubmitError.classList.add("d-none");
  issueResubmitBtn.disabled = true;
  issueResubmitBtn.textContent = "Uploading...";

  try {
    const proofOfPaymentUrl = await uploadToCloudinary(file);

    await currentOrderRef.update({
      proofOfPaymentUrl,
      paymentReferenceNumber: referenceNumber,
      "paymentIssue.resolvedByCustomerAt": firebase.firestore.FieldValue.serverTimestamp(),
      "paymentIssue.holdUntil": firebase.firestore.FieldValue.delete(),
    });

    const doc = await currentOrderRef.get();
    currentOrder = doc.data();
    renderOrder(currentOrder);
    issueResubmitSuccess.classList.remove("d-none");
  } catch (error) {
    issueResubmitError.textContent = error.message || "Something went wrong resubmitting your payment. Please try again.";
    issueResubmitError.classList.remove("d-none");
  } finally {
    issueResubmitBtn.disabled = false;
    issueResubmitBtn.textContent = "Resubmit for Review";
  }
});

function renderOrder(order) {
  document.getElementById("detailOrderNumber").textContent = order.orderNumber;
  document.getElementById("detailOrderDate").textContent = formatOrderDate(order.createdAt);

  const statusEl = document.getElementById("detailOrderStatus");
  statusEl.className = `order-status-badge status-${order.status}`;
  statusEl.textContent = orderBadgeLabel(order);

  renderPaymentIssue(order);

  const closedNotice = document.getElementById("orderClosedNotice");
  const timelineEl = document.getElementById("orderTimeline");
  if (order.status === "closed_unresolved") {
    timelineEl.classList.add("d-none");
    const reason = order.closedReason || "This order was closed.";
    // No order is ever refunded - if any payment was verified before this
    // closed, it's kept as credit toward a future purchase instead.
    const creditNote =
      order.unappliedCredit > 0
        ? ` ${formatPeso(order.unappliedCredit)} of your payment has been retained as credit - please reach out via live chat to apply it to a future order.`
        : "";
    closedNotice.textContent = reason + creditNote;
    closedNotice.classList.remove("d-none");
  } else {
    timelineEl.classList.remove("d-none");
    closedNotice.classList.add("d-none");
    renderTimeline(order);
  }

  const overpaymentNotice = document.getElementById("overpaymentNotice");
  const overpaymentCredit = order.paymentOverage ? order.paymentOverage.excessAmount || 0 : 0;
  if (overpaymentCredit > 0) {
    overpaymentNotice.textContent =
      `You paid ${formatPeso(overpaymentCredit)} more than this order's total. That excess has been kept as credit toward a future purchase - ` +
      `please reach out via live chat to apply it (in line with our no-refund policy).`;
    overpaymentNotice.classList.remove("d-none");
  } else {
    overpaymentNotice.classList.add("d-none");
  }

  if (order.shipping) {
    document.getElementById("detailAddress").textContent =
      `${order.shipping.streetAddress}, ${order.shipping.city}, ${order.shipping.province} ${order.shipping.zipCode}`;
    document.getElementById("detailDeliveryNotes").textContent = order.shipping.deliveryNotes || "-";
  } else {
    document.getElementById("detailAddress").textContent = "Pick-up at Amson Pharmaceuticals store";
    document.getElementById("detailDeliveryNotes").textContent = "-";
  }
  document.getElementById("detailContactNo").textContent = order.contact.contactNumber;
  document.getElementById("detailCustomerName").textContent = `${order.contact.firstName} ${order.contact.lastName}`;

  const prescriptionSection = document.getElementById("detailPrescriptionSection");
  if (order.prescriptionPhotoUrl) {
    document.getElementById("detailPrescriptionLink").href = order.prescriptionPhotoUrl;
    document.getElementById("detailPrescriptionImage").src = order.prescriptionPhotoUrl;
    prescriptionSection.classList.remove("d-none");
  } else {
    prescriptionSection.classList.add("d-none");
  }

  document.getElementById("detailItemsList").innerHTML = order.items
    .map((item) => {
      // Older orders placed before item photos were stored on the order
      // itself fall back to whatever the product's current image is.
      const imageUrl = item.imageUrl || (getProductById(item.id) || {}).imageUrl;
      return `
        <div class="cart-item-row">
          <div class="cart-item-image" style="${cartItemImageCss(imageUrl)}"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-1">${item.name}</h3>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
          </div>
          <div class="product-price mb-0">${formatPeso(item.price * item.qty)}</div>
        </div>
      `;
    }
    )
    .join("");

  document.getElementById("detailTotal").textContent = formatPeso(order.total);
  updateMarkReceivedButton(order);
}

async function loadOrder(uid) {
  if (!orderId) {
    orderNotFoundNotice.classList.remove("d-none");
    return;
  }

  orderLoading.classList.remove("d-none");
  try {
    await loadCatalogCache();
    const docRef = db.collection("orders").doc(orderId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().customerId !== uid) {
      orderNotFoundNotice.classList.remove("d-none");
      return;
    }

    currentOrderRef = docRef;
    currentOrder = await enforceOrderDeadline(orderId, doc.data());
    renderOrder(currentOrder);
    orderDetailContent.classList.remove("d-none");
  } catch (error) {
    orderNotFoundNotice.classList.remove("d-none");
  } finally {
    orderLoading.classList.add("d-none");
  }
}

downloadReceiptBtn.addEventListener("click", () => {
  if (currentOrder) downloadOrderReceipt(currentOrder);
});

markReceivedBtn.addEventListener("click", async () => {
  if (!currentOrderRef || markReceivedBtn.disabled) return;
  if (!confirm("Confirm that you've received this order? This can't be undone.")) return;
  markReceivedBtn.disabled = true;
  markReceivedBtn.textContent = "Updating...";
  try {
    await currentOrderRef.update({
      status: "received",
      "statusTimestamps.received": firebase.firestore.FieldValue.serverTimestamp(),
    });
    const doc = await currentOrderRef.get();
    currentOrder = doc.data();
    renderOrder(currentOrder);
  } catch (error) {
    updateMarkReceivedButton(currentOrder);
  }
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    orderNotFoundNotice.classList.remove("d-none");
    return;
  }
  loadOrder(user.uid);
});
