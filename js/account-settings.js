/**
 * Customer Account Settings page: edit profile info, shipping address,
 * and change password. Mirrors the shipping address fields saved during
 * checkout (js/checkout.js) so either page keeps the same data in sync.
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
