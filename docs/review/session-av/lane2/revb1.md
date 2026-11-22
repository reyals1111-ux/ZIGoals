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
