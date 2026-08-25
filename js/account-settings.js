/**
 * Customer Account Settings page.
 */

let signedInUid = null;

const settingsSignedOutNotice = document.getElementById("settingsSignedOutNotice");
const settingsContent = document.getElementById("settingsContent");

const firstNameInput = document.getElementById("firstNameInput");
const lastNameInput = document.getElementById("lastNameInput");
const contactNumberInput = document.getElementById("contactNumberInput");
const accountEmailInput = document.getElementById("accountEmailInput");
const profileAlert = document.getElementById("profileAlert");
const profileSuccess = document.getElementById("profileSuccess");
const saveProfileBtn = document.getElementById("saveProfileBtn");

const streetAddressInput = document.getElementById("streetAddressInput");
const cityInput = document.getElementById("cityInput");
const provinceInput = document.getElementById("provinceInput");
const zipCodeInput = document.getElementById("zipCodeInput");
const deliveryNotesInput = document.getElementById("deliveryNotesInput");
const addressAlert = document.getElementById("addressAlert");
const addressSuccess = document.getElementById("addressSuccess");
const saveAddressBtn = document.getElementById("saveAddressBtn");

const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");
const passwordAlert = document.getElementById("passwordAlert");
const passwordSuccess = document.getElementById("passwordSuccess");
const updatePasswordBtn = document.getElementById("updatePasswordBtn");

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

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    settingsSignedOutNotice.classList.remove("d-none");
    settingsContent.classList.add("d-none");
    return;
  }

  signedInUid = user.uid;
  settingsSignedOutNotice.classList.add("d-none");
  settingsContent.classList.remove("d-none");

  try {
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.exists ? doc.data() : {};

    firstNameInput.value = data.firstName || "";
    lastNameInput.value = data.lastName || "";
    contactNumberInput.value = data.contactNumber || "";
    accountEmailInput.value = data.email || "";

    if (data.shippingAddress) {
      streetAddressInput.value = data.shippingAddress.streetAddress || "";
      cityInput.value = data.shippingAddress.city || "";
      provinceInput.value = data.shippingAddress.province || "";
      zipCodeInput.value = data.shippingAddress.zipCode || "";
      deliveryNotesInput.value = data.shippingAddress.deliveryNotes || "";
    }
  } catch (error) {
    console.error("Failed to load account settings:", error);
  }
});

saveProfileBtn.addEventListener("click", async () => {
  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();

  profileAlert.classList.add("d-none");
  profileSuccess.classList.add("d-none");

  if (!firstName || !lastName) {
    profileAlert.textContent = "First and last name are required.";
    profileAlert.classList.remove("d-none");
    return;
  }

  saveProfileBtn.disabled = true;
  try {
    await db.collection("users").doc(signedInUid).update({
      firstName,
      lastName,
      contactNumber: contactNumberInput.value.trim(),
    });
    profileSuccess.textContent = "Profile updated.";
    profileSuccess.classList.remove("d-none");
    if (accountFirstName) accountFirstName.textContent = firstName;
  } catch (error) {
    profileAlert.textContent = "Something went wrong saving your profile. Please try again.";
    profileAlert.classList.remove("d-none");
  } finally {
    saveProfileBtn.disabled = false;
  }
});

saveAddressBtn.addEventListener("click", async () => {
  addressAlert.classList.add("d-none");
  addressSuccess.classList.add("d-none");
  saveAddressBtn.disabled = true;

  try {
    await db.collection("users").doc(signedInUid).set(
      {
        shippingAddress: {
          streetAddress: streetAddressInput.value.trim(),
          city: cityInput.value.trim(),
          province: provinceInput.value.trim(),
          zipCode: zipCodeInput.value.trim(),
          deliveryNotes: deliveryNotesInput.value.trim(),
        },
      },
      { merge: true }
    );
    addressSuccess.textContent = "Shipping address updated.";
    addressSuccess.classList.remove("d-none");
  } catch (error) {
    addressAlert.textContent = "Something went wrong saving your address. Please try again.";
    addressAlert.classList.remove("d-none");
  } finally {
    saveAddressBtn.disabled = false;
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
  if (newPassword.length < 6) {
    passwordAlert.textContent = "New password must be at least 6 characters.";
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

// ---- Change Email ----
const openChangeEmailBtn = document.getElementById("openChangeEmailBtn");
const changeEmailModalEl = document.getElementById("changeEmailModal");
const changeEmailStep1 = document.getElementById("changeEmailStep1");
const changeEmailStep2 = document.getElementById("changeEmailStep2");
const newEmailInput = document.getElementById("newEmailInput");
const changeEmailPasswordInput = document.getElementById("changeEmailPasswordInput");
const changeEmailStep1Alert = document.getElementById("changeEmailStep1Alert");
const sendEmailChangeCodeBtn = document.getElementById("sendEmailChangeCodeBtn");
const changeEmailTargetDisplay = document.getElementById("changeEmailTargetDisplay");
const emailChangeOtpInput = document.getElementById("emailChangeOtpInput");
const changeEmailStep2Alert = document.getElementById("changeEmailStep2Alert");
const changeEmailStep2Success = document.getElementById("changeEmailStep2Success");
const confirmEmailChangeBtn = document.getElementById("confirmEmailChangeBtn");
const resendEmailChangeCodeBtn = document.getElementById("resendEmailChangeCodeBtn");

let pendingNewEmail = null;
let pendingEmailOtpCode = null;
let pendingEmailOtpExpiresAt = null;

openChangeEmailBtn.addEventListener("click", () => {
  newEmailInput.value = "";
  changeEmailPasswordInput.value = "";
  changeEmailStep1Alert.classList.add("d-none");
  changeEmailStep1.classList.remove("d-none");
  changeEmailStep2.classList.add("d-none");
  pendingNewEmail = null;
  pendingEmailOtpCode = null;
  bootstrap.Modal.getOrCreateInstance(changeEmailModalEl).show();
});

async function sendEmailChangeCode() {
  const newEmail = newEmailInput.value.trim();
  const password = changeEmailPasswordInput.value;

  changeEmailStep1Alert.classList.add("d-none");

  if (!newEmail || !password) {
    changeEmailStep1Alert.textContent = "Please enter your new email and current password.";
    changeEmailStep1Alert.classList.remove("d-none");
    return;
  }
  if (newEmail.toLowerCase() === (accountEmailInput.value || "").toLowerCase()) {
    changeEmailStep1Alert.textContent = "That's already your current email.";
    changeEmailStep1Alert.classList.remove("d-none");
    return;
  }

  sendEmailChangeCodeBtn.disabled = true;
  try {
    const user = auth.currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);

    pendingNewEmail = newEmail;
    pendingEmailOtpCode = generateOtpCode();
    pendingEmailOtpExpiresAt = Date.now() + 10 * 60 * 1000;
    await sendOtpEmail(newEmail, pendingEmailOtpCode, firstNameInput.value.trim());

    changeEmailTargetDisplay.textContent = newEmail;
    changeEmailStep1.classList.add("d-none");
    changeEmailStep2.classList.remove("d-none");
    changeEmailStep2Alert.classList.add("d-none");
    changeEmailStep2Success.classList.add("d-none");
    emailChangeOtpInput.value = "";
  } catch (error) {
    changeEmailStep1Alert.textContent =
      error.code === "auth/wrong-password" || error.code === "auth/invalid-credential"
        ? "Current password is incorrect."
        : "Something went wrong sending the code. Please try again.";
    changeEmailStep1Alert.classList.remove("d-none");
  } finally {
    sendEmailChangeCodeBtn.disabled = false;
  }
}

sendEmailChangeCodeBtn.addEventListener("click", sendEmailChangeCode);
resendEmailChangeCodeBtn.addEventListener("click", async () => {
  if (!pendingNewEmail) return;
  pendingEmailOtpCode = generateOtpCode();
  pendingEmailOtpExpiresAt = Date.now() + 10 * 60 * 1000;
  await sendOtpEmail(pendingNewEmail, pendingEmailOtpCode, firstNameInput.value.trim());
  changeEmailStep2Success.textContent = "A new code has been sent.";
  changeEmailStep2Success.classList.remove("d-none");
  changeEmailStep2Alert.classList.add("d-none");
});

confirmEmailChangeBtn.addEventListener("click", async () => {
  const enteredCode = emailChangeOtpInput.value.trim();

  changeEmailStep2Alert.classList.add("d-none");
  changeEmailStep2Success.classList.add("d-none");

  if (!pendingNewEmail) return;
  if (enteredCode.length !== 6) {
    changeEmailStep2Alert.textContent = "Please enter the full 6-digit code.";
    changeEmailStep2Alert.classList.remove("d-none");
    return;
  }
  if (Date.now() > pendingEmailOtpExpiresAt) {
    changeEmailStep2Alert.textContent = "This code has expired. Please resend a new one.";
    changeEmailStep2Alert.classList.remove("d-none");
    return;
  }
  if (enteredCode !== pendingEmailOtpCode) {
    changeEmailStep2Alert.textContent = "Incorrect code. Please try again.";
    changeEmailStep2Alert.classList.remove("d-none");
    return;
  }

  confirmEmailChangeBtn.disabled = true;
  try {
    const user = auth.currentUser;
    await user.updateEmail(pendingNewEmail);
    await db.collection("users").doc(signedInUid).update({ email: pendingNewEmail });

    accountEmailInput.value = pendingNewEmail;
    pendingNewEmail = null;
    pendingEmailOtpCode = null;

    changeEmailStep2Success.textContent = "Email updated.";
    changeEmailStep2Success.classList.remove("d-none");
    setTimeout(() => bootstrap.Modal.getInstance(changeEmailModalEl).hide(), 1200);
  } catch (error) {
    changeEmailStep2Alert.textContent =
      error.code === "auth/email-already-in-use"
        ? "That email is already used by another account."
        : "Something went wrong updating your email. Please try again.";
    changeEmailStep2Alert.classList.remove("d-none");
  } finally {
    confirmEmailChangeBtn.disabled = false;
  }
});
