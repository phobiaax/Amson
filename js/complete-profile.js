/**
 * Complete Profile page - recovers an account whose users/{uid} doc never
 * got created (e.g. the write was interrupted or blocked right after
 * registration created the login).
 */

const completeProfileForm = document.getElementById("completeProfileForm");
const completeProfileAlert = document.getElementById("completeProfileAlert");
const completeProfileBtn = document.getElementById("completeProfileBtn");
const completeProfileBtnText = document.getElementById("completeProfileBtnText");
const completeProfileBtnSpinner = document.getElementById("completeProfileBtnSpinner");
const profileEmailDisplay = document.getElementById("profileEmailDisplay");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const contactNumberInput = document.getElementById("contactNumber");
const signOutLink = document.getElementById("signOutLink");

function showAlert(message) {
  completeProfileAlert.textContent = message;
  completeProfileAlert.classList.remove("d-none");
}

function hideAlert() {
  completeProfileAlert.classList.add("d-none");
}

function setLoading(isLoading) {
  completeProfileBtn.disabled = isLoading;
  completeProfileBtnText.classList.toggle("d-none", isLoading);
  completeProfileBtnSpinner.classList.toggle("d-none", !isLoading);
}

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (doc.exists) {
      // Profile already exists (e.g. they came back here by mistake) -
      // there's nothing to complete, so send them where they belong.
      window.location.href = "shop/index.html";
      return;
    }
  } catch (error) {
    // If we can't even check, let them try to submit anyway.
  }

  currentUser = user;
  profileEmailDisplay.textContent = user.email || "";
});

signOutLink.addEventListener("click", async (e) => {
  e.preventDefault();
  await auth.signOut();
  window.location.href = "login.html";
});

completeProfileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  if (!completeProfileForm.checkValidity()) {
    completeProfileForm.classList.add("was-validated");
    return;
  }

  if (!currentUser) {
    showAlert("Your session expired. Please log in again.");
    return;
  }

  setLoading(true);
  try {
    const otpCode = generateOtpCode();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("users").doc(currentUser.uid).set({
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      email: currentUser.email,
      contactNumber: contactNumberInput.value.trim(),
      role: "customer",
      emailVerified: false,
      emailVerificationCode: otpCode,
      emailVerificationExpiresAt: otpExpiresAt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await sendOtpEmail(currentUser.email, otpCode, firstNameInput.value.trim());
    sessionStorage.setItem("amsonPendingVerificationEmail", currentUser.email);
    window.location.href = "verify-email.html";
  } catch (error) {
    showAlert(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});
