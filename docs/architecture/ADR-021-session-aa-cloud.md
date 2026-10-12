# ADR-021: Session AA-Cloud, "Every page in order + Goals, the calculator, search and Life review": session decisions

Status: **In progress** on `feature/session-aa-cloud`, from `main` `32cb9c5` (Merge #82, Session Z-Local; live as Alpha
deploy #37). This record holds every decision Session AA-Cloud took without asking the owner (the brief asks for the safest
option that keeps the project's promises), and the owner's own decisions. A parallel lane, Session AA-Local
(`feature/session-aa-local`), owns ZIGi, Habits, Health features, the game layer and onboarding; the two lanes talk through
`docs/handoff/AA_CLOUD_TO_LOCAL.md` and `docs/handoff/AA_LOCAL_TO_CLOUD.md`.

## Owner decisions (2026-10-11, plan approval, "Approve & auto mode")
- **The brief:** Part 0 records; Part 1 every page in order (first); Part 2 Goals G1–G8; Part 3 the compound interest
  calculator; Part 4 one search; Part 5 Life review and cross-pillar insights; Part 6 skeletons, Undo, offline, the data
  health page; Part 7 home-screen shortcuts and the share target (Tier 3); Part 8 Showcase and Today; three gates; one PR,
  merge commits only, Tier 3 in its own commits; never merge, deploy, dispatch, approve, log in or handle secrets; no new
  dependency; English only, USD and EUR only.
- **A1 approved** (the branch, below).
- **Plan edits (approved with the plan):**
  1. No silent descoping: every item ships working; what cannot be done as written gets the closest safe version, the
     reason here and a line in the report.
  2. A visible premium pass on every page (shared section headings, card/chip/button tokens, spacing, designed empty
     states with a first action, new features in their own designed cards); before/after captures for every page and
     feature at 390/1024/1440, Showcase and empty, on `review/session-aa-cloud-screens` with a "what's better" line each,
     self-reviewed against the design rules.
  3. Device-only goal extras stay consistent: delete, archive, restore and a sync replacement carry the extras, the vision
     image and sub-goal links; Export everything and its restore include them; owner item and Help line "kept on this
     device for now" until the finance-homes session adds them to sync.
  4. A rich Showcase: at least 30 days of history, two or three insights passing the 14-days-per-group rule, a 3-level
     goal tree, a vision board of at least 6 goals, an average goal with values, two calculator scenarios, a weekly and a
     monthly Life review.
  5. The calculator: large number fields plus sliders for rate and years, live results, a stacked area chart with a
     per-year tooltip and milestone markers, what-if as overlaid lines with a legend, chart first on phones after the
     result figures; `decimal.js` confirmed as a runtime dependency before use.
  6. Today's final order names places for AA-Local's habit time-of-day widget, game card and Health coach card.
  7. Lean usage: the three Gate C agents run once each, one after another.
  8. Part 0 notes that Z-Local's PR description stayed in draft wording (the owner marked it ready by hand).

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| A1 | — | The owner-named branch `feature/session-aa-cloud` is used (as ADR-018 Y1); the harness's designated branch is the fallback only if the git proxy refuses the name. | The owner named the branch in the brief; AA-Local looks for it there. |
| A2 | — | The sandbox shipped Node 22.22.0; Node 24.19.0 (`.node-version`) was fetched from nodejs.org, checked against the release's `SHASUMS256.txt` (OK), unpacked to `/opt/node24` outside the checkout and put ahead of the sandbox's Node. | Release compatibility is only established under the pinned Node (CONTRIBUTING). |
| A3 | all | **No synced schema changes.** `privateGoalSchema` (`lib/positions.ts`) is strict with four goal types and is synced in the finance section; settings v1–v3 (`lib/dashboard-settings.ts`, synced) hold strict widget kinds and built-in ids. Adding a field, a fifth goal type, a widget kind or a built-in id there would make #32–#37 readers refuse the whole store. Every new record this session lives in a device-only, loose (`z.looseObject`), versioned key; Today's new widgets and "Today's focus" live outside the synced placement. | Older builds keep reading every goal and every Today layout byte for byte; the owner's "no sync changes" holds. |
| A4 | 1 | The progress slot is a module-level registry with `useSyncExternalStore`, whose server snapshot is always empty: a card registered in the browser appears right after hydration and never causes a hydration mismatch. The same registry serves four named places for AA-Local (`today:habit-time`, `today:game`, `today:coach`, `review:coach`). Habits' own slot line is AA-Local's to place (Habits stays untouched here). | One small API for every place AA-Local fills, no edits to either lane's files after this PR merges. |
| A5 | 1 | **The system UI font, named explicitly.** `body` asks for `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Liberation Sans", system-ui, sans-serif` (no Inter, no download). Apple devices draw San Francisco, Windows Segoe UI, Android Roboto; on Linux (CI's runners and this sandbox) Arial resolves to Liberation Sans in Chrome and WebKit alike, so the pixel checks of C56 (ZIGi's title at its 11 px floor, Settings' name at 320 px) measure the face Z-Local's fontconfig rule pinned, without depending on that rule. `system-ui` comes after Liberation Sans so a Linux desktop's own UI face (DejaVu, Cantarell: the wide faces C56 measured) is never reached on a machine that has Liberation. | The brief: CI and devices render alike, the 11 px floor kept, the cause fixed in the app. |
| A6 | 1 | **Readable muted text and disabled controls.** One token, `--text-muted` `#bccadf` (`--muted` points at it; was `#a1afc8`); disabled buttons fade to 0.66 opacity (was 0.48), which measured 4.36:1 on real pixels for a disabled secondary button (`tools/pixel_contrast.py`, before) and now reads ≥ 4.5:1; phone tab labels and the Showcase banner's label 13 → 14 px. A scan of every page at 390 and 1440 px (Showcase and new device) found no other text under 14 px in `main`. | The brief's floor (labels ≥ 14 px, ≥ 4.5:1 measured on pixels). |
| A7 | 1 | **Today's new order changes only the default.** `DASHBOARD_BUILTINS` is reordered (the day's items first) and the whole-life overview follows the person's widgets (`DEFAULT_MAIN_TAIL`); ids, the stored placement's shape and `reconcileDashboardPlacement`'s rules are as before, so a placement saved by any build reads the same everywhere. Group headings ("Your day", "Goals", "Money", "Your widgets", "Your whole life") are rendered only while Today keeps its default order (no stored placement) and is not being arranged; a person's own arrangement shows exactly as saved. | "Respect the person's own order where they set one"; no synced format change (A3). |
| A8 | 1 | **Today's focus is new, not a widget.** It sits outside the synced placement (so no built-in id is added), reads the stores Today already reads, stores nothing, and holds the reminder cards that were directly under the hero (moved, unchanged), the fasting card while a fast runs (moved from For you), and four tiles; one-tap water uses Health's own `addWater`/`removeWater` with the shared Undo toast. A brand-new device sees the welcome first and no focus. | A first-screen answer to "what is due now" without touching synced settings or AA-Local's files. |
| A9 | 1 | **For you in two places, one computation.** `TodayForYou` hands out its parts through a `render` prop: the fasting card to the focus, the day's cards to "For you" after the widgets, What's new, the weekly review and the wrap-up to "Updates and summaries" at the end. Same cards, same priorities, same fold. **On a phone both areas keep every card behind their one row** (`TODAY_FOR_YOU_OPEN`, was one open card): Today's focus now does the top-of-page job, and the Today screen-count ceilings (`today-screens.spec.ts`, unchanged: Showcase ≤ 9.7, local ≤ 4.2 / 3.85) hold: 8.93, 3.70, 3.70 (were 9.6, 3.95, 3.59 on `32cb9c5`). Computers and tablets keep two open. | Nothing removed; the owner's order; the ceilings are never raised. |
| A10 | 1 | **"Make Today yours" in the Showcase** waits folded at the end of the main column on a phone; on a device that has not chosen a layout it stays at the top as the first action. | The Showcase is onboarded-off by design; its 567 px prompt was the first thing under the hero on a phone. |
| A11 | 1 | **Staking on a phone** renders the wallet and scenario tools after the positions in the DOM (not by CSS order), so reading, focus and visual order agree; the desktop rail is unchanged. | WCAG 1.3.2 and 2.4.3. |
| A12 | 1 | **Settings keeps its group order** (Data & privacy first, as its hero "Your data. Your control." promises); the in-page index becomes sticky on computers and tablets. Help's ZIGi section eyebrow is written as ZIGi writes its name (mixed case, 15 px) on phones, which fits one line; in capitals it needed two lines at any readable size. | Least churn for an already-logical page; the name's own spelling. |
| A13 | 1 | **The premium pass is CSS-level and shared:** section titles on every page except Habits take the white → nebula heading (`components/ui/premium.css`), new sections use `SectionHeading`, the Undo toast and the skeleton/empty-state styles live in `components/ui/ui.css`. Habits' `.habit-section-heading` is not touched. | One look across pages without editing each page's markup or Habits. |
| A14 | 2 | **G1 reads only recorded progress:** a tracked goal's own contributions (in minus out, reward income out, other units skipped as "On track?" does), shifted so the last point is the counted value; the least-squares pace over the last 180 days; at least 3 records over 14 days, else "Not enough history yet"; the range is the pace of the window's earlier and later halves; growth is never assumed and every forecast reads "An estimate from your pace so far, not a promise". The goal page had no chart, so G1 brings a small one (recorded line, dashed "at this pace", the range band, a table behind it), drawn at its measured width so its labels stay 14 px. Project goals (milestones) and local-simulation goals get no forecast (they record no pace). | Honest numbers; the brief's "forecast line on the goal chart" where no chart existed. |
| A15 | 2 | **One device key for all goal extras** (`zigoals:goal-extras:v1`: area, why, obstacle, if-then, parent, vision, story, template; custom areas; habit areas) instead of a separate `life-areas` key as the plan listed. | One record to export, reconcile and read; still device-only, loose and versioned. |
| A16 | 2 | **Consistency (owner plan edit 3) by dormancy:** extras of a goal this device no longer shows are moved aside for 90 days and come back if the goal does (a restored backup, a sync that brings it back); after 90 days they and their photo are dropped. Reconciling runs only on Goals, only after every goal store read cleanly, never while one is unreadable. Replaced or removed photos are deleted at the next Goals visit (so Undo can bring them back meanwhile); never from the Showcase, whose extras live in the tab. | "No orphans, no lost images, a restored goal finds its extras", without deleting anything on a transient read. |
| A17 | 2 | **Photos stay on the device:** compressed with a canvas (≤ 1600 px, JPEG, ≤ 300 kB, steps down in quality and size), IndexedDB `zigoals-vision-v1`, per account scope, ≤ 30 MB and 200 photos; the Showcase keeps none (its visions are gradients). `img-src` already allows `blob:`; no CSP change. | Privacy and storage limits; no new egress. |
| A18 | 2 | **G8 average goals live in their own device key** and show among Goals' cards (and on the board and the tree) as a fifth kind; a day without a value is left out, the person's own entry wins over Health's for that day, and the average says how many days it rests on. | The synced goal record's four types stay byte-identical (A3). |
| A19 | 2 | **G6 money templates name no amount** (as Session W's ideas); counts that define a template ("12 books", "100 days") are its milestones; average templates carry a common target the person can change; the weight template opens Health goals. Suggested habits are made through Habits' own `createHabit` only if the person ticks them. | Amounts are always the person's own; Habits stays AA-Local's. |
| A20 | 2 | **G7's Hall** lists finished tracked goals (finish day from the goal's own "completed" step; an older record says "Finish day not recorded") and finished average goals; card titles are not headings (the goal's own card already is). Share images are drawn on a canvas and saved or handed to the device's share sheet; nothing is uploaded. | Honest dates; no duplicate headings; no egress. |
| A21 | 2 | **The Showcase carries Part 2 without changing its synced records:** areas, gradients, three plans, a three-level tree ("Launch my creative studio" → "Create 2 hours a day" → "Sleep 7 hours a night"), two finished average goals, 30 days of creative-hour entries; the finance record (six goals, 13 positions) is untouched so every earlier Showcase check still reads the same numbers. | Rich Showcase (plan edit 4) without moving pinned figures. |
| A22 | 2 | **"Export everything and its restore include them":** the export carries the extras, the average goals and the photos (`vision/<id>.jpg`). Export everything has no restore in this app (it is a readable copy); the restore of these three records is built with the data health page (Part 6). | No silent descoping (plan edit 1): the closest safe version now, the restore where the data page lives. |
| A23 | 1 | **Today's order keeps Run10's approved hierarchy:** the whole-life overview (key figures) leads the widget area under "Your whole life", then "Your day", "Goals" (the attention agenda first), "Money", "Your widgets". The group headings open their group's first card (never movable items of their own); For you's parts render into three fixed places (portals), so the hero mounts once per visit. Wealth keeps "Allocation and coverage" last and Goals keeps "Milestones ahead" last (their bottom sections since the UI design pass). Found by Gate A's CI. |
| A24 | 2 | **Goals' header keeps one action** ("+ Create a goal"); the key figures and the Cards / Vision board / Tree switch open the "Your goals" region under the controls row (the compact header of Z-Cloud stays); templates are reached from their section, the balance wheel's empty state and search. |
| A25 | 3 | **The calculator:** exact decimal maths (decimal.js, already a runtime dependency) period by period; contributions and compounding at their own frequencies (each contribution period earns (1 + r/n)^(n/k) − 1); start/end timing; a yearly rise; inflation shown as today's money; what-ifs ±2 points, five more years and one return of the person's choice; milestones 10k / 100k / 1M in the plan's own currency. Results never stored: a scenario keeps inputs only (`zigoals:calculator:v1`, device-only, up to 12). "Turn this into a goal" opens the wizard with a Value goal (name, whole-unit target, currency, a date the plan's years from today, the contribution ready for a plan) and says the target is an estimate. Wording never advises. |
| A26 | 3 | **Weights within budgets (never raised):** Goals' new sections, the Undo toast's view, Quick add's sheet body (loaded once the page is idle) and the average goals' Health readers load after the page; the calculator's Wealth card computes nothing. |

## Handoff applied (from AA_LOCAL_TO_CLOUD.md)
Read at each gate on `origin/feature/session-aa-local`. **Gate A:** its head `682bf199` (Part 2, the game layer), read 2026-10-12.
| Ask (AA-Local's entry) | State here | Where |
|---|---|---|
| 1. Mount `<GameSetting/>` in Settings → Your pages & buttons | **A named place instead of an import:** `Slot place="settings:your-app"` under Your pages & buttons; AA-Local registers its switch there (`registerSlotCard`). Importing a file that exists only on its branch would not compile here. | `app/app/settings/page.tsx`, `components/progress/slot.tsx` |
| 2. A "Journey" entry in the sidebar, More and search, only while the game layer is on | **Applied as a registry:** `components/nav-extras.ts` `registerNavExtra(['/app/journey','Journey',icon])` puts it before Settings in the sidebar and More (and the search palette, Part 4); AA-Local registers it while its layer is on and removes it when off. | `components/app-nav.tsx` |
| 3. A "Reminders" link to `/app/settings/reminders` beside the push settings | **A named place:** `Slot place="settings:reminders"` right under the push reminders panel; AA-Local registers its link there (the route exists only on its branch until it merges). | `app/app/settings/page.tsx` |
| 4. Today's slots | Nothing to do (the places exist since Setup). | — |
| 5. Swipes on goal steps | **After AA-Local's Part 4 merges** (the hook is not on `main`); owner item at merge for the second merger. | — |
| 6. Emit, never render celebrations | **Applied:** a finished average goal emits `goal_funded` (the funding flow and milestones already emit theirs); `achievement_unlocked` and `level_up` exist only on AA-Local's branch, so they wait for its merge (the second merger adds the call in `AverageGoalDetail` and the Hall). | `components/goals/average-goals.tsx` |
| Life areas: `lib/goal-extras/areas.ts` with `DEFAULT_AREA_IDS`, `AREAS`, `readLifeAreas`, the key | **Applied:** the module exists; **the key differs from the plan's draft:** custom areas live in `zigoals:goal-extras:v1` (`areas`), not `zigoals:life-areas:v1` (A15). Told in the handoff so the mirror reads the right key. | `lib/goal-extras/areas.ts` |
| Habit areas in `zigoals:habit-extras:v1` | **Read, never written:** the balance wheel takes a habit's area from that record first (`habitAreasFrom`), then the Showcase's own field, else Habits & Mind. | `lib/goal-extras/areas.ts`, `lib/life-balance.ts` |
| Shell: mount `<GameRegistrar/>` once | **At merge:** the component exists only on AA-Local's branch; the second merger adds one line to `components/shell.tsx`. Until then AA-Local mounts it on its own pages (as it says). | owner item at merge |

## Freeze check: differences expected
Filled per part; Gate C adds the measured counts.

## Assertions changed (deliberate, listed)
- **Part 1, Today's default order (as strict):** `lib/dashboard-settings.test.ts` expects the new default main order
  (`whole-life, habits, health, attention, goals, next-action, funding, needs-attention, watchlist, progress, summary`,
  then the widgets at `main.slice(11)` as before). A first version put the whole-life overview after the widgets; Gate A's
  CI showed it broke Run10's approved hierarchy (the life card before the attention agenda, the agenda before Your goals:
  `run10-restored-today`, `run10-widgets`, `ui-design-pass` Part 2), so the overview leads Today again and those
  assertions stand unchanged (A23).
- **Gate A fixes (as strict):** `phone-pages.spec.ts` expects Wealth's new phone order for the first six
  (`pulse, holdings, have, accounts, composition, mix`; it had `composition, mix, watchlist` after `have`), its last card
  stays `wealth:allocation`; `ui-evidence.spec.ts` moves Wealth's first card, which is the pulse on every screen now (it
  was "The shape of your wealth" on a computer); `ui-design-pass.spec.ts` Part 2 announces "position 3 of 7" (the
  Showcase's two average goals are cards of the same collection; it was 5); `zigi-help-settings.spec.ts` opens Today's
  "Updates and summaries" fold on a phone before the What's new card (mechanics, every check unchanged).
- **Part 1, For you on a phone (as strict):** `tests/for-you.spec.ts` expects exactly no open card on a phone (all behind
  the row; was "at most one, at least one"); computers and tablets keep "at most two, at least one".
- **Part 1, cards that moved to "Updates and summaries" (mechanics, assertions unchanged):** `weekly-review.spec.ts`,
  `today-v2.spec.ts` (the wrap-up), `persona-x.spec.ts` (the review offer), `guide.spec.ts` (the review's last step) and
  `whats-new.spec.ts` (every check of the card) open that region's fold instead of For you's; `timezone-phase4.spec.ts`
  scopes its fold to For you (Today has two folds now).
- **Part 2 (mechanics, assertions unchanged):** `goals.spec.ts` picks the scenario's dropdown by its label ("Assumed annual
  return"), because a goal's page now also has "Part of a bigger goal"; `lib/goal-forecast.test.ts` (new) pins the steady
  pace's own sentence.

## Rejected options
- Adding goal extras to `privateGoalSchema` or a fifth goal type to its enum (A3): older readers refuse the store.

## Consequences
Areas, visions, sub-goals, why/obstacle/plan and average goals stay on one device until the finance-homes session adds them
to sync (owner item).
