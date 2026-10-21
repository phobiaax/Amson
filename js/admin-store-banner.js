/**
 * Store announcement / promotion banner (REQ008), edited in Settings by the
 * Branch Manager and Technical Staff, shown on every shop page.
 */

const storeBannerCard = document.getElementById("storeBannerCard");
const storeBannerRef = db.collection("storeSettings").doc("homeBanner");

document.addEventListener("admin:ready", async (e) => {
  const role = e.detail && e.detail.admin && e.detail.admin.role;
  if (!["admin", "branch_manager", "technical_staff"].includes(role)) return;
  storeBannerCard.classList.remove("d-none");
  try {
    const doc = await storeBannerRef.get();
    if (doc.exists) {
      const b = doc.data();
      document.getElementById("storeBannerActive").checked = !!b.active;
      document.getElementById("storeBannerKind").value = b.kind || "announcement";
      document.getElementById("storeBannerMessage").value = b.message || "";
    }
  } catch (error) {
    console.warn("Couldn't load the store announcement:", error);
  }
});

document.getElementById("saveStoreBannerBtn").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  const alertEl = document.getElementById("storeBannerAlert");
  const active = document.getElementById("storeBannerActive").checked;
  const kind = document.getElementById("storeBannerKind").value;
  const message = document.getElementById("storeBannerMessage").value.trim();
  alertEl.className = "alert auth-alert d-none mt-3 mb-0";
  if (active && !message) {
    alertEl.textContent = "Type the message to show, or turn the announcement off.";
    alertEl.className = "alert alert-danger auth-alert mt-3 mb-0";
    return;
  }
  btn.disabled = true;
  try {
    await storeBannerRef.set({ active, kind, message, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await logAuditEvent({ action: "Store Announcement Updated", details: active ? `${kind}: ${message}` : "Announcement turned off" });
    alertEl.textContent = active ? "Saved. It's now showing on the shop." : "Saved. The announcement is hidden.";
    alertEl.className = "alert alert-success auth-alert mt-3 mb-0";
  } catch (error) {
    alertEl.textContent = "Something went wrong saving the announcement. Please try again.";
    alertEl.className = "alert alert-danger auth-alert mt-3 mb-0";
  } finally {
    btn.disabled = false;
  }
});
