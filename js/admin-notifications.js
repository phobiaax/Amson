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
    renderNotifications(notifications, readMap);
  } catch (error) {
    console.error("Failed to load notifications:", error);
  }
}

function renderNotifications(notifications, readMap) {
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
      return `
        <a href="${n.link}" class="d-flex justify-content-between align-items-center gap-3 p-3 admin-notif-row" data-key="${n.key}" data-signature="${n.signature}" style="text-decoration:none; color:inherit; border:1px solid var(--amson-border); border-radius:10px; ${isRead ? "opacity:0.65;" : "background-color:rgba(13,110,253,0.06);"}">
          <div class="d-flex align-items-center gap-3">
            ${isRead ? "" : '<span class="rounded-circle bg-primary flex-shrink-0" style="width:8px; height:8px; display:inline-block;"></span>'}
            <i class="bi ${n.icon}" style="font-size:1.2rem;"></i>
            <span style="${isRead ? "" : "font-weight:600;"}">${n.message}</span>
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
    if (!currentNotifUid || currentNotifications.length === 0) return;
    markAllNotifsReadBtn.disabled = true;
    try {
      await markAllStaffNotifsRead(currentNotifUid, currentNotifications);
      await loadNotifications();
      if (typeof refreshAdminNotifBell === "function") refreshAdminNotifBell(currentNotifUid);
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    } finally {
      markAllNotifsReadBtn.disabled = false;
    }
  });
}
