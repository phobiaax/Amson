/**
 * Shared order helpers.
 */

const ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "dispatched", "delivered", "received"];

// Prescription orders are pick-up only - there's no courier "dispatched"
// leg, so approving payment goes straight to "delivered" (reused here as
// the "ready for pick-up" state) and skips "dispatched" entirely.
const PICKUP_ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "delivered", "received"];

const ORDER_STATUS_STEP_LABELS = {
  placed: "Order Pending Verification",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Order Dispatched",
  delivered: "Order Delivered",
  received: "Order Received",
};

const PICKUP_ORDER_STATUS_STEP_LABELS = {
  placed: "Order Pending Verification",
  payment_confirmed: "Payment Confirmed",
  delivered: "Ready for Pick-up",
  received: "Picked Up",
};

const ORDER_STATUS_BADGE_LABELS = {
  placed: "Order Pending Verification",
  payment_confirmed: "Payment Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  received: "Received",
  closed_unresolved: "Closed (Unresolved)",
};

const PICKUP_ORDER_STATUS_BADGE_LABELS = {
  placed: "Order Pending Verification",
  payment_confirmed: "Payment Confirmed",
  delivered: "Ready for Pick-up",
  received: "Picked Up",
  closed_unresolved: "Closed (Unresolved)",
};

// No order is ever refunded - a hold that never gets resolved just closes,
// and whatever payment was genuinely verified is kept as credit toward a
// future purchase instead. What counts as "verified" depends on why the
// hold existed: an underpayment's partial amount was real, a screenshot
// that was never confirmed valid has nothing to carry over, and stock
// simply running out doesn't call the original payment into question at
// all - the whole amount carries over.
const HOLD_REASON_LABELS = {
  invalid_payment: "Payment Issue - Invalid Payment",
  underpayment: "Payment Issue - Underpayment",
  out_of_stock: "Item Out of Stock",
};

function computeUnappliedCredit(order) {
  const issue = order.paymentIssue;
  if (!issue) return 0;
  if (issue.type === "underpayment") return issue.amountReceived || 0;
  if (issue.type === "out_of_stock") return order.total || 0;
  return 0;
}

// The amount of this order's payment currently held as credit, whichever
// path it came from: a hold that closed unresolved (unappliedCredit,
// computed above and stored at close time), or an overpayment that was
// approved immediately with the excess recorded on the order
// (paymentOverage - REQ098, excess is credit toward a future transaction,
// never refunded).
function orderCreditAmount(order) {
  if (order.status === "closed_unresolved") return order.unappliedCredit || 0;
  if (order.paymentOverage) return order.paymentOverage.excessAmount || 0;
  return 0;
}

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

// Persisted, per-customer notifications (payment issue holds, credit
// grants) - written only from staff-authenticated actions or the
// hold-expiry sweep, never by the customer themselves (see
// firestore.rules). shop-header.js reads these directly instead of trying
// to re-derive "did something happen" from live order state on every
// page load.
async function notifyCustomer(customerId, title, detail, link) {
  if (!customerId) return;
  try {
    await db.collection("customerNotifications").add({
      customerId,
      title,
      detail,
      link,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to write customer notification:", error);
  }
}

// ---- Deadline enforcement (lazy, checked on page load) ----
//
// `grantCreditToBalance` is only ever passed true from staff-authenticated
// pages (Online Orders). The store-credit ledger lives on users/{uid} and,
// by design, only staff/admin can increase it (see firestore.rules) - a
// customer viewing their own order can still close it out of its hold, but
// the ledger write itself has to wait for a staff page load to happen. That
// keeps a customer from ever being able to write their own credit balance.
async function enforceOrderDeadline(orderId, order, { grantCreditToBalance = false } = {}) {
  const now = Date.now();

  if (order.paymentIssue && order.paymentIssue.holdUntil && order.paymentIssue.holdUntil.toMillis() < now) {
    const unappliedCredit = computeUnappliedCredit(order);
    const closedReason = `${HOLD_REASON_LABELS[order.paymentIssue.type] || "This order"} was not resolved within 7 days.`;

    const batch = db.batch();
    batch.update(db.collection("orders").doc(orderId), {
      status: "closed_unresolved",
      "statusTimestamps.closed_unresolved": firebase.firestore.FieldValue.serverTimestamp(),
      paymentIssue: firebase.firestore.FieldValue.delete(),
      closedReason,
      unappliedCredit,
    });
    if (grantCreditToBalance && unappliedCredit > 0 && order.customerId) {
      batch.update(db.collection("users").doc(order.customerId), {
        creditBalance: firebase.firestore.FieldValue.increment(unappliedCredit),
      });
    }
    await batch.commit();

    if (grantCreditToBalance && unappliedCredit > 0 && order.customerId) {
      notifyCustomer(
        order.customerId,
        `You have ${formatPeso(unappliedCredit)} credit from order ${order.orderNumber}`,
        closedReason + " Kept as credit - it'll be applied automatically to your next order.",
        `order-details.html?id=${orderId}`
      );
    }

    order.status = "closed_unresolved";
    order.closedReason = closedReason;
    order.unappliedCredit = unappliedCredit;
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

// Redeems as much of the customer's store credit balance as the order
// total allows (never more, never cash back) and creates the order with
// the discounted total in one atomic transaction - the read-then-decrement
// of users/{uid}.creditBalance and the order creation can't be split apart,
// or two orders placed back-to-back could both spend the same credit.
async function createOrderWithCreditRedemption(orderData) {
  const orderRef = db.collection("orders").doc();
  const userRef = orderData.customerId ? db.collection("users").doc(orderData.customerId) : null;

  const { appliedCredit, finalTotal } = await db.runTransaction(async (transaction) => {
    let balance = 0;
    if (userRef) {
      const userDoc = await transaction.get(userRef);
      balance = userDoc.exists ? userDoc.data().creditBalance || 0 : 0;
    }
    const appliedCredit = Math.max(0, Math.min(balance, orderData.total));
    const finalTotal = orderData.total - appliedCredit;

    const orderPayload = { ...orderData, subtotal: orderData.total, total: finalTotal };
    if (appliedCredit > 0) orderPayload.creditApplied = appliedCredit;

    transaction.set(orderRef, orderPayload);
    if (appliedCredit > 0) {
      transaction.update(userRef, { creditBalance: firebase.firestore.FieldValue.increment(-appliedCredit) });
    }
    return { appliedCredit, finalTotal };
  });

  return { orderId: orderRef.id, appliedCredit, finalTotal };
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
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
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
