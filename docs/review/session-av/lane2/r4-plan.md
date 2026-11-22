# Lane 2 registry: round 4, planning (`r4-plan`, branch `lane2/r4-plan`)

Builder's own file (team brief). Branched from `lane2/batch3` (it holds round 3's Tasks work: energy per task, the Day
Timeline for any day, copy and clear a day; this round builds on those and duplicates none of them). Rows: LEDGER "Round 4",
group U1 (#300–#305), and the Motion rows of COMPETITORS.md's round 4. Copy is plain English in the Tasks UI (as Tasks has
it); NOVA's and ZIGi's answers are EN + NL.

All six rows are **built**. They ship as one feature, the way Motion ships them (its auto-scheduler reads the hours, the
pieces, the blockers and the repeat windows together), so the code is one feature commit after the stored-format commit.

## For the lead (summary of requests)

- **TIER 3 (stored formats)** — commit `3684078a`, all additive and optional, each dropped on read when it cannot be read; no
  new key. Listed under "Stored changes".
- **TIER 3 (PWA)** — commit `58382c6d` (review B4D-2): "Plan your day · N tasks overdue" leaves out a repeat that floats in
  its week until that week has passed (lib/tasks/engine.ts `lateCount`, read by lib/notify/sync.ts). Still a count, never a
  name; every other task counts as before, a waiting one too.
- **engine.ts wiring** (see "NOVA and ZIGi").
- **Help + What's new** text per feature below (help-page.tsx is yours).
- **CSS** (no theme-sheet source touched): components/tasks/tasks-r4.css (new, theme variables only),
  components/tasks/task-row-r3.css (one rule for the row's three new marks).
- **Shards**: please add `tests/av2-plan-week.spec.ts` to the CI shard lists.
- **Showcase hook (not made, so no pinned count can move)**: if wanted, one line in lib/tasks/showcase.ts — task
  `task_showcase-05` ("Example · Sort the photo folder", no day) gains `minutes: 120, chunk: 30`; Plan my week would then
  show it in four pieces. It changes no count of Today or Upcoming (the task has no day), but NOVA's corpus answers about
  minutes may read it, so please check expected.json before adding it.
- **Device keys / catalogue / export / erase / restore**: nothing new (new optional fields on `zigoals:tasks:v1` and
  `zigoals:task-plan:v1`, both already exported, erased and restored).
- **Today (dashboard)**: nothing new is drawn and no Tab stop is added. Today's task count and Today's tasks card leave out a
  task that waits for another (the count can only fall). Tasks → Today (the Tasks page) gains one fold, "Plan my week",
  inside the day planner below the list, and one quiet line when a task of today waits.
- **Weight**: the Tasks and Today first chunks gain only the stored fields, `waitingFor` (engine.ts), the floating repeat's
  next day (recurrence.ts), the row's three marks (task-parts.tsx), the piece length the Agenda draws (lib/tasks/pieces.ts)
  and one lazy mount in Upcoming. Everything else is its own chunk: plan-week.tsx, task-hours-settings.tsx,
  task-plan-fields.tsx, at-risk-line.tsx, lib/tasks/{plan-week,at-risk,work-hours}.ts. I could not build, so I could not
  measure; please run the weight check.

## Stored changes (TIER 3 (stored formats), commit `3684078a`)

- `zigoals:tasks:v1`, each task (loose): optional `chunk` 15–240 (LEDGER #303), optional `after` — up to three task ids, kept
  unique (LEDGER #304), optional `afterHours: true` (LEDGER #301).
- `zigoals:tasks:v1`, a task's `recur` (loose): optional `flex: 'week' | 'month'` (LEDGER #305). Written together with
  `every: 'week', weekdays: [0], interval: 1` (every Sunday) or `every: 'month', monthDay: -1, interval: 1` (the month's last
  day), so an older build reads a fixed repeat on the window's last day and keeps `flex` untouched.
- `zigoals:task-plan:v1` (loose): optional `workHours` `{days?: {"0"–"6": [{from, to}] (0–2 blocks; [] a day off)}, after?:
  {from, to}}` (LEDGER #301). A block that cannot be read, or overlaps the one before, is dropped; a weekday that cannot be
  read is left out (it keeps the usual 09:00–18:00).
Test: `apps/web/lib/tasks/r4-plan-stored.test.ts` (export → erase → restore, read back exactly; tolerant reads; the older
reading of a floating repeat). Frozen readers: no strict object changes; `scripts/frozen-readers.mjs` needs nothing, but please run it.

## NOVA and ZIGi (EN + NL), all rows

`apps/web/lib/ai/local-answers/av2-r4-plan.ts` exports `av2R4PlanAnswer(question, env, extra?)`. Cases:
`apps/web/lib/ai/evals/as/cases-av2-r4-plan.ts` (`AV2_R4_PLAN`, 6 intents, 24 questions). Test:
`apps/web/lib/ai/local-answers/av2-r4-plan.test.ts`. Wiring line for engine.ts (before `av2R3PlanAnswer`):
`if (!subject) { const own = av2R4PlanAnswer(question, env, {plan: env.nova?.taskPlan}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
An answer never moves a task: "how would you plan my week" says where Plan my week would place them and that nothing moves
until the person keeps it.

## Feature — Motion's planned week (LEDGER #300–#305) — built

Read first: docs/STATUS.md "Current accepted baseline". Plan my day's layout is unchanged; it gains one fold below "Fit my
day", and This week gains three parts below its objectives and planning choices. No protected area is touched.

### #301 Working hours — built
- Tasks → This week → "Working hours": the week in words (each weekday's hours, "(the usual)" where not set), and a form:
  Day (Monday to Friday, Saturday and Sunday, or one weekday), "These hours" (From, Until, and an optional break — two
  blocks), "A day off" or "The usual (9:00 AM–6:00 PM)". Kept at once and said. "Evening hours" (20:00–23:00 unless set)
  for "after hours" tasks.
- A task's editor → "Planning — optional" → "After hours: plan it in my evening hours, not my working hours"; the row says
  "After hours".
- Plan my day (Fit my day) places inside today's hours from now (an "after hours" task in the evening, past "My day ends
  at"); "My day ends at" starts at the end of today's hours and moves the end of today's last block, later or earlier, for
  this visit only (review B4D-3): with the usual hours (none set) a typed 21:00 places tasks until 21:00, as before round 4;
  with hours set, a later end extends the last block and an earlier one shortens it (an earlier block is cut at it, a block
  that starts after it is left out). A day off places nothing.
- Conservative: hours that run past midnight are not offered (a block ends on its own day).

### #303 Pieces of a long task — built
- Editor → "In pieces of" (Whole, or 15 min … 4 h "or more"); the row says "In pieces of 1 h".
- Plan my day and Plan my week place what is left (minutes less time spent, 15 at least) piece by piece, each where it first
  fits: "part 2 of 4" (pieces already worked count as done parts). Plan my day says the pieces that find no room today.
- Conservative (nothing new is stored, as the ledger says): a task keeps one day and time, so keeping a plan writes its
  first kept piece; the Agenda draws that one piece; once its time has passed (worked or not), the planners offer the next
  piece. Said under the proposal.

### #304 A task that waits for another — built
- Editor → "Waits for" (and "Also waits for", up to three): open one-off tasks only — never itself, never a repeating task
  (it never finishes for good), never one that already waits for it; a loop through others is refused in words ("That task
  already waits for this one, so this one cannot wait for it.").
- A waiting task is not in Tasks → Today, not in Today's count (the dashboard's card, NOVA's counters) and not placed by
  Plan my day or Plan my week; the row says "Waiting for “…”"; Tasks → Today's planner says "Waiting: “Invitations” after
  “Venue”. Each joins today once those are done." Once they are done it is back in Today on its day.
- Conservative: the Agenda, the Day Timeline, Upcoming and the overdue count still show it on its day (it is still planned
  there). A task no longer on the list (or done, or repeating) is simply not waited for; its id is kept until the task's
  next save (so an Undo of a removal brings the wait back), then dropped by the editor.

### #305 A repeat that floats in its week — built
- The editor's Repeat reads "once a week", "once this week", "any day this week", "once a month", "once a month, any day"
  (and "een keer per week/maand"): "Once a week, any day: it stays in This week until done, due by Sun, Nov 29, then comes
  back." The task's day is its window's last day (Sunday; the month's last day).
- Tasks → This week → "Once this week, any day": the floating repeats open in the week shown (and its month), each with
  "Plan for…" a day of its window (this time only). Plan my week places one with minutes inside its window, never after it.
- Done (early, on time or late), it comes back in the next window that has not passed: a missed week is one overdue task,
  never a pile, and the next one keeps its own week.
- Review B4D-2: a day and time kept from a plan (or "Plan for…") is for this time only. The next copy floats again — no time,
  due by its window's last day — and Plan my week (and Plan my day) place it again inside its window, never on a day off.
  Planned for a Wednesday and not done then, it is not late on Thursday: it is late only once its week (or month) has passed
  (lib/tasks/engine.ts `onTimeUntil` / `isLate`, read by the Tasks lists and counts, the Agenda, the Day Timeline, Plan my
  day's suggestions, NOVA's overdue answers and the notification count). A planned time that passed is planned again.
- **Older builds (review B4D-9), said plainly:** this cannot be made fully safe for an older build without hiding the planned
  day from every reader. An older build reads `due` as the repeat's anchor (every Sunday); once this build moves the day
  inside the week (Plan my week, "Plan for…"), an older build that finishes it brings the next copy back on that same
  week's Sunday — a second one in that week. Nothing is lost and nothing piles up past that one: this build reads that copy
  as floating, not late before its week ends, and finishing it brings the next week's. The alternative — `due` kept on the
  window's last day and the planned day in a new field — would make the Agenda, the Day Timeline, Today, Upcoming and the
  reminders (and every older build) stop showing the day the person planned, so it is not done. A floating repeat that was
  never planned inside its week (due on its Sunday) reads the same on both builds.
- Conservative: the add line ("Call mum every Monday") does not read "once a week" yet — only the editor does — to keep the
  Tasks first chunk unchanged.

### #300 Plan my week — built
- Tasks → This week (and Tasks → Today, under Plan my day): "Plan my week · 4 tasks with minutes to place over the next 7
  days". It places the open top-level tasks with minutes and no time inside the free working hours of the next 7 days,
  around timed tasks and imported calendar events: the earliest deadline first, then priority, then the planned day, then
  the oldest. Never before the task's own day or start-early day; never after its deadline (or a floating repeat's window).
- Shown day by day: "Tomorrow · Tue, Nov 24 — 2 h 30 min placed · energy about 8 of your 20" (round 3's energy, when tasks
  have one) and "See the day" (round 3's Day Timeline for that day). Each placement is a ticked box; "Not placed: “Slides”:
  the free time before its deadline (Tue, Nov 24) is taken. Pieces (in its editor) can help it fit."
- "Keep 3 tasks" writes each kept task's day and time in one change with Undo (the toast). Nothing moves until then, and
  nothing moves by itself.
- Conservative: a task with a day keeps that day as its earliest (only start-early lets a plan put it sooner); a fixed repeat,
  a background task and a waiting task are never moved; energy is shown per day, never used to move a task.

### #302 A deadline at risk — built
- Tasks → Upcoming, at the top, one quiet line (a note; never red, never an alert, never a sound or a notification): "About
  7 h of tasks are due by Tue, Nov 24, and about 6 h of your working hours are free before then: “Report”, “Slides”. Moving
  a deadline, more hours in Tasks → This week, or letting one go would make room." Tasks without minutes are not counted
  (said). It looks 14 days ahead (Upcoming's span), counts minutes less time spent, and leaves the counted tasks' own timed
  blocks out of the busy time. Derived; nothing stored.

Files: lib/tasks/{schema.ts, plan-record.ts (stored commit), engine.ts (waitingFor, TaskPatch, Today and its count),
recurrence.ts (flex: windowEnd, windowStart, flexRule, next occurrence, words), layouts.ts (fitDay with hours and pieces,
firstFit, taskBusy), pieces.ts, work-hours.ts, plan-week.ts, at-risk.ts}, lib/agenda/time-items.ts (a piece's length),
components/tasks/{plan-week.tsx, task-hours-settings.tsx, task-plan-fields.tsx, at-risk-line.tsx, today-planner.tsx,
task-editor.tsx, task-parts.tsx, tasks-page.tsx (one lazy mount in Upcoming), tasks-plan-views.tsx (three lazy mounts in
This week), tasks-r4.css, task-row-r3.css}. Deviation from the ledger's file list, for weight: `fitWeek` lives in its own
lib/tasks/plan-week.ts (not layouts.ts) and Undo is the list's own change (lib/tasks/undo.ts is not changed).
Tests: lib/tasks/r4-plan.test.ts (hours, pieces, waits, floating repeats, Plan my week, at risk), lib/tasks/r4-plan-stored.test.ts,
lib/ai/local-answers/av2-r4-plan.test.ts. Spec: tests/av2-plan-week.spec.ts (not run by me: written against the markup).

Help (EN):
- Q "Can ZIGoals plan my week?" A "Yes, as a proposal. In Tasks → This week (or Tasks → Today), open “Plan my week”. Tasks
  with minutes go into the free time inside your working hours over the next 7 days, the earliest deadline first, then
  priority. Untick what you don't want and press Keep: each task gets its day and time, with Undo. Nothing moves by itself."
- Q "How do I set my working hours?" A "In Tasks → This week → Working hours, choose the days, the hours and an optional
  break, or a day off. Plans place tasks only inside them. A task marked “after hours” goes in your evening hours instead.
  In Tasks → Today, “My day ends at” moves the end of today's last hours, later or earlier, for that visit only."
- Q "What does a deadline line in Upcoming mean?" A "When the tasks due by a deadline take more minutes than your free working
  hours before it, Upcoming says so in one quiet line, with the tasks. It is a fact to plan with, not a warning."
- Q "Can a long task be done in pieces?" A "Yes. In its editor give it its minutes and choose “In pieces of”. Plans place it
  piece by piece (“part 2 of 4”), and the time you spend counts against the whole."
- Q "Can a task wait for another one?" A "Yes. In its editor choose up to three tasks under “Waits for”. Until they are done
  it stays out of Today and out of plans; then it joins its day."
- Q "Can a task repeat any day of the week?" A "Yes. Type “once a week” or “once a month” as its repeat. It stays in Tasks →
  This week until done, then comes back next week. A missed week is one overdue task, never a pile."
What's new: "Tasks: Plan my week — your tasks placed in your working hours, as a proposal you keep with Undo; tasks in pieces,
tasks that wait for others, repeats that float in their week, and a calm line when a deadline looks tight."

## Review fixes (batch 4 review D: B4D-2, B4D-3, B4D-6, B4D-7, B4D-9)

- **B4D-2 (Major), fixed** — `a40d2fc2`, plus `58382c6d` (TIER 3 (PWA)). A floating repeat's next copy drops the kept time
  (finishTask, skipOccurrence); `taskSpan` limits it by its window's last day, not by a planned `due`; `planAgain` takes a
  floating repeat whose planned time passed; it is late only after its window (`isLate`, `lateCount`). Test:
  lib/tasks/r4-plan-b4d.test.ts (keep → finish → next week placed again on a working day; not late mid-week; the Agenda's and
  the Day Timeline's words; the notification count; a fixed repeat keeps its time as before).
- **B4D-3 (Major), fixed** — `e4f12101`. `hoursUntil` (lib/tasks/work-hours.ts): the typed end moves the day's last block,
  later or earlier; the field says so under it. Help text updated above. Test: lib/tasks/r4-plan-b4d.test.ts.
- **B4D-6 (Minor), fixed** — `bfb441fd` (TIER 3 (stored formats)). `readDayBlocks` leaves a weekday out (the usual hours)
  when none of its stored blocks can be read; only a stored empty list is a day off. Test: lib/tasks/r4-plan-b4d.test.ts.
- **B4D-7 (Minor), fixed** — `219c14ec`. "The usual (…)" and NOVA's English words for the usual hours go through formatClock
  (`blockWords`, now in lib/tasks/work-hours.ts). Test: lib/tasks/r4-plan-b4d.test.ts.
- **B4D-9 (Minor), said** — see #305 "Older builds" above: why it cannot be made fully safe, and what an older build does.
