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
