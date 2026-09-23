// =============================================================
// PROJECTFORGE — ANALYTICS
// Deeper charts than the dashboard: progress by project, task
// status breakdown, and weekly/monthly completion trend.
// =============================================================

import { db } from "./firebase-config.js";
import { collection, collectionGroup, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHTML } from "./app.js";

let charts = {};

export function initAnalyticsPage(user) {
  const container = document.getElementById("analytics-root");
  if (!container || !window.Chart) return;

  const q = query(collection(db, "projects"), where("memberIds", "array-contains", user.uid));
  onSnapshot(q, (snap) => {
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.archived);
    renderProgressChart(projects);
    renderStatusChart(projects);
    renderPriorityChart(projects);
    renderProjectTable(projects);
  });
}

function destroy(key) {
  if (charts[key]) charts[key].destroy();
}

function renderProgressChart(projects) {
  const canvas = document.getElementById("chart-progress");
  if (!canvas) return;
  destroy("progress");

  const top = [...projects].sort((a, b) => (b.taskCount || 0) - (a.taskCount || 0)).slice(0, 6);
  charts.progress = new Chart(canvas, {
    type: "bar",
    data: {
      labels: top.map((p) => truncate(p.name, 14)),
      datasets: [
        { label: "Completed", data: top.map((p) => p.completedTaskCount || 0), backgroundColor: "#35D19E" },
        { label: "Remaining", data: top.map((p) => Math.max((p.taskCount || 0) - (p.completedTaskCount || 0), 0)), backgroundColor: "#7C5CFF" }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#9BA1C4" } } },
      scales: {
        x: { stacked: true, ticks: { color: "#666E97" }, grid: { display: false } },
        y: { stacked: true, ticks: { color: "#666E97" }, grid: { color: "rgba(255,255,255,0.05)" } }
      }
    }
  });
}

function renderStatusChart(projects) {
  const canvas = document.getElementById("chart-status");
  if (!canvas) return;
  destroy("status");

  const active = projects.filter((p) => p.status !== "completed").length;
  const completed = projects.filter((p) => p.status === "completed").length;

  charts.status = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Active", "Completed"],
      datasets: [{ data: [active, completed], backgroundColor: ["#22D3EE", "#35D19E"], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "#9BA1C4" } } }
    }
  });
}

function renderPriorityChart(projects) {
  const canvas = document.getElementById("chart-priority");
  if (!canvas) return;
  destroy("priority");

  const counts = { high: 0, medium: 0, low: 0 };
  projects.forEach((p) => { if (counts[p.priority] !== undefined) counts[p.priority]++; });

  charts.priority = new Chart(canvas, {
    type: "pie",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{ data: [counts.high, counts.medium, counts.low], backgroundColor: ["#FF5470", "#F5B94A", "#35D19E"], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: "#9BA1C4" } } }
    }
  });
}

function renderProjectTable(projects) {
  const tbody = document.getElementById("analytics-table-body");
  if (!tbody) return;
  if (!projects.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:var(--space-6);text-align:center;color:var(--text-tertiary);">No projects yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = projects.map((p) => {
    const total = p.taskCount || 0;
    const done = p.completedTaskCount || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
    <tr style="border-bottom:1px solid var(--border);">
      <td style="padding:.8rem;">${escapeHTML(p.name)}</td>
      <td style="padding:.8rem;">${done}/${total}</td>
      <td style="padding:.8rem;">
        <div class="progress-track" style="width:100px;"><div class="progress-fill" style="width:${pct}%"></div></div>
      </td>
      <td style="padding:.8rem;"><span class="priority-badge priority-${p.priority || "medium"}">${p.priority || "medium"}</span></td>
    </tr>`;
  }).join("");
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
