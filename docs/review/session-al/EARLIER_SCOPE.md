# Session AL Part 14: earlier scope, re-verified

Branch `feature/session-al-fix-everything`, read 4 Nov 2026. A read-only research pass: no build, no browser run, no git except
`git ls-remote` for D11. Each row's state comes from reading the code on this branch, the lane files in `docs/review/session-al/lanes/` and
`GROK53_LEDGER.md` / `HISTORY_MAP.md`. Nothing here was tried in a browser.

**Sources:** AH_SCOPE (picklist 2: DE, TR, DS, VA, WE, ST, GO, HA, HE, TO, SE, LA, CO, MO, NO; picklist 1; AF leftovers C; roadmap D; security E;
CI F), AI_SCOPE (every ZIGi row), ADR-036 closing table + WIRING_AUDIT_3 (every row not fully Working), STATUS Session AK "Known limitations",
every finding in `docs/review/session-ak/*.md` whose status is not fixed/closed/working, and AL_SCOPE D7–D13.

## How to read the table

- **State.** *Working*: the code that keeps the promise is there (file:line); replay it on the production build. *Partly*: some of it is
  missing, or it is an AL row whose lanes still hand parts to each other. *Not built*: nothing in the code. *Unknown-needs-browser*: the code
  exists (often "Fixed-pending-proof" in a lane) but only a browser replay can decide. *Owner decision / owner step*: closes under a standing
  decision (AL_SCOPE F, O1–O7) or waits on the owner; any honest part is still listed. *see X*: the same fix as row X (picklist overlaps).
- **Already an AL row?** An AL id means `GROK53_LEDGER.md` cites this earlier row in its REOPENED column (or `HISTORY_MAP.md` does): do not
  duplicate it; its lane owns it. "(via ids)" means only some of the row's Grok finding ids landed in that AL row; the rest of the row is this
  table's job. The lane status in brackets is the lane files' word: FPP = Fixed-pending-proof, Already = already fixed/built, Handoff =
  Needs-other-lane / Needs-integrator, OwnerDec, NotPossible.
- **Not retested** = the row's old finding ids that the Grok bots marked NOT RETESTED / out of area (index "NR" in GROK53_LEDGER (d)). ADR-037
  Q7 sends these 238 ids to this replay.
- Paths are under `apps/web/` unless they start with `docs/`, `landing/`, `scripts/` or `.github/`.

## Picklist 2 · DE decisions

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | DE1 | Staking network: testnet or mainnet, and should the Alpha sign? | AL row specs: tests/grok53/chain, settings | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-CHAIN-DATA-001 (L6:FPP). Not retested: B-136, C-001, C-004, T-001 | AL-CHAIN-DATA-001 | L6 | F: testnet first; native staking may sign on zigchain-1 after the one-time confirm |
| AH | DE4 | How a person leaves the demo and starts with their own data | AL row specs: tests/grok53/habits, today, first-run, journey | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-025 (L3:FPP). Also via ids: AL-AI-FACTS-003, AL-COPY-056. Not retested: T-009 | AL-COPY-025 | L3 | — |
| AH | DE5 | Budget / monthly spend cap in scope? | Goals → New → template "Keep spending under a cap" | Working | lib/templates/goal-library.ts:49 (spend-cap template); lib/guided/programs.ts:85 | no | L4 | — |
| AH | DE8 | Workout logging a launch must-have? | Health → Workouts: log type, sets, reps, weight; export workout-sets.csv | Working | lib/export/everything.ts:268,391 (workout-sets.csv); ADR-033 `0425bd79`; depth vs competitors is AL-COMPETITOR-GAP-042 (via N-083…085) | AL-COMPETITOR-GAP-042 (via ids) | L2 | DE8 owner note (copy best workout apps) |

## Picklist 2 · TR numbers you can trust

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | TR1 | USD net worth leaves out BTC and ETH ($47,166.74 gap) | AL row specs: tests/grok53/wealth, markets; tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-004 (L1:FPP); AL-NUMBERS-SOURCE-014 (L7:FPP×2, L1:Handoff). Also via ids: AL-NUMBERS-SOURCE-001. Not retested: N-181 | AL-NUMBERS-SOURCE-004, AL-NUMBERS-SOURCE-014 | L1/L7 | — |
| AH | TR2 | 'Current' badge on two-day-old prices; prices drift per reload | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COUNTS-001 (L4:Handoff×2, L1:FPP); AL-NUMBERS-SOURCE-001 (L1:FPP×2, L3:Handoff, L4:Handoff×3); AL-PERF-001 (L1:FPP, L10a:Handoff). Also via ids: AL-AI-FACTS-002, AL-AI-FACTS-003, AL-AI-FACTS-012 | AL-COUNTS-001, AL-NUMBERS-SOURCE-001, AL-PERF-001 | L1 | — |
| AH | TR3 | Portfolio BTC $65,000 vs $83k elsewhere | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-001 (L1:FPP×2, L3:Handoff, L4:Handoff×3). Also via ids: AL-AI-FACTS-002, AL-COUNTS-001 | AL-NUMBERS-SOURCE-001 | L1 | — |
| AH | TR4 | Prices with 17 decimals | AL row specs: tests/grok53/wealth, markets; lane L10b primitives (unit); tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-ROUNDING-001 (L1:FPP, L4:Handoff); AL-ROUNDING-002 (L3:Handoff, L2:FPP); AL-LIMITS-004 (L4:FPP×2, L6:FPP, L6:Handoff, L1:FPP); AL-ROUNDING-005 (L4:FPP, L6:Handoff). Also via ids: AL-COPY-065, AL-COUNTS-001 | AL-ROUNDING-001, AL-ROUNDING-002, AL-LIMITS-004, AL-ROUNDING-005 | L1/L10b/L2 | — |
| AH | TR5 | Manual values silently override quantity × price | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-NUMBERS-SOURCE-002 (L1:FPP) | AL-NUMBERS-SOURCE-002 | L1 | — |
| AH | TR6 | Counts disagree between pages | AL row specs: tests/grok53/goals; tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COUNTS-007 (L3:FPP×2, L4:FPP×3, L4:Already); AL-COUNTS-011 (L6:Handoff). Also via ids: AL-COUNTS-004, AL-XP-BADGES-002. Not retested: B-012, BUG-031 | AL-COUNTS-007, AL-COUNTS-011 | L4/L6 | — |
| AH | TR7 | 'Totals in EUR' and the wallet currency pills | Wealth/Today in EUR; currency pills | Partly | Hidden by AH amendment 6 (`9e865423`); D-214/D-201/D-057 now in AL-CURRENCY-001 (via ids); B-034/B-150/M-121 not retested. Not retested: L-078. Bots marked fixed: N-030 | AL-CURRENCY-001 (via ids) | L1 | F: currency settings are Beta; Alpha USD/EUR |
| AH | TR8 | ZIG reward reserve: two states, two prices | Showcase: ZIG reward reserve on Staking vs Wealth vs Today | Working | lib/wealth.ts:148 (one valuation rule); B-110, B-111, B-154, M-079 not retested on #53. Not retested: B-103, B-110, B-111, B-154 | no | L1 | — |
| AH | TR9 | Health vs Habits disagree | AL row specs: tests/grok53/health; tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CROSS-PAGE-SYNC-001 (L2:Handoff×2, L5:FPP); AL-CROSS-PAGE-SYNC-002 (L2:Handoff, L3:FPP); AL-NUMBERS-SOURCE-007 (L2:Handoff, L3:FPP, L4:Handoff); AL-STREAKS-002 (L2:Handoff, L3:FPP). Also via ids: AL-AI-ACTIONS-002, AL-AI-SAFETY-004, AL-COUNTS-004. Not retested: N-168, N-202 | AL-CROSS-PAGE-SYNC-001, AL-CROSS-PAGE-SYNC-002, AL-NUMBERS-SOURCE-007, AL-STREAKS-002 | L2/L3 | — |
| AH | TR10 | Weight trend shown as three different numbers | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-DATES-002 (L2:FPP×3); AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-ROUNDING-002 (L3:Handoff, L2:FPP). Not retested: B-194 | AL-DATES-002, AL-FIELD-ERROR-003, AL-ROUNDING-002 | L2 | — |
| AH | TR11 | Goal status is computed wrongly | AL row specs: tests/grok53/wealth, markets; tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COUNTS-002 (L1:FPP); AL-COUNTS-007 (L3:FPP×2, L4:FPP×3, L4:Already); AL-NUMBERS-SOURCE-008 (L4:FPP); AL-NUMBERS-SOURCE-011 (L4:Already); AL-COPY-036 (L4:FPP×2). Not retested: B-014 | AL-COUNTS-002, AL-COUNTS-007, AL-NUMBERS-SOURCE-008, AL-NUMBERS-SOURCE-011, AL-COPY-036 | L1/L4 | — |
| AH | TR12 | Fake or duplicate Activity events; 'Showcase example' on your own entries | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-ACTIVITY-001 (L4:FPP×2); AL-XP-BADGES-009 (L4:FPP, L3:FPP, L4:Handoff); AL-ACTIVITY-003 (L3:FPP, L4:FPP); AL-COPY-034 (L4:FPP×2, L3:Handoff, L2:Handoff); AL-COPY-042 (L4:FPP×3, L3:FPP); AL-COPY-044 (L4:FPP, L4:Later×2); …. Also via ids: AL-AI-FACTS-001, AL-AI-FACTS-002, AL-TIMEZONE-004 | AL-ACTIVITY-001, AL-XP-BADGES-009, AL-ACTIVITY-003, AL-COPY-034, AL-COPY-042, AL-COPY-044, AL-ROUNDING-005 | L10b/L4 | — |
| AH | TR13 | Life review, Today and Journey disagree | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-NUMBERS-SOURCE-004 (L1:FPP) | AL-NUMBERS-SOURCE-004 | L1 | — |
| AH | TR14 | Calculator truth | /app/wealth calculator: assumptions beside result, months, invalid field | Working | components/calculator/calculator.tsx:81-82 `assumptionsText`; B-021/B-099 → AL-PERSISTENCE-008 (via ids). Not retested: B-044, B-131. Bots marked fixed: B-010 | AL-AI-FACTS-003, AL-PERSISTENCE-008 (via ids) | L1 | — |

## Picklist 2 · DS data safety

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | DS1 | A stale second tab overwrites newer data | AL row specs: tests/grok53/shell | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-PERSISTENCE-011 (L10a:FPP, L7:FPP, L1:FPP, L2:NotPossible, L4:OwnerDec) | AL-PERSISTENCE-011 | L10a | — |
| AH | DS2 | Checklist Sleep tap saves a 0-minute night over last night | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TIMEZONE-001 (L2:FPP×4, L4:Handoff×2, L2:already done in the first pass, L2:Later, L3:Handoff); AL-LIMITS-003 (L2:FPP×3, L5:FPP). Not retested: M-134, T-116 | AL-TIMEZONE-001, AL-LIMITS-003 | L2 | — |
| AH | DS3 | Naps can be created (not only edited) over a night | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TIMEZONE-001 (L2:FPP×4, L4:Handoff×2, L2:already done in the first pass, L2:Later, L3:Handoff). Also via ids: AL-COPY-014. Not retested: B-062 | AL-TIMEZONE-001 | L2 | — |
| AH | DS4 | Reset Showcase Demo wipes everything instantly | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff). Not retested: B-081, D-087 | AL-A11Y-016 | L4 | — |
| AH | DS5 | Removes without confirm or Undo across the app | AL row specs: tests/grok53/health; tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-LIMITS-003 (L2:FPP×3, L5:FPP); AL-UNDO-001 (L2:FPP); AL-CONFIRM-DELETE-005 (L4:FPP×3). Also via ids: AL-AI-FACTS-002, AL-UNDO-005. Not retested: B-117, T-115, T-138 | AL-LIMITS-003, AL-UNDO-001, AL-CONFIRM-DELETE-005 | L2/L4 | — |
| AH | DS6 | Exports empty or incomplete | AL row specs: tests/grok53/data | Partly | Grok #53 reopened it (fix in progress across lanes): AL-IMPORT-EXPORT-006 (INT:FPP×3, L1:Handoff, L2:FPP). Also via ids: AL-AI-ACTIONS-008, AL-AI-FACTS-003, AL-BACKUP-RESTORE-002 | AL-IMPORT-EXPORT-006 | INT | — |
| AH | DS7 | Second weight reading of the day replaces the first | Health → weight: second reading same day | Working | components/health/health-app.tsx:579 "Correct a reading, or keep both." | AL-AI-STABILITY-003 (via ids) | L2 | — |
| AH | DS8 | Restore and encrypted backup give no feedback in the demo | Settings → Backup & restore in Showcase: restore from file, Restore Habits hint | Unknown-needs-browser | ADR-033 `749e2d75` (hints beside disabled Restore); L-006/N-049 not retested; M-004 points to AL-HUD-002 (index). Not retested: L-006 | AL-HUD-002 (via ids) | INT | — |
| AH | DS9 | Drafts lost on Back; Back closes the page instead of the dialog | AL row specs: tests/grok53/shell; lane L10b primitives (unit) | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-PERSISTENCE-011 (L10a:FPP, L7:FPP, L1:FPP, L2:NotPossible, L4:OwnerDec); AL-PERSISTENCE-012 (L4:FPP×2) | AL-PERSISTENCE-011, AL-PERSISTENCE-012 | L10a/L10b | — |

## Picklist 2 · VA forms, errors, limits

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | VA1 | Never show raw validation JSON | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/habits, today, first-run, journey; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff); AL-FIELD-ERROR-010 (L4:FPP); AL-DATES-006 (L4:FPP×2, L6:Handoff); AL-FIELD-ERROR-018 (L6:FPP, L6:Handoff, L2:done for L4: `useFormErrors` +, L3:FPP, L4:FPP, L1:FPP); AL-FIELD-ERROR-019 (L4:FPP×2, L3:Handoff, L2:Handoff); …. Also via ids: AL-COPY-014, AL-LAUNCHER-OVERLAP-001. Not retested: L-050 | AL-FIELD-ERROR-003, AL-FIELD-ERROR-009, AL-FIELD-ERROR-010, AL-DATES-006, AL-FIELD-ERROR-018, AL-FIELD-ERROR-019, AL-LIMITS-004, AL-LIMITS-005 | L10b/L2/L3/L4 | — |
| AH | VA2 | Plausibility limits shared by every entry point | AL row specs: lane L10b primitives (unit); tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CRASH-001 (L2:FPP×2); AL-DATES-001 (L2:FPP×2); AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-LIMITS-002 (L4:FPP×2, L2:done for L4: `checkGoalTarget`, L2:FPP); AL-LIMITS-004 (L4:FPP×2, L6:FPP, L6:Handoff, L1:FPP). Also via ids: AL-COPY-065, AL-LAYOUT-DESKTOP-015, AL-LIMITS-001. Not retested: B-020 | AL-CRASH-001, AL-DATES-001, AL-FIELD-ERROR-003, AL-LIMITS-002, AL-LIMITS-004 | L10b/L2 | — |
| AH | VA3 | Water limits differ per entry point | AL row specs: tests/grok53/tasks, checklist | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-013 (L5:Handoff) | AL-FIELD-ERROR-013 | L5 | — |
| AH | VA4 | Names silently cut, with different limits per form | AL row specs: lane L10b primitives (unit); tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff); AL-LIMITS-005 (L3:FPP, L4:FPP×2, L5:FPP, L2:FPP, L1:FPP). Also via ids: AL-AI-FACTS-002, AL-LIMITS-001, AL-THEME-006 | AL-FIELD-ERROR-009, AL-LIMITS-005 | L10b/L3 | — |
| AH | VA5 | Empty submit: browser bubble only, or nothing | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff); AL-FIELD-ERROR-018 (L6:FPP, L6:Handoff, L2:done for L4: `useFormErrors` +, L3:FPP, L4:FPP, L1:FPP); AL-FIELD-ERROR-019 (L4:FPP×2, L3:Handoff, L2:Handoff) | AL-FIELD-ERROR-003, AL-FIELD-ERROR-009, AL-FIELD-ERROR-018, AL-FIELD-ERROR-019 | L10b/L2/L3 | — |
| AH | VA6 | Messages appear thousands of pixels from the button | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-CONFIRM-DELETE-006 (L4:FPP×3, L3:Handoff); AL-FIELD-ERROR-010 (L4:FPP); AL-FIELD-ERROR-018 (L6:FPP, L6:Handoff, L2:done for L4: `useFormErrors` +, L3:FPP, L4:FPP, L1:FPP); AL-FIELD-ERROR-019 (L4:FPP×2, L3:Handoff, L2:Handoff). Also via ids: AL-LAYOUT-DESKTOP-015, AL-TOAST-011. Not retested: T-071 | AL-FIELD-ERROR-003, AL-CONFIRM-DELETE-006, AL-FIELD-ERROR-010, AL-FIELD-ERROR-018, AL-FIELD-ERROR-019 | L10b/L2/L4 | — |
| AH | VA7 | Status messages and toasts pile up | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-TOAST-005 (L2:Handoff); AL-TOAST-007 (L4:FPP); AL-TOAST-011 (L3:Already, L4:Handoff×2, L3:FPP, L6:FPP). Also via ids: AL-COPY-014. Not retested: N-129, T-101 | AL-FIELD-ERROR-003, AL-TOAST-005, AL-TOAST-007, AL-TOAST-011 | L10b/L2/L4 | — |
| AH | VA8 | Date formats mixed | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-NUMBERS-SOURCE-011 (L4:Already); AL-DATES-008 (L4:FPP×2, L5:FPP). Also via ids: AL-ROUNDING-004 | AL-NUMBERS-SOURCE-011, AL-DATES-008 | L10b/L4 | — |
| AH | VA9 | Plurals and units | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/habits, today, first-run, journey; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-PLURALS-001 (L3:FPP, L4:Handoff); AL-DATES-006 (L4:FPP×2, L6:Handoff); AL-PLURALS-003 (L2:Handoff, L4:FPP×2, L6:Handoff, L3:FPP). Not retested: L-038 | AL-FIELD-ERROR-003, AL-PLURALS-001, AL-DATES-006, AL-PLURALS-003 | L10b/L2/L3/L4 | — |
| AH | VA10 | Time zone settings | Settings → Time zone: "UTC+13", lowercase name, back to device | Working | lib/time-zone-input.ts:6; components/settings/time-zone-settings.tsx:47; B-175 → AL-TIMEZONE-004 (via ids). Not retested: B-068. Bots marked fixed: B-176 | AL-TIMEZONE-004 (via ids) | L6 | — |

## Picklist 2 · WE wealth, markets, portfolio

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | WE1 | Asset search ranks meme and look-alike tokens above the real asset | AL row specs: tests/grok53/wealth, markets; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-002 (L1:FPP); AL-SEARCH-003 (L4:Later, L4:Handoff, L6:FPP). Also via ids: AL-AI-FACTS-004, AL-SEARCH-001 | AL-A11Y-002, AL-SEARCH-003 | L1/L4 | — |
| AH | WE2 | Portfolio transactions | AL row specs: lane L10b primitives (unit) | Partly | Grok #53 reopened it (fix in progress across lanes): AL-UNDO-005 (L4:Handoff). Also via ids: AL-LIMITS-001. Not retested: T-073 | AL-UNDO-005 | L10b | — |
| AH | WE3 | CSV import (Portfolio and Wealth) | AL row specs: tests/grok53/data; tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-IMPORT-EXPORT-001 (L1:FPP, L4:Handoff, L6:FPP); AL-IMPORT-EXPORT-006 (INT:FPP×3, L1:Handoff, L2:FPP). Not retested: B-087, L-072, L-073, T-100, T-102 | AL-IMPORT-EXPORT-001, AL-IMPORT-EXPORT-006 | INT/L1 | — |
| AH | WE4 | Refresh buttons and reloads | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TOAST-002 (L1:FPP); AL-PERF-001 (L1:FPP, L10a:Handoff). Also via ids: AL-NUMBERS-SOURCE-001. Not retested: D-096 | AL-TOAST-002, AL-PERF-001 | L1 | — |
| AH | WE5 | Freshness counters contradict themselves | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COUNTS-001 (L4:Handoff×2, L1:FPP). Not retested: B-104 | AL-COUNTS-001 | L1 | — |
| AH | WE6 | Invented currency codes accepted | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CURRENCY-001 (L4:Handoff, L1:FPP, L4:OwnerDec) | AL-CURRENCY-001 | L1 | — |
| AH | WE7 | Debts: $0 payment and overpayment accepted | Wealth → debts: $0 / over-payment, payment in Activity | Partly | ADR-033 `351c51c5` cap; L-067/B-199 now AL-LIMITS-001 (via ids) | AL-LIMITS-001 (via ids) | L1 | — |
| AH | WE8 | 'Add money' is a real purchase flow inside the demo | Showcase → Add money | Working | components/add-money/add-money-view.tsx:54 "This opens a real provider.". Not retested: B-140, B-186 | no | L1 | — |
| AH | WE9 | Gold, Silver, stocks show token logos and token prices | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-001 (L1:FPP) | AL-COPY-001 | L1 | F: tokenized reference prices stay labelled (DE6) |
| AH | WE10 | Wealth on phones | Wealth at 375: net worth visible, one heading, Add-asset sheet padding | Unknown-needs-browser | components/platform/wealth-view.tsx:147-153 (net worth under holdings); B-151 padding unverified at 375. Not retested: B-151 | no | L1 | — |
| AH | WE11 | Market insights request sends every holding's id | DevTools: POST /api/market-insights body | Working | components/platform/wealth-view.tsx:132 (only market-priced holdings sent). Not retested: B-085 | no | L1 | — |
| AH | WE12 | Watchlist cap | AL row specs: tests/grok53/wealth, markets; tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TOAST-001 (L1:FPP); AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff). Also via ids: AL-A11Y-025, AL-AI-ACTIONS-007, AL-ROUNDING-001. Not retested: N-207 | AL-TOAST-001, AL-FIELD-ERROR-003 | L1/L2 | — |
| AH | WE13 | Markets view and charts | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-003 (L1:FPP, L4:Handoff); AL-A11Y-002 (L1:FPP); AL-PERSISTENCE-001 (L1:FPP). Also via ids: AL-ROUNDING-001 | AL-NUMBERS-SOURCE-003, AL-A11Y-002, AL-PERSISTENCE-001 | L1 | — |
| AH | WE14 | Asset cards | AL row specs: tests/grok53/wealth, markets; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TOAST-003 (L1:FPP); AL-A11Y-016 (L3:Already, L4:Handoff). Also via ids: AL-COPY-004, AL-UNDO-005 | AL-TOAST-003, AL-A11Y-016 | L1/L4 | — |
| AH | WE15 | Ecosystem links and labels | AL row specs: tests/grok53/shell; tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-STALE-DATA-001 (L6:FPP×2); AL-THEME-004 (L10a:OwnerDec×2, L4:Handoff, L6:Handoff, L4:OwnerDec, L1:Handoff). Also via ids: AL-LAUNCHER-OVERLAP-001, AL-LAYOUT-768-004. Not retested: B-093 | AL-STALE-DATA-001, AL-THEME-004 | L10a/L6 | — |
| AH | WE16 | Market catalog download is 5.1 MB and 2 days old | GET /api/market-assets size | Not built | Recorded not built (ADR-034 N36: offline search needs the full catalog); related AL-COMPETITOR-GAP-011 | no | L1 | — (recorded M36) |
| AH | WE17 | Price alerts tied to goals | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COMPETITOR-GAP-009 (L4:Handoff, L1:FPP). Also via ids: AL-COPY-065. Not retested: T-006 | AL-COMPETITOR-GAP-009 | L1 | — |
| AH | WE18 | Realised gains export (Koinly-style) | Portfolio → Realised gains by year (CSV) | Working | lib/portfolio/realized-csv.ts:36; lib/search/static.ts:21. Not retested: T-041 | no | L1 | — |
| AH | WE19 | Hide-amounts mode for screenshots | Wealth → Hide amounts | Working | components/hide-amounts.tsx:6; components/platform/wealth-view.tsx:2 | no | L1 | — |
| AH | WE20 | Read-only wallet import into Portfolio | Portfolio → import from wallet (read-only) | Working | components/portfolio/wallet-import-panel (portfolio-view.tsx:20); lib/portfolio/wallet-import | no | L1 | — |
| AH | WE21 | Cost basis label and FIFO/LIFO lots | Portfolio coin page: average cost label, FIFO/LIFO view | Working | lib/portfolio/lots.ts (ADR-034 `c87be1d3`) | no | L1 | — |
| AH | WE22 | 'Since last visit' change on Portfolio | Portfolio: "Since your last visit" | Working | lib/portfolio/last-visit.ts:5; components/portfolio/portfolio-sections.tsx:65 | no | L1 | — |

## Picklist 2 · ST staking, earn, governance

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | ST1 | Network wording everywhere | AL row specs: tests/grok53/chain, settings | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-CHAIN-DATA-001 (L6:FPP). Also via ids: AL-AI-FACTS-001, AL-CHAIN-DATA-003. Not retested: B-012, B-052, B-136 | AL-CHAIN-DATA-001 | L6 | F: testnet first; native staking may sign on zigchain-1 after the one-time confirm |
| AH | ST2 | APR shown live on Earn but 'not verified' on Staking | Earn/Staking APR labels | Working | components/earn/native-section.tsx:58,64 and staking-empty-preview.tsx:23 "estimate, variable"; D-168 → AL-CHAIN-DATA-003 (via ids). Bots marked fixed: B-048, B-053, L-056 | AL-CHAIN-DATA-003 (via ids) | L6 | — |
| AH | ST3 | Staking calculator dead in the demo | Staking → Try a scenario in Showcase (no wallet) | Partly | components/platform/staking-try-scenario.tsx:29; N-198/B-065 → AL-COPY-054, AL-COPY-061 (via ids). Not retested: B-065, T-129 | AL-COPY-054, AL-COPY-061 (via ids) | L6 | — |
| AH | ST4 | Staking empty state is a giant blank card | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-THEME-004 (L10a:OwnerDec×2, L4:Handoff, L6:Handoff, L4:OwnerDec, L1:Handoff). Also via ids: AL-AI-FACTS-001, AL-CHAIN-DATA-003 | AL-THEME-004 | L10a | — |
| AH | ST5 | Advice-like wording next to 'Nothing here is advice' | AL row specs: tests/grok53/chain, settings; tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-054 (L4:Handoff, L6:FPP×2); AL-COPY-059 (L4:Handoff, L7:FPP). Not retested: B-054 | AL-COPY-054, AL-COPY-059 | L6/L7 | — |
| AH | ST6 | Earn's sticky tabs take 3 rows | AL row specs: lane L10b primitives (unit); tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-054 (L4:Handoff, L6:FPP×2); AL-LAYOUT-500-001 (L10a:Handoff, L6:Handoff); AL-LAYOUT-375-014 (L10a:done for L4: the fade covers t×2, L4:Handoff×2, L2:FPP) | AL-COPY-054, AL-LAYOUT-500-001, AL-LAYOUT-375-014 | L10b/L6 | — |
| AH | ST7 | Governance in the demo | AL row specs: tests/grok53/chain, settings | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-CHAIN-DATA-005 (L6:FPP); AL-CHAIN-DATA-006 (L6:FPP); AL-COPY-055 (L6:FPP). Not retested: T-075, T-107 | AL-CHAIN-DATA-005, AL-CHAIN-DATA-006, AL-COPY-055 | L6 | — |
| AH | ST8 | Track Wallet doesn't check the address first | Staking → Track wallet with a bad address | Working | lib/staking/tracked-wallets.ts + components/staking/tracked-wallets.tsx:34; L-019 keep (bots: fixed) | no | L6 | — |
| AH | ST9 | No Earn switch in Settings; Earn vanishes with Wealth | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NAV-010 (L10a:FPP, L4:Handoff×4, L10a:done, L6:Handoff×2, L10a:done for L3 (More), L3:Handoff) | AL-NAV-010 | L10a | O4 / TO9 (hidden pages stay out of the sidebar) |
| AH | ST10 | Market the review screen | Staking review screen and Help "Verify, don't trust" | Working | components/help/help-page.tsx:305; components/platform/positions-view.tsx:120 | no | L6 | — |

## Picklist 2 · GO goals

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | GO1 | Opening a goal can crash the app | AL row specs: tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-CRASH-002 (L4:Already) | AL-CRASH-002 | L4 | — |
| AH | GO2 | Close, Delete and Archive for goals | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CONFIRM-DELETE-005 (L4:FPP×3); AL-CONFIRM-DELETE-006 (L4:FPP×3, L3:Handoff). Also via ids: AL-AI-FACTS-001. Not retested: B-014, D-209 | AL-CONFIRM-DELETE-005, AL-CONFIRM-DELETE-006 | L4 | — |
| AH | GO3 | Goal wizard | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-009 (L4:FPP); AL-UNITS-004 (L4:FPP×2); AL-COPY-034 (L4:FPP×2, L3:Handoff, L2:Handoff); AL-COPY-043 (L4:FPP); AL-PERSISTENCE-012 (L4:FPP×2). Also via ids: AL-COPY-040, AL-CURRENCY-002, AL-LAYOUT-375-012, AL-LAYOUT-768-004, AL-PERF-005…. Not retested: L-026, N-111 | AL-NUMBERS-SOURCE-009, AL-UNITS-004, AL-COPY-034, AL-COPY-043, AL-PERSISTENCE-012 | L10b/L4 | — |
| AH | GO4 | Reward goal can't be funded from its own reserve | Reward goal funded from its own reserve | Partly | components/platform/goal-intelligence.tsx (`b492379f`); N-166 → AL-NUMBERS-SOURCE-010 (via ids) | AL-NUMBERS-SOURCE-010 (via ids) | L4 | — |
| AH | GO5 | Editing goals | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-NUMBERS-SOURCE-012 (L4:FPP×2); AL-PERSISTENCE-012 (L4:FPP×2). Also via ids: AL-NUMBERS-SOURCE-011, AL-TOAST-011 | AL-NUMBERS-SOURCE-012, AL-PERSISTENCE-012 | L10b/L4 | — |
| AH | GO6 | Project goals and charts | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-011 (L4:FPP×2); AL-FIELD-ERROR-019 (L4:FPP×2, L3:Handoff, L2:Handoff); AL-PLURALS-003 (L2:Handoff, L4:FPP×2, L6:Handoff, L3:FPP). Also via ids: AL-CHARTS-001, AL-COUNTS-009 | AL-FIELD-ERROR-011, AL-FIELD-ERROR-019, AL-PLURALS-003 | L10b/L4 | — |
| AH | GO7 | Finishing a goal is silent | AL row specs: tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COUNTS-007 (L3:FPP×2, L4:FPP×3, L4:Already). Also via ids: AL-XP-BADGES-002 | AL-COUNTS-007 | L4 | — |
| AH | GO8 | Goal card ⋯ menu | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff). Also via ids: AL-TOAST-011 | AL-A11Y-016 | L4 | — |
| AH | GO9 | Goals list layout and loading | AL row specs: tests/grok53/shell; tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff); AL-COPY-036 (L4:FPP×2); AL-NAV-004 (L4:FPP); AL-LAUNCHER-OVERLAP-001 (L10a:FPP, L4:Handoff×2, L5:Handoff, L10a:done (O3; 3c), L3:Handoff, L1:Handoff, L10a:Handoff, L10a:Open, L6:Handoff, L10a:done (O3; spec), L2:Handoff, L10a:done (rows above)). Also via ids: AL-LAYOUT-768-004, AL-NUMBERS-SOURCE-012, AL-PERF-011 | AL-A11Y-016, AL-COPY-036, AL-NAV-004, AL-LAUNCHER-OVERLAP-001 | L10a/L4 | — |
| AH | GO10 | Goal detail copy | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-036 (L4:FPP×2); AL-DATES-008 (L4:FPP×2, L5:FPP). Also via ids: AL-ROUNDING-004 | AL-COPY-036, AL-DATES-008 | L10b/L4 | — |
| AH | GO11 | Health goals | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-005 (L2:Handoff). Also via ids: AL-COPY-014, AL-COPY-065 | AL-NUMBERS-SOURCE-005 | L2 | — |
| AH | GO12 | 'Goal unavailable' dead end; search can't find a Health goal | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NAV-010 (L10a:FPP, L4:Handoff×4, L10a:done, L6:Handoff×2, L10a:done for L3 (More), L3:Handoff) | AL-NAV-010 | L10a | — |
| AH | GO13 | Pace chip on every goal card | Goals list: pace chip on every card | Working | components/goal-card.tsx:53 funding-health badge | no | L4 | — |
| AH | GO14 | Optional 'What matters' values step | Life review → values step | Working | lib/life-review/store.ts:15 (ADR-034 `68011a64`) | no | L3 | — |

## Picklist 2 · HA habits

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | HA1 | Skipped days count against consistency | Habit with skips: consistency % | Partly | lib/habits.ts:509 weeklyConsistency; B-003 → AL-STREAKS-001 (via ids). Not retested: B-003 | AL-STREAKS-001 (via ids) | L3 | — |
| AH | HA2 | Habits tick automatically from Health logs | AL row specs: tests/grok53/health; tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CROSS-PAGE-SYNC-001 (L2:Handoff×2, L5:FPP); AL-CROSS-PAGE-SYNC-002 (L2:Handoff, L3:FPP); AL-NUMBERS-SOURCE-007 (L2:Handoff, L3:FPP, L4:Handoff); AL-STREAKS-002 (L2:Handoff, L3:FPP); AL-COUNTS-004 (L5:Handoff, L4:Handoff) | AL-CROSS-PAGE-SYNC-001, AL-CROSS-PAGE-SYNC-002, AL-NUMBERS-SOURCE-007, AL-STREAKS-002, AL-COUNTS-004 | L2/L3 | — |
| AH | HA3 | Delete and Archive | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CONFIRM-DELETE-004 (L3:FPP×2, L4:Handoff, L2:Handoff, L5:Handoff). Not retested: B-031, B-145, T-085, T-125, T-131 | AL-CONFIRM-DELETE-004 | L3 | — |
| AH | HA4 | Routines | Habits → Add routine: preview, duplicates, timed steps | Partly | components/habits/routines-panel.tsx:6 `previewRoutineTemplate`; L-083/L-084 → AL-UNITS-003 (via ids) | AL-UNITS-003 (via ids) | L3 | — |
| AH | HA5 | Quick add parsing | AL row specs: tests/grok53/tasks, checklist | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-QUICK-ADD-005 (L5:FPP). Also via ids: AL-QUICK-ADD-004 | AL-QUICK-ADD-005 | L5 | — |
| AH | HA6 | History states | AL row specs: tests/grok53/habits, today, first-run, journey | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-STREAKS-003 (L3:FPP, L5:FPP). Also via ids: AL-STREAKS-001. Not retested: BUG-082 | AL-STREAKS-003 | L3 | — |
| AH | HA7 | Streak freezes | Journey → streak freeze: count, confirm, how earned | Unknown-needs-browser | components/habits/habit-card-full.tsx:125 legend; M-024/M-025/M-115 not retested | no | L3 | — |
| AH | HA8 | Vacation | Habits → Vacation panel | Partly | components/habits/habits-workspace.tsx:45,81; M-035 → AL-COPY-028 (via ids); rest not retested. Not retested: L-050 | AL-COPY-028 (via ids) | L3 | — |
| AH | HA9 | Step size for quantity habits | Quantity habit +/Set step size | Working | lib/habit-step.ts; N-005 → AL-AI-ACTIONS-007 (via ids). Not retested: N-087. Bots marked fixed: N-112 | AL-AI-ACTIONS-007 (via ids) | L3 | — |
| AH | HA10 | Schedule edits | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff). Also via ids: AL-COPY-028 | AL-FIELD-ERROR-009 | L3 | — |
| AH | HA11 | Timers | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-UNITS-003 (L3:Handoff). Also via ids: AL-STREAKS-001 | AL-UNITS-003 | L3 | — |
| AH | HA12 | Habit form | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff). Also via ids: AL-COPY-028, AL-LAUNCHER-OVERLAP-001. Not retested: N-090 | AL-FIELD-ERROR-009 | L3 | — |
| AH | HA13 | Completing gives no feedback | Complete / un-complete a habit: toast + Undo | Partly | components/habits/habit-card-full.tsx:20,182 showUndo; D-042 → AL-TOAST-011 (via ids). Not retested: N-069 | AL-TOAST-011 (via ids) | L3 | — |
| AH | HA14 | Habit cards layout | Habit cards at 375 | Unknown-needs-browser | `e6e55ec4`; M-076/M-106 → AL-LAUNCHER-OVERLAP-001, AL-AI-STABILITY-003 (via ids) | AL-AI-STABILITY-003, AL-LAUNCHER-OVERLAP-001 (via ids) | L3 | F: streak blocks visible at first glance |
| AH | HA15 | 30-day heatmap | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COUNTS-005 (L10a:done for L3 (Dark), L3:Handoff). Also via ids: AL-THEME-005 | AL-COUNTS-005 | L3 | — |
| AH | HA16 | Reminders | AL row specs: tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-SETTINGS-004 (L2:Handoff, L6:Handoff×2, L4:Handoff) | AL-SETTINGS-004 | L6 | — |
| AH | HA17 | ⋯ menu and keyboard | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff) | AL-A11Y-016 | L4 | — |
| AH | HA18 | Backfill, streak legend, forgiveness | Habit → Start earlier, streak legend | Working | components/habits/habit-card-full.tsx:95,125-126 StartEarlier + legend. Not retested: N-163 | AL-AI-FACTS-004 (via ids) | L3 | — |

## Picklist 2 · HE health

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | HE1 | Today 'Add 250 mL' fails with a raw error | AL row specs: tests/grok53/habits, today, first-run, journey | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-UNDO-002 (L2:FPP, L3:FPP, L5:FPP). Also via ids: AL-AI-FACTS-003 | AL-UNDO-002 | L3 | — |
| AH | HE2 | Calorie coach changes the target in one click | AL row specs: tests/grok53/health | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-DATES-002 (L2:FPP×3); AL-LIMITS-002 (L4:FPP×2, L2:done for L4: `checkGoalTarget`, L2:FPP); AL-HEALTH-SAFETY-001 (L2:FPP). Also via ids: AL-UNDO-005. Not retested: L-046, N-035 | AL-DATES-002, AL-LIMITS-002, AL-HEALTH-SAFETY-001 | L2 | — |
| AH | HE3 | Sleep logging | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff). Also via ids: AL-LAYOUT-768-004 | AL-FIELD-ERROR-003 | L2 | — |
| AH | HE4 | Barcode lookup is switched off | Health → barcode 3017620422003 | Working | Food Worker deployed 4 Nov (`7d43fb1f`); owner saw an Open Food Facts match on #53; FDC search not yet verified | AL-COPY-014 (via ids) | L2 | owner step done (J5/L4: stays free) |
| AH | HE5 | Food logging | AL row specs: tests/grok53/shell; tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LIMITS-002 (L4:FPP×2, L2:done for L4: `checkGoalTarget`, L2:FPP); AL-NAV-010 (L10a:FPP, L4:Handoff×4, L10a:done, L6:Handoff×2, L10a:done for L3 (More), L3:Handoff). Also via ids: AL-COPY-014, AL-LAYOUT-375-002 | AL-LIMITS-002, AL-NAV-010 | L10a/L2 | — |
| AH | HE6 | Measurements | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff). Not retested: T-138 | AL-FIELD-ERROR-003 | L2 | — |
| AH | HE7 | Fasting | AL row specs: tests/grok53/health | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-LIMITS-003 (L2:FPP×3, L5:FPP) | AL-LIMITS-003 | L2 | — |
| AH | HE8 | 'Late-evening eating' insight from untimed meals | AL row specs: tests/grok53/health | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-018 (L2:FPP) | AL-COPY-018 | L2 | — |
| AH | HE9 | Showcase import banner on every Health tab | Health tabs: Showcase import banner | Partly | components/health/health-app.tsx (`2361b562`); D-010 → AL-UNDO-005 (via ids). Not retested: B-121, L-037 | AL-UNDO-005 (via ids) | L2 | — |
| AH | HE10 | Health forms under the dock and squeezed | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAUNCHER-OVERLAP-001 (L10a:FPP, L4:Handoff×2, L5:Handoff, L10a:done (O3; 3c), L3:Handoff, L1:Handoff, L10a:Handoff, L10a:Open, L6:Handoff, L10a:done (O3; spec), L2:Handoff, L10a:done (rows above)). Also via ids: AL-A11Y-025, AL-LAYOUT-768-004 | AL-LAUNCHER-OVERLAP-001 | L10a | O3 (launchers) + F (desktop overlap allowed) |
| AH | HE11 | Quick counters | Health quick counters | Partly | lib/health-counters.ts; D-011/D-222 → AL-A11Y-025, AL-COPY-014 (via ids) | AL-A11Y-025, AL-COPY-014 (via ids) | L2 | R2-15: default counters kept (feed the PROTECTED Checklist path) |
| AH | HE12 | Water list | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff). Also via ids: AL-AI-FACTS-003. Not retested: B-117 | AL-FIELD-ERROR-003 | L2 | — |
| AH | HE13 | Meditation totals | Health → Meditation totals vs list; Checklist toast | Working | components/health/meditation/meditation-view.tsx:64; B-078 keep | no | L2 | — |
| AH | HE14 | Recipe and nutrition import | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-005 (L2:FPP); AL-IMPORT-EXPORT-003 (L2:Handoff). Not retested: B-090, L-038, T-139 | AL-FIELD-ERROR-005, AL-IMPORT-EXPORT-003 | L2 | — |

## Picklist 2 · TO Today, Checklist, Journey, first run

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | TO1 | Start page other than Today breaks Today (blocker) | Settings → start page Goals/Wealth, then /app, /app/today | Working | lib/pages/visibility.ts:39-42; components/shell.tsx:113 (use-start-page); tests/ah-today.spec.ts "TO1:". Not retested: B-124, T-149. Bots marked fixed: N-178 | no | L3 | F: Today can be hidden (PROTECTED) |
| AH | TO2 | Evening wrap-up | Settings → Evening wrap-up → "Start the wrap-up now" | Working | components/settings/wrap-up-settings.tsx:37; components/for-you/today-for-you.tsx:97. Not retested: B-135, B-198 | no | L3 | — |
| AH | TO4 | First run | AL row specs: tests/grok53/habits, today, first-run, journey | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-025 (L3:FPP). Also via ids: AL-AI-FACTS-011, AL-FIRST-RUN-004. Not retested: N-094, N-106 | AL-COPY-025 | L3 | — |
| AH | TO5 | Checklist leftovers (logic) | AL row specs: tests/grok53/health; tests/grok53/tasks, checklist | Partly | Grok #53 reopened it (some AL rows have no lane status yet): AL-LIMITS-003 (L2:FPP×3, L5:FPP); AL-CHECKLIST-004 (no lane status yet). Also via ids: AL-CHECKLIST-001 | AL-LIMITS-003, AL-CHECKLIST-004 | L2/L5 | — |
| AH | TO7 | Today layout | AL row specs: lane L10b primitives (unit); tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff); AL-ROUNDING-004 (L4:FPP×2, L3:Handoff). Also via ids: AL-LAYOUT-768-004 | AL-A11Y-016, AL-ROUNDING-004 | L10b/L4 | — |
| AH | TO8 | Weekly review | Weekly review: current day, check-ins count | Working | components/weekly-review/weekly-review-card.tsx:29 "(ends today)" | no | L3 | — |
| AH | TO9 | Hidden pages and an internal page | AL row specs: tests/grok53/shell; tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-059 (L4:Handoff, L7:FPP); AL-NAV-010 (L10a:FPP, L4:Handoff×4, L10a:done, L6:Handoff×2, L10a:done for L3 (More), L3:Handoff) | AL-COPY-059, AL-NAV-010 | L10a/L7 | TO9 owner note; O4 / TO9 (hidden pages stay out of the sidebar) |
| AH | TO10 | Music player opens far from its button | Music player opens next to its button | Working | components/music/music-panel.css:62 (desktop); below 901 px → O3 "Apps & extras" | no | L10a | O3 |
| AH | TO11 | Search | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-SEARCH-003 (L4:Later, L4:Handoff, L6:FPP) | AL-SEARCH-003 | L4 | — |
| AH | TO12 | Today changes after load | Today while loading: "No active goal yet", Needs attention count | Partly | components/dashboard/today-focus.tsx:51 goalsReady; M-122 → AL-PERF-011 (via ids) | AL-PERF-011 (via ids) | L3 | — |
| AH | TO13 | First click on Settings doesn't navigate | First click on Settings right after load | Working | components/shell.tsx:113 (a tap is never overridden by the start page) | AL-AI-FACTS-003 (via ids) | L10a | — |

## Picklist 2 · SE settings, help, activity

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | SE1 | Help contradicts Settings and the app | AL row specs: tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-HELP-002 (L6:FPP×3, L4:Handoff, L3:Handoff). Not retested: B-089, B-108 | AL-HELP-002 | L6 | — |
| AH | SE2 | Two weekly review days | Settings review day vs Reminders | Unknown-needs-browser | components/reminders/reminders-plan.tsx, life-review-view.tsx (one review day, `799935f3`); N-093 not retested. Not retested: B-126 | no | L6 | — |
| AH | SE3 | Settings is an ~8,000 px wall | AL row specs: tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-HELP-002 (L6:FPP×3, L4:Handoff, L3:Handoff); AL-LAYOUT-DESKTOP-015 (L6:OwnerDec). Also via ids: AL-A11Y-025, AL-LAYOUT-768-004, AL-NAV-006, AL-SETTINGS-002 | AL-HELP-002, AL-LAYOUT-DESKTOP-015 | L6 | — |
| AH | SE4 | Help page | AL row specs: tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-HELP-002 (L6:FPP×3, L4:Handoff, L3:Handoff). Not retested: L-020 | AL-HELP-002 | L6 | — |
| AH | SE5 | Activity | AL row specs: tests/grok53/goals | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-044 (L4:FPP, L4:Later×2); AL-COUNTS-008 (L4:FPP) | AL-COPY-044, AL-COUNTS-008 | L4 | — |
| AH | SE7 | Disabled features look active | Settings → push and Spotify controls when off | Partly | components/push/push-reminders-panel.tsx ("Not available here"/"Not set up"); AL-SETTINGS-008 (real permission state) open | no | L6 | push activation = owner step |
| AH | SE8 | 'Gamify' vs 'Game layer' | Settings → one "Game layer" name | Partly | components/game/gamify-button.tsx; M-006 → AL-SETTINGS-002 (via ids) | AL-SETTINGS-002 (via ids) | L6 | — |
| AH | SE9 | Theme and motion settings | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff). Also via ids: AL-AI-FACTS-001, AL-COPY-066 | AL-A11Y-016 | L4 | — |
| AH | SE10 | Help & diagnostics | Help & diagnostics: contact address, build string | Unknown-needs-browser | Kept (ADR-033 M43); M-067 not retested | no | L6 | — |
| AH | SE12 | 404 pages | /foo and /app/foo | Working | app/not-found.tsx:5, app/app/not-found.tsx:13 (branded 404); L10a first pass "3g 404" | no | L10a | — |
| AH | SE13 | Header warnings | Console: Permissions-Policy / manifest warnings | Owner decision / owner step | Kept by design (ADR-033 M43; INT lane: `bluetooth` guard pinned by tests/public-alpha.spec.ts); L-007 → AL-CONSOLE-001 (via ids) | AL-CONSOLE-001 (via ids) | INT | kept by design (SE13) |
| AH | SE14 | Device PIN or Face ID lock | Settings → device lock | Working | components/device-lock.tsx:136 (PIN; Face ID/passkey not offered without a server check) | no | L6 | RM8: passkey needs a real iPhone/server |

## Picklist 2 · LA layout, a11y, themes

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | LA1 | Floating buttons and ZIGi cover controls | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAUNCHER-OVERLAP-001 (L10a:FPP, L4:Handoff×2, L5:Handoff, L10a:done (O3; 3c), L3:Handoff, L1:Handoff, L10a:Handoff, L10a:Open, L6:Handoff, L10a:done (O3; spec), L2:Handoff, L10a:done (rows above)). Also via ids: AL-A11Y-025, AL-AI-ACTIONS-007. Not retested: L-087 | AL-LAUNCHER-OVERLAP-001 | L10a | O3 (launchers) + F (desktop overlap allowed) |
| AH | LA2 | 768 px | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAYOUT-375-011 (L10a:FPP, L4:Handoff×2). Also via ids: AL-LAYOUT-768-004 | AL-LAYOUT-375-011 | L10a | F: tablet rail / bottom bar PROTECTED (except O3/O4) |
| AH | LA3 | 375 px top of page | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAYOUT-375-011 (L10a:FPP, L4:Handoff×2). Also via ids: AL-AI-FACTS-002, AL-LAUNCHER-OVERLAP-001 | AL-LAYOUT-375-011 | L10a | F: tablet rail / bottom bar PROTECTED (except O3/O4) |
| AH | LA4 | Chip and tab rows cut off with no scroll cue | AL row specs: lane L10b primitives (unit) | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAYOUT-375-014 (L10a:done for L4: the fade covers t×2, L4:Handoff×2, L2:FPP). Also via ids: AL-AI-STABILITY-003 | AL-LAYOUT-375-014 | L10b | — |
| AH | LA5 | Light theme | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-THEME-003 (L10a:Already, L4:Handoff×2, L1:FPP); AL-THEME-004 (L10a:OwnerDec×2, L4:Handoff, L6:Handoff, L4:OwnerDec, L1:Handoff). Also via ids: AL-SETTINGS-001, AL-THEME-005 | AL-THEME-003, AL-THEME-004 | L10a | F: Light's dark islands PROTECTED |
| AH | LA6 | Dark theme | Dark theme: heatmap text, footnotes, column widths (D-196), header icons | Partly | Recorded M47; AK A12 left D-196 open; D-192/D-196/D-198 → AL-THEME-005, AL-LAYOUT-DESKTOP-012, AL-NAV-011 (via ids) | AL-LAYOUT-DESKTOP-012, AL-NAV-011, AL-THEME-005 (via ids) | L10a | — |
| AH | LA7 | Accessibility | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/goals; tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-004 (L2:FPP); AL-A11Y-016 (L3:Already, L4:Handoff); AL-TOAST-007 (L4:FPP); AL-A11Y-024 (L7:Handoff); AL-A11Y-026 (L6:Already, L4:Handoff, L6:Handoff, L3:FPP). Not retested: L-022, L-080, N-115, N-119, N-186, N-190 | AL-A11Y-004, AL-A11Y-016, AL-TOAST-007, AL-A11Y-024, AL-A11Y-026 | L10b/L2/L4/L7 | — |
| AH | LA8 | Blank pages while loading | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-PERF-001 (L1:FPP, L10a:Handoff). Also via ids: AL-PERF-011 | AL-PERF-001 | L1 | — |
| AH | LA9 | One top bar and page titles | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAYOUT-375-011 (L10a:FPP, L4:Handoff×2). Also via ids: AL-NAV-011 | AL-LAYOUT-375-011 | L10a | F: tablet rail / bottom bar PROTECTED (except O3/O4) |
| AH | LA10 | Hover feedback inconsistent | Hover feedback on links/cards | Unknown-needs-browser | ADR-033: text links underline on hover; D-212/D-223 → AL-A11Y-025, AL-COUNTS-001 (via ids) | AL-A11Y-025, AL-COUNTS-001 (via ids) | L10a | — |

## Picklist 2 · CO competitor ideas

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | CO1 | One Today line joining money, habits and health | Today: one line joining money, habits, health | Working | components/dashboard/today-line.tsx; lib/today/week-wealth.ts | no | L3 | — |
| AH | CO4 | Week grid with a P&L row | Week grid with a P&L row, tap to log | Partly | Grid present; P&L row and logging from cells "later" (ADR-033 M42) | no | L3 | J16 owner note (integrated, moveable) |
| AH | CO5 | One-tap water tiles + a water reminder | One-tap water tiles + water reminder | Working | components/dashboard/today-focus.tsx, components/shortcut-host.tsx (Session AC) | no | L2 | — |
| AH | CO6 | Net worth chart split into wallets, manual and staking with 'why did it change' | Net worth by source with "why it changed" | Partly | lib/accounts/by-source ("Holdings by source", today only); history by source not built (ADR-034 N29) | no | L1 | — |
| AH | CO7 | Live TVL/APR per Ecosystem card with source and time | Ecosystem cards: TVL/APR with source and time | Working | components/ecosystem-live.tsx, components/ecosystem-card.tsx | no | L6 | CO7 owner note (reuse where it fits) |
| AH | CO8 | Daily chess puzzle as a 'brain' habit | Habit template "Solve the daily puzzle" | Working | lib/templates/habits.ts; lib/chess/puzzle.ts | no | L6 | — |
| AH | CO11 | Complete or snooze from the notification | Complete/snooze from a notification | Not built | Push off until the owner activates it (ADR-033 M48); AL-COMPETITOR-GAP-084 (via ids) | AL-COMPETITOR-GAP-084 (via ids) | L6 | push activation = owner step |
| AH | CO12 | Published data-freshness policy | Help → "How fresh are the numbers?" | Working | components/help/help-page.tsx; lib/search/static.ts | no | L6 | — |
| AH | CO13 | Landing: one clear promise + interactive glimpse | Landing: one promise + interactive glimpse | Working | Landing V5 + AK chapter, deployed 4 Nov (`1a2c1c75`) | no | INT | landing redeploy = owner |

## Picklist 2 · MO money and launch

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | MO3 | Retention hooks | Retention hooks: push, ZIGi free-form, weekly review | Partly | Recorded (ADR-033 M48); push still off | no | L6 | push activation = owner step |
| AH | MO4 | Landing has no pricing, privacy policy or terms pages | Landing /privacy, /terms; pricing | Working | landing privacy.html/terms.html (ADR-034 `12f444dd`), live 4 Nov (200); pricing is O2 (in-app /app/plans, no landing price). Not retested: C-035 | no | L10a | O2 (placeholder prices, no landing price) |
| AH | MO5 | Landing claims that are now wrong | Landing: no "staking planned / signing disabled" | Working | grep of landing/index.html: 0 hits for those claims. Not retested: C-001, C-004, T-001 | no | INT | — |

## Picklist 2 · NO notes

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | NO1 | Old bugs: 68 still open, 5 fixed, 8 not reproduced | AL row specs: tests/grok53/shell; lane L10b primitives (unit); tests/grok53/health; tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-TIMEZONE-001 (L2:FPP×4, L4:Handoff×2, L2:already done in the first pass, L2:Later, L3:Handoff); AL-TIMEZONE-003 (L6:Handoff); AL-LAYOUT-375-012 (L10a:FPP, L2:FPP, L4:Handoff); AL-LIMITS-005 (L3:FPP, L4:FPP×2, L5:FPP, L2:FPP, L1:FPP) | AL-TIMEZONE-001, AL-TIMEZONE-003, AL-LAYOUT-375-012, AL-LIMITS-005 | L10a/L10b/L2/L6 | — |
| AH | NO2 | What works and must be kept | What works and must be kept | Working | GROK53_LEDGER.md (c) keep-list = regression guards | no | INT | — |
| AH | NO4 | All testing used the Showcase demo | Next Grok run without Showcase | N/A (process) | Process note; AL lesson 3 (every closing test also on a fresh profile) | no | INT | NO4 owner note |

## Picklist 1 (Alpha #44 "Next polish", 59 items)

Many are the same fix as a picklist-2 row (AH_SCOPE: "overlaps 20 Oct item X"); those say *see X*.

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | A1 | Stale second tab overwrites goals (BUG-075) | = DS1 | see DS1 | Same fix as DS1 (AL-PERSISTENCE-011); BUG-075 itself marked fixed by the bots | (via DS1) | INT | — |
| AH | A2 | 'Export Goal Data' exports nothing (BUG-036) | AL row specs: tests/grok53/data | Partly | Grok #53 reopened it (fix in progress across lanes): AL-IMPORT-EXPORT-006 (INT:FPP×3, L1:Handoff, L2:FPP). Also via ids: AL-BACKUP-RESTORE-002 | AL-IMPORT-EXPORT-006 | INT | — |
| AH | A3 | Drafts lost on Back or reload (BUG-076/077) | AL row specs: lane L10b primitives (unit) | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-PERSISTENCE-012 (L4:FPP×2). Also via ids: AL-PERSISTENCE-005 | AL-PERSISTENCE-012 | L10b | — |
| AH | A4 | 'Reset Showcase Demo' has no confirm or undo (BUG-061) | = DS4 | see DS4 | Same fix as DS4; its state is on that row | (via DS4) | L6 | — |
| AH | A5 | Portfolio: no edit-transaction; Remove has no confirm/undo (BUG-032) | AL row specs: lane L10b primitives (unit) | Partly | Grok #53 reopened it (fix in progress across lanes): AL-UNDO-005 (L4:Handoff) | AL-UNDO-005 | L10b | — |
| AH | A6 | Nap edits overlap or replace night sleep (BUG-021 + PoC) | = DS3 | see DS3 | Same fix as DS3; its state is on that row | (via DS3) | L2 | — |
| AH | A7 | Junk import shows a raw schema dump (BUG-042) | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff). Also via ids: AL-IMPORT-EXPORT-001 | AL-FIELD-ERROR-003 | L2 | — |
| AH | B1 | BTC/ETH prices differ between pages and ZIGi (BUG-006/059) | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-001 (L1:FPP×2, L3:Handoff, L4:Handoff×3) | AL-NUMBERS-SOURCE-001 | L1 | — |
| AH | B2 | Unrounded prices (BUG-007/028) | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-ROUNDING-001 (L1:FPP, L4:Handoff) | AL-ROUNDING-001 | L1 | — |
| AH | B3 | No upper limits on amounts (BUG-001/027/011/022/078/079) | AL row specs: lane L10b primitives (unit); tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LIMITS-002 (L4:FPP×2, L2:done for L4: `checkGoalTarget`, L2:FPP); AL-LIMITS-004 (L4:FPP×2, L6:FPP, L6:Handoff, L1:FPP). Also via ids: AL-FIELD-ERROR-003, AL-LIMITS-001, AL-TIMEZONE-001 | AL-LIMITS-002, AL-LIMITS-004 | L10b/L2 | — |
| AH | B4 | Several unexplained totals; Today vs Wealth disagree (BUG-063/085) | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-NUMBERS-SOURCE-004 (L1:FPP). Also via ids: AL-NUMBERS-SOURCE-001 | AL-NUMBERS-SOURCE-004 | L1 | — |
| AH | B5 | Count mismatches (BUG-031/041/062/044) | AL row specs: tests/grok53/goals; tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COUNTS-007 (L3:FPP×2, L4:FPP×3, L4:Already); AL-COUNTS-011 (L6:Handoff). Not retested: BUG-031 | AL-COUNTS-007, AL-COUNTS-011 | L4/L6 | — |
| AH | B6 | Fake goal events and 'Showcase example' on your own data (BUG-004/073/040) | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-ACTIVITY-001 (L4:FPP×2); AL-XP-BADGES-009 (L4:FPP, L3:FPP, L4:Handoff) | AL-ACTIVITY-001, AL-XP-BADGES-009 | L4 | — |
| AH | B7 | AAPL 30 × $341.97 shown as $7,500 (BUG-074) | = TR5 | see TR5 | BUG-074 → AL-NUMBERS-SOURCE-002 | AL-NUMBERS-SOURCE-002 | L1 | — |
| AH | B8 | Water habit and water log out of sync (BUG-043 + PoC) | AL row specs: tests/grok53/health; tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CROSS-PAGE-SYNC-001 (L2:Handoff×2, L5:FPP); AL-NUMBERS-SOURCE-007 (L2:Handoff, L3:FPP, L4:Handoff) | AL-CROSS-PAGE-SYNC-001, AL-NUMBERS-SOURCE-007 | L2/L3 | — |
| AH | B9 | Water cap bypassed with fl oz; no daily cap (BUG-083, new) | = VA3 | see VA3 | Same fix as VA3; its state is on that row | (via VA3) | L2 | — |
| AH | C1 | Errors off-screen or silent (BUG-003/009/020/026 + PoC) | AL row specs: lane L10b primitives (unit); tests/grok53/health; tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-FIELD-ERROR-009 (L3:FPP×2, L2:Handoff); AL-FIELD-ERROR-018 (L6:FPP, L6:Handoff, L2:done for L4: `useFormErrors` +, L3:FPP, L4:FPP, L1:FPP); AL-FIELD-ERROR-019 (L4:FPP×2, L3:Handoff, L2:Handoff) | AL-FIELD-ERROR-003, AL-FIELD-ERROR-009, AL-FIELD-ERROR-018, AL-FIELD-ERROR-019 | L10b/L2/L3 | — |
| AH | C2 | Wrong unit wording in errors; stale 'Meal logged.' (BUG-020) | AL row specs: lane L10b primitives (unit); tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff); AL-PLURALS-003 (L2:Handoff, L4:FPP×2, L6:Handoff, L3:FPP) | AL-FIELD-ERROR-003, AL-PLURALS-003 | L10b/L2 | — |
| AH | C3 | Water/servings error text wrong, field not highlighted (BUG-084, new) | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-FIELD-ERROR-003 (L2:FPP×2, L3:FPP, L4:Handoff×2, L2:done for L4: weight refusals a×2, L3:Handoff) | AL-FIELD-ERROR-003 | L2 | — |
| AH | C4 | Goal wizard polish (BUG-013/014/015/016/017/065) | AL row specs: lane L10b primitives (unit); tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-STREAKS-004 (L3:FPP, L4:FPP×2); AL-PERSISTENCE-012 (L4:FPP×2); AL-PLURALS-003 (L2:Handoff, L4:FPP×2, L6:Handoff, L3:FPP). Also via ids: AL-COPY-034, AL-COPY-040, AL-COPY-043, AL-CURRENCY-002, AL-LIMITS-005 | AL-STREAKS-004, AL-PERSISTENCE-012, AL-PLURALS-003 | L10b/L3 | — |
| AH | C5 | Goals and measurements can't be deleted (BUG-010) | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CONFIRM-DELETE-005 (L4:FPP×3); AL-CONFIRM-DELETE-006 (L4:FPP×3, L3:Handoff) | AL-CONFIRM-DELETE-005, AL-CONFIRM-DELETE-006 | L4 | — |
| AH | C6 | Habit form and schedule issues (BUG-070/071/018/024/025) | AL row specs: tests/grok53/habits, today, first-run, journey | Partly | Grok #53 reopened it (fix in progress across lanes): AL-CONFIRM-DELETE-004 (L3:FPP×2, L4:Handoff, L2:Handoff, L5:Handoff); AL-STREAKS-003 (L3:FPP, L5:FPP). Also via ids: AL-COUNTS-006. Not retested: BUG-018 | AL-CONFIRM-DELETE-004, AL-STREAKS-003 | L3 | — |
| AH | C7 | Unlogged day counts as failed but calendar shows no × (BUG-082, new) | = HA6 | see HA6 | Same fix as HA6; its state is on that row | (via HA6) | L3 | — |
| AH | C8 | Time zone 'Foo/Bar' accepted (BUG-035) | = VA10 | see VA10 | BUG-035 keep | (via VA10) | L6 | — |
| AH | C9 | Health deep links ?tab= and #sleep ignored (BUG-080) | AL row specs: tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NAV-002 (L2:FPP, L2:Open, L3:Handoff) | AL-NAV-002 | L2 | — |
| AH | C11 | Food can't be logged without a library food (BUG-066) | Health → log a food without a library food | Working | `2361b562`; tests/ah-health.spec.ts; BUG-066 keep | no | L2 | — |
| AH | C12 | Adding ETH again makes a duplicate card; stock form uses crypto words (PoC) | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-001 (L1:FPP) | AL-COPY-001 | L1 | — |
| AH | D2 | Floating buttons cover content (BUG-005/034/081) | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-LAUNCHER-OVERLAP-001 (L10a:FPP, L4:Handoff×2, L5:Handoff, L10a:done (O3; 3c), L3:Handoff, L1:Handoff, L10a:Handoff, L10a:Open, L6:Handoff, L10a:done (O3; spec), L2:Handoff, L10a:done (rows above)) | AL-LAUNCHER-OVERLAP-001 | L10a | O3 (launchers) + F (desktop overlap allowed) |
| AH | D3 | Settings links only 18 px tall at 375 (BUG-039) | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-016 (L3:Already, L4:Handoff) | AL-A11Y-016 | L4 | — |
| AH | E1 | Health link contrast 1.08:1 (BUG-046) | Health link contrast | Partly | AK EX-12 underline (components/health/health.css); BUG-046 → AL-THEME-007 (via ids) | AL-THEME-007 (via ids) | L2 | — |
| AH | E2 | Nested interactive chart parts; invalid dl (BUG-047/048) | axe: nested interactive chart parts, invalid <dl> | Unknown-needs-browser | ADR-033 "already fixed" (M45); BUG-047/048 not retested. Not retested: BUG-047, BUG-048 | no | L10a | — |
| AH | E3 | Focus trap, wizard needs 20–30 Tabs, unnamed inputs (BUG-045/049/050) | AL row specs: lane L10b primitives (unit); tests/grok53/health | Partly | Grok #53 reopened it (fix in progress across lanes): AL-A11Y-004 (L2:FPP); AL-A11Y-026 (L6:Already, L4:Handoff, L6:Handoff, L3:FPP). Also via ids: AL-A11Y-016. Not retested: BUG-045 | AL-A11Y-004, AL-A11Y-026 | L10b/L2 | — |
| AH | F1 | 358 KB ZIGi idle animation on every page | ZIGi idle animation weight on every page | Partly | Recorded (M45/M47); Studio-4 idle loops 400 KB only at 24 fps q70 (AL_SCOPE D13) | no | L7 | F: the ZIGi look is locked |
| AH | F3 | Cold load 1.3–1.4 s | Cold load time | Working | Measured before/after (ADR-034 N39); scripts/check-weight-budget.mjs | no | INT | — |
| AH | F5 | Market data 503s, 'could not refresh' (BUG-069) | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-TOAST-002 (L1:FPP) | AL-TOAST-002 | L1 | — |
| AH | F6 | No sort or pagination on Goals and Habits lists (BUG-064) | AL row specs: tests/grok53/goals | Partly | Grok #53 reopened it (fix in progress across lanes): AL-SEARCH-003 (L4:Later, L4:Handoff, L6:FPP) | AL-SEARCH-003 | L4 | — |
| AH | H3 | Duplicate widgets on first visit; two swan logos (PoC) | First visit: duplicate widgets, two swan logos | Unknown-needs-browser | Recorded (ADR-033 M41); no #53 evidence | no | L3 | F: first-visit swan intro PROTECTED |
| AH | H5 | Help crowded with changelog; Chess 'page is hidden' (BUG-068) | AL row specs: tests/grok53/shell | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NAV-013 (L10a:FPP, L1:Handoff, L10a:done for L1 (AL-NAV-013)). Also via ids: AL-FIRST-RUN-001 | AL-NAV-013 | L10a | — |
| AH | H6 | 'First 60 seconds' flow | AL row specs: tests/grok53/habits, today, first-run, journey | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-025 (L3:FPP) | AL-COPY-025 | L3 | H6 owner note |
| AH | I2 | Earn headline 'Make your money work' (HOLD) | = ST5 | see ST5 | Same fix as ST5; its state is on that row | (via ST5) | L6 | — |
| AH | I3 | 'Every live way to earn…' | = ST5 | see ST5 | Same fix as ST5; its state is on that row | (via ST5) | L6 | — |
| AH | I4 | Hard-coded 21-day unbonding fallback in the explainer | = ST2 (21-day unbonding fallback) | Working | ST2/I4 `facc2b0f`: explainer uses the pinned constant | no | L6 | — |
| AH | I5 | Ramp/Banxa 'integrated'; 'sells nothing' | Ramp/Banxa "integrated", "sells nothing" | Working | lib/ai/context/specialists.ts (ADR-034 `cef4c63e`) | no | L7 | — |
| AH | J1 | 'Numbers you can trust' package | Package = TR rows | see TR* | Same fix as TR*; its state is on that row | (via TR*) | L1 | — |
| AH | J2 | 'Never lose my data' package | Package = DS rows | see DS* | Same fix as DS*; its state is on that row | (via DS*) | INT | — |
| AH | J3 | Habit → savings goal (complete a habit, add €X to a goal) | Habit → add €X to a goal on completion | Unknown-needs-browser | ADR-033 "Fixed (offer)" `e6e55ec4`; no #53 evidence | no | L3 | — |
| AH | J5 | Free barcode scanner (Open Food Facts) | = HE4 | see HE4 | Same fix as HE4; its state is on that row | (via HE4) | L2 | owner step done |
| AH | J8 | Fast food logging: Recent/Frequent per meal, copy yesterday, Quick Add | Health quick log: recent/frequent per meal, copy yesterday | Working | Session W quick-log (ADR-033 "already fixed") | no | L2 | — |
| AH | J9 | Habit skip/backfill, streak legend, grace rule | = HA18 | see HA18 | Same fix as HA18; its state is on that row | (via HA18) | L3 | — |
| AH | J11 | Price alerts and a watchlist | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COMPETITOR-GAP-009 (L4:Handoff, L1:FPP) | AL-COMPETITOR-GAP-009 | L1 | — |
| AH | J14 | CSV import with duplicate check; read-only exchange sync | AL row specs: tests/grok53/wealth, markets | Partly | Grok #53 reopened it (fix in progress across lanes): AL-IMPORT-EXPORT-001 (L1:FPP, L4:Handoff, L6:FPP) | AL-IMPORT-EXPORT-001 | L1 | — |
| AH | J15 | Reward, income and airdrop transaction types | AL row specs: tests/grok53/wealth, markets | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-COPY-012 (L1:FPP) | AL-COPY-012 | L1 | — |
| AH | J16 | Week grid across all modules (log from it) | = CO4 | see CO4 | Same fix as CO4; its state is on that row | (via CO4) | L3 | J16 owner note |
| AH | J17 | Small Monarch-style polish (remembered chart ranges, green '+' inflows) | = WE13 | see WE13 | Same fix as WE13; its state is on that row | (via WE13) | L1 | — |
| AH | J18 | Budgeting (new) | = DE5 | see DE5 | Same fix as DE5; its state is on that row | (via DE5) | L4 | — |
| AH | L1 | Multi: iPhone all-in-one, $49.99 lifetime | Multi competitor UX | Partly | Workout progression line built; rest → AL-COMPETITOR-GAP-* rows (Denver gaps) | no | all | L1 owner note |
| AH | L2 | personalEverything, HALO, Lifemova and others | personalEverything, HALO, Lifemova… | Partly | Habit Strength built; rest → AL-COMPETITOR-GAP-* rows | no | all | L2 owner note |
| AH | L4 | MyFitnessPal paywalled its barcode scanner | = HE4 (keep the scanner free) | see HE4 | Same fix as HE4; its state is on that row | (via HE4) | L2 | L4 owner note |
| AH | M2 | Session AF may already fix several items | Owner note (process) | N/A (process) | Process note, no code | no | — | M2 owner note |

## AF leftovers (AH_SCOPE C)

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | AF1 | WalletConnect for phones and Ledger: waits for the owner's Reown project ID (D1) | Keplr Mobile / Ledger over WalletConnect | Owner decision / owner step | apps/web/config/public-integrations.json:3 reownProjectId set; live pairing waits on Reown allowed domains (STATUS owner list 3) | no | L6 | owner step (Reown domains); OUT of AH by owner |
| AH | AF2 | Pre-filled Ramp and Banxa hand-offs: wait for the owner's public IDs (Ramp host API key, Banxa partner ref; `d | Pre-filled Ramp/Banxa hand-offs | Owner decision / owner step | config/public-integrations.json:4,6 rampHostApiKey/banxaPartnerRef null | no | L1 | OUT by owner 25 Oct (needs the owner's IDs) |
| AH | AF3 | Earn shows your own OroSwap LP and USDC vault shares | Earn: own OroSwap LP and USDC vault shares | Unknown-needs-browser | lib/server/earn/oroswap.ts, vaults.ts (`a31fa439`, TIER 3 egress); needs a live address | no | L6 | — |
| AH | AF4 | "What's this?" tap on the wallet card's older "Testnet" label (ledger N1) | Wallet card Testnet label "What's this?" | Working | components/wallet/wallet-card.tsx:21 | no | L6 | — |
| AH | AF6 | Life review date mismatch between 00:00 and 02:00 Brussels (React #418; `useLocalToday` should start from the  | Life review 00:00–02:00 Brussels, React #418 | Working | components/use-local-today.ts:7-14 (server day from <html data-server-day>); replay at night | no | INT | — |
| AH | AF7 | Verifier: one aborted `/api/push` just outside the 2 s window keeps the status at "completed with findings" | Hosted verifier /api/push abort | Unknown-needs-browser | Fixed in AH (TIER 3 verifier); the verifier itself does not run until AL D2 (`ERR_MODULE_NOT_FOUND`) is fixed | no | L9 | — |
| AH | AF9 | Hero slogan: its gradient words measure below the contrast floor in every theme (protected baseline) | Hero slogan contrast | Owner decision / owner step | OUT of AH by owner (hero stays) | no | — | F: Today hero + slogan PROTECTED |
| AH | AF10 | Ecosystem page eyebrow by day: 3.2–3.7:1 on the teal glow at phone widths | Ecosystem header by day | Working | ADR-033: Light glows lowered (owner's words) | no | L6 | owner chose "calm" |
| AH | AF12 | Earn's Start-here keeps its older path look beside the new Checklist path: align them | Earn Start-here vs Checklist path look | Working | components/earn/start-here-path.tsx:9,12,20 uses the shared Path engine (components/path/path.tsx, path-orbit.css) | no | L6 | — |
| AH | AF13 | Today repeats some facts across its cards (the market watch is already fixed, H131) | Today repeats facts across cards | Working | R2-9 fixed (`15c1e159`, `1d6902be`: a goal once, one "Next money steps") | no | L3 | — |
| AH | AF14 | Dependabot moderate alert on `main`: Vite `launch-editor` (dev server, Windows only) | Dependabot moderate alert (Vite) | Partly | vite bumped (`a0a1fab4`); now 2 moderate alerts (glob, minimatch) open, docs/dependencies/AL_REVIEW.md, nothing bumped | no | INT | F: no dependency change without owner approval |
| AH | AF15 | Small layout items the audits judged and left as they are: Habits' time headings just under 3:1, a Checklist n | Habits time headings, Checklist name on phone path, Health import stress readings, Academy name under lesson bubble | Partly | Recorded (M47); AK A12 left parts 2 and 3 with no closure (WIRING_AUDIT_3 gap 7) | no | L3 / L2 / L6 | F: Checklist orbit PROTECTED (part 2 is bug-only) |
| AH | AF16 | CI hardening for the known intermittents: | CI intermittents (AF16 list) | Working | Fixed in AH (`ea7aaca9`, `b1cdba48`, `05173f41`); the remaining classes are docs/review/session-al/CI_INTERMITTENTS.md | no | L9 | D8 rule: one re-run, never chase the engine |

## Roadmap (AH_SCOPE D)

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | RM4 | Landing upgrade (E), `www` → apex redirect, and switching off the landing Worker's workers.dev/preview URLs | Landing upgrade, www→apex, workers.dev off | Working | landing/wrangler.jsonc:4-5 workers_dev/preview_urls false; the www rule is a Cloudflare setting (owner) | no | INT | owner step (Cloudflare rule) |
| AH | RM5 | Friends pack + Help refresh (J), before the friends Alpha (Known limitations, FRIENDS_GUIDE, Help/What's new f | AL row specs: tests/grok53/data | Partly | Grok #53 reopened it (fix in progress across lanes): AL-HELP-006 (INT:Handoff×2) | AL-HELP-006 | INT | — |
| AH | RM6 | Automatic PR-review GitHub Action on the API credits (G), before the friends Alpha (Tier 3 CI; the owner adds  | PR-review Action | Working | .github/workflows/pr-review.yml:25 (AL D6: chunks, PR_REVIEW_MAX_CHUNKS default 8) | no | L9 | — |
| AH | RM8 | Verify-then-do (Part 0 checks the status in STATUS first): timezone phases 3–4 (incl | TZ phases, @2x rename, Portfolio sync, Face ID/passkey | Partly | All done before AH except passkey/Face ID (not possible without a real iPhone/server) | no | L6 | RM8 (needs a real iPhone) |
| AH | RM7 | Remove Fitbit connect/import; keep data; Help says it ended | Fitbit removed, data kept, Help says it ended | Working | components/health/devices/devices-view.tsx:26,52; health-app.tsx:126 keeps the imported source name | no | L2 | RM7 owner note |

## Security and CI (AH_SCOPE E, F)

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AH | SEC | Clear every open Dependabot/security alert on main | GitHub → Security → Dependabot on main | Partly | AL Part 0: two moderate alerts (glob GHSA-3g3m-2fjr-6pw4, minimatch GHSA-g3hv-75wg-m249), build tooling only; docs/dependencies/AL_REVIEW.md | no | INT | F: no dependency change without owner approval |
| AH | CI1 | execute.test.ts:116 60 s timeout | apps/web/lib/staking/execute.test.ts:116 60 s timeout | Working | Fixed `9b1dd80f`; not in AK's intermittent list | no | L9 | — |
| AH | CI2 | domain-review-race:41 "fetch failed" | scripts/run11/domain-review-race.test.mjs:41 | Working | Fixed `ba33c973` | no | L9 | — |
| AH | CI3 | run9-2-product:30 phone Quick add | run9-2-product.spec.ts:30 phone Quick add | Working | Fixed (AH); not seen since | no | L9 | — |
| AH | CI4 | run10-source-pinning:69 Habits → Today | run10-source-pinning.spec.ts:69 | Working | Fixed `6966c04d` | no | L9 | — |
| AH | CI5 | WebKit cancelled request reported as access-control error | WebKit cancelled request = access-control error class | Partly | Shared filter tests/webkit-cancelled.ts; webkit-earn:19 still unfiltered (CI_INTERMITTENTS.md Fix 3, integrator) | no | L9 | D8 rule |
| AH | CI6 | layout-fixes-ae:24, session-x-findings:202, run10-motion:5 | layout-fixes-ae:24, session-x-findings:202, run10-motion:5 | Working | Fixed in AH; run10-motion:98 fixed at cause in AK (`005ff708`) | no | L9 | — |
| AH | CI7 | theme-parity-af timeout | theme-parity-af timeout | Partly | Now the recorded Chromium renderer stall (theme-parity-af:15; CI_INTERMITTENTS.md "record only") | no | L9 | D8 rule |

## ZIGi rows (AI_SCOPE)

Model-dependent quality is fixed in the deterministic layers only; real-model runs are the owner's (AL_SCOPE F, REAL_MODEL_TODO.md).

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AI | DE7 | Hide ZIGi's suggested prompts until they pass? | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-002 (L6:Handoff, L7:FPP×5, L4:Handoff×2); AL-AI-FACTS-007 (L7:FPP); AL-AI-FACTS-016 (L7:FPP). Also via ids: AL-AI-FACTS-005 | AL-AI-FACTS-002, AL-AI-FACTS-007, AL-AI-FACTS-016 | L7 | — |
| AI | HE17 | Photo food logging with a visible estimate range | ZIGi photo of a meal with an estimate range | Unknown-needs-browser | lib/ai/actions/parse.ts:137, plan-ak.ts:146 (needs a real model; none in the cloud session) | no | L7 | F: no real-model calls (REAL_MODEL_TODO.md) |
| AI | ZI1 | Questions turned into write previews | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-005 (L4:Handoff×2, L7:FPP×7, L6:Handoff); AL-AI-FACTS-015 (L7:FPP). Also via ids: AL-AI-ACTIONS-007 | AL-AI-FACTS-005, AL-AI-FACTS-015 | L7 | ZI1 owner note |
| AI | ZI2 | Natural questions fall back to the canned list | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-001 (L6:Handoff, L7:FPP×2, L4:Handoff); AL-AI-FACTS-002 (L6:Handoff, L7:FPP×5, L4:Handoff×2); AL-AI-FACTS-003 (L4:Handoff×4, L7:FPP×4, L7:Already); AL-AI-FACTS-008 (L7:FPP); AL-AI-FACTS-009 (L7:FPP); AL-AI-FACTS-010 (L7:FPP); …. Not retested: B-047, B-132 | AL-AI-FACTS-001, AL-AI-FACTS-002, AL-AI-FACTS-003, AL-AI-FACTS-008, AL-AI-FACTS-009, AL-AI-FACTS-010, AL-AI-FACTS-015 | L7 | ZI2 owner note |
| AI | ZI3 | ZIGi's numbers differ from the pages | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-014 (L7:FPP×2, L1:Handoff). Also via ids: AL-COPY-060. Not retested: B-080, B-118, B-133, N-181 | AL-NUMBERS-SOURCE-014 | L7 | ZI3 owner note |
| AI | ZI4 | Connecting a ChatGPT subscription disables local answers for good | Connect a subscription; ask "Summarise my day" | Partly | components/ai/ai-chat.tsx (`localOnly = !connected`), no dedicated test (ADR-034); N-022 → AL-AI-FACTS-012 (via ids). Not retested: N-067 | AL-AI-FACTS-012 (via ids) | L7 | — |
| AI | ZI5 | 'Include Health' switch hidden until a connection is chosen | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-PRIVACY-004 (L7:FPP×5, L2:Handoff). Also via ids: AL-AI-FACTS-002 | AL-PRIVACY-004 | L7 | — |
| AI | ZI6 | ZIGi panel on narrow screens | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-059 (L4:Handoff, L7:FPP). Also via ids: AL-LAYOUT-768-003 | AL-COPY-059 | L7 | — |
| AI | ZI7 | 'Your Personal AI Companion' greets with 'with no AI' | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-059 (L4:Handoff, L7:FPP); AL-COPY-064 (L4:Handoff, L7:Already) | AL-COPY-059, AL-COPY-064 | L7 | — |
| AI | ZI8 | 'Which setup fits me?' quiz | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-COPY-059 (L4:Handoff, L7:FPP); AL-AI-CONNECTION-004 (L4:Handoff, L7:FPP) | AL-COPY-059, AL-AI-CONNECTION-004 | L7 | — |
| AI | ZI9 | ZIGi switched off leaves dead 'Ask ZIGi' links | AL row specs: tests/grok53/chain, settings | Partly | Grok #53 reopened it (fix in progress across lanes): AL-SETTINGS-001 (L6:Handoff). Also via ids: AL-TOAST-011. Not retested: B-125, D-059, N-203 | AL-SETTINGS-001 | L6 | — |
| AI | ZI10 | Advice questions | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-SAFETY-002 (L2:Handoff, L7:FPP); AL-AI-SAFETY-004 (L7:FPP×8, L4:Handoff×3, L6:Handoff); AL-PRIVACY-005 (L4:Handoff, L7:Already, L6:Handoff, L7:FPP); AL-AI-SAFETY-006 (L7:FPP×2, L3:Handoff) | AL-AI-SAFETY-002, AL-AI-SAFETY-004, AL-PRIVACY-005, AL-AI-SAFETY-006 | L7 | ZI10 owner note |
| AI | ZI11 | '/log' advertised but needs AI; simple commands do nothing | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-ACTIONS-007 (L4:Handoff, L7:FPP×3); AL-AI-ACTIONS-010 (L7:FPP×2). Not retested: T-104 | AL-AI-ACTIONS-007, AL-AI-ACTIONS-010 | L7 | — |
| AI | ZI12 | Can't answer staking or price questions | AL row specs: tests/grok53/ai | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-AI-FACTS-010 (L7:FPP); AL-AI-FACTS-018 (L7:FPP) | AL-AI-FACTS-010, AL-AI-FACTS-018 | L7 | — |
| AI | ZI13 | Privacy defaults and Help claims | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-PRIVACY-004 (L7:FPP×5, L2:Handoff); AL-PRIVACY-005 (L4:Handoff, L7:Already, L6:Handoff, L7:FPP). Not retested: B-107 | AL-PRIVACY-004, AL-PRIVACY-005 | L7 | — |
| AI | ZI14 | Streak length impossible for the check-in count | ZIGi: streak length vs check-ins | Working | lib/ai/tools/habits.ts:21-24 streakSince (start date) | no | L7 | — |
| AI | ZI15 | 20,000-character messages echoed in full | AL row specs: tests/grok53/ai | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-AI-STABILITY-006 (L7:Already). Also via ids: AL-LIMITS-004 | AL-AI-STABILITY-006 | L7 | — |
| AI | G1 | Read vs write mix-up; label replies 'Answer' or 'Proposed change' (BUG-057, #26) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-005 (L4:Handoff×2, L7:FPP×7, L6:Handoff); AL-AI-FACTS-015 (L7:FPP) | AL-AI-FACTS-005, AL-AI-FACTS-015 | L7 | — |
| AI | G2 | Suggested prompts that don't work; test-gated prompts + honest fallback (BUG-054, #23) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-003 (L4:Handoff×4, L7:FPP×4, L7:Already); AL-AI-FACTS-009 (L7:FPP); AL-AI-FACTS-015 (L7:FPP); AL-AI-FACTS-016 (L7:FPP) | AL-AI-FACTS-003, AL-AI-FACTS-009, AL-AI-FACTS-015, AL-AI-FACTS-016 | L7 | — |
| AI | G3 | Picks the wrong goal or calls an exact name ambiguous (PoC) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-001 (L6:Handoff, L7:FPP×2, L4:Handoff) | AL-AI-FACTS-001 | L7 | — |
| AI | G5 | 15k-character input; help text above preview (BUG-038/060) | AL row specs: lane L10b primitives (unit); tests/grok53/ai | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-AI-FACTS-009 (L7:FPP); AL-AI-ACTIONS-010 (L7:FPP×2); AL-AI-FACTS-015 (L7:FPP); AL-AI-STABILITY-006 (L7:Already); AL-LIMITS-005 (L3:FPP, L4:FPP×2, L5:FPP, L2:FPP, L1:FPP). Also via ids: AL-AI-FACTS-005 | AL-AI-FACTS-009, AL-AI-ACTIONS-010, AL-AI-FACTS-015, AL-AI-STABILITY-006, AL-LIMITS-005 | L10b/L7 | — |
| AI | G7 | Answers from the same stores as the pages, with source badges (#24) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-NUMBERS-SOURCE-014 (L7:FPP×2, L1:Handoff) | AL-NUMBERS-SOURCE-014 | L7 | — |
| AI | G11 | 'Why did it change?' net-worth explainer (#29) | ZIGi: "why did my net worth change?" | Working | lib/ai/tools/why-ai.ts:18 net_worth_change | no | L7 | — |
| AI | G12 | 30-second trade-journal check-in (#30) | Portfolio trade note: 30-second check-in | Working | lib/portfolio/trade-checkin.ts:7-9 | no | L1 | — |
| AI | G15 | Kind streak-break wording (#32) | Streak-break wording | Unknown-needs-browser | lib/ai/context/specialists.ts (prompt wording; model-dependent, no unit test) | no | L7 | F: no real-model calls |
| AI | G4 | No follow-up context, typos, 'mark Read done' (BUG-055/056/058) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-ACTIONS-003 (L7:FPP); AL-AI-FACTS-004 (L4:Handoff×2, L7:FPP×5); AL-AI-FACTS-009 (L7:FPP); AL-AI-ACTIONS-007 (L4:Handoff, L7:FPP×3); AL-AI-FACTS-015 (L7:FPP). Also via ids: AL-AI-FACTS-005 | AL-AI-ACTIONS-003, AL-AI-FACTS-004, AL-AI-FACTS-009, AL-AI-ACTIONS-007, AL-AI-FACTS-015 | L7 | — |
| AI | G6 | ZIGi regression set: 40 checks on every build, 80% launch gate (#21) | ZIGi regression set, 80 % gate | Working | lib/ai/evals/g6-regression.ts:11 (deterministic gate in CI); real-model round = owner | no | L7 | F: no real-model calls |
| AI | G8 | Money and health guardrail: facts only for buy/sell/stake; 'not medical advice' (#22) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-SAFETY-002 (L2:Handoff, L7:FPP); AL-AI-SAFETY-004 (L7:FPP×8, L4:Handoff×3, L6:Handoff); AL-AI-SAFETY-006 (L7:FPP×2, L3:Handoff) | AL-AI-SAFETY-002, AL-AI-SAFETY-004, AL-AI-SAFETY-006 | L7 | — |
| AI | G9 | 'ZIGi · today' card: 3 rule-based lines + 'Why?' (#27) | AL row specs: tests/grok53/ai | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-AI-FACTS-008 (L7:FPP) | AL-AI-FACTS-008 | L7 | — |
| AI | G10 | Screen-aware 'Ask ZIGi' chips (#31) | AL row specs: tests/grok53/ai | Unknown-needs-browser | Grok #53 reopened it (fixed on branch, pending proof): AL-AI-FACTS-008 (L7:FPP) | AL-AI-FACTS-008 | L7 | — |
| AI | G13 | Weekly cross-module recap (#11) | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-FACTS-003 (L4:Handoff×4, L7:FPP×4, L7:Already) | AL-AI-FACTS-003 | L7 | — |
| AI | G14 | ZIGi value metrics and events (#25) | ZIGi value metrics (opt-in, on device) | Working | lib/ai/store/metrics.ts:6-16 | no | L7 | — |
| AI | J10 | One input box for all four modules | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-ACTIONS-007 (L4:Handoff, L7:FPP×3); AL-AI-ACTIONS-010 (L7:FPP×2) | AL-AI-ACTIONS-007, AL-AI-ACTIONS-010 | L7 | J10 owner note |
| AI | L6 | Competitor AI assistants (new) | ZIGi at competitor level | Partly | COMPETITORS.md features 1–9 built (ADR-034); remaining gaps are AL L7 rows + COMPETITOR-GAP rows | no | L7 | L6 owner note |
| AI | N3 | ZIGi claim 'answers questions… never changes anything without your OK' | AL row specs: tests/grok53/ai | Partly | Grok #53 reopened it (fix in progress across lanes): AL-AI-CONNECTION-002 (L6:Handoff, L7:FPP); AL-AI-CONNECTION-003 (L6:Handoff, L7:FPP×2) | AL-AI-CONNECTION-002, AL-AI-CONNECTION-003 | L7 | — |
| AI | AF5 | ZIGi plan bundles are capped at 10 cards, not the planned 24 (H134: one reply's own cap) | Plan bundles capped at 10 cards | Owner decision / owner step | Recorded decision: cap stays 10 (ADR-034; lib/ai/actions/parse.test.ts AF5) | no | L7 | AF5 decision (keep 10) |
| AI | RM1 | ZIGi real-model round + end-of-month API eval (`ZIGI_REAL_MODEL_ROUND.md`): | Real-model round + eval | Owner decision / owner step | Not runnable here: no key in the cloud session; REAL_MODEL_TODO.md | no | L7 | F: no real-model API calls |
| AI | RM2 | The ZIGi "Next polish" items **G1, G2, G3, G5, G7, G11, G12, G15** move into the ZIGi lane, so the two session | G-items in the ZIGi lane | Working | Bookkeeping; see the G rows | no | L7 | — |
| AI | RM3 | ZIGi "Later" items the owner may promote into S2: **G4, G8, G9, G10, G13, G14, N3** | Promoted G4, G8, G9, G10, G13, G14, N3 | Working | Bookkeeping; see those rows | no | L7 | — |

## Session AK: ADR-036 closing table and WIRING_AUDIT_3 rows not fully Working

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| ADR-036/WA3 | F0 | Finish what is open (AFL4 practice-badge memo; AFL3 re-verify) | ADR-036 A12 table; STATUS AK Known limitations | Partly | Everything else in F0 Working (WA3:122). AFL4 memo not built and now recorded (STATUS AK KL "AFL4's practice-badge memo is not built"); AFL3 re-verify still has no dated record (ADR-036:154) | no | L6 | F: non-custodial (no new signed memo) |
| ADR-036/WA3 | G3 | Visual system incl. Health's own empty states | Health → Foods, Recipes, Weight history on a fresh profile | Working | components/health/health-app.tsx:509,510,578 now render `ArtNote` (fixed `b63d568a`) | no | L2 | — |
| ADR-036/WA3 | N2 | NOVA page; widget → page shared-element morph | NOVA → tap a widget (Motion Full / Calm / Off) | Unknown-needs-browser | Built on this branch by L8: components/nova/holo/morph.ts:12-20 (`openWithMorph`, View Transitions; Off/reduced = plain navigation) | AL_SCOPE B (L8 HUD) | L8 | O5 (NOVA motion) |
| ADR-036/WA3 | N10 | NOVA journey incl. brief, workflow, delegation, share setup, erase | tests/journeys/j12-nova.spec.ts:79 | Partly | j12 still ends at Permissions; the five steps live in their own specs (STATUS AK KL "The NOVA journey (j12) covers…") | no | L8 | — |
| ADR-036/WA3 | M1 | Web-native motion incl. shared-element morphs | goal card → goal page; NOVA widget → page | Unknown-needs-browser | Goal title morph built (components/motion/goal-title-morph.tsx); NOVA morph = N2 (L8) | AL_SCOPE B (L8) | L8 | O5 |
| ADR-036/WA3 | M2 | Bento for Today's non-protected area and the pillar overviews | Today, /app/goals, /app/habits, /app/health, /app/wealth | Not built | Recorded only (STATUS AK KL: Today's widget kinds are a stored enum beside the PROTECTED hero); AL-HUD-002 is NOVA's bento only | no | L3 | F: Today hero PROTECTED (needs an owner call to build) |
| ADR-036/WA3 | Part 11 | Visual, layout, tour (LA6 D-196; AF15 parts 2, 3) | Dark theme column widths; Health import with stress readings; Earn Academy name under the lesson bubble | Partly | Tour and layout Working; LA6 D-196 and AF15 parts 2/3 have no closure (WA3 gap 7) | no | L10a / L2 / L6 | — |
| ADR-036/WA3 | Part 14 | Leftovers, verifier, docs, landing | see F0; verifier = AL D2 | Partly | AFL4 recorded; AFL3 re-verify not recorded; hosted verifier currently not runnable (AL D2, Part 1b) | no | L9 / L6 | — |
| ADR-036/WA3 | A12 | Leftover sweep | ADR-036:143-182 | Partly | As F0/Part 11; also the A12 row "M4 (QA2-04)" carries the wrong text (docs fix) | no | INT (docs) | — |
| ADR-036/WA3 | D-OD5 | Brand mark re-encoded; 2× retina file | landing/assets/brand/zigoals-mark-v3.webp | Owner decision / owner step | Re-encoded 54,908 → 51,134 B (`c8dcaffb`); file is 422×480; no larger original anywhere in the repo (see D10) | no | INT | waits on the owner's original (D10) |
| ADR-036/WA3 | Q24 | Today Wrapped card built, not mounted | Today after 1 Dec; Journey → ZIGoals Wrapped | Partly | components/wrapped/wrapped-door.tsx:37-50 `TodayWrappedCard` still unmounted; only `JourneyWrappedLink` is used (components/game/journey.tsx:22); STATUS AK KL "switched off until 1 December" | no | L3 | recorded KL (owner may say delete or keep) |
| ADR-036/WA3 | AFL4 | Prefix-free practice-badge memo | — | Not built | Recorded class c/d (ADR-036:155; STATUS AK KL) | no | L6 | F: non-custodial; nothing new signed |
| ADR-036/WA3 | LA6 D-196 | Dark theme column widths differ | Dark theme, pages with tables at 1440 | Unknown-needs-browser | No closure since AH M47; see AH LA6 | AL-LAYOUT-DESKTOP-012 (via LA6 ids) | L10a | — |
| ADR-036/WA3 | AF15 p2 | Health import view: stress-only readings | Health → Import with stress readings | Unknown-needs-browser | No closure (WA3 gap 7) | no | L2 | — |
| ADR-036/WA3 | AF15 p3 | Academy name under "Jump to your next lesson" bubble while scrolling | Earn → Academy, scroll | Unknown-needs-browser | No closure (WA3 gap 7) | no | L6 | — |
| ADR-036/WA3 | Page transitions | Page fades on every navigation | Motion Full at 1280×720 and phone 3×: Today, Wealth, Earn, Settings, Help | Unknown-needs-browser | Fade skipped when the page left is over the 8 M device-pixel capture budget (STATUS AK KL; `4dfa804c`, `183733b3`); AL-MOTION-002 is the theme cross-fade only | no | L10a | owner's call (Safari pause risk vs more fades; owner list 12) |

## Session AK: STATUS "Known limitations" not covered above

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| STATUS AK KL | KL-help-chain | Help shows chain and wallet answers on a device that never chose the chain | /app/help on a fresh profile; tests/consumer-first-x1.spec.ts does not scan Help | Partly | Unchanged (owner list 8); no AL row | no | L6 | owner list 8 (should Help follow consumer-first?) |
| STATUS AK KL | KL-hero-onchain | Today hero "Onchain · ZIGChain vision" on a fresh device | Today, fresh | Owner decision / owner step | PROTECTED hero; RELEASE_REVIEW R28 | no | — | F: Today hero PROTECTED (R28) |
| STATUS AK KL | KL-studio4-unused | Studio-4 X001 and X020–X022 delivered, not played | Meet ZIGi; chat focus | Not built | components/zigi/state-gallery.ts:85 X020 "Not used yet."; D13 asks to build the held gaze | no | L7 | D13 (build); ZIGi look locked |
| STATUS AK KL | KL-R011 | Reaction R011 rarely plays | go offline twice while ZIGi shows No connection | Working | By design: it plays only on a second offline report (Part 13 host facts) | no | L7 | — |
| STATUS AK KL | KL-earn-tbt | Earn first load ≈ 3.9 s TBT on the phone profile | Lighthouse phone, CPU 4×, /app/earn | Partly | No change found on this branch (components/earn/earn-view.tsx:37 is the only lazy part); = AL D9 | no | L6 | owner decision 6 accepted it for AK; D9 asks to improve |
| STATUS AK KL | KL-keplr-mobile | Keplr Mobile staking over WalletConnect unproven on a real phone | real phone pairing | Owner decision / owner step | Waits on Reown allowed domains (owner list 3) | no | L6 | owner step |
| STATUS AK KL | KL-safari-zigi-box | Words typed into ZIGi's box during the switch to the person's AI are lost (Safari) | WebKit: type while the panel opens with an AI set up | Unknown-needs-browser | = D7: lib/ai/composer-draft.ts:7-10 + components/ai/ai-chat.tsx:629-630 (draft survives remount); unit test only, WebKit not run | P-row of L7 (D7) | L7 | — |
| STATUS AK KL | KL-checklist-offline | Checklist tick plans offline before any online visit | install, go offline, open Checklist, tick | Unknown-needs-browser | INT P-LS-38 changed public/sw.js (pages kept at install / first visit); the tick-plan chunk itself is not named | P-LS-38 (INT) | INT | — |
| STATUS AK KL | KL-push-fdc | Push and the food Worker's FDC search off until activated | Settings → Notifications; Health → food search for a non-barcode food | Partly | Food Worker deployed with FDC_API_KEY 4 Nov (FDC search unverified on #53); push still off (owner list 2) | AL-SETTINGS-007/008 (push copy) | L2 / L6 | push activation = owner step |

## Session AK review docs: findings not fixed / closed / working

EXPLORATORY_BUGS, EXPLORATORY_ROUND3, JOURNEY_BUGS, FIRST_RUN_REVIEW, NOVA_DESIGN_REVIEW, LANDING_REVIEW, RELEASE_REVIEW, RELEASE_REVIEW_2 and Z1A–Z1C: every finding marked fixed in its own doc is left out; below is each one that was recorded, accepted, left for the owner/lead, "no longer reproduces", or has no status line. Every other finding in those docs has a "Fixed" line with a commit.

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| EXPLORATORY_BUGS | EX-17 | Privacy chip "not chosen yet" vs guide "Strict is on" | NOVA fresh | Working | "No longer reproduces" since R2-3: the Privacy chip shows only once a brain is connected | no | L8 | — |
| EXPLORATORY_BUGS | EX-4 note | ZIGi's own panel asks SpeechRecognition.available() on open | open ZIGi in headless shell | Working | components/ai/use-talk.ts has no `available()` call now | no | L7 | — |
| EXPLORATORY_ROUND3 | EX3 left 1 | NOVA left/right panels still say "not reachable" after a refused Hermes key | Hermes with a wrong key → NOVA panels | Partly | components/nova/nova-left.tsx:83, nova-right.tsx:94 use only `reachable` | no | L7 | — |
| EXPLORATORY_ROUND3 | EX3 left 2 | Right panel labels a running-but-refused scan "Offline" | Find models with a token-protected server | Not built | components/nova/nova-right.tsx:88 `r.found ? 'Online' : 'Offline'` | no | L7 | — |
| EXPLORATORY_ROUND3 | EX3 left 3 | A 401 from a Hermes brain shows ZIGi's generic key words | NOVA chat with a Hermes brain and a rotated key | Unknown-needs-browser | Not changed in AK; no AL row found | no | L7 | — |
| JOURNEY_BUGS | J6-2 | Erase → Restore never brings the Checklist back | Settings → Erase, then Restore | Unknown-needs-browser | Reopened by Grok (LS-025, LS-064) | AL-BACKUP-RESTORE-003 | INT | — |
| FIRST_RUN_REVIEW | FR-17 | Fold the habit form's counting fields under "More options" | Habits → + New habit | Working | D-FR17 Working in WA3 (`tests/fr17-habit-more-options.spec.ts`) | no | L3 | F: streak blocks never under More options |
| FIRST_RUN_REVIEW | R2-11 | "Make Today yours" right after "Not now" | fresh Today | Working | R2-11 fixed `15c1e159` (waits until the welcome is answered) | no | L3 | — |
| NOVA_DESIGN_REVIEW | ND-24 | Guide finales drawn as a small NovaOrb | NOVA setup / Hermes guide finale | Owner decision / owner step | Not done: the finale node is the shared path engine (Checklist/Earn) | no | L8 | F: Checklist orbit path PROTECTED |
| LANDING_REVIEW | OD-1 | "Build your own Jarvis" on the landing | landing/index.html | Working | grep: no "Jarvis" in landing/ or app components; STATUS AK OD-1 (guard test) | no | INT | F: never "Jarvis" in public copy |
| LANDING_REVIEW | OD-2 | NOVA availability on the landing and What's new card | landing #new, NOVA chapter | Unknown-needs-browser | Alpha #53 (with NOVA) went live before the 4 Nov landing deploy; check the copy says NOVA is in the Alpha | no | INT | deploy order (owner) |
| LANDING_REVIEW | OD-3 | Two numbering systems (phone menu vs sections) | landing phone menu | Owner decision / owner step | Design call, unchanged | no | INT | owner (design call) |
| LANDING_REVIEW | OD-4 | Page length; "Private by design" far down | landing | Working | STATUS AK: "Private by design" right after the NOVA chapter | no | INT | — |
| LANDING_REVIEW | OD-5 | Brand mark weight / retina | — | Owner decision / owner step | = D-OD5 / D10 | no | INT | owner original |
| RELEASE_REVIEW | R16 | Habits footnote in one sentence; timer/reminder detail to Help; time zone to Settings | /app/habits fresh | Partly | One sentence done (components/habits/habits-workspace.tsx:329); "Habit journal timezone" still on the page (:333) | no | L3 | — |
| RELEASE_REVIEW | R17 | Activity: no simulation-history words for a non-chain person | /app/activity fresh | Working | app/app/activity/page.tsx:64,137 gated on `chain.chosen` | no | L4 | — |
| RELEASE_REVIEW | R18 | Journal: no raw ISO dates in labels/tooltips | /app/journal with a screen reader / hover | Not built | components/journal/journal-page.tsx:61 sr-only `{d.date}: …` and :68 title `${d}: …` still print ISO dates | no | L5 | — |
| RELEASE_REVIEW | R19 | Music chips ≥ 44 px | /app/music at 390 | Working | components/music/music-mix.css:71 `.music-mix-chip{min-height:44px}` | no | L6 | — |
| RELEASE_REVIEW | R23 | Reminders: no owner-facing push status copy | /app/settings/reminders | Partly | "being switched on" copy remains; AL-SETTINGS-008 (real permission state) | AL-SETTINGS-008 | L6 | push activation = owner step |
| RELEASE_REVIEW | R27 | "An estimate, not medical advice" badge | Today Showcase | Working | Recorded, no change needed (separate badge) | no | L3 | — |
| RELEASE_REVIEW | R28 | Today hero "Onchain" line | Today | Owner decision / owner step | PROTECTED; owner's 1.0 wording decision | no | — | F: Today hero PROTECTED |
| RELEASE_REVIEW | R30 | Chart labels ≥ 12 px | /app/wealth charts at 1440 | Partly | Shared charts 14 px (components/charts/chart-look.css:28, charts.css:3); still 11 px: components/wealth/money-tools/money-tools.css:66, wealth/allocation/allocation.css:44, platform/wealth-product.css:84 | no | L1 | — |
| RELEASE_REVIEW_2 | R2-5 | NOVA in Light | NOVA, Light | Owner decision / owner step | Kept as a dark island (`981f6537`) | no | L8 | F: Light's dark islands |
| RELEASE_REVIEW_2 | R2-7 | Alpha banner sentence on every page | ≥ 1024 px fresh | Working | Fixed by lane P2 (Q31, TIER 3 public-safety labels); WA2 "owner decision, not fixed" is stale | no | L10a | — |
| RELEASE_REVIEW_2 | R2-10 | Notes and Tasks findable on desktop | desktop sidebar at 900 and 1380 px tall | Unknown-needs-browser | O4 "Apps" group built (L10a first pass `57fb1e5e`) | L10a O4 | L10a | O4 |
| RELEASE_REVIEW_2 | R2-15 | Unknown is not zero: default quick counters | Health fresh | Owner decision / owner step | Counters kept (feed the Checklist path) | no | L2 | F: Checklist PROTECTED |
| RELEASE_REVIEW_2 | R2-24 | Health/Wealth header actions float | 1280/1440/1920 | Unknown-needs-browser | Not reproducible since `15c1e159` (pinned by release-review-2-p2 spec) | no | L2 / L1 | — |
| Z1A_SECURITY | Z1A-4 rest | Page-pack preview through AboutToSend before "Ask my Hermes" | NOVA → Ask my Hermes | Not built | Lane ZF "for the lead", not done (WA2 "Not counted") | no | L7 | — |
| Z1A_SECURITY | Z1A-5 rest | Hermes guide: recommend approvals or a Docker terminal | /app/nova/hermes | Not built | Copy left for the lead (Z1A fixes table) | no | L7 | — |
| Z1A_SECURITY | Z1A-6 rest | Recognise Hermes from /health `platform: hermes-agent` | connect a Hermes on another address spelling | Not built | Only canonical address matching built | no | L7 | — |
| Z1A_SECURITY | Z1A-7 alt | /api/show check for a model never listed | Strict + unlisted cloud model | Not built | Alternative not built (listing-based `cloudModels` is) | no | L7 | — |
| Z1A_SECURITY | Z1A-8 | Strict sends a redacted copy to an unconfirmed Hermes | Strict + Hermes | Owner decision / owner step | Rule kept; Strict copy says so | no | L7 | owner's rule (Z1A-8) |
| Z1A_SECURITY | Z1A-I1 | No mode chosen: ZIGi cloud vs NOVA Strict defaults disagree | NOVA chat with a cloud key, no mode | Unknown-needs-browser | Info, unchanged in AK; FR-9 now draws Strict as suggested in the guide | no | L7 | — |
| Z1A_SECURITY | Z1A-I2 | Guarded redaction is pattern-based | — | Working | By design; preview is the control | no | L7 | — |
| Z1A_SECURITY | Z1A-I3 | Redaction leaves toolCalls[].arguments and Gemini raw | unit | Not built | Info, "worth covering for robustness" | no | L7 | — |
| Z1A_SECURITY | Z1A-I4 | Hermes key copied into the generic `local` slot | Use Hermes as brain, then pick another local server | Partly | EX3-4 added lib/nova/hermes-keys.ts `hermesKeyToBrain`; still no "forget only the Hermes key" control | no | L7 | — |
| Z1A_SECURITY | Z1A-I5 | "My Hermes runs a local model" never re-checked | — | Not built | Info | no | L7 | — |
| Z1B_SECURITY | Z1B-2 | NOVA briefs restore without the Health choice | Restore with Health off | Working | lib/restore/plan.ts:224-225 (briefs need Health); restore.test.ts:84 | no | INT | — |
| Z1B_SECURITY | Z1B-7 | Restore can make the notes photo sweep delete photos | Notes with photos → Restore → Undo | Not built | Recorded note only (fix lives in notes-workspace.tsx) | no | L5 | — |
| Z1B_SECURITY | Z1B-9 | Showcase photos outlive the Showcase | Showcase on → photos → Showcase off | Not built | Recorded note only | no | L5 / INT | — |
| Z1C_SECURITY | Z1C-L3 | View-transition overlay is click-through | tap during a page transition | Owner decision / owner step | Accepted (≤ 180 ms; review sheet guards hold) | no | L10a | accepted by the AK lead |
| Z1C_SECURITY | Z1C-I2 | Wallet-ended WalletConnect session not observed | end the session in the wallet | Not built | lib/wallets/walletconnect.ts: no `session_delete`/`session_expire` listener | no | L6 | — |
| Z1C_SECURITY | Z1C-I3 | Account not bound to the approved CAIP-10 account; every wallet named "Keplr Mobile" | pair a non-Keplr wallet | Not built | lib/staking/execute.ts:196-201 takes `list[0]` without checking session accounts; components/staking/staking-actions.tsx:194 names it "Keplr Mobile" | no | L6 | — |
| Z1C_SECURITY | Z1C-I4 | Battery/hardware read locally: PRIVACY line | docs/PRIVACY.md | Working | docs/PRIVACY.md:218 names cores, memory, battery, Save-Data | no | INT | — |
| Z1C_SECURITY | Z1C-I5 | Connect-time network race | switch network during connect() | Not built | components/staking/staking-actions.tsx:194-198 does not compare the network after `await connectStaking` | no | L6 | — |
| Z1C_SECURITY | Z1C-I6 | Landing "Jarvis" | landing | Working | = OD-1 | no | INT | F: never Jarvis |

## Session AK WIRING_AUDIT 1 and 2: rows that were not Working then

WIRING_AUDIT_3 re-audited every ADR-036 row on the final AK head; its verdict supersedes these. Most of these gaps were "no browser test", closed by lanes WA/WB/WC/P1.

| audit | row | then | WIRING_AUDIT_3 verdict | state now |
|---|---|---|---|---|
| WA1 | AFL9 Keplr Mobile staking over WalletConnect | Partly working | AFL9 Keplr Mobile staking over WalletConnect: Working | Working |
| WA1 | 1d music for everyone (/app/music, mix, links, BYO Spotify, focus and  | Partly working | 1d music for everyone: Working (unit only for the page's parts) | Working |
| WA1 | Part 2 push (built, switched off) | Partly working | Part 0 records, frozen readers #37–#52: N/A | Working |
| WA1 | A6 storage headroom (Part 3 row) | Partly working | A6 storage headroom (Part 3 row): Working (unit only) | Working |
| WA1 | 4.4 micronutrients (7 extras, report, top sources) | Partly working | 4.4 micronutrients: Working | Working |
| WA1 | 4.7 wearables (FIT, Strava ZIP; Garmin via FIT) | Partly working | 4.7 wearables (FIT, Strava ZIP): Working | Working |
| WA1 | 4.8 recipe polish (per-row match, food picker) | Partly working | 4.8 recipe polish: Working | Working |
| WA1 | 4.9 training and sleep (supersets, RPE, plates, rest, PRs, volume, wak | Partly working | 4.9 training and sleep: Working (wake consistency unit only) | Working |
| WA1 | 5.1–5.4 habits (due/optional, skip reasons, Strength, routine full scr | Partly working | 5.1–5.4 habits: Working | Working |
| WA1 | 6.1 goal bundles from Quick add | Partly working | 6.1 goal bundles: Working | Working |
| WA1 | 6.3 progress card | Partly working | 6.3 progress card: Working | Working |
| WA1 | 6.4 milestone templates, habit links | Partly working | 6.4 milestones, habit links: Working | Working |
| WA1 | 7.2 exchange auto-refresh | Partly working | 7.2 exchange auto-refresh: Working | Working |
| WA1 | 7.4 target mix and drift | Partly working | 7.4 target mix and drift: Working | Working |
| WA1 | 8.8 export bridges (A16) | Partly working | 8.8 export bridges: Working | Working |
| WA1 | 8.10 AFL8 Checklist extras section | Partly working | 8.10 AFL8 Checklist extras: Working (off until the owner's private-sync redeploy, stated) | Working |
| WA1 | 8.2 daily orbit card | Partly working | 8.2 daily orbit card: Working | Working |
| WA1 | 8.3 weekly ZIGi insight | Partly working | 8.3 weekly insight: Working | Working |
| WA1 | 8.4 monthly balance note | Partly working | 8.4 monthly balance note: Working | Working |
| WA1 | P10 #2 "does X affect Y?" (Compare) | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #3 nutrition-label scan | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #4 top sources of a nutrient | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #5 warm-up calculator | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #6 mood words | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #7 weekly calorie budget | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #8 muscle freshness | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #9 energy curve | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #12 financial-independence model | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #13 year in pixels | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #14 report for a visit | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #16 export to Loop | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #17 family emergency sheet | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #18 fee drag | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #19 rewards shelf | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #20 diet templates | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | P10 #21 recurrence phrase box | Partly working | Part 10 #1–#22: Working | Working |
| WA1 | A6 storage headroom | Partly working | A6 storage headroom (Part 3 row): Working (unit only) | Working |
| WA1 | A9 Reown allowed domains | Partly working | A9 Reown allowed domains: Working (copy; owner step) | Working |
| WA1 | A16 honest export bridges | Partly working | A16 export bridges: Working | Working |
| WA1 | F0 finish what is open | Partly working | F0 finish what is open: Partly | Partly |
| WA1 | F2 full app testing (journeys) | Partly working | F2 journeys: Working | Working |
| WA1 | F4 ZIGChain ecosystem, deeper (read-only) | Partly working | F4 ZIGChain deeper: Working (unit only) | Working |
| WA1 | F5 new features | Partly working | F5 new features: Working | Working |
| WA2 | N1 one engine, two companions (shared history, hand-offs, delegation,  | Partly working | N1 one engine, two companions: Working | Working |
| WA2 | N2 the NOVA page (opening, orb, chat, dock, widgets, chips, panels, ma | Partly working | N2 the NOVA page: Partly | Partly |
| WA2 | N5 NOVA acts (confirm cards with Undo for every pillar) | Partly working | N5 NOVA acts: Working | Working |
| WA2 | N7 long-term memory (see, edit, pin, forget, export; in export, **rest | Partly working | N7 long-term memory: Working | Working |
| WA2 | N8 always open (start page, picture-in-picture, unread briefs, ⌘/Ctrl+ | Partly working | N8 always open: Working | Working |
| WA2 | N10 tests (units, specs, **NOVA journey**, evals, REAL_MODEL_TODO) | Partly working | N10 tests incl. the NOVA journey: Partly | Partly |
| WA2 | N11 Hermes Agent (research, brain, privacy rule, delegation, summary,  | Partly working | N11 Hermes Agent: Working | Working |
| WA2 | B5 Markdown ZIP export/import; "Chat with my notes" | Partly working | not listed separately in WA3 | Unknown-needs-browser |
| WA2 | T1 tasks and goal next-actions on the Agenda **and as a NOVA widget** | Partly working | not listed separately in WA3 | Unknown-needs-browser |
| WA2 | T3 Pomodoro from a task, with the ambient player **and a NOVA widget** | Partly working | not listed separately in WA3 | Unknown-needs-browser |
| WA2 | #20 a chat that isn't kept ("Don't keep this chat") | Not reachable | G1 BUILD list 2: Working (#20 built `8726fa0a`) | Working |
| WA2 | G8 ZIGi and NOVA tools for G1 | Partly working | G8 tools for G1: Working | Working |
| WA2 | M1 web-native motion | Partly working | M1 web-native motion: Partly | Partly |
| WA2 | M2 next-gen surfaces | Partly working | M2 next-gen surfaces: Partly | Partly |
| WA2 | M3 ambient and attention | Partly working | M3 ambient and attention: Working | Working |
| WA2 | M5 performance before/after | Partly working | M5 performance before/after: Working | Working |
| WA2 | Z1B-10 photo send confirmation | Partly working | Z1 security review: Working | Working |
| WA2 | Z1C-L1 start-on-NOVA re-check, Z1C-L2 ⌘/Ctrl+J not over a dialog | Partly working | Z1 security review: Working | Working |
| WA2 | Z1C-L4 landing privacy claim | Partly working | Z1 security review: Working | Working |
| WA2 | R2-1 NOVA's phone chat reads records (Blocker) | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-10 finding Notes and Tasks | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-15 unknown is not zero | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-18 Notes capture box | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-19 Health header actions | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-21 Showcase habit whys | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |
| WA2 | R2-25 one-tap habit ideas | Partly working | G2 release review 2: N/A (fix in code; WA2 gap was a missing test, added by P1 lane WB) | Working |

## AL_SCOPE D7–D13 (carried list)

| source | id | what it promised | how to check | state | evidence | already an AL row? | lane | owner decision? |
|---|---|---|---|---|---|---|---|---|
| AL_SCOPE D | D7 | ZIGi composer keeps typed text across the on-device → connected switch (WebKit) | WebKit: type while ZIGi switches to a connected AI; lib/ai/composer-draft.test.ts | Unknown-needs-browser | Built: lib/ai/composer-draft.ts:1-10, components/ai/ai-chat.tsx:629-630; unit test only, no WebKit run | L7 lane (D7) | L7 | — |
| AL_SCOPE D | D8 | WebKit engine crash rule: one re-run, record, never chase | docs/review/session-al/CI_INTERMITTENTS.md "Recorded, not chased" | Working | Recorded as the rule (class B compositor segfault) | L9 | L9 | D8 |
| AL_SCOPE D | D9 | Earn first load ≈ 3.9 s TBT on the phone profile: improve | Lighthouse phone profile, CPU 4×, median of 3 | Partly | No Earn performance change found on the branch (only `StakingClarity` is lazy, components/earn/earn-view.tsx:37); no lane row | no | L6 | owner decision 6 (accepted for AK) |
| AL_SCOPE D | D10 | Sharp 2× zigoals-mark-v3 | landing/assets/brand/zigoals-mark-v3.webp | Owner decision / owner step | Only file in the repo is 422×480 (51,134 B); apps/web/public/brand/zigoals-logo-480.webp is the same 422×480; X012-idle-logo-large (480×632) is a ZIGi figure, docs/igoals-wordmark-owner.jpg is the wordmark → no larger original: "waits on the owner's original" | no | INT | waits on the owner |
| AL_SCOPE D | D11 | Fineli EU food library from review/ak-food-data | `git ls-remote origin refs/heads/review/ak-food-data` | Not built | Branch does not exist (ls-remote empty; review/* lists 29 other branches); no Fineli code → record "waits on the raw files" | no | L2 | waits on the owner's data branch |
| AL_SCOPE D | D12 | Bearable importer, ZIGChain EVM balances, AFL1/AFL3 blocked, AFL2/AFL4 recorded | repo docs only | Not built | No newer fact in the repo: Bearable "no documented export" (ADR-036:880); EVM "no live mainnet RPC" (ADR-036:773); AFL1: installed @cosmjs/stargate 0.38.1 authz aminomessages.js still "IMPLEMENT ME"; AFL3 class c (no re-check record); AFL2 d, AFL4 c/d | no | L6 / L2 | F: non-custodial; no fake integrations |
| AL_SCOPE D | D13a | Studio-4: R013 landing frames arm/body contact | Meet ZIGi → R013 | Not built | Art polish (Studio-4 asset); no change found | no | L7 | ZIGi look locked (art fix only) |
| AL_SCOPE D | D13b | Four 120-frame idle loops fit 400 KB only at 24 fps q70 | X010, X011, X012, X051 sizes | Partly | Recorded; no re-encode found | no | L7 | ZIGi look locked |
| AL_SCOPE D | D13c | Held gaze X020–X022 on the right event (build it) | ZIGi panel: focus the chat box | Not built | components/zigi/state-gallery.ts:85 X020 "Not used yet."; manifest.json:436 holds the frames | no | L7 | ZIGi look locked (event wiring only) |
| AL_SCOPE D | D13d | HEVC-alpha MOVs | tools/mac-hevc-alpha.sh | Owner decision / owner step | Needs macOS (owner) | no | — | owner step |

## Counts

368 rows in the tables above (287 AH/AI, 71 Session AK, 10 D7–D13), plus 69 WIRING_AUDIT 1/2 rows superseded by WIRING_AUDIT_3.

"Partly" on an AL row means the Grok #53 run reopened it and at least one of its lane rows is still handed to another lane or open; "Unknown-needs-browser" on an AL row means every lane row says Fixed-pending-proof or Already fixed. Neither needs a new lane row; both are replayed with the AL specs.

**Per state**

| state | rows | of which already an AL row (cited) | not yet an AL row |
|---|---|---|---|
| Partly | 163 | 120 | 43 |
| Working | 81 | 0 | 81 |
| Unknown-needs-browser | 64 | 37 | 27 |
| Not built | 22 | 0 | 22 |
| Owner decision / owner step | 19 | 0 | 19 |
| see (same fix as another row) | 17 | 1 | 16 |
| N/A (process) | 2 | 0 | 2 |

**Per lane** (a row naming two lanes counts once in each)

| lane | rows | not Working and not yet an AL row |
|---|---|---|
| L7 | 64 | 22 |
| L2 | 58 | 9 |
| L6 | 57 | 22 |
| L3 | 48 | 14 |
| L1 | 47 | 7 |
| L4 | 37 | 1 |
| L10a | 31 | 6 |
| INT | 30 | 6 |
| L10b | 29 | 0 |
| L9 | 12 | 4 |
| L5 | 6 | 3 |
| L8 | 6 | 3 |
| — | 5 | 0 |
| all | 2 | 2 |
| INT (docs) | 1 | 1 |

## To send to lanes (not Working, not yet an AL row)

| lane | rows |
|---|---|
| INT | AF14 (Partly), SEC (Partly), Z1B-9 (Not built) |
| INT (docs) | A12 (Partly) |
| L1 | TR7 (Partly), WE7 (Partly), WE16 (Not built), CO6 (Partly), R30 (Partly) |
| L10a | LA6 (Partly), Part 11 (Partly) |
| L2 | HE9 (Partly), HE11 (Partly), E1 (Partly), AF15 (Partly), Part 11 (Partly), D11 (Not built), D12 (Not built) |
| L3 | HA1 (Partly), HA4 (Partly), HA8 (Partly), HA13 (Partly), TO12 (Partly), CO4 (Partly), AF15 (Partly), M2 (Not built), Q24 (Partly), R16 (Partly) |
| L4 | GO4 (Partly) |
| L5 | R18 (Not built), Z1B-7 (Not built), Z1B-9 (Not built) |
| L6 | ST3 (Partly), SE7 (Partly), SE8 (Partly), CO11 (Not built), MO3 (Partly), AF15 (Partly), RM8 (Partly), F0 (Partly), Part 11 (Partly), Part 14 (Partly), AFL4 (Not built), KL-help-chain (Partly), KL-earn-tbt (Partly), Z1C-I2 (Not built), Z1C-I3 (Not built), Z1C-I5 (Not built), D9 (Partly), D12 (Not built) |
| L7 | F1 (Partly), ZI4 (Partly), L6 (Partly), KL-studio4-unused (Not built), EX3 left 1 (Partly), EX3 left 2 (Not built), Z1A-4 rest (Not built), Z1A-5 rest (Not built), Z1A-6 rest (Not built), Z1A-7 alt (Not built), Z1A-I3 (Not built), Z1A-I4 (Partly), Z1A-I5 (Not built), D13a (Not built), D13b (Partly), D13c (Not built) |
| L8 | N10 (Partly) |
| L9 | CI5 (Partly), CI7 (Partly), Part 14 (Partly) |
| all | L1 (Partly), L2 (Partly) |

## Rows that need a browser replay to decide

Not yet an AL row and *Unknown-needs-browser* (the AL rows in that state are replayed with their own specs):

- **DS8** (AH): Settings → Backup & restore in Showcase: restore from file, Restore Habits hint
- **WE10** (AH): Wealth at 375: net worth visible, one heading, Add-asset sheet padding
- **HA7** (AH): Journey → streak freeze: count, confirm, how earned
- **HA14** (AH): Habit cards at 375
- **SE2** (AH): Settings review day vs Reminders
- **SE10** (AH): Help & diagnostics: contact address, build string
- **LA10** (AH): Hover feedback on links/cards
- **E2** (AH): axe: nested interactive chart parts, invalid <dl>
- **H3** (AH): First visit: duplicate widgets, two swan logos
- **J3** (AH): Habit → add €X to a goal on completion
- **AF3** (AH): Earn: own OroSwap LP and USDC vault shares
- **AF7** (AH): Hosted verifier /api/push abort
- **HE17** (AI): ZIGi photo of a meal with an estimate range
- **G15** (AI): Streak-break wording
- **N2** (ADR-036/WA3): NOVA → tap a widget (Motion Full / Calm / Off)
- **M1** (ADR-036/WA3): goal card → goal page; NOVA widget → page
- **AF15 p2** (ADR-036/WA3): Health → Import with stress readings
- **AF15 p3** (ADR-036/WA3): Earn → Academy, scroll
- **Page transitions** (ADR-036/WA3): Motion Full at 1280×720 and phone 3×: Today, Wealth, Earn, Settings, Help
- **KL-safari-zigi-box** (STATUS AK KL): WebKit: type while the panel opens with an AI set up
- **KL-checklist-offline** (STATUS AK KL): install, go offline, open Checklist, tick
- **EX3 left 3** (EXPLORATORY_ROUND3): NOVA chat with a Hermes brain and a rotated key
- **OD-2** (LANDING_REVIEW): landing #new, NOVA chapter
- **R2-10** (RELEASE_REVIEW_2): desktop sidebar at 900 and 1380 px tall
- **R2-24** (RELEASE_REVIEW_2): 1280/1440/1920
- **Z1A-I1** (Z1A_SECURITY): NOVA chat with a cloud key, no mode
- **D7** (AL_SCOPE D): WebKit: type while ZIGi switches to a connected AI; lib/ai/composer-draft.test.ts

Also replay on the production build: every *Working* row above whose evidence lists "Not retested" ids (the bots never looked), and the night case of AF6 (00:00–02:00 Brussels).


## Part 14 results (8 Nov)

Owner rule 10 (8 Nov): browser-verify only the rows above that were not Working, and fix them. The 73 rows of the Part 14
list (states Unknown-needs-browser, Partly, Not built; none owned by an AL row), read on `feature/session-al-fix-everything`
at `1de82b24` plus the working tree. Most were already worked by the Part 14 lanes P14-A, P14-B and P14-D
(`5848c55c`, `be9c97a0`, `d5cd0c8e`, `3f4fb8b9`; lanes/P14-A.md, P14-B.md, P14-D.md), and every cross-lane request those
lanes left is now in the code (nova-left.tsx:92 and nova-right.tsx:89/97 `hermesPanel`/`scanStatus`; nova-command.tsx:115
`noteNovaDraft`; meet-moves.test.ts:25 `['X001']`; hermes/forget-key.tsx; path.tsx:394 `.path-label`; health.css:116;
showcase-photos.test.ts). So this pass is mostly proof.

Browser runs (Chromium, the shared lock, desktop + mobile projects): **B1** = :3103, the production build of `37d2370c`
(it holds all four P14 commits), the P14 lanes' own specs (p14a/*, ai/p14b-*, shell/p14d-*, wealth/p14d-wealth-375):
58 passed, 10 skipped by design (one-project tests), 2 timed out (`page.goto` of /app/health over 45 s while other lanes'
runs loaded the machine; both passed in B4). **B2** = :3103, the new `tests/grok53/p14/part14-earlier.spec.ts` plus
goal-morph-ak, hud/sweep4-morph, release-review-2-p2, journey and the moved D7 spec: 36 passed, 5 skipped, 3 failed (J3
mobile on the spec's own URL check; KL-checklist-offline, the open row below). **B3** = `next dev` of this working tree on
:3111 for the changes not in that build (R18, Z1B-7, D7): the R18 test, journal-ai, tasks/al-second-pass, notes, the D7
spec and al-stability, 26 passed. **B4** = :3103 re-runs: J3, H3, LA6 D-196 and LA10 passed; KL-checklist-offline still
fails (then reproduced step by step with a plain script). Unit: 118 files / 892 tests in the P14 and touched folders
(lib/nova, lib/ai privacy and evals, wallets, staking, zigi-studio4, motion, notes, journal, wrapped, secret-guard, the
p14d tests); `vitest run scripts` passes except pre-run11-setup (known, sandbox-only) once the timing tests run without
other lanes' load (6 failed under load, all passed when re-run alone).

Verdicts: **Working** (works on this branch, evidence) · **Fixed** (fixed on this branch: by a P14 lane, or here — files
named) · **Part 15** (competitor/roadmap) · **Waits on owner** (the exact step) · **Owner decision** (a recorded decision
stands) · **Carried** (cause in one line).

| id | verdict | evidence / files |
|---|---|---|
| WE10 | Fixed (P14-D, proof) | B1 wealth/p14d-wealth-375 "WE10" passed desktop + mobile: at 375 the total on the first screen, one h1, Add-asset sheet ≥ 12 px padding, no sideways scroll |
| WE16 | Owner decision | ADR-034 N36 (offline search reads the full catalogue); splitting it changes the API route and offline search (P14-D) |
| HA7 | Working | B2 tests/journey.spec.ts:76 passed desktop + mobile: "You have 2 freezes" (earned by seven-day streaks), the confirm dialog, "Freeze used: Oct 6 now counts as a rest day", stored `disposition: skipped` |
| SE2 | Working | B1 p14a/se2-one-review-day passed: the review day chosen in Settings is the one Reminders names |
| SE7 | Working | push-reminders-panel.tsx:39 "Not available here", music-settings.tsx:34 "Not set up"; the real permission line is AL-SETTINGS-008 (L6's AL row, not counted here) |
| SE10 | Working | B2 p14/part14-earlier "SE10" passed desktop + mobile: Help's mailto addresses; Settings → Help & diagnostics "App version / build commit" filled |
| CO4 | Part 15 (competitor/roadmap) | P&L row and logging from the week grid's cells (ADR-033 M42 "later"; J16 owner note) |
| CO6 | Part 15 (competitor/roadmap) | net worth history by source; back-filling would invent data (F: unknown is not zero) |
| MO3 | Waits on owner | ZIGi free-form and the weekly review are built; push: the owner switches push on (ADR-033 M48) |
| E2 | Working | B1 shell/p14d-earlier-scope "E2" passed: Wealth and Portfolio (Showcase) have no nested-interactive, dlitem, definition-list, list or listitem findings |
| F1 | Owner decision | the idle clip is fetched under Calm and Full; `F001-idle.anim.webp` is 2,356,876 bytes (the 358 KB on record is the APNG); a re-encode changes the locked ZIGi look (AL_SCOPE D13; P14-B) |
| H3 | Working | B4 p14/part14-earlier "H3" on a first visit (welcome not answered) at 1280: one swan figure (the sidebar mark; its words image is the same mark), none on the phone, and Today's six widget headings each once ("Set up your first goal…", "Your day", "Your daily balance.", "Goals", "Your goals", "Your widgets"); the swan intro itself is PROTECTED |
| J3 | Working | B4 p14/part14-earlier "J3" passed desktop + mobile (in B2 the mobile run failed on the spec's own URL check, now path-only): completing a habit linked to a private Goal shows "Add to its Goal" in the toast, nothing is added by the tick, the link opens that Goal with its funding form ("Contribution mode"); the page then drops `?contribute=1` from the address (ActionIntent) |
| L1 | Part 15 (competitor/roadmap) | Multi competitor UX; the AL-COMPETITOR-GAP rows |
| L2 | Part 15 (competitor/roadmap) | personalEverything, HALO, Lifemova…; the AL-COMPETITOR-GAP rows |
| AF3 | Waits on owner | components/earn/your-shares.tsx reads /api/earn/shares per real-network wallet; step: open Earn with a real ZIGChain address that holds an OroSwap LP and a USDC vault share, after the next deploy |
| AF7 | Waits on owner | the verifier runs under plain Node again (`scripts/lib/hosted-alpha-stages.test.mjs` 11/11; CI step ci.yml:56); step: the owner's next hosted verifier run after a deploy shows whether the late `/api/push` abort still reads "completed with findings" |
| AF14 | Waits on owner | Dependabot: glob GHSA-3g3m-2fjr-6pw4 and minimatch GHSA-g3hv-75wg-m249 (build tooling only); step: approve one of the options in docs/dependencies/AL_REVIEW.md (no dependency change without approval) |
| AF15 | Fixed (parts 2, 3) / Owner decision (the rest) | Health import's last note ends 48 px above the footer art (health.css:116, `39f9cf53`); the Academy jump bubble never covers a lesson name (path.tsx:394, B1 p14a/af15-p3-academy-bubble passed); the Habits time headings and the Checklist name on the protected orbit stay as the audits judged them (ADR-033 M47) |
| RM8 | Waits on owner | everything else in RM8 was done before AH; Face ID / passkey needs a real iPhone and a server-side check |
| SEC | Waits on owner | = AF14 (two moderate alerts on `main`, build tooling only) |
| CI5 | Working | tests/webkit-earn.spec.ts:4,21 uses the shared `webkitCancelled` filter (CI_INTERMITTENTS Fix 3) |
| CI7 | Owner decision | theme-parity-af:15 is the recorded Chromium renderer stall without a GPU (AL_SCOPE D8: record only; CI_INTERMITTENTS.md) |
| HE17 | Fixed (device part) / Owner decision (model part) | lib/ai/local-answers/p14b.ts `mealPhotoReply` (eval g6-p14b photo cases pass, unit run here); the ranged estimate from a real model needs a key the cloud session does not have (F); REAL_MODEL_TODO "Session AL Part 14" |
| G15 | Fixed (device part) / Owner decision (model part) | p14b.ts `streakBreakReply` (kind, the habit engine's figures; EN + NL; g6-p14b passes); the model's own wording: REAL_MODEL_TODO |
| L6 | Part 15 (competitor/roadmap) | ZIGi at competitor level: the remaining AL-COMPETITOR-GAP rows |
| F0 | Owner decision (AFL4) | AFL3 re-checked 4 Nov at zigchain-1 height 13,509,652: `code_upload_access` AnyOfAddresses (15), so class c stands (P14-A); AFL4 below |
| N2 | Working | B2 p14/part14-earlier "N2" passed desktop + mobile: NOVA's goals widget → /app/goals runs the zoom morph in Full, the fade in Calm, and no morph (a plain navigation) in Off; sweep4-morph m7 passed |
| N10 | Carried to next session | test-only: j12 still ends at Permissions; the five steps pass in their own specs (nova-workflows:53 workflow, :150 briefs, nova-wa:41 delegation, nova-setup:174 setup sharing, journey 6 erase); folding them into one journey is a 240 s spec of its own (L8) |
| M1 | Working | B2 tests/goal-morph-ak.spec.ts passed desktop + mobile: Full morphs the goal card title into the page heading; Calm, Off and reduced motion start no transition; NOVA's morph = N2 |
| M2 | Part 15 (competitor/roadmap) | Bento for Today's non-protected area and the pillar overviews; Today's hero is PROTECTED (needs an owner call) |
| Part 11 | Fixed | LA6 D-196 (L10a BN-127, components/ui/ui.css): B4 shell/p14d-earlier-scope "LA6 D-196" passed on :3103 (in B1 it had timed out on a slow /app/health load); LA10 likewise; AF15 p2 and p3 as above |
| Part 14 | Working (L9 part) / Owner decision (L6 part) | the hosted verifier loads under plain Node (`node scripts/verify-hosted-alpha.mjs --help`; CI step); AFL4 below |
| A12 | Working | ADR-036:158 "M4 (QA2-04)" carries the knock-reminder text again (AK C1); its other parts are AF15, AFL3, AFL4 |
| Q24 | Fixed | components/dashboard/today-wrapped.tsx (mounted, lazy) shows the card in its season; B2 p14/part14-earlier "Q24" passed desktop + mobile: 5 Dec 2026, three logged days → "Your 2026, wrapped" on Today, Open Wrapped opens the story; al-third-today "Q24" keeps it away in November |
| AFL4 | Owner decision | the prefix-free practice-badge memo is a new signed memo; "no change to wallet signing" rules it out without the owner |
| AF15 p2 | Fixed | health.css:116 (`39f9cf53`): the Import view's last note ends 48 px above the footer art (it read 2.31:1 on it) |
| AF15 p3 | Fixed | path.tsx:394 `.path-label` in the jump bubble's cover list (not the Checklist orbit); B1 p14a/af15-p3-academy-bubble passed |
| Page transitions | Fixed (P14-D) | B1 shell/p14d-page-transitions passed: leaving Today, Wealth, Earn, Settings and Help in Full motion fades within the capture budget at 1280×720 and 390×844 at 3×; Motion Off starts none |
| KL-help-chain | Owner decision | owner list 8, unanswered: gating 13+ Help topics on the chain choice rewrites ~40 Help specs (P14-A's plan) |
| KL-studio4-unused | Fixed (X020–X022) / Owner decision (X001) | B1 ai/p14b-held-gaze passed: X020 while the chat box is focused, X022 while cards wait, none with Motion Off; X001 has no moment named anywhere and the ZIGi look is locked |
| KL-earn-tbt | Carried to next session | Lighthouse is not installed (no new dependencies); a proxy on :3103 (37d2370c, which has P14-A's memoised sections): phone 412 px, CPU 4× through CDP, long tasks after FCP, median of 3 = **4.07 s** (3.99 / 4.07 / 4.21; the machine was shared with other lanes' runs). No measured gain over the 3.9 s on record; Earn is being changed by L5+L6 now, so the next step (measure with the AK Lighthouse method, then split Earn's first render) belongs to them |
| KL-safari-zigi-box | Fixed (CI WebKit coverage) | = D7 |
| KL-checklist-offline | Carried to next session | Reproduced (not working) on :3103: only Today visited online, the worker active and `/app/checklist` in its page cache, then offline → the Checklist hydrates but stays on "Loading your path…"; five `/_next/static/chunks` fail (the lazy path view, checklist-page.tsx:60 `usePathView`, and four siblings, ≈ 120 KB), because public/sw.js `precache()` keeps only the files each page names in its HTML. Keeping every lazy chunk one level down would add 396 files / 9.1 MB to the install (158 / 5.5 MB for the Checklist alone), so not done blind; the fix (warm the Checklist's path-view chunk once the worker is installed, checked on a production build) is in Checklist files L5 is editing. Repro: tests/grok53/p14/part14-earlier.spec.ts "KL-checklist-offline" (P14_PRODUCTION=1, production build only); 2 attempts used (spec, diagnostic) |
| EX3 left 1 | Fixed | nova-left.tsx:92 and nova-right.tsx:97 use `hermesPanel` (a refused key reads as refused, not "not reachable"); lib/nova/p14b-hermes.test.ts passes |
| EX3 left 2 | Fixed | nova-right.tsx:89 `scanStatus`: "Running" for a server that answered but refused or wanted a key, "Offline" only when nothing answered; p14b-hermes.test.ts |
| EX3 left 3 | Fixed | lib/nova/hermes-record.ts `hermesKeyFailure`: a 401/403 from the person's Hermes reads "Hermes refused the key." with the `hermes config get API_SERVER_KEY --raw` step (unit); the live rotated-key check: REAL_MODEL_TODO |
| OD-2 | Working | the Alpha with NOVA went live 4 Nov 00:15, the landing 20:42; landing/index.html's NOVA chapter (06) has no availability caveat (its one "coming" is the example dashboard's "coming online" caption). What's new has no NOVA card because NOVA has its own chapter; adding one changes the pinned card list and bento (landing-ak-claims, LR-11): a landing design call |
| R16 | Working | the footnote is one sentence (habits-workspace.tsx:358); the time zone is a quiet fold that points to Settings → Your time zone, where the same choice lives (:359, AL R16) |
| R18 | Fixed (here) | components/journal/journal-page.tsx: an entry's day, its Remove label and the energy bars' tooltip and screen-reader text say the day in words (`<time dateTime>` keeps the ISO day); tests/journal-ai.spec.ts:35 and tests/grok53/tasks/al-second-pass.spec.ts:43 name the button by the same words (deliberate, equally exact). B3 p14/part14-earlier "R18" (no ISO date in any text, title or aria-label of the Journal) and both specs passed desktop + mobile on :3111 |
| R30 | Fixed (P14-D) | B1 shell/p14d-earlier-scope "R30" passed: no Wealth chart or market-card text under 12 px (Showcase, 1440) |
| R2-10 | Working | B1 p14d-earlier-scope "R2-10" (1440 × 900 and × 1380) and B2 release-review-2-p2 "R2-10" passed |
| R2-24 | Working | B2 tests/release-review-2-p2.spec.ts:96 passed: at 1440 the Health and Wealth header actions sit with the title and subtitle |
| Z1A-4 rest | Fixed (P14-B) | components/nova/chat/hermes-preview.tsx; B1 ai/p14b-nova "Z1A-4" passed: "Ask my Hermes" shows what goes first, redacted in Strict while Hermes is not confirmed local |
| Z1A-5 rest | Fixed (P14-B) | lib/nova/hermes-guide.ts `HERMES_SANDBOX` (Docker terminal backend, `memory.write_approval`); p14b-hermes.test.ts |
| Z1A-6 rest | Fixed (P14-B) | lib/ai/privacy-probes.ts + privacy-mode.ts `probes.hermes`: a local server whose /health says `platform: hermes-agent` counts as an unconfirmed Hermes (redacted, no tools); p14b-hermes.test.ts; live: REAL_MODEL_TODO |
| Z1A-7 alt | Fixed (P14-B) | privacy-probes.ts `ollamaShowsCloud`: an Ollama model never listed is asked once with /api/show in Strict/Guarded; p14b-hermes.test.ts |
| Z1A-I1 | Fixed (honest part) / Owner decision (the default) | NOVA's composer says what a cloud send with no mode chosen does, with a link to choose (B1 ai/p14b-nova "Z1A-I1" passed); ZIGi's no-mode default is a privacy-default change for the owner |
| Z1A-I3 | Fixed (P14-B) | lib/ai/privacy-mode.ts `mapStrings`/`mapArguments` and lib/secret-guard/redact-span.ts: `toolCalls[].arguments` and Gemini's `raw` turn are redacted too; names, ids and thought signatures unchanged; p14b-hermes.test.ts |
| Z1A-I4 | Fixed | ai-setup.tsx: a local server without a token no longer inherits the copied Hermes key; components/nova/hermes/forget-key.tsx "Forget the Hermes key" (`forgetHermesKey`) |
| Z1A-I5 | Fixed | hermes-record.ts `localModelStillConfirmed`/`confirmationLapsedLine`: the confirmation holds for its gateway and Hermes version only; read by first-run.tsx:30, further.tsx:37, privacy.tsx:27, hermes-card.tsx:20 |
| Z1B-7 | Fixed (here) | lib/notes/photos.ts `sweepNotePhotos` (+ optional `orphanSince` on the photo value, additive): a photo no note names is marked and deleted only after 30 days unnamed, so Undo of a Restore finds today's photos; components/notes/notes-workspace.tsx calls it on arrival (the unused `orphanPhotoIds` removed). Unit lib/notes/photos-orphan-z1b7.test.ts (3); notes specs passed on :3111 (B3) |
| Z1B-9 | Fixed | lib/showcase-storage.ts `clearShowcasePhotos` on Showcase start and end (`30ad598b`); lib/showcase-photos.test.ts passes |
| Z1C-I2 | Fixed (P14-A, TIER 3 wallet) | lib/wallets/walletconnect.ts `session_delete`/`session_expire` (unit walletconnect-session-end, passes); a live wallet ending the session: needs the owner's phone wallet |
| Z1C-I3 | Fixed (P14-A, TIER 3 wallet) | lib/staking/execute.ts: the account must be one of the session's CAIP-10 accounts; the wallet is named by its session (unit walletconnect-account-bound, passes) |
| Z1C-I5 | Fixed (P14-A, TIER 3 wallet) | staking-actions.tsx drops a connection whose network changed during connect (reasoned; the race needs a live wallet) |
| D7 | Fixed (CI WebKit coverage, here) | the D7 test moved from tests/grok53/ai/al-stability.spec.ts to tests/zigi-composer-switch.spec.ts (assertion unchanged), whose `zigi-*` name puts it in CI's WebKit job (playwright.webkit.config.ts:12); the old file never ran there. Passed in Chromium desktop + mobile on :3103 and :3111; WebKit is not installed in this sandbox, so its first WebKit run is the next CI |
| D9 | Carried to next session | = KL-earn-tbt |
| D11 | Waits on owner | `git ls-remote origin refs/heads/review/ak-food-data` is still empty (8 Nov); step: push the raw Fineli files to that branch |
| D12 | Waits on owner | facts re-checked by P14-A (4 Nov): AFL1 cosmjs authz amino "IMPLEMENT ME"; AFL3 class c; no official public ZIGChain EVM RPC; Bearable documents no export format; AFL2/AFL4 owner classes |
| D13a | Owner decision | R013's landing frames are Studio-4 art; the ZIGi look is locked (AL_SCOPE D13) |
| D13b | Owner decision | the four idle loops are 2.0–2.1 MB each; a 24 fps q70 re-encode is an art change to the locked look |
| D13c | Fixed (P14-B) | components/zigi/gaze.ts, use-gaze-hold.ts; B1 ai/p14b-held-gaze passed desktop + mobile (X020, X022, none with Motion Off) |

Counts (73 rows, by each row's first verdict): **Fixed 31** (by the P14 lanes, proven here; fixed in this pass: R18, Z1B-7,
D7 and KL-safari-zigi-box) · **Working 16** · **Owner decision 8** · **Waits on owner 8** · **Part 15 6** · **Carried 4**
(N10, KL-earn-tbt, D9, KL-checklist-offline).

Asks for files other lanes are editing now: **L5 (Checklist) with the integrator (public/sw.js)**, KL-checklist-offline:
once the worker is installed, warm the Checklist's path-view chunk (checklist-page.tsx:60 `usePathView`) and the four
small chunks it waits on, so they land in `zigoals-static-v1`; check it on a production build with the reproduction above
(a shell-side `import()` may get its own chunk name under Turbopack, so only a production run proves it). **L5+L6 (Earn)**,
KL-earn-tbt / D9: measure with the AK Lighthouse method; the proxy above found no gain yet.
