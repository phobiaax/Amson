/**
 * Shared order helpers.
 */

const ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "dispatched", "delivered", "received"];

// Prescription orders are pick-up only - there's no courier "dispatched"
// leg, so approving payment goes straight to "delivered" (reused here as
// the "ready for pick-up" state) and skips "dispatched" entirely.
const PICKUP_ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "delivered", "received"];

const ORDER_STATUS_STEP_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Order Dispatched",
  delivered: "Order Delivered",
  received: "Order Received",
};

const PICKUP_ORDER_STATUS_STEP_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  delivered: "Ready for Pick-up",
  received: "Picked Up",
};

const ORDER_STATUS_BADGE_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  received: "Received",
  cancelled: "Cancelled",
};

const PICKUP_ORDER_STATUS_BADGE_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  delivered: "Ready for Pick-up",
  received: "Picked Up",
  cancelled: "Cancelled",
};

const DISPATCH_AUTO_DELIVER_MS = 3 * 24 * 60 * 60 * 1000;

function orderStatusSteps(order) {
  return order.requiresPrescription ? PICKUP_ORDER_STATUS_STEPS : ORDER_STATUS_STEPS;
}

function orderStepLabels(order) {
  return order.requiresPrescription ? PICKUP_ORDER_STATUS_STEP_LABELS : ORDER_STATUS_STEP_LABELS;
}

function orderBadgeLabel(order) {
  const labels = order.requiresPrescription ? PICKUP_ORDER_STATUS_BADGE_LABELS : ORDER_STATUS_BADGE_LABELS;
  return labels[order.status] || order.status;
}

function orderStatusIndex(status, steps = ORDER_STATUS_STEPS) {
  const idx = steps.indexOf(status);
  return idx === -1 ? 0 : idx;
}

// ---- Deadline enforcement (lazy, checked on page load) ----
async function enforceOrderDeadline(orderId, order) {
  const now = Date.now();

  if (order.paymentIssue && order.paymentIssue.holdUntil && order.paymentIssue.holdUntil.toMillis() < now) {
    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      "statusTimestamps.cancelled": firebase.firestore.FieldValue.serverTimestamp(),
      paymentIssue: firebase.firestore.FieldValue.delete(),
      cancelReason: "Payment issue hold expired without resolution.",
    });
    order.status = "cancelled";
    order.cancelReason = "Payment issue hold expired without resolution.";
    delete order.paymentIssue;
    return order;
  }

  if (order.status === "dispatched" && order.statusTimestamps && order.statusTimestamps.dispatched) {
    const dispatchedAt = order.statusTimestamps.dispatched.toMillis();
    if (now - dispatchedAt > DISPATCH_AUTO_DELIVER_MS) {
      await db.collection("orders").doc(orderId).update({
        status: "delivered",
        "statusTimestamps.delivered": firebase.firestore.FieldValue.serverTimestamp(),
      });
      order.status = "delivered";
    }
  }

  return order;
}

function formatOrderDate(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}/${date.getFullYear()}`;
}

function formatOrderDateTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`orders-${year}`);

  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `AMP-${year}-${String(nextCount).padStart(4, "0")}`;
}

function downloadOrderReceipt(order) {
  if (typeof window.jspdf === "undefined") {
    alert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text("Official Receipt", 14, y);

  y += 10;
  doc.setFontSize(11);
  doc.text(`Order Number: ${order.orderNumber}`, 14, y);
  y += 6;
  doc.text(`Date: ${formatOrderDate(order.createdAt)}`, 14, y);
  y += 6;
  doc.text(`Status: ${orderBadgeLabel(order)}`, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text("Customer", 14, y);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text(`${order.contact.firstName} ${order.contact.lastName}`, 14, y);
  y += 6;
  doc.text(order.contact.email, 14, y);
  y += 6;
  doc.text(order.contact.contactNumber, 14, y);

  y += 10;
  doc.setFont(undefined, "bold");
  doc.text(order.shipping ? "Shipping Address" : "Fulfillment", 14, y);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text(
    order.shipping
      ? `${order.shipping.streetAddress}, ${order.shipping.city}, ${order.shipping.province} ${order.shipping.zipCode}`
      : "Pick-up at Amson Pharmaceuticals store",
    14,
    y
  );

  y += 12;
  doc.setFont(undefined, "bold");
  doc.text("Items", 14, y);
  y += 4;
  doc.line(14, y, 196, y);
  y += 6;
  doc.setFont(undefined, "normal");

  order.items.forEach((item) => {
    doc.text(item.name, 14, y);
    doc.text(`x${item.qty}`, 140, y);
    doc.text(formatPeso(item.price * item.qty), 196, y, { align: "right" });
    y += 7;
  });

  y += 2;
  doc.line(14, y, 196, y);
  y += 8;
  doc.setFont(undefined, "bold");
  doc.text("Total", 14, y);
  doc.text(formatPeso(order.total), 196, y, { align: "right" });

  y += 16;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("This receipt was generated electronically and is valid without a signature.", 14, y);

  doc.save(`${order.orderNumber}-receipt.pdf`);
}
