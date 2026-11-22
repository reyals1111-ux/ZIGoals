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

## #5 Major (privacy): earlier versions of journal entries and notes could not be deleted

- Verdict: fixed.
- Fix: each earlier version (Journal → an entry's More → Earlier versions; a note's Earlier versions) has "Delete this
  version", and the list has "Delete all earlier versions"; each asks first in place (ConfirmInline: "Its words leave
  this device and every export or backup you make from now on."), then offers Undo in the app's toast; focus goes to the
  versions heading. The Edit fold now says "kept as an earlier version, on this device, until you delete it".
  Pure parts: `deleteVersions` (lib/journal/versions.ts), `deleteNoteVersions` (lib/notes/versions.ts); a notes Undo can
  now carry `versions` to put back (in-memory `NotesUndo` only, lib/notes/store.ts `applyUndo`).
- Exports and sync: the versions live only in the journal and notes device records, so a deleted version is in no later
  Export everything, journal ZIP or backup (unit test). Neither record syncs (journal: ADR-034 N18; notes: device-only by
  their schema), so there is no synced copy to clear — the reviewer's "synced with the journal" does not hold. A Merge
  restore of an older backup made before the deletion brings its versions back, as Merge does for any record.
- Tests: apps/web/lib/journal/revb1-delete-versions.test.ts. Spec (lead runs): apps/web/tests/revb1-delete-versions.spec.ts.
- Stored changes: none.
- Help (EN): Q "Can I delete an earlier version?" A "Yes. Open the earlier versions of an entry (More) or of a note, and
  choose Delete this version, or Delete all earlier versions. You are asked first, and Undo puts them back for a moment.
  Their words then leave this device and every export you make."
- What's new: "Delete earlier versions of journal entries and notes."

## #6 Major: ZIGi said the notes "can't be read on this device"

- Verdict: fixed, and the eval harness was wrong for ZIGi (fixed, labelled deliberate).
- Fix: lib/ai/local-answers/av2-journal.ts `notesOf` tells the three cases apart: NOVA with its Notes scope off refuses
  as before; a notes record that really does not read (null) keeps "can’t be read"; ZIGi, which never receives the notes
  (components/ai/use-ai-context.ts reads them only on NOVA's surface), says "ZIGi doesn’t read your notes. Open Notes →
  Notes → Repeating notes to see them; NOVA can answer this with Notes on in NOVA → Permissions." (NL: "ZIGi leest je
  notities niet. Open … om ze te zien; NOVA kan dit beantwoorden met Notes aan in NOVA → Permissions."), with the place
  that fits each question (Repeating notes; a note's Earlier versions; Notes → Chart for notes per tag).
- Harness (apps/web/lib/ai/evals/as/harness.ts): `zigiEnv` now strips `nova.notes`, as the app does. The three
  av2-journal unit tests that read the notes' facts from ZIGi now read them from NOVA (same exact strings) and assert
  ZIGi's exact new sentences in EN and NL, plus a new case for the unreadable record — labelled
  `Session AV lane 2 (review b1 #6, deliberate)`. lib/ai (178 files) green; the corpus (corpus.test.ts, expected.json)
  unchanged and green.
- Spec (lead runs): apps/web/tests/revb1-zigi-notes.spec.ts.
- Answers wiring: none new (av2JournalAnswer is already wired). Stored changes: none.

## #7 Major (depth): the Tasks Table, Calendar and Timeline were read-only

- Verdict: fixed (drag on the Timeline's bars is not built: the Calendar takes drags and the keyboard move; the Timeline
  opens each task's editor, where its day and deadline change — the reviewer's "dragging can come later").
- Fix (components/tasks/tasks-plan-views.tsx, its own chunk): in the Table, both Calendar layouts and the Timeline each
  task's title is a button (`.tasks-plan-task`, `aria-expanded`) that opens the list's own task editor (lazy, the same
  chunk a row uses) under the view; Save is the list's edit with its Undo; Cancel or Escape closes it and focus goes back
  to the title. In the Calendar an open task can be dragged to another day (3 days: a day column; month: a day cell) or
  moved with the keyboard: "Move" on the task (`Move “…” to another day`), then "Move here" on a day (3 days) or the
  day's number (month), named `Move “…” to Wed, Nov 25`; a status line says what is moving, with "Cancel the move".
  A move is the list's change (`editMany` → `due`, the time kept), with Undo ("… is back on …"), and focus goes to the
  moved task. A month day's "+N more" is a button (`Show N more on …`, `aria-expanded`) that shows the rest; "Show
  fewer" folds it again. A teaching line under each layout says what a title does.
- CSS: components/tasks/tasks-plan.css (theme variables only; 44 px targets; no new animation).
- Tests: apps/web/lib/tasks/revb1-plan-views.test.ts (server render of the three layouts, and the move's change).
  Spec (lead runs): apps/web/tests/revb1-plan-views-edit.spec.ts (Table edit + focus back, keyboard move and drag in
  3 days, month "+1 more", Timeline edit, axe, 320 px).
- Stored changes: none. Showcase: nothing new (the Showcase's tasks show in these layouts already).
- Help (EN): Q "Can I change a task from the Table, Calendar or Timeline?" A "Yes. Choose a task’s name to open its
  editor. In the Calendar, drag a task to another day, or choose Move and then Move here on the day (in a month, the
  day’s number). A day’s “+2 more” shows the rest."
- What's new: "Open, edit and move tasks from the Table, Calendar and Timeline."
