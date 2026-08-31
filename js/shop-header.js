/**
 * Shared header behavior for storefront pages.
 */

const guestActions = document.getElementById("guestActions");
const accountActions = document.getElementById("accountActions");
const accountFirstName = document.getElementById("accountFirstName");
const logoutLink = document.getElementById("logoutLink");
const notifBadge = document.getElementById("notifBadge");
const notifDropdownList = document.getElementById("notifDropdownList");
const notifEmptyState = document.getElementById("notifEmptyState");
const headerCreditItem = document.getElementById("headerCreditItem");
const headerCreditAmount = document.getElementById("headerCreditAmount");

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    guestActions.classList.remove("d-none");
    accountActions.classList.add("d-none");
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};
    accountFirstName.textContent = data.firstName || "Account";
    guestActions.classList.add("d-none");
    accountActions.classList.remove("d-none");
  } catch (error) {
    guestActions.classList.remove("d-none");
    accountActions.classList.add("d-none");
  }

  loadCustomerNotifications(user.uid);
});

async function loadCustomerNotifications(uid) {
  if (!notifDropdownList) return;

  try {
    const snapshot = await db.collection("orders").where("customerId", "==", uid).get();
    const notifications = [];
    let totalCredit = 0;

    snapshot.docs.forEach((doc) => {
      const order = doc.data();
      if (order.paymentOverage && order.paymentOverage.excessAmount > 0) totalCredit += order.paymentOverage.excessAmount;
      if (order.status === "closed_unresolved" && order.unappliedCredit > 0) totalCredit += order.unappliedCredit;
      if (order.paymentIssue) {
        const isStockHold = order.paymentIssue.type === "out_of_stock";
        notifications.push({
          priority: 0,
          link: `order-details.html?id=${doc.id}`,
          title: isStockHold ? `Order ${order.orderNumber} - item out of stock` : `Payment issue on order ${order.orderNumber}`,
          detail: "Please check your order for details.",
        });
      } else if (order.status === "dispatched") {
        notifications.push({
          priority: 1,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} is on its way`,
          detail: "Your order has been dispatched for delivery.",
        });
      } else if (order.status === "delivered" && order.requiresPrescription) {
        notifications.push({
          priority: 1,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} is ready for pick-up`,
          detail: "Please bring a valid ID (and the original prescription, if applicable) when you collect it.",
        });
      } else if (order.status === "delivered") {
        notifications.push({
          priority: 2,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} has been delivered`,
          detail: "Let us know if anything's missing or damaged.",
        });
      }

      // Independent of status - an overpayment credit is worth flagging
      // on its own, on top of whatever the order's normal status update is.
      if (order.paymentOverage && order.paymentOverage.excessAmount > 0) {
        notifications.push({
          priority: 0,
          link: `order-details.html?id=${doc.id}`,
          title: `You have ${formatPeso(order.paymentOverage.excessAmount)} credit from order ${order.orderNumber}`,
          detail: "Overpayment kept as credit toward a future purchase - reach out via live chat to apply it.",
        });
      }
      // Same for credit left over from a hold that closed unresolved -
      // orders.js isn't loaded on every page the header appears on, so
      // this reads the field directly instead of using its helper.
      if (order.status === "closed_unresolved" && order.unappliedCredit > 0) {
        notifications.push({
          priority: 0,
          link: `order-details.html?id=${doc.id}`,
          title: `You have ${formatPeso(order.unappliedCredit)} credit from order ${order.orderNumber}`,
          detail: "Kept as credit toward a future purchase - reach out via live chat to apply it.",
        });
      }
    });

    notifications.sort((a, b) => a.priority - b.priority);
    renderCustomerNotifications(notifications.slice(0, 5));

    if (headerCreditItem && headerCreditAmount) {
      if (totalCredit > 0) {
        headerCreditAmount.textContent = formatPeso(totalCredit);
        headerCreditItem.classList.remove("d-none");
      } else {
        headerCreditItem.classList.add("d-none");
      }
    }
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }
}

function renderCustomerNotifications(notifications) {
  if (notifications.length === 0) {
    if (notifBadge) notifBadge.classList.add("d-none");
    return;
  }

  if (notifBadge) {
    notifBadge.textContent = notifications.length;
    notifBadge.classList.remove("d-none");
  }

  if (notifEmptyState) notifEmptyState.remove();
  notifDropdownList.innerHTML = notifications
    .map(
      (n) => `
        <li>
          <a class="dropdown-item" href="${n.link}" style="white-space:normal;">
            <div class="fw-medium">${n.title}</div>
            <div class="text-muted" style="font-size:0.78rem;">${n.detail}</div>
          </a>
        </li>
      `
    )
    .join("");
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login.html";
});
