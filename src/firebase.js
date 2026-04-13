import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAa1RSo21egGdIatqxMtIlbkxO83IJbD2M",
  authDomain: "paradiesgarten-terminpla-5496c.firebaseapp.com",
  projectId: "paradiesgarten-terminpla-5496c",
  storageBucket: "paradiesgarten-terminpla-5496c.firebasestorage.app",
  messagingSenderId: "763348915903",
  appId: "1:763348915903:web:cbaf58135c4912adec580a",
  measurementId: "G-YY76HY540M"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function loadData(key) {
  try {
    const snap = await getDoc(doc(db, "config", key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error("Firebase load error:", e);
    return null;
  }
}

export async function saveData(key, value) {
  try {
    await setDoc(doc(db, "config", key), { value, updatedAt: new Date().toISOString() });
  } catch (e) {
    console.error("Firebase save error:", e);
  }
}

export async function adminLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function adminLogout() {
  return signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
