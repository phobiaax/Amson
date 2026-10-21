/**
 * Settings admin page.
 */

let currentAdminUid = null;

const settingsFirstNameInput = document.getElementById("settingsFirstNameInput");
const settingsLastNameInput = document.getElementById("settingsLastNameInput");
const settingsContactNumberInput = document.getElementById("settingsContactNumberInput");
const settingsEmailInput = document.getElementById("settingsEmailInput");
const profileAlert = document.getElementById("profileAlert");
const profileSuccess = document.getElementById("profileSuccess");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");
const passwordAlert = document.getElementById("passwordAlert");
const passwordSuccess = document.getElementById("passwordSuccess");
const updatePasswordBtn = document.getElementById("updatePasswordBtn");

document.addEventListener("admin:ready", (e) => {
  currentAdminUid = e.detail.uid;
  const admin = e.detail.admin;
  settingsFirstNameInput.value = admin.firstName || "";
  settingsLastNameInput.value = admin.lastName || "";
  settingsContactNumberInput.value = admin.contactNumber || "";
  settingsEmailInput.value = admin.email || "";
  // Email Test: Branch Manager and Technical Staff.
  if (["admin", "branch_manager", "technical_staff"].includes(admin.role)) {
    document.getElementById("emailTestCard").classList.remove("d-none");
    document.getElementById("emailTestAddress").value = admin.email || "";
  }
});

// ---- Email Test: sends one sample order email and shows EmailJS's reply ----
document.getElementById("emailTestBtn").addEventListener("click", async () => {
  const btn = document.getElementById("emailTestBtn");
  const alertEl = document.getElementById("emailTestAlert");
  const to = document.getElementById("emailTestAddress").value.trim();
  const show = (ok, text) => {
    alertEl.className = `alert auth-alert mt-3 mb-0 ${ok ? "alert-success" : "alert-danger"}`;
    alertEl.textContent = text;
  };
  if (!to) return show(false, "Enter an email address first.");
  if (typeof emailjs === "undefined") return show(false, "EmailJS didn't load on this page (check the internet connection or an ad blocker), so no email can be sent.");
  btn.disabled = true;
  try {
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
      to_email: to,
      to_name: "Test",
      subject: "Test email from Amson Pharmaceuticals",
      message: "If you can read this, order emails are working.",
      link: new URL("../shop/orders.html", window.location.href).href,
    });
    show(true, `EmailJS accepted it (${result.status} ${result.text}). Check ${to}, including the Spam and Promotions folders. If it's not there in a few minutes, open EmailJS → Email History.`);
  } catch (error) {
    const reply = error && (error.text || error.message) ? `${error.status || ""} ${error.text || error.message}`.trim() : String(error);
    show(
      false,
      `EmailJS refused it: ${reply}\n\nCommon causes: the order template's "To Email" isn't {{to_email}}; the template or service ID is wrong; the monthly email limit is used up; or the Gmail/Outlook service in EmailJS needs reconnecting.`
    );
  } finally {
    btn.disabled = false;
  }
});

saveProfileBtn.addEventListener("click", async () => {
  const firstName = settingsFirstNameInput.value.trim();
  const lastName = settingsLastNameInput.value.trim();

  profileAlert.classList.add("d-none");
  profileSuccess.classList.add("d-none");

  if (!firstName || !lastName) {
    profileAlert.textContent = "First and last name are required.";
    profileAlert.classList.remove("d-none");
    return;
  }
  if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
    profileAlert.textContent = "Use letters, spaces, periods (e.g. Ma. or Jr.) and dashes between letters (e.g. Anne-Marie).";
    profileAlert.classList.remove("d-none");
    return;
  }
  const contactNumber = normalizePhPhone(settingsContactNumberInput.value);
  if (contactNumber && !PH_PHONE_PATTERN.test(contactNumber)) {
    profileAlert.textContent = "Please enter a valid Philippine mobile number (e.g. 0917 123 4567).";
    profileAlert.classList.remove("d-none");
    return;
  }

  saveProfileBtn.disabled = true;
  try {
    await db.collection("users").doc(currentAdminUid).update({
      firstName,
      lastName,
      contactNumber,
    });
    profileSuccess.textContent = "Profile updated.";
    profileSuccess.classList.remove("d-none");
    if (adminProfileName) adminProfileName.textContent = `${firstName} ${lastName}`;
  } catch (error) {
    profileAlert.textContent = "Something went wrong saving your profile. Please try again.";
    profileAlert.classList.remove("d-none");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

updatePasswordBtn.addEventListener("click", async () => {
  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmNewPassword = confirmNewPasswordInput.value;

  passwordAlert.classList.add("d-none");
  passwordSuccess.classList.add("d-none");

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    passwordAlert.textContent = "Please fill in all password fields.";
    passwordAlert.classList.remove("d-none");
    return;
  }
  if (!PASSWORD_PATTERN.test(newPassword)) {
    passwordAlert.textContent = "Password must be at least 6 characters, with letters, numbers, and a special character.";
    passwordAlert.classList.remove("d-none");
    return;
  }
  if (newPassword !== confirmNewPassword) {
    passwordAlert.textContent = "New password and confirmation don't match.";
    passwordAlert.classList.remove("d-none");
    return;
  }

  updatePasswordBtn.disabled = true;
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);

    passwordSuccess.textContent = "Password updated.";
    passwordSuccess.classList.remove("d-none");
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
    confirmNewPasswordInput.value = "";
  } catch (error) {
    passwordAlert.textContent =
      error.code === "auth/wrong-password" || error.code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : "Something went wrong updating your password. Please try again.";
    passwordAlert.classList.remove("d-none");
  } finally {
    updatePasswordBtn.disabled = false;
  }
});
