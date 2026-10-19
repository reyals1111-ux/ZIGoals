# Lane L3b — the full-screen Checklist (Session AF, Part 7 redesign)

Branch `af/checklist2` from `feature/session-af-wealth-unlocked` `859648d4`. The owner's brief (passed on by the lead,
owner-approved): the Checklist as a stand-alone, full-screen, Duolingo-style daily app in ZIGoals' nebula identity, with
real motion inside it (an owner-approved exception to one-time motion, inside the Checklist only), everything that worked
kept, no storage change. References (never copied into the repository): `~/zigoals-af/owner-refs/checklist/`.
`frontend-design`: not available in this session (no Skill lists it; ListSkills empty) — the design language was applied by
hand (ADR-028 H3's precedent): cosmic/nebula, pillar colours, labels ≥ 14 px, body 15–16 px, targets ≥ 44 px.

## What changed
- **Overlay** (`components/checklist/checklist-page.tsx`, `checklist.css`): `/app/checklist` renders a `<dialog>` drawn open
  by the server (the first paint already shows only the Checklist; until the page runs, `:root:has(.checklist-overlay[open])`
  keeps the shell's own parts undrawn) and made modal in the page (`showModal`): the browser's top layer, so the sidebar,
  header, footer banner, tab bar, status row and launchers are behind it and inert, and focus stays inside. Focus starts on
  the dialog (its name is read). X and Escape return to the page it was opened from (the shell's route trail,
  `lib/checklist/return-path.ts`, noted by `ChecklistLauncher`, confirmed by the Navigation API's previous entry where the
  browser has it) or to Today (`router.replace('/app')`) when opened directly. Escape closes the innermost first
  (`escape-layers.ts`: the celebration, a sheet, a stepper or a dot's details). The address and title are unchanged.
- **Top bar**: X, today's progress (GlassBar; a shine sweeps the filled part on each tick), the streak's flame and count, and
  today's XP (the game layer's own `xpEvents` for today's records, shown only while the layer is on); both numbers count up.
- **Path** (`components/path/*`, `variant="orbit"`, CSS in `components/path/path-orbit.css`, imported only by the Checklist):
  big 3-D planets (84 px computer / 72 px phone) in each item's colour with a darker rim the press compresses; waiting planets
  calmer, done ones filled with a check and glow; the next one with an orbit ring + moon, a pulse and a START / NEXT bubble;
  an S that swings to both sides every six planets (`orbitOffset`); one caption per planet (≤ 3 lines, notes hidden on the
  path); big orbit banners filled with the orbit's colour, a progress bar along their foot, "Orbit complete" and a one-time
  celebration (shine + sparks); chests on the path; a trophy planet at the day's end with ZIGi celebrating; ZIGi a large
  animated figure (`ZigiFigure`) in the open sky beside the next planet; a tick bursts (flash, shock ring, 14 sparks) and sends
  a comet along the line; a round "Jump to next" button. A planet's mark comes from its words when its page gives a generic
  one (`lib/checklist/glyphs.ts`; new glyphs book, note, dumbbell, run, pen, sun).
- **Background** (`checklist-sky.tsx`): Nebula — drifting mists, two star layers, a ringed world, a moon on its orbit (loops);
  Light — white with a light colour mist (still); Dark — black with a subtle mist (still).
- **Corner timers**: a dock at the foot of phones and tablets (< 1180 px), the side column's top on a wide screen.
- **Sheets**: Edit path, Options and a new "?" (How it works + the device-only line) open as sheets over the path.
- **List view**: the chosen accent themes it (the owner's Todoist Wear OS reference): a filled accent "Add to your path"
  pill (opens Edit path) and accent-tinted pill rows.
- **Day celebration** (`day-celebration.tsx` + `.css`, a lazy chunk; a modal dialog over the Checklist): once a day in this tab
  (`sessionStorage` `zigoals-checklist-celebrated`, written only when it plays), only on the tick that completes the day,
  never when a finished day is opened; trophy, rays, confetti, the day's planets, the streak and today's XP; still under
  reduced motion / Motion Off. Undoing that last tick closes it.
- The shell's honesty label (`useAlphaFacts().network.label`) stays at the overlay's foot (H67's reason kept).

## Files outside the Checklist touched, and why
- `components/ui/undo-toast.tsx`: `pushToastLayer(el)` — while a top-layer layer is open (the Checklist, then its
  celebration) the one toast region is portalled into the topmost, so Undo stays clickable (everything outside a modal
  dialog is inert). Every other page is unchanged (no layer pushed → the region renders where the shell mounts it).
- `components/path/*` (shared engine): every addition is behind `variant="orbit"`; Earn's paths render the same DOM as before
  (earn-path, polish2-af's Start-here test and `lib/path/render.test.ts` green).
- `components/checklist/checklist-launcher.tsx`: one effect notes each route (`notePath`) for the close's return.
- `scripts/themes/build-themes.mjs`: `ISLANDS` += `.checklist-celebration` (the celebration stays night in every theme).
  The orbit look's night colours are `:root` "ink" tokens (`--path-ink-orbit*`), which Light and Dark leave unchanged.

## Assertions moved (equal or greater strength)
- `tests/checklist.spec.ts` "Jump to next": the window no longer scrolls the path; the sweep scrolls the overlay's own scroller
  and each step waits up to 500 ms for the bubble (CI's slow phone runner failed the fixed 120 ms read on 49433538); the same
  checks (no bubble while Water is on screen; it shows while Water is off screen, in view; it jumps to Water and focuses it).
- `tests/polish2-af.spec.ts` `sweepJump`: an optional scroller; the Checklist test passes the overlay; every check unchanged
  (Earn's call unchanged).
- `tests/checklist-themes.spec.ts` `paint()`: waits for every one-time animation, not the next planet's owner-approved loops
  (an infinite animation's `finished` never resolves); the colours compared are unchanged.
- `tests/path-engine.spec.ts`: also asserts no sideways scroll inside the overlay (greater strength).
- No assertion deleted or weakened. The hosted verifier's stage 10 (`scripts/lib/hosted-alpha-checklist.mjs`) is unchanged
  and passes (its h1, progress line, dot names and toast are all still there; the toast is in the open layer).

## New spec
`tests/checklist-overlay-af.spec.ts` (both projects): a modal top layer covering the viewport, shell parts hidden, every
screen point the Checklist's, nothing behind it focusable, Tab never leaves it, no sideways scroll; X → Today when opened
directly, Escape → Habits when opened from there (stepper and Edit path sheet close first); planets 72–88 / 64–76 px, one
caption, no paragraph on the path, the "?"; a tick's press, 14-spark burst, comet, ZIGi's cheer, the bar's shine; stills
under reduced motion and Motion Off; the celebration once (the Undo toast in reach on top, never on reload or a re-tick).

## What the lead must wire / decide
- Regenerate the theme sheets after the merge (`node scripts/themes/build-themes.mjs`): this branch never commits them, so
  `scripts/themes/build-themes.test.mjs` ("are what the generator builds") fails on the branch as committed and passes once
  regenerated; every browser result here was taken with the regenerated sheets.
- ADR rows: H67 ("full-bleed page inside the shell") is superseded by the owner's full-screen brief (the honesty label is kept
  at the overlay's foot); H55's loops gain the Checklist overlay's (the next planet's pulse/orbit/bubble, the sky's drift in
  Nebula), owner-approved.
- Nothing for registries, CSP, egress, budgets or storage. The new sessionStorage key `zigoals-checklist-celebrated` is
  per-tab, written only when the celebration plays (never on viewing).
- WebKit (CI only): `webkit-checklist` reads `main h1` (still inside `main`), dots/chips ≥ 44 px (72 px planets, 68 px dock
  chips); `webkit-theme-parity` /app/checklist: in the orbit look nothing floating changes the stage's height (ZIGi at the
  end lives in the trophy row; the jump button is absolute), so the 74 px Nebula-only difference seen on 49433538 should not
  recur — please read CI's artifacts.

## Evidence (iteration 1; local production build on 127.0.0.1:3104, Chrome headless, ≤ 2 workers, locked)
- `pnpm typecheck` clean; `pnpm lint` 0 errors (19 baseline warnings); unit (vitest from the root) `apps/web/lib/checklist`,
  `apps/web/lib/path`, `scripts/themes/build-themes.test.mjs`, `scripts/lib/hosted-alpha-checklist.test.mjs`: 123 passed.
- Browser, desktop + mobile: checklist-launcher, checklist-overlay-af, checklist-themes, checklist-timers,
  checklist-view-writes-nothing-af, checklist, earn-path, hosted-checklist-stage, path-engine, polish2-af, today-roles-af,
  zigi-checklist-af, page-titles — 76 passed, 9 skipped (project-specific), then the themes spec re-run 3/3 after a sheet
  regeneration (its one failure was the restored, stale sheets being served); after the last CSS change checklist,
  overlay, hosted stage, timers, themes 32 passed, 4 skipped.
- theme-parity-af, `/app/checklist`, `/app/earn`, `/app` · showcase, both projects: 6 passed.
- Weight (`check-weight-budget.mjs`): every page within budget — `/app` 531.8 kB (567.0), `/app/checklist` 453.3 kB (492.0),
  `/app/earn` 458.4 kB, shell 402.4 kB. Lazy: the day celebration 1.6 kB JS + 1.7 kB CSS (gzip), its own chunk.
- Captures: `~/zigoals-af/l3b/iter-1/` (INDEX.txt).
