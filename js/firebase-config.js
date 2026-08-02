/**
 * Firebase project configuration.
 * Replace the placeholder values below with your own project's config
 * (Firebase Console > Project Settings > General > Your apps > SDK setup and configuration).
 * These client-side keys are safe to expose publicly; access is controlled
 * via Firebase Authentication and Firestore Security Rules.
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
