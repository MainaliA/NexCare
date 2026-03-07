# NexCare Merge Debug Report
## First Merge of 4 People's Code — All Issues Found & Fixed

---

## CRITICAL: Two Frameworks Merged Together (Fatal)

The biggest problem: **two people built for different frameworks simultaneously**.

- **Person A + Person B** built for **Next.js** (App Router, Prisma, `jose` JWT, httpOnly cookies)
- **Person D** built for **Express + better-sqlite3** (raw SQL, Bearer tokens)
- **Person B also** partially scaffolded a **Vite + React Router** setup in `src/`

The project had Next.js files (`app/`, `middleware.ts`, `lib/`, `prisma/`) AND Vite files (`src/`, `vite.config.js`, `index.html`) coexisting. These cannot run together.

**Decision:** Committed to **Next.js** because it had the most complete code (full patient frontend, auth, API routes, Prisma schema, seed data). Converted Person D's Express LLM logic into Next.js-compatible modules.

---

## All 15 Bugs Found & Fixed

### 1. FATAL — Two `export default` in `src/App.jsx`

**File:** `src/App.jsx`
**Problem:** Contains TWO `export default function App()` declarations — the original demo AND the router-based app, both in the same file. JavaScript only allows one default export; this would crash on compile.
**Fix:** File removed entirely (committed to Next.js). The demo component's styling language carries forward in the Next.js pages.

### 2. FATAL — Missing `react-router-dom` in `package.json`

**File:** `package.json`
**Problem:** `src/App.jsx` imports from `react-router-dom` but it was never added to dependencies. Would crash: `Module not found: Can't resolve 'react-router-dom'`.
**Fix:** Removed all Vite/React Router files. Next.js uses file-based routing.

### 3. FATAL — Missing Vite dependencies

**File:** `package.json`
**Problem:** `vite.config.js` imports `@vitejs/plugin-react` and `@tailwindcss/vite`, but neither is in `package.json`. `npm run dev` for Vite would fail.
**Fix:** Removed Vite config. Using Next.js dev server only.

### 4. FATAL — React components in `server/` directory

**Files:** `server/AuthContext.jsx`, `server/Layout.jsx`, `server/ProtectedRoute.jsx`
**Problem:** These are identical copies of files in `src/components/` and `src/context/`, but placed inside the `server/` folder. Their import paths (`../context/AuthContext`) would be wrong from that location. These are frontend React components that cannot run in a Node.js server context.
**Fix:** Removed entirely. These were duplicates placed in the wrong directory.

### 5. CRITICAL — No Chat API route for Next.js

**Problem:** Patient chat page (`app/(patient)/chat/page.tsx`) calls `POST /api/chat`, but no `app/api/chat/route.ts` existed. Person D built this as an Express route (`server/routes/chat.js`) that expects `req.app.get("db")` (SQLite), not Prisma.
**Fix:** Created `app/api/chat/route.ts` using Prisma + the Next.js auth pattern. Converted Person D's chatbot logic to work with `lib/llm.ts`.

### 6. CRITICAL — No Doctor API routes

**Problem:** The plan calls for doctor endpoints (`/api/doctor/patients`, `/api/doctor/alerts`, `/api/doctor/appointments`), but NONE existed as Next.js API routes. Person D built partial Express routes, but they use `better-sqlite3` and can't work in Next.js.
**Fix:** Created all 6 missing doctor API routes:
- `GET /api/doctor/patients` — patient list with alert counts
- `GET /api/doctor/patients/[id]` — full patient detail
- `POST /api/doctor/appointments` — create appointment + AI summary
- `GET /api/doctor/alerts` — alert feed
- `POST /api/doctor/alerts/[id]/acknowledge` — acknowledge alert
- `GET /api/doctor/patients/[id]/daily-report` — AI daily report

### 7. CRITICAL — No Doctor frontend pages

**Problem:** No pages existed at `app/doctor/dashboard`, `app/doctor/patients/[id]`, or `app/doctor/appointments/new`. Person C's work was either not started or not committed.
**Fix:** Created all 3 doctor pages with full functionality matching the plan spec.

### 8. CRITICAL — Two incompatible auth systems

**Problem:** Three different auth approaches existed simultaneously:
- `lib/auth.ts`: `jose` JWT with httpOnly cookies (Next.js server components)
- `src/context/AuthContext.jsx`: `localStorage` + Bearer header (Vite client)
- `server/middleware/auth-compat.js`: Passthrough fallback for missing middleware

A patient logging in via the Next.js login page would set a cookie, but the Vite AuthContext would try to read from `localStorage` and find nothing.
**Fix:** Removed the Vite auth. All auth goes through `lib/auth.ts` with httpOnly cookies.

### 9. CRITICAL — Two incompatible database systems

**Problem:**
- `lib/db.ts` uses **Prisma** with `prisma.appointment.findFirst(...)` syntax
- `server/routes/chat.js` uses **better-sqlite3** with `db.prepare("SELECT...").get()` syntax
- The two cannot share data; they're completely different APIs pointing at potentially different DB files.

**Fix:** All database access now goes through Prisma. Person D's Express routes converted to Next.js API routes using Prisma.

### 10. HIGH — Missing `triageConfidence` in Prisma schema

**File:** `prisma/schema.prisma`
**Problem:** The `Symptom` model had no `triageConfidence` field, but Person D's Express routes and Person B's symptom API both try to save confidence scores from the AI triage. Would cause a Prisma runtime error: `Unknown arg 'triageConfidence'`.
**Fix:** Added `triageConfidence Int?` to the Symptom model. Updated seed data to include confidence for Lisa's symptom.

### 11. HIGH — `ChatMessage` model has no `Appointment` relation

**File:** `prisma/schema.prisma`
**Problem:** `ChatMessage` had `appointmentId` as a plain string but no `@relation` to `Appointment`. This prevents Prisma from doing joins and breaks referential integrity.
**Fix:** Added `appointment Appointment @relation(...)` and `chatMessages ChatMessage[]` on Appointment.

### 12. MEDIUM — Tailwind config only scans `app/` and `components/`

**File:** `tailwind.config.ts`
**Problem:** `content` array didn't include `lib/` directory. Any Tailwind classes used in utility files would be purged in production.
**Fix:** Added `"./lib/**/*.{js,ts,jsx,tsx,mdx}"` to the content array.

### 13. MEDIUM — Two conflicting Tailwind setups

**Problem:** Two CSS files with different Tailwind syntax:
- `app/globals.css`: Uses `@tailwind base; @tailwind components;` (Tailwind v3 with PostCSS)
- `src/index.css`: Uses `@import "tailwindcss"` (Tailwind v4 with Vite plugin)

Running both would cause class conflicts and broken styles.
**Fix:** Kept `app/globals.css` (v3 syntax matching the PostCSS config). Removed `src/index.css`.

### 14. MEDIUM — Logout route uses broken redirect

**File:** `app/api/auth/logout/route.ts`
**Problem:** Imports `redirect` from `next/navigation` (which only works in Server Components, not Route Handlers) and hardcodes `http://localhost:3000`. Would crash in production.
**Fix:** Uses `NextResponse.redirect(new URL("/login", req.nextUrl.origin))`.

### 15. LOW — `App.css` contains unused Vite boilerplate

**File:** `src/App.css`
**Problem:** Contains logo spin animations and Vite template styles that override the dark theme.
**Fix:** Removed (not needed in Next.js).

---

## Files Removed (Conflict Resolution)

| File | Reason |
|------|--------|
| `src/App.jsx` | Two default exports; Vite-only; replaced by Next.js pages |
| `src/App.css` | Vite boilerplate overriding dark theme |
| `src/main.jsx` | Vite entry point; Next.js uses `app/layout.tsx` |
| `src/index.css` | Tailwind v4 syntax conflicts with v3 PostCSS setup |
| `src/components/Layout.jsx` | Vite/React Router Layout; Next.js uses middleware |
| `src/components/ProtectedRoute.jsx` | React Router guard; Next.js uses middleware |
| `src/context/AuthContext.jsx` | localStorage auth; conflicts with httpOnly cookie auth |
| `vite.config.js` | Vite config; project uses Next.js |
| `index.html` | Vite entry HTML; Next.js generates its own |
| `eslint.config.js` | Vite ESLint; Next.js has its own config |
| `server/AuthContext.jsx` | Duplicate of src/ file, wrong directory |
| `server/Layout.jsx` | Duplicate of src/ file, wrong directory |
| `server/ProtectedRoute.jsx` | Duplicate of src/ file, wrong directory |
| `server/routes/chat.js` | Express route; replaced by Next.js API route |
| `server/routes/llm.js` | Express module; merged into `lib/llm.ts` |
| `server/routes/symptoms.js` | Express route; already exists as Next.js API route |
| `server/routes/daily-report.js` | Express route; replaced by Next.js API route |
| `server/middleware/auth-compat.js` | Express middleware; Next.js uses `middleware.ts` |
| `server/demo-cache.js` | Merged into `lib/llm.ts` |

## Files Created (Missing Features)

| File | What It Does |
|------|-------------|
| `app/api/chat/route.ts` | Chat API (was only Express, not Next.js) |
| `app/api/doctor/patients/route.ts` | Doctor patient list endpoint |
| `app/api/doctor/patients/[id]/route.ts` | Patient detail endpoint |
| `app/api/doctor/appointments/route.ts` | Create appointment + AI summary |
| `app/api/doctor/alerts/route.ts` | Alert feed endpoint |
| `app/api/doctor/alerts/[id]/acknowledge/route.ts` | Alert acknowledge |
| `app/api/doctor/patients/[id]/daily-report/route.ts` | AI daily report |
| `app/doctor/dashboard/page.tsx` | Doctor dashboard UI |
| `app/doctor/patients/[id]/page.tsx` | Patient detail UI |
| `app/doctor/appointments/new/page.tsx` | New appointment form |

---

## Setup Instructions (Fixed Project)

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open http://localhost:3000 and log in with the demo accounts on the login page.

Set `ANTHROPIC_API_KEY` in `.env.local` for live AI, or keep `FORCE_DEMO_CACHE=true` for cached demo responses.
