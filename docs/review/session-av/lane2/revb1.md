# Lane 2 batch 1: fresh-review fixes (slug `revb1`, branch `lane2/revb1`)

The findings: the lead's review of batch 1 (feature/session-av-2 @ 115b134f), numbered as there. One commit per finding.

## #1 Blocker: reminders written in notes never fired

- Verdict: fixed.
- Cause: the "@remind" line's relative words ("tomorrow", "friday", a time alone) were read against *today* on every render
  and every notification-plan sync, so the reminder slid forward a day each day.
- Fix: each reminder line is read against the day it was written. That day is kept with the note, additively: a new
  optional field on a note, `remindFrom` (a map of the line's words, case and spaces folded, to `YYYY-MM-DD`), written by
  `updateNote` on every save of the words (a line kept as it was keeps its day; a new or changed line takes the day of
  the save). A note with no `remindFrom` (an older one, an import, a capture, a note an older build saved) reads its lines
  against the day of its last save (`updatedAt`, else `createdAt`) — never against today, never later than today.
- Why this shape (and not an ISO date written back into the line): the person's own words stay as they typed them, so
  nothing changes under the cursor or in their Markdown exports, and older readers keep working — a build without this
  field ignores it (the note object is loose) and reads the text as it always did.
- Files: `apps/web/lib/notes/reminder-anchors.ts` (new, small, no task-parser import so the notes store can use it),
  `lib/notes/reminders.ts`, `lib/notes/store.ts` (`updateNote` takes an optional zone, default the Checklist's zone),
  `lib/notes/schema.ts`, `components/notes/note-reminders.tsx` (the teaching line says "tomorrow" stays that day).
- Stored change (TIER 3 stored formats, its own commit): `zigoals:notes:v1` → `notes[].remindFrom?:
  Record<string(1..200), YYYY-MM-DD>`, `.optional().catch(undefined)` on the loose note object; at most 20 entries (one
  per reminder line read). Export everything → erase → Restore keeps it (unit test). No new key, no catalogue change.
- Tests: `apps/web/lib/notes/revb1-reminders.test.ts` (Monday morning still Monday 09:30; weekday, a time alone and
  Dutch stay put; later saves keep a line's day; an older note reads against its last save; an unreadable map is dropped;
  the export round trip).
- Spec (lead runs): `apps/web/tests/revb1-note-reminders.spec.ts`.
- Help (EN), for help-page.tsx's notes reminder answer, one sentence to add: "“Tomorrow” and “friday” mean the day after,
  or the Friday after, the day you write the line; they stay that day."
- What's new: "Reminders in notes stay on the day you meant."

## #2 Major: a running timer's minutes were lost when the task was marked Done

- Verdict: fixed.
- Fix: the Done box (use-task-list `toggle`, so every surface that finishes a task: Tasks, Today's card, the Agenda,
  a goal's next actions, NOVA's widget) reads the task's running timer without a schema (`timerOnDone` in
  lib/tasks/plan-key.ts, which the add path already loads), adds its minutes to the task's time spent in the same change
  as the finish (one Undo), says "Done: “…”. Timer stopped: 40 min added to its time spent.", and only then takes the
  timer off the planning record. A task finished where the box could not stop it (another tab, an older build) is
  settled when Tasks → Today next tidies the timers (`settleTimers` in lib/tasks/plan-record.ts, minutes up to the
  task's `doneAt`, the status line "Stopped: … on “…”."); timers of tasks that are gone are dropped as before.
- Files: lib/tasks/plan-key.ts, lib/tasks/plan-record.ts (`timerMinutes` now lives in plan-key and is re-exported),
  components/tasks/use-task-list.ts, components/tasks/today-planner.tsx.
- Stored changes: none (the existing `spent` field and `timers` list).
- Tests: apps/web/lib/tasks/revb1-timers.test.ts. Spec (lead runs): apps/web/tests/revb1-timer-done.spec.ts.
- Help (EN), add to the timers answer: "Ticking a task Done while its timer runs stops the timer and keeps the minutes."
- What's new: "Done stops a task's timer and keeps its minutes."

## #4 Major (privacy): the Showcase's journal photos and voice notes stayed on the device

- Verdict: fixed. `deleteAllJournalMedia(scope)` (lib/journal/media.ts) is a scope delete like the tasks'; Leaving the
  Showcase and starting one (`clearShowcasePhotos`, lib/showcase-storage.ts, with the lead's permission) now clears the
  journal media of scope `showcase` with the notes', progress, meal, receipt and task files. Other scopes stay.
- Tests: apps/web/lib/journal/revb1-showcase-media.test.ts. Spec: none (no browser behaviour beyond the unit).
- Stored changes: none. Help: no change. What's new: none (a privacy fix; the lead may add "Leaving the Showcase also
  deletes the journal photos and voice notes made in it.").

## #3 Major: journal photos and voice notes were missing from Export everything

- Verdict: fixed (the export); Restore says honestly what comes back (putting the files back is #18, below).
- Fix: Export everything (lib/export/make-everything.ts, with the lead's permission) adds the journal's photos and voice
  notes as files, `journal/photos/<media id>.<webp|jpeg>` and `journal/audios/<media id>.<webm|m4a|ogg>`, named by the
  id each entry keeps (lib/journal/export-media.ts; only media an entry names, from this tab's scope). The export's notes
  then say: "The journal’s photos and voice notes are in the file’s journal folder. Restore does not put them back into
  the journal yet; to move a journal with its photos and voice notes, use Journal → Import and export." (and how many
  were not in this browser, if any). The Restore preview counts every photo or recording in the file it does not put
  back (notes', receipts', meals', tasks', journal's; `notRestored` on the opened backup, lib/restore/read-backup.ts)
  and says so before anything changes (components/restore/restore-backup.tsx `notRestoredNote`).
- Tests: apps/web/lib/journal/revb1-media-export.test.ts. Spec (lead runs): apps/web/tests/revb1-journal-media-export.spec.ts.
- Stored changes: none (the export file gains entries; everything.json unchanged).
- Help (EN), add to the Export everything answer: "The journal’s photos and voice notes are in the file’s journal folder."
- What's new: "Export everything now holds the journal’s photos and voice notes."
