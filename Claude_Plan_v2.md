# NexCare — Revised Hackathon Battle Plan
## Based on Actual Codebase Audit

---

## What You Have Right Now

After examining the repo, here's the honest assessment:

| Component | Status | Details |
|-----------|--------|---------|
| Project scaffolding | ✅ Done | Vite + React 19 + Tailwind CSS (via `@tailwindcss/vite`) |
| UI prototype | ✅ Partial | Single `App.jsx` — a medical report simplifier with hardcoded demo data |
| Routing | ❌ Missing | No react-router; the app is one single page |
| Backend / API | ❌ Missing | No server, no Express, nothing |
| Database | ❌ Missing | No SQLite, no Prisma, no data layer at all |
| Authentication | ❌ Missing | No login, no signup, no role system |
| LLM integration | ❌ Missing | The "Simplify" button uses `setTimeout` + hardcoded JSON, not a real API call |
| Patient dashboard | ❌ Missing | No patient-specific views |
| Doctor dashboard | ❌ Missing | No doctor-specific views |
| Chatbot | ❌ Missing | Not started |
| Symptom triage | ❌ Missing | Not started |
| Alerts system | ❌ Missing | Not started |
| Medicine tracking | ❌ Missing | Not started |

**Bottom line:** You have a working Vite + React + Tailwind shell with a single demo component. Everything else needs to be built.

---

## Critical Architecture Decision: Keep Vite or Migrate to Next.js?

The old plan assumed Next.js (API routes + React in one repo). Your actual project is Vite (frontend only — no backend).

**Recommendation: Keep Vite + Add Express Backend.**

Why NOT migrate to Next.js: switching frameworks mid-hackathon is risky; even though the codebase is tiny, you'll spend 20–30 minutes debugging the migration instead of building features.

Why Vite + Express: Vite is already working, Tailwind is configured, the team knows the project. Adding an Express server in a `/server` folder is fast and gives you everything you need (API routes, database, LLM calls).

### Revised Tech Stack

| Layer | Tool | Why |
|-------|------|-----|
| Frontend | **Vite + React 19 + Tailwind** | Already set up and working |
| Routing | **react-router-dom v7** | Add client-side routing for patient/doctor/login pages |
| Backend | **Express.js** (in `/server` folder) | Lightweight, fast to scaffold, handles API routes |
| Database | **better-sqlite3** | Zero-config SQLite; synchronous API means simpler code than Prisma for a hackathon |
| LLM | **Claude API (claude-sonnet-4-20250514)** | Called from Express routes, never from the browser |
| Auth | **Simple JWT** | Express middleware checks token; frontend stores in localStorage |
| Dev runner | **concurrently** | Runs Vite + Express together with one `npm run dev` |

---

## Revised Team Roles (Adjusted for What Exists)

| Person | Ownership | What They Build |
|--------|-----------|-----------------|
| **Person A — Infrastructure** | Backend skeleton + DB + Auth + Dev setup | Express server, SQLite schema, seed data, auth endpoints, CORS config, `concurrently` setup |
| **Person B — Patient Experience** | Everything the patient sees | React pages: login, patient dashboard, LLM summary view, medicine checklist, symptom report modal, chatbot UI |
| **Person C — Doctor Experience** | Everything the doctor sees | React pages: doctor dashboard, patient overview, add appointment form, alerts feed, daily report view |
| **Person D — AI Brain (You)** | All LLM-powered logic | Express routes for: summary generation, chatbot, symptom triage, daily report. All Claude API integration. Prompt engineering. Demo fallback cache. |

---

## Revised File Structure

```
NexCare-main/
├── index.html
├── package.json
├── vite.config.js
├── .env                          ← API keys (Person A + D create this)
│
├── server/                       ← NEW: Person A scaffolds, everyone adds routes
│   ├── index.js                  ← Express entry point
│   ├── db.js                     ← SQLite setup + schema creation
│   ├── seed.js                   ← Demo data
│   ├── middleware/
│   │   └── auth.js               ← JWT verification middleware
│   └── routes/
│       ├── auth.js               ← POST /api/auth/signup, /login, GET /me
│       ├── patient.js            ← GET /api/patient/appointments, medicines, POST /symptoms, /actions
│       ├── doctor.js             ← GET /api/doctor/patients, POST /appointments, alerts
│       ├── chat.js               ← POST /api/chat (Person D)
│       └── llm.js                ← Shared LLM helpers (Person D)
│
├── src/                          ← Frontend (React)
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx                   ← NOW: Router shell (replaces current demo)
│   ├── context/
│   │   └── AuthContext.jsx       ← Shared auth state (Person B creates)
│   ├── components/
│   │   ├── Layout.jsx            ← Shared nav bar + shell
│   │   ├── ProtectedRoute.jsx    ← Route guard
│   │   └── ui/                   ← Shared UI components (buttons, cards, modals)
│   └── pages/
│       ├── Login.jsx             ← Person B
│       ├── Signup.jsx            ← Person B
│       ├── patient/
│       │   ├── Dashboard.jsx     ← Person B (empty state + summary view)
│       │   ├── Chat.jsx          ← Person B (chatbot UI) + Person D (API)
│       │   └── SymptomReport.jsx ← Person B (modal/form)
│       └── doctor/
│           ├── Dashboard.jsx     ← Person C (patient grid + alerts)
│           ├── PatientDetail.jsx ← Person C (timeline + daily report)
│           └── NewAppointment.jsx← Person C (prescription form)
```

---

## Database Schema (SQL version — no Prisma)

Person A creates this in `server/db.js`:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('patient', 'doctor')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id),
  doctor_id TEXT NOT NULL REFERENCES users(id),
  date DATETIME NOT NULL,
  status TEXT DEFAULT 'completed' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
  prescription_text TEXT,
  diagnosis_text TEXT,
  daily_actions TEXT,
  llm_summary TEXT,
  pre_visit_checklist TEXT  -- JSON string
);

CREATE TABLE medicines (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id),
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times TEXT NOT NULL  -- JSON array: '["08:00","20:00"]'
);

CREATE TABLE symptoms (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id),
  appointment_id TEXT REFERENCES appointments(id),
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'low' CHECK(severity IN ('low', 'medium', 'high')),
  triage_result TEXT CHECK(triage_result IN ('expected', 'unexpected', 'escalate')),
  triage_reasoning TEXT,
  triage_confidence INTEGER,
  reported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_actions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL CHECK(action_type IN ('medicine_taken', 'chatbot_used', 'symptom_reported')),
  details TEXT,  -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id),
  doctor_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('new_symptom', 'missed_medicine', 'escalation')),
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread' CHECK(status IN ('unread', 'read', 'acted_on')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL REFERENCES appointments(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Contract (Everyone Must Follow This)

```
BASE URL: http://localhost:3001/api

AUTH (Person A)
  POST /auth/signup       { email, password, name, role }  → { token, user }
  POST /auth/login        { email, password }              → { token, user }
  GET  /auth/me           [Authorization: Bearer <token>]  → { user }

PATIENT (Person B + Person D for AI parts)
  GET  /patient/appointments                → { appointments: [...] }
  GET  /patient/medicines/today             → { medicines: [...], taken: [...] }
  POST /patient/medicines/:id/take          → { success: true }
  POST /patient/symptoms                    { description, severity, appointmentId }
                                            → { symptom, triage }
  POST /patient/actions                     { actionType, details }  → { success }

CHAT (Person D)
  POST /chat              { appointmentId, message, history }  → { reply, symptomDetected }
  GET  /chat?appointmentId=xxx              → { messages: [...] }

DOCTOR (Person C + Person D for AI parts)
  GET  /doctor/patients                     → { patients: [...] }
  GET  /doctor/patients/:id                 → { patient, appointments, symptoms, actions }
  POST /doctor/appointments                 { patientId, date, prescriptionText, diagnosisText,
                                              dailyActions, medicines[] }
                                            → { appointment, llmSummary, checklist }
  GET  /doctor/alerts                       → { alerts: [...] }
  POST /doctor/alerts/:id/acknowledge       → { success }
  GET  /doctor/patients/:id/daily-report    → { report, raw }
  POST /doctor/patients/:id/reschedule      { newDate, reason }  → { success }

HEADERS (all authenticated requests):
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
```

---

## Revised 5-Hour Timeline

### Hour 0:00–0:30 — Setup Sprint (Everyone Together)

**Person A (critical path — everyone is blocked until this is done):**
```bash
# Install backend dependencies
npm install express cors better-sqlite3 bcryptjs jsonwebtoken uuid dotenv concurrently

# Install frontend dependencies
npm install react-router-dom lucide-react

# Add to package.json scripts:
# "server": "node server/index.js",
# "dev": "concurrently \"vite\" \"node --watch server/index.js\"",
```
- Create `server/index.js` (Express boilerplate with CORS for localhost:5173)
- Create `server/db.js` (run the SQL schema above, export the db instance)
- Create `server/seed.js` (insert demo data)
- Create `server/middleware/auth.js` (JWT verify middleware)
- Create `server/routes/auth.js` (signup + login + me)
- Create `.env` with `ANTHROPIC_API_KEY` and `JWT_SECRET`

**Person B (while waiting for Person A):**
- Refactor `App.jsx` into a react-router shell with routes
- Create `src/context/AuthContext.jsx` (stores token + user, provides login/logout)
- Create `src/pages/Login.jsx` and `src/pages/Signup.jsx`
- Create `src/components/Layout.jsx` (shared nav bar with role-based links)
- Create `src/components/ProtectedRoute.jsx`

**Person C (while waiting for Person A):**
- Create `src/pages/doctor/Dashboard.jsx` — skeleton with hardcoded mock data
- Create `src/pages/doctor/NewAppointment.jsx` — the prescription form UI
- Start designing the patient overview card component

**Person D (you — while waiting for Person A):**
- Create `server/routes/llm.js` — the shared LLM helper module (all Claude API calls)
- Create `server/routes/chat.js` — the chatbot endpoint
- Write and test all system prompts in a scratch file
- Create `server/demo-cache.js` — pre-cached responses

**By 0:30 you should have:** Both servers running (`npm run dev` starts Vite on :5173 + Express on :3001), login/signup working, database seeded, react-router navigating between pages.

---

### Hour 0:30–2:00 — Core Build (Parallel, 90 min)

#### Person A — Backend Completion (90 min)

```
0:30–0:50  POST /api/doctor/appointments (create appointment + call Person D's summary generator)
0:50–1:10  GET /api/patient/appointments, GET /api/patient/medicines/today
1:10–1:30  POST /api/patient/medicines/:id/take, POST /api/patient/actions
1:30–1:50  GET /api/doctor/patients, GET /api/doctor/patients/:id
1:50–2:00  GET /api/doctor/alerts, POST /api/doctor/alerts/:id/acknowledge
```

Seed data should include:
- Doctor: Dr. Sarah Chen (doctor@demo.com / password123)
- Patient 1: Maria Garcia (maria@demo.com / password123) — diabetes, has appointment with prescription
- Patient 2: James Park (james@demo.com / password123) — new patient, no appointments
- Patient 3: Lisa Wong (lisa@demo.com / password123) — heart condition, has active alert

#### Person B — Patient Frontend (90 min)

```
0:30–1:00  Patient Dashboard: two states
           - Empty state (no appointments): friendly illustration + message
           - Active state: LLM summary card with three sections
             (What We Found / Your Medicines / Your Daily Plan)
           + "Ask About This" button → opens /patient/chat
           + "Report Symptom" button → opens modal

1:00–1:30  Medicine Checklist: today's medicines with time, dosage,
           "Mark as Taken" checkbox that POSTs to /api/patient/medicines/:id/take.
           Fetch from GET /api/patient/medicines/today

1:30–2:00  Symptom Report Modal: textarea + severity selector (mild/moderate/severe)
           + submit button. POST to /api/patient/symptoms.
           Show triage result after submission:
           - Green card: "This is expected..."
           - Yellow card: "We've noted this..."
           - Red card: "We've notified your doctor..."
```

**Key prompting instruction for Person B's AI assistant:**
"Use the existing dark theme from the project (bg-slate-950, border-slate-800, text-white). All components should use Tailwind classes consistent with the current App.jsx styling."

#### Person C — Doctor Frontend (90 min)

```
0:30–1:00  Doctor Dashboard: grid of patient cards
           - Each card: patient name, diagnosis preview, next appointment, status dot
           - Status: green (on track), yellow (needs attention), red (has alert)
           - Search bar to filter by name
           - "+ New Appointment" button in top right
           Fetch from GET /api/doctor/patients

1:00–1:30  New Appointment Form (full-screen modal or new page):
           - Patient dropdown selector
           - Date picker
           - Diagnosis textarea
           - Prescription textarea
           - Daily actions textarea
           - Medicine list: add multiple medicines (name, dosage, frequency, times)
           - Submit → POST /api/doctor/appointments
           - After submit: show the AI-generated summary for review

1:30–2:00  Alerts Feed: notification panel
           - Each alert: patient name, type badge, message, timestamp
           - Color-coded: red for escalation, yellow for new symptom
           - "Acknowledge" button on each alert
           - "Reschedule" button that opens a date picker
           Fetch from GET /api/doctor/alerts
```

#### Person D (You) — AI Brain (90 min)

```
0:30–1:00  Finalize server/routes/llm.js:
           - callClaude() base function with timeout + error handling
           - generateSummary() with full system prompt
           - triageSymptom() with JSON output parsing + safe fallback
           - Export all functions for other routes to import

1:00–1:30  Build server/routes/chat.js:
           - POST /api/chat: multi-turn conversation endpoint
             Fetches appointment context from DB → builds system prompt →
             sends conversation history to Claude → detects [SYMPTOM_DETECTED] tag →
             auto-creates alert if symptom found → returns reply
           - GET /api/chat?appointmentId=xxx: load chat history

1:30–2:00  Build symptom triage integration:
           - Wire triageSymptom() into Person A's POST /api/patient/symptoms route
             (or build that route yourself if Person A hasn't gotten to it)
           - Test with three scenarios: expected symptom, unexpected, escalation
           - Build generateDailyReport() function
           - Test all AI functions with real API calls
```

**Your actual prompt-to-code sequence:**

```
PROMPT 1 — Tell your AI assistant:

"Create an Express module at server/routes/llm.js that exports these functions.
Use the Anthropic Claude API (model: claude-sonnet-4-20250514, endpoint:
https://api.anthropic.com/v1/messages). API key comes from process.env.ANTHROPIC_API_KEY.

Functions to export:

1. callClaude(systemPrompt, userMessage, options) → string
   Base function. Handles timeout (30s), error handling, response parsing.

2. callClaudeWithHistory(systemPrompt, messages, options) → string
   Like callClaude but accepts full conversation history array.

3. generateSummary(diagnosis, prescription, dailyActions, patientName) → string
   System prompt: [paste the full summary system prompt from the earlier files]

4. triageSymptom(description, severity, diagnosis, prescription, doctorName) → object
   Returns JSON: { assessment, confidence, reasoning, patientMessage, doctorAlert, urgency }
   System prompt: [paste the full triage system prompt]
   IMPORTANT: if JSON parsing fails, default to 'escalate' for safety.

5. chatWithContext(message, history, patientName, doctorName, diagnosis, prescription, dailyActions)
   → { reply, symptomDetected }
   System prompt: [paste the chatbot system prompt]
   Detects [SYMPTOM_DETECTED: ...] tag in response.

6. generateDailyReport(input) → string
   System prompt: [paste the daily report system prompt]

Use node-fetch or the built-in fetch. All functions should have try/catch with
sensible fallback responses."

PROMPT 2 — Tell your AI assistant:

"Create an Express router at server/routes/chat.js with:

POST /
- Auth required (use middleware from ../middleware/auth.js)
- Body: { appointmentId, message, history }
- Look up the appointment from SQLite (use db from ../db.js) to get
  diagnosis_text, prescription_text, daily_actions, doctor name, patient name
- Call chatWithContext() from ./llm.js
- Save both the user message and assistant reply to chat_messages table
- If symptomDetected is not null, call triageSymptom() and create an alert
  in the alerts table if doctorAlert is true
- Return { reply, symptomDetected }

GET /
- Query param: appointmentId
- Return all chat_messages for that appointment, ordered by timestamp"
```

---

### Hour 2:00–2:30 — Integration Checkpoint (Everyone Together)

**Stop building. Wire everything together. Test the full flow:**

```
□ Login as doctor (doctor@demo.com) → see patient grid
□ Click "+ New Appointment" → fill form → submit
□ Summary generates (Person D's LLM) and saves to DB
□ Login as patient (maria@demo.com) → see summary on dashboard
□ Click medicine "Mark as Taken" → database updates
□ Open chatbot → send a message → get grounded response
□ Report a symptom ("mild nausea") → see "expected" triage result
□ Report a symptom ("chest tightness") → see "escalate" result
□ Switch to doctor login → see alert appear on dashboard
□ Click "Acknowledge" on alert → status changes

If ANY of these fail → fix it before moving on.
```

**Common bugs to expect at this point:**
- CORS errors: make sure Express has `cors({ origin: 'http://localhost:5173', credentials: true })`
- Token not sent: make sure frontend sends `Authorization: Bearer ${token}` header
- Database column name mismatch: backend uses `snake_case` (diagnosis_text), frontend might expect `camelCase` (diagnosisText) — pick one and be consistent
- Vite proxy: consider adding a proxy in `vite.config.js` to avoid CORS entirely:
  ```js
  server: { proxy: { '/api': 'http://localhost:3001' } }
  ```

---

### Hour 2:30–3:30 — Polish + Wow Features (60 min, Parallel)

#### Person A
- Fix remaining integration bugs
- Add Vite proxy to `vite.config.js` (eliminates CORS issues for good)
- Build the "readiness score" calculation: query patient_actions + medicines to compute adherence %
- Add demo role-switch button on login page for fast demo transitions
- Ensure seed data tells a compelling story (Maria's 2-week diabetes journey)

#### Person B
- **Chatbot page** (`src/pages/patient/Chat.jsx`):
  Message bubbles, text input, typing indicator, scroll behavior
  POST to /api/chat, display reply, handle symptom detection inline
- **Voice input button** on chatbot (Web Speech API — 15 lines)
- **Multi-language toggle** on summary (adds `?lang=es` parameter that Person D handles)
- Polish: loading skeletons, transitions, empty states

#### Person C
- **Patient Detail page** (`src/pages/doctor/PatientDetail.jsx`):
  Appointment timeline, symptom history, medicine adherence chart
- **Daily report section**: fetch GET /api/doctor/patients/:id/daily-report and display
- **Readiness score badge** on each patient card (circular progress indicator)
- **Voice-to-text** on prescription textarea (Web Speech API, share code with Person B)
- Polish: status badges, sorting, alert count indicators

#### Person D (You)
- **Build the daily report endpoint**: GET /api/doctor/patients/:id/daily-report
  Aggregate patient_actions + symptoms + medicine adherence → call generateDailyReport()
- **Add multi-language support**: modify generateSummary() to accept optional `language` param
  that appends "Respond entirely in [language]" to the system prompt
- **Empathy calibration**: add detectSeverity() call before summary generation
  so serious diagnoses get warmer language
- **Pre-visit checklist**: generate alongside summary, return in appointment response
- **Cache ALL demo responses** in server/demo-cache.js
- **Test edge cases**: empty symptom, very long chat history, API timeout behavior
- Wire up fallback cache so if Claude API fails, demo still works

---

### Hour 3:30–4:00 — Final Integration + Bug Fixes (30 min, Everyone)

- Full end-to-end demo walkthrough (both patient and doctor journeys)
- Fix critical bugs only — NO new features
- Person B + C: make the UI feel cohesive (consistent dark theme, spacing, fonts)
- Person D: verify all LLM responses look good with real data
- Person A: clean up any database/auth edge cases

---

### Hour 4:00–4:30 — Demo Prep (30 min)

**Demo Script (4 minutes):**

| Time | Screen | What Happens |
|------|--------|-------------|
| 0:00–0:30 | Slide | Problem statement: "Patients leave confused, doctors lose visibility between visits" |
| 0:30–1:30 | Doctor dashboard | Log in as Dr. Chen → see patient grid → click "New Appointment" → type prescription (or voice dictate) → submit → watch AI summary generate in real-time |
| 1:30–2:30 | Patient dashboard | Switch to Maria's login → summary visible in plain language → toggle to Spanish → open chatbot → ask "what are the side effects of metformin?" → get grounded answer |
| 2:30–3:15 | Symptom flow | Patient reports "chest tightness" → triage: ESCALATE (92% confidence) → switch to doctor → red alert appears → doctor acknowledges + reschedules |
| 3:15–3:45 | Doctor detail | Show daily report: "Maria took 2/3 medicines, used chatbot twice. Status: MONITOR" → show patient timeline |
| 3:45–4:00 | Slide | "This closes the loop between appointments. Patients understand. Doctors stay informed." |

**Pre-demo checklist:**
```
□ Fresh seed data loaded (run node server/seed.js)
□ Demo responses cached as fallback
□ Two browser tabs pre-logged-in (patient + doctor)
□ Tested full flow 2x without errors
□ Backup: if API dies, demo-cache.js kicks in automatically
```

---

### Hour 4:30–5:00 — Buffer + Presentation

---

## Person-by-Person Exact Task List with Prompts

### Person A — Prompts to Feed Your AI Assistant

```
PROMPT A1 (Minute 0):
"I have a Vite + React project. I need to add an Express backend.
Create these files:

server/index.js — Express server on port 3001 with CORS for localhost:5173,
JSON body parser, and route mounting for /api/auth, /api/patient, /api/doctor, /api/chat.

server/db.js — Use better-sqlite3 to create a SQLite database at ./nexcare.db.
Run this schema on startup: [paste the SQL schema above].
Export the db instance.

server/middleware/auth.js — Express middleware that reads Authorization header,
verifies JWT (secret from process.env.JWT_SECRET), attaches user to req.user.

server/routes/auth.js — Express router with:
  POST /signup: hash password with bcryptjs, insert user, return JWT + user object
  POST /login: verify password, return JWT + user object
  GET /me: auth middleware, return current user from DB

Update package.json to add: a 'server' script and a 'dev' script using concurrently
to run both Vite and Express."

PROMPT A2 (Minute 20):
"Create server/seed.js that populates the database with demo data:
- Doctor: Dr. Sarah Chen, doctor@demo.com, password123
- Patient: Maria Garcia, maria@demo.com, password123
  (has 1 completed appointment for Type 2 Diabetes with Metformin 500mg BID
  and Glipizide 5mg daily; has llm_summary pre-populated; has medicine records)
- Patient: James Park, james@demo.com, password123 (new patient, no appointments)
- Patient: Lisa Wong, lisa@demo.com, password123
  (heart condition, has 1 completed appointment, has 1 unread escalation alert)
Use uuid for IDs. Make the medical data realistic."

PROMPT A3 (Minute 50):
"Create server/routes/patient.js Express router with:
  GET /appointments — get all appointments for req.user.id with medicines
  GET /medicines/today — get medicines from latest appointment + check patient_actions to see which are taken today
  POST /medicines/:id/take — insert a patient_action with type 'medicine_taken'
  POST /actions — insert a patient_action (generic logging)
All routes use auth middleware. Use better-sqlite3 queries."

PROMPT A4 (Minute 70):
"Create server/routes/doctor.js Express router with:
  GET /patients — get all patients who have appointments with this doctor + latest appointment + alert count
  GET /patients/:id — get full patient detail: all appointments, symptoms, actions
  POST /appointments — create appointment + medicines. ALSO: call generateSummary from ./llm.js and save llm_summary.
  GET /alerts — get unread alerts for this doctor
  POST /alerts/:id/acknowledge — update alert status to 'read'
  POST /patients/:id/reschedule — update appointment date
All routes use auth middleware."
```

### Person B — Prompts to Feed Your AI Assistant

```
PROMPT B1 (Minute 0):
"Refactor this App.jsx [paste current App.jsx] into a react-router-dom v7 setup.
Replace the current single-page with routes:
  / → redirect to /login
  /login → Login page
  /signup → Signup page
  /patient/dashboard → Patient Dashboard (protected, role=patient)
  /patient/chat/:appointmentId → Chatbot (protected, role=patient)
  /doctor/dashboard → Doctor Dashboard (protected, role=doctor)
  /doctor/patients/:id → Patient Detail (protected, role=doctor)
  /doctor/appointments/new → New Appointment (protected, role=doctor)

Create an AuthContext that stores JWT token in localStorage,
provides login/logout/user/isAuthenticated.
Create a ProtectedRoute component that checks auth + role.
Create a Layout component with a top nav bar showing the app name and
a logout button. Keep the dark theme (bg-slate-950, text-white, border-slate-800)."

PROMPT B2 (Minute 30):
"Create a Login page and Signup page using the dark theme.
Login: email + password fields + submit. POST to http://localhost:5173/api/auth/login.
Signup: name + email + password + role selector (Patient / Doctor) + submit.
POST to /api/auth/signup.
On success, store token via AuthContext, redirect based on role.
Use Tailwind: bg-slate-900 cards, border-slate-700 inputs, white submit button."

PROMPT B3 (Minute 50):
"Create a Patient Dashboard page with TWO states:

State 1 (no appointments): Show a centered card with a friendly message:
'No appointments yet — your doctor will add you after your visit.'

State 2 (has appointments): Show the most recent appointment as a card.
Display the llm_summary field rendered as markdown (use a simple markdown renderer
or just dangerouslySetInnerHTML for the hackathon).
Below the summary, show:
- A medicine checklist (from the appointment's medicines). Each medicine shows name,
  dosage, frequency, and a checkbox. Clicking the checkbox POSTs to /api/patient/medicines/:id/take.
- Two buttons: 'Ask About This' (links to /patient/chat/:appointmentId) and
  'Report Symptom' (opens a modal).

Fetch from GET /api/patient/appointments. Use the dark theme."

PROMPT B4 (Minute 80):
"Create a Symptom Report modal component using the dark theme.
It has: a textarea for describing the symptom, a severity selector
(mild / moderate / severe as three clickable buttons), and a Submit button.
POST to /api/patient/symptoms with { description, severity, appointmentId }.
After the API responds, show the triage result in the modal:
- If triage.assessment is 'expected': green-tinted card with triage.patientMessage
- If 'unexpected': yellow-tinted card
- If 'escalate': red-tinted card + '⚠️' icon
Show confidence score as a small badge."
```

### Person C — Prompts to Feed Your AI Assistant

```
PROMPT C1 (Minute 0):
"Create a Doctor Dashboard page at src/pages/doctor/Dashboard.jsx.
Dark theme (bg-slate-950).
Shows a grid of patient cards. Each card displays:
- Patient name (bold)
- Latest diagnosis (truncated to 1 line)
- Next appointment date
- Status dot: green (no alerts), yellow (has unread alert), red (escalation alert)
- A small readiness score badge (percentage)
Top of page: search bar to filter patients by name + '+ New Appointment' button.
Below the grid: an 'Alerts' section showing unresolved alerts as a list.
Each alert has a type badge, patient name, message, and 'Acknowledge' button.
Fetch patients from GET /api/doctor/patients, alerts from GET /api/doctor/alerts.
Send Authorization header with token from AuthContext."

PROMPT C2 (Minute 50):
"Create a New Appointment page at src/pages/doctor/NewAppointment.jsx.
Dark theme. It's a form with:
- Patient selector (dropdown of patients from GET /api/doctor/patients)
- Date picker
- Large textarea: Diagnosis
- Large textarea: Prescription
- Large textarea: Daily Action Recommendations
- Dynamic medicine list: 'Add Medicine' button that adds a row with
  (name, dosage, frequency, times inputs). Can add multiple.
- Submit button: POST to /api/doctor/appointments
- After submit: show a 'Summary Preview' section displaying the AI-generated
  llmSummary that comes back in the response. Show a success message.
Add a microphone icon button next to each textarea for voice input using
the Web Speech API (window.SpeechRecognition)."

PROMPT C3 (Minute 80):
"Create a Patient Detail page at src/pages/doctor/PatientDetail.jsx.
Dark theme. Fetch from GET /api/doctor/patients/:id.
Show:
1. Patient header: name, email, latest diagnosis, readiness score gauge
2. Tab 1 'Timeline': vertical timeline showing appointments, symptom reports,
   and medicine actions chronologically. Use colored dots: blue for appointments,
   orange for symptoms, green for medicine taken.
3. Tab 2 'Daily Report': fetch GET /api/doctor/patients/:id/daily-report and
   display the AI-generated report text. Show raw stats below (medicines taken,
   chatbot sessions, weekly adherence %).
4. Tab 3 'Alerts': list of alerts for this patient with acknowledge buttons.
Include a 'Request Reschedule' button that opens a modal with a date picker
and reason textarea, POSTs to /api/doctor/patients/:id/reschedule."
```

### Person D (You) — Prompts to Feed Your AI Assistant

```
PROMPT D1 (Minute 0):
"Create server/routes/llm.js — an Express module exporting these functions.
Uses Anthropic Claude API (claude-sonnet-4-20250514).
API key from process.env.ANTHROPIC_API_KEY.
Use built-in fetch (Node 18+).

[Paste the exact llm.ts content from earlier, but convert from TypeScript
to plain JavaScript (remove type annotations, use JSDoc comments instead).
Change require/module.exports to export functions.]

Make sure triageSymptom returns a safe 'escalate' fallback if JSON parsing fails."

PROMPT D2 (Minute 30):
"Create server/routes/chat.js — Express router with:
POST / — [paste the chat route spec from earlier]
GET / — [paste the chat history spec]
Auth middleware required. Use db from ../db.js."

PROMPT D3 (Minute 60):
"Create server/demo-cache.js that exports pre-cached responses:
DEMO_SUMMARY_MARIA, DEMO_TRIAGE_EXPECTED, DEMO_TRIAGE_ESCALATE,
DEMO_DAILY_REPORT_MARIA, DEMO_CHAT_RESPONSES
[Paste the demo-cache.ts content, convert to plain JS]"

PROMPT D4 (Minute 80):
"Add to server/routes/doctor.js (or create a new file):
GET /patients/:id/daily-report
- Auth middleware (doctor only)
- Query patient_actions for today (medicine_taken, chatbot_used, symptom_reported)
- Query medicines from latest appointment
- Query symptoms reported today
- Calculate weekly adherence
- Call generateDailyReport() from ./llm.js
- Return { report, raw: { medicineTaken, medicineTotal, ... } }"
```

---

## Quick-Reference Timeline

```
TIME          PERSON A              PERSON B              PERSON C              PERSON D (You)
              (Infrastructure)      (Patient Frontend)    (Doctor Frontend)     (AI Brain)
────────────  ──────────────────    ──────────────────    ──────────────────    ──────────────────
0:00-0:10     Express + DB + Auth   React Router setup    Doctor Dashboard      server/routes/llm.js
              server scaffolding    + AuthContext          skeleton (mock data)  (base Claude wrapper)
0:10-0:20     Seed data script      Login + Signup pages  NewAppointment form   generateSummary() +
              + verify DB works                           skeleton              triageSymptom()
0:20-0:30     ── CHECKPOINT: Both servers running, login works, seed data loaded ─────────────────
0:30-1:00     Patient API routes    Patient Dashboard     Doctor Dashboard      chatWithContext() +
              (appointments,        (empty + active       (patient grid +       server/routes/chat.js
              medicines, actions)   states + summary)     search + status)
1:00-1:30     Doctor API routes     Medicine Checklist    NewAppointment form   Symptom triage
              (patients, alerts,    + Summary card        (full form + voice    integration + test
              appointments)         + action buttons      dictation)            all AI functions
1:30-2:00     Bug fixes + help      Symptom Report Modal  Alerts Feed           generateDailyReport()
              with integration      + triage display      + acknowledge flow    + demo-cache.js
2:00-2:30     ── INTEGRATION CHECKPOINT: Full user journey test ─────────────────────────────────
2:30-3:00     Vite proxy + fix      Chatbot page          Patient Detail page   Daily report endpoint
              CORS + readiness      (message bubbles +    (timeline + tabs)     + multi-language
              score calculation     typing indicator)                           summary support
3:00-3:30     Demo data polish      Voice input +         Readiness score +     Empathy calibration +
              + role switch btn     language toggle        daily report view     pre-visit checklist +
                                                                               cache demo responses
3:30-4:00     ── FINAL INTEGRATION + BUG FIXES ────────────────────────────────────────────────
4:00-4:30     ── DEMO PREP: Script rehearsal + 2x full run ────────────────────────────────────
4:30-5:00     ── PRESENTATION ──────────────────────────────────────────────────────────────────
```

---

## What the Current App.jsx Becomes

The existing `App.jsx` report simplifier demo gets **replaced** by the router shell. But the dark theme and design language carry forward — every new page should use the same `bg-slate-950`, `border-slate-800`, `text-white`, `bg-slate-900` card pattern.

If the team wants to keep the original report simplifier as a "quick demo" feature, Person B can add it as a standalone page at `/demo` that shows the original functionality. But for the main app, `App.jsx` becomes:

```jsx
// The new App.jsx (Person B creates this first)
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PatientDashboard from "./pages/patient/Dashboard";
import PatientChat from "./pages/patient/Chat";
import DoctorDashboard from "./pages/doctor/Dashboard";
import PatientDetail from "./pages/doctor/PatientDetail";
import NewAppointment from "./pages/doctor/NewAppointment";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<Layout />}>
            {/* Patient routes */}
            <Route path="/patient/dashboard" element={
              <ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>
            } />
            <Route path="/patient/chat/:appointmentId" element={
              <ProtectedRoute role="patient"><PatientChat /></ProtectedRoute>
            } />

            {/* Doctor routes */}
            <Route path="/doctor/dashboard" element={
              <ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>
            } />
            <Route path="/doctor/patients/:id" element={
              <ProtectedRoute role="doctor"><PatientDetail /></ProtectedRoute>
            } />
            <Route path="/doctor/appointments/new" element={
              <ProtectedRoute role="doctor"><NewAppointment /></ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```
