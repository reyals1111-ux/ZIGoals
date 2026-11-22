# Lane 2 registry: round 6, notes that stay tidy and Sanne's journal (`lane2/r6-notes`)

Builder: the round-6 notes builder, on `lane2/batch5` (rounds 1–5 of lane 2 included). Scope: LEDGER "Round 6" groups
W2 (#399, #402, #405, #407, #408; Capacities) and W3 (#400, #401, #403, #404, #406, #409, #410; Diarium), and the
Capacities and Diarium rows of COMPETITORS.md round 6. The Notes and Journal registries before this one (`journal.md`,
`r3-notes.md`, `r4-notes.md`, `r4-mind.md`, `r5-notes.md`, `revb3c.md`) are built on, never repeated.

Rules that stand, kept everywhere here:
- Notes' marks never reach ZIGi's replies: nothing was added to `lib/ai/safe-render.ts`.
- A locked note shows nothing of itself anywhere: Rename tag changes a locked note's #tag but only counts it ("1 of them
  is locked: changed, not shown"); a locked note is never merged, into or from (its links are re-pointed silently and
  counted); Set a property leaves a locked note as it is; the property list in Select is built from `shownOf` notes, so a
  locked note's property names are never offered; the table's sums read `shownOf` rows, so a locked note never counts;
  a locked daily note keeps its read-back mark only (`shownOf` keeps `readBack`, drops the words); NOVA's answers read
  `readableNotes` only.
- Sealed letters stay folded (`isSealed`): a folded letter shows and finds none of its people, its photos stay out of
  the gallery, and On this day for any day leaves it out, as today's does.
- Recently deleted never drops a note: a merged note goes to Recently deleted through `toTrash`, which refuses in words
  when it is full; nothing is merged then.

Baseline check (docs/STATUS.md "Current accepted baseline", the brief's protected areas): nothing protected is touched.
Layout changes: the Notes table gains a `tfoot` row (#408); the Tags fold gains a nested fold (#399); Days gains a fold
(#402); the Journal's Entries panel gains four folds (word goal, sun and moon, photos) and a person line under each entry
(#401); On this day gains a row of arrows (#403). None is in the protected baseline. **Today: nothing added, nothing
always visible** (the word-goal line shows only in the Journal page's Write, never in Today's compact Write).

## Summary

| LEDGER row | verdict | feature |
|---|---|---|
| #399 Capacities Rename or merge a tag | built | F1 |
| #402 Capacities Daily notes marked as read back | built ("the calendar" is Notes → Days, the daily notes' list; Notes has no calendar of its own) | F2 |
| #405 Capacities A property changed on several notes at once | built | F3 |
| #407 Capacities Merge two notes | built | F4 |
| #408 Capacities Sums under a table of notes | built | F5 |
| #400 Diarium A daily word goal | built | F6 |
| #401 Diarium People in an entry | built | F7 |
| #403 Diarium On this day for any day | built | F8 |
| #404 Diarium Every photo and voice note in one place | built | F9 |
| #409 Diarium Sunrise, sunset and the moon on the day | built; **weather Carried: needs an outside service** | F10 |
| #410 Diarium Imports from more journal apps | built (Journey and CSV) | F11 |
| #406 Diarium Lock again after a while away | built, as the existing screen cover re-engaging (no new key material, crypto or auth change) | F12 |

## Commits

| sha | what |
|---|---|
| `7e8d9553` | TIER 3 (stored formats): note `readBack`, journal `wordGoal`, entry `people`, import sources `journey`/`csv`, the On this day record's `sky` |
| `e366bc07` | W2: #399, #402, #405, #407, #408 (one commit: they share the Notes list, the editor and the Select bar) |
| `ffa9b5db` | W3 journal: #400, #401, #403, #404, #409, #410 |
| `a43bdb4d` | TIER 3 (stored formats): the new key `zigoals:device-lock-away:v1` and its registry module (#406) |
| `c8875f22` | TIER 3 (auth: the device lock): #406 in the gate and the lock's settings |
| `97778eeb` | NOVA's and ZIGi's answers (all rows) |
| `41021f15` | this registry |

Checks: typecheck (through the shared lock) clean after W2, after W3 and on the final head; eslint clean on every changed
file; unit tests green for `lib/notes`, `lib/journal`, `lib/on-this-day`, `lib/av2-r6-notes-keys.test.ts`,
`lib/erase-coverage.test.ts`, the device-key tests and the new answers. **Found, not mine:** on `lane2/batch5`
`lib/ai/local-answers/av2-r5-notes.test.ts` ("no question of today's corpus is answered here") is red: round 5's own
intents are in CORPUS now and that test does not leave them out (mine does, as the task asked). Its fix is one line
(`if (!OWN.has(c.id))`, as in `av2-r6-notes.test.ts`); the lead's call. The same holds for
`lib/ai/local-answers/av2-r4-mind.test.ts` ("no question of the existing corpus is claimed", round 4's own intents).

## For the lead (shared files this branch does not edit)

1. **Engine wiring** (`lib/ai/local-answers/engine.ts`, line ~278, the `!subject` chain): `import {av2R6NotesAnswer} from
   './av2-r6-notes';` and try `av2R6NotesAnswer(question, env)` first, before `av2R5NotesAnswer`. Corpus: add
   `...AV2_R6_NOTES` from `lib/ai/evals/as/cases-av2-r6-notes.ts` (12 intents, 48 questions, EN and NL) to `CORPUS` and
   record `expected.json`. Checked here: it answers no other question of today's corpus. Its questions were worded so
   round 5's `several` and `tables` answers do not take them; please check the order once with the whole engine.
2. **New device key (#406)** `zigoals:device-lock-away:v1`, a display key that follows the lock (the lock itself is a
   display key in `lib/ah-device-keys.ts`, not exported): spread `AV2_R6_NOTES_DISPLAY_KEYS` from `lib/av2-r6-notes-keys.ts`
   into onboarding's `NON_PERSONAL_KEYS` (`lib/onboarding.ts`, beside `AH_DISPLAY_KEYS`); **not** into Export everything,
   the catalogue or the restore plan (as the lock); "Erase everything" removes it by prefix; the account erase leaves it,
   as it leaves the lock. `lib/erase-coverage.test.ts` `NOT_RECORDS` now spreads `AV2_R6_NOTES_NOT_RECORDS` (its reason;
   a labelled deliberate change, equally strict: the key must still be in the code). The tab's
   `zigoals:device-lock:away-since` is sessionStorage beside `zigoals:device-lock:unlocked` (not matched by the key scan,
   gone with the tab). Frozen-reader fixture: no change needed (no record format of a frozen reader changed shape).
3. **Specs for the shard lists** (none run here): `tests/av2-notes-tidy.spec.ts` (3 tests × 3 themes),
   `tests/av2-journal-diarium.spec.ts` (2 × 3), `tests/av2-lock-away.spec.ts` (1 × 3).
4. **Help and What's new**: each feature's Q+A (EN) and label are below, for `help-page.tsx`.
5. **Search palette** (optional, `lib/search/static.ts`): "Rename a tag", "Merge tags" → `/app/notes?view=notes`;
   "Not read back yet" → `/app/notes?view=days`; "Word goal" → `/app/journal#journal-word-goal`; "Journal photos",
   "Every photo" → `/app/journal#journal-photos`; "Sunrise", "Moon" → `/app/journal#journal-sky`; "Import from Journey",
   "Import a CSV" → `/app/journal`; "Lock again after a while away" → `/app/settings#device-lock`.
6. **Route weight** (not measured; no build here; please check `/app/notes`, `/app/journal`, `/app/settings` and the
   shell): lazy chunks — Rename or merge a tag, Not read back yet, Merge into…, the photos grid, the word goal (line and
   settings), Who was there, the sun and moon (line and settings), Lock again after a while away. First chunks gained:
   Notes — `lib/notes/read-back.ts` (two small functions), a Read back button, a few fold summaries; `lib/notes/bulk.ts`
   **left** the first chunk (`cleanTag` moved to `lib/notes/clean-tag.ts`, which the tag templates read); `columnSum`
   lives in its own module in the lazy views chunk. Journal — `lib/journal/people.ts` and `lib/journal/gallery.ts`
   (small, pure), On this day's arrows (its chunk is lazy already), the calendar's mark (lazy chunk). The shell's
   `DeviceLockGate` gains one effect and `lib/device-lock-away.ts` (≈1 kB; zod is in that chunk already).
7. **CSS touched** (the lead regenerates the theme sheets if they gather these): `components/notes/notes.css`,
   `components/journal/journal.css`, `components/journal/on-this-day.css`. Theme variables and `color-mix` only.
8. **Showcase**: none added. Showcase notes' and entries' words are read by NOVA's pinned corpus, and a Showcase read-back
   mark, person or word goal would move answers and counts other tests pin. The features show their teaching empty states
   in the Showcase.
9. **Files outside Notes and the Journal I edited** (none on the brief's shared list): `components/device-lock.tsx` (the
   gate's effect, the settings' lazy part), `lib/erase-coverage.test.ts` (one labelled line, above).

## Stored changes (TIER 3 stored formats; all additive, optional, dropped when unreadable, on loose objects)

| record | field | what |
|---|---|---|
| `zigoals:notes:v1` note | `readBack` | the day a daily note was read back (`YYYY-MM-DD`), `.catch(undefined)` (#402) |
| `zigoals:journal:v1` | `wordGoal` | words a day, 10–5,000, `.catch(undefined)` (#400) |
| journal entry | `people` | up to 8 typed names of ≤ 40 characters; an unreadable name is dropped, the rest kept (#401) |
| journal entry | `imported` | two new source words, `journey` and `csv`; an older build reads them as absent (`.catch(undefined)`) (#410) |
| `zigoals:journal-display:v1` | `sky` | `{city?, lat?, lon?, name?, off?}` — the place for sunrise and sunset (#409) |
| **new key** `zigoals:device-lock-away:v1` | `{version: 1, minutes: 5 \| 15 \| 60}` | how long ZIGoals may be hidden before the screen cover asks again; display key, never synced or exported (#406) |
| sessionStorage `zigoals:device-lock:away-since` | a time (ms) | when this tab went hidden; gone with the tab (#406) |

Export everything → erase → Restore keeps `readBack`, `wordGoal`, `people`, `imported` and `sky`
(`lib/journal/r6-stored.test.ts`); the journal's own ZIP carries `people` out (journal.json `zigoals.people`, Markdown
`people: [...]`) and back in.
**Rollback limits.** An older build keeps every field above untouched (the records are loose) except `imported: journey
/ csv`, which it reads as absent and drops when it next writes that entry (the entry itself is kept). It shows no
people, no read-back mark and no goal. The lock's time away is never read by an older build: its cover asks only in a
new tab, as before. **For the lead:** please carry these into docs/STATUS.md's stored-format notes.

## Features

### F1 Rename or merge a tag — LEDGER #399 (Capacities)

- Verdict: **built**.
- What: Notes → Notes → Tags → "Rename or merge a tag" (a fold, lazy): Tag (every tag, with its notes), "New name" with
  a live line ("#trip becomes #journeys in 2 notes (1 locked, changed but not shown)") and Rename tag, and "Merge into"
  (another tag) with Merge into #…. Every note's `#old` in its words (never inside code) and in its Tags field changes,
  with the tags nested under it (`#old/sub` → `#new/sub`); a note never holds a tag twice after a merge. The earlier
  words of each changed note are kept under Earlier versions; one Undo in the message puts every note, the tag templates
  and the focus back. The old tag's template follows it (unless the new tag has its own; then both stay and it says so),
  and so does the focus. Refused in words: no letter, the same name, a tag under itself, a tag no note carries any more.
  Notes in Recently deleted keep their words as deleted.
- Files: new `lib/notes/tag-rename.ts`, new `components/notes/tag-rename.tsx` (lazy), new `lib/notes/clean-tag.ts`;
  `lib/notes/store.ts` (`NotesUndo.also`), `lib/notes/bulk.ts`, `lib/notes/tag-templates.ts`,
  `components/notes/notes-workspace.tsx`, `components/notes/tag-templates.tsx`, `components/notes/notes.css`.
- Tests: `lib/notes/r6-notes.test.ts` (#399). Spec: `tests/av2-notes-tidy.spec.ts` (rename and Undo).
- Help (EN). Q: "Can I rename a tag, or merge two tags?" A: "Yes. Notes → Notes → Tags → Rename or merge a tag: choose
  the tag, then give it a new name, or merge it into another tag. Every note changes at once, in its words and its Tags
  field, with the tags nested under it. The earlier words stay under Earlier versions, and Undo puts everything back."
- What's new: "Notes: rename or merge a tag across every note, with one Undo."

### F2 Daily notes read back — LEDGER #402 (Capacities)

- Verdict: **built**.
- What: reading a daily note, "Read back" (a toggle; "Read back Nov 22" once pressed; Undo in the message). The day keeps
  a quiet mark: "Read back on Sunday, Nov 22, 2026." in its This day strip, and "· read back" in Notes → Days. Notes →
  Days → "Not read back yet" (a fold, lazy; its summary counts them) lists the daily notes of the 30 days before today that
  hold words and are not read back, oldest first, each opening its day, with "Mark read back". A locked daily note is
  listed by its day and "Locked: it shows after your PIN." only. Reading back does not change the note's "changed" time.
  Never counted against the person.
- Files: new `lib/notes/read-back.ts`, new `components/notes/read-back-list.tsx` (lazy); `lib/notes/schema.ts`,
  `lib/notes/store.ts`, `components/notes/note-editor.tsx`, `components/notes/this-day-strip.tsx`,
  `components/notes/notes-workspace.tsx`.
- Tests: `lib/notes/r6-notes.test.ts` (#402); `lib/journal/r6-stored.test.ts`. Spec: `tests/av2-notes-tidy.spec.ts`.
- Help (EN). Q: "Can I mark a daily note as read back?" A: "Yes. Open the day's note and press Read back; the day keeps a
  quiet mark in Days. Notes → Days → Not read back yet lists the daily notes of the last 30 days you have not read back,
  oldest first. Nothing is counted against you."
- What's new: "Notes: mark a daily note as read back, and see the days not read back yet."

### F3 A property on several notes at once — LEDGER #405 (Capacities)

- Verdict: **built** (on round 5's Select, #359).
- What: Notes → Notes → Select → "Set a property · on every chosen note": Property (the names in use offered; a known
  name takes its type), Type (Text, Number, Day, Choice, Tick), Value (or Ticked), Set property and Remove property, in
  the bar's one Undo. A note with ten properties already and a locked note are left as they are and counted ("1 changed;
  2 left as they were (1 holds ten properties already, 1 is locked)"). A name ZIGoals uses itself or a value that does
  not fit is refused before anything changes.
- Files: `lib/notes/bulk.ts` (`prop-set`, `prop-remove`), `components/notes/notes-select.tsx`, `components/notes/notes.css`.
- Tests: `lib/notes/r6-notes.test.ts` (#405). Spec: `tests/av2-notes-tidy.spec.ts`.
- Help (EN). Q: "Can I give several notes the same property?" A: "Yes. In Notes → Notes, press Select and tick the notes.
  Under Set a property, give the name, type and value, then Set property, or Remove property. Undo puts them all back. A
  note that has ten properties already, or a locked note, stays as it is."
- What's new: "Notes: set or remove a property on several notes at once."

### F4 Merge two notes — LEDGER #407 (Capacities)

- Verdict: **built**, nothing lost.
- What: a topic note's "Merge into…" (lazy panel; focus on its choice; Esc or Cancel back to the button): choose any other
  daily or topic note that is not locked. The panel says what moves and how many links follow, or why it cannot happen.
  Merge: its words go under the other's, below `## <its name>`; its kept tags, photos and properties are added where the
  other has none; a property the other has with another value (or one past ten) is written as a line under "Properties
  it had:" in the merged words; every [[link]] to it — in any note, a locked one too, and a board card — points at its
  heading in the other note (`[[Other#Its name]]`, `![[Other#Its name]]`, aliases and headings kept). The other note's
  earlier words are kept as a version, and the merged note waits 30 days in Recently deleted, whole, with its own
  versions. One Undo puts both notes, every re-pointed note and the boards back. Refused in words: more than eight photos
  or twelve kept tags together, or too long; a locked note; a daily note or a capture as the one merged.
- Files: new `lib/notes/merge.ts`, new `components/notes/note-merge.tsx` (lazy); `components/notes/note-editor.tsx`,
  `components/notes/notes-workspace.tsx` (opens the note it went into), `components/notes/notes.css`.
- Tests: `lib/notes/r6-notes.test.ts` (#407). Spec: `tests/av2-notes-tidy.spec.ts` (merge and Undo).
- Help (EN). Q: "Can I merge two notes?" A: "Yes. Open a topic note and press Merge into…, then choose the other note.
  Its words go under the other's with its name as a heading; its tags, photos and properties join, and links to it
  follow. It waits 30 days in Recently deleted, and Undo puts both back. A locked note is never merged."
- What's new: "Notes: merge one note into another — nothing is lost, and Undo puts both back."

### F5 Sums under the notes table — LEDGER #408 (Capacities)

- Verdict: **built**.
- What: Notes → Notes → Table: under each Number column, "Sum 400" and "Average 200" (with "· 2 with a value" when some
  notes have none), under each Tick column "1 of 3 ticked", and the Words column added up; for the notes shown (after the
  filters). Shown whenever a Number or Tick column is. A locked note comes in with no properties, so it never counts.
- Files: new `lib/notes/table-sums.ts`; `components/notes/notes-views.tsx`, `components/notes/notes.css`.
- Tests: `lib/notes/r6-notes.test.ts` (#408). Spec: `tests/av2-notes-tidy.spec.ts`.
- Help (EN). Q: "Can the notes table add up a column?" A: "Yes. In Notes → Notes → Table, each Number property shows its
  sum and average under its column, and a Tick property how many are ticked, for the notes shown after your filters."
- What's new: "Notes: sums and averages under the table's number columns."

### F6 A daily word goal — LEDGER #400 (Diarium)

- Verdict: **built**.
- What: Journal → Entries → "Daily word goal" (a fold, lazy): Words a day (10–5,000), Set or Change the goal, No goal.
  While a goal is set, Write (on the Journal page; not Today's card) says "140 of 200 words today." as the entry is typed
  (today's saved words plus the words being written), then "230 words today: your 200 are written." Never a warning.
  The journal calendar marks the days it was met (a quiet line under the day, "word goal met" in its name) and says
  "written on 5 days, 3 days with your 200 words".
- Files: new `lib/journal/word-goal.ts`, new `components/journal/journal-word-goal.tsx` (lazy: the line and the setting);
  `components/journal/journal-compose.tsx`, `components/journal/journal-calendar.tsx`, `components/journal/journal-page.tsx`,
  `components/journal/journal.css`.
- Tests: `lib/journal/r6-journal.test.ts` (#400); `lib/journal/r6-stored.test.ts`. Spec: `tests/av2-journal-diarium.spec.ts`.
- Help (EN). Q: "Can I set a word goal for my journal?" A: "Yes. Journal → Entries → Daily word goal: choose how many
  words a day. While you write, today's words show beside it, and the calendar marks the days you reached it. Nothing is
  said on a day you do not."
- What's new: "Journal: a daily word goal, shown calmly while you write."

### F7 Who was there — LEDGER #401 (Diarium)

- Verdict: **built**. Owner note followed: names are typed; nothing reads the device's contacts.
- What: under each entry, "Who was there" (lazy; a short field offering the names used before; Esc or Cancel back to the
  button): up to eight names, each a button "Entries with Anna" that filters the list ("Entries with Anna. Show every
  entry"), and × to take one off (focus to the next name). The journal search finds a name as a word ("anna" finds Anna
  de Vries; "ann" does not). A letter still folded away shows and finds none of its names. In the e-book ("With Anna,
  Bram"), the Markdown export (`people: [...]`) and journal.json (`zigoals.people`), and read back in by Import.
- Files: new `lib/journal/people.ts`, new `components/journal/entry-people.tsx` (lazy); `lib/journal/search.ts`,
  `lib/journal/export.ts`, `lib/journal/import.ts`, `lib/journal/ebook.ts`, `components/journal/journal-page.tsx`,
  `components/journal/journal.css`.
- Tests: `lib/journal/r6-journal.test.ts` (#401); `lib/journal/r6-stored.test.ts` (export and import). Spec:
  `tests/av2-journal-diarium.spec.ts`.
- Help (EN). Q: "Can I note who was there in an entry?" A: "Yes. Under an entry, press Who was there and type a name; the
  names you used before are offered. A name opens every entry with that person, and the search finds it. Names are only
  what you type; nothing is read from your contacts."
- What's new: "Journal: who was there, on each entry."

### F8 On this day for any day — LEDGER #403 (Diarium)

- Verdict: **built**.
- What: the Journal's On this day has a row of arrows (the day before, the day after; "Back to today"). Another day shows
  that date in the years before it ("A year earlier", "3 years earlier"), nearest first; with none it says "Nothing
  written on Nov 21 in the years before." and stays open. A day chosen on the journal calendar (or a photo, or a [[day]]
  link) opens On this day on that date. Today keeps its year, month and week ago as before; when today has nothing the
  card waits as before. Entries set aside and letters still folded away stay out.
- Files: `lib/on-this-day/throwback.ts` (`onDate`), `components/journal/on-this-day.tsx`, `components/journal/journal-page.tsx`,
  `components/journal/on-this-day.css`.
- Tests: `lib/journal/r6-journal.test.ts` (#403). Spec: `tests/av2-journal-diarium.spec.ts`.
- Help (EN). Q: "Can I see On this day for another date?" A: "Yes. Use the arrows on On this day, or choose a day on the
  calendar under Search by date: you see what you wrote on that date in the years before. Back to today returns."
- What's new: "Journal: On this day for any date, a day at a time."

### F9 Every photo and voice note in one place — LEDGER #404 (Diarium)

- Verdict: **built**.
- What: Journal → Entries → "Photos and voice notes" (a fold, lazy; its summary counts them): every photo of the entries
  as a grid (newest first, with its day) and every voice note as a tile; Journal (when there are several), Year and Show
  (both, photos, voice notes) narrow it; 48 at a time with "Show 48 more" (focus to the first new tile). A tap opens that
  day's entries in the list. A letter still folded away keeps its photos folded until its day. A photo not in this
  browser says so. Empty: it teaches where photos come from.
- Files: new `lib/journal/gallery.ts`, new `components/journal/journal-photos.tsx` (lazy); `components/journal/journal-page.tsx`,
  `components/journal/journal.css`.
- Tests: `lib/journal/r6-journal.test.ts` (#404). Spec: `tests/av2-journal-diarium.spec.ts` (the empty state).
- Help (EN). Q: "Where can I see all the photos in my journal?" A: "Journal → Entries → Photos and voice notes shows
  every photo and voice note of your entries, newest first. Choose a journal or a year, and tap one to open its day."
- What's new: "Journal: every photo and voice note in one place."

### F10 Sunrise, sunset and the moon — LEDGER #409 (Diarium)

- Verdict: **built**; **Carried part: the weather of a day — needs an outside service.** Owner note followed: computed in
  code, nothing is looked up.
- What: each entry's "That day" starts with "🌔 Sunrise 08:14 · sunset 16:41 in Amsterdam · Waxing gibbous, 92% lit."
  (the mark is hidden from screen readers). Journal → Entries → "Sun and moon on a day" (a fold, lazy): Place — the city
  of this device's time zone (the default), one of 40 built-in cities, "A latitude and longitude I type" (checked in
  words; times in this device's time zone), or None. The sunrise equation (equation of centre, −0.833° for refraction and
  the disc) and the moon's age from a known new moon and the mean synodic month; times good to a few minutes, said so; the
  midnight sun and the polar night are said as such. Weather is not shown, and the setting says why.
- Files: new `lib/journal/sky.ts`, new `components/journal/entry-sky.tsx` (lazy: the line and the setting);
  `lib/on-this-day/store.ts` (`sky`), `components/journal/journal-page.tsx`, `components/journal/journal.css`.
- Tests: `lib/journal/r6-journal.test.ts` (#409: Amsterdam in November and June within 5 minutes; Svalbard's midnight sun
  and polar night; the full moon of 24 November 2026). Spec: `tests/av2-journal-diarium.spec.ts`.
- Help (EN). Q: "Can my journal show sunrise, sunset and the moon?" A: "Yes. Open That day under an entry: it shows the
  day's sunrise and sunset and the moon's phase. They are worked out on this device for the city of your time zone, or a
  place you choose under Journal → Sun and moon on a day; nothing is looked up. The weather is not shown."
- What's new: "Journal: sunrise, sunset and the moon on each day, worked out on your device."

### F11 Imports from Journey and a CSV — LEDGER #410 (Diarium)

- Verdict: **built**. Owner note followed: nothing in a file runs; read under the ZIP caps; a plan first and one Undo.
- What: Journal → Import and export → Choose files to import also takes Journey's export (its ZIP: one JSON per entry
  with `text` in HTML or Markdown, `date_journal`, its `timezone`, `tags`, `photos` beside it, `favourite`; or the JSON
  alone) and a CSV (a row per entry: date, words, tags; the columns found by a header in English or Dutch — date/datum,
  text/tekst/entry, tags/labels — or read as date, text, tags; commas or semicolons; quoted cells and line breaks;
  2026-11-03, 3-11-2026 or 3 November 2026). Each entry keeps its day in its own zone, its words (HTML read as words),
  tags, up to 12 photos and the star; it is marked `imported: journey` or `csv`. The plan says what is found and what is
  left out and why (no date, no words, already in the journal, a day still to come); Import adds it with one Undo. CSV
  files up to 5 MB.
- Files: `lib/journal/import.ts` (`readJourneyJson`, `isJourneyJson`, `csvRows`, `readCsvFile`), `lib/journal/schema.ts`,
  `components/journal/journal-files.tsx`, `components/journal/journal-page.tsx` (the fold's summary words).
- Tests: `lib/journal/r6-journal.test.ts` (#410). Spec: `tests/av2-journal-diarium.spec.ts` (a CSV planned, imported, undone).
- Help (EN). Q: "Can I import my journal from Journey or a spreadsheet?" A: "Yes. Journal → Import and export → Choose
  files to import takes Journey's ZIP (with its photos) and a CSV with a date, the words and tags on each row. You see
  what is found first; one Undo takes it all back out. Everything is read on this device."
- What's new: "Journal: import from Journey and from a CSV."

### F12 Lock again after a while away — LEDGER #406 (Diarium)

- Verdict: **built**, exactly as the task allows: the existing screen cover (lib/device-lock.ts) re-engaging after a
  chosen time away. No new key material, no new crypto, no change to the PIN, its salted PBKDF2 check, its waits, "Forgot
  the PIN?" or the lock's record (a strict object, untouched; a unit test checks its shape). The one stored addition is a
  small display key for the chosen minutes (the ledger's "its own small device key"); a storage key, not a key in the
  cryptographic sense.
- What: Settings → Account & devices → Screen cover with a PIN, while the lock is on: "Lock again after a while away" —
  Never (only a new tab or window asks, as before), After 5, 15 or 60 minutes away. When ZIGoals has been hidden that long
  in this tab (another app or tab, the screen off), the same cover asks for the same PIN on return: a timer while hidden,
  and a check on return and on load (a tab the browser reloaded after a long time away). It only ever covers the screen
  sooner; it never opens it. A new tab or window still asks as before.
- Files: new `lib/device-lock-away.ts`, new `components/device-lock-away.tsx` (lazy), new `lib/av2-r6-notes-keys.ts`;
  `components/device-lock.tsx` (TIER 3 (auth: the device lock), its own commit), `lib/erase-coverage.test.ts` (labelled).
- Tests: `lib/av2-r6-notes-keys.test.ts`. Spec: `tests/av2-lock-away.spec.ts` (4 minutes open, 6 minutes covered, the
  same PIN opens; Never).
- Help (EN). Q: "Can the screen cover come back when I have been away?" A: "Yes. With the screen cover on, Settings →
  Screen cover with a PIN → Lock again after a while away: choose 5, 15 or 60 minutes. When ZIGoals has been hidden that
  long, it asks for your PIN when you come back. It hides the screen; your records are not encrypted by it."
- What's new: "Screen cover: lock again after 5, 15 or 60 minutes away."

### NOVA's and ZIGi's answers (all features)

- `lib/ai/local-answers/av2-r6-notes.ts` (`av2R6NotesAnswer`), EN and NL: rename or merge a tag, merge two notes, daily
  notes not read back (counted and named by their day; a locked one left out), the sums of a number property (never a
  locked note), a property on several notes, the word goal and today's words, who appears most (never a folded letter's
  names), On this day for another date, every photo in one place, sunrise and the moon (worked out for the time zone's
  city; never the weather), locking again after a while away, imports from Journey and a CSV. Notes only under NOVA's
  Notes scope (ZIGi says it does not read notes); the journal only where it is shared (`journalClosed`).
- Cases: `lib/ai/evals/as/cases-av2-r6-notes.ts` (`AV2_R6_NOTES`, 12 intents, 48 questions). Test:
  `lib/ai/local-answers/av2-r6-notes.test.ts` (every case in both languages from NOVA and ZIGi; each its own intent's
  answer; other questions left alone; no other question of today's CORPUS answered here, its own intents left out).
- Wiring line for engine.ts: see "For the lead" 1.

## Review b6n fixes (`scratchpad/review-b6n.md`, at `41021f15`; #406 found clean and left as it is)

- **B6N-1 (Blocker), `7e73e4cd`: a merge never leaves a link pointing nowhere or at the wrong note.** A link reaches a
  note by its name only; a name with #, |, [ or ] cannot be written inside [[…]], and a name two notes share reaches the
  first. When links to the merged note exist and the other note cannot be reached by its own name, Merge into… is refused
  in words and its panel says why ("…a link cannot reach a note whose name holds #, |, [ or ]. Rename “C# basics” first;
  nothing was merged." / "Two notes are called “…”, so a link to that name reaches the other one…"). Without links to it,
  the merge goes ahead. Test: `lib/notes/b6n-merge-links.test.ts` ("C# basics", a duplicate name, re-pointed links resolve).
- **B6N-2 (Blocker, privacy), `d848b9ee`: the names offered under Who was there never come from a letter still folded
  away** (`offeredPeople`, over `unsealed(entries, today)`). Test: `lib/journal/b6n-people-sealed.test.ts`.
- **B6N-3 (Major), `500c3dbb`: a tag rename never pushes out other notes' earlier versions, and its Undo restores them
  exactly.** Each changed note's earlier words are kept while Earlier versions has room (a note's own tenth version may
  give way, as on any save of it); the rest are counted and said ("Earlier versions is full, so the earlier words of 3
  notes were not kept as a version (no other note's versions were pushed out); Undo in the message still puts them
  back."). The Undo puts the version list back as it was. Test: `lib/notes/b6n-tag-rename.test.ts`.
- **B6N-4 (Major), `ee28a4f0`: On this day for another date is reachable on a day with no memory.** Such a day keeps no
  empty panel (as before; specs pin `details.on-this-day` absent then) and shows its way in, "On this day for another
  date · nothing from earlier years today"; pressed, the panel opens with its arrows (focus on the first) and stays,
  Back to today included. Test: `lib/on-this-day/b6n-any-day.test.ts`; the spec walks it.
- **B6N-5, `6548deb9`:** a Journey entry with a time outside the calendar is skipped with its reason; the import never
  fails on it. Test: `lib/journal/b6n-journey-dates.test.ts`.
- **B6N-6, `11ab9506`:** a tag rename never cuts a tag: a typed name, or a moved nested tag, past 32 characters is
  refused in words ("#… would be 33 characters, and a tag holds at most 32. Choose a shorter name; nothing was
  renamed."), live in the panel too. Test: `lib/notes/b6n-tag-rename.test.ts`.
- **B6N-7, `62f96d3d`:** the word-goal count is no live region any more; a status says once "Your 200 words for today are
  written." (its words stay the same while more is written). Test: `lib/journal/b6n-word-goal-status.test.ts`; the spec
  checks it.
- **B6N-8, `5ffead14`:** a CSV's slash, dot or dash dates are read in the order the file shows (month-day-year when
  every date fits it and some cannot be day-month-year), and the import plan says which order was used; when every date
  fits both it says they could be read two ways and how to write them plainly; a row that fits neither is left out with
  its reason. Test: `lib/journal/b6n-csv-dates.test.ts`.
- Help (EN) changes: #407 gains "If links to the note could not follow it — the other note's name holds #, |, [ or ], or
  two notes share it — Merge says so and changes nothing; rename it first." #410 gains "Dates such as 3/11/2026 are read
  in the order your file uses, and the preview says which."
- Stored formats: none changed by these fixes.
