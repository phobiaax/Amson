/**
 * Order tracking page.
 */

const orderNotFoundNotice = document.getElementById("orderNotFoundNotice");
const orderLoading = document.getElementById("orderLoading");
const orderDetailContent = document.getElementById("orderDetailContent");
const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");
const markReceivedBtn = document.getElementById("markReceivedBtn");

const orderId = new URLSearchParams(window.location.search).get("id");
let currentOrderRef = null;
let currentOrder = null;

function renderTimeline(order) {
  const currentIdx = orderStatusIndex(order.status);
  const timelineEl = document.getElementById("orderTimeline");

  timelineEl.innerHTML = ORDER_STATUS_STEPS.map((step, idx) => {
    const isCompleted = idx <= currentIdx;
    const timestamp = order.statusTimestamps ? order.statusTimestamps[step] : null;
    const icon = idx === ORDER_STATUS_STEPS.length - 1 && isCompleted ? "bi-check-circle-fill" : "bi-box-seam";

    return `
      <div class="timeline-step ${isCompleted ? "completed" : ""}">
        <div class="timeline-icon"><i class="bi ${icon}"></i></div>
        <div>
          <p class="timeline-title">${ORDER_STATUS_STEP_LABELS[step]}</p>
          <p class="timeline-time mb-0">${timestamp ? formatOrderDateTime(timestamp) : "Pending"}</p>
        </div>
      </div>
    `;
  }).join("");
}

function updateMarkReceivedButton(status) {
  if (status === "cancelled") {
    markReceivedBtn.disabled = true;
    markReceivedBtn.textContent = "Order Cancelled";
    return;
  }

  const idx = orderStatusIndex(status);
  const deliveredIdx = orderStatusIndex("delivered");
  const receivedIdx = orderStatusIndex("received");

  if (idx >= receivedIdx) {
    markReceivedBtn.disabled = true;
    markReceivedBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Order Marked as Received';
  } else if (idx === deliveredIdx) {
    markReceivedBtn.disabled = false;
    markReceivedBtn.textContent = "Mark as Received";
  } else {
    markReceivedBtn.disabled = true;
    markReceivedBtn.textContent = "Awaiting Delivery";
  }
}

function renderOrder(order) {
  document.getElementById("detailOrderNumber").textContent = order.orderNumber;
  document.getElementById("detailOrderDate").textContent = formatOrderDate(order.createdAt);

  const statusEl = document.getElementById("detailOrderStatus");
  statusEl.className = `order-status-badge status-${order.status}`;
  statusEl.textContent = ORDER_STATUS_BADGE_LABELS[order.status] || order.status;

  const cancelledNotice = document.getElementById("orderCancelledNotice");
  const timelineEl = document.getElementById("orderTimeline");
  if (order.status === "cancelled") {
    timelineEl.classList.add("d-none");
    cancelledNotice.textContent = order.cancelReason || "This order was cancelled.";
    cancelledNotice.classList.remove("d-none");
  } else {
    timelineEl.classList.remove("d-none");
    cancelledNotice.classList.add("d-none");
    renderTimeline(order);
  }

  document.getElementById("detailAddress").textContent =
    `${order.shipping.streetAddress}, ${order.shipping.city}, ${order.shipping.province} ${order.shipping.zipCode}`;
  document.getElementById("detailContactNo").textContent = order.contact.contactNumber;
  document.getElementById("detailCustomerName").textContent = `${order.contact.firstName} ${order.contact.lastName}`;
  document.getElementById("detailDeliveryNotes").textContent = order.shipping.deliveryNotes || "-";

  const prescriptionSection = document.getElementById("detailPrescriptionSection");
  if (order.prescriptionPhotoUrl) {
    document.getElementById("detailPrescriptionLink").href = order.prescriptionPhotoUrl;
    document.getElementById("detailPrescriptionImage").src = order.prescriptionPhotoUrl;
    prescriptionSection.classList.remove("d-none");
  } else {
    prescriptionSection.classList.add("d-none");
  }

  document.getElementById("detailItemsList").innerHTML = order.items
    .map(
      (item) => `
        <div class="cart-item-row">
          <div class="cart-item-image"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-1">${item.name}</h3>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
          </div>
          <div class="product-price mb-0">${formatPeso(item.price * item.qty)}</div>
        </div>
      `
    )
    .join("");

  document.getElementById("detailTotal").textContent = formatPeso(order.total);
  updateMarkReceivedButton(order.status);
}

async function loadOrder(uid) {
  if (!orderId) {
    orderNotFoundNotice.classList.remove("d-none");
    return;
  }

  orderLoading.classList.remove("d-none");
  try {
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
    updateMarkReceivedButton(currentOrder.status);
  }
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    orderNotFoundNotice.classList.remove("d-none");
    return;
  }
  loadOrder(user.uid);
});
