// gcal-sync.js — Frontend-Helper für Google Calendar Sync
// Diff-basiert: vergleicht alte vs. neue events und feuert einen einzigen Batch-Request.
//
// AUTH: Firebase ID Token (JWT) per Authorization-Header. KEIN Shared Secret mehr.
// Beim App-Start muss EINMAL setGcalTokenProvider(fn) aufgerufen werden, wobei fn
// einen gültigen Firebase ID Token zurückgibt (oder null, wenn kein User eingeloggt ist).
//
// Usage in App.jsx:
//   import { syncEventsDiff, ensureLocalIds, setGcalTokenProvider, GCAL_WORKER_URL } from "./gcal-sync.js";
//   import { getIdToken } from "./firebase.js";
//   setGcalTokenProvider(getIdToken);  // einmal beim App-Start
//   ...
//   syncEventsDiff(oldEvents, newEvents).then(patched => { ... });

export const GCAL_WORKER_URL = "https://pgm-gcal.wendelin936.workers.dev";

// ============================================================
// Auth: Firebase ID Token Provider
// Wird vom App-Code einmalig gesetzt. Ohne Token wird kein Sync-Request gesendet.
// ============================================================
let _tokenProvider = null;
export function setGcalTokenProvider(fn) { _tokenProvider = fn; }
async function getAuthToken() {
  if (!_tokenProvider) { console.warn("[gcal sync] no token provider registered — sync disabled"); return null; }
  try { return await _tokenProvider(); } catch (e) { console.warn("[gcal sync] token provider error:", e); return null; }
}

// ============================================================
// localId generator (kein UUID-Lib nötig)
// ============================================================
function genId() {
  return "ev_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

// Stellt sicher, dass jedes Event (inkl. subEvents) eine localId hat.
// Läuft vor jedem Save.
export function ensureLocalIds(events) {
  const out = { ...events };
  for (const [key, ev] of Object.entries(out)) {
    if (!ev) continue;
    const fresh = { ...ev };
    if (!fresh.localId) fresh.localId = genId();
    if (Array.isArray(fresh.subEvents) && fresh.subEvents.length) {
      fresh.subEvents = fresh.subEvents.map(s => s?.localId ? s : { ...s, localId: genId() });
    }
    out[key] = fresh;
  }
  return out;
}

// ============================================================
// Welche Events werden synchronisiert?
// ============================================================
function shouldSync(ev) {
  if (!ev) return false;
  // Serientermine (einzelne Tage mit seriesId, oder isSeries-Flag) werden NICHT gesynct
  if (ev.isSeries || ev.seriesId) return false;
  // nur booked (bestätigt) + blocked (intern), pending/deleted werden NICHT gesynct
  return ev.status === "booked" || ev.status === "blocked";
}

// Flach-Liste aller sync-fähigen Events mit Kontext
function flatten(events) {
  const out = [];
  for (const [key, ev] of Object.entries(events || {})) {
    if (!ev) continue;
    if (shouldSync(ev)) out.push({ key, subIndex: -1, event: ev, localId: ev.localId });
    if (Array.isArray(ev.subEvents)) {
      ev.subEvents.forEach((s, i) => {
        if (shouldSync(s)) out.push({ key, subIndex: i, event: s, localId: s.localId });
      });
    }
  }
  return out.filter(x => x.localId);
}

// Tracked googleEventIds: Map<localId, { gcalId, key, subIndex }>
function extractGcalIds(events) {
  const map = new Map();
  for (const [key, ev] of Object.entries(events || {})) {
    if (!ev) continue;
    if (ev.localId && ev.googleEventId) map.set(ev.localId, { gcalId: ev.googleEventId, key, subIndex: -1 });
    if (Array.isArray(ev.subEvents)) {
      ev.subEvents.forEach((s, i) => {
        if (s?.localId && s?.googleEventId) map.set(s.localId, { gcalId: s.googleEventId, key, subIndex: i });
      });
    }
  }
  return map;
}

// Heuristik: hat sich für die Google-Darstellung relevantes geändert?
function eventChanged(a, b) {
  const fields = ["status", "type", "label", "name", "email", "phone", "guests",
    "startTime", "endTime", "allDay", "adminNote", "note",
    "contactName", "contactPhone", "groupName",
    "tourGuide", "cakeCount", "coffeeCount"];
  for (const f of fields) {
    if ((a?.[f] ?? "") !== (b?.[f] ?? "")) return true;
  }
  // Checklist-Vergleich (flach)
  const ac = Array.isArray(a?.checklist) ? a.checklist : [];
  const bc = Array.isArray(b?.checklist) ? b.checklist : [];
  if (ac.length !== bc.length) return true;
  for (let i = 0; i < ac.length; i++) {
    if ((ac[i]?.text || "") !== (bc[i]?.text || "")) return true;
    if (!!ac[i]?.done !== !!bc[i]?.done) return true;
  }
  return false;
}

// ============================================================
// Haupt-Funktion: Diff berechnen + Batch an Worker schicken
// Rückgabe: gepatchtes events-Objekt mit neuen googleEventIds, oder null wenn nichts zu tun
// Optional: onComplete-Callback bekommt { created, updated, deleted, failed } für User-Feedback
// ============================================================
export async function syncEventsDiff(oldEvents, newEvents, onComplete) {
  const oldMap = new Map(flatten(oldEvents).map(x => [x.localId, x]));
  const newMap = new Map(flatten(newEvents).map(x => [x.localId, x]));
  const oldGcalIds = extractGcalIds(oldEvents);
  const newGcalIds = extractGcalIds(newEvents);

  const ops = [];

  // CREATE: in new, nicht in old
  for (const [localId, entry] of newMap) {
    if (!oldMap.has(localId) && !newGcalIds.has(localId)) {
      ops.push({
        op: "create",
        localId,
        dateKey: entry.key,
        event: entry.event,
      });
    }
  }

  // UPDATE: in beiden, event geändert
  for (const [localId, entry] of newMap) {
    const oldEntry = oldMap.get(localId);
    const gcalId = newGcalIds.get(localId)?.gcalId;
    if (oldEntry && gcalId && eventChanged(oldEntry.event, entry.event)) {
      ops.push({
        op: "update",
        localId,
        gcalId,
        dateKey: entry.key,
        event: entry.event,
      });
    }
  }

  // DELETE: in old aber nicht in new (status-wechsel booked→pending/deleted zählt hier)
  // Auch ohne gcalId wird eine Delete-Op gefeuert — der Worker findet den Event via
  // extendedProperties.localId. Das fängt Race-Conditions ab, wenn die googleEventId
  // noch nicht im lokalen State gespeichert war (z.B. Delete direkt nach Create).
  for (const [localId, entry] of oldMap) {
    if (!newMap.has(localId)) {
      const gcalId = oldGcalIds.get(localId)?.gcalId || newGcalIds.get(localId)?.gcalId || null;
      ops.push({ op: "delete", localId, gcalId });
    }
  }
  // Zusätzlich: jeder Event in newEvents, der jetzt nicht mehr syncable ist → delete
  // Egal ob gcalId vorhanden ist oder nicht (Worker findet notfalls via localId).
  const allNewUnsyncable = [];
  for (const [dk, ev] of Object.entries(newEvents || {})) {
    if (!ev) continue;
    if (ev.localId && !shouldSync(ev)) allNewUnsyncable.push({ localId: ev.localId, gcalId: ev.googleEventId || null, dk });
    if (Array.isArray(ev.subEvents)) {
      ev.subEvents.forEach(s => {
        if (s?.localId && !shouldSync(s)) allNewUnsyncable.push({ localId: s.localId, gcalId: s.googleEventId || null, dk });
      });
    }
  }
  for (const x of allNewUnsyncable) {
    if (!ops.find(o => o.localId === x.localId && o.op === "delete")) {
      ops.push({ op: "delete", localId: x.localId, gcalId: x.gcalId });
    }
  }

  if (ops.length === 0) {
    console.log("[gcal sync] no ops — oldMap size:", oldMap.size, "newMap size:", newMap.size);
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: 0 });
    return null;
  }
  console.log("[gcal sync] sending ops:", ops);

  // Batch-Request (authentifiziert via Firebase ID Token)
  const token = await getAuthToken();
  if (!token) {
    console.warn("[gcal sync] no auth token — sync skipped");
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: 0, skipped: true });
    return null;
  }
  let results;
  try {
    const res = await fetch(`${GCAL_WORKER_URL}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ ops }),
    });
    const data = await res.json();
    console.log("[gcal sync] response:", data);
    if (!data.ok) {
      console.warn("[gcal sync] batch failed:", data);
      if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: ops.length });
      return null;
    }
    results = data.results || [];
  } catch (e) {
    console.warn("[gcal sync] network error:", e);
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: ops.length });
    return null;
  }

  // Patchen: googleEventIds in events-Objekt einsetzen/entfernen
  // - CREATE: neue googleEventId setzen
  // - DELETE: googleEventId entfernen (damit späteres Re-Create sauber läuft)
  const patched = structuredClone(newEvents);
  let anyPatched = false;
  // Map: localId → op-Typ (aus lokaler ops-Liste, da der Worker den op-Typ nicht zurückgibt)
  const opByLocalId = new Map(ops.map(o => [o.localId, o.op]));
  // Helper: Event mit bestimmter localId im patched-Objekt finden und modifizieren
  const modifyByLocalId = (localId, updater) => {
    for (const [dk, ev] of Object.entries(patched)) {
      if (!ev) continue;
      if (ev.localId === localId) {
        patched[dk] = updater(ev);
        anyPatched = true;
        return true;
      }
      if (Array.isArray(ev.subEvents)) {
        const idx = ev.subEvents.findIndex(s => s?.localId === localId);
        if (idx >= 0) {
          const subs = ev.subEvents.slice();
          subs[idx] = updater(subs[idx]);
          patched[dk] = { ...ev, subEvents: subs };
          anyPatched = true;
          return true;
        }
      }
    }
    return false;
  };
  const stats = { created: 0, updated: 0, deleted: 0, failed: 0 };
  for (const r of results) {
    const op = opByLocalId.get(r.localId);
    if (!r.ok) { stats.failed++; continue; }
    if (op === "delete") {
      stats.deleted++;
      // gelöschte Events: googleEventId lokal entfernen, damit Re-Enable später einen neuen Event anlegt
      modifyByLocalId(r.localId, ev => { const { googleEventId, ...rest } = ev; return rest; });
    } else if (op === "update") {
      stats.updated++;
    } else if (r.googleEventId) {
      stats.created++;
      // create: neue googleEventId einsetzen
      modifyByLocalId(r.localId, ev => ({ ...ev, googleEventId: r.googleEventId }));
    }
  }
  console.log("[gcal sync] stats:", stats);
  if (onComplete) onComplete(stats);

  return anyPatched ? patched : null;
}

// ============================================================
// VERANSTALTUNGS-SYNC
// Jede Veranstaltung hat ein Array von `dates`. Jeder Termin-Entry wird als
// eigenes Google-Calendar-Event synchronisiert.
// sync-Key: "v_${veranstaltungId}:${dateEntryId}" (stabil über Lifecycle).
// googleEventId wird am einzelnen date-Entry gespeichert.
// ============================================================

// Mapping: Veranstaltung + Termin → pseudo-event-Struktur für den Worker.
// Der Worker erwartet die gleiche Struktur wie ein normales event, daher
// mappen wir die Veranstaltungs-Daten auf label/adminNote/contactName etc.
function veranstaltungToEvent(v, d) {
  const title = v.title || "Veranstaltung";
  const parts = [];
  if (v.description && v.description.trim()) parts.push(v.description.trim());
  if (v.contactName) parts.push(`Ansprechpartner: ${v.contactName}`);
  if (v.contactPhone) parts.push(`Tel: ${v.contactPhone}`);
  if (v.publicPrice && v.publicPrice.trim()) {
    const lbl = (v.publicPriceLabel && v.publicPriceLabel.trim()) ? v.publicPriceLabel : "Eintritt";
    const raw = v.publicPrice.trim();
    const isPercent = /%/.test(raw);
    const looksNumeric = /^\s*[\d.,]+\s*$/.test(raw.replace(/\s*€\s*$/, "").replace(/^\s*€\s*/, ""));
    const display = isPercent ? raw : (looksNumeric ? `${raw.replace(/\s*€\s*$/, "").replace(/^\s*€\s*/, "")} €` : raw);
    parts.push(`${lbl}: ${display}`);
  }
  if (v.kaertnerCardFree) parts.push("Mit Kärnten Card kostenlos");
  if (v.adminPrice && v.adminPrice.trim()) {
    const raw = v.adminPrice.trim();
    const isPercent = /%/.test(raw);
    const looksNumeric = /^\s*[\d.,]+\s*$/.test(raw.replace(/\s*€\s*$/, "").replace(/^\s*€\s*/, ""));
    const display = isPercent ? raw : (looksNumeric ? `${raw.replace(/\s*€\s*$/, "").replace(/^\s*€\s*/, "")} €` : raw);
    parts.push(`Vereinbart (intern): ${display}`);
    const psMap = { open: "Offen", partial: "Anzahlung", paid: "Bezahlt" };
    const ps = psMap[v.adminPaymentStatus];
    if (ps) parts.push(`Zahlungsstatus: ${ps}`);
    if (v.adminPaymentStatus === "partial" && v.adminPartialAmount) {
      parts.push(`Angezahlt: ${v.adminPartialAmount} €`);
    }
  }
  if (d.seriesId) parts.push(`(Serie · ${d.seriesId.slice(0, 8)})`);

  return {
    type: "veranstaltung",
    label: title,
    status: "booked",
    startTime: d.startTime || "09:00",
    endTime: d.endTime || "17:00",
    allDay: !!d.allDay,
    contactName: v.contactName || "",
    contactPhone: v.contactPhone || "",
    adminNote: parts.join("\n"),
    name: title,
  };
}

function flattenVeranstaltungen(veranstaltungen) {
  const out = [];
  for (const v of (veranstaltungen || [])) {
    if (!v || !v.id || !Array.isArray(v.dates)) continue;
    for (const d of v.dates) {
      if (!d || !d.id || !d.date) continue;
      const syncId = `v_${v.id}:${d.id}`;
      out.push({ syncId, veranstaltungId: v.id, dateEntryId: d.id, dateKey: d.date, veranstaltung: v, dateEntry: d });
    }
  }
  return out;
}

function extractVeranstGcalIds(veranstaltungen) {
  const map = new Map();
  for (const v of (veranstaltungen || [])) {
    if (!v || !v.id) continue;
    for (const d of (v.dates || [])) {
      if (d?.id && d?.googleEventId) {
        map.set(`v_${v.id}:${d.id}`, { gcalId: d.googleEventId, veranstaltungId: v.id, dateEntryId: d.id });
      }
    }
  }
  return map;
}

function veranstEntryChanged(a, b) {
  // Termin-Felder die für Google relevant sind
  const dateFields = ["date", "startTime", "endTime", "allDay"];
  for (const f of dateFields) {
    if ((a.dateEntry?.[f] ?? "") !== (b.dateEntry?.[f] ?? "")) return true;
  }
  // Veranstaltungs-Felder die in Summary/Description landen
  const vFields = ["title", "description", "contactName", "contactPhone",
    "publicPrice", "publicPriceLabel", "kaertnerCardFree",
    "adminPrice", "adminPaymentStatus", "adminPartialAmount"];
  for (const f of vFields) {
    if ((a.veranstaltung?.[f] ?? "") !== (b.veranstaltung?.[f] ?? "")) return true;
  }
  return false;
}

// ============================================================
// Haupt-Funktion: Diff + Batch-Sync für Veranstaltungen
// Rückgabe: gepatchtes veranstaltungen-Array mit neuen googleEventIds, oder null wenn nichts zu tun
// ============================================================
export async function syncVeranstaltungenDiff(oldVeranst, newVeranst, onComplete) {
  const oldFlat = new Map(flattenVeranstaltungen(oldVeranst).map(x => [x.syncId, x]));
  const newFlat = new Map(flattenVeranstaltungen(newVeranst).map(x => [x.syncId, x]));
  const oldGcalIds = extractVeranstGcalIds(oldVeranst);
  const newGcalIds = extractVeranstGcalIds(newVeranst);

  const ops = [];

  // CREATE: jeder Termin der keine googleEventId hat (neu oder bisher nicht gesynct)
  for (const [syncId, entry] of newFlat) {
    if (newGcalIds.has(syncId)) continue; // hat schon eine gcalId → kein create
    ops.push({
      op: "create",
      localId: syncId,
      dateKey: entry.dateKey,
      event: veranstaltungToEvent(entry.veranstaltung, entry.dateEntry),
    });
  }

  // UPDATE
  for (const [syncId, entry] of newFlat) {
    const oldEntry = oldFlat.get(syncId);
    const gcalId = newGcalIds.get(syncId)?.gcalId;
    if (oldEntry && gcalId && veranstEntryChanged(oldEntry, entry)) {
      ops.push({
        op: "update",
        localId: syncId,
        gcalId,
        dateKey: entry.dateKey,
        event: veranstaltungToEvent(entry.veranstaltung, entry.dateEntry),
      });
    }
  }

  // DELETE
  for (const [syncId, entry] of oldFlat) {
    if (!newFlat.has(syncId)) {
      const gcalId = oldGcalIds.get(syncId)?.gcalId || newGcalIds.get(syncId)?.gcalId;
      if (gcalId) ops.push({ op: "delete", localId: syncId, gcalId });
    }
  }

  if (ops.length === 0) {
    console.log("[gcal veranst sync] no ops");
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: 0 });
    return null;
  }
  console.log("[gcal veranst sync] sending ops:", ops);

  const token = await getAuthToken();
  if (!token) {
    console.warn("[gcal veranst sync] no auth token — sync skipped");
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: 0, skipped: true });
    return null;
  }
  let results;
  try {
    const res = await fetch(`${GCAL_WORKER_URL}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ ops }),
    });
    const data = await res.json();
    console.log("[gcal veranst sync] response:", data);
    if (!data.ok) {
      console.warn("[gcal veranst sync] batch failed:", data);
      if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: ops.length });
      return null;
    }
    results = data.results || [];
  } catch (e) {
    console.warn("[gcal veranst sync] network error:", e);
    if (onComplete) onComplete({ created: 0, updated: 0, deleted: 0, failed: ops.length });
    return null;
  }

  // Patch: googleEventId in date-Entries einsetzen bzw. entfernen
  const patched = structuredClone(newVeranst);
  let anyPatched = false;
  const opByLocalId = new Map(ops.map(o => [o.localId, o.op]));

  const modifyBySyncId = (syncId, updater) => {
    // syncId: v_{veranstaltungId}:{dateEntryId}
    const afterPrefix = syncId.startsWith("v_") ? syncId.slice(2) : syncId;
    const colonIdx = afterPrefix.lastIndexOf(":");
    if (colonIdx < 0) return false;
    const vId = afterPrefix.slice(0, colonIdx);
    const dId = afterPrefix.slice(colonIdx + 1);
    const v = patched.find(x => x.id === vId);
    if (!v || !Array.isArray(v.dates)) return false;
    const idx = v.dates.findIndex(d => d.id === dId);
    if (idx < 0) return false;
    v.dates[idx] = updater(v.dates[idx]);
    anyPatched = true;
    return true;
  };

  const stats = { created: 0, updated: 0, deleted: 0, failed: 0 };
  for (const r of results) {
    const op = opByLocalId.get(r.localId);
    if (!r.ok) { stats.failed++; continue; }
    if (op === "delete") {
      stats.deleted++;
      modifyBySyncId(r.localId, d => { const { googleEventId, ...rest } = d; return rest; });
    } else if (op === "update") {
      stats.updated++;
    } else if (r.googleEventId) {
      stats.created++;
      modifyBySyncId(r.localId, d => ({ ...d, googleEventId: r.googleEventId }));
    }
  }
  console.log("[gcal veranst sync] stats:", stats);
  if (onComplete) onComplete(stats);

  return anyPatched ? patched : null;
}
