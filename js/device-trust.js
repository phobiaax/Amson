// remembers which browsers an account has logged in from

// asks for an emailed code on new devices, set to false to turn it off
const REQUIRE_DEVICE_CODE = true;

const DEVICE_ID_KEY = "amsonDeviceId";
const DEVICE_PENDING_KEY = "amsonDeviceCheckPending";

// random id for this browser, saved the first time
function getOrCreateDeviceId() {
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
  return (userData.trustedDevices || []).some((d) => d && d.id === getOrCreateDeviceId());
}

// short label like chrome on windows
function deviceLabel() {
  const ua = navigator.userAgent || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "device";
  return `${browser} on ${os}`;
}

async function trustThisDevice(uid) {
  await db.collection("users").doc(uid).update({
    trustedDevices: firebase.firestore.FieldValue.arrayUnion({ id: getOrCreateDeviceId(), label: deviceLabel(), addedAt: new Date().toISOString() }),
  });
  try {
    sessionStorage.removeItem(DEVICE_PENDING_KEY);
  } catch (error) {}
}

// forgets every device except this one
async function forgetOtherDevices(uid, userData) {
  const keep = (userData.trustedDevices || []).filter((d) => d && d.id === getOrCreateDeviceId());
  await db.collection("users").doc(uid).update({ trustedDevices: keep });
  return keep;
}

// sends unknown devices back to login, true means the page can continue
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
