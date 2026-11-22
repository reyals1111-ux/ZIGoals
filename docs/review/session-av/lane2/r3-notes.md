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
