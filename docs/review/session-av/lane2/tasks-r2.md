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

## Feature 3 — print a list (LEDGER #225, Google Tasks) — built

- "Print this list" under every list view's tasks (Inbox, Today, Upcoming, All open, a project, a label, a priority, a filter;
  below the list, so the first task starts where it did — A10-11). It puts a print sheet on the page and opens the
  browser's print (Save as PDF works there): the view's title, the count and day printed, a project's sections or
  Upcoming's days as headings, a tick box per task (☐, ☑ when done), its day and time, priority, deadline, minutes and labels,
  and open subtasks indented (three levels). The sheet is hidden on screen and taken away after printing (`afterprint`, or a
  minute); focus stays on the button. Print CSS on the page, as the bills print does; nothing is sent anywhere.

Files: lib/tasks/print-list.ts (pure), components/tasks/{tasks-print.tsx, tasks-print.css} (lazy chunk), tasks-page.tsx (the
button and one lazy mount), tasks.css (two lines for the button).
Tests: lib/tasks/r2-print.test.ts. Spec: tests/av2-task-print.spec.ts (the browser's print stubbed to read the sheet).
Stored: nothing.
Answers: "how do I print my tasks" / "hoe print ik mijn taken".
Help: Q "Can I print my tasks?" A "Yes. Open the list (a project, Today, Upcoming or any view) and press “Print this list”
under it. The sheet has tick boxes, days, priorities and subtasks; choose Save as PDF in the print window to keep a file."
What's new: "Tasks: print any list, with tick boxes and subtasks."
Showcase: none needed (works on any list). Today: nothing. CSS: components/tasks/tasks-print.css (new), tasks.css (2 lines).

## Feature 4 — a larger template gallery, English and Dutch (LEDGER #226, Any.do) — built

- Sixteen written templates in four groups, each in English and Dutch: Home (Cleaning week, A party, A packing list, Spring
  clean), Work (Project kick-off, Weekly review, Meeting prep, A job application, Quarter planning), Family (School year
  start, A child's birthday, Family holiday, A week of meals), Personal (Tax return papers, A digital tidy-up, Settling into
  a new home). Each is a project with sections, subtasks, priorities, minutes and days counted from the start day (the
  party on day 21, the first school day on day 14 …), made by the existing `applyTemplate` (one change, one Undo).
- Tasks → Areas and templates: the Template choice groups them (Built in, Home, Work, Family, Personal, Yours); a "Template
  gallery" fold lists them by group with what each holds and "Use" (chooses it, focus to the project name), with English /
  Nederlands (the device's language first).
- Written text in the repository, nothing fetched (the ledger's note on #71 and #81).

Files: lib/tasks/template-gallery.ts (pure, the written gallery), components/tasks/tasks-organise.tsx (in the planning
views' lazy chunk), tasks-r2.css. Tests: lib/tasks/r2-template-gallery.test.ts (both languages make the same project; days
from the start day). Spec: tests/av2-template-gallery.spec.ts.
Stored: nothing new (a project made from a template is an ordinary project).
Answers: "which templates are there for home" / "welke sjablonen zijn er voor thuis" (also work, family, personal, the
gallery). "which task templates do I have" stays av2-tasks' answer.
Help: Q "Are there ready-made project templates?" A "Yes. Tasks → Areas and templates → Template gallery: sixteen for home,
work, family and you, in English or Dutch. Use one, give the project a name and a start day, and Make the project."
What's new: "Tasks: a template gallery for home, work and family, in English and Dutch."
Search (lead's static.ts): "Template gallery" → `/app/tasks?view=organise`.
Showcase / Today: nothing. Weight: the gallery is in the planning views' lazy chunk only.

## Feature 5 — Trello and Asana imports (LEDGER #227, Any.do) — built (ClickUp, Monday.com: left, see below)

- Tasks → Import / export now also reads a Trello board export (JSON: Board menu → Print, export and share → Export as
  JSON) and an Asana project export (CSV: project menu → Export/Print → CSV), on the device, nothing sent.
- Trello: the board is a project; open lists are sections in the board's order; cards are tasks (due as the day and time in
  this device's zone, labels by name or colour, the description as notes); checklist items are subtasks. Archived cards and
  lists, finished cards and items, and cards without a name are left out and counted.
- Asana: Projects (else the file's name) is the project, Section/Column the section ("(no section)" none), Due Date (else
  Start Date) the day, Tags labels, Notes notes, Priority High/Medium/Low → P1/P2/P4, Parent task the parent by name (a
  subtask listed before its parent still lands under it). Completed tasks are left out and counted.
- Assignees and members are never brought in (against a named rule: nothing is shared between people); the preview says
  how many people were left out. Preview first, then Add to Tasks as one change with the page's Undo (projects and
  sections included). The 500-task, 100-project and 300-section caps of applyImport apply as before.
- Basis (the habit importer's rule, lib/import/switch/formats.ts): Trello's export is its REST API's documented board, list,
  card and checklist objects; Asana's help documents the CSV columns. ClickUp and Monday.com stay off until their export
  layout is published (the ledger's own wording); the answer says so.

Files: lib/tasks/import-boards.ts (pure readers), lib/tasks/import.ts (source union, optional `archived`/`people` counts in
the plan — not stored — and the dispatch in readTaskFile), components/tasks/tasks-io.tsx (accepts .json, the preview words).
Tests: lib/tasks/r2-import-boards.test.ts. Spec: tests/av2-board-imports.spec.ts.
Stored: nothing new (imported tasks are ordinary tasks).
Answers: "can I import my tasks from Trello" / "kan ik mijn taken uit Trello importeren" (also Asana; ClickUp, Monday.com: not yet, why).
Help: Q "Can I bring my tasks over from Trello or Asana?" A "Yes. Export the Trello board as JSON, or the Asana project as
CSV, then Tasks → Import / export and choose the file. You see what comes in first; Undo takes it back. People the tasks
were assigned to are left out."
What's new: "Tasks: import from Trello and Asana."
Showcase / Today: nothing.
