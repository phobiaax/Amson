/**
 * Settings admin page: no Figma mockup exists for this yet — this is a
 * reasonable best-guess build (edit own profile info, change password)
 * so the sidebar/topbar link isn't dead. Kept intentionally small in
 * scope until a real design comes in.
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

  saveProfileBtn.disabled = true;
  try {
    await db.collection("users").doc(currentAdminUid).update({
      firstName,
      lastName,
      contactNumber: settingsContactNumberInput.value.trim(),
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
