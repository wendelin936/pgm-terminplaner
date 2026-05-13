import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID,
  appId: import.meta.env.VITE_FB_APP_ID
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

// Realtime-Listener: bei jeder Änderung des Dokuments wird callback(value) aufgerufen.
// Gibt eine Unsubscribe-Funktion zurück, die beim Unmount aufgerufen werden sollte.
// callback wird auch sofort beim Abonnieren einmal mit dem aktuellen Wert aufgerufen.
export function subscribeData(key, callback) {
  try {
    const unsubscribe = onSnapshot(
      doc(db, "config", key),
      (snap) => {
        const value = snap.exists() ? snap.data().value : null;
        try { callback(value, snap.metadata); } catch (e) { console.error("subscribeData callback error:", e); }
      },
      (err) => {
        console.error("Firebase subscribe error:", err);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.error("Firebase subscribe setup error:", e);
    return () => {};
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
// Firebase ID Token für gcal-sync Worker-Auth
export async function getIdToken() {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken(false);
  } catch {
    return null;
  }
}
