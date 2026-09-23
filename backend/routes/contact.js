// =============================================================
// PROJECTFORGE — CONTACT FORM ROUTE
// Public route (no auth) with tight rate limiting to prevent spam.
// Stores the message in Firestore for the admin panel to review.
// =============================================================

const express = require("express");
const rateLimit = require("express-rate-limit");
const { db } = require("../firebaseAdmin");
const { admin } = require("../firebaseAdmin");

const router = express.Router();
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });

router.post("/", contactLimiter, async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    await db.collection("contactMessages").add({
      name: String(name).slice(0, 120),
      email: String(email).slice(0, 200),
      subject: String(subject || "General inquiry").slice(0, 200),
      message: String(message).slice(0, 4000),
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Thanks — we'll get back to you soon." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
