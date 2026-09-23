// =============================================================
// PROJECTFORGE — FIREBASE ADMIN SDK
// Initializes firebase-admin once, shared by all backend routes.
// Requires a service account key (see .env.example).
// =============================================================

const admin = require("firebase-admin");

if (!admin.apps.length) {
  const hasInlineCreds =
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  admin.initializeApp({
    credential: hasInlineCreds
      ? admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // .env files store the key with literal \n — convert back to real newlines.
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        })
      : admin.credential.applicationDefault(),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

module.exports = {
  admin,
  auth: admin.auth(),
  db: admin.firestore(),
  bucket: admin.storage().bucket()
};
