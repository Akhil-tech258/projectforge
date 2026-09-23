// =============================================================
// PROJECTFORGE — AUTH ROUTES
// Most auth (register/login/reset) happens client-side via the
// Firebase Auth SDK. These routes cover the few things that need
// a trusted server: reading another user's public profile safely,
// and a session check endpoint.
// =============================================================

const express = require("express");
const { db } = require("../firebaseAdmin");
const { verifyToken } = require("../middleware/verifyToken");

const router = express.Router();

// GET /api/auth/me — confirms the token is valid and returns the caller's profile
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const snap = await db.collection("users").doc(req.user.uid).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
    res.json({ uid: req.user.uid, ...snap.data() });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/users/:uid — public-safe profile lookup (for mentions, assignee pickers)
router.get("/users/:uid", verifyToken, async (req, res, next) => {
  try {
    const snap = await db.collection("users").doc(req.params.uid).get();
    if (!snap.exists) return res.status(404).json({ error: "User not found" });
    const { name, photoURL, email } = snap.data();
    res.json({ uid: req.params.uid, name, photoURL, email });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
