/**
 * Login page logic.
 */

const loginForm = document.getElementById("loginForm");
const loginAlert = document.getElementById("loginAlert");
const loginBtn = document.getElementById("loginBtn");
const loginBtnText = document.getElementById("loginBtnText");
const loginBtnSpinner = document.getElementById("loginBtnSpinner");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberMeInput = document.getElementById("rememberMe");
const togglePasswordBtn = document.querySelector(".toggle-password");
const togglePasswordIcon = document.getElementById("togglePasswordIcon");

// ---- Password visibility toggle ----
togglePasswordBtn.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePasswordIcon.classList.toggle("bi-eye");
  togglePasswordIcon.classList.toggle("bi-eye-slash");
});

// ---- Helpers ----
function showAlert(message) {
  loginAlert.textContent = message;
  loginAlert.classList.remove("d-none");
}

function hideAlert() {
  loginAlert.classList.add("d-none");
}

function setLoading(isLoading) {
  loginBtn.disabled = isLoading;
  loginBtnText.classList.toggle("d-none", isLoading);
  loginBtnSpinner.classList.toggle("d-none", !isLoading);
}

function mapAuthError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

function redirectByRole(userData) {
  if (STAFF_ROLES.includes(userData.role)) {
    window.location.href = "admin/dashboard.html";
    return;
  }
  if (!userData.emailVerified) {
    sessionStorage.setItem("amsonPendingVerificationEmail", userData.email || "");
    window.location.href = "verify-email.html";
    return;
  }
  window.location.href = "shop/index.html";
}

async function performLogin(email, password) {
  hideAlert();

  const recaptchaResponse =
    typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
  if (!recaptchaResponse) {
    showAlert("Please complete the reCAPTCHA verification.");
    return;
  }

  setLoading(true);
  try {
    await auth.setPersistence(
      rememberMeInput.checked
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION
    );

    const credential = await auth.signInWithEmailAndPassword(email, password);
    const userDoc = await db.collection("users").doc(credential.user.uid).get();

    if (!userDoc.exists) {
      await auth.signOut();
      showAlert("No account profile found. Please contact support.");
      return;
    }

    const userData = userDoc.data();
    if (userData.accountStatus === "deactivated") {
      await auth.signOut();
      showAlert("Your account has been deactivated. Please contact support.");
      return;
    }

    redirectByRole(userData);
  } catch (error) {
    showAlert(mapAuthError(error));
    if (typeof grecaptcha !== "undefined") grecaptcha.reset();
  } finally {
    setLoading(false);
  }
}

// ---- Login form submit ----
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.classList.add("was-validated");
    return;
  }
  performLogin(emailInput.value.trim(), passwordInput.value);
});

