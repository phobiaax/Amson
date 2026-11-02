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

// ---- Addresses (Philippines) ----
// Kept loose so a real address is never refused: any normal characters,
// with at least one letter. Only < and > are refused (no HTML/code).
// Street, house no., barangay: 5-150 characters.
const STREET_ADDRESS_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{5,150}$/;
// City / municipality and province: 2-60 characters.
const PLACE_NAME_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{2,60}$/;
// Philippine ZIP codes are 4 digits.
const PH_ZIP_PATTERN = /^\d{4}$/;

// A one-line address ("Street, City") on the staff forms (suppliers,
// wholesale buyers): optional, but when given, 5-200 characters with at
// least one letter, same characters as a street address.
const ONE_LINE_ADDRESS_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{5,200}$/;
const ONE_LINE_ADDRESS_HINT = "Address: 5-200 characters, without < or > (or leave it blank).";

// What's wrong with a shipping address ({ streetAddress, city, province,
// zipCode }, already trimmed), as [{ field, message }]; empty when it's fine.
function addressProblems(address) {
  const problems = [];
  if (!address.streetAddress) problems.push({ field: "streetAddress", message: "Enter your street address." });
  else if (!STREET_ADDRESS_PATTERN.test(address.streetAddress))
    problems.push({ field: "streetAddress", message: "Street address: 5-150 characters, with no < or >." });
  if (!address.city) problems.push({ field: "city", message: "Enter your city or municipality." });
  else if (!PLACE_NAME_PATTERN.test(address.city)) problems.push({ field: "city", message: "City: 2-60 characters, with no < or >." });
  if (!address.province) problems.push({ field: "province", message: "Enter your province." });
  else if (!PLACE_NAME_PATTERN.test(address.province)) problems.push({ field: "province", message: "Province: 2-60 characters, with no < or >." });
  if (!address.zipCode) problems.push({ field: "zipCode", message: "Enter your ZIP code." });
  else if (!PH_ZIP_PATTERN.test(address.zipCode)) problems.push({ field: "zipCode", message: "ZIP code: 4 digits (e.g. 1740)." });
  return problems;
}

// ---- Payment reference numbers (G-Cash, QR Ph, bank, card terminal) ----
// Up to 40 characters with at least 4 letters or numbers, as copied from
// the receipt ("Ref No. 1234 5678", "GC-2026-001", "Ref#: 99887766"...).
// Only letters, numbers, spaces and - . # : are allowed - other symbols
// never appear in a payment reference.
function isValidReferenceNumber(value) {
  const v = String(value || "").trim();
  return v.length <= 40 && /^[A-Za-z0-9 .#:-]+$/.test(v) && (v.match(/[A-Za-z0-9]/g) || []).length >= 4;
}
const REFERENCE_NUMBER_HINT = "Reference number: at least 4 letters or numbers (up to 40 characters), as shown on your proof of payment. Only letters, numbers, spaces and - . # : are allowed.";

// ---- Show/hide password (eye) buttons: Register and Account Settings ----
function wirePasswordToggles() {
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
