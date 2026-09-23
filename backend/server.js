// =============================================================
// PROJECTFORGE — BACKEND ENTRY POINT
// Express API used for server-side concerns that shouldn't run in
// the browser: verifying ID tokens for privileged actions, admin
// operations (role changes, user management, reports), signed file
// upload helpers, the AI assistant (Gemini) proxy, and the contact
// form endpoint. Everyday CRUD (projects/tasks/comments) is done
// directly from the frontend via the Firestore client SDK + Security
// Rules — that's intentional for a Firestore-backed app and keeps
// realtime listeners cheap. This server exists for the things the
// client must NOT be trusted to do itself.
// =============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");
const aiRoutes = require("./routes/ai");
const contactRoutes = require("./routes/contact");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "2mb" }));

// Basic global rate limit; individual routers can add stricter limits.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "projectforge-api", time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/contact", contactRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`ProjectForge API listening on port ${PORT}`);
});

module.exports = app;
