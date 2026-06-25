// =====================================================================
// Havain Support — app.js
//
// Real-time global counter backed by Firebase Firestore.
// If no Firebase project is configured yet, the page automatically
// falls back to a local "demo mode" (per-browser, via localStorage)
// so you can preview and test everything before wiring up the database.
// See README.md for the 5-minute Firebase setup.
// =====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------------------------------------------------------------------
// 1. CONFIGURE YOUR FIREBASE PROJECT HERE
//    Replace every value below with the config object Firebase gives you
//    when you create a Web App (Firebase Console → Project settings →
//    Your apps → Web). Full step-by-step instructions are in README.md.
// ---------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCj83oscbLH1tUHWbkhl7HonrQ9P9vN-nA",
  authDomain: "support-the-havain.firebaseapp.com",
  projectId: "support-the-havain",
  storageBucket: "support-the-havain.firebasestorage.app",
  messagingSenderId: "748340373310",
  appId: "1:748340373310:web:09b24fd4777a5a0d722e6f",
};

const DEMO_MODE = firebaseConfig.apiKey === "YOUR_API_KEY";

// ---------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------
const dial = document.getElementById("supportBtn");
const counterValueEl = document.getElementById("counterValue");
const dailyValueEl = document.getElementById("dailyValue");
const toastEl = document.getElementById("thankYouToast");
const statusPill = document.getElementById("statusPill");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const themeToggle = document.getElementById("themeToggle");
const yearEl = document.getElementById("year");

yearEl.textContent = new Date().getFullYear();

// ---------------------------------------------------------------------
// Theme: respects saved preference, then system preference
// ---------------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("havain-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}
initTheme();

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("havain-theme", next);
});

// ---------------------------------------------------------------------
// Status pill helper
// ---------------------------------------------------------------------
let statusHideTimer = null;
function setStatus(text, kind) {
  statusText.textContent = text;
  statusDot.className = "status-dot" + (kind ? " " + kind : "");
  statusPill.classList.add("visible");
  clearTimeout(statusHideTimer);
  if (kind === "ok") {
    statusHideTimer = setTimeout(() => statusPill.classList.remove("visible"), 2200);
  }
}

// ---------------------------------------------------------------------
// Animated counter (rolls smoothly toward target, formats with commas)
// ---------------------------------------------------------------------
let displayedValue = null;
let animFrame = null;

function formatNumber(n) {
  return Math.round(n).toLocaleString("en-US");
}

function animateCounterTo(target) {
  if (displayedValue === null) {
    displayedValue = target;
    counterValueEl.textContent = formatNumber(target);
    return;
  }
  cancelAnimationFrame(animFrame);
  const start = displayedValue;
  const diff = target - start;
  if (diff === 0) return;
  const duration = Math.min(900, 250 + Math.abs(diff) * 12);
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = start + diff * eased;
    counterValueEl.textContent = formatNumber(current);
    if (progress < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      displayedValue = target;
      counterValueEl.textContent = formatNumber(target);
    }
  }
  animFrame = requestAnimationFrame(step);
}

function setDailyValue(n) {
  dailyValueEl.textContent = formatNumber(n);
}

// ---------------------------------------------------------------------
// Thank-you toast
// ---------------------------------------------------------------------
let toastTimer = null;
function showThankYou() {
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// ---------------------------------------------------------------------
// Backend: Firestore mode
// ---------------------------------------------------------------------
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

let incrementSupport;

if (!DEMO_MODE) {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const globalRef = doc(db, "stats", "global");
  const dailyRef = doc(db, "dailyStats", todayKey());

  setStatus("Connecting…", "busy");

  onSnapshot(
    globalRef,
    (snap) => {
      const total = snap.exists() ? snap.data().totalLikes || 0 : 0;
      animateCounterTo(total);
      setStatus("Live", "ok");
    },
    (err) => {
      console.error("Global counter listener error:", err);
      setStatus("Connection issue — retrying", "err");
    }
  );

  onSnapshot(
    dailyRef,
    (snap) => {
      const count = snap.exists() ? snap.data().count || 0 : 0;
      setDailyValue(count);
    },
    (err) => console.error("Daily stats listener error:", err)
  );

  incrementSupport = async function () {
    await runTransaction(db, async (tx) => {
      const globalSnap = await tx.get(globalRef);
      const currentTotal = globalSnap.exists() ? globalSnap.data().totalLikes || 0 : 0;
      tx.set(
        globalRef,
        { totalLikes: currentTotal + 1, updatedAt: serverTimestamp() },
        { merge: true }
      );

      const dailySnap = await tx.get(dailyRef);
      const currentDaily = dailySnap.exists() ? dailySnap.data().count || 0 : 0;
      tx.set(
        dailyRef,
        { count: currentDaily + 1, date: todayKey(), updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  };
} else {
  // -------------------------------------------------------------------
  // Backend: Demo mode (localStorage only — per browser, not global)
  // -------------------------------------------------------------------
  console.warn(
    "[Havain Support] Running in DEMO MODE: counts are stored only in this browser " +
      "(localStorage), not in a shared online database. Configure Firebase in app.js " +
      "and see README.md to make the counter truly global."
  );
  setStatus("Demo mode — see README to connect a database", "err");

  function readLocal(key) {
    return Number(localStorage.getItem(key) || 0);
  }
  function writeLocal(key, value) {
    localStorage.setItem(key, String(value));
  }

  const dailyKey = "havain-demo-daily-" + todayKey();
  animateCounterTo(readLocal("havain-demo-total"));
  setDailyValue(readLocal(dailyKey));

  incrementSupport = async function () {
    const total = readLocal("havain-demo-total") + 1;
    const daily = readLocal(dailyKey) + 1;
    writeLocal("havain-demo-total", total);
    writeLocal(dailyKey, daily);
    animateCounterTo(total);
    setDailyValue(daily);
  };
}

// ---------------------------------------------------------------------
// Hold-to-support interaction (3 seconds)
// ---------------------------------------------------------------------
const HOLD_DURATION = 3000;
let holdTimer = null;
let holding = false;

function startHold(e) {
  if (holding) return;
  holding = true;
  dial.classList.remove("complete");
  dial.classList.add("charging");

  holdTimer = setTimeout(async () => {
    holding = false;
    dial.classList.remove("charging");
    dial.classList.add("complete");
    setStatus("Saving your support…", "busy");
    try {
      await incrementSupport();
      setStatus(DEMO_MODE ? "Saved locally (demo mode)" : "Saved", "ok");
      showThankYou();
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (err) {
      console.error("Failed to record support:", err);
      setStatus("Couldn't save — please try again", "err");
    }
    setTimeout(() => dial.classList.remove("complete"), 650);
  }, HOLD_DURATION);
}

function cancelHold() {
  if (!holding) return;
  holding = false;
  clearTimeout(holdTimer);
  dial.classList.remove("charging");
}

dial.addEventListener("pointerdown", startHold);
dial.addEventListener("pointerup", cancelHold);
dial.addEventListener("pointerleave", cancelHold);
dial.addEventListener("pointercancel", cancelHold);
dial.addEventListener("contextmenu", (e) => e.preventDefault());

// keyboard accessibility: hold Space/Enter for 3 seconds too
dial.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
    startHold(e);
  }
});
dial.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "Enter") cancelHold();
});
