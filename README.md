# NexCare — AI-Powered Patient-Doctor Platform

A hackathon project built at FrontierHack 2026. Patients chat with an AI assistant that auto-detects symptoms and runs triage; doctors receive real-time alerts and a dashboard showing medication adherence and patient summaries.

## Features

- **AI chat** — context-aware chatbot scoped to each appointment's diagnosis and prescription
- **Symptom triage** — automatically detects symptoms from chat and classifies urgency
- **Doctor alerts** — pushes an alert to the doctor when triage flags a symptom
- **Medication tracking** — daily checklist with adherence scoring
- **Patient summaries** — AI-generated summary for doctors, with optional translation

## Quick Start

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role    | Email           | Password   |
|---------|-----------------|------------|
| Doctor  | doctor@demo.com | doctor123  |
| Patient | maria@demo.com  | patient123 |
| Patient | james@demo.com  | patient123 |
| Patient | lisa@demo.com   | patient123 |

## Environment Variables

Create a `.env.local` file and set:

```
GEMINI_API_KEY=your_key_here
```

Set `FORCE_DEMO_CACHE=true` to use cached AI responses without an API key.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS 3**
- **Prisma + SQLite**
- **Gemini API** (`gemini-2.5-flash`)
- **jose** (JWT auth with httpOnly cookies)
