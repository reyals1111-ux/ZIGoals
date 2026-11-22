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
Showcase: none (the Showcase plans no notification, by rule). Today: nothing new. Weight: Tasks first chunk gains a few
lines in plan-day.tsx (already a lazy chunk); the settings are in the This week chunk.
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
