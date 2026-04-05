# Velocity Garage

Velocity Garage is a static multi-page supercar web app built with HTML, Tailwind-styled UI, and vanilla JavaScript, with client-side Firebase integration for authentication, user state, and media storage. The authenticated experience includes catalog browsing, favorites, wishlist, compare, profile management, and an AI-style recommendation flow, while admin pages provide real-time user analytics and ban/unban controls backed by Firestore and a `bannedUsers` collection.

## Table of Contents

- [Feature Summary](#feature-summary)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Local Setup](#local-setup)
- [Environment Configuration](#environment-configuration)
- [Scripts](#scripts)
- [Firebase Setup Checklist](#firebase-setup-checklist)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Support](#support)

## Feature Summary

### User-facing

- Public landing page (`index.html`) with randomized fleet preview and login gating for protected areas.
- Email/password authentication.
- Google and GitHub sign-in flows (popup with redirect fallback handling).
- Auth-guarded pages for `home.html`, `favorites.html`, `wishlist.html`, `compare.html`, and `profile.html`.
- Search/filter/sort vehicle catalog.
- Favorites, wishlist, and compare collections synced to Firestore (`users/{uid}`).
- Compare cap enforced at 3 vehicles.
- AI-style recommendation panel based on budget, performance priority, and region.
- Profile management:
  - Display name update
  - Profile image upload to Firebase Storage
  - Password change flow
- Password reset request + reset completion page with action code validation.
- Password-changed notification flow via callable Cloud Function (`sendPasswordChangedEmail`).
- Theme preference (dark/light) persisted in user state.

### Admin-facing

- Admin dashboard (`admin.html`) with real-time metrics and leaderboards.
- User management table with search.
- Ban/unban workflow tied to Firestore `bannedUsers/{uid}` and user status updates.
- Real-time ban monitor in auth layer that forces restricted users to sign out.
- Secondary admin user list page (`admin-users.html`).

## Tech Stack

### Frontend

- HTML (multi-page application)
- Tailwind CSS utilities (via CDN in page templates)
- Vanilla JavaScript (ES modules + browser globals)
- Firebase Web SDK `10.7.1` (Auth, Firestore, Storage, Functions)

### Backend/Services

- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Functions (callable)
- Nodemailer (SMTP mail delivery in Cloud Functions)

### Tooling

- Node.js scripts for runtime env generation
- `serve` for local static hosting
- Playwright runtime smoke harness (`scripts/runtime-smoke.mjs`)
- PostCSS / Autoprefixer / Tailwind package dependencies (present in root tooling)

### Deployment

- Vercel static deployment (`vercel.json` present)
- Firebase Cloud Functions deployment (function source in `functions/index.js`)

## Architecture

### Page flow and auth gating

- `index.html` is public and redirects signed-in users to `home.html`.
- Protected pages use `checkAuth()` before loading page-specific scripts.
- Admin pages enforce `checkAdmin()` and rely on email-based admin checks in current implementation.

### State sync model

- `window.vgUserStore` is the client state hub.
- On auth changes, it ensures/loads `users/{uid}`, subscribes with Firestore `onSnapshot`, and broadcasts updates.
- Page scripts subscribe to user state and update UI immediately.
- Collection toggles (`favorites`, `wishlist`, `compare`) persist to Firestore and are normalized client-side.

### Data model (practical)

- `users/{uid}` stores identity and preference fields used across the app, including:
  - `favorites`, `wishlist`, `compare`, `darkMode`
  - profile fields (`name`, `firstName`, `photo`, etc.)
  - counters and timestamps
- `bannedUsers/{uid}` acts as the ban marker collection used for admin moderation and forced sign-out behavior.
- Storage profile image path is `users/{uid}/profile.jpg`.
- Catalog data lives in `js/cars.js` with 40 entries and normalized image fallback handling (`CAR_IMAGE_FALLBACK`).

## Project Structure

```text
.
├─ admin.html / admin-users.html    # Admin dashboards and user management UIs
├─ index.html                       # Public landing page
├─ home.html                        # Authenticated showroom home
├─ favorites.html                   # Favorites page (auth-guarded)
├─ wishlist.html                    # Wishlist page (auth-guarded)
├─ compare.html                     # Compare page (auth-guarded)
├─ profile.html                     # Profile and password management (auth-guarded)
├─ login.html / signup.html         # Auth entry pages
├─ forgot-password.html             # Password reset request page
├─ reset-password.html              # Password reset completion page
├─ env.js                           # Generated browser runtime env file (build output)
├─ generate-env.js                  # Root wrapper for scripts/generate-env.js
├─ firestore.rules                  # Firestore security rules
├─ storage.rules                    # Storage security rules
├─ vercel.json                      # Vercel build/output settings
├─ components/
│  ├─ Button.js                     # Shared button render helpers
│  ├─ Card.js                       # Shared card templates
│  └─ Modal.js                      # Shared car modal controller
├─ functions/
│  ├─ index.js                      # Cloud Function: sendPasswordChangedEmail
│  └─ package.json                  # Functions runtime/dependencies
├─ js/
│  ├─ auth.js / auth-guard.js       # Auth flows and route protection
│  ├─ firebase-config.js            # Firebase client bootstrap from runtime env
│  ├─ user-store.js                 # Firestore-backed user state sync
│  ├─ home-page.js                  # Authenticated home page logic
│  ├─ favorites-page.js             # Favorites page logic
│  ├─ wishlist-page.js              # Wishlist page logic
│  ├─ compare-page.js               # Compare page logic
│  ├─ profile-page.js               # Profile page logic
│  ├─ admin-page.js                 # Admin analytics and moderation logic
│  ├─ admin-users-page.js           # Admin users list page logic
│  ├─ login-page.js / signup-page.js
│  ├─ forgot-password-page.js / reset-password-page.js
│  ├─ password-notification.js      # Callable function client wrapper
│  └─ cars.js                       # Main catalog dataset and helpers
├─ scripts/
│  ├─ generate-env.js               # Runtime env generator for browser
│  └─ runtime-smoke.mjs             # Playwright runtime smoke test harness
└─ utils/
   ├─ firebase.js                   # Collection action helpers and compare cap
   └─ helpers.js                    # Shared UI/data utility helpers
```

Notes:
- `car.html` exists and currently mirrors admin-oriented wiring (`/js/admin-page.js`).
- `assets/styles/tailwind.css` exists as a compiled stylesheet artifact, while pages currently use Tailwind CDN classes directly.

## Prerequisites

- Node.js `24.x` for the root project (declared in root `package.json`).
- Node.js `20` for Cloud Functions (declared in `functions/package.json`).
- npm.
- A Firebase project with:
  - Authentication
  - Firestore
  - Storage
  - Cloud Functions
- Google and GitHub OAuth app/provider setup in Firebase Auth.
- SMTP provider credentials for password-changed emails.
- Optional: Vercel account for static hosting.

Because root and Functions Node engines differ, use a version manager (for example, nvm/Volta) if you work in both contexts.

## Local Setup

```bash
git clone https://github.com/Paulolutunmbi/velocity-garage.git
cd velocity-garage
npm install
```

1. Create local env file from template:

```bash
cp .env.example .env.local
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env.local
```

2. Fill required Firebase values in `.env.local`.
3. Generate browser runtime env:

```bash
npm run build
```

4. Start local static server:

```bash
npm run dev
```

5. Open:
- `http://127.0.0.1:5000/index.html`

If you will work on Cloud Functions too:

```bash
cd functions
npm install
cd ..
```

## Environment Configuration

The app reads runtime values from `window.__ENV` (generated into `/env.js` by `npm run build`).

### Client/runtime Firebase variables (required)

| Variable | Required | Used by | Purpose |
|---|---|---|---|
| `FIREBASE_API_KEY` | Yes | `js/firebase-config.js` | Firebase web app config |
| `FIREBASE_AUTH_DOMAIN` | Yes | `js/firebase-config.js` | Auth domain and redirect behavior |
| `FIREBASE_PROJECT_ID` | Yes | `js/firebase-config.js` | Firestore/Functions project binding |
| `FIREBASE_STORAGE_BUCKET` | Yes | `js/firebase-config.js` | Profile image storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Yes | `js/firebase-config.js` | Firebase app config |
| `FIREBASE_APP_ID` | Yes | `js/firebase-config.js` | Firebase app config |

### Optional client/runtime variables

| Variable | Required | Used by | Purpose |
|---|---|---|---|
| `FIREBASE_ADMIN_EMAIL` | No | `js/firebase-config.js`, admin checks | Client-side admin identity override |
| `FIREBASE_EXPECTED_AUTH_DOMAINS` | No | `js/firebase-config.js` | Comma-separated hostnames for auth-domain warnings |
| `FIREBASE_FUNCTIONS_REGION` | No | `js/password-notification.js` | Region for callable function client |
| `FIREBASE_PASSWORD_RESET_URL` | No | `js/auth.js` | Override password reset continue URL |

Also supported by `scripts/generate-env.js` as aliases for required Firebase keys:
- `NEXT_PUBLIC_FIREBASE_*`
- `VITE_FIREBASE_*`
- `REACT_APP_FIREBASE_*`

`.env.example` currently includes required Firebase keys plus `FIREBASE_ADMIN_EMAIL`.

### Cloud Functions SMTP variables

Set these for the Functions runtime used by `sendPasswordChangedEmail`:

| Variable | Required | Purpose |
|---|---|---|
| `SMTP_HOST` | Yes | SMTP server hostname |
| `SMTP_PORT` | Yes | SMTP server port |
| `SMTP_USER` | Yes | SMTP auth username |
| `SMTP_PASS` | Yes | SMTP auth password |
| `SMTP_SECURE` | No | Use TLS if set to `true` |
| `SMTP_FROM` | No | Optional sender override (falls back to `SMTP_USER`) |

## Scripts

### Root scripts (`package.json`)

- `npm run build`
  - Runs `node generate-env.js`
  - Generates `/env.js` from environment variables
  - Fails fast when required Firebase keys are missing
- `npm run dev`
  - Runs build, then serves the repository statically on port `5000`

### Functions scripts (`functions/package.json`)

- `npm run lint`
  - Placeholder script (`No lint configured`)

### Additional runnable utilities

- Runtime smoke harness:

```bash
node scripts/runtime-smoke.mjs
```

This is not currently wired to an npm script.

## Firebase Setup Checklist

### 1) Authentication

- Enable providers:
  - Email/Password
  - Google
  - GitHub
- Verify OAuth credentials are configured for Google and GitHub in Firebase Auth provider settings.

### 2) Authorized domains

- Add your local and deployed hosts in Firebase Auth authorized domains.
- Ensure any password reset continue URL domain is authorized.
- Optionally set `FIREBASE_EXPECTED_AUTH_DOMAINS` to surface hostname mismatch warnings in the browser console.

### 3) Firestore

- Create Firestore database.
- Deploy rules from `firestore.rules`.
- Ensure app uses `users/{uid}` docs and `bannedUsers/{uid}` ban markers.

### 4) Storage

- Enable Firebase Storage.
- Deploy rules from `storage.rules`.
- Confirm profile image writes to `users/{uid}/profile.jpg`.

### 5) Functions

- Deploy function source in `functions/index.js`.
- Set SMTP environment variables listed above.
- Confirm callable function name is `sendPasswordChangedEmail`.

## Deployment

### Vercel (static app)

`vercel.json` is already configured with:
- `buildCommand`: `npm run build`
- `outputDirectory`: `.`
- `framework`: `null`

Deploy steps:
1. Import repo into Vercel.
2. Add required runtime env variables in Vercel Project Settings.
3. Deploy. Build will generate `/env.js`.

### Cloud Functions

This repository includes function source and dependencies, but does not currently include `firebase.json` or `.firebaserc` in tracked files.

Practical approach:
1. Initialize Firebase project configuration for this repo (one-time).
2. Install dependencies in `functions/`.
3. Configure SMTP runtime variables.
4. Deploy functions with Firebase CLI.

If your project is already initialized, deployment is typically:

```bash
firebase deploy --only functions
```

If not initialized yet, run Firebase init first before deployment.

## Testing

### Runtime smoke test (Playwright)

1. Start the app:

```bash
npm run dev
```

2. In a second terminal, run:

```bash
node scripts/runtime-smoke.mjs
```

Optional custom base URL:

```powershell
$env:BASE_URL="http://127.0.0.1:5000"
node scripts/runtime-smoke.mjs
```

What it checks:
- Page load health for `home.html`, `favorites.html`, `wishlist.html`, `compare.html`
- Modal open/close behavior
- Local runtime request failures and console/page errors

## Troubleshooting

### Missing env variable startup failures

Symptoms:
- `npm run build` fails with missing Firebase key errors.
- Browser throws `Missing required environment variable` from `js/firebase-config.js`.

Fix:
- Fill required keys in `.env.local`.
- Re-run `npm run build` to regenerate `/env.js`.

### Unauthorized domain / auth redirect issues

Symptoms:
- Firebase auth errors like `auth/unauthorized-domain` or redirect failures.

Fix:
- Add all active hosts to Firebase Auth authorized domains.
- Verify OAuth provider settings and callback domains.
- Confirm optional `FIREBASE_EXPECTED_AUTH_DOMAINS` list if using hostname warnings.

### Password reset link/action code issues

Symptoms:
- Reset page shows invalid/expired link.
- Errors such as invalid/expired action code.

Fix:
- Ensure reset links include valid `mode` and `oobCode`.
- Confirm the reset URL points to your deployed `reset-password.html`.
- Ensure reset domain is authorized in Firebase Auth settings.

### Running with `file://` instead of a local server

Symptoms:
- Inconsistent module loading, auth redirects, and runtime behavior.

Fix:
- Do not open pages directly with `file://`.
- Use `npm run dev` and access via `http://127.0.0.1:5000`.

### SMTP misconfiguration for password notifications

Symptoms:
- Callable function fails when password change notifications run.
- Function reports missing server env or mail transport issues.

Fix:
- Set all required SMTP variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`).
- Verify `SMTP_SECURE` and `SMTP_FROM` values.
- Check your SMTP provider logs and rate limits.

## Security Notes

- Keep secrets out of source control:
  - `.env`
  - `.env.local`
  - generated runtime env files (`env.js`, `js/env.js`)
- Do not store real credentials in docs, examples, or screenshots.
- Use environment variables per environment (local/staging/production).
- Rotate keys immediately if exposure occurred (Firebase and SMTP credentials).
- Review and tighten admin identity handling and Firestore rules before production scale.

## Roadmap

- Add a first-class test script (for example `npm run smoke`) and CI integration.
- Add tracked Firebase deployment config (`firebase.json`, `.firebaserc`) for repeatable Functions deploys.
- Move admin authorization from email equality checks to Firebase custom claims.
- Consolidate/remove duplicate runtime env artifacts (`js/env.js`) if no longer needed.
- Add stronger end-to-end coverage for auth edge cases and moderation flows.

## Contributing

1. Fork and create a feature branch.
2. Install dependencies at root (and `functions/` if needed).
3. Configure local env values via `.env.local`.
4. Run `npm run build` and `npm run dev`.
5. Run runtime smoke test (`node scripts/runtime-smoke.mjs`) before submitting.
6. Open a PR with a clear change summary and testing notes.

Please avoid committing environment files or generated runtime config artifacts.

## Support

- No dedicated support channel is documented in repository metadata.
- For development issues, open a GitHub issue in this repository.
- For account moderation/contact messaging, update deployment-specific admin contact configuration in your environment and auth UI text.