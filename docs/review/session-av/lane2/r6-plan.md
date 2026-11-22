# Lane 2 registry: round 6, planning (`r6-plan`, branch `lane2/r6-plan`)

Builder's own file (team brief). Branched from `lane2/batch5` (it holds all lane 2 work through round 5: Plan my day, Plan my
week, working hours, pieces, waiting tasks, floating repeats, time blocks, Doing and Cancelled, earlier finishes; this round
builds on those and duplicates none of them — #393 reads round 4's `after` waits beside its own order, #396 reads round 5's
kept finishes). Rows: LEDGER "Round 6", group W1 (#391–#398) and the OmniFocus and Capacities task rows of COMPETITORS.md's
round 6. Copy is plain English in the Tasks UI (as Tasks has it); NOVA's and ZIGi's answers are EN + NL.

All eight rows are **built**. Nothing is Carried.

## For the lead (summary of requests)

- **TIER 3 (stored formats)** — commit `461eeb0e`, all additive and optional on loose records, each dropped on read when it
  cannot be read; **no new key**. Listed under "Stored changes".
- **TIER 3 (PWA)** — commit `be0d8c3f`: a task of a project on hold sends no reminder while the hold lasts
  (lib/tasks/reminders.ts `reminderInstants`, read by lib/notify/sync.ts), and is not counted in "Plan your day · N tasks
  overdue" (lib/tasks/engine.ts `lateCount`). The ledger's note says "no notification-plan change this round"; #392's own row
  asks for the reminders to leave, so this is the one change, in its own commit: only fewer wakes, never a new one, never a
  name. On the resume day (or after Resume now) its reminders come back as before.
- **engine.ts wiring** (see "NOVA and ZIGi").
- **Help + What's new** text below (help-page.tsx is yours).
- **CSS** (no theme-sheet source touched; please regenerate the sheets as usual): new components/tasks/tasks-r6.css (theme
  variables only); components/tasks/tasks.css (two rules: `.tasks-bulk-group`, for the Select bar's day and label groups).
- **Shards**: please add `tests/av2-projects-r6.spec.ts` to the CI shard lists (not run by me: written against the markup).
- **Search words** (lib/search/static.ts is yours, if it lists Tasks' words): `is:hold` and `is:waiting` are new filter words (prefixed, review B6M-9, so the plain words still match titles) in
  Tasks (lib/tasks/search.ts); Tasks → Review is a new view (`?view=review`).
- **Device keys / catalogue / export / erase / restore**: nothing new. Every new field is on `zigoals:tasks:v1` or
  `zigoals:task-plan:v1`, both already exported, erased and restored (test: lib/tasks/r6-plan-stored.test.ts).
- **Showcase hook (not made, so no pinned count can move)**: if wanted, in lib/tasks/showcase.ts one project with `inOrder:
  true` and one with `review: {every: 2, last: <14 days ago>}`; a hold would take tasks out of Showcase Today, so it is not
  suggested. `inOrder` changes Today's and Upcoming's counts when the project has more than one open dated task, so please
  check the pinned counts and expected.json first.
- **Today (dashboard)**: nothing new is drawn by default and **no Tab stop is added**. Today's "Tasks due today" line and the
  To do card leave out a task of a project on hold and one waiting its turn (counts can only fall; the Showcase has neither);
  with a focus on, the due line follows it and says " · focused on Work" inside its existing link (the Showcase has no focus).
- **Weight**: the Tasks first chunk gains the stored fields (schema.ts), the hold / order / label-group logic in engine.ts
  (`projectHeld`, `heldProject`, `orderAhead` with a per-record cache, `waitsTurn`, `setAside`, `oneOfEachGroup`), the month-end
  rule in recurrence.ts (`fromEndWeekday`, `workdayOf`, `olderDay`), the parse words, the focus reader (lib/tasks/focus.ts, no
  planning schema), the row's "After …" line, the nav's Review item and "on hold" mark, the Select bar's two new handlers and
  three lazy mounts in tasks-page.tsx. Everything else is its own chunk: project-states.tsx, project-review.tsx, focus-bar.tsx,
  task-r6-parts.tsx (in the editor's chunk), label-groups.tsx (in the planning views' chunk), the Select bar's new fields (in
  tasks-page-extras, already lazy), lib/tasks/{project-states, label-groups, repeat-record}.ts. I could not build, so I could not
  measure; please run the weight check.
- **Protected baseline**: #391 adds fields to the existing Select bar (shown only while tasks are selected); #394 adds one
  "Focus…" text link to a Tasks view's head and one quiet line under it while a focus is on. No Today hero, no shell navigation,
  no protected area is touched.

## Commits

- `461eeb0e` TIER 3 (stored formats): a project's hold, in order and review, a task in order, repeats from the month's end,
  label groups and the focus.
- `7e1b7dee` Session AV lane 2 (planning): OmniFocus's projects and Capacities' repeat record — LEDGER #391–#398.
- `be0d8c3f` TIER 3 (PWA): no reminder and no overdue count for a project on hold — LEDGER #392.

Checks run: typecheck (whole app) green after each part; eslint of every changed file; unit tests lib/tasks, lib/notify and the
r4–r6 plan answers (all green; lib/notify/ak-journey-fixes.test.ts hit its 5 s timeout once under the shared machine's load and
passed when run again alone). Not run (lead's): next build, Playwright, the weight check, the theme sheets, frozen readers.

## Stored changes (TIER 3 (stored formats), commit `461eeb0e`)

- `zigoals:tasks:v1`, each project (loose), all optional: `hold` `{since: day, until?: day}` (LEDGER #392; on hold from
  `since` until the day before `until`, or until resumed; an older build keeps it and shows the tasks as before); `inOrder: true`
  (LEDGER #393); `review` `{every: 1–52 weeks, last?: day}` (LEDGER #395).
- `zigoals:tasks:v1`, each task (loose), optional: `inOrder: true` (LEDGER #393, its subtasks one at a time).
- `zigoals:tasks:v1`, a task's `recur` (loose), optional: `fromEnd` `{n: 2–5, weekday: 0–6}` and `workday` `'first' | 'last'`
  (LEDGER #398). As the ledger's owner note asks, the new rule is **never written into `nth`** (an older build would drop an
  `nth` of -2 and repeat on the day of the month): each is written beside a plain `monthDay` an older build follows (the first
  occurrence's day for `fromEnd`; -1 for the last working day, 1 for the first) and with no `nth`. This build reads `fromEnd`
  and `workday` before `nth` and `monthDay`.
- `zigoals:tasks:v1`, the record (loose), optional: `labelGroups` — up to 20 `{id, name ≤ 40, labels: 1–12 labels}` (LEDGER
  #397). A label that cannot be read is dropped; a group with none left is dropped (never the record).
- `zigoals:task-plan:v1` (loose), optional: `focus` `{projects?: id[] ≤ 20, areas?: id[] ≤ 20}` (LEDGER #394); a focus with no
  readable id is no focus.
Test: `apps/web/lib/tasks/r6-plan-stored.test.ts` (export → erase → restore for both records, read back exactly; tolerant
reads; an older reader of a repeat from the month's end finds its plain `monthDay`). Frozen readers: no strict object
changed; please run `scripts/frozen-readers.mjs`.

## NOVA and ZIGi (EN + NL), all rows

`apps/web/lib/ai/local-answers/av2-r6-plan.ts` exports `av2R6PlanAnswer(question, env, extra?)`. Cases:
`apps/web/lib/ai/evals/as/cases-av2-r6-plan.ts` (`AV2_R6_PLAN`, 8 intents, 32 questions). Test:
`apps/web/lib/ai/local-answers/av2-r6-plan.test.ts` (every case in its language; questions left to others; and no other
corpus question is claimed — the test leaves its own intents out, so it holds once you add them to CORPUS). Wiring line for
engine.ts (before `av2R5PlanAnswer`):
`if (!subject) { const own = av2R6PlanAnswer(question, env, {plan: env.nova?.taskPlan}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
(the focus answer reads `taskPlan.focus`; without the planning record it says how to choose a focus). An answer never
changes a task. Intents: projects on hold (with their resume day), what is next in an in-order project, the focus, projects
up for review, a repeat's record (facts only, never "behind"), the label groups, changing several tasks at once, repeats from
the month's end.

## Feature — OmniFocus's projects and Capacities' repeat record (LEDGER #391–#398) — built

Read first: docs/STATUS.md "Current accepted baseline". Tasks gains one view (Review, listed once a project has a review
interval), a fold under a project's tools ("Hold, order and review"), a "Focus…" link in the head of the views it narrows,
and fields in the existing Select bar; Areas and templates gains "Label groups"; the task editor gains two lines.

### #391 Several tasks at once — built
- The Select bar (shown while tasks are selected) gains "Any day" with "Set the day", "No day", "Add a label" (a label in use
  or in a group offered as you type; any one-word label) and "Take off a label" (the labels the selected tasks carry). Each is
  one change with the bar's one Undo, said in the toast ("Added @errand to 2 tasks.").
- No day: a repeating task keeps its day (it needs one), said in the same line; its time goes with the day.
- A label of a group (#397) takes the group's other label away, as everywhere.

### #392 A project on hold — built
- A project's "Hold, order and review" → "Put on hold", with "Resume on (optional)". Its tasks leave Today, Upcoming, Overdue,
  the matrix, Plan my day's suggestions and its planner, Plan my week, Today's due line and To do card, the counts, the task
  reminders and the "Plan your day · N overdue" count (TIER 3 (PWA)); they stay listed in the project (and All open), with the
  line "On hold until Mon, Dec 7 · its tasks are listed here only … Resume now". On that day they come back by themselves; "Resume
  now" brings them back at once (Undo). The nav says "on hold" in place of the project's count. Search: `is:hold`.
- Conservative: the Agenda and the Day Timeline still show them on their day (as round 4 kept waiting tasks there).

### #393 Projects in order — built
- "Do the tasks one at a time, from the top" on a project, and "Do the subtasks in order, one at a time" in the editor of a task
  with subtasks (acts at once, Undo). Only the first open task (the project's order: no section first, then each section; an
  archived section's tasks are put away) is in Today, Upcoming, the matrix, Plan my day and Plan my week; the others show
  "After “Book the venue”" on their row and wait; finishing it brings the next forward. A repeating task never waits and never
  holds the others up. A subtask under a waiting task waits with it. Overdue still counts them (as round 4's waits). Search:
  `is:waiting` (waiting its turn or for another task).

### #394 Focus on some projects — built
- "Focus…" in the head of Today, Upcoming, All open, Overdue, a label, a priority, the matrix and the Calendar: areas and
  projects to tick, then "Focus". Those views (their nav counts too) and Plan my day's suggestions show only their tasks, with
  "Focused on Work · Show all · Change" until it is ended (Show all, with Undo). Tasks in the Inbox are never hidden; a
  project's own view is never narrowed. Kept on this device (the planning record), so it stays after a reload. Focus is never
  dropped to the page (it returns to the line, or to "Focus…").
- Deviation: the ledger names the Area choice's files; the Area choice (one area, a per-visit narrowing) stays as it is, and
  Focus works beside it.

### #395 Review each project every so often — built
- "Review it every 1, 2, 3, 4, 6, 8 or 12 weeks" on a project (the first turn that many weeks on). Tasks → Review lists the
  projects whose turn has come, the longest waiting first, each with its open tasks (with their day), the waiting ones ("after
  …") and the on-hold ones; "Reviewed" sets the next turn (Undo) and focus goes to the view's heading; "Coming up" lists the
  others with their day. The weekly review's Tasks step says "2 projects to review →" (a link to Tasks → Review) as one line.

### #396 A repeating task's record — built
- In a repeating task's editor: "This repeat’s record (since Aug 24): Every week on Mon · done 4 times in the last 3 months
  (2 by its day, 2 after it) · on average every 8.3 days." From the kept finishes (round 5's #352 can take one back or move
  it); facts only, never "behind", never a score. Nothing stored.
- Deviation: shown in the editor only, not in Completed's per-finish "Change" (each finish there is one day; the record is the
  task's).

### #397 One label of a group — built
- Tasks → Areas and templates → "Label groups": a name and its labels ("Where: @home @office @errand"), Change and Remove
  (Undo; removing keeps the labels on the tasks). A label sits in one group. Giving a task one label of a group — in its editor,
  in quick add (the last typed wins), from the Select bar, or by a project's rule — takes the group's other label away. Making a
  group changes no task: "1 open task carries more than one; each keeps one at its next change".

### #398 The second-to-last weekday of a month — built
- Quick add and the editor's repeat field read "every second-to-last Friday" (also "second last", "next-to-last", "third last",
  "penultimate"), "every last workday" / "last working day" / "last weekday" / "first business day", "every month on the
  second-to-last Friday", and Dutch "elke voorlaatste vrijdag", "elke laatste werkdag". Described as "Every month on the
  second-to-last Friday", "Every month on the last working day" (Monday to Friday). The editor's hint names both. Stored as the
  owner note asks (see Stored changes). Not read from a calendar or Todoist import's RRULE (`BYDAY=-2FR` is still refused there,
  as before).

Files: lib/tasks/{schema.ts, plan-record.ts, focus.ts (stored commit), engine.ts, recurrence.ts, parse.ts, plan-day.ts,
plan-week.ts, search.ts, undo.ts (a label group's Undo), project-states.ts, label-groups.ts, repeat-record.ts}, TIER 3 (PWA):
lib/tasks/reminders.ts and engine.ts `lateCount`; components/tasks/{tasks-page.tsx, tasks-page-extras.tsx, tasks-nav.tsx,
task-parts.tsx, task-editor.tsx, task-r6-parts.tsx, project-states.tsx, project-review.tsx, focus-bar.tsx, label-groups.tsx,
tasks-organise.tsx, tasks-plan-views.tsx (the Calendar's focus), plan-day.tsx, tasks-body.tsx, today-tasks-due.tsx, tasks.css,
tasks-r6.css}, components/weekly-review/weekly-review-dialog.tsx; lib/ai/local-answers/av2-r6-plan.ts,
lib/ai/evals/as/cases-av2-r6-plan.ts.
Tests: lib/tasks/r6-plan.test.ts, lib/tasks/r6-plan-stored.test.ts, lib/notify/r6-hold-notify.test.ts,
lib/ai/local-answers/av2-r6-plan.test.ts. Spec: tests/av2-projects-r6.spec.ts (not run by me).

Help (EN):
- Q "Can I change several tasks at once?" A "Yes. In Tasks, choose Select and tick the tasks. The bar finishes them, sets a
  priority, gives them any day or no day, moves them, adds a label or takes one off, or removes them. Each is one change with
  one Undo. A repeating task keeps its day."
- Q "How do I put a project on hold?" A "Open the project and choose “Hold, order and review” → “Put on hold”. Choose a day
  to resume on if you like. Until then its tasks stay in the project but leave Today, Upcoming, your plans and the reminders.
  They come back by themselves on that day, or at once with “Resume now”."
- Q "Can a project's tasks be done one at a time?" A "Yes. Under “Hold, order and review”, tick “Do the tasks one at a time”.
  Only the first open task shows in Today and Upcoming; the next says “After …” and comes forward when the first is done. You
  can still tick a later one done early. A task's own subtasks can go in order too, from its editor."
- Q "What does Focus do?" A "“Focus…” in Tasks → Today (or Upcoming, the matrix, the Calendar) shows only the projects or
  areas you tick, until you choose Show all. Tasks in the Inbox are never hidden."
- Q "How do project reviews work?" A "Set “Review it every … weeks” on a project. When its turn comes it is listed in Tasks →
  Review with its open, waiting and on-hold tasks. Choose “Reviewed” and the next turn is set. The weekly review says how many
  projects wait."
- Q "How often have I done a repeating task?" A "Open its editor: “This repeat’s record” says how often it was done in the
  last 3 months, how many by its day and after it, and the average days between finishes beside its repeat."
- Q "What is a label group?" A "Labels of which a task carries one, such as Where: @home, @office, @errand. Make one in
  Tasks → Areas and templates → Label groups. Giving a task @office then takes @home away, also in quick add."
- Q "Can a task repeat on the second-to-last Friday?" A "Yes. Type “every second-to-last Friday” or “every last workday” with
  the task or as its repeat. Working days are Monday to Friday."
What's new: "Tasks: change several at once (any day, labels), a project on hold or in order, Focus on some projects, project
reviews, a repeat's record, label groups, and the second-to-last weekday as a repeat."

## Left (allowed causes only)

- Nothing.
