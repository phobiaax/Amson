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

const auth = firebase.auth();
const db = firebase.firestore();

// Keep a copy of the data in the browser (IndexedDB) so a page reopened
// within ~30 minutes only downloads what changed since (Firestore bills
// unchanged documents as cached, not as new reads), while live listeners
// stay live. Shared by every open tab. Where the browser can't keep a copy
// (private windows, some older browsers) everything works as before, just
// without the savings. Set LIVE_READS to false to go back to plain reads.
const LIVE_READS = true;
if (LIVE_READS) {
  db.enablePersistence({ synchronizeTabs: true }).catch((error) => {
    console.warn("Browser copy of the data is off here (reads work as normal):", error.code || error);
  });
}
