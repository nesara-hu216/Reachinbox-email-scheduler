# Production-Grade ReachInbox Email Scheduler Engine

A production-grade, full-stack email scheduling monorepo built for **ReachInbox / Outbox Labs**. Handles high-throughput delayed email queue scheduling, atomic Redis-backed hourly rate limiting, PostgreSQL job persistence, Nodemailer Ethereal SMTP delivery, real Google OAuth 2.0 authentication, and a polished Next.js 14 SaaS dashboard.

> [!IMPORTANT]
> **No cron jobs are used.** Job scheduling is driven entirely by **BullMQ delayed queues** and **Redis-backed atomic rate limit windowing**.

---

## 📐 Architecture Diagram

```mermaid
flowchart TD
    subgraph Frontend["Next.js 14 Dashboard"]
        UI["React + Tailwind + shadcn UI"]
        Parser["PapaParse (CSV/TXT Lead Parser)"]
        APIClient["TanStack Query + API Client"]
    end

    subgraph Backend["Express.js API Node Service"]
        Auth["Google OAuth 2.0 / Passport Auth"]
        CampaignCtrl["Campaign Controller"]
        EmailCtrl["Email & Stats Controller"]
        Prisma["Prisma ORM"]
    end

    subgraph Storage["Persistent Data Stores"]
        PG[("PostgreSQL 16\n(Jobs, Campaigns, Users)")]
        Redis[("Redis 7 (AOF Enabled)\n(BullMQ & Rate Limits)")]
    end

    subgraph QueueSystem["BullMQ Queue & Processing"]
        Queue["BullMQ Email Dispatch Queue"]
        Worker["BullMQ Worker Pool (Concurrency = 5)"]
        RateLimiter["Redis Lua Atomic Rate Limiter"]
    end

    subgraph External["External Services"]
        SMTP["Nodemailer Ethereal SMTP"]
        Google["Google OAuth 2.0 Provider"]
    end

    UI --> APIClient
    Parser --> UI
    APIClient --> Auth
    APIClient --> CampaignCtrl
    APIClient --> EmailCtrl

    CampaignCtrl --> Prisma
    Prisma --> PG
    CampaignCtrl --> Queue
    Queue --> Redis

    Worker --> Queue
    Worker --> RateLimiter
    RateLimiter --> Redis
    Worker --> Prisma
    Worker --> SMTP
    Auth --> Google
```

---

## ✨ Core Features

1. **Persistent Delayed Scheduling (Zero Cron)**:
   - Recipient job schedules are calculated based on `startTime + index * delayBetweenEmails`.
   - Job delays are enqueued into BullMQ using `delay = Math.max(0, scheduledTime - Date.now())`.
   - BullMQ delayed jobs trigger execution at the exact scheduled timestamp.

2. **Atomic Redis Rate Limiting & Automatic Rescheduling**:
   - Uses an **atomic Redis Lua script** (`RateLimitService`) on keys structured like `email-rate:{senderId}:{YYYY-MM-DD-HH}`.
   - Prevents worker race conditions (e.g. Workers A & B reading count=199 simultaneously).
   - If the hourly limit is exceeded: **Jobs are NOT dropped or failed**. They are automatically rescheduled into the next available hourly window.

3. **Strict Idempotency & Duplicate Prevention**:
   - Every `EmailJob` record has a unique composite `idempotencyKey` (`${campaignId}-${recipient}-${index}`).
   - Database state locks transition jobs atomically: `SCHEDULED -> PROCESSING -> SENT`.
   - If a worker crashes or restarts, DB transactions ensure the email is never sent twice.

4. **Server & Infrastructure Restart Survival**:
   - Redis runs with AOF persistence (`redis-server --appendonly yes`) in Docker.
   - PostgreSQL persists job status records.
   - If the backend or Redis container restarts, scheduled BullMQ delayed jobs resume automatically without duplicate job generation.

5. **Bulk Outreach High-Throughput Engine (1000+ Recipients)**:
   - Uses high-performance PostgreSQL bulk insert (`prisma.emailJob.createMany`).
   - Uses BullMQ bulk job insertion (`emailQueue.addBulk()`).
   - Worker pool concurrency is fully configurable (`WORKER_CONCURRENCY=5`).

6. **Real Google OAuth & Nodemailer Ethereal Integration**:
   - Authenticate with real Google OAuth 2.0 credentials via Passport.js.
   - Ethereal SMTP automatically generates test preview links accessible right inside the Sent Emails dashboard table.

7. **Client-Side CSV / TXT Lead Parser**:
   - Intelligent PapaParse integration supporting CSV headers (`name,email`) or plain TXT email files.
   - Client-side validation, duplicate removal, invalid email detection, and interactive recipient tag management.
   - Real-time schedule completion estimator with rate limit window spillover warnings.

---

## 🛠️ Technology Stack

- **Monorepo Workspace**: npm Workspaces
- **Frontend**: Next.js 14+, TypeScript, React, Tailwind CSS, shadcn UI, Lucide React, TanStack Query, PapaParse, Sonner Toast
- **Backend**: Node.js, Express.js, TypeScript, BullMQ, ioredis, Prisma ORM, Nodemailer (Ethereal), Passport.js (Google OAuth), Zod, Pino Logger
- **Database & Cache**: PostgreSQL 16, Redis 7 (AOF Persistence)
- **Infrastructure**: Docker & Docker Compose

---

## 📁 Repository Structure

```
reachinbox-email-scheduler/
├── docker-compose.yml
├── package.json
├── .env.example
├── README.md
└── apps/
    ├── backend/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── seed.ts
    │   └── src/
    │       ├── server.ts
    │       ├── config/
    │       ├── controllers/
    │       ├── middleware/
    │       ├── queues/
    │       ├── routes/
    │       ├── services/
    │       ├── tests/
    │       ├── utils/
    │       └── workers/
    └── frontend/
        ├── package.json
        ├── tsconfig.json
        ├── tailwind.config.js
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx (Google Login)
        │   └── dashboard/page.tsx
        ├── components/
        │   ├── ui/
        │   ├── dashboard/
        │   └── compose/
        ├── lib/
        └── types/
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ or v20+)
- Docker & Docker Compose
- npm (v9+)

### Step 1: Clone & Install Monorepo Dependencies

```bash
cd OutBox_assignment
npm install
```

### Step 2: Start PostgreSQL & Redis Containers

```bash
docker compose up -d
```

Verify containers are running:
```bash
docker compose ps
```

### Step 3: Configure Environment Variables

Create `.env` at root or inspect default settings:
```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000

DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/reachinbox_email_scheduler?schema=public
REDIS_URL=redis://localhost:6379

SESSION_SECRET=reachinbox-dev-session-secret-32-chars-minimum
JWT_SECRET=reachinbox-dev-jwt-secret-32-chars-minimum

# Real Google OAuth (Fill with Google Cloud Console credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Nodemailer / Ethereal SMTP
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587

# Queue & Limiting Controls
WORKER_CONCURRENCY=5
MIN_SEND_DELAY_MS=2000
MAX_EMAILS_PER_HOUR=200
```

### Step 4: Run Database Migrations & Seed Data

```bash
npm run db:migrate
npm run db:seed
```

### Step 5: Launch Development Services

To start both Backend (port 4000) and Frontend (port 3000) concurrently:
```bash
npm run dev
```

Alternatively, start services independently:
```bash
# Terminal 1: Backend API + BullMQ Worker
npm run dev:backend

# Terminal 2: Next.js Frontend Dashboard
npm run dev:frontend
```

Open `http://localhost:3000` in your browser.

---

## 🔑 Google OAuth Setup Guide

1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** (Web application).
3. Set **Authorized JavaScript origins**: `http://localhost:4000` and `http://localhost:3000`.
4. Set **Authorized redirect URIs**: `http://localhost:4000/api/auth/google/callback`.
5. Copy the Client ID and Client Secret into your `.env` file (`GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`).
6. Restart the backend server.

> [!NOTE]
> For convenience during local evaluation when Google Cloud keys are not provided, an **Enter Demo Workspace** button is also available on the login screen.

---

## 🧪 Testing

Run backend unit tests for rate limiting, hour windowing, and idempotency key calculations:

```bash
npm run test
```

---

## ⚡ Technical Highlights & Verification

### 1. Atomic Redis Rate Limit Rescheduling (Lua Script)

Rate limiting is enforced at the worker level via `RateLimitService.reserveSendSlot(senderId, hourlyLimit)`.

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local current = redis.call('GET', key)
if current and tonumber(current) >= limit then
  return {0, tonumber(current)}
else
  local new_count = redis.call('INCR', key)
  if new_count == 1 then
    redis.call('EXPIRE', key, ttl)
  end
  return {1, new_count}
end
```

If the hourly quota is exhausted, the job's database status is reset to `SCHEDULED`, its `scheduledAt` timestamp is updated to the next hour window, and the job is enqueued back into BullMQ with a calculated delay (`getMsUntilNextHourWindow()`). **No jobs are dropped.**

### 2. Idempotency & Concurrency Guarantees

Before dispatching through SMTP, workers perform an atomic PostgreSQL update:
```ts
const updatedCount = await prisma.emailJob.updateMany({
  where: { id: emailJobId, status: 'SCHEDULED' },
  data: { status: 'PROCESSING', bullJobId: job.id },
});
```
If `updatedCount.count === 0`, another worker or thread has already claimed or completed the record, safely preventing duplicate email dispatches.

---

## 📝 License

Developed for ReachInbox / Outbox Labs hiring assignment.
