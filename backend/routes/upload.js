// =============================================================
// PROJECTFORGE — FILE UPLOAD ROUTES
// The browser uploads directly to Firebase Storage using the client
// SDK (fast, no server bottleneck). This route exists for cases where
// you want server-validated, time-limited signed URLs instead — e.g.
// for large files or extra virus/type checks before granting access.
// =============================================================

const express = require("express");
const { bucket } = require("../firebaseAdmin");
const { verifyToken } = require("../middleware/verifyToken");

const router = express.Router();

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const MAX_SIZE_MB = 25;

// POST /api/upload/signed-url  { fileName, fileType, projectId }
router.post("/signed-url", verifyToken, async (req, res, next) => {
  try {
    const { fileName, fileType, projectId } = req.body;
    if (!fileName || !fileType || !projectId) {
      return res.status(400).json({ error: "fileName, fileType, and projectId are required" });
    }
    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(415).json({ error: "File type not allowed" });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `projects/${projectId}/files/${Date.now()}-${safeName}`;
    const file = bucket.file(path);

    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      contentType: fileType
    });

    res.json({ uploadUrl, storagePath: path, maxSizeMB: MAX_SIZE_MB });
  } catch (err) {
    next(err);
  }
});

// GET /api/upload/download-url?path=...
router.get("/download-url", verifyToken, async (req, res, next) => {
  try {
    const { path } = req.query;
    if (!path) return res.status(400).json({ error: "path is required" });

    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "File not found" });

    const [downloadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 15 * 60 * 1000
    });
    res.json({ downloadUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
