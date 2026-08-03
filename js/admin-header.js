/**
 * Shared admin shell logic (reusable across future admin pages, not just
 * the dashboard): enforces that only a signed-in user with role "admin"
 * can view the page — anyone else gets redirected — and populates the
 * top bar's date and profile info. Fires an "admin:ready" event once the
 * check passes, carrying the admin's Firestore doc, so page-specific
 * scripts can safely load their own data after this.
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
    if (!doc.exists || doc.data().role !== "admin") {
      window.location.href = "../shop/index.html";
      return;
    }

    const admin = doc.data();
    if (adminProfileName) {
      adminProfileName.textContent = `${admin.firstName} ${admin.lastName}`;
    }
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
