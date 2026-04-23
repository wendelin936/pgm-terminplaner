// ─────────────────────────────────────────────────────────────
// ERGÄNZUNG für deine bestehende src/firebase.js
// ─────────────────────────────────────────────────────────────
// Irgendwo oben in der Datei, wo auch `auth` angelegt oder
// importiert wird (z.B. `const auth = getAuth(app)`), einfach
// folgende Funktion hinzufügen und exportieren.
//
// Falls du `auth` aus firebase/auth direkt per getAuth() nutzt,
// sieht das so aus:

import { getAuth } from "firebase/auth";  // falls noch nicht importiert

// Liefert den aktuellen Firebase-ID-Token oder null, wenn kein User eingeloggt ist.
// Firebase refreshed den Token automatisch wenn er bald ausläuft.
export async function getIdToken() {
  try {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken(/* forceRefresh */ false);
  } catch {
    return null;
  }
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

// Das ist alles. App.jsx importiert `getIdToken` aus "./firebase.js"
// und registriert es per setGcalTokenProvider(getIdToken) beim Start.
