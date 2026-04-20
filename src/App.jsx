import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadData, saveData, adminLogin, adminLogout, onAuthChange } from "./firebase.js";
import { syncEventsDiff, ensureLocalIds } from "./gcal-sync.js";

const BRAND = {
  lila: "#903486",
  aubergine: "#58084a",
  aprikot: "#f28c5a",
  sonnengelb: "#ffda6f",
  mintgruen: "#8ec89a",
  tuerkis: "#009a93",
  moosgruen: "#006930",
  tannengruen: "#054432",
  light: "rgba(232,225,234,1)",
  white: "#ffffff",
};

// Design-Theme für Kundenansicht (anpassbar über Admin → "Design anpassen - Kundenansicht")
// Event-Typ-Akzente kommen separat aus eventTypes[i].color
const DEFAULT_THEME = {
  bgColor: "#e8e1eb",       // Hintergrund der Kundenansicht
  headerBg: "#58084a",       // Titelleiste Hintergrund (aubergine)
  headerText: "#ffffff",     // Titelleiste Textfarbe
  footerBg: "#903486",       // Footer Akzent (aus Lila-Tint)
  footerText: "#58084a",     // Footer Textfarbe
  bookBtnBg: "#58084a",      // "Location buchen" Button Hintergrund
  bookBtnText: "#ffffff",    // "Location buchen" Button Textfarbe
};

// Design-Theme für Adminansicht (Kalender-Akzentfarben etc.)
const DEFAULT_ADMIN_THEME = {
  bgColor: "#e8e1eb",       // Hintergrund der Adminansicht
  bookedColor: "#903486",   // Gebuchte Termine (lila)
  pendingColor: "#f28c5a",  // Offene Anfragen (aprikot)
  blockedColor: "#009a93",  // Interne/blockierte Termine (türkis)
  seriesColor: "#009a93",   // Serientermine (türkis)
  todayColor: "#8ec89a",    // Heute-Markierung (mintgrün)
  showHolidaysAdmin: true,     // Feiertage im Admin-Kalender anzeigen
  showHolidaysCustomer: true,  // Feiertage im Kunden-Kalender anzeigen
};

const EMAIL_WORKER_URL = "https://pgm-email.wendelin936.workers.dev";
const GROUP_TOUR_NOTIFY_EMAIL = "astridmattuschka@gmail.com";

// Schickt eine separate Benachrichtigung an Astrid, wenn eine Gruppenführung bestätigt oder direkt als "booked" angelegt wird.
// Wird aufgerufen aus:
//   - handleAdminAction(..., "confirm", ...) wenn der bestätigte Eintrag eine Gruppenführung ist
//   - handleAdminSave beim Neuanlegen/Bestätigen einer Gruppenführung (type="booked" + eventType="gruppenfuehrung")
function notifyGroupTour(dateKey, ev, subIndex = -1) {
  try {
    const [yy,mm,dd] = dateKey.split("-").map(Number);
    const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(yy,mm-1,dd).getDay()];
    const payload = {
      notifyTo: GROUP_TOUR_NOTIFY_EMAIL,
      kind: "confirmed_group_tour",
      date: `${dayName}, ${dd}.${mm}.${yy}`,
      type: "Gruppenbesuch",
      name: ev.groupName || ev.name || "",
      contactName: ev.contactName || "",
      contactPhone: ev.contactPhone || "",
      email: ev.email || "",
      phone: ev.phone || "",
      guests: ev.guests || "",
      slot: ev.slotLabel || (ev.startTime && ev.endTime ? `${ev.startTime} – ${ev.endTime}` : ""),
      message: ev.message || "",
      adminNote: ev.adminNote || "",
      tourGuide: !!ev.tourGuide,
      cakeCount: ev.cakeCount || 0,
      coffeeCount: ev.coffeeCount || 0,
      // Für View-Token: Kontext zum Auffinden des Termins
      dateKey: dateKey,
      subIndex: subIndex,
    };
    fetch(EMAIL_WORKER_URL, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {}
}

// Dokumente — Pfade anpassen für Deployment (z.B. "/assets/Getraenke.pdf")
const DOCS = {
  getraenke: "/assets/Getraenke_Kuchenkarte.pdf",
  weinkarte: "/assets/Weinkarte.pdf",
  flyer: "/assets/Paradiesgarten_Flyer.pdf",
};

const PGM_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAABgBAMAAACJTrO+AAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAHlBMVEX////z8/P8/Pz6+vr+/v7w8PD5+fn9/f34+Pj19fWmxctuAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAHdElNRQfqBAwLFxow6RkxAAADuElEQVRYw62YO2/bMBCAST8SZmNToc2YACrQ0QHczpHE2OomNB06enD3BsgPUAEN6ZbBP7i845t60UAJRHYofrw73oOkCflvjZ85fsHPJLb8y1njl4J/PWf8eiv48RydroUEHtPH0xcAqnQgExLoRJs6ngkFFKlAp4F9kzb+QmhAbFKX1AB1EvARx4sGFGtTLTZAkWqxbNr02fHvhQFO8Hye9bEIgVkRnQMy/KgTFbLA9EJdiT5Q8SSFHCC+TWYBtLsPLz4wrpR2WdkQ2vlAOaIUVTGEEbfwgbGV0gbs4PtKlB4g7qdWFDVelTc+MGTGVSA+q1Et23Z94BjMlRV+lMDKjayosa97kA9Rvf7NR5QySSDe5MwAwHsY1I0oZfohYf7IvxyWHiK1G1ZqaXrlkCVAguiHFyye+9a5E0BzUB8VqELAi6nvumvPoehJgGIu17oGevbpljs1GYYGBSmkiIAitkCrINeGHaD/IQKsFUbPjWIlcIGvNjHwGPpgBxbrlcIXbQxUrrZrX2Za8AW+4DGg3b21QaFkgdBgp4jMZo7uDPDOAqsAKKHr0gp4soryEQB16oxXYGPT8ToKPFivFVbdMIEjoLZpwq0txQzAzKhuELjs2bDUUfcUuVO3RSyA/IAvn5SPrV2ENkNAyWmLpsqVPNneW3QOD3ZUq5BMXVD94HIa/gFbh4BaDtsAsHNFxsRLxuPqgCV2K+VjAjzFedVxHX3MnykTKKE2PvayRD1bHyjQZQcCZ5ZTnFZUmAyygNyI1E6f1b5YFayyh+scZU4hdcYh2ZtvsY7ghZLz6Gp0oTy1h8L4XvTSMEPgylVkqVBmCmZgsQ7WDgHmgFaLKqKd0wA5AgsL2NjEoi56aUuVN1YGqBrj8ZaQ0GQFMAXYXaW1sdmvCyh0qZNXA8/20FUHpV6132oOALYSWOO6MT+SaQhsbIElWOCFvw/xYDt0Zm3xg6IGoNAy3LZ61ZAKDzAVd6AYW6lMAQyB1puRR1u03eV8wJuwHqwMjapFHnD014P01qlVBeFgAZuNZTNY02s1JQJhbBbDRz151IHnZ0gYCPXT0D4dRuyrDhHWD7L+UcOPqagzPMdls0AxdoIeAXoHxesZYDN5xu0Du+lTtMoLNn1IjKqNzBUWVYYZpW59mcNHY3ocA+7Hbif5MFDPXrAioCUphAPupq4oN31g5hJ0EwP7uWvWzwj4ReYaM8FDB4J0mHhxQNp1F+82CFScpBEdVAEq9i1JbOsOJSSPh9iVEs4ZP/7jzz+7xEeN3Xr2xgAAAB50RVh0aWNjOmNvcHlyaWdodABHb29nbGUgSW5jLiAyMDE2rAszOAAAABR0RVh0aWNjOmRlc2NyaXB0aW9uAHNSR0K6kHMHAAAAAElFTkSuQmCC";

const DEFAULT_TYPES = [
  { id:"hochzeit", label:"Hochzeit", halfDay:1500, fullDay:2500, color:BRAND.lila, desc:"Ihre Traumhochzeit in paradiesischer Kulisse", detail:"Romantische Location mit Glashaus, Terrasse und historischen Gartenräumen – für den schönsten Tag Ihres Lebens.", tags:["Trauungen","Glashaus","bis 80 Gäste"], exclusiveNote:"120 m² Paradiesgarten Glashaus mitten in 15 000 m² Blütenmeer — ganz allein für Ihre Hochzeit." },
  { id:"firmenfeier", label:"Firmenfeier", halfDay:700, fullDay:1200, color:BRAND.tuerkis, desc:"Professionelles Ambiente für Ihr Firmenevent", detail:"Inspirieren Sie Ihr Team in außergewöhnlicher Atmosphäre – ideal für Kundenabende, Sommerfeste oder Jubiläen.", tags:["Teamevents","Empfänge","Jubiläen"] },
  { id:"geburtstag", label:"Geburtstagsfeier", halfDay:500, fullDay:800, color:BRAND.aprikot, desc:"Feiern Sie Ihren besonderen Tag bei uns", detail:"Ob runder Geburtstag oder entspannte Gartenparty – Ihr Fest mit Freunden und Familie wird unvergesslich.", tags:["Jubiläen","Gartenparty","familiär"] },
  { id:"seminar", label:"Seminar / Workshop", halfDay:350, fullDay:600, color:BRAND.mintgruen, desc:"Inspirierende Räume für Ihr Event", detail:"Klare Gedanken in grüner Umgebung – der perfekte Rahmen für Workshops, Schulungen oder Klausurtage im Grünen.", tags:["Workshops","Klausurtage","Seminare"] },
  { id:"gruppenfuehrung", label:"Gruppenbesuch", halfDay:0, fullDay:0, color:BRAND.moosgruen, desc:"Garten erleben mit allen Sinnen", detail:"Entdecken Sie mit unseren Experten seltene Pflanzen, historische Beete und das Paradiesglashaus – inkl. Café.", tags:["Führung","Café & Kuchen","ab 10 Pers."], isGroupTour:true, pricePerPerson:9, minPersons:10, guideCost:80, maxPerTour:20, coffeePrice:3.10, cakePrice:4.50 },
  { id:"sonstiges", label:"Sonstiges", halfDay:0, fullDay:0, color:"#420045", desc:"Individuelle Events nach Ihren Wünschen", detail:"Fotoshootings, Präsentationen, Filmaufnahmen – sprechen Sie mit uns, wir finden gemeinsam die passende Lösung.", tags:["Fotoshoots","Filmdrehs","individuell"] },
];

const MONTHS = ["Jänner","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DAYS_H = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const fmt = (n) => n === 0 ? "auf Anfrage" : `€ ${n.toLocaleString("de-AT")}`;
const fmtDate = (key) => { const [y,m,d] = key.split("-").map(Number); const dt = new Date(y,m-1,d); const dn = ["So","Mo","Di","Mi","Do","Fr","Sa"][dt.getDay()]; return `${dn}, ${d}. ${MONTHS[m-1]} ${y}`; };
const fmtDateAT = (key) => { const [y,m,d] = key.split("-").map(Number); return `${String(d).padStart(2,"0")}.${String(m).padStart(2,"0")}.${y}`; };

// Österreichische Feiertage (fix + Ostern-basiert)
function getEaster(y) {
  const a=y%19, b=Math.floor(y/100), c=y%100, d=Math.floor(b/4), e=b%4;
  const f=Math.floor((b+8)/25), g=Math.floor((b-f+1)/3), h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4), k=c%4, l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451), month=Math.floor((h+l-7*m+114)/31), day=((h+l-7*m+114)%31)+1;
  return new Date(y, month-1, day);
}
function getHolidays(y) {
  const e = getEaster(y);
  const add = (d, n) => { const r = new Date(d); r.setDate(r.getDate()+n); return r; };
  const k = (d) => dateKey(d.getFullYear(), d.getMonth(), d.getDate());
  return {
    [k(new Date(y,0,1))]: "Neujahr",
    [k(new Date(y,0,6))]: "Hl. Drei Könige",
    [k(add(e,-2))]: "Karfreitag",
    [k(e)]: "Ostersonntag",
    [k(add(e,1))]: "Ostermontag",
    [k(new Date(y,4,1))]: "Staatsfeiertag",
    [k(add(e,39))]: "Christi Himmelfahrt",
    [k(add(e,49))]: "Pfingstsonntag",
    [k(add(e,50))]: "Pfingstmontag",
    [k(add(e,60))]: "Fronleichnam",
    [k(new Date(y,7,15))]: "Mariä Himmelfahrt",
    [k(new Date(y,9,26))]: "Nationalfeiertag",
    [k(new Date(y,10,1))]: "Allerheiligen",
    [k(new Date(y,11,8))]: "Mariä Empfängnis",
    [k(new Date(y,11,25))]: "Weihnachten",
    [k(new Date(y,11,26))]: "Stefanitag",
  };
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  let startDay = first.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= lastDay; d++) days.push(d);
  return days;
}

function dateKey(y, m, d) { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }

function StatusDot({ status }) {
  const colors = { booked: BRAND.lila, blocked: "#009a93", pending: BRAND.aprikot };
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: colors[status] || "transparent", marginRight: 4 }} />;
}

function ClockIcon({ size=12, color="#999" }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display:"inline-block", verticalAlign:"-2px", marginRight:3 }}><circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5"/><path d="M8 4.5V8l2.5 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// ============================================================
// Color Picker
// ============================================================
function hexToHsv(hex) {
  const h = (hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6);
  const r = parseInt(h.substr(0, 2), 16) / 255;
  const g = parseInt(h.substr(2, 2), 16) / 255;
  const b = parseInt(h.substr(4, 2), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) hue = ((b - r) / d + 2) * 60;
    else hue = ((r - g) / d + 4) * 60;
  }
  return { h: hue, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}
function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function ColorPicker({ value, onChange }) {
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const lastExternalRef = useRef(value);

  // Sync HSV wenn value extern geändert wird (Reset, Hex-Input)
  useEffect(() => {
    if (value !== lastExternalRef.current) {
      lastExternalRef.current = value;
      const next = hexToHsv(value);
      // Nur übernehmen wenn die Farbe materially anders ist
      const cur = hsvToHex(hsv.h, hsv.s, hsv.v);
      if (cur.toLowerCase() !== (value || "").toLowerCase()) setHsv(next);
    }
  }, [value]);

  const updateSV = (clientX, clientY) => {
    const r = svRef.current.getBoundingClientRect();
    const s = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
    const v = Math.max(0, Math.min(100, (1 - (clientY - r.top) / r.height) * 100));
    const next = { ...hsv, s, v };
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    lastExternalRef.current = hex;
    onChange(hex);
  };
  const updateHue = (clientX) => {
    const r = hueRef.current.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((clientX - r.left) / r.width) * 360));
    const next = { ...hsv, h };
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    lastExternalRef.current = hex;
    onChange(hex);
  };

  const pointerHandlers = (update, isHue) => ({
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (isHue) update(e.clientX); else update(e.clientX, e.clientY);
    },
    onPointerMove: (e) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        if (isHue) update(e.clientX); else update(e.clientX, e.clientY);
      }
    },
    onPointerUp: (e) => e.currentTarget.releasePointerCapture(e.pointerId),
  });

  const pureHue = hsvToHex(hsv.h, 100, 100);

  return (
    <div style={{ padding:12, background:"#fff", borderRadius:10, border:"1px solid #ede8ed", marginTop:8 }}>
      {/* Saturation/Value 2D field */}
      <div ref={svRef} {...pointerHandlers(updateSV, false)}
        style={{
          position:"relative", width:"100%", height:140, borderRadius:8, cursor:"crosshair",
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${pureHue})`,
          touchAction:"none", userSelect:"none",
        }}>
        <div style={{
          position:"absolute",
          left:`calc(${hsv.s}% - 8px)`, top:`calc(${100 - hsv.v}% - 8px)`,
          width:16, height:16, borderRadius:"50%", border:"2px solid #fff",
          boxShadow:"0 0 0 1px rgba(0,0,0,0.3)", pointerEvents:"none",
        }} />
      </div>
      {/* Hue slider */}
      <div ref={hueRef} {...pointerHandlers(updateHue, true)}
        style={{
          position:"relative", width:"100%", height:14, borderRadius:7, marginTop:10, cursor:"pointer",
          background:"linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
          touchAction:"none", userSelect:"none",
        }}>
        <div style={{
          position:"absolute", left:`calc(${(hsv.h / 360) * 100}% - 7px)`, top:-2,
          width:14, height:18, borderRadius:4, background:"#fff",
          boxShadow:"0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.15)", pointerEvents:"none",
        }} />
      </div>
    </div>
  );
}

function SwipeRow({ children, onSwipeRight, onSwipeLeft, rightLabel="✓", leftLabel="✕", rightColor=BRAND.mintgruen, leftColor="#e0d5df" }) {
  const containerRef = useRef(null);
  const rowRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontal = useRef(null);
  const [dismissed, setDismissed] = useState(false);
  const threshold = 80;

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const onStart = (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      currentX.current = 0;
      isHorizontal.current = null;
      el.style.transition = "none";
    };

    const onMove = (e) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      // Decide direction once after 8px movement
      if (isHorizontal.current === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        isHorizontal.current = Math.abs(dx) > Math.abs(dy);
      }
      if (!isHorizontal.current) return;

      // Block disallowed directions
      if (!onSwipeRight && dx > 0) return;
      if (!onSwipeLeft && dx < 0) return;

      e.preventDefault();
      // Dampen past threshold
      const abs = Math.abs(dx);
      const clamped = abs <= threshold ? dx : (dx > 0 ? 1 : -1) * (threshold + (abs - threshold) * 0.25);
      currentX.current = clamped;
      el.style.transform = `translateX(${clamped}px)`;
    };

    const onEnd = () => {
      if (isHorizontal.current !== true) return;
      el.style.transition = "transform .3s cubic-bezier(.32,.72,0,1)";
      const d = currentX.current;
      if (d > threshold && onSwipeRight) {
        el.style.transform = "translateX(105%)";
        setDismissed(true);
        setTimeout(() => onSwipeRight(), 300);
      } else if (d < -threshold && onSwipeLeft) {
        el.style.transform = "translateX(-105%)";
        setDismissed(true);
        setTimeout(() => onSwipeLeft(), 300);
      } else {
        el.style.transform = "translateX(0)";
      }
      currentX.current = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [onSwipeRight, onSwipeLeft]);

  if (dismissed) return null;

  return (
    <div ref={containerRef} style={{ position:"relative", overflow:"hidden", borderRadius:10, marginBottom:5 }}>
      {onSwipeRight && (
        <div style={{ position:"absolute", inset:0, background:rightColor, display:"flex", alignItems:"center", justifyContent:"flex-start", padding:"0 22px" }}>
          <span style={{ color:"#fff", fontWeight:700, fontSize:15, letterSpacing:0.5 }}>{rightLabel}</span>
        </div>
      )}
      {onSwipeLeft && (
        <div style={{ position:"absolute", inset:0, background:leftColor, display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 22px" }}>
          <span style={{ color:"#888", fontWeight:500, fontSize:14, letterSpacing:0.5 }}>{leftLabel}</span>
        </div>
      )}
      <div ref={rowRef} style={{ position:"relative", zIndex:1, willChange:"transform" }}>
        {children}
      </div>
    </div>
  );
}

function SwipeNum({ value, onUp, onDown, color=BRAND.aubergine, size=16, ghost=false }) {
  const ref = useRef(null);
  const startY = useRef(0);
  const accumulated = useRef(0);
  const onUpRef = useRef(onUp);
  const onDownRef = useRef(onDown);
  onUpRef.current = onUp;
  onDownRef.current = onDown;
  const step = ghost ? 40 : 28;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onStart = (e) => { startY.current = e.touches[0].clientY; accumulated.current = 0; };
    const onMove = (e) => {
      e.preventDefault();
      const dy = startY.current - e.touches[0].clientY;
      const steps = Math.floor((dy - accumulated.current) / step);
      if (steps !== 0) {
        accumulated.current += steps * step;
        for (let i = 0; i < Math.abs(steps); i++) { steps > 0 ? onUpRef.current() : onDownRef.current(); }
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); };
  }, []);

  return (
    <span ref={ref} onClick={onUp} style={{ fontSize:size, fontWeight: ghost ? 300 : 500, color, fontVariantNumeric:"tabular-nums", minWidth: size * 1.4, textAlign:"center", userSelect:"none", touchAction:"none", cursor:"ns-resize", display:"block", lineHeight: ghost ? 1.6 : 1.2, opacity: ghost ? 0.5 : 1 }}>
      {value}
    </span>
  );
}

function ChecklistNote({ items=[], onChange, editable=true, reminders={}, onReminderClick=null }) {
  if (!items || !items.length) return null;
  const BRAND_MOOS = "#006930";
  return (
    <div>
      {items.map((item, i) => {
        const itemKey = item.id || `idx-${i}`;
        const rem = reminders[itemKey];
        const hasRem = !!rem?.enabled;
        return (
        <div key={itemKey} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
          <div onClick={editable ? () => { const u=[...items]; u[i]={...u[i],done:!u[i].done}; onChange(u); } : undefined}
            style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${item.done ? BRAND.lila : "#ccc"}`, background: item.done ? BRAND.lila : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor: editable ? "pointer" : "default" }}>
            {item.done && <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:12, color: item.done ? "#aaa" : "#555", textDecoration: item.done ? "line-through" : "none", flex:1 }}>{item.text}</span>
          {editable && onReminderClick && (
            <button onClick={(e) => { e.stopPropagation(); onReminderClick(itemKey); }}
              title={hasRem ? "Erinnerung aktiv" : "Erinnerung setzen"}
              style={{ background: hasRem ? BRAND_MOOS : "transparent", border: hasRem ? "none" : "1px solid #d5cbd2", borderRadius:"50%", width:20, height:20, padding:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke={hasRem ? "#fff" : "#999"} strokeWidth="1.3"/>
                <path d="M8 4.5V8l2 1.5" stroke={hasRem ? "#fff" : "#999"} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          {editable && <button onClick={() => { const u=items.filter((_,j)=>j!==i); onChange(u); }}
            style={{ background:"none", border:"none", color:"#ccc", fontSize:14, cursor:"pointer", padding:"0 4px", flexShrink:0 }}>✕</button>}
        </div>
        );
      })}
    </div>
  );
}

function TimeField({ val, onInc, onDec, onSet, color, max, noClick }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); e.deltaY < 0 ? onInc() : onDec(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  const commit = () => { const n = parseInt(draft, 10); if (!isNaN(n) && n >= 0 && n <= max && onSet) onSet(n); setEditing(false); };
  const arrowBtn = { background:"none", border:"none", cursor:"pointer", padding:0, lineHeight:1, display:"flex", alignItems:"center", justifyContent:"center", width:24, height:8, opacity: hover ? 1 : 0, transition:"opacity .15s" };

  return (
    <div ref={ref} style={{ display:"flex", flexDirection:"column", alignItems:"center", touchAction:"none", gap:0 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!noClick && <button onClick={onInc} style={arrowBtn}><svg width="8" height="4" viewBox="0 0 10 5"><path d="M1 4l4-3L9 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/></svg></button>}
      {editing && !noClick ? (
        <input autoFocus value={draft} onChange={e => setDraft(e.target.value.replace(/\D/g,"").slice(0,2))}
          onBlur={commit} onKeyDown={e => { if(e.key==="Enter") commit(); if(e.key==="Escape") setEditing(false); }}
          style={{ width:24, fontSize:15, fontWeight:500, color, textAlign:"center", border:"none", borderBottom:`2px solid ${color}`, background:"transparent", outline:"none", padding:0, fontFamily:"inherit", fontVariantNumeric:"tabular-nums" }} />
      ) : (
        <span onClick={noClick ? undefined : () => { setDraft(String(val).padStart(2,"0")); setEditing(true); }}
          style={{ fontSize:15, fontWeight:500, color, fontVariantNumeric:"tabular-nums", cursor: noClick ? "pointer" : "text", userSelect:"none", minWidth:24, textAlign:"center", lineHeight:1 }}>
          {String(val).padStart(2,"0")}
        </span>
      )}
      {!noClick && <button onClick={onDec} style={arrowBtn}><svg width="8" height="4" viewBox="0 0 10 5"><path d="M1 1l4 3L9 1" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"/></svg></button>}
    </div>
  );
}

function DrumColumn({ val, items, onChange, color, padLen=2 }) {
  const containerRef = useRef(null);
  const itemH = 36;
  const isScrolling = useRef(false);
  const [scrollPos, setScrollPos] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrolling.current) return;
    const idx = items.indexOf(val);
    if (idx >= 0) { el.scrollTop = idx * itemH; setScrollPos(idx * itemH); }
  }, [val, items]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    isScrolling.current = true;
    setScrollPos(el.scrollTop);
    clearTimeout(el._snapTimer);
    el._snapTimer = setTimeout(() => {
      const idx = Math.round(el.scrollTop / itemH);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      if (items[clamped] !== val) onChange(items[clamped]);
      isScrolling.current = false;
    }, 80);
  };

  const centerIdx = scrollPos / itemH;

  return (
    <div style={{ position:"relative", height: itemH * 5, width:56, overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height: itemH * 2, background:"linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))", pointerEvents:"none", zIndex:2 }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height: itemH * 2, background:"linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))", pointerEvents:"none", zIndex:2 }} />
      <div ref={containerRef} onScroll={handleScroll}
        style={{ height:"100%", overflowY:"scroll", scrollSnapType:"y mandatory", WebkitOverflowScrolling:"touch", scrollbarWidth:"none", msOverflowStyle:"none", paddingTop: itemH * 2, paddingBottom: itemH * 2 }}>
        <style>{`div::-webkit-scrollbar { display: none; }`}</style>
        {items.map((item, i) => {
          const dist = Math.abs(i - centerIdx);
          const t = Math.max(0, 1 - dist);
          const sz = 18 + t * 10;
          const fw = t > 0.5 ? 600 : 300;
          const op = Math.max(0.3, 1 - dist * 0.35);
          return (
            <div key={i} style={{ height:itemH, display:"flex", alignItems:"center", justifyContent:"center", scrollSnapAlign:"center",
              fontSize:sz, fontWeight:fw, color, opacity:op,
              fontVariantNumeric:"tabular-nums", userSelect:"none" }}>
              {String(item).padStart(padLen,"0")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeInput({ value, onChange, accentColor=BRAND.aubergine }) {
  const [h,m] = (value||"08:00").split(":").map(Number);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pH, setPH] = useState(h);
  const [pM, setPM] = useState(m);
  const [minHint, setMinHint] = useState(false);
  const hintCount = useRef(0);
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const set = (nh,nm) => onChange(String(((nh%24)+24)%24).padStart(2,"0")+":"+String(((nm%60)+60)%60).padStart(2,"0"));
  const roundMin = (v) => { const r = v < 15 ? 0 : v < 45 ? 30 : 0; if (v !== 0 && v !== 30) { hintCount.current++; if (hintCount.current >= 2) setMinHint(true); } return r; };
  const hours = Array.from({length:24},(_,i)=>i);
  const minutes = [0,30];

  return (
    <div>
      <div style={{ display:"inline-flex", alignItems:"center" }}>
        <div onClick={isTouch ? () => { setPH(h); setPM(m); setPickerOpen(true); } : undefined}
          style={{ display:"inline-flex", alignItems:"center", gap:0, background:"#fff", border:`1.5px solid ${accentColor}20`, borderRadius:6, padding:"3px 10px", touchAction:"none", cursor: isTouch ? "pointer" : "default" }}>
          <TimeField val={h} onInc={() => set(h+1,m)} onDec={() => set(h-1,m)} onSet={v => set(v,m)} color={accentColor} max={23} noClick={isTouch} />
          <span style={{ fontSize:15, color:"#ccc", margin:"0 1px", fontWeight:300 }}>:</span>
          <TimeField val={m} onInc={() => set(h,m===0?30:0)} onDec={() => set(h,m===0?30:0)} onSet={v => set(h,roundMin(v))} color={accentColor} max={59} noClick={isTouch} />
          <span style={{ fontSize:9, color:"#bbb", marginLeft:6, userSelect:"none" }}>Uhr</span>
        </div>
      </div>
      {minHint && <div style={{ fontSize:10, color:"#999", marginTop:3 }}>Zeiten in 30-Minuten-Schritten (00 / 30)</div>}
      {pickerOpen && (
        <div onClick={() => setPickerOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 16px 48px rgba(0,0,0,0.2)", textAlign:"center", minWidth:200 }}>
            <div style={{ fontSize:12, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Uhrzeit wählen</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4, position:"relative", padding:"8px 0" }}>
              <DrumColumn val={pH} items={hours} onChange={setPH} color={accentColor} />
              <span style={{ fontSize:28, color:"#ccc", fontWeight:300 }}>:</span>
              <DrumColumn val={pM} items={minutes} onChange={setPM} color={accentColor} />
            </div>
            <button onClick={() => { set(pH, pM); setPickerOpen(false); }}
              style={{ marginTop:12, background:accentColor, color:"#fff", border:"none", borderRadius:8, padding:"10px 32px", fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:0.5 }}>Übernehmen</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, min=0, max=100, color=BRAND.moosgruen, label, icon, style={} }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(Number(value)||min);
  const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  const v = Number(value) || 0;
  const items = Array.from({length: max - min + 1}, (_, i) => min + i);
  return (
    <>
      {isTouch ? (
        <div onClick={() => { setDraft(v || min); setOpen(true); }}
          style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:`1.5px solid ${color}20`, borderRadius:6, padding:"8px 12px", cursor:"pointer", minHeight:36, ...style }}>
          {icon}
          {v > 0 ? (
            <span style={{ fontSize:15, fontWeight:500, color, fontVariantNumeric:"tabular-nums" }}>{v}</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/></svg>
          )}
        </div>
      ) : (
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#fff", border:`1.5px solid ${color}20`, borderRadius:6, padding:"5px 10px", minHeight:36, ...style }}>
          {icon}
          <input type="number" min={min} max={max} placeholder={placeholder||""} value={value} onChange={e => onChange(e.target.value)}
            style={{ width:50, fontSize:15, fontWeight:500, color, border:"none", outline:"none", background:"transparent", fontFamily:"inherit", fontVariantNumeric:"tabular-nums", padding:"2px 0" }} />
        </div>
      )}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 16px 48px rgba(0,0,0,0.2)", textAlign:"center", minWidth:140 }}>
            {label && <div style={{ fontSize:12, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>{label}</div>}
            <div style={{ display:"flex", justifyContent:"center" }}>
              <DrumColumn val={draft} items={items} onChange={setDraft} color={color} padLen={1} />
            </div>
            <button onClick={() => { onChange(String(draft)); setOpen(false); }}
              style={{ marginTop:12, background:color, color:"#fff", border:"none", borderRadius:8, padding:"10px 32px", fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:0.5 }}>Übernehmen</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [events, setEvents] = useState({});
  const [eventTypes, setEventTypes] = useState(DEFAULT_TYPES);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [fromCalendar, setFromCalendar] = useState(false);
  const [modalView, setModalView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name:"", email:"", phone:"", type:"hochzeit", slot:"halfDayAM", guests:"", message:"", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:8, tourMin:0, tourEndHour:13, tourEndMin:0, contactName:"" });
  const [adminForm, setAdminForm] = useState({ type:"booked", label:"", note:"", startTime:"08:00", endTime:"22:00", adminNote:"", allDay:false, checklist:[], contactName:"", contactPhone:"", contactAddress:"", publicText:"", isPublic:false, isSeries:false, seriesDates:[], seriesId:"", editAllSeries:false, guests:"", tourGuide:false, cakeCount:0, coffeeCount:0, price:"", paymentStatus:"open", partialAmount:"", cleaningFee:false, reminders:{ checklist:null, items:{} } });
  // reminderPopup: { type: "checklist" | "item", itemKey?: string (item-id) }
  const [reminderPopup, setReminderPopup] = useState(null);
  const [editingSubIndex, setEditingSubIndex] = useState(-1); // -1 = Main-Event, sonst Index im subEvents-Array
  const [typeSelectExpanded, setTypeSelectExpanded] = useState(false); // Event-Typ-Auswahl im Admin-Modal auf-/zuklappbar
  const [statusCollapsed, setStatusCollapsed] = useState(true); // Status-Buttons (Gebucht/Anfrage/Intern) eingeklappt?
  const [timeCollapsed, setTimeCollapsed] = useState(true); // Zeit + Ganztägig eingeklappt?
  const [chipPopup, setChipPopup] = useState(null); // null | "status" | "date" | "time" | "type"
  const [datePopupMonth, setDatePopupMonth] = useState(null);
  const [datePopupYear, setDatePopupYear] = useState(null);
  // Read-only view (für Astrid: von der Bestätigungsmail verlinkt)
  const [readOnlyView, setReadOnlyView] = useState(null); // {dateKey, subIndex} | null
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);
  const toastTimer = useRef(null);
  const prevEvents = useRef(null);
  const lastSyncedEvents = useRef({});
  const backdropMouseDown = useRef(false);

  const showToast = (msg, detail, undoable=false, actionColor=null) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastKey(k => k + 1);
    setToast({ msg, detail, undoable, actionColor });
    toastTimer.current = setTimeout(() => { setToast(null); prevEvents.current = null; }, 8000);
  };

  const handleUndo = () => {
    if (prevEvents.current) {
      saveEvents(prevEvents.current);
      prevEvents.current = null;
      setToast(null);
    }
  };


  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [adminSubmitAttempted, setAdminSubmitAttempted] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  const [winH, setWinH] = useState(typeof window !== "undefined" ? window.innerHeight : 800);
  useEffect(() => { const h = () => { setWinW(window.innerWidth); setWinH(window.innerHeight); }; window.addEventListener("resize",h); return () => window.removeEventListener("resize",h); }, []);

  // Auto-adjust end time if same as or before start time
  useEffect(() => {
    if (!adminForm.startTime || !adminForm.endTime || adminForm.allDay) return;
    if (adminForm.endTime <= adminForm.startTime) {
      const [sh,sm] = adminForm.startTime.split(":").map(Number);
      const nh = Math.min(23, sh + 1);
      setAdminForm(f => ({...f, endTime: String(nh).padStart(2,"0")+":"+String(sm).padStart(2,"0")}));
    }
  }, [adminForm.startTime, adminForm.endTime, adminForm.allDay]);

  useEffect(() => {
    const sh = Number(formData.tourHour)||0, sm = Number(formData.tourMin)||0;
    const eh = Number(formData.tourEndHour)||0, em = Number(formData.tourEndMin)||0;
    if (eh * 60 + em <= sh * 60 + sm) {
      const nh = Math.min(23, sh + 1);
      setFormData(f => ({...f, tourEndHour: nh, tourEndMin: sm}));
    }
  }, [formData.tourHour, formData.tourMin, formData.tourEndHour, formData.tourEndMin]);

  // Prevent zoom on mobile
  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
    else { meta = document.createElement("meta"); meta.name = "viewport"; meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"; document.head.appendChild(meta); }
  }, []);

  const SEED_EVENTS = {};
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [editingType, setEditingType] = useState(null);
  const [editingTime, setEditingTime] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showPrices, setShowPrices] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const [showDesignAdmin, setShowDesignAdmin] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backupsIndex, setBackupsIndex] = useState([]);
  const [openedBackup, setOpenedBackup] = useState(null); // { date, events }
  const [siteTheme, setSiteTheme] = useState(DEFAULT_THEME);
  const [adminTheme, setAdminTheme] = useState(DEFAULT_ADMIN_THEME);
  const [designDraftTypes, setDesignDraftTypes] = useState(null);
  const [designDraftTheme, setDesignDraftTheme] = useState(null);
  const [designDraftAdmin, setDesignDraftAdmin] = useState(null);
  const [openPicker, setOpenPicker] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showInternal, setShowInternal] = useState(true);
  const [showSeries, setShowSeries] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [modalPull, setModalPull] = useState(0);
  const [editingField, setEditingField] = useState(null);
  const [editFieldVal, setEditFieldVal] = useState("");
  const [seriesMonth, setSeriesMonth] = useState(null);
  const [seriesYear, setSeriesYear] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);
  const heroImages = ["/assets/garten-hintergrund.jpg","/assets/garten-hintergrund1.jpg","/assets/garten-hintergrund2.jpg","/assets/garten-hintergrund3.jpg","/assets/garten-hintergrund4.jpg","/assets/garten-hintergrund5.jpg","/assets/garten-hintergrund6.jpg"];
  useEffect(() => { const img = new Image(); img.src = "/assets/garten-Anfrage-gesendet.jpg"; }, []);
  useEffect(() => { if (isAdmin) return; const t = setInterval(() => setHeroIdx(i => (i+1) % 7), 10000); return () => clearInterval(t); }, [isAdmin]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalView || editingType) {
      const sy = window.scrollY;
      document.body.dataset.lockedScroll = sy;
      document.body.style.position = "fixed";
      document.body.style.top = `-${sy}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.overflow = "hidden";
    } else if (document.body.style.position === "fixed") {
      const sy = parseInt(document.body.dataset.lockedScroll || "0");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, sy);
    }
    return () => {
      if (document.body.style.position === "fixed") {
        const sy = parseInt(document.body.dataset.lockedScroll || "0");
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.left = "";
        document.body.style.right = "";
        document.body.style.overflow = "";
        window.scrollTo(0, sy);
      }
    };
  }, [modalView, editingType, loginModal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantsAdmin = params.get("admin") === "1";
    const viewTok = params.get("view");
    const unsub = onAuthChange(user => {
      setLoggedIn(!!user);
      if (user) { setIsAdmin(true); }
      else if (wantsAdmin) { setLoginModal(true); }
    });
    if (wantsAdmin) {
      const url = new URL(window.location.href);
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", url.toString());
    }
    // Read-only View-Token vom Worker verifizieren (z.B. Astrid über Bestätigungsmail)
    if (viewTok) {
      const EMAIL_VERIFY_URL = EMAIL_WORKER_URL.replace(/\/$/, "") + "/verify";
      fetch(`${EMAIL_VERIFY_URL}?token=${encodeURIComponent(viewTok)}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.ok && d.dateKey) {
            setReadOnlyView({ dateKey: d.dateKey, subIndex: typeof d.subIndex === "number" ? d.subIndex : -1 });
          }
        })
        .catch(() => {});
      // URL säubern
      const url = new URL(window.location.href);
      url.searchParams.delete("view");
      window.history.replaceState({}, "", url.toString());
    }
    return unsub;
  }, []);
  useEffect(() => { (async () => { try { const evData = await loadData("events"); if (evData) { const parsed = JSON.parse(evData); const hydrated = ensureLocalIds(parsed); setEvents(hydrated); lastSyncedEvents.current = hydrated; if (JSON.stringify(hydrated) !== JSON.stringify(parsed)) { try { await saveData("events", JSON.stringify(hydrated)); } catch {} } } else { setEvents(SEED_EVENTS); lastSyncedEvents.current = SEED_EVENTS; try { await saveData("events", JSON.stringify(SEED_EVENTS)); } catch {} } } catch { setEvents(SEED_EVENTS); lastSyncedEvents.current = SEED_EVENTS; } try { const tyData = await loadData("types"); if (tyData) { const saved = JSON.parse(tyData); const merged = DEFAULT_TYPES.map(d => { const s = saved.find(x => x.id === d.id); const m = s ? { ...d, ...s } : d; if (m.id === "gruppenfuehrung" && m.label === "Gruppenführung") m.label = "Gruppenbesuch"; return m; }); setEventTypes(merged); /* Falls Migration stattgefunden hat, zurück in Firestore speichern */ if (JSON.stringify(merged.map(({id,label,coffeePrice,cakePrice})=>({id,label,coffeePrice,cakePrice}))) !== JSON.stringify(saved.map(({id,label,coffeePrice,cakePrice})=>({id,label,coffeePrice,cakePrice})))) { try { await saveData("types", JSON.stringify(merged)); } catch {} } } } catch {} try { const thData = await loadData("theme"); if (thData) { const saved = JSON.parse(thData); setSiteTheme({ ...DEFAULT_THEME, ...saved }); } } catch {} try { const atData = await loadData("adminTheme"); if (atData) { const saved = JSON.parse(atData); setAdminTheme({ ...DEFAULT_ADMIN_THEME, ...saved }); } } catch {} try { const biData = await loadData("backups-index"); if (biData) { setBackupsIndex(JSON.parse(biData)); } } catch {} setLoading(false); })(); }, []);
  const saveEvents = useCallback(async (updated, opts = {}) => {
    // SCHUTZ: Nie ein leeres oder fast-leeres Events-Objekt speichern, wenn vorher viele Events da waren.
    // Das verhindert versehentlichen Totalverlust durch Race-Conditions oder State-Bugs.
    // Mit opts.force=true lässt sich der Schutz bewusst umgehen (z.B. bei "Alle wiederherstellen").
    const prevCount = Object.keys(lastSyncedEvents.current || {}).filter(k => lastSyncedEvents.current[k]?.status !== "deleted").length;
    const newCount = Object.keys(updated || {}).filter(k => updated[k]?.status !== "deleted").length;
    if (!opts.force && prevCount >= 5 && newCount === 0) {
      console.warn(`[saveEvents] BLOCKIERT: Versuch ${prevCount} Events auf 0 zu setzen.`);
      setToast({ msg: "⚠ Speichern blockiert", detail: `Schutz hat ${prevCount} Termine vor Totalverlust bewahrt. Seite neu laden und Browser-Konsole prüfen.`, color: "#c44" });
      return;
    }
    if (!opts.force && prevCount >= 10 && newCount < prevCount * 0.3) {
      console.warn(`[saveEvents] VERDÄCHTIG: ${prevCount} → ${newCount} Events.`);
      setToast({ msg: "⚠ Speichern blockiert", detail: `Schutz: ${prevCount} → ${newCount} Termine wäre ungewöhnlich viel Verlust.`, color: "#c44" });
      return;
    }
    // Bei großen Änderungen (>20% der Events betroffen) einen Pre-Change-Snapshot anlegen
    if (!opts.noSnapshot && prevCount >= 3) {
      const changed = Math.abs(prevCount - newCount);
      if (changed >= Math.max(2, prevCount * 0.2)) {
        try {
          const snapKey = `snapshot-${Date.now()}`;
          saveData(snapKey, JSON.stringify({
            date: new Date().toISOString(),
            reason: opts.reason || "large-change",
            prevCount, newCount,
            events: lastSyncedEvents.current || {},
          })).catch(() => {});
        } catch {}
      }
    }
    const withIds = ensureLocalIds(updated);
    setEvents(withIds);
    try { await saveData("events", JSON.stringify(withIds)); } catch {}
    // Google Calendar Sync läuft im Hintergrund silent — kein Toast mehr bei jeder Änderung.
    // Toasts gibt es nur noch bei Bestätigen, Herabstufen oder Löschen (siehe handleAdminAction / handleAdminSave).
    const oldSnapshot = lastSyncedEvents.current || {};
    lastSyncedEvents.current = withIds;
    syncEventsDiff(oldSnapshot, withIds).then(patched => {
      if (patched) {
        setEvents(patched);
        lastSyncedEvents.current = patched;
        saveData("events", JSON.stringify(patched)).catch(() => {});
      }
    }).catch(() => {});
  }, []);
  const saveTypes = useCallback(async (updated) => { setEventTypes(updated); try { await saveData("types", JSON.stringify(updated)); } catch {} }, []);
  const saveTheme = useCallback(async (updated) => { setSiteTheme(updated); try { await saveData("theme", JSON.stringify(updated)); } catch {} }, []);
  const saveAdminTheme = useCallback(async (updated) => { setAdminTheme(updated); try { await saveData("adminTheme", JSON.stringify(updated)); } catch {} }, []);

  // Auto-Backup: beim Admin-Login prüfen, ob heute schon ein Backup existiert.
  // Falls nicht → Snapshot der Events in Firebase speichern (backup-YYYY-MM-DD).
  // Retention: Index zeigt nur die letzten 30 Einträge, ältere bleiben aber in Firestore.
  useEffect(() => {
    if (!isAdmin || loading) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const currentIndex = Array.isArray(backupsIndex) ? backupsIndex : [];
      if (currentIndex.includes(today)) return; // heute schon erledigt
      try {
        await saveData(`backup-${today}`, JSON.stringify({ date: today, createdAt: new Date().toISOString(), events }));
        // Index neu aufbauen, neuestes zuerst, auf 30 beschränkt
        const updated = [today, ...currentIndex.filter(d => d !== today)].slice(0, 30);
        await saveData("backups-index", JSON.stringify(updated));
        setBackupsIndex(updated);
      } catch (e) { console.warn("[backup] failed:", e); }
    })();
  }, [isAdmin, loading]);
  const handleLogin = async () => { setLoginError(""); try { await adminLogin(loginEmail, loginPw); setLoginModal(false); setLoginEmail(""); setLoginPw(""); } catch (e) { setLoginError(e.code === "auth/invalid-credential" ? "E-Mail oder Passwort falsch" : "Login fehlgeschlagen"); } };
  const handleLogout = async () => { await adminLogout(); setIsAdmin(false); setLoggedIn(false); setModalView(null); };

  useEffect(() => { setAdminSubmitAttempted(false); }, [modalView, selectedDate]);
  // Bei jedem Wechsel des Admin-Modals oder Datums: Type-Auswahl reset,
  // ABER editingSubIndex NICHT resetten — das macht openEventInAdmin gezielt
  useEffect(() => { setTypeSelectExpanded(false); }, [modalView, selectedDate]);
  // editingSubIndex nur beim Schließen des Modals zurücksetzen (nicht beim Öffnen!)
  useEffect(() => { if (modalView === null) setEditingSubIndex(-1); }, [modalView]);
  // Beim Öffnen des Admin-Modals: Dashboard-Chips als Übersicht zeigen, Editoren sind initial geschlossen
  useEffect(() => {
    if (modalView !== "admin") return;
    setStatusCollapsed(true);
    setTimeCollapsed(true);
    setTypeSelectExpanded(false);
  }, [modalView, selectedDate]);

  // Autosave im Admin-Modal: speichert 1s nach der letzten Eingabe automatisch,
  // aber nur beim Bearbeiten existierender Termine (nicht beim Neu-Anlegen oder addToExisting).
  // Das Modal bleibt offen, der "Speichern"-Button wird nur für den expliziten Abschluss gebraucht.
  useEffect(() => {
    if (loading) return; // Nie autosaven während Events noch laden
    if (modalView !== "admin" || !selectedDate) return;
    if (adminForm.addToExisting) return; // neuer SubEvent - kein Autosave, weil noch nicht in DB
    // SICHERHEIT: Wenn der globale Events-State leer oder unplausibel klein ist, NIE autosaven.
    // Das verhindert, dass eine Race-Condition mit noch nicht geladenen Events die DB überschreibt.
    const totalEvents = Object.keys(events || {}).filter(k => events[k]?.status !== "deleted").length;
    if (totalEvents === 0) return;
    const existing = events[selectedDate];
    const mainExists = existing && existing.status !== "deleted";
    const subExists = editingSubIndex >= 0 && existing?.subEvents?.[editingSubIndex];
    const seriesEdit = adminForm.editAllSeries;
    if (!mainExists && !subExists && !seriesEdit) return; // Neu-Anlage - kein Autosave
    const timer = setTimeout(() => { handleAdminSave(true); }, 1000);
    return () => clearTimeout(timer);
  }, [adminForm, modalView, selectedDate, editingSubIndex, loading]);



  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const handleDateClick = (day) => {
    if (!day) return;
    const key = dateKey(year, month, day);
    const ev = events[key]?.status === "deleted" ? null : events[key];
    setSelectedDate(key);
    if (isAdmin) {
      if (ev) {
        setFromCalendar(true);
        setModalView("info");
      } else {
        setAdminForm({ type:"booked", label:"", note:"", startTime:"08:00", endTime:"22:00", adminNote:"", eventType:"", allDay:false, checklist:[], contactName:"", contactPhone:"", contactAddress:"", publicText:"", isPublic:false, isSeries:false, seriesDates:[], seriesId:"", editAllSeries:false, guests:"", tourGuide:false, cakeCount:0, coffeeCount:0, price:"", paymentStatus:"open", partialAmount:"", cleaningFee:false });
        setEditingSubIndex(-1);
        setModalView("admin");
      }
    } else if (ev && ev.allDay && ev.status !== "pending" && !ev.isSeries && !ev.isPublic) {
      setModalView("info");
    } else {
      setSelectedDate(key);
      setFormData(f => ({ ...f, name:"", email:"", phone:"", guests:"", message:"", slot:"halfDayAM" }));
      setModalView("selectType");
    }
  };

  const handleCardClick = (typeId) => {
    setFormData({ name:"", email:"", phone:"", type: typeId, slot:"halfDayAM", guests:"", message:"", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:8, tourMin:0, tourEndHour:13, tourEndMin:0, contactName:"" });
    setShowTypeSelect(false);
    setSubmitAttempted(false);
    setPickerMonth(today.getMonth());
    setPickerYear(today.getFullYear());
    setModalView("pickDate");
  };

  const handlePickerDateClick = (day) => {
    if (!day) return;
    const key = dateKey(pickerYear, pickerMonth, day);
    const isPast = new Date(pickerYear, pickerMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const evRaw = events[key];
    const ev = evRaw?.status === "deleted" ? null : evRaw;
    const blocked = ev && ev.allDay && ev.status !== "pending" && !ev.isSeries;
    if (isPast || blocked) return;
    setSelectedDate(key);
    setSubmitAttempted(false);
    setModalView("form");
  };

  const handleAdminSave = (silent = false) => {
    // Pflichtfeld-Check bei Kundenbuchungen + Anfragen (type="booked" | "pending")
    // Bei silent=true (Autosave) wird die Validation übersprungen
    if (!silent && (adminForm.type === "booked" || adminForm.type === "pending")) {
      const isGroup = adminForm.eventType === "gruppenfuehrung";
      if (isGroup) {
        // Gruppenführung: Ansprechpartner + Telefon
        if (!(adminForm.contactName || "").trim() || !(adminForm.contactPhone || "").trim()) {
          setAdminSubmitAttempted(true);
          return;
        }
      } else {
        // Normale Kundenbuchung / Anfrage: Name (groupName-Feld) + Telefon
        if (!(adminForm.groupName || "").trim() || !(adminForm.customerPhone || "").trim()) {
          setAdminSubmitAttempted(true);
          return;
        }
      }
    }
    setAdminSubmitAttempted(false);
    prevEvents.current = { ...events };
    // Alten Status ermitteln für Herabstufungs-Erkennung (booked → pending)
    const prevMain = events[selectedDate];
    const prevSub = editingSubIndex >= 0 ? prevMain?.subEvents?.[editingSubIndex] : null;
    const prevStatus = prevSub?.status ?? prevMain?.status;
    const isDowngrade = prevStatus === "booked" && adminForm.type === "pending";
    const updated = { ...events };
    const st = adminForm.startTime || "08:00";
    const et = adminForm.endTime || "22:00";
    const sid = adminForm.seriesId || (adminForm.isSeries && (adminForm.seriesDates||[]).length > 0 ? `series-${Date.now()}` : "");
    // Anzeige-Name für die Liste: bei internen Terminen hat Ansprechperson (contactName) Vorrang,
    // bei Kundenbuchungen/Anfragen der Kundenname (groupName)
    const displayName = adminForm.type === "blocked"
      ? (adminForm.contactName || adminForm.groupName || "")
      : (adminForm.groupName || adminForm.contactName || "");
    const entry = { status: adminForm.type, type: adminForm.eventType || "", label: adminForm.label, note: adminForm.note, startTime: st, endTime: et, adminNote: adminForm.adminNote, allDay: adminForm.allDay, checklist: adminForm.checklist || [], reminders: adminForm.reminders || { checklist:null, items:{} }, slotLabel: adminForm.allDay ? `Ganztägig (${st} – ${et})` : `${st} – ${et}`, contactName: adminForm.contactName || "", contactPhone: adminForm.contactPhone || "", contactEmail: adminForm.contactEmail || "", contactAddress: adminForm.contactAddress || "", publicText: adminForm.publicText || "", isPublic: adminForm.isPublic || false, isSeries: !!(sid), seriesId: sid, guests: adminForm.guests || "", tourGuide: adminForm.tourGuide || false, cakeCount: adminForm.cakeCount || 0, coffeeCount: adminForm.coffeeCount || 0, groupName: adminForm.groupName || "", name: displayName, email: adminForm.customerEmail || "", phone: adminForm.customerPhone || "", message: adminForm.customerMessage || "", price: adminForm.price || "", paymentStatus: adminForm.paymentStatus || "open", partialAmount: adminForm.partialAmount || "", cleaningFee: !!adminForm.cleaningFee };
    if (adminForm.editAllSeries && adminForm.seriesId) {
      Object.keys(updated).forEach(k => {
        if (updated[k]?.seriesId === adminForm.seriesId) {
          const old = updated[k];
          // WICHTIG: localId + googleEventId erhalten, sonst erkennt Google Calendar das Event als neu (Duplikat!)
          updated[k] = { ...entry, localId: old.localId, googleEventId: old.googleEventId, checklist: entry.checklist.map(c => ({...c})), subEvents: old.subEvents || [] };
        }
      });
    } else if (editingSubIndex >= 0 && updated[selectedDate]?.subEvents?.[editingSubIndex]) {
      // SubEvent bearbeiten: nur Eintrag im subEvents-Array patchen, Main-Event unangetastet lassen
      const main = { ...updated[selectedDate] };
      const oldSub = main.subEvents[editingSubIndex];
      const newSubs = [...main.subEvents];
      newSubs[editingSubIndex] = { ...entry, ...(oldSub?.localId ? { localId: oldSub.localId } : {}), ...(oldSub?.googleEventId ? { googleEventId: oldSub.googleEventId } : {}) };
      main.subEvents = newSubs;
      updated[selectedDate] = main;
    } else if (adminForm.addToExisting && updated[selectedDate]) {
      const existing = { ...updated[selectedDate] };
      existing.subEvents = [...(existing.subEvents || []), entry];
      updated[selectedDate] = existing;
    } else {
      const old = updated[selectedDate];
      const oldSubs = old?.subEvents || [];
      // WICHTIG: bei Bearbeitung (nicht Neuanlage) localId + googleEventId erhalten
      updated[selectedDate] = { ...entry, ...(old?.localId ? { localId: old.localId } : {}), ...(old?.googleEventId ? { googleEventId: old.googleEventId } : {}), subEvents: oldSubs };
      if (adminForm.seriesDates && adminForm.seriesDates.length > 0) {
        adminForm.seriesDates.forEach(dk => {
          const oldD = updated[dk];
          updated[dk] = { ...entry, ...(oldD?.localId ? { localId: oldD.localId } : {}), ...(oldD?.googleEventId ? { googleEventId: oldD.googleEventId } : {}), subEvents: oldD?.subEvents || [], checklist: entry.checklist.map(c => ({...c, done:false})) };
        });
      }
    }
    // Gruppenführung-Notification: nur wenn eine Gruppenführung NEU als "booked" angelegt oder von pending auf booked gewechselt wird
    // (nicht bei reinen Edits eines bereits gebuchten Gruppenführungs-Termins, um Doppel-Mails zu vermeiden)
    if (adminForm.type === "booked" && adminForm.eventType === "gruppenfuehrung" && !adminForm.editAllSeries) {
      let wasAlreadyBooked = false;
      if (editingSubIndex >= 0) {
        const oldSub = events[selectedDate]?.subEvents?.[editingSubIndex];
        wasAlreadyBooked = oldSub?.status === "booked" && oldSub?.type === "gruppenfuehrung";
      } else if (adminForm.addToExisting) {
        wasAlreadyBooked = false; // ist ja ein neues SubEvent
      } else {
        const oldMain = events[selectedDate];
        wasAlreadyBooked = oldMain?.status === "booked" && oldMain?.type === "gruppenfuehrung";
      }
      if (!wasAlreadyBooked) notifyGroupTour(selectedDate, entry, editingSubIndex);
    }
    saveEvents(updated);
    if (isDowngrade) {
      showToast("Auf Anfrage gesetzt", `${fmtDateAT(selectedDate)}${entry.label ? " · " + entry.label : ""}${entry.name ? " · " + entry.name : ""}`, true, BRAND.aprikot);
    }
    if (!silent) {
      setModalView(null);
      setEditingSubIndex(-1);
    }
  };

  const handleCustomerSubmit = () => {
    const et = eventTypes.find(e => e.id === formData.type);
    const isGroup = et?.isGroupTour;
    const valid = formData.name.trim() && formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)
      && formData.phone.trim()
      && (isGroup
          ? (formData.guests && Number(formData.guests) >= (et?.minPersons || 10) && (formData.contactName||"").trim())
          : !!formData.guests);
    if (!valid) { setSubmitAttempted(true); return; }
    let slotLabel, startTime, endTime;
    if (isGroup) {
      startTime = String(formData.tourHour).padStart(2,"0")+":"+String(formData.tourMin).padStart(2,"0");
      endTime = String(formData.tourEndHour).padStart(2,"0")+":"+String(formData.tourEndMin).padStart(2,"0");
      slotLabel = `${startTime} – ${endTime}`;
    } else {
      startTime = String(formData.tourHour||8).padStart(2,"0")+":"+String(formData.tourMin||0).padStart(2,"0");
      endTime = String(formData.tourEndHour||22).padStart(2,"0")+":"+String(formData.tourEndMin||0).padStart(2,"0");
      const slotNames = { halfDayAM:"Halbtags Vormittag", halfDayPM:"Halbtags Nachmittag", fullDay:"Ganztags" };
      const slotName = slotNames[formData.slot] || "";
      slotLabel = slotName ? `${slotName} (${startTime}–${endTime})` : `${startTime} – ${endTime}`;
    }
    // Bei Gruppenbesuch: formData.name ist Gruppenname, contactName ist Ansprechpartner
    const pendingEntry = isGroup
      ? { status:"pending", label: et?.label, type: formData.type, slotLabel, startTime, endTime, ...formData, groupName: formData.name }
      : { status:"pending", label: et?.label, type: formData.type, slotLabel, startTime, endTime, ...formData };
    const updated = { ...events };
    const existing = updated[selectedDate];
    if (existing && existing.status !== "deleted") {
      // Don't overwrite — add as subEvent
      updated[selectedDate] = { ...existing, subEvents: [...(existing.subEvents || []), pendingEntry] };
    } else {
      updated[selectedDate] = pendingEntry;
    }
    saveEvents(updated);
    setSubmitAttempted(false);
    setModalView(null);
    setSuccessModal(true);
    // Send email notification
    try {
      const [yy,mm,dd] = selectedDate.split("-").map(Number);
      const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][new Date(yy,mm-1,dd).getDay()];
      fetch(EMAIL_WORKER_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: `${dayName}, ${dd}.${mm}.${yy}`,
          type: et?.label || formData.type,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "–",
          guests: formData.guests || "–",
          slot: slotLabel,
          message: formData.message || "",
          tourGuide: formData.tourGuide,
          cakeCount: formData.cakeCount || 0,
          coffeeCount: formData.coffeeCount || 0,
          contactName: formData.contactName || "",
        })
      }).catch(() => {});
    } catch {}
  };

  // Öffnet einen Termin direkt im Admin-Bearbeiten-Modal (statt über Info-View-Zwischenschritt)
  const openEventInAdmin = (key, subIndex = -1) => {
    const ev = events[key];
    if (!ev) return;
    const src = subIndex >= 0 ? ev.subEvents?.[subIndex] : ev;
    if (!src) return;
    setSelectedDate(key);
    setFromCalendar(false);
    setEditingSubIndex(subIndex);
    setAdminForm({
      type: src.status || "booked", label: src.label || "", note: src.note || "",
      startTime: src.startTime || "08:00", endTime: src.endTime || "22:00",
      adminNote: src.adminNote || "", eventType: src.type || "",
      allDay: src.allDay || false, checklist: src.checklist || [],
      contactName: src.contactName || "", contactPhone: src.contactPhone || "",
      contactEmail: src.contactEmail || "", contactAddress: src.contactAddress || "",
      publicText: src.publicText || "", isPublic: src.isPublic || false,
      isSeries: false, seriesDates: [],
      guests: src.guests || "", tourGuide: src.tourGuide || false,
      cakeCount: src.cakeCount || 0, coffeeCount: src.coffeeCount || 0,
      groupName: src.groupName || src.name || "",
      customerEmail: src.email || "", customerPhone: src.phone || "",
      customerMessage: src.message || "", price: src.price || "",
      paymentStatus: src.paymentStatus || "open", partialAmount: src.partialAmount || "",
      cleaningFee: !!src.cleaningFee,
      reminders: src.reminders || { checklist:null, items:{} },
    });
    setEditingTime(null); setSeriesMonth(null); setSeriesYear(null);
    setModalView("admin");
  };

  const handleAdminAction = (key, action, subIndex = -1) => {
    if (action === "delete") {
      const ev = subIndex >= 0 ? events[key]?.subEvents?.[subIndex] : events[key];
      setDeleteConfirm({ type:"single", key, subIndex, label: ev?.label || "Termin", count:1, items:[[key,ev]] });
      return;
    }
    if (action === "permDelete") {
      const updated = { ...events };
      delete updated[key];
      saveEvents(updated);
      return;
    }
    if (action === "doDelete") {
      prevEvents.current = { ...events };
      const updated = { ...events };
      if (subIndex >= 0) {
        // Delete specific subEvent: als "deleted" markieren (statt rausschneiden) — damit erscheint
        // es in der Gelöschte-Liste und kann wiederhergestellt werden.
        const day = { ...updated[key] };
        const sub = day.subEvents?.[subIndex];
        if (!sub) { setDeleteConfirm(null); return; }
        day.subEvents = (day.subEvents || []).map((s,i) => i === subIndex
          ? { ...s, status: "deleted", previousStatus: s.status, deletedAt: new Date().toISOString() }
          : s);
        updated[key] = day;
        saveEvents(updated);
        setDeleteConfirm(null);
        showToast("Gelöscht", `${fmtDateAT(key)}${sub?.label ? " · " + sub.label : ""}${sub?.name ? " · " + sub.name : ""}`, true, "#c44");
        return;
      }
      const ev = events[key];
      // If main event has subEvents, promote first subEvent
      if (ev.subEvents && ev.subEvents.length > 0) {
        const [first, ...rest] = ev.subEvents;
        updated[key] = { ...first, subEvents: rest };
      } else {
        updated[key] = { ...updated[key], status: "deleted", previousStatus: ev.status, deletedAt: new Date().toISOString() };
      }
      saveEvents(updated);
      setModalView(null);
      setDeleteConfirm(null);
      showToast("Gelöscht", `${fmtDateAT(key)}${ev?.label ? " · " + ev.label : ""}${ev?.name ? " · " + ev.name : ""}`, true, "#c44");
      return;
    }
    prevEvents.current = { ...events };
    const updated = { ...events };
    if (action === "confirm") {
      if (subIndex >= 0) {
        const day = { ...updated[key] };
        const sub = day.subEvents?.[subIndex];
        day.subEvents = (day.subEvents || []).map((s,i) => i === subIndex ? { ...s, status:"booked" } : s);
        updated[key] = day;
        saveEvents(updated);
        showToast("Bestätigt", `${fmtDateAT(key)}${sub?.label ? " · " + sub.label : ""}${sub?.name ? " · " + sub.name : ""}`, true, BRAND.moosgruen);
        // Extra-Notification bei Gruppenführung
        if (sub && sub.type === "gruppenfuehrung") notifyGroupTour(key, { ...sub, status: "booked" }, subIndex);
        return;
      }
      const ev = events[key];
      updated[key] = { ...updated[key], status: "booked" };
      saveEvents(updated);
      setModalView(null);
      showToast("Bestätigt", `${fmtDateAT(key)}${ev?.label ? " · " + ev.label : ""}${ev?.name ? " · " + ev.name : ""}`, true, BRAND.moosgruen);
      // Extra-Notification bei Gruppenführung
      if (ev && ev.type === "gruppenfuehrung") notifyGroupTour(key, { ...ev, status: "booked" }, -1);
    }
  };

  const handleSavePrice = () => {
    if (!editingType) return;
    saveTypes(eventTypes.map(t => t.id === editingType.id ? editingType : t));
    setEditingType(null);
  };

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y=>y-1); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y=>y+1); } else setMonth(m=>m+1); };

  const days = getMonthDays(year, month);
  const holidays = { ...getHolidays(year), ...getHolidays(year+1) };

  if (loading) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"system-ui", color: BRAND.aubergine }}>Laden...</div>;

  return (
    <div style={{ minHeight:"100svh", ...(isAdmin ? {} : { display:"flex", flexDirection:"column" }), background: isAdmin ? adminTheme.bgColor : siteTheme.bgColor, fontFamily:"'Acumin Pro', 'Segoe UI', system-ui, sans-serif", overflowX:"hidden", WebkitTextSizeAdjust:"100%" }}>
      {toast && (
        <div key={toastKey} style={{ position:"fixed", top:56, left:"50%", transform:"translateX(-50%)", background: BRAND.aubergine, color:"#fff", borderRadius:10, zIndex:1100, boxShadow:"0 4px 20px rgba(88,8,74,0.3)", animation:"fadeIn .25s", overflow:"hidden", minWidth:220, maxWidth:"92vw" }}>
          <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              {toast.detail && <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:3 }}>{toast.detail}</div>}
              <span style={{ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:4, background: toast.actionColor || "rgba(255,255,255,0.2)", color:"#fff", letterSpacing:0.5, textTransform:"uppercase" }}>{toast.msg}</span>
            </div>
            {toast.undoable && (
              <button onClick={handleUndo} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", padding:"6px 10px", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 7h7a3 3 0 1 1 0 6H9" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 4L3 7l3 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Rückgängig
              </button>
            )}
          </div>
          <div style={{ height:3, background: BRAND.lila, margin:"0 6px 4px", borderRadius:3 }}>
            <div style={{ height:"100%", background:"#fff", borderRadius:3, animation:"toastProgress 8s linear forwards" }} />
          </div>
        </div>
      )}

      {successModal && (() => {
        const sm = winW < 520;
        const iconSz = sm ? 60 : 76;
        const imgH = sm ? 130 : 200;
        return (
        <div onClick={() => setSuccessModal(false)} style={{ position:"fixed", inset:0, zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding: sm ? 12 : 16, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>
          {/* Falling leaves */}
          <div style={{ position:"absolute", top:30, left:"18%", pointerEvents:"none" }}><svg width="14" height="14" viewBox="0 0 16 16" style={{ animation:"successLeaf1 5.5s ease-in-out infinite", animationDelay:"0.3s" }}><path d="M8 0C8 0 2 6 2 10s2.5 6 6 6 6-2 6-6S8 0 8 0z" fill="#d4b8d0" opacity="0.4"/></svg></div>
          <div style={{ position:"absolute", top:15, right:"20%", pointerEvents:"none" }}><svg width="12" height="12" viewBox="0 0 16 16" style={{ animation:"successLeaf2 6s ease-in-out infinite", animationDelay:"1.2s" }}><path d="M8 0C8 0 2 6 2 10s2.5 6 6 6 6-2 6-6S8 0 8 0z" fill="#903486" opacity="0.3"/></svg></div>
          <div style={{ position:"absolute", top:45, left:"60%", pointerEvents:"none" }}><svg width="9" height="9" viewBox="0 0 16 16" style={{ animation:"successLeaf3 5s ease-in-out infinite", animationDelay:"2s" }}><path d="M8 0C8 0 2 6 2 10s2.5 6 6 6 6-2 6-6S8 0 8 0z" fill="#d4b8d0" opacity="0.3"/></svg></div>
          <div style={{ position:"absolute", top:8, left:"42%", pointerEvents:"none" }}><svg width="11" height="11" viewBox="0 0 16 16" style={{ animation:"successLeaf4 7s ease-in-out infinite", animationDelay:"0.6s" }}><path d="M8 0C8 0 2 6 2 10s2.5 6 6 6 6-2 6-6S8 0 8 0z" fill="#903486" opacity="0.2"/></svg></div>
          {/* Glass card */}
          <div onClick={e => e.stopPropagation()} style={{ position:"relative", background:"rgba(88,8,74,0.25)", backdropFilter:"blur(28px)", WebkitBackdropFilter:"blur(28px)", borderRadius: sm ? 20 : 28, maxWidth:480, width:"100%", border:"1px solid rgba(144,52,134,0.2)", animation:"successFadeUp 0.6s ease-out", textAlign:"center", overflow:"hidden" }}>
            <div style={{ height:imgH, backgroundImage:"url(/assets/garten-Anfrage-gesendet.jpg)", backgroundSize:"cover", backgroundPosition:"center 40%" }} />
            <div style={{ padding: sm ? "20px 20px 24px" : "32px 36px 40px" }}>
              <div style={{ position:"relative", width:iconSz, height:iconSz, margin:`-${iconSz/2 + 8}px auto ${sm ? 14 : 20}px` }}>
                <div style={{ position:"absolute", inset:-8, borderRadius:"50%", border:"1.5px solid rgba(255,255,255,0.2)", animation:"successRing 2.5s ease-out infinite" }} />
                <div style={{ position:"absolute", inset:-16, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.08)", animation:"successRing 2.5s ease-out infinite", animationDelay:"0.4s" }} />
                <div style={{ width:iconSz, height:iconSz, borderRadius:"50%", background:"linear-gradient(135deg,rgba(88,8,74,0.7),rgba(66,0,69,0.85))", border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", animation:"successScaleIn 0.35s ease-out 0.15s both" }}>
                  <svg width={sm ? 26 : 34} height={sm ? 26 : 34} viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" style={{ animation:"successCheck 0.4s ease-out 0.4s both" }}/></svg>
                </div>
              </div>
              <div style={{ fontSize: sm ? 20 : 26, fontWeight:600, color:"#fff", marginBottom: sm ? 4 : 8, animation:"successSlide 0.5s ease-out 0.25s both" }}>Anfrage gesendet!</div>
              <div style={{ fontSize: sm ? 13 : 15, color:"rgba(255,255,255,0.55)", lineHeight:1.7, marginBottom: sm ? 20 : 28, animation:"successSlide 0.5s ease-out 0.35s both" }}>Vielen Dank für Ihr Interesse.<br/>Wir melden uns in Kürze bei Ihnen.</div>
              <div style={{ animation:"successSlide 0.5s ease-out 0.45s both" }}>
                <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" className="success-link"
                  style={{ display:"block", padding: sm ? "10px 14px" : "14px 18px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius: sm ? 10 : 14, textDecoration:"none", marginBottom: sm ? 14 : 20, transition:"all .2s" }}>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:3 }}>Mehr über uns</div>
                  <div style={{ fontSize: sm ? 13 : 15, fontWeight:600, color:"rgba(255,255,255,0.9)" }}>www.derparadiesgarten.at</div>
                </a>
                <button onClick={() => setSuccessModal(false)} className="success-close"
                  style={{ padding: sm ? "11px 32px" : "14px 44px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:12, color:"rgba(255,255,255,0.85)", fontSize: sm ? 13 : 15, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>Schließen</button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      <header style={{ background: isAdmin ? BRAND.aubergine : siteTheme.headerBg, color: isAdmin ? "#fff" : siteTheme.headerText, padding: winW < 520 ? "6px 12px" : "8px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position: winW < 1100 ? "sticky" : "relative", top:0, zIndex:50 }}>
        <div onClick={!isAdmin ? () => { if (loggedIn) { setIsAdmin(true); setModalView(null); } else setLoginModal(true); } : undefined}
          style={{ display:"flex", alignItems:"center", gap:0, minWidth:0, flex:1, cursor: !isAdmin ? "pointer" : "default" }}>
          <img src={PGM_LOGO} alt="Paradiesgärten Mattuschka" style={{ height: winW < 520 ? (isAdmin ? 17 : 24) : 26, flexShrink:0 }} />
          <h1 style={{ margin:0, marginLeft: winW < 520 ? (isAdmin ? 6 : 8) : 10, display:"flex", flexDirection: winW < 520 ? "column" : "row", alignItems: winW < 520 ? "flex-start" : "center", minWidth:0 }}>
            {winW < 520 ? (
              <>
                <span style={{ fontSize: isAdmin ? 8 : 11, letterSpacing: isAdmin ? 1.4 : 2, color:"inherit", fontWeight:600, lineHeight:1.2 }}>PARADIESGÄRTEN</span>
                <span style={{ fontSize: isAdmin ? 8 : 11, letterSpacing: isAdmin ? 1.4 : 2, color:"inherit", fontWeight:300, lineHeight:1.2 }}>MATTUSCHKA</span>
              </>
            ) : (
              <span style={{ fontSize:14, letterSpacing:2.5, whiteSpace:"nowrap", color:"inherit" }}><span style={{ fontWeight:700 }}>PARADIESGÄRTEN</span><span style={{ fontWeight:300 }}> MATTUSCHKA</span></span>
            )}
          </h1>
        </div>
        {isAdmin && (
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {/* 3 Admin-Action-Buttons: Desktop mit Label, Mobile nur Icon */}
            {(() => {
              const isSmall = winW < 900;
              const H = 32;
              const actions = [
                {
                  label:"Preise", full:"Preise verwalten", color:BRAND.sonnengelb, onClick:() => setShowPrices(true),
                  icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6.5A7 7 0 0 0 8 9"/><path d="M18 17.5A7 7 0 0 1 8 15"/><line x1="4" y1="10" x2="14" y2="10"/><line x1="4" y1="14" x2="13" y2="14"/></svg>
                },
                {
                  label:"Design Kunde", full:"Design Kundenansicht", color:BRAND.aprikot, onClick:() => setShowDesign(true),
                  icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2.3-.7 2.3-1.8 0-1-.9-1.5-.9-2.5 0-1 .9-1.7 1.9-1.7H17c2.8 0 5-2.2 5-5 0-4.4-4.5-9-10-9z"/></svg>
                },
                {
                  label:"Design Admin", full:"Design Adminansicht", color:BRAND.tuerkis, onClick:() => setShowDesignAdmin(true),
                  icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
                },
                ...(winW < 520 ? [] : [{
                  label:"Backups", full:"Backups anzeigen", color:BRAND.mintgruen, onClick:() => setShowBackups(true),
                  icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/></svg>
                }]),
              ];
              return actions.map((a, i) => (
                <button key={i} onClick={a.onClick} title={a.full}
                  onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.2)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.12)"; e.currentTarget.style.borderColor="rgba(255,255,255,0.25)"; }}
                  style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", height:H, width: isSmall ? H : "auto", padding: isSmall ? 0 : "0 12px", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:0.3, display:"flex", alignItems:"center", justifyContent:"center", gap:6, transition:"all .15s" }}>
                  <span style={{ color:a.color, display:"flex", alignItems:"center" }}>{a.icon}</span>
                  {!isSmall && <span>{a.label}</span>}
                </button>
              ));
            })()}
            {/* Trennstrich zwischen Admin-Aktionen und Ansicht-Umschaltern */}
            <div style={{ width:1, height:20, background:"rgba(255,255,255,0.35)", margin:"0 6px", flexShrink:0 }} />
            <button onClick={() => { setIsAdmin(false); setModalView(null); }}
              style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", padding: winW < 900 ? 0 : "0 12px", width: winW < 900 ? 32 : "auto", height:32, borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:0.5, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}
              title="Kundenansicht">
              {winW < 900 ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg> : "← Kundenansicht"}
            </button>
            <button onClick={() => { setIsAdmin(false); setModalView(null); }}
              title="Abmelden"
              style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", width:32, height:32, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        )}
      </header>

      {/* Read-Only View für Astrid (Bestätigungsmail-Link) */}
      {readOnlyView && (() => {
        const ev = readOnlyView.subIndex >= 0
          ? events[readOnlyView.dateKey]?.subEvents?.[readOnlyView.subIndex]
          : events[readOnlyView.dateKey];
        if (!ev) {
          return (
            <div onClick={() => setReadOnlyView(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:18, padding:"32px 28px", maxWidth:400, width:"100%", textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
                <div style={{ fontSize:16, fontWeight:600, color:BRAND.aubergine, marginBottom:6 }}>Termin nicht gefunden</div>
                <div style={{ fontSize:13, color:"#888", marginBottom:20 }}>Der Termin wurde möglicherweise verschoben oder gelöscht.</div>
                <button onClick={() => setReadOnlyView(null)}
                  style={{ padding:"10px 24px", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>
                  Schließen
                </button>
              </div>
            </div>
          );
        }
        const et = eventTypes.find(t => t.id === ev.type);
        const accent = et?.color || BRAND.lila;
        const [yy,mm,dd] = readOnlyView.dateKey.split("-").map(Number);
        const dateObj = new Date(yy, mm-1, dd);
        const wochentag = ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"][dateObj.getDay()];
        const monatLang = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"][mm-1];
        const dateLong = `${wochentag}, ${dd}. ${monatLang} ${yy}`;
        const zeitText = ev.allDay ? "Ganztägig" : `${ev.startTime || ""} – ${ev.endTime || ""}`;
        const statusMeta = { booked:{label:"Gebucht", color:BRAND.lila}, pending:{label:"Anfrage", color:BRAND.aprikot}, blocked:{label:"Intern", color:"#009a93"} }[ev.status] || {label:"—", color:"#999"};
        const isGroupEv = ev.type === "gruppenfuehrung";
        const nP = Number(ev.guests) || 0;
        const nKaffee = Number(ev.coffeeCount) || 0;
        const nKuchen = Number(ev.cakeCount) || 0;
        const cEintritt = nP * (et?.pricePerPerson || 9);
        const cKaffee = nKaffee * (et?.coffeePrice || 3.10);
        const cKuchen = nKuchen * (et?.cakePrice || 4.50);
        const nF = ev.tourGuide && nP > 0 ? Math.ceil(nP / (et?.maxPerTour || 20)) : 0;
        const cFuehrung = nF * (et?.guideCost || 80);
        const cGesamt = cEintritt + cKaffee + cKuchen + cFuehrung;
        return (
          <div onClick={() => setReadOnlyView(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(4px)", zIndex:300, display:"flex", alignItems:"flex-start", justifyContent:"center", padding:16, overflowY:"auto" }}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:18, maxWidth:440, width:"100%", boxShadow:"0 24px 80px rgba(88,8,74,0.25)", marginTop:20, marginBottom:20, overflow:"hidden" }}>
              {/* Read-only Hinweis oben */}
              <div style={{ background:`${accent}10`, padding:"8px 20px", fontSize:10, color:accent, fontWeight:600, textTransform:"uppercase", letterSpacing:1.2, textAlign:"center", borderBottom:`1px solid ${accent}20` }}>
                👁 Nur-Lese-Ansicht · Termininfo
              </div>

              <div style={{ padding:"20px 22px" }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:13, color:"#888", fontWeight:500 }}>Termin</div>
                    <h3 style={{ margin:0, color:accent, fontSize:22, fontWeight:700, marginTop:2, lineHeight:1.2 }}>
                      {et?.label || ev.label || "Termin"}
                    </h3>
                  </div>
                  <button onClick={() => setReadOnlyView(null)}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", padding:4, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  </button>
                </div>

                {/* Meta-Chips: Status + Datum + Zeit + Typ */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
                  <div style={{ background:"#f3ecf2", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Status</div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                      <div style={{ width:9, height:9, borderRadius:"50%", background:statusMeta.color, flexShrink:0 }} />
                      <span style={{ fontSize:14, fontWeight:600, color:BRAND.aubergine }}>{statusMeta.label}</span>
                    </div>
                  </div>
                  <div style={{ background:"#f3ecf2", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Datum</div>
                    <div style={{ fontSize:13, fontWeight:600, color:BRAND.aubergine, marginTop:4 }}>{dd}.{mm}.{yy}</div>
                  </div>
                  <div style={{ background:"#f3ecf2", borderRadius:10, padding:"10px 14px" }}>
                    <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Zeit</div>
                    <div style={{ fontSize:13, fontWeight:600, color:BRAND.aubergine, marginTop:4, fontVariantNumeric:"tabular-nums" }}>{zeitText}</div>
                  </div>
                  <div style={{ background:`${accent}15`, borderRadius:10, padding:"10px 14px", border:`1px solid ${accent}30` }}>
                    <div style={{ fontSize:10, color:accent, textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Typ</div>
                    <div style={{ fontSize:13, fontWeight:600, color:accent, marginTop:4 }}>{et?.label || "—"}</div>
                  </div>
                </div>

                <div style={{ fontSize:12, color:"#888", marginBottom:12, textAlign:"center" }}>{dateLong}</div>

                {/* Kontakt / Gruppe */}
                {(ev.groupName || ev.name || ev.email || ev.phone || ev.contactName || ev.contactPhone || ev.guests) && (
                  <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:11, color:accent, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>{isGroupEv ? "Gruppe & Kontakt" : "Kontakt"}</div>
                    {(ev.groupName || ev.name) && <div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:600, marginBottom:6 }}>{ev.groupName || ev.name}</div>}
                    {isGroupEv && ev.contactName && <div style={{ fontSize:13, color:"#666", marginBottom:4 }}>👤 {ev.contactName}</div>}
                    {ev.email && <div style={{ fontSize:13, color:"#666", marginBottom:4 }}>✉ <a href={`mailto:${ev.email}`} style={{ color:BRAND.lila, textDecoration:"none" }}>{ev.email}</a></div>}
                    {(ev.contactPhone || ev.phone) && <div style={{ fontSize:13, color:"#666", marginBottom:4 }}>📞 <a href={`tel:${(ev.contactPhone || ev.phone).replace(/\s/g,"")}`} style={{ color:BRAND.lila, textDecoration:"none" }}>{ev.contactPhone || ev.phone}</a></div>}
                    {ev.guests && <div style={{ fontSize:13, color:"#666" }}>👥 {ev.guests} {isGroupEv ? "Teilnehmer" : "Gäste"}</div>}
                  </div>
                )}

                {/* Café im Paradiesglashaus (nur Gruppenbesuch) */}
                {isGroupEv && (ev.tourGuide || nKaffee > 0 || nKuchen > 0 || nP > 0) && (
                  <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Café im Paradiesglashaus</div>
                    {nKaffee > 0 && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                        <div><div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kaffee</div><div style={{ fontSize:11, color:"#999" }}>à € {(et?.coffeePrice || 3.10).toFixed(2).replace(".",",")}</div></div>
                        <div style={{ fontSize:16, fontWeight:600, color:BRAND.aubergine }}>{nKaffee}×</div>
                      </div>
                    )}
                    {nKuchen > 0 && (
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                        <div><div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kuchen</div><div style={{ fontSize:11, color:"#999" }}>à € {(et?.cakePrice || 4.50).toFixed(2).replace(".",",")}</div></div>
                        <div style={{ fontSize:16, fontWeight:600, color:BRAND.aubergine }}>{nKuchen}×</div>
                      </div>
                    )}
                    {ev.tourGuide && (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:`${BRAND.moosgruen}12`, borderRadius:10, marginBottom: nP > 0 ? 10 : 0 }}>
                        <svg width="18" height="18" viewBox="0 0 12 12"><circle cx="6" cy="6" r="6" fill={BRAND.moosgruen}/><path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, color:BRAND.moosgruen, fontWeight:600 }}>Führung mit Gartenexpertin</div>
                          <div style={{ fontSize:11, color:BRAND.moosgruen, opacity:0.65 }}>€ {et?.guideCost || 80} pro {et?.maxPerTour || 20} Teilnehmer</div>
                        </div>
                      </div>
                    )}
                    {nP > 0 && (
                      <div style={{ background:"#f8f4f8", borderRadius:10, padding:"10px 12px" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:2 }}>
                          <span>Eintritt ({nP}× à € {(et?.pricePerPerson || 9).toFixed(2).replace(".",",")})</span>
                          <span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cEintritt.toFixed(2).replace(".",",")}</span>
                        </div>
                        <div style={{ fontSize:10, color:BRAND.moosgruen, marginBottom:6, fontStyle:"italic" }}>mit Kärnten Card kostenlos</div>
                        {nKaffee > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}><span>Kaffee ({nKaffee}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cKaffee.toFixed(2).replace(".",",")}</span></div>}
                        {nKuchen > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}><span>Kuchen ({nKuchen}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cKuchen.toFixed(2).replace(".",",")}</span></div>}
                        {ev.tourGuide && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:6 }}><span>Führung{nF > 1 ? ` (${nF}×)` : ""}</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cFuehrung.toFixed(2).replace(".",",")}</span></div>}
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:BRAND.aubergine, fontWeight:600, paddingTop:6, borderTop:"1px solid #ebe4ea" }}>
                          <span>Geschätzt gesamt</span>
                          <span style={{ fontVariantNumeric:"tabular-nums", color:BRAND.lila }}>ca. € {cGesamt.toFixed(2).replace(".",",")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Nachricht */}
                {ev.message && (
                  <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:11, color:accent, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Nachricht</div>
                    <div style={{ fontSize:13, color:"#666", lineHeight:1.6, fontStyle:"italic" }}>„{ev.message}"</div>
                  </div>
                )}

                {/* Interne Notiz */}
                {ev.adminNote && (
                  <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:11, color:"#999", letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Interne Notiz</div>
                    <div style={{ fontSize:13, color:BRAND.aubergine, lineHeight:1.6 }}>{ev.adminNote}</div>
                  </div>
                )}

                {/* Schließen-Button */}
                <button onClick={() => setReadOnlyView(null)}
                  style={{ width:"100%", padding:"12px", background:accent, color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:0.5, marginTop:6, fontFamily:"inherit" }}>
                  Schließen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {loginModal && (<div onClick={() => setLoginModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}><div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"32px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.15)" }}><div style={{ textAlign:"center", marginBottom:20 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={BRAND.aubergine} strokeWidth="2" strokeLinecap="round" style={{ marginBottom:8 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><div style={{ fontSize:18, fontWeight:700, color:BRAND.aubergine }}>Admin-Login</div><div style={{ fontSize:12, color:"#999", marginTop:2 }}>Paradiesgarten Mattuschka</div></div><input placeholder="E-Mail" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:14, marginBottom:8, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} /><input placeholder="Passwort" type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:14, marginBottom:8, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />{loginError && <div style={{ fontSize:12, color:"#c44", marginBottom:8, textAlign:"center" }}>{loginError}</div>}<button onClick={handleLogin} style={{ width:"100%", padding:"12px 0", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:1 }}>Anmelden</button><button onClick={() => setLoginModal(false)} onMouseEnter={e=>{e.target.style.color="#c44";e.target.style.background="#fdf6f6"}} onMouseLeave={e=>{e.target.style.color="#aaa";e.target.style.background="transparent"}} style={{ width:"100%", padding:10, border:"none", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:13, marginTop:4, borderRadius:8, transition:"all .15s" }}>Abbrechen</button></div></div>)}

      {isAdmin && (
        <div style={{ background:`${BRAND.aubergine}12`, padding: winW < 520 ? "5px 10px" : "5px 24px", fontSize: winW < 520 ? 9 : 11, display:"flex", gap: winW < 520 ? 8 : 16, alignItems:"center", borderBottom:"1px solid #e8e0e5", flexWrap:"wrap" }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:7, height:7, borderRadius:"50%", background:adminTheme.bookedColor, display:"inline-block" }} /> Gebucht</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:7, height:7, borderRadius:"50%", background:adminTheme.pendingColor, display:"inline-block" }} /> Anfrage</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:10, height:10, borderRadius:2, background:`repeating-linear-gradient(-45deg, transparent, transparent 2px, ${adminTheme.blockedColor}25 2px, ${adminTheme.blockedColor}25 3.5px)`, border:`1px solid ${adminTheme.blockedColor}30`, display:"inline-block" }} /> {winW < 520 ? "Intern" : "Interner Termin"}</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:12, height:12, borderRadius:3, background:"#fff", color:adminTheme.seriesColor, border:`1.5px solid ${adminTheme.seriesColor}`, fontSize:7, fontWeight:700, display:"inline-flex", alignItems:"center", justifyContent:"center", boxSizing:"border-box" }}>S</span> {winW < 520 ? "Serie" : "Serientermin"}</span>
        </div>
      )}

      <div style={{ maxWidth: !isAdmin ? "100%" : winW > 900 ? 1100 : 700, margin:"0 auto", padding: !isAdmin ? 0 : winW < 520 ? "12px 10px" : winW > 900 ? "24px 40px" : "16px 16px", ...(!isAdmin ? { flex:"1 1 auto", display:"flex", flexDirection:"column", width:"100%", boxSizing:"border-box" } : {}) }}>
        {!isAdmin && (() => {
          const isDesk = winW >= 900;
          const headerH = isDesk ? 50 : 44;
          const big = winW >= 1400;
          const padV = isDesk ? (big ? 28 : 22) : 10;
          const padH = isDesk ? (big ? 56 : 40) : 12;
          const maxW = big ? 1400 : isDesk ? 1180 : 780;
          const heroH = isDesk ? (big ? "clamp(460px, 52vh, 680px)" : "clamp(380px, 46vh, 560px)") : "clamp(200px, 28vh, 320px)";
          const heroMb = isDesk ? (big ? 22 : 16) : 12;
          const titleFs = isDesk ? (big ? 26 : 22) : Math.max(10, Math.min(13, (winW - 2 * 10) / 30));
          const titleMb = isDesk ? 16 : 8;
          const cardPad = isDesk ? (big ? "22px 22px" : "18px 18px") : "13px 12px";
          const cardLabelFs = isDesk ? (big ? 17 : 15) : 14;
          const cardDescFs = isDesk ? (big ? 13 : 12) : 11;
          const cardDetailFs = isDesk ? (big ? 12 : 11) : 10;
          const cardPriceFs = isDesk ? (big ? 11 : 10) : 10;
          const cardBtnFs = isDesk ? (big ? 12 : 11) : 11;
          const gapCards = isDesk ? (big ? 14 : 12) : 8;
          const bulletFs = isDesk ? (big ? 13 : 12) : 10;
          const bulletMt = isDesk ? (big ? 16 : 12) : 8;
          return (
        <>
        <div style={{ flex:"1 1 auto", display:"flex", flexDirection:"column", padding:`${padV}px ${padH}px ${isDesk ? 0 : 10}px`, boxSizing:"border-box", maxWidth: maxW, margin:"0 auto", width:"100%" }}>
          {/* Hero */}
          <div style={{ position:"relative", borderRadius: !isDesk ? 12 : 16, overflow:"hidden", marginBottom: !isDesk ? 12 : heroMb, height: heroH, touchAction:"pan-y", flexShrink:0 }}
            onTouchStart={e => { e.currentTarget._sx = e.touches[0].clientX; e.currentTarget._sy = e.touches[0].clientY; }}
            onTouchEnd={e => { const dx = e.changedTouches[0].clientX - (e.currentTarget._sx||0); const dy = Math.abs(e.changedTouches[0].clientY - (e.currentTarget._sy||0)); if (Math.abs(dx) > 40 && Math.abs(dx) > dy) { if (dx < 0) setHeroIdx(i => (i+1) % 7); else setHeroIdx(i => (i+6) % 7); } }}>
            {heroImages.map((src, idx) => (
              <div key={idx} style={{ position:"absolute", inset:0, backgroundImage:`url(${src})`, backgroundSize:"cover", backgroundPosition:"center 40%", opacity: idx === heroIdx ? 1 : 0, transition:"opacity 1s ease-in-out", zIndex: idx === heroIdx ? 1 : 0 }} />
            ))}
            {!isDesk && <div style={{ position:"absolute", top:0, left:0, right:0, height:"55%", background:"linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 55%, transparent 100%)", zIndex:2 }} />}
            {isDesk && <div style={{ position:"absolute", bottom:0, left:0, width:"70%", height:"70%", background:"radial-gradient(ellipse at bottom left, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 40%, transparent 70%)", zIndex:2 }} />}
            <div style={{ position:"absolute", top:0, right:0, width:"40%", height:"35%", background:"radial-gradient(ellipse at top right, rgba(0,0,0,0.4) 0%, transparent 70%)", zIndex:2 }} />
            <img src="/assets/logo-titelbild.png" alt="" style={{ position:"absolute", top: isDesk ? (big ? 26 : 20) : 12, right: isDesk ? (big ? 30 : 24) : 12, height: isDesk ? (big ? 70 : 56) : 30, opacity:0.85, filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.3))", zIndex:3 }} />
            {!isDesk && (
              <div style={{ position:"absolute", top:0, left:0, right:0, padding:"16px 16px", zIndex:3 }}>
                <div style={{ fontSize:20, fontWeight:700, color:"#fff", letterSpacing:1, textShadow:"0 2px 8px rgba(0,0,0,0.4)", lineHeight:1.3 }}>Ihr Veranstaltungsort<br/>in Klagenfurt am Wörthersee</div>
              </div>
            )}
            {!isDesk && (
              <div style={{ position:"absolute", bottom:0, right:0, padding:"16px 16px", zIndex:3 }}>
                <button onClick={(e) => { e.stopPropagation(); setSelectedDate(null); setModalView("selectType"); }}
                  style={{ background:siteTheme.bookBtnBg, color:siteTheme.bookBtnText, border:"none", borderRadius:10, padding:"10px 16px", fontSize:14, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", boxShadow:"0 6px 20px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap:8, letterSpacing:0.5 }}>
                  Location buchen
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            )}
            {/* Left arrow hover zone */}
            {isDesk && <div className="hero-arrow-zone"
              onClick={() => setHeroIdx(i => (i+6) % 7)}
              style={{ position:"absolute", left:0, top:"15%", width: big ? 100 : 80, height:"70%", zIndex:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div className="hero-arrow-btn" style={{ width: big ? 50 : 40, height: big ? 50 : 40, borderRadius:"50%", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,255,255,0.2)", opacity:0, transition:"opacity .25s" }}>
                <svg width={big ? 22 : 18} height={big ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
              </div>
            </div>}
            {/* Right arrow hover zone */}
            {isDesk && <div className="hero-arrow-zone"
              onClick={() => setHeroIdx(i => (i+1) % 7)}
              style={{ position:"absolute", right:0, top:"15%", width: big ? 100 : 80, height:"70%", zIndex:4, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div className="hero-arrow-btn" style={{ width: big ? 50 : 40, height: big ? 50 : 40, borderRadius:"50%", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(255,255,255,0.2)", opacity:0, transition:"opacity .25s" }}>
                <svg width={big ? 22 : 18} height={big ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>}
            {/* Dots hover zone - only desktop */}
            {isDesk && <div className="hero-dots-zone"
              style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:"50%", maxWidth:300, height:40, zIndex:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div className="hero-dots-inner" style={{ display:"flex", gap:6, opacity:0, transition:"opacity .25s" }}>
                {heroImages.map((_, idx) => (
                  <button key={idx} onClick={(e) => { e.stopPropagation(); setHeroIdx(idx); }} style={{ width:8, height:8, borderRadius:"50%", background: idx === heroIdx ? "#fff" : "rgba(255,255,255,0.5)", border:"none", cursor:"pointer", padding:0, transition:"all .25s" }} />
                ))}
              </div>
            </div>}
            {isDesk && <div style={{ position:"absolute", bottom: big ? 36 : 28, left: big ? 40 : 32, right: big ? 40 : 32, zIndex:3, display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:16, pointerEvents:"none" }}>
              <div>
                <div style={{ fontSize: big ? 36 : 28, fontWeight:700, color:"#fff", letterSpacing:1, textShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>Paradiesgarten Mattuschka</div>
                <div style={{ fontSize: big ? 16 : 14, color:"rgba(255,255,255,0.85)", marginTop:4, textShadow:"0 1px 4px rgba(0,0,0,0.3)" }}>Ihr Veranstaltungsort in Klagenfurt am Wörthersee</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setSelectedDate(null); setModalView("selectType"); }}
                onMouseEnter={e => { e.currentTarget.style.transform="scale(1.03)"; e.currentTarget.style.filter="brightness(1.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.filter="brightness(1)"; }}
                style={{ background:siteTheme.bookBtnBg, color:siteTheme.bookBtnText, border:"none", borderRadius:10, padding: big ? "16px 32px" : "14px 28px", fontSize: big ? 18 : 16, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", boxShadow:"0 6px 20px rgba(0,0,0,0.2)", flexShrink:0, display:"flex", alignItems:"center", gap:8, letterSpacing:0.5, transition:"all .2s ease", pointerEvents:"auto" }}>
                Location buchen
                <svg width={big ? 18 : 16} height={big ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
              </button>
            </div>}
          </div>

          {/* Title */}
          <h2 style={{ margin:0, fontSize: titleFs, fontWeight:700, color: BRAND.aubergine, letterSpacing: isDesk ? 2 : 1.5, textTransform:"uppercase", marginBottom: titleMb, textAlign:"center", flexShrink:0 }}>
            Unsere Veranstaltungen & Preise
          </h2>

          {/* Event cards — 2x3 desktop, 3x2 mobile — natural height on all sizes */}
          <div style={{ display:"grid", gridTemplateColumns: isDesk ? "repeat(3, 1fr)" : "repeat(2, 1fr)", gridAutoRows:"auto", gap: gapCards, flex:"0 0 auto" }}>
            {eventTypes.map(et => {
              const isGroup = et.isGroupTour;
              const showTags = winW >= 600;
              const showDetail = winW >= 600;
              const descLines = 2;
              const detailLines = 3;
              const tagsH = winW >= 600 ? (big ? 22 : 20) : 0;
              return (
                <div key={et.id} onClick={() => handleCardClick(et.id)} className="evt-card"
                  style={{ "--card-color": et.color, background:"#fff", borderRadius: big ? 12 : 10, padding: cardPad, borderLeft:`${big ? 4 : 3}px solid ${et.color}`, boxShadow:"0 2px 10px rgba(0,0,0,0.04)", cursor:"pointer", transition:"all .25s ease", display:"flex", flexDirection:"column", minWidth:0 }}>
                  {/* Top section: label, desc, detail, tags — closely stacked */}
                  <h3 style={{ margin:0, fontWeight:700, color: et.color, fontSize: cardLabelFs, marginBottom:3, wordBreak:"break-word", hyphens:"auto", lineHeight:1.2 }}>{et.label}</h3>
                  <div style={{ fontSize: cardDescFs, color:"#666", lineHeight:1.35, marginBottom:8, fontWeight:500, display:"-webkit-box", WebkitBoxOrient:"vertical", WebkitLineClamp: descLines, overflow:"hidden", textOverflow:"ellipsis" }}>{et.desc}</div>
                  {showDetail && et.detail && (
                    <div style={{ fontSize: cardDetailFs, color:"#888", lineHeight:1.45, marginBottom:8, display:"-webkit-box", WebkitBoxOrient:"vertical", WebkitLineClamp: detailLines, overflow:"hidden", textOverflow:"ellipsis" }}>{et.detail}</div>
                  )}
                  {showTags && et.tags && et.tags.length > 0 && (
                    <div style={{ display:"flex", alignItems:"center", flexWrap:"nowrap", gap:5, height: tagsH, overflow:"hidden", marginBottom: 6 }}>
                      {et.tags.map((tg,ti) => (
                        <span key={ti} style={{ fontSize: big ? 10 : 9, color: et.color, background: et.color+"15", padding:"4px 10px", borderRadius:10, whiteSpace:"nowrap", fontWeight:500, flexShrink:0, display:"inline-flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>{tg}</span>
                      ))}
                    </div>
                  )}
                  {/* Price inline under tags on desktop/tablet; with button on mobile */}
                  {showTags && (
                    <div style={{ color: et.color, fontSize: cardPriceFs, fontWeight:700, textAlign:"left" }}>
                      {isGroup ? `€ ${et.pricePerPerson} p.P.` : et.halfDay === 0 ? "auf Anfrage" : `ab ${fmt(et.halfDay)}`}
                    </div>
                  )}
                  {/* Bottom section: button (and price on mobile) pinned to bottom */}
                  <div style={{ marginTop:"auto", paddingTop: isDesk ? 18 : 14 }}>
                    {!showTags && (
                      <div style={{ color: et.color, fontSize: cardPriceFs, fontWeight:700, textAlign:"left", marginBottom: 8 }}>
                        {isGroup ? `€ ${et.pricePerPerson} p.P.` : et.halfDay === 0 ? "auf Anfrage" : `ab ${fmt(et.halfDay)}`}
                      </div>
                    )}
                    <div style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize: cardBtnFs, color: et.color, fontWeight:600, padding: isDesk ? (big ? "8px 14px" : "7px 13px") : "6px 11px", borderRadius:8, background: et.color+"30", letterSpacing:0.3 }}>
                      Jetzt anfragen <svg width={big ? 12 : 10} height={big ? 12 : 10} viewBox="0 0 24 24" fill="none" stroke={et.color} strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        {/* Footer bar — full width, rectangular, extends edge to edge */}
        <div style={{ width:"100%", display:"flex", flexWrap:"wrap", gap: isDesk ? 8 : 6, justifyContent:"center", padding: isDesk ? `10px ${padH}px 14px` : "8px 12px 12px", flexShrink:0, boxSizing:"border-box" }}>
          {["Mitten im Blütenmeer","120 m² Veranstaltungsglashaus","15.000 m² Paradiesgarten","Blick auf Karawanken & Klagenfurt","Historischer Paradiesgarten","einzigartig · idyllisch"].map(t => (
            <span key={t} style={{ fontSize: isDesk ? bulletFs : 10, color:siteTheme.footerText, background:`${siteTheme.footerBg}10`, border:`1px solid ${siteTheme.footerBg}20`, borderRadius:20, padding: isDesk ? (big ? "6px 14px" : "5px 12px") : "4px 12px", whiteSpace:"nowrap" }}>{t}</span>
          ))}
        </div>
        </>
          );
        })()}

        {isAdmin && <div style={{ maxWidth: isAdmin && winW > 900 ? "80%" : "none", margin: isAdmin && winW > 900 ? "0 auto" : 0 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: winW < 520 ? 8 : 12 }}>
          <button onClick={prevMonth} style={{ ...navBtn, width: winW < 520 ? 36 : 44, height: winW < 520 ? 36 : 44 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize: winW < 520 ? 18 : winW > 900 ? 26 : (isAdmin ? 20 : 22), fontWeight:700, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase" }}>{MONTHS[month]}</div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <button onClick={() => setYear(y=>y-1)} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:14, padding:"1px 6px", borderRadius:4, transition:"all .2s" }}
                onMouseEnter={e => e.target.style.color=BRAND.lila} onMouseLeave={e => e.target.style.color="#ccc"}>‹</button>
              <span style={{ fontSize: isAdmin ? 11 : 12, color:"#999", letterSpacing:3, cursor:"default" }}>{year}</span>
              <button onClick={() => setYear(y=>y+1)} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:14, padding:"1px 6px", borderRadius:4, transition:"all .2s" }}
                onMouseEnter={e => e.target.style.color=BRAND.lila} onMouseLeave={e => e.target.style.color="#ccc"}>›</button>
            </div>
            {(month !== today.getMonth() || year !== today.getFullYear()) && (
              <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
                style={{ background:"none", border:`1px solid ${BRAND.lila}40`, color: BRAND.lila, padding:"2px 10px", borderRadius:12, fontSize:9, fontWeight:600, cursor:"pointer", marginTop:2, letterSpacing:0.5 }}>
                Heute
              </button>
            )}
          </div>
          <button onClick={nextMonth} style={{ ...navBtn, width: winW < 520 ? 36 : 44, height: winW < 520 ? 36 : 44 }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap: winW < 520 ? 4 : winW > 900 ? 6 : 2, marginBottom: winW > 900 ? 24 : 16 }}>
          {DAYS_H.map(d => (
            <div key={d} style={{ textAlign:"center", fontSize: winW > 900 ? 12 : (isAdmin ? 9 : 10), fontWeight:600, color: BRAND.aubergine, padding: winW > 900 ? "6px 0" : (isAdmin ? "3px 0" : "4px 0"), letterSpacing:2, textTransform:"uppercase" }}>{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = dateKey(year, month, day);
            const evRaw = events[key];
            const ev = evRaw?.status === "deleted" ? null : evRaw;
            const holRaw = holidays[key];
            const hol = (isAdmin ? adminTheme.showHolidaysAdmin : adminTheme.showHolidaysCustomer) ? holRaw : null;
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const customerBooked = !isAdmin && ev && (ev.status === "booked" || ev.status === "blocked") && ev.allDay && !ev.isPublic && !ev.isSeries;
            const customerPublic = !isAdmin && ev && ev.isPublic && !ev.isSeries;
            const customerSeries = !isAdmin && ev && ev.isSeries;
            const customerFree = !isAdmin && (!ev || ev.status === "pending" || ev.isSeries || !ev.allDay);
            const statusColor = ev ? (ev.status === "booked" ? adminTheme.bookedColor : ev.status === "pending" ? adminTheme.pendingColor : adminTheme.blockedColor) : null;
            const isPending = ev?.status === "pending" && isAdmin;
            const isBlockedAdmin = ev && isAdmin && ev.status === "blocked" && !ev.isSeries;
            const isBlockedAdminAllDay = isBlockedAdmin && ev.allDay; // strichlierter Hatch nur bei ganztägig
            const isSeriesAdmin = ev && isAdmin && ev.isSeries;
            return (
              <button key={key} className={isPast ? "" : customerBooked ? "day-booked" : (isAdmin && ev && (ev.status === "booked" || ev.status === "blocked" || ev.status === "pending")) ? "day-hasevent" : "day-free"} onClick={() => handleDateClick(day)} title={customerBooked ? "nicht verfügbar" : customerPublic ? (ev.label || "Veranstaltung") : isAdmin && ev?.label ? ev.label : ""}
                style={{
                  aspectRatio:"1",
                  border: isToday ? `2.5px solid ${adminTheme.todayColor}` : (isPast && ev) ? "1px solid #e8e0e5" : customerPublic ? `1.5px solid ${BRAND.moosgruen}50` : isPending ? `2.5px solid ${adminTheme.pendingColor}` : customerBooked ? `1.5px solid ${BRAND.lila}90` : isBlockedAdminAllDay ? `1px solid ${adminTheme.blockedColor}30` : ev && isAdmin && !ev.isSeries ? `1.5px solid ${statusColor}` : "1px solid #e8e0e5",
                  borderRadius: winW > 900 ? 10 : 8,
                  background: isBlockedAdminAllDay ? `repeating-linear-gradient(-45deg, transparent 0 6px, ${adminTheme.blockedColor}35 6px 10px)` : isSeriesAdmin ? "#fff" : customerBooked ? `${BRAND.lila}55` : customerPublic ? `${BRAND.moosgruen}10` : ev && isAdmin && !ev.isSeries && ev.status !== "pending" ? (ev.allDay ? `${statusColor}20` : "#fff") : isToday ? `${adminTheme.todayColor}10` : (isPast ? "#f5f3f4" : "#fff"),
                  cursor: isPast && !ev ? "default" : isPast && ev && isAdmin ? "pointer" : customerBooked ? "default" : "pointer", position:"relative", display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", opacity: isPast ? 0.5 : 1, transition:"all .15s", padding: isAdmin ? 2 : 3, paddingTop: hol && !ev && winW > 900 ? 14 : (isAdmin ? 2 : 3),
                  overflow:"hidden",
                }}>
                {/* Series indicator for admin - S badge */}
                {isSeriesAdmin && <div style={{ position:"absolute", top:4, right:4, background:"#fff", color:adminTheme.seriesColor, border:`1.5px solid ${adminTheme.seriesColor}`, fontSize: winW > 900 ? 11 : 8, fontWeight:700, width: winW > 900 ? 20 : 14, height: winW > 900 ? 20 : 14, borderRadius: winW > 900 ? 4 : 3, display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, boxSizing:"border-box" }}>S</div>}
                {/* Pending indicator for admin */}
                {isPending && !isPast && ev.allDay && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:adminTheme.pendingColor, color:"#fff", fontSize: winW > 900 ? 8 : 6, fontWeight:700, textAlign:"center", borderRadius: winW > 900 ? "0 0 8px 8px" : "0 0 6px 6px", padding: winW > 900 ? "3px 0" : "2px 0", letterSpacing:0.5, lineHeight:1.1 }}>Anfrage</div>}
                {hol && !ev && (winW > 900 ?
                  <div style={{ position:"absolute", top:0, left:0, right:0, background:`${BRAND.aubergine}50`, color:BRAND.aubergine, fontSize:9, lineHeight:1, borderRadius:"10px 10px 2px 2px", padding:"3px 2px", textAlign:"center", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{hol}</div>
                  : <div style={{ position:"absolute", top:0, left:0, right:0, height:5, background:BRAND.aubergine, opacity:0.35, borderRadius:"8px 8px 0 0" }} />
                )}
                <span style={{ fontSize: winW > 900 ? 16 : (isAdmin ? 12 : 14), fontWeight: isToday || (ev && isAdmin && !ev.isSeries) || customerBooked ? 700 : (hol && !ev && winW <= 900 ? 600 : 400), color: isToday && !ev ? adminTheme.todayColor : customerBooked ? BRAND.lila : ev && isAdmin && !ev.isSeries && ev.status!=="blocked" ? statusColor : (hol && !ev && winW <= 900 ? BRAND.lila : BRAND.aubergine) }}>{day}</span>
                {customerBooked && <div style={{ display:"flex", gap:2, marginTop:2 }}><div style={{ width: winW > 900 ? 8 : 7, height: winW > 900 ? 8 : 7, borderRadius:"50%", background: BRAND.lila }} /></div>}
                {customerPublic && <div style={{ width: winW > 900 ? 8 : 7, height: winW > 900 ? 8 : 7, borderRadius:"50%", background: BRAND.moosgruen, marginTop:2 }} />}
                {customerSeries && ev.isPublic && <div style={{ width:5, height:5, borderRadius:"50%", background: BRAND.moosgruen, marginTop:2, opacity:0.6 }} />}
                {ev && isAdmin && !ev.isSeries && (() => {
                  // Bänder-Darstellung: bei teilverbuchten Events (nicht ganztägig) — egal ob gebucht, Anfrage oder intern
                  // Jeder Termin (Haupt + SubEvents) bekommt einen eigenen Balken unten, Farbe je Einzelstatus
                  const isPartial = !ev.allDay && (ev.status === "booked" || ev.status === "pending" || ev.status === "blocked");
                  const bandColor = (s) => s.status === "blocked" ? adminTheme.blockedColor : s.status === "pending" ? adminTheme.pendingColor : adminTheme.bookedColor;
                  if (isPartial) {
                    const bands = [{ color: bandColor(ev) }];
                    (ev.subEvents || []).forEach(s => {
                      if (s && !s.allDay && s.status !== "deleted") bands.push({ color: bandColor(s) });
                    });
                    const visible = bands.slice(0, 5);
                    const thickness = winW > 900 ? 4 : 3;
                    const gap = winW > 900 ? 2 : 1.5;
                    const bottomPad = winW > 900 ? 5 : 3;
                    const sidePad = winW > 900 ? 6 : 4;
                    return (
                      <div style={{ position:"absolute", bottom: bottomPad, left: sidePad, right: sidePad, display:"flex", flexDirection:"column", gap: gap+"px", pointerEvents:"none" }}>
                        {visible.map((b, i) => (
                          <div key={i} style={{ height: thickness, background: b.color, opacity: isPast ? 0.35 : 0.85, borderRadius: 2 }} />
                        ))}
                      </div>
                    );
                  }
                  // Bei blocked-Haupt ganztägig: Dots für non-blocked Sub-Events (damit Zusatz-Buchungen im strichlierten Tag sichtbar bleiben)
                  if (ev.status === "blocked" && ev.allDay) {
                    const subDots = (ev.subEvents || []).filter(s => s && s.status !== "blocked").map(s => ({ color: s.status === "booked" ? adminTheme.bookedColor : adminTheme.pendingColor }));
                    if (subDots.length === 0) return null;
                    const sz = winW > 900 ? 6 : 4;
                    return (
                      <div style={{ display:"flex", gap:2, marginTop:3, justifyContent:"center" }}>
                        {subDots.map((d,i) => <div key={i} style={{ width:sz, height:sz, borderRadius:"50%", background: d.color }} />)}
                      </div>
                    );
                  }
                  // allDay booked/pending: nichts (Punkt weg, User-Wunsch)
                  return null;
                })()}
              </button>
            );
          })}
        </div>

        </div>}
        {/* Admin: 1. Offene Anfragen */}
        {isAdmin && (() => {
          const pending = [];
          Object.entries(events).forEach(([key, ev]) => {
            if (ev.status === "pending") pending.push({ key, ev, subIndex: -1 });
            (ev.subEvents || []).forEach((sub, si) => {
              if (sub.status === "pending") pending.push({ key, ev: sub, subIndex: si });
            });
          });
          pending.sort((a,b) => a.key.localeCompare(b.key));
          if (!pending.length) return null;
          return (
            <div style={{ marginBottom:20 }}>
              <div onClick={() => setShowPending(s=>!s)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom: showPending ? 8 : 0 }}>
                <span style={{ fontSize: winW > 900 ? 13 : 11, fontWeight:600, color:BRAND.aprikot, textTransform:"uppercase", letterSpacing:2 }}>Offene Anfragen</span>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ background:`${BRAND.aprikot}15`, color:BRAND.aprikot, fontSize:11, fontWeight:500, padding:"2px 10px", borderRadius:10 }}>{pending.length}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: showPending ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke={BRAND.aprikot} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </div>
              {showPending && <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {pending.map(({ key, ev, subIndex }) => {
                  const [yy,mm,dd] = key.split("-").map(Number);
                  const d = new Date(yy,mm-1,dd);
                  const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
                  const monthShort = ["Jän","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][mm-1];
                  const rowKey = `${key}${subIndex>=0?"-s"+subIndex:""}`;
                  return (
                    <SwipeRow key={rowKey} onSwipeRight={() => handleAdminAction(key,"confirm",subIndex)} onSwipeLeft={() => handleAdminAction(key,"delete",subIndex)} rightLabel="Annehmen" rightColor={BRAND.mintgruen} leftLabel="Ablehnen" leftColor="#e0d5df">
                      <div onClick={() => openEventInAdmin(key, subIndex)} className="admin-card"
                        style={{ display:"flex", alignItems:"center", gap:14, padding: winW > 900 ? "7px 16px" : "6px 14px", background:"#fff", borderRadius:10, border:"0.5px solid #e8e0e5", borderLeft:`4px solid ${BRAND.aprikot}`, cursor:"pointer" }}>
                        <div style={{ flexShrink:0, width:42, textAlign:"center", paddingRight:12, borderRight:"1px solid #f0ecef" }}>
                          <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, lineHeight:1 }}>{dayName}</div>
                          <div style={{ fontSize:20, fontWeight:500, color:BRAND.aubergine, lineHeight:1.1, margin:"1px 0 0" }}>{dd}</div>
                          <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, lineHeight:1 }}>{monthShort}</div>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize: winW > 900 ? 14 : 13, fontWeight:500, color:BRAND.aubergine, marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.label || ev.type}</div>
                          {(ev.slotLabel || ev.name) && (
                            <div style={{ fontSize:12, color:"#999", display:"flex", alignItems:"center", gap:8, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                              {ev.slotLabel && <span style={{ flexShrink:0 }}>{ev.slotLabel}</span>}
                              {ev.slotLabel && ev.name && <span style={{ width:1, height:11, background:"#ddd", flexShrink:0 }} />}
                              {ev.name && <span style={{ overflow:"hidden", textOverflow:"ellipsis", minWidth:0 }}>{ev.name}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                          <button onClick={(e) => { e.stopPropagation(); handleAdminAction(key,"confirm",subIndex); }}
                            onMouseEnter={e => { e.currentTarget.style.background = BRAND.moosgruen; e.currentTarget.style.color = "#fff"; e.currentTarget.querySelector("path").setAttribute("stroke", "#fff"); }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${BRAND.mintgruen}25`; e.currentTarget.style.color = BRAND.moosgruen; e.currentTarget.querySelector("path").setAttribute("stroke", BRAND.moosgruen); }}
                            style={{ background:`${BRAND.mintgruen}25`, color:BRAND.moosgruen, border:`1px solid ${BRAND.mintgruen}80`, borderRadius:8, padding: winW < 520 ? "5px 9px" : "6px 11px", fontSize: winW < 520 ? 11 : 12, fontWeight:500, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:5, letterSpacing:0.2, transition:"all .15s" }}>
                            <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke={BRAND.moosgruen} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Annehmen
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleAdminAction(key,"delete",subIndex); }}
                            title="Ablehnen"
                            onMouseEnter={e => { e.currentTarget.style.background = "#c44"; e.currentTarget.querySelector("path").setAttribute("stroke", "#fff"); }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#fdf6f6"; e.currentTarget.querySelector("path").setAttribute("stroke", "#c44"); }}
                            style={{ background:"#fdf6f6", border:"1px solid #f0caca", borderRadius:8, padding: winW < 520 ? "5px 7px" : "6px 9px", cursor:"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", transition:"all .15s" }}>
                            <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 3l8 8M11 3l-8 8" stroke="#c44" strokeWidth="2" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      </div>
                    </SwipeRow>
                  );
                })}
              </div>}
            </div>
          );
        })()}

        {/* Admin: 2. Kommende + Intern/Serie + Vergangene + Gelöschte */}
        {isAdmin && (() => {
          const allUpcoming = Object.entries(events).filter(([k,v]) => (v.status === "booked" || v.status === "blocked") && k >= todayKey).sort(([a],[b]) => a.localeCompare(b));
          const subEventRows = [];
          allUpcoming.forEach(([k,v]) => {
            if (v.subEvents) v.subEvents.forEach((sub,i) => {
              if (sub.status === "booked" || sub.status === "blocked") subEventRows.push([k, { ...sub, _subIndex: i }]);
            });
          });
          const bookedOnly = [...allUpcoming.filter(([,v]) => v.status === "booked"), ...subEventRows.filter(([,v]) => v.status === "booked")].sort(([a],[b]) => a.localeCompare(b));
          const blockedOnly = allUpcoming.filter(([,v]) => v.status === "blocked");
          const regularBlocked = blockedOnly.filter(([,v]) => !v.isSeries);
          const seriesBlocked = blockedOnly.filter(([,v]) => v.isSeries);
          const internAndSeries = [...regularBlocked, ...seriesBlocked].sort(([a],[b]) => a.localeCompare(b));

          // Group series by seriesId
          const seriesGroups = {};
          seriesBlocked.forEach(([k,v]) => {
            const sid = v.seriesId || v.label || "serie";
            if (!seriesGroups[sid]) seriesGroups[sid] = { label: v.label || "Serie", items: [], first: v };
            seriesGroups[sid].items.push([k,v]);
          });

          const MONTHS_SHORT = ["Jän","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
          const renderRow = (key, ev, color, badge) => {
            const [yy,mm,dd] = key.split("-").map(Number);
            const d = new Date(yy,mm-1,dd);
            const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
            const monthShort = MONTHS_SHORT[mm-1];
            // Akzentbalken links nach Status — Farben aus dem Admin-Design-Theme, damit Kalender und Liste synchron bleiben
            const accentColor = ev.status === "blocked" ? adminTheme.blockedColor : ev.status === "pending" ? adminTheme.pendingColor : adminTheme.bookedColor;
            return (
              <div key={key+(ev._subIndex!=null?"-s"+ev._subIndex:"")} onClick={() => openEventInAdmin(key, ev._subIndex ?? -1)} className="admin-card"
                style={{ display:"flex", alignItems:"center", gap:14, padding: winW > 900 ? "7px 16px" : "6px 14px", background:"#fff", borderRadius:10, border:"0.5px solid #e8e0e5", borderLeft:`4px solid ${accentColor}`, cursor:"pointer" }}>
                <div style={{ flexShrink:0, width:42, textAlign:"center", paddingRight:12, borderRight:"1px solid #f0ecef" }}>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, lineHeight:1 }}>{dayName}</div>
                  <div style={{ fontSize:20, fontWeight:500, color:BRAND.aubergine, lineHeight:1.1, margin:"1px 0 0" }}>{dd}</div>
                  <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, lineHeight:1 }}>{monthShort}</div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  {ev.label && <div style={{ fontSize: winW > 900 ? 14 : 13, fontWeight:500, color:BRAND.aubergine, marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.label}</div>}
                  {(ev.slotLabel || ev.name) && (
                    <div style={{ fontSize:12, color:"#999", display:"flex", alignItems:"center", gap:8, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                      {ev.slotLabel && <span style={{ flexShrink:0 }}>{ev.slotLabel}</span>}
                      {ev.slotLabel && ev.name && <span style={{ width:1, height:11, background:"#ddd", flexShrink:0 }} />}
                      {ev.name && <span style={{ overflow:"hidden", textOverflow:"ellipsis", minWidth:0 }}>{ev.name}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          };

          const renderSectionHeader = (label, count, color, show, setShow) => (
            <div onClick={() => setShow(s=>!s)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", marginBottom: show ? 10 : 0, marginTop:18 }}>
              <span style={{ fontSize: winW > 900 ? 15 : 13, fontWeight:600, color, textTransform:"uppercase", letterSpacing:2 }}>{label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ background:`${color}12`, color, fontSize:13, fontWeight:500, padding:"3px 12px", borderRadius:10 }}>{count}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: show ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
          );

          return (
            <div style={{ marginBottom:24 }}>
              {bookedOnly.length > 0 && <>
                {renderSectionHeader("Kommende Termine", bookedOnly.length, BRAND.aubergine, showUpcoming, setShowUpcoming)}
                {showUpcoming && <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {bookedOnly.map(([key,ev]) => renderRow(key, ev, BRAND.lila,
                    <div style={{ background:BRAND.lila, color:"#fff", padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>Gebucht</div>
                  ))}
                </div>}
              </>}

              {(regularBlocked.length > 0 || Object.keys(seriesGroups).length > 0) && <>
                {renderSectionHeader("Intern & Serie", internAndSeries.length, "#009a93", showInternal, setShowInternal)}
                {showInternal && <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {regularBlocked.map(([key,ev]) => renderRow(key, ev, "#009a93",
                    <div style={{ background:"#009a93", color:"#fff", padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>Intern</div>
                  ))}
                  {Object.entries(seriesGroups).map(([sid, group]) => {
                    if (!group || !group.first) return null;
                    const isOpen = expandedSeries === sid;
                    const sortedItems = [...(group.items || [])].sort(([a],[b]) => a.localeCompare(b));
                    const gFirst = group.first;
                    return (
                      <div key={sid}>
                        <div onClick={() => setExpandedSeries(isOpen ? null : sid)} className="admin-card"
                          style={{ display:"flex", alignItems:"center", gap:14, padding: winW > 900 ? "7px 16px" : "6px 14px", background:"#fff", borderRadius:10, border:"0.5px solid #e8e0e5", borderLeft:`4px solid ${adminTheme.seriesColor}`, cursor:"pointer" }}>
                          <div style={{ flexShrink:0, width:42, textAlign:"center", paddingRight:12, borderRight:"1px solid #f0ecef" }}>
                            <div style={{ width:26, height:26, margin:"0 auto", background:"#fff", color:adminTheme.seriesColor, border:`1.5px solid ${adminTheme.seriesColor}`, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:500, lineHeight:1, boxSizing:"border-box" }}>S</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:1 }}>
                              <span style={{ fontWeight:500, color:adminTheme.seriesColor, fontSize: winW > 900 ? 14 : 13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{group.label}</span>
                              <span style={{ fontSize:12, color:`${adminTheme.seriesColor}88`, flexShrink:0 }}>{group.items.length} Termine</span>
                              <svg width="10" height="10" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink:0 }}><path d="M2 4l4 4 4-4" stroke={adminTheme.seriesColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </div>
                            {gFirst.slotLabel && <div style={{ fontSize:12, color:"#999" }}>{gFirst.slotLabel}</div>}
                          </div>
                          <div style={{ display:"flex", gap:6, flexShrink:0, marginLeft:"auto" }}>
                            <button onClick={(e) => { e.stopPropagation();
                              setSelectedDate(group.items[0][0]);
                              setAdminForm({ type: gFirst.status || "blocked", label: gFirst.label || "", note: gFirst.note || "", startTime: gFirst.startTime || "08:00", endTime: gFirst.endTime || "22:00", adminNote: gFirst.adminNote || "", eventType: gFirst.type || "", allDay: gFirst.allDay || false, checklist: gFirst.checklist || [], contactName: gFirst.contactName || "", contactPhone: gFirst.contactPhone || "", contactAddress: gFirst.contactAddress || "", publicText: gFirst.publicText || "", isPublic: gFirst.isPublic || false, isSeries: false, seriesDates: [], seriesId: sid, editAllSeries: true, price: gFirst.price || "", paymentStatus: gFirst.paymentStatus || "open", partialAmount: gFirst.partialAmount || "", cleaningFee: !!gFirst.cleaningFee });
                              setSeriesMonth(null); setSeriesYear(null); setModalView("admin");
                            }}
                              onMouseEnter={e => e.currentTarget.style.opacity="0.7"} onMouseLeave={e => e.currentTarget.style.opacity="1"}
                              style={{ background:"none", border:`1px solid ${adminTheme.seriesColor}30`, borderRadius:5, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", transition:"opacity .15s" }}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3L5 14H2v-3z" stroke={adminTheme.seriesColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type:"series", sid, label: group.label, count: group.items.length, items: group.items }); }}
                              onMouseEnter={e => e.currentTarget.style.opacity="0.7"} onMouseLeave={e => e.currentTarget.style.opacity="1"}
                              style={{ background:"none", border:"1px solid #c4440020", borderRadius:5, padding:"4px 7px", cursor:"pointer", display:"flex", alignItems:"center", transition:"opacity .15s" }}>
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" stroke="#c44" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        </div>
                        {isOpen && <div style={{ paddingLeft:12, borderLeft:`2px solid ${adminTheme.seriesColor}20`, marginLeft:8, marginTop:2 }}>
                          {sortedItems.map(([key,ev]) => renderRow(key, ev, adminTheme.seriesColor,
                            <div style={{ background:`${adminTheme.seriesColor}18`, color:adminTheme.seriesColor, padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>Serie</div>
                          ))}
                        </div>}
                      </div>
                    );
                  })}
                </div>}
              </>}

              {/* Vergangene */}
              {(() => {
                const pastAll = Object.entries(events).filter(([k,v]) => (v.status === "booked" || v.status === "blocked") && k < todayKey).sort(([a],[b]) => b.localeCompare(a));
                if (!pastAll.length) return null;
                return <>
                  {renderSectionHeader("Vergangene Termine", pastAll.length, "#aaa", showPast, setShowPast)}
                  {showPast && <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {pastAll.map(([key,ev]) => {
                      const isSeries = ev.isSeries;
                      const isBlocked = ev.status === "blocked";
                      const accentC = isSeries ? adminTheme.seriesColor : isBlocked ? "#009a93" : BRAND.lila;
                      return <div key={key} style={{ opacity:0.6 }}>{renderRow(key, ev, "#aaa",
                        <div style={{ background: `${accentC}30`, color: accentC, padding:"5px 12px", borderRadius:5, fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0 }}>{isSeries ? "Serie" : isBlocked ? "Intern" : "Gebucht"}</div>
                      )}</div>;
                    })}
                  </div>}
                </>;
              })()}
              {(() => {
                // Gelöschte Haupt-Events + gelöschte Sub-Events einsammeln
                const deletedAll = [];
                Object.entries(events).forEach(([key, ev]) => {
                  if (ev.status === "deleted") deletedAll.push([key, ev, -1]);
                  if (Array.isArray(ev.subEvents)) {
                    ev.subEvents.forEach((sub, i) => {
                      if (sub && sub.status === "deleted") deletedAll.push([key, sub, i]);
                    });
                  }
                });
                deletedAll.sort(([a],[b]) => b.localeCompare(a));
                if (!deletedAll.length) return null;
                return (
                  <div style={{ marginTop:20 }}>
                    <h3 onClick={() => setShowDeleted(s=>!s)} style={{ fontSize: winW > 900 ? 13 : 11, fontWeight:600, color:"#c44", letterSpacing:2, textTransform:"uppercase", marginBottom: showDeleted ? 10 : 0, cursor:"pointer", display:"flex", alignItems:"center", gap:8, opacity:0.7 }}>
                      Gelöschte Termine ({deletedAll.length})
                      <svg width="10" height="10" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: showDeleted ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke="#c44" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </h3>
                    {showDeleted && deletedAll.map(([key, ev, subIdx]) => {
                      const rowKey = `${key}${subIdx >= 0 ? "-s" + subIdx : ""}`;
                      return (
                        <div key={rowKey} onClick={() => { if (subIdx < 0) { setSelectedDate(key); setFromCalendar(false); setModalView("info"); } }}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#fdf6f6", borderRadius:8, marginBottom:4, border:"1px solid #f0e0e0", opacity:0.6, cursor: subIdx < 0 ? "pointer" : "default", transition:"opacity .15s" }}
                          onMouseEnter={e => e.currentTarget.style.opacity="0.85"} onMouseLeave={e => e.currentTarget.style.opacity="0.6"}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#888" }}>{fmtDateAT(key)}</div>
                            <div style={{ fontSize:11, color:"#aaa", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.label}{ev.name ? ` · ${ev.name}` : ""}</div>
                          </div>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            const u = {...events};
                            if (subIdx >= 0) {
                              // Sub-Event wiederherstellen: status auf previousStatus zurücksetzen
                              const day = { ...u[key] };
                              day.subEvents = (day.subEvents || []).map((s, i) => i === subIdx
                                ? { ...s, status: s.previousStatus || "pending", previousStatus: undefined, deletedAt: undefined }
                                : s);
                              u[key] = day;
                            } else {
                              u[key] = {...u[key], status: u[key].previousStatus || "booked"};
                              delete u[key].previousStatus;
                              delete u[key].deletedAt;
                            }
                            saveEvents(u);
                          }}
                            title="Wiederherstellen"
                            style={{ background:"none", border:`1px solid ${BRAND.moosgruen}40`, borderRadius:6, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:BRAND.moosgruen }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 7h7a3 3 0 1 1 0 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={(e) => {
                            e.stopPropagation();
                            if (subIdx >= 0) {
                              // Sub-Event endgültig entfernen
                              const u = {...events};
                              const day = { ...u[key] };
                              day.subEvents = (day.subEvents || []).filter((_, i) => i !== subIdx);
                              u[key] = day;
                              saveEvents(u);
                            } else {
                              handleAdminAction(key, "permDelete");
                            }
                          }}
                            title="Endgültig löschen"
                            style={{ background:"none", border:"1px solid #e0c0c0", borderRadius:6, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:"#c44" }}>
                            <svg width="12" height="12" viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Prices Modal */}
        {showPrices && (
          <div onClick={() => setShowPrices(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#f5f3f4", borderRadius:16, padding:"24px 20px", maxWidth:500, width:"100%", maxHeight:"80vh", overflowY:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.15)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:BRAND.aubergine }}>Preise verwalten</h3>
                <button onClick={() => setShowPrices(false)} style={{ background:"none", border:"none", fontSize:20, color:"#aaa", cursor:"pointer", padding:4, lineHeight:1 }}
                  onMouseEnter={e => e.currentTarget.style.color=BRAND.aubergine} onMouseLeave={e => e.currentTarget.style.color="#aaa"}>×</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {eventTypes.map(et => (
                  <div key={et.id} onClick={() => { setEditingType({...et}); setShowPrices(false); }}
                    className="admin-card"
                    style={{ background:"#fff", borderRadius:10, padding:"14px 16px", borderLeft:`4px solid ${et.color}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s" }}>
                    <div>
                      <div style={{ fontWeight:700, color:BRAND.aubergine, fontSize:14, marginBottom:2 }}>{et.label}</div>
                      <div style={{ fontSize:11, color:"#888" }}>
                        {et.isGroupTour
                          ? `€ ${et.pricePerPerson} p.P. · ab ${et.minPersons} Pers.`
                          : `Halbtags ${et.halfDay === 0 ? "auf Anfrage" : fmt(et.halfDay)} · Ganztags ${et.fullDay === 0 ? "auf Anfrage" : fmt(et.fullDay)}`
                        }
                      </div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink:0, opacity:0.3 }}><path d="M5 3l4 4-4 4" stroke={BRAND.aubergine} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Design Modals (Kunden- + Admin-Ansicht) */}
        {(showDesign || showDesignAdmin) && (() => {
          const isAdminMode = showDesignAdmin;
          const modalTitle = isAdminMode ? "Design anpassen – Adminansicht" : "Design anpassen – Kundenansicht";

          // Draft-State pro Modal
          const draftTypes = designDraftTypes || eventTypes;
          const draftTheme = designDraftTheme || siteTheme;
          const draftAdmin = designDraftAdmin || adminTheme;

          // Helper: hat sich ein bestimmtes Feld geändert (vs. persistiertem Wert)?
          const isDirtyType = (id) => {
            if (!designDraftTypes) return false;
            const d = designDraftTypes.find(t => t.id === id);
            const o = eventTypes.find(t => t.id === id);
            return d && o && (d.color || "").toLowerCase() !== (o.color || "").toLowerCase();
          };
          const isDirtyTheme = (key) => designDraftTheme && (designDraftTheme[key] || "").toLowerCase() !== (siteTheme[key] || "").toLowerCase();
          const isDirtyAdmin = (key) => designDraftAdmin && String(designDraftAdmin[key]) !== String(adminTheme[key]);

          const updateDraftType = (id, color) => setDesignDraftTypes((designDraftTypes || eventTypes).map(t => t.id === id ? { ...t, color } : t));
          const updateDraftTheme = (key, value) => setDesignDraftTheme({ ...(designDraftTheme || siteTheme), [key]: value });
          const updateDraftAdmin = (key, value) => setDesignDraftAdmin({ ...(designDraftAdmin || adminTheme), [key]: value });

          // Speichern pro Feld
          const saveFieldType = (id) => {
            if (!designDraftTypes) return;
            const d = designDraftTypes.find(t => t.id === id);
            if (!d) return;
            const merged = eventTypes.map(t => t.id === id ? { ...t, color: d.color } : t);
            saveTypes(merged);
            // Aus Draft rausnehmen (nur dieses Feld)
            const remaining = designDraftTypes.map(t => t.id === id ? { ...t, color: d.color } : t);
            setDesignDraftTypes(remaining);
          };
          const saveFieldTheme = (key) => {
            if (!designDraftTheme) return;
            saveTheme({ ...siteTheme, [key]: designDraftTheme[key] });
          };
          const saveFieldAdmin = (key) => {
            if (!designDraftAdmin) return;
            saveAdminTheme({ ...adminTheme, [key]: designDraftAdmin[key] });
          };

          // Reset pro Feld → Draft auf Default setzen (nicht automatisch speichern)
          const resetFieldType = (id) => {
            const def = DEFAULT_TYPES.find(d => d.id === id);
            if (def) updateDraftType(id, def.color);
          };
          const resetFieldTheme = (key) => updateDraftTheme(key, DEFAULT_THEME[key]);
          const resetFieldAdmin = (key) => updateDraftAdmin(key, DEFAULT_ADMIN_THEME[key]);

          // Globales "Alles auf Standard"
          const resetAll = () => {
            if (isAdminMode) {
              setDesignDraftAdmin({ ...DEFAULT_ADMIN_THEME });
            } else {
              setDesignDraftTheme({ ...DEFAULT_THEME });
              setDesignDraftTypes(eventTypes.map(t => {
                const def = DEFAULT_TYPES.find(d => d.id === t.id);
                return def ? { ...t, color: def.color } : t;
              }));
            }
          };

          const closeModal = () => {
            setDesignDraftTypes(null);
            setDesignDraftTheme(null);
            setDesignDraftAdmin(null);
            setOpenPicker(null);
            setShowDesign(false);
            setShowDesignAdmin(false);
          };

          // Einheitliche Feld-Zeile mit Speichern- + Reset-Icon
          const FieldRow = ({ label, value, defaultValue, dirty, pickerKey, onChange, onSave, onReset }) => {
            const isOpen = openPicker === pickerKey;
            const canReset = (value || "").toLowerCase() !== (defaultValue || "").toLowerCase();
            const isValidHex = /^#[0-9a-fA-F]{6}$/.test(value);
            return (
              <div style={{ background:"#fff", borderRadius:10, border:`1px solid ${isOpen ? BRAND.lila+"50" : "#ede8ed"}`, transition:"all .15s", overflow:"hidden" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px" }}>
                  <button onClick={() => setOpenPicker(isOpen ? null : pickerKey)}
                    style={{ width:28, height:28, borderRadius:6, border:"1px solid rgba(0,0,0,0.12)", background: isValidHex ? value : "#ccc", cursor:"pointer", padding:0, flexShrink:0, boxShadow: isOpen ? `0 0 0 3px ${BRAND.lila}20` : "none", transition:"all .15s" }} />
                  <span style={{ flex:1, fontSize:13, color:BRAND.aubergine, fontWeight:500 }}>{label}</span>
                  <input type="text" value={value} onChange={e => { const v = e.target.value; if (/^#?[0-9a-fA-F]{0,6}$/.test(v.replace("#",""))) onChange(v.startsWith("#") ? v : "#"+v); }}
                    style={{ width:82, padding:"5px 8px", border:"1px solid #e0d8de", borderRadius:6, fontSize:12, fontFamily:"monospace", color:BRAND.aubergine, boxSizing:"border-box", textAlign:"center" }} />
                  {/* Save button: grün hinterlegt wenn dirty */}
                  <button onClick={onSave} disabled={!dirty}
                    title={dirty ? "Speichern" : "Nichts zu speichern"}
                    style={{ width:26, height:26, borderRadius:6, border:"none", background: dirty ? BRAND.mintgruen : "transparent", cursor: dirty ? "pointer" : "default", padding:0, flexShrink:0, opacity: dirty ? 1 : 0.15, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dirty ? "#fff" : BRAND.aubergine} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  {/* Reset button: violett hinterlegt wenn != default */}
                  <button onClick={onReset} disabled={!canReset}
                    title="Auf Standard zurücksetzen"
                    style={{ width:26, height:26, borderRadius:6, border:"none", background: canReset ? BRAND.lila : "transparent", cursor: canReset ? "pointer" : "default", padding:0, flexShrink:0, opacity: canReset ? 1 : 0.15, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canReset ? "#fff" : BRAND.aubergine} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                  </button>
                </div>
                {isOpen && <div style={{ padding:"0 12px 12px" }}><ColorPicker value={value} onChange={onChange} /></div>}
              </div>
            );
          };

          // Toggle-Zeile für boolean Werte (z.B. Feiertage an/aus)
          const ToggleRow = ({ label, value, defaultValue, dirty, onChange, onSave, onReset }) => {
            const canReset = value !== defaultValue;
            return (
              <div style={{ background:"#fff", borderRadius:10, border:"1px solid #ede8ed", transition:"all .15s" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px" }}>
                  <button onClick={() => onChange(!value)}
                    style={{ width:40, height:22, borderRadius:11, border:"none", background: value ? BRAND.lila : "#d5cdd3", padding:0, cursor:"pointer", position:"relative", flexShrink:0, transition:"background .15s" }}>
                    <div style={{ position:"absolute", top:2, left: value ? 20 : 2, width:18, height:18, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 3px rgba(0,0,0,0.2)", transition:"left .15s" }} />
                  </button>
                  <span style={{ flex:1, fontSize:13, color:BRAND.aubergine, fontWeight:500 }}>{label}</span>
                  <button onClick={onSave} disabled={!dirty}
                    title={dirty ? "Speichern" : "Nichts zu speichern"}
                    style={{ width:26, height:26, borderRadius:6, border:"none", background: dirty ? BRAND.mintgruen : "transparent", cursor: dirty ? "pointer" : "default", padding:0, flexShrink:0, opacity: dirty ? 1 : 0.15, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={dirty ? "#fff" : BRAND.aubergine} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  <button onClick={onReset} disabled={!canReset}
                    title="Auf Standard zurücksetzen"
                    style={{ width:26, height:26, borderRadius:6, border:"none", background: canReset ? BRAND.lila : "transparent", cursor: canReset ? "pointer" : "default", padding:0, flexShrink:0, opacity: canReset ? 1 : 0.15, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={canReset ? "#fff" : BRAND.aubergine} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          };

          // Section-Wrapper: leicht farbliche Hinterlegung
          const Section = ({ title, children }) => (
            <div style={{ background:`${BRAND.lila}06`, borderRadius:12, padding:"14px 14px 12px", border:`1px solid ${BRAND.lila}12`, marginBottom:14 }}>
              <div style={{ fontSize:10, fontWeight:700, color:BRAND.aubergine, textTransform:"uppercase", letterSpacing:2, marginBottom:10, paddingLeft:2 }}>{title}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>{children}</div>
            </div>
          );

          return (
          <div onClick={closeModal} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(6px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background:"#fafafa", borderRadius:20, maxWidth:580, width:"100%", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,0.25)", overflow:"hidden" }}>
              {/* Header */}
              <div style={{ padding:"18px 22px", borderBottom:"1px solid #ede8ed", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff" }}>
                <div>
                  <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:BRAND.aubergine, letterSpacing:0.2 }}>{modalTitle}</h3>
                  <div style={{ fontSize:11, color:"#999", marginTop:2 }}>Klick auf eine Farbe zum Bearbeiten, dann ✓ zum Speichern</div>
                </div>
                <button onClick={closeModal} style={{ background:"#f5f3f4", border:"none", width:32, height:32, borderRadius:8, fontSize:18, color:"#888", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                  onMouseEnter={e => { e.currentTarget.style.background="#ede8ed"; e.currentTarget.style.color=BRAND.aubergine; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#f5f3f4"; e.currentTarget.style.color="#888"; }}>×</button>
              </div>

              {/* Body */}
              <div style={{ padding:"16px 18px", overflowY:"auto", flex:1 }}>
                {!isAdminMode && (
                  <>
                    <Section title="Veranstaltungstypen">
                      {draftTypes.map(et => {
                        const def = DEFAULT_TYPES.find(d => d.id === et.id);
                        return (
                          <FieldRow key={et.id} label={et.label} value={et.color} defaultValue={def?.color || et.color}
                            dirty={isDirtyType(et.id)}
                            pickerKey={`type:${et.id}`}
                            onChange={v => updateDraftType(et.id, v)}
                            onSave={() => saveFieldType(et.id)}
                            onReset={() => resetFieldType(et.id)} />
                        );
                      })}
                    </Section>

                    <Section title="Layout – Kundenansicht">
                      {[
                        ["bgColor", "Hintergrund"],
                        ["headerBg", "Titelleiste – Hintergrund"],
                        ["headerText", "Titelleiste – Textfarbe"],
                        ["footerBg", "Fußleiste – Hintergrund"],
                        ["footerText", "Fußleiste – Textfarbe"],
                        ["bookBtnBg", "Button Location buchen – Hintergrund"],
                        ["bookBtnText", "Button Location buchen – Textfarbe"],
                      ].map(([k, lbl]) => (
                        <FieldRow key={k} label={lbl} value={draftTheme[k]} defaultValue={DEFAULT_THEME[k]}
                          dirty={isDirtyTheme(k)} pickerKey={`theme:${k}`}
                          onChange={v => updateDraftTheme(k, v)}
                          onSave={() => saveFieldTheme(k)}
                          onReset={() => resetFieldTheme(k)} />
                      ))}
                    </Section>
                  </>
                )}

                {isAdminMode && (
                  <Section title="Layout – Adminansicht">
                    <FieldRow label="Seiten-Hintergrund" value={draftAdmin.bgColor} defaultValue={DEFAULT_ADMIN_THEME.bgColor}
                      dirty={isDirtyAdmin("bgColor")} pickerKey="admin:bgColor"
                      onChange={v => updateDraftAdmin("bgColor", v)}
                      onSave={() => saveFieldAdmin("bgColor")}
                      onReset={() => resetFieldAdmin("bgColor")} />
                  </Section>
                )}

                {isAdminMode && (
                  <Section title="Kalender-Akzente – Adminansicht">
                    {[
                      ["bookedColor", "Gebuchte Termine"],
                      ["pendingColor", "Offene Anfragen"],
                      ["blockedColor", "Interne / blockierte Termine"],
                      ["seriesColor", "Serientermine"],
                      ["todayColor", "Heute-Markierung"],
                    ].map(([k, lbl]) => (
                      <FieldRow key={k} label={lbl} value={draftAdmin[k]} defaultValue={DEFAULT_ADMIN_THEME[k]}
                        dirty={isDirtyAdmin(k)} pickerKey={`admin:${k}`}
                        onChange={v => updateDraftAdmin(k, v)}
                        onSave={() => saveFieldAdmin(k)}
                        onReset={() => resetFieldAdmin(k)} />
                    ))}
                  </Section>
                )}

                {isAdminMode && (
                  <Section title="Feiertage">
                    {[
                      ["showHolidaysAdmin", "Feiertage in Adminansicht anzeigen"],
                      ["showHolidaysCustomer", "Feiertage in Kundenansicht anzeigen"],
                    ].map(([k, lbl]) => (
                      <ToggleRow key={k} label={lbl} value={!!draftAdmin[k]} defaultValue={!!DEFAULT_ADMIN_THEME[k]}
                        dirty={isDirtyAdmin(k)}
                        onChange={v => updateDraftAdmin(k, v)}
                        onSave={() => saveFieldAdmin(k)}
                        onReset={() => resetFieldAdmin(k)} />
                    ))}
                  </Section>
                )}

                <button onClick={resetAll}
                  style={{ width:"100%", marginTop:4, padding:"10px 0", background:"transparent", color:"#888", border:"1px dashed #ccc", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer", letterSpacing:0.3 }}
                  onMouseEnter={e => { e.currentTarget.style.color=BRAND.aubergine; e.currentTarget.style.borderColor=BRAND.aubergine; }}
                  onMouseLeave={e => { e.currentTarget.style.color="#888"; e.currentTarget.style.borderColor="#ccc"; }}>
                  Alles auf Standard zurücksetzen
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* Backup Modal */}
        {showBackups && (() => {
          const closeBackups = () => { setShowBackups(false); setOpenedBackup(null); };
          const loadBackup = async (date) => {
            try {
              const raw = await loadData(`backup-${date}`);
              if (!raw) { showToast("Fehler", "Backup nicht gefunden", false, "#c44"); return; }
              const parsed = JSON.parse(raw);
              setOpenedBackup({ date, events: parsed.events || {}, createdAt: parsed.createdAt });
            } catch (e) {
              showToast("Fehler", "Backup konnte nicht geladen werden", false, "#c44");
            }
          };
          const restoreEvent = (key, evFromBackup, subIdx) => {
            const entry = subIdx >= 0 ? (evFromBackup.subEvents || [])[subIdx] : evFromBackup;
            if (!entry) return;
            const label = entry.label || entry.name || "Termin";
            const existing = events[key];
            const hasExisting = existing && existing.status !== "deleted";
            let msg;
            if (hasExisting) {
              msg = `Am ${fmtDateAT(key)} ist bereits ein Termin eingetragen.\n\nSoll „${label}" aus dem Backup als zusätzliche Buchung (Sub-Event) hinzugefügt werden?`;
            } else {
              msg = `„${label}" aus dem Backup vom ${openedBackup.date} für den ${fmtDateAT(key)} wiederherstellen?`;
            }
            if (!confirm(msg)) return;
            prevEvents.current = { ...events };
            const updated = { ...events };
            // Neue localId erzeugen, damit Google-Sync es als NEU erkennt; subEvents leeren (keine verschachtelten Strukturen)
            const cleanEntry = { ...entry };
            delete cleanEntry.localId;
            delete cleanEntry.googleEventId;
            delete cleanEntry.subEvents;
            if (hasExisting) {
              const base = { ...existing };
              base.subEvents = [...(base.subEvents || []), cleanEntry];
              updated[key] = base;
            } else {
              updated[key] = { ...cleanEntry, subEvents: [] };
            }
            saveEvents(updated);
            showToast("Wiederhergestellt", `${fmtDateAT(key)} · ${label}`, true, BRAND.mintgruen);
          };

          return (
            <div onClick={closeBackups} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", backdropFilter:"blur(6px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
              <div onClick={e => e.stopPropagation()} style={{ background:"#fafafa", borderRadius:20, maxWidth:580, width:"100%", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,0.25)", overflow:"hidden" }}>
                {/* Header */}
                <div style={{ padding:"18px 22px", borderBottom:"1px solid #ede8ed", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fff" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {openedBackup && (
                      <button onClick={() => setOpenedBackup(null)}
                        style={{ background:"#f5f3f4", border:"none", width:32, height:32, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:BRAND.aubergine }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
                      </button>
                    )}
                    <div>
                      <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:BRAND.aubergine, letterSpacing:0.2 }}>
                        {openedBackup ? `Backup vom ${openedBackup.date}` : "Backups"}
                      </h3>
                      <div style={{ fontSize:11, color:"#999", marginTop:2 }}>
                        {openedBackup ? "Klick auf einen Termin zum Wiederherstellen" : `${backupsIndex.length} Backup${backupsIndex.length === 1 ? "" : "s"} · täglich automatisch beim ersten Admin-Login`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    {openedBackup && (
                      <button onClick={() => {
                        const backupEventsCount = Object.keys(openedBackup.events || {}).filter(k => openedBackup.events[k]?.status !== "deleted").length;
                        if (!confirm(`Backup vom ${openedBackup.date} komplett wiederherstellen?\n\nAlle aktuell vorhandenen Termine werden durch die ${backupEventsCount} Termine aus dem Backup ersetzt. Diese Aktion lässt sich über das aktuelle heutige Backup rückgängig machen.`)) return;
                        prevEvents.current = { ...events };
                        // Backup zurückschreiben — vorhandene IDs erhalten (damit Google Calendar keine Duplikate erzeugt)
                        const restored = {};
                        Object.entries(openedBackup.events || {}).forEach(([k, v]) => {
                          if (!v || v.status === "deleted") return;
                          const clean = { ...v };
                          // Falls am gleichen Tag aktuell schon ein Termin existiert: dessen IDs übernehmen, damit Google Calendar das als Update erkennt, nicht als neues Event
                          const currentAtKey = events[k];
                          if (currentAtKey && currentAtKey.localId) clean.localId = currentAtKey.localId;
                          else delete clean.localId;
                          if (currentAtKey && currentAtKey.googleEventId) clean.googleEventId = currentAtKey.googleEventId;
                          else delete clean.googleEventId;
                          if (Array.isArray(clean.subEvents)) {
                            const currentSubs = Array.isArray(currentAtKey?.subEvents) ? currentAtKey.subEvents : [];
                            clean.subEvents = clean.subEvents.map((s, i) => {
                              const cs = { ...s };
                              // Versuche IDs vom gleichen Sub-Index zu übernehmen (best-effort Match)
                              const currentSub = currentSubs[i];
                              if (currentSub && currentSub.localId) cs.localId = currentSub.localId;
                              else delete cs.localId;
                              if (currentSub && currentSub.googleEventId) cs.googleEventId = currentSub.googleEventId;
                              else delete cs.googleEventId;
                              return cs;
                            });
                          }
                          restored[k] = clean;
                        });
                        saveEvents(restored, { force: true });
                        setOpenedBackup(null);
                        setShowBackups(false);
                        showToast("Komplett wiederhergestellt", `${Object.keys(restored).length} Termine aus Backup vom ${openedBackup.date}`, true, BRAND.mintgruen);
                      }}
                        style={{ padding:"8px 14px", background:BRAND.moosgruen, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, letterSpacing:0.3, display:"flex", alignItems:"center", gap:6 }}
                        onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                        onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                        Alle wiederherstellen
                      </button>
                    )}
                    <button onClick={closeBackups} style={{ background:"#f5f3f4", border:"none", width:32, height:32, borderRadius:8, fontSize:18, color:"#888", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                      onMouseEnter={e => { e.currentTarget.style.background="#ede8ed"; e.currentTarget.style.color=BRAND.aubergine; }}
                      onMouseLeave={e => { e.currentTarget.style.background="#f5f3f4"; e.currentTarget.style.color="#888"; }}>×</button>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding:"16px 18px", overflowY:"auto", flex:1 }}>
                  {!openedBackup && backupsIndex.length === 0 && (
                    <div style={{ padding:"40px 20px", textAlign:"center", color:"#999", fontSize:13 }}>
                      Noch keine Backups vorhanden.<br/>Das erste Backup wird automatisch erstellt.
                    </div>
                  )}
                  {!openedBackup && backupsIndex.length > 0 && (
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                      {backupsIndex.map(date => {
                        const d = new Date(date);
                        const wk = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
                        return (
                          <button key={date} onClick={() => loadBackup(date)}
                            onMouseEnter={e => { e.currentTarget.style.borderColor=BRAND.lila+"50"; e.currentTarget.style.background="#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor="#ede8ed"; e.currentTarget.style.background="#fff"; }}
                            style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 14px", background:"#fff", border:"1px solid #ede8ed", borderRadius:10, cursor:"pointer", transition:"all .15s", textAlign:"left" }}>
                            <div>
                              <div style={{ fontWeight:600, color:BRAND.aubergine, fontSize:14 }}>{wk}, {d.getDate().toString().padStart(2,"0")}.{(d.getMonth()+1).toString().padStart(2,"0")}.{d.getFullYear()}</div>
                              <div style={{ fontSize:11, color:"#999", marginTop:2 }}>Klick zum Öffnen</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BRAND.aubergine} strokeWidth="2" strokeLinecap="round" style={{ opacity:0.4 }}><path d="M9 5l7 7-7 7"/></svg>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {openedBackup && (() => {
                    const entries = Object.entries(openedBackup.events || {}).filter(([,v]) => v && v.status !== "deleted").sort(([a],[b]) => a.localeCompare(b));
                    if (entries.length === 0) {
                      return <div style={{ padding:"40px 20px", textAlign:"center", color:"#999", fontSize:13 }}>Dieses Backup enthält keine Termine.</div>;
                    }
                    const renderItem = (key, ev, subIdx) => {
                      const [yy,mm,dd] = key.split("-").map(Number);
                      const c = ev.status === "booked" ? adminTheme.bookedColor : ev.status === "pending" ? adminTheme.pendingColor : adminTheme.blockedColor;
                      const label = ev.isSeries ? "Serie" : ev.status === "pending" ? "Anfrage" : ev.status === "blocked" ? "Intern" : "Gebucht";
                      return (
                        <div key={`${key}:${subIdx}`} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:"#fff", borderLeft:`3px solid ${c}`, borderRadius:8, border:"1px solid #ede8ed" }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:BRAND.aubergine, marginBottom:2 }}>
                              {dd.toString().padStart(2,"0")}.{mm.toString().padStart(2,"0")}.{yy} · {ev.label || ev.name || "Termin"}
                            </div>
                            <div style={{ fontSize:11, color:"#888" }}>
                              <span style={{ color:c, fontWeight:600 }}>{label}</span>
                              {ev.name && ` · ${ev.name}`}
                              {ev.slotLabel && ` · ${ev.slotLabel}`}
                            </div>
                          </div>
                          <button onClick={() => restoreEvent(key, ev, subIdx)}
                            title="Wiederherstellen"
                            style={{ padding:"6px 12px", background:BRAND.mintgruen, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:600, letterSpacing:0.3, display:"flex", alignItems:"center", gap:4, flexShrink:0 }}
                            onMouseEnter={e => e.currentTarget.style.opacity="0.85"}
                            onMouseLeave={e => e.currentTarget.style.opacity="1"}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
                            Wiederherstellen
                          </button>
                        </div>
                      );
                    };
                    const rows = [];
                    entries.forEach(([key, ev]) => {
                      rows.push(renderItem(key, ev, -1));
                      if (Array.isArray(ev.subEvents)) {
                        ev.subEvents.forEach((sub, i) => {
                          if (sub && sub.status !== "deleted") rows.push(renderItem(key, sub, i));
                        });
                      }
                    });
                    return <div style={{ display:"flex", flexDirection:"column", gap:6 }}>{rows}</div>;
                  })()}
                </div>
              </div>
            </div>
          );
        })()}
        {!isAdmin && (
          <div style={{ background:BRAND.aubergine, borderRadius:10, padding: winW < 520 ? "14px 16px" : "16px 28px", textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize: winW < 520 ? 12 : 13, fontWeight:700, color:"#fff", letterSpacing:2, marginBottom:4, textTransform:"uppercase" }}>Paradiesgarten Mattuschka</div>
            <div style={{ fontSize: winW < 520 ? 10 : 11, color:"rgba(230,215,235,0.7)", lineHeight:1.6 }}>
              <a href="https://maps.google.com/?q=Emmersdorfer+Straße+86+9061+Klagenfurt" target="_blank" rel="noopener noreferrer" style={{ color:"rgba(230,215,235,0.7)" }}>Emmersdorfer Straße 86, 9061 Klagenfurt am Wörthersee</a><br />
              {winW < 520 ? (
                <>
                  <a href="tel:+4346349119" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>+43 463 49 119</a><br />
                  <a href="mailto:info@mattuschka.at" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>info@mattuschka.at</a><br />
                  <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>www.derparadiesgarten.at</a>
                </>
              ) : (
                <>
                  <a href="tel:+4346349119" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>+43 463 49 119</a> &nbsp;|&nbsp; <a href="mailto:info@mattuschka.at" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>info@mattuschka.at</a> &nbsp;|&nbsp; <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ color:"rgba(230,215,235,0.7)", textDecoration:"none" }}>www.derparadiesgarten.at</a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div onClick={() => setDeleteConfirm(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.3)", backdropFilter:"blur(3px)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:14, padding:"24px 20px", maxWidth:340, width:"100%", boxShadow:"0 20px 50px rgba(0,0,0,0.2)", textAlign:"center" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"#c4440a", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.33 4V2.67a1.33 1.33 0 011.34-1.34h2.66a1.33 1.33 0 011.34 1.34V4m2 0v9.33a1.33 1.33 0 01-1.34 1.34H4.67a1.33 1.33 0 01-1.34-1.34V4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:BRAND.aubergine, marginBottom:6 }}>Wirklich löschen?</div>
            <div style={{ fontSize:13, color:"#888", marginBottom:16, lineHeight:1.4 }}>
              {deleteConfirm.type === "single"
                ? <><strong>„{deleteConfirm.label}"</strong> wird gelöscht.</>
                : <>{deleteConfirm.count} Termine <strong>„{deleteConfirm.label}"</strong> werden gelöscht.</>
              }
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ flex:1, padding:"10px 0", background:"#f5f0f4", color:BRAND.aubergine, border:"1px solid #e0d8de", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Abbrechen</button>
              <button onClick={() => {
                if (deleteConfirm.type === "single") {
                  handleAdminAction(deleteConfirm.key, "doDelete", deleteConfirm.subIndex ?? -1);
                } else {
                  prevEvents.current = { ...events };
                  const updated = { ...events };
                  deleteConfirm.items.forEach(([k]) => { updated[k] = { ...updated[k], status:"deleted", previousStatus: updated[k].status, deletedAt: new Date().toISOString() }; });
                  saveEvents(updated);
                  setToast({ msg:`${deleteConfirm.count} Serientermine gelöscht`, undo:() => saveEvents(prevEvents.current) });
                  setDeleteConfirm(null);
                }
              }}
                style={{ flex:1, padding:"10px 0", background:"#c44", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Ja, löschen</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {(modalView || editingType) && (
        <div
          onMouseDown={(e) => { backdropMouseDown.current = e.target === e.currentTarget; }}
          onClick={(e) => {
            const wasBackdrop = backdropMouseDown.current;
            backdropMouseDown.current = false;
            if (!wasBackdrop || e.target !== e.currentTarget) return;
            if (modalView === "form") return;
            setModalView(null); setEditingType(null);
          }}
          onTouchMove={e => e.preventDefault()}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems: winW < 520 ? "flex-end" : "center", justifyContent:"center", padding: winW < 520 ? 0 : 16, touchAction:"none", overscrollBehavior:"none", transition:"background .3s" }}
          id="modal-backdrop">
          <div onClick={e => e.stopPropagation()}
            id="modal-panel"
            ref={el => {
              if (!el || el._pullBound) return;
              el._pullBound = true;
              let startY = 0, pullY = 0, pulling = false, lastY = 0;
              const bd = () => document.getElementById("modal-backdrop");
              el.addEventListener("touchstart", e2 => {
                startY = e2.touches[0].clientY; lastY = startY; pulling = false; pullY = 0;
                el.style.transition = "none";
                const b = bd(); if (b) b.style.transition = "none";
              }, { passive: true });
              el.addEventListener("touchmove", e2 => {
                const cy = e2.touches[0].clientY;
                const dy = cy - startY;
                const atTop = el.scrollTop <= 0;
                const short = el.scrollHeight <= el.clientHeight;
                if ((atTop || short) && dy > 5 && !pulling) pulling = true;
                if (pulling) {
                  pullY = dy * 0.45;
                  el.style.transform = `translateY(${pullY}px)`;
                  const b = bd();
                  if (b) b.style.background = `rgba(0,0,0,${Math.max(0.03, 0.25 - pullY/500)})`;
                  e2.preventDefault();
                } else {
                  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight;
                  if (atBottom && cy < lastY) e2.preventDefault();
                }
                lastY = cy;
              }, { passive: false });
              el.addEventListener("touchend", () => {
                if (!pulling) return;
                const b = bd();
                if (pullY > 100) {
                  el.style.transition = "transform .28s cubic-bezier(.15,.85,.3,1)";
                  el.style.transform = "translateY(110vh)";
                  if (b) { b.style.transition = "background .28s"; b.style.background = "rgba(0,0,0,0)"; }
                  setTimeout(() => el._dismiss?.(), 220);
                } else {
                  el.style.transition = "transform .35s cubic-bezier(.15,.85,.3,1)";
                  el.style.transform = "translateY(0)";
                  if (b) { b.style.transition = "background .35s"; b.style.background = "rgba(0,0,0,0.25)"; }
                }
                pulling = false; pullY = 0;
              }, { passive: true });
              el._dismiss = () => { setModalView(null); setEditingType(null); };
            }}
            style={{ background:"#fff", borderRadius: winW < 520 ? "16px 16px 0 0" : 16, padding: winW < 520 ? "24px 16px" : "28px 24px", maxWidth: winW > 900 ? 540 : 460, width:"100%", maxHeight: winW < 520 ? "90vh" : "85vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.15)", touchAction:"pan-y", overscrollBehavior:"contain", WebkitOverflowScrolling:"touch", willChange:"transform" }}>

            {/* Pull handle for mobile */}
            {winW < 520 && (
              <div style={{ display:"flex", justifyContent:"center", padding:"4px 0 12px", marginTop:-8 }}>
                <div style={{ width:36, height:4, borderRadius:2, background:"#ddd" }} />
              </div>
            )}

            {/* Select Event Type */}
            {modalView === "selectType" && (
              <>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ fontSize:18, fontWeight:700, color: BRAND.aubergine, marginBottom:4 }}>Veranstaltung anfragen</div>
                  {selectedDate && <div style={{ fontSize:13, color:"#999" }}>{fmtDate(selectedDate)}</div>}
                  {selectedDate && (isAdmin ? adminTheme.showHolidaysAdmin : adminTheme.showHolidaysCustomer) && holidays[selectedDate] && <div style={{ display:"inline-block", background:BRAND.aubergine, color:"rgba(255,255,255,0.8)", fontSize:10, borderRadius:4, padding:"3px 10px", marginTop:6 }}>{holidays[selectedDate]}</div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {eventTypes.map(et => (
                    <button key={et.id} onClick={() => {
                      setFormData(f => ({ ...f, type: et.id, name:"", email:"", phone:"", guests:"", message:"", slot:"halfDayAM", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:8, tourMin:0, tourEndHour:13, tourEndMin:0 }));
                      setSubmitAttempted(false);
                      setShowTypeSelect(false);
                      if (!selectedDate) { setPickerMonth(today.getMonth()); setPickerYear(today.getFullYear()); }
                      setModalView(selectedDate ? "form" : "pickDate");
                    }}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#fff", border:"1.5px solid #e8e0e5", borderRadius:10, borderLeft:`4px solid ${et.color}`, cursor:"pointer", textAlign:"left", transition:"all .15s" }}
                      className="evt-card">
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, color: BRAND.aubergine, fontSize:14 }}>{et.label}</div>
                        <div style={{ fontSize:11, color:"#999", marginTop:2 }}>{et.desc}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke={BRAND.lila} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Admin: Edit Prices */}
            {editingType && !modalView && (
              <>
                <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:18, fontWeight:700, marginBottom:12 }}>Preise bearbeiten: {editingType.label}</h3>
                {editingType.isGroupTour ? (
                  <>
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Eintritt pro Person (€)</label>
                    <input type="number" step="0.10" value={editingType.pricePerPerson||0} onChange={e => setEditingType(t=>({...t, pricePerPerson: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Mindestanzahl Personen</label>
                    <input type="number" value={editingType.minPersons||0} onChange={e => setEditingType(t=>({...t, minPersons: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Kosten pro Führung (€)</label>
                    <input type="number" step="0.10" value={editingType.guideCost||0} onChange={e => setEditingType(t=>({...t, guideCost: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Max. Personen pro Führung</label>
                    <input type="number" value={editingType.maxPerTour||0} onChange={e => setEditingType(t=>({...t, maxPerTour: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Preis pro Kaffee (€)</label>
                    <input type="number" step="0.10" value={editingType.coffeePrice||0} onChange={e => setEditingType(t=>({...t, coffeePrice: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Preis pro Kuchen (€)</label>
                    <input type="number" step="0.10" value={editingType.cakePrice||0} onChange={e => setEditingType(t=>({...t, cakePrice: Number(e.target.value)}))} style={inputStyle} />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Halbtags (bis 13:00)</label>
                    <input type="number" value={editingType.halfDay} onChange={e => setEditingType(t=>({...t, halfDay: Number(e.target.value)}))} style={inputStyle} placeholder="0 = auf Anfrage" />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Ganztags (08:00–22:00)</label>
                    <input type="number" value={editingType.fullDay} onChange={e => setEditingType(t=>({...t, fullDay: Number(e.target.value)}))} style={inputStyle} placeholder="0 = auf Anfrage" />
                  </>
                )}
                <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Beschreibung (kurz, Untertitel)</label>
                <input value={editingType.desc} onChange={e => setEditingType(t=>({...t, desc: e.target.value}))} style={inputStyle} />
                <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Detailtext (Beschreibung auf Karte)</label>
                <textarea value={editingType.detail || ""} onChange={e => setEditingType(t=>({...t, detail: e.target.value}))} style={{ ...inputStyle, minHeight:60, fontFamily:"inherit", resize:"vertical" }} placeholder="Ausführlicher Text für die Veranstaltungskarte..." />
                {editingType.id === "hochzeit" && (
                  <>
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Exklusiv-Hinweis (erscheint unter den Zeitfenstern im Anfrageformular)</label>
                    <textarea value={editingType.exclusiveNote || ""} onChange={e => setEditingType(t=>({...t, exclusiveNote: e.target.value}))} style={{ ...inputStyle, minHeight:50, fontFamily:"inherit", resize:"vertical" }} placeholder="z.B. 120 m² Glashaus mitten in 15 000 m² Blütenmeer — ganz allein für Sie." />
                  </>
                )}
                <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Schlagworte (mit Komma trennen)</label>
                <input value={(editingType.tags || []).join(", ")} onChange={e => setEditingType(t=>({...t, tags: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}))} style={inputStyle} placeholder="z.B. Workshops, Tagesseminare, flexibel" />
                <button onClick={handleSavePrice} style={primaryBtn}>Speichern</button>
                <button onClick={() => setEditingType(null)}
                  onMouseEnter={e => { e.target.style.color="#c44"; e.target.style.background="#fdf6f6"; }}
                  onMouseLeave={e => { e.target.style.color="#aaa"; e.target.style.background="transparent"; }}
                  style={{ width:"100%", padding:10, border:"none", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:13, marginTop:4, borderRadius:8, transition:"all .15s" }}>Abbrechen</button>
              </>
            )}

            {/* Pick Date */}
            {modalView === "pickDate" && (() => {
              const et = eventTypes.find(e => e.id === formData.type);
              const pDays = getMonthDays(pickerYear, pickerMonth);
              const prevPM = () => { if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y=>y-1); } else setPickerMonth(m=>m-1); };
              const nextPM = () => { if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(y=>y+1); } else setPickerMonth(m=>m+1); };
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                    <button onClick={() => setModalView("selectType")}
                      style={{ background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center", color:"#aaa", flexShrink:0, transition:"color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.color=BRAND.aubergine} onMouseLeave={e => e.currentTarget.style.color="#aaa"}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7"/></svg>
                    </button>
                    <div style={{ width:4, height:36, borderRadius:2, background: et?.color || BRAND.lila }} />
                    <div>
                      <h3 style={{ margin:0, color: et?.color || BRAND.aubergine, fontSize:18, fontWeight:700 }}>{et?.label}</h3>
                      <div style={{ fontSize:12, color: et?.color, fontWeight:600 }}>{et?.halfDay === 0 ? "auf Anfrage" : `ab ${fmt(et?.halfDay)}`}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:14, color:"#666", marginBottom:12 }}>Wählen Sie Ihr Wunschdatum:</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <button onClick={prevPM} style={{ ...navBtn, width:32, height:32, fontSize:16 }}>‹</button>
                    <div style={{ textAlign:"center" }}>
                      <span style={{ fontWeight:700, color: BRAND.aubergine, fontSize:15 }}>{MONTHS[pickerMonth]} {pickerYear}</span>
                      {(pickerMonth !== today.getMonth() || pickerYear !== today.getFullYear()) && (
                        <div><button onClick={() => { setPickerMonth(today.getMonth()); setPickerYear(today.getFullYear()); }}
                          style={{ background:"none", border:`1px solid ${BRAND.lila}40`, color: BRAND.lila, padding:"1px 8px", borderRadius:10, fontSize:9, fontWeight:600, cursor:"pointer", marginTop:2 }}>Heute</button></div>
                      )}
                    </div>
                    <button onClick={nextPM} style={{ ...navBtn, width:32, height:32, fontSize:16 }}>›</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                    {DAYS_H.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:"#999", padding:"4px 0" }}>{d}</div>)}
                    {pDays.map((day, i) => {
                      if (!day) return <div key={`e${i}`} />;
                      const key = dateKey(pickerYear, pickerMonth, day);
                      const evRaw = events[key];
                      const ev = evRaw?.status === "deleted" ? null : evRaw;
                      const isPast = new Date(pickerYear, pickerMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const isFree = (!ev || !ev.allDay || ev.status === "pending" || ev.isSeries) && !isPast;
                      const isOccupied = !!ev && ev.allDay && ev.status !== "pending" && !ev.isSeries && !isPast;
                      const isPickToday = key === todayKey;
                      const hol = adminTheme.showHolidaysCustomer ? holidays[key] : null;
                      return (
                        <button key={key} onClick={() => handlePickerDateClick(day)}
                          title={isOccupied ? "nicht verfügbar" : hol || ""}
                          onMouseEnter={e => { if (isFree) { e.currentTarget.style.background=`${BRAND.lila}12`; e.currentTarget.style.borderColor= isPickToday ? "#8ec89a" : `${BRAND.lila}60`; } }}
                          onMouseLeave={e => { if (isFree) { e.currentTarget.style.background= isPickToday ? "#8ec89a10" : "#fff"; e.currentTarget.style.borderColor= isPickToday ? "#8ec89a" : `${BRAND.aubergine}30`; } }}
                          style={{
                            aspectRatio:"1", border: isPickToday ? `2.5px solid #8ec89a` : isFree ? `1.5px solid ${BRAND.aubergine}30` : isOccupied ? `1px solid ${BRAND.lila}30` : "1px solid #eee",
                            borderRadius:6, background: isPickToday && isFree ? "#8ec89a10" : isFree ? "#fff" : isOccupied ? `${BRAND.lila}10` : "#f8f8f8",
                            cursor: isFree ? "pointer" : "default", fontSize:13, fontWeight: isPickToday || isFree ? 600 : isOccupied ? 600 : 400,
                            color: isPickToday && isFree ? "#8ec89a" : isFree ? BRAND.aubergine : isOccupied ? BRAND.lila : "#ccc", opacity: isPast ? 0.4 : 1, transition:"all .15s",
                            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", padding:0,
                          }}>
                          {hol && <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`${BRAND.aubergine}60` }} />}
                          {day}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize:11, color:"#aaa", marginTop:10, textAlign:"center" }}>Freie Termine sind hervorgehoben</div>
                </>
              );
            })()}

            {/* Admin Form */}
            {modalView === "admin" && (() => {
              // Helper für Pflichtfeld-Styling im Admin-Form
              const reqAdmin = (empty) => ({
                borderColor: empty && adminSubmitAttempted ? "#c44" : "#e0d8de",
                background: empty && adminSubmitAttempted ? "#fdf6f6" : "#fff",
              });
              return (
              <>
                {(() => {
                  const et = eventTypes.find(t => t.id === adminForm.eventType);
                  const accent = et?.color || BRAND.aubergine;
                  return (
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:13, color:"#888", fontWeight:500 }}>
                      {adminForm.editAllSeries ? "Serie bearbeiten" : (adminForm.addToExisting || !events[selectedDate] || events[selectedDate]?.status === "deleted") ? "Termin hinzufügen" : "Termin bearbeiten"}
                      {adminForm.editAllSeries && <span style={{ background:"#009a93", color:"#fff", fontSize:9, fontWeight:700, padding:"2px 6px", borderRadius:3, marginLeft:8, verticalAlign:"middle" }}>S</span>}
                    </div>
                    <h3 style={{ margin:0, color: accent, fontSize:22, fontWeight:700, marginTop:2, lineHeight:1.2 }}>
                      {et?.label || (adminForm.type === "blocked" ? "Interner Termin" : adminForm.label || "Ohne Typ")}
                    </h3>
                  </div>
                  <button onClick={() => { if (fromCalendar && events[selectedDate] && events[selectedDate].status !== "deleted") { setModalView("info"); } else { setModalView(null); } }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", padding:4, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition:"color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.color=BRAND.aubergine} onMouseLeave={e => e.currentTarget.style.color="#aaa"}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
                  </button>
                </div>
                  );
                })()}
                {(isAdmin ? adminTheme.showHolidaysAdmin : adminTheme.showHolidaysCustomer) && holidays[selectedDate] && <div style={{ fontSize:13, color: BRAND.moosgruen, marginBottom:14, fontWeight:500 }}>📅 {holidays[selectedDate]}</div>}
                {/* 2x2 Meta-Chip Dashboard */}
                {(() => {
                  const et = eventTypes.find(t => t.id === adminForm.eventType);
                  const typColor = et?.color || "#999";
                  const statusMeta = { booked:{label:"Gebucht", color:BRAND.lila}, pending:{label:"Anfrage", color:BRAND.aprikot}, blocked:{label:"Intern", color:"#009a93"} }[adminForm.type] || {label:"—", color:"#999"};
                  const [yy,mm,dd] = selectedDate.split("-").map(Number);
                  const dateObj = new Date(yy, mm-1, dd);
                  const wochentag = ["So","Mo","Di","Mi","Do","Fr","Sa"][dateObj.getDay()];
                  const monatKurz = ["Jän","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"][mm-1];
                  const dateShort = `${wochentag} · ${dd}. ${monatKurz}`;
                  const zeitText = adminForm.allDay ? "Ganztägig" : `${adminForm.startTime || "08:00"} – ${adminForm.endTime || "22:00"}`;
                  const toggleChip = (name) => setChipPopup(p => p === name ? null : name);
                  const canEditStatus = !adminForm.editAllSeries;
                  const canEditType = adminForm.type === "booked" || adminForm.type === "pending";
                  return (
                  <>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                    {/* STATUS */}
                    <div onClick={canEditStatus ? () => toggleChip("status") : undefined}
                      style={{ background: chipPopup === "status" ? "#ece3ea" : "#f3ecf2", borderRadius:10, padding:"10px 14px", cursor: canEditStatus ? "pointer" : "default", border: chipPopup === "status" ? `1px solid ${statusMeta.color}60` : "1px solid transparent", transition:"all .15s" }}>
                      <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Status</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                        <div style={{ width:9, height:9, borderRadius:"50%", background: statusMeta.color, flexShrink:0 }} />
                        <span style={{ fontSize:14, fontWeight:600, color:BRAND.aubergine }}>{statusMeta.label}</span>
                      </div>
                    </div>
                    {/* DATUM */}
                    <div onClick={() => { if (chipPopup !== "date") { setDatePopupMonth(mm-1); setDatePopupYear(yy); } toggleChip("date"); }}
                      style={{ background: chipPopup === "date" ? "#ece3ea" : "#f3ecf2", borderRadius:10, padding:"10px 14px", cursor:"pointer", border: chipPopup === "date" ? `1px solid ${BRAND.lila}60` : "1px solid transparent", transition:"all .15s" }}>
                      <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Datum</div>
                      <div style={{ fontSize:14, fontWeight:600, color:BRAND.aubergine, marginTop:4 }}>{dateShort}</div>
                    </div>
                    {/* ZEIT */}
                    <div onClick={() => toggleChip("time")}
                      style={{ background: chipPopup === "time" ? "#ece3ea" : "#f3ecf2", borderRadius:10, padding:"10px 14px", cursor:"pointer", border: chipPopup === "time" ? `1px solid ${BRAND.lila}60` : "1px solid transparent", transition:"all .15s" }}>
                      <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Zeit</div>
                      <div style={{ fontSize:14, fontWeight:600, color:BRAND.aubergine, marginTop:4, fontVariantNumeric:"tabular-nums" }}>{zeitText}</div>
                    </div>
                    {/* TYP */}
                    {canEditType ? (
                      <div onClick={() => toggleChip("type")}
                        style={{ background: et ? `${typColor}15` : "#f3ecf2", borderRadius:10, padding:"10px 14px", cursor:"pointer", border: chipPopup === "type" ? `1px solid ${typColor}80` : (et ? `1px solid ${typColor}30` : "1px solid transparent"), transition:"all .15s" }}>
                        <div style={{ fontSize:10, color: et ? typColor : "#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Typ</div>
                        <div style={{ fontSize:14, fontWeight:600, color: et ? typColor : "#888", marginTop:4 }}>{et?.label || "— wählen"}</div>
                      </div>
                    ) : (
                      <div style={{ background:"#f3ecf2", borderRadius:10, padding:"10px 14px", opacity:0.5 }}>
                        <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Typ</div>
                        <div style={{ fontSize:14, color:"#888", marginTop:4, fontStyle:"italic" }}>—</div>
                      </div>
                    )}
                  </div>

                  <input placeholder={adminForm.type==="blocked" ? "Bezeichnung (z.B. Urlaub)" : "Bezeichnung (z.B. Hochzeit Müller)"} value={adminForm.label} onChange={e => setAdminForm(f=>({...f, label:e.target.value}))} style={inputStyle} />
                  </>
                  );
                })()}

                {/* Customer data fields - for booked + pending events (not Gruppenbesuch which has own section) */}
                {(adminForm.type === "booked" || adminForm.type === "pending") && adminForm.eventType !== "gruppenfuehrung" && (() => {
                  const et = eventTypes.find(t => t.id === adminForm.eventType);
                  const accent = et?.color || BRAND.lila;
                  return (
                  <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                    <div style={{ fontSize:11, color:accent, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>
                      {adminForm.type === "pending" ? "Anfrage – Kontakt" : "Kontakt"}
                    </div>
                    <input placeholder="Name * (z.B. Klara Winkler)" value={adminForm.groupName||""} onChange={e => setAdminForm(f=>({...f, groupName:e.target.value}))}
                      style={{ width:"100%", padding:"10px 12px", border:`1px solid ${reqAdmin(!(adminForm.groupName||"").trim()).borderColor}`, background: reqAdmin(!(adminForm.groupName||"").trim()).background, borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", marginBottom:6, color:BRAND.aubergine }} />
                    <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                      <input placeholder="E-Mail" value={adminForm.customerEmail||""} onChange={e => setAdminForm(f=>({...f, customerEmail:e.target.value}))}
                        style={{ flex:1, padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                      <input placeholder="Telefon *" value={adminForm.customerPhone||""} onChange={e => setAdminForm(f=>({...f, customerPhone:e.target.value}))}
                        style={{ flex:1, padding:"10px 12px", border:`1px solid ${reqAdmin(!(adminForm.customerPhone||"").trim()).borderColor}`, background: reqAdmin(!(adminForm.customerPhone||"").trim()).background, borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                    </div>
                    <input placeholder="Anzahl Gäste" type="number" value={adminForm.guests||""} onChange={e => setAdminForm(f=>({...f, guests:e.target.value}))}
                      style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", marginBottom: adminForm.type === "pending" ? 6 : 0, color:BRAND.aubergine, textAlign:"center" }} />
                    {adminForm.type === "pending" && (
                      <textarea placeholder="Nachricht / Wünsche des Kunden" value={adminForm.customerMessage||""} onChange={e => setAdminForm(f=>({...f, customerMessage:e.target.value}))}
                        style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", height:56, resize:"none", color:BRAND.aubergine, lineHeight:1.5 }} />
                    )}
                  </div>
                  );
                })()}

                {/* Group tour fields - for Gruppenbesuch (booked + pending) */}
                {adminForm.eventType === "gruppenfuehrung" && (adminForm.type === "booked" || adminForm.type === "pending") && (() => {
                  const gt = eventTypes.find(t => t.id === "gruppenfuehrung");
                  const nP = Number(adminForm.guests) || 0;
                  const nKaffee = Number(adminForm.coffeeCount) || 0;
                  const nKuchen = Number(adminForm.cakeCount) || 0;
                  const cEintritt = nP * (gt?.pricePerPerson || 9);
                  const cKaffee = nKaffee * (gt?.coffeePrice || 3.10);
                  const cKuchen = nKuchen * (gt?.cakePrice || 4.50);
                  const nF = adminForm.tourGuide && nP > 0 ? Math.ceil(nP / (gt?.maxPerTour || 20)) : 0;
                  const cFuehrung = nF * (gt?.guideCost || 80);
                  const cGesamt = cEintritt + cKaffee + cKuchen + cFuehrung;
                  return (
                  <>
                    {/* Teilnehmer-Leiste */}
                    <div style={{ background:`${BRAND.moosgruen}12`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
                      <span style={{ fontSize:10, color:BRAND.moosgruen, textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Teilnehmer *</span>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
                        <button onClick={() => setAdminForm(f => ({ ...f, guests: String(Math.max(0, (Number(f.guests)||0) - 1)) }))}
                          style={{ width:30, height:30, border:`1px solid ${BRAND.moosgruen}`, background:"#fff", borderRadius:7, fontSize:16, color:BRAND.moosgruen, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                        <input type="number" min="0" value={adminForm.guests||""} onChange={e => setAdminForm(f=>({...f, guests:e.target.value}))}
                          style={{ width:52, textAlign:"center", padding:"6px 0", border:`1px solid ${BRAND.moosgruen}`, borderRadius:7, fontSize:15, color:BRAND.aubergine, fontWeight:600, fontFamily:"inherit", background:"#fff" }} />
                        <button onClick={() => setAdminForm(f => ({ ...f, guests: String((Number(f.guests)||0) + 1) }))}
                          style={{ width:30, height:30, border:`1px solid ${BRAND.moosgruen}`, background:"#fff", borderRadius:7, fontSize:16, color:BRAND.moosgruen, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                      </div>
                    </div>

                    {/* Gruppe & Kontakt-Karte */}
                    <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                      <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>
                        {adminForm.type === "pending" ? "Anfrage – Gruppe & Kontakt" : "Gruppe & Kontakt"}
                      </div>
                      <input placeholder="Gruppenname (z.B. Volksschule St. Ruprecht)" value={adminForm.groupName||""} onChange={e => setAdminForm(f=>({...f, groupName:e.target.value}))}
                        style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", marginBottom:6, color:BRAND.aubergine }} />
                      <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                        <input placeholder="Ansprechpartner *" value={adminForm.contactName||""} onChange={e => setAdminForm(f=>({...f, contactName:e.target.value}))}
                          style={{ flex:1, padding:"10px 12px", border:`1px solid ${reqAdmin(!(adminForm.contactName||"").trim()).borderColor}`, background: reqAdmin(!(adminForm.contactName||"").trim()).background, borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                        <input placeholder="Telefon *" value={adminForm.contactPhone||""} onChange={e => setAdminForm(f=>({...f, contactPhone:e.target.value}))}
                          style={{ flex:1, padding:"10px 12px", border:`1px solid ${reqAdmin(!(adminForm.contactPhone||"").trim()).borderColor}`, background: reqAdmin(!(adminForm.contactPhone||"").trim()).background, borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                      </div>
                      <input placeholder="E-Mail" value={adminForm.customerEmail||""} onChange={e => setAdminForm(f=>({...f, customerEmail:e.target.value}))}
                        style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                      {adminForm.type === "pending" && (
                        <textarea placeholder="Nachricht / Wünsche des Kunden" value={adminForm.customerMessage||""} onChange={e => setAdminForm(f=>({...f, customerMessage:e.target.value}))}
                          style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", height:50, resize:"none", marginTop:6, color:BRAND.aubergine, lineHeight:1.5 }} />
                      )}
                    </div>

                    {/* Café im Paradiesglashaus */}
                    <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                      <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Café im Paradiesglashaus</div>

                      {/* Kaffee */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kaffee</div>
                          <div style={{ fontSize:11, color:"#999" }}>à € {(gt?.coffeePrice || 3.10).toFixed(2).replace(".",",")}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <button onClick={() => setAdminForm(f => ({ ...f, coffeeCount: Math.max(0, (Number(f.coffeeCount)||0) - 1) }))}
                            style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                          <input type="number" min="0" value={adminForm.coffeeCount||""} onChange={e => setAdminForm(f=>({...f, coffeeCount:e.target.value}))}
                            placeholder="0" style={{ width:44, textAlign:"center", padding:"5px 0", border:"1px solid #e0d5df", borderRadius:6, fontSize:14, color:BRAND.aubergine, fontFamily:"inherit", background:"#fff" }} />
                          <button onClick={() => setAdminForm(f => ({ ...f, coffeeCount: (Number(f.coffeeCount)||0) + 1 }))}
                            style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                        </div>
                      </div>

                      {/* Kuchen */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kuchen</div>
                          <div style={{ fontSize:11, color:"#999" }}>à € {(gt?.cakePrice || 4.50).toFixed(2).replace(".",",")}</div>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <button onClick={() => setAdminForm(f => ({ ...f, cakeCount: Math.max(0, (Number(f.cakeCount)||0) - 1) }))}
                            style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                          <input type="number" min="0" value={adminForm.cakeCount||""} onChange={e => setAdminForm(f=>({...f, cakeCount:e.target.value}))}
                            placeholder="0" style={{ width:44, textAlign:"center", padding:"5px 0", border:"1px solid #e0d5df", borderRadius:6, fontSize:14, color:BRAND.aubergine, fontFamily:"inherit", background:"#fff" }} />
                          <button onClick={() => setAdminForm(f => ({ ...f, cakeCount: (Number(f.cakeCount)||0) + 1 }))}
                            style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                        </div>
                      </div>

                      {/* Führung-Toggle */}
                      <label onClick={() => setAdminForm(f=>({...f, tourGuide:!f.tourGuide}))}
                        style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:`${BRAND.moosgruen}12`, borderRadius:10, cursor:"pointer", marginBottom: nP > 0 ? 10 : 0 }}>
                        <div style={{ width:20, height:20, borderRadius:5, background: adminForm.tourGuide ? BRAND.moosgruen : "#fff", border: adminForm.tourGuide ? "none" : `1.5px solid ${BRAND.moosgruen}60`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                          {adminForm.tourGuide && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, color:BRAND.moosgruen, fontWeight:600 }}>Führung mit Gartenexpertin</div>
                          <div style={{ fontSize:11, color:BRAND.moosgruen, opacity:0.65, marginTop:1 }}>€ {gt?.guideCost || 80} pro {gt?.maxPerTour || 20} Teilnehmer</div>
                        </div>
                        <span style={{ fontSize:13, color:BRAND.moosgruen, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>€ {gt?.guideCost || 80}</span>
                      </label>

                      {/* Kostenauflistung */}
                      {nP > 0 && (
                        <div style={{ background:"#f8f4f8", borderRadius:10, padding:"10px 12px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:2 }}>
                            <span>Eintritt ({nP}× à € {(gt?.pricePerPerson || 9).toFixed(2).replace(".",",")})</span>
                            <span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cEintritt.toFixed(2).replace(".",",")}</span>
                          </div>
                          <div style={{ fontSize:10, color:BRAND.moosgruen, marginBottom:6, fontStyle:"italic" }}>mit Kärnten Card kostenlos</div>
                          {nKaffee > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}>
                            <span>Kaffee ({nKaffee}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cKaffee.toFixed(2).replace(".",",")}</span>
                          </div>}
                          {nKuchen > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}>
                            <span>Kuchen ({nKuchen}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cKuchen.toFixed(2).replace(".",",")}</span>
                          </div>}
                          {adminForm.tourGuide && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:6 }}>
                            <span>Führung{nF > 1 ? ` (${nF}×)` : ""}</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {cFuehrung.toFixed(2).replace(".",",")}</span>
                          </div>}
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:BRAND.aubergine, fontWeight:600, paddingTop:6, borderTop:"1px solid #ebe4ea" }}>
                            <span>Geschätzt gesamt</span>
                            <span style={{ fontVariantNumeric:"tabular-nums", color:BRAND.lila }}>ca. € {cGesamt.toFixed(2).replace(".",",")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                  );
                })()}

                {/* Checkliste - D-Stil */}
                {(() => {
                  const clList = adminForm.checklist || [];
                  const reminderActive = !!adminForm.reminders?.checklist?.enabled;
                  const hasItemReminders = Object.values(adminForm.reminders?.items || {}).some(r => r?.enabled);
                  return (
                <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"1px solid #f0e8ee" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <div style={{ fontSize:11, color: BRAND.lila, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5 }}>Checkliste</div>
                    {clList.length > 0 && (
                      <button onClick={() => setReminderPopup({ type:"checklist" })}
                        title={reminderActive ? `Erinnerung aktiv: ${adminForm.reminders.checklist.daysBefore || 3} Tage vorher um ${adminForm.reminders.checklist.sendAt || "09:00"}` : "Erinnerung einrichten"}
                        style={{ background: reminderActive ? BRAND.moosgruen : "transparent", border: reminderActive ? "none" : "1px solid #d5cbd2", borderRadius:"50%", width:26, height:26, padding:0, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", transition:"all .15s" }}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6.5" stroke={reminderActive ? "#fff" : "#888"} strokeWidth="1.5"/>
                          <path d="M8 4.5V8l2 1.5" stroke={reminderActive ? "#fff" : "#888"} strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        {reminderActive && hasItemReminders && (
                          <div style={{ position:"absolute", top:-3, right:-3, width:10, height:10, borderRadius:"50%", background: BRAND.sonnengelb, border:"1.5px solid #fff" }} />
                        )}
                      </button>
                    )}
                  </div>
                  <ChecklistNote items={clList} onChange={(items) => setAdminForm(f=>({...f, checklist:items}))} reminders={adminForm.reminders?.items || {}} onReminderClick={(itemKey) => setReminderPopup({ type:"item", itemKey })} />
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, cursor:"text" }}
                    onClick={e => { const inp = e.currentTarget.querySelector("input"); if(inp) inp.focus(); }}>
                    <span style={{ color:"#ccc", fontSize:16, fontWeight:300, flexShrink:0, width:18, textAlign:"center" }}>+</span>
                    <input placeholder="Hinzufügen…" value={adminForm.newCheckText||""} onChange={e => setAdminForm(f=>({...f, newCheckText:e.target.value}))}
                      onKeyDown={e => { if (e.key==="Enter" && adminForm.newCheckText?.trim()) {
                        setAdminForm(f => {
                          const text = (f.newCheckText||"").trim();
                          if (!text) return f;
                          const newItem = { id: `c${Date.now()}_${Math.random().toString(36).slice(2,6)}`, text, done:false };
                          const newList = [...(f.checklist||[]), newItem];
                          // Auto-Default-Reminder aktivieren beim ersten Eintrag
                          const currReminders = f.reminders || { checklist:null, items:{} };
                          const updatedReminders = (!currReminders.checklist && newList.length === 1)
                            ? { ...currReminders, checklist: { enabled:true, daysBefore:3, sendAt:"09:00", recipients:["wendelin"] } }
                            : currReminders;
                          return { ...f, checklist: newList, newCheckText:"", reminders: updatedReminders };
                        });
                      }}}
                      style={{ border:"none", outline:"none", background:"transparent", fontSize:13, color:BRAND.aubergine, flex:1, padding:"4px 0", fontFamily:"inherit" }} />
                  </div>
                </div>
                );
                })()}

                {/* Interne Notiz - D-Stil */}
                <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"1px solid #f0e8ee" }}>
                  <div style={{ fontSize:11, color:"#999", fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>Interne Notiz</div>
                  <textarea placeholder="Notizen zu diesem Termin…" value={adminForm.adminNote} onChange={e => setAdminForm(f=>({...f, adminNote:e.target.value}))}
                    style={{ width:"100%", padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", height:64, resize:"vertical", color:BRAND.aubergine, lineHeight:1.5 }} />
                </div>

                {/* Vereinbarter Preis - bei Veranstaltungen & Serien, nicht bei Gruppenführungen & internen Terminen */}
                {((adminForm.type === "booked" || adminForm.type === "pending" || adminForm.isSeries || adminForm.editAllSeries) && adminForm.eventType !== "gruppenfuehrung") && (() => {
                  const CLEANING_FEE = 150;
                  const priceNum = parseFloat(String(adminForm.price || "").replace(/\./g, "").replace(",", ".")) || 0;
                  const partialNum = parseFloat(String(adminForm.partialAmount || "").replace(/\./g, "").replace(",", ".")) || 0;
                  const feeAmount = adminForm.cleaningFee ? CLEANING_FEE : 0;
                  const fmtMoney = (n) => n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  const paymentStatus = adminForm.paymentStatus || "open";
                  // "Noch offen" je nach Status: bezahlt → 0, Anzahlung → Rest nach Abzug, offen → voller Betrag
                  let restOffen;
                  if (paymentStatus === "paid") restOffen = 0;
                  else if (paymentStatus === "partial") restOffen = Math.max(0, priceNum - partialNum + feeAmount);
                  else restOffen = priceNum + feeAmount;
                  // Farbe für den "Noch offen"-Betrag je nach Status
                  const restColor = paymentStatus === "paid" ? "#006930" : paymentStatus === "partial" ? BRAND.lila : "#c44444";
                  const statuses = [
                    { v: "open", l: "Offen", c: "#c44444", bg: "#c4444415", bd: "#c44444" },
                    { v: "partial", l: "Anzahlung", c: "#8a6a00", bg: "#ffda6f22", bd: "#ffda6f" },
                    { v: "paid", l: "Bezahlt", c: "#006930", bg: "#e6f3ea", bd: "#006930" },
                  ];
                  // Status-Wechsel: bei Wechsel auf "offen" oder "paid" die Anzahlung löschen
                  const pickStatus = (v) => {
                    setAdminForm(f => ({
                      ...f,
                      paymentStatus: v,
                      partialAmount: v === "partial" ? f.partialAmount : "",
                    }));
                  };
                  return (
                    <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", marginBottom:10, border:"1px solid #f0e8ee" }}>
                      <div style={{ fontSize:11, color:BRAND.lila, fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>Vereinbarter Preis</div>
                      <div style={{ position:"relative", marginBottom:10 }}>
                        <input placeholder="0,00" value={adminForm.price} onChange={e => setAdminForm(f=>({...f, price:e.target.value}))}
                          style={{ width:"100%", padding:"10px 30px 10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:14, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                        <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color: BRAND.lila, fontWeight:600, fontSize:14, pointerEvents:"none" }}>€</span>
                      </div>
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        {statuses.map(s => {
                          const active = paymentStatus === s.v;
                          return (
                            <button key={s.v} onClick={() => pickStatus(s.v)}
                              style={{ padding:"8px 14px", border:`1.5px solid ${active ? s.bd : "#e8d8e4"}`, borderRadius:8, background: active ? s.bg : "#fff", color: active ? s.c : "#999", fontSize:12, fontWeight:600, cursor:"pointer", letterSpacing:0.2, fontFamily:"inherit" }}>
                              {s.l}
                            </button>
                          );
                        })}
                      </div>
                      <label onClick={() => setAdminForm(f=>({...f, cleaningFee: !f.cleaningFee}))}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer", marginBottom: paymentStatus === "partial" ? 4 : 0 }}>
                        <div style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${adminForm.cleaningFee ? BRAND.lila : "#ccc"}`, background: adminForm.cleaningFee ? BRAND.lila : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                          {adminForm.cleaningFee && <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontSize:12, color: BRAND.aubergine }}>Reinigungspauschale <span style={{ color:"#999" }}>(+ 150 €)</span></span>
                      </label>
                      {paymentStatus === "partial" && (
                        <div style={{ position:"relative", marginTop:8 }}>
                          <input placeholder="Angezahlter Betrag" value={adminForm.partialAmount} onChange={e => setAdminForm(f=>({...f, partialAmount:e.target.value}))}
                            style={{ width:"100%", padding:"10px 30px 10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />
                          <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:"#8a6a00", fontWeight:600, fontSize:13, pointerEvents:"none" }}>€</span>
                        </div>
                      )}
                      {priceNum > 0 && (
                        <div style={{ fontSize:11, color:"#999", textAlign:"right", marginTop:8, paddingRight:2 }}>
                          Noch offen: <span style={{ color: restColor, fontWeight:700, fontSize:13 }}>€ {fmtMoney(restOffen)}</span>
                          {adminForm.cleaningFee && paymentStatus !== "paid" && <span style={{ color:"#999", fontSize:10, marginLeft:4 }}>inkl. Pauschale</span>}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Public toggle - only for internal events, directly above Serientermin */}
                {adminForm.type === "blocked" && (
                <label onClick={() => setAdminForm(f=>({...f, isPublic:!f.isPublic, contactAddress: !f.isPublic && !f.contactAddress ? "Emmersdorfer Straße 86, 9061 Klagenfurt" : f.contactAddress}))}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: adminForm.isPublic ? "#009a9310" : "#fff", border:`1.5px solid ${adminForm.isPublic ? "#009a93" : "#e0d8de"}`, borderRadius:10, cursor:"pointer", marginBottom:10, transition:"all .15s" }}>
                  <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${adminForm.isPublic ? "#009a93" : "#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: adminForm.isPublic ? "#009a93" : "#fff", transition:"all .15s" }}>
                    {adminForm.isPublic && <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <span style={{ fontWeight:600, fontSize:15, color: BRAND.aubergine }}>Öffentlich sichtbar</span>
                    <div style={{ fontSize:9, color:"#aaa" }}>Bezeichnung, Beschreibung, Kontakt & Adresse werden für Kunden sichtbar</div>
                  </div>
                </label>
                )}

                {/* PUBLIC SECTION - expanded description when isPublic checked (Kontakt kommt separat unten) */}
                {adminForm.type === "blocked" && adminForm.isPublic && (
                  <div style={{ background:"#009a9306", borderRadius:10, padding:"12px 14px", marginBottom:10, border:"1px solid #009a9320" }}>
                    <div style={{ fontSize:11, color:"#009a93", fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>Für Kunden sichtbar</div>
                    <label style={{ fontSize:10, color:"#999", fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Beschreibung</label>
                    <textarea placeholder="Text für Kunden…" value={adminForm.publicText} onChange={e => setAdminForm(f=>({...f, publicText:e.target.value}))} style={{ ...inputStyle, height:50, resize:"vertical", fontSize:13, marginBottom:6 }} />
                    <label style={{ fontSize:10, color:"#999", fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Veranstaltungsort</label>
                    <input placeholder="Adresse" value={adminForm.contactAddress} onChange={e => setAdminForm(f=>({...f, contactAddress:e.target.value}))}
                      style={{ ...inputStyle, marginBottom:0, fontSize:13, padding:"8px 10px" }} />
                  </div>
                )}

                {/* CONTACT PERSON - sichtbar für alle blocked Events (intern oder öffentlich), alle Felder optional */}
                {adminForm.type === "blocked" && (
                  <div style={{ background:"#f9f7fa", borderRadius:10, padding:"12px 14px", marginBottom:10, border:"1px solid #ede8ed" }}>
                    <div style={{ fontSize:11, color:BRAND.aubergine, fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, marginBottom:10 }}>
                      Ansprechperson {adminForm.isPublic && <span style={{ color:"#009a93", fontWeight:500 }}>· für Kunden sichtbar</span>}
                    </div>
                    <input placeholder="Name" value={adminForm.contactName||""} onChange={e => setAdminForm(f=>({...f, contactName:e.target.value}))}
                      style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:15, fontFamily:"inherit", boxSizing:"border-box", marginBottom:6 }} />
                    <div style={{ display:"flex", gap:6 }}>
                      <input placeholder="Telefon" value={adminForm.contactPhone||""} onChange={e => setAdminForm(f=>({...f, contactPhone:e.target.value}))}
                        style={{ flex:1, padding:"10px 12px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:15, fontFamily:"inherit", boxSizing:"border-box" }} />
                      <input placeholder="E-Mail" value={adminForm.contactEmail||""} onChange={e => setAdminForm(f=>({...f, contactEmail:e.target.value}))}
                        style={{ flex:1, padding:"10px 12px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:15, fontFamily:"inherit", boxSizing:"border-box" }} />
                    </div>
                  </div>
                )}

                {/* Serientermin toggle + calendar - only for internal events, not when editing all */}
                {adminForm.type === "blocked" && !adminForm.editAllSeries && (
                <>
                <label onClick={() => setAdminForm(f=>({...f, isSeries:!f.isSeries, seriesDates: f.isSeries ? [] : f.seriesDates}))}
                  style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: adminForm.isSeries ? `#009a9310` : "#fff", border:`1.5px solid ${adminForm.isSeries ? "#009a93" : "#e0d8de"}`, borderRadius:10, cursor:"pointer", marginBottom:10, transition:"all .15s" }}>
                  <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${adminForm.isSeries ? "#009a93" : "#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: adminForm.isSeries ? "#009a93" : "#fff", transition:"all .15s" }}>
                    {adminForm.isSeries && <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <div>
                    <span style={{ fontWeight:600, fontSize:15, color: BRAND.aubergine }}>Serientermin</span>
                    <div style={{ fontSize:9, color:"#aaa" }}>An weiteren Tagen wiederholen</div>
                  </div>
                </label>

                {adminForm.isSeries && (
                <div style={{ background:"#f9f7fa", borderRadius:10, padding:"12px 14px", marginBottom:12, border:"1px solid #ede8ed" }}>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
                    {(adminForm.seriesDates||[]).map(dk => {
                      const [sy,sm,sd] = dk.split("-").map(Number);
                      const dObj = new Date(sy,sm-1,sd);
                      return (
                        <span key={dk} style={{ display:"inline-flex", alignItems:"center", gap:4, background:BRAND.lila+"15", color:BRAND.aubergine, padding:"3px 8px", borderRadius:12, fontSize:10, fontWeight:500 }}>
                          {["So","Mo","Di","Mi","Do","Fr","Sa"][dObj.getDay()]}, {sd}.{sm}.
                          <span onClick={() => setAdminForm(f=>({...f, seriesDates:f.seriesDates.filter(x=>x!==dk)}))} style={{ cursor:"pointer", color:"#c44", fontWeight:700, fontSize:12, lineHeight:1 }}>×</span>
                        </span>
                      );
                    })}
                  </div>
                  {(() => {
                    const sm = seriesMonth ?? month;
                    const sy = seriesYear ?? year;
                    return (
                    <>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                      <button onClick={() => { const nm = sm === 0 ? 11 : sm - 1; const ny = sm === 0 ? sy - 1 : sy; setSeriesMonth(nm); setSeriesYear(ny); }}
                        style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#999" }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                      <span style={{ fontSize:11, fontWeight:600, color:BRAND.aubergine }}>{MONTHS[sm]} {sy}</span>
                      <button onClick={() => { const nm = sm === 11 ? 0 : sm + 1; const ny = sm === 11 ? sy + 1 : sy; setSeriesMonth(nm); setSeriesYear(ny); }}
                        style={{ background:"none", border:"none", cursor:"pointer", padding:4, color:"#999" }}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                      {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => <div key={d} style={{ fontSize:8, color:"#bbb", textAlign:"center", fontWeight:600 }}>{d}</div>)}
                      {(() => {
                        const firstDay = (new Date(sy,sm,1).getDay()+6)%7;
                        const daysInMonth = new Date(sy,sm+1,0).getDate();
                        const cells = [];
                        for (let i=0;i<firstDay;i++) cells.push(<div key={`e${i}`} />);
                        for (let d=1;d<=daysInMonth;d++) {
                          const dk = dateKey(sy,sm,d);
                          const isSel = dk === selectedDate;
                          const isInSeries = (adminForm.seriesDates||[]).includes(dk);
                          // Konsistent mit dem Haupt-Picker: nur ganztägig-gebuchte/blockierte Events blockieren
                          // (pending, deleted, !allDay, Serien sind OK)
                          const evRaw = events[dk];
                          const evHere = evRaw?.status === "deleted" ? null : evRaw;
                          const blockedByEv = evHere && evHere.allDay && evHere.status !== "pending" && !evHere.isSeries;
                          const hasEv = blockedByEv && dk !== selectedDate;
                          const isPast = new Date(sy,sm,d) < new Date(today.getFullYear(),today.getMonth(),today.getDate());
                          cells.push(
                            <button key={dk} disabled={isSel||hasEv||isPast}
                              onClick={() => setAdminForm(f=>({...f, seriesDates: isInSeries ? f.seriesDates.filter(x=>x!==dk) : [...(f.seriesDates||[]),dk]}))}
                              style={{ aspectRatio:"1", border: isInSeries ? `2px solid ${BRAND.lila}` : isSel ? `2px solid ${BRAND.aubergine}` : "1px solid #eee", borderRadius:4, background: isSel ? `${BRAND.aubergine}20` : isInSeries ? `${BRAND.lila}15` : hasEv ? "#f5f3f4" : "#fff", cursor: isSel||hasEv||isPast ? "default" : "pointer", fontSize:10, fontWeight: isSel||isInSeries ? 700 : 400, color: isPast ? "#ccc" : hasEv ? "#bbb" : isSel ? BRAND.aubergine : isInSeries ? BRAND.lila : "#666", padding:0 }}>
                              {d}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    </>
                    );
                  })()}
                  {(adminForm.seriesDates||[]).length > 0 && <div style={{ fontSize:10, color:BRAND.lila, marginTop:6, fontWeight:500 }}>+ {adminForm.seriesDates.length} weitere Termine</div>}
                </div>
                )}
                </>
                )}

                <button onClick={() => handleAdminSave()} style={primaryBtn}>Speichern</button>

                {/* Lösch-Option unten bei existierenden Terminen */}
                {(() => {
                  const existing = events[selectedDate];
                  const isExisting = existing && existing.status !== "deleted" && !adminForm.addToExisting;
                  if (!isExisting) return null;
                  return (
                    <button onClick={() => handleAdminAction(selectedDate, "delete", editingSubIndex)}
                      onMouseEnter={e => { e.currentTarget.style.color="#c44"; e.currentTarget.style.background="#fdf6f6"; }}
                      onMouseLeave={e => { e.currentTarget.style.color="#bbb"; e.currentTarget.style.background="transparent"; }}
                      style={{ width:"100%", padding:"11px", marginTop:10, background:"transparent", border:"none", color:"#bbb", cursor:"pointer", fontSize:13, borderRadius:8, transition:"all .15s", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
                      Termin löschen
                    </button>
                  );
                })()}

                {/* ===== Meta-Chip-Popups ===== */}
                {chipPopup && (() => {
                  const et = eventTypes.find(t => t.id === adminForm.eventType);
                  const typeLabels = eventTypes.map(x => x.label);
                  const [yy,mm,dd] = selectedDate.split("-").map(Number);
                  const pyr = datePopupYear ?? yy;
                  const pmo = datePopupMonth ?? (mm-1);
                  const close = () => setChipPopup(null);
                  return (
                    <div onClick={close} style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
                      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"20px 22px", minWidth:280, maxWidth:400, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.25)", maxHeight:"80vh", overflowY:"auto" }}>

                        {chipPopup === "status" && (
                          <>
                            <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:12 }}>Status wählen</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {(adminForm.addToExisting
                                ? [["booked","Gebucht",BRAND.lila],["pending","Anfrage",BRAND.aprikot]]
                                : [["booked","Gebucht",BRAND.lila],["pending","Anfrage",BRAND.aprikot],["blocked","Intern & Serientermin","#009a93"]]
                              ).map(([v,l,c]) => (
                                <button key={v} onClick={() => { setAdminForm(f=>({...f, type:v})); close(); }}
                                  style={{ padding:"12px 14px", border:`2px solid ${adminForm.type===v ? c : "#e0d8de"}`, borderRadius:10, background: adminForm.type===v ? c+"15" : "#fff", color: adminForm.type===v ? c : BRAND.aubergine, fontWeight:600, fontSize:14, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:10, fontFamily:"inherit" }}>
                                  <div style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }} />
                                  {l}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {chipPopup === "date" && (
                          <>
                            <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:12 }}>Datum ändern</div>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                              <button onClick={() => { const nm = pmo === 0 ? 11 : pmo - 1; const ny = pmo === 0 ? pyr - 1 : pyr; setDatePopupMonth(nm); setDatePopupYear(ny); }}
                                style={{ background:"none", border:"none", cursor:"pointer", padding:6, color:"#999" }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                              <span style={{ fontSize:14, fontWeight:600, color:BRAND.aubergine }}>{MONTHS[pmo]} {pyr}</span>
                              <button onClick={() => { const nm = pmo === 11 ? 0 : pmo + 1; const ny = pmo === 11 ? pyr + 1 : pyr; setDatePopupMonth(nm); setDatePopupYear(ny); }}
                                style={{ background:"none", border:"none", cursor:"pointer", padding:6, color:"#999" }}>
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                              </button>
                            </div>
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
                              {["Mo","Di","Mi","Do","Fr","Sa","So"].map(d => <div key={d} style={{ fontSize:10, color:"#bbb", textAlign:"center", fontWeight:600, padding:4 }}>{d}</div>)}
                              {(() => {
                                const firstDay = (new Date(pyr,pmo,1).getDay()+6)%7;
                                const daysInMonth = new Date(pyr,pmo+1,0).getDate();
                                const cells = [];
                                for (let i=0;i<firstDay;i++) cells.push(<div key={`e${i}`} />);
                                for (let d=1;d<=daysInMonth;d++) {
                                  const kDate = `${pyr}-${String(pmo+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                                  const isCurrent = kDate === selectedDate;
                                  cells.push(
                                    <button key={d} onClick={() => {
                                      // Datum verschieben: aktuellen Event zum neuen Datum verlagern
                                      if (kDate !== selectedDate) {
                                        const src = events[selectedDate];
                                        if (src) {
                                          const updated = { ...events };
                                          // Falls es ein Sub-Event ist, nur den Sub verschieben
                                          if (editingSubIndex >= 0 && src.subEvents) {
                                            const movedSub = src.subEvents[editingSubIndex];
                                            updated[selectedDate] = { ...src, subEvents: src.subEvents.filter((_,i) => i !== editingSubIndex) };
                                            const existingAtNew = updated[kDate];
                                            if (existingAtNew && existingAtNew.status !== "deleted") {
                                              updated[kDate] = { ...existingAtNew, subEvents: [...(existingAtNew.subEvents||[]), movedSub] };
                                            } else {
                                              updated[kDate] = { ...movedSub, subEvents: [] };
                                            }
                                          } else {
                                            // Haupt-Event verschieben (inkl. subEvents)
                                            updated[kDate] = src;
                                            delete updated[selectedDate];
                                          }
                                          saveEvents(updated);
                                          setSelectedDate(kDate);
                                        }
                                      }
                                      close();
                                    }}
                                      style={{ padding:"8px 0", background: isCurrent ? BRAND.lila : "#fff", color: isCurrent ? "#fff" : BRAND.aubergine, border: isCurrent ? "none" : "1px solid #efe8ed", borderRadius:6, fontSize:13, fontWeight: isCurrent ? 700 : 500, cursor:"pointer", fontFamily:"inherit" }}>
                                      {d}
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                            <div style={{ fontSize:10, color:"#bbb", marginTop:12, textAlign:"center", fontStyle:"italic" }}>Termin wird zum gewählten Datum verschoben</div>
                          </>
                        )}

                        {chipPopup === "time" && (
                          <>
                            <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:14 }}>Zeit ändern</div>
                            {!adminForm.allDay && (
                              <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center", marginBottom:14, flexWrap:"wrap" }}>
                                <span style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Von</span>
                                <TimeInput value={adminForm.startTime || "08:00"} onChange={v => setAdminForm(f=>({...f, startTime:v}))} />
                                <span style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Bis</span>
                                <TimeInput value={adminForm.endTime || "22:00"} onChange={v => setAdminForm(f=>({...f, endTime:v}))} />
                              </div>
                            )}
                            <label onClick={() => setAdminForm(f=>({...f, allDay:!f.allDay}))}
                              style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"10px 12px", background:"#f8f4f8", borderRadius:8, marginBottom:14 }}>
                              <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${adminForm.allDay ? BRAND.lila : "#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: adminForm.allDay ? BRAND.lila : "#fff" }}>
                                {adminForm.allDay && <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <span style={{ fontWeight:500, fontSize:14, color:BRAND.aubergine }}>Ganztägig</span>
                            </label>
                            <button onClick={close}
                              style={{ width:"100%", padding:"10px", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Übernehmen</button>
                          </>
                        )}

                        {chipPopup === "type" && (
                          <>
                            <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:12 }}>Veranstaltungs-Typ wählen</div>
                            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                              {eventTypes.map(t => {
                                const isSelected = adminForm.eventType === t.id;
                                return (
                                  <button key={t.id} onClick={() => { setAdminForm(f=>({...f, eventType:t.id, label: !f.label || typeLabels.includes(f.label) ? t.label : f.label})); close(); }}
                                    style={{ padding:"11px 14px", border:`2px solid ${isSelected ? t.color : "#e0d8de"}`, borderRadius:10, background: isSelected ? t.color+"15" : "#fff", color: isSelected ? t.color : BRAND.aubergine, fontSize:14, fontWeight:600, cursor:"pointer", borderLeft:`4px solid ${t.color}`, textAlign:"left", fontFamily:"inherit" }}>
                                    {t.label}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}

                      </div>
                    </div>
                  );
                })()}

                {/* ===== Reminder-Popup ===== */}
                {reminderPopup && (() => {
                  const isChecklist = reminderPopup.type === "checklist";
                  const itemKey = reminderPopup.itemKey;
                  const curr = isChecklist
                    ? (adminForm.reminders?.checklist || { enabled:false, daysBefore:3, sendAt:"09:00", recipients:["wendelin"], customUnit:"days" })
                    : (adminForm.reminders?.items?.[itemKey] || { enabled:false, daysBefore:3, sendAt:"09:00", recipients:["wendelin"], customUnit:"days" });
                  const close = () => setReminderPopup(null);
                  const updateReminder = (patch) => {
                    setAdminForm(f => {
                      const r = f.reminders || { checklist:null, items:{} };
                      const merged = { ...curr, ...patch };
                      if (isChecklist) {
                        return { ...f, reminders: { ...r, checklist: merged } };
                      }
                      return { ...f, reminders: { ...r, items: { ...(r.items||{}), [itemKey]: merged } } };
                    });
                  };
                  const presetValues = [
                    { k:"3d", label:"3 Tage vorher", daysBefore:3, custom:false },
                    { k:"1d", label:"1 Tag vorher", daysBefore:1, custom:false },
                    { k:"1w", label:"1 Woche vorher", daysBefore:7, custom:false },
                  ];
                  const isCustom = !presetValues.some(p => p.daysBefore === curr.daysBefore && !curr.custom) || curr.custom;
                  const itemText = !isChecklist ? (adminForm.checklist || []).find(it => (it.id || `idx-${(adminForm.checklist||[]).indexOf(it)}`) === itemKey)?.text : null;
                  const toggleRecipient = (r) => {
                    const list = curr.recipients || [];
                    const next = list.includes(r) ? list.filter(x => x !== r) : [...list, r];
                    // Mindestens einer muss aktiv bleiben
                    updateReminder({ recipients: next.length ? next : [r] });
                  };
                  return (
                    <div onClick={close} style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
                      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"18px 20px", width:"100%", maxWidth:340, boxShadow:"0 16px 40px rgba(0,0,0,0.18)", maxHeight:"85vh", overflowY:"auto" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600 }}>Erinnerung</div>
                            <div style={{ fontSize:15, fontWeight:500, color:BRAND.aubergine, marginTop:2, lineHeight:1.3 }}>
                              {isChecklist ? "Gesamte Checkliste" : <>„{itemText || "Eintrag"}"</>}
                            </div>
                          </div>
                          <button onClick={close} style={{ background:"none", border:"none", color:"#bbb", padding:0, cursor:"pointer", display:"flex", marginLeft:8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M6 18L18 6"/></svg>
                          </button>
                        </div>

                        <label onClick={() => updateReminder({ enabled: !curr.enabled })}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background: curr.enabled ? BRAND.moosgruen : "#f5f3f4", color: curr.enabled ? "#fff" : "#666", borderRadius:10, marginBottom:14, cursor:"pointer", transition:"all .15s" }}>
                          <div style={{ width:18, height:18, borderRadius:4, background: curr.enabled ? "#fff" : "transparent", border: curr.enabled ? "none" : "1.5px solid #ccc", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            {curr.enabled && <svg width="11" height="11" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke={BRAND.moosgruen} strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <span style={{ fontSize:13, fontWeight:500 }}>E-Mail-Erinnerung aktiv</span>
                        </label>

                        {curr.enabled && <>
                          <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:8 }}>Wann?</div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                            {presetValues.map(p => {
                              const active = !isCustom && curr.daysBefore === p.daysBefore;
                              return (
                                <button key={p.k} onClick={() => updateReminder({ daysBefore: p.daysBefore, custom:false })}
                                  style={{ padding:"8px", border: active ? `1.5px solid ${BRAND.moosgruen}` : "1px solid #e8d8e4", background: active ? `${BRAND.moosgruen}15` : "#fff", color: active ? BRAND.moosgruen : "#666", borderRadius:8, fontSize:12, fontWeight: active ? 500 : 400, cursor:"pointer", fontFamily:"inherit" }}>
                                  {p.label}
                                </button>
                              );
                            })}
                            <button onClick={() => updateReminder({ custom:true, customUnit: curr.customUnit || "days", customValue: curr.customValue || 6 })}
                              style={{ padding:"8px", border: isCustom ? `1.5px solid ${BRAND.moosgruen}` : "1px solid #e8d8e4", background: isCustom ? `${BRAND.moosgruen}15` : "#fff", color: isCustom ? BRAND.moosgruen : "#666", borderRadius:8, fontSize:12, fontWeight: isCustom ? 500 : 400, cursor:"pointer", fontFamily:"inherit" }}>
                              Eigener
                            </button>
                          </div>

                          {isCustom && (() => {
                            const val = Number(curr.customValue) || 6;
                            const unit = curr.customUnit || "days";
                            const setVal = (v) => {
                              const clean = Math.max(1, Math.min(999, Math.floor(v)));
                              const db = unit === "weeks" ? clean * 7 : clean;
                              updateReminder({ customValue: clean, customUnit: unit, custom:true, daysBefore: db });
                            };
                            const setUnit = (u) => {
                              const db = u === "weeks" ? val * 7 : val;
                              updateReminder({ customUnit: u, custom:true, daysBefore: db });
                            };
                            return (
                              <div style={{ padding:12, background:`${BRAND.moosgruen}10`, borderRadius:10, marginBottom:10, border:`1px solid ${BRAND.moosgruen}40` }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <div style={{ display:"flex", alignItems:"center", background:"#fff", borderRadius:6, border:`1px solid ${BRAND.moosgruen}40` }}>
                                    <button onClick={() => setVal(val - 1)} style={{ padding:"6px 10px", background:"none", border:"none", color:BRAND.moosgruen, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>−</button>
                                    <input type="number" min="1" max="999" value={val}
                                      onChange={e => setVal(Number(e.target.value)||1)}
                                      style={{ width:40, padding:"5px 0", border:"none", textAlign:"center", fontSize:14, fontWeight:500, color:BRAND.aubergine, background:"none", outline:"none", fontFamily:"inherit", MozAppearance:"textfield" }} />
                                    <button onClick={() => setVal(val + 1)} style={{ padding:"6px 10px", background:"none", border:"none", color:BRAND.moosgruen, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>+</button>
                                  </div>
                                  <div style={{ display:"flex", gap:4, flex:1 }}>
                                    <button onClick={() => setUnit("days")}
                                      style={{ flex:1, padding:6, border: unit === "days" ? `1.5px solid ${BRAND.moosgruen}` : `1px solid ${BRAND.moosgruen}40`, background: unit === "days" ? BRAND.moosgruen : "#fff", color: unit === "days" ? "#fff" : BRAND.moosgruen, borderRadius:6, fontSize:12, fontWeight: unit === "days" ? 500 : 400, cursor:"pointer", fontFamily:"inherit" }}>Tage</button>
                                    <button onClick={() => setUnit("weeks")}
                                      style={{ flex:1, padding:6, border: unit === "weeks" ? `1.5px solid ${BRAND.moosgruen}` : `1px solid ${BRAND.moosgruen}40`, background: unit === "weeks" ? BRAND.moosgruen : "#fff", color: unit === "weeks" ? "#fff" : BRAND.moosgruen, borderRadius:6, fontSize:12, fontWeight: unit === "weeks" ? 500 : 400, cursor:"pointer", fontFamily:"inherit" }}>Wochen</button>
                                  </div>
                                </div>
                                <div style={{ fontSize:10, color:BRAND.moosgruen, marginTop:6, textAlign:"center", opacity:0.75 }}>
                                  → {val} {unit === "weeks" ? (val === 1 ? "Woche" : "Wochen") : (val === 1 ? "Tag" : "Tage")} vor der Veranstaltung
                                </div>
                              </div>
                            );
                          })()}

                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:8, marginBottom:14 }}>
                            <span style={{ fontSize:11, color:"#888" }}>Uhrzeit</span>
                            <input type="text" value={curr.sendAt || "09:00"}
                              onChange={e => {
                                const v = e.target.value.replace(/[^0-9:]/g, "").slice(0, 5);
                                updateReminder({ sendAt: v });
                              }}
                              onBlur={e => {
                                // Normalisieren: HH:MM
                                let v = e.target.value.trim();
                                if (/^\d{1,2}$/.test(v)) v = v.padStart(2,"0") + ":00";
                                else if (/^\d{1,2}:\d{1,2}$/.test(v)) {
                                  const [h,m] = v.split(":");
                                  v = h.padStart(2,"0") + ":" + m.padStart(2,"0");
                                }
                                else v = "09:00";
                                updateReminder({ sendAt: v });
                              }}
                              style={{ width:60, padding:"4px 8px", border:"1px solid #e0d5df", borderRadius:5, fontSize:12, color:BRAND.aubergine, textAlign:"center", background:"#fff", fontFamily:"inherit" }} />
                          </div>

                          <div style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:8 }}>Empfänger</div>
                          {[["wendelin","Wendelin"], ["astrid","Astrid"]].map(([k, name]) => {
                            const active = (curr.recipients || []).includes(k);
                            return (
                              <label key={k} onClick={() => toggleRecipient(k)}
                                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", border: active ? `1.5px solid ${BRAND.moosgruen}` : "1px solid #e8d8e4", background: active ? `${BRAND.moosgruen}15` : "#fff", borderRadius:8, marginBottom:6, cursor:"pointer" }}>
                                <div style={{ width:16, height:16, borderRadius:4, border: active ? "none" : "1.5px solid #ccc", background: active ? BRAND.moosgruen : "#fff", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                  {active && <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <span style={{ fontSize:13, color: active ? BRAND.moosgruen : "#888", fontWeight: active ? 500 : 400 }}>{name}</span>
                              </label>
                            );
                          })}
                        </>}

                        <div style={{ display:"flex", gap:8, marginTop:14 }}>
                          <button onClick={close} style={{ flex:1, padding:10, background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                            Übernehmen
                          </button>
                          {curr.enabled && !isChecklist && (
                            <button onClick={() => { updateReminder({ enabled:false }); close(); }}
                              style={{ padding:"10px 14px", background:"transparent", color:"#c44", border:"1px solid #f0caca", borderRadius:8, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
                              Entfernen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
              );
            })()}

            {/* Customer Form */}
            {modalView === "form" && (() => {
              const et = eventTypes.find(e => e.id === formData.type);
              const isGroup = et?.isGroupTour;
              const nGuests = Number(formData.guests) || 0;
              const nCake = Number(formData.cakeCount) || 0;
              const nCoffee = Number(formData.coffeeCount) || 0;
              const costEntry = nGuests * (et?.pricePerPerson || 9);
              const costCake = nCake * (et?.cakePrice || 4.5);
              const costCoffee = nCoffee * (et?.coffeePrice || 3.1);
              const nTours = formData.tourGuide && nGuests > 0 ? Math.ceil(nGuests / (et?.maxPerTour || 20)) : 0;
              const costGuide = nTours * (et?.guideCost || 80);
              const costTotal = costEntry + costCake + costCoffee + costGuide;
              const price = isGroup ? 0 : (formData.slot.startsWith("halfDay") ? et?.halfDay : et?.fullDay);
              const missingName = !formData.name.trim();
              const missingEmail = !formData.email.trim();
              const invalidEmail = !missingEmail && !/\S+@\S+\.\S+/.test(formData.email);
              const guestsTooLow = isGroup && nGuests < (et?.minPersons || 10);
              const missingGuests = isGroup && !formData.guests;
              const missingPhone = !formData.phone.trim();
              const canSubmit = !missingName && !missingEmail && !invalidEmail && !missingPhone && (!isGroup || (!missingGuests && !guestsTooLow));
              const sa = submitAttempted;
              const reqStyle = (empty, invalid) => !sa ? inputStyle : invalid ? { ...inputStyle, borderColor:"#c44", background:"#fdf6f6" } : empty ? { ...inputStyle, borderColor: et?.color || BRAND.aprikot, background: (et?.color || BRAND.aprikot)+"08" } : inputStyle;
              const ec = et?.color || BRAND.lila;
              return (
                <>
                  <style>{`.form-modal input:focus, .form-modal textarea:focus { border-color: ${ec}80 !important; box-shadow: 0 0 0 2px ${ec}15 !important; }`}</style>
                  <div className="form-modal">
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <button onClick={() => { setPickerMonth(month); setPickerYear(year); setModalView("pickDate"); }}
                      style={{ width:34, height:34, borderRadius:"50%", background: `${et?.color || BRAND.lila}15`, border:"none", cursor:"pointer", padding:0, display:"flex", alignItems:"center", justifyContent:"center", color: et?.color || BRAND.lila, flexShrink:0, transition:"background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background=`${et?.color || BRAND.lila}25`} onMouseLeave={e => e.currentTarget.style.background=`${et?.color || BRAND.lila}15`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
                    </button>
                    <div>
                      <h3 style={{ margin:0, color: et?.color || BRAND.aubergine, fontSize:20, fontWeight:700, lineHeight:1.2 }}>{et?.label}</h3>
                      <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{fmtDateAT(selectedDate)}</div>
                      {(isAdmin ? adminTheme.showHolidaysAdmin : adminTheme.showHolidaysCustomer) && holidays[selectedDate] && <div style={{ display:"inline-block", background:BRAND.aubergine, color:"rgba(255,255,255,0.8)", fontSize:9, borderRadius:3, padding:"2px 6px", marginTop:2 }}>{holidays[selectedDate]}</div>}
                    </div>
                  </div>

                  {isGroup ? (
                    <>
                      {/* 1. Teilnehmer-Leiste (grün transparent) */}
                      <div style={{ background:`${BRAND.moosgruen}12`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:6, marginTop:8 }}>
                        <span style={{ fontSize:10, color:BRAND.moosgruen, textTransform:"uppercase", letterSpacing:1, fontWeight:600, flexShrink:0 }}>Teilnehmer *</span>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <button onClick={() => setFormData(f => ({ ...f, guests: String(Math.max(0, (Number(f.guests)||0) - 1)) }))}
                            style={{ width:30, height:30, border:`1px solid ${BRAND.moosgruen}`, background:"#fff", borderRadius:7, fontSize:16, color:BRAND.moosgruen, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                          <input type="number" min="0" value={formData.guests} onChange={e => setFormData(f=>({...f, guests:e.target.value}))}
                            style={{ width:52, textAlign:"center", padding:"6px 0", border:`1px solid ${formData.guests && guestsTooLow ? "#c44" : BRAND.moosgruen}`, borderRadius:7, fontSize:15, color:BRAND.aubergine, fontWeight:600, fontFamily:"inherit", background:"#fff" }} />
                          <button onClick={() => setFormData(f => ({ ...f, guests: String((Number(f.guests)||0) + 1) }))}
                            style={{ width:30, height:30, border:`1px solid ${BRAND.moosgruen}`, background:"#fff", borderRadius:7, fontSize:16, color:BRAND.moosgruen, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                        </div>
                      </div>
                      {formData.guests && guestsTooLow && (
                        <div style={{ fontSize:11, color:"#c44", marginTop:-2, marginBottom:6 }}>Mindestens {et?.minPersons || 10} Teilnehmer erforderlich</div>
                      )}

                      {/* 2. Zeit-Leiste (lila) */}
                      <div style={{ background:"#faf7fa", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                        <span style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Von</span>
                        <TimeInput value={String(Number(formData.tourHour)||0).padStart(2,"0")+":"+String(Number(formData.tourMin)||0).padStart(2,"0")} accentColor={BRAND.moosgruen} onChange={v => { const [nh,nm]=v.split(":").map(Number); setFormData(f=>({...f, tourHour:nh, tourMin:nm})); }} />
                        <span style={{ fontSize:10, color:"#999", textTransform:"uppercase", letterSpacing:1, fontWeight:600 }}>Bis</span>
                        <TimeInput value={String(Number(formData.tourEndHour)||0).padStart(2,"0")+":"+String(Number(formData.tourEndMin)||0).padStart(2,"0")} accentColor={BRAND.moosgruen} onChange={v => { const [nh,nm]=v.split(":").map(Number); setFormData(f=>({...f, tourEndHour:nh, tourEndMin:nm})); }} />
                      </div>

                      {/* 4. Gruppe & Kontakt-Karte */}
                      <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                        <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>Gruppe & Kontakt</div>
                        <input placeholder="Gruppenname *" value={formData.name} onChange={e => setFormData(f=>({...f, name:e.target.value}))}
                          style={reqStyle(missingName, false)} />
                        <input placeholder="Ansprechpartner *" value={formData.contactName||""} onChange={e => setFormData(f=>({...f, contactName:e.target.value}))}
                          style={reqStyle(!(formData.contactName||"").trim(), false)} />
                        <input placeholder="E-Mail *" type="email" value={formData.email} onChange={e => setFormData(f=>({...f, email:e.target.value}))}
                          style={reqStyle(missingEmail, invalidEmail)} />
                        {sa && invalidEmail && <div style={{ fontSize:11, color:"#c44", marginTop:-6, marginBottom:8 }}>Bitte gültige E-Mail-Adresse eingeben</div>}
                        <input placeholder="Telefon *" value={formData.phone} onChange={e => setFormData(f=>({...f, phone:e.target.value}))}
                          style={reqStyle(missingPhone, false)} />
                      </div>

                      {/* 5. Café im Paradiesglashaus */}
                      <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                        <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:12 }}>Café im Paradiesglashaus</div>

                        {/* Kaffee */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kaffee</div>
                            <div style={{ fontSize:11, color:"#999" }}>à € {(et?.coffeePrice || 3.10).toFixed(2).replace(".",",")}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <button onClick={() => setFormData(f => ({ ...f, coffeeCount: Math.max(0, (Number(f.coffeeCount)||0) - 1) }))}
                              style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                            <input type="number" min="0" value={formData.coffeeCount||""} onChange={e => setFormData(f=>({...f, coffeeCount:e.target.value}))}
                              placeholder="0" style={{ width:44, textAlign:"center", padding:"5px 0", border:"1px solid #e0d5df", borderRadius:6, fontSize:14, color:BRAND.aubergine, fontFamily:"inherit", background:"#fff" }} />
                            <button onClick={() => setFormData(f => ({ ...f, coffeeCount: (Number(f.coffeeCount)||0) + 1 }))}
                              style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                          </div>
                        </div>

                        {/* Kuchen */}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"#f8f4f8", borderRadius:10, marginBottom:6 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500 }}>Kuchen</div>
                            <div style={{ fontSize:11, color:"#999" }}>à € {(et?.cakePrice || 4.50).toFixed(2).replace(".",",")}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <button onClick={() => setFormData(f => ({ ...f, cakeCount: Math.max(0, (Number(f.cakeCount)||0) - 1) }))}
                              style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>−</button>
                            <input type="number" min="0" value={formData.cakeCount||""} onChange={e => setFormData(f=>({...f, cakeCount:e.target.value}))}
                              placeholder="0" style={{ width:44, textAlign:"center", padding:"5px 0", border:"1px solid #e0d5df", borderRadius:6, fontSize:14, color:BRAND.aubergine, fontFamily:"inherit", background:"#fff" }} />
                            <button onClick={() => setFormData(f => ({ ...f, cakeCount: (Number(f.cakeCount)||0) + 1 }))}
                              style={{ width:28, height:28, border:"1px solid #e0d5df", background:"#fff", borderRadius:6, fontSize:14, color:BRAND.lila, cursor:"pointer", fontFamily:"inherit", lineHeight:1, padding:0 }}>+</button>
                          </div>
                        </div>

                        {/* Führung-Toggle */}
                        <label onClick={() => setFormData(f=>({...f, tourGuide:!f.tourGuide}))}
                          style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:`${BRAND.moosgruen}12`, borderRadius:10, cursor:"pointer", marginBottom: nGuests > 0 ? 10 : 0 }}>
                          <div style={{ width:20, height:20, borderRadius:5, background: formData.tourGuide ? BRAND.moosgruen : "#fff", border: formData.tourGuide ? "none" : `1.5px solid ${BRAND.moosgruen}60`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s" }}>
                            {formData.tourGuide && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, color:BRAND.moosgruen, fontWeight:600 }}>Führung mit Gartenexpertin</div>
                            <div style={{ fontSize:11, color:BRAND.moosgruen, opacity:0.65, marginTop:1 }}>€ {et?.guideCost || 80} pro {et?.maxPerTour || 20} Teilnehmer</div>
                          </div>
                          <span style={{ fontSize:13, color:BRAND.moosgruen, fontWeight:600, fontVariantNumeric:"tabular-nums" }}>€ {et?.guideCost || 80}</span>
                        </label>

                        {/* Kostenauflistung */}
                        {nGuests > 0 && (
                          <div style={{ background:"#f8f4f8", borderRadius:10, padding:"10px 12px" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:2 }}>
                              <span>Eintritt ({nGuests}× à € {(et?.pricePerPerson || 9).toFixed(2).replace(".",",")})</span>
                              <span style={{ fontVariantNumeric:"tabular-nums" }}>€ {costEntry.toFixed(2).replace(".",",")}</span>
                            </div>
                            <div style={{ fontSize:10, color:BRAND.moosgruen, marginBottom:6, fontStyle:"italic" }}>mit Kärnten Card kostenlos</div>
                            {nCoffee > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}>
                              <span>Kaffee ({nCoffee}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {costCoffee.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {nCake > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:3 }}>
                              <span>Kuchen ({nCake}×)</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {costCake.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {formData.tourGuide && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#999", marginBottom:6 }}>
                              <span>Führung{nTours > 1 ? ` (${nTours}×)` : ""}</span><span style={{ fontVariantNumeric:"tabular-nums" }}>€ {costGuide.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {nTours > 1 && <div style={{ fontSize:10, color:BRAND.moosgruen, marginBottom:6, marginTop:-3, fontStyle:"italic" }}>
                              {nTours} Führungen nötig (max. {et?.maxPerTour || 20} pro Führung)
                            </div>}
                            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:BRAND.aubergine, fontWeight:600, paddingTop:6, borderTop:"1px solid #ebe4ea" }}>
                              <span>Geschätzt gesamt</span>
                              <span style={{ fontVariantNumeric:"tabular-nums", color:BRAND.lila }}>ca. € {costTotal.toFixed(2).replace(".",",")}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 6. Nachricht */}
                      <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
                        <div style={{ fontSize:11, color:BRAND.moosgruen, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>
                          Nachricht <span style={{ color:"#aaa", letterSpacing:0.5, textTransform:"none", fontWeight:400 }}>(optional)</span>
                        </div>
                        <textarea placeholder="Wünsche, Fragen, Details …" value={formData.message} onChange={e => setFormData(f=>({...f, message:e.target.value}))}
                          style={{ width:"100%", minHeight:52, padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, color:BRAND.aubergine, fontFamily:"inherit", resize:"none", boxSizing:"border-box", lineHeight:1.5 }} />
                      </div>

                      {/* 7. Dokumente */}
                      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                        <a href={DOCS.flyer} target="_blank" rel="noopener noreferrer" className="doc-green" style={{ flex:1, padding:"11px 12px", background:"transparent", border:`1px solid ${BRAND.moosgruen}40`, color:"#003b1b", fontSize:12, fontWeight:600, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", textDecoration:"none", transition:"all .15s" }}>
                          <svg width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M2 2.5a1 1 0 011-1h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-9zM8 1.5v3h3" stroke={BRAND.moosgruen} strokeWidth="1"/></svg>
                          Garten Flyer
                        </a>
                        <a href={DOCS.getraenke} target="_blank" rel="noopener noreferrer" className="doc-green" style={{ flex:1, padding:"11px 12px", background:"transparent", border:`1px solid ${BRAND.moosgruen}40`, color:"#003b1b", fontSize:12, fontWeight:600, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", textDecoration:"none", transition:"all .15s" }}>
                          <svg width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M2 2.5a1 1 0 011-1h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-9zM8 1.5v3h3" stroke={BRAND.moosgruen} strokeWidth="1"/></svg>
                          Getränkekarte
                        </a>
                      </div>

                      <button onClick={handleCustomerSubmit} style={{ ...primaryBtn, background:BRAND.moosgruen }}>Anfrage senden</button>
                    </>
                  ) : (
                    <>
                      {/* Slot-Kacheln */}
                      <div style={{ marginBottom:12 }}>
                        <div style={{ fontSize:10, color:"#999", letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:8, paddingLeft:2 }}>Zeitfenster wählen</div>
                        <div style={{ display:"flex", gap:8 }}>
                          {[["halfDayAM","Halbtags","bis 13 Uhr"],["halfDayPM","Halbtags","ab 13 Uhr"],["fullDay","Ganztags","08 – 22 Uhr"]].map(([v,l,sub]) => {
                            const isHalf = v.startsWith("halfDay");
                            const priceVal = isHalf ? et?.halfDay : et?.fullDay;
                            const defaults = { halfDayAM:[8,0,13,0], halfDayPM:[13,0,18,0], fullDay:[8,0,22,0] };
                            const isActive = formData.slot===v;
                            return (
                              <button key={v} onClick={() => { const d = defaults[v]; setFormData(f=>({...f, slot:v, tourHour:d[0], tourMin:d[1], tourEndHour:d[2], tourEndMin:d[3]})); }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background=(et?.color || BRAND.lila)+"10"; e.currentTarget.style.borderColor=(et?.color || BRAND.lila)+"40"; } }}
                                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background="#fff"; e.currentTarget.style.borderColor="#e8d8e4"; } }}
                                style={{ flex:1, padding:"12px 6px", border:`${isActive ? 2 : 1}px solid ${isActive ? et?.color || BRAND.lila : "#e8d8e4"}`, borderRadius:12,
                                  background: isActive ? (et?.color || BRAND.lila)+"15" : "#fff", cursor:"pointer", textAlign:"center", transition:"all .15s" }}>
                                <div style={{ fontWeight:500, fontSize:15, color: isActive ? (et?.color || BRAND.lila) : BRAND.aubergine, marginBottom:3 }}>{l}</div>
                                <div style={{ fontSize:10, color: isActive ? (et?.color || BRAND.lila) : "#999", opacity: isActive ? 0.75 : 1, marginBottom:4 }}>{sub}</div>
                                <div style={{ fontSize:11, color: isActive ? (et?.color || BRAND.lila) : "#999", opacity: isActive ? 0.75 : 1, fontVariantNumeric:"tabular-nums" }}>
                                  {priceVal === 0 ? "auf Anfrage" : fmt(priceVal)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {formData.type === "hochzeit" && et?.exclusiveNote && (
                          <div style={{ marginTop:10, padding:"10px 14px", background:`${BRAND.lila}08`, border:`1px solid ${BRAND.lila}20`, borderRadius:10, display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ fontSize:18, flexShrink:0 }}>💐</div>
                            <div style={{ fontSize:12, color:BRAND.aubergine, lineHeight:1.45 }}>
                              <strong style={{ color:BRAND.lila }}>Exklusiv für Sie:</strong> {et.exclusiveNote}
                            </div>
                          </div>
                        )}
                      </div>

                      {formData.type === "sonstiges" && (
                        <div style={{ marginBottom:12 }}>
                          <button onClick={() => { setFormData(f=>({...f, slot:"custom", tourHour:10, tourMin:0, tourEndHour:18, tourEndMin:0})); }}
                            style={{ width:"100%", padding:"10px", border:`${formData.slot==="custom" ? 2 : 1}px solid ${formData.slot==="custom" ? et?.color || BRAND.lila : "#e8d8e4"}`, borderRadius:12,
                              background: formData.slot==="custom" ? (et?.color || BRAND.lila)+"15" : "#fff", cursor:"pointer", textAlign:"center" }}>
                            <div style={{ fontWeight:500, fontSize:14, color: formData.slot==="custom" ? (et?.color || BRAND.lila) : BRAND.aubergine }}>Eigenes Zeitfenster</div>
                          </button>
                        </div>
                      )}

                      {/* Zeit-Leiste (lila) */}
                      <div style={{ background:"#faf7fa", borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                        {(() => {
                          const updateTime = (hField, mField) => (v) => {
                            const [nh,nm]=v.split(":").map(Number);
                            setFormData(f => {
                              const upd = {...f, [hField]:nh, [mField]:nm};
                              const sH = hField==="tourHour" ? nh : upd.tourHour;
                              const sM = hField==="tourMin" ? nm : upd.tourMin;
                              const eH = hField==="tourEndHour" ? nh : upd.tourEndHour;
                              const eM = hField==="tourEndMin" ? nm : upd.tourEndMin;
                              const startMins = sH*60+sM, endMins = eH*60+eM;
                              let slot = "custom";
                              if (endMins <= 13*60 && startMins < 13*60) slot = "halfDayAM";
                              else if (startMins >= 13*60) slot = "halfDayPM";
                              else if (startMins < 13*60 && endMins > 13*60) slot = "fullDay";
                              return {...upd, slot};
                            });
                          };
                          return (
                            <>
                              <span style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Von</span>
                              <TimeInput value={String(Number(formData.tourHour)||0).padStart(2,"0")+":"+String(Number(formData.tourMin)||0).padStart(2,"0")} accentColor={et?.color} onChange={updateTime("tourHour","tourMin")} />
                              <span style={{ fontSize:10, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Bis</span>
                              <TimeInput value={String(Number(formData.tourEndHour)||0).padStart(2,"0")+":"+String(Number(formData.tourEndMin)||0).padStart(2,"0")} accentColor={et?.color} onChange={updateTime("tourEndHour","tourEndMin")} />
                            </>
                          );
                        })()}
                      </div>

                      {/* Kontakt-Karte */}
                      <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
                        <div style={{ fontSize:11, color:et?.color || BRAND.lila, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:10 }}>Kontakt</div>
                        <input placeholder="Name *" value={formData.name} onChange={e => setFormData(f=>({...f, name:e.target.value}))} style={reqStyle(missingName, false)} />
                        <input placeholder="E-Mail *" type="email" value={formData.email} onChange={e => setFormData(f=>({...f, email:e.target.value}))} style={reqStyle(missingEmail, invalidEmail)} />
                        {sa && invalidEmail && <div style={{ fontSize:11, color:"#c44", marginTop:-6, marginBottom:8 }}>Bitte gültige E-Mail-Adresse eingeben</div>}
                        <div style={{ display:"flex", gap:6 }}>
                          <input placeholder="Telefon *" value={formData.phone} onChange={e => setFormData(f=>({...f, phone:e.target.value}))} style={{ ...reqStyle(missingPhone, false), flex:1, marginBottom:0 }} />
                          <input placeholder="Gäste *" type="number" value={formData.guests} onChange={e => setFormData(f=>({...f, guests:e.target.value}))} style={{ ...reqStyle(!formData.guests, false), width:110, marginBottom:0, textAlign:"center" }} />
                        </div>
                      </div>

                      {/* Nachricht-Karte */}
                      <div style={{ background:"#fff", border:"1px solid #f0e8ee", borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
                        <div style={{ fontSize:11, color:et?.color || BRAND.lila, letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>
                          Nachricht <span style={{ color:"#aaa", letterSpacing:0.5, textTransform:"none", fontWeight:400 }}>(optional)</span>
                        </div>
                        <textarea placeholder="Wünsche, Fragen, Details …" value={formData.message} onChange={e => setFormData(f=>({...f, message:e.target.value}))}
                          style={{ width:"100%", minHeight:56, padding:"10px 12px", border:"1px solid #e8d8e4", borderRadius:8, fontSize:13, color:BRAND.aubergine, fontFamily:"inherit", resize:"none", boxSizing:"border-box", lineHeight:1.5 }} />
                      </div>

                      {/* Dokumente */}
                      {formData.type !== "sonstiges" && (
                        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                          <a href={DOCS.getraenke} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"11px 12px", background:"transparent", border:`1px solid ${(et?.color || BRAND.lila)}40`, color:et?.color || BRAND.lila, fontSize:12, fontWeight:600, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", textDecoration:"none", transition:"all .15s" }}>
                            <svg width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M2 2.5a1 1 0 011-1h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-9zM8 1.5v3h3" stroke={et?.color || BRAND.lila} strokeWidth="1"/></svg>
                            Getränke- &amp; Kuchenkarte
                          </a>
                          <a href={DOCS.weinkarte} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:"11px 12px", background:"transparent", border:`1px solid ${(et?.color || BRAND.lila)}40`, color:et?.color || BRAND.lila, fontSize:12, fontWeight:600, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:"inherit", textDecoration:"none", transition:"all .15s" }}>
                            <svg width="12" height="13" viewBox="0 0 12 13" fill="none"><path d="M2 2.5a1 1 0 011-1h5l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1v-9zM8 1.5v3h3" stroke={et?.color || BRAND.lila} strokeWidth="1"/></svg>
                            Weinkarte
                          </a>
                        </div>
                      )}
                      <button onClick={handleCustomerSubmit} style={primaryBtn}>Anfrage senden</button>
                    </>
                  )}
                  </div>
                </>
              );
            })()}

            {/* Info View */}
            {modalView === "info" && events[selectedDate] && (() => {
              const ev = events[selectedDate];
              const et = eventTypes.find(e => e.id === ev.type);
              const hasMultiple = isAdmin && ev.subEvents && ev.subEvents.length > 0;
              const allRequests = isAdmin ? [{ ...ev, _isMain: true, _subIndex: -1 }, ...(ev.subEvents || []).map((s, i) => ({ ...s, _isMain: false, _subIndex: i }))].filter(s => s.status !== "deleted") : [];
              return (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:22, fontWeight:700 }}>{fmtDateAT(selectedDate)}</h3>
                  </div>
                  {(isAdmin ? adminTheme.showHolidaysAdmin : adminTheme.showHolidaysCustomer) && holidays[selectedDate] && <div style={{ fontSize:13, color: BRAND.moosgruen, marginBottom:8, fontWeight:500 }}>📅 {holidays[selectedDate]}</div>}

                  {isAdmin ? (
                    <div style={{ marginBottom:10 }}>
                      {allRequests.map((sub, idx) => {
                        const subColor = (sub.status === "blocked" || sub.isSeries) ? "#009a93" : sub.status === "pending" ? BRAND.aprikot : BRAND.aubergine;
                        const subIsPending = sub.status === "pending";
                        const subIndex = sub._subIndex;
                        const subEt = eventTypes.find(e => e.id === sub.type);
                        const editSub = () => {
                          const src = sub._isMain ? ev : sub;
                          setEditingSubIndex(sub._isMain ? -1 : subIndex);
                          setAdminForm({ type: src.status || "booked", label: src.label || "", note: src.note || "", startTime: src.startTime || "08:00", endTime: src.endTime || "22:00", adminNote: src.adminNote || "", eventType: src.type || "", allDay: src.allDay || false, checklist: src.checklist || [], contactName: src.contactName || "", contactPhone: src.contactPhone || "", contactEmail: src.contactEmail || "", contactAddress: src.contactAddress || "", publicText: src.publicText || "", isPublic: src.isPublic || false, isSeries: false, seriesDates: [], guests: src.guests || "", tourGuide: src.tourGuide || false, cakeCount: src.cakeCount || 0, coffeeCount: src.coffeeCount || 0, groupName: src.groupName || src.name || "", customerEmail: src.email || "", customerPhone: src.phone || "", customerMessage: src.message || "", price: src.price || "", paymentStatus: src.paymentStatus || "open", partialAmount: src.partialAmount || "", cleaningFee: !!src.cleaningFee });
                          setEditingTime(null); setSeriesMonth(null); setSeriesYear(null); setModalView("admin");
                        };
                        return (
                          <div key={idx} style={{ background:"#f9f7fa", borderRadius:8, padding:"12px 14px", marginBottom:8, borderLeft:`3px solid ${subColor}`, position:"relative" }}>
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                              <div>
                                <span style={{ fontSize:12, fontWeight:700, color:subColor, textTransform:"uppercase", letterSpacing:0.5 }}>{sub.isSeries ? "Serie" : sub.status === "booked" ? "Gebucht" : sub.status === "blocked" ? "Intern" : sub.status === "pending" ? "Anfrage" : ""}</span>
                                {sub.label && <span style={{ fontSize:14, color:BRAND.aubergine, fontWeight:500, marginLeft:8 }}>{sub.label}</span>}
                              </div>
                            </div>
                            <div style={{ fontSize:12, color:"#888" }}><ClockIcon color="#bbb" />{sub.slotLabel || `${sub.startTime} – ${sub.endTime}`}{sub.allDay ? " · Ganztägig" : ""}</div>
                            {sub.name && <div style={{ fontSize:13, color:BRAND.aubergine, marginTop:4, fontWeight:500 }}>👤 {sub.name}</div>}
                            {sub.email && <div style={{ fontSize:12, color:"#888", marginTop:1 }}>✉ <a href={`mailto:${sub.email}`} style={{ color:BRAND.lila, textDecoration:"none" }}>{sub.email}</a></div>}
                            {sub.phone && <div style={{ fontSize:12, color:"#888", marginTop:1 }}>📞 <a href={`tel:${sub.phone.replace(/\s/g,"")}`} style={{ color:BRAND.lila, textDecoration:"none" }}>{sub.phone}</a></div>}
                            {sub.guests && <div style={{ fontSize:12, color:"#888", marginTop:2 }}>👥 {sub.guests} {sub.type === "gruppenfuehrung" ? "Teilnehmer" : "Gäste"}</div>}
                            {sub.tourGuide && <div style={{ fontSize:12, color:BRAND.moosgruen, marginTop:2, fontWeight:600 }}>🌿 Mit Führung</div>}
                            {sub.adminNote && <div style={{ fontSize:12, color:"#999", marginTop:5, fontStyle:"italic", lineHeight:1.4 }}>📝 {sub.adminNote}</div>}
                            {sub.price && sub.type !== "gruppenfuehrung" && (() => {
                              const priceNum = parseFloat(String(sub.price || "").replace(/\./g, "").replace(",", ".")) || 0;
                              const partialNum = parseFloat(String(sub.partialAmount || "").replace(/\./g, "").replace(",", ".")) || 0;
                              const feeAmount = sub.cleaningFee ? 150 : 0;
                              const fmtMoney = (n) => n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                              const ps = sub.paymentStatus || "open";
                              const statusLabel = { open: "offen", partial: "angezahlt", paid: "bezahlt" }[ps];
                              const statusColor = { open: "#999", partial: "#8a6a00", paid: BRAND.moosgruen }[ps];
                              const restOffen = Math.max(0, priceNum - partialNum + feeAmount);
                              return (
                                <div style={{ fontSize:12, color:"#888", marginTop:5, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                                  <span style={{ color:BRAND.lila, fontWeight:700 }}>€ {fmtMoney(priceNum + feeAmount)}</span>
                                  {sub.cleaningFee && <span style={{ fontSize:10, color:"#999" }}>inkl. Pauschale</span>}
                                  <span style={{ fontSize:10, color:statusColor, fontWeight:700, background:statusColor+"18", padding:"2px 7px", borderRadius:4, textTransform:"uppercase", letterSpacing:0.4 }}>{statusLabel}</span>
                                  {ps === "partial" && partialNum > 0 && (
                                    <span style={{ color:"#999" }}>· offen: <span style={{ color:BRAND.lila, fontWeight:600 }}>€ {fmtMoney(restOffen)}</span></span>
                                  )}
                                </div>
                              );
                            })()}
                            {sub.message && <div style={{ fontSize:12, color:"#888", marginTop:5, fontStyle:"italic", lineHeight:1.4 }}>„{sub.message}"</div>}
                            {sub.checklist && sub.checklist.length > 0 && (
                              <div style={{ marginTop:6, fontSize:12, color:"#888" }}>
                                {sub.checklist.map((c,ci) => (
                                  <div key={ci} style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                                    <span style={{ color: c.done ? BRAND.moosgruen : "#ccc" }}>{c.done ? "☑" : "☐"}</span>
                                    <span style={{ textDecoration: c.done ? "line-through" : "none", opacity: c.done ? 0.6 : 1 }}>{c.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Actions per card */}
                            <div style={{ display:"flex", gap:8, marginTop:10 }}>
                              {subIsPending ? (
                                <>
                                  <button onClick={() => handleAdminAction(selectedDate,"confirm",subIndex)}
                                    style={{ flex:1, padding:"9px 0", background:BRAND.moosgruen, color:"#fff", border:"none", borderRadius:6, fontSize:13, fontWeight:700, cursor:"pointer", textTransform:"uppercase", letterSpacing:0.5 }}>Annehmen</button>
                                  <button onClick={() => handleAdminAction(selectedDate,"delete",subIndex)}
                                    style={{ flex:1, padding:"9px 0", background:"#f5f0f4", color:BRAND.aubergine, border:"1px solid #e0d8de", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>Ablehnen</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={editSub}
                                    style={{ flex:1, padding:"9px 0", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>Bearbeiten</button>
                                  <button onClick={() => handleAdminAction(selectedDate,"delete",subIndex)}
                                    onMouseEnter={e => { e.target.style.background="#f8d0d0"; e.target.style.color="#c44"; }}
                                    onMouseLeave={e => { e.target.style.background="#f5f0f4"; e.target.style.color=BRAND.aubergine; }}
                                    style={{ flex:1, padding:"9px 0", background:"#f5f0f4", color:BRAND.aubergine, border:"1px solid #e0d8de", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>Löschen</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding:"16px 0" }}>
                      {ev.isPublic ? (
                        <>
                          {ev.label && <div style={{ fontSize:16, fontWeight:700, color:BRAND.aubergine, marginBottom:6 }}>{ev.label}</div>}
                          {ev.slotLabel && <div style={{ fontSize:13, color:"#666", marginBottom:6 }}><ClockIcon color="#666" />{ev.slotLabel}</div>}
                          {ev.publicText && <div style={{ fontSize:13, color:"#555", lineHeight:1.5, marginBottom:10 }}>{ev.publicText}</div>}
                          {ev.note && <div style={{ fontSize:13, color:"#888", marginBottom:10, fontStyle:"italic" }}>{ev.note}</div>}
                          {(ev.contactName || ev.contactPhone || ev.contactAddress) && (
                            <div style={{ background:"#f9f7fa", borderRadius:10, padding:"12px 14px", marginBottom:10, border:"1px solid #ede8ed" }}>
                              <div style={{ fontSize:9, color:"#bbb", fontWeight:600, textTransform:"uppercase", letterSpacing:1.5, marginBottom:6 }}>Kontakt & Ort</div>
                              {ev.contactName && <div style={{ fontSize:13, color:BRAND.aubergine, fontWeight:500, marginBottom:2 }}>👤 {ev.contactName}</div>}
                              {ev.contactPhone && <div style={{ fontSize:13, marginBottom:2 }}>{ev.contactPhone.includes("@") ? "✉" : "📞"} <a href={ev.contactPhone.includes("@") ? `mailto:${ev.contactPhone}` : `tel:${ev.contactPhone.replace(/\s/g,"")}`} style={{ color:BRAND.lila, textDecoration:"none" }}>{ev.contactPhone}</a></div>}
                              {ev.contactAddress && <div style={{ fontSize:13 }}>📍 <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.contactAddress)}`} target="_blank" rel="noopener noreferrer" style={{ color:BRAND.lila, textDecoration:"none" }}>{ev.contactAddress}</a></div>}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ fontSize:14, color: BRAND.aubergine, fontWeight:600, marginBottom:4 }}>Dieser Termin ist bereits vergeben.</div>
                          {ev.note && <div style={{ fontSize:13, color:"#888", marginTop:4 }}>{ev.note}</div>}
                          <div style={{ fontSize:13, color:"#999", marginTop:8, marginBottom:12 }}>Wählen Sie ein anderes freies Datum oder kontaktieren Sie uns direkt:</div>
                        </>
                      )}
                      <div style={{ display:"flex", gap:8 }}>
                        <a href="tel:+4346349119" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", background:"#f9f6f8", borderRadius:8, textDecoration:"none", color: BRAND.aubergine, fontSize:12, fontWeight:600 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke={BRAND.aubergine} strokeWidth="1.5" strokeLinecap="round"/></svg>
                          Anrufen
                        </a>
                        <a href="mailto:info@mattuschka.at" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", background:"#f9f6f8", borderRadius:8, textDecoration:"none", color: BRAND.aubergine, fontSize:12, fontWeight:600 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke={BRAND.aubergine} strokeWidth="1.5"/><path d="M22 7l-10 7L2 7" stroke={BRAND.aubergine} strokeWidth="1.5" strokeLinecap="round"/></svg>
                          E-Mail
                        </a>
                        <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", background:"#f9f6f8", borderRadius:8, textDecoration:"none", color: BRAND.aubergine, fontSize:12, fontWeight:600 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={BRAND.aubergine} strokeWidth="1.5"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" stroke={BRAND.aubergine} strokeWidth="1.5"/></svg>
                          Website
                        </a>
                      </div>
                    </div>
                  )}

                  {isAdmin && fromCalendar && !ev.allDay && (
                    <button onClick={() => {
                      setAdminForm({ type:"booked", label:"", note:"", startTime: ev.endTime || "13:00", endTime:"22:00", adminNote:"", eventType:"", allDay:false, checklist:[], contactName:"", contactPhone:"", contactAddress:"", publicText:"", isPublic:false, isSeries:false, seriesDates:[], seriesId:"", editAllSeries:false, addToExisting:true, guests:"", tourGuide:false, cakeCount:0, coffeeCount:0, groupName:"", customerEmail:"", customerPhone:"", price:"", paymentStatus:"open", partialAmount:"", cleaningFee:false });
                      setEditingTime(null); setSeriesMonth(null); setSeriesYear(null); setModalView("admin");
                    }}
                      style={{ width:"100%", padding:"13px 0", background:`${BRAND.moosgruen}10`, color: BRAND.moosgruen, border:`1.5px solid ${BRAND.moosgruen}30`, borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background=`${BRAND.moosgruen}20`; }} onMouseLeave={e => { e.currentTarget.style.background=`${BRAND.moosgruen}10`; }}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={BRAND.moosgruen} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      Zusätzliche Buchung hinzufügen
                    </button>
                  )}
                </>
              );
            })()}

            {/* Contact View */}
            {modalView === "contact" && (
              <>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ fontSize:20, fontWeight:700, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Paradiesgarten Mattuschka</div>
                  <div style={{ fontSize:13, color:"#999" }}>Ihre Veranstaltungslocation in Klagenfurt</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <a href="tel:+4346349119" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9f6f8", borderRadius:10, textDecoration:"none", color: BRAND.aubergine, transition:"all .15s" }}>
                    <span style={{ fontSize:20 }}>📞</span>
                    <div>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Telefon</div>
                      <div style={{ fontSize:15, fontWeight:600 }}>+43 463 49 119</div>
                    </div>
                  </a>
                  <a href="mailto:info@mattuschka.at" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9f6f8", borderRadius:10, textDecoration:"none", color: BRAND.aubergine, transition:"all .15s" }}>
                    <span style={{ fontSize:20 }}>✉️</span>
                    <div>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>E-Mail</div>
                      <div style={{ fontSize:15, fontWeight:600 }}>info@mattuschka.at</div>
                    </div>
                  </a>
                  <a href="https://maps.google.com/?q=Emmersdorfer+Straße+86+9061+Klagenfurt" target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9f6f8", borderRadius:10, textDecoration:"none", color: BRAND.aubergine, transition:"all .15s" }}>
                    <span style={{ fontSize:20 }}>📍</span>
                    <div>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Adresse</div>
                      <div style={{ fontSize:15, fontWeight:600 }}>Emmersdorfer Straße 86</div>
                      <div style={{ fontSize:13, color:"#888" }}>9061 Klagenfurt am Wörthersee</div>
                    </div>
                  </a>
                  <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"#f9f6f8", borderRadius:10, textDecoration:"none", color: BRAND.aubergine, transition:"all .15s" }}>
                    <span style={{ fontSize:20 }}>🌐</span>
                    <div>
                      <div style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Website</div>
                      <div style={{ fontSize:15, fontWeight:600 }}>www.derparadiesgarten.at</div>
                    </div>
                  </a>
                </div>
              </>
            )}

            <button onClick={() => { setModalView(null); setEditingType(null); setSubmitAttempted(false); }}
              onMouseEnter={e => { e.target.style.color="#c44"; e.target.style.background="#fdf6f6"; }}
              onMouseLeave={e => { e.target.style.color="#aaa"; e.target.style.background="transparent"; }}
              style={{ width:"100%", padding:12, border:"none", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:15, marginTop:10, borderRadius:8, transition:"all .15s" }}>
              {modalView === "form" ? "Abbrechen" : "Schließen"}
            </button>
          </div>
        </div>
      )}



      <style>{`
        html, body { overscroll-behavior: none; -webkit-overflow-scrolling: touch; }
        html { overflow-x: hidden; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        input, textarea, select, button { font-size: 16px; }
        @keyframes fadeIn { from { opacity:0; transform:translateX(-50%) translateY(-10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        @keyframes toastProgress { from { width:100% } to { width:0% } }
        @keyframes pendingPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(242,140,90,0.3) } 50% { box-shadow: 0 0 8px 2px rgba(242,140,90,0.25) } }
        @keyframes successFadeUp { from { opacity:0; transform:translateY(24px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes successScaleIn { from { transform:scale(0) } to { transform:scale(1) } }
        @keyframes successCheck { from { stroke-dashoffset:30 } to { stroke-dashoffset:0 } }
        @keyframes successRing { 0% { transform:scale(0.85); opacity:0.5 } 100% { transform:scale(1.3); opacity:0 } }
        @keyframes successSlide { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
        @keyframes successLeaf1 { 0%{transform:translate(0,0) rotate(0);opacity:0} 8%{opacity:.55} 85%{opacity:.3} 100%{transform:translate(-50px,220px) rotate(160deg);opacity:0} }
        @keyframes successLeaf2 { 0%{transform:translate(0,0) rotate(0);opacity:0} 8%{opacity:.5} 85%{opacity:.25} 100%{transform:translate(45px,240px) rotate(-130deg);opacity:0} }
        @keyframes successLeaf3 { 0%{transform:translate(0,0) rotate(20deg);opacity:0} 8%{opacity:.4} 85%{opacity:.2} 100%{transform:translate(-25px,200px) rotate(110deg);opacity:0} }
        @keyframes successLeaf4 { 0%{transform:translate(0,0) rotate(-10deg);opacity:0} 10%{opacity:.45} 80%{opacity:.15} 100%{transform:translate(35px,190px) rotate(140deg);opacity:0} }
        @keyframes successBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes successBgZoom { from{transform:scale(1)} to{transform:scale(1.08)} }
        input[type="time"] { -webkit-appearance: none; }
        input[type="time"]:focus { border-color: ${BRAND.aubergine}60 !important; box-shadow: 0 0 0 2px ${BRAND.aubergine}15 !important; }
        input[type="time"]::-webkit-datetime-edit { padding: 0; }
        input:focus, textarea:focus { border-color: ${BRAND.aubergine}60 !important; box-shadow: 0 0 0 2px ${BRAND.aubergine}10 !important; }
        .admin-card { transition: all .15s ease; }
        .doc-green, .doc-violet { transition: all .15s ease; }
        @media (hover: hover) and (pointer: fine) {
          button:not(.day-booked):hover { filter: brightness(0.97) }
          .day-booked, .day-booked:hover { filter: none !important; transform: none !important; }
          .hero-arrow-zone:hover .hero-arrow-btn { opacity: 1 !important; }
          .hero-arrow-zone:hover .hero-arrow-btn:hover { background: rgba(255,255,255,0.3) !important; }
          .hero-dots-zone:hover .hero-dots-inner { opacity: 1 !important; }
          .success-link:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.25) !important; transform: translateY(-1px); }
          .success-close:hover { background: rgba(255,255,255,0.22) !important; border-color: rgba(255,255,255,0.35) !important; transform: translateY(-1px); }
          .evt-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.10) !important; border-left-width: 4px !important; background: color-mix(in srgb, var(--card-color) 6%, #fff) !important; }
          .day-free:hover { background: rgba(0,154,147,0.08) !important; border-color: rgba(0,154,147,0.3) !important; }
          .day-hasevent:hover { filter: none !important; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.08) !important; }
          .admin-card:hover { background: #faf6fa !important; border-left-color: ${BRAND.lila} !important; box-shadow: 0 2px 8px rgba(88,8,74,0.08) !important; }
          .doc-green:hover { background: ${BRAND.moosgruen}12 !important; border-color: ${BRAND.moosgruen}80 !important; }
          .doc-violet:hover { background: ${BRAND.lila}12 !important; border-color: ${BRAND.lila}80 !important; }
        }
      `}</style>
    </div>
  );
}

const navBtn = { width:44, height:44, borderRadius:"50%", border:`2px solid ${BRAND.aubergine}20`, background:"#fff", color:BRAND.aubergine, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, padding:0, textAlign:"center" };
const inputStyle = { width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:16, marginBottom:10, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color: BRAND.aubergine };
const primaryBtn = { width:"100%", padding:"14px 0", background: BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:16, fontWeight:600, cursor:"pointer", letterSpacing:1 };
const smallBtn = { width:32, height:32, borderRadius:8, border:"none", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };
