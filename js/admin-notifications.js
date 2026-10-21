/**
 * Notifications admin page.
 */

const notificationsList = document.getElementById("notificationsList");
const notificationsEmpty = document.getElementById("notificationsEmpty");
const markAllNotifsReadBtn = document.getElementById("markAllNotifsReadBtn");

const SEVERITY_CLASS = {
  danger: "text-bg-danger",
  warning: "text-bg-warning",
  info: "text-bg-secondary",
};

let currentNotifUid = null;
let currentNotifications = [];
let currentReadMap = {};
let notifFilter = "all";
let shownNotifications = [];

// Filter buttons: All / Orders / Stock / Live Chat, with a count on each.
document.querySelectorAll("#notifFilterGroup [data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    notifFilter = btn.dataset.filter;
    document.querySelectorAll("#notifFilterGroup [data-filter]").forEach((b) => b.classList.toggle("active", b === btn));
    renderNotifications(currentNotifications, currentReadMap);
  });
});

function notifTimeLabel(at) {
  if (!at) return "";
  const diff = Date.now() - at;
  if (diff >= 0 && diff < 60 * 1000) return "Just now";
  if (diff >= 0 && diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff >= 0 && diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} hr ago`;
  return formatDateMDY(new Date(at), diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000);
}

document.addEventListener("admin:ready", (e) => {
  currentNotifUid = e.detail && e.detail.uid;
  loadNotifications();
});

async function loadNotifications() {
  try {
    const [notifications, readMap] = await Promise.all([
      computeStaffNotifications(),
      currentNotifUid ? getStaffNotifReadMap(currentNotifUid) : Promise.resolve({}),
    ]);
    currentNotifications = notifications;
    currentReadMap = readMap;
    renderNotifications(notifications, readMap);
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }
}

function renderNotifications(allNotifications, readMap) {
  document.querySelectorAll("#notifFilterGroup [data-count]").forEach((el) => {
    const cat = el.dataset.count;
    el.textContent = cat === "all" ? allNotifications.length : allNotifications.filter((n) => n.category === cat).length;
  });
  const notifications = notifFilter === "all" ? allNotifications : allNotifications.filter((n) => n.category === notifFilter);
  shownNotifications = notifications;
  if (notifications.length === 0) {
    notificationsList.innerHTML = "";
    notificationsEmpty.classList.remove("d-none");
    if (markAllNotifsReadBtn) markAllNotifsReadBtn.classList.add("d-none");
    return;
  }

  notificationsEmpty.classList.add("d-none");
  if (markAllNotifsReadBtn) markAllNotifsReadBtn.classList.remove("d-none");

  notificationsList.innerHTML = notifications
    .map((n) => {
      const isRead = isStaffNotifRead(readMap, n);
      const severityColor = SEVERITY_COLORS[n.severity] || SEVERITY_COLORS.info;
      const when = notifTimeLabel(n.at);
      return `
        <a href="${n.link}" class="d-flex justify-content-between align-items-center gap-3 p-3 admin-notif-row" data-key="${n.key}" data-signature="${n.signature}" style="text-decoration:none; color:inherit; border:1px solid var(--amson-border); border-left:4px solid ${severityColor}; background-color:#fff; border-radius:10px; ${isRead ? "opacity:0.6;" : ""}">
          <div class="d-flex align-items-center gap-3">
            ${isRead ? "" : '<span class="rounded-circle bg-primary flex-shrink-0" style="width:8px; height:8px; display:inline-block;"></span>'}
            <i class="bi ${n.icon}" style="font-size:1.2rem; color:${severityColor};"></i>
            <div>
              <div style="${isRead ? "" : "font-weight:600;"}">${escapeHtml(n.message)}</div>
              <div class="text-muted" style="font-size:0.78rem;">${escapeHtml(STAFF_NOTIF_CATEGORY_LABELS[n.category] || "")}${when ? ` · ${escapeHtml(when)}` : ""}</div>
            </div>
          </div>
          <span class="badge rounded-pill ${SEVERITY_CLASS[n.severity]}">${n.severity === "danger" ? "Urgent" : n.severity === "warning" ? "Warning" : "Info"}</span>
        </a>
      `;
    })
    .join("");

  notificationsList.querySelectorAll(".admin-notif-row").forEach((row) => {
    row.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const href = row.getAttribute("href");
      if (currentNotifUid) {
        try {
          await markStaffNotifRead(currentNotifUid, { key: row.dataset.key, signature: row.dataset.signature });
        } catch (error) {
          console.error("Failed to mark notification read:", error);
        }
      }
      window.location.href = href;
    });
  });
}

if (markAllNotifsReadBtn) {
  markAllNotifsReadBtn.addEventListener("click", async () => {
    if (!currentNotifUid || shownNotifications.length === 0) return;
    markAllNotifsReadBtn.disabled = true;
    try {
      // Only the ones in the current filter.
      await markAllStaffNotifsRead(currentNotifUid, shownNotifications);
      await loadNotifications();
      if (typeof refreshAdminNotifBell === "function") refreshAdminNotifBell(currentNotifUid);
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    } finally {
      markAllNotifsReadBtn.disabled = false;
    }
  });
}

// Desktop alerts: the browser asks the staff member once.
const enableBrowserAlertsBtn = document.getElementById("enableBrowserAlertsBtn");
if (enableBrowserAlertsBtn && typeof Notification !== "undefined" && Notification.permission === "default") {
  enableBrowserAlertsBtn.classList.remove("d-none");
  enableBrowserAlertsBtn.addEventListener("click", async () => {
    const result = await Notification.requestPermission();
    enableBrowserAlertsBtn.classList.add("d-none");
    if (result === "granted") showAppAlert("Desktop alerts are on. New alerts will pop up when you open any staff page.", { title: "Desktop Alerts" });
  });
}
