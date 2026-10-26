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

// Keep a copy of the data in the browser (IndexedDB) so a page reopened
// within ~30 minutes only downloads what changed since (Firestore bills
// unchanged documents as cached, not as new reads), while live listeners
// stay live. Shared by every open tab. Where the browser can't keep a copy
// (private windows, some older browsers) everything works as before, just
// without the savings. Set LIVE_READS to false to go back to plain reads.
const LIVE_READS = true;
let browserCopyOff = !LIVE_READS;
if (LIVE_READS) {
  db.enablePersistence({ synchronizeTabs: true }).catch((error) => {
    browserCopyOff = true;
    console.warn("Browser copy of the data is off here (reads work as normal):", error.code || error);
  });
}
