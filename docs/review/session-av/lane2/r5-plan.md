# Lane 2 registry: round 5, planning (`r5-plan`, branch `lane2/r5-plan`)

Builder's own file (team brief). Branched from `lane2/batch4` (it holds all lane 2 work through round 4: Plan my day, Plan my
week, working hours, pieces, waiting tasks, floating repeats, energy, the Day Timeline for any day; this round builds on
those and duplicates none of them). Rows: LEDGER "Round 5", group V1 (#348, #349, #350, #351, #352, #353, #354, #356, #357)
and the Akiflow rows (with Logseq's Doing and Cancelled and Tiimo's step timers) of COMPETITORS.md's round 5. Copy is plain
English in the Tasks, Agenda and Timeline UI (as those areas have it); NOVA's and ZIGi's answers are EN + NL.

All nine rows are **built**. One part is Carried, as the ledger says: #353's travel minutes worked out from a route (needs
an outside service, a maps service); they are typed by the person.

## For the lead (summary of requests)

- **TIER 3 (stored formats)** — commit `3e8dd40a`, all additive and optional on loose records, each dropped on read when it
  cannot be read; **no new key**. Listed under "Stored changes".
- **TIER 3 (PWA)** — commit `5d931132`: the "Leave by 8:40" wake (LEDGER #353) in lib/notify/sync.ts (input),
  lib/notify/plan.ts (the item) and public/sw.js (its words).
- **engine.ts wiring** (see "NOVA and ZIGi").
- **Help + What's new** text below (help-page.tsx is yours).
- **CSS** (no theme-sheet source touched; please regenerate the sheets as usual): new components/tasks/tasks-r5.css (theme
  variables only), components/tasks/task-row-r3.css (three row rules), components/agenda/agenda-hour-grid.css (block,
  travel and second-zone rules).
- **Shards**: please add `tests/av2-planned-day.spec.ts` to the CI shard lists (not run by me: written against the markup).
- **Device keys / catalogue / export / erase / restore**: nothing new. The ledger asked for new device records for the time
  blocks (#348) and the travel of imported events (#353); both went instead into the loose `zigoals:task-plan:v1` (`blocks`,
  `eventTravel`), which is already exported, erased and restored — so no registry change is needed and no new key exists.
  The second zone (#357) is in `zigoals:ui-prefs:v1` (exported and erased, never restored, as before).
- **Showcase hook (not made, so no pinned count can move)**: if wanted, in lib/tasks/showcase.ts one task with `place`
  ("Example · Fictional Street 1") and one with `plan: {kind: 'week', of: <this Monday>}`; a time block would go in the
  Showcase planning record (`blocks`). Each would add rows to Upcoming, the Agenda's hour grid and Today's timeline card, so
  please check the pinned counts and expected.json before adding them.
- **Today (dashboard)**: nothing new is drawn on Today by default and no Tab stop is added. Today's timeline card (it reads
  the tasks source) shows a time block and a "Travel to …" span only when the person has made a block or typed travel
  minutes; the Showcase has neither. A task's row shows its place (a link to open when the place is a web address: one Tab
  stop, only on such a task), "Doing", and "20 min travel before".
- **Weight**: the Tasks first chunk gains only the stored fields (schema.ts), the Doing first sort and the patch keys
  (engine.ts), the row's marks (task-parts.tsx), four search words (search.ts) and four lazy mounts (tasks-page.tsx: plan
  buckets, the earlier-finish editor, and the Doing group). Everything else is its own chunk: task-r5-actions.tsx,
  task-r5-fields.tsx, play-steps.tsx, plan-buckets.tsx, occurrence-edit.tsx, time-blocks.tsx, time-blocks-settings.tsx,
  second-zone-line.tsx (Timeline), hour-grid-r5.tsx (inside the lazy hour grid). The Agenda first chunk is unchanged (the
  export and the hour grid are lazy); the Timeline route gains one lazy mount. I could not build, so I could not measure;
  please run the weight check.

## Commits

- `3e8dd40a` TIER 3 (stored formats): the task, planning-record and UI-prefs fields.
- `399487ff` Session AV lane 2 (planning): Akiflow's planned day — LEDGER #348–#354, #356, #357.
- `5d931132` TIER 3 (PWA): the "Leave by" wake (LEDGER #353).

## Stored changes (TIER 3 (stored formats), commit `3e8dd40a`)

- `zigoals:tasks:v1`, each task (loose), all optional: `state` `{kind: 'doing' | 'cancelled', at}` (LEDGER #350; a cancelled
  task also gets `doneAt`, so an older build shows it finished, never open); `plan` `{kind: 'week' | 'month', of: day}` (LEDGER
  #349; a month's `of` is its 1st; ignored once the task has a day); `block` (LEDGER #348, a block id); `travel` 1–600
  minutes (LEDGER #353); `place` ≤ 200 characters (LEDGER #354).
- `zigoals:task-plan:v1` (loose), optional: `blocks` — up to 30 `{id, name ≤ 60, colour (blue, teal, green, violet, yellow,
  grey), from, to, days?: 0–6[] | on?: day}` (a block that cannot be read is dropped, never the others); `eventTravel` —
  up to 200 `{<event id, the 16-hex hash lib/ics/calendar.ts keeps, never the UID>: 1–600}`.
- `zigoals:ui-prefs:v1` (loose), optional: `secondZone` (an IANA zone name, ≤ 64).
Test: `apps/web/lib/tasks/r5-plan-stored.test.ts` (export → erase → restore for tasks and the planning record, read back
exactly; export → erase for the UI prefs; tolerant reads; an older reader sees a cancelled task as finished). Frozen
readers: no strict object changed (`zigoals:task-when:v1` is untouched, as the owner note on #349 asks); please run
`scripts/frozen-readers.mjs`.

## NOVA and ZIGi (EN + NL), all rows

`apps/web/lib/ai/local-answers/av2-r5-plan.ts` exports `av2R5PlanAnswer(question, env, extra?)`. Cases:
`apps/web/lib/ai/evals/as/cases-av2-r5-plan.ts` (`AV2_R5_PLAN`, 10 intents, 40 questions). Test:
`apps/web/lib/ai/local-answers/av2-r5-plan.test.ts`. Wiring line for engine.ts (before `av2R4PlanAnswer`):
`if (!subject) { const own = av2R5PlanAnswer(question, env, {plan: env.nova?.taskPlan, zone: env.nova?.secondZone ?? null}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
(`secondZone` is not in the NOVA sources yet: without it the zone question says how to choose one; with the UI prefs'
`secondZone` passed it says the time there.) An answer never changes a task.

## Feature — Akiflow's planned day (LEDGER #348–#354, #356, #357) — built

Read first: docs/STATUS.md "Current accepted baseline". The Day Timeline and the Agenda's hour grid gain rows inside their
existing layout (a block and a travel span are items like the others; the zone clock sits under each hour's clock); Tasks →
This week gains one fold under Working hours; Tasks → Today gains the day's blocks inside the planner, and a "Doing" group
above My Day. No protected area is touched.

### #348 Time blocks — built
- Tasks → This week → "Time blocks": name, colour (calm colours only), From, Until, "On these weekdays" or "Once, on one day";
  Change and Remove (Undo). Kept at once and said. Empty state teaches what a block is for.
- A task goes into a block from its editor ("Time block", the blocks of its day), from Tasks → Today ("Drop a task in…"), or
  by dragging it onto the block on the Agenda's hour grid (Undo). Its time is cleared when outside the block.
- Plan my day ("Fit my day") places each block's tasks inside the block ("· in “Deep work”"), and every other task outside
  all blocks. Plan my week leaves block tasks to Plan my day (lib/tasks/plan-week.ts `weekCandidates`).
- "2 of 4 done" on Tasks → Today, the hour grid and the Day Timeline (cancelled tasks leave the count). "Move what is left"
  sends the open tasks to the next block of the same name (later that day first, else up to 60 days ahead), times cleared,
  with Undo; with none ahead it says so.
- Drawn on the Day Timeline (a span with its count) and the Agenda's hour grid (a tinted row; the name and words carry it).

### #349 A week or a month without a day — built
- A task with no day: "Plan for" in its editor (This week, Next week, This month, Next month, any day), or in Tasks → This
  week → "Plan into the week" ("This week, any day" … beside the days). Its row says "This week, any day".
- Tasks → Upcoming, at the top: under "This week", "Next week", "Week of …", "This month", "Next month" or the month, until
  done or given a day (a day wins; the next save drops `plan`).
- Once its week or month has passed it is read under the current one at once, and the move is written once when Upcoming
  opens, said in one line ("Moved on to this week: “Gutters”.") — never "missed".
- Search: `plan:week`, `plan:month`. The strict `zigoals:task-when:v1` is not touched (owner note).

### #350 Doing and Cancelled — built
- "Doing now" at the top of a task's editor (one tap; "Not doing it now" ends it); the row says "Doing"; a "Doing" group comes
  first in Tasks → Today, also for a task with no day; the start day is kept ("Doing since Mon, Nov 23"). Finishing ends it.
- "Cancel the task" (one-off tasks; a repeat says to skip instead): closed with `doneAt` and cancelled, its open subtasks
  too, with Undo; Completed lists it as "Cancelled …"; never in the done chart, the daily goal or its streak, the weekly
  review's finishes, or a block's count; the Activity log says "Cancelled". Ticked open again it is a normal open task.
- Search: `doing`, `cancelled`.

### #351 Playing a task's steps — built
- "Play the steps (N)" in the editor of a task with subtasks: the current step with its countdown from its minutes (a count
  up when it has none; "+0:30" past them), Pause / Go on, Next (ticks it and adds the minutes run to its time spent, Undo),
  the done and coming steps listed, and at the end "Mark “…” done". Plain text once a second (role="timer", not read out);
  the step change is said. Nothing new stored; nothing runs when closed.

### #352 Earlier finishes of a repeating task — built
- Tasks → Completed: each earlier finish of a repeating task has "Change": "It was not done" (takes the tick back) or "It
  was done on …" (a day up to today). The task's next day and repeat stay as they are; one Undo puts the task and the
  finishes-per-day log (`doneLog`, which had counted past days) back. Focus goes to the list's count line, never the page.

### #353 Travel time before an event — built; the route part Carried (needs an outside service)
- A timed task's editor: "Travel before (minutes)" (with suggestions 5–120); it says "Leave by 1:40 PM". The row says "20 min
  travel before". An imported event on the hour grid: "Travel…" (the minutes before it).
- Busy for Plan my day, Plan my week and the deadline-at-risk line (lib/tasks/layouts.ts `taskBusy`; events through
  `eventBusy`). Drawn as "Travel to “…”" on the Day Timeline and "Leave by 1:40 PM" on the hour grid.
- A "Leave by 1:40 PM" notification (TIER 3 (PWA)): under the Tasks switch and quiet hours (refused and said on the card as a
  task reminder is), the time always said, the title only with names on; no Done (its id is `leave:…`, never a `task:` id, so
  a Done on a mixed notification cannot finish the task).
- Carried: working the minutes out from a route needs a maps service (an outside service); nothing is looked up.

### #354 A place on a task — built
- "Place" in the editor (an address or a link, as typed; nothing is looked up). The row shows it; a web address opens in a new
  tab (rel noopener). The Agenda's .ics export writes it as LOCATION (escaped); its summary line says so.

### #356 A link to a task — built
- "Copy link" in the task's editor: the app's own `/app/tasks?task=<id>` link to the clipboard, said; where the clipboard is
  not allowed, the link is shown selected in a read-only field to copy by hand.

### #357 A second time zone — built
- Chosen once on the Agenda's hour grid ("Show a second time zone": the browser's own zone list); the zone's clock under each
  hour's clock (with "+1" / "−1" for another day). The Day Timeline says, under the day picker, the time there now and each
  part of the day in its hours. Deviation from the ledger's file list: the choice lives on the hour grid (where it is used),
  not in Settings, so the Settings route gains nothing.

Files: lib/tasks/{schema.ts, plan-record.ts (stored commit), engine.ts (Doing first, patch keys, a finish ends Doing, a
reopen clears the state, completedLog's `cancelled`), task-state.ts, occurrences.ts, plan-bucket.ts, time-blocks.ts,
time-blocks-read.ts, play-steps.ts, r5-fields.ts, leave-by.ts, layouts.ts (travel in `taskBusy`), plan-week.ts, review.ts,
activity.ts, search.ts, timeline-source.ts}, lib/timeline/{sources.ts, build.ts} (a source item's `minutes`), lib/agenda/
second-zone.ts, lib/ics/ics.ts (LOCATION), components/tasks/{task-r5-actions.tsx, task-r5-fields.tsx, play-steps.tsx,
plan-buckets.tsx, occurrence-edit.tsx, time-blocks.tsx, time-blocks-settings.tsx, tasks-r5.css, task-editor.tsx,
task-parts.tsx, task-row-r3.css, tasks-page.tsx, tasks-plan-views.tsx, today-planner.tsx, plan-week.tsx},
components/agenda/{hour-grid-r5.tsx, agenda-hour-grid.tsx, agenda-hour-grid.css, agenda-export.tsx},
components/timeline/{second-zone-line.tsx, day-timeline.tsx}; TIER 3 (PWA): lib/notify/{sync.ts, plan.ts}, public/sw.js.
Tests: lib/tasks/r5-plan.test.ts, lib/tasks/r5-plan-stored.test.ts, lib/notify/r5-leave-by-notify.test.ts,
lib/ai/local-answers/av2-r5-plan.test.ts. Spec: tests/av2-planned-day.spec.ts (not run by me).

Help (EN):
- Q "What is a time block?" A "Time kept for one kind of work, such as “Deep work, 9:00–11:00” on weekdays. Make one in Tasks →
  This week → Time blocks, then drop tasks into it from their editor, from Tasks → Today, or by dragging them onto it in the
  Agenda's hour grid. Plan my day places them inside the block, the block says how many are done, and “Move what is left”
  sends the rest to the next block with the same name, with Undo."
- Q "Can I plan a task for this week without choosing a day?" A "Yes. In its editor (or Tasks → This week → Plan into the
  week) choose This week or This month, any day. It shows in Upcoming under its week or month until it is done or gets a day.
  If the week passes, it moves to the current week's list once."
- Q "What do Doing and Cancel do?" A "“Doing now” in a task's editor puts it first in Tasks → Today and keeps the day you began.
  “Cancel the task” closes it without counting it as done: it is in Completed as cancelled and stays out of your done chart,
  your daily goal and its streak. Tick it again to open it."
- Q "Can I time the steps of a task?" A "Yes. Open a task that has subtasks and choose “Play the steps”. The current step counts
  down from its own minutes; Next ticks it and adds the time to it."
- Q "I ticked a repeating task on the wrong day. Can I fix it?" A "Yes. In Tasks → Completed, choose Change on that finish:
  take the tick back, or move it to the day you really did it. The task's next day stays as it is."
- Q "How does travel time work?" A "Give a task a day and a time, then type its travel minutes in its editor (or “Travel…” on a
  calendar event in the Agenda's hour grid). That time stays free before it, Plan my day counts it, and with task reminders on
  you get “Leave by …”. You type the minutes: no route is looked up."
- Q "Can a task have a place or a link?" A "Yes: “Place” in its editor takes an address or a link as you type it. It shows on
  the task and goes into a calendar export as the location. Nothing is looked up."
- Q "How do I link to a task from a note?" A "Open the task's editor and choose “Copy link”, then paste it into the note or the
  journal. It opens that task."
- Q "Can I see a second time zone?" A "Yes. In the Agenda's day, open By the hour and choose “Show a second time zone”. Its
  hours show beside yours there and on the Day Timeline."
What's new: "Tasks: time blocks you drop tasks into, a week or a month without a day, Doing and Cancelled, timers on a task's
steps, earlier finishes you can fix, travel time with “Leave by”, a place and a link on a task, and a second time zone."

## Left (allowed causes only)

- #353, the route part: needs an outside service (a maps service to work out travel from a route). The minutes are typed.
