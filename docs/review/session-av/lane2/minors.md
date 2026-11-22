# Lane 2 — QUALITY.md's open Minors (owner follow-up 4, item 4)

Builder slug `minors`, branch `lane2/minors` cut from `lane2/batch2` (`23eaf493`). Every Minor row of
`docs/review/session-av/quality/q1.md`…`q4.md` re-checked **in the code at `lane2/batch2`** (file:line), then each open
part built here or left with a cause from the brief.

**Count: 70 of 79 fixed (4 in this branch, 66 earlier), 9 left with causes.**
QUALITY.md's summary table counts 74 Minors (20 / 16 / 20 / 18); its four tables hold **79 Minor rows** (q1 21, q2 16,
q3 21, q4 21). All 79 are listed below, so nothing is dropped; the count line is therefore "of 79", not "of 74".

Status words: **fixed earlier** (commit that fixed it; follow-up 2's fixers `4606305e`, `f39bee8f`, `6b194efb`,
`774b4e48`, or a lane 2 builder), **fixed here** (this branch), **left** (cause). A row fixed here whose first part was
fixed earlier names both.

## Commits on this branch

| sha | what |
|---|---|
| `538fdadf` | Tasks: a paused repeat says so on its row (the editor's note and Resume use the same rule, which no longer calls a daily task due tomorrow paused); Completed draws the daily goal; the Agenda shows a deadline on its own day — q1 #43, #6, #15 |
| `8152f805` | Dutch task answers write their span's days the Dutch way — q1 #2 check 5 (two corpus entries for the lead to re-record) |
| (this file) | the registry |

## The table

### q1 — Tasks and planning (21 rows)

| id | finding (short) | status | where (file:line at the fix) / commit or cause |
|---|---|---|---|
| q1-1a | Showcase: no task has a reminder | **left** — against a named rule (pinned Showcase answers) | corpus `expected.json` "av-task-reminders" pins "No open task has a reminder yet…" for the Showcase; request R4 |
| q1-1b | Help names the wrong switch and wrong minutes | fixed earlier `6b194efb` | `components/help/help-page.tsx:119` ("Notifications, even when ZIGoals is closed", 5/15/30 min) |
| q1-2a | Dutch "half 10", "kwart over 3", vanmiddag, 18u30, om de week… | fixed earlier `6b194efb` | `lib/tasks/parse.ts:86,190-193,221` |
| q1-2b | Dutch answers carry English dates | **fixed here** `8152f805` (deadlines/planned days earlier `4606305e`) | `lib/ai/local-answers/exact/day.ts:63-64` (nlDay) and `:74-75` (the span, "ma 16 nov t/m di 17 nov"); `exact/period.ts` optional day writer |
| q1-6a | Showcase has one finished task | **left** — against a named rule (pinned Showcase answers and cards) | corpus "tasks-done-week" ("1 task done this week… Renew the library card"), `lib/nova/cards/ax/day-records.test.ts`; request R4 |
| q1-6b | "Completed" twice at the top | fixed earlier `6b194efb` | `components/tasks/tasks-page.tsx:327` |
| q1-6c | no weekday labels, no daily goal line | **fixed here** `538fdadf` (weekday initials earlier `6b194efb`; the goal setting by lane 2 tasks `1f9f6935`/`7dc424dc`) | `components/tasks/done-chart.tsx:19` (initials), the goal line and words in the same file; `lib/tasks/done-chart.ts` `goalLine` |
| q1-12a | "Also add it to Tasks" checkbox unstyled | fixed earlier `6b194efb` | `components/weekly-review/weekly-review.css:10-12` |
| q1-12b | ticked with an empty intention, Finish says nothing | fixed earlier `6b194efb` | `components/weekly-review/weekly-review-dialog.tsx:82-84` |
| q1-12c | "what was my intention for this week" (EN/NL) | fixed earlier `4606305e` | `lib/ai/local-answers/av-answers.ts:74` |
| q1-15a | deadline not on Upcoming/Agenda, matrix ignores it | **fixed here** `538fdadf` for the Agenda (Upcoming and the matrix earlier `6b194efb`) | `components/tasks/tasks-page.tsx:356`, `lib/tasks/matrix.ts:62`; `components/agenda/deadlines-on-day.tsx`, `components/agenda/agenda-days.tsx`, `lib/agenda/deadlines.ts` |
| q1-15b | editor offers a deadline on a repeating task | fixed earlier `6b194efb` | `components/tasks/task-editor.tsx:104-106` |
| q1-17 | global Quick add takes no pasted list | fixed earlier `6b194efb` | `components/quick-add-line.tsx:61,94,147` |
| q1-38a | Help says "at the top"; fold easy to miss | fixed earlier `6b194efb` | `components/help/help-page.tsx:155`; `components/tasks/plan-day.tsx:37` (open with overdue) |
| q1-38b | "until tomorrow" kept in sessionStorage | fixed earlier `6b194efb` | `components/tasks/plan-day.tsx:16,40` ("set it aside for now") |
| q1-39 | load ignores overdue; no load per day; no capacity | fixed earlier `6b194efb` (whole view), lane 2 tasks `c6571ee9` (per day), `7dc424dc` ("My day holds") | `lib/tasks/minutes.ts:29`; `components/tasks/tasks-page.tsx:359`; `components/tasks/task-plan-settings.tsx` |
| q1-43a | Showcase has no repeating task with subtasks | **left** — against a named rule (pinned Showcase answers) | corpus pins the Showcase's open tasks ("5 open tasks: 0 due today, 2 overdue…", agenda-today, task-load); request R4 |
| q1-43b | pause allows today; no "paused until", no Resume | **fixed here** `538fdadf` for the row note and a false note (min tomorrow earlier `6b194efb`; editor note and Resume lane 2 tasks `c6571ee9`) | `components/tasks/task-editor.tsx:113-114`; `components/tasks/task-parts.tsx:133`; `lib/tasks/paused.ts` |
| q1-43c | matrix wording; no label rule | fixed earlier `6b194efb` (wording), lane 2 tasks `c6571ee9` (labels) | `components/tasks/matrix-rules.tsx:43-44` |
| q1-44 | "Days until" not on Showcase Today | **left** — against a named rule (Showcase Today ≤ 90 Tab stops, `tests/ao/today-tab-stops.spec.ts:48`, now 89) | the card adds its own controls; the Showcase birthday does show on the Agenda's day (`components/countdowns/countdowns-on-day.tsx`); request R4 |
| q1-fy | bills: no yearly figure per row | fixed earlier `f39bee8f` | `components/wealth/bills/upcoming-bills.tsx:105` ("about … a year") |

### q2 — Money (16 rows)

| id | finding (short) | status | where / commit or cause |
|---|---|---|---|
| q2-9 | one target type, no edit, "set aside" mid-month | fixed earlier `f39bee8f` | `components/wealth/budgets/budgets-month.tsx:53-65,148` (AddTarget, "left so far") |
| q2-7 | difference needs sideways scroll on a phone | fixed earlier `f39bee8f` | `components/wealth/spending/insights/vs-last-view.tsx:13-27` |
| q2-10 | bill calendar: no month paging | fixed earlier `f39bee8f` | `components/wealth/bills/bill-month-grid.tsx:27` (By month) |
| q2-14 | Light bands low contrast | fixed earlier `f39bee8f` | `components/wealth/spending/insights/insights.css:61` |
| q2-16a | debt order and lumps lost on leaving | fixed earlier `f39bee8f` | `components/wealth/debt-planner.tsx:189` ("not kept yet") |
| q2-16b | payoff schedule answer; NL place name | fixed earlier `4606305e` | `lib/ai/local-answers/av-answers.ts:21,278-294` |
| q2-20a | Today's line links to the top of Wealth; no "fast" | fixed earlier `f39bee8f` | `lib/money-attention.ts:44,60-64`; `components/wealth/today-money-attention.tsx:58` |
| q2-20b | "does anything in my money need attention" | fixed earlier `4606305e` | `lib/ai/local-answers/av-answers.ts:297` |
| q2-21 | no amount range in search | fixed earlier `f39bee8f` | `components/wealth/spending/money-search.tsx:30-37` |
| q2-31a | watch: no Showcase example, no answer | fixed earlier `f39bee8f`, `4606305e` | `lib/bills/showcase.ts:24-25`; `lib/ai/local-answers/av-answers.ts:347` |
| q2-31b | watch a budgeted category; no last month; nothing on Today | fixed earlier `f39bee8f` | `lib/budgets/watch.ts:16-18,27`; `lib/money-attention.ts:63` |
| q2-35a | % move is one-way, not rolling | fixed earlier, lane 2 money `3d3d15d4` | `lib/price-alerts/moves.ts`; `components/price-alerts/price-alerts.tsx:15-17` |
| q2-35b | value alert: no Showcase example, no warning, no answer | fixed earlier `f39bee8f`, `4606305e`, lane 2 money `16e77c78` | `components/price-alerts/portfolio-value-alert.tsx:43-44`; `components/portfolio/portfolio-view.tsx:191`; `av-answers.ts:359` |
| q2-37 | no Showcase budget near its limit; answer doesn't name it | **left** for the Showcase part — against a named rule (pinned corpus); the answer fixed earlier `4606305e` | `av-answers.ts:218`; the corpus pins "No budget is near its limit (80%)… Groceries 75%" EN/NL; request R4 |
| q2-49a | focus drops after "Start this month fresh" | fixed earlier `f39bee8f` | `components/wealth/budgets/budgets-month.tsx:102-105` (focus to the month heading) |
| q2-49b | fresh start hidden in Showcase; recap answer | fixed earlier `f39bee8f`, `4606305e` | `budgets-month.tsx:102,130`; `av-answers.ts:374` |

### q3 — Health, food, workouts, sleep (21 rows)

| id | finding (short) | status | where / commit or cause |
|---|---|---|---|
| q3-3 | "Save this meal" only in Meals & planning | fixed earlier, lane 2 food `409493f6` | `components/health/food-plus/save-meal.tsx:11`; `components/health/health-app.tsx:554` |
| q3-8a | Showcase ranks a single factor | **left** — against a named rule (pinned Showcase history) | probe at lane2/batch2: still 1 ready of 24 factors (Meditation · Sleep, 115 collecting); the Showcase's moods, sleep and habits are pinned by `lib/insights/cross-pillar.test.ts:79-100` and the corpus; request R4 |
| q3-8b | "Early sign" 13 px; "· Sleep" on its own line | fixed earlier `774b4e48` | `components/insights/factor-effects-card.tsx:32`; `factor-effects.css:1` |
| q3-11a | no teaching line before the first workout | fixed earlier `774b4e48` | `components/health/workouts/workouts-view.tsx:231` |
| q3-11b | no week labels; distance adds rides to runs | fixed earlier `774b4e48` | `components/health/workouts/weekly-chart.tsx:11`; `lib/workouts/weekly.ts:12` |
| q3-18a | "Serving measure unknown", "P Unknown g" ×3 | fixed earlier `774b4e48` | `components/health/health-app.tsx:225` |
| q3-18b | quick add: calories only | fixed earlier, lane 2 food `409493f6` | `components/health/quick-calories.tsx` (optional protein, carbs, fat); Showcase example decided in the ADR |
| q3-18c | Dutch "wat heb ik vandaag gegeten" gives only kcal | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:151` |
| q3-25 | counts never grams; dishes split; "half a" | fixed earlier `774b4e48` | `lib/meal-words/match.ts:17,47,58,74` |
| q3-27a | unknown regularity/debt silently scored | fixed earlier `774b4e48`, `b67d1614` | `lib/health-aa/sleep-score.ts:14,24`; `components/health/sleep-score-card.tsx:24` |
| q3-27b | one 7-night score, no trend | fixed earlier `774b4e48` | `lib/health-aa/sleep-score.ts:55` (`weeksBefore`) |
| q3-29a | toast counts skipped dates | fixed earlier `774b4e48` | `components/health/daily-tools.tsx:154` ("Planned ${fresh}…, already planned") |
| q3-29b | repeat plans not grouped; not on the Diary | fixed earlier, lane 2 food `a8469217` | `lib/food-plus/plan-groups.ts:2`; `components/health/food-plus/day-plans.tsx:7` |
| q3-36 | hide figures only in Health; not exported | **left** for the Export part — against a named rule (the export/restore registries are the lead's); Settings fixed earlier, lane 2 habits `e147b4fc`; more surfaces `774b4e48` | `app/app/settings/page.tsx` ("Calories and weight on screen"); `components/export-everything.tsx:69-70` (the note); request R3 |
| q3-40a | two stars for one best | fixed earlier `774b4e48` | `lib/workouts/set-best.ts:28`; `workouts-view.tsx:385` |
| q3-40b | "what is my bench press best" | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:129` |
| q3-46 | long sleep range: time asleep only | fixed earlier `774b4e48`, `4606305e` (lane 2 body added quality and time to fall asleep) | `components/health/sleep/sleep-long-chart.tsx:13-24`; `lib/sleep/longer.ts:9-11` |
| q3-47a | averages "130.997 g" | fixed earlier `774b4e48` | `components/health/nutrient-report.tsx:31` |
| q3-47b | Sources ignores the range; no year | fixed earlier `774b4e48` | `components/health/nutrient-report.tsx:61`; `lib/health-aa/nutrient-report.ts:78` |
| q3-47c | 90-day iron answer; Dutch falls to examples | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:206` |
| q3-48 | no symptom chart; doses from the UTC date | fixed earlier `774b4e48` (local date), lane 2 food `a8469217` and body (chart) | `lib/clinician-report/build.ts:54-58,179-181`; `components/report/report-document.tsx:52,158` |

### q4 — Journal and habits (21 rows)

| id | finding (short) | status | where / commit or cause |
|---|---|---|---|
| q4-4 | Three good things: no marker; raised count | fixed earlier `6b194efb` | `components/journal/journal.css:61-63` |
| q4-5a | focus falls to `<body>` after a tag | fixed earlier `6b194efb` | `components/journal/entry-tags.tsx:8-10` |
| q4-5b | no tag suggestions | fixed earlier `6b194efb` | `entry-tags.tsx:36-37`; `journal-compose.tsx:135-137` (datalists) |
| q4-19a | yesterday's open habits: no Showcase example | **left** — against a named rule (pinned Showcase answers) | the Showcase logs every habit yesterday; corpus "hab-missed-yesterday" pins "7 of 7 due check-ins done", and the weekly review pins sentences from that history (`lib/habits-extras/showcase.ts:9-13`); request R4 |
| q4-19b | Done / All done drop focus | fixed earlier `774b4e48` | `components/habits/yesterday-open.tsx:18,27-33` |
| q4-23 | streak answers never say "never missed twice" | fixed earlier `4606305e` | `lib/ai/local-answers/exact/track.ts:27,80`; `engine.ts:676` |
| q4-24a | focus habit: no Showcase example | **left** — against a named rule (Showcase Today ≤ 90 Tab stops) | tried in `774b4e48` and taken out: its Today line passed 90 stops (`lib/habits-extras/showcase.ts:59-60`); request R4 |
| q4-24b | two stars; badge wraps; no XP | fixed earlier `774b4e48` (mark ◎, own line), lane 2 habits `9675fccd` (XP) | `components/habits/habit-card-full.tsx:171`; `lib/game/xp.ts:57,66` (`FOCUS_BONUS_XP`) |
| q4-26a | glyph and colour: no Showcase example | fixed earlier `774b4e48` | `lib/habits-extras/showcase.ts:59-62` (Read, Walk, Meditate) |
| q4-26b | focus stays on the ⋯ trigger | fixed earlier `774b4e48` | `components/habits/habit-look-picker.tsx:15-17` |
| q4-30a | week grid: no Skip or amount per cell | fixed earlier, lane 2 habits `fc0e8667` | `components/habits/week-day-editor.tsx:13`; `lib/habits-order/week-day-edit.ts:4` |
| q4-30b | "laat mijn gewoontes van deze week zien" | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:323` |
| q4-32a | Escape doesn't close; focus drops after Save | fixed earlier `774b4e48` | `components/habits/yesterday-open.tsx:18,68` |
| q4-32b | "Too tired" preselected and shared; reasons never summed | fixed earlier `774b4e48` | `yesterday-open.tsx:26` (per row, none chosen); `components/habits/habit-patterns.tsx:33-34` |
| q4-33 | journal count answer says no number | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:274` |
| q4-34 | "That day" no marker; three control rows | fixed earlier `6b194efb` | `components/journal/journal.css:78-81` |
| q4-45a | picker language resets to English | fixed earlier `6b194efb` | `components/journal-prompts/prompt-picker.tsx:19,22` (`startLang`) |
| q4-45b | own template can't be edited; headings only | fixed earlier `6b194efb` (edit), lane 2 journal `0be442c3` (body, tags, default, save an entry as a template) | `lib/journal-prompts/own.ts:25`; `prompt-picker.tsx:17-20` |
| q4-45c | "what journal templates do I have" | fixed earlier `4606305e` | `lib/ai/local-answers/av-life.ts:285` |
| q4-fp1 | no gap under the question box | fixed earlier `6b194efb` | `components/journal/journal.css:54` |
| q4-fp2 | "what is today's journal question" | fixed earlier `4606305e` | corpus "Today's journal question: …"; `av-life.ts` |

## Built here — per feature

### M1. Tasks: a paused repeat on its row, the daily goal on Completed, deadlines on the Agenda (`538fdadf`)

- Rows: q1-43b (check 3), q1-6c (check 8), q1-15a (check 8). Verdict: **built**.
- What it does: a repeating task paused past its next days reads "↻ Every week on Mon · paused until Mon, Dec 14" on its
  row; its editor's "Paused until … / Resume from …" uses the same rule (`lib/tasks/paused.ts`), which no longer calls a
  daily task finished today and due tomorrow "paused" (the earlier editor rule did). Completed draws the daily goal from
  Tasks → This week as a dashed line across the 14 bars, with "Daily goal: 2 tasks · reached on 1 of the last 14 days"
  (and, with no goal, one line saying where to set it). The Agenda's day lists "Deadlines on this day": each open task
  whose deadline it is while planned for another day, linking to the task ("Deadline · planned Wed, Nov 25").
- Files: `lib/tasks/paused.ts` (new), `lib/agenda/deadlines.ts` (new), `components/agenda/deadlines-on-day.tsx` (new),
  `components/agenda/agenda-days.tsx`, `components/tasks/task-parts.tsx`, `components/tasks/task-editor.tsx`,
  `components/tasks/done-chart.tsx`, `lib/tasks/done-chart.ts`.
- CSS touched (theme variables only; the lead regenerates the theme sheets): `components/agenda/agenda.css`,
  `components/tasks/tasks.css`.
- Tests: `lib/tasks/av2-minors.test.ts` (7 cases with the answers file). Spec: `tests/av2-minors-tasks.spec.ts`
  (three themes, 390/1440, axe, 320).
- Stored changes: none (reads `zigoals:tasks:v1` and `zigoals:task-plan:v1` `dailyGoal`). Device keys, catalogue,
  export, erase: none. Export → erase → restore: nothing new stored.
- Showcase: the Agenda shows the Showcase's trip budget deadline on its day (day + 8) with no change to the Showcase.
- Weight: the row's note is one import (`lib/tasks/paused.ts`, ~0.3 kB) in the Tasks chunk, which already carries the
  recurrence module; the goal line is in Completed's lazy chunk; the Agenda's list is in the Agenda days' chunk.
- Today: nothing always visible is added.
- Answers: none new (the tasks answers already say a task's deadline, and NOVA/ZIGi have no "paused" fact; the pause is
  shown, not stored).

### M2. Dutch days in the task answers' span (`8152f805`)

- Row: q1-2b (check 5). Verdict: **built**.
- `periodSpan`/`periodWords` take an optional day writer (default unchanged); the tasks answer passes `nlDay` in Dutch:
  "1 taak gedaan deze week (ma 16 nov t/m di 17 nov): Renew the library card." English unchanged.
- Tests: `lib/ai/local-answers/av2-minors.test.ts` (NOVA and ZIGi, Showcase). Corpus: see R1.

## Requests for the lead

**R1 — corpus re-record (two entries).** `lib/ai/evals/as/corpus.test.ts` reports exactly these until
`AS_WRITE=1 pnpm exec vitest run apps/web/lib/ai/evals/as/corpus.test.ts` is run and read:
- `tasks-done-week` nl: "1 taak gedaan deze week (ma 16 nov t/m di 17 nov): Renew the library card."
- `tasks-done-lastweek` nl: "Geen taak gedaan vorige week (ma 9 nov t/m zo 15 nov)."

**R2 — Help (help-page.tsx) and What's new.**
- Q "Does a paused repeating task show it?" A "Yes. A repeating task you paused says “paused until …” on its row. Open
  it and press “Resume from …” to put it back on its next day."
- Q "Can I see my daily goal on the Completed chart?" A "Yes. Set a daily goal in Tasks → This week → Your planning
  choices, and Completed draws it as a dashed line across the last 14 days, with the days you reached it."
- Q "Do deadlines show on the Agenda?" A "Yes. A task's deadline shows on its own day in the Agenda (and in Tasks →
  Upcoming) when the task is planned for another day. Tap its name to open the task."
- What's new (one line): "Tasks: a paused repeat says so, Completed draws your daily goal, and the Agenda shows deadlines."
- Search (lib/search/static.ts), optional: "Deadlines on the Agenda" → `/app/agenda`.

**R3 — q3-36, Export everything keeps "Hide calories and weight".** In `lib/export/everything.ts`'s key map add
`hideBodyFigures: 'zigoals:hide-body-figures'` (`HIDE_FIGURES_KEY`, `components/hide-figures.tsx:14`; the value is the raw
text `on`, not JSON, so read and write it as text), and the same key to the restore plan and the data catalogue
(display, Health). Then the export note at `components/export-everything.tsx:69-70` can say the file keeps the switch too.
A restore on a new device then keeps the figures hidden (the finding). `lib/ah-device-keys.ts:15` lists it as display
(not erased); keep that.

**R4 — Showcase examples left because they move pinned counts (each needs the named pins re-recorded or changed as
deliberate changes):**
- q1-1a: in `lib/tasks/showcase.ts`, give "Example · Book the dentist" `reminders: [{before: 15}]`. Moves the corpus
  "av-task-reminders" (Showcase EN/NL) and any Today reminder row count.
- q1-6a: two more finished Showcase tasks, e.g. `doneAt` on day −3 and day −9. Moves the corpus "tasks-done-week",
  "tasks-done-lastweek" and `lib/nova/cards/ax/day-records.test.ts`.
- q1-43a: give "Example · Sort the photo folder" `due: day + 4`, `recur: {every: 'week', interval: 1}` and two
  subtasks. Moves the corpus open-task list ("5 open tasks…"), agenda-today and the someday/when pins.
- q1-44: add `'countdowns'` to the Showcase's Today cards (`lib/showcase-data.ts:307`). Showcase Today is at 89 of 90
  Tab stops (`tests/ao/today-tab-stops.spec.ts:48`); the card's own controls pass 90, so this needs the owner's word on
  that ceiling.
- q2-37: `lib/bills/showcase.ts`, the Groceries budget `monthly: '230.00'` (187.10 / 230 = 81 %, "near"). Moves the corpus
  "No budget is near its limit…" EN and "3 van 3 budgetten binnen plan…" NL (lane 2 money's note, money.md F7).
- q3-8a: more ranked factors need 14 + 14 days a side on mood or energy; the Showcase has 12 moods, pinned with its
  pairings in `lib/insights/cross-pillar.test.ts:79-100`. A Showcase symptom rated on alternating days for 40 days would
  rank against sleep without touching moods, but it adds to the Showcase's symptoms log, which the visit report and
  its specs read (check `tests/av-report-more.spec.ts` and `tests/av2-report-symptoms.spec.ts` before).
- q4-19a: leave one Showcase build habit (for example Contribute) unlogged yesterday. Moves the corpus
  "hab-missed-yesterday" ("7 of 7") and the weekly review sentences pinned from that history.
- q4-24a: make one Showcase habit today's focus (`showcaseHabitExtras` `focus`); its Today line passes the 90 Tab stops
  (tried in `774b4e48`).

**R5 — an observation, not a q-row (owner's or lead's call).** About 80 Dutch exact answers outside Tasks still write
their days in English, e.g. "deze maand (Sun, Nov 1 t/m Tue, Nov 17): Tue, Nov 3 en Thu, Nov 12" (habits, steps, sleep,
weight, workouts, money, focus, journal, goals; listed by running the corpus with `nl`). The fix is the same writer
(`nlDay`) as the default for `lang === 'nl'` in `periodSpan`/`periodWords` and each answer's own day writer; it moves those
~80 corpus entries, `lib/ai/local-answers/au-rehearsal.test.ts:111,129,170`, `au-allow-health.test.ts:110` and
`tests/zigi-no-model-ab.spec.ts` (each then a labelled deliberate change). Not done here: it is wider than the q1 row
and rewrites pins in other pillars' tests.

## What I ran

- Unit: `lib/tasks/av2-minors.test.ts`, `lib/ai/local-answers/av2-minors.test.ts`, and the directly affected
  `lib/tasks/av-done-chart.test.ts`, `av-repeat-pause.test.ts`, `av-deadlines.test.ts`, `lib/agenda/*`,
  `lib/ai/local-answers/av-answers.test.ts` — green; `lib/ai/evals/as/corpus.test.ts` — the two R1 entries only.
- Typecheck (shared lock): clean. eslint on every changed file: 0 problems.
- Not run (the lead's): Playwright, `next build`, the theme sheets.
