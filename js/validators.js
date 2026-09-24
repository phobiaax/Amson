/**
 * Shared input-format validators - used anywhere a name, email, PH mobile
 * number, or password gets entered or changed, so the same rules apply
 * whether it's at registration or edited later from Account/Staff Settings.
 */

// 6+ characters, at least one letter, one digit, and one special character.
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

// One or more letter-groups (including accented characters) separated by a
// single space, hyphen, or apostrophe - "Juan Dela Cruz" and "O'Brien" pass,
// but "----" or "'''" (no actual letters) no longer do, and separators can't
// lead, trail, or repeat ("John--Doe", " Juan").
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\s\-'][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;

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
