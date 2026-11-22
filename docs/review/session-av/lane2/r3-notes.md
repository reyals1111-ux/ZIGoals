# Lane 2 registry: round 3, notes and journal (`lane2/r3-notes`)

Builder: the round-3 notes-and-journal builder. Scope: LEDGER "Round 3" groups T5 (#264, #267, #268, #271), T6 (#265,
#266, #269, #272, #277, #278, #279) and T9 (#270, #273); COMPETITORS.md round 3's Obsidian, Grid Diary and Stoic rows.
#274 (Mermaid) stays Carried: a new dependency (the Mermaid package); a mermaid block stays readable as code.

Baseline check (#273 changes the Notes layout): docs/STATUS.md "Current accepted baseline" protects PR #22's changes (the
nebula Z and wordmark, the nav highlight, the hero star and slogan, motion polish, goal choice tiles, iPhone zoom) and
the brief's protected areas (Today hero and slogan, Checklist orbit path, footer finale, swan intro, shell navigation,
AR's NOVA composition, the locked ZIGi look). Nothing of Notes or the Journal is among them; none of them is touched.

## Summary

| LEDGER row | verdict | feature |
|---|---|---|
| #264 Obsidian Tick boxes in notes, gathered | built | F1 |
| #267 Obsidian Highlights in six colours | built | F1 |
| #268 Obsidian Outline of a note | built (reordering sections by dragging left out, as the row says) | F2 |
| #271 Obsidian Print a note or save it as PDF | built | F2 |
| #265 Grid Diary Every answer to one prompt | built | F3 |
| #266 Grid Diary Grid layout and the Mandala | built | F4 |
| #269 Grid Diary Entries for a week, a month or a year | built | F5 |
| #272 Grid Diary Export as Markdown | built | F6 |
| #277 Stoic Quotes from Stoic writers | built | F7 |
| #278 Stoic Dream journal from the sleep log | built; Stoic's insomnia lessons Carried: needs content made for ZIGoals | F8 |

## Features

### F1 Tick boxes and highlights in notes — LEDGER #264, #267 (Obsidian)

- Verdict: **built**.
- What: in a note's reading view, a "- [ ] words" line (also `* [ ]`, `1. [ ]`) is a tick box. Ticking it writes
  "- [x]" into that line of the note's text; the words it replaces are kept as an earlier version and the toast offers
  Undo; focus stays on the box. Notes → Notes → "Open tick boxes" (a fold; its face counts them) gathers every unticked
  box across every note, grouped under its note (the most recently changed first), each note a link back; a box ticks
  there too (Undo; focus to the list). `==words==` is a highlight; a colour circle right after the opening `==` picks one
  of six named colours (🟡 yellow — also the plain `==…==` — 🟢 green, 🔵 blue, 🟣 purple, 🔴 red, 🟠 orange), drawn from
  the page's own background in each theme, underlined in its colour, saying its colour to a screen reader, and kept as
  written in the Markdown export (the text is exported as it is). While editing, "Tick box" (the caret's line) and
  "Highlight" with a colour choice (round the chosen words) write the marks.
- ZIGi's replies: the marks are switched on only by `parseBlocks(text, {notes: true})`, which only `note-render.tsx`
  passes. ZIGi's and NOVA's reply renderers call the parser without options and get exactly the old tree (unit test both
  ways: `lib/ai/r3-safe-render-notes.test.ts`; the old `lib/ai/safe-render.test.ts` unchanged and green).
- Files: `lib/ai/safe-render.ts` (the notes-only marks, `NoteBlock`/`NoteInline` types, overloads), `lib/notes/ticks.ts`,
  `lib/notes/marks.ts`, `components/notes/note-render.tsx`, `components/notes/note-editor.tsx`,
  `components/notes/note-marks.tsx` (lazy), `components/notes/notes-ticks.tsx` (lazy), `components/notes/notes-workspace.tsx`.
- Tests: `lib/ai/r3-safe-render-notes.test.ts`, `lib/notes/r3-ticks.test.ts`.
- Spec: `tests/av2-notes-ticks.spec.ts`.
- Stored: nothing new (the tick and the highlight live in the note's text).
- Help (EN). Q: "Can a note have tick boxes?" A: "Yes. Start a line with - [ ] (or press Tick box while you edit). When
  you read the note, tick it: the line becomes - [x], the earlier words are kept under Earlier versions, and Undo is in
  the message. Notes → Notes → Open tick boxes lists every box you have not ticked yet, across all your notes, each with
  a link to its note. They stay lines of your note, not tasks." Q: "Can I highlight words in a note?" A: "Yes. Put ==
  round them (==like this==), or choose words while you edit and press Highlight. Pick one of six colours — yellow,
  green, blue, purple, red or orange; the colour is a circle written after the first == (==🟢like this==), so the
  Markdown export and Obsidian keep it as you wrote it."
- What's new: "Notes: tick boxes you can tick while reading, gathered across notes, and highlights in six colours."
- Showcase: none added (the Showcase notes' words are read by NOVA's pinned corpus; changing them would move
  `expected.json`).
- Device keys / catalogue / export / erase: none.
- CSS touched: `components/notes/notes.css`.
- Today: nothing added.

### F2 A note's outline, and Print this note — LEDGER #268, #271 (Obsidian)

- Verdict: **built**. Reordering sections by dragging is left out, as the LEDGER row says.
- What: a note with two headings or more shows "Outline · N headings" above its words (a fold, closed so a phone's first
  screen keeps the words); each heading, indented by its level, jumps to its section and puts focus on that heading.
  "Print this note" (beside Edit) puts a print sheet on the page — the title, the day (a daily note) or made / changed
  days and tags, the words as the reading view draws them (tick boxes, highlights, tables, code) and the photo — and opens
  the browser's print window, where Save as PDF makes the PDF; the sheet goes after printing and focus returns to the
  button (as the tasks list prints, LEDGER #225).
- Files: `components/notes/note-render.tsx` (headings get ids, the outline), `components/notes/note-editor.tsx`,
  `components/notes/note-print.tsx` + `note-print.css` (lazy), `components/notes/notes.css`.
- Tests: the outline and the sheet are markup; the spec checks both.
- Spec: `tests/av2-notes-outline-print.spec.ts` (window.print stubbed).
- Stored: nothing.
- Help (EN). Q: "Can I see the headings of a long note?" A: "Yes. A note with two headings or more shows Outline above
  it: open it and choose a heading to jump to that part of the note." Q: "Can I print a note or keep it as a PDF?" A:
  "Yes. Open the note and press Print this note. The print window shows its title, day, words and photo; choose Save as
  PDF there for a PDF. Nothing leaves your device."
- What's new: "Notes: an outline of a long note's headings, and Print this note (or save it as a PDF)."
- Showcase: none needed (any note with headings shows it).
- CSS touched: `components/notes/notes.css`, new `components/notes/note-print.css` (imported by its lazy chunk only).
- Today: nothing added.

### F3 Every answer to one prompt — LEDGER #265 (Grid Diary; Stoic's Journey search by prompt)

- Verdict: **built** (by template; Stoic's daily question is written into the text without a mark, so it is found by
  the journal's word search as before).
- What: Journal → Entries → "Every answer to a prompt" (a fold; its face counts the prompts written from): choose a
  template your entries began from (built-in or your own, with how many entries) and see, under each of its headings,
  what you wrote, oldest first, each answer with its day as a button that shows that day's entries. English and Dutch
  headings read the same; a heading with its words on the same line ("A good thing today: …") splits too; entries whose
  headings were changed are listed whole under "Written in its own way". An entry's More → "Every answer to this
  prompt" opens the fold on its template (`/app/journal?prompt=<template>` works from anywhere), focus on its title.
- Files: `lib/journal/prompt-answers.ts`, `components/journal/prompt-answers.tsx` (lazy), `components/journal/journal-page.tsx`,
  `components/journal/entry-more.tsx`, `components/journal/journal.css`.
- Tests: `lib/journal/r3-prompt-answers.test.ts`. Spec: `tests/av2-journal-prompt-answers.spec.ts`.
- Stored: nothing (derived from each entry's `template`).
- Help (EN). Q: "Can I see everything I wrote under one prompt?" A: "Yes. Journal → Entries → Every answer to a prompt:
  choose a template you wrote from, and each of its headings lists your answers, oldest first, with their days. From an
  entry, More → Every answer to this prompt opens it straight away."
- What's new: "Journal: every answer to one prompt, heading by heading, oldest first."
- Showcase: the Showcase's "Three good things" entry already shows here (one prompt, three headings). No count changes.
- Search palette (the lead's, optional): "Every answer to a prompt" → `/app/journal?prompt=three-good-things`.
- CSS touched: `components/journal/journal.css`. Today: nothing added.

### F4 A grid entry and the 3 × 3 Mandala — LEDGER #266 (Grid Diary)

- Verdict: **built**.
- What: Journal → Write → Start from a prompt has a second list, "Grids and look-backs": the Mandala ("one theme,
  eight sides": your theme in the centre, then body and health, work and learning, money, people I love, rest and fun,
  home, mind and mood, one small step; English and Dutch) opens as a 3 × 3 grid of labelled boxes (centre first, then
  clockwise from the top left — the order they are written and read in; one column on a phone, the 3 × 3 from 560 px).
  Any other template (two headings or more) can be written as a grid of cards too: "Write as a grid" / "Write as one
  text" (aria-pressed) switches with the words kept. The entry is still saved as text with headings (an untouched grid
  is exactly the template's headings, so it is never saved empty), so the export, Every answer to a prompt and older
  builds read it as before; a Mandala entry is drawn as its grid in the list. The month and year look-back templates of
  F5 are in the same list.
- The eight first templates stay as they were (`JOURNAL_TEMPLATES`, pinned by `templates.test.ts`, the "Prompts" list's
  eight items in `g1a-journal-prompts.spec.ts` and the answers that list them): the new ones are `MORE_TEMPLATES`; the
  picker, `templateById`, `startFrom` and `onlyHeadings` read both (`ALL_TEMPLATES`). Hidden prompts (LEDGER #56) list
  the eight only.
- Files: `lib/journal-prompts/templates.ts`, `lib/journal/grid.ts`, `components/journal/compose-grid.tsx` (lazy),
  `components/journal/entry-grid.tsx` (lazy), `components/journal/journal-compose.tsx`, `components/journal/journal-page.tsx`,
  `components/journal-prompts/prompt-picker.tsx` + `prompt-picker.css`, `components/journal/journal.css`.
- Tests: `lib/journal/r3-grid.test.ts` (the word checks of the eight applied to the new templates, too).
- Spec: `tests/av2-journal-grid.spec.ts`.
- Stored: nothing new (`template: 'mandala'` uses the existing field).
- Help (EN). Q: "Can I write an entry as a grid?" A: "Yes. Start from a prompt, then press Write as a grid: each heading
  gets its own box. The Mandala (under Grids and look-backs) is a 3 × 3 grid: your theme in the centre and eight sides of
  life around it. It is saved as ordinary text with headings."
- What's new: "Journal: write an entry as a grid of cards, and the 3 × 3 Mandala."
- Showcase: none (a Showcase entry would change the pinned entry count of 10).
- CSS touched: `components/journal/journal.css`, `components/journal-prompts/prompt-picker.css`. Today: nothing added.

### F5 Entries about a week, a month or a year — LEDGER #269 (Grid Diary)

- Verdict: **built**.
- What: Journal → Write → "This entry is about": this day (the default), this or last week (ISO weeks, Monday first,
  "Week 47 (Nov 16 – Nov 22, 2026)"), this or last month, this or last year. Choosing a period offers "Start from the
  week / month / year look-back" (the week look-back existed; the month and year look-backs are new, English and Dutch,
  F4's second list). The entry keeps its own day and an optional `period`; the list says "· about Week 47 (…)". Journal →
  Search by date: under the month, a row lists the entries about its year, the month and each week touching it, each a
  button that shows them ("Entries about Week 47 … Show every entry"). Older builds show the entry on its day, as before.
- Files: `lib/journal/periods.ts`, `lib/journal/search.ts` (`period` in the filter), `components/journal/journal-compose.tsx`,
  `components/journal/journal-calendar.tsx` (lazy), `components/journal/journal-page.tsx`, `lib/journal-prompts/templates.ts`,
  `components/journal/journal.css`.
- Tests: `lib/journal/r3-periods.test.ts`; stored round trip in `lib/journal/r3-stored.test.ts`.
- Spec: `tests/av2-journal-periods.spec.ts`.
- Stored: entry `period` (TIER 3 commit `3c7c0bbe`; see "Stored changes").
- Help (EN). Q: "Can an entry be about a whole week, month or year?" A: "Yes. When you write, choose what it is about
  under This entry is about: this or last week, month or year. A look-back template is offered for each. The entry keeps
  the day you wrote it, and Search by date lists it under its week, month or year."
- What's new: "Journal: entries about a week, a month or a year, with look-back templates."
- Showcase: none (a Showcase entry would change the pinned entry count of 10; a `period` on an existing Showcase entry
  would move what the pinned Journal specs show on its row).
- CSS touched: `components/journal/journal.css`. Today: nothing added.

### F6 The journal as Markdown files — LEDGER #272 (Grid Diary)

- Verdict: **built**.
- What: Journal → Import and export → Export the journal: the same ZIP now also holds `Markdown/`, one .md per entry
  ("2026-11-20 A fictional walk by the sea.md"), each with YAML front matter (date, created, updated, journal, tags,
  template, period, night, opens-on, its id, `app: ZIGoals`), its words as written, ZIGi's question and the answer as a
  quote, and its photos linked beside it (`../photos/…`), for Obsidian and other apps. journal.json carries the round-3
  fields too. Import of a ZIGoals ZIP reads journal.json and leaves the Markdown copies out (nothing doubles); the
  Markdown files on their own import back with their journal, template, period, night and opening day.
- Files: `lib/journal/export.ts` (`entryMarkdown`), `lib/journal/import.ts` (the round-3 fields from journal.json and own
  Markdown front matter), `components/journal/journal-files.tsx`.
- Tests: `lib/journal/r3-markdown-export.test.ts`; a labelled deliberate change in `lib/journal/av2-import.test.ts` (the
  export's file list now ends with the two entries' .md files, listed exactly).
- Spec: `tests/av2-journal-markdown.spec.ts` (reads the downloaded stored ZIP).
- Stored: nothing.
- Help (EN). Q: "Can I take my journal to Obsidian?" A: "Yes. Journal → Import and export → Export the journal makes a
  ZIP with every entry as its own Markdown file in Markdown/ (its day, journal and tags at the top, its photos beside
  it). Put that folder in your vault. ZIGoals' own Import reads the same ZIP back without doubling anything."
- What's new: "Journal: the export now holds every entry as a Markdown file too, for Obsidian and other apps."
- Showcase: the Showcase journal exports the same way (its file name says example). CSS: none. Today: nothing added.

### F7 A quote of the day from the Stoic writers — LEDGER #277 (Stoic)

- Verdict: **built**. Written text, not content (the LEDGER's note on #71 and #81).
- What: Journal → Privacy → "Show a quote of the day from the Stoic writers … on Today" (off by default). When on,
  Today's journal card shows one quote a day (by the date alone) from Marcus Aurelius, Seneca or Epictetus, the writer and
  the place named ("— Seneca, Letters to Lucilius letter 13"), with "Another one" and "Write about this" (the Journal
  opens with an entry that starts with the quote as a Markdown quote and its writer). In the language of the Journal's
  daily question; the Dutch caption says the Dutch words are written for ZIGoals. Off: nothing at all on Today.
- The words: 33 lines, each quoted as printed in a public-domain translation and checked word for word against the
  Wikisource transcriptions (George Long's Meditations, 1862; Richard Mott Gummere's Moral Letters to Lucilius, Loeb
  1917–1925; George Long's Encheiridion, 1877). Excerpts end at a full stop, colon or semicolon of the original. Chosen
  for calm words: nothing about death, illness or food (unit-tested). The Dutch lines are ZIGoals' own words.
- Files: `lib/journal/quotes.ts`, `components/journal/today-quote.tsx` (lazy), `components/journal/today-journal-card.tsx`,
  `components/journal/today-affirmation.css`, `components/journal/journal-page.tsx` (the switch),
  `components/journal/journal-compose.tsx` (`?quote=`).
- Tests: `lib/journal/r3-quotes.test.ts`; stored round trip in `lib/journal/r3-stored.test.ts`.
- Spec: `tests/av2-journal-quote.spec.ts`.
- Stored: journal `quotes` (TIER 3 commit `3c7c0bbe`). The LEDGER's stored list did not name #277; "the on/off choice
  joins the affirmation's own setting" is read as a switch beside the affirmation's, in the same record.
- Help (EN). Q: "Can Today show a Stoic quote?" A: "Yes, if you want one. Journal → Privacy → Show a quote of the day
  from the Stoic writers. Today's journal card then shows a line from Marcus Aurelius, Seneca or Epictetus, with who
  wrote it. Another one shows the next; Write about this starts a journal entry with the quote. The English lines are
  old public-domain translations; the Dutch lines are written for ZIGoals."
- What's new: "Journal: a quote of the day from Marcus Aurelius, Seneca and Epictetus, if you switch it on."
- Showcase: none (off by default, as the affirmation).
- Today: **visible only when switched on** (off by default; the Showcase has it off), on Today's journal card: two
  buttons/links (Another one, Write about this). Nothing is added to Today's Tab stops or screen while it is off.
- CSS touched: `components/journal/today-affirmation.css`.

### F8 Write down a dream from the sleep log — LEDGER #278 (Stoic)

- Verdict: **built**; part Carried: Stoic's insomnia lessons (Sleep Better) — needs content made for ZIGoals.
- What: Health → Sleep → Recent nights: the latest night (the morning's entry) offers "Write down a dream"; it opens the
  Journal with a dream entry for that night ("Your dream", a line saying which night and that it goes in the Dreams
  journal, "Not a dream" to write an ordinary entry). Saving it puts the entry in a journal called Dreams, made on its
  first use (a journal already called Dreams or Dromen is used; with ten journals and none for dreams it goes in the main
  Journal), linked to the night (`night`). The Journal's row says "· a dream, the night ending Nov 22"; the sleep log says
  "1 dream written" on that night, a link to that day's entries, and then offers "Write down another dream". The dream's
  words stay in the Journal (the sleep log shows a count). Health's gate is unchanged (the sleep log is under Health).
- Files: `lib/journal/dreams.ts`, `components/health/sleep/night-dreams.tsx` (lazy), `components/health/sleep/sleep-view.tsx`,
  `components/health/sleep/sleep.css`, `components/journal/journal-compose.tsx` (`?dream=`), `components/journal/journal-page.tsx`,
  `components/journal/journal.css`.
- Tests: `lib/journal/r3-dreams.test.ts`; stored round trip in `lib/journal/r3-stored.test.ts`.
- Spec: `tests/av2-journal-dream.spec.ts`.
- Stored: entry `night` (TIER 3 commit `3c7c0bbe`); the Dreams journal is an ordinary `journals` item.
- Help (EN). Q: "Can I keep a dream journal?" A: "Yes. In Health → Sleep, the latest night has Write down a dream. It
  opens the Journal; what you write goes in a Dreams journal (made the first time) and is linked to that night, so the
  sleep log shows the dreams you wrote for it."
- What's new: "Sleep and Journal: write down a dream from the morning's night; it goes in your Dreams journal."
- Showcase: none (a Showcase entry would change the pinned entry count of 10).
- CSS touched: `components/health/sleep/sleep.css`, `components/journal/journal.css`. Today: nothing added.
