// shared order helpers

const ORDER_STATUS_STEPS = ["placed", "payment_confirmed", "dispatched", "delivered", "received"];

// prescription orders are pickup so they skip dispatched
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

// no refunds, verified payments become store credit
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
  // rejected prescription only carries over a fully confirmed payment
  if (issue.type === "prescription_rejected") return (issue.paymentVerified ? order.total || 0 : 0) + creditApplied;
  // bad payment: only redeemed credit carries over
  return creditApplied;
}

// item rows for my orders and order details
function orderItemRowsHtml(items) {
  return items
    .map((item) => {
      // older orders use the products current photo
      const imageUrl = item.imageUrl || (getProductById(item.id) || {}).imageUrl;
      return `
        <div class="cart-item-row">
          <div class="cart-item-image" style="${cartItemImageCss(imageUrl)}"></div>
          <div class="cart-item-details">
            <h3 class="product-name mb-1">${escapeHtml(item.name)}${rxTag(item.id)}</h3>
            <p class="text-muted mb-0" style="font-size:0.85rem;">Qty: ${item.qty}</p>
          </div>
          <div class="product-price mb-0">${formatPeso(item.price * item.qty)}</div>
        </div>
      `;
    })
    .join("");
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

// what the customer sees while a hold waits on them
const CUSTOMER_HOLD_BADGE_LABELS = {
  invalid_payment: "Payment Rejected - Re-upload Needed",
  payment_not_received: "Payment Rejected - Re-upload Needed",
  underpayment: "On Hold - Balance Due",
  prescription_rejected: "Prescription Rejected - Re-upload Needed",
};

function orderBadgeLabel(order) {
  if (order.paymentIssue && order.status === "placed" && order.paymentIssue.type !== "out_of_stock") {
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

// saved customer notifications, only written by staff actions
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

// email copy through emailjs, skipped if not set up or turned off
async function sendOrderEmail(customerId, title, detail, link) {
  try {
    const emailNotSetUp =
      typeof emailjs === "undefined" ||
      typeof EMAILJS_ORDER_TEMPLATE_ID === "undefined" ||
      EMAILJS_ORDER_TEMPLATE_ID === "YOUR_ORDER_TEMPLATE_ID";
    if (emailNotSetUp) {
      return;
    }
    const doc = await db.collection("users").doc(customerId).get();
    if (!doc.exists) return;
    const user = doc.data();
    if (!user.email || user.emailNotifications === false) return;
    // email needs absolute links
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

// ---- deadline check, runs on page load ----
async function enforceOrderDeadline(orderId, order, { grantCreditToBalance = false } = {}) {
  const now = Date.now();

  if (order.paymentIssue && order.paymentIssue.holdUntil && order.paymentIssue.holdUntil.toMillis() < now) {
    let unappliedCredit = computeUnappliedCredit(order);
    const closedReason = `${HOLD_REASON_LABELS[order.paymentIssue.type] || "This order"} was not resolved within 7 days.`;

    // only staff pages close the order and add the credit
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
      const freshOrder = fresh.exists ? fresh.data() : null;
      // nothing to close yet
      const nothingToClose = !freshOrder || !freshOrder.paymentIssue || !freshOrder.paymentIssue.holdUntil || freshOrder.paymentIssue.holdUntil.toMillis() >= Date.now();
      if (nothingToClose) return false;
      unappliedCredit = computeUnappliedCredit(freshOrder);
      transaction.update(orderRef, {
        status: "closed_unresolved",
        "statusTimestamps.closed_unresolved": firebase.firestore.FieldValue.serverTimestamp(),
        paymentIssue: firebase.firestore.FieldValue.delete(),
        closedReason,
        unappliedCredit,
      });
      if (unappliedCredit > 0 && freshOrder.customerId) {
        transaction.update(db.collection("users").doc(freshOrder.customerId), {
          creditBalance: firebase.firestore.FieldValue.increment(unappliedCredit),
        });
      }
      return true;
    });
    if (!closed) {
      // someone already handled it
      const fresh = await orderRef.get();
      if (fresh.exists) {
        const data = fresh.data();
        Object.assign(order, data);
        if (!data.paymentIssue) delete order.paymentIssue;
      }
      return order;
    }

    if (typeof logAuditEvent === "function") {
      logAuditEvent({
        action: "Order Closed (Unresolved)",
        details: `Order ${order.orderNumber} - ${closedReason}${unappliedCredit > 0 ? ` ${formatPeso(unappliedCredit)} kept as store credit.` : ""}`,
      });
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
      // if the write fails the order just stays dispatched for now
      try {
        await db.collection("orders").doc(orderId).update({
          status: "delivered",
          "statusTimestamps.delivered": firebase.firestore.FieldValue.serverTimestamp(),
        });
        order.status = "delivered";
        if (typeof logAuditEvent === "function") {
          logAuditEvent({ action: "Order Auto-Delivered", details: `Order ${order.orderNumber} - marked Delivered 3 days after dispatch`, actor: "System" });
        }
      } catch (error) {
        console.warn("Couldn't mark the order delivered yet:", error);
      }
    }
  }

  return order;
}

// mm/dd/yyyy, formatDateMDY does the work
function formatOrderDate(timestamp) {
  return formatDateMDY(timestamp);
}

function formatOrderDateTime(timestamp) {
  if (!timestamp) return "";
  return formatDateMDY(timestamp, true);
}

// uses as much store credit as the total allows, never cash back
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
      // rules check the credit belongs to this order
      transaction.update(userRef, {
        creditBalance: firebase.firestore.FieldValue.increment(-appliedCredit),
        lastCreditOrderId: orderRef.id,
      });
    }
    return { appliedCredit, finalTotal };
  });

  return { orderId: orderRef.id, appliedCredit, finalTotal };
}

async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const counterRef = db.collection("counters").doc(`orders-${year}`);

  // transaction so two checkouts never get the same number
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

  doc.save(`${order.orderNumber}-receipt.pdf`);
}
