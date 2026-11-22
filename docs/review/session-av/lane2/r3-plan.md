# Lane 2 registry: round 3, planning (`r3-plan`, branch `lane2/r3-plan`)

Builder's own file (team brief). Branched from `lane2/batch2`. Rows: LEDGER "Round 3: rows #256–#299", groups T1 (#256–#260)
and T10 (#261–#263), and the Structured rows of COMPETITORS.md's round 3. Copy is plain English in the Tasks, Timeline and
Agenda UI (as those areas have it); NOVA's and ZIGi's answers are EN + NL.

## For the lead (summary of requests)

- **TIER 3 (stored formats)** — one commit, `TIER 3 (stored formats): …`, all additive and optional, each dropped on read when
  it cannot be read; no new key. Listed under "Stored changes" below.
- **TIER 3 (PWA)** — LEDGER #256: a new notification type `planDay` (lib/notify/prefs.ts, on by default but silent until a time
  is set in Tasks), its plan items (lib/notify/plan.ts), its input (lib/notify/sync.ts), and the service worker's words
  (public/sw.js compose: "Plan your day · 3 tasks overdue"; the morning orbit gains "3 tasks overdue." when no plan-your-day
  time is set). No new wake kind on the push Worker: a recurring minute as every other daily type. The registration never
  carries a count or a name (the count is in the device's own snapshot only).
- **engine.ts wiring** (see "NOVA and ZIGi").
- **Help + What's new** text per feature below (help-page.tsx is yours).
- **Theme sheets / boot script**: LEDGER #263 changes `scripts/themes/build-themes.mjs` (`bootScript`'s font line gains
  `reading`); please run it to regenerate `public/theme-boot.js` and `lib/ui-prefs/theme-sheets.ts` (THEME_BOOT_SRC hash).
  CSS files touched are listed per feature.
- **Owner**: "a bundled font file waits for the owner" (LEDGER #263; see Feature 8).

## Stored changes (TIER 3 (stored formats), one commit)

All on loose records already in Export everything, the erase and (where they are) the restore; nothing new for the
catalogue, the device-key lists, the export or erase registries.
- `zigoals:tasks:v1`, each task: optional `look` `{glyph, colour}` (the habit-look symbols and named colours; LEDGER #257) and
  optional `energy` (`restful | neutral | light | medium | heavy`; LEDGER #259).
- `zigoals:task-plan:v1`: optional `planReminder` `{time: "HH:MM"}` (LEDGER #256), optional `energyAmount` 1–100 (LEDGER
  #259, 20 when absent), and on each running timer an optional `note` ≤ 1,000 characters (LEDGER #260).
- `zigoals:focus-sessions:v1`, each session: optional `note` ≤ 2,000 characters (LEDGER #260), kept on a run's latest block.
- `zigoals:day-timeline:v1` `times`: new dated keys `<YYYY-MM-DD>/habit:<id>` and `<YYYY-MM-DD>/meal:<slot>` (LEDGER #258).
  Older builds read only `TIME_KEY`'s keys, so they keep these untouched and never show them; a past day's dated key is
  dropped at the next move (MAX_TIMES stays 300). This record is exported and erased, never restored (as before).
- `zigoals:cycle:v1`: optional `plan: true` (LEDGER #262), the opt-in to show the cycle day on the day plan.
- `zigoals:ui-prefs:v1` `look.font`: a new value `reading` (LEDGER #263). Older builds' enum drops it on read (System) and
  keep the group. Exported and erased, never restored (display choices, as before).
Test: `apps/web/lib/tasks/r3-plan-stored.test.ts` (export → erase → restore for the restored records, export → erase for the
two that are never restored; tolerant reads; dated keys are not older builds' keys).
Frozen readers: none of these changes a strict object; `scripts/frozen-readers.mjs` fixtures need nothing, but please run it.

## NOVA and ZIGi (EN + NL), all features

`apps/web/lib/ai/local-answers/av2-r3-plan.ts` exports `av2R3PlanAnswer(question, env, extra?)`. Cases:
`apps/web/lib/ai/evals/as/cases-av2-r3-plan.ts` (`AV2_R3_PLAN`). Test: `apps/web/lib/ai/local-answers/av2-r3-plan.test.ts`.
Wiring line for engine.ts (beside `av2TasksR2Answer`, before it):
`if (!subject) { const own = av2R3PlanAnswer(question, env, {plan: env.nova?.taskPlan}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`

## Feature 1 — Plan your day and the overdue line (LEDGER #256, Structured) — built

- Tasks → This week → Your planning choices: "Plan your day reminder" (None, or a time). Kept in the planning record.
- With notifications on, a "Plan your day" notification at that time every day: "Plan your day · 3 tasks overdue" (a count,
  never a name); a tap opens Tasks → Today with Plan my day open and focused (`?plan=1`, then forgotten by the address).
  No Done or Snooze on it. Inside quiet hours it is refused and said on the card, as every daily type.
- The overdue count is one quiet line, never a notification per task: on Plan your day, or, with no plan-your-day time, on
  the morning orbit ("Good morning. Today: 1 of 4 done. 3 tasks overdue."). Its own switch in Settings (Notifications).
Files: lib/notify/{plan.ts, prefs.ts, sync.ts}, public/sw.js, lib/tasks/plan-record.ts, components/tasks/{task-plan-settings.tsx,
plan-day.tsx}.
Tests: lib/notify/r3-plan-day-notify.test.ts (plan items, quiet hours, the 48 h window, the worker's words and URL).
Spec: tests/av2-plan-your-day.spec.ts.
Stored: `planReminder` (above). PWA: TIER 3 (above).
Answers: "do I get a plan your day reminder" / "wanneer krijg ik een herinnering om mijn dag te plannen".
Help: Q "Can ZIGoals remind me to plan my day?" A "Yes. In Tasks → This week, choose a time under “Plan your day reminder”.
With notifications on, a notification comes at that time each day, says how many tasks are overdue (never their names) and
opens Plan my day. Without it, the morning notification says the overdue count instead."
What's new: "Tasks: a “Plan your day” notification that opens Plan my day, with the overdue count."
Showcase: none (the Showcase plans no notification, by rule). Today: nothing new. Weight: nothing in the Tasks first chunk;
the ?plan=1 opening is in plan-day.tsx (a lazy chunk) and the setting in the This week chunk.
CSS: none.

## Feature 2 — Task symbols and colours (LEDGER #257, Structured) — built

- The task editor (every list, Today's card, the Agenda, a goal's next actions) gains "Symbol and colour — optional": the
  sixteen habit-look symbols and nine named colours (each theme draws them; the colour named in words), "No symbol", and a
  suggestion from the title's words — "Use the suggestion for “dentist”" — from a written list of 190+ English and Dutch
  words (lib/tasks/look-words.ts; no model). The suggestion is offered, never set by itself.
- The symbol shows in its colour before the title in every task row (lists, Today's card, the Agenda, NOVA's task widget)
  and on the Day Timeline (the symbol before the title, the colour as the block's edge). Decoration only: hidden from a
  screen reader; the title says what the task is.
Files: lib/tasks/{look.ts (constants and the reader, first chunk), look-words.ts (editor chunk), schema.ts, engine.ts
(TaskPatch), timeline-source.ts}, lib/timeline/{sources.ts, build.ts} (an optional `glyph`), components/tasks/{task-look-field.tsx,
task-editor.tsx, task-parts.tsx, tasks-r3.css}, components/timeline/timeline-block.tsx.
Tests: lib/tasks/r3-look.test.ts. Spec: tests/av2-task-look.spec.ts.
Stored: `look` on the task (TIER 3 commit).
Answers: "which tasks have a symbol" / "welke taken hebben een symbool".
Help: Q "Can a task have a symbol or a colour?" A "Yes. Edit the task and choose a symbol and a colour under “Symbol and
colour”. ZIGoals suggests one from the task's words (a dentist gets ✚, the rent gets ◆), in English and Dutch; you choose.
It shows beside the title in your lists, on Today and on the timeline."
What's new: "Tasks: a symbol and colour per task, suggested from its words."
Showcase: none (pinned counts); a hook would be one `look` on a Showcase task, if the lead wants it.
Today: the mark shows in Today's task card beside a title only when a task has one; no new Tab stop.
Weight: Tasks first chunk gains the reader and the mark (~0.3 kB); the picker and word list are in the editor's chunk.
CSS: components/tasks/tasks-r3.css (new; theme variables only); task-parts.tsx now loads components/habits/habit-look.css.

## Feature 3 — The Day Timeline for any day (LEDGER #258, Structured) — built

Read first: docs/STATUS.md "Current accepted baseline" (PR #22's list; the Day Timeline is not in it). The timeline's layout is
unchanged; it gains a day picker above it.
- /app/timeline: "Day to show" — Today, Tomorrow, or Another day (a date field). The day stays in the address (`?day=`) for
  Back and a reload; Today removes it. The eyebrow says "Tomorrow · Tue, Nov 24" (or the day).
- Another day shows: the habits due that day (by its own schedule), its tasks with their minutes (the tasks source already
  read any date), the meals planned for it, bedtime (today and later), the reminders of that weekday, the Checklist's dots,
  and planned workouts (a new timeline source reading the Agenda's own planned workouts — the workout log keeps only finished
  ones, so these are the Showcase's labelled examples until a feature keeps them).
- On another day nothing is ticked or logged (each block opens its page), nothing under way is drawn (a night, a fast, a
  meditation, a habit timer), there is no "Now" line and no Replan, and the quiet state says "Nothing is planned for this
  day yet".
- Moving a habit or a meal on another day keeps that time for that date only ("moved to 9:30 AM on Tue, Nov 24 only"),
  with Undo; on today a move stays the everyday one, as before, unless today already has a move made ahead of time. A dated
  move of a past day leaves at the next move.
Files: lib/timeline/{build.ts (`today`, dated moves, `everydayMove`), store.ts (dated keys, in the TIER 3 commit),
workout-source.ts}, components/timeline/{day-timeline.tsx, use-day-timeline.ts, timeline-day-picker.tsx, timeline-block.tsx,
planned-workouts-source.tsx, timeline.css}, app/app/timeline/page.tsx (one more source registration).
Tests: lib/timeline/r3-any-day.test.ts. Spec: tests/av2-timeline-any-day.spec.ts.
Stored: dated keys on `zigoals:day-timeline:v1` (TIER 3 commit).
Answers: "what is on my timeline tomorrow" / "wat staat er morgen op mijn tijdlijn".
Help: Q "Can I plan tomorrow on the timeline?" A "Yes. Open the Day Timeline and choose Tomorrow, or any day with “Another
day”. It shows that day's habits, tasks, planned meals and workouts. Move a habit or a meal there and it keeps that time for
that day only; ticking off happens on the day itself."
What's new: "Day Timeline: plan tomorrow or any day ahead."
Showcase: the Showcase's planned workouts show on their days (no new record, no count moved).
Today: Today's timeline card is unchanged (today only). Weight: /app/timeline gains the picker (~0.4 kB) and one source
registration; the source's code is its own chunk.
CSS: components/timeline/timeline.css (three lines).

## Feature 4 — Energy per task and the day's total (LEDGER #259, Structured's Energy Monitor) — built

- The task editor: "Energy — optional" (Restful, Neutral, Light, Medium, Heavy, with a plain hint for each). A row shows
  "Energy · Heavy" (nothing for Neutral).
- Tasks → This week → "Energy a day holds" (8–40; 20, the usual, is not stored).
- Tasks → Today (the day planner): "Energy today: about 12 of your 20 — room for more." / "near your amount" / "more than
  your amount: a restful task, or moving one to another day, gives some room." Points per half hour: light 1, medium 2,
  heavy 3, restful −1 (gives some back); a task without minutes counts half an hour; background tasks and subtasks are left
  out; never below zero. Never red, never an alert (a plain line), and it says how many tasks have no energy yet.
- A heavy task with a time outside today's focus window (Health → Sleep's estimate, only where Health is shown) gets a quiet
  line: "… at 4:00 PM is heavy and outside today's focus window (9:15 AM–11:15 AM); it may sit better inside it."
Files: lib/tasks/{energy-load.ts, schema.ts (TASK_ENERGY), plan-record.ts}, components/tasks/{task-energy-line.tsx (own chunk),
today-planner.tsx, task-editor.tsx, task-parts.tsx, task-plan-settings.tsx, tasks-r3.css}.
Tests: lib/tasks/r3-energy.test.ts. Spec: tests/av2-task-energy.spec.ts.
Stored: `energy` on the task, `energyAmount` on the planning record (TIER 3 commit).
Answers: "how much energy does my day take" / "hoeveel energie kost mijn dag".
Help: Q "What is a task's energy?" A "How much a task asks of you: restful, neutral, light, medium or heavy, chosen in its
editor. Tasks → Today adds up the day against the amount you set in Tasks → This week (20 if you set none) and says whether
there is room for more. It is never a warning; a restful task gives a little back."
What's new: "Tasks: energy per task and a calm day total."
Showcase: none (pinned counts). Today (dashboard): nothing new. Weight: Tasks first chunk gains the row's chip (a few bytes);
the line and its sleep read are their own chunk inside Plan my day.

## Feature 5 — Notes during a focus session (LEDGER #260, Structured) — built

- The Pomodoro (Tasks' Focus, Journey's Focus Sessions, wherever the panel opens): while a run goes on, "Notes for this
  session". The note is kept with the run's latest saved block in `zigoals:focus-sessions:v1` (as blocks finish, when the
  box is left, and at the end; one note per run). The result shows it ("Your note is kept with this session"; a run that
  ended before a minute says it was not kept), and for a run started from a task offers "Add the note to “…”’s notes" — on
  the person's tap, under the task's notes with a blank line, with Undo.
- The task timer (a task's editor, "Start a timer"): "Note while timing", kept with the running timer on this device; after
  Stop, "Add the timer’s note to the notes" puts it in the editor's Notes field (Save keeps it).
Files: lib/focus-sessions/{notes.ts, pomodoro-run.ts, schema.ts}, lib/tasks/plan-record.ts (timer note helpers),
components/focus/{pomodoro-panel.tsx, focus.css}, components/tasks/{task-timer.tsx, task-editor.tsx, tasks-r3.css}.
Tests: lib/focus-sessions/r3-notes.test.ts. Spec: tests/av2-focus-notes.spec.ts.
Stored: `note` on a focus session; `note` on a running timer (TIER 3 commit).
Answers: "what did I note in my focus sessions" / "wat heb ik genoteerd in mijn focussessies".
Help: Q "Can I take notes during a focus session?" A "Yes. While a Pomodoro runs, write in “Notes for this session”. The note
is kept with the session; when the run ends you can add it to the task's own notes with one tap. A task's timer has a note
box too."
What's new: "Focus: notes during a session, added to the task when you like."
Showcase: none. Today: nothing. Weight: the panel and the timer are lazy chunks already.
CSS: components/focus/focus.css (five lines), components/tasks/tasks-r3.css.

## Feature 6 — Copy and clear a day (LEDGER #261, Structured) — built

- The Agenda's Day view (any day, with ← →), when the day has a task: "Copy or clear this day".
  - "Copy to" a date, then "Copy 2 tasks to Wed, Nov 25": each task of the day is made again there as a new task with its
    time, minutes, priority, project and section, labels, notes, symbol, energy and reminders before its time; subtasks
    come along under their copy; a finished task is copied open; a repeating one is copied once, without the repeat (said).
    Refused for the same day and past the 500 tasks a device keeps.
  - "Clear this day (2 open tasks)": the open tasks move to no day (their time and start-early go; a reminder at its own
    date and time stays); repeating tasks keep their day (a repeat needs one; said); nothing is deleted.
  - Each is one change with Undo in the Agenda's status line (and Ctrl/⌘+Z).
Files: lib/tasks/day-tools.ts, components/agenda/{agenda-day-tools.tsx (own chunk), agenda-page.tsx (one lazy mount)},
components/tasks/tasks-r3.css.
Tests: lib/tasks/r3-day-tools.test.ts. Spec: tests/av2-copy-clear-day.spec.ts.
Stored: nothing new (normal writes to `zigoals:tasks:v1`).
Answers: "how do I copy a day to another day" / "hoe kopieer ik een dag naar een andere dag"; "can I clear my whole day" /
"hoe maak ik mijn dag leeg".
Help: Q "Can I copy a day's tasks, or clear a day?" A "Yes. Open the Agenda, choose Day and go to the day. Under “Copy or
clear this day”, pick a day and press Copy to make its tasks again there with the same times, or press “Clear this day” to
move its open tasks to no day. Both have Undo; nothing is deleted."
What's new: "Agenda: copy a day's tasks to another day, or clear a day."
Showcase: works on the Showcase's tasks (nothing new stored). Today: nothing. Weight: /app/agenda gains one lazy mount.

## Feature 7 — The cycle day on the plan (LEDGER #262, Structured's Cycle Seasons) — built; part Carried

- Opt-in in the cycle log (Health → Diary → Cycle log): "Show my cycle day on the Day Timeline and the Agenda" (kept as
  `plan: true` in `zigoals:cycle:v1`). Shown only while the cycle log is on and Health is shown (the Health gate).
- The Day Timeline (any day, with Feature 3's picker): an "All day" line — "Day 3 of your cycle · period day (logged)." or
  "period may start (an estimate)" inside the estimated window (after three cycles), with the log's own line
  (`CYCLE_LINE`) and a link to the log. A day from the estimated start on gets no cycle day (it would be a guess).
- The Agenda (day and week views): "Your cycle on these days", one line per day with something to say, and the log's line.
- Part Carried — **against a named rule** (no medical advice): Structured's seasons by phase, and its advice on what to plan
  in each phase, are not built. Only days and the log's own words are shown.
Files: lib/cycle/{plan-days.ts, engine.ts (setCycleOnPlan), store.ts (cycleOnPlan)}, components/cycle/{cycle-on-plan.tsx (own
chunk), cycle-log.tsx, cycle.css}, components/timeline/day-timeline.tsx and components/agenda/agenda-page.tsx (one lazy mount each).
Tests: lib/cycle/r3-plan-days.test.ts. Spec: tests/av2-cycle-on-plan.spec.ts.
Stored: `plan` on the cycle record (TIER 3 commit).
Answers: "what day of my cycle is it tomorrow" / "welke dag van mijn cyclus is het morgen" (Health gate and the log's switch;
`never`: phase, advice).
Help: Q "Can my cycle day show on my plan?" A "Yes, if you want it. In the cycle log, tick “Show my cycle day on the Day
Timeline and the Agenda”. They then show the day of your cycle and logged or estimated period days. Nothing more: no
phases and no advice. Information for you, not a contraceptive or a diagnosis."
What's new: "Cycle log: your cycle day on the Day Timeline and the Agenda, if you choose."
Showcase: shows for the Showcase only if its cycle record opts in (it does not; no count moved). Today: nothing.
CSS: components/cycle/cycle.css (seven lines).

## Feature 8 — A reading-friendly font (LEDGER #263, Structured) — built without a font file; the bundled file waits for the owner

- Settings → Appearance → Customize → Font gains "Reading-friendly", next to System, Inter, Serif, Rounded and Monospace:
  a stack of fonts the device may already have — "Atkinson Hyperlegible", OpenDyslexic, Lexend, Verdana, Tahoma, DejaVu Sans,
  system-ui, sans-serif — with wider letter spacing (.02em), word spacing (.08em) and line height (1.6). No file is fetched.
- **A bundled font file waits for the owner**: LEDGER #263 asks for Atkinson Hyperlegible or OpenDyslexic self-hosted like
  Inter (public/fonts, SIL OFL). The owner has not approved a new font file, so none is added; with approval the
  `reading` rule in app/customize.css gains an @font-face, and av2-appearance.test.ts's font-face count moves from 2.
- Applied at once on choice and before the first paint of later pages by the boot script. **For the lead**: the boot script's
  source (scripts/themes/build-themes.mjs `bootScript`) gains `k.font==="reading"`, in its own commit; please run the
  generator to rewrite public/theme-boot.js and lib/ui-prefs/theme-sheets.ts (THEME_BOOT_SRC). Until then
  scripts/themes/build-themes.test.mjs ("theme-boot.js is the generated one") is red on this branch and a reload loses the font.
Files: lib/ui-prefs/{look.ts, schema.ts}, app/customize.css, components/settings/customize-settings.tsx,
scripts/themes/build-themes.mjs (source of the generated boot script).
Tests: lib/ui-prefs/av2-appearance.test.ts (labelled deliberate change: six choices, `reading` checked as strictly as the
others, its stack ends at sans-serif; font-face and url counts unchanged at 2). Spec: tests/av2-reading-font.spec.ts.
Stored: `reading` in `look.font` (TIER 3 commit).
Answers: "is there a dyslexia friendly font" / "is er een lettertype voor dyslexie".
Help: Q "Is there a font that is easier to read?" A "Yes. In Settings → Appearance → Customize, choose Font → Reading-friendly.
It uses Atkinson Hyperlegible or OpenDyslexic when your device has one (otherwise Verdana or Tahoma) and puts a little more
space between letters, words and lines. Large text can go with it."
What's new: "Appearance: a Reading-friendly font choice, with more space between letters and lines."
Showcase: none. Today: nothing. CSS: app/customize.css (not a theme-sheet source).

## Review fixes (batch 3 review A: B3A-5 to B3A-8)

- **B3A-5 (Major), fixed.** Adding a focus note to its task now goes through the tasks' own writer. `lib/tasks/device.ts`
  `writeTasks` is the existing `write`: it refuses an unreadable record and tells open views (ZIGI_STORE_EVENT), so the
  list and the editor refresh and a later unrelated Undo keeps the note. The note's own Undo puts back only the notes, and
  only while they are still what the note made them. Files: lib/tasks/device.ts, lib/focus-sessions/notes.ts
  (`addNoteToTask`), components/focus/pomodoro-panel.tsx. Test: lib/focus-sessions/r3-notes-device.test.ts.
- **B3A-6 (Minor), fixed.** The energy chip and its rule share one class, `.task-energy`, in a new
  components/tasks/task-row-r3.css that task-parts.tsx loads with every row (muted, theme variables). The unused
  `.task-energy-chip` rule is gone. Test: lib/tasks/r3-energy-chip.test.ts. CSS: components/tasks/task-row-r3.css (new).
- **B3A-7 (Minor), fixed.** Copy or clear this day is keyed by its day, so "Copy to" starts at the next day again whenever
  the Agenda moves. The buttons count what the change does: `copyPlan` counts subtasks the way `copyDay` copies them, and
  `clearPlan` leaves out repeating tasks (they are said beside the button). Past 100 tasks the cap is said before and after
  the copy ("…tasks were left out"). Files: lib/tasks/day-tools.ts, components/agenda/{agenda-day-tools.tsx, agenda-page.tsx}.
  Test: lib/tasks/r3-day-tools.test.ts.
- **B3A-8 (Minor), fixed.** The Dutch reading-font answer says "Atkinson Hyperlegible of OpenDyslexic … (anders Verdana of
  Tahoma)": one font, as in English. The test guard for English words in Dutch answers no longer lists "of", which is a Dutch
  word too. It checks "the, your, and, with" instead (labelled deliberate). File: lib/ai/local-answers/av2-r3-plan.ts; test
  lib/ai/local-answers/av2-r3-plan.test.ts.
