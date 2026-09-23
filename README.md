# ProjectForge

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=for-the-badge&logo=github)](https://akhil-tech258.github.io/projectforge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> 🚀 **Live Demo:** [https://akhil-tech258.github.io/projectforge/](https://akhil-tech258.github.io/projectforge/)  
> *Includes a **Live Interactive Demo / Portfolio Preview** mode for instant exploration of the Kanban boards, charts, calendar, file manager, and team chat without requiring private credentials.*

An AI-powered, full-stack project management & team collaboration platform — vanilla HTML/CSS/JS frontend, Node.js/Express backend, Firebase (Auth, Firestore, Storage) for data.

## What's built

**Frontend** (`/public`)
- Marketing site: Home, Features, Pricing, About, FAQ, Contact, Privacy, Terms
- Auth: Register, Login, Forgot/Reset Password, Email Verification — all wired to Firebase Auth
- App shell: Dashboard, My Projects, Project Details (Kanban board with drag & drop), Calendar, File Manager, Analytics, Team Chat, Notifications, Profile, Settings, Admin Dashboard
- Shared "Forge" dark glassmorphism design system (`css/design-system.css`, `css/app-shell.css`, `css/marketing.css`)
- Realtime data via Firestore listeners — no page refreshes needed for boards, chat, or notifications

**Backend** (`/backend`)
- Express API for the things the browser shouldn't do directly: admin operations (user/project management, reports, activity logs), signed file-upload URLs, the Gemini-powered AI project planner, and the public contact form
- `firestore.rules` and `storage.rules` enforcing per-project, role-based access control
- Everyday CRUD (projects, tasks, comments) runs client-side straight against Firestore, protected by those security rules — this keeps realtime listeners fast and is the standard pattern for a Firestore-backed app

## Setup

### 1. Firebase project
1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password provider
3. Enable **Firestore Database** (production mode)
4. Enable **Storage**
5. Deploy the security rules:
   ```
   firebase deploy --only firestore:rules,storage:rules
   ```
   (or paste `backend/firestore.rules` / `backend/storage.rules` into the console's Rules tab)
6. In Project Settings → General → Your apps, create a Web app and copy the config into `public/js/firebase-config.js`

### 2. Frontend
No build step — it's static. Serve `/public` with any static server, e.g.:
```bash
cd public
npx serve .
```
Or deploy to Firebase Hosting / Netlify / Vercel.

### 3. Backend
```bash
cd backend
cp .env.example .env   # fill in your Firebase service account + Gemini key
npm install
npm run dev             # nodemon, or `npm start` for production
```
Generate the service account key from **Firebase Console → Project Settings → Service Accounts → Generate new private key**.

Deploy the backend to Render, Railway, or any Node host. Update `API_BASE_URL` in `public/js/firebase-config.js` to point at the deployed URL.

### 4. First admin user
New accounts default to `role: "member"` in Firestore. To make yourself an admin, open Firestore in the console and manually set `role: "admin"` on your `users/{uid}` document — the Admin Dashboard link and API routes check this field.

## Firestore data model
```
users/{uid}                 name, email, role, photoURL, phone, skills, bio, createdAt
projects/{id}                name, description, ownerId, memberIds[], members[], priority,
                              deadline, status, archived, color, taskCount, completedTaskCount
  /tasks/{id}                 title, description, status, priority, labels[], checklist[],
                               assignee, dueDate, comments[]
  /files/{id}                  name, type, url, storagePath, uploaderId, sizeLabel
  /messages/{id}                text, authorId, authorName, createdAt   (Team Chat)
notifications/{id}            userId, type, text, read, createdAt
activities/{id}                userIds[], type, text, createdAt         (dashboard feed)
contactMessages/{id}           name, email, subject, message, status    (server-write only)
```

## Notes / next steps
- The AI project planner (`POST /api/ai/plan-project`) needs a `GEMINI_API_KEY` in `backend/.env`; without it the endpoint returns a clear "not configured" error instead of failing silently.
- `activities` and `notifications` are written by your own app logic as users take actions (e.g. add a write when a task is assigned) — the read side is fully wired up on the Dashboard and Notifications page.
- File Manager uses a Firestore **collection group query** on `files` — if Firestore prompts you to create a composite index the first time you load it, click the link it gives you in the console.
