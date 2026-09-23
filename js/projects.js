// =============================================================
// PROJECTFORGE — PROJECTS
// Firestore CRUD for the Projects list page + project card render.
// =============================================================

import { auth, db, isFirebaseConfigured } from "./firebase-config.js";
import { DEMO_PROJECTS } from "./demo-data.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast, initials, formatDate, escapeHTML } from "./app.js";

const PRIORITY_LABEL = { high: "High", medium: "Medium", low: "Low" };
const TAG_COLORS = ["#7C5CFF", "#22D3EE", "#FF6B4A", "#35D19E", "#F5B94A"];

let currentUser = null;
let unsubscribeProjects = null;
let editingProjectId = null;

export function initProjectsPage(user) {
  currentUser = user;
  wireProjectModal(); // safe to call even if the modal markup isn't on this page

  const grid = document.getElementById("project-grid");
  const emptyState = document.getElementById("projects-empty");
  if (!grid) return;

  listenToProjects(grid, emptyState);
  wireFilters(grid);
}

/* ---------------------------------------------------------------
   Realtime listener — projects where the user is owner or member
--------------------------------------------------------------- */
function listenToProjects(grid, emptyState) {
  if (!isFirebaseConfigured || currentUser.uid === "demo-guest-user") {
    window.__pfProjects = DEMO_PROJECTS;
    renderProjects(DEMO_PROJECTS, grid, emptyState);
    return;
  }

  grid.innerHTML = skeletonCards(6);

  const q = query(
    collection(db, "projects"),
    where("memberIds", "array-contains", currentUser.uid),
    orderBy("createdAt", "desc")
  );

  if (unsubscribeProjects) unsubscribeProjects();
  unsubscribeProjects = onSnapshot(
    q,
    (snap) => {
      const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      window.__pfProjects = projects; // used by filters
      renderProjects(projects, grid, emptyState);
    },
    (err) => {
      console.error(err);
      window.__pfProjects = DEMO_PROJECTS;
      renderProjects(DEMO_PROJECTS, grid, emptyState);
    }
  );
}

function renderProjects(projects, grid, emptyState) {
  const activeFilter = document.querySelector(".filter-chip.active")?.dataset.filter || "all";
  const filtered = projects.filter((p) => {
    if (activeFilter === "all") return !p.archived;
    if (activeFilter === "archived") return !!p.archived;
    return !p.archived && p.status === activeFilter;
  });

  if (!filtered.length) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";
  grid.innerHTML = filtered.map(projectCardHTML).join("");

  grid.querySelectorAll("[data-open-project]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-project-menu]")) return;
      window.location.href = `project-details.html?id=${card.dataset.openProject}`;
    });
  });
  grid.querySelectorAll("[data-project-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openProjectMenu(btn.dataset.projectMenu, projects.find((p) => p.id === btn.dataset.projectMenu));
    });
  });
}

function projectCardHTML(p) {
  const total = p.taskCount || 0;
  const done = p.completedTaskCount || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const color = p.color || TAG_COLORS[0];
  const members = (p.members || []).slice(0, 4);

  return `
  <div class="glass project-card" data-open-project="${p.id}">
    <div class="project-card-top">
      <div style="display:flex;align-items:center;gap:.5rem;min-width:0;">
        <span class="project-tag-dot" style="background:${color}"></span>
        <h4 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(p.name)}</h4>
      </div>
      <button class="icon-btn btn-icon-only" data-project-menu="${p.id}" aria-label="Project options">
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
    </div>
    <p>${escapeHTML(p.description || "No description yet.")}</p>
    <div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-tertiary);margin-bottom:.4rem;">
        <span>${done}/${total} tasks</span><span>${pct}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="project-card-foot">
      <div class="avatar-stack">
        ${members.map((m) => `<div class="avatar" title="${escapeHTML(m.name)}">${initials(m.name)}</div>`).join("") || `<div class="avatar">${initials(currentUser.displayName || currentUser.email)}</div>`}
      </div>
      <div style="display:flex;align-items:center;gap:.5rem;">
        ${p.priority ? `<span class="priority-badge priority-${p.priority}">${PRIORITY_LABEL[p.priority] || p.priority}</span>` : ""}
        ${p.deadline ? `<span class="due-chip"><i class="fa-regular fa-clock"></i>${formatDate(p.deadline)}</span>` : ""}
      </div>
    </div>
  </div>`;
}

function skeletonCards(n) {
  return Array.from({ length: n }).map(() => `<div class="glass skeleton skeleton-card"></div>`).join("");
}

/* ---------------------------------------------------------------
   Filters
--------------------------------------------------------------- */
function wireFilters(grid) {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderProjects(window.__pfProjects || [], grid, document.getElementById("projects-empty"));
    });
  });

  const search = document.getElementById("project-search");
  if (search) {
    search.addEventListener("input", () => {
      const term = search.value.trim().toLowerCase();
      const all = window.__pfProjects || [];
      const filtered = term ? all.filter((p) => p.name.toLowerCase().includes(term)) : all;
      renderProjects(filtered, grid, document.getElementById("projects-empty"));
    });
  }
}

/* ---------------------------------------------------------------
   Create / edit modal
--------------------------------------------------------------- */
function wireProjectModal() {
  const overlay = document.getElementById("project-modal");
  const form = document.getElementById("project-form");
  if (!overlay || !form) return;

  document.querySelectorAll("[data-open-create-project]").forEach((btn) => {
    btn.addEventListener("click", () => openProjectModal(null));
  });
  overlay.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(overlay));
  });
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const name = document.getElementById("project-name").value.trim();
    const description = document.getElementById("project-description").value.trim();
    const priority = document.getElementById("project-priority").value;
    const deadline = document.getElementById("project-deadline").value;
    const tagsRaw = document.getElementById("project-tags").value.trim();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

    try {
      if (editingProjectId) {
        await updateDoc(doc(db, "projects", editingProjectId), {
          name, description, priority, tags,
          deadline: deadline ? new Date(deadline) : null,
          updatedAt: serverTimestamp()
        });
        showToast("Project updated.", "success");
      } else {
        await addDoc(collection(db, "projects"), {
          name, description, priority, tags, color,
          deadline: deadline ? new Date(deadline) : null,
          status: "active",
          archived: false,
          ownerId: currentUser.uid,
          memberIds: [currentUser.uid],
          members: [{ uid: currentUser.uid, name: currentUser.displayName || currentUser.email }],
          taskCount: 0,
          completedTaskCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast("Project created.", "success");
      }
      closeModal(document.getElementById("project-modal"));
      form.reset();
    } catch (err) {
      console.error(err);
      showToast("Couldn't save the project. Try again.", "error");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}

function openProjectModal(project) {
  const overlay = document.getElementById("project-modal");
  const form = document.getElementById("project-form");
  const title = document.getElementById("project-modal-title");
  editingProjectId = project?.id || null;

  if (title) title.textContent = project ? "Edit project" : "Create project";
  document.getElementById("project-name").value = project?.name || "";
  document.getElementById("project-description").value = project?.description || "";
  document.getElementById("project-priority").value = project?.priority || "medium";
  document.getElementById("project-tags").value = (project?.tags || []).join(", ");
  document.getElementById("project-deadline").value = project?.deadline
    ? new Date(project.deadline.toDate ? project.deadline.toDate() : project.deadline).toISOString().slice(0, 10)
    : "";

  overlay.classList.add("open");
}

function closeModal(overlay) {
  overlay.classList.remove("open");
  editingProjectId = null;
}

/* ---------------------------------------------------------------
   Card dropdown menu: edit / archive / delete
--------------------------------------------------------------- */
function openProjectMenu(id, project) {
  document.querySelectorAll(".pf-context-menu").forEach((m) => m.remove());
  const menu = document.createElement("div");
  menu.className = "glass pf-context-menu";
  menu.style.cssText = "position:fixed;z-index:3000;padding:.5rem;min-width:170px;";
  menu.innerHTML = `
    <button class="side-link" data-action="edit" style="width:100%"><i class="fa-solid fa-pen"></i> Edit</button>
    <button class="side-link" data-action="archive" style="width:100%"><i class="fa-solid fa-box-archive"></i> ${project?.archived ? "Unarchive" : "Archive"}</button>
    <button class="side-link" data-action="delete" style="width:100%;color:var(--danger)"><i class="fa-solid fa-trash"></i> Delete</button>
  `;
  document.body.appendChild(menu);

  const rect = event.target.closest("button").getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, rect.right - 170)}px`;

  menu.querySelector('[data-action="edit"]').addEventListener("click", () => {
    menu.remove();
    openProjectModal(project);
  });
  menu.querySelector('[data-action="archive"]').addEventListener("click", async () => {
    menu.remove();
    try {
      await updateDoc(doc(db, "projects", id), { archived: !project.archived, updatedAt: serverTimestamp() });
      showToast(project.archived ? "Project unarchived." : "Project archived.", "success");
    } catch { showToast("Couldn't update the project.", "error"); }
  });
  menu.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    menu.remove();
    if (!confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      showToast("Project deleted.", "success");
    } catch { showToast("Couldn't delete the project.", "error"); }
  });

  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", closeMenu); }
    });
  }, 0);
}

export async function getProject(id) {
  const snap = await getDoc(doc(db, "projects", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addProjectMember(projectId, member) {
  await updateDoc(doc(db, "projects", projectId), {
    memberIds: arrayUnion(member.uid),
    members: arrayUnion(member)
  });
}
