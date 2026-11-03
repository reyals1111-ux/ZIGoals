# Landing fresh review (Session AK, owner follow-up 4, P5)

zigoals.app as it stands in the repository (F7 + M6, branch `feature/session-ak-number-one` at `50b71ba2`), reviewed by a
fresh agent as a first-time visitor and as a design lead at 390, 768, 1440 and 1920 px. The landing deploy is the
owner's; nothing here was deployed.

## How it was reviewed

- `landing/` served as-is on `127.0.0.1` by a small Node static server (the same content types and `_headers` as
  `apps/web/tests/landing-server.ts`, so the page ran under its real Content-Security-Policy). No outside host.
- Playwright Chromium (`channel: 'chromium'`) under the browser lock, one context per width (390×844 touch, 768×1024
  touch, 1440×900, 1920×1080): first-view files and bytes before any scroll, horizontal overflow, targets under 44 px,
  text under 13 px, console errors, axe-core 4.13.0 (already in the workspace; WCAG 2.0/2.1/2.2 A and AA plus best
  practice) after a full scroll, the keyboard order from the top, NOVA's opening frame by frame, and reduced motion.
- Every line of copy read against the app (`apps/web/lib/nova/*`, `docs/PRIVACY.md` "Session AK", the importers) and
  the claim rules: MO6 as the tests carry it (`scripts/landing-ak-claims.test.mjs`, `landing-nova-m6.test.mjs`,
  `landing-f7-visual.test.mjs`, `landing-z1c-l4.test.mjs`): no projection as a promise, no partnership, no superlative,
  Showcase screens labelled, what waits for a switch says so. Z1C_SECURITY.md L4 (fixed before this review) and I6
  re-checked.
- Screenshots (not committed): the session scratchpad, `p5/before-*.png` and `p5/after-*.png`.

## What already holds

- Story: the hero says what ZIGoals is in one sentence; the four chapters, NOVA, privacy, install, switching and the FAQ
  each answer one question. Every claim checked is true of the app today, or says it waits ("being switched on",
  "Planned · not available").
- NOVA chapter: the owner's two lines are there; local model or own key, "a plan is not an API key", keys on the device,
  chats only to the chosen model, nothing on a ZIGoals server, NOVA never moves money, Hermes Agent named with its
  official link and "not affiliated". The example dashboard is labelled "Example data".
- Motion: the hero glides and NOVA's opening play once; nothing loops; reduced motion and `?motion=off` show the
  finished page (verified: no running animation, the replay button stays hidden, NOVA is not "online").
- Accessibility: one h1, a skip link first, keyboard order header → invite → public Alpha, no target under 44 px and no
  text under 13 px outside the decorative NOVA picture, no horizontal overflow at the four widths, no console error.
  axe found one minor rule (LR-10).
- Weight (before): first view by the budget's own formula 258,004 of 260,000 bytes; full scroll 1.55 MB on a phone
  (budget 1.8 MB) and 5.73 MB on desktop (budget 6 MB).

## Findings

| # | Severity | Area | Where | Why | Fix |
|---|---|---|---|---|---|
| LR-1 | Medium | Story, navigation | `index.html` desktop nav and phone menu | NOVA, the newest chapter, could not be reached from either menu; a visitor had to scroll past four chapters to find it. | Add "NOVA" after Wealth in both menus (phone menu renumbered 06–10). |
| LR-2 | Medium | Motion | `scripts/motion.js`, `styles/final-v7.css` | NOVA's finished dashboard showed while it scrolled in, then blinked to black when the opening started at 35 % visible (frames: orb opacity 1 → 0 → fade in). A visible double take. | `nv-armed` (set only where motion is allowed, before the observer) keeps the screen dark until the opening starts; the rule lives inside the no-preference block, so reduced motion and `?motion=off` still show the finished screen. |
| LR-3 | Medium | Accessibility, layout | `styles/final-v7.css` `.nv-tiles`, `.nv-hello`, `.nv-bar` | The example dashboard used 11–12 px labels (12 px at every width) and a 12–14 px greeting and ask bar, under the floors `landing-v5-layout.spec` enforces on visible text (14 px labels, 15 px for a `<p>`), so that spec failed at 320, 390, 1024 and 1440; at 390 px the "What's on your mind?" bar sat on top of the tiles. | Labels 14 px, the two sentences 15 px; on phones (≤ 520 px) a 3:4 screen with two tiles a row and the bar below. |
| LR-4 | Medium | Honesty (MO6) | `#coming` legal line | "Not available. Not financial advice." sat directly above "IN THE ALPHA · PRACTICE FIRST: Staking from your own wallet". One of the two is false for that card. | "What is planned is not available yet. Nothing here is financial advice. Subject to legal review." |
| LR-5 | Low | Honesty, clarity | `#new` intro; FAQ "What can I do…" | "All of it is in the public Alpha today" while the Phone wallets card is "Being switched on"; the FAQ used the app's internal mode name "Local Demo". | "Each card says whether it is in the public Alpha today or still waits for a switch on our side."; "You need no wallet and no account." |
| LR-6 | Medium | Honesty, privacy | `privacy.html`, `terms.html` | The landing promises "the privacy page says exactly what" a feature sends, and its NOVA chapter offers local models, cloud keys and Hermes Agent, but the privacy page named only ZIGi with a cloud provider: nothing on local models, Ollama cloud models or Hermes (which may call a cloud model). The terms' "Your AI" named only ZIGi. | A privacy line from `docs/PRIVACY.md` (Session AK): local model stays on that computer, Ollama's cloud models are not local, own key sealed and sent only to that provider, Hermes handles what NOVA sends by its own settings, ZIGoals never sees, stores or relays it, no model = nothing sent. Terms: a model or agent on your computer runs under its own licence; ZIGi and NOVA propose cards and neither moves money. Both dated 1 November 2026. |
| LR-7 | Low | Accessibility (WCAG 2.5.3) | the eight enlarge buttons | Names did not contain their visible words: "Explore the view" was named "Enlarge Today screenshot"; four buttons show "Example data" but were named without it, so screen-reader users never heard that label. | "Explore the view: enlarge the Today screenshot"; "Example data: enlarge the Goal detail screenshot" (and Habits, Health, Positions, Wealth). |
| LR-8 | Medium | Weight | six first-view stylesheets | The first view was at 99.2 % of its 260,000-byte budget, leaving 1,996 bytes for any copy; about 12 KB of it was CSS for parts retired with Landing V4 (the old equation, ecosystem cards, mini charts, rhythm bars, `.origami-static`). | Rules whose every selector names a class no landing page or script uses are removed (a scripted, rule-level cut; `:not()` arguments never count). A computed-style comparison of every element and pseudo-element at four widths, reduced and static, shows no change. |
| LR-9 | Medium | Weight | `scripts/fold-stage.mjs` | On a tall first screen (768×1024) the swan fold sits within its 75 % load distance, so its 20 frames loaded before any scroll: 658,160 bytes before scrolling against the 360,000-byte budget `landing-v5-perf.spec` holds at 390 and 1440, and against the fold spec's own "no frames at the top of the page". | Frames wait for the visitor's first scroll (or a page that opens scrolled); the first scroll loads every stage already near. |
| LR-10 | Minor | Accessibility (axe `aria-allowed-role`) | Ecosystem gallery | `role="tabpanel"` on `<article>`, which ARIA in HTML does not allow. | The three panels are `<div>`s (no style or script depended on `article`). |
| LR-11 | Low | Design | What's new bento (≥ 1100 px) | The two-column cards were Goals, Your Wealth plan and Focus and play, among the shortest; each stretched to its row and showed a large empty box (half the Goals card was blank at 1440). | The three longest cards (Food, Insights, Money) take two columns. |
| LR-12 | Low | Typography | NOVA heading and lede at 1440 | One-word last lines ("place.", "run."). | `text-wrap: balance` on the two (ignored where unsupported). |

### Owner decisions (recorded, not changed)

- **OD-1 Brand (Z1C-I6):** "Build your own Jarvis, with a real life to run" is the owner's line and breaks no claim rule
  (no partnership, the Nous Research disclaimer is there). "Jarvis" is a third-party character name: a brand check is
  the owner's call. Kept.
- **OD-2 NOVA's availability and the deploy order:** the NOVA chapter does not say whether NOVA is in the public Alpha,
  and "What's new" has no NOVA card. Both are true only once the Alpha that carries Session AK is live, so deploy the
  landing after that Alpha deploy (or say "coming with the next Alpha" until then). No status was added here.
- **OD-3 Two numbering systems:** the phone menu numbers its own list (What's new 07) while the page numbers sections
  (08 WHAT'S NEW); this predates AK. Matching them needs a 15-item menu or dropping the section numbers, a design call.
- **OD-4 Length:** the page is about 37,000–43,000 px tall; NOVA is halfway down and "Private by design", the promise
  NOVA's headline leans on, is section 09. Moving privacy up or trimming the chapters would change the accepted look.
- **OD-5 The brand mark:** `zigoals-mark-v3.webp` is 54,908 bytes, a fifth of the first view, for an image shown at
  most 422 px wide. A re-encode of the approved art is the owner's to approve.

## Fixes

All in `landing/**` plus one new test file; no new dependency, nothing deployed, no commit.

| Finding | Files | Pinned by |
|---|---|---|
| LR-1 | `index.html` (desktop nav, phone menu) | `scripts/landing-p5-review.test.mjs` LR-1; `landing-ak-claims` keeps the menu numbers 01–10 in order |
| LR-2 | `scripts/motion.js`, `styles/final-v7.css` | LR-2 test (armed before observing, rule only inside the no-preference block) |
| LR-3 | `styles/final-v7.css` | LR-3 test (14 px labels, 15 px sentences); `landing-v5-layout.spec` text floors now pass |
| LR-4, LR-5 | `index.html` | LR-4/LR-5 test |
| LR-6 | `privacy.html`, `terms.html` | LR-6 test |
| LR-7 | `index.html` | LR-7 test (every named button's name holds its visible words) |
| LR-8 | `styles/components.css`, `final-v3.css`, `final-v4.css`, `motion.css`, `refinements.css`, `responsive.css` | LR-8 test (no rule whose every selector names a class the landing never uses) |
| LR-9 | `scripts/fold-stage.mjs` | LR-9 test; `landing-v5-fold.spec` ("no frames at the top of the page", folds still draw after a scroll) |
| LR-10 | `index.html` | LR-10 test |
| LR-11, LR-12 | `styles/final-v7.css` | LR-11 test (the wide cards are the three longest by text) |

Each of the ten new tests fails on the tree as reviewed (all ten run against a copy of it) and passes now. No existing
assertion was changed.

### Evidence

- **Landing tests:** `pnpm exec vitest run scripts/landing-*.test.mjs scripts/lib/landing-line-sets.test.mjs`: 8 files,
  35 tests, green (with `scripts/check-deployment-configs.test.ts`: 9 files, 121 tests).
- **`pnpm run check:landing`:** green (wrangler dry run, 283 files read, no bindings).
- **Landing browser specs** (`tests/landing.spec.ts` and `landing-v5-{a11y,layout,perf,fold,equation,security}.spec.ts`,
  Chromium under the lock, 2 workers): 75 passed, 27 skipped (the specs' own desktop/phone split and `LANDING_PERF`),
  0 failed. The first pass, before LR-3's 15 px step, failed only the layout spec's text floor on `.nv-hello` and
  `.nv-bar`, the same rule the old 11–12 px text broke.
- **Weight** (bytes as stored, 1 KB = 1,000 bytes):

| | Before | After | Budget |
|---|---|---|---|
| First view (budget formula, all widths) | 258,004 | 246,698 | 260,000 |
| Before any scroll, 390 × 844 | 307,164 | 295,832 | 360,000 |
| Before any scroll, 768 × 1024 | 658,160 | 347,284 | (360,000 at 390 and 1440) |
| Before any scroll, 1440 × 900 | 358,616 | 347,284 | 360,000 |
| Full scroll, phone / desktop | 1,554,670 / 5,733,576 | 1,543,338 / 5,722,244 | 1,800,000 / 6,000,000 |

  Layout shift 0 (phone) and 0.0002 (desktop), under 0.01.
- **No visual change from LR-8:** every element and its `::before` / `::after`, 35 computed properties, at 390, 768,
  1440 and 1920 px, reduced motion and `?motion=off`, compared between the reviewed tree and the same tree with only the
  pruned stylesheets: 24,696 lines, 2 differing, both on elements that also differ between two runs of the unchanged
  tree (a `.container` margin and a fold figure's offset while the scrollbar settles).
- **After, at 390 / 768 / 1440 / 1920:** axe 0 violations, no horizontal overflow, no target under 44 px, no console
  error; Tab order Skip → ZIGoals → Product … Wealth → NOVA → About → GitHub → Launch Alpha → invite → public Alpha;
  reduced motion: no animation, replay hidden; NOVA's screen stays dark until the opening starts, then fades in.
  At 320 and 390 px the greeting, the tiles and the ask bar no longer overlap (gaps of at least 15 px at 320). The
  last step moved only the phone positions of those three (`inset`), after the browser-spec run; nothing it changes is
  measured by a spec other than the overflow and text checks, which it cannot affect.
