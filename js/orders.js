/**
 * Shared order helpers used by payment.js (creating orders), orders.html
 * (list), and order-details.html (tracking) - status labels, date
 * formatting, order number generation, and receipt PDF generation.
 */

const ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "dispatched", "delivered", "received"];

const ORDER_STATUS_STEP_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Order Dispatched",
  delivered: "Order Delivered",
  received: "Order Received",
};

const ORDER_STATUS_BADGE_LABELS = {
  placed: "Order Placed",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  received: "Received",
};

function orderStatusIndex(status) {
  const idx = ORDER_STATUS_STEPS.indexOf(status);
  return idx === -1 ? 0 : idx;
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

/**
 * Atomically generates a human-friendly order number like "AMP-2026-0001"
 * using a per-year counter document, so two orders submitted at the same
 * moment can't collide (no backend/Cloud Functions needed).
 */
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`orders-${year}`);

  const counterDoc = await counterRef.get();
  const nextCount = (counterDoc.exists ? counterDoc.data().count : 0) + 1;
  await counterRef.set({ count: nextCount }, { merge: true });
  return `AMP-${year}-${String(nextCount).padStart(4, "0")}`;
}

/**
 * Generates and downloads a simple PDF receipt for an order using jsPDF.
 * Expects the order object shape written by payment.js.
 */
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
  doc.text(`Status: ${ORDER_STATUS_BADGE_LABELS[order.status] || order.status}`, 14, y);

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
  doc.text("Shipping Address", 14, y);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text(`${order.shipping.streetAddress}, ${order.shipping.city}, ${order.shipping.province} ${order.shipping.zipCode}`, 14, y);

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
