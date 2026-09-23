// =============================================================
// PROJECTFORGE — ADMIN ROUTES
// All routes require a valid token AND an admin role in Firestore.
// =============================================================

const express = require("express");
const { db, auth } = require("../firebaseAdmin");
const { verifyToken, requireAdmin } = require("../middleware/verifyToken");

const router = express.Router();
router.use(verifyToken, requireAdmin);

// GET /api/admin/users — list all users
router.get("/users", async (req, res, next) => {
  try {
    const snap = await db.collection("users").orderBy("createdAt", "desc").limit(200).get();
    res.json(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
  } catch (err) { next(err); }
});

// PATCH /api/admin/users/:uid — update role / disable account
router.patch("/users/:uid", async (req, res, next) => {
  try {
    const { role, disabled } = req.body;
    const updates = {};
    if (role) updates.role = role;
    await db.collection("users").doc(req.params.uid).update(updates);
    if (typeof disabled === "boolean") {
      await auth.updateUser(req.params.uid, { disabled });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/admin/users/:uid
router.delete("/users/:uid", async (req, res, next) => {
  try {
    await auth.deleteUser(req.params.uid);
    await db.collection("users").doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/admin/projects — all projects across the platform
router.get("/projects", async (req, res, next) => {
  try {
    const snap = await db.collection("projects").orderBy("createdAt", "desc").limit(200).get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) { next(err); }
});

// GET /api/admin/reports — aggregate platform stats
router.get("/reports", async (req, res, next) => {
  try {
    const [usersSnap, projectsSnap] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("projects").count().get()
    ]);
    res.json({
      totalUsers: usersSnap.data().count,
      totalProjects: projectsSnap.data().count,
      generatedAt: new Date().toISOString()
    });
  } catch (err) { next(err); }
});

// GET /api/admin/activity-logs
router.get("/activity-logs", async (req, res, next) => {
  try {
    const snap = await db.collection("activities").orderBy("createdAt", "desc").limit(100).get();
    res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  } catch (err) { next(err); }
});

module.exports = router;
