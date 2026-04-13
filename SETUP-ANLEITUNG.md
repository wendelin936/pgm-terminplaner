# PGM Terminplaner — Setup-Anleitung

## 1. Firebase-Projekt anlegen

1. Gehe zu **https://console.firebase.google.com**
2. Klick auf **Projekt hinzufügen**
3. Name: `paradiesgarten-terminplaner`
4. Google Analytics → **deaktivieren** (brauchst du nicht)
5. Klick **Projekt erstellen**

## 2. Firebase Authentication einrichten

1. Im Firebase-Dashboard links: **Authentication** → **Erste Schritte**
2. Reiter **Anmeldemethode** → **E-Mail/Passwort** → **Aktivieren** → Speichern
3. Reiter **Nutzer** → **Nutzer hinzufügen**
   - E-Mail: deine Admin-E-Mail (z.B. `info@mattuschka.at`)
   - Passwort: dein gewünschtes Admin-Passwort
   - → **Nutzer hinzufügen**

## 3. Firestore-Datenbank erstellen

1. Im Dashboard links: **Firestore Database** → **Datenbank erstellen**
2. **Produktionsmodus** auswählen
3. Standort: `europe-west3` (Frankfurt) → **Erstellen**
4. Unter **Regeln** folgendes eintragen und **Veröffentlichen**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Jeder kann Termine lesen (für Kalender)
    match /events/{eventId} {
      allow read: true;
      allow write: if request.auth != null;
    }
    // Jeder kann Typen/Preise lesen
    match /config/{configId} {
      allow read: true;
      allow write: if request.auth != null;
    }
    // Kunden dürfen Anfragen senden
    match /requests/{requestId} {
      allow read: if request.auth != null;
      allow create: true;
      allow update, delete: if request.auth != null;
    }
  }
}
```

## 4. Firebase-Config kopieren

1. Im Dashboard: **Zahnrad** (oben links) → **Projekteinstellungen**
2. Runterscrollen zu **Ihre Apps** → **Web-App hinzufügen** (</> Symbol)
3. Name: `terminplaner` → **App registrieren**
4. Du siehst jetzt die **firebaseConfig** — kopiere diese Werte
5. Öffne die Datei `src/firebase.js` und ersetze die Platzhalter

## 5. Auf Netlify deployen

1. Lade das gesamte `pgm-deploy`-Verzeichnis auf **GitHub** hoch
2. Gehe zu **https://app.netlify.com** → **Add new site** → **Import an existing project**
3. Verbinde dein GitHub-Repository
4. Build-Einstellungen:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. → **Deploy site**

## 6. Fertig!

- Deine App läuft unter der Netlify-URL (z.B. `terminplaner-pgm.netlify.app`)
- Optional: Custom Domain einrichten (z.B. `terminplaner.derparadiesgarten.at`)
- Admin-Login über das Schloss-Symbol oben rechts
- Alle Daten werden in Firebase gespeichert und sind von überall abrufbar
