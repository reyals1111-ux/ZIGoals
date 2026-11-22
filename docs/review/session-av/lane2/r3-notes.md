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
