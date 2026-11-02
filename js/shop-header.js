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

const SHOP_STAFF_ROLES = {
  admin: "Administrator",
  branch_manager: "Branch Manager",
  technical_staff: "Technical Staff",
  sales_staff: "Sales Staff",
};

// The last signed-in name is shown straight away by js/header-user.js
// (rememberHeaderUser / forgetHeaderUser live there too); the login check
// below then confirms or corrects it.

function showGuestHeader() {
  forgetHeaderUser();
  guestActions.classList.remove("d-none");
  accountActions.classList.add("d-none");
}

function showStaffShopBar(data) {
  forgetHeaderUser();
  guestActions.classList.add("d-none");
  accountActions.classList.add("d-none");
  if (document.getElementById("staffShopBar")) return;
  const bar = document.createElement("div");
  bar.id = "staffShopBar";
  bar.className = "text-center py-2 px-3";
  bar.style.cssText = "background:#212529;color:#fff;font-size:0.85rem;";
  bar.innerHTML = `You're signed in with a staff account (${escapeHtml(SHOP_STAFF_ROLES[data.role])}: ${escapeHtml(data.email || "")}). The shop is for customer accounts.
    <a href="../admin/${data.role === "sales_staff" ? "pos" : "dashboard"}.html" class="btn btn-sm btn-light ms-2 py-0">Go to Dashboard</a>
    <button type="button" class="btn btn-sm btn-outline-light ms-1 py-0" id="staffShopLogoutBtn">Log out</button>`;
  document.body.prepend(bar);
  document.getElementById("staffShopLogoutBtn").addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "../login.html";
  });
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    showGuestHeader();
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};
    if (doc.exists && data.accountStatus === "deactivated") {
      forgetHeaderUser();
      try {
        sessionStorage.setItem("amsonLoginNotice", "Your account has been deactivated. Please contact support.");
      } catch (error) {}
      await auth.signOut();
      window.location.href = "../login.html";
      return;
    }
    // Customers who haven't entered their sign-up code yet finish that first.
    if (doc.exists && data.role === "customer" && !data.emailVerified) {
      forgetHeaderUser();
      try {
        sessionStorage.setItem("amsonPendingVerificationEmail", data.email || user.email || "");
      } catch (error) {}
      window.location.href = "../verify-email.html";
      return;
    }
    // Verified customers on a device they never confirmed go back to log in
    // (REQ005). Unverified accounts are still finishing sign-up.
    if (doc.exists && data.role === "customer" && data.emailVerified && typeof enforceRecognizedDevice === "function") {
      if (!(await enforceRecognizedDevice(data))) return;
    }
    // Staff accounts aren't customer accounts: say so instead of showing the
    // shop as if they were a customer (cart, orders and alerts are for
    // customers, and the database refuses them for staff).
    if (doc.exists && SHOP_STAFF_ROLES[data.role]) {
      showStaffShopBar(data);
      return;
    }
    accountFirstName.textContent = data.firstName || "Account";
    rememberHeaderUser(data.firstName || "");
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

    watchCustomerNotifications(user.uid, data.notifReadMap || {});
  } catch (error) {
    showGuestHeader();
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
//
// Both lists are listened to live, so a payment hold or a dispatched order
// shows in the bell straight away, without a refresh.
let customerNotifWatch = null;

function watchCustomerNotifications(uid, readMap) {
  if (!notifDropdownList) return;
  if (customerNotifWatch) customerNotifWatch.stop();
  const watch = { uid, readMap, notifDocs: null, orderDocs: null };
  const redraw = () => {
    // Wait for both lists before drawing the bell the first time.
    if (watch.notifDocs && watch.orderDocs) {
      renderCustomerNotifications(uid, buildCustomerNotifications(watch.notifDocs, watch.orderDocs, watch.readMap));
    }
  };
  const onError = (error) => console.error("Failed to load notifications:", error);
  const stopNotifs = db
    .collection("customerNotifications")
    .where("customerId", "==", uid)
    .onSnapshot((snap) => {
      watch.notifDocs = snap.docs;
      redraw();
    }, onError);
  const stopOrders = db
    .collection("orders")
    .where("customerId", "==", uid)
    .onSnapshot((snap) => {
      watch.orderDocs = snap.docs;
      redraw();
    }, onError);
  watch.redraw = redraw;
  watch.stop = () => {
    stopNotifs();
    stopOrders();
  };
  customerNotifWatch = watch;
}

// The newest 8 notifications: payment issues and credit first, then orders
// on their way, ready for pick-up or delivered.
function buildCustomerNotifications(notifDocs, orderDocs, readMap) {
  const notifications = notifDocs.map((doc) => {
    const n = doc.data();
    return {
      priority: 0,
      sortKey: n.createdAt && n.createdAt.toMillis ? n.createdAt.toMillis() : 0,
      link: n.link || "orders.html",
      title: n.title,
      detail: n.detail,
      severity: n.severity || "info",
      persisted: true,
      docId: doc.id,
      isRead: n.read === true,
    };
  });

  orderDocs.forEach((doc) => {
    const order = doc.data();
    let entry = null;
    if (order.status === "dispatched") {
      entry = {
        priority: 1,
        link: `order-details.html?id=${doc.id}`,
        title: `Order ${order.orderNumber} is on its way`,
        detail: "Your order has been dispatched for delivery.",
        key: `dispatched:${doc.id}`,
        severity: "info",
        icon: "bi-truck",
      };
    } else if (order.status === "delivered" && order.requiresPrescription) {
      entry = {
        priority: 1,
        link: `order-details.html?id=${doc.id}`,
        title: `Order ${order.orderNumber} is ready for pick-up`,
        detail: "Please bring a valid ID (and the original prescription, if applicable) when you collect it.",
        key: `ready_for_pickup:${doc.id}`,
        severity: "warning",
        icon: "bi-bag-check",
      };
    } else if (order.status === "delivered") {
      entry = {
        priority: 2,
        link: `order-details.html?id=${doc.id}`,
        title: `Order ${order.orderNumber} has been delivered`,
        detail: "Let us know if anything's missing or damaged.",
        key: `delivered:${doc.id}`,
        severity: "success",
        icon: "bi-check-circle",
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
  return notifications.slice(0, 8);
}

async function markCustomerNotifRead(uid, n) {
  if (n.persisted) {
    await db.collection("customerNotifications").doc(n.docId).update({ read: true });
  } else {
    // set(..., {merge:true}) does NOT reliably merge into a nested map via a
    // dotted-string key - only update() does. The user's own doc always
    // already exists here (they're signed in), so no need to ensure it first.
    await db.collection("users").doc(uid).update({ [`notifReadMap.${n.key}`]: n.signature });
    if (customerNotifWatch) customerNotifWatch.readMap = { ...customerNotifWatch.readMap, [n.key]: n.signature };
  }
}

function renderCustomerNotifications(uid, notifications) {
  if (notifications.length === 0) {
    if (notifBadge) notifBadge.classList.add("d-none");
    notifDropdownList.innerHTML = '<li class="px-3 py-2 text-muted">Nothing new right now.</li>';
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

  // Same look as the staff bell: a thin colored edge and a colored icon.
  notifDropdownList.style.minWidth = "320px";
  const severityIcons = { danger: "bi-exclamation-octagon", warning: "bi-exclamation-triangle", info: "bi-info-circle", success: "bi-check-circle" };
  notifDropdownList.innerHTML =
    notifications
      .map((n, idx) => {
        const severityColor = SEVERITY_COLORS[n.severity] || SEVERITY_COLORS.info;
        const icon = n.icon || severityIcons[n.severity] || severityIcons.info;
        return `
          <li>
            <a class="dropdown-item d-flex align-items-start gap-2 py-2 customer-notif-item" href="${n.link}" data-idx="${idx}" style="white-space:normal; border-left:3px solid ${severityColor}; ${n.isRead ? "opacity:0.6;" : "font-weight:600;"}">
              <i class="bi ${icon} mt-1" style="color:${severityColor};"></i>
              <span class="flex-grow-1" style="font-size:0.85rem;">
                ${escapeHtml(n.title || "")}
                <span class="d-block text-muted" style="font-size:0.78rem; font-weight:400;">${escapeHtml(n.detail || "")}</span>
              </span>
            </a>
          </li>
        `;
      })
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
        // Persisted ones redraw through their listener; this covers the rest.
        if (customerNotifWatch) customerNotifWatch.redraw();
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
