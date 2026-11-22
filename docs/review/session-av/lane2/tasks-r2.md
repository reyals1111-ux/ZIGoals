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

## Feature 6 — project rules (automations) (LEDGER #228, Any.do) — built; assigning people: Carried, against a named rule

- A project's tools gain "Rules and fields" (a lazy panel under the view's head). Rules in plain words: When "a task is added
  to this project" / "a task enters a section" (choose it) / "a task here is done", Then "set its priority" / "add a label" /
  "plan it for today" / "mark it done" / "move it to a section" / "create the next one" (its own title or the same, due N
  days later). Up to 10 a project; Remove each. Nonsense pairs are refused in words ("A finished task is already done:
  choose another step.", "Choose the section the rule watches.").
- They run on this device inside the change that sets them off — the Tasks page, Today's card, the Agenda, a goal's next
  actions, ZIGi's widget all go through use-task-list — so one write and one Undo hold both, and the toast says what they
  did ("A rule in “Garden” marked “Prune the roses” done."). One pass: what a rule changes does not set off other rules (no
  loops). A rule whose section was removed is skipped. A repeating task finished sets off "done" rules each time; "mark it
  done" never ends a repeat. Archived projects' rules rest.
- Left: rules that assign people — Carried, against a named rule: nothing in ZIGoals is shared between people (the panel
  says so).

Files: lib/tasks/rules.ts (pure runner, words, setProjectRule; no schema beyond the task list's), lib/tasks/schema.ts
(ruleSchema on the project), components/tasks/{project-setup.tsx (lazy), use-task-list.ts (the three write paths run the
rules; a dry run on the current record words the toast, only when a project has rules), tasks-page.tsx (the button and one
lazy mount), tasks-r2.css}.
Tests: lib/tasks/r2-rules.test.ts (each trigger and action, one pass, refusals, the cap, the one Undo, export → erase →
restore, a rule that cannot be read is dropped). Spec: tests/av2-project-rules.spec.ts.
Stored (TIER 3, own commit 5cbe2d69): `zigoals:tasks:v1` project gains optional `rules` ([{id, when: added|section|done,
section?, then: level|label|today|done|move|next, level?, label?, to?, title?, days?}] ≤ 10); each field `.catch(undefined)`,
a rule that cannot be read is dropped (never the project); older builds keep it untouched (loose) and run nothing.
Answers: "which rules do my projects have" / "welke regels hebben mijn projecten" (also "automations" / "automatiseringen").
Help: Q "Can Tasks do routine steps for me?" A "Yes. Open a project, then Rules and fields. Add a rule such as “When a task
enters Done, mark it done” or “When a task is done, create the next one a week later”. Rules run on this device as you
change tasks, and Undo takes back the change and what the rule did."
What's new: "Tasks: rules on a project — when a task is added, moved or done, Tasks does the next step."
Showcase / Today: nothing new on Today. Weight: the Tasks first chunk gains rules.ts (no zod of its own; it is in use-task-list,
which every task surface loads) and one button; the panel is lazy.

## Feature 7 — custom fields on tasks (LEDGER #229, Any.do) — built

- A project's "Rules and fields" → Fields: up to five per project — Text, Number, Date, A choice from a list (up to 12
  choices), A tick — each with how many tasks are filled in, and Remove (its values leave the project's tasks; Undo).
- A task's editor shows "Project fields" for the chosen project, each an input of its kind; a value that does not fit says
  why under it ("“Budget” is a number, for example 12 or 4.5.") and Save waits. Saved with the task (its Undo).
- Tasks → Table: with one project chosen, its fields are columns after the fixed ones, sortable (numbers by size, choices
  in their own order, dates by day, empty values last either way).
- Built beside revb1's Table work: the Table gains its field columns only (sort state widened to `field:<id>`); nothing of
  the fixed columns, the Calendar or the Timeline is touched.

Files: lib/tasks/custom-fields.ts (pure: define, read, clean, words, sort), lib/tasks/schema.ts (fieldDefSchema on the
project, `fields` values on the task), lib/tasks/engine.ts (`fields` in TaskPatch / editTask, one line), components/tasks/
{task-fields.tsx (editor chunk), task-editor.tsx, project-setup.tsx (lazy), tasks-plan-views.tsx (Table columns), tasks-r2.css}.
Tests: lib/tasks/r2-custom-fields.test.ts (kinds, refusals, values read, sort, removal, export → erase → restore, tolerant read).
Spec: tests/av2-custom-fields.spec.ts.
Stored (TIER 3, own commit 05bb42c2): `zigoals:tasks:v1` project gains optional `fields` ([{id, name ≤ 40, kind: text|number|
date|choice|tick, options? ≤ 12}] ≤ 5); task gains optional `fields` ({fieldId: string ≤ 200 | number | true}, ≤ 20 keys).
A field or value this build cannot read is dropped on read (never the project or task); older builds keep both untouched
(loose objects) and show nothing.
Answers: "which custom fields do my projects have" / "welke eigen velden hebben mijn projecten" (fields per project, how many
open tasks filled in, a number field's total).
Help: Q "Can I add my own fields to tasks?" A "Yes. Open a project, then Rules and fields, and add up to five: text, a
number, a date, a choice or a tick. Fill them in each task's editor, and sort by them in Tasks → Table with the project chosen."
What's new: "Tasks: your own fields on a project's tasks, as Table columns."
Showcase / Today: nothing. Weight: all lazy (editor chunk, planning views chunk, the panel).
CSV export (tasksCsv) is unchanged: the fields travel in Export everything; adding them as CSV columns is the lead's call.

## Lead: what I need from you (shared files)

- engine.ts: the wiring line at the top of this file (before av2TasksAnswer); corpus: `AV2_TASKS_R2` (7 intents, 28 questions).
- help-page.tsx: the seven Help Q+A and What's new lines above.
- lib/search/static.ts: "My Day" → `/app/tasks?view=today`; "Template gallery" → `/app/tasks?view=organise`; "Print tasks" →
  `/app/tasks?view=inbox` (the button is under every list); "Rules and fields" (no deep link: a project's tools).
- No new device keys, catalogue, export, erase or restore entries: every stored change is an additive field on
  `zigoals:tasks:v1` or `zigoals:task-plan:v1`, which are already registered (round-trips tested in my unit tests).
- Theme sheets: new CSS files components/tasks/{tasks-r2.css, tasks-print.css}; two lines appended to tasks.css.
- Playwright specs to run: tests/av2-{my-day, note-reminders-tasks, task-print, template-gallery, board-imports,
  project-rules, custom-fields}.spec.ts (not run here, as the brief says).
- Nothing new is always visible on Today (the dashboard). Tasks → Today gains "My Day" and "From your notes" groups only
  when they hold something; "Print this list" is under the list.

## Left (allowed causes only)

- #228: rules that assign people — against a named rule (nothing is shared between people).
- #227: ClickUp and Monday.com imports — their export layouts are not published, so the importer's documented-layout rule
  (lib/import/switch/formats.ts) keeps them off (the ledger's own wording for this row).
- Showcase examples for these features — against a named rule (the Showcase counts pinned by lib/nova/cards and the
  local-answers tests); hooks suggested per feature above.
Nothing else in R1 (#223, #224) or R9 (#225–#229) is left.
