// =============================================================
// PROJECTFORGE — TEAM CHAT
// A project-scoped chat: pick a project from the sidebar list,
// messages sync in real time via Firestore.
// =============================================================

import { db } from "./firebase-config.js";
import {
  collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { escapeHTML, initials, timeAgo } from "./app.js";

let activeProjectId = null;
let unsubscribeMessages = null;
let currentUser = null;

export function initTeamChatPage(user) {
  const list = document.getElementById("chat-project-list");
  if (!list) return;
  currentUser = user;

  const q = query(collection(db, "projects"), where("memberIds", "array-contains", user.uid));
  onSnapshot(q, (snap) => {
    const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.archived);
    if (!projects.length) {
      list.innerHTML = `<p class="text-secondary" style="font-size:.8rem;padding:var(--space-4);">Create a project to start chatting with your team.</p>`;
      return;
    }
    list.innerHTML = projects.map((p) => `
      <button class="side-link chat-project-item" data-project-id="${p.id}" style="width:100%;">
        <span class="project-tag-dot" style="background:${p.color || "#7C5CFF"}"></span> ${escapeHTML(p.name)}
      </button>`).join("");

    list.querySelectorAll(".chat-project-item").forEach((btn) => {
      btn.addEventListener("click", () => selectProject(btn.dataset.projectId, btn.textContent.trim()));
    });

    if (!activeProjectId && projects[0]) selectProject(projects[0].id, projects[0].name);
  });

  wireComposer();
}

function selectProject(projectId, name) {
  activeProjectId = projectId;
  document.querySelectorAll(".chat-project-item").forEach((el) => el.classList.toggle("active", el.dataset.projectId === projectId));
  document.getElementById("chat-active-project-name").textContent = name;
  document.getElementById("chat-composer").style.display = "flex";

  if (unsubscribeMessages) unsubscribeMessages();
  const messagesEl = document.getElementById("chat-messages");
  messagesEl.innerHTML = `<div class="skeleton skeleton-line" style="width:60%"></div>`;

  const q = query(
    collection(db, "projects", projectId, "messages"),
    orderBy("createdAt", "asc"),
    limit(100)
  );
  unsubscribeMessages = onSnapshot(q, (snap) => {
    if (snap.empty) {
      messagesEl.innerHTML = `<div class="empty-state"><i class="fa-regular fa-comment-dots"></i><h4>No messages yet</h4><p>Say hello to your team.</p></div>`;
      return;
    }
    messagesEl.innerHTML = snap.docs.map((d) => {
      const m = d.data();
      const isMine = m.authorId === currentUser?.uid;
      return `
      <div style="display:flex;gap:.6rem;margin-bottom:var(--space-4);${isMine ? "flex-direction:row-reverse;" : ""}">
        <div class="avatar" style="width:30px;height:30px;font-size:.7rem;flex-shrink:0;">${initials(m.authorName)}</div>
        <div style="max-width:70%;">
          <div class="glass" style="padding:.6rem .9rem;border-radius:var(--radius-md);${isMine ? "background:rgba(124,92,255,0.16);" : ""}">
            <div style="font-size:.7rem;font-weight:600;color:var(--text-tertiary);margin-bottom:.2rem;">${escapeHTML(m.authorName)}</div>
            <div style="font-size:var(--fs-sm);">${escapeHTML(m.text)}</div>
          </div>
          <div style="font-size:.65rem;color:var(--text-tertiary);margin-top:.2rem;${isMine ? "text-align:right;" : ""}">${timeAgo(m.createdAt)}</div>
        </div>
      </div>`;
    }).join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

function wireComposer() {
  const form = document.getElementById("chat-composer");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text || !activeProjectId) return;
    input.value = "";
    try {
      await addDoc(collection(db, "projects", activeProjectId, "messages"), {
        text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.email,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  });
}
