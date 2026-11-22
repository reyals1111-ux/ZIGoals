# Lane 2 registry: Tasks and planning (`tasks`, branch `lane2/tasks`)

Builder's own file (team brief). Branched from `feature/session-av-2` at `fbeb3e54`. Every row of LEDGER groups 1, 2 and 11 is
built below; nothing in them is left. Copy is plain English (Dutch where the area has it: the task line, the answers).

## Stored formats (TIER 3; additive only, own commit)

| Where | Change | Older readers |
|---|---|---|
| `zigoals:tasks:v1` task | optional `spent` (int min), `early` (1–60 days), `parallel` (`true`), `objective` (id), `comments` ([{id, at, text ≤ 1000}] ≤ 50); reminder entry optional `at` ("YYYY-MM-DDTHH:MM"; `before` stays, 0) | loose objects keep them; an older build reads an `at` reminder as "at the time" of a dated task and skips it on a task with no day |
| `zigoals:tasks:v1` record | optional `areas` ([{id, name, order}] ≤ 30), `objectives` ([{id, week (Monday), title, doneAt?, goal?}] ≤ 200); project optional `areaId`; section optional `archived: true` | kept untouched, not shown |
| `zigoals:countdown-extras:v1` item | optional `since: true` (counts up) | shown as a passed date |
| NEW `zigoals:task-plan:v1` | `{version: 1, defaultReminder?, dayLimit?, dailyGoal?, timers?[{taskId, since}], doneLog?{through, days}}` (lib/tasks/plan-record.ts, key in lib/tasks/plan-key.ts) | n/a |
| NEW `zigoals:task-templates:v1` | `{version: 1, items: [{id, name, createdAt, items: [{title, section?, parent?, offset?, level?, minutes?}]}]}` ≤ 30 × 100 (lib/tasks/templates.ts) | n/a |
| display key `zigoals:task-area` | the area chosen at the top of Tasks (a string id) | n/a |

Lead, please register (I did not edit the shared registries):
- personal device records (av-device-keys / onboarding / Export everything / catalog / erase / restore "Today and Life"):
  `zigoals:task-plan:v1` — catalog label "Tasks: your planning choices, timers and the count of finished tasks per day",
  area Today; `zigoals:task-templates:v1` — "Tasks: your project templates", area Today. Neither is synced.
- display key `zigoals:task-area` (AH_DISPLAY_KEYS / NON_PERSONAL_KEYS).
- Optional: `NovaToolSources.taskPlan` and `.taskTemplates` (read from those keys) so the answers below can read them.

## Feature 1 — reminders and capture (LEDGER group 1: #1, #3, #4, #11, #15, #31) — built

- #3 a reminder at its own date and time (editor "Remind me at", also on a task with no day) and `!2h` / `!30m` / `!1d` /
  `!18:30` in the task line (up to three; read in Tasks' line and global Quick add). Notification keeps "Snooze 1 h" (QUALITY "Not fixed", unchanged).
- #11 a default reminder (Tasks → This week → Your planning choices) on every new task with a day (Tasks page, Quick add,
  NOVA/ZIGi via lib/tasks/device.ts); "Start focus" on every reminder that has gone off (Tasks: opens Focus Sessions; Today: links to `/app/tasks?focus=`).
- #15 a countdown that counts up ("418 days since · 1 year, 1 month"), its own "Counting up" list and "Days since" switch; a yearly one says the years it marks.
- #31 reminders written in a note ("@remind tomorrow 9:30 call the plumber", "⏰ friday", "@herinner …"): under the note, in
  Notes → Notes "Reminders in your notes", and in the device notification plan as a task-kind wake that opens the note (no Done).
- #1 a long typed line joined like speech offered as several tasks ("Make 2 tasks") in Tasks and global Quick add.
- #4 a spoken line split into several tasks at "and then", "also", "daarna", "en dan" … and at "and" before a to-do verb;
  "remove that" / "haal dat weg" takes the one before out (said under the preview).

Files: lib/tasks/{parse,reminders,plan-key,split,device,intent}.ts, lib/notes/reminders.ts, lib/countdowns/extras.ts,
components/tasks/{smart-add,reminder-rows,task-editor,use-task-list,tasks-page}.tsx, components/notes/{note-reminders,note-editor,notes-workspace}.tsx,
components/countdowns/countdowns-card.tsx, components/quick-add-line.tsx, components/quick-add-mic.tsx;
TIER 3 (PWA): lib/notify/plan.ts (a task item may carry `note`: href to the note, `actionable: false`), lib/notify/sync.ts.
Tests: lib/tasks/av2-reminders-capture.test.ts. Spec: tests/av2-task-reminders.spec.ts.

## Feature 2 — daily and weekly planning (LEDGER group 2: #9, #21–#27) — built

- #21, #24 Tasks → Today "Fit my day around the Agenda": untimed tasks placed first-fit in the free time between timed tasks
  and imported calendar events, until "My day ends at"; Place one or Place all (Undo). The Agenda draws a timed task until
  its own minutes end (lib/agenda/time-items.ts; 30 without). Writing to an outside calendar stays Carried (outside service).
- #25 Start/Stop timer per task (Fit my day, and the running list); Stop adds to the task's "Time spent"; planned vs spent
  today (Today) and per day (This week); "Time spent" is editable in the editor.
- #26 "My day holds" limit and the overcommit notice in Tasks → Today.
- #27 "Runs in the background" on a task: no slot, no minutes in the load; several timers at once (up to 10).
- #22, #23 Tasks → This week: objectives per week (add, link tasks, reached, carry the open ones to next week, remove; an
  optional goal), the open tasks with no day planned into the week, planned/spent/done per day.
- #9 daily goal and streak (best too), from a finish log kept past the 30 days a finished task stays (`doneLog`, counted once a day).

Files: lib/tasks/{layouts,plan-record,minutes,engine}.ts, components/tasks/{today-planner,plan-day,task-plan-settings,tasks-plan-views}.tsx.
Tests: lib/tasks/av2-planning.test.ts. Spec: tests/av2-task-planning.spec.ts.

## Feature 3 — layouts and organisation (LEDGER group 11: #7, #8, #10, #12, #13, #14, #17, #20, #28, #29, #30) — built (see #14 below)

- #7, #29, #12 Table: every open task in sortable columns (task, project, priority, day, deadline, planned, spent, labels,
  added, changed — group/sort by created or modified), Done box per row, a project filter.
- #7, #13 Calendar: 3 days with times (block ends) and all-day tasks, or a month; all tasks or one project (the project calendar).
- #13, #29 Timeline: a project's tasks as bars from their day to their deadline, today marked, late ones marked.
- #13, #30 Insights: the year as a heatmap of finished tasks (53 weeks), and "a chart from your lists": finished / open /
  planned minutes by week, project, label or priority. A live calendar subscription stays Carried (outside service).
- #20, #12, #28 Areas: add / rename / remove, put projects in one; the nav groups projects under their area; the "Area" choice
  above the list narrows every list view (kept on this device). Archive a section as a block (it leaves the project list).
- #10, #17 Templates: four built in (Moving house, A trip, A new job, Weekly reset) and your own, saved from a project; using
  one makes a project with sections, subtasks, priorities, minutes and days from a start day (used again = a repeating project).
- #17 "Start early" (1–14 days) in the editor: the task is in Today that many days before its day.
- #8 comments on a task (text; web links open in a new tab), kept with the task. A photo/voice note on a task: the owner's
  task text says "as text/links on this device"; photos and audio were not built here.
- #14 several matrices (save the lines as a named matrix, choose one in one step, up to 10) and rules by label ("Also
  important / urgent with the label") and one project — in the matrix's "Your own lines" fold (display key `zigoals:matrix-rules`,
  additive `importantLabels`, `urgentLabels`, `project`, `saved`; older builds read the two lines only). Test: lib/tasks/av2-matrix.test.ts.

Files: lib/tasks/{layouts,templates}.ts, components/tasks/{tasks-plan-views,tasks-organise,tasks-nav,tasks-page,task-editor}.tsx, tasks-plan.css.

## NOVA and ZIGi (EN + NL)

`lib/ai/local-answers/av2-tasks.ts` exports `av2TasksAnswer(question, env, extra?)`: week objectives, daily goal and streak,
time planned vs spent (today / this week), running timers, the day's limit, start-early tasks, areas, templates, reminders in notes.
Cases: `lib/ai/evals/as/cases-av2-tasks.ts` (`AV2_TASKS`, 9 intents, 34 questions). Test: `lib/ai/local-answers/av2-tasks.test.ts`.
Wiring line for engine.ts (beside `avAnswer`, before it):
`if (!subject) { const own = av2TasksAnswer(question, env); if (own) return own; }` — pass `{plan, templates}` when the
env carries them (`env.nova.taskPlan`, `env.nova.taskTemplates` are read when present).

## Help (EN) and What's new

- Q: How do I set a reminder at any time? A: Open a task and fill "Remind me at", or type "!2h" (two hours before), "!30m" or "!18:30" in the add line. Choose a default reminder for every new task in Tasks → This week.
- Q: Can I write a reminder in a note? A: Yes. Put "@remind tomorrow 9:00 call the plumber" (or "⏰ friday 18:00") on a line. It shows under the note and in Notes, and reaches your notifications when task reminders are on.
- Q: How do I plan my day around my calendar? A: Tasks → Today → "Fit my day around the Agenda" places your tasks without a time in the free time between your timed tasks and calendar events. Place one or all; each shows on the Agenda until it ends.
- Q: How do I see planned against actual time? A: Start a timer on a task in Tasks → Today; Stop adds the minutes to its time spent. Tasks → This week shows planned and spent per day.
- Q: What are week objectives? A: Two or three things that would make the week a good one, in Tasks → This week. Link tasks to them; carry the open ones to the next week.
- Q: How do areas work? A: In Tasks → Areas and templates, add an area (Work, Home) and put projects in it. Choose an area at the top of Tasks to see only its tasks.
- Q: How do templates work? A: Tasks → Areas and templates: pick a template, a name and a start day, and Make the project. Save any project as a template there too.
- Q: Can a countdown count up? A: Yes: tick "Count the days since" when adding it, or press "Days since" on its row.
- What's new: "Tasks: reminders at any time, This week with objectives, timers, a day planner, table, calendar, timeline, insights, areas and templates."

## Showcase, Today, CSS, search

- Showcase: no Showcase record changed (pinned counts in lib/nova/cards and local-answers). Suggested hook for the lead: one
  objective and one area in lib/tasks/showcase.ts — only if the pinned counts allow.
- Nothing new is always visible on Today. Tasks → Today gains the day planner (one fold, plus lines only when a limit, goal or timer applies).
- CSS touched: components/tasks/{tasks,plan-day,tasks-plan}.css, components/notes/notes.css, components/countdowns/countdowns.css (theme variables only).
- Search (lib/search/static.ts, the lead's): "This week", "Table", "Calendar", "Timeline", "Insights", "Areas and templates" → `/app/tasks?view=week|table|days|timeline|insights|organise`.
- Weight: every new view is a lazy chunk (tasks-plan-views, today-planner inside plan-day, note-reminders, split.ts); the Tasks first chunk gains the nav items, the area choice, the reminder parse wiring and the default-reminder reader only.

## q1 Minors (QUALITY.md "Not fixed", Tasks/planning)

- a daily task goal — built (Feature 2); a load per day — built: each day of Upcoming says its minutes; matrix rules by label — built (#14);
  a paused-until note — built: a paused repeat says "Paused until …" in its editor with "Resume from …" (interval-1 repeats,
  where the natural next day is known); the pause date's `min` was already tomorrow.
- Showcase examples (more finished tasks, a task reminder, the Days until card, a repeating task with subtasks) — left:
  against a named rule (the Showcase counts pinned by lib/nova/cards and local-answers tests, and Today's ≤ 90 Tab stops,
  tests/ao/today-tab-stops.spec.ts); reported, not changed.
- Help wording (q1 #1, #38) — the lead's file (help-page.tsx); the corrected text is in Help above.

## M-9 (owner decision) — built

The goal creator's step 1 has one primary button, "Continue →"; "Create goal" stays beside it as secondary. The name's
length count shows only from 60 characters: a field may carry `data-count-from` (components/ui/length-counter.tsx
`countShown`), and the goal name carries 60. Unit: components/ui/av2-length-counter.test.ts. Spec: tests/av2-goal-creator.spec.ts.

## Left (allowed causes only)

- Showcase examples above: against a named rule (pinned counts). Writing to an outside calendar (#24) and a live calendar
  subscription (#13): needs an outside service (as the ledger carries them). Nothing else in groups 1, 2 and 11 is left.
- Next: the lead's added groups N11 (Goodbudget) and N12 (Kubera), Money.
