/**
 * Prescription pre-order tracking page.
 */

const rxOrderNotFoundNotice = document.getElementById("rxOrderNotFoundNotice");
const rxOrderLoading = document.getElementById("rxOrderLoading");
const rxOrderDetailContent = document.getElementById("rxOrderDetailContent");

const RX_STATUS_BADGE_LABELS = {
  pending_verification: "Pending Prescription Verification",
  ready_for_pickup: "Ready for Pick-up",
  rejected: "Rejected",
};

const rxOrderId = new URLSearchParams(window.location.search).get("id");

function renderRxOrder(order) {
  document.getElementById("rxDetailOrderNumber").textContent = order.orderNumber;
  document.getElementById("rxDetailOrderDate").textContent = formatOrderDate(order.createdAt);

  const statusEl = document.getElementById("rxDetailOrderStatus");
  const statusClass = order.status === "rejected" ? "cancelled" : order.status;
  statusEl.className = `order-status-badge status-${statusClass}`;
  statusEl.textContent = RX_STATUS_BADGE_LABELS[order.status] || order.status;

  const rejectionNotice = document.getElementById("rxRejectionNotice");
  if (order.status === "rejected") {
    rejectionNotice.textContent = `Rejected: ${order.rejectionReason || "No reason given."}`;
    rejectionNotice.classList.remove("d-none");
  } else {
    rejectionNotice.classList.add("d-none");
  }

  document.getElementById("rxDetailItemsList").innerHTML = order.items
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

  document.getElementById("rxDetailTotal").textContent = formatPeso(order.total);

  document.getElementById("rxDetailPrescriptionLink").href = order.prescriptionImageUrl || "#";
  document.getElementById("rxDetailPrescriptionImage").src = order.prescriptionImageUrl || "";
  document.getElementById("rxDetailPaymentLink").href = order.proofOfPaymentUrl || "#";
  document.getElementById("rxDetailPaymentImage").src = order.proofOfPaymentUrl || "";
}

async function loadRxOrder(uid) {
  if (!rxOrderId) {
    rxOrderNotFoundNotice.classList.remove("d-none");
    return;
  }

  rxOrderLoading.classList.remove("d-none");
  try {
    const doc = await db.collection("prescriptionOrders").doc(rxOrderId).get();

    if (!doc.exists || doc.data().customerId !== uid) {
      rxOrderNotFoundNotice.classList.remove("d-none");
      return;
    }

    renderRxOrder(doc.data());
    rxOrderDetailContent.classList.remove("d-none");
  } catch (error) {
    rxOrderNotFoundNotice.classList.remove("d-none");
  } finally {
    rxOrderLoading.classList.add("d-none");
  }
}

auth.onAuthStateChanged((user) => {
  if (!user) {
    rxOrderNotFoundNotice.classList.remove("d-none");
    return;
  }
  loadRxOrder(user.uid);
});
