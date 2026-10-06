# Mentor-Match AI: Production Launch Checklist

This document details all pre-launch operational, regulatory, infrastructure, and payment gateway requirements for transitioning **Mentor-Match AI** from local development into production.

The application functions fully in development using local containers, mock payments, and Mailpit email capture. The gates below represent the **Human Gates (BUILD_PLAN.md Section 18)** required for real-world launch.

---

## 1. Razorpay Account Setup & Test Gateway Verification
- [ ] **Create Razorpay Account:** Register at [razorpay.com](https://razorpay.com) and access the Dashboard.
- [ ] **Generate Test API Keys:**
  - Navigate to **Settings > API Keys > Generate Key**.
  - Obtain `RAZORPAY_KEY_ID` (starts with `rzp_test_...`) and `RAZORPAY_KEY_SECRET`.
  - Update `backend/.env`:
    ```ini
    PAYMENT_MODE=razorpay
    RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
    RAZORPAY_KEY_SECRET=your_test_secret_here
    ```
- [ ] **Configure Local Webhook Tunnel (for testing real webhooks):**
  - Run ngrok or Cloudflare Tunnel:
    ```bash
    ngrok http 5000
    ```
  - In Razorpay Dashboard > Settings > Webhooks > Add New Webhook:
    - **URL:** `https://<your-tunnel-subdomain>.ngrok-free.app/api/payments/webhook`
    - **Secret:** Generate a secret string and set as `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.
    - **Active Events:**
      - `payment.captured`
      - `payment.failed`
      - `order.paid`
- [ ] **Perform End-to-End Test Checkout:**
  - Complete a test booking in the browser with Razorpay Test Card credentials (OTP: `123456`).
  - Verify that payment verification confirms the booking and triggers emails.

---

## 2. Production Transactional Email Service
- [ ] **Select Production SMTP Provider:** (e.g., AWS SES, Resend, SendGrid, Postmark).
- [ ] **Domain Verification & SPF / DKIM Records:**
  - Add DNS TXT and CNAME records to verify domain ownership.
  - Set up DMARC policy (`p=none` or `p=quarantine`) to prevent emails landing in spam.
- [ ] **Configure Production Environment Variables:**
  ```ini
  SMTP_HOST=email-smtp.us-east-1.amazonaws.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=AKIAxxxxxxxxxxxx
  SMTP_PASS=your_smtp_password
  EMAIL_FROM="Mentor-Match AI <notifications@yourdomain.com>"
  ```
- [ ] **Send Verification Email:** Trigger a test registration or booking and verify recipient inbox delivery.

---

## 3. Cloud Infrastructure & Database Provisioning
- [ ] **Domain Name & DNS:**
  - Register domain (e.g., `mentormatch.ai`).
  - Configure A/CNAME records pointing to your cloud server or load balancer.
- [ ] **Production MongoDB (MongoDB Atlas):**
  - Provision an M10+ replica set cluster on MongoDB Atlas.
  - Whitelist cloud server IPs or configure VPC Peering.
  - Create database user and set connection string:
    ```ini
    MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/mentormatch?retryWrites=true&w=majority
    ```
- [ ] **Production Redis (Managed Redis):**
  - Provision AWS ElastiCache for Redis or Upstash Redis.
  - Set `REDIS_URL=rediss://default:token@cluster.upstash.io:6379`.
- [ ] **HTTPS / TLS Certificate:**
  - Automatic Let's Encrypt certificates managed via Caddy or AWS Certificate Manager (ACM).

---

## 4. Legal Compliance & Financial Governance
- [ ] **Legal Review of Public Policies:**
  - Review draft documents with legal counsel:
    - `frontend/src/pages/LegalPage.jsx` (`/terms`)
    - `frontend/src/pages/LegalPage.jsx` (`/privacy`)
    - `frontend/src/pages/LegalPage.jsx` (`/refund-policy`)
  - Ensure terms reflect Indian Contract Act, Information Technology Act (IT Act 2000), and Digital Personal Data Protection Act (DPDPA 2023).
- [ ] **Business Entity & Tax (GST) Registration:**
  - Obtain corporate entity registration (Private Limited, LLP, or Sole Proprietorship).
  - Consult Chartered Accountant regarding GST registration (tax invoice generation on platform commissions).
  - Verify compliance with Tax Collected at Source (TCS) rules under Section 52 of the CGST Act for e-commerce operators.
- [ ] **Dispute Resolution Procedures:**
  - Standardize admin timelines for reviewing complaints submitted via `/api/admin/complaints` (default: within 48 hours).

---

## 5. Live Razorpay KYC & Production Activation
- [ ] **Complete Razorpay Business KYC:**
  - Submit Certificate of Incorporation, PAN, GSTIN, and cancelled cheque.
  - Link verified business bank account.
- [ ] **Generate Live API Keys:**
  - Switch to Live Mode in Razorpay Dashboard.
  - Generate `RAZORPAY_KEY_ID` (starts with `rzp_live_...`) and `RAZORPAY_KEY_SECRET`.
- [ ] **Configure Production Webhook:**
  - Set URL to `https://api.yourdomain.com/api/payments/webhook`.
  - Enter live `RAZORPAY_WEBHOOK_SECRET`.
- [ ] **Update Production Secrets:**
  - Deploy secrets to production environment or AWS Secrets Manager.
  - Set `PAYMENT_MODE=razorpay`.

---

## 6. Pre-Launch Security & Hardening Checklist
- [ ] **Environment Verification:**
  - `NODE_ENV=production`
  - `JWT_SECRET` generated via `openssl rand -hex 32` (minimum 32 characters, no `dev_only` substring).
  - `ADMIN_PASSWORD` changed from demo default.
  - `COOKIE_SECURE=true`.
  - `CORS_ORIGIN=https://yourdomain.com`.
- [ ] **Rate Limiting:**
  - Confirm Redis-backed rate limiting active for auth (10 req/15m) and payments (30 req/15m).
- [ ] **Monitoring & Alerts:**
  - Prometheus and Grafana dashboards active and scraping `/metrics`.
  - Alert rules configured in `monitoring/alerts.yml`.
