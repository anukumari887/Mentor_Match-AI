# Mentor-Match AI: Build Plan (PRD + Instructions for the AI Agent)

This file is the single source of truth for building the project. The AI agent (Antigravity) must read it fully before writing any code, and must follow it in order.

Owner: Anu Kumari. The owner is a beginner. The agent does the work and explains results in simple words.

---

## 0. How the agent must work (read first)

### 0.1 Your role
You are a senior full-stack engineer at a product company. You build, run, test and fix the whole project yourself. The owner will not write code.

### 0.2 Working rules
1. Work phase by phase (Section 16). Do not start a phase until the previous phase passes its exit checks.
2. At the start, create two files in the project root:
   - `AGENTS.md`: a short copy of Sections 0, 14 and 13 (rules, Windows/Docker notes, security rules).
   - `PROGRESS.md`: a log. After every phase write: what was built, what was tested, what failed and how you fixed it, and what is next. If your context is reset, read `PROGRESS.md` and this file, then continue from the first unfinished phase.
3. After each phase passes its checks, run `git add -A` and `git commit -m "Phase N: <name>"`.
4. Never say something works unless you ran it and saw it work. Show the real command and a short real result in `PROGRESS.md`.
5. Error-fixing loop: run, read the real error or log, find the root cause, fix, run again. Try up to 5 different fixes per problem. If still stuck, write `BLOCKED: <problem, what you tried>` in `PROGRESS.md`, then continue with work that does not depend on it.
6. Never make a test pass by deleting it, weakening it, or turning off validation, security or error handling.
7. Do not stop to ask the owner questions, except at the Human Gates in Section 18. For anything not covered here, choose the simplest safe option, and write the decision in `PROGRESS.md`.
8. Write the code like a careful human developer: clear names, small files, one job per file, short comments only where the reason is not obvious, no leftover TODOs, no dead code, no fake data in real code paths (fake data lives only in the seed script), no `console.log` (use the logger). Keep a consistent style with ESLint + Prettier.
9. Every feature is finished end to end: database, API, validation, errors, UI, loading state, empty state, error state, and tests.
10. Use `docker compose` (with a space, Compose v2), not `docker-compose`.
11. Use current stable versions of libraries. Pin exact versions in `package.json` / `requirements.txt`. After installing, confirm that the install and the build really work before moving on.

### 0.3 Definition of done for the whole project
All items in Section 17 are checked, with proof in `PROGRESS.md`.

---

## 1. Product summary

Mentor-Match AI is a web platform where learners find the best-fit mentor, book a paid 1-to-1 session, join a video call in the browser, and leave a review.

Roles: **Learner**, **Mentor**, **Admin**.

Core journey: Sign up, fill profile, get ranked recommendations, choose mentor, pick slot, pay, join video session, review.

### 1.1 How the product makes money (must be built in)
- **Platform commission.** On every paid booking the platform keeps a percentage (`PLATFORM_FEE_PERCENT`, default 15). The fee is calculated and saved on the payment record at the time of payment, so changing the percent later does not change old records.
- **Mentor earnings and payouts.** Each mentor sees their earnings (after the fee) and what has been paid out. The admin sees how much is owed to each mentor and records payouts (manual bank transfer in the MVP, with a reference number).
- **Admin revenue view.** Total booking value, platform fees earned, mentor earnings owed, refunds due.
- **Launch-ready pages.** Terms, Privacy Policy and Refund/Cancellation Policy pages (draft text, marked clearly in the footer notes of `docs/LAUNCH_CHECKLIST.md` that the owner must have them reviewed before going live). Payment gateways need these pages for live approval.
- **Test mode and live mode.** The app runs fully with a built-in mock payment gateway, with Razorpay test keys, and later with Razorpay live keys. Only environment variables change. No code change is needed to go live.

Not built in the MVP, but the design must not block them (see Section 19): Stripe, subscriptions, packages, coupons, featured mentors, automatic payouts, automatic refunds.

---

## 2. Final decisions (these override the original README where they differ)

| Topic | Decision | Reason |
|---|---|---|
| Mentor availability | Structured weekly windows, not strings like "Sat 18:00" | Strings cannot be compared or turned into slots without bugs |
| Slot length | Fixed 60 minutes. `pricePerHour` is the price of one session | Keeps booking and payment simple and correct |
| Time handling | Store all times in UTC. Mentor availability is entered in IST (Asia/Kolkata). The UI shows times in the viewer's browser time zone, and shows the zone name | Avoids time zone bugs |
| Mentor identity in bookings | `mentorId` is the mentor's **User** id everywhere | One id, fewer mistakes |
| Mentor approval | `approvalStatus`: pending, approved, rejected (instead of a boolean) | Admin can reject with a reason |
| ML service | Stateless. Node sends the learner and candidate mentors in the request body. The ML service does not connect to MongoDB | Simpler, faster, no shared-database coupling |
| `/train` endpoint | Not built in the MVP. Note this in README "Future work". Weights are set by config | There is no real data yet. A fake training endpoint would be dishonest code |
| ML failure | Node falls back to a simple built-in scorer if the ML service is down or slow (over 2 seconds). The app never errors because of ML | Reliability |
| Reschedule | Not in the MVP. User cancels and books again | Keeps the booking state machine safe |
| Auth token | JWT in an httpOnly cookie (not localStorage) | Safer against script theft |
| Password hashing | `bcryptjs` cost 12 | Pure JS, no native build problems in Alpine Docker |
| Payments | Gateway adapter with two implementations: `mock` and `razorpay`. Stripe is future work | App must work 100% without any external keys |
| Refunds | Detected and tracked (`refund_due`). Admin marks them refunded after refunding in the gateway dashboard | Automatic refunds are future work |
| Locking | Redis lock is a speed layer. The MongoDB unique index is the real guard against double booking. If Redis is down, booking still works using the database only | Safe if Redis fails |
| Database transactions | Not used (they need a MongoDB replica set). Use unique indexes and atomic `findOneAndUpdate` | Works on a single local MongoDB |
| Cloud | MVP delivers deploy-ready files and written deployment guides. Actual cloud deployment needs the owner's accounts (Human Gate) | The agent cannot create cloud accounts |
| Monitoring alerts | Prometheus alert rules (visible in Prometheus UI). Grafana shows dashboards | Provisioning Grafana alerts by file is error-prone |

---

## 3. Tech stack (versions: use the latest stable that installs and works)

| Area | Choice |
|---|---|
| Frontend | React (latest stable) + Vite + React Router + Tailwind CSS + Axios. Tests: Vitest + React Testing Library |
| Backend | Node.js 22 LTS in Docker, Express 5, Mongoose, Zod (validation), jsonwebtoken, bcryptjs, helmet, cors, cookie-parser, express-rate-limit with `rate-limit-redis`, ioredis, socket.io, luxon (time zones), nodemailer, pino (logging), prom-client. Module system: CommonJS. Tests: Jest + Supertest |
| ML service | Python 3.13 (Docker image `python:3.13-slim`), FastAPI, pydantic v2, scikit-learn, numpy, uvicorn, prometheus-client. Tests: pytest + httpx |
| Database | MongoDB 7 (`mongo:7`) |
| Cache | Redis 7 (`redis:7-alpine`) |
| Email (local) | Mailpit (`axllent/mailpit`) catches all emails. Web inbox at http://localhost:8025 |
| Monitoring | Prometheus + Grafana (in a Compose profile called `monitoring`) |
| CI/CD | GitHub Actions |

Local ports: frontend 3000, backend 5000, ml-service 8000, mongo 27017, redis 6379, mailpit 8025 (web) and 1025 (SMTP), prometheus 9090, grafana 3001.

Folder structure: follow README section 19, plus: `docs/` (LAUNCH_CHECKLIST.md, DEPLOYMENT.md, API.md), `backend/scripts/seed.js`, `backend/tests/`, `docker-compose.prod.yml`, `.gitattributes`, `.dockerignore` files, `monitoring/alerts.yml`.

---

## 4. Environment variables

Create `.env.example` with all of these (safe dev defaults, no real secrets). `.env` is git-ignored. The backend must validate env at startup using Zod and exit with a clear message if something required is missing or invalid.

```
NODE_ENV=development
PORT=5000
LOG_LEVEL=info

MONGO_URI=mongodb://mongo:27017/mentormatch
REDIS_URL=redis://redis:6379
ML_SERVICE_URL=http://ml-service:8000
ML_TIMEOUT_MS=2000

JWT_SECRET=dev_only_change_me_to_a_long_random_string_32chars_min
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false
CORS_ORIGIN=http://localhost:3000

ADMIN_EMAIL=admin@mentormatch.local
ADMIN_PASSWORD=ChangeMe123!

PAYMENT_MODE=mock
PLATFORM_FEE_PERCENT=15
SLOT_LOCK_MINUTES=10
MIN_BOOKING_LEAD_HOURS=2
FREE_CANCEL_HOURS=24
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=Mentor-Match <no-reply@mentormatch.local>

STUN_URLS=stun:stun.l.google.com:19302
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=

METRICS_TOKEN=

VITE_API_URL=http://localhost:5000
```

Startup safety rules (the backend must enforce them):
- In `production`: `JWT_SECRET` must be at least 32 chars and must not contain `dev_only`; `ADMIN_PASSWORD` must not be the default; `PAYMENT_MODE=mock` is refused; `COOKIE_SECURE` must be true. Otherwise exit with a clear error.
- `PAYMENT_MODE=razorpay` requires all three Razorpay values.
- The admin user is created from `ADMIN_EMAIL`/`ADMIN_PASSWORD` at startup if it does not exist (never overwritten if it exists).

---

## 5. Data model (MongoDB, Mongoose)

All collections have `createdAt` and `updatedAt` (Mongoose timestamps). Money in `payments` is stored in **paise** (integers). Prices in profiles are whole **rupees**.

**users**: name, email (unique, lowercase, trimmed), passwordHash, role (`learner` | `mentor` | `admin`), isActive (default true).
Public registration may only create `learner` or `mentor`. Admin is never created through the API.

**learnerProfiles**: userId (unique), goals (string, max 500), knownSkills [string], wantedSkills [string], level (`beginner` | `intermediate` | `advanced`), budgetPerHour (rupees), availability [{dayOfWeek 0-6 (0=Sunday), startTime "HH:mm", endTime "HH:mm"}].

**mentorProfiles**: userId (unique), headline (max 120), bio (max 1500), skills [string], experienceYears (0-60), pricePerHour (rupees, 100 to 20000), availability [same shape as above], timezone (default `Asia/Kolkata`), approvalStatus (default `pending`), rejectionReason, ratingAvg (default 0), ratingCount (default 0), totalSessions (default 0).

**bookings**: learnerId, mentorId (User ids), startTime, endTime (UTC dates), priceAtBooking (rupees), status (`pending` | `confirmed` | `completed` | `cancelled` | `expired`), holdsSlot (boolean), expiresAt (for pending), paymentId, reminderSent (default false), completedAt, cancelledAt, cancelledBy (`learner` | `mentor`), cancelReason, hasReview (default false).
**Critical index:** unique index on `{mentorId: 1, startTime: 1}` with `partialFilterExpression: { holdsSlot: true }`. `holdsSlot` is true for `pending`, `confirmed`, `completed`. It is set to false when the booking becomes `cancelled` or `expired`. This is what guarantees there is no double booking.
Other indexes: `{learnerId, startTime}`, `{mentorId, startTime}`, `{status, expiresAt}`, `{status, endTime}`.

**payments**: bookingId (unique), learnerId, mentorId, amount (paise), platformFee (paise), mentorEarning (paise), currency (`INR`), gateway (`mock` | `razorpay`), gatewayOrderId, gatewayPaymentId, status (`created` | `paid` | `failed` | `refund_due` | `refunded`), lateArrival (boolean), earned (boolean, default false), paidAt, refundedAt, refundReference.
Fee rule: `platformFee = Math.round(amount * PLATFORM_FEE_PERCENT / 100)`; `mentorEarning = amount - platformFee`.

**reviews**: bookingId (unique), learnerId, mentorId, rating (integer 1-5), comment (max 1000).

**feedbackEvents**: learnerId, mentorId, action (`recommended` | `viewed` | `booked` | `rated`), meta (object), createdAt. Index `{learnerId, createdAt}`.

**webhookEvents**: eventId (unique), type, processedAt. Used so the same gateway event is never processed twice.

**payouts**: mentorId, amount (paise), reference, note, createdBy (admin user id).

**complaints**: reporterId, bookingId (optional), subject (max 120), message (max 2000), status (`open` | `resolved`), resolutionNote.

---

## 6. Business rules (the agent must implement exactly these)

### 6.1 Slots
- A mentor's availability windows (in their timezone) are cut into 60-minute slots starting at the window start. A window 18:00-20:00 gives slots 18:00 and 19:00. A window must have start before end, and both on the hour or half hour is not required; slots simply step by 60 minutes from the window start. Reject overlapping windows on the same day when saving.
- Slots are generated for the next 14 days using luxon in the mentor's timezone, so daylight saving and offsets are handled by the library.
- A slot is shown as available only if: the mentor is approved and active; the slot starts at least `MIN_BOOKING_LEAD_HOURS` from now; and no booking with `holdsSlot: true` exists for it.
- `GET /api/mentors/:id/slots` returns slots with start/end in ISO UTC.

### 6.2 Booking creation (`POST /api/bookings`, learner only)
1. Validate that `startTime` is a real available slot of that mentor (regenerate slots server-side; never trust the client).
2. Try Redis lock: `SET lock:slot:{mentorId}:{startISO} {bookingId or random} NX EX {SLOT_LOCK_MINUTES*60}`. If it fails (already locked), return 409 `SLOT_TAKEN`. If Redis is down, log a warning and continue (the database index protects us).
3. Insert the booking: `status: pending`, `holdsSlot: true`, `expiresAt = now + SLOT_LOCK_MINUTES`, `priceAtBooking = mentor.pricePerHour`. If MongoDB returns a duplicate key error, release the Redis lock and return 409 `SLOT_TAKEN`.
4. Record a `feedbackEvents` row (`booked`).
5. A learner cannot book themselves, cannot book an unapproved mentor, and cannot hold more than 3 pending bookings at once.

### 6.3 Expiry and completion jobs
A job runs every 60 seconds inside the backend process (use `setInterval`, protected so overlapping runs do not happen, and each run wrapped in try/catch with logging):
- `pending` with `expiresAt < now` becomes `expired` with `holdsSlot: false`. Delete the Redis lock.
- `confirmed` with `endTime < now` becomes `completed`; set the payment `earned: true`; increase the mentor's `totalSessions`; send a "please review" email.
- Reminders: `confirmed` bookings starting within the next 60 minutes with `reminderSent: false` get a reminder email to both users, then `reminderSent: true` (set atomically with `findOneAndUpdate` so one email only).
Expose these as plain functions so tests can call them directly.

### 6.4 Payment confirmation (one function used by verify, webhook and mock)
`confirmPayment({ gatewayOrderId, gatewayPaymentId })` must be **idempotent** (safe to call many times):
1. Find the payment by `gatewayOrderId`. Atomically set it to `paid` only if it is currently `created` (`findOneAndUpdate` with a status condition). If it was already `paid`, return success without doing anything again.
2. Then move the booking:
   - If booking is `pending`: set `confirmed` (keep `holdsSlot: true`), clear the lock use. Send confirmation emails to both users.
   - If booking is `expired`: try to set it back to `confirmed` with `holdsSlot: true`. If this succeeds (slot still free), mark payment `lateArrival: true` and send confirmation emails. If it fails with a duplicate key error (someone else took the slot), mark payment `refund_due` and `lateArrival: true`.
   - If booking is `cancelled`: mark payment `refund_due`, `lateArrival: true`.
   - If booking is already `confirmed`/`completed`: do nothing.
3. Never throw on repeats. Never leave payment `paid` while the booking stays `pending`.

### 6.5 Cancellation (`PATCH /api/bookings/:id/cancel`)
- Allowed for the booking's learner or mentor, only while status is `pending` or `confirmed` and the session has not started.
- `pending`: set `cancelled`, `holdsSlot: false`, delete Redis lock. (If a payment is in progress and arrives later, rule 6.4 handles it.)
- `confirmed` cancelled by **mentor**: always `payment.status = refund_due`.
- `confirmed` cancelled by **learner** at least `FREE_CANCEL_HOURS` before start: `refund_due`.
- `confirmed` cancelled by learner later than that: no refund; set payment `earned: true` (mentor keeps the earning).
- Set `holdsSlot: false`, `cancelledAt`, `cancelledBy`, `cancelReason`. Email the other person.

### 6.6 Reviews (`POST /api/reviews`, learner only)
Only for a booking that is `completed`, belongs to the learner, and has no review yet (unique index also enforces this). Save the review, set `booking.hasReview`, recompute the mentor's `ratingAvg` and `ratingCount` using an aggregation over that mentor's reviews (not by incremental math, to avoid drift), add a `rated` feedback event, and clear that learner's recommendation cache.

### 6.7 Earnings and payouts
- Mentor balance = sum of `mentorEarning` of payments with `earned: true` minus sum of `payouts.amount`.
- Admin records a payout with `POST /api/admin/payouts` (cannot exceed the mentor's current balance).

### 6.8 Mentor visibility
Mentors appear in search, recommendations and slots only when `approvalStatus = approved` and `user.isActive = true`.

---

## 7. API specification

Base: `/api`. Request and response bodies are JSON. Validate every body, query and param with Zod. Error format (always):

```json
{ "error": { "code": "SLOT_TAKEN", "message": "This slot was just booked by someone else.", "details": [] } }
```

Use correct HTTP codes: 400 validation, 401 not logged in, 403 wrong role, 404 not found, 409 conflict, 429 rate limit, 500 unexpected (log it, hide internals), 503 dependency down. Unknown routes return the same JSON error with 404.

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | `{status, mongo, redis, ml}`; 200 if mongo and redis ok (ml may be "down" = degraded), else 503 |
| POST | `/api/auth/register` | public | name, email, password (min 8), role learner/mentor. Creates user + empty profile. Sets cookie |
| POST | `/api/auth/login` | public | email, password. Rate limited. Sets cookie |
| POST | `/api/auth/logout` | any | Clears cookie |
| GET | `/api/auth/me` | any | Current user + profile summary |
| GET, PUT | `/api/profile` | learner, mentor | View or update own profile (shape depends on role) |
| GET, PUT | `/api/mentor/availability` | mentor | Weekly windows |
| GET | `/api/mentors` | any logged in | Filters: `q`, `skill`, `minPrice`, `maxPrice`, `minRating`, `day`, `sort` (rating, price_asc, price_desc, experience), `page`, `limit` (max 50) |
| GET | `/api/mentors/:id` | any logged in | Mentor detail (also records `viewed` event for learners) |
| GET | `/api/mentors/:id/slots` | any logged in | Available slots, next 14 days |
| GET | `/api/mentors/:id/reviews` | any logged in | Paginated reviews |
| GET | `/api/recommendations` | learner | Top mentors. `limit` default 5 |
| POST | `/api/bookings` | learner | Create booking (Section 6.2) |
| GET | `/api/bookings` | learner, mentor | Own bookings, filter by `status` |
| GET | `/api/bookings/:id` | participant | One booking |
| PATCH | `/api/bookings/:id/cancel` | participant | Cancel (Section 6.5) |
| GET | `/api/bookings/:id/room` | participant | `{canJoin, opensAt, closesAt, iceServers}`; join window = 10 minutes before start to 15 minutes after end, booking must be `confirmed` |
| POST | `/api/payments/create-order` | learner | Body `{bookingId}`; booking must be the learner's and `pending` and not expired. Creates (or returns the existing) payment record and gateway order. Response `{gateway, orderId, amount, currency, keyId?}` |
| POST | `/api/payments/verify` | learner | Razorpay checkout result `{razorpay_order_id, razorpay_payment_id, razorpay_signature}`; verify signature then `confirmPayment` |
| POST | `/api/payments/webhook` | gateway | Razorpay webhook (Section 8) |
| POST | `/api/payments/mock/confirm` | learner | Only when `PAYMENT_MODE=mock` and not production. Calls `confirmPayment` |
| POST | `/api/reviews` | learner | Section 6.6 |
| POST | `/api/complaints` | learner, mentor | Report an issue |
| GET | `/api/mentor/earnings` | mentor | `{earned, paidOut, balance, recent[]}` |
| GET | `/api/admin/stats` | admin | Users, mentors, bookings by status, GMV, platform fees, owed to mentors, refunds due, recommendation booking rate |
| GET | `/api/admin/users` | admin | List, search, activate/deactivate via PATCH `/api/admin/users/:id` |
| GET | `/api/admin/mentors?status=pending` | admin | List mentors by approval status |
| PATCH | `/api/admin/mentors/:id/approve` | admin | Approve |
| PATCH | `/api/admin/mentors/:id/reject` | admin | Reject with reason |
| GET | `/api/admin/bookings` | admin | All bookings, filters |
| GET | `/api/admin/payments` | admin | All payments, filter `status` (for example `refund_due`) |
| PATCH | `/api/admin/payments/:id/mark-refunded` | admin | Sets `refunded`, saves `refundReference` |
| GET | `/api/admin/payouts-summary` | admin | Per mentor: earned, paid out, balance |
| POST | `/api/admin/payouts` | admin | Record a payout |
| GET, PATCH | `/api/admin/complaints` | admin | List; resolve with a note |
| GET | `/metrics` | Prometheus | If `METRICS_TOKEN` is set, require header `Authorization: Bearer <token>` |

Security on all protected routes: auth middleware (cookie JWT, loads the user, rejects inactive users), role middleware, and ownership checks (a user can only touch their own bookings/profile).

Rate limits: login and register 10 per 15 minutes per IP; payments routes 30 per 15 minutes per user; general API 300 per 15 minutes per IP. Use the Redis store, and fall back to memory if Redis is unavailable. Do not rate-limit `/api/health`, `/metrics` and the webhook.

---

## 8. Payments in detail

Create `backend/src/services/payments/` with an interface and two adapters, chosen by `PAYMENT_MODE`.

**Mock adapter:** `createOrder` returns a fake order id like `mock_order_<random>`. No network. The frontend shows a clear "Test mode: no real money is charged" banner and a "Pay now (test)" button that calls `/api/payments/mock/confirm`.

**Razorpay adapter** (use the official `razorpay` npm package):
- Create order: amount in paise (integer), `currency: "INR"`, `receipt` = booking id (max 40 chars), `notes: { bookingId }`.
- Frontend loads `https://checkout.razorpay.com/v1/checkout.js`, opens Checkout with `key`, `order_id`, `amount`, `currency`, and on success calls `/api/payments/verify`.
- Verify signature: `HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)` compared with the received signature using `crypto.timingSafeEqual`.
- **Webhook:** the route must receive the **raw body**. Register `express.raw({ type: 'application/json' })` for `/api/payments/webhook` **before** the global `express.json()`. Verify header `x-razorpay-signature` = `HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`; reject with 400 if invalid. Use header `x-razorpay-event-id` for de-duplication in `webhookEvents` (insert first; if duplicate key, return 200 and stop). Handle `payment.captured` and `order.paid` by calling `confirmPayment`. Handle `payment.failed` by setting the payment `failed` only if it is still `created` (the learner may retry; `create-order` for the same booking creates a fresh order and updates the payment record while status is `created` or `failed`). Always answer 200 quickly for events you ignore.
- Webhook testing on a local machine needs a public URL (a tunnel tool). This is a Human Gate and optional. Tests simulate webhooks by signing a payload with a test secret.

The money split is calculated when the payment record is created, from `priceAtBooking`.

---

## 9. Recommendation engine

### 9.1 Node side
`GET /api/recommendations` (learner only):
1. Load the learner profile. If the profile is empty (no wanted skills), return 200 with an empty list and `reason: "PROFILE_INCOMPLETE"`, and the UI asks the learner to complete the profile.
2. Cache key `rec:{learnerId}:{hash of the learner profile}`; TTL 600 seconds. Cache hit returns immediately. Clear a learner's cache when their profile changes or they post a review. The cache is optional: if Redis is down, continue without it.
3. Load approved, active mentors (cap at 200, newest first) with the fields needed for scoring.
4. Call the ML service `POST /recommend` with a timeout of `ML_TIMEOUT_MS`. On timeout, error, or bad response: use the built-in fallback scorer (Jaccard overlap of skills, with rating and experience), and set `source: "fallback"`. Otherwise `source: "ml"`.
5. Save `recommended` feedback events for the returned mentors (one batch insert).
6. Response: `{ source, items: [{ mentor, score, breakdown, reasons[], overBudget }] }`.

### 9.2 ML service (`ml-service/app/`)
Files: `main.py` (FastAPI app, routes, metrics), `recommender.py` (all scoring), `schemas.py` (pydantic models), `tests/`.

Endpoints: `POST /recommend`, `GET /health` (returns `{status:"ok"}`), `GET /metrics`. Interactive docs at `/docs` are automatic.

Request: `{ learner: {wantedSkills, knownSkills, goals, level, budgetPerHour, availability}, mentors: [{id, skills, headline, bio, experienceYears, pricePerHour, availability, ratingAvg, ratingCount}], limit }`. Validate sizes (mentors up to 500).

Scoring (all components are between 0 and 1):
- **Normalization:** lowercase, trim, and a small alias table (`ml` to `machine learning`, `js` to `javascript`, `py` to `python`, `ds` to `data science`, `dsa` to `data structures`, `react.js` to `react`, `node` to `node.js`, and similar).
- **skill match:** cosine similarity of TF-IDF vectors between the learner's wanted skills and the mentor's skills (use scikit-learn `TfidfVectorizer` fitted on the mentors' skills plus the learner's wanted skills for this request; handle the case of an empty vocabulary by returning 0).
- **goal match:** cosine similarity between the learner's goals text and the mentor's headline + bio + skills text. If goals are empty, use 0.5.
- **availability overlap:** total overlapping minutes between the learner's windows and the mentor's windows, divided by the learner's total window minutes, capped at 1. If the learner gave no windows, use 0.5.
- **rating:** Bayesian average = `(ratingAvg * ratingCount + 4.0 * 3) / (ratingCount + 3)`, divided by 5.
- **experience:** `min(experienceYears / 10, 1)`.
- **Weights:** skill 0.40, goal 0.20, availability 0.15, rating 0.15, experience 0.10. The rating weight scales by `min(ratingCount / 10, 1)`, so a brand new mentor gets rating weight 0; the unused rating weight is added to the skill weight (cold start rule). Weights live in one config object.
- **Budget:** if `pricePerHour > budgetPerHour` (and budget is set), multiply the final score by 0.75 and set `overBudget: true`.
- **Reasons:** build up to 3 plain-English strings, for example "Teaches Python, Machine Learning" (shared skills), "Free on Sat 18:00-20:00" (first overlap), "8 years of experience", "Within your budget".
- Sort by score descending; ties broken by rating then experience. Return `limit` items with `{id, score, breakdown, reasons, overBudget}`. Scores rounded to 3 decimals.

### 9.3 Quality checks (tests)
- Reproduce the README example: with the given component values the formula gives Amit about 0.89 and Neha about 0.62, and Amit ranks first. Test the formula function directly with those numbers.
- A mentor with all matching skills ranks above one with none.
- A new mentor (no reviews) is not hurt by a missing rating.
- Over-budget mentors rank lower than equal in-budget mentors.
- Empty inputs never crash the service.

---

## 10. Video sessions (WebRTC + Socket.IO)

- Socket.IO server runs on the same backend port. Client connects with credentials (cookie). Handshake middleware reads the cookie, verifies the JWT, and rejects anonymous connections. CORS for Socket.IO uses `CORS_ORIGIN` with credentials.
- Room = booking id. Events: `join-room {bookingId}`, `signal {bookingId, type: offer|answer|candidate, data}`, `leave-room`, and server events `peer-joined`, `peer-left`, `signal`, `room-error {code}`.
- On `join-room` the server checks: the user is the booking's learner or mentor; the booking is `confirmed`; the time is inside the join window (10 minutes before start to 15 minutes after end); the room has fewer than 2 people. Otherwise emit `room-error` with a clear code.
- The server only relays signaling messages to the other person in the same room. It never relays across rooms.
- Client: `getUserMedia` for camera and microphone with friendly messages when permission is denied or no device exists. Controls: mute, camera on/off, leave. Show connection state. Use `iceServers` returned by `/api/bookings/:id/room` (STUN from env, plus TURN if configured). Clean up tracks and the peer connection on leave and on page unload.
- The camera needs `localhost` or HTTPS. Document this.
- Test with two socket clients in Jest (join rules and relay). Test the real browser call using the agent's browser tool with a fake media device flag if available; if it cannot be automated, note it as "manual test needed" in `PROGRESS.md`.

---

## 11. Frontend specification

### 11.1 Pages and routes
Public: Landing `/`, Login `/login`, Register `/register` (choose Learner or Mentor), Terms `/terms`, Privacy `/privacy`, Refund Policy `/refund-policy`, 404.

Learner: Dashboard `/dashboard` (top 5 recommendations with "why" reasons, upcoming sessions), Profile `/profile`, Browse mentors `/mentors` (filters, sort, pagination), Mentor detail `/mentors/:id` (bio, skills, price, rating, reviews, slot picker), Checkout `/checkout/:bookingId` (summary, countdown timer for the hold, pay button), My sessions `/sessions` (tabs: Upcoming, Past, Cancelled; cancel; join; review), Video room `/session/:bookingId`.

Mentor: Dashboard `/dashboard` (approval status banner, upcoming sessions), Profile `/profile` (headline, bio, skills, experience, price), Availability `/availability` (weekly windows editor in IST), Sessions `/sessions`, Earnings `/earnings`, Video room.

Admin: `/admin` overview (stats), `/admin/mentors` (approve/reject), `/admin/bookings`, `/admin/payments` (refund due list, mark refunded), `/admin/payouts`, `/admin/complaints`, `/admin/users`.

### 11.2 Quality rules
- Folder layout per README: `components/`, `pages/`, `services/` (API calls in one place). Add `context/` for auth and `utils/` as needed.
- Auth state comes from `GET /api/auth/me` on load. Protected routes redirect to login and role-guard each area. Use `withCredentials: true` on Axios.
- Every page has loading, empty and error states. Forms show field-level errors from the API `details`. Buttons are disabled while submitting to prevent double clicks (especially booking and payment).
- Responsive design that works on phone width (360px) and desktop. Keyboard accessible, visible focus, proper labels, enough color contrast.
- Visual style: clean, calm, professional. One color palette defined as CSS variables or Tailwind theme tokens, one font family, consistent spacing, no emojis in the UI, no stock "AI-looking" gradients or glowing effects, real helpful copy (no lorem ipsum). Use a simple logo as text or a plain SVG shape.
- Money shown as `Rs. 500` formatted with `Intl.NumberFormat('en-IN')`. Times shown in the viewer's local zone with the zone name.
- The checkout page shows the countdown to `expiresAt`. When it hits zero, show "Your hold expired" and a button back to the mentor.
- Show a toast for success or failure of actions (a small simple component, no heavy library needed).
- A footer with links to Terms, Privacy, Refund Policy.

---

## 12. Seed data (`backend/scripts/seed.js`, run with `npm run seed`)

- Refuses to run when `NODE_ENV=production`.
- Idempotent (running twice does not duplicate anything; use upsert by email).
- Creates: 12 approved mentors with realistic names, skills (Python, Machine Learning, SQL, JavaScript, React, Node.js, DevOps, Data Structures, UI/UX, Java, Cloud, Interview Prep), different prices (Rs. 300 to Rs. 1500), experience, and weekly windows spread across weekdays and weekends; 2 pending mentors; 5 learners with complete profiles; a few completed bookings with reviews so ratings exist.
- All demo users share the password `Demo@12345`. Print the demo logins at the end. Document them in README under "Demo accounts (local only)".

---

## 13. Security rules

- Passwords: bcryptjs cost 12, minimum length 8. Never log passwords, tokens, cookies or card-like data.
- Cookie: httpOnly, `SameSite=Lax`, `Secure` when `COOKIE_SECURE=true`, path `/`, max age matches the JWT expiry.
- Helmet with sensible defaults; CORS limited to `CORS_ORIGIN` with credentials; JSON body size limit 100kb; strip unknown fields via Zod (`.strict()` or `.strip()`); protect against NoSQL injection (Zod types guarantee strings, and never pass raw `req.query` into Mongo filters; whitelist filter fields).
- Escape/limit all user text; React escapes output by default; never use `dangerouslySetInnerHTML`.
- Webhook signature verification, `timingSafeEqual`, and idempotency (Section 8).
- Docker containers run as a non-root user where possible. `.env` is never committed or copied into images (use `.dockerignore`).
- Dependencies: run `npm audit --omit=dev` and fix high or critical issues that have a fix.
- Admin routes always check role from the database user, not only from the token.
- Do not reveal whether an email exists on login failure (same message for wrong email and wrong password).

---

## 14. Windows and Docker notes (the owner uses Windows 11 with Docker Desktop and WSL 2)

- Add `.gitattributes` with `* text=auto eol=lf` so shell files and configs keep LF endings and do not break inside Linux containers.
- Do not require bash scripts on the host. Use `npm` scripts and `docker compose` commands only.
- Do not put `version:` at the top of the Compose file (it is obsolete).
- Dev containers: bind-mount the source code and use a named volume for `node_modules` so Windows files do not overwrite Linux modules. Vite needs `server.host = true`, `server.port = 3000`, and `server.watch.usePolling = true`. The backend dev command uses `nodemon -L` (legacy watch).
- Add healthchecks and `depends_on` with `condition: service_healthy`:
  - mongo: `mongosh --quiet --eval "db.adminCommand('ping')"`
  - redis: `redis-cli ping`
  - backend: `wget -qO- http://localhost:5000/api/health` (or an equivalent Node one-liner)
  - ml-service: a Python one-liner calling `/health`
- Compose files: `docker-compose.yml` (development, hot reload, includes mailpit; monitoring services under `profiles: ["monitoring"]`) and `docker-compose.prod.yml` (production builds, no bind mounts, no mailpit, optional Caddy reverse proxy for HTTPS).
- Use named volumes for MongoDB and Redis data so data survives restarts. Document `docker compose down` (keeps data) versus `docker compose down -v` (deletes data).
- Backend must wait for and retry MongoDB and Redis connections at startup (do not crash on the first failed attempt; retry with backoff for up to about 60 seconds).
- Production frontend image: multi-stage build (Vite build, then nginx serving static files with a fallback to `index.html` for React Router).
- If a port is already in use, report it clearly and tell the owner which port to free. Do not silently change ports.

---

## 15. Testing requirements

| Layer | What must be tested |
|---|---|
| Backend unit (Jest) | Slot generation (including windows across a week and lead time), fee calculation, ML fallback scorer, env validation, state transitions |
| Backend API (Jest + Supertest) | Auth (register, login, wrong password, role checks, inactive user), profile validation, mentor filters, booking rules, cancel rules, review rules, admin permissions |
| Concurrency | 10 parallel booking requests for the same slot: exactly 1 returns 201, 9 return 409, and the database holds exactly 1 booking for that slot |
| Payments | Mock flow end to end; calling confirm twice does not duplicate anything; Razorpay signature accept and reject; webhook with a bad signature gets 400; the same webhook event twice is processed once; late payment after expiry (slot free: re-confirmed; slot taken: `refund_due`) |
| Jobs | Expiry job, completion job (sets `earned`), reminder job sends once |
| Video | Two socket clients: allowed in window, rejected outside, rejected for strangers, rejected when a third joins |
| ML (pytest) | Section 9.3 checks |
| Frontend (Vitest + RTL) | Login form, protected route redirect, slot picker, checkout countdown, error states |
| Full journey test (Jest) | One scripted test that goes: register learner, register mentor, admin approves, mentor sets availability, learner gets recommendations, books, pays (mock), job completes the session (call the function directly, move time by changing the booking dates in the test database), learner reviews, mentor earnings show the correct net amount, admin payout is recorded |

Tests run against a separate database (`mentormatch_test`) and Redis DB index 1 on the Compose services, using `NODE_ENV=test`. Provide `npm test` in `backend/` and `frontend/`, and `pytest` in `ml-service/`. Also provide `npm run test:docker` (or a documented `docker compose run` command) so tests run inside the containers.

Load test: provide a small `k6` script (`backend/tests/load/browse.js`) that browses mentors and loads recommendations; document how to run it. Running it is optional; creating it is required.

---

## 16. Build phases

Each phase delivers backend + frontend + tests for its feature. After each phase: run the full stack with `docker compose up --build`, run all tests, fix everything, update `PROGRESS.md`, commit.

### Phase 1: Foundation
- Repo files: `.gitignore`, `.gitattributes`, `.dockerignore` files, `.env.example`, ESLint + Prettier config, `AGENTS.md`, `PROGRESS.md`.
- Backend skeleton: Express 5 app, env validation, pino logger, request logging, Mongo and Redis connections with retry, helmet, CORS, cookie-parser, error middleware, 404 handler, `/api/health`, `/metrics` (default metrics + HTTP request duration histogram + request counter).
- Frontend skeleton: Vite + React + Router + Tailwind, layout with navbar and footer, health status check page at `/status`, API client.
- Compose dev stack with mongo, redis, mailpit, backend, frontend (ML added in Phase 6).
- Exit checks: `docker compose up --build` runs clean; `http://localhost:5000/api/health` shows mongo and redis ok; `http://localhost:3000` loads; `http://localhost:8025` opens; backend and frontend tests run (even if only a few).

### Phase 2: Auth and profiles
- Register, login, logout, me; admin seeding; auth and role middleware; rate limits.
- Learner and mentor profile APIs and pages; mentor availability editor with validation (overlaps, start before end).
- Exit checks: tests for roles and validation pass; in the browser: register as learner and mentor, edit profiles, log out and in, refresh keeps the session; protected pages redirect when logged out.

### Phase 3: Mentor discovery and seed data
- Seed script; admin mentor approval endpoints and the pending list page; `/api/mentors` with all filters, sorting, pagination; mentor detail page; browse page with filters.
- Exit checks: `npm run seed` works twice without duplicates; filters return correct results (tests); unapproved mentors never appear.

### Phase 4: Slots and booking
- Slot generation, `GET slots`, slot picker UI, booking creation with Redis lock + unique index, expiry job, cancel for pending bookings, "My sessions" page, checkout page with countdown (payment button wired in Phase 5).
- Exit checks: the concurrency test passes; expiry job test passes; the UI shows a taken slot as unavailable after another user books.

### Phase 5: Payments and money
- Payment adapters (mock, razorpay), create-order, verify, mock confirm, webhook with raw body, `confirmPayment`, fees on the payment record, cancellation and refund-due rules, emails for confirmation and cancellation (nodemailer to Mailpit), mentor earnings page.
- Exit checks: all payment tests in Section 15 pass; in the browser a learner books and "pays" in mock mode, the booking turns confirmed, both emails appear in Mailpit (http://localhost:8025), and the mentor earnings page shows the correct net amount.

### Phase 6: ML service and recommendations
- ML service with tests, Dockerfile, added to Compose, Node recommendations route with cache and fallback, dashboard UI with "why this mentor" reasons.
- Exit checks: pytest passes; `http://localhost:8000/docs` opens; recommendations return `source: "ml"` and load in under 1 second on the second call (cache); stop the ml-service container and confirm recommendations still work with `source: "fallback"`, then start it again.

### Phase 7: Reviews and feedback
- Review API and UI (review prompt in Past sessions), mentor reviews list on the detail page, rating recalculation, feedback events, cache clearing.
- Exit checks: review rules tests pass; a new review changes the mentor's rating; a second review on the same booking is rejected.

### Phase 8: Video sessions
- Socket.IO server and rules, room API, video page with controls, STUN/TURN config, completion and reminder jobs if not done yet.
- Exit checks: socket tests pass; two browser windows (or two profiles) can join the same room inside the time window and see/hear each other, or if the agent cannot automate it, write exact manual test steps in `PROGRESS.md` for the owner and mark this as "needs owner check".

### Phase 9: Admin, complaints, payouts, legal pages
- Admin overview stats, users, bookings, payments, refund-due handling, payouts and summary, complaints (submit and resolve), Terms, Privacy and Refund Policy pages (clear draft text matching the real rules in Section 6.5), `docs/LAUNCH_CHECKLIST.md`.
- Exit checks: admin-only access is tested (a learner calling an admin route gets 403); stats numbers match the data in a test.

### Phase 10: Monitoring
- Prometheus config scraping backend and ml-service; `monitoring/alerts.yml` with rules (ML p95 over 2s, backend 5xx rate over 5%, payment webhook failures, a service down); Grafana with a provisioned Prometheus datasource and one provisioned dashboard (request rate, error rate, response time, ML latency, bookings created, payments confirmed, webhook failures). Add custom counters in the backend for bookings created, payments confirmed and webhook failures.
- Exit checks: `docker compose --profile monitoring up -d` works; Prometheus targets page shows all targets UP; Grafana at http://localhost:3001 shows the dashboard with live data after some traffic (login with the default and change it in the docs).

### Phase 11: Production build, CI/CD, deployment files
- Production Dockerfiles (multi-stage, small, non-root), `docker-compose.prod.yml`, `.github/workflows/ci.yml` (on push and pull request: install, lint, backend tests with Mongo and Redis services, frontend tests, ML tests, build all Docker images). A second workflow `deploy.yml` that builds and pushes images to AWS ECR and updates ECS only when the needed secrets exist (guard the job with a condition so it is skipped, not failed, when secrets are missing).
- `docs/DEPLOYMENT.md` in simple words with two paths: (A) simple: one cloud server with Docker and Caddy for automatic HTTPS; (B) AWS ECS as in the README (ECR, ECS services, Secrets Manager, MongoDB Atlas, managed Redis). Include the exact list of environment variables for production and a go-live checklist (switch `PAYMENT_MODE=razorpay`, live keys, webhook URL and secret, HTTPS, strong secrets, backups).
- Exit checks: `docker compose -f docker-compose.prod.yml build` succeeds; the prod stack starts and the app works through it; the CI workflow file is valid YAML and its steps match commands that really work locally (run each one locally).

### Phase 12: Hardening and final verification
1. Run the full test suites and the full journey test. Fix all failures.
2. Run lint and build for frontend and backend with zero errors.
3. Run `npm audit --omit=dev` for both Node projects and fix serious issues.
4. Clean start test: `docker compose down -v`, then `docker compose up --build` from zero, then `npm run seed`, then verify the journey in the browser by driving it with the browser tool, taking screenshots at each step: register, profile, recommendations, book, pay (mock), see confirmation email in Mailpit, join video room (or manual note), complete session (use a documented dev-only helper or adjust the data), review, mentor earnings, admin payout. Save screenshots in `docs/screenshots/`.
5. Check the browser console and backend logs for errors and warnings during that journey. Fix them.
6. Update `README.md`: correct the setup steps (`docker compose`), ports, demo accounts, how to run tests, the Future Work list (including that `/train`, Stripe, automatic payouts and refunds, reschedule are future), and keep the original project description. Create `docs/API.md` listing all endpoints.
7. Final `PROGRESS.md` summary and a final git commit.

---

## 17. Final acceptance checklist (all must be true, with proof in PROGRESS.md)

- [ ] A clean `docker compose up --build` starts every service with no errors in the logs
- [ ] A user can register, get recommendations, book, pay (mock mode), receive emails, join a video session, and review
- [ ] Recommendations are ranked sensibly; second load is under 1 second (cache); the app still works when the ML service is stopped
- [ ] No double bookings: the concurrency test passes
- [ ] Payments: idempotent confirm, bad webhook signature rejected, duplicate webhook ignored, late payment handled
- [ ] Platform fee and mentor earnings are correct on every payment; admin can record payouts and mark refunds
- [ ] Mentors are hidden until the admin approves them
- [ ] Every role-protected route rejects the wrong role (tested)
- [ ] All tests pass (backend, frontend, ML, full journey); lint and builds pass
- [ ] Prometheus targets are UP; Grafana dashboard shows live data; alert rules load
- [ ] Production Docker build works; CI workflow valid; deployment guide complete
- [ ] README, docs/API.md, docs/DEPLOYMENT.md, docs/LAUNCH_CHECKLIST.md are written
- [ ] No secrets in the repository; `.env` is ignored; production startup refuses unsafe settings
- [ ] No leftover `console.log`, TODO, commented-out blocks or unused files

---

## 18. Human Gates (the only times the agent may ask the owner for something)

The whole app works and passes all checks without any of these. They only matter for real-world launch. The agent must prepare everything and write the exact steps in `docs/LAUNCH_CHECKLIST.md`:

1. **Razorpay account and test keys** (to try the real Razorpay checkout and webhook instead of the mock gateway). Needs a public URL for webhooks during local testing.
2. **Real email provider** (SMTP details) for production emails.
3. **Domain name and cloud account** (AWS or a server) for deployment, plus a MongoDB Atlas account if using managed MongoDB.
4. **Legal review** of Terms, Privacy and Refund Policy pages; business registration and tax (GST) advice from an accountant. The app does not calculate taxes in the MVP.
5. **Live Razorpay KYC and live keys** to accept real money.

---

## 19. Future work (design must not block these)

Stripe adapter, learner subscription plans, session packages and coupons, featured mentors, automatic refunds and mentor payouts (Razorpay Route), real reschedule, trained ranking model using real feedback (including a `/train` endpoint), group sessions, screen sharing, chat, Google Calendar sync, mobile app, session recording and AI notes.

---

## 20. Original project description

The original README and the "explained simply" notes are in `README.md`. If this plan and the README disagree, this plan wins (see Section 2 for the list of intentional differences).
