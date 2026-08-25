/**
 * Register page logic.
 */

const registerForm = document.getElementById("registerForm");
const registerAlert = document.getElementById("registerAlert");
const registerBtn = document.getElementById("registerBtn");
const registerBtnText = document.getElementById("registerBtnText");
const registerBtnSpinner = document.getElementById("registerBtnSpinner");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const contactNumberInput = document.getElementById("contactNumber");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const agreeTermsInput = document.getElementById("agreeTerms");
const passwordHint = document.getElementById("passwordHint");
const passwordMatchHint = document.getElementById("passwordMatchHint");
const firstNameHint = document.getElementById("firstNameHint");
const lastNameHint = document.getElementById("lastNameHint");
const emailHint = document.getElementById("emailHint");
const contactNumberHint = document.getElementById("contactNumberHint");

// ---- Already signed in (on arrival, not from our own sign-up below) -
// skip the registration form ----
let isInitialAuthCheck = true;
auth.onAuthStateChanged((user) => {
  if (!isInitialAuthCheck) return;
  isInitialAuthCheck = false;
  if (user) window.location.href = "shop/index.html";
});

// ---- Password visibility toggles ----
document.querySelectorAll(".toggle-password").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    const icon = btn.querySelector("i");
    const isHidden = target.type === "password";
    target.type = isHidden ? "text" : "password";
    icon.classList.toggle("bi-eye");
    icon.classList.toggle("bi-eye-slash");
  });
});

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ\s\-']+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PH_PHONE_PATTERN = /^(\+63|0)9\d{9}$/;

function normalizePhPhone(value) {
  return value.trim().replace(/[\s-]/g, "");
}

// ---- Live name / email / phone feedback ----
function wireLiveHint(input, hint, pattern) {
  input.addEventListener("input", () => {
    const invalid = input.value.trim().length > 0 && !pattern.test(input.value.trim());
    hint.classList.toggle("d-none", !invalid);
  });
}

wireLiveHint(firstNameInput, firstNameHint, NAME_PATTERN);
wireLiveHint(lastNameInput, lastNameHint, NAME_PATTERN);
wireLiveHint(emailInput, emailHint, EMAIL_PATTERN);

contactNumberInput.addEventListener("input", () => {
  const invalid =
    contactNumberInput.value.trim().length > 0 &&
    !PH_PHONE_PATTERN.test(normalizePhPhone(contactNumberInput.value));
  contactNumberHint.classList.toggle("d-none", !invalid);
});

// ---- Live password length / match feedback ----
function updatePasswordMatchHint() {
  if (!confirmPasswordInput.value) {
    passwordMatchHint.classList.add("d-none");
    return;
  }
  if (passwordInput.value !== confirmPasswordInput.value) {
    passwordMatchHint.classList.remove("d-none");
    passwordMatchHint.textContent = "✕ Passwords do not match";
    passwordMatchHint.classList.remove("text-success");
    passwordMatchHint.classList.add("text-danger");
  } else if (!PASSWORD_PATTERN.test(passwordInput.value)) {
    // Passwords match but the password itself is still too weak to submit -
    // the red passwordHint above already explains why, so stay quiet here
    // instead of claiming a false "match" success.
    passwordMatchHint.classList.add("d-none");
  } else {
    passwordMatchHint.classList.remove("d-none");
    passwordMatchHint.textContent = "✓ Passwords match";
    passwordMatchHint.classList.remove("text-danger");
    passwordMatchHint.classList.add("text-success");
  }
}

passwordInput.addEventListener("input", () => {
  const invalid = passwordInput.value.length > 0 && !PASSWORD_PATTERN.test(passwordInput.value);
  passwordHint.classList.toggle("d-none", !invalid);
  updatePasswordMatchHint();
});

confirmPasswordInput.addEventListener("input", updatePasswordMatchHint);

// ---- Helpers ----
function showAlert(message) {
  registerAlert.textContent = message;
  registerAlert.classList.remove("d-none");
}

function hideAlert() {
  registerAlert.classList.add("d-none");
}

function setLoading(isLoading) {
  registerBtn.disabled = isLoading;
  registerBtnText.classList.toggle("d-none", isLoading);
  registerBtnSpinner.classList.toggle("d-none", !isLoading);
}

function mapAuthError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters, with letters, numbers, and a special character.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

// ---- Register form submit ----
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  if (!registerForm.checkValidity()) {
    registerForm.classList.add("was-validated");
    return;
  }

  if (!NAME_PATTERN.test(firstNameInput.value.trim()) || !NAME_PATTERN.test(lastNameInput.value.trim())) {
    showAlert("Names can only contain letters.");
    return;
  }

  if (!EMAIL_PATTERN.test(emailInput.value.trim())) {
    showAlert("Please enter a valid email address.");
    return;
  }

  if (!PH_PHONE_PATTERN.test(normalizePhPhone(contactNumberInput.value))) {
    showAlert("Please enter a valid Philippine mobile number (e.g. 0917 123 4567).");
    return;
  }

  if (!PASSWORD_PATTERN.test(passwordInput.value)) {
    showAlert("Password must be at least 6 characters, with letters, numbers, and a special character.");
    return;
  }

  if (passwordInput.value !== confirmPasswordInput.value) {
    showAlert("Passwords do not match.");
    return;
  }

  if (!agreeTermsInput.checked) {
    showAlert("Please agree to the Terms and Conditions and Privacy Policy.");
    return;
  }

  const recaptchaResponse =
    typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
  if (!recaptchaResponse) {
    showAlert("Please complete the reCAPTCHA verification.");
    return;
  }

  setLoading(true);
  try {
    const email = emailInput.value.trim();
    const credential = await auth.createUserWithEmailAndPassword(
      email,
      passwordInput.value
    );

    const otpCode = generateOtpCode();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000;

    await db.collection("users").doc(credential.user.uid).set({
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      email: email,
      contactNumber: contactNumberInput.value.trim(),
      role: "customer",
      emailVerified: false,
      emailVerificationCode: otpCode,
      emailVerificationExpiresAt: otpExpiresAt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await sendOtpEmail(email, otpCode, firstNameInput.value.trim());
    sessionStorage.setItem("amsonPendingVerificationEmail", email);
    window.location.href = "verify-email.html";
  } catch (error) {
    showAlert(mapAuthError(error));
    if (typeof grecaptcha !== "undefined") grecaptcha.reset();
  } finally {
    setLoading(false);
  }
});
