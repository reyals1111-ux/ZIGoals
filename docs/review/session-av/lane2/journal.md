# Lane 2 registry: Journal and notes (`lane2/journal`)

Builder: the Journal-and-notes builder. Scope: LEDGER group 7 (Day One: #32, #35, #38, #39, #40, #42, #43, #44), #33
(version history, journal and notes parts), the notes parts of #29 and #30, then q4's open Journal Minors.

## For the lead, before merging (shared files this branch does not edit)

1. **A new IndexedDB database `zigoals-journal-media-v1`** (`apps/web/lib/journal/media.ts`; journal photos and audio
   notes). Until it is placed, `lib/erase-coverage.test.ts` "every database the code names is in KNOWN_DATABASES" fails
   (by design, it forces the placement). Add it to:
   - `apps/web/lib/erase-everything.ts` `KNOWN_DATABASES` (comment: "Session AV lane 2 (journal): photos and audio notes
     in journal entries, on this device only");
   - the device database list the session keeps (`AK_DATABASES` in `lib/ak-device-keys.ts`, or an AV list), and the
     expected list in `lib/aa-device-keys.test.ts` / `lib/ak-device-keys.test.ts`;
   - the data catalogue (`lib/data-health/catalog.ts`), if it lists databases: "Journal photos and audio notes",
     Today and Life, device only, not in Export everything (as the notes' photos).
2. No new localStorage key: every other new field lives in the existing `zigoals:journal:v1` and `zigoals:notes:v1`
   records (restored with "Today and Life").

## Stored changes (TIER 3 stored formats; all additive, optional, `.catch(undefined)` or item-filtered, loose objects)

| record | field | what |
|---|---|---|
| `zigoals:journal:v1` entry | `journal` | the journal the entry is in (`j-…`; absent: the main Journal) |
| entry | `photos` | up to 4 media ids (bytes in `zigoals-journal-media-v1`) |
| entry | `audio` | up to 3 `{id, seconds}` (bytes in `zigoals-journal-media-v1`) |
| entry | `imported` | `dayone` / `text` / `markdown` |
| own template | `body`, `tags` | the whole text and tags of a template saved from an entry |
| journal | `journals` | up to 10 `{id, name, theme}` (theme: violet, cyan, magenta, teal, gold, green) |
| journal | `packs` | prompt pack ids switched on |
| journal | `reminder` | `{on, time, days}` a reminder to write (days: weekday mask, bit 0 Monday … bit 6 Sunday, as the push Workers) |
| journal | `defaultTemplate` | the template a new entry starts from |
| journal | `versions` | earlier texts of changed entries: `{id, entryId, text, tags?, savedAt}`, ≤ 10 per entry, ≤ 200, ≤ 200,000 chars |
| `zigoals:notes:v1` | `versions` | earlier words of changed notes: `{id, noteId, title, body, savedAt}`, ≤ 10 per note, ≤ 300, ≤ 300,000 chars |
| notes | `dailyTemplate` | the words a new daily note starts from (≤ 4,000) |
| notes | `schedules` | up to 10 `{id, title, body, every: day/week/month, weekday?, monthDay?, lastMade?, paused?}` |
| IndexedDB | `zigoals-journal-media-v1` | store `media`, key `<scope>:<mediaId>`, a photo (≤ 200 kB, webp/jpeg) or audio (≤ 3 MB, ≤ 5 min, webm/mp4/ogg), ≤ 400 per scope, 30-day orphan sweep |

Round trip: `apps/web/lib/journal/av2-stored.test.ts` (Export everything zip → Restore, Replace and Merge, every field).

## Features

### Engine wiring (all features; one line)

In `apps/web/lib/ai/local-answers/engine.ts`, beside the `avAnswer` call (line ~225, same `!subject` guard and the same
`groupUnits` / `novaWording` handling): `import {av2JournalAnswer} from './av2-journal';` and try
`av2JournalAnswer(question, env)` before `avAnswer(question, env)`. Corpus: add `...AV2_JOURNAL` from
`lib/ai/evals/as/cases-av2-journal.ts` to `CORPUS` and record `expected.json`. Unit test:
`lib/ai/local-answers/av2-journal.test.ts`.

### F1 Reminder to write and the streak line — LEDGER #40 (Day One: journaling reminders and streaks)

- Verdict: **built**. The writing streak itself was already shown (`writingStreak`, Session AP); added: a line that says
  what writing today does to it, and the reminder to write as a notification (TIER 3 PWA commit `4c9b3aee`).
- Files: `lib/journal/reminder.ts`, `components/journal/journal-reminder.tsx` (lazy), `components/journal/journal-fold.tsx`,
  `components/journal/journal-page.tsx`, `components/journal/journal.css`; `lib/notify/plan.ts`, `prefs.ts`, `sync.ts`,
  `public/sw.js` (kind `journal`, type `journal`, label "Reminder to write").
- Tests: `lib/journal/av2-reminder.test.ts`, `lib/notify/av2-journal-notify.test.ts`, answers in `av2-journal.test.ts`.
- Spec: `tests/av2-journal-reminder.spec.ts`.
- Stored: `journal.reminder` (see the table above).
- Help (EN). Q: "Can the Journal remind me to write?" A: "Yes. Journal → Entries → Reminder to write: switch it on,
  choose a time and the days. It reaches you through this device's notifications (Settings → Notifications), only on a
  day you have not written yet, and it never shows a word of your journal. Under your streak, the Journal says what a
  few lines today do to it."
- What's new: "Journal: a reminder to write, and your streak in plain words."
- Showcase: `lib/journal/showcase.ts` sets the reminder on at 21:00 every day (the Showcase sends no notification). No
  count changes.
- Device keys / catalogue / export / erase: none new (inside `zigoals:journal:v1`).
- CSS touched: `components/journal/journal.css`.
- Today: nothing added.

### F2 Several journals with a colour each, search by date and the calendar — LEDGER #43 (Day One: collections, themes and search)

- Verdict: **built** (tags and tag search were built earlier, `1f67dbc9`). Search "with media" comes with F5/F6 (photos, audio).
- What: Journal → Entries → "Your journals" (make up to ten beside the main one, each with a name and one of six
  colours from the theme's tokens; rename; colour; remove, its entries moving to the main Journal, with Undo); "Show a
  journal" filter chips with counts; Write's "Journal" choice (the shown journal by default); an entry's colour stripe
  and journal name; an entry's "More" → Move to another journal; "Search by date" (From / To, a month calendar with
  the days you wrote as buttons), a typed date in the search box ("3 nov", "2026-11", "november 2026"), and
  `/app/journal?day=YYYY-MM-DD` / `?journal=<id>` in the address.
- Files: `lib/journal/books.ts`, `lib/journal/search.ts`, `components/journal/journal-books.tsx` (lazy),
  `components/journal/journal-calendar.tsx` (lazy), `components/journal/entry-more.tsx` (lazy),
  `components/journal/journal-page.tsx`, `components/journal/journal-compose.tsx`, `components/journal/journal.css`.
- Tests: `lib/journal/av2-books.test.ts`; answers in `lib/ai/local-answers/av2-journal.test.ts` ("which journals do I
  have", "what did I write on 14 nov", EN and NL).
- Spec: `tests/av2-journal-books.spec.ts`.
- Stored: entry `journal`, record `journals` (F0 table).
- Help (EN). Q: "Can I keep more than one journal?" A: "Yes. Journal → Entries → Your journals makes up to ten beside
  your main Journal, each with a colour. Choose one when you write, or move an entry there with More → Move. Removing a
  journal keeps its entries: they go back to your main Journal." Q: "How do I find what I wrote on a day?" A: "Type the
  date in Search your journal (3 nov, 2026-11) or open Search by date: choose From and To, or tap a day on the calendar;
  the days you wrote are buttons."
- What's new: "Journal: several journals with their own colour, and search by date with a calendar."
- Showcase: `lib/journal/showcase.ts` adds the journal "Example · Runs" (teal) holding the two run entries; entry
  count unchanged (10).
- Search palette (`lib/search/static.ts`, the lead's): "Journal on a day" → `/app/journal?day=` could be offered; optional.
- CSS touched: `components/journal/journal.css`. Today: nothing added.

### F3 Prompt packs — LEDGER #38 (Day One: Prompt Packs)

- Verdict: **built**. Six packs written in the repository, EN and NL (Sleep, Training, Gratitude, Creativity, Work and
  life, The year; eight questions each). Switched on in Journal → Write → "Prompt packs"; a switched-on pack takes turns
  with the everyday question as today's question (labelled "· Sleep pack"); "Another question" steps on; each pack's
  questions can be used one by one. With no pack on, today's question is exactly as before.
- Files: `lib/journal-prompts/packs.ts` (loaded on demand: only once a pack is on, or the fold opens),
  `components/journal-prompts/prompt-packs.tsx` + `prompt-packs.css` (lazy), `components/journal/journal-compose.tsx`.
- Tests: `lib/journal-prompts/av2-packs.test.ts`; answers ("which prompt packs are on"; today's question while a pack is
  on — with none on, av-life.ts keeps answering, so expected.json does not move).
- Spec: `tests/av2-journal-packs.spec.ts`.
- Stored: `journal.packs` (F0 table).
- Help (EN). Q: "What are prompt packs?" A: "Sets of journal questions on one theme — sleep, training, gratitude,
  creativity, work and life, the year — in English and Dutch. Switch one on in Journal → Write → Prompt packs and its
  questions take turns with the everyday question. You can also open a pack and use any of its questions straight away."
- What's new: "Journal: prompt packs — sleep, training and more, in English and Dutch."
- Showcase: none on purpose (a pack on would change the Showcase's question of the day, which the corpus pins).
- CSS: `components/journal-prompts/prompt-packs.css` (new). Today: nothing added (the compact Today card shows no question).

### F4 Edit an entry with its earlier versions; save an entry as a template; the default template — LEDGER #33 (journal part), #39

- Verdict: **built**. #39's remainder ("save this entry as a template", QUALITY.md "Not fixed"; q4 #45's "templates hold
  body text and tags, can be the default, can be saved from an entry") and #33 for journal entries (the notes part is F8).
- What: an entry's More → "Edit the words" (the words it replaced are kept as an earlier version: up to 10 per entry,
  200 and 200,000 characters in all; Undo); "Earlier versions" to read and "Restore this version" (the replaced words are
  kept too; Undo); the entry line says "· changed · N earlier versions under More"; removing an entry takes its versions,
  and its Undo brings them back. "Save as a template" keeps the entry's whole words and tags (headings for older builds:
  its lines ending in ":" or "?"); such a template is edited as its words. "Start new entries here" on any template
  (built-in or own) makes it the default: a new entry starts from it (on opening and after each save), tags included.
- Files: `lib/journal/versions.ts`, `lib/journal-prompts/own.ts`, `lib/journal-prompts/templates.ts` (optional `body`,
  `tags` on a template), `components/journal/entry-more.tsx` (lazy), `components/journal/journal-page.tsx`,
  `components/journal/journal-compose.tsx`, `components/journal-prompts/prompt-picker.tsx` + `.css`, `journal.css`.
- Tests: `lib/journal/av2-versions.test.ts`; answers ("what is my default journal template", "which journal entries have
  I changed", EN and NL).
- Spec: `tests/av2-journal-versions.spec.ts`.
- Stored: `versions`, `defaultTemplate`, own template `body` and `tags` (F0 table).
- Help (EN). Q: "Can I change an entry after saving it?" A: "Yes: More → Edit the words. The words it had are kept as an
  earlier version on this device (up to ten per entry); More → Earlier versions shows them, and Restore this version puts
  one back. Nothing leaves your device." Q: "Can I save an entry as a template?" A: "Yes: More → Save as a template keeps
  its words and tags. Under Start from a prompt, Start new entries here makes any template the one new entries start from."
- What's new: "Journal: edit an entry with its earlier versions kept, and save an entry as a template."
- Showcase: `lib/journal/showcase.ts` marks one entry changed with one earlier version (no count changes); no default
  template (it would fill Write in Showcase specs).
- CSS: `components/journal/journal.css`, `components/journal-prompts/prompt-picker.css`. Today: nothing added.

### F5 Photos, a voice note and [[links]] in an entry — LEDGER #35, #42 (Day One: rich entries; audio recorder)

- Verdict: **built**. #42's Apple Watch part: native-only (not part of the row's build, as the LEDGER says). Video and
  drawing in an entry are not in the LEDGER row's "What is missing" (a photo and a [[link]]), so not built here.
- What: Write → "Photos and a voice note": up to 4 photos (shrunk on the device to ≤ 200 kB when saved) and one voice
  note recorded in the browser (MediaRecorder, ≤ 5 minutes, 32 kbit/s, Stop shows the length), previews and Remove
  before saving; an entry of only a photo or a voice note gets the words "A photo." / "A voice note." (editable). Under
  the entry: the photos (named "Your photo with the entry of Nov 3 (1 of 2)") and the player ("Voice note · 0:42"), each
  "Remove" with Undo (the file leaves after 30 days unnamed: the sweep on arrival). Never synced, never sent, never
  transcribed. Write → "Link another day" puts `[[2026-11-03]]` in the words; `[[a note, goal or habit]]` links by name
  (Notes' link index); a day link opens that day's entries, and that day says "Linked from …".
- Files: `lib/journal/media.ts` (F0), `lib/journal/keep-media.ts`, `lib/journal/entry-links.ts`,
  `components/journal/compose-media.tsx`, `entry-media.tsx`, `entry-rich-text.tsx` (all lazy),
  `components/journal/journal-compose.tsx` (Save is async while media is kept), `journal-page.tsx`, `journal.css`.
- Tests: `lib/journal/av2-media.test.ts`, `lib/journal/av2-stored.test.ts` (store and sweep); answers ("how many photos
  are in my journal", "do I have voice notes in my journal", EN and NL).
- Spec: `tests/av2-journal-media.spec.ts` (Chromium only: a test tone stands in for the microphone).
- Stored: entry `photos`, `audio`; IndexedDB `zigoals-journal-media-v1` — **the lead's registries (see the top)**.
- Help (EN). Q: "Can I add photos or a voice note to a journal entry?" A: "Yes. Under Write, open Photos and a voice
  note: add up to four photos, or record a voice note of up to five minutes. They are kept in this browser on this
  device only — never synced, never sent, never turned into text." Q: "How do I link one entry to another day?" A: "Open
  Link another day, choose the day and press Add the link, or type [[2026-11-03]]. The link opens that day's entries.
  [[A name]] links a note, a goal or a habit."
- What's new: "Journal: photos, a voice note and links to other days in an entry, on this device only."
- Showcase: none (photos and audio live in IndexedDB, which the Showcase loader does not fill; a link in a Showcase
  entry would change entry words other answers read). Reported instead.
- Export: the media are not in Export everything (as the notes' photos); F6's journal export carries them in its zip.
- CSS: `components/journal/journal.css`. Today: nothing added (the compact card has no media).

### F6 Import (Day One, Markdown, text, Apple Journal) and the journal's own export — LEDGER #44 (Day One: imports and integrations)

- Verdict: **built** (part Carried, as the LEDGER says: Strava, Zapier and IFTTT — needs an outside service).
- What: Journal → "Import and export". Import reads a Day One export (its ZIP with `photos/` and `audios/`, or its JSON
  alone; each JSON is one journal, made here while there is room; Day One's photo markers and Markdown escapes are taken
  out; each entry's day in its own time zone; tags; up to 4 photos (shrunk) and 3 audio notes), ZIGoals' own journal
  export (days, journals, templates, questions and media come back as they left), Markdown and text files (one entry
  each, or one per dated heading; the day from front matter, the file name or the first line; tags from front matter),
  and HTML pages (Apple Journal's export: the page's words, the day from its name or first lines). It shows the plan
  first — how many entries from when to when, the journals, entries cut at 5,000 characters, and what is left out and
  why (already in the journal, twice in the files, a day still to come, no date, no words) — then imports with one Undo
  (its entries and the journals it made go; media is left to the 30-day sweep). Export makes one ZIP: `journal.json` in
  Day One's shape (with each entry's day, journal, template and question under `zigoals`), `photos/`, `audios/`,
  `README.txt`; named `zigoals-journal-<day>.zip` (`zigoals-example-journal-…` in the Showcase).
- Files: `lib/journal/import.ts`, `lib/journal/export.ts`, `components/journal/journal-files.tsx` (lazy; reads ZIPs with
  `lib/notes/zip-read.ts`, writes with `lib/export/zip.ts`), `components/journal/journal-page.tsx`, `journal.css`.
- Tests: `lib/journal/av2-import.test.ts` (Day One, Markdown, text, HTML, duplicates, apply and Undo, the export → import
  round trip); answers ("how many journal entries did I import", EN and NL).
- Spec: `tests/av2-journal-import.spec.ts`.
- Stored: entry `imported` (F0 table). No new key.
- Help (EN). Q: "Can I bring my Day One journal into ZIGoals?" A: "Yes. In Day One, export your journal as JSON (a ZIP
  with photos). In ZIGoals, Journal → Import and export → Choose files to import. You see how many entries it holds and
  what is left out before anything is added, and Undo takes the import back. Markdown and text files and an Apple Journal
  export work too." Q: "How do I take my journal out?" A: "Journal → Import and export → Export the journal makes one ZIP
  with every entry, photo and voice note, in Day One's shape. It is made on your device; keep it private."
- What's new: "Journal: import from Day One, Markdown or Apple Journal, and export your journal with its photos."
- Showcase: none (an import is the person's own act; the Showcase's Export names its file "example").
- Search palette (the lead's `lib/search/static.ts`): "Import a journal" → `/app/journal#journal-files-title` (optional).
- CSS: `components/journal/journal.css`. Today: nothing added.

### F7 Repeating notes and the daily note template — LEDGER #32 (Notion: repeating database templates)

- Verdict: **built**.
- What: Notes → Notes → "Repeating notes": a title, words (`{date}` becomes the period's first day) and a rule —
  every day, every week on a weekday, every month on a day (1–28). When Notes opens, each repeating note's note for the
  current period is made once ("Week plan · 2026-11-23"), never for a period missed while closed, never twice (a note of
  that title already there counts); a line says it was made, with a link to Notes. Edit (a new rule makes this
  period's note again), Pause, Stop repeating (with Undo; the notes it made stay). Notes → Days → "Daily note template":
  the words a new daily note starts from, shown in that day's editor and written only when saved (Save stays off while
  the template is untouched).
- Files: `lib/notes/schedules.ts`, `components/notes/note-schedules.tsx`, `components/notes/daily-template.tsx` (lazy),
  `components/notes/notes-workspace.tsx`, `components/notes/note-editor.tsx` (`start`), `components/notes/notes.css`,
  `lib/notes/showcase.ts`.
- Tests: `lib/notes/av2-schedules.test.ts`; `lib/notes/fields.test.ts` (the secret guard beside every new field) stays
  green; answers ("which repeating notes do I have", EN and NL, NOVA's Notes scope).
- Spec: `tests/av2-notes-repeating.spec.ts`.
- Stored: notes `schedules`, `dailyTemplate` (F0 table).
- Help (EN). Q: "Can a note make itself every week?" A: "Yes. Notes → Notes → Repeating notes: give it a title and its
  words, and choose every day, a weekday or a day of the month. When you open Notes, that period's note is made from
  it, once. {date} in the words becomes the day." Q: "Can my daily note start from a template?" A: "Yes. Notes → Days →
  Daily note template. A new daily note shows those words; it is written only when you save it."
- What's new: "Notes: repeating notes and a daily note template."
- Showcase: `lib/notes/showcase.ts` adds the repeating note "Example · Week plan" (every Monday), already made for this
  week; the Showcase never makes notes itself, so its eight notes stay eight.
- CSS: `components/notes/notes.css`. Today: nothing added.

### F8 Earlier versions of a note — LEDGER #33 (notes part; the journal part is F4)

- Verdict: **built** for notes and journal entries. The "or task" part of #33 (an earlier version of a task) is the
  Tasks builder's pillar (group 11 / 17 lists it under "Sync and safety"); left to them, not built here. "Who made them"
  (Notion's workspace authors) does not apply to a single-person device.
- What: each save that changes a note's title or words keeps what it replaced (≤ 10 per note, ≤ 300 and 300,000
  characters in all; none for a note that had no words yet). Under the note: "Earlier versions · N" opens the list —
  when each was saved, its words, "Restore this version" (the replaced words are kept too; Undo puts the note back;
  the editor shows the restored words).
- Files: `lib/notes/versions.ts`, `components/notes/note-versions.tsx` (lazy), `components/notes/note-editor.tsx`
  (`record` prop; saves keep a version), `components/notes/notes-workspace.tsx`, `components/notes/notes.css`,
  `lib/notes/showcase.ts`.
- Tests: `lib/notes/av2-versions.test.ts`; answers ("which notes have earlier versions", EN and NL).
- Spec: `tests/av2-notes-versions.spec.ts`.
- Stored: notes `versions` (F0 table).
- Help (EN). Q: "Can I get back an earlier version of a note?" A: "Yes. Each time you save a change, the words the note
  had are kept on this device (up to ten versions). Open Earlier versions under the note, read one, and press Restore
  this version; the words it replaces are kept too."
- What's new: "Notes: earlier versions of a note, to read and restore."
- Showcase: "Books to read" has one earlier version (no count changes).
- CSS: `components/notes/notes.css`. Today: nothing added.

### F9 Notes as a table, a gallery and a chart — LEDGER #29 and #30 (their notes parts)

- Verdict: **built** for notes. #29's task table / timeline and #30's "tasks done per week" are the Tasks builder's
  (group 11); not built here.
- What: Notes → Notes → "Show notes as": List (as before), Table (columns Note, Tags, Words, Links, Changed, Made; each
  header a button that sorts and says its order with `aria-sort`; the table scrolls in its own focusable region on a
  phone), Gallery (a card per note with its photo, first words, tags, words and when changed), Chart (notes per tag,
  the untagged apart, and notes written or changed per week over eight weeks; labelled bars with the numbers in words).
- Files: `lib/notes/table.ts`, `components/notes/notes-views.tsx` (lazy), `components/notes/notes-workspace.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/av2-table.test.ts`; answers ("how many notes do I have per tag", EN and NL).
- Spec: `tests/av2-notes-views.spec.ts`.
- Stored: nothing (the layout is the page's state).
- Help (EN). Q: "Can I see my notes as a table?" A: "Yes. Notes → Notes → Show notes as: Table sorts by any column (press
  a column's name, again to turn the order round), Gallery shows a card per note with its photo, and Chart counts your
  notes per tag and per week."
- What's new: "Notes: a sortable table, a gallery and a chart of your notes."
- Showcase: the Showcase's notes already carry tags (travel, reading), so the chart shows them; nothing added.
- CSS: `components/notes/notes.css`. Today: nothing added.
