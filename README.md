# CBT Exam Simulator

An offline-friendly Computer-Based Test (CBT) exam simulator built with React + Vite + Firebase.
Designed for BEd entrance preparation but works for any MCQ-style exam.

## Features

- Drop your own question file (`.json`, `.csv`, or `.txt`) — fully offline parsing
- Realistic CBT exam UI: timer, question palette, "mark for review", navigation
- Detailed post-exam analytics: score, time, accuracy, subject-wise breakdown, question-by-question review
- Email/password authentication (Firebase Auth) with persistent login
- Cloud-synced question sets and exam results across all your devices (Firestore)
- Works offline — uploads and results queue and sync automatically when you reconnect
- Mobile-friendly responsive UI with slide-out question palette

## Tech Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS v4** for the auth screens (most pages use inline styles for portability)
- **Firebase** — Auth + Firestore (no Storage required)

## Project Structure

```
cbt-exam-simulator/
├── public/                 # Static assets (favicon, opengraph image)
├── src/
│   ├── auth/               # Firebase auth context (login/signup/logout)
│   ├── components/         # SubmitDialog and other UI bits
│   ├── pages/              # Home, ExamPage, ResultPage, LoginPage
│   ├── utils/              # computeResult: score calculation
│   ├── App.tsx             # Top-level router (home / exam / result)
│   ├── main.tsx            # React entry point
│   ├── firebase.ts         # Firebase init (auth + firestore + offline cache)
│   ├── store.ts            # localStorage helpers + question file parser
│   ├── results.ts          # Firestore CRUD for exam results
│   ├── questionSets.ts     # Firestore CRUD for question sets
│   ├── types.ts            # Shared TypeScript types
│   └── index.css           # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Quick Start

### 1. Prerequisites

- **Node.js** 18 or newer (20+ recommended) — [download](https://nodejs.org/)
- **npm** (comes with Node) — or use **pnpm** / **yarn** if you prefer

### 2. Clone the repo

```bash
git clone https://github.com/<your-username>/cbt-exam-simulator.git
cd cbt-exam-simulator
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### 5. Build for production

```bash
npm run build
```

The production-ready static files are written to `dist/`.

### 6. Preview the production build locally

```bash
npm run preview
```

---

## Firebase Setup

This app ships with a pre-configured Firebase project so it works out of the box for testing.
**For real use, you should create your own Firebase project** (the bundled one is shared and
can be wiped at any time).

### Step 1 — Create a Firebase project

1. Go to https://console.firebase.google.com/ and click **Add project**
2. Give it a name and finish the wizard (Google Analytics is optional)

### Step 2 — Enable Authentication

1. In the left sidebar: **Build → Authentication → Get started**
2. **Sign-in method** tab → **Email/Password** → enable → save

### Step 3 — Enable Firestore

1. **Build → Firestore Database → Create database**
2. Pick a location (e.g. `asia-south1` for India)
3. Start in **production mode**
4. Go to the **Rules** tab and paste the rules below, then click **Publish**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Each user's exam results
    match /users/{userId}/results/{resultId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Each user's question sets
    match /users/{userId}/questionSets/{setId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Block everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 4 — Get your web app config

1. Project Settings (gear icon) → **General** → scroll to **Your apps**
2. Click the **`</>`** (Web) icon, register a nickname, click **Register**
3. Copy the `firebaseConfig` object shown

### Step 5 — Plug it into the code

Open `src/firebase.ts` and replace the `firebaseConfig` object with yours:

```ts
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

> 🔒 **Note on safety:** Firebase web config values are **safe to commit to a public repo**.
> They identify your project but grant no access on their own — security is enforced by the
> Firestore Rules you set up in Step 3. See the
> [official Firebase docs](https://firebase.google.com/docs/projects/api-keys) for details.

### Step 6 — Authorize your hosting domain

When you deploy, add your production URL (e.g. `your-app.vercel.app`) to:
**Authentication → Settings → Authorized domains → Add domain**

`localhost` is authorized by default for development.

---

## Deployment

The app is a pure static SPA — any static host works. Run `npm run build` first.

### Vercel (recommended — easiest)

1. Push to GitHub
2. Import the repo at https://vercel.com
3. Framework preset: **Vite** (auto-detected)
4. Click **Deploy** — done

### Netlify

1. Push to GitHub
2. New site at https://app.netlify.com → import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting     # public dir: dist, single-page app: yes
npm run build
firebase deploy
```

### GitHub Pages (sub-path hosting)

GitHub Pages serves at `https://<user>.github.io/<repo-name>/`, so you must build with the
correct base path:

```bash
VITE_BASE=/cbt-exam-simulator/ npm run build
```

Then publish the `dist/` folder. The simplest way is the
[`gh-pages`](https://www.npmjs.com/package/gh-pages) package:

```bash
npm install --save-dev gh-pages
npx gh-pages -d dist
```

---

## Question File Formats

You can drop any of these directly into the app:

### JSON

```json
[
  {
    "question": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctIndex": 1,
    "subject": "Math",
    "explanation": "Basic arithmetic."
  }
]
```

### CSV

```csv
question,a,b,c,d,answer,subject,explanation
"What is 2+2?","3","4","5","6",B,Math,"Basic arithmetic"
```

### TXT

```
1. What is 2 + 2?
A. 3
B. 4
C. 5
D. 6
Answer: B
Explanation: Basic arithmetic

2. Next question...
```

---

## Common Issues

**"Sign-up fails with `auth/operation-not-allowed`"**
You haven't enabled Email/Password in Firebase Auth → see Step 2 above.

**"Results don't sync / stay local"**
Your Firestore Rules aren't published or are still in default-deny mode. Re-paste the rules
from Step 3 and click **Publish**.

**"Login works locally but not on the deployed site"**
Add your production domain to Firebase **Authentication → Settings → Authorized domains**.

**"GitHub Pages shows a blank page"**
You forgot the `VITE_BASE` flag at build time. See the GitHub Pages section above.

---

## License

MIT — use it for your own exam practice or fork it freely.
