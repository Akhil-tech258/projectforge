// =============================================================
// PROJECTFORGE — MARKETING PAGES SHARED BEHAVIOR
// Theme toggle, navbar scroll state, mobile nav, FAQ accordion,
// and the contact form submit handler. No Firebase needed here.
// =============================================================

import { API_BASE_URL } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initNavbarScroll();
  initMobileNav();
  initFAQAccordion();
  initContactForm();
});

function initTheme() {
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

function initNavbarScroll() {
  const nav = document.querySelector(".navbar");
  if (!nav) return;
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 20);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initMobileNav() {
  const btn = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => links.classList.toggle("open"));
}

function initFAQAccordion() {
  document.querySelectorAll(".faq-item").forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question) return;
    question.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach((el) => el.classList.remove("open"));
      if (!wasOpen) item.classList.add("open");
    });
  });
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  const alertEl = document.getElementById("contact-alert");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (alertEl) alertEl.classList.remove("show");
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const payload = {
      name: document.getElementById("contact-name").value.trim(),
      email: document.getElementById("contact-email").value.trim(),
      subject: document.getElementById("contact-subject").value.trim(),
      message: document.getElementById("contact-message").value.trim()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      form.reset();
      if (alertEl) {
        alertEl.textContent = data.message || "Thanks — we'll get back to you soon.";
        alertEl.className = "form-alert success show";
      }
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message || "Couldn't send your message. Please try again.";
        alertEl.className = "form-alert error show";
      }
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}
