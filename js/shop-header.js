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

    snapshot.docs.forEach((doc) => {
      const order = doc.data();
      if (order.paymentIssue) {
        notifications.push({
          priority: 0,
          orderId: doc.id,
          title: `Payment issue on order ${order.orderNumber}`,
          detail: "Please check your order for details.",
        });
      } else if (order.status === "dispatched") {
        notifications.push({
          priority: 1,
          orderId: doc.id,
          title: `Order ${order.orderNumber} is on its way`,
          detail: "Your order has been dispatched for delivery.",
        });
      } else if (order.status === "delivered") {
        notifications.push({
          priority: 2,
          orderId: doc.id,
          title: `Order ${order.orderNumber} has been delivered`,
          detail: "Let us know if anything's missing or damaged.",
        });
      }
    });

    notifications.sort((a, b) => a.priority - b.priority);
    renderCustomerNotifications(notifications.slice(0, 5));
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
          <a class="dropdown-item" href="order-details.html?id=${n.orderId}" style="white-space:normal;">
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
