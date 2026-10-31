/**
 * Firebase project configuration.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDeVSO2EbDPqKDOyDiQ8t2HnLKIMpAXH4w",
  authDomain: "amson-web-app.firebaseapp.com",
  projectId: "amson-web-app",
  storageBucket: "amson-web-app.firebasestorage.app",
  messagingSenderId: "178980338990",
  appId: "1:178980338990:web:5202aea1dbf3fac6afcebf"
};

firebase.initializeApp(firebaseConfig);

// Firebase App Check (reCAPTCHA v3): Google checks that requests to the
// database and the chat assistant come from this site, not a script.
// Empty = off. The site key is public; the secret key stays in the
// Firebase console (App Check > Apps). On the local server (localhost) a
// debug token is printed in the browser console instead - add it under
// App Check > Apps > Manage debug tokens before enforcement is turned on.
const APP_CHECK_SITE_KEY = "";
const APP_CHECK_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
if (APP_CHECK_SITE_KEY && typeof firebase.appCheck === "function") {
  if (APP_CHECK_LOCAL) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), true);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Every sign-out also forgets the name the shop header shows while a page
// loads (js/shop-header.js), so it can't flash after logging out.
const firebaseSignOut = auth.signOut.bind(auth);
auth.signOut = () => {
  try {
    localStorage.removeItem("amsonHeaderUser");
  } catch (error) {}
  return firebaseSignOut();
};

// "Remember me" off: signed in in every tab until the browser is closed.
// The login is kept like a remembered one (so new tabs share it), plus a
// cookie with no expiry date, which the browser deletes when it closes. A
// page that finds the login without the cookie signs out before any of the
// page's own sign-in checks run (they wait for authGate).
const BROWSER_SESSION_COOKIE = "amsonBrowserSession";
const REMEMBER_ME_KEY = "amsonRememberMe";

function markLoginRemembered(remember) {
  try {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
  } catch (error) {}
  document.cookie = `${BROWSER_SESSION_COOKIE}=1; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

function browserSessionEnded() {
  let remembered = null;
  try {
    remembered = localStorage.getItem(REMEMBER_ME_KEY);
  } catch (error) {}
  return remembered === "0" && !document.cookie.split("; ").includes(`${BROWSER_SESSION_COOKIE}=1`);
}

// Logins from before the shared login were kept per tab. Two tabs signed in
// as different people (or one signed in, one a guest) stall the shared
// browser copy of the data (LIVE_READS) - product lists never load - so a
// per-tab login is moved to the shared one, ending when the browser closes.
// Firebase's own listener: pages get a wrapped one that waits for authGate.
const firebaseOnAuthStateChanged = auth.onAuthStateChanged.bind(auth);

let legacyTabLogin = false;
try {
  legacyTabLogin = !!sessionStorage.getItem(`firebase:authUser:${firebaseConfig.apiKey}:[DEFAULT]`);
} catch (error) {}
if (legacyTabLogin) markLoginRemembered(false);

const authGate = (legacyTabLogin
  ? auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {})
  : Promise.resolve()
).then(() => new Promise((resolve) => {
  const stop = firebaseOnAuthStateChanged(async (user) => {
    stop();
    if (user && browserSessionEnded()) {
      try {
        await auth.signOut();
      } catch (error) {}
    }
    resolve();
  });
}));

auth.onAuthStateChanged = function (...args) {
  let unsubscribe = null;
  let cancelled = false;
  authGate.then(() => {
    if (!cancelled) unsubscribe = firebaseOnAuthStateChanged(...args);
  });
  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
};

// Keep a copy of the data in the browser (IndexedDB) so a page reopened
// within ~30 minutes only downloads what changed since (Firestore bills
// unchanged documents as cached, not as new reads), while live listeners
// stay live. One tab at a time keeps the copy: shared between tabs, a
// second tab's reads never answered while the first stayed open (product
// lists stayed empty). Other tabs, and browsers that can't keep a copy
// (private windows, some older browsers), read straight from the database.
// Set LIVE_READS to false to go back to plain reads.
// BROWSER_COPY is off: on phones a tab frozen in the background could keep
// hold of the copy and leave every other tab of the site stuck loading.
// Live listeners still keep pages up to date; shop pages keep a short
// catalog copy instead (products-data.js).
const LIVE_READS = true;
const BROWSER_COPY = false;
let browserCopyOff = !(LIVE_READS && BROWSER_COPY);
const browserCopyReady = !browserCopyOff
  ? db.enablePersistence().catch((error) => {
      browserCopyOff = true;
      console.info("Browser copy of the data is in use by another tab or unavailable here (reads work as normal):", error.code || error);
    })
  : Promise.resolve();
