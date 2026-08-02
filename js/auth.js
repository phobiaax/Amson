/**
 * Login page logic: Firebase Authentication + Firestore role lookup (RBAC).
 * Expects a Firestore collection "users" with one doc per uid:
 *   { role: "admin" | "customer", firstName, lastName, email, ... }
 */

// Demo admin account used by the "Log in as Admin (Demo Purposes)" button.
// Create this user in Firebase Authentication and give it a matching
// Firestore users/{uid} doc with role: "admin".
const DEMO_ADMIN_EMAIL = "admin@amson.ph";
const DEMO_ADMIN_PASSWORD = "AmsonAdmin123!";

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
const demoAdminBtn = document.getElementById("demoAdminBtn");

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

function redirectByRole(role) {
  if (role === "admin") {
    window.location.href = "admin/dashboard.html";
  } else {
    window.location.href = "shop/index.html";
  }
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

    redirectByRole(userDoc.data().role);
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

// ---- Demo admin quick login ----
demoAdminBtn.addEventListener("click", () => {
  emailInput.value = DEMO_ADMIN_EMAIL;
  passwordInput.value = DEMO_ADMIN_PASSWORD;
  showAlert(
    "Demo admin credentials filled in. Complete the reCAPTCHA and click Login."
  );
});

// ---- Forgot password ----
const resetEmailInput = document.getElementById("resetEmail");
const resetAlert = document.getElementById("resetAlert");
const sendResetBtn = document.getElementById("sendResetBtn");

sendResetBtn.addEventListener("click", async () => {
  const email = resetEmailInput.value.trim();
  resetAlert.classList.add("d-none");

  if (!email) {
    resetAlert.textContent = "Please enter your email address.";
    resetAlert.classList.remove("d-none", "alert-success");
    resetAlert.classList.add("alert-danger");
    return;
  }

  sendResetBtn.disabled = true;
  try {
    await auth.sendPasswordResetEmail(email);
    resetAlert.textContent = "Password reset link sent. Please check your inbox.";
    resetAlert.classList.remove("d-none", "alert-danger");
    resetAlert.classList.add("alert-success");
  } catch (error) {
    resetAlert.textContent = mapAuthError(error);
    resetAlert.classList.remove("d-none", "alert-success");
    resetAlert.classList.add("alert-danger");
  } finally {
    sendResetBtn.disabled = false;
  }
});
