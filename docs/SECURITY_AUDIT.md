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

