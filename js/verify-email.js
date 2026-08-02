/**
 * Email verification page: checks the 6-digit code the user enters against
 * the emailVerificationCode stored on their Firestore users/{uid} doc by
 * register.js (or regenerated here via "Resend").
 */

const verifyEmailDisplay = document.getElementById("verifyEmailDisplay");
const verifyForm = document.getElementById("verifyForm");
const verifyAlert = document.getElementById("verifyAlert");
const verifyBtn = document.getElementById("verifyBtn");
const verifyBtnText = document.getElementById("verifyBtnText");
const verifyBtnSpinner = document.getElementById("verifyBtnSpinner");
const resendCodeLink = document.getElementById("resendCodeLink");
const otpInputs = Array.from(document.querySelectorAll(".otp-input"));

const changeEmailBtn = document.getElementById("changeEmailBtn");
const changeEmailForm = document.getElementById("changeEmailForm");
const newEmailInput = document.getElementById("newEmailInput");
const cancelChangeEmailBtn = document.getElementById("cancelChangeEmailBtn");
const confirmChangeEmailBtn = document.getElementById("confirmChangeEmailBtn");
const confirmChangeEmailText = document.getElementById("confirmChangeEmailText");
const confirmChangeEmailSpinner = document.getElementById("confirmChangeEmailSpinner");

let pendingEmail =
  sessionStorage.getItem("amsonPendingVerificationEmail") ||
  new URLSearchParams(window.location.search).get("email") ||
  "";
verifyEmailDisplay.textContent = pendingEmail || "your email";

function showAlert(message, type = "danger") {
  verifyAlert.textContent = message;
  verifyAlert.className = `alert alert-${type} auth-alert`;
}

function hideAlert() {
  verifyAlert.classList.add("d-none");
}

function setLoading(isLoading) {
  verifyBtn.disabled = isLoading;
  verifyBtnText.classList.toggle("d-none", isLoading);
  verifyBtnSpinner.classList.toggle("d-none", !isLoading);
}

// ---- OTP box behavior: digits only, auto-advance, backspace, paste ----
otpInputs.forEach((input, idx) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/[^0-9]/g, "").slice(0, 1);
    if (input.value && idx < otpInputs.length - 1) {
      otpInputs[idx + 1].focus();
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !input.value && idx > 0) {
      otpInputs[idx - 1].focus();
    }
  });

  input.addEventListener("paste", (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/[^0-9]/g, "");
    if (!text) return;
    e.preventDefault();
    text
      .slice(0, otpInputs.length)
      .split("")
      .forEach((char, i) => {
        otpInputs[i].value = char;
      });
    otpInputs[Math.min(text.length, otpInputs.length) - 1].focus();
  });
});

async function verifyCode(enteredCode) {
  hideAlert();

  const user = auth.currentUser;
  if (!user) {
    showAlert("Your session expired. Please log in again to get a new code.");
    return;
  }

  setLoading(true);
  try {
    const docRef = db.collection("users").doc(user.uid);
    const doc = await docRef.get();
    const data = doc.data();

    if (!data || !data.emailVerificationCode) {
      showAlert("No pending verification code found. Request a new one below.");
      return;
    }
    if (Date.now() > data.emailVerificationExpiresAt) {
      showAlert("This code has expired. Request a new one below.");
      return;
    }
    if (enteredCode !== data.emailVerificationCode) {
      showAlert("Incorrect code. Please try again.");
      return;
    }

    await docRef.update({
      emailVerified: true,
      emailVerificationCode: firebase.firestore.FieldValue.delete(),
      emailVerificationExpiresAt: firebase.firestore.FieldValue.delete(),
    });

    sessionStorage.removeItem("amsonPendingVerificationEmail");
    window.location.href = "shop/index.html";
  } catch (error) {
    showAlert(error.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

verifyForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = otpInputs.map((input) => input.value).join("");
  if (code.length !== 6) {
    showAlert("Please enter the full 6-digit code.");
    return;
  }
  verifyCode(code);
});

resendCodeLink.addEventListener("click", async (e) => {
  e.preventDefault();
  hideAlert();

  const user = auth.currentUser;
  if (!user) {
    showAlert("Your session expired. Please log in again.");
    return;
  }

  const code = generateOtpCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  try {
    await db.collection("users").doc(user.uid).update({
      emailVerificationCode: code,
      emailVerificationExpiresAt: expiresAt,
    });
    await sendOtpEmail(pendingEmail || user.email, code);
    showAlert("A new code has been sent.", "success");
  } catch (error) {
    showAlert(error.message || "Could not resend the code.");
  }
});

// ---- Change email address ----
function mapChangeEmailError(error) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email is already in use by another account.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/requires-recent-login":
      return "For security, please log in again before changing your email.";
    default:
      return error.message || "Could not update email. Please try again.";
  }
}

changeEmailBtn.addEventListener("click", () => {
  newEmailInput.value = pendingEmail;
  changeEmailForm.classList.remove("d-none");
  changeEmailBtn.classList.add("d-none");
});

cancelChangeEmailBtn.addEventListener("click", () => {
  changeEmailForm.classList.add("d-none");
  changeEmailBtn.classList.remove("d-none");
});

confirmChangeEmailBtn.addEventListener("click", async () => {
  hideAlert();
  const newEmail = newEmailInput.value.trim();

  if (!newEmail) {
    showAlert("Please enter a new email address.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    showAlert("Your session expired. Please register again.");
    return;
  }

  confirmChangeEmailBtn.disabled = true;
  confirmChangeEmailText.classList.add("d-none");
  confirmChangeEmailSpinner.classList.remove("d-none");

  try {
    await user.updateEmail(newEmail);

    const code = generateOtpCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await db.collection("users").doc(user.uid).update({
      email: newEmail,
      emailVerificationCode: code,
      emailVerificationExpiresAt: expiresAt,
    });
    await sendOtpEmail(newEmail, code);

    pendingEmail = newEmail;
    sessionStorage.setItem("amsonPendingVerificationEmail", newEmail);
    verifyEmailDisplay.textContent = newEmail;
    changeEmailForm.classList.add("d-none");
    changeEmailBtn.classList.remove("d-none");
    otpInputs.forEach((input) => (input.value = ""));
    otpInputs[0].focus();
    showAlert("Email updated. A new code has been sent.", "success");
  } catch (error) {
    showAlert(mapChangeEmailError(error));
  } finally {
    confirmChangeEmailBtn.disabled = false;
    confirmChangeEmailText.classList.remove("d-none");
    confirmChangeEmailSpinner.classList.add("d-none");
  }
});
