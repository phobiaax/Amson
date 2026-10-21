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
  loginAlert.classList.replace("alert-success", "alert-danger");
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
  const docRef = db.collection("loginAttempts").doc(loginAttemptsDocId(email));
  const doc = await docRef.get();
  if (!doc.exists) return null;
  const lockedUntil = doc.data().lockedUntil;
  if (lockedUntil && lockedUntil > Date.now()) return lockedUntil;
  if (lockedUntil) {
    // Lockout period has passed - clear it so the next attempt gets a
    // fresh set of tries instead of instantly re-locking.
    await docRef.delete();
  }
  return null;
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
    window.location.href = `admin/${homePageForRole(userData.role)}`;
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
    // Unverified customers confirm their email first (that code also
    // recognizes this device). Everyone else on a new device gets a code.
    const needsEmailVerification = !STAFF_ROLES.includes(userData.role) && !userData.emailVerified;
    if (!needsEmailVerification && !isDeviceTrusted(userData)) {
      await startDeviceVerification(credential.user.uid, userData);
      return;
    }
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

// ---- Already signed in on arrival (e.g. "Remember me" from a previous
// visit, not a sign-in performLogin() just triggered below) - skip the
// login form and go straight to where they belong ----
let isInitialLoginAuthCheck = true;
auth.onAuthStateChanged(async (user) => {
  if (!isInitialLoginAuthCheck) return;
  isInitialLoginAuthCheck = false;
  if (!user) return;
  try {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists) return;
    const userData = doc.data();
    if (userData.accountStatus === "deactivated") return;
    const needsEmailVerification = !STAFF_ROLES.includes(userData.role) && !userData.emailVerified;
    if (!needsEmailVerification && !isDeviceTrusted(userData)) {
      // Signed in from before, but this device was never confirmed.
      await auth.signOut();
      return;
    }
    redirectByRole(userData);
  } catch (error) {}
});

// ---- New-device code (REQ005, REQ044) ----
const DEVICE_OTP_TTL_MS = 10 * 60 * 1000;
const DEVICE_OTP_MAX_TRIES = 5;
const deviceOtpPanel = document.getElementById("deviceOtpPanel");
const deviceOtpInput = document.getElementById("deviceOtpInput");
const deviceOtpVerifyBtn = document.getElementById("deviceOtpVerifyBtn");
const deviceOtpResendBtn = document.getElementById("deviceOtpResendBtn");
let deviceOtp = null; // { uid, userData, code, expiresAt, tries, lastSentAt }

async function sendDeviceCode() {
  deviceOtp.code = generateOtpCode();
  deviceOtp.expiresAt = Date.now() + DEVICE_OTP_TTL_MS;
  deviceOtp.tries = 0;
  deviceOtp.lastSentAt = Date.now();
  const sent = await sendOtpEmail(deviceOtp.userData.email, deviceOtp.code, deviceOtp.userData.firstName || "");
  if (!sent) throw new Error("We couldn't send the code right now. Please try again in a moment.");
}

async function startDeviceVerification(uid, userData) {
  try {
    sessionStorage.setItem(DEVICE_PENDING_KEY, uid);
  } catch (error) {}
  deviceOtp = { uid, userData };
  loginForm.classList.add("d-none");
  deviceOtpPanel.classList.remove("d-none");
  document.getElementById("deviceOtpEmail").textContent = userData.email || "your email";
  try {
    await sendDeviceCode();
    deviceOtpInput.focus();
  } catch (error) {
    showAlert(error.message);
  }
}

async function cancelDeviceVerification(message) {
  deviceOtp = null;
  try {
    sessionStorage.removeItem(DEVICE_PENDING_KEY);
  } catch (error) {}
  await auth.signOut();
  deviceOtpPanel.classList.add("d-none");
  loginForm.classList.remove("d-none");
  deviceOtpInput.value = "";
  passwordInput.value = "";
  if (typeof grecaptcha !== "undefined") grecaptcha.reset();
  if (message) showAlert(message);
  else hideAlert();
}

deviceOtpVerifyBtn.addEventListener("click", async () => {
  if (!deviceOtp) return;
  hideAlert();
  const entered = deviceOtpInput.value.trim();
  if (Date.now() > deviceOtp.expiresAt) {
    showAlert("This code has expired. Tap \"Resend code\" for a new one.");
    return;
  }
  if (entered !== deviceOtp.code) {
    deviceOtp.tries += 1;
    if (deviceOtp.tries >= DEVICE_OTP_MAX_TRIES) {
      await cancelDeviceVerification("Too many incorrect codes. Please log in again.");
      return;
    }
    showAlert(`Incorrect code. ${DEVICE_OTP_MAX_TRIES - deviceOtp.tries} tries left.`);
    return;
  }
  deviceOtpVerifyBtn.disabled = true;
  try {
    await trustThisDevice(deviceOtp.uid);
    redirectByRole(deviceOtp.userData);
  } catch (error) {
    showAlert("Something went wrong confirming this device. Please try again.");
    deviceOtpVerifyBtn.disabled = false;
  }
});

deviceOtpInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") deviceOtpVerifyBtn.click();
});

deviceOtpResendBtn.addEventListener("click", async () => {
  if (!deviceOtp) return;
  hideAlert();
  if (Date.now() - deviceOtp.lastSentAt < 60 * 1000) {
    showAlert("Please wait a minute before requesting another code.");
    return;
  }
  try {
    await sendDeviceCode();
    showAlert("A new code was sent.");
    loginAlert.classList.replace("alert-danger", "alert-success");
    setTimeout(() => loginAlert.classList.replace("alert-success", "alert-danger"), 4000);
  } catch (error) {
    showAlert(error.message);
  }
});

document.getElementById("deviceOtpCancelBtn").addEventListener("click", () => cancelDeviceVerification());

// Sent back here from another page (device not confirmed).
try {
  const notice = sessionStorage.getItem("amsonLoginNotice");
  if (notice) {
    sessionStorage.removeItem("amsonLoginNotice");
    showAlert(notice);
  }
  // Just finished registering (verify-email.js).
  const success = sessionStorage.getItem("amsonLoginSuccess");
  if (success) {
    sessionStorage.removeItem("amsonLoginSuccess");
    showAlert(success);
    loginAlert.classList.replace("alert-danger", "alert-success");
  }
  const registeredEmail = sessionStorage.getItem("amsonLoginEmail");
  if (registeredEmail) {
    sessionStorage.removeItem("amsonLoginEmail");
    emailInput.value = registeredEmail;
  }
} catch (error) {}

// ---- Login form submit ----
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!loginForm.checkValidity()) {
    loginForm.classList.add("was-validated");
    return;
  }
  performLogin(emailInput.value.trim(), passwordInput.value);
});

