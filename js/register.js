/**
 * Register page logic: creates a Firebase Auth account + a matching
 * Firestore users/{uid} doc with role: "customer" (admin accounts are
 * created manually in Firebase, not through public registration).
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

// ---- Password visibility toggles (works for both password fields) ----
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

// ---- Live password length / match feedback ----
function updatePasswordMatchHint() {
  if (!confirmPasswordInput.value) {
    passwordMatchHint.classList.add("d-none");
    return;
  }
  passwordMatchHint.classList.remove("d-none");
  if (passwordInput.value === confirmPasswordInput.value) {
    passwordMatchHint.textContent = "✓ Passwords match";
    passwordMatchHint.classList.remove("text-danger");
    passwordMatchHint.classList.add("text-success");
  } else {
    passwordMatchHint.textContent = "✕ Passwords do not match";
    passwordMatchHint.classList.remove("text-success");
    passwordMatchHint.classList.add("text-danger");
  }
}

passwordInput.addEventListener("input", () => {
  const tooShort = passwordInput.value.length > 0 && passwordInput.value.length < 6;
  passwordHint.classList.toggle("d-none", !tooShort);
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
      return "Password should be at least 6 characters.";
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
