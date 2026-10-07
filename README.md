# Mentor-Match AI

Mentor-Match AI is a full-stack web platform where learners find their best-fit mentor through an intelligent recommendation engine, book 1-to-1 sessions with slot-conflict protection, complete secure payments with automatic platform commission calculation, join real-time browser-based video calls via WebRTC, and submit verified session reviews.

---

## Key Features

- **Personalized Recommendations:** Hybrid scoring engine combining skill overlap, goal semantic match, availability overlap, Bayesian ratings, and experience weighting with automatic fallback.
- **Conflict-Free Booking:** Two-tier slot reservation using high-speed Redis distributed locks backed by MongoDB unique partial indexes.
- **Monetization & Commission:** 15% platform fee split calculated automatically per booking with ledger-tracked mentor earnings and admin payouts.
- **Dual Payment Gateways:** Zero-dependency built-in mock gateway for local development and official Razorpay adapter with raw-body HMAC webhook signature validation.
- **In-Browser Video Sessions (WebRTC):** Peer-to-peer WebRTC video calling with pre-call preview check, live mic volume analyzer, error diagnostics, auto-enabling countdown computed from server time, single-seat per user replacement, camera-off avatars, muted indicators, and optional mentor backup meeting link (Google Meet / Zoom).
- **Learner-Mentor Chat:** Secure, direct messaging between learners and mentors with paid bookings. Instant Socket.IO delivery to private user rooms, offline 15-second polling fallback, rate limiting (20/min), offline notification emails via Mailpit with message preview text, and access window governed by `CHAT_VALIDITY_DAYS`.
- **Chat Notifications:** Real-time navbar red dot with unread counts (`9+`), auto-collapsing popup toasts with message previews, tab title count `(N) Mentor-Match` when tab is hidden, and atomic email throttling.
- **Email Verification & Account Authenticity:** Cryptographically secure 24-hour verification links (`/verify-email`), MX domain resolution and throwaway email blocklists in production. Unverified accounts receive clear dashboard banners and are protected from creating bookings, payments, or messages until verified.
- **Refund & Reminder Emails:** Automated learner emails for pending and completed refunds; 24-hour and 1-hour session reminders sent to both participants with IST timestamps, `.ics` calendar attachments, and camera/mic check reminders.
- **Interactive Calendar & iCalendar (.ics) Sync:** Full month grid view on session pages with keyboard navigation, session count dots, day details, and RFC 5545 compliant `.ics` downloads.
- **Camera & Microphone Diagnostics in Settings:** On-demand audio/video hardware test card in `/settings` for learners and mentors, featuring live preview, mic levels, track toggles, and zero-residual track cleanup.
- **Dashboard User Greetings:** Accessible "Welcome back, <name>" personalized greetings across Learner, Mentor, and Admin dashboards.
- **Ultra-Thin Themed Scrollbars:** 4px custom scrollbars styled with high-contrast tokens ($\ge 3:1$ across all 6 themes), zero horizontal overflow, and responsive navbar layout.
- **Role-Based Access Control:** Separate optimized portals for **Learners**, **Mentors**, and **Admins**.
- **Account Security & Password Settings:** Dedicated Settings portal (`/settings`) for all three roles with secure password change (invalidating other active sessions), universal "Sign out of all devices", and cryptographic token-based "Forgot password" flow (`/forgot-password`, `/reset-password`).
- **Mentor Approval & Payment Transparency:** Pre-approval status tracking banner for onboarding mentors with a live missing-items checklist, alongside learner payment and refund status tracking across session bookings.
- **Observability:** Prometheus metrics scraping and pre-provisioned Grafana monitoring dashboards.

---

## Demo Accounts

All seeded demo accounts are automatically pre-verified for immediate testing:
- **Learner:** `learner01@mentormatch.local` / `Demo@12345`
- **Mentor:** `mentor01@mentormatch.local` / `Demo@12345`
- **Admin:** `admin@mentormatch.local` / `ChangeMe123!`

---

## Testing Video, Chat, Notifications & Calendar Locally

To immediately test the video call, chat, notifications, and calendar features without going through the booking and checkout flow:

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
2. **Real-Time Chat & Notifications:**
   - On the learner's sessions or mentor detail page, click **Message mentor**.
   - Type a message and press <kbd>Enter</kbd> (or <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line).
   - In the mentor window, notice the red dot with unread count on **Messages** in the navbar and the popup toast.
   - When the mentor tab is hidden, notice the tab title displays `(N) Mentor-Match`.
   - Open the thread; the unread dot clears.
   - Close the mentor's tab and send a message as the learner. Open Mailpit at [http://localhost:8025](http://localhost:8025) to see the notification email with message preview text (throttled to at most one email per `CHAT_EMAIL_THROTTLE_MINUTES`).
3. **Calendar & .ics Download:**
   - Navigate to **My sessions** (or **Sessions**) and click **Calendar**.
   - Review the month grid with session dots and inspect day session chips.
   - Click **Add to calendar** on any confirmed session to download the `.ics` file.
4. **Settings Camera & Mic Check:**
   - Go to **Settings** as learner or mentor. Under "Camera and microphone", click **Test camera and microphone**.
   - Verify the live mirror and mic bar, toggle camera and mic on/off, then click **Stop test** (confirming camera hardware indicator turns off).

### Environment Configuration:
- `EMAIL_VERIFICATION_REQUIRED`: Whether new users must verify their email before booking, paying, or messaging (default: `true`). In emergencies, set to `false` to disable blocking.
- `CHAT_EMAIL_THROTTLE_MINUTES`: Minimum minutes between offline email notifications per conversation (default: `10`, range: `1` to `120`).
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
