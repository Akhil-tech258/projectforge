// =============================================================
// PROJECTFORGE — FILE MANAGER
// Lists files across every project the user belongs to, and lets
// them upload directly into a chosen project via Firebase Storage.
// =============================================================

import { db, storage } from "./firebase-config.js";
import {
  collection, collectionGroup, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast, escapeHTML, formatDate } from "./app.js";

const FILE_ICONS = {
  "image/": "fa-file-image",
  "application/pdf": "fa-file-pdf",
  "application/zip": "fa-file-zipper",
  "application/msword": "fa-file-word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "fa-file-word"
};

function iconFor(type = "") {
  const match = Object.keys(FILE_ICONS).find((key) => type.startsWith(key));
  return FILE_ICONS[match] || "fa-file";
}

let myProjects = [];

export function initFilesPage(user) {
  const grid = document.getElementById("files-grid");
  const emptyState = document.getElementById("files-empty");
  const projectSelect = document.getElementById("upload-project-select");
  if (!grid) return;

  // Load the user's projects (for the upload target picker)
  const projQ = query(collection(db, "projects"), where("memberIds", "array-contains", user.uid));
  onSnapshot(projQ, (snap) => {
    myProjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (projectSelect) {
      projectSelect.innerHTML = myProjects.map((p) => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("");
    }
  });

  // Listen to files across all projects via a collection group query
  const filesQ = query(collectionGroup(db, "files"), where("uploaderId", "==", user.uid));
  onSnapshot(filesQ, (snap) => {
    if (snap.empty) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    grid.innerHTML = snap.docs.map((d) => {
      const f = d.data();
      return `
      <div class="glass project-card" style="cursor:default;">
        <div class="project-card-top">
          <div style="display:flex;align-items:center;gap:.6rem;min-width:0;">
            <i class="fa-solid ${iconFor(f.type)}" style="color:var(--cyan);font-size:1.1rem;"></i>
            <span style="font-size:var(--fs-sm);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(f.name)}</span>
          </div>
        </div>
        <p style="font-size:.75rem;">${f.projectName ? escapeHTML(f.projectName) : ""} · ${formatDate(f.createdAt)}</p>
        <div class="project-card-foot">
          <span class="due-chip">${f.sizeLabel || ""}</span>
          <div style="display:flex;gap:.4rem;">
            <a href="${f.url}" target="_blank" rel="noopener" class="icon-btn btn-icon-only" title="Download"><i class="fa-solid fa-download"></i></a>
            <button class="icon-btn btn-icon-only" data-delete-file="${d.ref.path}" data-storage-path="${f.storagePath}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll("[data-delete-file]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this file?")) return;
        try {
          await deleteObject(ref(storage, btn.dataset.storagePath));
          await deleteDoc(doc(db, btn.dataset.deleteFile));
          showToast("File deleted.", "success");
        } catch (err) {
          console.error(err);
          showToast("Couldn't delete the file.", "error");
        }
      });
    });
  }, (err) => {
    console.error(err);
    showToast("Couldn't load files.", "error");
  });

  wireUpload(user);
}

function wireUpload(user) {
  const input = document.getElementById("file-upload-input");
  const projectSelect = document.getElementById("upload-project-select");
  const progressBar = document.getElementById("upload-progress");
  if (!input) return;

  input.addEventListener("change", async () => {
    const file = input.files[0];
    const projectId = projectSelect?.value;
    if (!file) return;
    if (!projectId) { showToast("Create a project first to upload files into it.", "error"); return; }
    if (file.size > 25 * 1024 * 1024) { showToast("Files must be under 25MB.", "error"); return; }

    const project = myProjects.find((p) => p.id === projectId);
    const storagePath = `projects/${projectId}/files/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileRef = ref(storage, storagePath);
    const task = uploadBytesResumable(fileRef, file);

    if (progressBar) progressBar.style.display = "block";
    task.on("state_changed", (snap) => {
      const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      if (progressBar) progressBar.querySelector(".progress-fill").style.width = `${pct}%`;
    }, (err) => {
      console.error(err);
      showToast("Upload failed.", "error");
      if (progressBar) progressBar.style.display = "none";
    }, async () => {
      const url = await getDownloadURL(fileRef);
      await addDoc(collection(db, "projects", projectId, "files"), {
        name: file.name,
        type: file.type,
        url,
        storagePath,
        sizeLabel: formatBytes(file.size),
        uploaderId: user.uid,
        projectName: project?.name || "",
        createdAt: serverTimestamp()
      });
      showToast("File uploaded.", "success");
      input.value = "";
      if (progressBar) progressBar.style.display = "none";
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
