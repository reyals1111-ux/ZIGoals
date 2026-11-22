# Lane 2 registry: Tasks round 2 (`tasks-r2`, branch `lane2/tasks-r2`)

Builder's own file (team brief). Branched from `lane2/batch2`. Rows: LEDGER "Round 2: rows #223–#255", groups R1 (#223,
#224) and R9 (#225–#229). Built beside `lane2/revb1` (its Table / Calendar / Timeline interactivity, note reminders' dates and
timers on Done are not touched here). Copy is plain English in the Tasks UI (as the area has it); the answers are EN + NL.

## NOVA and ZIGi (EN + NL), all features

`apps/web/lib/ai/local-answers/av2-tasks-r2.ts` exports `av2TasksR2Answer(question, env, extra?)`. Cases:
`apps/web/lib/ai/evals/as/cases-av2-tasks-r2.ts` (`AV2_TASKS_R2`). Test: `apps/web/lib/ai/local-answers/av2-tasks-r2.test.ts`.
Wiring line for engine.ts (beside `av2TasksAnswer`, before it):
`if (!subject) { const own = av2TasksR2Answer(question, env, {plan: env.nova?.taskPlan}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`

## Feature 1 — My Day (LEDGER #223, Microsoft To Do) — built

- Plan my day (Tasks → Today) gains "My Day" beside "Plan for today" on each suggestion: the task is picked for today and
  its own day and deadline stay (Plan for today still moves the day; tests/av-plan-day.spec.ts unchanged). Undo in the toast.
- The task editor has "Add to My Day" / "Take out of My Day" (at once, with Undo), for any open task.
- Tasks → Today lists today's picks first, as a "My Day" group ("picked for today; each keeps its own day"); the rest follow
  in their usual groups.
- Overnight the picks clear by themselves (they hold their day). The last day's picks still open come back in Plan my day
  as "From yesterday" (or "From Fri, Nov 20" after a gap), each with "Add to My Day" and "Not now", and "Add all".
- The fold's summary adds "· N from yesterday" and "· N in My Day" only when there are some.

Files: lib/tasks/my-day.ts (pure, a tolerant reader the page's first chunk uses), lib/tasks/plan-record.ts (schema field),
components/tasks/{my-day-parts.tsx (lazy: editor button, the pick hook), plan-day.tsx, task-editor.tsx, tasks-page.tsx, tasks-r2.css}.
Tests: lib/tasks/r2-my-day.test.ts (picks, overnight, carry, tolerant read, export → erase → restore). Spec: tests/av2-my-day.spec.ts.
Stored (TIER 3, own commit): `zigoals:task-plan:v1` gains optional `myDay` `{day, ids ≤ 100, before?: {day, ids}}`; a value
this build cannot read is dropped on read; older builds keep it untouched (loose record) and show nothing. No new key.
Answers: "what is in my day" / "wat staat er in mijn dag" (today's picks with their own day; the open ones from the last day).
Help: Q "What is My Day?" A "A short list for today only. Add a task to My Day from its editor or from Plan my day in Tasks →
Today; it shows at the top of Today and keeps its own day. Each morning My Day starts empty, and the ones you did not finish are
offered back under “From yesterday”."
What's new: "Tasks: My Day — pick tasks for today without moving their day."
Showcase: none (pinned counts); a hook would be one `myDay` pick in the Showcase planning record, if the lead wants it.
Today: nothing new on Today (the dashboard); Tasks → Today gains the group only when something is picked.
Weight: the Tasks first chunk gains the tolerant reader (my-day.ts, no planning schema) and the group; the pick code is lazy.
CSS: components/tasks/tasks-r2.css (new; theme variables only).

## Feature 2 — a note's reminders in Tasks and on the Agenda (LEDGER #224, Google Tasks / Keep) — built

- Tasks → Today: "From your notes" lists today's reminders written in notes ("@remind 18:30 …"), each with its time, what it
  is about, "gone off" once past, and "Open the note “…”". Tasks → Upcoming: the next 14 days, by day.
- The Agenda (day and week): "Reminders in your notes" for the days shown, each opening its note.
- They stay note lines: nothing is copied into the task list or stored; edit or delete the line to change one. Nothing shows
  when no note holds one (the Notes page's "Reminders in your notes" teaches the words).
- Reads `remindersInNote` (lib/notes/reminders.ts) only, so revb1's day-anchoring of relative words applies here unchanged.

Files: lib/tasks/note-reminder-days.ts (pure), components/tasks/note-reminders-in-tasks.tsx (lazy; both the Tasks and the
Agenda part), components/tasks/tasks-page.tsx (one lazy mount), components/agenda/agenda-page.tsx (one lazy mount), tasks-r2.css.
Tests: lib/tasks/r2-note-reminders.test.ts. Spec: tests/av2-note-reminders-tasks.spec.ts.
Stored: nothing (derived from the notes record).
Answers: "which reminders from my notes are today" / "welke herinneringen uit mijn notities zijn er vandaag" (also tomorrow,
this week), under NOVA's Notes scope.
Help: Q "Do reminders in my notes show with my tasks?" A "Yes. A line like “@remind tomorrow 9:00 call the plumber” in any
note shows in Tasks → Today on its day, in Upcoming and on the Agenda, with a link back to the note. It stays in the note:
change the line there to change the reminder."
What's new: "Tasks and the Agenda: reminders written in your notes show on their day."
Showcase: none (no Showcase note holds a reminder; adding one would change the Notes counts other tests pin).
Today: nothing new on Today. Weight: Tasks and Agenda first chunks gain one lazy mount each.
