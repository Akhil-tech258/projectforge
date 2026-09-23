// =============================================================
// PROJECTFORGE — SHARED APP UTILITIES
// Used on every authenticated (app-shell) page.
// =============================================================

import { auth, db, isFirebaseConfigured } from "./firebase-config.js";
import { DEMO_USER } from "./demo-data.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------------------------------------------------------
   Theme (shared with marketing pages via localStorage key)
--------------------------------------------------------------- */
export function initTheme() {
  const stored = localStorage.getItem("pf-theme");
  if (stored === "light") document.documentElement.setAttribute("data-theme", "light");

  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;
  updateToggleIcon(toggle);
  toggle.addEventListener("click", () => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    if (isLight) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("pf-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("pf-theme", "light");
    }
    updateToggleIcon(toggle);
  });
}
function updateToggleIcon(toggle) {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  toggle.innerHTML = `<i class="fa-solid ${isLight ? "fa-moon" : "fa-sun"}"></i>`;
}

/* ---------------------------------------------------------------
   Sidebar (mobile) toggle
--------------------------------------------------------------- */
export function initSidebar() {
  const btn = document.querySelector(".nav-toggle-mobile");
  const sidebar = document.querySelector(".sidebar");
  if (!btn || !sidebar) return;
  btn.addEventListener("click", () => sidebar.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });
}

/* ---------------------------------------------------------------
   Toasts
--------------------------------------------------------------- */
let toastStack;
function ensureToastStack() {
  if (toastStack) return toastStack;
  toastStack = document.createElement("div");
  toastStack.className = "toast-stack";
  document.body.appendChild(toastStack);
  return toastStack;
}

const TOAST_ICONS = {
  success: "fa-circle-check",
  error: "fa-circle-exclamation",
  info: "fa-circle-info"
};

export function showToast(message, type = "info", duration = 4200) {
  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${escapeHTML(message)}</span>`;
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all .2s ease";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}

/* ---------------------------------------------------------------
   Auth gate — call at the top of every protected page.
   Shows a full-screen loader until Firebase resolves auth state,
   then redirects to login if unauthenticated, or reveals the page
   and resolves with { user, profile } if authenticated.
--------------------------------------------------------------- */
export function requireAuth() {
  return new Promise((resolve) => {
    // If guest demo session is active or Firebase is unconfigured, provide demo user immediately
    const isGuest = sessionStorage.getItem("projectforge_guest_demo") === "true";
    if (isGuest || !isFirebaseConfigured) {
      populateUserChip(DEMO_USER, { role: DEMO_USER.role, name: DEMO_USER.displayName });
      resolve({ user: DEMO_USER, profile: { role: DEMO_USER.role, name: DEMO_USER.displayName } });
      return;
    }

    const gate = document.createElement("div");
    gate.className = "auth-gate";
    gate.innerHTML = `<div class="forge-spinner"></div><p class="text-secondary" style="font-size:.85rem">Loading ProjectForge…</p>`;
    document.body.appendChild(gate);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "login.html";
        return;
      }
      let profile = null;
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) profile = snap.data();
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
      gate.remove();
      populateUserChip(user, profile);
      resolve({ user, profile });
    });
  });
}

function populateUserChip(user, profile) {
  const nameEl = document.querySelector("[data-user-name]");
  const roleEl = document.querySelector("[data-user-role]");
  const avatarEls = document.querySelectorAll("[data-user-avatar]");
  const displayName = profile?.name || user.displayName || user.email.split("@")[0];

  if (nameEl) nameEl.textContent = displayName;
  if (roleEl) roleEl.textContent = profile?.role === "admin" ? "Admin" : "Member";
  avatarEls.forEach((el) => {
    if (profile?.photoURL || user.photoURL) {
      el.innerHTML = `<img src="${profile?.photoURL || user.photoURL}" alt="${escapeHTML(displayName)}">`;
    } else {
      el.textContent = initials(displayName);
    }
  });
}

export function initLogout() {
  document.querySelectorAll("[data-logout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      sessionStorage.removeItem("projectforge_guest_demo");
      try {
        await signOut(auth);
      } catch (err) {
        // guest mode
      }
      window.location.href = "login.html";
    });
  });
}

/* ---------------------------------------------------------------
   Small helpers
--------------------------------------------------------------- */
export function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function timeAgo(date) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const steps = [
    [60, "s"], [60, "m"], [24, "h"], [7, "d"], [4.345, "w"], [12, "mo"], [Number.POSITIVE_INFINITY, "y"]
  ];
  let value = seconds, unit = "s";
  for (const [div, label] of steps) {
    if (value < div) { unit = label; break; }
    value = Math.floor(value / div);
    unit = label;
  }
  if (seconds < 60) return "just now";
  return `${value}${unit} ago`;
}

export function formatDate(date, opts = { month: "short", day: "numeric" }) {
  if (!date) return "";
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString("en-US", opts);
}

export function isOverdue(date) {
  if (!date) return false;
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.getTime() < Date.now();
}

/* ---------------------------------------------------------------
   Mark active sidebar link based on current path
--------------------------------------------------------------- */
export function markActiveNav() {
  const path = window.location.pathname.split("/").pop() || "dashboard.html";
  document.querySelectorAll(".side-link[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === path);
  });
}

/* Auto-init shell basics on any page that includes this module */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initSidebar();
  initLogout();
  markActiveNav();
});
