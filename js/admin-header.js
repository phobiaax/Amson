/**
 * Shared admin shell logic (reusable across future admin pages, not just
 * the dashboard): enforces that only a signed-in user with a staff role
 * can view the admin side - anyone else gets redirected - and further
 * restricts which admin pages each staff role can open (see
 * ADMIN_PAGE_ACCESS in admin-roles.js). Populates the top bar's date,
 * profile name and role, and hides sidebar links the current role can't
 * use. Fires an "admin:ready" event once the check passes, carrying the
 * admin's Firestore doc, so page-specific scripts can safely load their
 * own data after this.
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
      alert("You don't have access to that page.");
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
  } catch (error) {
    window.location.href = "../login.html";
  }
});

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "../login.html";
  });
}
