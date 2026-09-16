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

    if (headerCreditItem && headerCreditAmount) {
      const creditBalance = data.creditBalance || 0;
      if (creditBalance > 0) {
        headerCreditAmount.textContent = formatPeso(creditBalance);
        headerCreditItem.classList.remove("d-none");
      } else {
        headerCreditItem.classList.add("d-none");
      }
    }
  } catch (error) {
    guestActions.classList.remove("d-none");
    accountActions.classList.add("d-none");
  }

  loadCustomerNotifications(user.uid);
});

async function loadCustomerNotifications(uid) {
  if (!notifDropdownList) return;

  try {
    // Payment issue holds and credit grants are written directly to this
    // collection at the moment they happen (see orders.js's
    // notifyCustomer, called from admin-online-orders.js and the
    // hold-expiry sweep) - reading them here instead of re-deriving "did
    // something happen" from live order state each page load.
    const notifSnapshot = await db.collection("customerNotifications").where("customerId", "==", uid).get();
    const notifications = notifSnapshot.docs.map((doc) => {
      const n = doc.data();
      return {
        priority: 0,
        sortKey: n.createdAt && n.createdAt.toMillis ? n.createdAt.toMillis() : 0,
        link: n.link || "orders.html",
        title: n.title,
        detail: n.detail,
      };
    });

    const snapshot = await db.collection("orders").where("customerId", "==", uid).get();

    snapshot.docs.forEach((doc) => {
      const order = doc.data();
      if (order.status === "dispatched") {
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
    });

    notifications.sort((a, b) => a.priority - b.priority || (b.sortKey || 0) - (a.sortKey || 0));
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
