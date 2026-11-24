// prescription orders: pharmacist checks the prescription first, the customer pays after approval

const rxStepSection = document.getElementById("rxStepSection");
const rxStepTitle = document.getElementById("rxStepTitle");
const rxStepDetail = document.getElementById("rxStepDetail");
const rxItemResults = document.getElementById("rxItemResults");
const rxFixActions = document.getElementById("rxFixActions");
const rxFixError = document.getElementById("rxFixError");
const rxResubmitBtn = document.getElementById("rxResubmitBtn");
const rxRemoveRejectedBtn = document.getElementById("rxRemoveRejectedBtn");
const rxPaySection = document.getElementById("rxPaySection");
const rxPayProofInput = document.getElementById("rxPayProofInput");
const rxPayReferenceInput = document.getElementById("rxPayReferenceInput");
const rxPayError = document.getElementById("rxPayError");
const rxPaySubmitBtn = document.getElementById("rxPaySubmitBtn");
const rxStepSuccess = document.getElementById("rxStepSuccess");
const rxCancelOrderBtn = document.getElementById("rxCancelOrderBtn");

// all photos on one order, old and new
const MAX_RX_PHOTOS_PER_ORDER = 10;

let rxCreditBalance = 0;
let rxPayFullyCovered = false;

const rxFixPicker = setUpRxPhotoPicker({
  grid: document.getElementById("rxFixPhotoGrid"),
  dropzone: document.getElementById("rxFixDropzone"),
  input: document.getElementById("rxFixInput"),
  errorText: rxFixError,
  prompt: document.getElementById("rxFixPrompt"),
});

// the live listener waits while the customer is in the middle of something
function rxStepBusy() {
  return rxFixPicker.files().length > 0 || !!(rxPayProofInput.files && rxPayProofInput.files[0]) || rxPayReferenceInput.value.trim() !== "";
}

function rxItemResultsHtml(order) {
  const rxItems = (order.items || []).filter((item) => {
    const product = getProductById(item.id);
    return (product && product.rxRequired) || rxItemDecision(order, item.id);
  });
  return rxItems
    .map((item) => {
      const d = order.rxReview.items ? order.rxReview.items[item.id] : null;
      const decision = d ? d.decision : null;
      const badge =
        decision === "approved"
          ? '<span class="badge rounded-pill text-bg-success">Approved</span>'
          : decision === "rejected"
          ? '<span class="badge rounded-pill text-bg-danger">Not approved</span>'
          : '<span class="badge rounded-pill text-bg-secondary">Waiting for review</span>';
      const note = decision === "rejected" && d.note ? `<p class="text-danger mb-0 mt-1" style="font-size:0.82rem;">${escapeHtml(d.reasonLabel ? `${d.reasonLabel}: ` : "")}${escapeHtml(d.note)}</p>` : "";
      return `
        <div class="rx-item-review">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <span style="font-size:0.9rem;">${escapeHtml(item.name)} <span class="text-muted">x${item.qty}</span></span>
            ${badge}
          </div>
          ${note}
        </div>`;
    })
    .join("");
}

function renderRxStep(order) {
  rxStepSuccess.classList.add("d-none");
  const active = isRxFirstOrder(order) && order.status === "placed" && !order.paymentSubmittedAt;
  rxStepSection.classList.toggle("d-none", !active);
  if (!active) return;

  const state = order.rxReview.state;
  rxItemResults.innerHTML = rxItemResultsHtml(order);
  rxFixActions.classList.toggle("d-none", state !== "needs_customer");
  rxPaySection.classList.toggle("d-none", state !== "approved");
  rxCancelOrderBtn.classList.remove("d-none");

  if (state === "pending") {
    rxStepTitle.innerHTML = '<i class="bi bi-hourglass-split text-danger me-1"></i>Prescription under review';
    rxStepDetail.textContent = order.rxReview.resubmittedAt
      ? "We received your new prescription. Our pharmacist will check it again and notify you."
      : "Our pharmacist is checking your prescription. We'll notify you by email once it's done. Nothing has been charged yet.";
  } else if (state === "needs_customer") {
    rxStepTitle.innerHTML = '<i class="bi bi-exclamation-circle text-danger me-1"></i>Some items weren\'t approved';
    rxStepDetail.textContent =
      "Our pharmacist couldn't approve the prescription for some items. Nothing has been charged. Upload a new prescription for them, or remove them and pay for the rest.";
    // removing every item leaves nothing to buy
    const remaining = (order.items || []).filter((item) => rxItemDecision(order, item.id) !== "rejected");
    rxRemoveRejectedBtn.disabled = remaining.length === 0;
    rxRemoveRejectedBtn.textContent = remaining.length === 0 ? "No approved items left (cancel the order instead)" : "Remove rejected items and continue";
  } else if (state === "approved") {
    rxStepTitle.innerHTML = '<i class="bi bi-check-circle-fill text-success me-1"></i>Prescription approved: please pay';
    rxStepDetail.textContent = "Your prescription was approved. Pay the total below, and we'll prepare your order for pick-up once your payment is verified.";
    renderRxPayAmounts(order);
    loadRxCreditBalance(order);
  }
}

function renderRxPayAmounts(order) {
  const subtotal = order.total || 0;
  const applied = Math.max(0, Math.min(rxCreditBalance, subtotal));
  const finalTotal = roundPeso(subtotal - applied);
  document.getElementById("rxPaySubtotalRow").classList.toggle("d-none", applied <= 0);
  document.getElementById("rxPayCreditRow").classList.toggle("d-none", applied <= 0);
  document.getElementById("rxPaySubtotal").textContent = formatPeso(subtotal);
  document.getElementById("rxPayCredit").textContent = `-${formatPeso(applied)}`;
  document.getElementById("rxPayTotal").textContent = formatPeso(finalTotal);
  rxPayFullyCovered = finalTotal <= 0 && subtotal > 0;
  document.getElementById("rxPayCoveredNotice").classList.toggle("d-none", !rxPayFullyCovered);
  document.getElementById("rxPayQrBox").classList.toggle("d-none", rxPayFullyCovered);
  rxPaySubmitBtn.textContent = rxPayFullyCovered ? "Confirm and Use Store Credit" : "Submit Payment";
}

async function loadRxCreditBalance(order) {
  try {
    const doc = await db.collection("users").doc(order.customerId).get();
    rxCreditBalance = doc.exists ? doc.data().creditBalance || 0 : 0;
    if (currentOrder && rxAwaitingPayment(currentOrder)) renderRxPayAmounts(currentOrder);
  } catch (error) {
    // preview only, the real credit is applied when paying
  }
}

async function reloadOrderAfterRxStep(message) {
  const doc = await currentOrderRef.get();
  currentOrder = doc.data();
  renderOrder(currentOrder);
  if (message) {
    rxStepSuccess.textContent = message;
    rxStepSuccess.classList.remove("d-none");
    rxStepSection.classList.remove("d-none");
  }
}

// ---- option 1: new prescription photos ----
rxResubmitBtn.addEventListener("click", async () => {
  if (!currentOrderRef || !currentOrder) return;
  const files = rxFixPicker.files();
  const existing = orderRxPhotos(currentOrder);
  if (!files.length) {
    showFormAlert(rxFixError, "Please add a photo of your prescription first.");
    return;
  }
  if (existing.length + files.length > MAX_RX_PHOTOS_PER_ORDER) {
    showFormAlert(rxFixError, `An order can have up to ${MAX_RX_PHOTOS_PER_ORDER} prescription photos. Remove some of the new ones.`);
    return;
  }
  rxResubmitBtn.disabled = true;
  rxResubmitBtn.textContent = "Uploading...";
  try {
    const urls = await uploadRxPhotos(files);
    await currentOrderRef.update({
      prescriptionPhotoUrls: [...existing, ...urls],
      "rxReview.state": "pending",
      "rxReview.resubmittedAt": firebase.firestore.FieldValue.serverTimestamp(),
    });
    rxFixPicker.clear();
    await reloadOrderAfterRxStep("Prescription resubmitted. Our pharmacist will check it again and notify you.");
  } catch (error) {
    showFormAlert(rxFixError, error.message || "Something went wrong uploading your prescription. Please try again.");
  } finally {
    rxResubmitBtn.disabled = false;
    rxResubmitBtn.textContent = "Resubmit Prescription";
  }
});

// ---- option 2: drop the rejected items ----
rxRemoveRejectedBtn.addEventListener("click", async () => {
  if (!currentOrderRef || !currentOrder) return;
  const rejected = rxRejectedItems(currentOrder);
  const remaining = (currentOrder.items || []).filter((item) => rxItemDecision(currentOrder, item.id) !== "rejected");
  if (!rejected.length || !remaining.length) return;
  const newTotal = roundPeso(remaining.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 0), 0));
  const ok = await showAppConfirm(
    `Remove these items from your order?\n\n${rejected.map((i) => `- ${i.name} x${i.qty}`).join("\n")}\n\nYour new total will be ${formatPeso(newTotal)}.`,
    { title: "Remove rejected items", confirmLabel: "Remove and continue" }
  );
  if (!ok) return;
  rxRemoveRejectedBtn.disabled = true;
  try {
    await currentOrderRef.update({
      items: remaining,
      total: newTotal,
      "rxReview.state": "approved",
      "rxReview.itemsRemovedAt": firebase.firestore.FieldValue.serverTimestamp(),
      "rxReview.removedItems": rejected.map((i) => ({ id: i.id, name: i.name, qty: i.qty })),
    });
    await reloadOrderAfterRxStep("Rejected items removed. You can pay for the rest below.");
  } catch (error) {
    showFormAlert(rxFixError, error.message || "Something went wrong updating your order. Please try again.");
  } finally {
    rxRemoveRejectedBtn.disabled = false;
  }
});

// ---- pay after approval ----
const rxPayDropzone = document.getElementById("rxPayDropzone");
rxPayDropzone.addEventListener("click", () => rxPayProofInput.click());
rxPayProofInput.addEventListener("change", () => {
  const file = rxPayProofInput.files[0];
  rxPayError.classList.add("d-none");
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showFormAlert(rxPayError, "That file is too large. Please upload an image under 10MB.");
    rxPayProofInput.value = "";
    return;
  }
  document.getElementById("rxPayPreviewImage").src = URL.createObjectURL(file);
  document.getElementById("rxPayPreviewFilename").textContent = file.name;
  document.getElementById("rxPayEmptyState").classList.add("d-none");
  document.getElementById("rxPayPreviewState").classList.remove("d-none");
});

rxPaySubmitBtn.addEventListener("click", async () => {
  if (!currentOrderRef || !currentOrder) return;
  const file = rxPayProofInput.files[0];
  const referenceNumber = rxPayReferenceInput.value.trim();
  const problems = [];
  if (!rxPayFullyCovered) {
    if (!file) problems.push("Upload a screenshot of your payment.");
    if (!referenceNumber) problems.push("Enter the reference number from your proof of payment.");
    else if (!isValidReferenceNumber(referenceNumber)) problems.push(REFERENCE_NUMBER_HINT);
  }
  if (problems.length) {
    showFormAlert(rxPayError, `Please complete the following:\n- ${problems.join("\n- ")}`);
    return;
  }
  rxPayError.classList.add("d-none");
  rxPaySubmitBtn.disabled = true;
  rxPaySubmitBtn.textContent = "Submitting...";
  try {
    const proofOfPaymentUrl = !rxPayFullyCovered && file ? await uploadToCloudinary(file) : null;
    await payApprovedRxOrder(orderId, {
      proofOfPaymentUrl,
      paymentReferenceNumber: rxPayFullyCovered ? null : referenceNumber,
      expectFullCredit: rxPayFullyCovered,
    });
    rxPayProofInput.value = "";
    rxPayReferenceInput.value = "";
    document.getElementById("rxPayEmptyState").classList.remove("d-none");
    document.getElementById("rxPayPreviewState").classList.add("d-none");
    await reloadOrderAfterRxStep("Payment submitted. Our staff will verify it, and we'll notify you when your order is ready for pick-up.");
  } catch (error) {
    showFormAlert(rxPayError, error.message || "Something went wrong submitting your payment. Please try again.");
  } finally {
    rxPaySubmitBtn.disabled = false;
    if (currentOrder && rxAwaitingPayment(currentOrder)) renderRxPayAmounts(currentOrder);
  }
});

// ---- cancel before paying ----
rxCancelOrderBtn.addEventListener("click", async () => {
  if (!currentOrderRef || !currentOrder) return;
  const ok = await showAppConfirm("Cancel this order? Nothing has been charged, so there's nothing to refund. This can't be undone.", {
    title: "Cancel order",
    confirmLabel: "Cancel order",
    cancelLabel: "Keep order",
  });
  if (!ok) return;
  rxCancelOrderBtn.disabled = true;
  try {
    await currentOrderRef.update({
      status: "closed_unresolved",
      cancelledByCustomer: true,
      closedReason: "You cancelled this order before paying.",
      "statusTimestamps.closed_unresolved": firebase.firestore.FieldValue.serverTimestamp(),
    });
    await reloadOrderAfterRxStep(null);
  } catch (error) {
    await showAppAlert(error.message || "Something went wrong cancelling this order. Please try again.");
  } finally {
    rxCancelOrderBtn.disabled = false;
  }
});
