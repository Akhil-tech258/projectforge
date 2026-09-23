// =============================================================
// PROJECTFORGE — AUTH MIDDLEWARE
// Verifies the Firebase ID token sent as `Authorization: Bearer <token>`
// and attaches the decoded user to req.user. requireAdmin additionally
// checks the user's Firestore role.
// =============================================================

const { auth, db } = require("../firebaseAdmin");

async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing authentication token" });

    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const snap = await db.collection("users").doc(req.user.uid).get();
    if (!snap.exists || snap.data().role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Couldn't verify admin role" });
  }
}

module.exports = { verifyToken, requireAdmin };
