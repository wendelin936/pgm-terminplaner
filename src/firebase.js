import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

// ============================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAa1RSo21egGdIatqxMtIlbkxO83IJbD2M",
  authDomain: "paradiesgarten-terminpla-5496c.firebaseapp.com",
  projectId: "paradiesgarten-terminpla-5496c",
  storageBucket: "paradiesgarten-terminpla-5496c.firebasestorage.app",
  messagingSenderId: "763348915903",
  appId: "1:763348915903:web:cbaf58135c4912adec580a",
  measurementId: "G-YY76HY540M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ============================================================
const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJEKT.firebaseapp.com",
  projectId: "DEIN_PROJEKT",
  storageBucket: "DEIN_PROJEKT.appspot.com",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Daten laden
export async function loadData(key) {
  try {
    const snap = await getDoc(doc(db, "config", key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error("Firebase load error:", e);
    return null;
  }
}

// Daten speichern
export async function saveData(key, value) {
  try {
    await setDoc(doc(db, "config", key), { value, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Firebase save error:", e);
  }
}

// Admin Login
export async function adminLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Admin Logout
export async function adminLogout() {
  return signOut(auth);
}

// Auth Status beobachten
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
