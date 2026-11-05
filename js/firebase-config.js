// firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDeVSO2EbDPqKDOyDiQ8t2HnLKIMpAXH4w",
  authDomain: "amson-web-app.firebaseapp.com",
  projectId: "amson-web-app",
  storageBucket: "amson-web-app.firebasestorage.app",
  messagingSenderId: "178980338990",
  appId: "1:178980338990:web:5202aea1dbf3fac6afcebf"
};

firebase.initializeApp(firebaseConfig);

// app check for the database, empty means off
const APP_CHECK_SITE_KEY = "";
const APP_CHECK_LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
if (APP_CHECK_SITE_KEY && typeof firebase.appCheck === "function") {
  if (APP_CHECK_LOCAL) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  firebase.appCheck().activate(new firebase.appCheck.ReCaptchaV3Provider(APP_CHECK_SITE_KEY), true);
}

const auth = firebase.auth();
const db = firebase.firestore();

// also clears the saved header name so it doesnt flash after logout
const firebaseSignOut = auth.signOut.bind(auth);
auth.signOut = () => {
  try {
    localStorage.removeItem("amsonHeaderUser");
  } catch (error) {}
  return firebaseSignOut();
};

// remember me off: cookie gets deleted when the browser closes
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

// clears old per-tab logins so live reads dont get stuck
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

// live reads keep pages updated without refreshing, false for one-time reads
const LIVE_READS = true;
