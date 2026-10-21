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
  placed: "Pending Prescription Verification",
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
  placed: "Pending Prescription Verification",
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
// all - the whole amount carries over. Either way, order.creditApplied
// (store credit already spent redeeming this order at checkout) always
// gets added back in - it's real value the customer already handed over
// on top of whatever they paid via QR, and closing the order unresolved
// can't be allowed to make it vanish.
const HOLD_REASON_LABELS = {
  invalid_payment: "Payment Issue - Invalid Payment",
  underpayment: "Payment Issue - Underpayment",
  out_of_stock: "Item Out of Stock",
  prescription_rejected: "Prescription Not Accepted",
  payment_not_received: "Payment Issue - Payment Not Received",
};

function computeUnappliedCredit(order) {
  const issue = order.paymentIssue;
  if (!issue) return 0;
  const creditApplied = order.creditApplied || 0;
  if (issue.type === "underpayment") return (issue.amountReceived || 0) + creditApplied;
  if (issue.type === "out_of_stock") return (order.total || 0) + creditApplied;
  // A rejected prescription only carries the payment over if staff
  // confirmed the payment itself was received in full.
  if (issue.type === "prescription_rejected") return (issue.paymentVerified ? order.total || 0 : 0) + creditApplied;
  // Invalid / not-received payment: nothing paid by QR carries over, but
  // store credit redeemed on this order does.
  return creditApplied;
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

const DELIVERY_SLOT_LABELS = {
  morning: "Morning (8AM-12PM)",
  afternoon: "Afternoon (12PM-4PM)",
  evening: "Evening (4PM-8PM)",
};

function formatDeliverySchedule(schedule) {
  if (!schedule || schedule.asap || !schedule.date) return "Same Day Delivery";
  const [y, m, d] = schedule.date.split("-");
  return `${m}/${d}/${y} - ${DELIVERY_SLOT_LABELS[schedule.slot] || schedule.slot || ""}`.trim();
}

const DISPATCH_AUTO_DELIVER_MS = 3 * 24 * 60 * 60 * 1000;

function orderStatusSteps(order) {
  return order.requiresPrescription ? PICKUP_ORDER_STATUS_STEPS : ORDER_STATUS_STEPS;
}

function orderStepLabels(order) {
  return order.requiresPrescription ? PICKUP_ORDER_STATUS_STEP_LABELS : ORDER_STATUS_STEP_LABELS;
}

// What the customer sees while an order is on hold and waiting on them.
const CUSTOMER_HOLD_BADGE_LABELS = {
  invalid_payment: "Payment Rejected - Re-upload Needed",
  payment_not_received: "Payment Rejected - Re-upload Needed",
  underpayment: "On Hold - Balance Due",
  out_of_stock: "On Hold - Out of Stock",
  prescription_rejected: "Prescription Rejected - Re-upload Needed",
};

function orderBadgeLabel(order) {
  if (order.paymentIssue && order.status === "placed") {
    if (order.paymentIssue.resolvedByCustomerAt) return "Resubmitted - Under Review";
    return CUSTOMER_HOLD_BADGE_LABELS[order.paymentIssue.type] || "On Hold";
  }
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
async function notifyCustomer(customerId, title, detail, link, severity = "info", kind = null) {
  if (!customerId) return;
  try {
    const notif = {
      customerId,
      title,
      detail,
      link,
      severity,
      read: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (kind) notif.kind = kind;
    await db.collection("customerNotifications").add(notif);
    sendOrderEmail(customerId, title, detail, link);
  } catch (error) {
    console.error("Failed to write customer notification:", error);
  }
}

// Email copy of a customer notification (REQ039), through EmailJS. Skipped
// when EmailJS or the order template isn't set up on this page, or when the
// customer turned email updates off in Account Settings (REQ042). Never
// blocks or fails the action that triggered it.
async function sendOrderEmail(customerId, title, detail, link) {
  try {
    if (
      typeof emailjs === "undefined" ||
      typeof EMAILJS_ORDER_TEMPLATE_ID === "undefined" ||
      EMAILJS_ORDER_TEMPLATE_ID === "YOUR_ORDER_TEMPLATE_ID"
    ) {
      return;
    }
    const doc = await db.collection("users").doc(customerId).get();
    if (!doc.exists) return;
    const user = doc.data();
    if (!user.email || user.emailNotifications === false) return;
    // Links are relative to the shop folder; make them absolute for email.
    const url = new URL(`${/\/shop\//.test(window.location.pathname) ? "" : "../shop/"}${link || "orders.html"}`, window.location.href).href;
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
      to_email: user.email,
      to_name: user.firstName || "Customer",
      subject: title,
      message: detail,
      link: url,
    });
  } catch (error) {
    console.warn("Order email not sent:", error);
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
    let unappliedCredit = computeUnappliedCredit(order);
    const closedReason = `${HOLD_REASON_LABELS[order.paymentIssue.type] || "This order"} was not resolved within 7 days.`;

    // Only staff pages close the order and credit the balance, in one
    // transaction, so the credit is never lost or added twice. Customer
    // pages just show it as closed until then.
    if (!grantCreditToBalance) {
      order.status = "closed_unresolved";
      order.closedReason = closedReason;
      order.unappliedCredit = unappliedCredit;
      delete order.paymentIssue;
      return order;
    }

    const orderRef = db.collection("orders").doc(orderId);
    const closed = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(orderRef);
      const f = fresh.exists ? fresh.data() : null;
      if (!f || !f.paymentIssue || !f.paymentIssue.holdUntil || f.paymentIssue.holdUntil.toMillis() >= Date.now()) return false;
      unappliedCredit = computeUnappliedCredit(f);
      transaction.update(orderRef, {
        status: "closed_unresolved",
        "statusTimestamps.closed_unresolved": firebase.firestore.FieldValue.serverTimestamp(),
        paymentIssue: firebase.firestore.FieldValue.delete(),
        closedReason,
        unappliedCredit,
      });
      if (unappliedCredit > 0 && f.customerId) {
        transaction.update(db.collection("users").doc(f.customerId), {
          creditBalance: firebase.firestore.FieldValue.increment(unappliedCredit),
        });
      }
      return true;
    });
    if (!closed) {
      // Someone else already handled it (or the hold was extended).
      const fresh = await orderRef.get();
      if (fresh.exists) {
        const data = fresh.data();
        Object.assign(order, data);
        if (!data.paymentIssue) delete order.paymentIssue;
      }
      return order;
    }

    if (unappliedCredit > 0 && order.customerId) {
      notifyCustomer(
        order.customerId,
        `You have ${formatPeso(unappliedCredit)} credit from order ${order.orderNumber}`,
        closedReason + " Kept as credit - it'll be applied automatically to your next order.",
        `order-details.html?id=${orderId}`,
        "success"
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
      // Never let this break the page: if the write is refused (e.g. the
      // device clock is ahead), the order just stays Dispatched for now.
      try {
        await db.collection("orders").doc(orderId).update({
          status: "delivered",
          "statusTimestamps.delivered": firebase.firestore.FieldValue.serverTimestamp(),
        });
        order.status = "delivered";
      } catch (error) {
        console.warn("Couldn't mark the order delivered yet:", error);
      }
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
  return formatDateMDY(timestamp, true);
}

// Redeems as much of the customer's store credit balance as the order
// total allows (never more, never cash back) and creates the order with
// the discounted total in one atomic transaction - the read-then-decrement
// of users/{uid}.creditBalance and the order creation can't be split apart,
// or two orders placed back-to-back could both spend the same credit.
// expectFullCredit: the customer was told credit covers the whole order
// (so no payment proof was asked for); stop if that's no longer true.
async function createOrderWithCreditRedemption(orderData, { expectFullCredit = false } = {}) {
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
    if (expectFullCredit && finalTotal > 0) {
      throw new Error("Your store credit balance changed, so it no longer covers this order. Please reload the page to pay the rest.");
    }

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

  // In a transaction so two checkouts at the same moment never share a number.
  const nextCount = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const next = (counterDoc.exists ? counterDoc.data().count || 0 : 0) + 1;
    transaction.set(counterRef, { count: next }, { merge: true });
    return next;
  });
  return `AMP-${year}-${String(nextCount).padStart(4, "0")}`;
}

function downloadOrderReceipt(order) {
  if (!order.invoiceNo) {
    showAppAlert("Your receipt will be available once our staff verify your payment.");
    return;
  }
  if (typeof window.jspdf === "undefined") {
    showAppAlert("PDF generation isn't available right now. Please try again in a moment.");
    return;
  }

  const doc = createPdf();
  let y = 20;

  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("Amson Pharmaceuticals", 14, y);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  y += 6;
  doc.text("Order Receipt", 14, y);

  y += 10;
  doc.setFontSize(11);
  doc.text(`Order Number: ${order.orderNumber}`, 14, y);
  if (order.invoiceNo) {
    y += 6;
    doc.text(`SI No.: ${order.invoiceNo}`, 14, y);
  }
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
  if (order.creditApplied > 0) {
    y += 8;
    doc.text("Subtotal", 14, y);
    doc.text(formatPeso(order.subtotal || order.total + order.creditApplied), 196, y, { align: "right" });
    y += 6;
    doc.text("Store credit applied", 14, y);
    doc.text(`-${formatPeso(order.creditApplied)}`, 196, y, { align: "right" });
  }
  y += 8;
  doc.setFont(undefined, "bold");
  doc.text("Total", 14, y);
  doc.text(formatPeso(order.total), 196, y, { align: "right" });

  y += 16;
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("Generated electronically for your records.", 14, y);

  doc.save(`${order.orderNumber}-receipt.pdf`);
}
