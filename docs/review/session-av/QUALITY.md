# Session AV — fresh-agent quality check (owner follow-up 2, item 1c)

Every feature Session AV built (F-PROMPT, F-YEAR and Build order ranks 1–49 in COMPETITORS.md) was checked by four
helpers that did not write it, against the eight checks of 1c: reachable from its natural place; empty state and
Showcase; 320 / 390 / 1440 in Nebula, Light and Dark; keyboard, axe and Motion Off; NOVA's and ZIGi's on-device answers
in English and Dutch; export → erase → restore for any new field; the look and words of ZIGoals; depth against the
competitor row. Browser runs went one at a time (a shared lock), on a production build at :3101.

Their tables, unedited: [q1 Tasks](quality/q1.md), [q2 Money](quality/q2.md), [q3 Health](quality/q3.md),
[q4 Journal and habits](quality/q4.md).

| area | features | Blocker | Major | Minor | passed everywhere |
|---|---|---|---|---|---|
| q1 Tasks and planning | 11 | 0 | 12 | 20 | layout, axe, keyboard, round trip |
| q2 Money | 13 | 1 | 13 | 16 | axe 0 serious/critical in 3 themes × 3 widths; round trip |
| q3 Health, food, workouts, sleep | 15 | 1 | 23 | 20 | no sideways scroll; Motion Off |
| q4 Journal and habits | 12 | 0 | 15 | 18 | axe; round trip of every new field |
| **total** | **51** | **2** | **63** | **74** | |

## Fixes (four further helpers, one per area, none of whom wrote the features)

| area | what was fixed | commits |
|---|---|---|
| Answers (every check-5 row, EN and NL, NOVA and ZIGi) | 42 new intents in one layer reading each feature's own function under its own switch; Dutch dates in task answers; "stemming" is mood, never voting; lifted weight is volume; why a habit was missed reads that day's note; an unknown sleep-score part is said as left out | `4606305e`, `b67d1614` |
| Money | **Blocker #42** (bills this month counted back from the next due date); budget target/pace rows full width; the bill calendar 14 px with totals, a phone list and a By month view; every flow node labelled, one per income source; the debt table never splits a number and the tracked plan takes recorded payments off; category suggestion by payee part, any script, prefix; value alerts in the global watch and on Today | `f39bee8f`, `838b2f70` |
| Tasks and Journal | Snooze (15 min, 1 h, tomorrow) and several reminders in the app; Dutch task lines (uur as a length, van de maand, half 10, 18u30 …); lists from one line; the weekly review plans or lets go; countdown reminders notify; Three good things at the top of Write and from Today; the journal card rises on a day with an entry; tag suggestions, editable own templates; Help corrected | `22560d4d` (TIER 3 stored), `6b194efb`, `3c825c28` (TIER 3 PWA), `cde9bb69` |
| Health and Habits | **Blocker #48** (the visit report's wide tables are named, focusable frames; axe clean at 390); hide figures covers every body figure; the sleep year has 12 whole months and labels that never overlap; the workout calendar lists a day's workouts and shows a dot on phones; running bests from runs only, plus the half marathon; meal words offer 3–5 plain foods and Undo removes only what it made; high-in leaves out herbs and seaweed; factors take symptoms and supplements and a next-day effect; yesterday's open habits on Today; the week grid on phones; a habit's symbol and colour wherever its name is listed | `774b4e48` |
| Seen in CI while fixing | one button to ZIGi's Health switches (CI 1997); the wider-name check for the shorter title (CI 1997) | `55028851`, `4cdeba65` |

## Owner-decision rows (the reviewer's smaller suggestion built; ADR-045's choice kept)

- q4 #23 never missed twice: still a second number beside the streak (ADR-045 D-BUILD), now on the card face and
  beside Today's streak, with "Don't miss today" the day after a miss.
- q4 #33 the journal on Today: counts by default (privacy), and an opt-in switch in Journal → Privacy that lists the
  first lines on Today.

## Not fixed (Minor only; every Blocker and Major is fixed)

| finding | cause |
|---|---|
| Showcase examples that would change the Showcase's history or Today's cards (a habit open yesterday, a near-limit budget, more finished tasks, a task reminder, the Days until card) | the Showcase's counts are pinned by other areas' tests (lib/nova/cards, local-answers) and Today's Showcase tab stops are pinned at ≤ 90 (tests/ao/today-tab-stops.spec.ts, now 89) |
| "Save this meal" in each meal's ⋯ menu; grouped repeat plans; a symptom chart; Skip and amount per week-grid cell; a daily task goal, a load per day, matrix rules by label; "save this entry as a template"; a paused-until note | not quick (a new screen or setting each); listed in LEDGER.md as "to build" for lane 2 |
| XP for the focus habit; hide figures offered in Settings and in Export | outside the fixed areas; in LEDGER.md for lane 2 |
| Snooze lengths on the notification itself | the notification keeps "Snooze 1 h"; the other lengths are in the app |

## Evidence

- Unit: the full vitest suite after the fixes (see the STATUS entry for the run); typecheck clean; lint 0 errors.
- Browser: every `tests/av-*.spec.ts` on a production build of the fixed head, then CI (ADR-045 D-CI entries).

## Lane 2 (owner follow-up 4): fresh-agent checks per batch

| batch | features | reviewer's table | Blocker | Major | Minor | status |
|---|---|---|---|---|---|---|
| 1 (Tasks, Habits and mind part 1, Journal and notes, roadmap: task attachments, ZIGi's hello, chess; CR-19, A45-1) | about 40 | [lane2-b1](quality/lane2-b1.md) | 1 | 6 | 11 | Blocker and Majors fixed (`lane2/revb1`, merged `988f59db`); three Minors left with causes, #18 on `lane2/restore-media` |
| 2 (Money, Body, Food, Habits and mind part 2, sync, ledger remainders, round 2: Tasks, Money, Body-mind) | about 60 | [lane2-b2](quality/lane2-b2.md) | 2 | 7 | 9 | all fixed: B2B-1, B2B-2 by the lead, the rest on `lane2/revb2a`, `lane2/revb2b` (merged) |
| 3 (round 3: planned day, money views, water/habits/body, notes and journal) | 41 | [lane2-b3](quality/lane2-b3.md) | 2 | 14 | 22 | all fixed (A and B by their builders, C on `lane2/revb3c`, merged) |
| 4 (round 4: planned week, journal and habits, sleep and training, money, notes and files) | 47 | [lane2-b4](quality/lane2-b4.md) | 5 | 14 | 35 | D and E fixed (merged); F and G being fixed by their builders before batch 4 joins |

Passed everywhere in batch 1: no sideways scroll and nothing cut on the Tasks views, Notes, Journal, Habits and Journey;
axe 0 serious/critical on those routes and the chess game, the evening check-in and the journal calendar; keyboard play
of chess and the check-in's focus order; the sync engine absent from Today's and Tasks' first scripts and present in
Settings'; the six round-trip suites.
