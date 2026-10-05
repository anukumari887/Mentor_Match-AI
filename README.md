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
- Docker Desktop with Compose v2
- Node.js 22+ (for local test execution)

### 1. Clone & Configure
```bash
git clone <repo-url> mentor-match-ai
cd mentor-match-ai
cp .env.example .env
```

### 2. Start Services
```bash
docker compose up --build
```

### 3. Access Services
- **Web Application:** [http://localhost:3000](http://localhost:3000)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)
- **Mailpit Web Inbox:** [http://localhost:8025](http://localhost:8025)
- **ML Service Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Prometheus UI:** [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboard:** [http://localhost:3001](http://localhost:3001) (with `--profile monitoring`)

---

## Demo Accounts (Local Only)
All demo accounts use password: `Demo@12345` (Admin uses password configured in `.env`).

Detailed documentation and test scripts are available in the `docs/` folder and `BUILD_PLAN.md`.
