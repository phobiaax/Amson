/**
 * Recognized devices (REQ005 customers, REQ044 staff).
 *
 * Each browser gets a random device ID kept in localStorage. After a login
 * from a browser that isn't in the account's trustedDevices list, the
 * login page emails a one-time code (EmailJS, the same template as the
 * sign-up code) and only adds the device once the code is entered.
 *
 * Staff and customer pages check this too, so going around the login page
 * signs the person out. Like the rest of this browser-only app, the check
 * runs in the browser: it stops someone with a stolen password from using
 * the site normally, but isn't enforced by the database itself.
 */

// Set to false only while testing with accounts that have no real inbox.
const REQUIRE_DEVICE_CODE = true;

const DEVICE_ID_KEY = "amsonDeviceId";
const DEVICE_PENDING_KEY = "amsonDeviceCheckPending";

function getDeviceId() {
  let id = null;
  try {
    id = localStorage.getItem(DEVICE_ID_KEY);
  } catch (error) {}
  if (!id || !/^[A-Za-z0-9]{24}$/.test(id)) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    try {
      localStorage.setItem(DEVICE_ID_KEY, id);
    } catch (error) {}
  }
  return id;
}

function isDeviceTrusted(userData) {
  if (!REQUIRE_DEVICE_CODE) return true;
  if (!userData) return false;
  try {
    if (sessionStorage.getItem(DEVICE_PENDING_KEY)) return false;
  } catch (error) {}
  return (userData.trustedDevices || []).some((d) => d && d.id === getDeviceId());
}

// A short readable label for the device list, e.g. "Chrome on Windows".
function deviceLabel() {
  const ua = navigator.userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "device";
  return `${browser} on ${os}`;
}

async function trustThisDevice(uid) {
  await db.collection("users").doc(uid).update({
    trustedDevices: firebase.firestore.FieldValue.arrayUnion({ id: getDeviceId(), label: deviceLabel(), addedAt: new Date().toISOString() }),
  });
  try {
    sessionStorage.removeItem(DEVICE_PENDING_KEY);
  } catch (error) {}
}

// Account Settings: forget every device except this one.
async function forgetOtherDevices(uid, userData) {
  const keep = (userData.trustedDevices || []).filter((d) => d && d.id === getDeviceId());
  await db.collection("users").doc(uid).update({ trustedDevices: keep });
  return keep;
}

// Pages other than the login page: send an unrecognized device back to log
// in properly. Resolves true when the page may continue.
async function enforceRecognizedDevice(userData) {
  if (isDeviceTrusted(userData)) return true;
  try {
    sessionStorage.setItem("amsonLoginNotice", "Please log in again to confirm this device.");
  } catch (error) {}
  await auth.signOut();
  const inSubfolder = /\/(shop|admin)\//.test(window.location.pathname);
  window.location.href = `${inSubfolder ? "../" : ""}login.html`;
  return false;
}
