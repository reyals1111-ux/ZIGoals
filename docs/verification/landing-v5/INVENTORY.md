# Landing V5 — Part 1.1 inventory, spike and baseline (Session N, 2026-10-02)

**Base:** `main` `57275a6`. The live apex still serves `1e676ba` (Landing V4, #55); `main` differs from it only by Session K's `prefers-contrast` block.

**Evidence labels:**
- **local:** this cloud sandbox (Node 24.19.0, Playwright 1.63.0, Chromium 141.0.7390.37 standing in for `chrome`).
- **headed:** the same Chromium under Xvfb.

No deploy happened, no Cloudflare account was used, and no file in `landing/` changed in this part.

## 1. What the V4 landing is
**Files:** 204 files, 7,483,536 bytes; 201 of them are deployable.

| Group | Files | Bytes | Notes |
|---|---|---|---|
| `index.html` | 1 | 39,902 | the only page |
| `styles/*.css` | 7 | 84,057 | `base`, `components`, `motion`, `responsive`, `refinements`, `final-v3`, `final-v4`: V1 plus three override layers |
| `scripts/*` | 4 | 17,156 | `main.js` (menu, dialog, tabs, film), `motion.js` (header, nav, equation, reveals), `origami-scroll.mjs`, `origami-state.mjs` |
| `assets/brand/` | 3 | 117,803 | Z mark (= the app's `zigoals-logo-480.webp`), favicon, touch icon |
| `assets/video/` | 3 | 3,487,711 | the film (web 1920×1080 and mobile 960×540, H.264) and its poster |
| `assets/origami-scroll/` | 162 | 2,394,060 | 6 transitions × (20 desktop frames 1024×648 + 6 phone frames 640×405 + 1 still) |
| `assets/product/final/` | 19 | 971,356 | real Alpha captures, fictional Showcase data |
| `assets/social/` | 1 | 364,851 | Open Graph image |

**Sections, in order:**
1. hero
2. film
3. overview (swan)
4. Today hub
5. equation
6. Goals (lotus)
7. Habits (butterfly)
8. Health (heart)
9. Wealth (bull)
10. ecosystem tabs
11. connected orbit
12. privacy
13. about
14. Alpha boundaries
15. FAQ (11 questions)
16. final CTA (Z)

Then the footer and the image dialog.

**Fonts:** none are loaded. The system stack is `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.

**No inline code and no third party.** No inline script, style or handler, and no `data:` URI in HTML, CSS or JS. The only `data:` URI is inside `favicon.svg`.

## 2. Security and upload rules (unchanged by V5)
- **`landing/_headers`**, one `/*` rule:
  - CSP: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`;
  - `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`;
  - no HSTS, on purpose (LANDING.md).
- **`landing/.assetsignore`:** deny `*`, then re-include `index.html`, `favicon.ico`, `styles/*.css`, `scripts/*.js|*.mjs` and `assets/**`, then the type denials.
  - `pnpm check:deploy-configs` (`scripts/check-deployment-configs.mjs`) enforces it and walks the real tree.
  - **Copying brand art into `assets/**` therefore needs no allowlist change.**
- **`pnpm check:landing`** is Wrangler's dry run of the upload. It has no custom checks.

## 3. Tests that cover the landing
- **`apps/web/tests/landing.spec.ts`** (5 tests, both Playwright projects; the phone project is Chromium emulating iPhone 13). It covers:
  - the "Launch Alpha" link;
  - the honesty copy;
  - no third-party request;
  - the two-line slogan at 320–1440 px;
  - icons;
  - the desktop stepped reveal;
  - the reduced-motion settled state;
  - Session K's `prefers-contrast` check.
- **How it runs:** its own Node server serves `landing/`, without `_headers`. It runs in CI's browser shards.
- **Not linted:** ESLint ignores `landing/**`, and Vitest doesn't include it. The landing JS has no lint or unit gate, so V5 adds `node --check`.

## 4. Why the equation doesn't step on phones (and barely on desktop)
**How V4 works:**
- `scripts/motion.js` computes `progress = -rect.top / (rect.height - innerHeight)` on every scroll frame.
- It lights word *i* once progress passes `[0, .18, .38, .62][i]`.
- An unlit part is painted grey `#6a7c9c` (`final-v4.css`). Lit, it turns transparent, so the parent's `background-clip:text` spectrum shows through.

**On phones (390×844, 375×667), it is switched off by design:**
- `motion.js:27` enables the reveal only for `(min-width: 701px)`; below that, every word gets `active` on every frame.
- `responsive.css:4`, `final-v3.css:20` and `refinements.css:20` also make the section content-height and non-sticky.
- Even without the width check, a content-height section leaves roughly 0–190 px of scroll for four thresholds (`rect.height - innerHeight` is near zero or floored at 1), so all four light in one flick.

**On desktop (1440×900):**
- The section is `148vh` (1,332 px), which leaves 432 px of scroll for all four steps.
- One viewport of scrolling passes every threshold at once.

**Red run, local, `apps/web/tests/landing-v5-equation.spec.ts` without `test.fail()`.** These are the visible equation words after scrolling the section to 0.05, 1.05, 2.05 and 3.05 viewports, then back to 2.05:

| Viewport | Expected | V4 |
|---|---|---|
| 1440×900 (desktop) | 1, 2, 3, 4, 3 | **1, 4, 4, 4, 4** |
| 390×844 (phone) | 1, 2, 3, 4, 3 | **4, 4, 4, 4, 4** |
| 375×667 (phone) | 1, 2, 3, 4, 3 | **4, 4, 4, 4, 4** |

The spec is committed with `test.fail()`. Part 1.2 removes it.

**Also inherited, noted for V5:**
- The grey rule uses `:has()` in a selector list; a browser without `:has()` drops the whole rule.
- `100svh` has no `vh` fallback.
- `.final-cta{overflow:hidden}` would stop a sticky stage inside it.
- `html{scroll-behavior:smooth;scroll-padding-top:80px}` (`base.css`).

## 5. The fold effects in V4
- **The visible fold** is one fixed canvas, `#origami-scroll`, at 18–22% opacity behind the six `[data-origami]` sections. It scrubs the brand film's frames per transition.
- **Each frame set runs from the previous figure to the next:**
  - `lotus/00.webp` is the swan, `lotus/19.webp` the lotus;
  - `swan/` is Z → swan;
  - `z/` is bull → Z.
- The per-chapter `.fold-planes` are hidden (`final-v4.css:41`).
- **Brand art available but not yet in `landing/`** (`apps/web/public/brand/`, `docs/brand/ASSETS_2026-10-01.md`):
  - transparent `figures/` (640 px and -2x) and `marks/`;
  - lossless `words/`;
  - `logo-fold/` (588×432);
  - `how-it-works/`;
  - the painted planet art in `public/art/v21/` (`horizon.webp` 1774×267, 30,246 B).

## 6. Spike: can CSS scroll snap give "one step per gesture"?
**Method:**
- A scratch page with V5's structure: four `100svh` step blocks and a sticky stage, with V4's `scroll-behavior:smooth` and `scroll-padding-top:80px`.
- It was driven by CDP `Input.synthesizeScrollGesture`, `mouse.wheel` and the keyboard, headless and headed (Xvfb).
- Steps start at y = 1501, 2401, 3301 and 4201; viewport 1440×900.

**Results:**

| Setup | Observation |
|---|---|
| `proximity` plus `scroll-snap-stop: always` on the 4 blocks | **A 2.5-viewport mouse fling moved exactly 2,250 px and skipped two steps** (y 601 → 2851, then 5101). Headless and headed were identical. |
| Keyboard (proximity) | PageDown 1080 → 1797 (no snap) → 2401 → 3221; Space → 4121, and again → 4838. **Inconsistent:** sometimes snapped, sometimes not. |
| `mandatory` | **On load the page was pulled from y 601 (outside the section) to 1421**, a trap. Flings still skipped step 2 (1421 → 3301). |
| Touch gestures in the iPhone 13 emulation | `synthesizeScrollGesture` with `touch` did not move the page at all, headless or headed. Touch momentum can't be tested in this sandbox. |

**Decision (owner decision N8's fallback):**
- **Snap is dropped.** Chromium does not honour `snap-stop: always` for these scrolls, so snap can't deliver "one step per gesture" here, and `mandatory` traps.
- **V5 uses one step per viewport instead:** four blocks, each exactly one viewport tall, and the block crossing the middle of the viewport is the current step.
- **A sequencer adds the "one by one" promise for fast scrolls.** When a flick passes several blocks at once, the words still appear one at a time in order, about 0.3 s apart. Nothing touches the scroll position.
- **iPhone Safari momentum and the address bar: UNVERIFIED** until the owner's device check.

## 7. CSP spike
- **Setup:** the page served from `http://127.0.0.1` with `landing/_headers` applied, `upgrade-insecure-requests` included, then a full scroll in Chromium.
- **Result:**
  - **0 `securitypolicyviolation` events and 0 console errors.**
  - The only failed request is the H.264 film, which local Chromium can't decode (it plays in CI's Chrome).
  - Loopback requests are not upgraded, so the CSP test needs no HTTPS server.

## 8. V4 baseline (local, measured with `apps/web/tests/landing-v5-perf.spec.ts`)
Bytes are uncompressed file bytes, and KB = 1,000 B.

| Measure | Desktop 1440×900 | Phone 390×844 |
|---|---|---|
| First view | **294,168 B**, 15 files | **294,168 B**, 15 files |
| Full scroll-through | **5,240,234 B**, 142 files (the film counted at file size) | **773,064 B**, 57 files |
| CLS over the scroll-through | 0.00013 | 0 |
| LCP | **336 ms** (`a.brand`) | **2,456 ms** (`a.brand`; Lighthouse mobile applied-throttling profile: 562.5 ms RTT, 1,474.56 Kbps, 4× CPU) |
| Long tasks over 50 ms while scrolling | none | none |
| Endless animations; frames requested while idle | none; 0 | none; 0 |

**About the first view:**
- The 294,168 B include the film poster (71,338 B). The hidden `<video poster>` fetches it immediately, even though the visible poster `<img>` is lazy.
- Without it, the first view is the 222,830 B recorded for V4.
- V5's first-view budget of 260 KB is therefore stricter than V4, and V5 defers that poster.

## 9. Where the two email addresses appear today (owner addition 1)
- `landing/`: **neither** address appears.
- `hello@zigoals.app` is the security and privacy contact in `SECURITY.md`, `docs/PRIVACY.md`, the friends documents and the app.
- `contact@zigoals.app` is the feedback contact (Session L, L1).

V5 adds `contact@` for the invite only. The final list is in the PR 1 STATUS entry.
