/**
 * Standalone "Reset Your Password" page: sends a Firebase password reset
 * email to the address entered.
 */

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const resetAlert = document.getElementById("resetAlert");
const resetBtn = document.getElementById("resetBtn");
const resetBtnText = document.getElementById("resetBtnText");
const resetBtnSpinner = document.getElementById("resetBtnSpinner");
const emailInput = document.getElementById("email");

function showAlert(message, type = "danger") {
  resetAlert.textContent = message;
  resetAlert.className = `alert alert-${type} auth-alert text-start`;
}

function hideAlert() {
  resetAlert.classList.add("d-none");
}

function setLoading(isLoading) {
  resetBtn.disabled = isLoading;
  resetBtnText.classList.toggle("d-none", isLoading);
  resetBtnSpinner.classList.toggle("d-none", !isLoading);
}

function mapAuthError(error) {
  switch (error.code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with that email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

forgotPasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  if (!forgotPasswordForm.checkValidity()) {
    forgotPasswordForm.classList.add("was-validated");
    return;
  }

  setLoading(true);
  try {
    await auth.sendPasswordResetEmail(emailInput.value.trim());
    showAlert(
      "Password reset link sent. Please check your inbox.",
      "success"
    );
    forgotPasswordForm.reset();
  } catch (error) {
    showAlert(mapAuthError(error));
  } finally {
    setLoading(false);
  }
});
