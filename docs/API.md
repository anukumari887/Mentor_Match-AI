# Mentor-Match AI — API Documentation

All API endpoints are served under `/api` unless otherwise noted.
Authentication uses HTTP-only JWT cookies (`auth_token`) or Bearer tokens in the `Authorization: Bearer <token>` header.

---

## 1. System & Monitoring

### `GET /api/health`
Health check endpoint reporting status of the database and cache.
- **Auth:** None
- **Response `200 OK`**:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-06T07:15:00.000Z",
    "services": {
      "mongodb": "connected",
      "redis": "connected",
      "mlService": "connected"
    }
  }
  ```

### `GET /metrics`
Prometheus metrics scrape target (served on root port 5000).
- **Auth:** None / Internal network
- **Format:** Plain text Prometheus exposition format.

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
Register a new account as either a `learner` or `mentor`.
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "name": "Jane Doe",
    "role": "learner"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "user": {
      "id": "67a...",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "learner"
    }
  }
  ```
  *(Sets `auth_token` HTTP-only cookie)*

### `POST /api/auth/login`
Authenticate existing user.
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response `200 OK`**: User profile object and set-cookie header. Generic error on failure to prevent user enumeration.

### `POST /api/auth/logout`
Clears session cookie.
- **Auth:** Optional
- **Response `200 OK`**: `{ "message": "Logged out successfully" }`

### `GET /api/auth/me`
Retrieve currently logged-in user and profile metadata.
- **Auth:** Required
- **Response `200 OK`**: Returns user record and associated learner/mentor profile.

---

## 3. Profiles (`/api`)

### `GET /api/learners/profile`
Retrieve authenticated learner's learning goals, budget, and skills.
- **Auth:** Learner only

### `PUT /api/learners/profile`
Update learning goals, desired skills, current skill level, and hourly budget.
- **Auth:** Learner only
- **Body:**
  ```json
  {
    "targetSkills": ["React", "TypeScript"],
    "level": "intermediate",
    "budgetPerHour": 4000,
    "goals": "Prepare for senior fullstack interviews"
  }
  ```

### `GET /api/mentors/profile`
Retrieve authenticated mentor's public profile, pricing, and bio.
- **Auth:** Mentor only

### `PUT /api/mentors/profile`
Update mentor bio, skills with years of experience, and hourly rate.
- **Auth:** Mentor only
- **Body:**
  ```json
  {
    "title": "Staff Software Engineer",
    "bio": "10+ years building distributed cloud platforms.",
    "skills": ["Distributed Systems", "Go", "Kubernetes"],
    "hourlyRate": 4500,
    "experienceYears": 10,
    "timezone": "Asia/Kolkata"
  }
  ```

### `PUT /api/mentors/availability`
Save weekly recurring available time slots. Rejects overlapping windows.
- **Auth:** Mentor only
- **Body:**
  ```json
  {
    "availability": [
      { "dayOfWeek": 1, "startTime": "09:00", "endTime": "13:00" },
      { "dayOfWeek": 3, "startTime": "14:00", "endTime": "18:00" }
    ]
  }
  ```

---

## 4. Mentors & Discovery (`/api/mentors`)

### `GET /api/mentors`
Browse approved mentors with filtering, sorting, and pagination. Unapproved mentors are strictly excluded.
- **Auth:** None
- **Query Params:**
  - `skills`: Comma-separated list (e.g. `React,Node.js`)
  - `maxPrice`: Maximum hourly rate in INR
  - `minRating`: Minimum average rating (e.g. `4.5`)
  - `sort`: `rating` | `price_asc` | `price_desc` | `experience`
  - `page`: Page number (default `1`)
  - `limit`: Items per page (default `12`)
- **Response `200 OK`**:
  ```json
  {
    "mentors": [...],
    "pagination": { "total": 12, "page": 1, "pages": 1, "limit": 12 }
  }
  ```

### `GET /api/mentors/:id`
Get public profile of a single approved mentor.

### `GET /api/mentors/:id/slots`
Generate available booking slots for the next 14 days, filtering out existing bookings, past times, and minimum lead time.
- **Auth:** None
- **Response `200 OK`**: Array of slot objects `{ startTime, endTime, available }`.

### `GET /api/mentors/:id/reviews`
List public reviews submitted for the mentor.

---

## 5. AI Recommendations (`/api/recommendations`)

### `GET /api/recommendations`
Get AI-ranked mentor recommendations customized to the logged-in learner's skills, goals, budget, and schedule.
- **Auth:** Learner only
- **Response `200 OK`**:
  ```json
  {
    "source": "ml",
    "items": [
      {
        "mentor": { ... },
        "score": 0.885,
        "breakdown": { "skill": 0.9, "rating": 0.85, "experience": 0.8 },
        "reasons": ["Teaches React, Node.js", "Within your budget", "Matches availability"],
        "overBudget": false
      }
    ]
  }
  ```

---

## 6. Bookings (`/api/bookings`)

### `POST /api/bookings`
Reserve a slot and initiate a 10-minute hold with a distributed Redis lock.
- **Auth:** Learner only
- **Body:**
  ```json
  {
    "mentorId": "67a...",
    "startTime": "2026-10-10T10:00:00.000Z",
    "notes": "Discuss system architecture"
  }
  ```
- **Response `201 Created`**: Returns booking with status `pending` and hold expires timestamp. Rejects concurrent bookings with `409 Conflict`.

### `GET /api/bookings`
List current user's bookings (upcoming and past).

### `GET /api/bookings/:id`
Retrieve details of a single booking.

### `POST /api/bookings/:id/cancel`
Cancel an upcoming session. Evaluates free cancellation cutoff (24 hours prior) for refund eligibility.
- **Auth:** Participant (Learner or Mentor)

### `GET /api/bookings/:id/room`
Get WebRTC video session credentials and ICE servers (STUN/TURN). Enforces early-join window (max 10 minutes before start).

---

## 7. Payments (`/api/payments`)

### `POST /api/payments/order`
Create a payment order for a pending booking.
- **Auth:** Learner only
- **Body:** `{ "bookingId": "67a..." }`

### `POST /api/payments/verify`
Verify Razorpay signature for captured payment.
- **Auth:** Learner only
- **Body:**
  ```json
  {
    "bookingId": "67a...",
    "razorpay_order_id": "order_...",
    "razorpay_payment_id": "pay_...",
    "razorpay_signature": "hex_sig..."
  }
  ```

### `POST /api/payments/mock-confirm`
Instantly confirm mock payment in development mode.
- **Auth:** Learner only
- **Body:** `{ "bookingId": "67a..." }`

### `POST /api/payments/webhook`
Razorpay webhook receiver with raw HMAC-SHA256 signature verification and event de-duplication.
- **Auth:** Razorpay webhook signature header (`x-razorpay-signature`)

---

## 8. Reviews (`/api/reviews`)

### `POST /api/reviews`
Submit a review for a completed session. Automatically recalculates the mentor's average rating and count.
- **Auth:** Learner only
- **Body:**
  ```json
  {
    "bookingId": "67a...",
    "rating": 5,
    "comment": "Incredible insights and very encouraging!"
  }
  ```
- **Response `201 Created`**: Rejects duplicate reviews on the same booking with `400 Bad Request`.

---

## 9. Complaints (`/api/complaints`)

### `POST /api/complaints`
Report an issue with a session or mentor.
- **Auth:** Learner or Mentor
- **Body:**
  ```json
  {
    "bookingId": "67a...",
    "reason": "Mentor did not attend the scheduled video session.",
    "desiredOutcome": "refund"
  }
  ```

---

## 10. Admin (`/api/admin`)

*All admin endpoints require an active user session with `role === "admin"` verified directly against the database.*

### `GET /api/admin/stats`
Platform metrics: total learners, approved mentors, pending mentors, bookings, gross volume, net platform revenue.

### `GET /api/admin/users`
Paginated user list with role filters and suspension toggles.

### `GET /api/admin/bookings`
All bookings across the platform with status filters.

### `GET /api/admin/payments`
Payment transactions with filter for `refund_due`.

### `POST /api/admin/payments/:id/refund`
Mark a refund as processed.

### `GET /api/admin/payouts/summary`
Aggregated mentor earnings, unpaid balances, and completed payouts.

### `GET /api/admin/payouts`
History of recorded mentor payouts.

### `POST /api/admin/payouts`
Record manual payout sent to a mentor.
- **Body:**
  ```json
  {
    "mentorId": "67a...",
    "amount": 255000,
    "reference": "UPI_REF_123456"
  }
  ```

### `GET /api/admin/complaints`
List submitted user complaints with status filter.

### `PATCH /api/admin/complaints/:id/resolve`
Resolve a complaint with notes.

### `GET /api/admin/mentors/pending`
Queue of mentors awaiting approval.

### `PATCH /api/admin/mentors/:id/approve`
Approve or reject a mentor profile.
