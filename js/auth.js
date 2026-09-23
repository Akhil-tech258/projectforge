// =============================================================
// PROJECTFORGE — AUTHENTICATION
// Handles register / login / forgot password / reset password /
// email verification screens. Each page includes this module and
// calls the relevant init*() function for the form present on it.
// =============================================================

import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------------------------------------------------------
   Shared helpers
--------------------------------------------------------------- */
function setLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}

function showAlert(el, message, type = "error") {
  if (!el) return;
  el.textContent = message;
  el.className = `form-alert ${type} show`;
}

function hideAlert(el) {
  if (!el) return;
  el.classList.remove("show");
}

const FRIENDLY_ERRORS = {
  "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/weak-password": "Password should be at least 8 characters.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/expired-action-code": "This reset link has expired. Request a new one.",
  "auth/invalid-action-code": "This reset link is invalid or already used."
};
function friendlyError(err) {
  return FRIENDLY_ERRORS[err?.code] || "Something went wrong. Please try again.";
}

/* Redirect signed-in users away from auth pages */
export function redirectIfAuthed() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "/dashboard.html";
  });
}

/* ---------------------------------------------------------------
   Register
--------------------------------------------------------------- */
export function initRegisterForm() {
  const form = document.getElementById("register-form");
  if (!form) return;
  const alertEl = document.getElementById("form-alert");
  const submitBtn = form.querySelector('button[type="submit"]');
  const pwInput = document.getElementById("password");
  const strengthFill = document.getElementById("pw-strength-fill");

  if (pwInput && strengthFill) {
    pwInput.addEventListener("input", () => {
      const { score, label, color } = passwordStrength(pwInput.value);
      strengthFill.style.width = `${score * 25}%`;
      strengthFill.style.background = color;
      const labelEl = document.getElementById("pw-strength-label");
      if (labelEl) labelEl.textContent = pwInput.value ? label : "";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = pwInput.value;
    const confirmPassword = document.getElementById("confirm-password").value;
    const agree = document.getElementById("agree-terms")?.checked;

    if (password !== confirmPassword) {
      showAlert(alertEl, "Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      showAlert(alertEl, "Password should be at least 8 characters.");
      return;
    }
    if (!agree) {
      showAlert(alertEl, "Please agree to the Terms & Conditions to continue.");
      return;
    }

    setLoading(submitBtn, true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        role: "member",
        photoURL: null,
        phone: "",
        skills: [],
        bio: "",
        theme: "dark",
        createdAt: serverTimestamp()
      });

      await sendEmailVerification(cred.user);
      window.location.href = "/verify-email.html";
    } catch (err) {
      showAlert(alertEl, friendlyError(err));
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Very weak", color: "var(--danger)" },
    { label: "Weak", color: "var(--danger)" },
    { label: "Fair", color: "var(--warning)" },
    { label: "Good", color: "var(--cyan)" },
    { label: "Strong", color: "var(--success)" }
  ];
  return { score, ...levels[score] };
}

/* ---------------------------------------------------------------
   Login
--------------------------------------------------------------- */
export function initLoginForm() {
  const form = document.getElementById("login-form");
  if (!form) return;
  const alertEl = document.getElementById("form-alert");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    setLoading(submitBtn, true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        window.location.href = "/verify-email.html";
        return;
      }
      window.location.href = "/dashboard.html";
    } catch (err) {
      showAlert(alertEl, friendlyError(err));
    } finally {
      setLoading(submitBtn, false);
    }
  });

  const togglePw = document.getElementById("toggle-password");
  const pwInput = document.getElementById("password");
  if (togglePw && pwInput) {
    togglePw.addEventListener("click", () => {
      const isPw = pwInput.type === "password";
      pwInput.type = isPw ? "text" : "password";
      togglePw.innerHTML = `<i class="fa-solid ${isPw ? "fa-eye-slash" : "fa-eye"}"></i>`;
    });
  }
}

/* ---------------------------------------------------------------
   Forgot password (send reset email)
--------------------------------------------------------------- */
export function initForgotPasswordForm() {
  const form = document.getElementById("forgot-form");
  if (!form) return;
  const alertEl = document.getElementById("form-alert");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const email = document.getElementById("email").value.trim();

    setLoading(submitBtn, true);
    try {
      await sendPasswordResetEmail(auth, email);
      form.style.display = "none";
      showAlert(alertEl, `If an account exists for ${email}, a reset link is on its way.`, "success");
    } catch (err) {
      // Don't reveal whether the email exists — show success regardless
      // unless it's a formatting problem.
      if (err.code === "auth/invalid-email") {
        showAlert(alertEl, friendlyError(err));
      } else {
        form.style.display = "none";
        showAlert(alertEl, `If an account exists for ${email}, a reset link is on its way.`, "success");
      }
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

/* ---------------------------------------------------------------
   Reset password (from emailed link: ?oobCode=...)
--------------------------------------------------------------- */
export function initResetPasswordForm() {
  const form = document.getElementById("reset-form");
  if (!form) return;
  const alertEl = document.getElementById("form-alert");
  const submitBtn = form.querySelector('button[type="submit"]');

  const params = new URLSearchParams(window.location.search);
  const oobCode = params.get("oobCode");

  if (!oobCode) {
    showAlert(alertEl, "This reset link is missing or invalid. Request a new one.");
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
    return;
  }

  verifyPasswordResetCode(auth, oobCode).catch(() => {
    showAlert(alertEl, "This reset link has expired or already been used.");
    form.querySelectorAll("input, button").forEach((el) => (el.disabled = true));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alertEl);
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      showAlert(alertEl, "Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      showAlert(alertEl, "Password should be at least 8 characters.");
      return;
    }

    setLoading(submitBtn, true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      form.style.display = "none";
      showAlert(alertEl, "Password updated. You can now log in.", "success");
      setTimeout(() => (window.location.href = "/login.html"), 1800);
    } catch (err) {
      showAlert(alertEl, friendlyError(err));
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

/* ---------------------------------------------------------------
   Verify email page — polls / allows resend
--------------------------------------------------------------- */
export function initVerifyEmailPage() {
  const resendBtn = document.getElementById("resend-verification");
  const statusEl = document.getElementById("verify-status");
  const emailEl = document.getElementById("verify-email-addr");

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "/login.html";
      return;
    }
    if (emailEl) emailEl.textContent = user.email;
    if (user.emailVerified) {
      window.location.href = "/dashboard.html";
    }
  });

  if (resendBtn) {
    resendBtn.addEventListener("click", async () => {
      setLoading(resendBtn, true);
      try {
        await sendEmailVerification(auth.currentUser);
        if (statusEl) { statusEl.textContent = "Verification email sent."; statusEl.className = "form-alert success show"; }
      } catch (err) {
        if (statusEl) { statusEl.textContent = friendlyError(err); statusEl.className = "form-alert error show"; }
      } finally {
        setLoading(resendBtn, false);
      }
    });
  }

  // Re-check verification status every few seconds without requiring reload
  const interval = setInterval(async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      clearInterval(interval);
      window.location.href = "/dashboard.html";
    }
  }, 4000);
}
