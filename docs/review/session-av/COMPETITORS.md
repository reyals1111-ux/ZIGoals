# Session AV: competitor matrix

Written 20 Nov 2026 for Session AV planning. It covers 17 apps and their top features, each matched against ZIGoals as
the code stands on this branch. The feature lists come from general product knowledge; nothing was looked up on the
web. Every `have` and `half` below was checked with a grep of `apps/web/lib`, `apps/web/components`, `apps/web/app` and
the plain-words answers in `apps/web/components/help/help-page.tsx`. All paths are relative to `apps/web/`.

Status words:

- `have`: built. The file named proves it.
- `half`: part of it is built. The file is named and the missing part is said.
- `missing`: not built.
- `not web-possible`: needs something a web app cannot do (native widgets, background GPS, live HealthKit, a watch app).
- `against a rule`: conflicts with a ZIGoals rule: no outside services or bank connections, no AI model required, private
  on-device, no money advice, no calorie-burn guessing. The one exception is the owner-approved estimated maintenance
  in `lib/health-aa/energy.ts`.

## Totals

| Status | Count |
|---|---|
| `have` | 103 |
| `half` | 26 |
| `missing` | 17 |
| `not web-possible` | 4 |
| `against a rule` | 18 |
| **Rows** | **168** |

## Matrix

### Todoist

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Natural-language quick add (dates, times, p1–p4, #project, @label) | `have` | `lib/tasks/parse.ts` `parseTaskLine`, `components/tasks/smart-add.tsx` |
| Quick add in the person's own language (Dutch) | `half` | `lib/tasks/parse.ts` reads English only. `lib/quick-add/locales/nl.ts` covers habit and Health log lines, not tasks ("morgen", "elke maandag" and "om 18:00" are not read) |
| Repeats, including "every! 3 days" counted from completion | `have` | `lib/tasks/recurrence.ts` (`afterDone`), `recurSchema` in `lib/tasks/schema.ts` |
| Projects with sections, as a list or a board | `have` | `projectSchema` `view: list \| board` and `sectionSchema` in `lib/tasks/schema.ts`, `components/tasks/tasks-nav.tsx` |
| Labels and saved filters | `have` | `labels` and `filters` in `lib/tasks/schema.ts`, `lib/tasks/search.ts` |
| Subtasks with progress | `have` | `parentId` and `MAX_SUBTASK_DEPTH` in `lib/tasks/schema.ts`, `components/tasks/tasks-page.tsx` |
| Reminders as phone notifications | `half` | `lib/tasks/reminders.ts` shows due reminders inside the app only. `ItemKind` in `lib/notify/plan.ts` has no task kind, so no reminder is pushed |
| Karma / productivity view (tasks done per day and week, daily goal) | `missing` | Only a Completed list (`completedInWindow` in `lib/tasks/engine.ts`) and Life review counts (`lib/tasks/review.ts`). No chart and no daily goal. Done tasks are kept only 30 days (`DONE_KEEP_DAYS`) |
| Comments and attachments on a task | `half` | `notes` up to 5,000 characters (`lib/tasks/schema.ts`). No attachments and no comment thread |
| Import from other apps | `have` | `lib/tasks/import.ts` (Todoist CSV, TickTick CSV, .ics), `components/tasks/tasks-io.tsx` |
| Shared projects, assigning tasks to others | `against a rule` | Private on-device; nothing is shared between people |

### TickTick

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Pomodoro timer started from a task | `have` | `components/focus/pomodoro-panel.tsx`, `lib/focus-sessions/pomodoro.ts`. Help: "also started from a task" |
| Focus statistics and a Forest-style garden | `have` | `gardenOf` and `focusMinutesBetween` in `lib/focus-sessions/engine.ts` |
| Focus sounds | `have` | `lib/audio`. Help (`tasks-what`): "an optional focus sound" |
| Habit tracker beside tasks | `have` | `components/habits/habits-workspace.tsx` |
| Eisenhower matrix | `have` | `lib/tasks/matrix.ts`, `components/tasks/tasks-when-views.tsx` |
| Day, week and month calendar, plan by the hour | `have` | `components/agenda/agenda-page.tsx`, `components/agenda/agenda-hour-grid.tsx` |
| Countdowns | `have` | `components/countdowns/countdowns-card.tsx`, `lib/countdowns/schema.ts` |
| Live two-way calendar sync (Google, Outlook) | `against a rule` | Needs an outside service. A read-only .ics import (`components/agenda/calendar-import.tsx`) and export (`components/agenda/agenda-export.tsx`) are built |
| Home-screen widgets | `not web-possible` | Android icon shortcuts only (help `aa-home-screen`) |

### Things

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Today and This Evening | `have` | `lib/tasks/when.ts`, `components/tasks/tasks-when-views.tsx` |
| Someday | `have` | Same files. Help: "Someday holds tasks with no day" |
| Upcoming | `have` | `upcoming` view in `components/tasks/tasks-nav.tsx` |
| Deadlines kept apart from the start day | `missing` | `taskSchema` has one `due` day (`lib/tasks/schema.ts`) |
| Areas that group projects | `half` | Projects and sections are built (`lib/tasks/schema.ts`). No level above a project (`projectSchema` has no area or parent) |
| Checklists inside a to-do | `have` | Subtasks (`parentId`) |
| Logbook of everything finished | `half` | The Completed view keeps 30 days (`DONE_KEEP_DAYS` in `lib/tasks/schema.ts`). Things keeps everything |
| Quick Entry from anywhere | `have` | `components/quick-add-sheet.tsx`, the ⌘/Ctrl+K command menu (`components/command-palette`) |
| Keyboard-first use | `have` | `components/tasks/tasks-shortcuts.tsx` ("?") |

### Habitica

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| XP and levels from real habits | `have` | `lib/game/xp.ts`, `lib/game/levels.ts` |
| Daily quests and challenges | `have` | `lib/game/quests.ts`, `lib/game/challenges.ts` (against yourself only) |
| Custom rewards bought with points | `have` | `components/rewards-shelf/rewards-shelf.tsx`, `lib/rewards-shelf` |
| Good and bad habits (+/−) | `have` | Quit habits: `components/habits/quit-panel.tsx`, `lib/habits-extras/quit.ts` |
| Dailies and to-dos together | `have` | Habits plus Tasks (`components/tasks/tasks-page.tsx`) |
| Streak protection | `have` | `lib/game/freeze.ts`. Help: "a streak freeze is earned, never bought" |
| Avatar gear, pets and mounts | `missing` | Badges only (`lib/game/badges.ts`) |
| Losing HP for a missed daily | `missing` | Left out on purpose. Help: "no rule ever takes away anything else" (`lib/game/xp.ts`) |
| Parties, guilds and boss fights with friends | `against a rule` | Private on-device; no other people |

### Streaks

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| A streak per habit at a glance | `have` | `components/habits/habit-card.tsx`, `lib/habits-v2/stats.ts` |
| Habits to break | `have` | `components/habits/quit-panel.tsx` |
| Timed habits | `have` | `components/habits/habit-timer.tsx` |
| Auto-complete from health data | `have` | `components/habits/auto-rules-editor.tsx` ("When steps ≥ 8,000 → Walk is done"), from records on the device |
| Flexible schedules (x a week, every n days, dates of the month) | `have` | `frequency`, `interval` and `month-dates` in `lib/habits.ts` |
| Habit reminders as notifications | `have` | The `habit` kind in `lib/notify/plan.ts` |
| Pause and vacation | `have` | `components/habits/vacation-panel.tsx` |
| History, year view and consistency | `have` | `components/habits/year-view.tsx`, `habit-history.tsx`, `habit-consistency.tsx` |
| Widgets, Apple Watch, Siri | `not web-possible` | — |

### Finch

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| A companion that reacts to self-care | `have` | `components/zigi`. Help: its feelings follow what the app confirmed |
| A companion that grows, gets dressed up, has a home | `missing` | — |
| Mood check-in with feeling words and reasons | `have` | `lib/mood-words/words.ts`, `lib/mood-tags/tags.ts` |
| Small self-care goals | `have` | Habits with ideas: `components/habits/habit-ideas.tsx` |
| Reflection prompts | `have` | `lib/journal-prompts/templates.ts`, `lib/journal/reflect.ts` |
| Breathing exercises | `have` | `lib/meditation/breathing.ts` |
| Mood history over time | `have` | `components/journal/year-pixels.tsx` |
| Self-check questionnaires (anxiety, low mood) | `missing` | Clinical. Not proposed |
| Friends sending "good vibes" | `against a rule` | No other people |

### MyFitnessPal

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Food database that works offline | `have` | `lib/food-generic`, `components/health/daily-tools.tsx` |
| Barcode scan | `have` | `components/health/barcode-food-lookup.tsx`. Decoded on the device; only the number goes to Open Food Facts, through ZIGoals, when lookup is available |
| Meal photo recognition | `have` | `components/health/meal-photo-panel.tsx`. Optional, with the person's own image model (help: "Estimated by your AI from a photo") |
| Recipe importer | `have` | `components/health/recipe-import.tsx`, `lib/health-aa/recipe-text.ts` |
| Copy yesterday's meal, repeat yesterday, recent and frequent first | `have` | `lib/health-quick/quick.ts` (`copyMealFromDayBefore`, `repeatDayBefore`, `usualForMeal`), `components/health/quick-log.tsx`, `components/health/plus/meal-copy.tsx`, the Recent/Frequent/Favourites picks in `components/health/daily-tools.tsx` |
| Saved meals (several foods as one item) | `half` | Recipes and pinned items stand in (`setPinned` in `lib/health-quick/quick.ts`). No "save this meal" from a logged diary meal |
| Copy a whole day to any day | `half` | `repeatDayBefore` repeats the day before only. `copyMealTo` copies one meal at a time (`lib/health-quick/quick.ts`) |
| Calorie and macro goals | `have` | `components/health/macro-mode-panel.tsx`, `lib/health-aa/calorie-week.ts` |
| Water | `have` | `components/health/water-ring.tsx` |
| Intermittent fasting | `have` | `components/health/fasting-timer.tsx`, `lib/fasting/engine.ts` |
| Exercise calories added back | `against a rule` | No calorie-burn guessing |

### Cronometer

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Detailed micronutrients | `half` | `lib/health-aa/micro.ts` covers 7 nutrients (fiber, sugar, saturated fat, sodium, potassium, calcium, iron), plus label vitamins in `lib/health-vitamins`. No full mineral, amino-acid or vitamin panel per food |
| Custom nutrient targets | `have` | `components/health/micro-panel.tsx`. Help: "Micronutrient targets…" |
| Nutrient report over a period | `have` | `components/health/nutrient-report.tsx`, `lib/health-aa/nutrient-report.ts` |
| Biometrics (blood pressure, glucose, resting heart rate) | `have` | `lib/vitals/schema.ts`, `lib/health-numbers` |
| Supplements and medication | `have` | `components/health/supplements.tsx` |
| Fasting | `have` | `lib/fasting/engine.ts` |
| A report to share with a professional | `have` | `lib/clinician-report/build.ts` (Settings → Your data → Report for a visit) |
| Import from other trackers | `have` | `lib/import`. Help: "A MyFitnessPal or Cronometer file is recognised" |
| Nutrition score per food | `have` | `components/health/nutri-score.tsx` |

### MacroFactor

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Adaptive expenditure (estimated maintenance) | `have` | `lib/health-aa/energy.ts`, `components/health/maintenance-estimator.tsx` (owner-approved estimate) |
| Smoothed weight trend | `have` | `components/health/weight-trend.tsx`, `lib/health-aa/trend.ts` |
| Weekly coach check-in that adjusts the target | `have` | `lib/health-aa/coach.ts`, `components/health/coach-card.tsx` |
| Diet programs (cut, maintain, bulk, keto…) | `have` | `lib/diet-templates/templates.ts`, `components/health/diet-templates.tsx` |
| Weekly calorie budget, moving calories between days | `have` | `components/health/calorie-week-card.tsx` |
| Logging without judgement | `have` | `lib/food-log/consistency.ts` ("nothing is judged") |
| Fast repeat logging (favourites, history) | `have` | `lib/health-quick/quick.ts` (pins, usual items) |
| Describe a meal in words or by voice | `half` | Needs the person's own model (ZIGi `/log`, help). The no-model quick-add line (`lib/quick-add/parse.ts`) logs habits, water and weight, not foods |
| Body measurements and progress photos | `have` | `components/health/body-measurements.tsx`, `components/health/photo-compare.tsx` |

### Strava

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Live GPS recording | `not web-possible` | Background GPS |
| Import from a watch (GPX, TCX) | `have` | `lib/workouts/import-file.ts`, `components/health/workouts/workouts-import.tsx` |
| Kilometre splits and pace | `have` | `lib/workouts/splits.ts`, `components/health/workouts/workout-splits.tsx` |
| Weekly distance, time and volume chart | `half` | `weekSummary` in `lib/workouts/engine.ts` gives this week as a single line of text. `components/health/workouts/workouts-muscles.tsx` shows this week's sets per muscle. No chart across weeks |
| Best efforts (fastest 1 km, 5 km, 10 km; longest run) | `missing` | `personalBests` in `lib/workouts/engine.ts` compares a whole exercise entry, not distance efforts inside a run |
| Monthly or yearly distance goal | `missing` | Health goals (`lib/health-goals`) cover steps, water, counters, active minutes and weight trend |
| Training load / fitness and freshness | `half` | Muscle freshness for strength work (`lib/muscle-freshness/model.ts`). Nothing for cardio |
| Heart-rate zones | `missing` | The import keeps only the average heart rate |
| Route builder and heatmaps | `against a rule` | Map tiles are an outside service, and the route is never kept |
| Feed, kudos, segments, leaderboards | `against a rule` | No other people |

### YNAB

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Ready to assign | `have` | `lib/budgets/ready-to-assign.ts`, `components/wealth/budgets/ready-to-assign.tsx` |
| Monthly category budgets | `have` | `lib/budgets/schema.ts`, `components/wealth/budgets/budgets-month.tsx` |
| Targets (save X by a date, set aside X a month, spend up to X) | `half` | Only a fixed `monthly` amount per category (`budgetSchema`). No target type, no by-date target, no "needed this month" |
| Rollover | `have` | `rollover` in `lib/budgets/schema.ts`, `carriedInto` in `lib/budgets/engine.ts` |
| Age of money | `have` | `lib/money-insights/age-of-money.ts`, `components/wealth/spending/insights/age-view.tsx` |
| Move money between categories | `missing` | `lib/budgets/engine.ts` only sets or removes a budget |
| Bank sync | `against a rule` | No bank connections. File import is built: `lib/bankfiles` (OFX, CAMT, MT940) |
| Scheduled payments and bills | `have` | `lib/bills/store.ts`, `components/wealth/bills/upcoming-bills.tsx` |
| Loan planner with extra payments | `have` | `components/wealth/debt-planner.tsx` |
| Reconcile an account | `half` | "Update balance" in `components/wealth/accounts-section.tsx`. No reconcile against the money log |
| Reports (income against spending, trends, net worth) | `have` | `components/wealth/spending/insights/cash-flow-view.tsx`, `category-trend-view.tsx`, `components/wealth/networth-history.tsx` |

### Monarch

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Bank aggregation | `against a rule` | — |
| Net worth over time | `have` | `components/wealth/networth-history.tsx`, `components/wealth/networth-milestones.tsx` |
| Investments | `have` | `lib/portfolio` (lots, performance) |
| Recurring payments found for you | `have` | `lib/bills/detect.ts` |
| Cash-flow Sankey (income → categories) | `half` | `components/wealth/spending/insights/cash-flow-view.tsx` shows income, spending and net per month. No flow from income into categories |
| Transaction rules | `have` | `lib/money-rules/engine.ts`, `components/wealth/money-tools/rules-panel.tsx` |
| Savings goals | `have` | `lib/goal-vaults`, `lib/savings-challenges/challenges.ts` |
| Forecast | `have` | `lib/cash-forecast/model.ts`, `components/cash-forecast/cash-forecast.tsx` |
| Tags and split transactions | `have` | `lib/money-tags`, `components/wealth/money-tools/split-panel.tsx` |
| Shared with a partner | `against a rule` | Private on-device |

### Copilot Money

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| AI categorisation | `against a rule` | No model required. Plain rules are built (`lib/money-rules/engine.ts`) |
| Spending pace against your usual month | `have` | `lib/money-insights/spending-pace.ts`, `components/wealth/spending/insights/pace-view.tsx` |
| This month against last month, per category | `half` | `topPayees` in `lib/money-insights/cash-flow.ts` compares payees with last month, and NOVA answers "spent this month against last month". There is no per-category this-month/last-month table with the difference |
| Recurring payments and price changes | `have` | `lib/bills/detect.ts`, `lib/bills/price-change.ts` |
| Review inbox for new transactions | `have` | `lib/money-review/review.ts`, `components/wealth/money-tools/review-inbox.tsx` |
| Investments and net worth | `have` | `lib/portfolio`, `components/wealth/networth-history.tsx` |
| Rollover budgets | `have` | `lib/budgets/engine.ts` |
| Monthly money recap | `half` | The Life review's month (`lib/life-review/engine.ts`) has net worth but no spending summary. NOVA's "where your money went" workflow (`lib/nova/workflows`) only opens the review |
| Amazon and Apple purchase matching | `against a rule` | Outside accounts |

### Rocket Money

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Subscription finder | `have` | `lib/bills/detect.ts` (confirmed by the person) |
| Subscriptions' yearly total | `half` | Only `monthlyEstimate` in `lib/bills/store.ts` ("A typical month" in `components/wealth/bills/upcoming-bills.tsx`). No yearly total, no per-subscription yearly cost |
| Cancels subscriptions for you | `against a rule` | ZIGoals never cancels. A "cancel before…" note to self is built (`components/wealth/bills/upcoming-bills.tsx`) |
| Bill negotiation | `against a rule` | — |
| Price-increase alert | `have` | `lib/bills/price-change.ts`, `components/wealth/bills/price-changes.tsx` |
| Bill calendar | `half` | Only as a NOVA widget (`components/nova/widgets/bill-calendar.tsx`) and on the Agenda (`components/agenda`). Wealth lists bills but has no calendar |
| Credit score | `against a rule` | Outside service |
| Automatic savings transfers | `against a rule` | Moves money |
| Budgets and net worth | `have` | `lib/budgets`, `components/wealth/networth-history.tsx` |

### Day One

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Entries with a streak and word counts | `have` | `writingStreak` and `wordsThisYear` in `lib/journal/stats.ts` |
| On this day | `have` | `components/journal/on-this-day.tsx`, `lib/on-this-day/on-this-day.ts` |
| Prompt of the day | `missing` | Eight templates on request (`lib/journal-prompts/templates.ts`, `components/journal-prompts/prompt-picker.tsx`) and ZIGi's follow-up after an entry. Nothing offered per day |
| Templates | `have` | `lib/journal-prompts/templates.ts` (EN and NL) |
| "Three good things" | `half` | A template exists (`three-good-things` in `lib/journal-prompts/templates.ts`). No one-tap three-line card and no count of good things |
| Tags | `half` | `tags` is in `journalEntrySchema` (`lib/journal/schema.ts`) and in the CSV export, but `components/journal/journal-compose.tsx` and `journal-page.tsx` have no way to add or filter by them |
| Photos in an entry | `missing` | — |
| Several journals | `missing` | — |
| Calendar of entries | `half` | Year in pixels by energy or mood (`components/journal/year-pixels.tsx`). No calendar of the days with entries |
| Map of places | `against a rule` | Map tiles and geocoding are outside services |
| Search | `have` | "Search your journal" in `components/journal/journal-page.tsx` |
| Encrypted sync across devices | `half` | The journal is device-only (`lib/journal/schema.ts`: "not synced"). End-to-end sync is built for other areas (`lib/vault`) |
| Audio entries with transcription | `missing` | Speech input exists for Quick add (`components/quick-add-mic.tsx`) but not in the Journal |
| Printed books | `against a rule` | Outside service. A CSV export is built (`journal.csv` in `lib/export/everything.ts`) |

### Bearable

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Mood and energy ratings | `have` | `lib/moods/schema.ts`, `lib/energy/schema.ts` |
| Several mood check-ins a day | `half` | One mood per day (`moodDaySchema`, a strict and synced Health v4 group) |
| Symptoms and factors with levels | `have` | `lib/symptoms/schema.ts`, `components/health/plus/symptoms-panel.tsx` |
| Activity and factor tags | `have` | `lib/mood-tags/tags.ts`, `components/health/plus/mood-tags.tsx` |
| "What affects your mood, sleep and energy", ranked | `half` | Built in pieces: `GoodDaysCard` covers mood tags only (`components/health/plus/insights-plus.tsx`); `lib/insights/cross-pillar.ts` has fixed pairings; Compare takes one pair at a time (`lib/compare/engine.ts`). No ranked overview of every factor against mood, sleep and energy |
| Sleep | `have` | `lib/sleep/engine.ts`, `components/health/sleep` |
| Medication | `have` | `components/health/supplements.tsx` |
| Report for a doctor | `have` | `lib/clinician-report/build.ts` |
| Experiments (try a change, compare) | `have` | `lib/experiments/engine.ts` |
| Cycle tracking | `have` | `lib/cycle/engine.ts` |
| Live Apple Health / Health Connect sync | `not web-possible` | Export files are imported instead (Settings → Switch to ZIGoals, `lib/import`) |

### Undebt.it

| Feature | ZIGoals | Evidence / what is missing |
|---|---|---|
| Snowball and avalanche | `have` | `lib/debt-planner/plan.ts` (`strategyOrder`, `runPlan`) |
| Plans side by side with interest saved | `have` | `comparePlans` (interest each plan saves against minimums only) in `lib/debt-planner/plan.ts`. Chart and per-debt table in `components/wealth/debt-planner.tsx` |
| Debt-free date per debt and overall | `have` | `DebtPayoff.month` and `payoffMonth` in `lib/debt-planner/plan.ts` |
| Custom order and other methods (highest payment first, your own order) | `missing` | `Strategy` is `snowball \| avalanche` only |
| One-off extra payments ("snowflakes") | `missing` | Only a fixed extra amount each month |
| Month-by-month payment schedule | `missing` | A balance chart and one payoff table only |
| Progress against the plan from recorded payments | `half` | "Record a payment" (`components/wealth/accounts-section.tsx`) lowers the balance and the planner re-runs from today. No plan-against-actual view |
| Payment reminders | `have` | Bills (`lib/bills`) and the `bill` kind in `lib/notify/plan.ts` |
| A countdown to debt-free | `half` | Countdowns are typed by hand (`lib/countdowns/schema.ts`). The planner's date cannot become one |

## Shortlist for Session AV (up to 16, ranked by how often a friend would use it daily)

Every item below is `missing` or `half` in the matrix, can be built in a web app, needs no outside service or model,
and stays clear of the protected areas: the Today hero and slogan, the Checklist orbit path, the footer, the swan intro,
shell navigation and NOVA's composition. Effort: S is under a day, M is one to two days, L is three days or more.
Stored-format changes are additive and optional, in TIER 3 (stored format) commits.

| # | Item | What exactly to build; main files | Effort |
|---|---|---|---|
| 1 | Tasks quick add in Dutch | Read Dutch days, times, repeats and priorities in the same parser: "morgen 18:00", "overmorgen", "elke maandag", "elke! 3 dagen", "om 9 uur", "tot 1 dec". Use a word table like `lib/quick-add/locales/nl.ts` and show the same highlighted parts. `lib/tasks/parse.ts` (+ tests), `components/tasks/smart-add.tsx` | M |
| 2 | Prompt of the day | One Journal prompt per day, picked by date from a fixed EN/NL list, with "Another prompt" and "Not today". Nothing stored except a hide choice. `lib/journal-prompts/templates.ts` (new daily list and pick), `components/journal/journal-compose.tsx`, `components/journal-prompts/prompt-picker.tsx` | S |
| 3 | Three good things, one tap | Three short fields in the Journal's Write box that save one entry with `template: 'three-good-things'`, plus "N good things this month" from those entries. `components/journal/journal-compose.tsx`, `lib/journal/stats.ts` | S |
| 4 | Faster meal logging: save a meal, copy a whole day | "Save as a meal" on a logged diary meal (stored as a recipe of its items, then pinnable), and "Copy this day to…" any day up to today. Reuse `copyMealTo` and the operation-id guard. `lib/health-quick/quick.ts`, `components/health/plus/meal-copy.tsx`, `components/health/quick-log.tsx` | M |
| 5 | Task reminders as device notifications | Add a `task` kind fed by `reminderInstants`, using the same opt-in, name rules and snooze as habits. The existing push plan is used and no new service. `lib/notify/plan.ts`, `lib/tasks/reminders.ts`, notification settings copy | M |
| 6 | Tasks done per day and week | A small hand-drawn bar chart in the Completed view: done per day for the last 14 days and per week for the last 4, with the same figures as a table. Note: done tasks are kept 30 days. `lib/tasks/engine.ts` (`completedLog` → counts), `components/tasks/tasks-page.tsx` | S |
| 7 | Spending against last month, per category | A table of each category this month so far against last month by the same day and all of last month, with the difference; per currency, a gap when a month has no records. `lib/money-insights/cash-flow.ts`, new `components/wealth/spending/insights/month-vs-view.tsx`, `spending-insights.tsx` | S |
| 8 | Budget targets (YNAB-style) | An optional `target` on a budget: "spend up to X a month" (today's `monthly`), "set aside X a month" or "save X by a date". The month view says what is needed this month and whether it is on track. Information only, not advice. `lib/budgets/schema.ts`, `lib/budgets/engine.ts`, `lib/budgets/ready-to-assign.ts`, `components/wealth/budgets/budgets-month.tsx` | M |
| 9 | What affects your mood, sleep and energy | One Health → Insights card that ranks every factor (habits, mood tags, symptoms, workouts, fasting, spending above an amount) against mood, sleep and energy, using the Compare and cross-pillar rules unchanged: 90 days, at least 14 days a side, the meaningful-gap and probability rules, "goes with, not a cause", and "still collecting N of 14" below the minimum. Shown only while the Health switches allow it, never to ZIGi or NOVA. `lib/compare/engine.ts`, `lib/insights/cross-pillar.ts`, new `components/health/plus/what-affects.tsx`, `components/health/insights-view.tsx` | L |
| 10 | Guided weekly review that ends in tasks and goals | Add Tasks (`lib/tasks/review.ts`), Sleep, Journal and Spending steps to the six steps. The last step turns the intention and any "next step" lines into tasks for next week, or a goal's next action, each with Undo. `lib/weekly-review/engine.ts`, `components/weekly-review/weekly-review-dialog.tsx`, `lib/tasks/engine.ts` | M |
| 11 | Journal tags | Add, remove and filter by tags on entries, using the existing `tags` field (8 per entry, 24 characters); tags also feed item 9. `components/journal/journal-compose.tsx`, `components/journal/journal-page.tsx` | S |
| 12 | Bill calendar on Wealth | A 31-day grid in Upcoming bills. Move the grid logic into a shared lib file so the NOVA widget renders exactly as before and NOVA's composition is not touched. `components/wealth/bills/upcoming-bills.tsx`, new `lib/bills/calendar.ts` | S |
| 13 | Weekly distance, time and volume chart | The last 12 weeks: distance for distance-time exercises, minutes and strength volume, hand-drawn bars with a table. `lib/workouts/engine.ts` (weekly series beside `weekSummary`), `components/health/workouts/workouts-view.tsx` | S |
| 14 | Subscriptions' yearly total | Beside "A typical month": "A year of these bills", per currency, plus each bill's yearly cost in its row. `lib/bills/store.ts` (`yearlyEstimate`), `components/wealth/bills/upcoming-bills.tsx` | S |
| 15 | Running bests | Fastest 1 km, 5 km and 10 km and longest run, from stored splits and distance-time sets, with a calm "new best" line. Runs imported before splits existed do not count, and that is said. `lib/workouts/splits.ts`, `lib/workouts/engine.ts`, `components/health/workouts/workout-splits.tsx` | M |
| 16 | Income → categories flow | One month's income split into categories, savings and what is left, as a hand-drawn flow with a table beside it; per currency, never converted. `lib/money-insights/cash-flow.ts`, new `components/wealth/spending/insights/flow-view.tsx` | M |

Considered and already `have`, so not on the list: "every 3 days after done" repeats (`lib/tasks/recurrence.ts`), On
this day (`components/journal/on-this-day.tsx`), debt plans side by side with interest saved (`lib/debt-planner/plan.ts`),
and copying yesterday's meal or day with recent and frequent foods first (`lib/health-quick/quick.ts`).

Next in line if there is room: Things-style deadlines, and debt planner extras (custom order, one-off extra payments,
a month-by-month schedule).
