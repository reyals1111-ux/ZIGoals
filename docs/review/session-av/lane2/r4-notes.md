# Lane 2 registry: round 4, notes and journal files (`lane2/r4-notes`)

Builder: the round-4 notes builder, on `lane2/batch3` (round 3's notes work included). Scope: LEDGER "Round 4" groups
U2 (#306, #307, #311, #312, #313, #314, #315, #316) and U9 (#318, #319, #320, #321); COMPETITORS.md round 4's Bear and
Journey rows for them. Round 3's notes work (tick boxes, highlights, outline, print, properties, canvas;
`docs/review/session-av/lane2/r3-notes.md`) is built on, never repeated. The safe-render rule stands: every new mark is
switched on by `parseBlocks(text, {notes: true})`, which only Notes passes; ZIGi's and NOVA's replies get the old tree.

Baseline check (#306, #307 and #316 change the Notes layout): docs/STATUS.md "Current accepted baseline" protects PR
#22's changes and the brief's protected areas (Today hero and slogan, Checklist orbit path, footer finale, swan intro,
shell navigation, AR's NOVA composition, the locked ZIGi look). Nothing of Notes is among them; none of them is touched.

## Summary

| LEDGER row | verdict | feature |
|---|---|---|
| #306 Bear Tags in the text, nested, and a tag as a workspace | built | F1 |
| #307 Bear Several photos placed in a note | built (Export everything / Restore of the further photos' bytes needs the lead's two lines, below) | F2 |
| #311 Bear Note info | built | F3 |
| #312 Bear Find and replace in a note | built | F4 |
| #313 Bear Fold a section | built | F5 |
| #314 Bear Callouts | built | F6 |
| #315 Bear Archive a note | built | F7 |
| #316 Bear A writing view (typewriter mode) | built | F8 |
| #318 Bear Lock a note | built in part: behind the screen-cover PIN, out of Search, the Graph, NOVA and the export; encryption with a passphrase of its own Carried: against a named rule (no key changes) | F9 |
| #319 Bear More ways to export a note | built (HTML, plain text, Word) | F10 |
| #320 Journey E-book and Word export | built | F11 |
| #321 Bear Imports from Evernote and Bear | built (read with the repository's strict XML reader, not DOMParser: the CSP's Trusted Types refuse it) | F12 |

## For the lead (shared files this branch does not edit)

1. **Engine wiring** (`lib/ai/local-answers/engine.ts`, beside the `av2R3NotesAnswer` call, same guards):
   `import {av2R4NotesAnswer} from './av2-r4-notes';` and try `av2R4NotesAnswer(question, env)` before `avAnswer`.
   Corpus: add `...AV2_R4_NOTES` from `lib/ai/evals/as/cases-av2-r4-notes.ts` (12 intents, 48 questions, EN and NL) to
   `CORPUS` and record `expected.json`. Checked here: no question of today's CORPUS is answered by `av2R4NotesAnswer`.
   Please check that no earlier answer in the engine's order takes "can I export my journal as an ebook" first.
2. **Export everything and Restore, the further photos' bytes (#307)** — two one-line changes:
   - `lib/export/make-everything.ts:53`: `note.photoId ? [note.photoId] : []` → `sch.notePhotoIdsOf(note)`.
   - `lib/restore/media.ts:63`: index every id of `[n.photoId, ...(Array.isArray(n.photos) ? n.photos : [])]` under
     the `notes/photos/<id>.<ext>` name it indexes for `photoId` today.
   The record itself (every new field) already round-trips (`lib/notes/r4-stored.test.ts`); Erase already removes the
   notes' photo database by name.
3. **No new device key, database, catalogue, export, erase or restore entry**: every new field lives in
   `zigoals:notes:v1` (the two Notes choices beside its `voice`).
4. **Specs for the shard lists** (none run here): `tests/av2-notes-tags.spec.ts`, `av2-notes-photos.spec.ts`,
   `av2-notes-info.spec.ts`, `av2-notes-find.spec.ts`, `av2-notes-fold.spec.ts`, `av2-notes-callouts.spec.ts`,
   `av2-notes-archive.spec.ts`, `av2-notes-writing.spec.ts`, `av2-notes-lock.spec.ts`, `av2-notes-save.spec.ts`,
   `av2-journal-ebook.spec.ts`, `av2-notes-imports.spec.ts`.
5. **Help and What's new**: each feature's Q+A (EN) and label are below, for `help-page.tsx`.
6. **Route weight** (not measured; no build here; please check `/app/notes`, `/app/journal` and a route with ZIGi's
   replies): lazy chunks — find and replace, the writing view (+ its CSS), the lock cover, Save this note as (+ the
   HTML / Word writers and the JPEG step), the journal's E-book and Word (+ the EPUB writer), the Evernote / Bear reader
   (inside the already-lazy Files chunk). First chunks gained: `lib/notes/tags.ts`, `fold.ts`, `note-photos.ts`,
   `lock.ts` (small, pure), the reading view's tags, photo figures, fold buttons and callouts, the editor's Tags field,
   Note info and the Archive / Lock buttons; and in `lib/ai/safe-render.ts` (also in ZIGi's reply chunk) the notes-only
   `photo` and `callout` branches (a few hundred bytes).
7. **TIER 3 commits**: `6d673503` (stored formats: note `photos`, `archived`; notes `focusTag`, `typewriter`),
   `fac13a06` (stored formats, privacy: note `locked`).
8. **Files outside Notes I edited** (none on the brief's shared list): `lib/ai/safe-render.ts` (notes-only blocks, as
   round 3's), `lib/ai/tools/nova-sources.ts` and `components/nova/workflows/use-nova-sources.ts` (one line each: no
   locked note reaches NOVA), `lib/search/notes.ts`, `components/journal/journal-files.tsx`, `components/journal/journal.css`.
9. **A red test on three commits, fixed forward**: `lib/notes/fields.test.ts` (a secret guard beside every Notes text
   field) failed on the F1, F4 and F8 commits (`80ac6c74`, `1c53576b`, `5976a3d9`) and is green from F9 (`3e3ced4f`),
   which adds the guards. Typecheck was run on F2, F4, F8, F9 and the final head; lint and the unit tests on each. The
   F12 commit (`87532291`) and the answers commit (`a766f8fb`) had two type errors (an untyped list in
   `notes-files.tsx`, a narrowed map value in `import-enex.ts`), fixed in the last commit; the head typechecks clean.
10. **Today**: nothing added, nothing always visible.
11. **Not done in this round**: the area's open QUALITY Minors (the lead's task named the rows only).

## Stored changes (TIER 3 stored formats; all additive, optional, dropped when unreadable, on loose objects)

| record | field | what |
|---|---|---|
| `zigoals:notes:v1` note | `photos` | up to 7 further photo ids after `photoId` (8 in a note), each placed in the words by a `![photo](<id>)` line (LEDGER #307) |
| note | `archived` | the note is archived: out of the lists and the graph, still in Search and the exports (LEDGER #315) |
| note | `locked` | the note shows only after this device's screen-cover PIN and stays out of Search, the Graph, NOVA and the Markdown export; hidden, not encrypted (LEDGER #318; its own TIER 3 commit) |
| notes | `focusTag` | the one tag Notes is focused on (list, search, graph) until cleared (LEDGER #306) |
| notes | `typewriter` | the writing view keeps the line being written in the middle (LEDGER #316) |

`focusTag` and `typewriter` are the two "device preferences" the LEDGER rows name; they are kept in the device-only notes
record beside its `voice` choice, so no new device key, catalogue, export, erase or restore entry is needed (round trip in
`lib/notes/r4-stored.test.ts`). Older builds keep every field untouched (the records are loose) and show the notes as
before (an archived note in its list; only the first photo).

## Features

### F1 Tags in the text, nested, and a focus tag — LEDGER #306 (Bear)

- Verdict: **built**.
- What: a `#tag` written anywhere in a note's words (after a space or a line start; not in code, not `# Heading`, not
  `#12`, not a link's or address's `#part`) and a tag typed in the editor's new Tags field (commas or spaces) are kept
  as the note's `tags` when it is saved; a tag removed from the words leaves. "/" nests: `#work/meetings` sits under
  `#work`. A note written before this build counts the #tags in its words too (read as kept ∪ written). In the reading
  view each #tag is a button that focuses Notes on it; the note's own (field) tags show under the words. Notes → Notes →
  "Tags" (a fold; its face counts them) lists every tag nested, with how many notes carry it or a tag under it; choosing
  one makes it Notes' focus — the list (every layout), Search and the Graph show only its notes and the ones under it,
  with "Showing notes tagged #work … Clear focus" — until cleared (choose it again or Clear focus). The focus is kept on
  this device (`focusTag`). The table's Tags column and the chart's notes per tag read the written tags too.
- Files: new `lib/notes/tags.ts`; `components/notes/note-render.tsx` (tags in the words), `components/notes/note-editor.tsx`
  (Tags field, save), `components/notes/notes-workspace.tsx` (Tags fold, focus), `lib/notes/table.ts`,
  `components/notes/notes-views.tsx` (the chart's empty words), `components/notes/notes.css`.
- Tests: `lib/notes/r4-tags.test.ts`. Spec: `tests/av2-notes-tags.spec.ts`.
- Stored: notes `focusTag` (TIER 3 commit, see "Stored changes"); the tags use the existing `tags` field.
- Help (EN). Q: "Can I tag notes, and nest tags?" A: "Yes. Write #travel anywhere in a note, or type it in the note's
  Tags field while you edit. A / nests a tag: #work/meetings sits under #work. Notes → Notes → Tags lists them with how
  many notes each has. Choose one to focus Notes on it — the list, Search and the Graph show only its notes — until you
  choose Clear focus."
- What's new: "Notes: #tags in your words, nested with /, and one tag as Notes' focus."
- Showcase: none added (the Showcase notes' words are read by NOVA's pinned corpus); their kept tags (#travel, #reading)
  show in the Tags fold.
- Device keys / catalogue / export / erase: none. CSS touched: `components/notes/notes.css`. Today: nothing added.

### F2 Several photos placed in a note — LEDGER #307 (Bear)

- Verdict: **built**.
- What: a daily or topic note holds up to eight photos. The first is the note's `photoId`, drawn under the words as every
  build has drawn it; "Add another photo" keeps each next one in `photos` and places it in the words where it was added
  — at the caret while editing (saved with the words), else at the end — as a `![photo](<id>)` line of its own, which the
  reading view (and Print this note) draws as that photo. A photo line draws only a photo this note keeps on this
  device (an id of letters, digits, - and _; never an address, so nothing is ever fetched); any other says so in words.
  With two photos or more, "Photos · 3 of 8" lists them ("in the words" / "under the words") with "Delete photo 2…"
  (a confirmation; its line goes, the next photo becomes the first). An inbox capture keeps one photo (Replace photo),
  since filing moves it. The Markdown export writes every photo in attachments/ and each placed line as an embed of its
  file (`![[<id>.jpg]]`), with `photos:` in the front matter. The arrival sweep counts every photo of a note as named.
- ZIGi's replies: the photo line is a notes-only block (`parseBlocks(text, {notes: true})`); without the option the line
  stays words, exactly as before (unit-tested).
- Files: new `lib/notes/note-photos.ts`; `lib/notes/schema.ts` (`photos`, `notePhotoIdsOf`), `lib/ai/safe-render.ts` (the
  notes-only `photo` block), `components/notes/note-render.tsx`, `components/notes/note-editor.tsx`,
  `components/notes/note-print.tsx`, `lib/notes/markdown.ts`, `components/notes/notes-files.tsx`,
  `components/notes/notes-workspace.tsx` (the sweep), `components/notes/notes.css`.
- Tests: `lib/notes/r4-photos.test.ts`; stored round trip in `lib/notes/r4-stored.test.ts`. Spec: `tests/av2-notes-photos.spec.ts`.
- Stored: note `photos` (TIER 3 commit, see "Stored changes"). Erase: the notes' photo database (`zigoals-notes-photos-v1`)
  is already erased by name, so the new ids go with it.
- **For the lead (shared files)**: Export everything and Restore read only `photoId` today. Two one-line changes keep the
  further photos' bytes in the backup:
  - `lib/export/make-everything.ts:53`: `note.photoId ? [note.photoId] : []` → `notePhotoIdsOf(note)` (from
    `lib/notes/schema`, already imported there as `sch`: `sch.notePhotoIdsOf(note)`).
  - `lib/restore/media.ts:63`: index each of `[n.photoId, ...(Array.isArray(n.photos) ? n.photos : [])]` as the
    `notes/photos/<id>.<ext>` name it already indexes for `photoId`.
  Until then, the further photos' ids are restored and their bytes stay on the device that took them.
- Help (EN). Q: "Can a note hold more than one photo?" A: "Yes, up to eight. Add another photo puts it in the note where
  you are writing (or at the end), and it shows there when you read the note. Photos lists them; delete one there.
  Photos stay on this device."
- What's new: "Notes: up to eight photos in a note, each placed in the words."
- Showcase: none (Showcase notes keep no photos; the Showcase keeps no photos on purpose).
- CSS touched: `components/notes/notes.css`. Today: nothing added.

### F3 Note info — LEDGER #311 (Bear)

- Verdict: **built**.
- What: an open note with words shows "Note info · 500 words" (a fold, closed) while reading: its words (the table's
  count, shared), characters, reading time ("About 2 minutes (an estimate at 230 words a minute)"), when it was made
  and when it was last changed, in the app's date and time format. Derived each time; nothing stored.
- Files: `lib/notes/table.ts` (`countWords`, `countCharacters`, `readMinutes`), `components/notes/note-editor.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r4-info.test.ts`. Spec: `tests/av2-notes-info.spec.ts`.
- Stored: nothing.
- Help (EN). Q: "How long is a note?" A: "Open it and choose Note info: its words, characters, about how many minutes it
  takes to read (an estimate at 230 words a minute), and when it was made and last changed."
- What's new: "Notes: Note info — words, characters, reading time and dates."
- Showcase: none needed (every Showcase note shows it). CSS touched: `components/notes/notes.css`. Today: nothing added.

### F4 Find and replace in a note — LEDGER #312 (Bear)

- Verdict: **built**.
- What: while editing a note, "Find and replace" (beside Save) opens a panel: Find (focus goes there) says "2 of 5" or
  "No match in this note." as you type; Next and Previous (Enter and Shift+Enter in the field) step through the
  matches, each shown in its place below ("…Buy **tea**. Tea for…") and chosen in the text; Match case; Replace with,
  then Replace (the current one) or "Replace all 5". A replace changes the words being edited; Save keeps the earlier
  words under Earlier versions, as every save does (the panel says so). Esc or Close shuts it, focus back on its button.
- Files: new `lib/notes/find.ts`, new `components/notes/note-find.tsx` (lazy), `components/notes/note-editor.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r4-find.test.ts`. Spec: `tests/av2-notes-find.spec.ts`.
- Stored: nothing new (a save writes the note and its earlier version, as before).
- Help (EN). Q: "Can I find and replace words in a note?" A: "Yes. Edit the note and press Find and replace. Type the
  words: it counts them, Next and Previous go through them, and Replace or Replace all changes them. Save keeps the
  earlier words under Earlier versions."
- What's new: "Notes: find and replace inside a note."
- Showcase: none needed. CSS touched: `components/notes/notes.css`. Today: nothing added.

### F5 Fold a section — LEDGER #313 (Bear)

- Verdict: **built**.
- What: in the reading view, each heading with words under it has a fold button before it ("Fold “Packing”", 44 px,
  aria-expanded): it folds the blocks under it up to the next heading of its level or higher (a heading inside goes
  with it), and says "3 parts folded". "Fold all" and "Open all" (a group above the words) do every heading. Round 3's
  outline opens the folds hiding a heading before it jumps there. For this visit only; a changed text starts open.
  Nothing stored; no motion.
- Files: new `lib/notes/fold.ts`; `components/notes/note-render.tsx`, `components/notes/note-editor.tsx` (`fold` on),
  `components/notes/notes.css`.
- Tests: `lib/notes/r4-fold.test.ts`. Spec: `tests/av2-notes-fold.spec.ts`.
- Stored: nothing.
- Help (EN). Q: "Can I fold part of a long note?" A: "Yes. When you read a note, press the small arrow before a heading
  to fold what is under it, and again to open it. Fold all and Open all do every heading. The folds last for this visit."
- What's new: "Notes: fold a section under its heading, or fold them all."
- Showcase: none needed (a note with headings shows it). CSS touched: `components/notes/notes.css`. Today: nothing added.

### F6 Callouts — LEDGER #314 (Bear)

- Verdict: **built**.
- What: in Notes, a quote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]` (any
  case; words after the marker are its title; Obsidian's `+`/`-` fold sign is read) is drawn as a calm box: a sign
  (decoration), its word in bold ("Tip: Pack light"), then its paragraphs (blank `>` lines split them), `role="note"`
  named by its word — never colour alone. Obsidian's other markers fold into the nearest kind and keep their own word
  (`[!info]` is an Info note, `[!danger]` a Danger caution); an unknown marker is a note with its word. A plain quote
  stays a quote. The marker stays in the text, so the Markdown export keeps it as written (Obsidian and GitHub draw it).
- ZIGi's replies: the callout is a notes-only block (`parseBlocks(text, {notes: true})`); ZIGi's and NOVA's renderers get
  the old quote (unit-tested).
- Files: `lib/ai/safe-render.ts` (the notes-only `callout` block, `CALLOUT_KINDS`), `components/notes/note-render.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r4-callouts.test.ts`. Spec: `tests/av2-notes-callouts.spec.ts`.
- Stored: nothing (the marker lives in the note's text).
- Help (EN). Q: "Can I add a tip or warning box to a note?" A: "Yes. Start a quote with > [!NOTE], > [!TIP],
  > [!IMPORTANT], > [!WARNING] or > [!CAUTION], and write its words on the next lines starting with >. Notes shows it as
  a box with its word; the Markdown export keeps it as you wrote it."
- What's new: "Notes: callouts — note, tip, important, warning and caution boxes."
- Showcase: none (the Showcase notes' words are read by NOVA's pinned corpus). CSS touched: `components/notes/notes.css`.
  Today: nothing added.

### F7 Archive a note — LEDGER #315 (Bear)

- Verdict: **built**.
- What: an open daily or topic note has "Archive" (beside Pin and Delete): the message says "… archived: out of the list
  and the graph, still in Search" with Undo. An archived note leaves the Notes list (every layout and the chart), the
  Days list and the Graph; it waits under Notes → Notes → "Archived · 1 note, still in Search" (each with Back to the
  list); Search and the palette show it marked "· archived"; opened, it says "Archived: … Back to the list". The
  Markdown export writes `archived: true` in its front matter and an import keeps it archived (the key is ZIGoals' own,
  so it never becomes a property — `photos` is now kept out of properties the same way, for #307's export). Export
  everything carries it with the note. "The daily strip" of the row: the This day strip lists no notes
  (`lib/notes/this-day.ts`, opened), so an archived daily note leaves the Days list instead.
- Files: `components/notes/note-editor.tsx`, `components/notes/notes-workspace.tsx`, `components/notes/notes-search.tsx`,
  `lib/search/notes.ts`, `lib/notes/markdown.ts`, `lib/notes/props.ts` (`RESERVED_KEYS`), `components/notes/notes.css`.
- Tests: `lib/notes/r4-archive.test.ts`; stored round trip in `lib/notes/r4-stored.test.ts`. Spec: `tests/av2-notes-archive.spec.ts`.
- Stored: note `archived` (TIER 3 commit, see "Stored changes").
- Help (EN). Q: "Can I put a note away without deleting it?" A: "Yes. Open it and press Archive. It leaves your list and
  the Graph but stays in Search and in your exports. Notes → Notes → Archived lists them; Back to the list brings one
  back."
- What's new: "Notes: archive a note — out of the list, still in Search."
- Showcase: none (an archived Showcase note would move the pinned list counts). CSS touched: `components/notes/notes.css`.
  Today: nothing added.

### F8 A writing view (typewriter mode) — LEDGER #316 (Bear)

- Verdict: **built**.
- What: while editing, "Write in full screen" opens the note alone in a modal dialog over the whole page (the browser's
  own `<dialog>`: the rest is inert, focus in the words, the caret at the end). "Typewriter" (aria-pressed, kept on this
  device) keeps the line being written in the middle of the screen (the text is moved at once, never animated, so
  reduced motion and Motion Off see the same). Save saves there; Esc or Done goes back to the editor with the words (not
  lost, saved with Save), focus on the button. 18 px words, at most 760 px wide, theme tokens only.
- Baseline: the dialog covers the page only while open; nothing protected is touched.
- Files: new `components/notes/note-focus.tsx` + `components/notes/note-focus.css` (lazy, its own chunk),
  `components/notes/note-editor.tsx`.
- Tests: the stored choice in `lib/notes/r4-stored.test.ts`. Spec: `tests/av2-notes-writing.spec.ts`.
- Stored: notes `typewriter` (TIER 3 commit, see "Stored changes").
- Help (EN). Q: "Can I write without distractions?" A: "Yes. Edit a note and press Write in full screen: only the note
  shows. Turn on Typewriter to keep the line you write in the middle. Esc or Done takes you back; press Save to keep
  your words."
- What's new: "Notes: write in full screen, with a typewriter line."
- Showcase: none needed. CSS touched: new `components/notes/note-focus.css` (imported by its lazy chunk only).
  Today: nothing added.

### F9 Lock a note — LEDGER #318 (Bear), in its conservative form

- Verdict: **built in part**. Built: "Lock this note" behind this device's own screen-cover PIN, and every leaving-out the
  row names. Left: encrypting the note's words with a passphrase of its own (AES-GCM from PBKDF2) — **against a named
  rule (no key changes)**: the brief and the lead allow no new key handling or crypto beyond what the screen cover
  already uses (a salted PBKDF2-SHA-256 check of the PIN, `lib/device-lock.ts`, untouched); deriving and using an
  encryption key would be new key handling.
- Owner note checked: "an older build that sees the empty body of a locked note must not overwrite its ciphertext".
  With no ciphertext, the risk is gone: the body stays the note's plain words, so an older build shows and saves them as
  it always did (it keeps `locked` untouched on the loose note).
- What: an open daily or topic note has "Lock this note". With no screen-cover PIN on this device it says what it needs
  ("Set one first in Settings → Account & devices → Screen cover with a PIN") and locks nothing. Locked, the note opens
  to "This note is locked": "Your screen-cover PIN" and "Show this note" (the screen cover's own check and its waits
  after wrong tries); the words then show for this visit; "Remove the lock" takes it off. If the screen cover is later
  turned off, a locked note opens with a tap and says why (the screen cover, too, never locks records away). The cover
  says plainly that the words are hidden, not encrypted, and stay in this browser and in Export everything (so a backup
  is whole). Left out while locked: Search (Notes, the palette, Search everything), the Graph, NOVA (its sources —
  `readNovaToolSources` and NOVA's workflows — its answers and the notes it packs), Open tick boxes, backlinks, the
  lists' and gallery's and canvas cards' snippets ("Locked note: its words show after your PIN."), a reminder's words
  ("A reminder in a locked note"), and the Markdown export ("1 locked note was left out (open one and use Save this note
  as… to take it out)"). Its title still shows in lists, as Bear's does.
- Files: new `lib/notes/lock.ts`, new `components/notes/note-lock.tsx` (lazy); `components/notes/note-editor.tsx`,
  `lib/ai/tools/nova-sources.ts`, `components/nova/workflows/use-nova-sources.ts` (one line each), `lib/notes/pack.ts`,
  `lib/search/notes.ts`, `lib/notes/ticks.ts`, `lib/notes/links.ts`, `lib/notes/reminders.ts`, `lib/notes/markdown.ts`,
  `components/notes/notes-files.tsx`, `components/notes/notes-workspace.tsx`, `components/notes/notes-views.tsx`,
  `components/notes/notes-canvas.tsx`, `components/notes/notes.css`.
- Also in this commit: the secret guard beside the new free-text fields of F1 (Tags), F4 (Replace with) and F8 (the
  writing view), which `lib/notes/fields.test.ts` asks for (that test was red on the F1, F4 and F8 commits; green from
  here).
- Tests: `lib/notes/r4-lock.test.ts`; stored round trip in `lib/notes/r4-stored.test.ts`. Spec: `tests/av2-notes-lock.spec.ts`
  (sets the PIN through the real Settings form).
- Stored: note `locked` (its own TIER 3 commit, see "Stored changes"). No device key, no key material, no crypto added.
- Help (EN). Q: "Can I lock a note?" A: "Yes, behind this device's screen-cover PIN (Settings → Account & devices →
  Screen cover with a PIN). Open the note and press Lock this note. It then shows only after the PIN, and stays out of
  Search, the Graph, NOVA and the Markdown export. Its words are hidden, not encrypted: they stay in this browser and in
  Export everything. Remove the lock takes it off."
- What's new: "Notes: lock a note behind your screen-cover PIN, out of Search, the Graph and NOVA."
- Showcase: none (the Showcase has no PIN). CSS touched: `components/notes/notes.css`. Today: nothing added.

### F10 More ways to export a note: HTML, text and Word — LEDGER #319 (Bear)

- Verdict: **built**.
- What: reading an open note, "Save this note as…" (beside Print this note) opens a panel (focus on its first button;
  Esc or Close back to the button): "A web page (.html)" — one page with the title, the day or made / changed days and
  tags, the words as the reading view draws them (headings, lists, tick boxes ☐ ☑, highlights, quotes, callouts, tables,
  code, https links) and the note's photos inside as data; "Plain text (.txt)" — the title, that line, then the words
  as they read (marks gone, tick boxes ☐ ☑, CRLF line ends); "A Word file (.docx)" — Office Open XML written by hand
  (WordprocessingML: Title, Subtitle, Heading 1–3, Quote, Code and List Paragraph styles, bullets and numbers that
  restart per list, bold, italics, highlights, hyperlinks, tables, photos as inline pictures made JPEG on this device,
  core properties) into a ZIP through `lib/export/zip.ts` — no package. Every word is escaped; a file is named after the
  note. A photo not in this browser is left out and said.
- A locked note (#318) offers it only after its PIN (the editor shows nothing of it before).
- Files: new `lib/notes/note-files.ts` (the XHTML and Word writers, shared with #320), new `lib/notes/doc-image.ts`
  (JPEG for Word, the download), new `components/notes/note-save.tsx` (lazy), `components/notes/note-editor.tsx`,
  `components/notes/notes.css`.
- Tests: `lib/notes/r4-note-files.test.ts` (escaping; every XML part well-formed with the repository's strict XML
  reader; the parts, styles, numbering, hyperlink and picture sizes). Spec: `tests/av2-notes-save.spec.ts` (reads the three
  downloads).
- Stored: nothing.
- Help (EN). Q: "Can I save a note as a Word file or a web page?" A: "Yes. Open the note and press Save this note as…:
  a web page (.html, with its photos inside), plain text (.txt) or a Word file (.docx). Each is made on this device."
- What's new: "Notes: save a note as a web page, plain text or a Word file."
- Showcase: none needed. CSS touched: `components/notes/notes.css`. Today: nothing added.

### F11 The journal as an e-book and a Word file — LEDGER #320 (Journey)

- Verdict: **built**.
- What: Journal → Import and export → "E-book and Word" (shown when the journal has entries): Journal (All journals,
  Journal, or one of your journals), From and To (the first entry's day to today, by default); a line says how many
  entries the pick holds and how many letters wait unopened (#279: a letter not yet open is left out, so its words wait
  for their day). "Save as e-book (.epub)": EPUB 3 with an EPUB 2 contents file (toc.ncx) for older readers — `mimetype`
  first and stored, META-INF/container.xml, a package file, a contents page (each month, each entry under it), one XHTML
  chapter per month ("November 2026"; each entry under its day, its journal when all are chosen, its tags, its words as
  the reading view parses them, ZIGi's question and the answer, its photos inside). "Save as Word (.docx)": the same as
  one Word file (months as Heading 1, days as Heading 2, photos made JPEG), through #319's Word writer. Both written by
  hand through `lib/export/zip.ts`, no package; made on this device.
- Built on round 3's #272 (Markdown per entry): the same entries, with the same Showcase label in words.
- Files: new `lib/journal/ebook.ts`, new `components/journal/journal-ebook.tsx` (lazy), `components/journal/journal-files.tsx`,
  `components/journal/journal.css`; shares `lib/notes/note-files.ts` and `lib/notes/doc-image.ts`.
- Tests: `lib/journal/r4-ebook.test.ts` (the pick, letters held back, the EPUB's order and parts, every XML part
  well-formed, the Word file). Spec: `tests/av2-journal-ebook.spec.ts` (reads both downloads).
- Stored: nothing.
- Help (EN). Q: "Can I turn my journal into a book?" A: "Yes. Journal → Import and export → E-book and Word: choose a
  journal and the days, then Save as e-book (.epub) for Apple Books, Kobo or any e-reader — a chapter a month with a
  contents page and your photos — or Save as Word (.docx). Letters that have not opened yet stay out."
- What's new: "Journal: your journal as an e-book or a Word file, for the days you choose."
- Showcase: the Showcase journal's ten entries make an example book (its file name says example). CSS touched:
  `components/journal/journal.css`. Today: nothing added.

### F12 Imports from Evernote and Bear — LEDGER #321 (Bear)

- Verdict: **built**. One change from the row's words: the row says Evernote's XML is "read with the browser's
  DOMParser"; the app's Content Security Policy enforces Trusted Types, which refuses DOMParser on plain strings
  (`lib/workouts/mini-xml.ts` says why), so the export and each note's ENML are read with that strict reader instead
  (a file declaring its own entities is refused; ENML's HTML characters such as `&nbsp;` are read as text).
- What: Notes → Files → "Import Markdown, Evernote or Bear" now also takes Evernote's .enex and Bear's .bear2bk backup,
  .textbundle and .textpack (ZIPs of `<name>.textbundle/text.md`, `info.json` and `assets/`), alone or with Markdown
  files, read on this device and turned into the same plan as a Markdown import (its caps, "Skipped and why", nothing
  saved before Import, Undo after). Evernote: title, created day, tags, the words as Markdown (headings, paragraphs and
  lines, bullets and numbers, to-dos as tick boxes, bold, italics, https links only, code, quotes, tables), encrypted
  text and attachments said in words, and the note's first eight images as its photos, each placed where it was. Bear:
  the first `# line` as the title, `info.json`'s creation day, `#tags` kept in the words (nested ones and Bear's
  `#multi word#` as `#multi-word`), where F1 reads them, and its `assets/` photos, up to eight. Photos are kept on this
  device (shrunk as a captured photo is) only when Import is pressed; one this browser cannot read (HEIC on some
  browsers) is left out and counted in the message. Caps: 50 MB for an .enex, 80 MB for a Bear archive (10 MB a photo,
  120 MB unpacked in all), 1000 notes, the notes' own caps after that.
- Files: new `lib/notes/import-enex.ts`; `lib/notes/read-files.ts` (`readForeignFiles`), `lib/notes/markdown.ts`
  (`ImportPlan.from`: the file each added note came from), `components/notes/notes-files.tsx`.
- Tests: `lib/notes/r4-import-enex.test.ts`. Spec: `tests/av2-notes-imports.spec.ts` (an .enex and a .bear2bk made in
  the spec).
- Stored: nothing new (normal note writes; photos in the notes' photo store).
- Help (EN). Q: "Can I bring my notes from Evernote or Bear?" A: "Yes. In Evernote, export notes as .enex; in Bear,
  make a backup (.bear2bk) or export as TextBundle. Then Notes → Files → Choose files to import. You see what would come
  in first — titles, days, tags and up to eight photos a note — and Undo takes it back."
- What's new: "Notes: import from Evernote (.enex) and Bear (.bear2bk, TextBundle)."
- Search palette (the lead's, optional): "Import notes from Evernote or Bear" → `/app/notes?view=files`.
- Showcase: none. CSS: none. Today: nothing added.

### NOVA's and ZIGi's answers (all features)

- `lib/ai/local-answers/av2-r4-notes.ts` (`av2R4NotesAnswer`), EN and NL: nested tags and the focus tag (#306; the plain
  "which tags do my notes have" stays the pinned notes-per-tag answer in `av2-journal.ts`, which now counts written
  #tags too — the Showcase notes have none in their words, so its pinned output is unchanged), photos in notes (#307),
  the words the notes hold and the longest (#311), find and replace (#312), folding (#313), callouts (#314), the
  writing view (#316), archived notes (#315), locking a note (#318: how only — a locked note is never read: NOVA's
  sources leave it out and so does this file), saving a note as HTML, text or Word (#319), the journal as an e-book or
  Word file (#320, the journal only where shared), imports from Evernote and Bear (#321). Notes only under NOVA's Notes
  scope (ZIGi says it does not read notes; the how-to answers need no notes). Never a note's words.
- Cases: `lib/ai/evals/as/cases-av2-r4-notes.ts` (`AV2_R4_NOTES`, 12 intents, 48 questions). Test:
  `lib/ai/local-answers/av2-r4-notes.test.ts`. Checked here with a temporary test over every phrasing of today's CORPUS:
  none is answered by `av2R4NotesAnswer` (after narrowing the tags answer), so wiring it first moves nothing.

## Review b4g fixes (`docs/review/.../scratchpad/review-b4g.md`, at `b0357054`)

- **B4G-1, B4G-2 (Blockers): a locked note shows nothing of itself without the PIN.** One shared test,
  `isLockedHidden(note)` (`lib/notes/schema.ts`; `lock.ts`'s `isLocked` is it), and one tag reader, `visibleTagsOf(note)`
  (`lib/notes/tags.ts`: none for a locked note, since its kept tags came from its words too). `tagTree` (the Tags fold
  and NOVA's tags answer), `hasTag` / `focused` (the focus), `noteRows` (the table's Tags, Words and Links columns and
  the gallery's line: "Locked", no counts, no photo) and `notesPerTag` (the chart) read it. Every Notes layout (table,
  gallery, board, chart) now draws `shownOf(note)` (`lib/notes/lock.ts`): a locked note keeps its name, kind, days and
  the lock only — no words, tags, photos (B4G-1: the gallery's thumbnail) or properties (the table's property columns,
  the board's columns and filters). Test: `lib/notes/b4g-locked-views.test.ts`.
- **B4G-3 (Major): a foreign note titled with a day.** Evernote and Bear notes are written for the plan with
  `type: topic`, so a title such as "2026-11-01" makes its own note (its photos kept, its lines named) and never appends
  to that day's note; and words appended to a day's note never keep an import's `![photo](imp-…)` placeholder lines.
  Test: `lib/notes/b4g-import-days.test.ts`.
- **B4G-4 (Major): the focus and daily notes.** With a focus tag, the Notes list (every layout) holds the tag's topic
  notes, then its daily notes, newest first (each "· daily note", named by its day); the Tags fold counts only the notes
  that list can show (no inbox captures, no archived notes), so "#gym · 5 notes" lists five. New `lib/notes/focus.ts`
  (`taggableNotes`, `focusList`). Test: `lib/notes/b4g-focus-days.test.ts`.
