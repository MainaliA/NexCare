# Vibe Coding Hackathon Battle Plan
## Patient-Doctor Information Platform — 5 Hours, 4 People

---

## Why Vibe Coding Changes Everything

In a traditional hackathon, you split by technical layer — one person does backend, one does frontend — because writing code is the bottleneck. With vibe coding, AI writes most of the code for you. The new bottleneck is **decisions, integration, and coherence**.

This means three fundamental shifts in strategy:

**Shift 1: Vertical slices, not horizontal layers.** Each person owns a complete feature from database to UI. No one is "the backend person" waiting for "the frontend person." Everyone ships working, end-to-end features independently.

**Shift 2: The shared contract is sacred.** When four people are all generating full-stack code with AI, the #1 failure mode is incompatible code. You need a shared schema, shared component library, and shared API shape agreed on BEFORE anyone starts prompting.

**Shift 3: Taste and editing matter more than generation.** AI will generate 80% of the code. Your job is the other 20%: knowing what to ask for, spotting when the output is wrong, and making the pieces fit together. The best vibe coders aren't the fastest prompters — they're the best editors.

---

## Team Structure: Feature Owners, Not Role Specialists

| Person | Feature Ownership | End-to-End Scope |
|--------|-------------------|------------------|
| **Person A — "The Foundation"** | Auth + Database + Shared Infrastructure | Login/signup system, database schema, shared API utilities, deployment, and the app shell that everyone else builds inside |
| **Person B — "The Patient Experience"** | Everything the patient sees and does | Patient dashboard, LLM summary view, medicine reminders, symptom reporting UI, and the patient-side API routes that power them |
| **Person C — "The Doctor Command Center"** | Everything the doctor sees and does | Doctor dashboard, patient overview, add appointment flow, alerts feed, daily reports, and the doctor-side API routes |
| **Person D — "The AI Brain"** | Every LLM-powered feature | Summary generator, chatbot engine, symptom triage agent, auto-report generator, prompt engineering, and the API wrapper all AI calls flow through |

**Why this works better than role-based splits:** Person B can prompt their AI assistant "build me a React component for the patient dashboard with a medicine checklist, connected to a /api/patient/medicines endpoint that reads from SQLite" and get a working vertical slice in one shot. They don't need to wait for a backend person.

---

## The Shared Contract (Agree on This First — Non-Negotiable)

### Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router)** | Full-stack in one repo; API routes + React pages; AI assistants are extremely fluent in Next.js |
| Database | **SQLite via Prisma** | Zero setup, file-based, Prisma gives you typed queries and easy schema sharing |
| Styling | **Tailwind CSS + shadcn/ui** | Everyone's AI assistant knows Tailwind cold; shadcn gives polished components instantly |
| LLM | **Claude API (claude-sonnet-4-20250514)** | Fast, cheap, good at structured output; use one shared wrapper function |
| Auth | **Simple JWT with cookies** | Don't use NextAuth or Clerk — too much config time; a 50-line JWT helper is enough |

### Database Schema (Everyone Must Use This Exactly)

```prisma
// schema.prisma — Person A creates this; everyone else reads from it

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String
  role          String   // "patient" or "doctor"
  createdAt     DateTime @default(now())

  // Relations
  patientAppointments  Appointment[] @relation("PatientAppointments")
  doctorAppointments   Appointment[] @relation("DoctorAppointments")
  symptoms             Symptom[]
  actions              PatientAction[]
  alertsReceived       Alert[]       @relation("DoctorAlerts")
  alertsSent           Alert[]       @relation("PatientAlerts")
}

model Appointment {
  id              String   @id @default(uuid())
  patientId       String
  doctorId        String
  date            DateTime
  status          String   @default("scheduled") // scheduled | completed | cancelled
  prescriptionText String?
  diagnosisText    String?
  dailyActions     String?  // Doctor's recommended daily actions (plain text)
  llmSummary       String?  // Generated plain-language summary for patient
  medicines        Medicine[]
  symptoms         Symptom[]

  patient User @relation("PatientAppointments", fields: [patientId], references: [id])
  doctor  User @relation("DoctorAppointments", fields: [doctorId], references: [id])
}

model Medicine {
  id            String @id @default(uuid())
  appointmentId String
  name          String
  dosage        String
  frequency     String
  times         String // JSON array: ["08:00", "14:00", "20:00"]

  appointment Appointment @relation(fields: [appointmentId], references: [id])
}

model Symptom {
  id              String   @id @default(uuid())
  patientId       String
  appointmentId   String?
  description     String
  severity        String   @default("low") // low | medium | high
  triageResult    String?  // expected | unexpected | escalate
  triageReasoning String?
  reportedAt      DateTime @default(now())

  patient     User         @relation(fields: [patientId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])
}

model PatientAction {
  id         String   @id @default(uuid())
  patientId  String
  actionType String   // medicine_taken | chatbot_used | symptom_reported
  details    String?  // JSON with context
  timestamp  DateTime @default(now())

  patient User @relation(fields: [patientId], references: [id])
}

model Alert {
  id        String   @id @default(uuid())
  patientId String
  doctorId  String
  type      String   // new_symptom | missed_medicine | escalation
  message   String
  status    String   @default("unread") // unread | read | acted_on
  createdAt DateTime @default(now())

  patient User @relation("PatientAlerts", fields: [patientId], references: [id])
  doctor  User @relation("DoctorAlerts", fields: [doctorId], references: [id])
}

model ChatMessage {
  id            String   @id @default(uuid())
  appointmentId String
  role          String   // user | assistant
  content       String
  timestamp     DateTime @default(now())
}
```

### Shared API Shape (So Everyone's Code Connects)

```
AUTH
  POST /api/auth/signup     { email, password, name, role }  → { token, user }
  POST /api/auth/login      { email, password }              → { token, user }
  GET  /api/auth/me         (cookie)                         → { user }

PATIENT-SIDE (Person B builds these)
  GET  /api/patient/appointments                → [{ appointment + llmSummary + medicines }]
  GET  /api/patient/medicines/today             → [{ medicine, taken: bool }]
  POST /api/patient/medicines/:id/take          → { success }
  POST /api/patient/symptoms                    { description, severity, appointmentId } → { triageResult }
  POST /api/patient/actions                     { actionType, details } → { success }

CHATBOT (Person D builds this)
  POST /api/chat                                { appointmentId, message, history } → { reply }

DOCTOR-SIDE (Person C builds these)
  GET  /api/doctor/patients                     → [{ patient + latestAppointment + readinessScore }]
  GET  /api/doctor/patients/:id                 → { patient + allAppointments + symptoms + actions }
  POST /api/doctor/appointments                 { patientId, date, prescriptionText, diagnosisText, dailyActions, medicines[] } → { appointment + llmSummary }
  GET  /api/doctor/alerts                       → [{ alert }]
  POST /api/doctor/alerts/:id/acknowledge       → { success }
  POST /api/doctor/patients/:id/reschedule      { newDate, reason } → { success }
  GET  /api/doctor/patients/:id/daily-report    → { generatedReport }
```

### File Structure

```
/app
  /api
    /auth/signup/route.ts      ← Person A
    /auth/login/route.ts       ← Person A
    /auth/me/route.ts          ← Person A
    /patient/*/route.ts        ← Person B
    /chat/route.ts             ← Person D
    /doctor/*/route.ts         ← Person C
  /(auth)
    /login/page.tsx            ← Person A
    /signup/page.tsx           ← Person A
  /(patient)
    /dashboard/page.tsx        ← Person B
    /chat/page.tsx             ← Person B
  /(doctor)
    /dashboard/page.tsx        ← Person C
    /patients/[id]/page.tsx    ← Person C
/lib
    /db.ts                     ← Person A (Prisma client)
    /auth.ts                   ← Person A (JWT helpers)
    /llm.ts                    ← Person D (Claude API wrapper)
/components
    /ui/                       ← shadcn components (shared)
/prisma
    /schema.prisma             ← Person A
    /seed.ts                   ← Person A (demo data)
```

---

## The 5-Hour Timeline

### Hour 0:00–0:30 — The Alignment Sprint (Everyone Together)

This is the most important 30 minutes. Do NOT start coding yet.

**Minutes 0–10: Agree on the contract above.** Walk through the schema and API shape. Everyone asks questions. Modify if needed. Once locked, nobody changes the schema without telling the group.

**Minutes 10–20: Set up the repo.** One person (Person A) creates the Next.js project, installs dependencies (prisma, tailwindcss, shadcn/ui, jose for JWT), and pushes to Git. Everyone clones.

**Minutes 20–30: Seed data and verify.** Person A runs `prisma db push` and the seed script. Everyone else verifies they can start the dev server and see the seeded data. Meanwhile, Person D starts drafting LLM prompts in a scratch file.

**What the seed data should contain:**
- 1 doctor: Dr. Sarah Chen (email: doctor@demo.com)
- 3 patients: Maria Garcia (diabetes follow-up, has completed appointment with prescription), James Park (new patient, no appointments yet), Lisa Wong (heart condition, has appointment with alert)
- Pre-filled prescriptions, medicines, and a few symptom reports for Maria
- This gives everyone realistic data to build against immediately

---

### Hour 0:30–2:30 — The Build Phase (120 min, Parallel Work)

This is the core build. Everyone works independently on their vertical slice. Communication happens through the shared schema and API contract, not through shouting across the table.

#### Person A — The Foundation (120 min)

**What to prompt your AI assistant for:**

```
Prompt 1 (0:30–0:50): "Build me a Next.js API route for signup and login
using JWT stored in httpOnly cookies. Use Prisma with SQLite. Include
password hashing with bcrypt. The user model has email, passwordHash,
name, and role (patient or doctor). Return the user object on success."

Prompt 2 (0:50–1:10): "Build me a login page and signup page in Next.js
App Router using shadcn/ui components. The signup form should have a
role selector (Patient or Doctor). After login, redirect patients to
/dashboard and doctors to /doctor/dashboard. Use Tailwind for styling."

Prompt 3 (1:10–1:40): "Create a middleware.ts that protects all routes
under /(patient) and /(doctor). Verify the JWT cookie. If the user's
role doesn't match the route group, redirect them. Also create a
shared useUser() hook that fetches /api/auth/me."

Prompt 4 (1:40–2:10): "Create the Prisma seed script with this exact
data: [paste the seed data spec]. Include realistic medical prescriptions
and medicine schedules."

Prompt 5 (2:10–2:30): Review everyone else's code for integration
issues. Fix database-related bugs. Help anyone who's stuck.
```

**Your real job (what AI can't do for you):**
- Make sure the auth flow actually works end-to-end in the browser
- Test that the seed data loads correctly and looks realistic
- Be available as "tech support" when others hit infrastructure issues
- Start reviewing other people's API routes for schema mismatches

#### Person B — The Patient Experience (120 min)

**What to prompt your AI assistant for:**

```
Prompt 1 (0:30–1:00): "Build a patient dashboard page in Next.js with
two states. If the patient has no appointments, show a friendly empty
state with an illustration saying 'No appointments yet — your doctor
will add you after your visit.' If they have appointments, show the
most recent one as a card with sections for: Diagnosis Summary,
Prescription, Daily Actions, and a medicine checklist. Use shadcn/ui
Card, Badge, and Checkbox components. Fetch data from GET
/api/patient/appointments."

Prompt 2 (1:00–1:30): "Build the patient API routes:
- GET /api/patient/appointments: return all appointments for the
  logged-in patient with medicines included
- GET /api/patient/medicines/today: return today's medicines with
  a 'taken' boolean based on PatientAction records
- POST /api/patient/medicines/:id/take: log a medicine_taken action
- POST /api/patient/symptoms: accept description + severity, call
  the triage function from /lib/llm.ts, save the result, and if
  triageResult is 'escalate', create an Alert for the doctor
Use Prisma and the shared auth helper."

Prompt 3 (1:30–2:00): "Build a symptom reporting modal using shadcn/ui
Dialog. It should have a text area for describing the symptom, a severity
selector (mild/moderate/severe), and a submit button. After submission,
show the AI triage response in the modal: either a green 'this is
expected' message or a yellow 'we've notified your doctor' message.
Include a subtle loading state while the AI processes."

Prompt 4 (2:00–2:30): "Build the chatbot page at /chat. It should
show the conversation history as message bubbles (user on right,
assistant on left). Include a text input at the bottom. Send messages
to POST /api/chat with the appointmentId and message history. Show a
typing indicator while waiting for the response. The page should load
the appointment context at the top so the patient knows what the
chatbot is grounded on."
```

**Your real job:**
- Make the empty state → has-appointment transition feel natural
- Make sure the medicine checklist actually updates when you click it
- Test the symptom reporting flow end-to-end including the triage response
- Make the chatbot feel responsive and conversational, not laggy

#### Person C — The Doctor Command Center (120 min)

**What to prompt your AI assistant for:**

```
Prompt 1 (0:30–1:00): "Build a doctor dashboard page showing all
patients as cards in a grid. Each card shows: patient name, latest
diagnosis (truncated), next appointment date, and a colored status
dot (green = on track, yellow = needs attention, red = has alert).
Include a search bar to filter patients by name. Add a prominent
'+ New Appointment' button in the top right. Fetch from GET
/api/doctor/patients. Use shadcn/ui Card, Badge, Input, and Button."

Prompt 2 (1:00–1:30): "Build the doctor API routes:
- GET /api/doctor/patients: return all patients assigned to this
  doctor, with their latest appointment and a computed readinessScore
  (0-100 based on medicine adherence and days since last symptom)
- GET /api/doctor/patients/:id: return full patient history
- POST /api/doctor/appointments: create appointment, save medicines,
  call the summary generator from /lib/llm.ts, save the llmSummary
- GET /api/doctor/alerts: return unread alerts for this doctor
- POST /api/doctor/alerts/:id/acknowledge: mark alert as read
- POST /api/doctor/patients/:id/reschedule: update appointment date
Use Prisma and the shared auth helper."

Prompt 3 (1:30–2:00): "Build the 'Add Appointment' flow as a
full-screen modal or slide-over panel. It should have:
- Patient selector dropdown
- Date picker
- Large text area for diagnosis
- Large text area for prescription
- Large text area for daily action recommendations
- A dynamic 'Medicines' section where the doctor can add multiple
  medicines, each with name, dosage, frequency, and time fields
- A submit button that shows a loading spinner, then reveals the
  AI-generated patient summary for the doctor to review before
  confirming
Use shadcn/ui Sheet, Input, Textarea, Select, and Button."

Prompt 4 (2:00–2:30): "Build a patient detail page at
/doctor/patients/[id] that shows:
- Patient info header
- A visual timeline of all appointments, symptom reports, and
  actions plotted chronologically (use a vertical timeline component)
- An alerts section showing any unresolved alerts with 'Acknowledge'
  and 'Reschedule' action buttons
- A daily report section that calls GET /api/doctor/patients/:id/daily-report
  and displays the AI-generated summary
Use shadcn/ui Tabs to organize these sections."
```

**Your real job:**
- Make the patient overview scannable at a glance — status dots and readiness scores are key
- The "Add Appointment" flow is the most complex form in the app; test it thoroughly
- Make sure the alert → reschedule flow works smoothly
- The timeline visualization is your "wow moment" — invest time making it look good

#### Person D — The AI Brain (120 min)

**What to prompt your AI assistant for:**

```
Prompt 1 (0:30–0:50): "Create a /lib/llm.ts module with a base
function that calls the Anthropic Claude API (claude-sonnet-4-20250514).
It should accept a system prompt and user message, return the response
text, handle errors gracefully, and have a timeout. Then build these
exported functions on top of it:

1. generateSummary(diagnosis, prescription, dailyActions) → string
2. triageSymptom(symptomDescription, severity, existingDiagnosis, existingPrescription) → { assessment, reasoning, patientMessage, doctorAlert }
3. chatWithContext(message, history, diagnosis, prescription, dailyActions) → string
4. generateDailyReport(patientActions, symptoms, medicineAdherence) → string"

Prompt 2 (0:50–1:20): "Write the system prompts for each of these
four functions. [Paste detailed prompt specs — see below]"

Prompt 3 (1:20–1:50): "Build the /api/chat/route.ts endpoint. It
should accept { appointmentId, message, history }, look up the
appointment's diagnosis/prescription/dailyActions from the database,
call chatWithContext, save both the user message and assistant reply
to the ChatMessage table, and return the reply. Also log a
chatbot_used PatientAction."

Prompt 4 (1:50–2:30): Test all four AI functions with realistic
medical scenarios. Iterate on prompts until outputs are reliable.
```

**The Prompt Specs (this is your most important deliverable):**

```
SUMMARY GENERATOR SYSTEM PROMPT:
"You are a medical information translator. Convert the following
doctor's notes into a clear, warm, patient-friendly summary.

Rules:
- Write at an 8th-grade reading level
- Break into three sections: What We Found, Your Medicines, Your Daily Plan
- Explain medical terms in parentheses: 'hypertension (high blood pressure)'
- Use encouraging but honest tone
- Never add medical information beyond what the doctor wrote
- End with: 'If you have questions, use the Ask About This button below.'
- If the diagnosis involves a serious condition, acknowledge the
  emotional weight: 'We understand this may feel overwhelming...'

DIAGNOSIS: {diagnosis}
PRESCRIPTION: {prescription}
DAILY ACTIONS: {dailyActions}"

---

CHATBOT SYSTEM PROMPT:
"You are a medical information assistant for {patientName}.
You may ONLY discuss information from the following doctor's notes.

DIAGNOSIS: {diagnosis}
PRESCRIPTION: {prescription}
DAILY ACTIONS: {dailyActions}

Rules:
- Only answer questions that can be answered from the notes above
- If asked about anything not covered, say: 'That's not covered in
  your doctor's notes. I'd recommend bringing this up with Dr. {doctorName}
  at your next appointment.'
- Never diagnose, never suggest medications, never contradict the doctor
- If the patient expresses worry or fear, acknowledge it warmly and
  remind them they can contact their doctor
- If the patient describes a NEW symptom, say: 'This sounds like
  something your doctor should know about. Would you like me to send
  a symptom report to Dr. {doctorName}?' and include a flag in your
  response: [SYMPTOM_ALERT: description]
- Keep responses concise (2-4 sentences) unless the patient asks
  for more detail
- Use simple, everyday language"

---

SYMPTOM TRIAGE SYSTEM PROMPT:
"You are a medical triage assistant. A patient is reporting a new
symptom. Based on their existing diagnosis and treatment, classify
this symptom.

EXISTING DIAGNOSIS: {diagnosis}
CURRENT PRESCRIPTION: {prescription}
NEW SYMPTOM: {symptomDescription}
PATIENT-REPORTED SEVERITY: {severity}

Respond in this exact JSON format:
{
  'assessment': 'expected' | 'unexpected' | 'escalate',
  'confidence': 0-100,
  'reasoning': 'Brief medical reasoning (1-2 sentences)',
  'patientMessage': 'Warm, simple message to show the patient',
  'doctorAlert': true | false,
  'urgency': 'routine' | 'soon' | 'urgent'
}

Classification rules:
- 'expected': Known side effect of medication or typical symptom
  progression (e.g., mild nausea with metformin, fatigue with chemo)
- 'unexpected': Not clearly related to diagnosis or treatment, but
  not immediately dangerous (e.g., new rash, joint pain)
- 'escalate': Potentially serious or time-sensitive (e.g., chest
  pain, difficulty breathing, signs of allergic reaction, sudden
  vision changes)
- When in doubt, escalate. Patient safety > accuracy."

---

DAILY REPORT SYSTEM PROMPT:
"Generate a concise daily tracking report for a doctor about their
patient. Be factual and clinical.

PATIENT: {patientName}
DIAGNOSIS: {diagnosis}
TODAY'S DATA:
- Medicines taken: {takenCount}/{totalCount}
  Missed: {missedMedicines}
- Chatbot interactions: {chatCount} sessions
  Topics discussed: {chatTopics}
- New symptoms reported: {symptoms}
- Overall adherence this week: {weeklyAdherence}%

Format as 3-4 sentences. Flag anything concerning. End with a
one-word status: STABLE / MONITOR / ATTENTION NEEDED."
```

**Your real job:**
- The prompts above are starting points — you WILL need to iterate
- Test with edge cases: What if someone reports "chest pain"? What if they ask the chatbot about a completely unrelated disease? What if the doctor's notes are vague?
- Make the JSON output from triage actually parse reliably (LLMs sometimes break JSON)
- Add fallback handling: if the API is slow or fails, return a safe default ("Please contact your doctor directly")
- Pre-cache responses for the demo scenario (this is your insurance policy)

---

### Hour 2:30–3:00 — Integration Sync (30 min, Everyone Together)

**Stop building new features.** This is assembly time.

Run through this checklist as a team:

```
□ Can you sign up as a patient and see the empty state?
□ Can you sign up as a doctor and see the patient list?
□ Can the doctor create an appointment and see the AI summary generate?
□ Does the patient see the summary after the doctor creates the appointment?
□ Can the patient click "Mark as Taken" on a medicine?
□ Can the patient open the chatbot and get a response grounded in their notes?
□ Can the patient report a symptom and see the triage response?
□ Does a critical symptom create an alert on the doctor's dashboard?
□ Can the doctor acknowledge an alert?

If ANY of these fail → fix it now, together.
If ALL pass → you're in great shape; move to polish.
```

**Common vibe-coding integration bugs to watch for:**
- Different people used different field names (Person B calls it `prescriptionText`, Person C calls it `prescription`) — match to schema
- API routes return different response shapes than the frontend expects
- Authentication cookies not being sent with fetch requests (add `credentials: 'include'`)
- Prisma relations not being included in queries (missing `include: { medicines: true }`)
- Two people installed conflicting versions of a package

---

### Hour 3:00–4:00 — Polish + Wow Features (60 min, Parallel)

At this point the core app works. Now make it impressive.

#### Person A (60 min)
- Fix any remaining bugs others surface
- Add a "Switch Role" demo button on the login page (for fast demo switching between patient and doctor views)
- Make the seed data tell a compelling story: Maria's diabetes journey over 2 weeks with realistic progression
- Set up a clean demo environment with fresh data

#### Person B (60 min)
- **Add voice input to the chatbot** (Web Speech API — 15 lines of code, huge demo impact)
- Polish the medicine checklist with satisfying check animations
- Add a **multi-language toggle** on the summary (re-calls the LLM with a language parameter)
- Make the symptom report flow feel smooth with loading states and transitions

#### Person C (60 min)
- **Build the visual health timeline** for the patient detail page — this is your showstopper
- Add the **Patient Readiness Score** as a circular progress indicator on each patient card
- Add the **voice-to-text** button on the prescription input (share the Web Speech API code with Person B)
- Polish the alerts with color-coded urgency badges

#### Person D (60 min)
- Build the **daily report generator** endpoint and test it
- Add **empathy-aware language calibration** to the summary prompt (serious diagnoses get warmer, more careful wording)
- Add a **pre-visit checklist generator** as a bonus section in the summary
- **Pre-cache all demo scenario responses** as JSON files — if the API goes down during the demo, the app falls back to these
- Test every AI feature one more time with the real seed data

---

### Hour 4:00–4:30 — Demo Prep (30 min)

**Demo Script (4 minutes):**

| Time | Who | What | Screen |
|------|-----|------|--------|
| 0:00–0:30 | Narrator | "After a doctor visit, patients leave confused. Doctors lose visibility between appointments. We built the bridge." | Title slide |
| 0:30–1:30 | Driver | Doctor logs in → sees patient list with readiness scores → clicks "Add Appointment" → types (or dictates) prescription → AI summary generates in real-time | Doctor dashboard |
| 1:30–2:30 | Driver | Switch to patient login → summary appears in plain language → toggle to Spanish → open chatbot → ask "what are the side effects of my medication?" → get grounded answer | Patient dashboard |
| 2:30–3:15 | Driver | Patient reports "chest tightness" → triage agent flags as ESCALATE (92% confidence) → switch to doctor view → alert appears with red badge → doctor clicks "Reschedule" | Both dashboards |
| 3:15–3:45 | Driver | Show daily report: "Maria took 2/3 medicines, used chatbot twice, no new symptoms. Status: STABLE." → Show patient timeline visualization | Doctor patient detail |
| 3:45–4:00 | Narrator | "This closes the loop. Patients understand. Doctors stay informed. Nobody falls through the cracks." | Architecture slide |

**Pre-demo checklist:**
```
□ Fresh seed data loaded
□ Demo responses cached as fallback
□ Both browser tabs pre-logged-in (one patient, one doctor)
□ Tested the full flow 2x without errors
□ Screen resolution set for projector
□ Someone has the backup slides ready if the app crashes
```

---

### Hour 4:30–5:00 — Buffer + Presentation

If everything works, use this time for one more "wow" feature. If anything's broken, use it to fix the demo path.

---

## Vibe Coding Pro Tips for the Team

### Prompting Strategy

**Be specific about your tech stack in every prompt.** Don't say "build me a dashboard." Say "build me a Next.js App Router page at /doctor/dashboard using shadcn/ui Card and Badge components with Tailwind CSS, fetching from GET /api/doctor/patients, with Prisma for database queries."

**Give your AI assistant the schema.** Paste the Prisma schema into your prompt. The AI will generate much better database queries and type-safe code when it knows the exact model structure.

**Prompt in complete features, not fragments.** Instead of "build me a button" then "now add an onClick handler" then "now connect it to an API" — ask for the whole feature at once. "Build me a symptom reporting modal that accepts user input, sends it to POST /api/patient/symptoms, shows a loading state, then displays the triage result." One prompt, one complete feature.

**Use the AI to write your AI prompts.** Person D can ask Claude to help write the system prompts for the medical chatbot. Meta-prompting is a legitimate vibe coding strategy.

### Integration Strategy

**Use one shared `/lib/` folder.** If Person A writes a `getCurrentUser()` helper, everyone else imports it instead of writing their own. Same for the LLM wrapper, database client, and type definitions.

**Communicate through the database, not through code.** Person B and Person C don't need to import each other's code. Person B writes to the `symptoms` table; Person C reads from it. The database IS the integration layer.

**Test against the seed data, not against an empty database.** Every feature should work with Maria's pre-existing appointment data from minute one.

### When Your AI-Generated Code Doesn't Work

1. **Read the error message.** Paste the full error back to your AI assistant with "this broke, here's the error" — it's almost always faster than debugging yourself.
2. **Check the schema match.** 90% of vibe-coding bugs are field name mismatches between what the AI generated and what the database actually has.
3. **Ask a teammate.** In a 5-hour hackathon, spending 15 minutes stuck is too long. Ask after 5 minutes.
4. **Simplify.** If a complex feature isn't working, ask the AI for a simpler version. A working simple version beats a broken complex one.

---

## Quick-Reference Timeline

```
TIME          PERSON A              PERSON B              PERSON C              PERSON D
              (Foundation)          (Patient Experience)  (Doctor Command)      (AI Brain)
────────────  ──────────────────    ──────────────────    ──────────────────    ──────────────────
0:00-0:30     ── ALIGNMENT: Schema + API contract + repo setup + seed data ──────────────────────
0:30-1:00     Auth system +         Patient dashboard     Doctor dashboard      /lib/llm.ts wrapper
              JWT + middleware       (empty + active)      + patient grid        + all 4 AI functions
1:00-1:30     Seed data script      LLM summary card +    Patient overview +    Chatbot system prompt
              + verify DB           medicine checklist     add appointment       + /api/chat endpoint
1:30-2:00     Fix auth bugs +       Symptom report        Alerts feed +         Symptom triage agent
              help others           modal + API routes     doctor API routes     + edge case testing
2:00-2:30     Review all code       Chatbot page          Patient detail +      Daily report generator
              for integration       + API connection       timeline view         + cache demo responses
2:30-3:00     ── INTEGRATION SYNC: Full user journey test + fix breakages ───────────────────────
3:00-3:30     Demo environment      Voice input +         Health timeline +     Empathy calibration +
              + role switcher       multi-language        readiness scores      pre-visit checklist
3:30-4:00     Final bug fixes       UI polish +           UI polish +           Final prompt tuning +
              + seed data story     animations            voice-to-text Rx      cache all demo paths
4:00-4:30     ── DEMO PREP: Script rehearsal + backup plan + 2x full run-through ────────────────
4:30-5:00     ── PRESENTATION ──────────────────────────────────────────────────────────────────
```

---

## Criticisms Specific to Vibe Coding This Project

**Code coherence will suffer.** Four people generating code with AI assistants will produce four slightly different coding styles, error handling patterns, and state management approaches. The app will work but the codebase will look like it was written by four different people (because it was, sort of). For a hackathon this is fine. For production this would be technical debt.

**AI-generated medical prompts might sound authoritative but be clinically wrong.** Your AI assistant will happily write a "symptom triage system prompt" that looks professional but contains medical reasoning a real doctor would flag as oversimplified or dangerous. If any judges are clinicians, they'll notice. Mitigation: add disclaimers everywhere and frame the AI outputs as "information assistance, not medical advice."

**Over-reliance on happy path.** AI assistants tend to generate code that works for the expected case but crashes on edge cases. During a live demo, a judge might type something unexpected into the chatbot or report an empty symptom — and the app breaks. Mitigation: during the polish phase, spend 10 minutes trying to break your own feature.

**Dependency on API availability.** You're making live Claude API calls during the demo. If Anthropic's API has a slow moment, your entire patient chatbot and summary system stalls. This is why Person D's fallback cache is mission-critical, not optional.

**The scope is still very ambitious.** Even with AI writing most of the code, the integration complexity of 8+ API routes, 4 AI functions, 7 database tables, and 6+ pages is significant for 5 hours. Be prepared to cut features if you're behind at the 2:30 checkpoint. The priority order if you need to cut: (1) keep auth + patient summary + chatbot + doctor appointment creation, (2) drop daily reports and timeline, (3) simplify symptom triage to a basic form without AI classification.

---

## Unique Features to Outshine Competitors

Ranked by impact-to-effort ratio for a vibe-coded hackathon:

| # | Feature | Effort | Demo Impact | Why It Wins |
|---|---------|--------|-------------|-------------|
| 1 | **Voice dictation for prescriptions** | 15 min | Very High | Solves a real doctor workflow pain; the Web Speech API is free and built into browsers; watching someone speak a prescription live is a crowd-pleaser |
| 2 | **Confidence-scored triage with color coding** | 10 min | High | Shows the team understands AI uncertainty; "ESCALATE (92% confidence)" in red vs "EXPECTED (78%)" in green is visually striking |
| 3 | **Multi-language summary toggle** | 10 min | High | One extra parameter in the LLM call; demonstrates health equity thinking; watching the summary switch to Spanish live is impressive |
| 4 | **Patient Readiness Score** | 20 min | High | Simple math, big insight; a circular progress bar on each patient card makes the doctor dashboard feel like a command center |
| 5 | **Visual health timeline** | 30 min | Very High | Plotted chronological view of a patient's journey is the kind of data viz that makes judges lean forward; ask your AI to generate it with recharts or a custom SVG |
| 6 | **Empathy-aware language calibration** | 5 min | Medium | Just a prompt tweak, but if a judge compares the summary for "vitamin D deficiency" vs "stage 2 breast cancer" and notices the tone difference, it shows deep product thinking |
| 7 | **Pre-visit smart checklist** | 10 min | Medium | Generated alongside the summary; "fast for 12 hours," "bring your glucose log" — shows the platform thinks ahead |
| 8 | **Chatbot symptom escalation detection** | 15 min | High | If a patient mentions a concerning symptom mid-chat, the chatbot offers to alert the doctor in real-time; shows the AI is actively monitoring, not just answering |
