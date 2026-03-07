# NexCare — AI-Powered Patient-Doctor Platform

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
npx prisma db push
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

| Role    | Email             | Password    |
|---------|-------------------|-------------|
| Doctor  | doctor@demo.com   | doctor123   |
| Patient | maria@demo.com    | patient123  |
| Patient | james@demo.com    | patient123  |
| Patient | lisa@demo.com     | patient123  |

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Anthropic API key.
Set `FORCE_DEMO_CACHE=true` to use cached responses without an API key.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS 3**
- **Prisma + SQLite**
- **Claude API** (Sonnet)
- **jose** (JWT auth with httpOnly cookies)
