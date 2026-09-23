// =============================================================
// PROJECTFORGE — NOTIFICATIONS
// =============================================================

import { db, isFirebaseConfigured } from "./firebase-config.js";
import {
  collection, query, where, orderBy, onSnapshot, getDocs, doc, updateDoc, deleteDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { showToast, timeAgo, escapeHTML } from "./app.js";

const TYPE_ICON = {
  task_assigned: "fa-user-check",
  deadline: "fa-clock",
  comment: "fa-comment",
  file: "fa-paperclip",
  project: "fa-folder"
};

export function initNotificationsPage(user) {
  const list = document.getElementById("notifications-list");
  const emptyState = document.getElementById("notifications-empty");
  if (!list) return;

  if (!isFirebaseConfigured || user.uid === "demo-guest-user") {
    renderDemoNotifications(list, emptyState);
    return;
  }

  const q = query(collection(db, "notifications"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));

  onSnapshot(q, (snap) => {
    if (snap.empty) {
      list.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    list.innerHTML = snap.docs.map((d) => {
      const n = d.data();
      return `
      <div class="glass activity-item" style="padding:var(--space-4) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-3);${n.read ? "" : "border-left:3px solid var(--violet);"}" data-notif-id="${d.id}">
        <div class="activity-icon"><i class="fa-solid ${TYPE_ICON[n.type] || "fa-circle-info"}"></i></div>
        <div style="flex:1;">
          <div class="activity-text">${escapeHTML(n.text || "")}</div>
          <div class="activity-time">${timeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? `<button class="icon-btn btn-icon-only" data-mark-read title="Mark as read"><i class="fa-solid fa-check"></i></button>` : ""}
        <button class="icon-btn btn-icon-only" data-delete-notif title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
      </div>`;
    }).join("");

    list.querySelectorAll("[data-mark-read]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("[data-notif-id]").dataset.notifId;
        try { await updateDoc(doc(db, "notifications", id), { read: true }); } catch {}
      });
    });
    list.querySelectorAll("[data-delete-notif]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.closest("[data-notif-id]").dataset.notifId;
        try { await deleteDoc(doc(db, "notifications", id)); } catch { showToast("Couldn't dismiss notification.", "error"); }
      });
    });
  }, (err) => {
    console.error(err);
    renderDemoNotifications(list, emptyState);
  });

  const markAllBtn = document.getElementById("mark-all-read");
  if (markAllBtn) {
    markAllBtn.addEventListener("click", async () => {
      try {
        const q2 = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
        const snap = await getDocs(q2);
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
        showToast("All notifications marked as read.", "success");
      } catch (err) {
        showToast("Couldn't mark all as read.", "error");
      }
    });
  }
}

function renderDemoNotifications(list, emptyState) {
  if (emptyState) emptyState.style.display = "none";
  const demoList = [
    { type: "task_assigned", text: "Sara Chen assigned you to Design Streaming Tool Call Parser", time: "25m ago", read: false },
    { type: "comment", text: "Marcus Vance commented on Automated Evaluation Test Suite", time: "2h ago", read: false },
    { type: "deadline", text: "AI Workflow Engine deadline is approaching in 5 days", time: "5h ago", read: true },
    { type: "project", text: "You were added as lead to Design System & Glassmorphic Tokens v2", time: "1d ago", read: true }
  ];

  list.innerHTML = demoList.map((n, i) => `
    <div class="glass activity-item" style="padding:var(--space-4) var(--space-5);border-radius:var(--radius-md);margin-bottom:var(--space-3);${n.read ? "" : "border-left:3px solid var(--violet);"}" data-demo-id="${i}">
      <div class="activity-icon"><i class="fa-solid ${TYPE_ICON[n.type] || "fa-circle-info"}"></i></div>
      <div style="flex:1;">
        <div class="activity-text">${escapeHTML(n.text)}</div>
        <div class="activity-time">${n.time}</div>
      </div>
      ${!n.read ? `<button class="icon-btn btn-icon-only" title="Mark as read" onclick="this.closest('.activity-item').style.borderLeft='none';this.remove();"><i class="fa-solid fa-check"></i></button>` : ""}
      <button class="icon-btn btn-icon-only" title="Dismiss" onclick="this.closest('.activity-item').remove();"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join("");
}
