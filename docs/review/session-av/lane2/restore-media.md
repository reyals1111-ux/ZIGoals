# Lane 2: Restore brings the photos and voice notes back (slug `restore-media`, branch `lane2/restore-media`)

Review finding lane2-b1 #18 (docs/review/session-av/quality/lane2-b1.md row 18; revb1.md "### #18"). The lead gave
permission, for this task only, to edit lib/restore/* and components/restore/*; the one other shared line changed is the
journal's Export everything note in lib/export/make-everything.ts, which the task named.

## #18 Restore puts the media files back

- Verdict: built.
- What comes back (Settings → Your data → Restore from a backup, a new choice under Photos, off until ticked): every file
  of an Export everything ZIP in these folders, into the IndexedDB store it came from:
  - `tasks/attachments/…` → task photos and voice notes (`zigoals-task-attachments-v1`);
  - `journal/photos/…`, `journal/audios/…` → the journal's photos and audio notes (`zigoals-journal-media-v1`; an audio
    note gets back the length its entry keeps);
  - `notes/photos/…` → note photos (`zigoals-notes-photos-v1`);
  - `money-photos/…` → receipt photos on spending entries, also the business space's (`zigoals-money-photos-v1`);
  - `meal-photos/…` → kept meal-estimate photos (`zigoals-meal-photos-v1`);
  - `food-photos/…` → package photos on library foods (`zigoals-food-photos-v1`);
  - `wealth-docs/…` → documents kept with an account (`zigoals-wealth-docs-v1`; its name comes back as the ZIP shortened
    it, "Bank statement" for "Bank statement.pdf").
- The rules:
  - Each file goes back under the id its record keeps, only when that record is on this device after the parts were
    written (the task, journal entry, note, spending entry, estimated meal, food or account that names it). A task file is
    matched by its task's title as Export everything wrote it; two tasks whose titles read alike are not guessed.
  - Only an id the store does not hold is added; nothing is ever overwritten (every key of the scope counts, whether its
    value reads or not).
  - The scope the stores use (`photoScope()`: this account, or the local person; a restore never runs in the Showcase).
  - Each store's own write is used, so its schema, per-file size and count caps hold (200 kB photos, 1.5 MB task voice
    notes, 3 MB journal audio, 2 MB documents; 10 per task, 300/400/500/200 per scope). A file larger than its store keeps
    is never read; one whose bytes are not the photo (header, image caps), recording (WebM, Ogg, MP4 container) or PDF its
    name says is skipped; a full store refuses. Each is counted; none ever stops the restore. A store this browser cannot
    open (no IndexedDB, or a database a newer build moved to another version) is counted and never touched.
  - A stop or an account change ends the run like the other photos; what was added until then is in the undo record.
- The preview counts, before anything changes: "Add the missing photos, voice notes and documents (5 in the file: 2 on
  tasks, 2 in the journal, 1 on notes)", with "Each one comes back under the id its record keeps, once that record is on
  this device: restore its part too (Tasks, Journal, Notes, Spending…), or it is already here. One this browser already
  has is left as it is, and Undo removes only the ones this restore added." What does not come back is said: "Not put
  back: 1 that no task, journal entry, note or other record names, and 1 larger than ZIGoals keeps. They stay in the ZIP
  to open yourself." A browser that cannot keep them: "This browser cannot keep photos or voice notes (its storage for
  them is off, as in some private windows), so the N files of tasks, the journal and notes in this backup stay in the ZIP
  to open yourself." After the restore: "Photos, voice notes and documents put back: 3. Not added: 1 already here; 1 that
  no record on this device names (restore its part, then restore again)." (plus "too large, damaged or over its store’s
  limit" and "whose store this browser could not open"). The restore screen has no Dutch, so EN only.
- The honest notes revb1 added are updated: the preview's not-restored note now names only what sits in other folders
  ("This file also holds N photos and recordings in folders Restore does not read, so they stay in the ZIP to open
  yourself."); Export everything's journal note (`JOURNAL_MEDIA_EXPORT_NOTE`) now reads "The journal’s photos and voice
  notes are in the file’s journal folder. Restore from a backup puts them back into this browser for the entries that name
  them, as it does for the photos and voice notes of tasks and notes; Journal → Import and export also moves a journal with
  its photos and voice notes." (tests/revb1-journal-media-export.spec.ts reads the constant, so it follows.)
- Files: `apps/web/lib/restore/media-dbs.ts` (new: the seven database names and their object stores, MEDIA_ENTRY, and the
  small key reader/deleter Undo uses, no store module loaded), `apps/web/lib/restore/media.ts` (new, loaded only when a
  restore or its preview needs it: matching, checks, the writes), `lib/restore/apply.ts` (the `media` choice, step,
  preview and Undo), `lib/restore/read-backup.ts` (`media` entries; `notRestored` now only other folders),
  `components/restore/restore-backup.tsx` (choice, counts, notes), `lib/export/make-everything.ts` (the journal note).
- Stored change (TIER 3 stored formats, its own commit e5e31f6c): the restore's undo record `zigoals:restore-undo:v1`
  (version 1, strict, device-only, never synced or exported) gains a fifth step kind
  `{kind: 'media', db: <one of the seven names>, scope, ids: string[] (≤ 5000, each 1..200)}`, one per database the
  restore added to. Additive: every record an earlier build wrote still reads (its four kinds are unchanged; unit test).
  Unknown step kinds are handled the way the record already handles them: the strict schema does not read a record with a
  kind it does not know, so that build offers no Undo for it and removes the record (as `erase` does for builds before
  Session AL); nothing a restore wrote is touched. So a build before this one, opening a record with a `media` step,
  offers no Undo and leaves the added files in place (each named by its record); a media step naming any other database is
  refused the same way. No new key, no catalogue, device-key, export or erase change (the seven databases are already
  listed for Erase everything). The media stores' own value formats are unchanged: each file is written through its
  store's own put.
- Tests: `apps/web/lib/restore/av2-restore-media-undo.test.ts` (the media step's Undo after a reload removes exactly its
  ids in its scope; a record whose files are all gone is removed; an earlier build's record still reads and undoes; a
  newer build's unknown kind leaves no Undo, removes the record, touches nothing; the key reader/deleter),
  `apps/web/lib/restore/av2-restore-media.test.ts` (the real Export everything → erase → restore brings back a task photo
  and voice note, a journal photo and audio note and a note photo with their ids, bytes, task and length; without the
  choice nothing comes back; a file with no record on this device is counted; an id already here is not overwritten; Undo
  after a reload removes only added ids, also not a file added later or another scope's; a damaged and an oversize file
  are skipped and counted; a store a newer build moved is counted; receipts, meals, foods and documents found by their
  records; two tasks titled alike not guessed; the plain notes). Deliberate change, labelled, equally strict:
  `apps/web/lib/journal/revb1-media-export.test.ts` (the journal files are now in `media`, `notRestored` is 0, the new
  note's exact words).
- Spec (lead runs): `apps/web/tests/av2-restore-media.spec.ts` — "Export everything → erase → restore brings back the
  task, journal and note photos and voice notes; Undo removes exactly those" and "a file already here is never
  overwritten, one whose record is not on this device stays in the ZIP, and Undo leaves what it did not add".
- Left, with cause: none of the stores is left out. A task voice note's length is not in the ZIP (the export writes only
  the file), so it is read back from the recording by the browser; when the browser cannot tell within 1.5 s (often for
  a WebM recording) it shows 0:00 beside the player, which still plays it whole — changing the export to carry it is the
  lead's (lib/export registries, against a named rule for this task).
- Help (EN), for the lead (help-page.tsx):
  - `export-everything` ("Can I get all my data out?"), replace "“Restore from a backup” reads it back: you see what it
    holds, choose per part to merge or replace, and can undo." with: "“Restore from a backup” reads it back: you see what
    it holds, choose per part to merge or replace, and can undo. It also puts the photos, voice notes and documents of
    tasks, the journal, notes, spending entries, meals, foods and accounts back into this browser."
  - `ab-restore` ("How do I restore from a backup?"), add: "Tick “Add the missing photos, voice notes and documents” to
    put the files back too. Each comes back for the task, entry or note that names it, once that record is on this
    device, and never over one already here; the preview counts what comes back and what stays in the ZIP, and Undo
    removes only the ones it added."
  - `ab-photos` ("Do my photos sync?") already says Restore brings photos back: true now for every kind.
- What's new: "Restore from a backup now brings back the photos and voice notes of tasks, the journal and notes."
- Answers wiring for engine.ts: none (no new stored data NOVA or ZIGi reads).
- Showcase: none (a restore never runs in the Showcase).
- CSS: none (existing `fine`, `checkbox`, `rb-*` classes; two new class hooks `rb-media-left`, `rb-media-result` with no
  rules). Nothing on Today. Route weights: the Restore panel is already lazy; `media.ts` and the stores load only on a
  picked file or a restore.
- For the lead: the comment above `mealPhotoFileName` in lib/meal-estimates/photos.ts ("Restore does not read meal photos
  back (Help and docs/PRIVACY.md say so)") is now out of date (not my file); "Test a backup" (lib/restore/test-restore.ts)
  still counts only vision and progress photos in its `photos` number.
