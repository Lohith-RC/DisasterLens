# DisasterLens — Documentation

> AI-Powered Disaster Intelligence System
> Kalpataru Institute of Technology, Tiptur — CSE Department

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technical Stack](#3-technical-stack)
4. [System Architecture](#4-system-architecture)
5. [Application Flow](#5-application-flow)
6. [Code Model & Logic](#6-code-model--logic)
7. [Security Assessment](#7-security-assessment)
8. [Strengths & Failures](#8-strengths--failures)
9. [Roadmap](#9-roadmap)

---

## 1. Project Overview

DisasterLens is a real-time disaster response platform that connects victims in emergency situations with rescue teams. It uses a Multi-Criteria Decision Making (MCDM) algorithm to triage incoming SOS signals, ranking them by urgency based on factors like injury severity, battery level, group size, and environmental conditions.

**Core Problem Solved:** In mass-casualty events, rescue teams receive overwhelming volumes of distress calls. DisasterLens automates prioritization through explainable AI, ensuring the most critical cases are dispatched first — while providing two-way communication between victims and rescuers.

**Current Status:** Functional prototype with working authentication, SOS submission, AI triage scoring, real-time map visualization, messaging, and role-based dashboards. Built as an academic project.

---

## 2. Key Features

### Explainable AI Triage
MCDM algorithm scores every SOS signal from 0–100 and generates human-readable reasoning. Rescuers see not just a priority rank but *why* the AI ranked it that way (e.g., "CRITICAL battery: 5% — imminent communication blackout").

### Live Tactical Maps
Interactive Leaflet maps with dark CartoDB tiles. SOS markers are color-coded by priority (red = critical, orange = high, yellow = medium). Markers pulse on new signals and fly-to on selection.

### Two-Way Communication
Victims and rescuers exchange messages in real time via SSE. Auto-messages are sent on dispatch and resolve actions. Messages support optimistic UI with failure indicators.

### Role-Based Dashboards
- **Victim Dashboard:** SOS form, live map with self-location, message panel, offline mesh toggle
- **Rescuer Dashboard:** Triage grid (sortable by priority), map with all active signals, AI reasoning panel, dispatch/resolve actions, message center

### Keyboard Shortcuts
Rescuers can press `1`–`9` to quick-select signals, `D` to dispatch, `R` to resolve — enabling rapid triage workflows.

### Audio Notifications
Web Audio API tones for new signals, dispatch confirmations, resolve confirmations, and new messages. Each event has a distinct sound pattern.

### Offline Mesh Simulation
Victim dashboard includes a toggle that simulates mesh-network offline mode with cached coordinates and queued messages.

---

## 3. Technical Stack

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Library | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS v4 | 4.x |
| Maps | Leaflet + React-Leaflet | 1.9.4 / 5.0.0 |
| 3D Graphics | Three.js + React Three Fiber + Drei | 0.184 / 9.6 / 10.7 |
| Animations | GSAP (ScrollTrigger) | 3.15.0 |
| Icons | Font Awesome 6.4 | CDN |
| Fonts | Plus Jakarta Sans, Inter, JetBrains Mono | Google Fonts |

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (Next.js API Routes) | — |
| ORM | Prisma | 7.5.0 |
| Database | SQLite (via Prisma Better SQLite3 adapter) | — |
| Auth | JWT (jsonwebtoken) | 9.0.3 |
| Password Hashing | bcryptjs | 3.0.3 |
| Validation | Zod | 4.4.3 |
| Real-time | Server-Sent Events (SSE) | Native API |

### Design System

| Token | Value |
|-------|-------|
| Background Primary | `#0c0f1a` |
| Background Surface | `#1e2433` |
| Blue Core | `#3b82f6` |
| Amber Accent | `#f59e0b` |
| Status Critical | `#ef4444` |
| Status Resolved | `#10b981` |
| Font Display | Plus Jakarta Sans |
| Font Body | Inter |
| Font Mono | JetBrains Mono |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Landing   │  │ Victim   │  │ Rescuer          │  │
│  │ Page      │  │ Dashboard│  │ Dashboard        │  │
│  │ (GSAP +   │  │ (React)  │  │ (React)          │  │
│  │  Three.js)│  │          │  │                  │  │
│  └──────────┘  └────┬─────┘  └────┬─────────────┘  │
│                      │             │                  │
│              ┌───────┴─────────────┴───────┐        │
│              │   Polling (4-5s intervals)   │        │
│              │   SSE (EventStream)          │        │
│              └──────────────┬──────────────┘        │
└─────────────────────────────┼────────────────────────┘
                              │
┌─────────────────────────────┼────────────────────────┐
│                    SERVER (Next.js)                    │
│                              │                        │
│  ┌──────────────────────────┴────────────────────┐  │
│  │              Proxy (Auth Guard)                │  │
│  │         JWT verification on protected routes   │  │
│  └──────────────────────────┬────────────────────┘  │
│                              │                        │
│  ┌──────────────────────────┴────────────────────┐  │
│  │              API Routes                        │  │
│  │  /api/auth/login    - Authentication           │  │
│  │  /api/auth/logout   - Session clear            │  │
│  │  /api/sos/create    - SOS submission           │  │
│  │  /api/sos/stream    - Active signals list      │  │
│  │  /api/sos/dispatch  - Dispatch/resolve action  │  │
│  │  /api/messages/send - Message creation         │  │
│  │  /api/messages/stream - Message list           │  │
│  │  /api/events        - SSE event stream         │  │
│  │  /api/seed          - Database seeder (dev)    │  │
│  └──────────────────────────┬────────────────────┘  │
│                              │                        │
│  ┌──────────────────────────┴────────────────────┐  │
│  │           Core Libraries                       │  │
│  │  auth.ts       - JWT sign/verify               │  │
│  │  db.ts         - Prisma client singleton       │  │
│  │  sse.ts        - SSE client manager            │  │
│  │  rateLimit.ts  - IP-based rate limiter         │  │
│  │  validations.ts - Zod schemas                  │  │
│  │  notifications.ts - Audio tone generator       │  │
│  └──────────────────────────┬────────────────────┘  │
│                              │                        │
│  ┌──────────────────────────┴────────────────────┐  │
│  │           SQLite Database (Prisma)             │  │
│  │  Tables: User, SOS_Signal, Message             │  │
│  └───────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Data Models

```
User
├── id            String (UUID)
├── name          String (unique)
├── password      String (bcrypt hash)
├── role          Enum: VICTIM | RESCUER
├── location_lat  Float?
├── location_lng  Float?
├── createdAt     DateTime
└── signals       SOS_Signal[]

SOS_Signal
├── id              String (UUID)
├── userId          String (FK → User)
├── disaster_type   Enum: Medical | Trapped | Fire | Flood | Earthquake | Chemical
├── injury_severity Enum: Minor | Moderate | Severe
├── battery_level   Int (0–100)
├── group_size      Int
├── environment     Enum: Normal | Night | Rain | Extreme_Heat
├── location_lat    Float?
├── location_lng    Float?
├── priority_score  Int (0–100, MCDM output)
├── ai_explanation  String (human-readable reasoning)
├── status          Enum: PENDING | DISPATCHED | RESOLVED
├── createdAt       DateTime
└── user            User

Message
├── id          String (UUID)
├── senderId    String (FK → User)
├── senderName  String
├── senderRole  Enum: VICTIM | RESCUER
├── recipientId String? (FK → User)
├── signalId    String? (FK → SOS_Signal)
├── content     String (max 1000 chars)
├── createdAt   DateTime
├── user        User?
└── signal      SOS_Signal?
```

---

## 5. Application Flow

### 5.1 Authentication Flow

```
User → POST /api/auth/login { name, password }
  ├── Rate limit check (10 attempts / 15 min per IP)
  ├── Zod validation
  ├── Find user by name
  ├── bcrypt.compare(password, hash)
  ├── signToken(userId, role) → JWT
  └── Set httpOnly cookie "dl_token"

Proxy → On protected route (/victim/*, /rescuer/*)
  ├── Read "dl_token" cookie
  ├── jwt.verify(token, JWT_SECRET)
  ├── Valid → NextResponse.next()
  └── Invalid/missing → Redirect to /login + clear cookie
```

### 5.2 SOS Submission Flow

```
Victim Dashboard → POST /api/sos/create
  ├── Auth check (getUserSession)
  ├── Zod validation (sosCreateSchema)
  ├── calculatePriority() → MCDM scoring:
  │   ├── Battery level scoring (0–25 pts)
  │   ├── Disaster type scoring (15–30 pts)
  │   ├── Severity scoring (3–20 pts)
  │   ├── Group size scoring (4–15 pts)
  │   ├── Environment scoring (5–8 pts)
  │   └── Clamp to 0–100, assign rank (Low/Medium/High/Critical)
  ├── Create SOS_Signal record
  ├── broadcastToRole('signal_update', ..., 'RESCUER')
  └── Return { signalId, rank, score }
```

### 5.3 Dispatch/Resolve Flow

```
Rescuer Dashboard → POST /api/sos/dispatch
  ├── Auth check + role === 'RESCUER'
  ├── Zod validation (dispatchSchema)
  ├── Update SOS_Signal.status
  ├── Auto-create Message to victim
  ├── broadcastToRole('message_update', ..., 'VICTIM')
  ├── broadcastToRole('signal_update', ..., 'RESCUER')
  └── Return { status: action }
```

### 5.4 Real-Time Update Flow

```
Clients poll /api/sos/stream and /api/messages/stream every 4-5 seconds
  ├── Fetch all active signals (status ≠ RESOLVED)
  ├── Fetch all messages (sent by or addressed to user)
  └── Update local state

SSE /api/events (separate stream)
  ├── Auth check via getUserSession
  ├── Register client in memory (Map<id, SSEClient>)
  ├── broadcastToRole() pushes events to matching clients
  └── Stale client sweep every 30s (60s timeout)
```

---

## 6. Code Model & Logic

### MCDM Triage Algorithm (`src/app/api/sos/create/route.ts`)

The `calculatePriority` function implements a weighted multi-criteria scoring model:

```
Score = Σ (criterion_weight × severity_factor)

Criteria weights:
  Battery:   0–25 pts  (exponential urgency below 20%)
  Type:      15–30 pts (Trapped/Earthquake highest)
  Severity:  3–20 pts  (Severe = 20, Moderate = 10, Minor = 3)
  Group:     4–15 pts  (mass casualty above 5)
  Env:       5–8 pts   (Night highest)

Rank thresholds:
  ≥ 70 → Critical
  ≥ 45 → High
  ≥ 25 → Medium
  < 25 → Low
```

Each criterion appends a human-readable explanation string, producing the full `ai_explanation` payload visible to rescuers.

### SSE Client Management (`src/lib/sse.ts`)

- Clients stored in `Map<string, SSEClient>` with `lastSeen` timestamps
- `broadcast()` and `broadcastToRole()` iterate clients, enqueue encoded payloads
- Failed enqueues auto-remove dead clients
- 30s sweep interval closes and removes clients idle >60s
- Client IDs use `Date.now()` + `crypto.randomUUID()` for uniqueness

### Rate Limiter (`src/lib/rateLimit.ts`)

- Sliding window: 15 minutes, max 10 attempts per key
- Keys are IP-based (`login:{ip}`)
- Expired records auto-cleaned every 60s

### Proxy Auth Guard (`src/proxy.ts`)

- Executes before `/victim/*` and `/rescuer/*` routes
- Reads `dl_token` cookie, verifies JWT signature
- Redirects to `/login` on failure, clears invalid cookies
- Uses Node.js runtime (not Edge)

---

## 7. Security Assessment

### Fixed Vulnerabilities

| # | Vulnerability | Severity | Fix |
|---|--------------|----------|-----|
| 1 | Hardcoded JWT fallback secret | Critical | Removed fallback; throws if `JWT_SECRET` missing |
| 2 | Middleware only checked token existence | High | Now verifies JWT signature + clears invalid cookies |
| 3 | Seed endpoint exposed in production | High | Gated behind `NODE_ENV === 'development'` |
| 4 | Hardcoded default password in login form | Medium | Changed default state to empty string |
| 5 | Weak client ID generation (`Math.random`) | Medium | Replaced with `crypto.randomUUID()` |
| 6 | No rate limiting on login | High | Added IP-based rate limiter (10/15min) |
| 7 | User enumeration via distinct error messages | Medium | Unified to generic "Invalid credentials" |
| 8 | Deprecated middleware convention | Medium | Migrated to `proxy.ts` (Next.js 16) |
| 9 | Zombie SSE client accumulation | Medium | Added stale-client sweep (60s timeout) |
| 10 | Hardcoded SQLite path | Low | Made configurable via `DATABASE_URL` env var |

### Remaining Considerations

| # | Area | Risk | Notes |
|---|------|------|-------|
| 1 | No CSRF protection | Medium | POST endpoints lack CSRF tokens; sameSite=strict mitigates |
| 2 | No rate limiting on other endpoints | Low | Only login is rate-limited currently |
| 3 | No Content-Security-Policy headers | Low | XSS possible if React escape bypass found |
| 4 | CDN links without integrity hashes | Low | Leaflet/FontAwesome loaded without SRI |
| 5 | SQLite not suitable for production | Medium | No concurrent write support, no serverless compatibility |
| 6 | In-memory SSE store not scalable | Medium | Works for single instance; needs Redis for horizontal scaling |

---

## 8. Strengths & Failures

### Strengths

1. **Clean Architecture** — Separation of concerns across lib/, api/, components/, hooks/ is well-structured
2. **Comprehensive Validation** — Zod schemas on every API endpoint with typed inputs
3. **Explainable AI** — MCDM output includes human-readable reasoning, not just scores
4. **Responsive Design System** — CSS custom properties + Tailwind utility classes create a cohesive dark theme
5. **Accessibility Basics** — Focus-visible rings, prefers-reduced-motion support, semantic HTML
6. **Optimistic UI** — Victim message panel shows messages before server confirms
7. **Keyboard-Driven Triage** — Rescuers can operate entirely via keyboard shortcuts
8. **Audio Feedback** — Distinct tones for each event type without external dependencies
9. **TypeScript Throughout** — Full type safety across frontend and API routes

### Failures / Weaknesses

1. **Polling Instead of True SSE** — Despite having SSE infrastructure, both dashboards poll every 4-5s. The SSE `/api/events` endpoint exists but isn't consumed by the dashboards.
2. **No Offline Support** — The mesh toggle is purely visual; no Service Worker, no IndexedDB, no actual offline queue
3. **SQLite Limitations** — File-based database won't work on Vercel/serverless, no concurrent access
4. **Pervasive `any` Types** — 20+ `any` annotations across components defeat TypeScript's type safety
5. **No Error Boundaries** — Unhandled errors crash entire React trees
6. **Silent Catch Blocks** — Many `catch {}` blocks swallow errors without logging
7. **No Tests** — Zero unit, integration, or E2E tests
8. **No CI/CD** — No GitHub Actions, no lint checks on push
9. **Memory Leak Risk** — SSE Map could grow unbounded under high connection churn before sweep fires
10. **Hardcoded Demo Password** — `disaster123` is visible on the login page and in seed data

---

## 9. Roadmap

### Phase 1: Stabilization (Immediate)

| Task | Priority | Effort |
|------|----------|--------|
| Wire dashboards to use SSE instead of polling | High | 2h |
| Add error boundaries to React trees | High | 1h |
| Replace `any` types with proper interfaces | Medium | 3h |
| Add console.error logging in catch blocks | Medium | 1h |
| Add SRI hashes to CDN links | Low | 30m |
| Write basic API integration tests (Vitest) | High | 4h |

### Phase 2: Production Readiness (1–2 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| Migrate SQLite → PostgreSQL (Supabase/Neon) | High | 4h |
| Add CSP headers in `next.config.ts` | High | 1h |
| Add rate limiting to all API endpoints | Medium | 2h |
| Implement CSRF protection | Medium | 2h |
| Add GitHub Actions CI (lint + typecheck + test) | High | 2h |
| Environment variable validation at startup | Medium | 1h |
| Remove demo credentials from login page | Medium | 30m |

### Phase 3: Feature Advancement (2–4 weeks)

| Task | Priority | Effort |
|------|----------|--------|
| True offline mode (Service Worker + IndexedDB) | High | 1w |
| Push notifications for rescuers | Medium | 3d |
| Victim location tracking (Geolocation API) | Medium | 2d |
| Admin dashboard for system monitoring | Low | 1w |
| Multi-language support (i18n) | Low | 1w |
| WebSocket upgrade from SSE | Medium | 3d |

### Phase 4: Scale & Deploy (1–2 months)

| Task | Priority | Effort |
|------|----------|--------|
| Deploy to Vercel + Supabase | High | 2d |
| Redis-backed SSE for multi-instance scaling | High | 3d |
| Docker containerization | Medium | 1d |
| Kubernetes deployment manifests | Low | 2d |
| Load testing (k6/Artillery) | Medium | 1d |
| Security audit (OWASP ZAP) | High | 2d |

### Implementation Order

```
Week 1:  Phase 1 (stabilization) + Phase 2 CI/CD
Week 2:  Phase 2 (production readiness)
Week 3-4: Phase 3 (offline mode, notifications)
Week 5-8: Phase 4 (deploy, scale, audit)
```

---

*Documentation generated for DisasterLens v0.1.0 — Last updated: June 2026*
