# Mentor-Match AI

Mentor-Match AI is a full-stack web platform where learners find their best-fit mentor through an intelligent recommendation engine, book 1-to-1 sessions with slot-conflict protection, complete secure payments with automatic platform commission calculation, join real-time browser-based video calls via WebRTC, and submit verified session reviews.

---

## Key Features

- **Personalized Recommendations:** Hybrid scoring engine combining skill overlap, goal semantic match, availability overlap, Bayesian ratings, and experience weighting with automatic fallback.
- **Conflict-Free Booking:** Two-tier slot reservation using high-speed Redis distributed locks backed by MongoDB unique partial indexes.
- **Monetization & Commission:** 15% platform fee split calculated automatically per booking with ledger-tracked mentor earnings and admin payouts.
- **Dual Payment Gateways:** Zero-dependency built-in mock gateway for local development and official Razorpay adapter with raw-body HMAC webhook signature validation.
- **In-Browser Video Sessions:** Peer-to-peer WebRTC video calling mediated by authenticated Socket.IO signaling with join-window enforcement.
- **Role-Based Access Control:** Separate optimized portals for **Learners**, **Mentors**, and **Admins**.
- **Observability:** Prometheus metrics scraping and pre-provisioned Grafana monitoring dashboards.

---

## Architecture Overview

- **Frontend:** React + Vite + Tailwind CSS + React Router + Axios (Port `3000`)
- **Backend:** Node.js 22 LTS + Express 5 + Mongoose + Zod + Socket.IO + Pino (Port `5000`)
- **ML Service:** Python 3.13 + FastAPI + Scikit-Learn + Pydantic v2 (Port `8000`)
- **Database:** MongoDB 7 (`mongo:27017`)
- **Cache & Locks:** Redis 7 Alpine (`redis:6379`)
- **Local Mailcatcher:** Mailpit (`http://localhost:8025` web UI, `1025` SMTP)
- **Monitoring:** Prometheus (`9090`) + Grafana (`3001`)

---

## Quickstart (Development with Docker)

### Prerequisites
- Docker Desktop with Compose v2 (`docker compose`)
- Node.js 22+ (for local test execution)

### 1. Clone & Configure
```bash
git clone <repo-url> mentor-match-ai
cd mentor-match-ai
cp .env.example .env
```

### 2. Start Services
```bash
# Core application stack
docker compose up --build

# Or with full monitoring stack (Prometheus & Grafana)
docker compose --profile monitoring up --build
```

### 3. Load Local Demo Data
With the Compose services running, open another terminal in the project folder and run:
```bash
npm run seed
```
The seed is safe to run more than once. It creates learner and mentor profiles, three completed sample sessions with reviews, twelve approved mentors, and two pending mentor applications.

### 4. Access Services
- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Mailpit Web Inbox:** [http://localhost:8025](http://localhost:8025)
- **ML Service Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus UI:** [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboard:** [http://localhost:3001](http://localhost:3001) (default login: `admin` / `admin`)

---

## Running Tests

Run all unit, integration, and ML tests locally:
```bash
# Run all test suites
npm test

# Run backend unit, integration, and full-journey tests (14 suites, 78 tests)
npm --prefix backend test

# Run backend ESLint check
npm --prefix backend run lint

# Run frontend Vitest suite (14 suites, 26 tests)
npm --prefix frontend run test

# Run frontend production bundle build
npm --prefix frontend run build

# Run ML service Pytest suite (8 tests)
npm run test:ml
```

---

## Demo Accounts (Local Only)

- **Learners:** `learner01@mentormatch.local` through `learner05@mentormatch.local`
- **Mentors:** `mentor01@mentormatch.local` through `mentor14@mentormatch.local` (mentors 13 and 14 are pending approval)
- **Password for all seeded users:** `Demo@12345`
- **Admin Account:** `admin@mentormatch.local` (Password: value of `ADMIN_PASSWORD` in `.env`, default `ChangeMe123!`)

---

## Video Session Check (Local)

- Camera and microphone access is available on `localhost` or over HTTPS. Allow both permissions when the browser asks.
- Sign in as the learner and mentor in two separate browser profiles. Book and confirm a mock-payment session; the room opens 10 minutes before its start and closes 15 minutes after its end.
- Open **My sessions** in both profiles and choose **Join session**. Use the mute, camera, and leave controls during the call.
- Use separate participants; joining with anyone outside the booking or after the room is full is rejected.

---

## Documentation

- [`docs/API.md`](docs/API.md): Comprehensive API reference for all backend endpoints.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): Production deployment guides for Single Server (VPS + Docker + Caddy) and AWS ECS Fargate + MongoDB Atlas + ElastiCache.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md): Production launch checklist and Human Gates review.

---

## Future Work (Planned Extensions)

The architectural foundation is decoupled and designed not to block future roadmap items:
- **Payment Adapters:** Stripe adapter integration for multi-currency support and global credit card checkout.
- **Automated Payouts:** Direct bank payouts via Razorpay Route / Stripe Connect.
- **Subscription Plans & Coupons:** Learner tiered subscriptions, session packages, and promotional coupons.
- **ML Retraining Pipeline:** Live model retraining (`/train` endpoint) incorporating user session ratings and explicit match feedback.
- **Calendar & Video Enhancements:** Google Calendar and Outlook two-way sync, screen sharing, in-call chat, and automatic cloud recording with AI summaries.
- **Mobile Experience:** React Native or Flutter mobile apps for learners and mentors.
- **Group Sessions:** Cohort-based mentorship and group workshops with multi-party WebRTC/SFU.
