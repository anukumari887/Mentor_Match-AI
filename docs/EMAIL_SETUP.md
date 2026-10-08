# Email Setup & Modes (Demo vs Live)

This document explains the two email operational modes for **Mentor-Match AI**: `demo` mode and `live` mode.

---

## 1. Overview of Modes

| Feature / Behavior | Demo Mode (`EMAIL_MODE=demo`) | Live Mode (`EMAIL_MODE=live`) |
|---|---|---|
| **Real Inbox Delivery** | **Disabled** (no-op jsonTransport) | **Enabled** (sent via real SMTP) |
| **New User Registration** | Auto-verified (`emailVerified: true`, `emailVerifiedVia: "demo"`) | Unverified until link clicked in real email |
| **Verification Tokens** | None generated or sent | 32-byte cryptographically hashed single-use tokens |
| **Site Access (Book, Pay, Chat)** | Immediate access upon sign up | Blocked (`403 EMAIL_NOT_VERIFIED`) until email is verified |
| **Verification Endpoints** | Return 200 "Email verification is turned off in demo mode." | Verify token or resend token to inbox |
| **Domain & MX Record Checks** | Bypassed (any well-formed email is accepted) | Strict DNS MX check and disposable domain blocklist in production |
| **Production Startup Guard** | Allows `SMTP_HOST=mailpit` or `localhost` (warning logged) | Refuses `mailpit` or `localhost` with hard failure |

---

## 2. What Does Not Work in Demo Mode
While Demo Mode allows users to explore and test the entire platform without email friction:
- **Real Inbox Delivery:** Transactional emails will never arrive in a real user's inbox.
- **Session Reminders:** 24-hour and 1-hour automated session reminders are not delivered to participants.
- **Password Reset for Real Users:** Password reset emails are not sent. If a user forgets their password in demo mode, contact the site owner/admin.
- **Offline Chat Alerts:** Email notifications for unread messages when offline are not delivered.

---

## 3. Configuration Settings

### Demo Mode Configuration
In `.env` or `.env.production`:
```env
EMAIL_MODE=demo
EMAIL_VERIFICATION_REQUIRED=true
```
No SMTP credentials are required. If `EMAIL_MODE` is omitted, the platform defaults to `demo` and logs a single warning.

### Live Mode Configuration
In `.env.production`:
```env
EMAIL_MODE=live
EMAIL_VERIFICATION_REQUIRED=true
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_actual_smtp_api_key_or_password
EMAIL_FROM=Mentor-Match <support@yourdomain.com>
PUBLIC_APP_URL=https://yourdomain.com
```

---

## 4. Steps to Switch to Live Mode Later

When you are ready to launch with real transactional emails:
1. **Choose an email provider:** Select an SMTP transactional email provider (SendGrid, AWS SES, Resend, Mailgun, Postmark).
2. **Update `.env.production` on the server:**
   - Set `EMAIL_MODE=live`
   - Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM`.
   - Ensure `PUBLIC_APP_URL` points to your production `https://` domain.
3. **Pull and restart containers:**
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up --build -d
   ```
4. **Test with one email:**
   - Register a real test account with your email address.
   - Confirm the verification email arrives in your inbox.
   - Click the link to verify your email and confirm your account becomes verified.
