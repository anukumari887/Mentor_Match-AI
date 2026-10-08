# Admin Account Access & Diagnostic Guide

This guide explains how to check and manage admin access on a live production server for **Mentor-Match AI**.

---

## 1. Quick Troubleshooting Overview

If the admin cannot log in on the live site and sees **"Invalid email or password"**, this usually happens because:
1. **The admin account was created during the first startup** with an older password or email. Changing `ADMIN_PASSWORD` in `.env.production` later does **not** update an existing account in MongoDB (it only seeds the account when none exists).
2. **Hidden characters or formatting issues in `.env.production`**:
   - Windows line endings (CRLF `\r\n`) adding a hidden `\r` to the password or email.
   - Spaces around the `=` sign (e.g. `ADMIN_PASSWORD = secret`).
   - Quotes around values (e.g. `ADMIN_PASSWORD="secret"`).
   - Special characters like `$` (which Docker Compose interprets as variable substitution) or `#` (which `.env` parsers treat as comments).
3. **Database connection failure**: MongoDB or Redis credentials mismatch or unencoded special characters.

---

## 2. Running Diagnostic Tool (`admin:check`)

Run this diagnostic command directly inside the backend container on your server:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run admin:check
```

### How to Read the Output

The tool prints one line per check with **OK** or **PROBLEM**:

1. **Environment flags**: Confirms `NODE_ENV`, `EMAIL_MODE`, and whether `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set.
2. **Hidden characters in ADMIN_EMAIL**: Reports `no (OK)` or `yes (PROBLEM)`. If `yes`, remove trailing spaces, quotes, or Windows line endings.
3. **Hidden characters in ADMIN_PASSWORD**: Reports `no (OK)` or `yes (PROBLEM)`. If `yes`, ensure the password has no quotes, spaces, `$`, or carriage returns.
4. **MongoDB connection and login**: Confirms database connectivity.
5. **Redis connection and login**: Confirms cache and lock connectivity.
6. **URL-breaking characters**: Confirms database passwords do not contain unencoded special characters (`@`, `:`, `/`, `#`, `?`).
7. **Admin accounts in database**: Shows how many admin accounts exist, whether the target account exists, its role, activation status, and email verification status.
8. **ADMIN_PASSWORD matches stored hash**:
   - `MATCH (OK)`: The password currently in your environment matches the database password hash.
   - `NO MATCH (PROBLEM)`: The password in `.env.production` is different from the password currently stored in MongoDB.

*Note: For security, `admin:check` never prints passwords, hashes, tokens, or connection strings.*

---

## 3. Resetting the Admin Password (`admin:reset`)

To update the password for an existing admin account or create it if missing, use `admin:reset`.

### Option A: Interactive Mode (Recommended)

Run:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run admin:reset
```

The script will prompt you to enter the new password twice with hidden input (no characters will appear on screen for security).

### Option B: Using Environment (`--from-env`)

If you updated `ADMIN_PASSWORD` in your `.env.production` file and restarted the container, you can apply it directly to the database:

```bash
docker compose -f docker-compose.prod.yml exec backend npm run admin:reset -- --from-env
```

### What `admin:reset` Does
- Validates the new password against platform security rules (at least 8 characters, maximum 72 bytes, not common).
- Sets `isActive: true` and `emailVerified: true`.
- Increments `tokenVersion` so all older browser sessions are revoked immediately.
- Cleans up any pending password reset tokens.
- Prints confirmation: `Admin password updated for a***@domain`.

*Security Rule: Never pass the password as a command-line argument (it would be stored in your shell history).*

---

## 4. Editing `.env.production` Correctly

When configuring production variables:
1. **One variable per line** with no spaces around `=`:
   ```bash
   # Correct
   ADMIN_EMAIL=admins@matchmentor.ai
   ADMIN_PASSWORD=strongpassword123
   
   # Incorrect
   ADMIN_EMAIL = admins@matchmentor.ai
   ADMIN_PASSWORD="strongpassword123"
   ```
2. **Do not wrap values in quotes** (`"` or `'`).
3. **Avoid `$` and `#` in passwords**:
   - `$` triggers Docker Compose variable interpolation.
   - `#` is parsed as a comment delimiter in `.env` files.
4. **Generate safe database passwords (letters and digits only)**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
   ```
5. **Ensure Unix line endings (LF)**: If editing files from Windows, convert CRLF to LF or edit using `nano` directly on the Linux server.

---

## 5. Applying Changes to Containers

Docker containers do **not** automatically detect changes to `.env.production` while running.

After modifying `.env.production`, you must recreate the container:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Then run `admin:check` to verify your configuration.
