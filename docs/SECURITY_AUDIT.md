# Mentor-Match AI — Security Audit & Controls Matrix

This document tracks verified security controls, vulnerability mitigations, cryptographic guarantees, and test verification rows for Mentor-Match AI.

---

## 1. Authentication & Session Security

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Bcrypt Cost 12** | Credential cracking / rainbow tables | `bcryptjs.hash(password, 12)` | Verified in `tests/password-lifecycle.test.js` |
| **Password Length & Bcrypt Limit** | DoS via oversized bcrypt passwords | Minimum 8 characters, maximum 72 bytes (`Buffer.byteLength(val, 'utf8') <= 72`) | Verified in unit & integration tests |
| **Common Passwords Blacklist** | Credential stuffing / weak passwords | Shared Zod validator rejecting top vulnerable passwords | Verified in unit & integration tests |
| **Token Version Revocation (`tv`)** | Stale session persistence after password change | User schema `tokenVersion` (number, default 0). Auth middleware and Socket.IO handshake reject tokens where `tv !== user.tokenVersion`. Tokens lacking claim default to 0 for zero-disruption rollout. | Verified in `tests/password-lifecycle.test.js` |
| **Single-Session Password Rotation** | Zombie sessions remaining active | Password change issues a fresh cookie with updated `tokenVersion` for the current device while immediately invalidating all other devices. | Verified in E2E browser tests |
| **Sign Out Everywhere (`/logout-all`)** | Compromised device session termination | Increments `tokenVersion` on user record and clears local cookie. | Verified in E2E and Jest tests |
| **No Password Hashes Returned** | Hash leakage | All user projections explicitly exclude `passwordHash` (`-passwordHash`). | Verified in all auth endpoints |
| **Generic Auth Failures** | Account enumeration | Generic `"Invalid email or password"` returned on bad login attempts. | Verified in `tests/auth-profile.test.js` |
| **Constant Response Timing for Password Reset** | Email enumeration via response status / timing | `POST /api/auth/forgot-password` returns status 200 with identical message regardless of user existence. Email dispatch is performed asynchronously. | Verified in `tests/password-lifecycle.test.js` |
| **SHA-256 Reset Token Hashing** | Database compromise exposing raw tokens | Only SHA-256 hash stored in `passwordResets` collection (`tokenHash`). Raw token exists solely in outgoing email link. | Verified in `tests/password-lifecycle.test.js` |
| **Auto-Expiring Reset Tokens** | Token replay / stale token reuse | MongoDB TTL index on `expiresAt` (30 minutes expiry) deletes stale tokens automatically. Tokens marked `usedAt` upon consumption and invalidated. | Verified in `tests/password-lifecycle.test.js` |
| **Single-Use Reset Tokens** | Replay attacks | Token lookup strictly requires `usedAt: null` and marks token upon consumption. | Verified in E2E & Jest tests |
| **Strict Schema Stripping / Rejection** | Parameter tampering / privilege escalation | Strict Zod validation on `/change-password` and `/reset-password` rejects unexpected fields (`userId`, `role`, `email`). | Verified in `tests/password-lifecycle.test.js` |

---

## 2. Network & Transport Security

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **HTTP-Only, SameSite Cookies** | Cross-Site Scripting (XSS) token theft | Cookies set with `httpOnly: true`, `SameSite: "Lax"`, `path: "/"`, `secure: COOKIE_SECURE === "true"`. | Verified in HTTP headers audit |
| **Strict Content-Security-Policy** | Cross-Site Scripting & data exfiltration | `default-src 'self'`, `img-src 'self' data:`, `media-src 'self' blob:`, `connect-src 'self' ws: wss:`, `object-src 'none'`. Loosened strictly to enable WebRTC video blob rendering and WebSocket signaling to self without opening third-party sources. | Verified in HTTP headers audit & browser audits |
| **Permissions-Policy** | Unauthorized camera/mic usage / device blocking | Explicitly configured `camera=(self), microphone=(self)` across backend Helmet, Express middleware, frontend Nginx, and Caddy reverse proxy. Blocks third-party iframes/origins while enabling local user media. | Verified in `tests/headers.test.js` |
| **Rate Limiting** | Brute force / credential stuffing / mail bombing | Redis/Memory rate limiting: `authLimiter` (10/15m IP), `changePasswordLimiter` (5/15m user), `forgotPasswordLimiter` (5/15m IP & 3/hr email), `resetPasswordLimiter` (10/15m IP). | Verified in `tests/password-lifecycle.test.js` |
| **Safe Email Notification Service** | Email injection / SMTP failure cascading | Outgoing emails sanitize user inputs, rely strictly on configured `PUBLIC_APP_URL`, and SMTP errors are caught without failing client requests. | Verified via Mailpit integration tests |

---

## 3. Data Isolation & RBAC Controls

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Mentor Approval Status Isolation** | Unapproved mentor discovery & sensitive data leakage | Only approved mentors (`approvalStatus === 'approved'`) appear in discovery/search and can accept bookings. Approval status and admin rejection notes are accessible only to the mentor themself and admins. | Verified in `tests/admin-flow.test.js` and E2E runs |
| **Learner Payment Isolation** | Financial metadata exposure across accounts | `GET /api/bookings` restricts learner payment status and refund references strictly to the booking's owning learner or platform admins. | Verified in backend booking controller |
| **Role-Based Route Guards** | Unauthorized endpoint access | Direct database verification for admin routes; route-level middleware for learner/mentor isolation. | Verified in `tests/auth-profile.test.js` |

---

## 4. Production Startup Guardrails

- `NODE_ENV=production` rejects default secrets (`JWT_SECRET` containing `dev_only` or length < 32).
- Rejects default `ADMIN_PASSWORD`.
- Rejects `PAYMENT_MODE=mock`.
- Enforces `COOKIE_SECURE=true`.
- Enforces `PUBLIC_APP_URL` matching a valid HTTPS domain (rejects localhost in production).

---

## 5. WebRTC Video Session & Learner-Mentor Chat Security

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Permissions-Policy (`camera=(self), microphone=(self)`)** | Camera/mic blocking by default browser policy or cross-origin hijacking | Configured across backend Helmet, Express app, frontend Nginx, and Vite. Grants device access strictly to first-party origin while barring embedded iframes. | Verified in `tests/headers.test.js` & E2E Chromium tests |
| **Strict CSP for WebRTC & WebSocket** | XSS and malicious media streaming | CSP allows `media-src 'self' blob:` and `connect-src 'self' ws: wss:`. No third-party domains permitted. Blob URLs strictly limited to local camera/microphone media streams. | Verified in `tests/headers.test.js` & browser security audit |
| **Booking Participant Authorization** | Unauthorized video eavesdropping & TURN credential theft | `GET /api/bookings/:id/room` returns TURN credentials only to the booking's learner or mentor inside the join window (`startTime - 10m` to `endTime + 15m`). Strangers receive 403. | Verified in `tests/video-room.test.js` |
| **Grace Period State Acceptance** | Session lock-out during 15-minute grace window | Room API and Socket.IO accept bookings in both `confirmed` and `completed` status to prevent auto-completion background jobs from locking active calls. | Verified in `tests/video-room.test.js` |
| **Single-Seat Per User (Session Replacement)** | Seat exhaustion via multiple browser tabs | Socket.IO server tracks participants by authenticated `userId` (not socket ID). When the same user connects in a second tab or reloads, the previous socket receives `SESSION_REPLACED` and the seat is transferred. | Verified in `tests/video-room.test.js` & Playwright E2E |
| **Room Boundary Isolation** | Cross-room WebRTC signal leakage | WebRTC signals (`offer`, `answer`, `candidate`, `media-state`) are relayed strictly inside `room:<bookingId>`. Max 2 participants strictly enforced. | Verified in `tests/video-room.test.js` |
| **External Meeting Link Validation** | SSRF, Open Redirect, and XSS via meeting URLs | `PATCH /api/bookings/:id/meeting-link` allows only the assigned mentor to set a link. Strict Zod regex restricts host to `meet.google.com`, `zoom.us`, or `*.zoom.us` over `https:`. Max 300 characters. `javascript:` and `http:` URLs rejected. | Verified in `tests/video-room.test.js` |
| **Dynamic Chat Access Verification (`getChatAccess`)** | Unpaid or illegitimate learner-mentor communication | Shared service verifies at least one `confirmed` or `completed` booking exists between learner and mentor. Valid until latest `endTime + CHAT_VALIDITY_DAYS`. Cancellation/refund instantly revokes send access. | Verified in `tests/chat-service.test.js` & `tests/chat-api.test.js` |
| **Learner-Initiated Conversations** | Mentor spamming or unprompted contact | Only learners can initiate new conversation threads (`POST /api/chats`). Mentors can only reply in established threads. | Verified in `tests/chat-api.test.js` |
| **IDOR Enumeration Prevention** | Guessing conversation IDs / thread metadata | Accessing a conversation not belonging to the authenticated user returns status 404 (`NOT_FOUND`), never 403, preventing valid ID enumeration. | Verified in `tests/chat-api.test.js` |
| **Strict Message Sanitization & Plain Text Only** | Stored XSS & HTML injection | Message bodies trimmed, control characters removed (preserving newlines), limited to 1-2000 characters. Rendered in React as pure text with `white-space: pre-wrap`. No HTML parsing, no markdown links, no `dangerouslySetInnerHTML`. | Verified in `tests/chat-api.test.js` & `src/pages/MessagesPage.test.jsx` |
| **Chat Rate Limiting** | Spamming & messaging DoS | Rate-limited to 20 messages/minute per user and 200 messages/day per conversation via Redis/Memory store. Returns HTTP 429 upon threshold breach. | Verified in `tests/chat-api.test.js` |
| **Isolated Socket Rooms (`user:<userId>`)** | WebSocket message interception | Chat sockets automatically join only `user:<ownUserId>`. Clients cannot select or request arbitrary room names. Events carry only data the recipient is authorized to read. | Verified in `tests/chat-api.test.js` |
| **Zero-Content Notification Emails** | Message leakage via email delivery / inbox snooping | New message emails notify the recipient with "You have a new message from <sender>" and link to `PUBLIC_APP_URL + "/messages/<conversationId>"`. Message text is never included. Throttled atomically to at most 1 email per 30 minutes. | Verified in `tests/chat-api.test.js` |
| **Ephemeral Video/Audio Calls** | Privacy violation / unauthorized recording | No audio or video streams are recorded, buffered, or stored on any server. Direct browser-to-browser WebRTC peer connection. UI clearly declares: "This call is not recorded." | Verified across frontend and backend codebases |

---

## 6. Email Verification, Notifications, Reminders & Calendar Security

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Hashed Verification Tokens** | Token database leakage & replay attacks | Tokens generated via `crypto.randomBytes(32)` as hex. Only SHA-256 hash stored in `emailVerifications` collection with 24-hour TTL index. Token exists solely in email URL; never appears in logs. Issuing a new token invalidates prior unused tokens. | Verified in `tests/email-verification.test.js` |
| **POST-Only Verification Endpoint** | Link prefetching & email security scanner consumption | `POST /api/auth/verify-email` prevents GET scanners from invalidating single-use tokens. Frontend scrubs token from URL bar via `history.replaceState` immediately upon receipt. Rate-limited to 10/15m per IP. | Verified in `tests/email-verification.test.js` & `src/pages/VerifyEmailPage.test.jsx` |
| **Production MX & Disposable Domain Validation** | Fake / throwaway email account creation & deliverability degradation | Production rejects domains without MX servers (`dns.promises.resolveMx` with 3s timeout) and blocklisted throwaway domains (>20 domains like mailinator, guerrillamail). Timeouts and transient DNS errors fail open to prevent blocking legitimate users. Skipped in tests and non-production. | Verified in `tests/email-verification.test.js` |
| **Unverified Action Guardrails** | Sybil accounts & spamming | When `EMAIL_VERIFICATION_REQUIRED=true`, unverified users get 403 `EMAIL_NOT_VERIFIED` on booking, payments, conversations, chat messages, and mentor review requests. Unverified users can still browse and edit profiles. Admins are exempt. | Verified in `tests/email-verification.test.js` & E2E flows |
| **Resend Verification Rate Limiting** | Email inbox bombing / SMTP abuse | Authenticated endpoint `POST /api/auth/resend-verification` capped at 3 requests per hour per user with 60-second cooldown between sends. Responds identically whether user exists or not. | Verified in `tests/email-verification.test.js` |
| **Atomic Chat Email Throttling** | Email flooding on rapid chat messages | Chat emails dispatched only when recipient has zero active WebSockets. Throttled atomically via `Conversation.findOneAndUpdate` with `CHAT_EMAIL_THROTTLE_MINUTES` (default 10). HTML is strictly escaped. | Verified in `tests/reminder-refund-emails.test.js` & `tests/chat-api.test.js` |
| **Atomic Refund & Reminder Email Deduplication** | Duplicate email spam & race conditions | `refundDueEmailSentAt` and `refundedEmailSentAt` on `Payment` and `reminder24hSent` on `Booking` updated via atomic `findOneAndUpdate` queries `{ $set: ..., $exists: false }`. Parallel job runs send exactly one email. | Verified in `tests/reminder-refund-emails.test.js` |
| **Calendar ICS IDOR & Information Leakage** | Unauthorized booking snooping & email disclosure | `GET /api/bookings/:id/calendar.ics` enforces strict participant authorization, returning 404 for unauthorized users or unconfirmed bookings. `.ics` generation omits user email addresses, encodes dates in UTC, and folds lines <= 75 bytes. | Verified in `tests/calendar.test.js` |
| **Camera & Microphone Hardware Shutdown** | Eavesdropping & persistent media capture | Settings test card invokes `getUserMedia` strictly after user button click. All audio and video tracks explicitly stopped (`track.stop()`) on Stop button click, page navigation, and component unmount. | Verified in `src/pages/CalendarAndCamera.test.jsx` & browser verification |

---

## 7. Administrator Bootstrap & Health Check Hardening

| Security Control | Threat Mitigated | Implementation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Hidden Character Rejection on Startup** | Malformed / corrupted credentials from Windows CRLF or surrounding quotes | Environment validation strictly rejects `ADMIN_EMAIL` and `ADMIN_PASSWORD` containing carriage returns (`\r`), newlines (`\n`), trailing/leading whitespace, or quotes. | Verified in `tests/env.test.js` & Docker startup tests |
| **Password Rule Enforcement on Admin** | Weak administrator credentials / DoS | Admin credentials validated against 8-char minimum, 72-byte maximum, and common passwords blacklist. | Verified in `tests/env.test.js` & `tests/admin-bootstrap-tools.test.js` |
| **Zero-Secret Diagnostic CLI (`admin:check`)** | Credential leakage in terminal logs / history | CLI prints strictly OK/PROBLEM status, hidden characters (yes/no), URL-breaking characters (yes/no), and bcrypt match (`MATCH`/`NO MATCH`). Zero passwords, hashes, tokens, or connection strings are printed. | Verified in `tests/admin-bootstrap-tools.test.js` |
| **Secure Admin Password Reset (`admin:reset`)** | Unsafe password resets & zombie admin sessions | CLI accepts password via interactive hidden prompt or `--from-env` (rejects command line arguments). Increments `tokenVersion` (invalidates active admin tokens), updates `passwordChangedAt`, and removes pending reset tokens. | Verified in `tests/admin-bootstrap-tools.test.js` |
| **Safe Admin Role Non-Escalation** | Privilege escalation via environment configuration | Admin bootstrap checks if an account exists with `ADMIN_EMAIL`; if it is a non-admin role (e.g. learner/mentor), bootstrap refuses to elevate its role and logs an error. | Verified in `tests/admin-bootstrap-tools.test.js` |
| **Strict Minimal Health Check Surface** | Hostname/version reconnaissance & information disclosure | `/api/health` returns only `{ status, mongo, redis, ml, email }`. All database hostnames, error traces, software versions, and internal topology are completely omitted. | Verified in `tests/health.test.js` |



