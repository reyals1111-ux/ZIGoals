# Lane 2 registry: the last "built in part" remainders (`lane2/rest`)

Builder: the remainders builder, on `lane2/rest` (from `lane2/batch2`). Scope: the rows the verdict check
(`ledger-verdicts.md`, "Rows still built in part") left built in part, except batch 1's review findings (on
`lane2/revb1`): #17, #33 (tasks), #41/#134/#209 (sync service side), #79, #93, #98, #124, #142, #178.

## Rows

| Row | Verdict | Feature |
|---|---|---|
| #17 Things repeating projects | **built** | R1 |
| #33 Notion version history — tasks | **built** | R2 |

## Answers wiring line for engine.ts (one line, before AV's own answers)

```ts
// Session AV lane 2 (rest): the last remainders' own answers (lib/ai/local-answers/av2-rest.ts).
if (!subject) { const own = av2RestAnswer(question, env, {templates: env.nova?.taskTemplates, plan: env.nova?.taskPlan}); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }
```
Corpus: `AV2_REST` in `lib/ai/evals/as/cases-av2-rest.ts` (add to CORPUS and expected.json).

## R1 Repeating projects — LEDGER #17 (Things)

- What: Tasks → Areas and templates → Templates has a new "Repeats" choice: Once (no repeat), Every week, Every month,
  Every few days (with "Every how many days", 2–365). "Make it and repeat" makes this period's project now (named
  "<name> · <first day>", its tasks counted from that day) and keeps the repeat; one Undo takes back both. When Tasks
  opens (and when its day moves on), each repeat whose time has come makes the project for the current period, once
  (never for periods missed while the app was closed, never twice; a project of that name already there counts as
  made), with a toast "Made “Weekly reset · 2026-11-30”: it comes round every week." and Undo (which takes the project
  back; the period stays made, as a repeating note does). A list "Repeating projects" shows each with how often and its
  next day, with Pause / Resume and "Stop repeating" (Undo; its projects stay). Empty state teaches how to set one up.
  Up to 10 repeats. Monthly repeats come round on the first day's date (a day after the 28th: on the 28th).
- Files: `lib/tasks/repeat-projects.ts` (pure: periods, next day, words EN/NL, add/pause/remove/restore, runRepeats,
  markRepeats), `lib/tasks/templates.ts` (schema: `repeats`), `components/tasks/repeat-projects-run.ts` (the on-open
  runner, its own chunk loaded with `import()` after the page), `components/tasks/tasks-page.tsx` (one effect),
  `components/tasks/tasks-organise.tsx` (the Repeats choice and list; already in the lazily loaded planning chunk).
- Tests: `lib/tasks/av2-repeat-projects.test.ts` (periods, once per period, missed periods, names, pause, limits, Undo,
  older records, export → erase → restore); `lib/ai/local-answers/av2-rest.test.ts`.
- Spec: `tests/av2-repeat-projects.spec.ts`.
- Stored change (TIER 3 (stored formats), separate commit): an additive optional field `repeats` on the loose templates
  record `zigoals:task-templates:v1` (an array of loose objects: id, name, every `week|month|days`, days?, start,
  lastMade?, paused?, items). Older records read as none; a broken repeat is dropped, the rest kept. No new key, so no
  device-key, catalogue, export or erase entry is needed (the key is already in each).
- Help (EN): **Q: Can a project repeat, like a weekly reset?** A: Yes. In Tasks → Areas and templates, choose a
  template, set “Repeats” to every week, every month or every few days and press “Make it and repeat”. The project is
  made now, and again each time its day comes round, when you open Tasks. You can pause a repeat or stop it there; the
  projects already made stay.
- What's new: "Repeating projects: a project from a template comes round by itself."
- Showcase hook: none. A repeat in the Showcase would make a project on open and move the Tasks counts other tests pin
  (and the runner, like repeating notes, does not run in the Showcase), so none is added.
- CSS: none (existing `tasks-areas`, `field`, `text-link` classes). Nothing new on Today.

## R2 Version history for tasks — LEDGER #33 (Notion; modelled on the notes' and journal's versions)

- What: each save that changes a task's title or notes (the editor's Save, any surface that uses the task list's `edit`)
  keeps what it replaced as an earlier version, on this device only: at most 10 per task, 300 in all, 200,000
  characters together (oldest first out), none for a task that is gone, the same words never kept twice. The task
  editor has a fold "Earlier versions": each version with when it was saved, its title and notes to read, "Restore this
  version" (through the task's own Save, so the words it replaces are kept too, with the Save's Undo), "Delete this
  version" (Undo; focus stays in the list) and "Delete all earlier versions" (Undo). Empty state teaches.
- Files: `lib/tasks/versions.ts` (pure: keep, cap, list, delete one, delete all, put back), `lib/tasks/plan-record.ts`
  (schema: `versions`), `components/tasks/task-versions-keep.ts` (writer, its own chunk, loaded only after a save that
  changed the words), `components/tasks/use-task-list.ts` (`keepingVersion`, a few lines), `components/tasks/task-versions.tsx`
  (the fold's content, lazily loaded), `components/tasks/task-editor.tsx` (the fold; the editor is already lazy).
- Tests: `lib/tasks/av2-task-versions.test.ts` (keep, caps, delete and Undo, older records, export → erase → restore);
  `lib/ai/local-answers/av2-rest.test.ts`.
- Spec: `tests/av2-task-versions.spec.ts`.
- Stored change (TIER 3 (stored formats), separate commit): an additive optional field `versions` on the loose planning
  record `zigoals:task-plan:v1` (device only, never synced; loose objects: id, taskId, title, notes?, savedAt). Older
  records read as none; a broken version is dropped. No new key, so no device-key, catalogue, export or erase entry.
  (Note for the lead: `lane2/revb1` also touches `plan-record.ts` for the timer minutes; the two edits are in different
  places of the file.)
- Help (EN): **Q: Can I get back what a task said before?** A: Yes. Open the task and its “Earlier versions”: each time
  you save a change to its title or notes, what it said before is kept there, up to ten versions, on this device. Read
  one, restore it (what it replaces is kept too), or delete one or all of them.
- What's new: "Tasks keep earlier versions: read, restore or delete what a task said before."
- Showcase hook: none (versions come from the person's own saves; a seeded version would add a planning record the
  Showcase does not have today).
- CSS: `components/tasks/tasks.css` (`.task-versions-*`). Nothing new on Today.
