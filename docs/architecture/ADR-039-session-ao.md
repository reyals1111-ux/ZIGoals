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

## Closing table
(filled at the end: every row Fixed / Built / Owner decision / Not possible / Carried + cause)
