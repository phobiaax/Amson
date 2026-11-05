// shared format checks so every form uses the same rules

// 6+ chars with a letter, a digit and a special char
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

// letters with single spaces, hyphens or periods, like ma. clara
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:(?:\.\s?|[\s-])[A-Za-zÀ-ÖØ-öø-ÿ]+)*\.?$/;

// same as the browser email check but stricter on dots
const EMAIL_PATTERN =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// ph mobile, +639171234567 or 09171234567
const PH_PHONE_PATTERN = /^(\+63|0)9\d{9}$/;

function normalizePhPhone(value) {
  return value.trim().replace(/[\s-]/g, "");
}

// throwaway email domains we dont accept
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

// ---- ph addresses ----
// kept loose so real addresses never get refused, only < and > are blocked
const STREET_ADDRESS_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{5,150}$/;
// city and province, 2-60 chars
const PLACE_NAME_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{2,60}$/;
// ph zip codes are 4 digits
const PH_ZIP_PATTERN = /^\d{4}$/;

// optional one line address on staff forms
// staff forms: mobile or landline, 7 to 15 digits with spaces, dashes, brackets or a leading +
const CONTACT_PHONE_PATTERN = /^\+?[\d\s()-]+$/;

// phone and email on supplier / wholesale forms, both optional; null when fine
function contactDetailsProblem(phone, email) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (phone && (!CONTACT_PHONE_PATTERN.test(phone) || digits.length < 7 || digits.length > 15)) {
    return "Phone number: digits only, like 0917 123 4567 or (02) 8858 1000.";
  }
  if (email && !EMAIL_PATTERN.test(email)) return "Please enter a valid email address.";
  return null;
}

// names compared ignoring capitals, spaces and dots
function sameCompanyName(a, b) {
  const key = (v) => String(v || "").toLowerCase().replace(/[.\s]+/g, " ").trim();
  return key(a) === key(b);
}

const ONE_LINE_ADDRESS_PATTERN = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[^<>]{5,200}$/;
const ONE_LINE_ADDRESS_HINT = "Address: 5-200 characters, without < or > (or leave it blank).";

// list of whats wrong with an address, empty if fine
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

// ---- payment reference numbers ----
// up to 40 chars with at least 4 letters or numbers
const REFERENCE_MAX_LENGTH = 40;
const REFERENCE_MIN_CHARS = 4;
function isValidReferenceNumber(value) {
  const v = String(value || "").trim();
  return v.length <= REFERENCE_MAX_LENGTH && /^[A-Za-z0-9 .#:-]+$/.test(v) && (v.match(/[A-Za-z0-9]/g) || []).length >= REFERENCE_MIN_CHARS;
}
const REFERENCE_NUMBER_HINT = "Reference number: at least 4 letters or numbers (up to 40 characters), as shown on your proof of payment. Only letters, numbers, spaces and - . # : are allowed.";

// ---- show/hide password buttons ----
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

// ---- change password form ----
// both pages use the same ids
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
