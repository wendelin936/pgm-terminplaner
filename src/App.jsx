import React, { useState, useEffect, useCallback, useRef } from "react";
import { loadData, saveData, adminLogin, adminLogout, onAuthChange } from "./firebase.js";

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


// Dokumente — Pfade anpassen für Deployment (z.B. "/assets/Getraenke.pdf")
const DOCS = {
  getraenke: "/assets/Getraenke_Kuchenkarte.pdf",
  weinkarte: "/assets/Weinkarte.pdf",
  flyer: "/assets/Paradiesgarten_Flyer.pdf",
};

const PGM_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAABgBAMAAACJTrO+AAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAHlBMVEX////z8/P8/Pz6+vr+/v7w8PD5+fn9/f34+Pj19fWmxctuAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAHdElNRQfqBAwLFxow6RkxAAADuElEQVRYw62YO2/bMBCAST8SZmNToc2YACrQ0QHczpHE2OomNB06enD3BsgPUAEN6ZbBP7i845t60UAJRHYofrw73oOkCflvjZ85fsHPJLb8y1njl4J/PWf8eiv48RydroUEHtPH0xcAqnQgExLoRJs6ngkFFKlAp4F9kzb+QmhAbFKX1AB1EvARx4sGFGtTLTZAkWqxbNr02fHvhQFO8Hye9bEIgVkRnQMy/KgTFbLA9EJdiT5Q8SSFHCC+TWYBtLsPLz4wrpR2WdkQ2vlAOaIUVTGEEbfwgbGV0gbs4PtKlB4g7qdWFDVelTc+MGTGVSA+q1Et23Z94BjMlRV+lMDKjayosa97kA9Rvf7NR5QySSDe5MwAwHsY1I0oZfohYf7IvxyWHiK1G1ZqaXrlkCVAguiHFyye+9a5E0BzUB8VqELAi6nvumvPoehJgGIu17oGevbpljs1GYYGBSmkiIAitkCrINeGHaD/IQKsFUbPjWIlcIGvNjHwGPpgBxbrlcIXbQxUrrZrX2Za8AW+4DGg3b21QaFkgdBgp4jMZo7uDPDOAqsAKKHr0gp4soryEQB16oxXYGPT8ToKPFivFVbdMIEjoLZpwq0txQzAzKhuELjs2bDUUfcUuVO3RSyA/IAvn5SPrV2ENkNAyWmLpsqVPNneW3QOD3ZUq5BMXVD94HIa/gFbh4BaDtsAsHNFxsRLxuPqgCV2K+VjAjzFedVxHX3MnykTKKE2PvayRD1bHyjQZQcCZ5ZTnFZUmAyygNyI1E6f1b5YFayyh+scZU4hdcYh2ZtvsY7ghZLz6Gp0oTy1h8L4XvTSMEPgylVkqVBmCmZgsQ7WDgHmgFaLKqKd0wA5AgsL2NjEoi56aUuVN1YGqBrj8ZaQ0GQFMAXYXaW1sdmvCyh0qZNXA8/20FUHpV6132oOALYSWOO6MT+SaQhsbIElWOCFvw/xYDt0Zm3xg6IGoNAy3LZ61ZAKDzAVd6AYW6lMAQyB1puRR1u03eV8wJuwHqwMjapFHnD014P01qlVBeFgAZuNZTNY02s1JQJhbBbDRz151IHnZ0gYCPXT0D4dRuyrDhHWD7L+UcOPqagzPMdls0AxdoIeAXoHxesZYDN5xu0Du+lTtMoLNn1IjKqNzBUWVYYZpW59mcNHY3ocA+7Hbif5MFDPXrAioCUphAPupq4oN31g5hJ0EwP7uWvWzwj4ReYaM8FDB4J0mHhxQNp1F+82CFScpBEdVAEq9i1JbOsOJSSPh9iVEs4ZP/7jzz+7xEeN3Xr2xgAAAB50RVh0aWNjOmNvcHlyaWdodABHb29nbGUgSW5jLiAyMDE2rAszOAAAABR0RVh0aWNjOmRlc2NyaXB0aW9uAHNSR0K6kHMHAAAAAElFTkSuQmCC";

const DEFAULT_TYPES = [
  { id:"hochzeit", label:"Hochzeit", halfDay:1500, fullDay:2500, color:BRAND.lila, desc:"Ihre Traumhochzeit in paradiesischer Kulisse" },
  { id:"firmenfeier", label:"Firmenfeier", halfDay:700, fullDay:1200, color:BRAND.tuerkis, desc:"Professionelles Ambiente für Ihr Firmenevent" },
  { id:"geburtstag", label:"Geburtstagsfeier", halfDay:500, fullDay:800, color:BRAND.aprikot, desc:"Feiern Sie Ihren besonderen Tag bei uns" },
  { id:"seminar", label:"Seminar / Workshop", halfDay:350, fullDay:600, color:BRAND.mintgruen, desc:"Inspirierende Räumlichkeiten für Ihre Veranstaltung" },
  { id:"gruppenfuehrung", label:"Gruppenführung", halfDay:0, fullDay:0, color:BRAND.moosgruen, desc:"Garten erleben mit allen Sinnen – inkl. Café im Paradiesglashaus", isGroupTour:true, pricePerPerson:9, minPersons:10, guideCost:80, maxPerTour:20 },
  { id:"sonstiges", label:"Sonstiges", halfDay:0, fullDay:0, color:BRAND.aubergine, desc:"Individuelle Veranstaltungen nach Ihren Wünschen" },
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
  const colors = { booked: BRAND.lila, blocked: BRAND.moosgruen, pending: BRAND.aprikot };
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background: colors[status] || "transparent", marginRight: 4 }} />;
}

function ClockIcon({ size=12, color="#999" }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ display:"inline-block", verticalAlign:"-2px", marginRight:3 }}><circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5"/><path d="M8 4.5V8l2.5 1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
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
        <div style={{ position:"absolute", inset:0, background:"#f0ecf0", display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 16px" }}>
          <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="#c44" strokeWidth="2" strokeLinecap="round"/></svg>
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

function ChecklistNote({ items=[], onChange, editable=true }) {
  if (!items || !items.length) return null;
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0" }}>
          <div onClick={editable ? () => { const u=[...items]; u[i]={...u[i],done:!u[i].done}; onChange(u); } : undefined}
            style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${item.done ? BRAND.lila : "#ccc"}`, background: item.done ? BRAND.lila : "#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor: editable ? "pointer" : "default" }}>
            {item.done && <svg width="10" height="10" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </div>
          <span style={{ fontSize:12, color: item.done ? "#aaa" : "#555", textDecoration: item.done ? "line-through" : "none", flex:1 }}>{item.text}</span>
          {editable && <button onClick={() => { const u=items.filter((_,j)=>j!==i); onChange(u); }}
            style={{ background:"none", border:"none", color:"#ccc", fontSize:14, cursor:"pointer", padding:"0 4px", flexShrink:0 }}>✕</button>}
        </div>
      ))}
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
  const [modalView, setModalView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name:"", email:"", phone:"", type:"hochzeit", slot:"halfDayAM", guests:"", message:"", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:10, tourMin:0, tourEndHour:18, tourEndMin:0 });
  const [adminForm, setAdminForm] = useState({ type:"booked", label:"", note:"", startTime:"08:00", endTime:"22:00", adminNote:"", allDay:false, checklist:[] });
  const [toast, setToast] = useState(null);
  const [toastKey, setToastKey] = useState(0);
  const toastTimer = useRef(null);
  const prevEvents = useRef(null);

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
  const [successModal, setSuccessModal] = useState(false);
  const [winW, setWinW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize",h); return () => window.removeEventListener("resize",h); }, []);

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

  const SEED_EVENTS = {
    "2026-04-12": { status:"booked", label:"Geburtstagsfeier", type:"geburtstag", slot:"custom", startTime:"14:00", endTime:"18:00", slotLabel:"14:00 – 18:00", name:"Frieda", adminNote:"Frieda wird 50!", checklist:[{text:"Deko mitbringen",done:false},{text:"Torte bestellen",done:false},{text:"Einladungen verschickt",done:true}] },
    "2026-04-25": { status:"booked", label:"Seminar / Workshop", type:"seminar", slot:"fullDay", startTime:"08:00", endTime:"22:00", slotLabel:"Ganztags (08:00–22:00)", name:"", adminNote:"Workshop ganztägig" },
    "2026-05-02": { status:"booked", label:"Hochzeit", type:"hochzeit", slot:"fullDay", startTime:"10:00", endTime:"22:00", slotLabel:"10:00 – 22:00", name:"Klara & Stefan Winkler", adminNote:"Trauung 14:00, 120 Gäste, Catering extern", guests:"120" },
    "2026-05-16": { status:"booked", label:"Firmenfeier", type:"firmenfeier", slot:"halfDayPM", startTime:"14:00", endTime:"20:00", slotLabel:"14:00 – 20:00", name:"Infineon Klagenfurt", adminNote:"Sommerfeier Team Automotive, DJ ab 18 Uhr", guests:"60" },
    "2026-06-06": { status:"booked", label:"Gruppenführung", type:"gruppenfuehrung", slot:"custom", startTime:"10:00", endTime:"12:30", slotLabel:"10:00 – 12:30", name:"Volksschule St. Ruprecht", adminNote:"2 Klassen, ca. 45 Kinder + Begleitung", guests:"50", tourGuide:true },
    "2026-04-18": { status:"pending", label:"Hochzeit", type:"hochzeit", slot:"fullDay", startTime:"08:00", endTime:"22:00", slotLabel:"Ganztags (08:00–22:00)", name:"Maria Huber", email:"maria@example.at", phone:"+43 660 1234567", guests:"80", message:"Wir würden gerne die Terrasse nutzen. Gibt es einen DJ-Anschluss?" },
    "2026-05-09": { status:"pending", label:"Firmenfeier", type:"firmenfeier", slot:"halfDayPM", startTime:"13:00", endTime:"18:00", slotLabel:"Halbtags Nachmittag (13:00–18:00)", name:"Thomas Berger", email:"t.berger@firma.at", phone:"+43 664 9876543", guests:"35", message:"Sommerfest für unser Team, vegetarisches Catering gewünscht." },
    "2026-05-23": { status:"pending", label:"Geburtstagsfeier", type:"geburtstag", slot:"custom", startTime:"16:00", endTime:"22:00", slotLabel:"16:00 – 22:00", name:"Lisa Moser", email:"lisa.moser@gmx.at", phone:"+43 650 3344556", guests:"25", message:"Gartenparty zum 30er, eigene Musik, brauchen wir eine Genehmigung?" },
    "2026-06-13": { status:"pending", label:"Seminar / Workshop", type:"seminar", slot:"halfDayAM", startTime:"08:00", endTime:"13:00", slotLabel:"Halbtags Vormittag (08:00–13:00)", name:"Dr. Eva Kern", email:"eva.kern@uni-klu.at", phone:"+43 463 2700100", guests:"18", message:"Botanik-Workshop für Studierende, Beamer benötigt." },
  };
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [editingType, setEditingType] = useState(null);
  const [editingTime, setEditingTime] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [showPrices, setShowPrices] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (modalView || editingType || loginModal) { document.body.style.overflow = "hidden"; document.body.style.touchAction = "none"; }
    else { document.body.style.overflow = ""; document.body.style.touchAction = ""; }
    return () => { document.body.style.overflow = ""; document.body.style.touchAction = ""; };
  }, [modalView, editingType, loginModal]);

  useEffect(() => { const unsub = onAuthChange(user => { setLoggedIn(!!user); if (user) setIsAdmin(true); }); return unsub; }, []);
  useEffect(() => { (async () => { try { const evData = await loadData("events"); if (evData) { setEvents(JSON.parse(evData)); } else { setEvents(SEED_EVENTS); try { await saveData("events", JSON.stringify(SEED_EVENTS)); } catch {} } } catch { setEvents(SEED_EVENTS); } try { const tyData = await loadData("types"); if (tyData) { const saved = JSON.parse(tyData); setEventTypes(DEFAULT_TYPES.map(d => { const s = saved.find(x => x.id === d.id); return s ? { ...d, ...s } : d; })); } } catch {} setLoading(false); })(); }, []);
  const saveEvents = useCallback(async (updated) => { setEvents(updated); try { await saveData("events", JSON.stringify(updated)); } catch {} }, []);
  const saveTypes = useCallback(async (updated) => { setEventTypes(updated); try { await saveData("types", JSON.stringify(updated)); } catch {} }, []);
  const handleLogin = async () => { setLoginError(""); try { await adminLogin(loginEmail, loginPw); setLoginModal(false); setLoginEmail(""); setLoginPw(""); } catch (e) { setLoginError(e.code === "auth/invalid-credential" ? "E-Mail oder Passwort falsch" : "Login fehlgeschlagen"); } };
  const handleLogout = async () => { await adminLogout(); setIsAdmin(false); setLoggedIn(false); setModalView(null); };



  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const handleDateClick = (day) => {
    if (!day) return;
    const key = dateKey(year, month, day);
    const ev = events[key]?.status === "deleted" ? null : events[key];
    setSelectedDate(key);
    if (isAdmin) {
      if (ev) {
        setModalView("info");
      } else {
        setAdminForm({ type:"booked", label:"", note:"", startTime:"08:00", endTime:"22:00", adminNote:"", eventType:"", allDay:false, checklist:[] });
        setModalView("admin");
      }
    } else if (ev && ev.status !== "pending") {
      setModalView("info");
    } else {
      setSelectedDate(key);
      setFormData(f => ({ ...f, name:"", email:"", phone:"", guests:"", message:"", slot:"halfDayAM" }));
      setModalView("selectType");
    }
  };

  const handleCardClick = (typeId) => {
    setFormData({ name:"", email:"", phone:"", type: typeId, slot:"halfDayAM", guests:"", message:"", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:10, tourMin:0, tourEndHour:18, tourEndMin:0 });
    setShowTypeSelect(false);
    setSubmitAttempted(false);
    setPickerMonth(month);
    setPickerYear(year);
    setModalView("pickDate");
  };

  const handlePickerDateClick = (day) => {
    if (!day) return;
    const key = dateKey(pickerYear, pickerMonth, day);
    const isPast = new Date(pickerYear, pickerMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (isPast || events[key]) return;
    setSelectedDate(key);
    setSubmitAttempted(false);
    setModalView("form");
  };

  const handleAdminSave = () => {
    prevEvents.current = { ...events };
    const updated = { ...events };
    if (adminForm.type === "free") { delete updated[selectedDate]; }
    else { const st = adminForm.allDay ? "00:00" : adminForm.startTime; const et = adminForm.allDay ? "23:59" : adminForm.endTime; updated[selectedDate] = { status: adminForm.type, type: adminForm.eventType || "", label: adminForm.label, note: adminForm.note, startTime: st, endTime: et, adminNote: adminForm.adminNote, allDay: adminForm.allDay, checklist: adminForm.checklist || [], slotLabel: adminForm.allDay ? "Ganztägig" : `${st} – ${et}` }; }
    saveEvents(updated);
    setModalView(null);
  };

  const handleCustomerSubmit = () => {
    const et = eventTypes.find(e => e.id === formData.type);
    const isGroup = et?.isGroupTour;
    const valid = formData.name.trim() && formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)
      && (!isGroup || (formData.guests && Number(formData.guests) >= (et?.minPersons || 10)));
    if (!valid) { setSubmitAttempted(true); return; }
    let slotLabel, startTime, endTime;
    if (isGroup) {
      startTime = String(formData.tourHour).padStart(2,"0")+":"+String(formData.tourMin).padStart(2,"0");
      endTime = String(formData.tourEndHour).padStart(2,"0")+":"+String(formData.tourEndMin).padStart(2,"0");
      slotLabel = `${startTime} – ${endTime}`;
    } else if (formData.slot === "custom") {
      startTime = String(formData.tourHour).padStart(2,"0")+":"+String(formData.tourMin).padStart(2,"0");
      const endH2 = Number(formData.tourEndHour||18);
      const endM2 = Number(formData.tourEndMin||0);
      endTime = String(endH2).padStart(2,"0")+":"+String(endM2).padStart(2,"0");
      slotLabel = `${startTime} – ${endTime}`;
    } else {
      const slots = { halfDayAM:["Halbtags Vormittag (08:00–13:00)","08:00","13:00"], halfDayPM:["Halbtags Nachmittag (13:00–18:00)","13:00","18:00"], fullDay:["Ganztags (08:00–22:00)","08:00","22:00"] };
      const s = slots[formData.slot] || slots.fullDay;
      slotLabel = s[0]; startTime = s[1]; endTime = s[2];
    }
    const updated = { ...events, [selectedDate]: { status:"pending", label: et?.label, type: formData.type, slotLabel, startTime, endTime, ...formData } };
    saveEvents(updated);
    setSubmitAttempted(false);
    setModalView(null);
    setSuccessModal(true);
  };

  const handleAdminAction = (key, action) => {
    if (action === "delete" && confirmDelete !== key && events[key]?.status !== "pending") {
      setConfirmDelete(key);
      return;
    }
    if (action === "permDelete") {
      const updated = { ...events };
      delete updated[key];
      saveEvents(updated);
      return;
    }
    setConfirmDelete(null);
    prevEvents.current = { ...events };
    const ev = events[key];
    const updated = { ...events };
    if (action === "confirm") updated[key] = { ...updated[key], status: "booked" };
    else if (action === "delete") updated[key] = { ...updated[key], status: "deleted", deletedAt: new Date().toISOString() };
    saveEvents(updated);
    setModalView(null);
    const actionLabel = action === "confirm" ? "Bestätigt" : "Gelöscht";
    const actionColor = action === "confirm" ? BRAND.moosgruen : "#c44";
    showToast(actionLabel, `${fmtDateAT(key)}${ev?.label ? " · " + ev.label : ""}${ev?.name ? " · " + ev.name : ""}`, true, actionColor);
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
    <div style={{ minHeight:"100vh", background: `linear-gradient(160deg, #f3eff2 0%, #ede8ec 40%, #f3eff2 100%)`, fontFamily:"'Acumin Pro', 'Segoe UI', system-ui, sans-serif", overflowX:"hidden", WebkitTextSizeAdjust:"100%" }}>
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

      {successModal && (
        <div onClick={() => setSuccessModal(false)} style={{ position:"fixed", inset:0, zIndex:1200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"url(/assets/garten-Anfrage-gesendet.jpg)", backgroundSize:"cover", backgroundPosition:"center" }} />
          <div style={{ position:"absolute", inset:0, background:"rgba(88,8,74,0.55)", backdropFilter:"blur(2px)" }} />
          <div onClick={e => e.stopPropagation()} style={{ position:"relative", background:"rgba(255,255,255,0.97)", borderRadius:20, padding:"32px 28px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(88,8,74,0.35)", textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:`${BRAND.lila}12`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.lila} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:BRAND.aubergine, marginBottom:8 }}>Anfrage gesendet!</div>
            <div style={{ fontSize:14, color:"#888", lineHeight:1.6, marginBottom:20 }}>Vielen Dank für Ihr Interesse.<br/>Wir melden uns in Kürze bei Ihnen.</div>
            <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer"
              style={{ display:"block", padding:"14px 16px", background:`${BRAND.aubergine}06`, border:`1.5px solid ${BRAND.aubergine}15`, borderRadius:12, textDecoration:"none", marginBottom:16, transition:"all .15s" }}>
              <div style={{ fontSize:11, color:"#999", fontWeight:500, letterSpacing:0.5, marginBottom:4 }}>Mehr über uns erfahren</div>
              <div style={{ fontSize:15, fontWeight:600, color:BRAND.lila }}>www.derparadiesgarten.at</div>
              <div style={{ fontSize:11, color:"#aaa", marginTop:3 }}>Entdecken Sie unseren Paradiesgarten in Klagenfurt</div>
            </a>
            <button onClick={() => setSuccessModal(false)}
              style={{ background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:10, padding:"12px 36px", fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:0.5 }}>Schließen</button>
          </div>
        </div>
      )}

      <header style={{ background: BRAND.aubergine, color:"#fff", padding: winW < 520 ? "6px 12px" : "8px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", position: winW < 520 ? "sticky" : "relative", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:0, minWidth:0, flex:1 }}>
          <img src={PGM_LOGO} alt="Paradiesgärten Mattuschka" style={{ height: winW < 520 ? 24 : 26, flexShrink:0 }} />
          <div style={{ marginLeft: winW < 520 ? 8 : 10, display:"flex", flexDirection: winW < 520 ? "column" : "row", alignItems: winW < 520 ? "flex-start" : "center", gap: winW < 520 ? 0 : 0, minWidth:0 }}>
            {winW < 520 ? (
              <>
                <span style={{ fontSize:11, letterSpacing:2, color:"#fff", fontWeight:600, lineHeight:1.2 }}>PARADIESGÄRTEN</span>
                <span style={{ fontSize:11, letterSpacing:2, color:"#fff", fontWeight:300, lineHeight:1.2 }}>MATTUSCHKA</span>
              </>
            ) : (
              <>
                <span style={{ fontSize:14, letterSpacing:2.5, whiteSpace:"nowrap", color:"#fff" }}><span style={{ fontWeight:700 }}>PARADIESGÄRTEN</span><span style={{ fontWeight:300 }}>MATTUSCHKA</span></span>
                <div style={{ width:1, height:20, background:"rgba(255,255,255,0.35)", margin:"0 14px", flexShrink:0 }} />
                <span style={{ fontSize:12, opacity:.6, whiteSpace:"nowrap", letterSpacing:0.5 }}>Termin-Veranstaltungsplaner</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {!isAdmin && (
            <button onClick={() => setModalView("contact")}
              style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", padding:"0 14px", height:32, borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:1, textTransform:"uppercase", display:"flex", alignItems:"center" }}>
              Kontakt
            </button>
          )}
          {isAdmin ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={() => { setIsAdmin(false); setModalView(null); }}
                style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", padding:"0 12px", height:32, borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:0.5, display:"flex", alignItems:"center" }}>
                ← Kundenansicht
              </button>
              <button onClick={handleLogout}
                title="Abmelden"
                style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", width:32, height:32, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </button>
            </div>
          ) : loggedIn ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button onClick={() => { setIsAdmin(true); setModalView(null); }} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", padding:"0 12px", height:32, borderRadius:6, cursor:"pointer", fontSize:11, letterSpacing:0.5, display:"flex", alignItems:"center" }}>Admin →</button>
              <button onClick={handleLogout} title="Abmelden" style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.6)", width:32, height:32, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
            </div>
          ) : (
            <button onClick={() => setLoginModal(true)} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", width:32, height:32, borderRadius:6, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0 }} title="Admin-Login"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></button>
          )}
        </div>
      </header>

      {loginModal && (<div onClick={() => setLoginModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}><div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:"32px 24px", maxWidth:360, width:"100%", boxShadow:"0 24px 60px rgba(0,0,0,0.15)" }}><div style={{ textAlign:"center", marginBottom:20 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={BRAND.aubergine} strokeWidth="2" strokeLinecap="round" style={{ marginBottom:8 }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><div style={{ fontSize:18, fontWeight:700, color:BRAND.aubergine }}>Admin-Login</div><div style={{ fontSize:12, color:"#999", marginTop:2 }}>Paradiesgarten Mattuschka</div></div><input placeholder="E-Mail" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:14, marginBottom:8, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} /><input placeholder="Passwort" type="password" value={loginPw} onChange={e => setLoginPw(e.target.value)} onKeyDown={e => e.key==="Enter" && handleLogin()} style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:14, marginBottom:8, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color:BRAND.aubergine }} />{loginError && <div style={{ fontSize:12, color:"#c44", marginBottom:8, textAlign:"center" }}>{loginError}</div>}<button onClick={handleLogin} style={{ width:"100%", padding:"12px 0", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:1 }}>Anmelden</button><button onClick={() => setLoginModal(false)} onMouseEnter={e=>{e.target.style.color="#c44";e.target.style.background="#fdf6f6"}} onMouseLeave={e=>{e.target.style.color="#aaa";e.target.style.background="transparent"}} style={{ width:"100%", padding:10, border:"none", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:13, marginTop:4, borderRadius:8, transition:"all .15s" }}>Abbrechen</button></div></div>)}

      {isAdmin && (
        <div style={{ background:`${BRAND.aubergine}12`, padding: winW < 520 ? "5px 12px" : "5px 24px", fontSize: winW < 520 ? 10 : 11, display:"flex", gap: winW < 520 ? 10 : 16, alignItems:"center", borderBottom:"1px solid #e8e0e5" }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:"50%", background:BRAND.lila, display:"inline-block" }} /> Gebucht</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:"50%", background:BRAND.aprikot, display:"inline-block" }} /> Anfrage</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:"50%", background:BRAND.moosgruen, display:"inline-block" }} /> Blockiert</span>
        </div>
      )}

      <div style={{ maxWidth: winW > 900 ? 1100 : (isAdmin ? 700 : 800), margin:"0 auto", padding: winW < 520 ? "12px 10px" : winW > 900 ? "24px 40px" : "16px 16px" }}>
        {/* Customer: Hero Image */}
        {!isAdmin && winW > 520 && (
          <div style={{ position:"relative", borderRadius:16, overflow:"hidden", marginBottom:28, height: winW > 900 ? 420 : 280 }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"url(/assets/garten-hintergrund.jpg)", backgroundSize:"cover", backgroundPosition:"center 40%" }} />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"45%", background:"linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)" }} />
            <img src="/assets/logo-bild.png" alt="" style={{ position:"absolute", top: winW > 900 ? 16 : 12, right: winW > 900 ? 20 : 14, height: winW > 900 ? 48 : 36, opacity:0.85, filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }} />
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding: winW > 900 ? "28px 32px" : "18px 20px" }}>
              <div style={{ fontSize: winW > 900 ? 28 : 20, fontWeight:700, color:"#fff", letterSpacing:1, textShadow:"0 2px 8px rgba(0,0,0,0.4)" }}>Paradiesgarten Mattuschka</div>
              <div style={{ fontSize: winW > 900 ? 14 : 12, color:"rgba(255,255,255,0.85)", marginTop:4, textShadow:"0 1px 4px rgba(0,0,0,0.3)" }}>Ihr Veranstaltungsort in Klagenfurt am Wörthersee</div>
            </div>
          </div>
        )}
        {/* Customer: Event Types */}
        {!isAdmin && (
          <div style={{ marginBottom:32 }}>
            <h2 style={{ fontSize: winW < 520 ? 16 : winW > 900 ? 24 : 20, fontWeight:700, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase", marginBottom: winW > 900 ? 24 : 16, textAlign:"center" }}>
              Unsere Veranstaltungen & Preise
            </h2>
            {(() => {
              const allTypes = eventTypes;
              const isMobile = winW < 520;
              const renderCard = (et) => {
                const isGroup = et.isGroupTour;
                return (
                  <div key={et.id} onClick={() => handleCardClick(et.id)} className="evt-card"
                    style={{ "--card-color": et.color, flex: isMobile ? (winW < 380 ? "1 1 100%" : "1 1 calc(50% - 5px)") : winW > 900 ? "1 1 calc(33.33% - 8px)" : "1 1 0", background:"#fff", borderRadius:10, padding: isMobile ? "14px 12px" : winW > 900 ? "20px 18px" : "16px 14px", borderLeft:`3px solid ${et.color}`, boxShadow:"0 2px 10px rgba(0,0,0,0.04)", cursor:"pointer", transition:"all .25s ease", display:"flex", flexDirection:"column", justifyContent:"space-between", minWidth:0 }}>
                    <div>
                      <div style={{ fontWeight:700, color: BRAND.aubergine, fontSize: isMobile ? 12 : winW > 900 ? 15 : 13, marginBottom:3, wordBreak:"break-word", hyphens:"auto" }}>{et.label}</div>
                      <div style={{ fontSize: isMobile ? 9 : winW > 900 ? 12 : 10, color:"#888", lineHeight:1.3, marginBottom:6 }}>{et.desc}</div>
                    </div>
                    <div style={{ marginTop:"auto" }}>
                      <div style={{ background: et.color+"12", color: et.color, padding:"3px 6px", borderRadius:6, fontSize: isMobile ? 10 : 11, fontWeight:700, textAlign:"left", marginBottom:2, display:"inline-block" }}>
                        {isGroup ? <><span>€ {et.pricePerPerson} p.P.</span><span style={{ margin:"0 6px", opacity:0.4 }}>|</span><span>ab {et.minPersons} Pers.</span></> : et.halfDay === 0 ? "auf Anfrage" : `ab ${fmt(et.halfDay)}`}
                      </div>
                      <div style={{ fontSize: isMobile ? 9 : 10, color: et.color, fontWeight:600, marginTop:6, display:"flex", alignItems:"center", gap:3, opacity:0.7 }}>
                        Jetzt anfragen <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1l4 4-4 4" stroke={et.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    </div>
                  </div>
                );
              };
              return (
                <div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap: isMobile ? 8 : 10, marginBottom:20 }}>
                    {allTypes.map(renderCard)}
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap: isMobile ? 6 : 10, justifyContent:"center", marginBottom:20 }}>
                    {["Mitten im Blütenmeer","120 m² Veranstaltungsglashaus","Blick auf Karawanken & Klagenfurt","Historischer Paradiesgarten","Persönliche Betreuung"].map(t => (
                      <span key={t} style={{ fontSize: isMobile ? 10 : 11, color:BRAND.aubergine, background:`${BRAND.lila}08`, border:`1px solid ${BRAND.lila}15`, borderRadius:20, padding:"4px 12px", whiteSpace:"nowrap" }}>{t}</span>
                    ))}
                  </div>
                  <button onClick={() => setModalView("selectType")}
                    style={{ width:"100%", padding:"14px 0", background:BRAND.aubergine, color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", letterSpacing:0.5, boxShadow:"0 4px 16px rgba(88,8,74,0.25)", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    Jetzt Veranstaltung anfragen
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              );
            })()}
          </div>
        )}

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
            const hol = holidays[key];
            const isToday = key === todayKey;
            const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const customerBooked = !isAdmin && ev && (ev.status === "booked" || ev.status === "blocked");
            const customerFree = !isAdmin && (!ev || ev.status === "pending");
            const statusColor = ev ? (ev.status === "booked" ? BRAND.lila : ev.status === "pending" ? BRAND.aprikot : BRAND.moosgruen) : null;
            const isPending = ev?.status === "pending" && isAdmin;
            return (
              <button key={key} className={isPast ? "" : customerBooked ? "day-booked" : "day-free"} onClick={() => !isPast && handleDateClick(day)} title={customerBooked ? "nicht verfügbar" : isAdmin && ev?.label ? ev.label : ""}
                onMouseEnter={() => isAdmin && ev && setHoveredDate(key)} onMouseLeave={() => isAdmin && setHoveredDate(null)}
                style={{
                  aspectRatio:"1",
                  border: isToday ? `2px solid ${BRAND.lila}` : isPending ? `2px solid ${BRAND.aprikot}` : ev && isAdmin && ev.status==="blocked" ? `1.5px solid ${BRAND.moosgruen}60` : ev && isAdmin ? `1.5px solid ${statusColor}` : "1px solid #e8e0e5",
                  borderRadius: winW > 900 ? 10 : 8,
                  background: isPending ? `${BRAND.sonnengelb}30` : ev && isAdmin && ev.status==="blocked" ? `${BRAND.moosgruen}12` : ev && isAdmin ? `${statusColor}18` : (isPast ? "#f5f3f4" : "#fff"),
                  cursor: isPast || customerBooked ? "default" : "pointer", position:"relative", display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center", opacity: isPast ? 0.4 : 1, transition:"all .15s", padding: isAdmin ? 2 : 3, paddingTop: hol && !ev && winW > 900 ? 14 : (isAdmin ? 2 : 3),
                  animation: isPending && !isPast ? "pendingPulse 2s ease-in-out infinite" : "none",
                }}>
                {hol && !ev && (winW > 900 ?
                  <div style={{ position:"absolute", top:0, left:0, right:0, background:`${BRAND.aubergine}50`, color:BRAND.aubergine, fontSize:9, lineHeight:1, borderRadius:"10px 10px 2px 2px", padding:"3px 2px", textAlign:"center", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{hol}</div>
                  : <div style={{ position:"absolute", top:0, left:0, right:0, height:5, background:BRAND.aubergine, opacity:0.35, borderRadius:"8px 8px 0 0" }} />
                )}
                <span style={{ fontSize: winW > 900 ? 16 : (isAdmin ? 12 : 14), fontWeight: isToday || (ev && isAdmin) ? 700 : (hol && !ev && winW <= 900 ? 600 : 400), color: ev && isAdmin && ev.status!=="blocked" ? statusColor : (hol && !ev && winW <= 900 ? BRAND.lila : BRAND.aubergine) }}>{day}</span>
                {customerBooked && <div style={{ width: winW > 900 ? 8 : 6, height: winW > 900 ? 8 : 6, borderRadius:"50%", background: BRAND.lila, marginTop:2 }} />}
                {ev && isAdmin && <div style={{ fontSize:7, color: statusColor, marginTop:1, fontWeight:600, lineHeight:1, overflow:"hidden", whiteSpace:"nowrap", maxWidth:"100%" }}>{ev.status === "booked" ? "●" : ev.status === "pending" ? "◐" : "○"}</div>}
              </button>
            );
          })}
        </div>

        </div>}
        {/* Admin: 1. Offene Anfragen */}
        {isAdmin && (() => {
          const pending = Object.entries(events).filter(([,v]) => v.status === "pending").sort(([a],[b]) => a.localeCompare(b));
          if (!pending.length) return null;
          return (
            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontSize: winW > 900 ? 16 : 14, fontWeight:700, color: BRAND.aprikot, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Offene Anfragen ({pending.length})</h3>
              {pending.map(([key, ev]) => {
                const [yy,mm,dd] = key.split("-").map(Number);
                const d = new Date(yy,mm-1,dd);
                const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
                const dateStr = `${dayName}, ${dd}. ${MONTHS[mm-1]}`;
                return (
                <SwipeRow key={key} onSwipeRight={() => handleAdminAction(key,"confirm")} onSwipeLeft={() => handleAdminAction(key,"delete")} rightLabel="Annehmen" rightColor={BRAND.mintgruen} leftLabel="Ablehnen" leftColor="#e0d5df">
                  <div onClick={() => { setSelectedDate(key); setModalView("info"); }}
                    onMouseEnter={() => setHoveredDate(key)} onMouseLeave={() => setHoveredDate(null)}
                    style={{ background:"#fff", borderRadius:8, padding:"10px 12px", borderLeft:`3px solid ${BRAND.aprikot}`, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.03)", position:"relative", transition:"all .15s" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:2 }}>
                      <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap", flex:1, minWidth:0 }}>
                        <span style={{ fontWeight:600, color: BRAND.aprikot, fontSize:13 }}>{dateStr}</span>
                        <span style={{ fontSize:11, color: BRAND.aubergine, fontWeight:500 }}>{ev.label || ev.type}</span>
                        {ev.slotLabel && <span style={{ fontSize:10, color:"#aaa" }}><ClockIcon />{ev.slotLabel}</span>}
                      </div>
                      <div style={{ display:"flex", gap:4, flexShrink:0, marginLeft:8 }}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedDate(key); setModalView("info"); }}
                          onMouseEnter={e => { e.target.style.filter="brightness(0.85)"; }}
                          onMouseLeave={e => { e.target.style.filter="none"; }}
                          style={{ ...smallBtn, background: BRAND.mintgruen, width:26, height:26, fontSize:11, transition:"all .15s" }}>✓</button>
                        <button onClick={(e) => { e.stopPropagation(); handleAdminAction(key,"delete"); }}
                          onMouseEnter={e => { e.target.style.background="#f8d0d0"; }}
                          onMouseLeave={e => { e.target.style.background="#e8e0e5"; }}
                          style={{ ...smallBtn, background:"#e8e0e5", color:"#999", width:26, height:26, fontSize:11, transition:"all .15s" }}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:"#888", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                      👤 {ev.name}
                      {ev.email && <> · <a href={`mailto:${ev.email}`} onClick={e=>e.stopPropagation()} style={{ color: BRAND.lila, textDecoration:"none", fontSize:10 }}>{ev.email}</a></>}
                      {ev.guests && <> · {ev.guests} Gäste</>}
                      {ev.message && <> · <span style={{ fontStyle:"italic", color:"#aaa" }}>„{ev.message}"</span></>}
                    </div>
                  </div>
                </SwipeRow>
                );
              })}
            </div>
          );
        })()}

        {/* Admin: 2. Kommende Termine + 3. Interne + 4. Vergangene */}
        {isAdmin && (() => {
          const allUpcoming = Object.entries(events).filter(([k,v]) => (v.status === "booked" || v.status === "blocked") && k >= todayKey).sort(([a],[b]) => a.localeCompare(b));
          const bookedOnly = allUpcoming.filter(([,v]) => v.status === "booked");
          const blockedOnly = allUpcoming.filter(([,v]) => v.status === "blocked");
          if (!allUpcoming.length) return null;
          const renderRow = ([key, ev], pastMode) => {
            const isBlocked = ev.status === "blocked";
            const [yy,mm,dd] = key.split("-").map(Number);
            const d = new Date(yy,mm-1,dd);
            const dayName = ["So","Mo","Di","Mi","Do","Fr","Sa"][d.getDay()];
            const dateStr = `${dayName}, ${dd}. ${MONTHS[mm-1]}`;
            return (
              <div key={key} style={{ marginBottom:5 }}>
                <div className="admin-card" onClick={() => { setSelectedDate(key); setModalView("info"); }}
                  style={{ background:"#fff", borderRadius:8, padding: winW > 900 ? "10px 16px" : "8px 12px", borderLeft:`3px solid ${BRAND.aubergine}`, cursor:"pointer", boxShadow:"0 1px 4px rgba(0,0,0,0.03)", position:"relative", display:"flex", alignItems:"center", gap:10, opacity: pastMode ? 0.7 : 1 }}>
                  {!pastMode && winW >= 520 && (confirmDelete === key ? (
                    <div onClick={(e) => e.stopPropagation()} style={{ position:"absolute", top:0, right:0, bottom:0, display:"flex", alignItems:"center", gap:6, padding:"0 10px", background:"rgba(255,255,255,0.95)", borderRadius:"0 8px 8px 0", zIndex:2 }}>
                      <span style={{ fontSize:11, color:"#999" }}>Löschen?</span>
                      <button onClick={(e) => { e.stopPropagation(); handleAdminAction(key,"delete"); }}
                        onMouseEnter={e => { e.target.style.background="#a33"; }}
                        onMouseLeave={e => { e.target.style.background="#c44"; }}
                        style={{ background:"#c44", border:"none", color:"#fff", padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>Ja</button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        onMouseEnter={e => { e.target.style.color="#c44"; e.target.style.background="#fdf6f6"; }}
                        onMouseLeave={e => { e.target.style.color="#888"; e.target.style.background="#e8e0e5"; }}
                        style={{ background:"#e8e0e5", border:"none", color:"#888", padding:"4px 10px", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .15s" }}>Nein</button>
                    </div>
                  ) : (
                    <button className="card-delete" onClick={(e) => { e.stopPropagation(); handleAdminAction(key,"delete"); }}
                      style={{ position:"absolute", top:4, right:4, width:20, height:20, borderRadius:10, border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", padding:0, opacity:0, transition:"opacity .15s" }}>
                      <svg width="12" height="12" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="#c44" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  ))}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:600, color: BRAND.aubergine, fontSize: winW > 900 ? 15 : 13 }}>{dateStr}</span>
                      <span style={{ fontSize: winW > 900 ? 13 : 11, color:"#999", fontWeight:500 }}>{ev.label || (isBlocked ? "" : "")}</span>
                      {ev.slotLabel && <span style={{ fontSize: winW > 900 ? 12 : 10, color:"#bbb" }}><ClockIcon color="#bbb" />{ev.slotLabel}</span>}
                    </div>
                    {(ev.name || ev.adminNote) && (
                      <div style={{ fontSize:10, color:"#aaa", marginTop:1, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                        {ev.name && <span>{ev.name}</span>}
                        {ev.adminNote && <span>{ev.name ? " · " : ""}{ev.adminNote}</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ background:`${BRAND.aubergine}10`, color: BRAND.aubergine, padding:"2px 6px", borderRadius:8, fontSize:8, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, flexShrink:0, opacity:0.6 }}>
                    {isBlocked ? "Intern" : "Gebucht"}
                  </div>
                </div>
              </div>
            );
          };
          return (
            <div style={{ marginBottom:24 }}>
              {bookedOnly.length > 0 && (
                <>
                  <h3 style={{ fontSize: winW > 900 ? 16 : 14, fontWeight:700, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Kommende Termine ({bookedOnly.length})</h3>
                  {bookedOnly.map(r => renderRow(r, false))}
                </>
              )}
              {blockedOnly.length > 0 && (
                <>
                  <h3 style={{ fontSize: winW > 900 ? 14 : 12, fontWeight:600, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase", marginBottom:10, marginTop: bookedOnly.length > 0 ? 20 : 0 }}>Interne Termine ({blockedOnly.length})</h3>
                  {blockedOnly.map(r => renderRow(r, false))}
                </>
              )}
              {(() => {
                const pastAll = Object.entries(events).filter(([k,v]) => (v.status === "booked" || v.status === "blocked") && k < todayKey).sort(([a],[b]) => b.localeCompare(a));
                if (!pastAll.length) return null;
                return (
                  <div style={{ marginTop:20 }}>
                    <h3 onClick={() => setShowPast(s=>!s)} style={{ fontSize: winW > 900 ? 14 : 12, fontWeight:600, color:"#aaa", letterSpacing:2, textTransform:"uppercase", marginBottom: showPast ? 10 : 0, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                      Vergangene Termine ({pastAll.length})
                      <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: showPast ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke="#aaa" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </h3>
                    {showPast && pastAll.map(r => renderRow(r, true))}
                  </div>
                );
              })()}
              {(() => {
                const deletedAll = Object.entries(events).filter(([,v]) => v.status === "deleted").sort(([a],[b]) => b.localeCompare(a));
                if (!deletedAll.length) return null;
                return (
                  <div style={{ marginTop:20 }}>
                    <h3 onClick={() => setShowDeleted(s=>!s)} style={{ fontSize: winW > 900 ? 14 : 12, fontWeight:600, color:"#c44", letterSpacing:2, textTransform:"uppercase", marginBottom: showDeleted ? 10 : 0, cursor:"pointer", display:"flex", alignItems:"center", gap:8, opacity:0.7 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c44" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                      Gelöschte Termine ({deletedAll.length})
                      <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: showDeleted ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke="#c44" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </h3>
                    {showDeleted && deletedAll.map(([key, ev]) => {
                      const [yy,mm,dd] = key.split("-").map(Number);
                      return (
                        <div key={key} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#fdf6f6", borderRadius:8, marginBottom:4, border:"1px solid #f0e0e0", opacity:0.7 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:"#888" }}>{fmtDateAT(key)}</div>
                            <div style={{ fontSize:11, color:"#aaa", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.label}{ev.name ? ` · ${ev.name}` : ""}</div>
                          </div>
                          <button onClick={() => { const u = {...events}; u[key] = {...u[key], status:"booked"}; saveEvents(u); }}
                            title="Wiederherstellen"
                            style={{ background:"none", border:`1px solid ${BRAND.moosgruen}40`, borderRadius:6, width:28, height:28, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:BRAND.moosgruen }}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 7h7a3 3 0 1 1 0 6H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 4L3 7l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </button>
                          <button onClick={() => handleAdminAction(key, "permDelete")}
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

        {/* Admin: Preise verwalten */}
        {isAdmin && (
          <div style={{ marginBottom:24 }}>
            <h3 onClick={() => setShowPrices(s=>!s)} style={{ fontSize: winW > 900 ? 16 : 14, fontWeight:700, color: BRAND.aubergine, letterSpacing:2, textTransform:"uppercase", marginBottom: showPrices ? 12 : 0, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
              Preise verwalten
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ transition:"transform .2s", transform: showPrices ? "rotate(180deg)" : "rotate(0)" }}><path d="M2 4l4 4 4-4" stroke={BRAND.aubergine} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </h3>
            {showPrices && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {eventTypes.map(et => (
                <div key={et.id} onClick={() => setEditingType({...et})}
                  style={{ flex: winW < 520 ? "1 1 calc(50% - 4px)" : "1 1 0", background:"#fff", borderRadius:8, padding: winW < 520 ? "12px 10px" : "10px 10px", borderLeft:`3px solid ${et.color}`, boxShadow:"0 1px 6px rgba(0,0,0,0.04)", cursor:"pointer", transition:"all .15s", minWidth:0 }}>
                  <div style={{ fontWeight:700, color: BRAND.aubergine, fontSize: winW < 520 ? 12 : 11, marginBottom:4, wordBreak:"break-word" }}>{et.label}</div>
                  <div style={{ fontSize:10, color:"#888" }}>
                    {et.isGroupTour ? (
                      <><div>€ {et.pricePerPerson} p.P.</div><div>ab {et.minPersons} Pers.</div></>
                    ) : (
                      <><div>½ {et.halfDay === 0 ? "–" : fmt(et.halfDay)}</div><div>1 {et.fullDay === 0 ? "–" : fmt(et.fullDay)}</div></>
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* Customer: Contact */}
        {!isAdmin && (
          <div style={{ background:`${BRAND.lila}0a`, borderRadius:10, padding: winW < 520 ? "14px 16px" : "16px 28px", textAlign:"center", marginBottom:24, border:`1px solid ${BRAND.lila}15` }}>
            <div style={{ fontSize: winW < 520 ? 12 : 13, fontWeight:700, color:BRAND.aubergine, letterSpacing:2, marginBottom:4, textTransform:"uppercase" }}>Paradiesgarten Mattuschka</div>
            <div style={{ fontSize: winW < 520 ? 11 : 12, color:BRAND.aubergine, opacity:.6, lineHeight:1.6 }}>
              <a href="https://maps.google.com/?q=Emmersdorfer+Straße+86+9061+Klagenfurt" target="_blank" rel="noopener noreferrer" style={{ color:BRAND.aubergine, opacity:.7 }}>Emmersdorfer Straße 86, 9061 Klagenfurt am Wörthersee</a><br />
              {winW < 520 ? (
                <>
                  <a href="tel:+4346349119" style={{ color:BRAND.aubergine, textDecoration:"none" }}>+43 463 49 119</a><br />
                  <a href="mailto:info@mattuschka.at" style={{ color:BRAND.aubergine, textDecoration:"none" }}>info@mattuschka.at</a><br />
                  <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ color:BRAND.aubergine, textDecoration:"none" }}>www.derparadiesgarten.at</a>
                </>
              ) : (
                <>
                  <a href="tel:+4346349119" style={{ color:BRAND.aubergine, textDecoration:"none" }}>+43 463 49 119</a> &nbsp;|&nbsp; <a href="mailto:info@mattuschka.at" style={{ color:BRAND.aubergine, textDecoration:"none" }}>info@mattuschka.at</a> &nbsp;|&nbsp; <a href="https://www.derparadiesgarten.at" target="_blank" rel="noopener noreferrer" style={{ color:BRAND.aubergine, textDecoration:"none" }}>www.derparadiesgarten.at</a>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {(modalView || editingType) && (
        <div onClick={() => { if (modalView !== "form") { setModalView(null); setEditingType(null); } }}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems: winW < 520 ? "flex-end" : "center", justifyContent:"center", padding: winW < 520 ? 0 : 16, touchAction:"none" }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius: winW < 520 ? "16px 16px 0 0" : 16, padding: winW < 520 ? "24px 16px" : "28px 24px", maxWidth: winW > 900 ? 540 : 460, width:"100%", maxHeight: winW < 520 ? "90vh" : "85vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.15)", touchAction:"pan-y", overscrollBehavior:"contain", WebkitOverflowScrolling:"touch" }}>

            {/* Select Event Type */}
            {modalView === "selectType" && (
              <>
                <div style={{ textAlign:"center", marginBottom:20 }}>
                  <div style={{ fontSize:18, fontWeight:700, color: BRAND.aubergine, marginBottom:4 }}>Veranstaltung anfragen</div>
                  {selectedDate && <div style={{ fontSize:13, color:"#999" }}>{fmtDate(selectedDate)}</div>}
                  {selectedDate && holidays[selectedDate] && <div style={{ display:"inline-block", background:BRAND.aubergine, color:"rgba(255,255,255,0.8)", fontSize:10, borderRadius:4, padding:"3px 10px", marginTop:6 }}>{holidays[selectedDate]}</div>}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {eventTypes.map(et => (
                    <button key={et.id} onClick={() => {
                      setFormData(f => ({ ...f, type: et.id, name:"", email:"", phone:"", guests:"", message:"", slot:"halfDayAM", tourGuide:false, cakeCount:0, coffeeCount:0, tourHour:10, tourMin:0, tourEndHour:12, tourEndMin:0 }));
                      setSubmitAttempted(false);
                      setShowTypeSelect(false);
                      setPickerMonth(month);
                      setPickerYear(year);
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
                    <input type="number" value={editingType.pricePerPerson||0} onChange={e => setEditingType(t=>({...t, pricePerPerson: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Mindestanzahl Personen</label>
                    <input type="number" value={editingType.minPersons||0} onChange={e => setEditingType(t=>({...t, minPersons: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Kosten pro Führung (€)</label>
                    <input type="number" value={editingType.guideCost||0} onChange={e => setEditingType(t=>({...t, guideCost: Number(e.target.value)}))} style={inputStyle} />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Max. Personen pro Führung</label>
                    <input type="number" value={editingType.maxPerTour||0} onChange={e => setEditingType(t=>({...t, maxPerTour: Number(e.target.value)}))} style={inputStyle} />
                  </>
                ) : (
                  <>
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Halbtags (bis 13:00)</label>
                    <input type="number" value={editingType.halfDay} onChange={e => setEditingType(t=>({...t, halfDay: Number(e.target.value)}))} style={inputStyle} placeholder="0 = auf Anfrage" />
                    <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Ganztags (08:00–22:00)</label>
                    <input type="number" value={editingType.fullDay} onChange={e => setEditingType(t=>({...t, fullDay: Number(e.target.value)}))} style={inputStyle} placeholder="0 = auf Anfrage" />
                  </>
                )}
                <label style={{ fontSize:12, color:"#888", fontWeight:600 }}>Beschreibung</label>
                <input value={editingType.desc} onChange={e => setEditingType(t=>({...t, desc: e.target.value}))} style={inputStyle} />
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
                    <div style={{ width:4, height:36, borderRadius:2, background: et?.color || BRAND.lila }} />
                    <div>
                      <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:18, fontWeight:700 }}>{et?.label}</h3>
                      <div style={{ fontSize:12, color: et?.color, fontWeight:600 }}>{et?.halfDay === 0 ? "auf Anfrage" : `ab ${fmt(et?.halfDay)}`}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:14, color:"#666", marginBottom:12 }}>Wählen Sie Ihr Wunschdatum:</div>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                    <button onClick={prevPM} style={{ ...navBtn, width:32, height:32, fontSize:16 }}>‹</button>
                    <span style={{ fontWeight:700, color: BRAND.aubergine, fontSize:15 }}>{MONTHS[pickerMonth]} {pickerYear}</span>
                    <button onClick={nextPM} style={{ ...navBtn, width:32, height:32, fontSize:16 }}>›</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
                    {DAYS_H.map(d => <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:"#999", padding:"4px 0" }}>{d}</div>)}
                    {pDays.map((day, i) => {
                      if (!day) return <div key={`e${i}`} />;
                      const key = dateKey(pickerYear, pickerMonth, day);
                      const ev = events[key];
                      const isPast = new Date(pickerYear, pickerMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const isFree = !ev && !isPast;
                      return (
                        <button key={key} onClick={() => handlePickerDateClick(day)}
                          style={{
                            aspectRatio:"1", border: isFree ? `1.5px solid ${et?.color || BRAND.lila}40` : "1px solid #eee",
                            borderRadius:6, background: isFree ? "#fff" : "#f8f8f8",
                            cursor: isFree ? "pointer" : "default", fontSize:13, fontWeight: isFree ? 600 : 400,
                            color: isFree ? BRAND.aubergine : "#ccc", opacity: isPast ? 0.4 : 1, transition:"all .15s",
                            display:"flex", alignItems:"center", justifyContent:"center",
                          }}>
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
            {modalView === "admin" && (
              <>
                <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:18, fontWeight:700, marginBottom:4 }}>Termin bearbeiten</h3>
                <div style={{ fontSize:13, color:"#999", marginBottom: holidays[selectedDate] ? 6 : 12 }}>{fmtDateAT(selectedDate)}</div>
                {holidays[selectedDate] && <div style={{ fontSize:11, color: BRAND.moosgruen, marginBottom:12, fontWeight:500 }}>📅 {holidays[selectedDate]}</div>}
                <div style={{ display:"flex", gap:8, marginBottom:14 }}>
                  {[["booked","Gebucht"],["blocked","Blockiert"],["free","Freigeben"]].map(([v,l]) => (
                    <button key={v} onClick={() => setAdminForm(f=>({...f, type:v}))}
                      style={{ flex:1, padding:"8px 0", border:`2px solid ${adminForm.type===v ? BRAND.lila : "#e0d8de"}`, borderRadius:8, background: adminForm.type===v ? BRAND.lila+"15" : "#fff", color: BRAND.aubergine, fontWeight:600, fontSize:12, cursor:"pointer" }}>
                      {l}
                    </button>
                  ))}
                </div>
                <input placeholder="Bezeichnung (z.B. Hochzeit Müller)" value={adminForm.label} onChange={e => setAdminForm(f=>({...f, label:e.target.value}))} style={inputStyle} />
                <div style={{ display:"flex", gap:6, marginBottom:10, flexWrap:"wrap" }}>
                  {eventTypes.map(t => {
                    const typeLabels = eventTypes.map(x => x.label);
                    return (
                    <button key={t.id} onClick={() => setAdminForm(f=>({...f, eventType:t.id, label: !f.label || typeLabels.includes(f.label) ? t.label : f.label}))}
                      style={{ padding:"5px 10px", border:`1.5px solid ${adminForm.eventType===t.id ? t.color : "#e0d8de"}`, borderRadius:6, background: adminForm.eventType===t.id ? t.color+"15" : "#fff", color: adminForm.eventType===t.id ? t.color : "#999", fontSize:10, fontWeight:600, cursor:"pointer", borderLeft:`3px solid ${t.color}` }}>
                      {t.label}
                    </button>
                    );
                  })}
                </div>
                {adminForm.type === "blocked" && (
                  <label onClick={() => setAdminForm(f=>({...f, allDay:!f.allDay}))}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background: adminForm.allDay ? `${BRAND.lila}10` : "#fff", border:`1.5px solid ${adminForm.allDay ? BRAND.lila : "#e0d8de"}`, borderRadius:10, cursor:"pointer", marginBottom:10, transition:"all .15s" }}>
                    <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${adminForm.allDay ? BRAND.lila : "#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background: adminForm.allDay ? BRAND.lila : "#fff" }}>
                      {adminForm.allDay && <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontWeight:600, fontSize:13, color: BRAND.aubergine }}>Ganztägig</span>
                  </label>
                )}
                {!(adminForm.type === "blocked" && adminForm.allDay) && (() => {
                  return (
                  <>
                  <div style={{ display:"flex", gap:10, marginBottom:10, alignItems:"center" }}>
                    {[["Von","startTime"],["Bis","endTime"]].map(([lbl,field]) => {
                      const timeVal = adminForm[field] || "08:00";
                      return (
                        <div key={field} style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <label style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{lbl}</label>
                          <TimeInput value={timeVal} onChange={v => setAdminForm(f=>({...f,[field]:v}))} />
                        </div>
                      );
                    })}
                  </div>
                  </>
                  );
                })()}
                <label style={{ fontSize:10, color:"#999", fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Interne Notiz</label>
                <textarea placeholder="Notizen zu diesem Termin…" value={adminForm.adminNote} onChange={e => setAdminForm(f=>({...f, adminNote:e.target.value}))} style={{ ...inputStyle, height:70, resize:"vertical", background:"#f8f4f8", borderColor:"#e0d5df" }} />
                <div style={{ marginBottom:10 }}>
                  <label style={{ fontSize:10, color: BRAND.lila, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:6, display:"block" }}>Checkliste</label>
                  <ChecklistNote items={adminForm.checklist||[]} onChange={(items) => setAdminForm(f=>({...f, checklist:items}))} />
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, cursor:"text" }}
                    onClick={e => { const inp = e.currentTarget.querySelector("input"); if(inp) inp.focus(); }}>
                    <span style={{ color:"#ccc", fontSize:16, fontWeight:300, flexShrink:0, width:18, textAlign:"center" }}>+</span>
                    <input placeholder="Hinzufügen…" value={adminForm.newCheckText||""} onChange={e => setAdminForm(f=>({...f, newCheckText:e.target.value}))}
                      onKeyDown={e => { if (e.key==="Enter" && adminForm.newCheckText?.trim()) { setAdminForm(f=>({...f, checklist:[...(f.checklist||[]),{text:f.newCheckText.trim(),done:false}], newCheckText:""})); }}}
                      style={{ border:"none", outline:"none", background:"transparent", fontSize:13, color:BRAND.aubergine, flex:1, padding:"4px 0", fontFamily:"inherit" }} />
                  </div>
                </div>
                <label style={{ fontSize:10, color:"#999", fontWeight:600, display:"block", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Öffentliche Notiz</label>
                <textarea placeholder="Für Kunden sichtbar…" value={adminForm.note} onChange={e => setAdminForm(f=>({...f, note:e.target.value}))} style={{ ...inputStyle, height:50, resize:"vertical" }} />
                <button onClick={handleAdminSave} style={primaryBtn}>Speichern</button>
              </>
            )}

            {/* Customer Form */}
            {modalView === "form" && (() => {
              const et = eventTypes.find(e => e.id === formData.type);
              const isGroup = et?.isGroupTour;
              const nGuests = Number(formData.guests) || 0;
              const nCake = Number(formData.cakeCount) || 0;
              const nCoffee = Number(formData.coffeeCount) || 0;
              const costEntry = nGuests * (et?.pricePerPerson || 9);
              const costCake = nCake * 4.5;
              const costCoffee = nCoffee * 3.1;
              const nTours = formData.tourGuide && nGuests > 0 ? Math.ceil(nGuests / (et?.maxPerTour || 20)) : 0;
              const costGuide = nTours * (et?.guideCost || 80);
              const costTotal = costEntry + costCake + costCoffee + costGuide;
              const price = isGroup ? 0 : (formData.slot.startsWith("halfDay") ? et?.halfDay : et?.fullDay);
              const missingName = !formData.name.trim();
              const missingEmail = !formData.email.trim();
              const invalidEmail = !missingEmail && !/\S+@\S+\.\S+/.test(formData.email);
              const guestsTooLow = isGroup && nGuests < (et?.minPersons || 10);
              const missingGuests = isGroup && !formData.guests;
              const canSubmit = !missingName && !missingEmail && !invalidEmail && (!isGroup || (!missingGuests && !guestsTooLow));
              const sa = submitAttempted;
              const reqStyle = (empty, invalid) => !sa ? inputStyle : invalid ? { ...inputStyle, borderColor:"#c44", background:"#fdf6f6" } : empty ? { ...inputStyle, borderColor:BRAND.aprikot, background:"#fdf8f5" } : inputStyle;
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <div style={{ width:4, height:36, borderRadius:2, background: et?.color || BRAND.lila }} />
                    <div>
                      <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:18, fontWeight:700 }}>{et?.label}</h3>
                      <div style={{ fontSize:13, color: BRAND.lila, fontWeight:500 }}>{fmtDateAT(selectedDate)}</div>
                      {holidays[selectedDate] && <div style={{ display:"inline-block", background:BRAND.aubergine, color:"rgba(255,255,255,0.8)", fontSize:9, borderRadius:3, padding:"2px 6px", marginTop:2 }}>{holidays[selectedDate]}</div>}
                    </div>
                  </div>

                  {isGroup ? (
                    <>
                      {/* 1. Time window */}
                      <div style={{ display:"flex", gap:10, marginBottom:12, marginTop:8, alignItems:"center" }}>
                        {[["Von","tourHour","tourMin"],["Bis","tourEndHour","tourEndMin"]].map(([lbl,hField,mField]) => {
                          const h = Number(formData[hField])||0;
                          const m = Number(formData[mField])||0;
                          const timeVal = String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
                          return (
                            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <label style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{lbl}</label>
                              <TimeInput value={timeVal} accentColor={BRAND.moosgruen} onChange={v => { const [nh,nm]=v.split(":").map(Number); setFormData(f=>({...f,[hField]:nh,[mField]:nm})); }} />
                            </div>
                          );
                        })}
                      </div>

                      {/* 2. Participants */}
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: formData.guests && guestsTooLow ? 4 : 12 }}>
                        <label style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1, flexShrink:0 }}>Personenanzahl</label>
                        <NumInput value={formData.guests} onChange={v => setFormData(f=>({...f, guests:v}))} placeholder="" min={1} color={BRAND.moosgruen} label="Teilnehmeranzahl"
                          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BRAND.moosgruen} strokeWidth="1.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
                          style={formData.guests && guestsTooLow ? { borderColor:"#c44" } : {}} />
                      </div>
                      {formData.guests && guestsTooLow && (
                        <div style={{ fontSize:11, color:"#c44", marginTop:-2, marginBottom:10 }}>Mindestens {et?.minPersons || 10} Teilnehmer erforderlich</div>
                      )}

                      {/* 3. Café */}
                      <div style={{ background:`${BRAND.moosgruen}08`, border:`1px solid ${BRAND.moosgruen}20`, borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:BRAND.moosgruen, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>Café im Paradiesglashaus</div>
                        <div style={{ fontSize:12, color:"#666", lineHeight:1.4, marginBottom:8 }}>Kuchen wird frisch zubereitet – bitte vorab die gewünschte Menge angeben.</div>
                        <div style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
                          <div style={{ flex:1 }}>
                            <label style={{ fontSize:10, color:"#999", fontWeight:600, marginBottom:4, display:"block" }}>Kuchen (à € 4,50)</label>
                            <NumInput value={formData.cakeCount||""} onChange={v => setFormData(f=>({...f, cakeCount:v}))} placeholder="0" min={0} color={BRAND.moosgruen} label="Kuchen" style={{ width:"100%" }} />
                          </div>
                          <div style={{ flex:1 }}>
                            <label style={{ fontSize:10, color:"#999", fontWeight:600, marginBottom:4, display:"block" }}>Kaffee (à € 3,10)</label>
                            <NumInput value={formData.coffeeCount||""} onChange={v => setFormData(f=>({...f, coffeeCount:v}))} placeholder="0" min={0} color={BRAND.moosgruen} label="Kaffee" style={{ width:"100%" }} />
                          </div>
                        </div>
                      </div>

                      {/* 4. Guide checkbox */}
                      <label onClick={() => setFormData(f=>({...f, tourGuide:!f.tourGuide}))}
                        style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"12px 14px", background: formData.tourGuide ? `${BRAND.moosgruen}12` : "#fff", border:`1.5px solid ${formData.tourGuide ? BRAND.moosgruen : "#e0d8de"}`, borderRadius:10, cursor:"pointer", marginBottom:10, transition:"all .15s" }}>
                        <div style={{ width:22, height:22, borderRadius:6, border:`2px solid ${formData.tourGuide ? BRAND.moosgruen : "#ccc"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1, background: formData.tourGuide ? BRAND.moosgruen : "#fff" }}>
                          {formData.tourGuide && <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7l3 3 5-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13, color: BRAND.aubergine }}>Führung mit Gartenexpertin</div>
                          <div style={{ fontSize:11, color:"#888", lineHeight:1.3, marginTop:2 }}>€ {et?.guideCost || 80} pro Führung · max. {et?.maxPerTour || 20} Personen · Dauer ca. 1,5 h</div>
                        </div>
                      </label>

                      {/* Cost overview */}
                      {nGuests > 0 && (
                        <div style={{ background:`${BRAND.aubergine}08`, borderRadius:10, padding:"12px 14px", marginBottom:12, border:`1px solid ${BRAND.aubergine}15` }}>
                          <div style={{ fontSize:11, fontWeight:700, color:BRAND.aubergine, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Voraussichtliche Kosten</div>
                          <div style={{ fontSize:12, color:"#666" }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span>{nGuests} × Eintritt à € {(et?.pricePerPerson || 9).toFixed(2).replace(".",",")}</span><span style={{ fontWeight:600 }}>€ {costEntry.toFixed(2).replace(".",",")}</span>
                            </div>
                            <div style={{ fontSize:10, color:"#999", marginBottom:4, marginTop:-2 }}>mit Kärnten Card kostenlos</div>
                            {nCake > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span>{nCake} × Kuchen à € 4,50</span><span style={{ fontWeight:600 }}>€ {costCake.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {nCoffee > 0 && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span>{nCoffee} × Kaffee à € 3,10</span><span style={{ fontWeight:600 }}>€ {costCoffee.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {formData.tourGuide && <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                              <span>{nTours > 1 ? `${nTours} × Führung` : "Führung mit Gartenexpertin"} à € {et?.guideCost || 80}</span><span style={{ fontWeight:600 }}>€ {costGuide.toFixed(2).replace(".",",")}</span>
                            </div>}
                            {nTours > 1 && <div style={{ fontSize:10, color: BRAND.moosgruen, marginBottom:4, marginTop:-2 }}>
                              {nTours} Führungen nötig (max. {et?.maxPerTour || 20} Personen pro Führung, nacheinander)
                            </div>}
                            <div style={{ borderTop:`1px solid ${BRAND.aubergine}20`, marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:14, color:BRAND.aubergine }}>
                              <span>Gesamt</span><span>€ {costTotal.toFixed(2).replace(".",",")}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Document buttons */}
                      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                        <a href={DOCS.getraenke} target="_blank" rel="noopener noreferrer" className="doc-green" style={{ flex:1, padding:"9px 8px", border:`1.5px solid ${BRAND.moosgruen}40`, borderRadius:8, background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:BRAND.moosgruen, display:"flex", alignItems:"center", justifyContent:"center", gap:5, textDecoration:"none", transition:"all .15s" }}>
                          <span style={{ fontSize:15 }}>📋</span> Getränke- & Kuchenkarte
                        </a>
                        <a href={DOCS.flyer} target="_blank" rel="noopener noreferrer" className="doc-violet" style={{ flex:1, padding:"9px 8px", border:`1.5px solid ${BRAND.lila}40`, borderRadius:8, background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:BRAND.lila, display:"flex", alignItems:"center", justifyContent:"center", gap:5, textDecoration:"none", transition:"all .15s" }}>
                          <span style={{ fontSize:15 }}>📋</span> Garten-Flyer
                        </a>
                      </div>

                      <input placeholder="Ihr Name *" value={formData.name} onChange={e => setFormData(f=>({...f, name:e.target.value}))} style={reqStyle(missingName, false)} />
                      <input placeholder="E-Mail *" type="email" value={formData.email} onChange={e => setFormData(f=>({...f, email:e.target.value}))} style={reqStyle(missingEmail, invalidEmail)} />
                      {sa && invalidEmail && <div style={{ fontSize:11, color:"#c44", marginTop:-6, marginBottom:8 }}>Bitte gültige E-Mail-Adresse eingeben</div>}
                      <input placeholder="Telefon" value={formData.phone} onChange={e => setFormData(f=>({...f, phone:e.target.value}))} style={inputStyle} />
                      <textarea placeholder="Ihre Nachricht / Wünsche" value={formData.message} onChange={e => setFormData(f=>({...f, message:e.target.value}))} style={{ ...inputStyle, height:50, resize:"none" }} />
                      <button onClick={handleCustomerSubmit} style={primaryBtn}>Anfrage senden</button>
                    </>
                  ) : (
                    <>
                      <div style={{ display:"flex", gap:6, marginBottom:8, marginTop:8 }}>
                        {[["halfDayAM","Halbtags","bis 13 Uhr"],["halfDayPM","Halbtags","ab 13 Uhr"],["fullDay","Ganztags","08:00 – 22:00"]].map(([v,l,sub]) => {
                          const isHalf = v.startsWith("halfDay");
                          const priceVal = isHalf ? et?.halfDay : et?.fullDay;
                          return (
                            <button key={v} onClick={() => setFormData(f=>({...f, slot:v}))}
                              style={{ flex:1, padding:"8px 4px", border:`2px solid ${formData.slot===v ? et?.color || BRAND.lila : "#e0d8de"}`, borderRadius:10,
                                background: formData.slot===v ? (et?.color || BRAND.lila)+"12" : "#fff", cursor:"pointer", textAlign:"center" }}>
                              <div style={{ fontWeight:700, fontSize:12, color: BRAND.aubergine }}>{l}</div>
                              <div style={{ fontSize:9, color:"#999" }}>{sub}</div>
                              <div style={{ fontSize:13, fontWeight:700, color: et?.color || BRAND.lila, marginTop:3 }}>
                                {priceVal === 0 ? "auf Anfrage" : fmt(priceVal)}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {formData.type === "sonstiges" && (
                        <div style={{ marginBottom:8 }}>
                          <button onClick={() => setFormData(f=>({...f, slot: f.slot==="custom" ? "fullDay" : "custom"}))}
                            style={{ width:"100%", padding:"8px", border:`2px solid ${formData.slot==="custom" ? et?.color || BRAND.lila : "#e0d8de"}`, borderRadius:10,
                              background: formData.slot==="custom" ? (et?.color || BRAND.lila)+"12" : "#fff", cursor:"pointer", textAlign:"center", marginBottom:6 }}>
                            <div style={{ fontWeight:700, fontSize:12, color: BRAND.aubergine }}>Eigenes Zeitfenster</div>
                          </button>
                          {formData.slot === "custom" && (
                            <div style={{ display:"flex", gap:10, alignItems:"center", marginTop:6 }}>
                              {[["Von","tourHour","tourMin"],["Bis","tourEndHour","tourEndMin"]].map(([lbl,hField,mField]) => {
                                const h = Number(formData[hField])||0;
                                const m = Number(formData[mField])||0;
                                const timeVal = String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
                                return (
                                  <div key={lbl} style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontSize:11, color:"#999", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>{lbl}</span>
                                    <TimeInput value={timeVal} onChange={v => { const [nh,nm]=v.split(":").map(Number); setFormData(f=>({...f,[hField]:nh,[mField]:nm})); }} />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}


                      <div style={{ marginBottom:10 }}>
                        <div onClick={() => setShowTypeSelect(s=>!s)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", padding:"6px 0" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <div style={{ width:3, height:16, borderRadius:2, background: et?.color }} />
                            <span style={{ fontSize:13, fontWeight:600, color:BRAND.aubergine }}>{et?.label}</span>
                          </div>
                          <span style={{ fontSize:11, color: BRAND.lila, fontWeight:600 }}>{showTypeSelect ? "▲ schließen" : "▼ Art ändern"}</span>
                        </div>
                        {showTypeSelect && (
                          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                            {eventTypes.filter(t => !t.isGroupTour).map(t => (
                              <button key={t.id} onClick={() => { setFormData(f=>({...f, type:t.id})); setShowTypeSelect(false); }}
                                style={{ flex:"1 1 calc(33% - 6px)", minWidth:0, padding:"8px 4px", border:`2px solid ${formData.type===t.id ? t.color : "#e0d8de"}`, borderRadius:10,
                                  background: formData.type===t.id ? t.color+"12" : "#fff", cursor:"pointer", textAlign:"center", borderLeft:`4px solid ${t.color}`, transition:"all .15s" }}>
                                <div style={{ fontWeight:700, fontSize:11, color: BRAND.aubergine, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.label}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <input placeholder="Ihr Name *" value={formData.name} onChange={e => setFormData(f=>({...f, name:e.target.value}))} style={reqStyle(missingName, false)} />
                      <input placeholder="E-Mail *" type="email" value={formData.email} onChange={e => setFormData(f=>({...f, email:e.target.value}))} style={reqStyle(missingEmail, invalidEmail)} />
                      {sa && invalidEmail && <div style={{ fontSize:11, color:"#c44", marginTop:-6, marginBottom:8 }}>Bitte gültige E-Mail-Adresse eingeben</div>}
                      <input placeholder="Telefon" value={formData.phone} onChange={e => setFormData(f=>({...f, phone:e.target.value}))} style={inputStyle} />
                      <input placeholder="Anzahl Gäste" type="number" value={formData.guests} onChange={e => setFormData(f=>({...f, guests:e.target.value}))} style={inputStyle} />
                      <textarea placeholder="Ihre Nachricht / Wünsche" value={formData.message} onChange={e => setFormData(f=>({...f, message:e.target.value}))} style={{ ...inputStyle, height:70, resize:"none" }} />
                      {formData.type !== "sonstiges" && (
                        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                          <a href={DOCS.getraenke} target="_blank" rel="noopener noreferrer" className="doc-green" style={{ flex:1, padding:"9px 8px", border:`1.5px solid ${BRAND.moosgruen}40`, borderRadius:8, background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:BRAND.moosgruen, display:"flex", alignItems:"center", justifyContent:"center", gap:5, textDecoration:"none", transition:"all .15s" }}>
                            <span style={{ fontSize:15 }}>📋</span> Getränke- & Kuchenkarte ansehen
                          </a>
                          <a href={DOCS.weinkarte} target="_blank" rel="noopener noreferrer" className="doc-violet" style={{ flex:1, padding:"9px 8px", border:`1.5px solid ${BRAND.aubergine}40`, borderRadius:8, background:"#fff", cursor:"pointer", fontSize:11, fontWeight:600, color:BRAND.aubergine, display:"flex", alignItems:"center", justifyContent:"center", gap:5, textDecoration:"none", transition:"all .15s" }}>
                            <span style={{ fontSize:15 }}>📋</span> Weinkarte ansehen
                          </a>
                        </div>
                      )}
                      <button onClick={handleCustomerSubmit} style={primaryBtn}>Anfrage senden</button>
                    </>
                  )}
                </>
              );
            })()}

            {/* Info View */}
            {modalView === "info" && events[selectedDate] && (() => {
              const ev = events[selectedDate];
              const et = eventTypes.find(e => e.id === ev.type);
              return (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    {et && <div style={{ width:4, height:36, borderRadius:2, background: et.color }} />}
                    <div>
                      <h3 style={{ margin:0, color: BRAND.aubergine, fontSize:18, fontWeight:700 }}>{fmtDateAT(selectedDate)}</h3>
                      <div style={{ display:"inline-block", background: isAdmin ? (ev.status==="booked" ? BRAND.lila : ev.status==="pending" ? BRAND.aprikot : BRAND.moosgruen) : BRAND.lila, color:"#fff", padding:"2px 10px", borderRadius:20, fontSize:10, fontWeight:600, marginTop:2 }}>
                        {isAdmin ? (ev.status==="booked" ? "Gebucht" : ev.status==="pending" ? "Anfrage" : "Blockiert") : "Gebucht"}
                      </div>
                    </div>
                  </div>
                  {holidays[selectedDate] && <div style={{ fontSize:11, color: BRAND.moosgruen, marginBottom:6, fontWeight:500 }}>📅 {holidays[selectedDate]}</div>}

                  {isAdmin ? (
                    <div onClick={() => { setAdminForm({ type: ev.status || "booked", label: ev.label || "", note: ev.note || "", startTime: ev.startTime || "08:00", endTime: ev.endTime || "22:00", adminNote: ev.adminNote || "", eventType: ev.type || "", checklist: ev.checklist || [] }); setEditingTime(null); setModalView("admin"); }}
                      style={{ background:"#f6f2f6", borderRadius:10, padding:"14px 16px", marginBottom:12, cursor:"pointer", border:"1.5px solid transparent", transition:"border .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#e0d8de"} onMouseLeave={e => e.currentTarget.style.borderColor="transparent"}>
                      {ev.label && <div style={{ fontSize:15, fontWeight:700, color: BRAND.aubergine, marginBottom:4 }}>{ev.label}</div>}
                      {ev.slotLabel && <div style={{ fontSize:13, color:"#666", marginBottom:4 }}><ClockIcon />{ev.slotLabel}</div>}
                      {ev.name && <div style={{ fontSize:13, color:"#666", marginBottom:2 }}>👤 {ev.name}{ev.email ? <> · <a href={`mailto:${ev.email}`} onClick={e=>e.stopPropagation()} style={{ color: BRAND.lila, textDecoration:"none" }}>{ev.email}</a></> : ""}</div>}
                      {ev.phone && <div style={{ fontSize:13, color:"#666", marginBottom:2 }}>📞 <a href={`tel:${ev.phone.replace(/\s/g,"")}`} onClick={e=>e.stopPropagation()} style={{ color: BRAND.lila, textDecoration:"none" }}>{ev.phone}</a></div>}
                      {ev.guests && <div style={{ fontSize:13, color:"#666", marginBottom:2 }}>👥 {ev.guests} {ev.type==="gruppenfuehrung" ? "Teilnehmer" : "Gäste"}</div>}
                      {ev.tourGuide && <div style={{ fontSize:13, color:BRAND.moosgruen, marginBottom:2, fontWeight:600 }}>🌿 Führung mit Gartenexpertin (€ {(eventTypes.find(t=>t.id==="gruppenfuehrung")?.guideCost)||80})</div>}
                      {(Number(ev.cakeCount)>0 || Number(ev.coffeeCount)>0) && (
                        <div style={{ fontSize:12, color:"#666", marginBottom:2 }}>
                          ☕ {Number(ev.coffeeCount)||0}× Kaffee · 🍰 {Number(ev.cakeCount)||0}× Kuchen
                        </div>
                      )}
                      {ev.message && <div style={{ fontSize:12, color:"#888", marginTop:4, fontStyle:"italic" }}>„{ev.message}"</div>}
                      {ev.adminNote && (
                        <div style={{ marginTop:8, padding:"8px 10px", background:"#f8f4f8", borderRadius:6, borderLeft:`3px solid ${BRAND.aprikot}` }}>
                          <div style={{ fontSize:10, color: BRAND.aprikot, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:2 }}>Interne Notiz</div>
                          <div style={{ fontSize:12, color:"#666" }}>{ev.adminNote}</div>
                        </div>
                      )}
                      {ev.checklist && ev.checklist.length > 0 && (
                        <div style={{ marginTop:8, padding:"8px 10px", background:"#f8f4f8", borderRadius:6, borderLeft:`3px solid ${BRAND.aprikot}` }}
                          onClick={e => e.stopPropagation()}>
                          <div style={{ fontSize:10, color: BRAND.aprikot, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>Checkliste</div>
                          <ChecklistNote items={ev.checklist} onChange={(items) => {
                            const updated = { ...events, [selectedDate]: { ...events[selectedDate], checklist: items } };
                            saveEvents(updated);
                          }} />
                        </div>
                      )}
                      {ev.note && <div style={{ fontSize:12, color:"#999", marginTop:6 }}>Öffentlich: {ev.note}</div>}
                      <div style={{ fontSize:10, color:"#bbb", marginTop:8, textAlign:"center" }}>Antippen zum Bearbeiten</div>
                    </div>
                  ) : (
                    <div style={{ padding:"16px 0" }}>
                      <div style={{ fontSize:14, color: BRAND.aubergine, fontWeight:600, marginBottom:4 }}>Dieser Termin ist bereits vergeben.</div>
                      {ev.note && <div style={{ fontSize:13, color:"#888", marginTop:4 }}>{ev.note}</div>}
                      <div style={{ fontSize:13, color:"#999", marginTop:8, marginBottom:12 }}>Wählen Sie ein anderes freies Datum oder kontaktieren Sie uns direkt:</div>
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

                  {isAdmin && ev.status === "pending" && (
                    <div style={{ borderRadius:10, padding:"14px 16px", marginBottom:10, border:`1.5px solid ${BRAND.aprikot}25` }}>
                      <div style={{ fontSize:12, color: BRAND.aprikot, marginBottom:10, textAlign:"center" }}>Diese Anfrage wartet auf Ihre Bestätigung</div>
                      <div style={{ display:"flex", gap:10 }}>
                        <button onClick={() => handleAdminAction(selectedDate,"confirm")}
                          style={{ ...primaryBtn, flex:1, background: BRAND.moosgruen, fontSize:14, padding:"11px 0", borderRadius:8 }}>Annehmen</button>
                        <button onClick={() => handleAdminAction(selectedDate,"delete")}
                          style={{ ...primaryBtn, flex:1, background:"#f5f0f4", color: BRAND.aubergine, fontSize:14, padding:"11px 0", borderRadius:8, border:`1px solid #e0d8de` }}>Ablehnen</button>
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={() => { setAdminForm({ type: ev.status || "booked", label: ev.label || "", note: ev.note || "", startTime: ev.startTime || "08:00", endTime: ev.endTime || "22:00", adminNote: ev.adminNote || "", eventType: ev.type || "", allDay: ev.allDay || false, checklist: ev.checklist || [] }); setEditingTime(null); setModalView("admin"); }} style={{ ...primaryBtn, flex:1, background: BRAND.aubergine, fontSize:12 }}>Bearbeiten</button>
                      {ev.status !== "pending" && <button onClick={() => handleAdminAction(selectedDate,"delete")}
                        onMouseEnter={e => { e.target.style.background="#f8d0d0"; e.target.style.color="#c44"; }}
                        onMouseLeave={e => { e.target.style.background="#ddd"; e.target.style.color="#666"; }}
                        style={{ ...primaryBtn, flex:1, background:"#ddd", color:"#666", fontSize:12, transition:"all .15s" }}>Löschen</button>}
                    </div>
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
              style={{ width:"100%", padding:10, border:"none", background:"transparent", color:"#aaa", cursor:"pointer", fontSize:13, marginTop:8, borderRadius:8, transition:"all .15s" }}>
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
        input[type="time"] { -webkit-appearance: none; }
        input[type="time"]:focus { border-color: ${BRAND.aubergine}60 !important; box-shadow: 0 0 0 2px ${BRAND.aubergine}15 !important; }
        input[type="time"]::-webkit-datetime-edit { padding: 0; }
        input:focus, textarea:focus { border-color: ${BRAND.aubergine}60 !important; box-shadow: 0 0 0 2px ${BRAND.aubergine}10 !important; }
        .admin-card { transition: all .15s ease; }
        .doc-green, .doc-violet { transition: all .15s ease; }
        @media (hover: hover) and (pointer: fine) {
          button:hover { filter: brightness(0.97) }
          .evt-card:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.10) !important; border-left-width: 4px !important; background: color-mix(in srgb, var(--card-color) 6%, #fff) !important; }
          .day-free:hover { background: rgba(0,154,147,0.08) !important; border-color: rgba(0,154,147,0.3) !important; }
          .day-booked:hover { background: rgba(144,52,134,0.08) !important; border-color: rgba(144,52,134,0.25) !important; }
          .admin-card:hover { background: rgba(144,52,134,0.05) !important; border-left-color: ${BRAND.lila} !important; box-shadow: 0 2px 8px rgba(88,8,74,0.08) !important; }
          .admin-card:hover .card-delete { opacity: 1 !important; }
          .card-delete:hover { background: rgba(204,68,68,0.1) !important; }
          .doc-green:hover { background: ${BRAND.moosgruen}12 !important; border-color: ${BRAND.moosgruen}80 !important; }
          .doc-violet:hover { background: ${BRAND.lila}12 !important; border-color: ${BRAND.lila}80 !important; }
        }
      `}</style>
    </div>
  );
}

const navBtn = { width:44, height:44, borderRadius:"50%", border:`2px solid ${BRAND.aubergine}20`, background:"#fff", color:BRAND.aubergine, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1, padding:0, textAlign:"center" };
const inputStyle = { width:"100%", padding:"10px 14px", border:"1.5px solid #e0d8de", borderRadius:8, fontSize:16, marginBottom:10, outline:"none", fontFamily:"inherit", boxSizing:"border-box", color: BRAND.aubergine };
const primaryBtn = { width:"100%", padding:"12px 0", background: BRAND.aubergine, color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", letterSpacing:1 };
const smallBtn = { width:32, height:32, borderRadius:8, border:"none", color:"#fff", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };
