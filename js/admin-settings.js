// settings page

let currentAdminUid = null;

const settingsFirstNameInput = document.getElementById("settingsFirstNameInput");
const settingsLastNameInput = document.getElementById("settingsLastNameInput");
const settingsContactNumberInput = document.getElementById("settingsContactNumberInput");
const settingsEmailInput = document.getElementById("settingsEmailInput");
const profileAlert = document.getElementById("profileAlert");
const profileSuccess = document.getElementById("profileSuccess");
const saveProfileBtn = document.getElementById("saveProfileBtn");

document.addEventListener("admin:ready", (e) => {
  currentAdminUid = e.detail.uid;
  const admin = e.detail.admin;
  settingsFirstNameInput.value = admin.firstName || "";
  settingsLastNameInput.value = admin.lastName || "";
  settingsContactNumberInput.value = admin.contactNumber || "";
  settingsEmailInput.value = admin.email || "";
  // temporary clear test data link
  if (["admin", "branch_manager"].includes(admin.role) && new Date() < CLEAR_TEST_DATA_UNTIL) {
    document.getElementById("clearTestDataCard").classList.remove("d-none");
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

setupChangePasswordForm();
