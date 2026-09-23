// =============================================================
// PROJECTFORGE — PROFILE & SETTINGS
// =============================================================

import { auth, db, storage } from "./firebase-config.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { showToast, initials } from "./app.js";

export function initProfilePage(user, profile) {
  const form = document.getElementById("profile-form");
  if (!form) return;

  document.getElementById("profile-name").value = profile?.name || user.displayName || "";
  document.getElementById("profile-email").value = user.email;
  document.getElementById("profile-phone").value = profile?.phone || "";
  document.getElementById("profile-skills").value = (profile?.skills || []).join(", ");
  document.getElementById("profile-bio").value = profile?.bio || "";

  const avatarPreview = document.getElementById("profile-avatar-preview");
  if (avatarPreview) {
    if (profile?.photoURL) avatarPreview.innerHTML = `<img src="${profile.photoURL}" alt="">`;
    else avatarPreview.textContent = initials(profile?.name || user.email);
  }

  const avatarInput = document.getElementById("profile-avatar-input");
  if (avatarInput) {
    avatarInput.addEventListener("change", async () => {
      const file = avatarInput.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { showToast("Image must be under 5MB.", "error"); return; }
      try {
        const fileRef = ref(storage, `avatars/${user.uid}/${Date.now()}-${file.name}`);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        avatarPreview.innerHTML = `<img src="${url}" alt="">`;
        await updateDoc(doc(db, "users", user.uid), { photoURL: url });
        showToast("Profile photo updated.", "success");
      } catch (err) {
        console.error(err);
        showToast("Couldn't upload photo.", "error");
      }
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add("loading");
    submitBtn.disabled = true;

    const name = document.getElementById("profile-name").value.trim();
    const phone = document.getElementById("profile-phone").value.trim();
    const skills = document.getElementById("profile-skills").value.trim().split(",").map((s) => s.trim()).filter(Boolean);
    const bio = document.getElementById("profile-bio").value.trim();

    try {
      await updateDoc(doc(db, "users", user.uid), { name, phone, skills, bio });
      await updateProfile(user, { displayName: name });
      showToast("Profile updated.", "success");
    } catch (err) {
      console.error(err);
      showToast("Couldn't update profile.", "error");
    } finally {
      submitBtn.classList.remove("loading");
      submitBtn.disabled = false;
    }
  });
}

export function initSettingsPage(user) {
  const pwForm = document.getElementById("change-password-form");
  if (pwForm) {
    pwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = pwForm.querySelector('button[type="submit"]');
      const currentPw = document.getElementById("current-password").value;
      const newPw = document.getElementById("new-password").value;
      const confirmPw = document.getElementById("confirm-new-password").value;
      const alertEl = document.getElementById("password-alert");

      if (newPw !== confirmPw) {
        alertEl.textContent = "New passwords don't match.";
        alertEl.className = "form-alert error show";
        return;
      }
      if (newPw.length < 8) {
        alertEl.textContent = "New password should be at least 8 characters.";
        alertEl.className = "form-alert error show";
        return;
      }

      submitBtn.classList.add("loading");
      submitBtn.disabled = true;
      try {
        const credential = EmailAuthProvider.credential(user.email, currentPw);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPw);
        alertEl.textContent = "Password updated successfully.";
        alertEl.className = "form-alert success show";
        pwForm.reset();
      } catch (err) {
        alertEl.textContent = err.code === "auth/wrong-password" ? "Current password is incorrect." : "Couldn't update password.";
        alertEl.className = "form-alert error show";
      } finally {
        submitBtn.classList.remove("loading");
        submitBtn.disabled = false;
      }
    });
  }

  // Theme radio buttons (dark / light) mirrored with the navbar toggle
  document.querySelectorAll('input[name="theme-pref"]').forEach((radio) => {
    const isLight = document.documentElement.getAttribute("data-theme") === "light";
    radio.checked = radio.value === (isLight ? "light" : "dark");
    radio.addEventListener("change", () => {
      if (radio.value === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("pf-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("pf-theme", "dark");
      }
      showToast("Theme updated.", "success");
    });
  });
}
