# Mentor-Match AI — Deployment Guide

This guide describes how to deploy **Mentor-Match AI** to production. It explains two distinct deployment paths in plain terms:
- **Path A (Simple & Cost-Effective):** Single Virtual Machine (VPS/EC2) running Docker Compose with Caddy for automatic SSL/HTTPS.
- **Path B (High-Availability Cloud):** AWS ECS Fargate, AWS ECR, AWS Secrets Manager, MongoDB Atlas, and AWS ElastiCache Redis.

---

## Architecture Overview

In production, Mentor-Match AI consists of three core applications and two data stores:
1. **Frontend:** Nginx serving the compiled React single-page application bundle (port 80 inside container, exposed on port 3000 or behind reverse proxy).
2. **Backend API:** Node.js Express server running with strict production safeguards (port 5000 inside container).
3. **ML Service:** Python FastAPI service serving cosine-similarity matching recommendations (port 8000 inside container).
4. **MongoDB:** Document database storing users, profiles, bookings, payments, reviews, complaints, and payout records.
5. **Redis:** In-memory key-value store for booking concurrency locks, rate limiting, and recommendation caching.

---

## Production Environment Variables

All production secrets should be set in `.env` (Path A) or AWS Secrets Manager (Path B). **Never commit production credentials to Git.**

| Variable | Description | Example / Note |
|---|---|---|
| `NODE_ENV` | Application environment | `production` |
| `PORT` | Backend listening port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://admin:PASS@cluster0.mongodb.net/mentormatch?retryWrites=true&w=majority` |
| `REDIS_URL` | Redis connection URL | `redis://:PASSWORD@redis.production:6379` |
| `JWT_SECRET` | Secret key for signing tokens | High-entropy string (>= 32 chars). Cannot contain `dev_only`. |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `COOKIE_SECURE` | HTTPS cookie flag | `true` (Must be true in production) |
| `CORS_ORIGIN` | Allowed web origin for cookies/CORS | `https://mentormatch.example.com` |
| `ADMIN_EMAIL` | Initial admin account email | `admin@example.com` |
| `ADMIN_PASSWORD` | Initial admin account password | Strong secret (>= 12 chars). Startup rejects default passwords. |
| `PAYMENT_MODE` | Payment processor mode | `razorpay` (Startup rejects `mock` in production) |
| `RAZORPAY_KEY_ID` | Razorpay Live Key ID | `rzp_live_xxxxxxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay Live Key Secret | Live secret from Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET`| Razorpay Live Webhook Secret | Secret string set when registering webhook in Razorpay |
| `PLATFORM_FEE_PERCENT` | Platform commission cut (%) | `15` |
| `SMTP_HOST` | Transactional email SMTP host | `smtp.sendgrid.net` or `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | Provider credentials |
| `SMTP_PASS` | SMTP password / API token | Provider API key |
| `EMAIL_FROM` | Verified sender address | `"Mentor-Match AI" <notifications@mentormatch.example.com>` |
| `ML_SERVICE_URL` | URL to reach ML container | `http://ml-service:8000` (internal network) |
| `ML_TIMEOUT_MS` | Fallback timeout for recommendations | `3000` (milliseconds) |

---

## Path A: Single Server (VPS + Docker + Caddy)

*Best for early traction, low cost ($10-$25/month), and minimal operational overhead.*

### 1. Provision a Server
1. Launch an Ubuntu 24.04 LTS instance (e.g. AWS Lightsail, DigitalOcean Droplet, or Hetzner Cloud) with at least 2 vCPUs and 4GB RAM.
2. Point your DNS domain (e.g. `mentormatch.example.com`) A record to the public IP of the server.

### 2. Install Docker & Docker Compose
```bash
sudo apt update && sudo apt install -y curl git ufw
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

### 3. Clone Repository & Setup Production Configuration
```bash
git clone https://github.com/your-org/mentor-match-ai.git /opt/mentor-match-ai
cd /opt/mentor-match-ai
cp .env.example .env
nano .env   # Fill in production values adhering to the table above
```

### 4. Setup Caddy for Automatic SSL/TLS
Install Caddy on the host or run as a container:
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```caddy
mentormatch.example.com {
    # Route API and WebSocket requests to the backend container
    handle /api/* {
        reverse_proxy 127.0.0.1:5000
    }
    handle /socket.io/* {
        reverse_proxy 127.0.0.1:5000
    }
    handle /metrics {
        # Restrict metrics to internal IP or authorized admin basic auth
        basicauth {
            admin $2a$14$encrypted_hash
        }
        reverse_proxy 127.0.0.1:5000
    }

    # Route all other web traffic to the frontend Nginx container
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```

### 5. Launch the Production Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Check health:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

---

## Path B: AWS Production Architecture (ECS + Managed Services)

*Best for enterprise scalability, compliance, and zero single points of failure.*

### Architecture Components
- **Frontend & Backend & ML Containers:** AWS ECS Fargate tasks running behind an Application Load Balancer (ALB).
- **Container Registry:** AWS Elastic Container Registry (ECR) for hosting immutable versioned images.
- **Database:** MongoDB Atlas M10+ multi-AZ replica set with automated snapshots.
- **Cache:** AWS ElastiCache Redis cluster (multi-AZ with auto-failover).
- **Secrets:** AWS Secrets Manager injects environment variables into ECS task definitions.
- **DNS & SSL:** AWS Route 53 with ACM (AWS Certificate Manager) SSL certificate on ALB.

### Deployment Steps
1. **ECR Setup:** Create 3 private repositories in AWS ECR:
   - `mentor-match-backend`
   - `mentor-match-frontend`
   - `mentor-match-ml-service`
2. **Push Images:**
   Tag and push using the provided GitHub Actions workflow `.github/workflows/deploy.yml` or manual CLI:
   ```bash
   aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account_id>.dkr.ecr.<region>.amazonaws.com
   docker build -t <account_id>.dkr.ecr.<region>.amazonaws.com/mentor-match-backend:latest -f backend/Dockerfile.prod backend
   docker push <account_id>.dkr.ecr.<region>.amazonaws.com/mentor-match-backend:latest
   ```
3. **Configure AWS Secrets Manager:**
   Create secret `mentor-match/production-env` containing `JWT_SECRET`, `MONGO_URI`, `REDIS_URL`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `SMTP_PASS`.
4. **Create ECS Task Definitions:**
   - Define CPU (1024) and Memory (2048).
   - Reference container images from ECR.
   - Reference secrets directly from AWS Secrets Manager using the task execution IAM role.
5. **Setup Application Load Balancer (ALB):**
   - Port 443 listener with ACM certificate.
   - Routing rules:
     - `/api/*` and `/socket.io/*` -> Target Group `mentor-match-backend-tg` (port 5000, health check `/api/health`).
     - Default rule -> Target Group `mentor-match-frontend-tg` (port 80, health check `/health`).
6. **Deploy Services:**
   Create ECS services with desired count >= 2 across multiple availability zones.

---

## Production Go-Live Checklist

Complete all checklist items before opening public registrations:

- [ ] **Domain & SSL:** Domain resolves properly and TLS handshake succeeds with A+ rating on SSL Labs.
- [ ] **Secure Startup Enforced:** Confirm `backend` refuses to start if `JWT_SECRET` is less than 32 characters or default password is used.
- [ ] **Live Razorpay KYC:** Complete business verification on Razorpay Dashboard and generate Live Key ID & Secret.
- [ ] **Payment Mode:** Set `PAYMENT_MODE=razorpay` in the production environment.
- [ ] **Webhook Endpoint:**
  - Register webhook URL: `https://<YOUR_DOMAIN>/api/payments/webhook` in Razorpay Dashboard.
  - Subscribe to `order.paid` and `payment.captured`.
  - Copy Webhook Secret and set `RAZORPAY_WEBHOOK_SECRET` in production `.env` / Secrets Manager.
- [ ] **Transactional Email:** Verify SMTP credentials with AWS SES or SendGrid. Send a test email and verify delivery in inbox (not spam).
- [ ] **Admin Account:** Verify login with production admin email and change password immediately.
- [ ] **Backups:** Ensure automated daily backups are enabled for MongoDB Atlas or standalone MongoDB volume.
- [ ] **Monitoring & Alerts:** Ensure Prometheus and Grafana are operational and alerts notify via email or Slack.
