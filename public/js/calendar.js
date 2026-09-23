// =============================================================
// PROJECTFORGE — CALENDAR
// A month-grid calendar that plots project deadlines. Task-level
// due dates are shown when a project is opened; this view gives
// the cross-project overview called for in the spec.
// =============================================================

import { db, isFirebaseConfigured } from "./firebase-config.js";
import { DEMO_PROJECTS } from "./demo-data.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHTML } from "./app.js";

let viewDate = new Date();
let events = [];

export function initCalendarPage(user) {
  const grid = document.getElementById("calendar-grid");
  if (!grid) return;

  document.getElementById("cal-prev")?.addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); });
  document.getElementById("cal-next")?.addEventListener("click", () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); });
  document.getElementById("cal-today")?.addEventListener("click", () => { viewDate = new Date(); render(); });

  if (!isFirebaseConfigured || user.uid === "demo-guest-user") {
    events = DEMO_PROJECTS
      .filter((p) => p.deadline)
      .map((p) => ({
        date: new Date(p.deadline),
        title: p.name,
        color: p.color || "#7C5CFF",
        projectId: p.id
      }));
    render();
    return;
  }

  const q = query(collection(db, "projects"), where("memberIds", "array-contains", user.uid));
  onSnapshot(q, (snap) => {
    events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => p.deadline)
      .map((p) => ({
        date: p.deadline.toDate ? p.deadline.toDate() : new Date(p.deadline),
        title: p.name,
        color: p.color || "#7C5CFF",
        projectId: p.id
      }));
    render();
  }, (err) => {
    console.error(err);
    events = DEMO_PROJECTS
      .filter((p) => p.deadline)
      .map((p) => ({
        date: new Date(p.deadline),
        title: p.name,
        color: p.color || "#7C5CFF",
        projectId: p.id
      }));
    render();
  });

  render();
}

function render() {
  const grid = document.getElementById("calendar-grid");
  const label = document.getElementById("cal-month-label");
  if (!grid) return;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  if (label) label.textContent = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let cells = "";
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => {
    cells += `<div style="text-align:center;font-size:.72rem;color:var(--text-tertiary);padding:.5rem 0;font-weight:600;">${d}</div>`;
  });
  for (let i = 0; i < startOffset; i++) cells += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const isToday = cellDate.toDateString() === today.toDateString();
    const dayEvents = events.filter((e) => e.date.toDateString() === cellDate.toDateString());

    cells += `
    <div class="glass" style="min-height:86px;padding:.5rem;border-radius:var(--radius-sm);${isToday ? "border-color:var(--violet);" : ""}">
      <div style="font-size:.75rem;font-weight:${isToday ? "700" : "500"};color:${isToday ? "var(--violet)" : "var(--text-secondary)"};margin-bottom:.3rem;">${day}</div>
      ${dayEvents.map((e) => `<a href="project-details.html?id=${e.projectId}" style="display:block;font-size:.65rem;padding:.15rem .4rem;border-radius:4px;background:${e.color}22;color:${e.color};margin-bottom:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHTML(e.title)}">${escapeHTML(e.title)}</a>`).join("")}
    </div>`;
  }

  grid.innerHTML = cells;
}
