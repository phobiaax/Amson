/**
 * Shop header, first moment of a page load: shows the last signed-in
 * customer's name instead of Login / Register straight away. Loaded right
 * after the header and before the Firebase scripts download, so a refresh
 * doesn't flash Login / Register while those load. js/shop-header.js then
 * confirms or corrects it once Firebase has checked the login.
 */

const HEADER_USER_KEY = "amsonHeaderUser";

function rememberHeaderUser(firstName) {
  try {
    localStorage.setItem(HEADER_USER_KEY, firstName);
  } catch (error) {}
}

function forgetHeaderUser() {
  try {
    localStorage.removeItem(HEADER_USER_KEY);
  } catch (error) {}
}

// Same check as browserSessionEnded() in firebase-config.js (which hasn't
// loaded yet at this point): a "Remember me"-off login ends when the browser
// closes, so its name isn't shown after that.
function headerLoginEndedWithBrowser() {
  let remembered = null;
  try {
    remembered = localStorage.getItem("amsonRememberMe");
  } catch (error) {}
  return remembered === "0" && !document.cookie.split("; ").includes("amsonBrowserSession=1");
}

(function showLastKnownUser() {
  let firstName = null;
  try {
    firstName = localStorage.getItem(HEADER_USER_KEY);
  } catch (error) {}
  // The small script in each page's <head> kept Login / Register blank until
  // now; from here the header shows one or the other.
  document.documentElement.classList.remove("header-known-user");
  if (firstName === null || headerLoginEndedWithBrowser()) return;
  document.getElementById("accountFirstName").textContent = firstName || "Account";
  document.getElementById("guestActions").classList.add("d-none");
  document.getElementById("accountActions").classList.remove("d-none");
})();
