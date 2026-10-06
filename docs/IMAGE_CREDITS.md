# Mentor-Match AI: Image & Illustration Credits

This document lists all self-hosted visual assets, original illustrations, brand graphics, and photos included in the frontend build, along with their creation source, licenses, and dimensions.

---

## 1. Editorial Photographs

All photographs are self-hosted in `frontend/public/images/` and pre-processed into optimized multi-resolution WebP formats (1200w, 800w, 400w) with explicit width and height attributes to prevent layout shift. In accordance with platform honesty rules, no photographs pretend to be real users, mentors, or review authors.

### A. Hero Learning Session
- **Files:** `hero-learner-1200.webp` (78.5 KB), `hero-learner-800.webp` (46.7 KB), `hero-learner-400.webp` (16.7 KB), `hero-learner.webp` (46.7 KB)
- **Source:** Generated via native AI Image Generation tool (`generate_image`)
- **Subject:** Candid, warm natural-light scene of an engineer studying and taking notes in front of a laptop during a one-on-one video session.
- **Licence:** Commercial use permitted, royalty-free, perpetual.
- **Placement:** Hero section on Landing Page (`LandingPage.jsx`).
- **Alt Text:** "Practicing engineer in a focused one-on-one technical video mentoring session"

### B. Engineering Workspace / Practice Desk
- **Files:** `mentor-practice-1200.webp` (99.3 KB), `mentor-practice-800.webp` (60.5 KB), `mentor-practice-400.webp` (21.5 KB), `mentor-practice.webp` (60.5 KB)
- **Source:** Generated via native AI Image Generation tool (`generate_image`)
- **Subject:** Warm, candid desk scene with an engineering notebook, fountain pen, coffee cup, and code editor on screen.
- **Licence:** Commercial use permitted, royalty-free, perpetual.
- **Placement:** "For Mentors" section on Landing Page (`LandingPage.jsx`).
- **Alt Text:** "Engineering workspace with notebook, pen, coffee, and code editor on screen"

### C. Study & Preparation Workspace
- **Files:** `auth-workspace-1200.webp` (117.7 KB), `auth-workspace-800.webp` (73.7 KB), `auth-workspace-400.webp` (25.0 KB), `auth-workspace.webp` (73.7 KB)
- **Source:** Generated via native AI Image Generation tool (`generate_image`)
- **Subject:** Thoughtful minimalist study desk with notebook and stationery in soft daylight.
- **Licence:** Commercial use permitted, royalty-free, perpetual.
- **Placement:** Desktop split panel on Login and Registration pages (`AuthPage.jsx`, hidden on mobile viewports).
- **Alt Text:** "Editorial study workspace with open notebook, fountain pen, and coffee"

### D. Learner Technical Study & Mentoring Call
- **Files:** `learner-study-1200.webp` (49.8 KB), `learner-study-800.webp` (30.7 KB), `learner-study-400.webp` (10.7 KB), `learner-study.webp` (30.7 KB)
- **Source:** Generated via native asset pipeline (`frontend/scripts/generateBrandAndLearnerAssets.js`)
- **Subject:** Focused learner taking notes while participating in a technical video mentorship session.
- **Licence:** Commercial use permitted, royalty-free, perpetual.
- **Placement:** "For Learners" section on Landing Page (`LandingPage.jsx`, placed above label to align symmetrically with mentor photo).
- **Alt Text:** "Focused learner taking notes while participating in a technical video mentorship session"

---

## 2. Original Theme-Adaptive Vector Illustrations

All vector illustrations are original SVG designs crafted specifically for Mentor-Match AI. They are self-hosted inline components in `frontend/src/components/Illustrations.jsx`, using CSS theme custom properties (`currentColor`, `var(--accent)`, `var(--border)`, `var(--surface-raised)`) so they automatically adapt to all 6 themes without extra network requests or raster artifacts.

- **Author:** Original project illustrations
- **Licence:** MIT (Repository owner / Mentor-Match AI)
- **Included Illustrations & Icons:**
  1. `IllustrationSearchMatch`: How It Works Step 1 (Search and filter practitioner cards)
  2. `IllustrationCalendarSlots`: How It Works Step 2 (Calendar schedule and 10-minute hold reservation)
  3. `IllustrationVideoConnect`: How It Works Step 3 (In-browser 1-on-1 video call and audio waveforms)
  4. `EmptyStateMentorSearch`: Empty state when no mentors match search filters
  5. `EmptyStateSessions`: General sessions empty state
  6. `EmptyStateSessionsUpcoming`: My sessions tab empty state for Upcoming bookings
  7. `EmptyStateSessionsPast`: My sessions tab empty state for Past session ledger
  8. `EmptyStateSessionsCancelled`: My sessions tab empty state for Cancelled sessions
  9. `EmptyStateProfileIncomplete`: Empty state when profile needs career goals and skills
  10. `EmptyStateRecommendations`: Empty state when no personalized recommendations are found
  11. `EmptyStateReviews`: Empty state when a mentor has zero reviews
  12. `EmptyStateEarnings`: Empty state when a mentor has zero completed payouts/earnings
  13. `EmptyStateComplaints`: Empty state when zero complaints exist in the admin queue
  14. `EmptyState404`: 404 page compass illustration
  15. `EmptyStateNetworkError`: System status page error illustration for unreachable backend
  16. `IconChoiceLearner` & `IconChoiceMentor`: Small SVG role selector icons on registration
  17. `IconHeaderBrowse`, `IconHeaderGuide`, `IconHeaderRecommendations`, `IconHeaderProfile`, `IconHeaderAvailability`, `IconHeaderEarnings`, `IconHeaderMentorDashboard`: Subtle page header SVGs beside section titles

---

## 3. Brand Assets & Social Share Media

All brand assets are generated offline by `frontend/scripts/generateBrandAndLearnerAssets.js` using `sharp` and saved in `frontend/public/`:

- **Brand Mark:** Original two connecting solid geometric shapes suggesting a mentor and learner matching, readable as an abstract "M". Contrast >= 3:1 against `--surface` in all 6 themes.
- **Favicons:**
  - `favicon.svg` (adaptive light/dark scheme)
  - `favicon.ico` (multi-resolution container: 16, 32, 48)
  - `apple-touch-icon.png` (180x180 PNG for iOS home screen bookmarks)
  - `icons/icon-192.png`, `icons/icon-512.png`, and `icons/icon-512-maskable.png`: PWA manifest icons
- **Web App Manifest:** `site.webmanifest`
- **Social Share Card:**
  - `og-image.png` (1200x630, 71.8 KB): Editorial card with connecting geometric brand mark, wordmark, tagline, and platform guarantees.
  - *Note:* Configured as relative `/og-image.png` in `index.html`. Replace with fully qualified production HTTPS URL (e.g. `https://yourdomain.com/og-image.png`) once custom domain is provisioned.
