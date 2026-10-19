# Lane L3b — the full-screen Checklist (Session AF, Part 7 redesign)

Branch `af/checklist2` from `feature/session-af-wealth-unlocked` `859648d4`. The owner's brief (passed on by the lead,
owner-approved): the Checklist as a stand-alone, full-screen, Duolingo-style daily app in ZIGoals' nebula identity, with
real motion inside it (an owner-approved exception to one-time motion, inside the Checklist only), everything that worked
kept, no storage change. References (never copied into the repository): `~/zigoals-af/owner-refs/checklist/`.
`frontend-design`: not available in this session (no Skill lists it) — the design language was applied by hand (ADR-028
H3's precedent): cosmic/nebula, pillar colours, labels ≥ 14 px, body 15–16 px, targets ≥ 44 px.

Two rounds: round 1 (Part 7 commits) built the overlay; round 2 answers the lead's iteration-1 critique (all six acceptance
lines failed) item by item.

## What the Checklist is now
- **Overlay** (`components/checklist/checklist-page.tsx`, `checklist.css`): `/app/checklist` renders a `<dialog>` drawn open
  by the server (until the page runs, `:root:has(.checklist-overlay[open])` keeps the shell's own parts undrawn) and made
  modal in the page (`showModal`): the browser's top layer, so the sidebar, header, footer banner, tab bar, status row and
  launchers are behind it and inert, and focus stays inside. X and Escape return to the page it was opened from (the
  route trail, `lib/checklist/return-path.ts`, noted by `ChecklistLauncher`, confirmed by the Navigation API where the browser
  has it) or to Today when opened directly. Escape closes the innermost first (`escape-layers.ts`: the celebration, a sheet,
  the menu, the timers, a stepper or a planet's details). Address and title unchanged. The Alpha strip is no longer drawn
  over it (ADR-028 H132: the shell's labels are covered while the overlay is open).
- **One top bar** (round 2): X, the title, today's progress (GlassBar with a shine on each tick; the date under it), Path /
  List, the streak's flame, today's XP (the game layer's own `xpEvents`, only while the layer is on; a "+N" pops on a gain —
  below the pill on a tablet/computer, on the pill itself on a phone, where the view switch sits under it) and one ⋯ menu
  (Edit path, Options, How it works). A phone takes two rows; a tablet hides the pill's "XP" word so the date fits.
- **Path** (`components/path/*`, `variant="orbit"`, CSS only in `components/path/path-orbit.css`): planets 96 px computer /
  88 tablet / 72 phone (next one ×1.15), pitch ≈ 110 px on a phone, a ±140 px learning-path wave (±120 tablet, ±80 phone).
  One short name beside each planet without a box (one line on a tablet/computer up to 272 px, at most two 14 px lines on
  a phone; notes never on the path); the next planet's name is a white START / NEXT bubble above it in the planet's colour,
  kept clear of the planet before it and of chests (measured over a whole day at 390, 768 and 1440). Waiting planets are
  their own colour at ~80 % lightness with a glow, shaded in OKLCH where the browser can (hue and chroma kept: a waiting gold
  planet stays gold; the old sRGB mix is the fallback); the next one full colour with a pulsing ring and moon; done ones
  glow with a check. The line: a soft neon ribbon, segments lit in the arriving planet's colour, a comet along the segment
  on each tick. Orbit banners with a white/gold meter, "Complete" badge, pulse, shine and 32 sparks; chests on the path with
  their names beside them; a trophy planet with ZIGi at the day's end. ZIGi (the live `ZigiFigure`, ~200 / 172 / 140 px)
  stands beside the next planet on its open side, cheers beside a ticked planet for 1.5 s (its name hidden meanwhile),
  celebrates when an orbit completes. The path lands the next planet at 40 % of the part below the top bar on opening and
  ~300 ms after a tick (1.4 s when the tick completes an orbit, so its celebration is seen first); the landing reads the
  overlay's `scroll-padding-top` (the top bar's height). Planet marks come from the words when the page gives a generic one
  (`lib/checklist/glyphs.ts`; new glyphs book, note, dumbbell, run, pen, sun).
- **Background** (`checklist-sky.tsx`): Nebula — drifting mists, two star layers, a ringed world, a moon; Light — white with
  a pastel world (still); Dark — black with a subtle mist (still).
- **Corner timers**: Sleep / Meditate / Fast (+ Focus for a timed habit) at the side on a computer (≥ 1180 px); below that
  one corner button (58 px) on the first screen that opens them (Escape closes). White glass with coloured rings by day.
- **Sheets**: Edit path (compact rows, an expander per planet with orbit choice, colour swatches, ↑/↓, habit, remove),
  Options (one-row switches, one closing line) and How it works open as sheets over the path. **List**: orbit sub-headers
  with counts, one-line rows, the item's colour on its check.
- **Day celebration** (`day-celebration.tsx` + `.css`, a lazy chunk; a modal dialog): once a day in this tab (sessionStorage
  `zigoals-checklist-celebrated`, written only when it plays), only on the tick that completes the day; rays, trophy, ZIGi,
  the day's planets (32–34 px, one row of eight on a phone), the streak counting to its new value and today's XP counting up,
  "Continue"; 560 px card on a computer; stills under reduced motion / Motion Off; undoing the last tick closes it.
- **Wording**: "planets" everywhere the Checklist speaks of its items (progress line, Today's card, nudges, the end milestone
  "All planets lit").

## Files outside the Checklist touched, and why
- `components/ui/undo-toast.tsx`: `pushToastLayer(el)` — while a top-layer layer is open (the Checklist, then its
  celebration) the one toast region is portalled into the topmost, so Undo stays clickable. Other pages unchanged.
- `components/path/*` (shared engine): every addition is behind `variant="orbit"`. Earn's Start-here was captured from a
  build of `859648d4` and of this branch (`~/zigoals-af/l3b/iter-2/base-859648d4/`): same size, SSIM 0.98 phone / 0.997
  computer, the difference is star twinkle and the sticky phone header — Earn's look is unchanged by this lane; nothing
  there was fixed here.
- `components/checklist/checklist-launcher.tsx`: one effect notes each route (`notePath`) for the close's return.
- `scripts/themes/build-themes.mjs` `ISLANDS`: + `.checklist-celebration` (the celebration stays night in every theme),
  + `.path-label-bubble` (the white NEXT bubble with ink words), + `.checklist-timer-ring` (the rings keep their colours);
  − `.checklist-timer` (the timer cards now follow the theme: white glass by day). The orbit look's own night colours are
  `:root` ink tokens (`--path-ink-banner-word`, `--path-ink-meter-track`, `--checklist-ink-*`), unchanged by Light and Dark.
- `scripts/lib/hosted-alpha-checklist.mjs` (+ test), TIER 3 commit `16aae2fc`: stage 10 reads "0 of 1 planet today" /
  "1 of 1 planet today" (the same check, the new word).

## Assertions moved (equal or greater strength)
- `tests/checklist.spec.ts` "Jump to next": the sweep scrolls the overlay's own scroller; each step waits up to 500 ms for
  the bubble (CI's slow phone runner failed the fixed 120 ms read); the same checks. Edit path is opened from the ⋯ menu.
  Progress lines read "planets".
- `tests/polish2-af.spec.ts` `sweepJump`: an optional scroller; the Checklist test passes the overlay (Earn unchanged).
- `tests/checklist-themes.spec.ts` `paint()`: waits for the one-time animations only (an infinite one never finishes); the
  colours compared are unchanged.
- `tests/path-engine.spec.ts`: also asserts no sideways scroll inside the overlay (greater strength).
- `tests/checklist-timers.spec.ts`: below 1180 px the timers are opened from their corner button first (`openTimers`); the
  Focus card's second line is gone, so the habit it times is asserted through its accessible name
  (`^Focus: <habit>\.`) instead of its text.
- `tests/webkit-checklist.spec.ts`: the corner button is measured (≥ 44 px), opened to show the timers' group, then closed
  before a tick; progress lines read "planets".
- `tests/checklist-view-writes-nothing-af.spec.ts`: Today's card title "Your day as a path of planets".
- `tests/checklist-overlay-af.spec.ts` (this lane's own): planet ranges set to the critique's sizes (computer 88–112 px,
  phone 64–84 px); "How it works" and Edit path through the menu.
- No assertion deleted or weakened. The hosted verifier's stage 10 passes at equal strength (`hosted-checklist-stage`).

## New spec
`tests/checklist-overlay-af.spec.ts` (both projects): a modal top layer covering the viewport, shell parts hidden, nothing
behind it focusable, Tab never leaves it, no sideways scroll; X → Today when opened directly, Escape → Habits when opened
from there (stepper and Edit path sheet close first); planet sizes; names beside their planets with no box (≤ 1 line
computer, ≤ 2 phone, ≥ 14 px), the bubble above the next one; the landing (next planet at 28–55 % of the screen, ZIGi
≤ 24 px from it, ≥ 130 px tall, on screen); timers on the first screen; no Alpha strip; the Undo toast ≤ 52 px covering
neither the next planet nor ZIGi; a tick's press, burst, comet, ZIGi's cheer, the bar's shine; stills under reduced motion
and Motion Off; the celebration once (Undo in reach on top, "Continue", never on reload or a re-tick).

## What the lead must wire / decide
- Regenerate the theme sheets after the merge (`node scripts/themes/build-themes.mjs`): this branch never commits them, so
  `scripts/themes/build-themes.test.mjs` fails on the branch as committed and passes once regenerated; every browser result
  here was taken with regenerated sheets.
- ADR rows: H67 ("full-bleed page inside the shell") is superseded by the owner's full-screen brief; H55's loops gain the
  overlay's (next planet's pulse/orbit/bubble bob, the sky's drift in Nebula), owner-approved; H132 covers the Alpha strip.
- Nothing for registries, CSP, egress, budgets or storage. New sessionStorage key `zigoals-checklist-celebrated` (per tab).
- WebKit (CI only, never run here): `webkit-checklist` (moved as above) and `webkit-theme-parity` /app/checklist (nothing
  floating changes the stage's height in the orbit look) — please read CI's artifacts.

## Evidence (round 2, final build; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings); unit (vitest from the root) `apps/web/lib/checklist`,
  `apps/web/lib/path`, `scripts/themes/build-themes.test.mjs`, `scripts/lib/hosted-alpha-checklist.test.mjs`: 123 passed.
- Browser, desktop + mobile: checklist-launcher, checklist-overlay-af, checklist-themes, checklist-timers,
  checklist-view-writes-nothing-af, checklist, earn-path, hosted-checklist-stage, path-engine, polish2-af, today-roles-af,
  zigi-checklist-af, page-titles — 79 passed, 9 skipped (project-specific skips).
- theme-parity-af, the whole spec, both projects: 55 passed, 1 skipped (project-specific).
- Weight (`check-weight-budget.mjs`): every page within budget — `/app` 531.8 kB (567.0), `/app/checklist` 454.9 kB (492.0),
  `/app/earn` 458.4 kB (496.0). Lazy: the day celebration 1.9 kB JS + 1.8 kB CSS (gzip), its own chunk.
- Captures: `~/zigoals-af/l3b/iter-2/` (INDEX.txt names the frames for each acceptance-line-4 step).
