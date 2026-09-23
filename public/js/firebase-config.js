// =============================================================
// PROJECTFORGE — FIREBASE CONFIG
// Replace the values below with your own Firebase project config
// (Firebase Console → Project Settings → General → Your apps → SDK setup).
// This file is safe to expose publicly — these are client identifiers,
// not secrets. Access control is enforced by Firestore/Storage Security
// Rules (see /backend/firestore.rules) and Firebase Auth, not by hiding
// these values.
// =============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  connectStorageEmulator
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

export const isFirebaseConfigured = !firebaseConfig.apiKey.includes("YOUR_");

// Backend API base — point this at your Express server (Render/local).
export const API_BASE_URL = "http://localhost:5000/api";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Flip to true + run `firebase emulators:start` for local dev without
// touching production data.
const USE_EMULATORS = false;
if (USE_EMULATORS && location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectStorageEmulator(storage, "localhost", 9199);
}
