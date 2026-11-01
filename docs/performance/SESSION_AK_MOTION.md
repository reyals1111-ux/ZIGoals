
## M1–M3 status (Session AK, lane WC)

Owner follow-up 2, M1–M3, closing the WIRING_AUDIT_2 rows M1, M2 and M3 ("Partly working").

### M1 — shared-element transition: built (one morph)
- **What:** on `/app/goals`, a private goal's full card title (`.unified-goal-card h2`) morphs into the goal page's heading
  (`/app/goals/tracked/[id]`, `.goal-detail-heading h1`): React `<ViewTransition name="zg-goal-<id>" share="zg-morph"
  default="none">` on both ends (`components/motion/goal-title-morph.tsx`), 280 ms on `--zg-spring`
  (`components/motion/motion-2026.css`). Both headings are fit-content boxes, so the words scale, not empty space.
- **Levels:** Full only. Calm gives the pair the class `none` (React then names nothing, so no morph; CSS also holds it
  still if one ever starts); Motion Off and the device's reduced motion start no view transition at all (the existing
  gate, `lib/motion/view-transition-gate.ts`). Compact cards (Today) and chain goals carry no name.
- **Why a hand-off was needed (the framework fact):** React pairs a shared element only when both ends are in the
  navigation's own commit; the new state is captured before passive effects run (react-dom `startViewTransition`:
  mutation and layout callbacks, then `ready`, then spawned work and passive effects). The goal page reads its records in
  an effect (`usePrivateStore`), so its first commit was only "Loading Goal…" and no pair could form. The card now notes
  the tapped goal and the name it showed (`lib/motion/goal-morph.ts`, module memory, 5 s, never stored); the goal page's
  first frame draws that heading in the very tree slot the loaded page uses (root › section › heading › h1), so React keeps
  the same element and the morph continues on the live page while the records arrive. Opened by address (no tap), the page
  renders exactly as before. If a later edit moves those slots, the morph is merely cut short; the spec checks the slot.
- **PROTECTED:** untouched (no chrome, Today hero, Checklist or sidebar change). Weights: two small modules on `/app/goals`,
  `/app` (goal-card.tsx is shared with Today's compact cards) and the goal page; nothing on `/app/checklist`.
- **Tests:** `lib/motion/goal-morph.test.ts`; browser `tests/goal-morph-ak.spec.ts` (Full: the
  `::view-transition-group(zg-goal-…)` animates and the first-frame heading is the kept element; Calm: no goal pair;
  Motion Off and reduced motion: no view transition at all).
- **Not built:** NOVA widget → page morphs (lane WA owns NOVA's widgets; every pillar page also loads its records after
  mounting, so each would need the same first-frame hand-off).

### M2 — `.zg-glass`, `.zg-aurora`, `.zg-nebula-border`: applied or removed (no dead CSS)
- `.zg-glass` is now the control layer's edge, grain and sheen only (it sets no colour, so every surface keeps its own
  tint and contrast in Nebula, Light and Dark, and the generated theme sheets map nothing for it): applied to NOVA's dock
  (`.nova-left`) and command bar (`.nova-command`); the search palette and Quick add keep it by name. Under reduced
  transparency, more contrast and forced colours the edge and grain are not drawn; the sheen turn is Full only.
- `.zg-aurora` is on NOVA's sky (`.nova-sky`, behind the stars): a still gradient everywhere, the 90 s drift only where
  `html[data-zg-ambient=drift]` (Full, not low-end, not a low battery, tab visible). Its default `position: relative` now
  has no weight (`:where`), so an already positioned container keeps its own.
- `.zg-nebula-border` (and its `--zg-angle` property and keyframes) is removed: no surface used it.
- The theme sheets (`apps/web/public/themes/*.css`, `lib/ui-prefs/theme-sheets.ts`) need `node scripts/themes/build-themes.mjs`
  after this change (they were already stale from other lanes' CSS when checked).

### M3 — live activity chips and optimistic UI: recorded, nothing new built
What exists (checked in code, 1 Nov 2026):
- **Live activity chips:** a running habit timer's chip on Today's widget (`components/habits/habit-timer.tsx` `TimerChip`:
  running time, Pause/Resume, Finish, kept across pages and reloads); the Checklist's corner timers
  (`components/checklist/corner-timers.tsx`, `data-running`); NOVA's focus widget running state (`components/nova/widgets/focus.tsx`,
  lane WA); while ZIGi or NOVA answers, the live "looked at …" lookups and NOVA's Duo steps (handed → reading → answering →
  reported). NOVA's status chips (`components/nova/status-chips.tsx`) are state chips (brain, privacy mode, memory,
  pillars, offline), not activities.
- **Optimistic UI with calm confirmation:** every write is a local, synchronous write (`usePrivateStore`, device records)
  that the screen shows at once; sync is a background outbox, so there is no server round trip to be optimistic about.
  The calm confirmation is the one Undo toast (`components/ui/undo-toast.tsx`: one at a time, polite, 8 s, never takes
  the focus; used from 44 components, 18 call sites with an inline Undo) and the confirm cards' 10 s Undo.
Not built, and why: an app-wide "what is running now" chip (one place for a running fast, focus and habit timers) would
live in the shell — the desktop sidebar, tablet rail and phone bars are PROTECTED, and the shell's script is on every route,
including `/app/checklist` with about 0.1 kB of headroom. It needs an owner decision on where it sits.

## M5 / P8 — interaction cost before and after the motion layer (Session AK, lane M7)

### Method
- Script: `inp-lt.js` (lane M's M5 script, unchanged for the three routes it measured; NOVA added for "after"; Playwright
  from the repo's store, Chromium, no new dependency), run through the browser lock against the production server on
  127.0.0.1:3101. Phone profile (F8's): 390×844, DPR 3, mobile UA, touch; CPU 4× (CDP); no network throttle (interaction
  cost, not download); service workers blocked; Showcase loaded once from Settings; motion at its default (Full).
- Per route and run: (1) **load** — long tasks after FCP over a 6 s settle: count, longest, TBT; (2) **scroll** — 12 wheel
  steps of 211 px, long tasks during the scroll; (3) **taps** — Event Timing, the worst duration per interaction (an INP
  proxy, ms); (4) **navigate by link** — one in-app navigation to the next route (the path a view transition takes): its INP
  proxy and the long tasks during it. Median of 3 runs per figure; the per-run values are in the scratchpad JSON.
- Before: the production build of the last pushed commit at 01:42 UTC, 1 Nov 2026 (before the motion layer, M0–M6).
  After: the production build of `e0f93816`, measured 09:25 UTC, 1 Nov 2026. Between the two builds landed the motion layer
  and G2/G3/G5/Z2 (the visual system's richer cards, R11's Today widget area that mounts on view on phones, and more), so a
  difference is the sum of those, not the motion layer alone.
- NOVA's opening (P8): `nova-opening.js` — a new device per run (Showcase loaded), CPU 4× set before NOVA opens, Full
  motion; from document start the page records every `requestAnimationFrame` time, every long task and when
  `.nova-frame[data-opening]` turns `play` and `done`. Over play → done: frames, frame time median / p95 / longest, frames
  over 50 ms, dropped frames (Σ round(Δ / 16.7) − 1; 0 at a steady 60 Hz), long tasks and TBT. Phone 390 and computer 1440.
  Median of 3. NOVA is new this session, so it has no "before"; the phone and the computer are compared with each other
  and with a steady 60 Hz.

### Before / after (median of 3; ms unless named)

| Route | Figure | Before | After | Δ |
|---|---|---|---|---|
| Today | load: long tasks / longest / TBT | 24 / 741 / 5012 | 30 / 870 / 4566 | +6 / +129 / −446 |
| Today | scroll: long tasks / longest / TBT | 0 / 0 / 0 | 8 / 249 / 991 | **+8 / +249 / +991** |
| Today | tap "Quick add (+)" | 384 | 480 | +96 (runs 376–504 before, 352–488 after) |
| Today | tap "Complete Drink water" | 328 | n/a | not reachable in the script's 5 s (see notes) |
| Today | navigate by link (→ Wealth) / its long tasks / TBT | 88 / 13 / 1586 | 80 / 17 / 1962 | −8 / +4 / +376 |
| Wealth | load: long tasks / longest / TBT | 22 / 461 / 2991 | 25 / 532 / 3005 | +3 / +71 / +14 |
| Wealth | scroll | 0 / 0 / 0 | 0 / 0 / 0 | 0 |
| Wealth | tap first fold / tab | 264 | 200 | −64 |
| Wealth | navigate by link (→ Earn) / its long tasks / longest / TBT | 240 / 9 / 1098 / 2542 | 200 / 12 / 1622 / 3155 | −40 / +3 / +524 / +613 (noisy: 777–1429 before, 518–1782 after) |
| Earn | load: long tasks / longest / TBT | 21 / 1176 / 3288 | 23 / 1517 / 5001 | +2 / +341 / **+1713** (runs 3269–4957 before, 4342–5605 after) |
| Earn | scroll: long tasks / longest / TBT | 4 / 139 / 148 | 4 / 157 / 260 | 0 / +18 / +112 |
| Earn | tap "What's a validator?" | 296 | 400 | **+104** (280–336 before, 368–448 after) |
| Earn | navigate by link (→ Today) / its long tasks / TBT | 96 / 15 / 2326 | 128 / 14 / 2171 | +32 / −1 / −155 |
| NOVA (new) | load: long tasks / longest / TBT | — | 6 / 399 / 1004 | — |
| NOVA (new) | scroll | — | 0 / 0 / 0 | — |
| NOVA (new) | tap "Quick access" | — | 264 | — |
| NOVA (new) | navigate by link (→ Today) / its long tasks / TBT | — | 80 / 12 / 1411 | — |

F8's earlier figures (31 Oct, `SESSION_AK_F8.md`; Slow 4G, a different run) for reference: Quick add 368, "What's a
validator?" 520, Today TBT (warm) 1778. Those use a network profile, so only the INP proxies compare: Quick add is in the
same band (352–504 across all runs), "What's a validator?" is below F8's 520 but above lane M's "before" 296.

### NOVA's opening ("system online"), CPU 4×, Full motion

| Layout | Opening (ms) | Frames | Frame median / p95 / longest | Frames > 50 ms | Dropped frames | Long tasks / TBT / longest task |
|---|---|---|---|---|---|---|
| Phone 390 | 2106 | 113 | 16.7 / 16.8 / 117 | 3 | 12 | 1 / 25 / 63 |
| Computer 1440 | 2110 | 16 | 116.7 / 266.6 / 283 | 13 | 107 | 13 / 776 / 175 |

On the computer the opening ran at about 8 frames a second at CPU 4× (it is fine on a phone, whose NOVA is the minimal
view). **Cause:** `components/nova/use-opening.ts` ticked an `elapsed` state every 32 ms for the typed greeting, and the
dashboard that holds the hook (`nova-dashboard.tsx`: side panels, every widget, the dock) re-rendered whole with each tick
— on a computer each render is a long task at 4×. **Fix (needs a rebuild):** the hook now keeps only when the play started
and ends it with one timer; the greeting types itself in its own small component (`NovaGreeting` in `nova-stage.tsx`), so
only that line re-renders while it types. The opening's look, timing, skip and Customize replay are unchanged
(`lib/nova/opening.test.ts` passes unchanged). To be measured again after the rebuild with `nova-opening.js`.

### What got slower, and why (honest note)
- **Today's scroll** now has long tasks (0 → 8, TBT 0 → 991 ms) in all three runs. A CPU profile of the scroll (same
  profile, 4×) puts 5.3 s of the 7.1 s in the browser's own work ("(program)": style, layout and paint, not script); script
  is small (ZIGi's resting-spot check, 179 ms, reading boxes near the top only; 338 ms of forced layout in
  `getBoundingClientRect`). Nodes added during the scroll: only the number tickers (`zg-ticker`,
  M1's count-up, which starts as a figure comes into view). A Chrome trace of the same scroll (`trace.js`) names the long
  tasks: six of eight are a frame's **style recalculation** (`UpdateLayoutTree` 41–169 ms each at 4×), two are
  `requestAnimationFrame` callbacks (149 and 191 ms, the frame's scripted animations: the tickers' per-frame text and the
  scroll-cue and ZIGi resting-spot checks, each of which reads layout). Before the motion layer nothing changed the page
  while it scrolled, so no frame recalculated style; now each ticker writes its text every frame for about 0.9 s, and each
  write makes the next frame recalculate style over a page whose rules have grown (G3's `:has()` card rules, the motion
  layer's). **Not changed here:** the trace shows which phase, not which rule; the next step is a selector-stats trace
  (DevTools "Enable CSS selector stats") on this scroll to find the costly rules, then either cheaper rules or tickers
  that write a text node's `data` (no node replacement). Recorded for the lead (lane M owns the tickers).
- **Earn's load** TBT +1.7 s (median; the ranges overlap at one run). The profile: forced layout in `getBoundingClientRect`
  2.4 s (the path engine's measuring, `getPointAtLength` 0.25 s, and the page-arrival scan), the scroll cues' row check
  (`components/scroll-cues.tsx`, 0.58 s self time; reads `scrollWidth` after every mutation frame), the page arrival's style
  scan (`components/page-arrival.tsx`, 0.29 s). Neither of the last two is new this session; the page simply has more
  parts since G3 and the motion layer, so each pass costs more. Not changed here: no single new cause; a fix would rework
  the path engine's measuring (owned by the path lanes) and is recorded for the lead.
- **"What's a validator?"** +104 ms in every run: the tap's CPU profile has almost no page script (the rest is the
  browser's own rendering of the opened explanation), so the cost is the same style and layout growth as above. Recorded,
  not changed.
- **Quick add** +96 ms median, inside the before/after run ranges (376–504 / 352–488): not a clear regression.
- **"Complete Drink water"** could not be measured after: the button did not come into view within the script's 5 s on
  the phone layout in any run (Today's widget area mounts on view on phones since R11, and its habits list changed); the
  method was kept as it was, so this cell stays n/a rather than measuring another control.

## P8b — the two regressions fixed at their cause (Session AK, lane P8b)

### Cause (named by element and rule, not by phase)
- **One `:has()` set for the whole page.** Blink keeps a single invalidation set for every `:has()` that is not in a
  selector's last part (`A:has(x) B`). Each change of the page's tree under an element such a rule watches (`:root:has(…)`,
  `body:has(…)`, …) applies that set, and the set is the union of every such rule's last part. Three old rules widened it:
  `components/ui/card-header.css` `… :has(…):not(:has(…)) > :first-child` (no class, so **whole subtree**: the whole
  document), `components/phone/phone-shell.css` `… .workspace-status > span` (every `<span>`) and
  `components/checklist/today-checklist.css` `… .today-checklist-next strong` (every `<strong>`). They date from 14–26 Oct and
  cost nothing while nothing changed the tree during a scroll.
- **Today's scroll:** the Wealth total's count-up (M1) replaced the running digits' text node every frame (`textContent`),
  a tree change; a trace with invalidation tracking (`p8b/diag-scroll.js`) shows each of those frames restyling 2,478
  elements (`Invalidation set invalidates subtree | HTML | …health-section-heading… > :first-child`), 150–191 ms at CPU 4×.
  The two rAF long tasks M7 saw are the same recalculation, forced by layout reads in the frame's callbacks.
- **Earn's load:** the path engine, the page arrival and ZIGi's resting-spot check each change the tree and then read
  layout, so every read paid the same whole-document restyle. On top of that, ZIGi's check (`firstScreenControls`,
  `components/ai/launcher-rest.ts`, since 8 Oct) read the box of every control in `main`, which makes the browser lay out
  the sections F8 put under `content-visibility: auto`, after every change to `main` while the page loads (x48 forced
  recalculations, x34 layouts, 1.1 s of its own script in one traced load).
- **"What's a validator?":** the opened explanation is a tree change; its render restyled ~1,500 elements for the same
  card-header rule (the tap trace's other long task is Playwright's own `getByRole` query, `isElementHiddenForAria`).
- Checked and not the cause: G3's new `.panel:has(:focus-visible)` rules and the shell's `main:has(…)` rules (neutralising
  them on the wire changed Earn's load TBT by −330 ms, inside the noise, so G3's look stays); the ticker's per-frame text
  writes themselves (a character change is cheap once the set is narrow).

### Fixes (same look, same elements matched, same specificity)
- `card-header.css`: the first child is chosen from its own side — `> :first-child:has(~ :is(.card-options,
  .pin-to-today)):not(:has(~ :is(p, h2, h3, h4):not(:first-child)))` plus the case where that first child is itself the
  options — a subject `:has()`, so only that element is rechecked; specificity stays (0,5,1).
- `phone-shell.css`: `… > :where(.workspace-status) > span[role="status"]`; `today-checklist.css`:
  `… :where(.today-checklist-next) strong[data-next-step]` (both elements always carry the attribute; the class moves into
  `:where()` so the weight is unchanged). A first try with the attribute inside `:where()` changed nothing in the trace:
  Blink takes no invalidation feature from `:where()`.
- `components/motion/number-ticker.tsx`: each frame writes the running text node's `data` (no node replaced, so no tree
  change); start and end swaps, `data-running`, the readable copy and the held width are as before.
- `components/ai/launcher-rest.ts`: a control inside a skipped `content-visibility` section is left out without reading
  its box (`checkVisibility({contentVisibilityAuto: true}) === false`); such a section is off screen by definition, and
  the check runs only at the top of the page. Where the API is missing, every control is measured as before.
- Guard: `lib/perf/has-invalidation.test.ts` fails if any stylesheet in `app/`, `components/` or `themes/` gains a `:has()`
  rule whose last part names no class, id or attribute. Two known exceptions, reported and not changed: the PROTECTED
  Checklist overlay's `:root:has(.checklist-overlay[open]) … > :not(…)` rules (`checklist.css`, /app/checklist only); a
  look-keeping fix needs an attribute set on `<html>` while the overlay is open, i.e. script on a route with ~0 kB headroom
  — the owner's call. `lib/perf/ticker-tree.client.test.ts` pins that the ticker's frames add or remove no node.

### Before / after (phone 390, DPR 3, CPU 4×, Showcase, Full motion; median of 3; ms)
Measured on the served build of `00f3a69d` with the fixes applied on the wire (`p8b/exp-load.js`: the CSS rewritten in
the responses; the two script changes emulated by an init script), variants alternating within each run, in inp-lt.js's
order (6 s settle → 12 wheel steps → tap).

| Route | Figure | F8 / lane M "before" | M7 "after" | P8b base (same session) | P8b fixed | Runs (fixed) |
|---|---|---|---|---|---|---|
| Today | scroll: long tasks / longest / TBT | 0 / 0 / 0 | 8 / 249 / 991 | 7 / 244 / 1029 | **1 / 83 / 33** | TBT 147, 33, 21 |
| Today | load TBT | 5012 | 4566 | 5597 | 5318 | 5468, 4338, 5318 |
| Today | tap "Quick add (+)" | 384 | 480 | 480 | 544 | 544, 512, 560 (base 360–544; the emulation wraps every `querySelectorAll` and `textContent` write, so this cell waits for the rebuild) |
| Earn | load: long tasks / longest / TBT | 21 / 1176 / 3288 | 23 / 1517 / 5001 | 30 / 1785 / 6466 | **20 / 1212 / 3474** | TBT 3958, 3474, 3344 |
| Earn | scroll TBT | 148 | 260 | 276 | **30** | 30, 37, 0 |
| Earn | tap "What's a validator?" | 296 | 400 | 384 | **232** | 232, 248, 208 |

Step by step on Earn (load TBT, median of 3): base 5555 → the three CSS rules 4019 → plus the launcher change 3367; the tap
440 → 264 with the CSS alone. Scripts and raw runs: scratchpad `p8b/` (`diag-scroll.js`, `diag-load.js`, `exp-load.js`,
`fix.json`, `exp-*.json`).

### After, on the rebuild (the real build, not emulated)
`m5/inp-lt.js` unchanged (`ROUTES_ONLY=before`, the three routes lane M measured), against the lead's production build
carrying `e123fe36`, measured 14:18 UTC, 1 Nov 2026; median of 3 (per-run values in scratchpad `m5/p8b-after.json`).

| Route | Figure | Before (lane M) | M7 after | **P8b after** | Runs |
|---|---|---|---|---|---|
| Today | scroll: long tasks / longest / TBT | 0 / 0 / 0 | 8 / 249 / 991 | **2 / 65 / 23** | TBT 23, 36, 6 (longest 56–66) |
| Today | load: long tasks / longest / TBT | 24 / 741 / 5012 | 30 / 870 / 4566 | 28 / 929 / 4287 | 4452, 4287, 3862 |
| Today | tap "Quick add (+)" | 384 | 480 | 384 | 368, 480, 384 |
| Today | tap "Complete Drink water" | 328 | n/a | 264 | reachable again in 5 s on this build |
| Today | navigate by link (→ Wealth) / its TBT | 88 / 1586 | 80 / 1962 | 112 / 1832 | |
| Wealth | load TBT / scroll / first fold | 2991 / 0 / 264 | 3005 / 0 / 200 | 3364 / 0 / 216 | 3494, 3364, 3027 |
| Earn | load: long tasks / longest / TBT | 21 / 1176 / 3288 | 23 / 1517 / 5001 | **19 / 1415 / 3899** | 4117, 3899, 3584 (before 3269–4957) |
| Earn | scroll: long tasks / longest / TBT | 4 / 139 / 148 | 4 / 157 / 260 | **3 / 67 / 30** | 15, 30, 233 |
| Earn | tap "What's a validator?" | 296 | 400 | **288** | 288, 328, 264 |

Today's scroll is back to near zero: the remaining one or two tasks of 56–67 ms are the count's start and end (one React
render each, now ~70 elements restyled instead of 2,478). The "What's a validator?" tap and Quick add are back at their
before values. Earn's load is −1.1 s from M7's after and inside the before range, but its median is still ~600 ms above
lane M's before median; the served build also carries everything committed since (P1–P7, follow-up 5), so that rest is
not attributed. The remaining cost is the page's own forced layouts (the path engine and the page arrival's metric scan),
each paying for the many subject `:has()` rechecks of a large page; a further cut would rework those scans (recorded for
the lead, not done here).

## P8c — the Checklist overlay's two shell-hiding rules (Session AK, owner decision 6)

Owner decision 6: fix them only if the look stays identical (the Checklist's pin tests and the AG Polish specs pass
unchanged at equal strength); else leave them and record why. **Result: changed; identity shown below.**

### The change
- `components/checklist/checklist.css`: `:root:has(.checklist-overlay[open]) .app-content > :not(.workspace,
  .private-read-delay)` and `… .workspace > :not(main, .aa-toast-region)` (`display: none !important`) removed. A `:has()`
  before a last part with no class makes Blink's shared `:has()` invalidation set "whole subtree": on /app/checklist every
  change of the page's tree restyled the whole document (P8b).
- `components/checklist/checklist-page.tsx`: the page renders the same two rules itself, in a `<style>` beside its dialog
  (`SHELL_HIDDEN`), so they apply exactly while the Checklist is on the page — in the server's HTML (the first paint) and
  gone with the page — with no `:has()`. Same weight as before, (0,5,0), via `:root:root:root`. When the browser closes
  the dialog on its own and the page leaves, a state flag drops the rules first, so the shell shows during the leave as it
  did (the old rules stopped matching the moment the dialog closed). Unchanged: `:root:has(.checklist-overlay[open])
  { overflow: hidden }` and the keyed `:is(.skip, .phone-topbar, .app-sidebar, .phone-tabbar)` rule.
- `lib/perf/has-invalidation.test.ts`: no exception left; every stylesheet of the app passes the guard.
- Weight: /app/checklist 489.4 → 489.9 kB of its 492.0 kB line (the lead's build of `45d5510b`); the shell 414.8 kB.

### Proof of identity
Method (`scratchpad/p8c/capture.js`, `compare.js`): /app/checklist with the overlay open and Today after leaving it
(closed), Nebula, Light and Dark, 390 (DPR 2, touch) and 1440; Showcase; fixed clock, seeded `Math.random`, reduced
motion and Motion Off. Each capture: a viewport screenshot and a computed-style signature of every element (its path,
`display`, `visibility` and rounded box: 1,039–3,854 elements per capture) plus the shell's display list. Sets: `before1–4`
(the served build of `e107e6e9`, before the change), `after1–2` (the lead's build of `45d5510b`, with it), `revert2` (the
same `45d5510b` build with the change undone on the wire: the page's rules emptied in the HTML, RSC payload and script,
the two old rules appended back to the Checklist's stylesheet), so the change is measured alone on one build.

| Comparison | Computed-style lines that differ (12 captures) | Shell display lists | Screenshots |
|---|---|---|---|
| before3 vs before4 (noise floor, same build) | 0 | same | identical except 1440 open: Dark 1,864 px, Nebula 1,337 px |
| after1 vs after2 (same build) | 0 | same | identical |
| **after1 vs revert2 (the change alone, same build)** | **0** | **same** | identical except 1440 open: Dark 2,948, Light 1,737, Nebula 1,731 px |
| revert2 vs before3 (the rest of the build, P6 included) | 0 | same | identical except 1440 open: Dark 2,277, Light 394, Nebula 1,731 px |
| after1 vs before3 | 0 | same | identical except 1440 open: Dark 687, Light 1,343 px |

Every differing pixel, in every pair including two captures of the unchanged build, lies in one region of the open path at
1440 (x 520–782, y 286–773; largest channel difference 81, as between before1 and before2): a time-driven part of the path
that varies between any two captures, not the change. Outside it every screenshot is pixel-identical, and every element's
computed `display`, `visibility` and box is identical in all 12 states. The hidden shell parts are hidden in every state
exactly as before (e.g. phone, open: `.skip`, `.phone-topbar`, `.alpha-notice`, `.status-row`, `.site-footer`,
`.phone-tabbar` `none`; `.workspace`, `main` `block`).

Specs, run against the build with the change (`45d5510b`), files byte-for-byte unchanged (sha256 checked):
`checklist-overlay-af` (the full-screen overlay's pins), `checklist`, `checklist-themes`, `phone-checklist-button`, and
AG Polish `checklist-ag-polish`, `checklist-ag-polish-2`, `checklist-phone-ag-polish`, `-2`, `-3`, `checklist-list-ag-polish`,
`checklist-celebration-ag-polish`: **104 passed, 0 failed, 28 skipped** (the specs' own desktop-only/phone-only skips),
desktop and mobile projects, 2 workers.

### Cost
Same build (`45d5510b`), the change undone on the wire vs in place (`p8c/exp-load.js`, `base+revert` vs `base`), variants
alternating; phone 390, CPU 4×, Showcase, Full motion; /app/checklist: load (6 s settle), 12 wheel steps over the overlay,
then a tick of a planet ("…: not done yet"); median of 3, ms.

| Figure | Without the change | With it | Runs (without / with) |
|---|---|---|---|
| load: long tasks / longest / TBT | 18 / 1998 / 4221 | 13 / 1873 / 3779 | TBT 4221, 3551, 4528 / 3493, 4087, 3779 |
| scroll: long tasks / longest / TBT | 1 / 75 / 25 | **0 / 0 / 0** | every run without had one 60–104 ms task; none with |
| tap a planet (INP proxy) | 520 | 520 | 520, 616, 472 / 520, 456, 624 |

Before the change, on `e107e6e9`, the upper bound (both rules simply deleted on the wire, which also shows the shell
beneath the dialog): load TBT 3674 → 4103, scroll 19 → 0, tick 584 → 472, runs overlapping. So the gain is modest: the
overlay's scroll loses its last long task and the load a few; the tick is unchanged within its spread. Scripts and raw
runs: scratchpad `p8c/` (`before1–4`, `after1–2`, `revert2`, `pixel-boxes.txt`, `exp-checklist*.json`, `specs.sha256`).
