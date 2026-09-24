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

    loadCustomerNotifications(user.uid, data.notifReadMap || {});
  } catch (error) {
    guestActions.classList.remove("d-none");
    accountActions.classList.add("d-none");
  }
});

// A notification is either "persisted" (a real customerNotifications doc -
// payment issue holds, credit grants - written by notifyCustomer in
// orders.js, with its own `read` field the customer's allowed to flip) or
// "derived" (order-status-based - dispatched/delivered/ready-for-pickup -
// re-computed live each load, so there's no doc to flag read on). Derived
// ones reuse the same key+signature trick as the staff notification bell:
// a small read-map on the customer's own user doc records what state was
// last seen, so marking read doesn't stick once the order moves on.
async function loadCustomerNotifications(uid, readMap) {
  if (!notifDropdownList) return;

  try {
    const notifSnapshot = await db.collection("customerNotifications").where("customerId", "==", uid).get();
    const notifications = notifSnapshot.docs.map((doc) => {
      const n = doc.data();
      return {
        priority: 0,
        sortKey: n.createdAt && n.createdAt.toMillis ? n.createdAt.toMillis() : 0,
        link: n.link || "orders.html",
        title: n.title,
        detail: n.detail,
        persisted: true,
        docId: doc.id,
        isRead: n.read === true,
      };
    });

    const snapshot = await db.collection("orders").where("customerId", "==", uid).get();

    snapshot.docs.forEach((doc) => {
      const order = doc.data();
      let entry = null;
      if (order.status === "dispatched") {
        entry = {
          priority: 1,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} is on its way`,
          detail: "Your order has been dispatched for delivery.",
          key: `dispatched:${doc.id}`,
        };
      } else if (order.status === "delivered" && order.requiresPrescription) {
        entry = {
          priority: 1,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} is ready for pick-up`,
          detail: "Please bring a valid ID (and the original prescription, if applicable) when you collect it.",
          key: `ready_for_pickup:${doc.id}`,
        };
      } else if (order.status === "delivered") {
        entry = {
          priority: 2,
          link: `order-details.html?id=${doc.id}`,
          title: `Order ${order.orderNumber} has been delivered`,
          detail: "Let us know if anything's missing or damaged.",
          key: `delivered:${doc.id}`,
        };
      }
      if (entry) {
        entry.persisted = false;
        entry.signature = order.status;
        entry.isRead = readMap[entry.key] === entry.signature;
        notifications.push(entry);
      }
    });

    notifications.sort((a, b) => a.priority - b.priority || (b.sortKey || 0) - (a.sortKey || 0));
    renderCustomerNotifications(uid, notifications.slice(0, 8));
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }
}

async function markCustomerNotifRead(uid, n) {
  if (n.persisted) {
    await db.collection("customerNotifications").doc(n.docId).update({ read: true });
  } else {
    await db.collection("users").doc(uid).set({ [`notifReadMap.${n.key}`]: n.signature }, { merge: true });
  }
}

function renderCustomerNotifications(uid, notifications) {
  if (notifications.length === 0) {
    if (notifBadge) notifBadge.classList.add("d-none");
    return;
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifBadge) {
    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
      notifBadge.classList.remove("d-none");
    } else {
      notifBadge.classList.add("d-none");
    }
  }

  if (notifEmptyState) notifEmptyState.remove();

  notifDropdownList.innerHTML =
    notifications
      .map(
        (n, idx) => `
          <li>
            <a class="dropdown-item customer-notif-item" href="${n.link}" data-idx="${idx}" style="white-space:normal; ${n.isRead ? "opacity:0.6;" : "font-weight:600;"}">
              <div class="d-flex align-items-start gap-2">
                ${n.isRead ? "" : '<span class="rounded-circle bg-primary flex-shrink-0 mt-1" style="width:6px; height:6px; display:inline-block;"></span>'}
                <div>
                  <div>${n.title}</div>
                  <div class="text-muted" style="font-size:0.78rem; font-weight:400;">${n.detail}</div>
                </div>
              </div>
            </a>
          </li>
        `
      )
      .join("") +
    (unreadCount > 0
      ? `<li><hr class="dropdown-divider"></li><li><button type="button" class="dropdown-item text-center small" id="markAllNotifsReadLink">Mark all as read</button></li>`
      : "");

  notifDropdownList.querySelectorAll(".customer-notif-item").forEach((item) => {
    item.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const n = notifications[Number(item.dataset.idx)];
      const href = item.getAttribute("href");
      try {
        await markCustomerNotifRead(uid, n);
      } catch (error) {
        console.error("Failed to mark notification read:", error);
      }
      window.location.href = href;
    });
  });

  const markAllBtn = document.getElementById("markAllNotifsReadLink");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
      markAllBtn.disabled = true;
      try {
        await Promise.all(notifications.filter((n) => !n.isRead).map((n) => markCustomerNotifRead(uid, n)));
        const freshDoc = await db.collection("users").doc(uid).get();
        const freshReadMap = freshDoc.exists ? freshDoc.data().notifReadMap || {} : {};
        await loadCustomerNotifications(uid, freshReadMap);
      } catch (error) {
        console.error("Failed to mark all notifications read:", error);
      } finally {
        markAllBtn.disabled = false;
      }
    });
  }
}

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login.html";
});
