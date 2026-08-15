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
