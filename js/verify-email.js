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

const pendingEmail =
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
