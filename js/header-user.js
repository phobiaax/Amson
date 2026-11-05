// shows the last logged in name right away so login/register doesnt flash

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

// remember me off means the login ends when the browser closes
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
  // head script hid login/register until now
  document.documentElement.classList.remove("header-known-user");
  if (firstName === null || headerLoginEndedWithBrowser()) return;
  document.getElementById("accountFirstName").textContent = firstName || "Account";
  document.getElementById("guestActions").classList.add("d-none");
  document.getElementById("accountActions").classList.remove("d-none");
})();
