/**
 * Shared header behavior for storefront pages: shows Login/Register for
 * guests, or the account dropdown (with first name) for signed-in
 * customers, using Firebase Auth state + the Firestore users/{uid} doc.
 */

const guestActions = document.getElementById("guestActions");
const accountActions = document.getElementById("accountActions");
const accountFirstName = document.getElementById("accountFirstName");
const logoutLink = document.getElementById("logoutLink");

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
  } catch (error) {
    guestActions.classList.remove("d-none");
    accountActions.classList.add("d-none");
  }
});

logoutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "../login.html";
});
