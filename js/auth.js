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

const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_MS = 2 * 60 * 1000;

function loginAttemptsDocId(email) {
  return email.trim().toLowerCase();
}

async function checkLoginLockout(email) {
  const doc = await db.collection("loginAttempts").doc(loginAttemptsDocId(email)).get();
  if (!doc.exists) return null;
  const lockedUntil = doc.data().lockedUntil;
  return lockedUntil && lockedUntil > Date.now() ? lockedUntil : null;
}

async function recordFailedLogin(email) {
  const docRef = db.collection("loginAttempts").doc(loginAttemptsDocId(email));
  const doc = await docRef.get();
  const count = (doc.exists ? doc.data().count : 0) + 1;
  const update = { count };
  if (count >= LOGIN_LOCKOUT_THRESHOLD) {
    update.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  }
  await docRef.set(update, { merge: true });
  return update.lockedUntil || null;
}

async function clearLoginAttempts(email) {
  await db.collection("loginAttempts").doc(loginAttemptsDocId(email)).delete();
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
    const lockedUntil = await checkLoginLockout(email);
    if (lockedUntil) {
      const secondsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
      showAlert(`Too many failed attempts. Please try again in ${secondsLeft} seconds.`);
      return;
    }

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

    await clearLoginAttempts(email);
    redirectByRole(userData);
  } catch (error) {
    if (["auth/wrong-password", "auth/user-not-found", "auth/invalid-credential"].includes(error.code)) {
      const newLockedUntil = await recordFailedLogin(email);
      if (newLockedUntil) {
        showAlert("Too many failed attempts. Your account is locked for 2 minutes.");
      } else {
        showAlert(mapAuthError(error));
      }
    } else {
      showAlert(mapAuthError(error));
    }
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

