# Lane 2 registry: round 4, notes and journal files (`lane2/r4-notes`)

Builder: the round-4 notes builder, on `lane2/batch3` (round 3's notes work included). Scope: LEDGER "Round 4" groups
U2 (#306, #307, #311, #312, #313, #314, #315, #316) and U9 (#318, #319, #320, #321); COMPETITORS.md round 4's Bear and
Journey rows for them. Round 3's notes work (tick boxes, highlights, outline, print, properties, canvas;
`docs/review/session-av/lane2/r3-notes.md`) is built on, never repeated. The safe-render rule stands: every new mark is
switched on by `parseBlocks(text, {notes: true})`, which only Notes passes; ZIGi's and NOVA's replies get the old tree.

Baseline check (#306, #307 and #316 change the Notes layout): docs/STATUS.md "Current accepted baseline" protects PR
#22's changes and the brief's protected areas (Today hero and slogan, Checklist orbit path, footer finale, swan intro,
shell navigation, AR's NOVA composition, the locked ZIGi look). Nothing of Notes is among them; none of them is touched.

## Stored changes (TIER 3 stored formats; all additive, optional, dropped when unreadable, on loose objects)

| record | field | what |
|---|---|---|
| `zigoals:notes:v1` note | `photos` | up to 7 further photo ids after `photoId` (8 in a note), each placed in the words by a `![photo](<id>)` line (LEDGER #307) |
| note | `archived` | the note is archived: out of the lists and the graph, still in Search and the exports (LEDGER #315) |
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
