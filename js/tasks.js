// =============================================================
// PROJECTFORGE — TASKS / KANBAN BOARD
// Realtime Firestore-backed Kanban with drag & drop.
// =============================================================

import { db } from "./firebase-config.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, getDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  increment, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast, initials, formatDate, escapeHTML, isOverdue } from "./app.js";
import { getProject } from "./projects.js";

const COLUMNS = [
  { key: "todo", label: "To Do", dot: "#9BA1C4" },
  { key: "in_progress", label: "In Progress", dot: "#22D3EE" },
  { key: "review", label: "Review", dot: "#F5B94A" },
  { key: "completed", label: "Completed", dot: "#35D19E" }
];

let projectId = null;
let currentUser = null;
let currentProject = null;
let tasksCache = [];
let editingTaskId = null;
let unsubscribeTasks = null;

export async function initKanbanPage(user) {
  currentUser = user;
  const params = new URLSearchParams(window.location.search);
  projectId = params.get("id");
  const board = document.getElementById("kanban-board");
  if (!board || !projectId) return;

  currentProject = await getProject(projectId);
  if (!currentProject) {
    showToast("Project not found.", "error");
    setTimeout(() => (window.location.href = "/projects.html"), 1200);
    return;
  }

  document.querySelectorAll("[data-project-name]").forEach((el) => (el.textContent = currentProject.name));
  document.querySelectorAll("[data-project-description]").forEach((el) => (el.textContent = currentProject.description || ""));

  renderColumns(board);
  listenToTasks(board);
  wireTaskModal();
}

function renderColumns(board) {
  board.innerHTML = COLUMNS.map((col) => `
    <div class="kanban-col">
      <div class="kanban-col-head">
        <div class="kanban-col-title"><span class="kanban-col-dot" style="background:${col.dot}"></span>${col.label}</div>
        <span class="kanban-count" id="count-${col.key}">0</span>
      </div>
      <div class="kanban-cards kanban-drop-zone" data-col="${col.key}" id="cards-${col.key}"></div>
      <button class="add-card-btn" data-add-task="${col.key}"><i class="fa-solid fa-plus"></i> Add task</button>
    </div>
  `).join("");

  board.querySelectorAll("[data-add-task]").forEach((btn) => {
    btn.addEventListener("click", () => openTaskModal(null, btn.dataset.addTask));
  });

  board.querySelectorAll(".kanban-drop-zone").forEach((zone) => {
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("drag-over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");
      const taskId = e.dataTransfer.getData("text/task-id");
      const newStatus = zone.dataset.col;
      if (!taskId) return;
      await moveTask(taskId, newStatus);
    });
  });
}

function listenToTasks(board) {
  const q = query(collection(db, "projects", projectId, "tasks"), orderBy("createdAt", "desc"));
  if (unsubscribeTasks) unsubscribeTasks();
  unsubscribeTasks = onSnapshot(
    q,
    (snap) => {
      tasksCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      renderTasks();
    },
    (err) => {
      console.error(err);
      showToast("Couldn't load tasks.", "error");
    }
  );
}

function renderTasks() {
  COLUMNS.forEach((col) => {
    const container = document.getElementById(`cards-${col.key}`);
    const countEl = document.getElementById(`count-${col.key}`);
    const colTasks = tasksCache.filter((t) => (t.status || "todo") === col.key);
    countEl.textContent = colTasks.length;

    if (!colTasks.length) {
      container.innerHTML = "";
      return;
    }
    container.innerHTML = colTasks.map(taskCardHTML).join("");

    container.querySelectorAll(".kanban-card").forEach((card) => {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/task-id", card.dataset.taskId);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", () => {
        const task = tasksCache.find((t) => t.id === card.dataset.taskId);
        openTaskModal(task, task.status);
      });
    });
  });
}

function taskCardHTML(t) {
  const checklist = t.checklist || [];
  const doneCount = checklist.filter((c) => c.done).length;
  const overdue = t.dueDate && isOverdue(t.dueDate) && t.status !== "completed";

  return `
  <div class="kanban-card" draggable="true" data-task-id="${t.id}">
    ${t.labels?.length ? `<div class="kanban-card-labels">${t.labels.map((l) => `<span class="tag-pill">${escapeHTML(l)}</span>`).join("")}</div>` : ""}
    <div class="kanban-card-title">${escapeHTML(t.title)}</div>
    <div class="kanban-card-meta">
      <div style="display:flex;align-items:center;gap:.5rem;">
        ${t.priority ? `<span class="priority-badge priority-${t.priority}" style="font-size:.6rem;">${t.priority}</span>` : ""}
        ${checklist.length ? `<span class="kanban-card-checklist"><i class="fa-regular fa-square-check"></i>${doneCount}/${checklist.length}</span>` : ""}
      </div>
      <div style="display:flex;align-items:center;gap:.4rem;">
        ${t.dueDate ? `<span class="due-chip" style="${overdue ? "color:var(--danger)" : ""}"><i class="fa-regular fa-clock"></i>${formatDate(t.dueDate)}</span>` : ""}
        ${t.assignee ? `<div class="avatar" style="width:24px;height:24px;font-size:.6rem;" title="${escapeHTML(t.assignee.name)}">${initials(t.assignee.name)}</div>` : ""}
      </div>
    </div>
  </div>`;
}

async function moveTask(taskId, newStatus) {
  const task = tasksCache.find((t) => t.id === taskId);
  if (!task || task.status === newStatus) return;
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "projects", projectId, "tasks", taskId), { status: newStatus, updatedAt: serverTimestamp() });

    const wasCompleted = task.status === "completed";
    const isCompleted = newStatus === "completed";
    if (wasCompleted !== isCompleted) {
      batch.update(doc(db, "projects", projectId), {
        completedTaskCount: increment(isCompleted ? 1 : -1)
      });
    }
    await batch.commit();
  } catch (err) {
    console.error(err);
    showToast("Couldn't move the task.", "error");
  }
}

/* ---------------------------------------------------------------
   Task detail / create modal
--------------------------------------------------------------- */
function wireTaskModal() {
  const overlay = document.getElementById("task-modal");
  const form = document.getElementById("task-form");
  if (!overlay || !form) return;

  overlay.querySelectorAll("[data-close-modal]").forEach((btn) => btn.addEventListener("click", () => closeTaskModal()));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeTaskModal(); });

  document.getElementById("task-add-checklist-item")?.addEventListener("click", () => addChecklistRow());

  document.getElementById("task-delete-btn")?.addEventListener("click", async () => {
    if (!editingTaskId) return;
    if (!confirm("Delete this task?")) return;
    try {
      await deleteDoc(doc(db, "projects", projectId, "tasks", editingTaskId));
      if (tasksCache.find((t) => t.id === editingTaskId)?.status === "completed") {
        await updateDoc(doc(db, "projects", projectId), { completedTaskCount: increment(-1) });
      }
      showToast("Task deleted.", "success");
      closeTaskModal();
    } catch { showToast("Couldn't delete the task.", "error"); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const title = document.getElementById("task-title").value.trim();
    const description = document.getElementById("task-description").value.trim();
    const priority = document.getElementById("task-priority").value;
    const dueDate = document.getElementById("task-due-date").value;
    const labelsRaw = document.getElementById("task-labels").value.trim();
    const labels = labelsRaw ? labelsRaw.split(",").map((l) => l.trim()).filter(Boolean) : [];
    const checklist = Array.from(document.querySelectorAll("#task-checklist-list .checklist-row")).map((row) => ({
      text: row.querySelector("input[type=text]").value.trim(),
      done: row.querySelector("input[type=checkbox]").checked
    })).filter((c) => c.text);
    const status = document.getElementById("task-status").value;

    try {
      if (editingTaskId) {
        const before = tasksCache.find((t) => t.id === editingTaskId);
        await updateDoc(doc(db, "projects", projectId, "tasks", editingTaskId), {
          title, description, priority, labels, checklist, status,
          dueDate: dueDate ? new Date(dueDate) : null,
          updatedAt: serverTimestamp()
        });
        if (before && before.status !== status) {
          const wasCompleted = before.status === "completed";
          const isCompleted = status === "completed";
          if (wasCompleted !== isCompleted) {
            await updateDoc(doc(db, "projects", projectId), { completedTaskCount: increment(isCompleted ? 1 : -1) });
          }
        }
        showToast("Task updated.", "success");
      } else {
        await addDoc(collection(db, "projects", projectId, "tasks"), {
          title, description, priority, labels, checklist, status,
          dueDate: dueDate ? new Date(dueDate) : null,
          assignee: { uid: currentUser.uid, name: currentUser.displayName || currentUser.email },
          comments: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await updateDoc(doc(db, "projects", projectId), { taskCount: increment(1) });
        showToast("Task created.", "success");
      }
      closeTaskModal();
    } catch (err) {
      console.error(err);
      showToast("Couldn't save the task.", "error");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}

function openTaskModal(task, defaultStatus) {
  editingTaskId = task?.id || null;
  document.getElementById("task-modal-title").textContent = task ? "Task details" : "New task";
  document.getElementById("task-title").value = task?.title || "";
  document.getElementById("task-description").value = task?.description || "";
  document.getElementById("task-priority").value = task?.priority || "medium";
  document.getElementById("task-status").value = task?.status || defaultStatus || "todo";
  document.getElementById("task-labels").value = (task?.labels || []).join(", ");
  document.getElementById("task-due-date").value = task?.dueDate
    ? new Date(task.dueDate.toDate ? task.dueDate.toDate() : task.dueDate).toISOString().slice(0, 10)
    : "";
  document.getElementById("task-delete-btn").style.display = task ? "inline-flex" : "none";

  const checklistList = document.getElementById("task-checklist-list");
  checklistList.innerHTML = "";
  (task?.checklist || []).forEach((item) => addChecklistRow(item));

  document.getElementById("task-modal").classList.add("open");
}

function addChecklistRow(item = { text: "", done: false }) {
  const list = document.getElementById("task-checklist-list");
  const row = document.createElement("div");
  row.className = "checklist-row";
  row.style.cssText = "display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;";
  row.innerHTML = `
    <input type="checkbox" ${item.done ? "checked" : ""} style="width:auto;">
    <input type="text" value="${escapeHTML(item.text)}" placeholder="Checklist item" style="flex:1;">
    <button type="button" class="icon-btn btn-icon-only" data-remove-row><i class="fa-solid fa-xmark"></i></button>
  `;
  row.querySelector("[data-remove-row]").addEventListener("click", () => row.remove());
  list.appendChild(row);
}

function closeTaskModal() {
  document.getElementById("task-modal").classList.remove("open");
  document.getElementById("task-form").reset();
  editingTaskId = null;
}
