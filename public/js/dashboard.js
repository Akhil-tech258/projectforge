// =============================================================
// PROJECTFORGE — DASHBOARD
// Aggregates the signed-in user's projects/tasks into stat cards,
// a Chart.js productivity chart, and a recent activity feed.
// =============================================================

import { db, isFirebaseConfigured } from "./firebase-config.js";
import { DEMO_PROJECTS, DEMO_ACTIVITIES } from "./demo-data.js";
import {
  collection, collectionGroup, query, where, onSnapshot, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast, initials, timeAgo, formatDate, escapeHTML, isOverdue } from "./app.js";

export function initDashboard(user) {
  const els = {
    totalProjects: document.getElementById("stat-total-projects"),
    activeProjects: document.getElementById("stat-active-projects"),
    completedProjects: document.getElementById("stat-completed-projects"),
    pendingTasks: document.getElementById("stat-pending-tasks"),
    dueToday: document.getElementById("stat-due-today"),
    teamMembers: document.getElementById("stat-team-members")
  };

  document.querySelectorAll("[data-welcome-name]").forEach((el) => {
    el.textContent = (user.displayName || user.email.split("@")[0]).split(" ")[0];
  });

  if (!isFirebaseConfigured || user.uid === "demo-guest-user") {
    renderStats(DEMO_PROJECTS, els);
    renderMiniProjects(DEMO_PROJECTS);
    renderChart(DEMO_PROJECTS);
    if (els.teamMembers) els.teamMembers.textContent = "6";
    renderDemoActivities();
    return;
  }

  const projectsQuery = query(collection(db, "projects"), where("memberIds", "array-contains", user.uid));
  onSnapshot(projectsQuery, (snap) => {
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderStats(projects, els);
    renderMiniProjects(projects);
    renderChart(projects);

    const memberIds = new Set();
    projects.forEach((p) => (p.memberIds || []).forEach((id) => memberIds.add(id)));
    if (els.teamMembers) els.teamMembers.textContent = memberIds.size;
  }, (err) => {
    console.error(err);
    renderStats(DEMO_PROJECTS, els);
    renderMiniProjects(DEMO_PROJECTS);
    renderChart(DEMO_PROJECTS);
    if (els.teamMembers) els.teamMembers.textContent = "6";
    renderDemoActivities();
  });

  listenRecentActivity(user);
}

function renderDemoActivities() {
  const container = document.getElementById("dashboard-activity-feed");
  if (!container) return;
  container.innerHTML = DEMO_ACTIVITIES.map((a) => `
    <div class="activity-item" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid var(--border);">
      <div class="activity-icon" style="width:32px;height:32px;border-radius:50%;background:rgba(124,92,255,0.15);color:var(--violet);display:flex;align-items:center;justify-content:center;font-size:0.85rem;"><i class="fa-solid fa-bolt"></i></div>
      <div class="activity-meta" style="flex:1;min-width:0;">
        <div style="font-size:0.85rem;"><strong style="color:var(--text-primary);">${escapeHTML(a.userName)}</strong> <span style="color:var(--text-secondary);">${escapeHTML(a.action)}</span> <span style="color:var(--cyan);font-weight:500;">${escapeHTML(a.target)}</span></div>
        <div style="font-size:0.72rem;color:var(--text-tertiary);margin-top:2px;">${a.time}</div>
      </div>
    </div>
  `).join("");
}

function renderStats(projects, els) {
  const active = projects.filter((p) => !p.archived && p.status !== "completed");
  const completed = projects.filter((p) => p.status === "completed");
  const pendingTasks = projects.reduce((sum, p) => sum + Math.max((p.taskCount || 0) - (p.completedTaskCount || 0), 0), 0);

  if (els.totalProjects) animateNumber(els.totalProjects, projects.length);
  if (els.activeProjects) animateNumber(els.activeProjects, active.length);
  if (els.completedProjects) animateNumber(els.completedProjects, completed.length);
  if (els.pendingTasks) animateNumber(els.pendingTasks, pendingTasks);

  const dueTodayCount = projects.filter((p) => p.deadline && isDueToday(p.deadline)).length;
  if (els.dueToday) animateNumber(els.dueToday, dueTodayCount);
}

function isDueToday(date) {
  const d = date.toDate ? date.toDate() : new Date(date);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function animateNumber(el, target) {
  const start = parseInt(el.textContent, 10) || 0;
  const duration = 600;
  const startTime = performance.now();
  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round(start + (target - start) * progress);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderMiniProjects(projects) {
  const container = document.getElementById("dashboard-recent-projects");
  if (!container) return;
  const recent = [...projects].filter((p) => !p.archived).slice(0, 4);

  if (!recent.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><h4>No projects yet</h4><p>Create your first project to get started.</p><a href="projects.html" class="btn btn-primary"><span class="btn-label">New project</span></a></div>`;
    return;
  }

  container.innerHTML = recent.map((p) => {
    const total = p.taskCount || 0;
    const done = p.completedTaskCount || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `
    <a href="project-details.html?id=${p.id}" style="display:flex;align-items:center;gap:.9rem;padding:.8rem 0;border-bottom:1px solid var(--border);">
      <span class="project-tag-dot" style="background:${p.color || "#7C5CFF"};width:10px;height:10px;flex-shrink:0;"></span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:var(--fs-sm);font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(p.name)}</div>
        <div class="progress-track" style="margin-top:.4rem;"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <span style="font-size:.72rem;color:var(--text-tertiary);flex-shrink:0;">${pct}%</span>
    </a>`;
  }).join("");
}

let chartInstance = null;
function renderChart(projects) {
  const canvas = document.getElementById("productivity-chart");
  if (!canvas || !window.Chart) return;

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const labels = days.map((d) => d.toLocaleDateString("en-US", { weekday: "short" }));

  // Approximate completed-vs-created trend from available aggregate counts
  // (a full event-sourced burndown would read from an `activities` collection).
  const totalCompleted = projects.reduce((s, p) => s + (p.completedTaskCount || 0), 0);
  const totalTasks = projects.reduce((s, p) => s + (p.taskCount || 0), 0);
  const completedSeries = distributeAcrossWeek(totalCompleted);
  const createdSeries = distributeAcrossWeek(totalTasks);

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Tasks completed", data: completedSeries, borderColor: "#35D19E", backgroundColor: "rgba(53,209,158,0.12)", tension: 0.4, fill: true },
        { label: "Tasks created", data: createdSeries, borderColor: "#7C5CFF", backgroundColor: "rgba(124,92,255,0.1)", tension: 0.4, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#9BA1C4", usePointStyle: true } } },
      scales: {
        x: { ticks: { color: "#666E97" }, grid: { color: "rgba(255,255,255,0.05)" } },
        y: { ticks: { color: "#666E97" }, grid: { color: "rgba(255,255,255,0.05)" }, beginAtZero: true }
      }
    }
  });
}

function distributeAcrossWeek(total) {
  if (!total) return Array(7).fill(0);
  const weights = [0.08, 0.1, 0.14, 0.12, 0.16, 0.2, 0.2];
  let remaining = total;
  const values = weights.map((w, i) => {
    const v = i === weights.length - 1 ? remaining : Math.round(total * w);
    remaining -= v;
    return Math.max(v, 0);
  });
  return values;
}

/* ---------------------------------------------------------------
   Recent activity — reads the `activities` collection (written by
   the backend / Cloud Functions triggers as projects & tasks change).
--------------------------------------------------------------- */
function listenRecentActivity(user) {
  const container = document.getElementById("dashboard-activity-feed");
  if (!container) return;

  const q = query(
    collection(db, "activities"),
    where("userIds", "array-contains", user.uid),
    orderBy("createdAt", "desc"),
    limit(8)
  );

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      container.innerHTML = `<div class="empty-state" style="padding:var(--space-8) var(--space-4);"><i class="fa-regular fa-bell"></i><h4>No activity yet</h4><p>Actions across your projects will show up here.</p></div>`;
      return;
    }
    container.innerHTML = snap.docs.map((d) => {
      const a = d.data();
      return `
      <div class="activity-item">
        <div class="activity-icon"><i class="fa-solid ${activityIcon(a.type)}"></i></div>
        <div>
          <div class="activity-text">${escapeHTML(a.text || "")}</div>
          <div class="activity-time">${timeAgo(a.createdAt)}</div>
        </div>
      </div>`;
    }).join("");
  }, () => {
    // Collection may not exist yet on a fresh project — fail quietly.
    container.innerHTML = `<div class="empty-state" style="padding:var(--space-8) var(--space-4);"><i class="fa-regular fa-bell"></i><h4>No activity yet</h4><p>Actions across your projects will show up here.</p></div>`;
  });
}

function activityIcon(type) {
  const map = {
    task_assigned: "fa-user-check",
    deadline: "fa-clock",
    comment: "fa-comment",
    file: "fa-paperclip",
    project: "fa-folder"
  };
  return map[type] || "fa-circle-info";
}
