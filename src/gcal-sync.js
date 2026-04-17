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
  // newGcalIds wird hier bewusst auch als Quelle genutzt, damit ein Event das pending ist
  // aber noch eine gcalId trägt (weil das alte booked war) auch gelöscht wird
  for (const [localId, entry] of oldMap) {
    if (!newMap.has(localId)) {
      const gcalId = oldGcalIds.get(localId)?.gcalId || newGcalIds.get(localId)?.gcalId;
      if (gcalId) ops.push({ op: "delete", localId, gcalId });
    }
  }
  // Zusätzlich: jeder Event der eine gcalId hat, aber jetzt nicht mehr syncable ist → delete
  // Fängt Edge-Cases ab, auch wenn oldEvents fehlerhaft oder leer war
  const allNewWithGcalId = [];
  for (const [dk, ev] of Object.entries(newEvents || {})) {
    if (!ev) continue;
    if (ev.localId && ev.googleEventId && !shouldSync(ev)) allNewWithGcalId.push({ localId: ev.localId, gcalId: ev.googleEventId, dk });
    if (Array.isArray(ev.subEvents)) {
      ev.subEvents.forEach(s => {
        if (s?.localId && s?.googleEventId && !shouldSync(s)) allNewWithGcalId.push({ localId: s.localId, gcalId: s.googleEventId, dk });
      });
    }
  }
  for (const x of allNewWithGcalId) {
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

  // Batch-Request
  let results;
  try {
    const res = await fetch(`${GCAL_WORKER_URL}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PGM-Secret": GCAL_SHARED_SECRET },
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
