# Mentor-Match AI

Mentor-Match AI is a full-stack web platform where learners find their best-fit mentor through an intelligent recommendation engine, book 1-to-1 sessions with slot-conflict protection, complete secure payments with automatic platform commission calculation, join real-time browser-based video calls via WebRTC, and submit verified session reviews.

---

## Key Features

- **Personalized Recommendations:** Hybrid scoring engine combining skill overlap, goal semantic match, availability overlap, Bayesian ratings, and experience weighting with automatic fallback.
- **Conflict-Free Booking:** Two-tier slot reservation using high-speed Redis distributed locks backed by MongoDB unique partial indexes.
- **Monetization & Commission:** 15% platform fee split calculated automatically per booking with ledger-tracked mentor earnings and admin payouts.
- **Dual Payment Gateways:** Zero-dependency built-in mock gateway for local development and official Razorpay adapter with raw-body HMAC webhook signature validation.
- **In-Browser Video Sessions (WebRTC):** Peer-to-peer WebRTC video calling with pre-call preview check, live mic volume analyzer, error diagnostics, auto-enabling countdown computed from server time, single-seat per user replacement, camera-off avatars, muted indicators, and optional mentor backup meeting link (Google Meet / Zoom).
- **Learner-Mentor Chat:** Secure, direct messaging between learners and mentors with paid bookings. Instant Socket.IO delivery to private user rooms, offline 15-second polling fallback, rate limiting (20/min), offline notification emails via Mailpit without message text leakage, and access window governed by `CHAT_VALIDITY_DAYS`.
- **Ultra-Thin Themed Scrollbars:** 4px custom scrollbars styled with high-contrast tokens ($\ge 3:1$ across all 6 themes), zero horizontal overflow, and responsive navbar layout.
- **Role-Based Access Control:** Separate optimized portals for **Learners**, **Mentors**, and **Admins**.
- **Account Security & Password Settings:** Dedicated Settings portal (`/settings`) for all three roles with secure password change (invalidating other active sessions), universal "Sign out of all devices", and cryptographic token-based "Forgot password" flow (`/forgot-password`, `/reset-password`).
- **Mentor Approval & Payment Transparency:** Pre-approval status tracking banner for onboarding mentors with a live missing-items checklist, alongside learner payment and refund status tracking across session bookings.
- **Observability:** Prometheus metrics scraping and pre-provisioned Grafana monitoring dashboards.

---

## Testing Video and Chat Locally

To immediately test both the video call and chat features without going through the booking and checkout flow:

```bash
# 1. Ensure docker services are running
docker compose up -d

# 2. Seed an immediate active demo booking and chat access
npm run seed:video-demo
```

This idempotent script creates:
- An active `confirmed` booking starting in 3 minutes (so the 10-minute early window is immediately open) and ending in 63 minutes.
- Verified payment status for the session.
- Immediate chat access between `learner01@mentormatch.local` and `mentor01@mentormatch.local`.

### Testing Steps:
1. **Video Call:**
   - Open a browser window and sign in as `learner01@mentormatch.local` (`Demo@12345`). Go to **My sessions** and click **Join session** (or navigate to the printed session URL).
   - In a private/incognito window, sign in as `mentor01@mentormatch.local` (`Demo@12345`). Go to **Sessions** and click **Join session**.
   - On the preview card, click **Allow camera and microphone**. The live video and mic meter will activate.
   - Click **Join session** in both windows. Both participants will connect via WebRTC.
   - Test **Mute/Unmute**, **Camera off/on**, and **Leave session**.
2. **Real-Time Chat:**
   - On the learner's sessions or mentor detail page, click **Message mentor**.
   - Type a message and press <kbd>Enter</kbd> (or <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line).
   - In the mentor window, open the **Messages** link in the navbar (notice the live unread badge). The message appears in real time.
   - Reply as the mentor; the reply immediately renders on the learner's screen without a page refresh.
   - If the recipient's window is closed, inspect Mailpit at [http://localhost:8025](http://localhost:8025) to see the privacy-safe notification email (contains link only, no message text).

### Environment Configuration:
- `CHAT_VALIDITY_DAYS`: Number of days after the latest session's end time that the learner and mentor can continue sending chat messages (default: `7`, range: `1` to `90`). After this window expires, existing conversation history remains readable, while sending is disabled.

---

## Documentation

- [`docs/API.md`](docs/API.md): Comprehensive API reference for all backend endpoints.
- [`docs/BRAND.md`](docs/BRAND.md): Brand mark specifications, color token contrast, and visual guidelines.
- [`docs/SECURITY_AUDIT.md`](docs/SECURITY_AUDIT.md): Comprehensive security audit matrix, threat model, and verified controls.
- [`docs/IMAGE_CREDITS.md`](docs/IMAGE_CREDITS.md): Editorial image credits, licensing, and asset provenance.
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
