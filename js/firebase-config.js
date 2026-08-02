/**
 * Firebase project configuration.
 * Replace the placeholder values below with your own project's config
 * (Firebase Console > Project Settings > General > Your apps > SDK setup and configuration).
 * These client-side keys are safe to expose publicly; access is controlled
 * via Firebase Authentication and Firestore Security Rules.
 */
const firebaseConfig = {
  apiKey: "AIzaSyDnjXJg4BGMi8pkjJGzr5I3ULTbd608zKU",
  authDomain: "amson-pharmaceuticals.firebaseapp.com",
  projectId: "amson-pharmaceuticals",
  storageBucket: "amson-pharmaceuticals.firebasestorage.app",
  messagingSenderId: "690706027016",
  appId: "1:690706027016:web:cb8c9d405c3a478888f7bd"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
