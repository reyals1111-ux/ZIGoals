# ADR-039 — Session AO "EVERYTHING LEFT" (2026-11-13 onwards)

**Status:** accepted (owner approved the plan once, 13 Nov, with the two stored-data rules below). **Branch:**
`feature/session-an-ci-tooling` ([PR #102](https://github.com/reyals1111-ux/ZIGoals/pull/102), retitled "Session AN + AO";
#102 was not merged when AO started, so AO continues on it and AN's five commits stay as they are). **Resume file:**
`docs/handoff/AO_RESUME.md`.

## Owner rules with the approval (13 Nov, verbatim)
1. dayEndsAt: changing it never rewrites, re-dates or re-counts past records; it applies from the change on. A streak never breaks because of the change itself (the change day counts once, under the rule that favours the person). Say this in one line under the setting. Tested: change midnight → 3:00 → midnight with existing streaks, in Brussels and Tokyo and over a DST night.
2. Net-worth history: a snapshot is taken only on days the app is opened; missing days are shown as gaps, never interpolated or back-filled. An unknown price stays unknown (never 0) and the snapshot says which sources had no value. Each series keeps its currency and as-of time. The Showcase's example history is labelled and never mixed with real records. Erase removes it; export and restore carry it.

## The approved plan (verbatim)

## Context
PR #102 (Session AN) is **not merged** (main HEAD `c65882f3` = Merge #100). So AO continues on
`feature/session-an-ci-tooling`; PR #102 is retitled "Session AN + AO" (AN's 5 commits untouched; still Draft).
AO closes everything open outside NOVA: CI intermittents first (so merges go green on attempt 1), the seven owner
calls of 13 Nov, AL's carried rows (minus "Needs a service" and lane L7), "My day ends at", four backlog features,
then fresh reviews. Decisions go to `docs/architecture/ADR-039-session-ao.md`; resume state to
`docs/handoff/AO_RESUME.md` after every part.

**Lane fence (AM-2, PR #101):** never touched — `components/nova/**`, `lib/nova/**`, `lib/ai/**`, `public/nova/**`,
nova-*/p1-nova-*/p3-nova-*/hud specs, `tests/zigi-states.spec.ts`, `workers/private-sync/**`, `landing/privacy.html`.
Shared files only additively (export/restore/onboarding/vault/showcase-data/help/egress-policy/theme sheets/WebKit
shard lists/STATUS).

## Approvals asked with this plan (nothing else needs one)
- **New dependencies: none. New outside services / hosts: none. Wallet, signing, keys: unchanged.**
- **New stored data (all additive, optional, TIER 3 stored format; in export, backup format 4, restore, erase,
  catalog, frozen-fixture readers #37–#54 must pass):**
  1. `dayEndsAt` — optional field in the existing dashboard-settings private record (minutes after midnight, 0–360 in
     30-min steps; missing/0 = midnight = today's behaviour exactly). Travels with the person's settings (export/restore).
  2. `zigoals:networth-history:v1` — new private record: one snapshot per local day, per source
     (Wealth holdings / accounts / Portfolio / tracked wallets), recorded from the day it ships; never back-filled;
     capped (≈ 3 years of days); Wealth shows it with "since <date>".
- **Device-only display conveniences (not records; listed in erase NOT_RECORDS like `settings-folds`):** Wealth desktop
  folds, Settings folds now "folded by default" with remembered open groups (localStorage per device, as the owner asked).
- **Perfect day, week-grid logging, templates, Activity CSV:** no new stored shape (derived from existing records /
  existing write paths / static content / existing `csv-safe`).

## Parts (priority order; commit + push after each part and ≤ 45 min apart)

### Part 0 — records (first commit, docs only)
STATUS AO header + Part 0: AN (#102: 4 WebKit shards; glob/minimatch overrides, audit 0; third alert crypto-bigint
0.5.5 RUSTSEC-2026-0387, not fixed) not merged at AO start; AM (#101) and AM-2 in progress; owner's hosted verifier on
#54 PASS 12/12 (11 Nov); frozen readers #37–#54 (`scripts/frozen-readers.mjs` gains #54 = `c65882f3`, same line AM
adds; #55 added if deployed meanwhile). ADR-039 skeleton with this plan verbatim; AO_RESUME.md.

### Part 1 — CI stability (TIER 3 CI where workflow/config; specs and app causes otherwise)
Each with an equally strict wait (no assertion weakened), proven by repeat local runs (Chromium; WebKit rows by trace
reading — WebKit is not installable here) and then CI:
| Row | Fix at the cause |
|---|---|
| zigi-earn-coach-af:59 (WebKit) | URL wait through the view transition, `toHaveURL(…, {timeout: 15_000})` as zigi-knock |
| zigi-voice-z:199/221 | app: a press that lasted the hold time is a hold even if the timer fired late (CI_INTERMITTENTS Fix 2) + a blocked-main-thread spec |
| zigi-accept-correct:271 | class A navigation: shared helper waits for `data-app-hydrated` + 1 s without new resource entries before WebKit gotos |
| zigi-chat-polish:319 | poll the log height after the 900×500 resize until layout settles (≥ 200 kept) |
| fourth-pass-field-errors:106 | poll message-to-field distance until layout settles (< 80 kept) |
| a11y-wcag-x:49 / :268 | read colours after transitions finish (`getAnimations()` settled) |
| run11-route-mobile-acceptance:30, spending-ai:52, j05-notifications:74, j04-offline:23, for-you:8, settings-switches-sweep:45, exploratory-round3:66, zigi-part-boundary:42, webkit-earn:19, install-chrome.test:100, hud-perf:23, l6-fourth-chain:95, al-fourth-habits:193, part14-earlier Q24 (verify fixed) | read each trace/spec; fix the race at its cause (hydration wait, settled poll, `route.fetch` retry once, the shared `webkitCancelled` filter, the test-env attempt limit) |
Class-B WebKit segfaults: recorded only. Goal: a CI run green on attempt 1. (hud-perf belongs to the hud spec family
→ AM lane; recorded, not touched.)

### Part 2 — the seven owner calls (13 Nov)
| Call | Build |
|---|---|
| a RR-16 | Wealth desktop sections fold by default (headings as disclosure buttons), open state remembered on the device |
| b RR-17 / D-134 | Today: goal name once (hero unchanged; trim repeats in non-protected cards); Quick add offered once (keep the top bar's) |
| c T-069 | phone notice reads "On this device" (no ellipsis, no wrap; checked on every phone page incl. Showcase) |
| d theme switch @800 | Settings: Appearance group first (theme radios at top); sidebar unchanged (protected) |
| e header | one PageHeader cluster: same order/set on every page; layout lock in the same slot only where rearrangeable; Notes/Journal get logo + status row (no "Back to Today") |
| f Dark vs Nebula | Dark = flat near-black surfaces, no starfield/haze, same accents/contrast; Nebula keeps the sky; theme sheets regenerated; theme-parity stays a test |
| g B-083/M-131/M-104 | keep Undo, no confirm → closed as owner decision |

### Part 3 — AL's carried rows (CARRIED.md minus the 32 "Needs a service" ids and lane L7)
Fix / build / close each with evidence (fresh profile + Showcase, the row's widths/themes, clock set):
TK-036 years > 60 (to 100) · C-MO-36 fasting targets up to 24 h (the stop rule) · NB-114 fractional duration values ·
DV-045e Journey length (fold "earned" + history) · DV-040g/DV-056c ⋯ as real menus (role=menu/menuitem, arrow keys) ·
D-028 Today tab stops (skip links + landmarks, roving focus in grids) · D-055 long option names + Edit · DV-053c chess
rating number field · T-014 shorter wizard (Review merged into step 2, rhythm optional inline) · C-DVG-17/DV-046e/
DV-054d/C-DV-13/PR-100 Activity search + CSV export · DV-010c/NB-253 Fund goal in two screens · LS-067 ZIGi peek image
only when shown · D-088/N-BN-10 Settings folded by default (deep links open their group) · N-BN-05 Earn phone length ·
D-070/DV-223/DV-247 header icons with words at 388/768 · BUG-051 Portfolio table at 768 (card rows) · DV-274/NB-045
More preview rows · D-224/D-231 hover states · M-011/LS-H29 one limits table + duplicate-name notice · L-075 shares
rounded to 100 % (largest remainder) · PR-052 Edit money-log entry · B-201 no Edit on archived habit · C-LS-20 stacked
Undo where missing · DV-170, D-086, PR-018, C-DVG-51, D-037, BN-022, G-025, BN-134, D-003, DV-257c/DV-258c/D-194/D-013,
D-063/LS-H34/D-179/NB-075/DV-029a (via Part 2), DV-203/DV-226/LS-H39/N-NB-03 (via Part 2f) and the rest of the list.
Stop rule: 2 attempts per row, then Carried with cause.

### Part 4 — "My day ends at" (C-DVG-22, C-NB-28, N-NB-11) — TIER 3 stored format
One shared helper (`lib/day-boundary.ts`: `activityDay(instant, dayEndsAt, zone)` from wall-clock fields, so DST-safe)
used everywhere a "day" is counted: habits, Checklist (its day rule unchanged, only the boundary moves), streaks,
Journey, Today, reminders, `useLocalToday` for those surfaces. Setting in Settings → Appearance/Time ("My day ends at:
midnight · 1:00 · 2:00 · 3:00 · 4:00 · 5:00 · 6:00"). Default midnight is byte-identical behaviour (unit test over the
existing day tests). Playwright clock tests across zones (Brussels, Tokyo, New York, a DST night).

### Part 5 — backlog features
#1 Perfect day view + browsable history of past days (derived) · #4 logging + P&L row from the week grid's cells ·
#11 net-worth history by source (new record above; Wealth "since" line; never back-filled) · #15 150+ goal/habit
templates (English, honest, no health/money promises; searchable in the wizard). Left out with reasons: #3, #5, #6–#10,
#12–#14, #16–#18.

### Part 6 — finish
Fresh-helper security delta review (stored formats, imports/exports, CSV parsing, settings) and fresh-helper UX review
(fresh profile + Showcase at 1440/390); fix findings; hosted verifier extended only if a new page needs a stage
(TIER 3 release verifier, behaviour-preserving); `docs/handoff/AO_DEMO_TOUR.md`; ADR-039 closing table (every row:
Fixed / Built / Owner decision / Not possible / Carried + cause); STATUS entry as the final commit with CI on the
final head; ≤ 15-line report.

## Working method
- Helpers (≤ 5, short briefs: ids + one line): code + unit tests in parallel (e.g. templates content, Activity
  search/CSV, Dark theme, ⋯ menus, net-worth history); the integrator alone runs builds and browsers (Playwright
  Chromium, ≤ 2 workers, one production build per integration point). New zigi-*/webkit-* specs → shortest WebKit shard.
- Before every push: lint, typecheck (`NODE_OPTIONS=--max-old-space-size=8192`), focused vitest (+ `vitest run
  scripts` when copy moves), theme sheets `--check`, frozen readers.
- Stop rules as in the brief (2 attempts/row, 2/CI failure, one re-run for known intermittents, ≤ 15 min commands,
  CI polled ≤ every 10 min). Never merge, auto-merge, dispatch or deploy.
- After a usage pause: resume from `docs/handoff/AO_RESUME.md` without asking.

## Verification
Unit (`pnpm test`), lint, typecheck; browser specs per row on a production build (PUBLIC_ALPHA_UNDEPLOYED) in a fresh
profile and the Showcase with Playwright's clock; theme-parity + axe on changed pages; frozen readers #37–#54; CI on
each pushed head, final head green.

## Decisions (D1…, recorded as they are made)
- **D1 (branch):** PR #102 not merged at start (main `c65882f3`), so AO continues on `feature/session-an-ci-tooling`.
- **D2 (frozen readers):** #54 = `c65882f3` added with the byte-identical line PR #101 adds, so whichever PR merges
  second merges this file without a conflict.
- **D3 (Part 1, CI rows):** every fix keeps its assertion and waits for the real state:
  | Row | Cause | Fix |
  |---|---|---|
  | zigi-earn-coach-af:59 (WebKit) | view-transition navigation lands after the 5 s URL wait (AN, run 1686 trace) | same URL, 15 s wait (as zigi-knock) |
  | fourth-pass-field-errors:106 | boxes read once while the message's entrance/reflow moved (136 px) | the same two bounds polled ≤ 5 s |
  | settings-switches-sweep:45 part 2 | lazy() switch drawn after `data-app-hydrated` | re-scan polled ≤ 5 s before "gone or unusable" |
  | exploratory-round3:66 | typed before hydration, state replaced | `openNova` waits for `data-app-hydrated` |
  | zigi-part-boundary:42 | the spec's own `route.fetch` met a socket hang up | fetched once more on that error only |
  | spending-ai:52 (45 s timeout) | Quick add pressed before hydration opened nothing | press after `data-app-hydrated`; dialog visible asserted |
  | zigi-accept-correct:268/271 (WebKit class A) | goto cancels the launcher's idle imports started after networkidle | new `tests/quiet-page.ts` (hydrated + 1 s without a new resource) in the seed |
  | zigi-voice-z:221, webkit-earn:19, install-chrome.test:100 | (AL Fixes 1–3) | already in main (verified) |
  | l6-fourth-chain:95, al-fourth-habits:193, zigi-states:75 | — | fixed on PR #101 (AM lane); arrive with its merge |
  | hud-perf:23 | runner without GPU | AM lane (ADR-038 D39) |
  | zigi-chat-polish:319, a11y-wcag-x:49, run11-route-mobile-acceptance:30, j05-notifications:74, j04-offline:23, for-you:8, zigi-voice-z:199 | first sightings; the job logs' tails hold no failure detail and the traces expired | recorded; one re-run each; investigate on a second sighting |
  | WebKit class B segfaults | engine | recorded, not chased |
- **D4 (RR-17/D-134, call b):** "a goal's name once on Today" extends AL's R2-9 rule: the focus tile's goal has no second card
  (the panel's goal already had none); the tile keeps its progress; when the panel shows the same goal its heading reads
  "Your top goal" (link named after the goal); "You're set" says "Your goal is set". Recent activity is a log of events and
  keeps naming what happened. Quick add: at 1440 only the hero's shows (the status/sidebar triggers are hidden there).
- **D5 (Part 4 storage):** "My day ends at" is its own device record `zigoals:day-ends:v1`, not a field of the settings
  record as the plan said: the settings schemas are `.strict()`, so a new field would make frozen readers #37–#54 refuse
  synced/exported settings. Device-only (like the theme); exported, restored, erased, catalogued. The rule after a change
  (owner rule 1): the day in progress keeps the rule it started under until both rules name the same day. Health's own day
  (meals, water) is not in the owner's list and stays the calendar day; a Checklist Health tick before the end shows the
  date it was logged for (the existing dot).
- **D6 (C-MO-36 vs the NOVA lane):** Health's form and `startFast` take 1–24 h; ZIGi's/NOVA's fasting cards (lib/ai, AM's
  lane) still accept up to 18 h through `MAX_CUSTOM_HOURS`. The NOVA lane adopts 24 when it merges (owner list).
- **D7 (call e and AL's O3):** one cluster order everywhere (page extras, Game layer, lock last and only where a page can be
  rearranged). A helper had put the rocket back on phones; reverted, because AL's owner decision O3 moved Game layer into
  Apps & extras on phones. On a phone, Notes and Journal are therefore like Earn, Help and Tasks (no empty row).
- **D8 (D-088, Settings folded by default):** deferred to the end of Part 3: 408 plain `goto('/app/settings')` in 249 specs
  reach controls inside the groups; folding them by default needs those specs moved first.
- **D9 (Activity periods):** the period chips change only the report card (unchanged); search and CSV follow the kind filter.
- **D10 (cross-lane, for AM-2):** `lib/ai/local-answers/al-fourth.ts` says the theme is under "Your app → Theme"; it is now
  Settings → Appearance. AO does not edit lib/ai.
- **D11 (D-070 on a phone):** at 388 px the phone top bar holds six 44 px icons; a visible word beside or under the wallet
  icon does not fit without a second row in the protected phone chrome, so words show where the bar has room
  (components/shell/header-words.ts) and every icon keeps its accessible name. The 768+ header shows its words.
- **D12 (T-014):** the owner's 13 Nov brief lists "a shorter goal wizard (T-014)" in scope, which supersedes the earlier
  four-step decision (GO3/ADR-033 M33, pinned in tests/aj-owner-decisions.spec.ts, now three steps with a comment).
- **D13 (the hosted verifier):** its goal stage walks the creator by its own "Step N of M" text, so it passes on the deployed
  four-step creator (#54) and the three-step one (TIER 3 release verifier, behaviour-preserving).
- **D14 (D-028):** Showcase Today 176 → 143 Tab stops (skip links "Skip to a part of Today", roving focus in the week grid,
  What's new, goal titles, My links); the ≤ 90 target needs the sidebar and the habit rows changed — carried, guarded at ≤ 145.
- **D15 (C-MO-36 and Copilot):** the Copilot preset's sign rule (spending positive) follows the published format; the import
  preview asks the person to check it before saving.
- **D16 (left as owner decisions or carried, with cause):** BN-022 (erase names each area: needs a key-to-area map; the
  no-auto-reload is deliberate), D-003 and D-090 (copy decisions), DV-170 (Remove inside ⋯: a visual decision), G-025
  (nothing left open), the Today grid's day for Health cells (Health's own day).
- **D17 (fresh reviews, Part 6):** security delta: nothing Critical or High; the Medium and two Lows fixed (5e45ccdf; that
  commit's message lost the word "example" to shell backticks, not rewritten). UX review: no blocker; Major 1 (the
  Showcase's net-worth example now ends on the hero's own totals, never stamped in the future) and Major 2 (Dark's Settings
  note) fixed; Major 3 (the floating music/Checklist/ZIGi buttons over Today's right rail when scrolled at 1440) predates AO
  and is carried (a right gutter for the launchers changes Today's layout specs; ZIGi's button is the NOVA lane's). Minors
  fixed: "My day ends at" row in the phone list, Settings' doubled "APPEARANCE", a readable date in money-log Edit.
  Minors carried with cause: the review step opens with the rhythm fold (order inside dense JSX; next session), squashed
  13–16 px checkboxes in four older forms, 12–13 px notice/chip text (AL sizes; T-069 fits only at these sizes), the
  per-area "Perfect weeks" list unlabeled (Activity report, older), Earn's path labels at 390, two "Keep an average" hints,
  CSV Value/Unit read from the row's words, the Wealth chip row's cut-off at 1440.

## Closing table
Totals: Fixed 49, Carried 47, Built 13, Owner decision 7, Not possible 2 (AL's 112 carried ids + the owner calls and backlog items AO built).

| AL row | id | outcome | evidence / cause |
|---|---|---|---|
| AL-COUNTS-001 | TK pass-1 "'Current' badge on stale prices" | Carried | needs a service or a model (AL: Needs a service: a live price that ages past 15 minutes. Wit…) |
| AL-NUMBERS-SOURCE-001 | D-262 | Carried | needs a service or a model (AL: Needs a service: live price drift between two loads (/api bl…) |
| AL-NUMBERS-SOURCE-001 | D-200 | Carried | needs a service or a model (AL: Needs a service: live price drift on reload. The "Totals in …) |
| AL-NUMBERS-SOURCE-001 | TK-6B-06 | Carried | needs a service or a model (AL: Needs a service: live 24h change against its as-of stamp in …) |
| AL-ROUNDING-001 | TK pass-1 "Unformatted prices" | Carried | needs a service or a model (AL: Needs a service: coin pages need /api/market-detail and hist…) |
| AL-COPY-001 | M10 | Carried | needs a service or a model (AL: Needs a service: market logos come from /api/market-logo. Of…) |
| AL-COPY-001 | TK-203 | Carried | needs the market-logo service (same steps as M10) |
| AL-FIELD-ERROR-002 | TK-036 | Fixed | years 1–100 (3934199b) |
| AL-SEARCH-001 | W15 | Carried | needs a service or a model (AL: Needs a service: the public asset catalog behind "gold"/"bit…) |
| AL-COMPETITOR-GAP-008 | C-DVG-51 | Built | Copilot CSV preset (aa67f009) |
| AL-FIELD-ERROR-003 | D-052 | Carried | needs a service or a model (AL: Needs a service: adding a ninth favourite goes through the m…) |
| AL-FIELD-ERROR-003 | D-090 | Owner decision | "Sleep debt" wording is a copy call; validation part already fixed |
| AL-FIELD-ERROR-004 | C-DVG-35 | Carried | needs a service or a model (AL: Needs a service: a working barcode lookup needs the food-loo…) |
| AL-FIELD-ERROR-004 | MO-007 | Carried | needs a service or a model (AL: Needs a service: whether a lookup succeeds needs the food-lo…) |
| AL-FIELD-ERROR-004 | Oct-26 gap: barcode provider inactive | Carried | needs a service or a model (AL: Needs a service: turning a lookup provider on is a deploymen…) |
| AL-FIELD-ERROR-004 | C-MO-01 | Carried | needs a service or a model (AL: Needs a service (a branded barcode lookup, e.g. Nutella 3017…) |
| AL-LIMITS-003 | C-MO-36 | Fixed | Health form to 24 h (3934199b); ZIGi/NOVA cards stay 18 h until the NOVA lane adopts it (D6) |
| AL-LIMITS-003 | PR-018 | Fixed | minimum said at the field, no Save that saves nothing (aa67f009) |
| AL-UNITS-003 | NB-114 | Fixed | one decimal reader; already worked, now tested (3934199b) |
| AL-XP-BADGES-003 | DV-045e | Fixed | six sections fold on every size (aa67f009); tests/ao/page-lengths |
| AL-TIMEZONE-002 | C-DVG-22 | Built | My day ends at (e2452897) |
| AL-TIMEZONE-002 | C-NB-28 | Built | as C-DVG-22 |
| AL-TIMEZONE-002 | N-NB-11 | Built | as C-DVG-22 |
| AL-CONFIRM-DELETE-005 | B-083 | Owner decision | keep Undo, no confirm (call g, 13 Nov) |
| AL-CONFIRM-DELETE-005 | M-104 | Owner decision | as B-083 |
| AL-CONFIRM-DELETE-005 | M-131 | Owner decision | as B-083 |
| AL-A11Y-014 | DV-040g | Fixed | APG menu button, menuitems (d256b946) |
| AL-A11Y-014 | DV-056c | Fixed | as DV-040g |
| AL-A11Y-015 | DV-170 | Owner decision | Remove inside ⋯ is a visual call; Remove is named and has Undo |
| AL-A11Y-016 | D-028 | Carried | 176 → 143 stops (skip links, roving lists); ≤ 90 needs the sidebar and habit rows (D14) |
| AL-A11Y-016 | D-055 | Fixed | Edit on a holding's ⋯; long names wrap (b00a7985) |
| AL-COPY-040 | DV-053c | Fixed | "Target rating" field (3934199b) |
| AL-COPY-042 | DV-089 | Carried | needs a service or a model (AL: Needs a model: the NOVA workflow that made goals (tagged "Go…) |
| AL-COPY-043 | T-014 | Fixed | three steps (aa67f009; D12) |
| AL-COPY-044 | C-DVG-17 | Built | Activity search + CSV (d256b946) |
| AL-COPY-044 | DV-046e | Built | as C-DVG-17 |
| AL-COPY-044 | DV-054d | Built | as C-DVG-17 |
| AL-COPY-044 | C-DV-13 | Built | as C-DVG-17 |
| AL-COPY-044 | PR-100 | Built | as C-DVG-17 |
| AL-DISCOVERABILITY-002 | DV-010c | Fixed | Cash in two screens (aa67f009) |
| AL-DISCOVERABILITY-002 | NB-253 | Fixed | as DV-010c |
| AL-SEARCH-003 | D-079 | Carried | needs a service or a model (AL: Needs a service: Wealth → Add asset → "Find your asset" sear…) |
| AL-CHECKLIST-001 | D-086 | Fixed | "planets" in the heat-map line (aa67f009) |
| AL-PERF-007 | LS-067 | Fixed | clip fetched only once shown (3934199b) |
| AL-LAYOUT-DESKTOP-015 | D-088 | Carried | folded by default needs 408 Settings gotos in 249 specs moved first (D8); Appearance first covers the 800 px part |
| AL-LAYOUT-DESKTOP-015 | N-BN-10 | Carried | as D-088 |
| AL-LAYOUT-500-001 | N-BN-05 | Fixed | Earn folds six sections on phones (aa67f009) |
| AL-SETTINGS-005 | PR-035 | Carried | needs a connected model to see the cap in use |
| AL-COMPETITOR-GAP-132 | C-BN-01 | Carried | needs a service or a model (AL: Needs a service: the Staking validator list (commission / up…) |
| AL-COMPETITOR-GAP-132 | C-DVG-67 | Carried | needs a service or a model (AL: Same as C-BN-01 (needs the chain relay).…) |
| AL-COMPETITOR-GAP-134 | C-DVG-69 | Carried | needs a service or a model (AL: Needs a service: the claim’s "ZIG price that day" comes from…) |
| AL-COMPETITOR-GAP-136 | C-BN-05 | Carried | needs a service or a model (AL: Needs a service: comparing validators needs the live validat…) |
| AL-COMPETITOR-GAP-137 | C-BN-06 | Carried | needs a service or a model (AL: Needs a service: jailing alerts need a tracked wallet’s live…) |
| AL-COMPETITOR-GAP-141 | C-BN-11 | Carried | needs a service or a model (AL: Needs a service: the vote-deadline reminder sits on an open …) |
| AL-COMPETITOR-GAP-142 | C-BN-12 | Carried | needs a service or a model (AL: Needs a service: a validator’s vote lookup is read live from…) |
| AL-AI-CONNECTION-001 | BN-034 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-CONNECTION-001 | BN-050 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-ACTIONS-003 | LS:#012 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-ACTIONS-003 | LS:#194 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-ACTIONS-003 | LS:#351 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-ACTIONS-003 | C-LA-07 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-FACTS-003 | Z-057 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-FACTS-009 | NB:N11 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-NUMBERS-SOURCE-014 | TK-048 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-NUMBERS-SOURCE-014 | TK-052 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-NUMBERS-SOURCE-014 | TK:1 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-ACTIONS-010 | LS:#046 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-CONNECTION-007 | PR-028 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-FACTS-011 | DV-077 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-FACTS-011 | DV:N-045 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-AI-STABILITY-005 | N-DV-03 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-PRIVACY-006 | MO-052 | Carried | NOVA/ZIGi answers live in the AM lane (not touched by AO) |
| AL-COPY-066 | D-003 | Owner decision | section-level Showcase lines are a copy call |
| AL-LAUNCHER-OVERLAP-001 | T-069 | Fixed | "On this device", whole, one line (b00a7985) |
| AL-LAUNCHER-OVERLAP-001 | D-070 | Fixed | words beside header icons where they fit; on a 388 px phone not possible without a second row (D11) |
| AL-LAYOUT-375-011 | DV-223 | Fixed | as D-070 |
| AL-LAYOUT-375-011 | DV-247 | Fixed | as D-070 (768: words shown) |
| AL-LAYOUT-375-011 | DV-257c | Fixed | one header; Notes/Journal like the other pages (7d48c6f3; D7) |
| AL-LAYOUT-375-011 | DV-258c | Fixed | no "Back to Today" (7d48c6f3) |
| AL-LAYOUT-768-004 | N-127 | Not possible | retracted by the bot; no steps |
| AL-LAYOUT-768-004 | BUG-051 | Fixed | holding cards up to 900 px (aa67f009) |
| AL-LAYOUT-768-004 | N-153 | Not possible | no steps in the bot files |
| AL-LAYOUT-768-004 | D-134 | Fixed | a goal named once; Quick add once at every width (b00a7985) |
| AL-NAV-010 | DV-274 | Fixed | one list for More and its preview (aa67f009) |
| AL-NAV-010 | NB-045 | Fixed | as DV-274 |
| AL-NAV-010 | D-194 | Fixed | one cluster order (7d48c6f3) |
| AL-THEME-004 | D-063 | Fixed | Appearance first in Settings (b00a7985); sidebar unchanged (protected) |
| AL-THEME-004 | D-176 | Carried | needs a service or a model (AL: Needs a service: Wealth's and Markets' reference prices come…) |
| AL-THEME-005 | D-179 | Fixed | as D-063 |
| AL-LAYOUT-DESKTOP-017 | DV-029a | Fixed | as D-063 |
| AL-NAV-011 | D-013 | Fixed | lock only where rearrangeable, same slot (7d48c6f3) |
| AL-NAV-012 | LS-H34 | Fixed | as D-063 |
| AL-THEME-006 | DV-203 | Fixed | Dark flat near-black (b00a7985) |
| AL-THEME-006 | DV-226 | Fixed | as DV-203 |
| AL-THEME-006 | LS-H39 | Fixed | as DV-203 |
| AL-THEME-006 | N-NB-03 | Fixed | as DV-203 |
| AL-MOTION-002 | NB-075 | Fixed | as D-063 |
| AL-A11Y-025 | D-231 | Fixed | hover on the Tuck-away chevrons (aa67f009); ZIGi's round button is the NOVA lane's |
| AL-A11Y-025 | D-224 | Fixed | hover on Settings chips (aa67f009) |
| AL-FIELD-ERROR-018 | BN-081 | Carried | needs a service or a model (AL: Needs a service: the Net APR assumption field appears only a…) |
| AL-FIELD-ERROR-018 | BN-134 | Fixed | letters and signs refused at the field (aa67f009) |
| AL-FIELD-ERROR-019 | G-025 | Fixed | nothing left open (AL fix holds) |
| AL-LIMITS-005 | M-011 | Fixed | one limits table (3934199b) |
| AL-LIMITS-005 | LS-H29 | Fixed | duplicate-name notice in Checklist quick add (3934199b) |
| AL-ROUNDING-004 | L-075 | Fixed | largest remainder to 100 % (3934199b) |
| AL-TIMEZONE-004 | N-BN-17 | Carried | needs a service or a model (AL: Needs a service: the Staking snapshot and Chess "updated" ti…) |
| AL-TIMEZONE-004 | X3-29 | Carried | needs a service or a model (AL: Needs a service: same surfaces as N-BN-17 (Staking/Chess tim…) |
| AL-TOAST-011 | D-037 | Fixed | toast with Open Today and Undo (aa67f009) |
| AL-UNDO-005 | PR-052 | Fixed | Edit for a money-log entry (d256b946) |
| AL-DATES-008 | B-201 | Fixed | no Edit on an archived habit (d256b946) |
| AL-TOAST-012 | C-LS-20 | Fixed | Undo on workouts, meditation, bills, budgets, emergency rows (aa67f009); no Trash (a new record) |
| AL-BACKUP-RESTORE-001 | BN-022 | Owner decision | naming each erased area needs a key-to-area map; no auto-reload is deliberate (D16) |
| owner call a | RR-16 | Fixed | Wealth desktop sections fold, remembered (b00a7985); Showcase 1440: ~20,720 → 9,755 px |
| owner call b | RR-17 | Fixed | as D-134 |
| backlog #1 | C-DVG-19 | Built | Perfect days (aa67f009) |
| backlog #4 | CO4 | Built | week-grid cells open that day's check-in; the P&L row existed, now labelled (aa67f009) |
| backlog #11 | CO6 | Built | net-worth history by source (e2452897) |
| backlog #15 | GAP-118 | Built | 252 templates (8c6c7b2b) |
