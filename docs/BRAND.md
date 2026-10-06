# Brand & Identity Guidelines: Mentor-Match

## 1. Brand Concept & Mark
Mentor-Match connects dedicated learners with experienced mentors for focused, 1-on-1 technical and career mentorship.

The brand mark consists of **two solid connecting geometric shapes** on a 32×32 grid:
- **Left Shape (Learner):** An ascending solid pillar (`M4 27V5H13L16 17L11 27H4Z`) representing aspiration and growth.
- **Right Shape (Mentor):** A descending solid pillar (`M28 27V5H19L16 17L21 27H28Z`) meeting at the apex `(16, 17)`.
- Together, the two figures interlock at the center, forming an abstract architectural letter **"M"**.
- **Solid Shapes Only:** No gradients, glows, drop shadows, or fine hairlines. The mark remains crisp and legible down to 16×16 pixels.

---

## 2. Typography & Layout
- **Wordmark:** "Mentor-Match" in Georgia/Newsreader serif bold.
- **Single-Line Rule:** The mark and wordmark must remain on a single line (`whitespace-nowrap`), never wrapped or truncated.
- **Height Minimums:**
  - Desktop: 36px tall (`sm:h-9`)
  - Mobile: 32px tall (`h-8`)

---

## 3. Colors & Theme Contrast

The mark dynamically binds to the platform's CSS theme tokens:
- **Mark Fill:** `var(--logo-mark, var(--accent))`
- **Wordmark Fill:** `var(--text)`

### Contrast Ratios against Navbar Background (`--surface`):
| Theme | Navbar Surface | Mark Color | Contrast Ratio | WCAG Compliance |
|---|---|---|---|---|
| **Light** | `#ffffff` | `#9c3820` | **7.00:1** | Pass (AA & AAA) |
| **Dark** | `#232326` | `#e07a5f` | **4.84:1** | Pass (AA) |
| **Paper** | `#fbf8f3` | `#854823` | **6.78:1** | Pass (AA & AAA) |
| **Midnight** | `#142033` | `#4ba3e3` | **6.42:1** | Pass (AA & AAA) |
| **Forest** | `#fafcfa` | `#246b46` | **5.85:1** | Pass (AA & AAA) |
| **High Contrast** | `#ffffff` | `#094fc6` | **6.86:1** | Pass (AA & AAA) |

All themes comfortably exceed the required 3:1 graphical element threshold.

---

## 4. Brand Asset Inventory
All brand assets are self-hosted in `frontend/public/`:
- `favicon.svg` (adaptive SVG mark with dark/light mode `@media (prefers-color-scheme: dark)`)
- `favicon.ico` (multi-resolution ICO)
- `apple-touch-icon.png` (180×180 PNG)
- `icons/icon-192.png` (192×192 PWA icon)
- `icons/icon-512.png` (512×512 PWA icon)
- `icons/icon-512-maskable.png` (512×512 maskable icon with safe zone margin)
- `og-image.png` (1200×630 OpenGraph / Twitter social card)
- `site.webmanifest` (Web app manifest)

---

## 5. Reusable Component Usage
Import and render `<Logo />` from `src/components/Logo.jsx`:
```jsx
// Full variant with link (default)
<Logo />

// Mark only without link (e.g. for card badges or auth headers)
<Logo variant="mark" asLink={false} />
```
