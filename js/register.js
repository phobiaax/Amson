// register page

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

// ---- already logged in on arrival, skip the form ----
let isInitialAuthCheck = true;
auth.onAuthStateChanged((user) => {
  if (!isInitialAuthCheck) return;
  isInitialAuthCheck = false;
  if (user) window.location.href = "shop/index.html";
});

// ---- show/hide password ----
wirePasswordToggles();

// patterns come from validators.js so every form uses the same rules

// ---- live name / email / phone hints ----
function wireLiveHint(input, hint, pattern) {
  input.addEventListener("input", () => {
    const invalid = input.value.trim().length > 0 && !pattern.test(input.value.trim());
    hint.classList.toggle("d-none", !invalid);
  });
}

wireLiveHint(firstNameInput, firstNameHint, NAME_PATTERN);
wireLiveHint(lastNameInput, lastNameHint, NAME_PATTERN);

emailInput.addEventListener("input", () => {
  const value = emailInput.value.trim();
  const invalid = value.length > 0 && (!EMAIL_PATTERN.test(value) || isDisposableEmail(value));
  emailHint.textContent = isDisposableEmail(value)
    ? "Please use a permanent email address, not a temporary/disposable one."
    : "Enter a valid email address.";
  emailHint.classList.toggle("d-none", !invalid);
});

contactNumberInput.addEventListener("input", () => {
  const invalid =
    contactNumberInput.value.trim().length > 0 &&
    !PH_PHONE_PATTERN.test(normalizePhPhone(contactNumberInput.value));
  contactNumberHint.classList.toggle("d-none", !invalid);
});

// ---- live password hints ----
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
    // weak password already has its own red hint so stay quiet
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

// ---- helpers ----
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

// ---- register submit ----
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const problem = registerFormProblem();
  if (problem) {
    showAlert(problem);
    return;
  }

  setLoading(true);
  try {
    await createCustomerAccount();
  } catch (error) {
    showAlert(mapAuthError(error));
    if (typeof grecaptcha !== "undefined") grecaptcha.reset();
  } finally {
    setLoading(false);
  }
});

// first problem with the form, null if its all good
function registerFormProblem() {
  if (!registerForm.checkValidity()) {
    registerForm.classList.add("was-validated");
    const fieldsMissing = [...registerForm.elements].some((el) => el !== agreeTermsInput && el.willValidate && !el.checkValidity());
    if (fieldsMissing && !agreeTermsInput.checked) {
      return "Please fill in all the fields marked in red, and accept the Terms and Conditions and Privacy Policy.";
    }
    return fieldsMissing ? "Please fill in all the fields marked in red." : "Please agree to the Terms and Conditions and Privacy Policy.";
  }

  if (!NAME_PATTERN.test(firstNameInput.value.trim()) || !NAME_PATTERN.test(lastNameInput.value.trim())) {
    return "Use letters, spaces, periods (e.g. Ma. or Jr.) and dashes between letters (e.g. Anne-Marie).";
  }

  if (!EMAIL_PATTERN.test(emailInput.value.trim())) {
    return "Please enter a valid email address.";
  }

  if (isDisposableEmail(emailInput.value.trim())) {
    return "Please use a permanent email address, not a temporary/disposable one.";
  }

  if (!PH_PHONE_PATTERN.test(normalizePhPhone(contactNumberInput.value))) {
    return "Please enter a valid Philippine mobile number (e.g. 0917 123 4567).";
  }

  if (!PASSWORD_PATTERN.test(passwordInput.value)) {
    return "Password must be at least 6 characters, with letters, numbers, and a special character.";
  }

  if (passwordInput.value !== confirmPasswordInput.value) {
    return "Passwords do not match.";
  }

  if (!agreeTermsInput.checked) {
    return "Please agree to the Terms and Conditions and Privacy Policy.";
  }

  const recaptchaResponse =
    typeof grecaptcha !== "undefined" ? grecaptcha.getResponse() : "";
  if (!recaptchaResponse) {
    return "Please complete the reCAPTCHA verification.";
  }

  return null;
}

// makes the login and profile, emails the code, goes to the code page
async function createCustomerAccount() {
  const email = emailInput.value.trim().toLowerCase();
  const credential = await auth.createUserWithEmailAndPassword(
    email,
    passwordInput.value
  );

  const otpCode = generateOtpCode();
  const otpExpiresAt = Date.now() + OTP_CODE_TTL_MS;

  await db.collection("users").doc(credential.user.uid).set({
    firstName: firstNameInput.value.trim(),
    lastName: lastNameInput.value.trim(),
    email: email,
    contactNumber: normalizePhPhone(contactNumberInput.value),
    role: "customer",
    emailVerified: false,
    emailVerificationCode: otpCode,
    emailVerificationExpiresAt: otpExpiresAt,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // account exists already so go on even if the email failed
  let codeSent = false;
  try {
    codeSent = await sendOtpEmail(email, otpCode, firstNameInput.value.trim());
  } catch (error) {
    console.warn("Verification email not sent:", error);
  }
  if (!codeSent) sessionStorage.setItem("amsonOtpSendFailed", "1");
  sessionStorage.setItem("amsonPendingVerificationEmail", email);
  // new accounts go to login after the code
  sessionStorage.setItem("amsonFromRegistration", "1");
  window.location.href = "verify-email.html";
}
