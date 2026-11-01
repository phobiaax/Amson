/**
 * Shared input-format validators - used anywhere a name, email, PH mobile
 * number, or password gets entered or changed, so the same rules apply
 * whether it's at registration or edited later from Account/Staff Settings.
 */

// 6+ characters, at least one letter, one digit, and one special character.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

// Letter-groups (including accented characters) separated by one space,
// hyphen or period; a period may be followed by a space and may end the
// name. "Juan Dela Cruz", "Ma. Clara", "Juan P. Cruz", "Jr." and
// "Anne-Marie" pass; digits, other symbols, a leading or trailing hyphen,
// and doubled separators ("John--Doe", " Juan") don't.
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:(?:\.\s?|[\s-])[A-Za-zÀ-ÖØ-öø-ÿ]+)*\.?$/;

// Same shape browsers use for <input type="email"> (WHATWG HTML living
// standard), tightened further so the local part can't lead, trail, or
// double up on dots ("a@b..com", "a@.com", ".a@example.com", "a.@example.com")
// - while still accepting real-world addresses (Gmail's "+" tagging,
// sub-domains, etc.) regardless of provider or country.
const EMAIL_PATTERN =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Philippine mobile number, either +639171234567 or 09171234567.
const PH_PHONE_PATTERN = /^(\+63|0)9\d{9}$/;

function normalizePhPhone(value) {
  return value.trim().replace(/[\s-]/g, "");
}

// Known disposable/temp-mail domains - real customers (whatever provider or
// country they're in) don't use these; they exist so someone can dodge the
// one-account-per-customer rules or spam sign-ups with a throwaway inbox.
// Not exhaustive - new ones appear constantly - but this blocklist approach
// only rejects known-fake addresses, unlike an allowlist of "approved"
// providers, which would also reject real work/school/other legitimate
// emails that were never on the list.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "guerrillamail.com",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.net",
  "guerrillamail.org", "guerrillamailblock.com", "sharklasers.com", "throwawaymail.com",
  "throwaway.email", "yopmail.com", "yopmail.fr", "yopmail.net", "10minutemail.com",
  "10minutemail.net", "trashmail.com", "trashmail.net", "dispostable.com", "fakeinbox.com",
  "fakemailgenerator.com", "getairmail.com", "getnada.com", "mailnesia.com", "mintemail.com",
  "mohmal.com", "spamgourmet.com", "tempail.com", "tempinbox.com", "emailondeck.com",
  "mailcatch.com", "moakt.com", "mytemp.email", "tempmailo.com", "discard.email",
  "maildrop.cc", "inboxbear.com", "burnermail.io",
]);

function isDisposableEmail(email) {
  const domain = (email.split("@")[1] || "").trim().toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

// ---- Change Password form (customer Account Settings and staff Settings) ----
// Both pages use the same element ids.
function setupChangePasswordForm() {
  const currentPasswordInput = document.getElementById("currentPasswordInput");
  const newPasswordInput = document.getElementById("newPasswordInput");
  const confirmNewPasswordInput = document.getElementById("confirmNewPasswordInput");
  const passwordAlert = document.getElementById("passwordAlert");
  const passwordSuccess = document.getElementById("passwordSuccess");
  const updatePasswordBtn = document.getElementById("updatePasswordBtn");

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
}
