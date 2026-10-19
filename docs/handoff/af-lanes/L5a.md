# Lane L5a — UI changes (Part 10) and theme parity (Session AF, ADR-028)

Branch `af/ui` from `feature/session-af-wealth-unlocked` (`b988e4a1`; the feature branch merged in again at `b205460a` for
L1's Earn dock, merge commit `422ea0a8`). Worktree `agent-ad41fc231d9544cef`, server port 3102. This file is the lane's
running record for the lead: what is done, what the lead must wire, every assertion that changed and why, the decisions
taken inside the brief, and the open items. Generated theme files (`apps/web/public/themes/*.css`, `public/theme-boot.js`,
`lib/ui-prefs/theme-sheets.ts`) are never committed here: **the lead regenerates them after the merge**
(`node scripts/themes/build-themes.mjs`); until then `scripts/themes/build-themes.test.mjs`'s first test fails by design.

## Status by item (brief order)
| # | Item | State | Commits |
|---|---|---|---|
| 1 | P10.1 sidebar sky parallax (H28) | done | `0656af0a`, `60a349e7` |
| 2 | P10.2–P10.6 Light redo, Dark’s black sky (H13, D9, H75) | done | `11c9e172`, `e3f66482`, `712977b6` |
| 3 | P10.7 "Saved on this device" leaves the sidebar (H31) | done | `f93e5640` |
| 4 | P10.8 footer finale ribbon (supersedes ADR-027 G22 for phones) | done | `d72e67f5` |
| 5 | P10.9 hero slogan line boxes (H14) | done | `c7796b30` |
| 6 | P10.10 Today's goal roles | done | `7bb18555` |
| 7 | P10.11 Wealth chip row; P10.12 rail lane + reserve card in Light | done | `f5223abb`, `2cb5faa7` (+ `11c9e172` for Light) |
| 8 | P10.13 theme parity test, report, fix rounds | done | `d873d182`, `e3f66482` (round 1), `712977b6` (round 2), this file |
| — | The lead's request: the Earn dock joins the theme islands | done | `bfc7ed4e` |

## What was built
- **P10.1** `components/shell/sidebar-sky.tsx` (+ `sidebar-sky.css`, pure maths in `lib/sidebar-sky.ts`): each theme's stars
  layer is drawn at `center calc(100% + var(--sky-y, 0px))` (`app/visual-v21.css`, `themes/light.sidebar.css`,
  `themes/dark.sidebar.css`); `--sky-y` = 55 % of the scroll, so the stars travel at 45 % of the content's speed; the page
  mark, the planet with its words and the theme bar are content and scroll 1:1. A CSS scroll-driven animation
  (`animation-timeline: scroll(self block)` on a registered `--sky-y`) drives it **while the sidebar scrolls**; at rest
  (`scrollend`, else 180 ms after the last scroll event) the same value is written as `--sky-rest` and the animation is
  detached. Reason: a scroll-driven animation reports `playState: "running"` with a finite end for as long as it is
  attached, and 11 existing specs wait for "no running finite animation" (counters-compact, ui-design-pass,
  phone-refinements, header-art-ae, a11y-wcag-x, today-scene, wallet-menu…); the sidebar overflows at the default
  1280 × 720, so a permanently attached animation would hang them. Where `animation-timeline` is missing, a passive
  listener writes once per frame (rAF). Nothing under reduced motion, Motion Off or on the ≤ 900 px header. Mounted by the
  sidebar's theme bar (`theme-switch.tsx`, its own lazy chunk), so the shell's weight and `shell.tsx` are untouched.
- **P10.2–P10.6** `scripts/themes/build-themes.mjs` — Light's policy: only neutral colours (OKLCH C < 0.07) and *night*
  colours (L < 0.40 and C < 0.14, see the H75 refinement below) flip: words to ink, panels and lines to their day
  versions, white glass to ink glass; every other colour is identity as a fill, line, glow, shade or paint. A coloured word
  that fails on white takes a deeper shade of its own hue until 6.6:1 on white (≥ 4.5:1 on the day's panels and glow
  tints), through `--<token>-ink` twins (defined as `var(--<token>)` in Nebula/Dark in `components/shell/theme-switch.css`,
  for the pillar, brand and accent colours: by day goals `#6741c9`, habits/cyan `#026671`, health `#a92073`, wealth
  `#75560e`) or the deepened literal; a word in a run-time colour (`--pillar`, `--area`, `--tone`, `--health-mint`…) is
  `color-mix(in srgb, <colour> 42%, #000)` (an sRGB value the layout audit reads; a relative `oklch()` colour did not
  parse there and read as 4.49:1 whatever its lightness). Gradient words (`background-clip: text`) keep every
  coloured stop; only their white-family stops become ink (`--nebula-flow-mid`'s `currentColor` is the ink). AE's
  `amber()` gold shift is retired. `color-mix()`: a dark colour that is the mix's ground (≥ 65 % of it, or mixed with no
  hue) flips — a night panel or a chosen chip tinted by an accent becomes a light tint — anything else in a mix is kept (a
  coloured line's sheen, a violet line mixed 60 % with the night's line colour). A rule painting its own opaque coloured fill keeps its
  words. **Every rule that sets a colour is carried** into the sheet (same `:not(#\-)` weight), changed or not, so the
  sheet's cascade is Nebula's own — this is what gives Habits' 28-day blocks their card colours back (AE's purple came
  from a boosted literal outranking the unboosted tone rule); carried rules set **colour longhands only** (background,
  border and outline shorthands are split), so nothing else Nebula sets (widths, sizes, positions, `background-clip`) is
  overruled. Dark deepens only neutral and night panels. `.staking-card` left `ISLANDS`. Hand layers: AE's matte/tint
  patches (`.habit-month-grid`, `.goal-choice-tiles`, `.calc-milestone`, `.exercise-medallion`, `.habit-week-bars`, the deep
  `--nebula-flow-mid` stops, the `--ha-*` header-art remaps, the islands' day shadow, the sidebar's edge and pill
  border/glow) are gone; the two hero layout rules are gone (the night pool fades within the 48 px gap above "What is due
  now", 16 px on phones); every hand rule carries the one id of weight. Two hand rules added in round 2: the reserve
  card's veil lies thicker over its horizon art by day (a calm heavy background; its link sat on the dark art at 2.2:1),
  and a project's initials are ink on their day tile (1.1:1 before: a rule with a coloured fill kept white words, but a
  later rule's night fill — flipped by day — is what shows). Dark: `body #000`, `.app-content::before` four
  dark mists (`#1a153fcc`, `#0f2238cc`, `#2a1230cc`, `#0e2a2acc`) over the starfield under a 38 % black veil, black
  veils in `::after`.
- **P10.7** `THEME_NOTE.sidebar` and its CSS removed; the sidebar's bar slot is 70 px (the bar's own height). The fact's
  homes are unchanged: Settings → Appearance ("Your choice stays here and is never synced."), Settings → Your data ("How
  pages look on this device"), Help `ad-themes` ("it stays here, is never synced"). No spec, script or verifier named the
  note, so the commit is a plain one (H31).
- **P10.8** `lib/footer-ribbon.ts` + `components/footer/footer-path.tsx`: five anchors through one Catmull-Rom spline,
  sampled 73 times, drawn as a closed tapered ribbon 1.5 → 6 → 2 px (phones 1.2 → 4.2 → 1.6), gradient
  `#f06dff → #ff8fd0 → #ffd27a` from Health's height to the curve's top (the descent into the word stays gold), a blurred
  copy as the glow, a gold end node. Cut at the rightmost point into the same two wipe pieces (`data-part=rise|return`),
  so `footer-motion.spec.ts` holds unchanged; phones get the ribbon (beneath the steps, up the right edge, into the word)
  within the unchanged `WEALTH_AFTER` (`FOOTER_TIMING.PHONE_ARC`). Captures at 320, 390, 768, 1024, 1440, 1920 checked
  (scratch, `~/zigoals-af/L5a/shots/F-*.png`).
- **P10.9** `run92-product.css`: `@media (min-width: 768px) { … .slogan-line + .slogan-line { margin-top: max(13px, .18em) } }`.
- **P10.10** `lib/today/goal-roles.ts`: focus = the first active goal in the cards' order and its next step; "What
  matters today" = the most urgent *other* goal that can show a funding pulse (overdue 5, review 4, behind 3, a
  contribution within 3 days 2, the target within 14 days 2, no plan 1, summed; ties in page order); with one such goal,
  that goal (its funding facts differ from the step and the card). A pinned goal is the top of every goal list, so it is
  the focus. `today-focus.tsx` shows the step (`data-step`); `today-dashboard.tsx` computes the roles once.
- **P10.11** `components/wealth/accounts.css`: from 768 px the chip row is one row (`nowrap`, padding 10 px, gap 5 px),
  scrolls sideways where it does not fit, its last 22 px fade (the fade meets a chip only when the row is full), focus-ring
  room kept. **P10.12** `components/platform/platform.css`: `.staking-card` is an inline-size container; at a text column
  ≤ 260 px its heading is `clamp(15px, 10.2cqi − 3.5px, 24px)`, one line; the 64 px lane stays.
- **P10.13** `tests/parity/{collect,classify,run,session,known}.ts`, `tests/theme-parity-af.spec.ts` (21 routes in the
  Showcase incl. `/app/earn`, `/app/checklist`, `/app/staking`; a new device's Today and Goals; Quick add open; the phone's
  More sheet; the folded hero; computer and phone layouts: 51 checks), `tests/webkit-theme-parity.spec.ts` (6, WebKit
  390 × 844), `scripts/parity-report.mjs` → `docs/verification/session-af/theme-parity.md`.

## Decisions for the lead (ADR rows to record)
1. **H75 refinement (needs your row):** the parity rule's "neutral" also covers *night* colours — dark (OKLCH L < 0.40)
   with at most a tint (C < 0.14) — as surfaces, lines, shades and paints, and the page's own ground (body,
   `.app-content`, the ground under the footer banner) is neutral; a neutral or night shade may be added or left out (the
   cards' separation shade); the sidebar sky's dawn stars (Light) and night veil (Dark) count as calm on an art layer.
   Why: 66 declarations of the night's panels and selected states carry an indigo or teal tint of C 0.07–0.13 (focus
   tiles, health summary, pressed toggles, calculator figures…); under C < 0.07 alone they stay dark by day with ink words
   on them, and a gradient whose stops straddle 0.07 turns half white, half night. The generator (`NIGHT_L`,
   `NIGHT_CHROMA`) and the classifier (`tests/parity/classify.ts`) share the numbers (a unit test checks); `NIGHT_L = 0`
   returns to the strict rule.
2. **H28 mechanism detail:** the scroll-driven animation is attached only while the sidebar scrolls (see P10.1 above).
3. **H13 numbers:** coloured words reach 6.6:1 on white (AE's day words sat at OKLCH L 0.47, about the same); run-time
   colours mixed with 58 % black; gold keeps its hue (the amber shift is retired) — see the open item on gold.
4. **Today's roles:** "What matters today" (`components/platform/today-intelligence.tsx`, not this lane's file) shows the
   first goal of the list it is given, pinned first; `today-dashboard.tsx` gives it a *view* of the goal records with the
   chosen goal first and the only one marked pinned (nothing written). A cleaner wiring for the lead, if you prefer: add
   `goalId?: string` to `TodayIntelligence` (`const goal = (goalId ? platform.goals.find(g => g.id === goalId) : undefined)
   ?? …existing rule…`) and pass `roles.attention?.id`, then drop `attentionFirst`.
5. **Dark's mapping:** it deepened every surface darker than L 0.5, coloured fills included; now only neutral and night
   colours deepen (H75 needs a coloured fill equal in Nebula and Dark). Everything else in Dark is as AE left it apart
   from the black, misty sky (D9).
6. **Theme sheets' size:** carrying every colour rule makes Light ≈ 503 kB and Dark ≈ 435 kB uncompressed (AE: 378 and
   119 kB); they are not script weight and no budget names them.

## Assertions changed (each at equal strength)
- `scripts/themes/build-themes.test.mjs`: `expect(mapValue('#16d9ed', 'surface', 'light')).not.toBeNull()` →
  `.toBeNull()` — the assertion pinned AE's matte mapping of coloured fills, which the brief retires (Light keeps Nebula's
  exact fills); 12 new tests pin the new policy (identity of coloured fills/lines/glows/paints, night panels flip, words
  ≥ 6.6:1 with the same hue, gradient words, colour-mix, ink twins and their island restore, no `.staking-card` island,
  the carried cascade, colour longhands only, no hand-layer layout or matte rule, Dark's mist, one shared rule with the
  parity classifier).
- `apps/web/tests/run9-2-product.spec.ts`: "Today financial intelligence contains 'Emergency fund'" → "contains 'Reward
  income reserve'" (the Showcase's most urgent other goal, needing a review) **plus** "the focus tile contains 'Emergency
  fund'" — the brief moves the top goal out of "What matters today".
- No other existing assertion changed; `footer-motion.spec.ts` and `today-scene.spec.ts` are untouched and green.

## What the lead must wire
1. Regenerate the theme sheets after merging (`node scripts/themes/build-themes.mjs`) and commit them.
2. `components/zigi/zigi-figure.tsx`: `import './zigi.css'` — ZigiFigure never loads its own CSS; on a new device's Today
   and Goals (nothing else loads it) Nebula draws the figure without its drop shadow while Light and Dark (their sheets
   carry `.zigi img`) do. Listed in `tests/parity/known.ts` (the parity spec names it instead of failing); remove the two
   entries once fixed. Found by the parity test: route `/app` and `/app/goals`, state empty, element
   `#dashboard-item-builtin-activity img` / `#goals-health img`, property `filter`, Nebula `none` → Light
   `drop-shadow(rgba(58, 58, 87, 0.18) 0px 6px 14px)`, Dark `drop-shadow(rgba(20, 10, 60, 0.45) 0px 6px 14px)`.
3. Help (your file) — sentences now out of date:
   - `ad-themes`: "**Light** has white-family surfaces with the same colours a little deeper, so charts and words stay
     clear;" → suggested: "**Light** is Nebula by day: a white page with a light colour mist and dark words, and every
     colour, chip, chart, ring and glow exactly as in Nebula;". Its "Dark is the nebula, deeper." → "**Dark** keeps
     Nebula's colours on a black sky with a faint colour mist."
   - `ae-themes`: the same Light sentence (repeat the change).
   - `ae-sidebar`: add "Its stars drift slowly as you scroll the sidebar (still with reduced motion or Motion Off)."
   - Optional new `af` answers: the footer's line into "= Wealth" (now also on phones), Today's three goal places.
4. `scripts/sanitize-alpha-tail.mjs` `API_ROUTES` lacks L1's `/api/earn/measured` and `/api/earn/vaults` (its test fails on
   the merged feature branch; not this lane's change).
5. ADR-028 rows for the decisions above; STATUS lines from the tests below.
6. L5b (Part 9): when `/app/timeline` and `/app/stories` exist, add them to `ROUTES` in `tests/parity/run.ts` (and to the
   WebKit subset in `webkit-theme-parity.spec.ts` as the design asks); small coloured words in new CSS can use the
   `--<token>-ink` twins.
7. CI: `theme-parity-af.spec.ts` is 51 Chrome checks (≈ 4–5 min at 2 workers); `webkit-theme-parity.spec.ts` is picked up
   by `playwright.webkit.config.ts`'s `webkit-*` match (6 checks, ≈ 1.5 min).

## Tests run (2026-10-19, this worktree, logs in `~/zigoals-af/logs/L5a-*.log`)
The rounds after the final build changed only the generator and Light's hand layer; `next start` serves `public/` from
disk, so those runs used the final build with the regenerated sheets (what the lead's regeneration will produce).
- Unit (vitest from the repo root): this lane's files — `lib/sidebar-sky.test.ts` 4, `lib/footer-ribbon.test.ts` 5,
  `lib/today/goal-roles.test.ts` 7, `scripts/themes/build-themes.test.mjs` 17 (on regenerated sheets),
  `scripts/parity-report.test.mjs` 7 → 40 passed. Full `pnpm test` (regenerated sheets): 5,673 passed, 58 skipped,
  29 failed → 28 were `lib/goal-provider.test.ts` (the shell rendered without `matchMedia`; fixed in `60a349e7`, 29 passed
  after), 1 is `scripts/sanitize-alpha-tail.test.mjs` (wiring item 4).
- `pnpm lint` 0 errors (19 warnings, none in this lane's files); `pnpm typecheck` clean.
- Playwright, Chrome, production builds on 3102 (`rebuild.sh`), 2 workers. Final build: this lane's specs
  (`sidebar-sky-af` 6, `sidebar-note-af` 1, `light-redo-af` 5, `footer-arc-af` 6, `slogan-gap-af` 2, `today-roles-af`
  2 × 2, `wealth-chips-af` 4, `rail-lane-af` 4, `theme-parity-af` 26 + 25) → 83 passed, 29 skipped (project filters);
  WebKit `webkit-theme-parity` 6 passed. Existing specs on the same build: themes, theme-polish-ae, checklist-themes,
  today-scene, today-screens, footer-motion, footer-links-moved, brand-nav-polish, header-art-ae, run9-2-product,
  session-ac, page-order-aa, wealth, wealth-v2 → 157 passed, 11 skipped; a11y-ab-cloud, a11y-consent-labels,
  a11y-field-errors, a11y-motion-dialogs, a11y-wcag-x, aa-a11y, habits-aa, habits-v2, habits-routines-block,
  counters-compact, progress-glass, ui-design-pass → 179 passed, 13 skipped. Earlier builds: logo-fold, page-marks
  (green), the sky/Light/theme batch (27 passed, then 11 after two spec readings were fixed).
- Theme parity: round 0 (scratch collector on the dev server, every route) drove the generator's cascade, colour-mix and
  island fixes; round 1 (the spec, Chrome computer): 21 of 25 green, 4 findings (the Help code chip's border by day and
  night, the Life review's clock in the test, the empty device's ZIGi shadow × 2) → `e3f66482` and the test's clock;
  round 2 (final build): Chrome 51 of 51 (computer and phone), WebKit 6 of 6; then the Light layout audit (390 and 1440,
  every state: 22 contrast findings, 9 distinct — run-time colours read as 4.49:1, a chosen area chip and filter left
  dark under ink words, the initials tile, the reserve card's link over its art, two coloured words at 4.2–4.5:1 on glow
  tints) → round-2 fixes (the colour-mix ground at 65 %, words to 6.6:1, run-time ink as an sRGB mix, the two hand rules)
  → the same states audited again: clean; the full Light audit again (every state at 390 and 1440): 14 findings, one
  distinct (a habit's area tag "· Wealth" at 4.2:1, a run-time gold) → run-time words mixed with 58 % black → those
  states and Today, Activity and Goals audited again: clean; round 3 parity on the final build: Chrome 51 of 51 plus
  light-redo-af and rail-lane-af (60 passed, 10 skipped), WebKit 6 of 6; the report (`docs/verification/session-af/theme-parity.md`):
  114 rows, 0 disallowed differences of this lane's files, 8 known (wiring item 2), 0 element mismatches.

## Open items
- **Gold words by day:** `--pillar-wealth-ink` is `#75560e` (the same hue as `#ffd27a`, deepened to 6.6:1); it reads
  olive-brown (e.g. Earn's "0 of 6 steps done", gold labels). The brief's rule is followed (no amber shift); the owner's
  look to decide.
- Gradient headings keep their pastel nebula stops on white (the owner's rule): their right-hand part is below 3:1 by
  design ("Today's focus", "Your coach", "Life balance").
- Gate C's three-theme audits at every width are the lead's; this lane audited Light at 390 and 1440 (every state).
- The chip row's fade is always on (it shows only when the row is full).
