# Lane 2 registry: round 5, notes and files on a task (`lane2/r5-notes`)

Builder: the round-5 notes builder, on `lane2/batch4` (rounds 1–4 of lane 2 included). Scope: LEDGER "Round 5" groups
V2 (#358, #359, #360, #361, #362, #363, #364, #366, #367) and V8 (#365, #355); COMPETITORS.md round 5's Logseq, Craft
and Akiflow rows. #368 (notes on a PDF) stays **Carried: a new dependency** (pdf.js). The Notes registries before this
one (`journal.md`, `r3-notes.md`, `r4-notes.md`, `revb3c.md`) are built on, never repeated.

Rules that stand, kept everywhere here:
- Notes' marks never reach ZIGi's replies: nothing new was added to `lib/ai/safe-render.ts`; the embed (#361) is drawn by
  `components/notes/note-render.tsx` from the `{notes: true}` tree only, and the line stays text everywhere else.
- A locked note shows nothing of itself anywhere: the embed of a locked note says only that it is locked; its cards
  never show (`allCards`); `shownOf` now also drops the new `look` (no cover of a locked note); mentions without a link
  never search a locked note; NOVA's answers read `readableNotes` and name no locked note in Recently deleted.
- Sealed letters stay folded: nothing here reads the journal.

Baseline check: docs/STATUS.md "Current accepted baseline" protects PR #22's changes and the brief's protected areas
(Today hero and slogan, Checklist orbit path, footer finale, swan intro, shell navigation, AR's NOVA composition, the
locked ZIGi look). #359 changes the Notes list (a Select button and, while selecting, tick boxes); #364 adds a line under
an imported event on the Agenda; #355 adds a Files button to the Tasks header links and a drop target on the Tasks page.
None of these is in the protected baseline.

## Summary

| LEDGER row | verdict | feature |
|---|---|---|
| #360 Logseq Deleted notes kept for 30 days | built (kept apart in `notes.trash` rather than a `deletedAt` on a note in `notes`; why below) | F1 |
| #359 Logseq Act on several notes at once | built | F2 |
| #358 Logseq Mentions without a link | built | F3 |
| #361 Logseq A line of another note inside this one | built (a heading's section or the whole note, Obsidian's `![[Note#Heading]]`; read-only, as the row says) | F4 |
| #362 Logseq A template for every note with a tag | built | F5 |
| #363 Craft Change a table in a note | built | F6 |
| #364 Craft A note for a calendar event | built | F7 |
| #366 Craft Daily notes for a range of days | built | F8 |
| #367 Craft A note's look | built | F9 |
| #365 Logseq Flashcards with spaced repetition | built (the new device key needs the lead's registry lines, below) | F10 |
| #355 Akiflow Files on a task | built (restoring the files' bytes from a backup needs the lead's lines in `lib/restore/media.ts`, below) | F11 |
| #368 Logseq Notes on a PDF | **Carried: a new dependency** (pdf.js); a PDF can now be kept on a task (#355) and opens in the browser's own viewer | — |
| QUALITY Minors (Notes) | not done in this round: the task named the V2 and V8 rows only | — |

## Commits

| sha | what |
|---|---|
| `43bb7564` | TIER 3 (stored formats): notes `trash`, `tagTemplates`, note `look` |
| `ff6baa8f` | #360, #359, #358, #361, #362, #363 (one commit: they share the editor and the Notes list; each has its own tests and spec) |
| `da8251b2` | #364 |
| `c66d14a8` | #366 |
| `be1e9a84` | #367 |
| `3e138a23` | TIER 3 (stored formats): the note-cards device key (#365) |
| `fbe3494a` | #365 |
| `b5b3d2ba` | TIER 3 (stored formats): the `file` kind in the task attachments store (#355) |
| `1242ec7f` | #355 |
| `29352432` | NOVA's and ZIGi's answers (all rows) |
| (this commit) | this registry |

Checks: typecheck (through the shared lock) clean on `ff6baa8f`'s files, on `da8251b2`, on `be1e9a84` and on the final
head; eslint clean on every changed file; unit tests green for `lib/notes`, `lib/agenda`, `lib/tasks/*attachments*`,
`lib/restore/av2-restore-media.test.ts`, `lib/export/everything.test.ts`, the attachment and roadmap answers and the new
answers, except `lib/erase-coverage.test.ts`, which stays red until the lead registers `zigoals:note-cards:v1` (below).

## For the lead (shared files this branch does not edit)

1. **Engine wiring** (`lib/ai/local-answers/engine.ts`, beside the `av2R4NotesAnswer` call, same guards):
   `import {av2R5NotesAnswer} from './av2-r5-notes';` and try `av2R5NotesAnswer(question, env)` before `avAnswer`.
   Corpus: add `...AV2_R5_NOTES` from `lib/ai/evals/as/cases-av2-r5-notes.ts` (11 intents, 44 questions, EN and NL) to
   `CORPUS` and record `expected.json`. Checked here (`av2-r5-notes.test.ts`, "no question of today's corpus is answered
   here"): wiring it first moves nothing of today's corpus. Please check that no earlier answer in the engine's order
   takes "can I attach a pdf to a task" (av2-roadmap's photo answer asks for "photo"; this one leaves photo and voice to it).
2. **New device key (#365)** `zigoals:note-cards:v1`: spread `lib/av2-r5-notes-keys.ts` into the registries as
   `lib/av2-r4-health-keys.ts` is — `AV2_R5_NOTES_PERSONAL_KEYS` into the welcome check (`DEVICE_RECORD_KEYS`),
   `AV2_R5_NOTES_EXPORT_KEYS` into `DEVICE_KEYS` (`lib/export/everything.ts`), `AV2_R5_NOTES_CATALOG_LABELS` into the
   catalogue (`lib/data-health/catalog.ts`, home device, area Today, as the notes record), `AV2_R5_NOTES_RESTORE` into the
   restore plan (`lib/restore/plan.ts`, `dev('noteCards', 'Review days of note cards', 'Today and Life', NOTE_CARDS)`),
   `AV2_R5_NOTES_ERASE_KEYS` into the erase (`lib/aa-device-forget.ts`), and the frozen-reader fixture if it lists device
   keys. **Red until then:** `lib/erase-coverage.test.ts` ("every key is in Export everything and the data catalog")
   names `zigoals:note-cards:v1`; it goes green with those lines. The export → erase → restore test in
   `lib/notes/r5-cards.test.ts` is `skipIf(!registered)` and runs once the key is in `DEVICE_KEYS`.
3. **Export everything for Recently deleted (#360)**: the notes record (with `trash`) already round-trips
   (`lib/notes/r5-stored.test.ts`, Replace and Merge). For the photos of notes in Recently deleted to travel too, one line:
   `lib/export/make-everything.ts:53` (the r4 line, now `sch.notePhotoIdsOf(note)` over `notes`) → also over
   `record.trash ?? []`; and `lib/restore/media.ts:63` indexes the same ids for the trash's notes. Until then a restored
   note in Recently deleted keeps its words and its photo ids; its photo bytes stay on the device that took them.
4. **Files on a task in a backup (#355)**: Export everything already writes them (`exportTaskAttachmentEntries` reads
   every kind; a file is named `tasks/attachments/<task>-file-<id>-<name>.<ext>`). To restore them, in
   `lib/restore/media.ts` (`target`, around line 92–104): match `-file-(tf_[A-Za-z0-9_-]+)-` names as kind `file` with
   cap `TASK_FILE_MAX_BYTES`, and in the `tasks` case of the writer:
   `putTaskAttachment(scope, t.id, {taskId: t.taskId!, kind: 'file', blob, type: blob.type || 'application/octet-stream', name: <the part after the id>, bytes, at})`.
   Erase: the files live in the existing database `zigoals-task-attachments-v1`, already erased by name.
5. **Specs for the shard lists** (none run here): `tests/av2-notes-trash.spec.ts`, `av2-notes-select.spec.ts`,
   `av2-notes-mentions.spec.ts`, `av2-notes-embed.spec.ts`, `av2-notes-tag-templates.spec.ts`,
   `av2-notes-table-edit.spec.ts`, `av2-notes-event.spec.ts`, `av2-notes-daily-range.spec.ts`, `av2-notes-look.spec.ts`,
   `av2-notes-cards.spec.ts`, `av2-task-files.spec.ts`.
6. **Help and What's new**: each feature's Q+A (EN) and label are below, for `help-page.tsx`.
7. **Search palette** (optional, `lib/search/static.ts`): "Recently deleted notes" → `/app/notes?view=notes`;
   "Review cards" → `/app/notes?view=notes`; "Files on tasks" → `/app/tasks`.
8. **Route weight** (not measured; no build here; please check `/app/notes`, `/app/tasks`, `/app/agenda`): lazy chunks —
   Recently deleted, Select, Templates for tags, Review cards, Change a table, the Look picker and the cover (each loaded
   when its fold opens or its button is pressed), the event note on the Agenda, Files on a task and Tasks → Files. First
   chunks gained: in Notes, `lib/notes/tag-templates.ts` and `lib/notes/bulk.ts`'s `cleanTag` (small, pure),
   `mayHoldTable`, the embed drawing in `note-render.tsx`, `unlinkedMentions` in `lib/notes/links.ts` (in the already lazy
   backlinks chunk), the trash helpers in `lib/notes/store.ts`, and four fold summaries; in Tasks, a Files button and the
   drop handler (its work is a dynamic import); in the Agenda, one lazy element per imported event.
9. **CSS touched** (the lead regenerates the theme sheets if they gather these): `components/notes/notes.css`,
   `components/agenda/agenda.css`, `components/tasks/task-attachments.css`. Theme variables and `color-mix` only.
10. **Today**: nothing added, nothing always visible.
11. **Files outside Notes I edited** (none on the brief's shared list): `components/agenda/agenda-days.tsx` (one lazy
    element under an imported event), `components/tasks/task-editor.tsx` (one lazy element), `components/tasks/tasks-page.tsx`
    (the Files button and panel, the drop), `components/tasks/task-attachments.tsx` (files left to their own list),
    `lib/tasks/attachments.ts` (the third kind).

## Stored changes (TIER 3 stored formats; all additive, optional, dropped when unreadable, on loose objects)

| record | field | what |
|---|---|---|
| `zigoals:notes:v1` notes | `trash` | notes deleted in the last 30 days, each the whole note plus `deletedAt`, newest last; at most 200 and 400,000 characters (the oldest leave first) (LEDGER #360) |
| notes | `tagTemplates` | up to 10 `{tag, body}`: words a new, still empty note given that tag starts from (#362) |
| note | `look` | `{cover?: <one of the note's photo ids>, colour?: sand / sage / sky / lilac / rose / stone}`, the reading view only (#367) |
| **new key** `zigoals:note-cards:v1` | `{version: 1, reviews: [{id, due, interval, ease, reps, lapses?, last, first?}]}` | the review days of the cards written in the notes, at most 2000; loose and versioned; device only, never synced (#365); needs the lead's registry lines (above) |
| IndexedDB `zigoals-task-attachments-v1` | a third kind `file` | `{taskId, kind: 'file', blob, type, name, bytes ≤ 10 MB, at, orphanSince?}`; every task's files ≤ 100 MB in a scope (#355) |

Why `trash` and not `deletedAt` on a note in `notes` (#360): every reader of the notes — Search, the Graph, the lists,
backlinks, the day's notes, NOVA's tools and answers, the Markdown export, open tick boxes, reminders — reads `notes`. A
deleted note kept there with a mark would have to be left out by each of them, and an older build (which does not know
the mark) would show every deleted note again after a rollback. Kept apart, every reader leaves it out by construction,
and an older build keeps the list untouched and never shows it. Each note in it carries `deletedAt` as the row says.

**Rollback limits.**
- Recently deleted (#360): an older build does not count the photos of a note in Recently deleted as named, so its
  arrival sweep marks them and deletes their bytes 30 days later — the same 30 days the note itself waits; restoring the
  note in this build before then keeps them.
- Files on a task (#355): an older build's reader drops the `file` kind, so it never shows, sweeps or deletes a file; its
  per-task cap counts only photos and voice notes. Nothing is lost.
- Cards (#365): an older build never reads the new key; the review days wait for this build.
**For the lead:** please carry these into docs/STATUS.md's stored-format notes.

## Features

### F1 Recently deleted — LEDGER #360 (Logseq)

- Verdict: **built**.
- What: Delete note (and an inbox capture's Delete) keeps the note 30 days in Notes → Notes → "Recently deleted" (a fold;
  "2 notes, kept 30 days", or "none; a deleted note waits here 30 days"), whole — its photos, tags, properties and earlier
  versions wait with it. The toast still says "“…” deleted." with Undo, and "It waits 30 days in Notes → Notes → Recently
  deleted." Each deleted note shows its name (a locked one only its name), "Deleted Nov 22, 2026 · 29 days left",
  Restore (one tap; it opens the note) and Delete now… (a confirmation; its photos no other note names go at once);
  Empty now… removes them all for good after a confirmation. A daily note whose day has a new daily note meanwhile is
  added to the end of that note on Restore, so a day never has two. On arrival, a note deleted more than 30 days ago
  leaves for good with its earlier versions. While in Recently deleted a note is out of Search, the Graph, the lists, the
  day's notes, backlinks, NOVA's notes, the Markdown export, open tick boxes and reminders (they read `notes` only).
- Files: new `lib/notes/trash.ts`, new `components/notes/notes-trash.tsx` (lazy); `lib/notes/store.ts` (`removeNote`,
  `toTrash`, `untrashBack` in `applyUndo`, `capTrash`, `keptNoteIds`), `lib/notes/versions.ts` (versions of a deleted note
  wait with it), `components/notes/notes-workspace.tsx` (the fold, the arrival purge, the photo sweep names the trash's
  photos), `components/notes/note-editor.tsx`, `components/notes/inbox-item.tsx`, `components/notes/notes.css`.
- Tests: `lib/notes/r5-trash.test.ts`; stored round trip in `lib/notes/r5-stored.test.ts`. Spec: `tests/av2-notes-trash.spec.ts`.
- Help (EN). Q: "I deleted a note by mistake. Can I get it back?" A: "Yes, for 30 days. Notes → Notes → Recently deleted
  lists the notes you deleted, with their photos; Restore puts one back in one tap. After 30 days they leave this device;
  Empty now removes them at once."
- What's new: "Notes: Recently deleted — a deleted note waits 30 days and comes back in one tap."
- Showcase: none (a Showcase note in Recently deleted would move the pinned list counts). Today: nothing added.

### F2 Act on several notes at once — LEDGER #359 (Logseq)

- Verdict: **built**.
- What: Notes → Notes → Select (beside the layouts, in the List layout): each note gets a tick box; the bar "Act on the
  chosen notes" says "2 notes chosen", with Choose all, Choose none and Done; a Tag field with Add tag and Remove tag
  (a #tag written in a note's words stays until its words are edited; the bar says how many were left as they were), Pin
  and Unpin (topic notes), Archive, and Delete (to Recently deleted). Each is one step with one Undo in the message that
  puts every chosen note back. Esc or Done leaves Select, focus back on Select.
- Files: new `lib/notes/bulk.ts`, new `components/notes/notes-select.tsx` (lazy); `components/notes/notes-workspace.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r5-bulk.test.ts`. Spec: `tests/av2-notes-select.spec.ts`.
- Stored: nothing new (normal writes of `tags`, `pinned`, `archived` and the trash).
- Help (EN). Q: "Can I change several notes at once?" A: "Yes. In Notes → Notes, press Select and tick the notes. Then add
  or remove a tag, pin, archive or delete them in one step. Undo in the message puts them all back."
- What's new: "Notes: Select several notes to tag, pin, archive or delete them at once."
- Showcase: none needed. Today: nothing added.

### F3 Mentions without a link — LEDGER #358 (Logseq)

- Verdict: **built**.
- What: an open note shows, under "Notes that link here", "Mentioned without a link · 2 notes" (a fold): the notes whose
  words name its title (whole words, any case, across line breaks; not inside a [[link]], code or a web address; never a
  locked or archived note, a name under three characters, or a note that already links it), each with its line. "Link it"
  makes that place a [[link]] (`[[Title]]`, or `[[Title|its words]]` when they are written differently); the earlier
  words are kept under Earlier versions, and Undo is in the message. With none: "No other note names “…” without linking it."
- Files: `lib/notes/links.ts` (`unlinkedMentions`, `linkMention`), `components/notes/note-backlinks.tsx`,
  `components/notes/note-editor.tsx` (passes `change`; not for a locked note), `components/notes/notes.css`.
- Tests: `lib/notes/r5-mentions.test.ts`. Spec: `tests/av2-notes-mentions.spec.ts`.
- Help (EN). Q: "Which notes mention this note without linking it?" A: "Open the note: under Notes that link here,
  Mentioned without a link lists the notes that name its title in their words, each with its line. Link it turns those
  words into a link; the earlier words stay under Earlier versions."
- What's new: "Notes: mentions without a link, linked in one tap."
- Showcase: none needed. Today: nothing added.

### F4 A section of another note inside this one — LEDGER #361 (Logseq, in Obsidian's form)

- Verdict: **built**.
- What: a line that is only `![[Note#Heading]]` draws that heading and what is under it (up to the next heading of its
  level or higher) from the other note, as a quiet quote with "From “Note › Heading”" linking to it; `![[Note]]` draws
  the whole note (up to 40 blocks, then "The rest is in the note itself"). It follows the source: change the source and
  the quote changes. It only reads: the source's tick boxes show but do not tick here, and an embed inside an embedded
  section stays a link (no loops). A locked source says "“…” is locked: nothing of it shows here."; a heading no longer
  there says so. The text stays as written (Obsidian draws the same line); the Markdown export keeps it; ZIGi's and
  NOVA's renderers never draw it (nothing new in `safe-render.ts`).
- Files: `components/notes/note-render.tsx` (`NoteEmbed`, the `notes` prop), `lib/notes/fold.ts` (`sectionOf`),
  `components/notes/note-editor.tsx` (`notes={record?.notes}`), `components/notes/notes.css`.
- Tests: `lib/notes/r5-embed.test.ts`. Spec: `tests/av2-notes-embed.spec.ts`.
- Help (EN). Q: "Can I show part of another note inside a note?" A: "Yes. Write a line with only ![[Note name#Heading]]
  (or ![[Note name]] for all of it). When you read the note, that section shows there as a quote with a link to it, and
  it follows any change to the other note. A locked note shows nothing of itself."
- What's new: "Notes: show a section of another note inside a note with ![[Note#Heading]]."
- Showcase: none (the Showcase notes' words are read by NOVA's pinned corpus). Today: nothing added.

### F5 A template for every note with a tag — LEDGER #362 (Logseq)

- Verdict: **built**.
- What: Notes → Notes → "Templates for tags" (a fold, lazy): each tag's template with New #tag note (makes a topic note
  "Meeting · Nov 22, 2026" with that tag and the words, and opens it), Change and Remove; "Add a template for a tag" (Tag,
  and "A new note with this tag starts with"; `{date}` becomes the day; at most 10). In the editor, a new, still empty
  note given a tag with a template in its Tags field starts from those words once ("Started from the #meeting template
  … Save keeps it."); nothing is written until Save. A tag under one with a template (#meeting/standup) uses the nearest.
- Files: new `lib/notes/tag-templates.ts`, new `components/notes/tag-templates.tsx` (lazy);
  `components/notes/note-editor.tsx`, `components/notes/notes-workspace.tsx`.
- Tests: `lib/notes/r5-tag-templates.test.ts`; stored round trip in `lib/notes/r5-stored.test.ts`. Spec: `tests/av2-notes-tag-templates.spec.ts`.
- Help (EN). Q: "Can a note with a tag start from a template?" A: "Yes. Notes → Notes → Templates for tags: set words on a
  tag such as #meeting. A new, empty note you give that tag starts from them once, and New #meeting note makes one at
  once. {date} becomes the day."
- What's new: "Notes: a template for every new note with a tag."
- Showcase: none. Today: nothing added.

### F6 Change a table in a note — LEDGER #363 (Craft)

- Verdict: **built**.
- What: while editing a note whose words hold a table, "Change a table" (beside Find and replace) opens a panel (focus on
  its first field; Esc or Close back to the button): the table (or one of several, chosen) as a grid of fields named by
  row and column, scrolling in its own region; Add a row, a named "New column" with Add a column; for a chosen row Move up,
  Move down and Remove row; for a chosen column Sort A to Z, Sort Z to A (numbers as numbers when every filled cell is
  one, else words with numbers in order; empty cells last; ties keep their order) and Remove column. Every change is
  written back into the words as a Markdown table (pipes in cells escaped), read by the same rules the reading view draws
  tables by, at most 20 columns and 100 rows; Save keeps the earlier words under Earlier versions.
- Files: new `lib/notes/table-edit.ts`, new `components/notes/note-table-edit.tsx` (lazy); `components/notes/note-editor.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r5-table-edit.test.ts`. Spec: `tests/av2-notes-table-edit.spec.ts`.
- Stored: nothing (the text stays Markdown).
- Help (EN). Q: "Can I change a table in a note without editing its Markdown?" A: "Yes. Edit the note and press Change a
  table. Its cells become fields; add or remove rows and columns, move a row, or sort by a column. It stays a Markdown
  table, and Save keeps the earlier words under Earlier versions."
- What's new: "Notes: change a table — rows, columns and sorting — without touching its Markdown."
- Showcase: none. Today: nothing added.

### F7 A note for a calendar event — LEDGER #364 (Craft)

- Verdict: **built**.
- What: under an imported event on the Agenda (day, week and month lists), "Notes for this event": the first tap makes a
  topic note "Fictional swim · 2026-11-04" (the event's title and day; "(2)" when that name is taken) whose words start
  with `[[2026-11-04]]`, so it is listed under that day's daily note among the notes that link there, and opens it. The
  event is kept in a note property ("Event": its calendar, id and day; round 3's properties), so later the event shows
  "Note: …", which opens the same note. A note moved to Recently deleted no longer counts (a tap makes a new one).
- Files: new `lib/notes/event-notes.ts`, new `components/agenda/event-note.tsx` (lazy); `components/agenda/agenda-days.tsx`,
  `components/agenda/agenda.css`.
- Tests: `lib/notes/r5-event-notes.test.ts`. Spec: `tests/av2-notes-event.spec.ts`.
- Stored: nothing new (a normal note with a property).
- Help (EN). Q: "Can I take notes for a calendar event?" A: "Yes. On the Agenda, an imported event has Notes for this
  event. It makes a note named after the event and its day, linked to that day's daily note. Tap it again later to open
  the same note."
- What's new: "Agenda: a note for an imported calendar event, linked to its day."
- Showcase: none (the Showcase imports no calendar). Today: nothing added.

### F8 Daily notes for a range of days — LEDGER #366 (Craft)

- Verdict: **built**.
- What: Notes → Files → "Daily notes from … to …" (a group under Export notes): From (the first daily note's day) and To
  (today), "3 daily notes in these days, with their photos.", and "Export these daily notes (.zip)": the same Markdown
  export (Daily/, front matter, links as written, photos in attachments/) for only those days, named
  `zigoals-daily-notes-<from>-to-<to>.zip` (with "example" for the Showcase). Locked notes stay out, as in the whole export.
- Files: `lib/notes/markdown.ts` (`dailyNotesBetween`, `dailyExportName`), `components/notes/notes-files.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r5-daily-range.test.ts`. Spec: `tests/av2-notes-daily-range.spec.ts`.
- Help (EN). Q: "Can I export only some days of my daily notes?" A: "Yes. Notes → Files → Daily notes from … to …:
  choose the first and last day and press Export these daily notes. You get a ZIP of those days as Markdown, with their
  photos, made on this device."
- What's new: "Notes: export the daily notes of the days you choose."
- Showcase: the Showcase's daily notes export as an example file. Today: nothing added.

### F9 A note's look — LEDGER #367 (Craft)

- Verdict: **built**.
- What: reading an open daily or topic note, "Look · a cover and a page colour" (a fold, lazy): Cover (None, or Photo 1…8
  of the note's own photos; with none, "Add a photo to this note first") and Page colour (None, Sand, Sage, Sky, Lilac,
  Rose, Stone — radio buttons with a swatch and the word). The reading view then shows the cover above the words (from
  this device's photo store) and the page as a light tint (13 %) over the theme's own background with the theme's own
  text colour, so contrast stays as the theme sets it in Nebula, Light and Dark (forced colours: the system's). The face
  says "Sage page, with a cover". The editor and every export stay as before.
- Files: new `components/notes/note-look.tsx` (lazy: the picker and the cover), `components/notes/note-editor.tsx`,
  `components/notes/notes.css`, `lib/notes/lock.ts` (`shownOf` drops `look`).
- Tests: `lib/notes/r5-look.test.ts`; stored round trip in `lib/notes/r5-stored.test.ts`. Spec: `tests/av2-notes-look.spec.ts`
  (axe's contrast check on the tinted page in all three themes).
- Help (EN). Q: "Can I give a note a cover or a colour?" A: "Yes. Open the note and choose Look: pick one of its own
  photos as a cover, and a calm page colour. It shows when you read the note."
- What's new: "Notes: a cover and a calm page colour for a note."
- Showcase: none. Today: nothing added.

### F10 Flashcards from notes — LEDGER #365 (Logseq)

- Verdict: **built**. Owner note followed: the schedule is written in code (an SM-2-style rule), no package, no model.
- What: a note line "question :: answer" (a space each side of `::`, so Logseq's `key:: value` is not one; not a heading;
  not in code; a list or tick-box marker is fine), or a line with `#card` whose answer is the indented lines under it, is
  a card. Notes → Notes → "Review cards" (a fold, lazy): "3 cards to look at today · 12 cards in your notes; the next ones
  come back Nov 24, 2026", Review cards, then one at a time — "Card 1 of 3 · from <note>", the question, Show the answer,
  then "How well did you know it?": Again · tomorrow, Hard · in 2 days, Good · in 3 days, Easy · in 9 days (each button
  says when it comes back); Stop for now at any time; "That is all for today." The gap grows with each good answer by an
  ease (2.5 to start; Again −0.2 and back to tomorrow, Hard −0.15, Easy +0.15; between 1.3 and 3.5; at most a year). At
  most 20 new cards a day. Plain words: no streak, no score, nothing "missed". A card from a locked, archived or inbox
  note, or one in Recently deleted, is never shown. A card keeps its review days while its question is unchanged.
- Files: new `lib/notes/cards.ts`, new `components/notes/notes-cards.tsx` (lazy), new `lib/av2-r5-notes-keys.ts`;
  `components/notes/notes-workspace.tsx`, `components/notes/notes.css`.
- Tests: `lib/notes/r5-cards.test.ts` (cards, schedule, due today, the record read on its own, the key lists; the export
  → erase → restore case runs once the key is registered). Spec: `tests/av2-notes-cards.spec.ts`.
- Stored: the new key `zigoals:note-cards:v1` (its own TIER 3 commit; registry lines above).
- Help (EN). Q: "Can I learn with flashcards from my notes?" A: "Yes. Write a line as question :: answer in any note, or
  end a line with #card and put its answer on the indented lines under it. Notes → Notes → Review cards shows the cards
  due today one at a time; say how well you knew each, and it comes back later — sooner if it was hard. At most 20 new a
  day; stop whenever you like. The review days stay on this device."
- What's new: "Notes: flashcards from your notes, on a gentle review schedule."
- Showcase: none (Showcase notes' words are read by NOVA's pinned corpus). Today: nothing added.

### F11 Files on a task — LEDGER #355 (Akiflow)

- Verdict: **built**. Owner note followed: files stay in IndexedDB on the device and open only on the person's tap in the
  browser's own viewer; older builds skip the kind they do not know.
- What: a task's editor has "Files" under its photos and voice notes: Add a file (several at once; up to 10 on a task,
  10 MB each, 100 MB for every task's files together), each with its name, size and day and "opens in the browser" or
  "saved to open". A tap opens a PDF, a picture (PNG, JPEG, WebP, GIF, AVIF), a text file (shown as plain text whatever
  its type), sound or film in the browser's own viewer in a new tab; any other file (a Word file, a sheet, HTML, SVG …)
  is saved as a download, never shown as a page of this site. Remove, with Undo in the message (the same file is put
  back). Tasks → "Files" (a header link) opens every task's files: "2 files on your tasks, 820 kB of 100 MB on this
  device", a search by file or task name, Open task, Remove with Undo. A file dropped on the Tasks page (one carrying
  files; moving a task by drag is untouched) makes an Inbox task named after the file holding it ("An Inbox task holds
  the file"; up to 10 at once). Kept in the existing database; in Export everything as files; erased with it; the orphan
  sweep removes a file 30 days after its task is gone.
- Files: `lib/tasks/attachments.ts` (the `file` kind, `cleanFileName`, `openWay`, `sizeWords`, `fileCounts`, the export
  name), new `components/tasks/task-files.tsx` (lazy: `TaskFiles`, `FilesView`, `openTaskFile`, `keepTaskFile`),
  `components/tasks/task-editor.tsx`, `components/tasks/tasks-page.tsx`, `components/tasks/task-attachments.tsx`,
  `components/tasks/task-attachments.css`.
- Tests: `lib/tasks/r5-task-files.test.ts`. Spec: `tests/av2-task-files.spec.ts`.
- Stored: the `file` kind (its own TIER 3 commit; restore lines above).
- Help (EN). Q: "Can I keep a PDF or a document with a task?" A: "Yes. Open the task and press Add a file under Files, or
  drop a file on Tasks to make an Inbox task with it. A PDF, a picture or a text file opens in the browser; other files
  are saved so you can open them in their own app. Tasks → Files lists every task's files. They stay in this browser
  only, never uploaded or synced; Export everything includes them."
- What's new: "Tasks: files on a task — PDFs and documents — and every task's files in one list."
- Showcase: none (the Showcase keeps no attachments on purpose). Today: nothing added.

### NOVA's and ZIGi's answers (all features)

- `lib/ai/local-answers/av2-r5-notes.ts` (`av2R5NotesAnswer`), EN and NL: Recently deleted (counted; names only of notes
  not locked; never their words), several notes at once, mentions without a link, embedding a section, templates for
  tags (the tags listed, never the words), tables, a note for an event, daily notes for a range, a note's look, cards
  (counted by note, never quoted; never from a locked note), files on a task. Notes only under NOVA's Notes scope (ZIGi
  says it does not read notes; the how-to answers need no notes).
- Cases: `lib/ai/evals/as/cases-av2-r5-notes.ts` (`AV2_R5_NOTES`, 11 intents, 44 questions). Test:
  `lib/ai/local-answers/av2-r5-notes.test.ts` (every case in both languages from NOVA and ZIGi; the answer of its own
  intent; other questions left alone; no question of today's CORPUS answered here).
