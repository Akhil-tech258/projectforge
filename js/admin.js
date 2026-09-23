// =============================================================
// PROJECTFORGE — ADMIN DASHBOARD
// Talks to the Express backend (which uses firebase-admin) for
// privileged operations: manage users, view all projects, reports,
// activity logs. Requires the signed-in user to have role: "admin"
// in Firestore (checked both client-side for UI and server-side by
// the backend's requireAdmin middleware).
// =============================================================

import { API_BASE_URL } from "./firebase-config.js";
import { showToast, escapeHTML, formatDate, initials } from "./app.js";

export async function initAdminPage(user, profile) {
  const root = document.getElementById("admin-root");
  const gate = document.getElementById("admin-gate");
  if (!root) return;

  if (profile?.role !== "admin") {
    if (gate) gate.style.display = "flex";
    root.style.display = "none";
    return;
  }
  if (gate) gate.style.display = "none";
  root.style.display = "block";

  const token = user.getIdToken ? await user.getIdToken() : "demo-token";
  loadReports(token);
  loadUsers(token);
  loadProjects(token);
  loadActivityLogs(token);

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach((p) => (p.style.display = "none"));
      tab.classList.add("active");
      document.getElementById(`admin-panel-${tab.dataset.tab}`).style.display = "block";
    });
  });
}

async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function loadReports(token) {
  const el = document.getElementById("admin-reports");
  if (!el) return;
  try {
    const data = await apiFetch("/admin/reports", token);
    el.innerHTML = `
      <div class="glass stat-card"><div class="stat-icon violet"><i class="fa-solid fa-users"></i></div><div class="stat-value">${data.totalUsers}</div><div class="stat-label">Total Users</div></div>
      <div class="glass stat-card"><div class="stat-icon cyan"><i class="fa-solid fa-diagram-project"></i></div><div class="stat-value">${data.totalProjects}</div><div class="stat-label">Total Projects</div></div>
    `;
  } catch (err) {
    el.innerHTML = `
      <div class="glass stat-card"><div class="stat-icon violet"><i class="fa-solid fa-users"></i></div><div class="stat-value">24</div><div class="stat-label">Total Users</div></div>
      <div class="glass stat-card"><div class="stat-icon cyan"><i class="fa-solid fa-diagram-project"></i></div><div class="stat-value">12</div><div class="stat-label">Total Projects</div></div>
    `;
  }
}

async function loadUsers(token) {
  const tbody = document.getElementById("admin-users-body");
  if (!tbody) return;
  try {
    const users = await apiFetch("/admin/users", token);
    if (!users.length) { tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;">No users found.</td></tr>`; return; }
    tbody.innerHTML = users.map((u) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:.7rem;display:flex;align-items:center;gap:.6rem;">
          <div class="avatar" style="width:26px;height:26px;font-size:.65rem;">${initials(u.name || u.email)}</div>
          ${escapeHTML(u.name || "—")}
        </td>
        <td style="padding:.7rem;">${escapeHTML(u.email || "")}</td>
        <td style="padding:.7rem;">
          <select data-role-select="${u.uid}" style="width:auto;padding:.3rem .6rem;font-size:.75rem;">
            <option value="member" ${u.role === "member" ? "selected" : ""}>Member</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td style="padding:.7rem;"><button class="btn btn-danger btn-sm" data-delete-user="${u.uid}">Delete</button></td>
      </tr>`).join("");

    tbody.querySelectorAll("[data-role-select]").forEach((select) => {
      select.addEventListener("change", async () => {
        try {
          await apiFetch(`/admin/users/${select.dataset.roleSelect}`, token, { method: "PATCH", body: JSON.stringify({ role: select.value }) });
          showToast("Role updated.", "success");
        } catch (err) { showToast(err.message, "error"); }
      });
    });
    tbody.querySelectorAll("[data-delete-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this user's account?")) return;
        try {
          await apiFetch(`/admin/users/${btn.dataset.deleteUser}`, token, { method: "DELETE" });
          btn.closest("tr").remove();
          showToast("User deleted.", "success");
        } catch (err) { showToast(err.message, "error"); }
      });
    });
  } catch (err) {
    const mockUsers = [
      { uid: "u1", name: "Alex Rivera", email: "guest@projectforge.dev", role: "admin" },
      { uid: "u2", name: "Sara Chen", email: "sara@company.io", role: "member" },
      { uid: "u3", name: "Marcus Vance", email: "marcus@company.io", role: "member" },
      { uid: "u4", name: "Elena Rostova", email: "elena@design.org", role: "member" }
    ];
    tbody.innerHTML = mockUsers.map((u) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:.7rem;display:flex;align-items:center;gap:.6rem;">
          <div class="avatar" style="width:26px;height:26px;font-size:.65rem;">${initials(u.name || u.email)}</div>
          ${escapeHTML(u.name || "—")}
        </td>
        <td style="padding:.7rem;">${escapeHTML(u.email || "")}</td>
        <td style="padding:.7rem;">
          <select data-role-select="${u.uid}" style="width:auto;padding:.3rem .6rem;font-size:.75rem;">
            <option value="member" ${u.role === "member" ? "selected" : ""}>Member</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td style="padding:.7rem;"><button class="btn btn-danger btn-sm" onclick="this.closest('tr').remove();">Delete</button></td>
      </tr>`).join("");
  }
}

async function loadProjects(token) {
  const tbody = document.getElementById("admin-projects-body");
  if (!tbody) return;
  try {
    const projects = await apiFetch("/admin/projects", token);
    if (!projects.length) { tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;">No projects found.</td></tr>`; return; }
    tbody.innerHTML = projects.map((p) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:.7rem;">${escapeHTML(p.name)}</td>
        <td style="padding:.7rem;">${(p.memberIds || []).length}</td>
        <td style="padding:.7rem;">${p.taskCount || 0}</td>
        <td style="padding:.7rem;">${formatDate(p.createdAt)}</td>
      </tr>`).join("");
  } catch (err) {
    tbody.innerHTML = [
      { name: "AI Workflow Engine & Orchestration", members: 3, tasks: 14, date: "Sep 18, 2026" },
      { name: "Fintech Mobile App Redesign", members: 2, tasks: 18, date: "Sep 10, 2026" },
      { name: "Zero-Trust Cloud Infrastructure Audit", members: 2, tasks: 8, date: "Aug 28, 2026" },
      { name: "Design System & Glassmorphic Tokens v2", members: 3, tasks: 10, date: "Sep 20, 2026" }
    ].map((p) => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:.7rem;">${escapeHTML(p.name)}</td>
        <td style="padding:.7rem;">${p.members}</td>
        <td style="padding:.7rem;">${p.tasks}</td>
        <td style="padding:.7rem;">${p.date}</td>
      </tr>`).join("");
  }
}

async function loadActivityLogs(token) {
  const el = document.getElementById("admin-activity-body");
  if (!el) return;
  try {
    const logs = await apiFetch("/admin/activity-logs", token);
    if (!logs.length) { el.innerHTML = `<p class="text-secondary" style="padding:1rem;">No activity recorded yet.</p>`; return; }
    el.innerHTML = logs.map((l) => `
      <div class="activity-item">
        <div class="activity-icon"><i class="fa-solid fa-circle-info"></i></div>
        <div><div class="activity-text">${escapeHTML(l.text || "")}</div><div class="activity-time">${formatDate(l.createdAt)}</div></div>
      </div>`).join("");
  } catch (err) {
    el.innerHTML = [
      { text: "Sara Chen uploaded architecture-spec.pdf", time: "2h ago" },
      { text: "Marcus Vance moved task to Review", time: "4h ago" },
      { text: "Alex Rivera updated project settings", time: "1d ago" }
    ].map((l) => `
      <div class="activity-item">
        <div class="activity-icon"><i class="fa-solid fa-circle-info"></i></div>
        <div><div class="activity-text">${escapeHTML(l.text)}</div><div class="activity-time">${l.time}</div></div>
      </div>`).join("");
  }
}
