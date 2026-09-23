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

  const token = await user.getIdToken();
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
  if (!res.ok) throw new Error(data.error || "Request failed");
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
    el.innerHTML = `<p class="text-secondary">Couldn't load reports: ${escapeHTML(err.message)}</p>`;
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
    tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;">Couldn't load users: ${escapeHTML(err.message)}</td></tr>`;
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
    tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;">Couldn't load projects: ${escapeHTML(err.message)}</td></tr>`;
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
    el.innerHTML = `<p class="text-secondary" style="padding:1rem;">Couldn't load activity logs: ${escapeHTML(err.message)}</p>`;
  }
}
