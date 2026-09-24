/**
 * Shared admin shell logic.
 */

const adminDateLabel = document.getElementById("adminDateLabel");
const adminProfileName = document.getElementById("adminProfileName");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

if (adminDateLabel) {
  adminDateLabel.textContent = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../login.html";
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || !STAFF_ROLES.includes(doc.data().role)) {
      window.location.href = "../shop/index.html";
      return;
    }

    const admin = doc.data();

    if (!roleCanAccessPage(admin.role, currentAdminPageName())) {
      await showAppAlert("You don't have access to that page.");
      window.location.href = "dashboard.html";
      return;
    }

    if (adminProfileName) {
      adminProfileName.textContent = `${admin.firstName} ${admin.lastName}`;
    }
    const roleLabel = document.querySelector(".admin-profile .role");
    if (roleLabel) {
      roleLabel.textContent = STAFF_ROLE_LABELS[admin.role] || admin.role;
    }

    document.querySelectorAll(".admin-nav-link").forEach((link) => {
      const pageName = link.getAttribute("href").split("/").pop();
      if (!roleCanAccessPage(admin.role, pageName)) {
        link.closest("li").classList.add("d-none");
      }
    });

    document.dispatchEvent(new CustomEvent("admin:ready", { detail: { uid: user.uid, admin } }));
    refreshAdminNotifBell(user.uid);
  } catch (error) {
    window.location.href = "../login.html";
  }
});

// ---- Notification bell (topbar) + unread badge (sidebar) - built once
// here so every admin page gets it without needing its own markup or
// script include. See products-data.js's computeStaffNotifications /
// getStaffNotifReadMap / markStaffNotifRead for how unread is determined. ----
function ensureAdminNotifBell() {
  let bellBtn = document.getElementById("adminNotifBellBtn");
  if (bellBtn) return bellBtn;

  const profileBar = document.querySelector(".admin-topbar .admin-profile");
  if (!profileBar) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "dropdown";
  wrapper.innerHTML = `
    <button type="button" class="admin-logout-btn position-relative" id="adminNotifBellBtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications">
      <i class="bi bi-bell"></i>
      <span class="badge rounded-pill bg-danger position-absolute d-none" id="adminNotifBadge" style="top:-6px; right:-8px; font-size:0.6rem; padding:0.25em 0.4em;">0</span>
    </button>
    <ul class="dropdown-menu dropdown-menu-end p-2" id="adminNotifDropdownList" style="min-width:320px; max-height:70vh; overflow-y:auto;">
      <li class="dropdown-item text-muted text-center py-3" id="adminNotifEmptyState">No notifications</li>
    </ul>
  `;

  const settingsLink = profileBar.querySelector('a[href="settings.html"]');
  profileBar.insertBefore(wrapper, settingsLink || null);
  return document.getElementById("adminNotifBellBtn");
}

async function refreshAdminNotifBell(uid) {
  if (typeof computeStaffNotifications !== "function") return;
  if (!ensureAdminNotifBell()) return;

  try {
    const [notifications, readMap] = await Promise.all([computeStaffNotifications(), getStaffNotifReadMap(uid)]);
    const unread = notifications.filter((n) => !isStaffNotifRead(readMap, n));

    const badge = document.getElementById("adminNotifBadge");
    if (badge) {
      if (unread.length > 0) {
        badge.textContent = unread.length > 9 ? "9+" : String(unread.length);
        badge.classList.remove("d-none");
      } else {
        badge.classList.add("d-none");
      }
    }

    const sidebarLink = document.querySelector('.admin-nav-link[href="notifications.html"]');
    if (sidebarLink) {
      let sidebarBadge = sidebarLink.querySelector(".badge-count");
      if (!sidebarBadge) {
        sidebarBadge = document.createElement("span");
        sidebarBadge.className = "badge-count";
        sidebarLink.appendChild(sidebarBadge);
      }
      if (unread.length > 0) {
        sidebarBadge.textContent = unread.length > 9 ? "9+" : String(unread.length);
        sidebarBadge.classList.remove("d-none");
      } else {
        sidebarBadge.classList.add("d-none");
      }
    }

    const list = document.getElementById("adminNotifDropdownList");
    if (list) {
      const top = notifications.slice(0, 6);
      if (top.length === 0) {
        list.innerHTML = `<li class="dropdown-item text-muted text-center py-3" id="adminNotifEmptyState">No notifications</li>`;
      } else {
        list.innerHTML =
          top
            .map((n) => {
              const isRead = isStaffNotifRead(readMap, n);
              return `
                <li>
                  <a class="dropdown-item d-flex align-items-start gap-2 py-2 admin-notif-item" href="${n.link}" data-key="${n.key}" data-signature="${n.signature}" style="white-space:normal; ${isRead ? "opacity:0.6;" : "font-weight:600;"}">
                    <i class="bi ${n.icon} mt-1"></i>
                    <span class="flex-grow-1" style="font-size:0.85rem;">${n.message}</span>
                  </a>
                </li>
              `;
            })
            .join("") +
          `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item text-center small" href="notifications.html">View all notifications</a></li>`;
      }

      list.querySelectorAll(".admin-notif-item").forEach((item) => {
        item.addEventListener("click", async (ev) => {
          ev.preventDefault();
          const href = item.getAttribute("href");
          try {
            await markStaffNotifRead(uid, { key: item.dataset.key, signature: item.dataset.signature });
          } catch (error) {
            console.error("Failed to mark notification read:", error);
          }
          window.location.href = href;
        });
      });
    }
  } catch (error) {
    console.error("Failed to load admin notification bell:", error);
  }
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "../login.html";
  });
}
