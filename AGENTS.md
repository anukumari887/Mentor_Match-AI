# AGENTS.md: Developer & Agent Operating Manual

This file contains the core operational, architectural, security, and environment rules for building and maintaining **Mentor-Match AI**. All agents and engineers working in this repository must strictly adhere to these instructions.

---

## 1. Operating Rules (Section 0)

### 1.1 Role
You are a senior full-stack engineer at a product company. You build, run, test, and fix the whole project yourself. The owner is a beginner and will not write code.

### 1.2 Working Rules
1. **Phase-by-phase execution:** Follow `BUILD_PLAN.md` Section 16 strictly. Do not start a phase until the previous phase passes all exit checks.
2. **Persistence and logging:**
   - Keep `PROGRESS.md` updated after every phase: log what was built, what was tested (with real commands and outputs), what failed and how it was resolved, and what is next.
   - If context is lost or reset, read `PROGRESS.md` and `BUILD_PLAN.md`, then continue from the first unfinished phase.
3. **Version control:** After each phase passes its exit checks, execute:
   `git add -A && git commit -m "Phase N: <name>"`
4. **Verifiable proof:** Never declare something works without running it and verifying the real output. Log the real command and output in `PROGRESS.md`.
5. **Error-fixing loop:** Run -> Inspect logs/error -> Root cause analysis -> Apply fix -> Retest. Try up to 5 distinct approaches. If blocked, log `BLOCKED: <problem, what you tried>` in `PROGRESS.md` and proceed with independent tasks.
6. **Integrity:** Never make a test pass by deleting it, weakening it, or disabling validation, security, or error handling.
7. **Autonomy:** Do not stop to ask questions except at the designated Human Gates (`BUILD_PLAN.md` Section 18). Choose the simplest safe approach and document the decision in `PROGRESS.md`.
8. **Engineering quality:** Small single-purpose files, clear semantic names, no dead code, no leftover TODOs, no fake data in production code paths (fake data belongs strictly in `seed.js`), no unformatted `console.log` (use Pino logger). Maintain lint/format hygiene.
9. **End-to-end completeness:** Every feature must include database model, API endpoint, request validation, error handling, UI view, loading/empty/error states, and unit/integration tests.
10. **Tooling standards:** Use `docker compose` (with space, Docker Compose v2), not `docker-compose`.
11. **Pinned dependencies:** Use exact stable versions in `package.json` and `requirements.txt`. Verify builds after every installation.

---

## 2. Windows & Docker Notes (Section 14)

1. **Line Endings:** `.gitattributes` enforces `* text=auto eol=lf` so scripts and configuration files maintain LF line endings inside Linux containers.
2. **Scripts:** Do not require bash scripts on the host Windows system. Use `npm` scripts and `docker compose` commands only.
3. **Compose syntax:** Omit obsolete `version:` tags from `docker-compose.yml` and `docker-compose.prod.yml`.
4. **Dev container mounts:** Bind-mount source directories while using named volumes for `node_modules` so host files do not conflict with container binaries.
5. **Vite dev server:** Configure Vite with `server.host = true`, `server.port = 3000`, and `server.watch.usePolling = true`.
6. **Backend watch mode:** Backend runs `nodemon -L` (legacy polling watch) inside containers.
7. **Healthchecks & Dependencies:**
   - MongoDB: `mongosh --quiet --eval "db.adminCommand('ping')"`
   - Redis: `redis-cli ping`
   - Backend: `wget -qO- http://localhost:5000/api/health`
   - ML service: Python one-liner checking `http://localhost:8000/health`
8. **Resilient connections:** Backend startup must retry MongoDB and Redis connections with exponential backoff for up to 60 seconds.
9. **Volume persistence:** Use named volumes `mongo_data` and `redis_data`. Note: `docker compose down` preserves data; `docker compose down -v` wipes volumes.
10. **Production frontend build:** Multi-stage Dockerfile (Node build -> Nginx static serving with fallback to `index.html` for SPA routing).
11. **Port conflicts:** If a port (3000, 5000, 8000, 27017, 6379, 8025, 9090, 3001) is occupied, report clearly which port needs to be freed rather than silently remapping.

---

## 3. Security Rules (Section 13)

1. **Passwords:** Hash with `bcryptjs` cost 12. Minimum length 8 characters. Never log passwords, tokens, cookies, or payment card details.
2. **Authentication Cookies:** Set `httpOnly: true`, `SameSite: "Lax"`, `secure: COOKIE_SECURE === "true"`, `path: "/"`. Max age matches `JWT_EXPIRES_IN`.
3. **HTTP Hardening:** Helmet with strict defaults; CORS limited to `CORS_ORIGIN` with credentials enabled; request JSON body limited to 100kb.
4. **Input Validation:** Strict Zod validation on every request query, param, and body. Strip or reject unknown properties. Whitelist query filters to prevent NoSQL injection.
5. **XSS Protection:** React handles client-side escaping; never use `dangerouslySetInnerHTML`.
6. **Webhooks:** Razorpay webhooks require raw-body HMAC-SHA256 signature verification with `crypto.timingSafeEqual`. De-duplicate with `webhookEvents` collection.
7. **Least Privilege:** Docker containers should run as non-root users where practical. Secrets and `.env` files are excluded from image builds via `.dockerignore`.
8. **Startup Guardrails:** Refuse startup in production (`NODE_ENV=production`) if `JWT_SECRET` contains `dev_only` or is < 32 characters, if `ADMIN_PASSWORD` is default, if `PAYMENT_MODE=mock`, or if `COOKIE_SECURE` is false.
9. **Role Enforcement:** All admin routes must verify role directly against the database user record, not rely solely on the token payload.
10. **Enumeration Prevention:** Authentication failure returns generic "Invalid email or password" to prevent user enumeration.
