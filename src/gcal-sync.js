// gcal-sync.js — Frontend-Helper für Google Calendar Sync
// Diff-basiert: vergleicht alte vs. neue events und feuert einen einzigen Batch-Request.
//
// Usage in App-deploy.jsx:
//   import { syncEventsDiff, ensureLocalIds, GCAL_WORKER_URL, GCAL_SHARED_SECRET } from "./gcal-sync.js";
//   const saveEvents = useCallback(async (updated) => {
//     const withIds = ensureLocalIds(updated);
//     const oldEvents = prevEventsSnapshot.current || {};
//     prevEventsSnapshot.current = withIds;
//     setEvents(withIds);
//     try { await saveData("events", JSON.stringify(withIds)); } catch {}
//     // Sync in background, Update googleEventIds zurückschreiben
//     syncEventsDiff(oldEvents, withIds).then(patched => {
//       if (patched) { setEvents(patched); saveData("events", JSON.stringify(patched)); }
//     });
//   }, []);

export const GCAL_WORKER_URL = "https://pgm-gcal.wendelin936.workers.dev";
export const GCAL_SHARED_SECRET = "pgm_7a3f8e2d9c4b1a6f5e8d2c9b3a7f4e1d8c5b2a9f6e3d7c4b1a8e5f2d9c6b3a74";

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
  // nur booked + internal, pending/deleted werden NICHT gesynct
  return ev.status === "booked" || ev.status === "internal";
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
// ============================================================
export async function syncEventsDiff(oldEvents, newEvents) {
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

  // DELETE: in old aber nicht in new (oder Status auf deleted/pending)
  for (const [localId, entry] of oldMap) {
    if (!newMap.has(localId)) {
      const gcalId = oldGcalIds.get(localId)?.gcalId;
      if (gcalId) ops.push({ op: "delete", localId, gcalId });
    }
  }
  // Zusätzlich: Soft-delete (Status auf "deleted") & pending-Umstellung
  for (const [dateKey, ev] of Object.entries(newEvents || {})) {
    if (!ev) continue;
    const wasSyncable = shouldSync(oldEvents?.[dateKey]);
    const isSyncable = shouldSync(ev);
    if (wasSyncable && !isSyncable && oldGcalIds.has(ev.localId)) {
      const gcalId = oldGcalIds.get(ev.localId).gcalId;
      if (gcalId && !ops.find(o => o.gcalId === gcalId)) {
        ops.push({ op: "delete", localId: ev.localId, gcalId });
      }
    }
  }

  if (ops.length === 0) return null;

  // Batch-Request
  let results;
  try {
    const res = await fetch(`${GCAL_WORKER_URL}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PGM-Secret": GCAL_SHARED_SECRET },
      body: JSON.stringify({ ops }),
    });
    const data = await res.json();
    if (!data.ok) { console.warn("[gcal sync] batch failed:", data); return null; }
    results = data.results || [];
  } catch (e) {
    console.warn("[gcal sync] network error:", e);
    return null;
  }

  // Patchen: googleEventIds in events-Objekt einsetzen (nur bei CREATE)
  const patched = structuredClone(newEvents);
  let anyPatched = false;
  for (const r of results) {
    if (!r.ok || !r.googleEventId) continue;
    // localId finden in newEvents
    for (const [dk, ev] of Object.entries(patched)) {
      if (!ev) continue;
      if (ev.localId === r.localId) {
        patched[dk] = { ...ev, googleEventId: r.googleEventId };
        anyPatched = true;
        break;
      }
      if (Array.isArray(ev.subEvents)) {
        const idx = ev.subEvents.findIndex(s => s?.localId === r.localId);
        if (idx >= 0) {
          const subs = ev.subEvents.slice();
          subs[idx] = { ...subs[idx], googleEventId: r.googleEventId };
          patched[dk] = { ...ev, subEvents: subs };
          anyPatched = true;
          break;
        }
      }
    }
  }

  return anyPatched ? patched : null;
}
