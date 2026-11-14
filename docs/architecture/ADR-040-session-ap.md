# ADR-040 — Session AP "READY FOR FRIENDS" (2026-11-14 onwards)

**Status:** accepted (owner approved the plan once, 14 Nov, with five additions below). **Branch:**
`feature/session-an-ci-tooling` ([PR #102](https://github.com/reyals1111-ux/ZIGoals/pull/102), retitled "Session AN + AO + AP";
Draft). PR #101 had not merged at AP's start (main `c65882f3`), so no main merge was needed. **Resume file:**
`docs/handoff/AP_RESUME.md`.

## Owner additions with the approval (14 Nov, verbatim)
1. Mood tags, symptoms and any other health-type record stay private like Health: ZIGi and NOVA cannot read them until the NOVA lane wires them behind the existing Health switches (Q14/Q16); record that for AM-2. Export, backup, restore and erase include them.
2. Borrowed features use ZIGoals' own design and words: no competitor names in the UI, no look-alikes (the activity rings in pillar colours and ZIGoals' own shape, never Apple's three-ring look or the names Move/Exercise/Stand).
3. GPX/TCX imports: a file size limit, safe parsing (no network, no external entities), field-error messages for bad files; covered by the security review.
4. Launcher auto-tuck: hysteresis so it never flickers while scrolling (it changes only after the overlap state has held ~150 ms), never moves focus, and costs nothing measurable at CPU 4×.
5. Before the final STATUS commit: check whether PR #101 has merged; if it has, merge main in first (merge commit; both sides' registry entries; theme sheets regenerated; WebKit shard lists).

Also approved as written: the six new records, `zigoals:day-goal:v1`, the "min(N, the day's dots)" reading and the 18
competitor features.

## The approved plan (verbatim)

### Context
PR #102 (AN + AO, head `ca2678d7`) is red on run 1706: five specs and the route-weight check. PR #101 (AM-2, NOVA) has
**not** merged (main is still `c65882f3`), so there is no main merge to do now. AP continues on
`feature/session-an-ci-tooling`, retitles #102 to "Session AN + AO + AP" (Draft stays), gets CI green first, finishes
what AO carried, replays the service rows honestly, builds the three 14 Nov owner decisions, prepares the friends Alpha
(code and docs only) and builds a ranked set of competitor features. Decisions go to
`docs/architecture/ADR-040-session-ap.md`; resume state to `docs/handoff/AP_RESUME.md` after every part.
Lane fence (AM-2) as in the brief. `components/ai/ai-launcher.tsx` is the only `components/ai` file AP edits.

### What approval covers (nothing else needs one)
- **New dependencies: none. New outside services in the app: none. Wallet, signing, keys: unchanged.**
- **New Worker (OFF until the owner deploys it):** `workers/weather-proxy` (Part 5). Not bound, not routed, not in any
  wrangler config the deploy workflow uses; the app client is the NOVA lane's (recorded).
- **New stored data (all additive, TIER 3 stored format; export, backup format 4, restore, erase, catalog; frozen
  readers #37–#54 pass, #55 added if deployed meanwhile):**
  1. `zigoals:day-goal:v1` — the optional "A day counts as done at N" rule as a list of dated changes
     (`[{from: 'YYYY-MM-DD', need: N | null}]`, null = all, i.e. today's rule). Its own device record, not a field of the
     `.strict()` settings record (the AO D5 lesson). Each day is judged by the rule in force on that day; days before the
     first change are judged by "all" forever.
  2. Competitor features that store something (Part 6, marked **[store]**): `zigoals:task-when:v1`,
     `zigoals:mood-tags:v1`, `zigoals:symptoms:v1`, `zigoals:money-tags:v1`, `zigoals:workout-splits:v1`,
     `zigoals:countdowns:v1` — each its own additive record keyed by existing record ids, never a new field in a
     `.strict()` record.
- **Interpretation of 4b "N of M":** N is a count of the day's Checklist dots; a day with fewer than N dots is done when
  all are done (so "4" reads "4 of 6" on a six-dot day and "3 of 3" on a three-dot day).
- **Branch:** the session's default branch is `claude/focused-cori-0307g6`, but the brief says to continue on
  `feature/session-an-ci-tooling` (PR #102), so AP commits and pushes there only.
- **Device-only display conveniences (not records; erase NOT_RECORDS):** Bento choice per page, launchers' auto-fold
  needs none, Settings open groups (already `settings-folds`, now default-folded).
- **Budgets:** only where a page is still over after the weight pass, its own line raised by its exact measured overage,
  ≤ 2 kB, reason in ADR-040 (owner decision 14 Nov). New features load on demand so no other line moves.

### Parts (priority order; commit + push after each part, ≤ 45 min apart)

### Part 0 — records (docs)
ADR-040 skeleton with this plan; AP_RESUME.md; STATUS AP header; PR #102 retitled.

### Part 1 — green and mergeable (TIER 3 CI where config; spec/app causes otherwise)
| Row | Cause found | Fix (equally strict) |
|---|---|---|
| theme-parity-af:15 /app folded (mobile) | **app**: Today's skip-link list (AO D-028, `components/dashboard/today-skips.tsx`) is filtered by a 1.2 s timer, so which links exist depends on when the page is read (Nebula 4 links, Dark 3: boxes swapped) | list recomputed when the page settles (MutationObserver + ResizeObserver, rAF-batched; still never while focused), so every theme reads the same list once settled |
| earn-dock:36, :71 (desktop) | **app**: the quiet celebration card (`components/game/celebration.tsx`, `.celebration-quiet` z 70, bottom-right 24 px) sits on top of the launcher column and takes its clicks | the quiet card sits beside the launcher column (right offset = launcher column width + gap at ≥ 901 px), never over it; spec keeps clicking the dock as a person would. Confirm the date dependence with Playwright's clock |
| earn-guide-zigi:54 (mobile) | after `reload()` the phone folds are opened before hydration (AO N-BN-05), so the Valdora link is not the live one | `openEarnFolds` waits for `data-app-hydrated` (shared helper `hydrated`) before tapping; same popup assertion |
| zigi-face-z:185 (WebKit mobile) | the composer's fill landed before/while the previous answer reset it: Send disabled | `say()` asserts the typed value and an enabled Send before pressing (re-typed only if the value was lost); if the app clears a person's draft when an answer lands, that is a ZIGi-panel bug → recorded for AM-2 (lane) |
| route weights (/app/habits +1.9, /app/earn +1.8, /app/agenda +0.7, /app/tasks +1.4 kB) | AO's shell-group chunk split | weight pass: find with the build's chunk map what each page loads for first paint; lazy-load below-the-fold parts, move constants into constants-only modules, avoid new shared chunks in the shell; only a page still over gets its line raised by the exact overage ≤ 2 kB |
Goal: one full CI run green on attempt 1 on the final head (a known intermittent gets one re-run; class-B WebKit
segfaults recorded only).

### Part 2 — what AO left (ADR-039 closing table and D16/D17)
- **D-088/N-BN-10 Settings folded by default:** one shared helper `tests/settings-open.ts` (`openSettings(page, group | anchor)`
  opens the group by its heading, or goes by a deep link which opens its own group); every spec that reaches into Settings
  moved to it (mechanical; 307 spec files mention /app/settings, most by deep link which already opens its group). App:
  `lib/settings-folds.ts` defaults to all folded except the deep link's group; remembered open groups per tab as now.
- **D-028 Today ≤ 90 Tab stops:** roving focus for the sidebar's link list (one stop; arrow keys; no visual change),
  habit rows as one roving grid, landmarks named; `tests/ao/today-tab-stops.spec.ts` guard tightened to ≤ 90.
- **Wizard review step order** (D17): the review step opens with the summary, rhythm fold after it.
- **D17 minors:** squashed 13–16 px checkboxes in the four older forms → 20 px boxes in 44 px rows; per-area "Perfect
  weeks" list labelled; Earn's path labels at 390; the two "Keep an average" hints; CSV Value/Unit as their own fields;
  Wealth chip row cut-off at 1440. (12–13 px notice text stays: T-069 owner decision.)
- **D-028/D-088 rows close only when reached in the UI** (fresh profile and Showcase, clock set).
- BN-022, D-003, D-090, DV-170 stay owner decisions (copy/visual calls); NOVA/ZIGi-answer rows stay with AM-2.

### Part 3 — the 32 "Needs a service" rows, replayed honestly
The helper's map: 16 rows go through the existing Miniflare topology (`scripts/run11/packaged-runtime.test.mjs`
pattern: the real app worker + market-coordinator + food-lookup with an `outboundService` that answers recorded
CoinGecko / Open Food Facts responses and refuses every other host); 8 chain rows (validators, positions, governance,
votes, Net APR, Staking times) through the same pattern extended with recorded `api.zigchain.com` LCD responses; logos
through a recorded image host. A new `scripts/run11/service-rows.test.mjs` (vitest + Miniflare + real Chrome, as the
integration job runs) replays each row with its widths/themes and Playwright's clock; fixtures live only under
`scripts/run11/fixtures/service-rows/`. Each row: Fixed (app change) / Holds (already right, now tested) / Carried.
Not replayable: DV-089, PR-035 (a model, NOVA/ZIGi lane), "provider inactive" (a deployment setting: runbook line),
BN-050/N-127/N-153 (nothing to replay), PR-018/NB-114 (on-device; already closed by AO).

### Part 4 — owner decisions (14 Nov)
- **a. Launchers fold into the edge while covering content** (computer widths ≥ 901 px): one shared watcher
  (`components/launchers/auto-tuck.ts`) checks, on scroll/resize (rAF, passive), whether the launcher column's box overlaps
  readable/interactive content under it (Today's right column at 1440 is the guard case); while it does, ZIGi, music,
  Checklist and Earn dock show their existing edge tabs (same tabs the person can choose today), and they come back when
  the overlap ends. The person's own "tuck away" choice always wins. Motion Off / reduced motion: no slide, an instant
  swap. No layout change. `ai-launcher.tsx` gains only the data attribute hook.
- **b. "A day counts as done at N"** (Settings → Checklist): off by default = today's rule exactly (every dot). On: a day
  is done at min(N, the day's dots), shown "4 of 6". Read by one helper (`lib/checklist/day-rule.ts`) used by the
  Checklist streak (`lib/checklist/streak.ts`), the flame, Journey's light and the XP quests. Stored as dated changes
  (record 1 above): never rewrites or re-counts a past day; applies from the day of the change. A line under the setting
  says so. Tests: byte-identical results with the setting off over the existing streak tests; a change mid-streak; Tokyo
  and Brussels with "My day ends at" set.
- **c. Bento view**: an optional "Bento" layout on the pillar overviews (Goals, Habits, Health, Wealth) and below Today's
  protected hero (the hero and slogan untouched): the same cards in a responsive tile grid (2–4 columns, large tiles for the
  first two), chosen with a "Layout: List · Bento" switch in the page header cluster; remembered per page on this device
  (`zigoals:bento:v1`, display only); default unchanged. Loaded on demand (no weight on the default path).

### Part 5 — friends Alpha readiness (code and docs only)
- **Send feedback** already exists (Help, Settings → Help & diagnostics; `lib/feedback.ts`). Add: theme, screen size and
  build commit to the previewed details; a "Copy diagnostics" button (clipboard, the same previewed text); "Send
  feedback" in the account/More menu so it is one tap from any page. Still never records or personal data (unit test
  over the block).
- **What's new for friends** (Help `#whats-new-alpha` and Today's card) rewritten for this release in short lines;
  **Known limits in this Alpha** (Help `#known-limitations`, last updated 5 Nov) brought up to date and honest
  (accounts/sync, push, prices, food lookup, model, weather, WebKit/iPhone notes), linked from Help's index and from
  the feedback block.
- **First run with zero data:** the existing first-run (Today's "Set up ZIGoals in about a minute" → `/app/welcome`,
  `components/onboarding/onboarding-flow.tsx`) is kept; after it, Today shows a calm "Your first five" card for a device
  with no records (a goal, a habit, a meal, a money record, back to Today), each step opening the existing form and
  ticking itself from the real records, gone once done or dismissed. Empty states on Goals, Habits, Health and Wealth
  checked to teach in one line and one button (fixed where they do not). Timed in a spec: all five in under two minutes,
  keyboard at 1440 and taps at 390.
- **Docs:** FRIENDS_GUIDE.md, FRIENDS_ALPHA_CHECKLIST.md, FINAL_ACCTEST_REDEPLOY.md and STAGE8_OWNER_RUNSHEET.md
  brought to the current code: NOVA sync section in private-sync `/v1/extras`, the `STEP_UP_REQUIRED` var, push
  activation, the weather proxy; one ordered owner step list with time estimates (`docs/friends-alpha/OWNER_STEPS.md`).
- **`workers/weather-proxy`** (TIER 3 Workers): GET `/v1/forecast?lat&lon` with coordinates rounded to 2 decimals
  (MET's own guidance), forwards to MET Norway Locationforecast `compact` with an identifying `User-Agent`
  (`ZIGoals/alpha contact@zigoals.app`), caches per rounded point until MET's `Expires`, revalidates with
  `If-Modified-Since`/`Last-Modified` (304), passes 203/429 honestly, never forwards the person's IP or headers, refuses
  other paths/methods/origins, CORS only for APP_ORIGIN, small per-IP rate limit (as other workers). Miniflare tests with a
  recorded MET response; `docs/run11/WEATHER_PROXY_ACTIVATION.md` runbook. OFF: no binding, no route, no app client
  (the NOVA lane wires the client later; recorded in ADR-040 and for AM-2).

### Part 6 — competitor features (built after approval, in this order)
A read-only sweep of the code found most of the usual candidates already built: natural-language task dates, recurring
tasks, p1–p4 and filters, subtasks, Pomodoro and focus, skip/pause/vacation, quit habits, habit stacking, weekly review,
"On this day", Year in pixels, Wrapped, frequent foods and recipes, micronutrients and net carbs, EWMA weight trend,
body measurements, gym routines and PRs, budgets with rollover, bill detection, cash forecast, merchant rules, split
transactions, the command palette, ICS/CSV/JSON export, imports from 20+ apps, streak freezes, challenges and the rewards
shelf. Left out on purpose: virtual pet (ZIGi is the companion, locked look; AL GAP-111), Notion databases (a product of
its own), anything with weather/location (NOVA lane), calorie expenditure (owner rule).
What ZIGoals lacks, ranked by value for a daily user (all on-device, no outside service, no model; **[store]** = a new
additive record of its own, TIER 3 stored format):

| # | Feature (from) | Where | Notes |
|---|---|---|---|
| 1 | **Hour grid with time-blocking** (Todoist, TickTick, Notion Calendar) | Agenda → Day | drag a task or habit to an hour; writes the task's existing due time; each day's load shown |
| 2 | **This Evening and Someday lists** (Things) | Tasks | **[store]** `zigoals:task-when:v1` (task id → evening date / someday); never edits the task record |
| 3 | **Eisenhower matrix** (TickTick) | Tasks view | quadrants from priority + due (overdue/≤ 2 days = urgent; p1–p2 = important); moving a card sets its priority |
| 4 | **Activity tags on moods + "what goes with your good days"** (Daylio, Bearable) | Mood check-in, Insights | **[store]** `zigoals:mood-tags:v1`; insight shows counts and "goes with, not a cause", needs ≥ 5 days each |
| 5 | **Symptom and factor tracker, severity 0–3** (Bearable) | Health | **[store]** `zigoals:symptoms:v1`; joins the existing cross-pillar insights under the same honesty rules |
| 6 | **Month-by-month cash flow, 12-month category trend, top payees** (Monarch, Copilot, YNAB reports) | Wealth → Spending | derived from the money log; months without records are gaps |
| 7 | **Tags on money entries** with filter and totals (Monarch, Copilot) | Money log | **[store]** `zigoals:money-tags:v1` (entry id → tags) |
| 8 | **"Ready to assign"** zero-based line (YNAB) | Budgets | this month's logged income minus what budgets hold; from records only, never a forecast |
| 9 | **Age of money** (YNAB) | Budgets | derived (first-in first-out over logged inflows/outflows); "not enough records yet" under 30 days |
| 10 | **Spending pace vs your usual month** (Copilot) | Spending | "by the 14th you usually have spent X; this month Y"; needs ≥ 3 earlier months; a comparison, not a projection |
| 11 | **Bill price-change notice** (Copilot, Monarch) | Upcoming bills | "went up 2.00 since March", from detected bills |
| 12 | **Activity rings from your own goals** — steps, active minutes, workout days (Apple Fitness) | Health, Today widget | derived; no calories (owner rule) |
| 13 | **Trends: last 90 days vs the last year** — steps, sleep, weight, resting heart rate where recorded (Apple Fitness) | Health | derived; shown only with enough days on both sides |
| 14 | **Running pace and per-km splits from GPX/TCX** (Strava) | Workouts | **[store]** `zigoals:workout-splits:v1`, computed when a file is imported; earlier imports keep their summary (never back-filled) |
| 15 | **Copy a meal to any day and meal** (MyFitnessPal) | Health food log | existing write paths (today only "copy yesterday") |
| 16 | **Food-logging consistency** — days logged this month (MacroFactor) | Health | derived |
| 17 | **Journal word count, writing streak, words this year** (Day One) | Journal | derived |
| 18 | **Countdowns: "days until"** (TickTick) | Today widget library, Agenda | **[store]** `zigoals:countdowns:v1` |

Each gets unit tests and a browser spec (fresh profile and Showcase, clock set), Showcase examples labelled as examples,
help answers, and loads on demand (no first-paint weight). A row that does not fit its stop rule is Carried with cause.

### Part 7 — finish
Fresh-helper security delta review (new records, the Worker, diagnostics/clipboard, imports) and fresh-helper UX review
(fresh profile + Showcase at 1440 and 390, Nebula/Light/Dark); fix findings; hosted verifier extended only
behaviour-preservingly if a new page needs it (TIER 3 release verifier); `docs/handoff/AP_DEMO_TOUR.md`; ADR-040
closing table; owner step list (merge + deploy + friends Alpha); STATUS entry as the final commit with CI on the final
head; ≤ 15-line report.

### Working method
- ≤ 5 helpers with short briefs (code + unit tests in parallel: weather Worker, service-row harness, competitor features
  by area); I alone run builds and browsers (Chromium, ≤ 2 workers, one production build per integration point).
- Before every push: lint, typecheck (`NODE_OPTIONS=--max-old-space-size=8192`), focused vitest (+ `vitest run scripts`
  when copy moves), theme sheets `--check`, frozen readers. New zigi-*/webkit-* specs into the shortest WebKit shard.
- Stop rules as in the brief. Never merge, auto-merge, dispatch or deploy. Usage pause → resume from AP_RESUME.md.

### Verification
Unit (`pnpm test`), lint, typecheck; browser specs per row on a production build (PUBLIC_ALPHA_UNDEPLOYED) in a fresh
profile and the Showcase with Playwright's clock; theme-parity + axe on changed pages; the service-row harness under
Miniflare; weather-proxy Miniflare tests; frozen readers #37–#54; weight check; CI on each pushed head, final head green.

## Decisions (D1…, recorded as they are made)
- **D1 (branch):** PR #101 not merged at start (main `c65882f3`); AP continues on `feature/session-an-ci-tooling` (the
  owner's brief names it), not on the session's default branch.
- **D2 (for AM-2, owner addition 1):** the new health-type records (mood tags, symptoms) are not in any ZIGi/NOVA context
  builder; the NOVA lane adds them behind the Health switches (Q14/Q16) when it merges.
- **D3 (for AM-2):** `workers/weather-proxy` is built and OFF; the app client is the NOVA lane's.
- **D4 (Part 1, CI 1706 rows; every assertion kept):**
  | Row | Cause | Fix |
  |---|---|---|
  | theme-parity-af:15 /app folded (mobile) | app: Today's skip-link list was filtered once by a 1.2 s timer, so its links depended on when the page was read (Nebula 4, Dark 3) | the list follows the page (first frame, changes under `#main`, resize; one check per frame; never while focused) |
  | earn-dock:36, :71 (desktop) | app: the quiet celebration card (z 70, bottom-right) sat over the launcher column and took the dock's click (a Showcase celebration due that day) | at ≥ 901 px the quiet card sits beside the launcher column |
  | zigi-face-z:185 (WebKit phone) | the words were typed while the previous answer was settling the composer; Send stayed off | `say()` presses once the box holds the words and Send is on (typed again only if lost) |
  | earn-guide-zigi:54 (mobile) | the CI trace shows the reload's folds opened and the click on "Open Valdora" taken (the link focused) but no tab; not reproduced (passes locally on the same build) | first sighting: recorded in CI_INTERMITTENTS; investigated again on a second sighting |
- **D5 (local proof):** on the Part 1 production build: earn-dock (3), earn-guide-zigi (2), zigi-face-z:185 (Chromium), theme-parity-af:15 (49 states × 2 projects) all pass; one parity state (/app · showcase, desktop) hit the 240 s limit under the 2-worker load (the recorded renderer-stall class) and passed alone in 21 s.
- **D6 (route weights, owner decision 14 Nov):** the weight pass brought every page under its budget without raising any
  line (production build, gzip -6): /app/habits 505.9 → 501.2 (504), /app/earn 497.8 → 491.7 (496), /app/agenda
  485.7 → 483.7 (485), /app/tasks 469.4 → 467.0 (468), shell 436.3 → 435.1 (447). How (a per-source-file map from one
  scratch build with browser source maps, not committed): the Checklist's zone helpers in `lib/checklist/zone.ts` (no
  record schema; Tasks and Agenda no longer load the Checklist schemas), a night's readings in `lib/sleep/night.ts` (Habits'
  Health links no longer load Sleep's schemas), the push module loaded by the reminder field only after the page shows,
  and Earn's three wider sections (governance, goal-linked stake, stablecoins) on demand with their anchors in place.
- **D7 (Part 2, D-088/N-BN-10 Settings folded by default):** on a computer or a tablet every group starts folded (heading +
  one-line summary); the groups a person opens stay open on this device (`zigoals:settings-open:v1`, localStorage, a display
  convenience listed in erase's NOT_RECORDS; AL's tab-only `zigoals:settings-folds:v1` is no longer written and is removed
  when Settings opens); a jump always opens its group. Phones keep their own list (unchanged). Specs: one helper
  `tests/settings-open.ts` (`openSettings` = go + press "Open all", as a person does; `afterGoto` for specs' own helpers);
  450 plain Settings visits in 250 spec files moved to it mechanically; deep links unchanged (they open their group).
  `tests/grok53/settings/d-088-settings-fold.spec.ts` rewritten for the folded start, the same checks (deliberate).
- **D8 (Part 2, D-028 Today ≤ 90 Tab stops):** Showcase Today at 1440 went 143 → 89. One stop each (roving tabindex,
  arrows/Home/End; nothing drawn changes): the sidebar's pages, the sidebar's Apps group, the theme radios (the radio
  pattern: the chosen theme is the stop, the arrows choose), Today's check-in buttons, favourites, the four pillars, the
  next money steps, the preset choices, Recent activity's events and the pace-forecast goals. The sidebar's roving code
  loads after the page shows (`components/ui/roving-later.ts`). Spec guard tightened 145 → 90; a disabled button (never
  in any Tab order) is not counted as an item to reach (deliberate). `o4-sidebar-apps` updated: the group is one stop.
- **D9 (Part 2, AO D17 minors):** the wizard's review opens with the goal's summary, the rhythm fold after it; checkboxes
  never squashed (`min-width` + `flex: none` globally); Activity's per-area Perfect weeks list named, each count says what
  it counts. The visual minors (Wealth chips at 1440, Earn path labels at 390, two "Keep an average" hints, CSV
  Value/Unit) go to the Part 7 UX pass with screenshots.
- **D10 (Part 4b, "A day counts as done at N"; TIER 3 stored format):** `zigoals:day-goal:v1` = dated changes
  (`{from, need|null}`, strictly increasing, ≤ 400; a full list refuses a change rather than dropping one). A day counts
  when `done ≥ min(N, total)` under the rule in force on that day; days before the first change use every dot forever.
  Read by the flame (`checklistStreak`), mendable days, and Journey's orbit badges (`checklistOrbitDays`); a Perfect orbit
  still needs every dot in order; the Checklist awards no XP of its own (AG), so XP is unchanged. "All dots lit" stays
  literal. The shell reads the record without its schema, and the reader loads only on a device that has the record.
  Registries: Export everything, backup format 4 (via export), restore ("Today and Life"), erase, catalog, onboarding
  (a setting: a device with only it is still new) — `lib/ap-device-keys.ts` + test. Spec: Brussels and Tokyo, 2 × pass.
- **D11 (route weights after Parts 2 and 4b):** shell 435.1 → 437.4 kB took four pages over (roving + the rule core +
  chunk overhead); the sidebar's roving code and the rule's reader now load on demand: shell 435.5; every page under its
  budget (goals 476.7/478, settings 530.1/531, agenda 484.1/485, tasks 467.4/468). No budget changed.
- **D12 (Part 4a, launchers fold into the edge):** `components/launchers/auto-tuck.ts` (loaded after the page shows) reads, on
  scroll/resize at most once a frame and three times after load, two points per launcher with `elementsFromPoint`; content
  = a control, text, an image, or a box narrower than 90 % of `#main`. The root attribute changes only after the new state
  has held 150 ms. CSS slides the column 40 px with the `translate` property (each launcher's own transforms untouched; the
  centre stays inside the window so every button can still be pressed); `:hover` and `:focus-within` bring it back; no
  transition under Motion Off or reduced motion; computers only, right side only (side=left untouched); the person's own
  "tuck away" edge tabs are separate and unaffected. Spec: `tests/ap/launcher-tuck.spec.ts` (fold over Today at 1440, no
  two changes within 150 ms during a frame-by-frame scroll, focus kept, reduced motion, phones none).
- **D13 (Part 4c, Bento):** "Layout: List · Bento" (one radio group; its name for assistive tech, 44 px tall) before the lock
  on Today, Goals, Habits, Health and Wealth, computers only, its own chunk. Bento = the page's main region's cards as tiles
  (`auto-fill` 340 px columns, `dense`; Today 260 px beside its rail, its cards' own full-row spans reset; the first two
  large from 1280 px). Today's hero is the same box in both views (spec). Remembered per page in `zigoals:bento:v1`
  (localStorage, display convenience, erase NOT_RECORDS). AO's header spec now also checks the switch's place.
- **D14 (verification method):** from Part 4 on, the integrator commits its own files and builds that commit in a separate
  worktree (`/home/user/ZIGoals-wt`), so the helpers' unfinished files never enter a build and every pushed commit is known
  to compile on its own (the lesson of c7e77e55).
- **D15 (Part 5, Send feedback's place):** feedback stays one tap from Help (#feedback) and Settings → Help & diagnostics.
  It is not added to the phone's More list (AO's one list for More and its preview, DV-274, pinned by specs) nor to the
  Alpha notice (a TIER 3 public-safety label the hosted verifier reads). The details add App, Theme and Screen; "Copy these
  details" copies the previewed text. Today's What's new card keeps its release (shared with the NOVA lane); Help's What's
  new lists this release's nine answers first (additive), and Known limitations gains six honest lines (14 Nov).
- **D16 (Part 6, carried):** (a) the priority matrix's mouse drag is not confirmed in headless Chromium after two attempts
  (dragTo, then a stepped mouse drag); the per-card move button (keyboard, touch) is verified; the drag test is not kept.
  (b) The orbits as a Today widget: a new widget kind would change the strict synced settings record (older builds refuse
  it); the orbits are on Health. (c) Someday tasks also show in Inbox/All and the menu shows no counts for the new lists
  (counting them would put the record's code in /app/tasks' first scripts, 0.2 kB from its budget).
- **D17 (Part 6, spec expectations moved, deliberate):** AO's send-feedback spec now expects nine detail lines (each new one
  by its shape) and 44 limitations (each new one by its words); the GPX limit line says what is still true (older runs keep
  their summary).
- **D18 (Part 6 weights):** every page under its budget after all 17 features (production build of 060fb196): health
  529.3/531, wealth 504.1/512, journal 454.2/458, agenda 484.5/485, tasks 467.8/468, shell 435.7/447. No budget changed.
- **D19 (Part 3, the service rows replayed on screen):** `tests/ap/service-rows.spec.ts` with `AP_SERVICE_ROWS=1` on the
  production build: 17/17 tests, covering TK 'Current' badge, D-262, D-200, TK-6B-06, TK "Unformatted prices", M10,
  TK-203, W15, D-052, D-079, D-176, C-DVG-35, MO-007, C-MO-01, C-BN-01, C-DVG-67, C-BN-05, C-DVG-69, C-BN-06, C-BN-11,
  C-BN-12, BN-081, N-BN-17, X3-29 (Staking and Chess). One app bug found and fixed (C-BN-06: the validator line's raw
  status code and float rate). Spec choices: drift is seen on the load after the device's cached quote ages out (the cache
  emptied, not the clocks moved: the coordinator judges freshness on the real clock); themes chosen with the app's own
  theme radios. Not replayable: DV-089, PR-035 (a model; NOVA lane), the barcode provider's activation (a deployment
  setting; OWNER_STEPS.md). Kept off CI's browser shards (they do not start Miniflare); the API-level test runs in
  `pnpm test`.
- **D20 (Settings folded, two refinements after CI 1711):** (a) the group with the Showcase card ("Your app") starts open
  while the Showcase is on (its "Return to my data" first, AL's rule) and on a device with no record of its own yet
  (Settings → Load Showcase Demo is a new person's first step; FRIENDS_GUIDE says so); every other group folds. (b) A deep
  link whose section loads late (ZIGi's settings) opens its group when the section arrives. (c) **Lane fence:** Part 2's
  mechanical spec move had touched 15 fenced specs (`tests/zigi-states.spec.ts`, nova-*, p1-/p3-nova-*, grok53/hud/*);
  all restored byte for byte to `ca2678d7`; (a) keeps their Settings → Load Showcase Demo step working untouched. Seeds
  that visit Settings only to write storage went back to a plain visit (122 places): opening groups there changed the
  seeds' timing (ZIGi's settings body loaded before the seeded values).
- **D21 (Part 7, security delta, fresh reviewer):** nothing Critical or High. Fixed: Medium (the weather proxy's global
  MET budget, 300 calls a minute across all clients), Low (a crafted TCX keeps its summary without splits), Info (id
  hygiene in task-when and workout splits; Copy says so when the browser has no clipboard). Recorded only: impossible
  day-goal dates compare harmlessly as strings; bidi/zero-width characters in a person's own tags affect only their view;
  the weather cache's synthetic path holds a public forecast. AI isolation of the health-type records confirmed (no
  import in lib/ai, components/ai, lib/nova, components/nova). The hosted verifier change confirmed behaviour-preserving.

- **D22 (Part 7, UX review, fresh reviewer: fresh profile + Showcase, 1440 and 390, Nebula/Light/Dark):** one Blocker,
  five Major, several Minor. **Blocker (Bento):** cards that hold their own multi-column grid (goal cards, holdings, habit
  cards) were squeezed into 340 px tiles. Fixed (2efd76d4, 4a5a6736, 2c86e8e1, 5a97ff13): the page's own header and every
  card with its own grid keep the whole row (marked by the switch, measured in the list layout and again once the page
  settles); only self-contained cards become tiles (480 px, 300 px on Today); the spec checks no card under 300 px, no
  overlap, the header's width kept, side by side on Today/Habits/Health. While fixing it, reading a grid's columns inside a
  closed `<details>` (not rendered) crashed Chrome 153's renderer on Goals and Wealth: Bento now asks only laid-out grids,
  and the tile grid is marked by the switch (no `:has()` over the page). **Major, fixed:** Budgets' Remove wrapped
  (nowrap); Wealth's chip row cut at 1440 (gap/padding); Earn's path labels at 390 (wrap, scoped); the two "Keep an
  average" hints (one now; `life-p15b` spec updated on purpose); a skipped setup now leads to the first five (its links
  44 px; on a phone the meal step opens the meal sheet). **Minor, fixed:** day-goal select width; Today's Showcase card count
  in `showcase-today-aa` (seven, with Countdowns). **Minor, carried (copy/visual calls for the next pass, no defect):**
  Health's fold label repeated as the section heading; the category sparkline with fewer than three months; Age of money's
  explanation order; Agenda by-hour checkbox contrast in Nebula (passes 3:1 for non-text, reviewer asked for more);
  the "YOUR APP" eyebrow repeated in Settings; Help's "bill changes"/"trends" words vs the cards' "Price changes"/"Trends";
  the Showcase has no examples yet for mood tags, symptoms, run splits and bill changes; CSV import's Value/Unit as two
  fields (`weight-csv-import`).

- **D23 (CI 1726 fallout, owner rule on budgets):** run 1726 on `f28d25d3` found (a) the UX note "a skipped setup should
  lead to the first five" contradicts AL's accepted rule (NB-002/NB-033: an empty device that said "Not now" still lands
  on the setup entry): AL's rule kept, the change reverted, the note answered by it; (b) Health and Wealth on a phone over
  their screen ceilings (8.36 of 8.2, 10.06 of 10.0) after Part 6: "Copy a meal" now sits with logging a meal (in its sheet
  on a phone), the symptom tracker with the day's mood (one folded row on a phone), and Wealth's six "Your money over time"
  views are one sideways row on a phone; no ceiling moved; (c) a Settings jump to a part of ZIGi's section that is drawn
  later, by a same-page address change, left its group folded (zigi-part-boundary, zigi-memory): every jump (arrival, link,
  router, back and forward) now opens its group, waiting for a late target; (d) specs that seed records and then use
  Settings open its groups (LS-025 and seven more of the same shape). **Budget:** after four weight passes on Settings this
  session, the jump fix (every jump opens its group, also for a target drawn later) and the launcher wording in Help left `/app/settings` 44 bytes over; its
  line is raised by exactly that (531,000 → 531,044 bytes), as the owner's rule allows (≤ 2 kB, the exact overage, reason
  here). No other line moved.

- **D24 (CI 1726 fallout, the complete run after D20 and Part 6):** (a) **Bento's switch moved** from the header cluster to
  "Arrange this page" (the bar the layout lock opens): in the header it pushed the lock onto a second line at 1280 on Habits
  (ui-design-pass Part 18.4) and made the header hide its honesty mode strip on Today (honesty-banners). A part that draws
  nothing stays with the lock and applies the chosen layout; Help, FRIENDS_GUIDE and the demo tour say "Unlock layout →
  Layout: List · Bento"; header-consistency is back to AO's version. (b) **Settings jumps in specs:** a fragment set on Settings
  before the page is live is dropped by the router's first history write (Next's own, with no event app code can see; two
  in-app ways to keep it were tried and removed); a person cannot jump before the page shows, so the 125 seed visits now wait
  for the page to be live (zigi-part-boundary, zigi-memory, bn-022, bn-114, se2, j06, customize-aj). Jumps made once the
  page is live open their group, also for a target drawn later.
  (c) The activity list's links lost the tablet 44 px rule (`a:not([class])`) when the roving group gave them a class; the
  group now finds them by position. (d) **Deliberate spec moves:** the sidebar Tab-order specs (page-marks,
  release-review-2-p2) walk the roving groups (Tab in, Home, arrows; every item still checked in order); run9-2 lists
  Settings' open groups as a display choice beside Markets' view; seeded specs that reload open Settings' groups.
  (e) **Launchers (4a), a real bug found by earn-dock:72:** pointing at a tucked launcher, or pressing it (its focus), brought it
  back, which moved it 40 px from under the pointer (instantly with reduced motion) between press and release, so the press
  was lost and the button could flicker. Pointing and pressing now leave it where it is (it is pressed where it is); the
  keyboard focus (`:focus-visible`) still brings it back. (f) Specs that seed and
  read at once wait for the page to settle (local-simulation-backup reads the restore choices once offered, and its
  "before" once two reads agree); earn-dock presses once the page is live; the shared Settings helper waits for Settings'
  own groups after an in-app link.

## Closing table
Totals (counted by item, not by row): Fixed 31 · Built 30 · Holds (replayed, already right, now tested) 22 · Owner decision 5 · Not possible 4 · Carried 16.

| Area | Row | Outcome | Evidence / cause |
|---|---|---|---|
| CI 1706 | theme-parity-af:15 (folded) | Fixed | skip-link list follows the page (c8063d86) |
| CI 1706 | earn-dock:36/:71 | Fixed | quiet celebration beside the launchers (c8063d86) |
| CI 1706 | zigi-face-z:185 | Fixed | Send pressed once words are in and Send is on (c8063d86) |
| CI 1706 | earn-guide-zigi:54 | Carried | first sighting, not reproduced; recorded (CI_INTERMITTENTS) |
| CI 1706 | route weights | Fixed | every page under budget, none raised (D6, D11, D18) |
| CI 1709 | bn-114:25 | Fixed | waits for the card's check (second sighting) |
| CI 1709 | zigi-voice-z:316, j06-data-safety:140 | Carried | first sightings, one re-run each |
| AO carried | D-088 / N-BN-10 Settings folded | Built | D7, D20; specs moved (one helper); deep links open their group |
| AO carried | D-028 Today ≤ 90 Tab stops | Fixed | 143 → 89 (90 with Bento's switch) (D8) |
| AO D17 | wizard review order | Fixed | summary first, rhythm fold after (51a1b603) |
| AO D17 | squashed checkboxes | Fixed | global min-width + flex none |
| AO D17 | Perfect weeks list unlabeled | Fixed | named list, counts named |
| AO D17 | Wealth chips 1440, Earn path labels 390, two average hints | Fixed | D22 (2efd76d4) |
| AO D17 | CSV Value/Unit as their own fields | Carried | D22 minor list (copy/field change for the next pass) |
| AO D16 | BN-022, D-003, D-090, DV-170 | Owner decision | copy/visual calls, unchanged |
| Service rows | TK 'Current' badge, D-262, D-200, TK-6B-06, TK "Unformatted prices", M10, TK-203, W15, D-052, D-079, D-176, C-DVG-35, MO-007, C-MO-01, C-BN-01, C-DVG-67, C-BN-05, C-DVG-69, C-BN-11, C-BN-12, BN-081, N-BN-17 | Holds | replayed on screen against the real routes/Workers with recorded upstreams (D19) |
| Service rows | C-BN-06 | Fixed | the validator line's raw status code and float rate (7e24a448) |
| Service rows | X3-29 | Holds | Staking times and Chess (its own recorded routes) |
| Service rows | DV-089, PR-035 | Not possible here | need a model (NOVA lane) |
| Service rows | barcode provider inactive | Not possible here | a deployment setting (OWNER_STEPS.md) |
| Service rows | BN-050, N-127, N-153 | Not possible | nothing to replay (AL) |
| Owner 4a | launchers fold into the edge | Built | D12 |
| Owner 4b | A day counts as done at N | Built | D10 (TIER 3 stored format) |
| Owner 4c | Bento view | Built | D13 |
| Part 5 | Send feedback details + copy | Built | D15 |
| Part 5 | What's new / Known limits | Built | D15 |
| Part 5 | Your first five | Built | spec: 17 s at test pace |
| Part 5 | friends docs + OWNER_STEPS.md | Built | 700203ec |
| Part 5 | weather proxy Worker (off) | Built | c66b65c9, 16/16 |
| Part 6 | hour grid · This evening/Someday · priority matrix · countdowns · journal numbers | Built | 060fb196 |
| Part 6 | cash flow/trend/payees · money tags · Ready to assign · age of money · spending pace · bill change | Built | 060fb196 |
| Part 6 | mood tags · symptoms · orbits · trends · run splits · copy a meal · food-logging days | Built | 060fb196 |
| Part 6 | priority matrix by mouse drag | Carried | not confirmed headless after 2 attempts (D16a) |
| Part 6 | orbits as a Today widget | Carried | strict synced settings record (D16b) |
| Part 6 | Someday counts in the menu | Carried | weight (D16c) |
| Fence | 15 fenced specs touched by the Part 2 move | Fixed | restored byte for byte (D20c) |
| UX review | Bento squeezes gridded cards (Blocker) | Fixed | D22 (2efd76d4, 4a5a6736, 2c86e8e1, 5a97ff13) |
| UX review | Chrome renderer crash reading an unrendered grid (found while fixing) | Fixed | D22 (2c86e8e1) |
| UX review | Budgets' Remove wraps | Fixed | D22 (2efd76d4) |
| UX review | skipped setup did not lead to the first five | Owner decision (AL's NB-002/NB-033 kept) | D23: the change reverted |
| UX review | first five on a phone: meal step | Fixed | D22 (2c86e8e1) |
| UX review | day-goal select width; Today Showcase card count | Fixed | D22 |
| UX review | seven copy/visual minors (CSV Value/Unit has its own row) | Carried | D22 list (no defect; next pass) |
| CI 1726 | first-run specs after "Not now" (5) | Fixed | D23a (UX change reverted) |
| CI 1726 | Health and Wealth phone length | Fixed | D23b (no ceiling moved) |
| CI 1726 | late Settings jump (zigi-part-boundary, zigi-memory) | Fixed | D23c |
| CI 1726 | LS-025 and seeded Settings specs | Fixed | D23d |
| CI 1726 | Bento switch in the header (lock on a second line, mode strip hidden) | Fixed | D24a (moved to "Arrange this page") |
| CI 1726 | Settings jumps made before the page is live (specs) | Fixed | D24b (seed visits wait) |
| CI 1726 | activity links under 44 px on a tablet | Fixed | D24c |
| CI 1726 | tucked launcher moved from under the pointer (earn-dock:72) | Fixed | D24e |
