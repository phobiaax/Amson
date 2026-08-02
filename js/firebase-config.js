/**
 * Firebase project configuration.
 * Replace the placeholder values below with your own project's config
 * (Firebase Console > Project Settings > General > Your apps > SDK setup and configuration).
 * These client-side keys are safe to expose publicly; access is controlled
 * via Firebase Authentication and Firestore Security Rules.
 */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
