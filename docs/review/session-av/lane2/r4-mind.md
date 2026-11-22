# Lane 2 registry: round 4, journal and mind (`lane2/r4-mind`)

Builder: the round-4 journal-and-mind builder, from `lane2/batch3`. Scope: LEDGER "Round 4" groups U3 (#308, #309, #310,
#317; Journey) and U5 (#323, #324, #325, #326, #327; Atoms, How We Feel); COMPETITORS.md round 4's Journey, Atoms and How
We Feel rows. Built on the journal (journal.md), habits (habits.md), round 3's notes marks (r3-notes.md) and round 3's
habit reminders (r3-health.md); nothing of theirs is duplicated.

Baseline check: docs/STATUS.md "Current accepted baseline" and the brief's protected areas (Today hero and slogan,
Checklist orbit path, footer finale, swan intro, shell navigation, AR's NOVA composition, the locked ZIGi look) are not
touched. Nothing new is always visible on Today.

## Summary

| LEDGER row | verdict | feature |
|---|---|---|
| #308 Journey Formatting and tick boxes in an entry | built | F1 |

## Features

### F1 Formatting and tick boxes in an entry — LEDGER #308 (Journey)

- Verdict: **built**.
- What: an entry with Markdown — `#` headings, `**bold**`, `*italics*`, lists, `>` quotes, `==highlights==` in six
  colours, `` `code` ``, tables and `- [ ]` tick boxes — is drawn as Notes draw theirs, its line breaks kept. A tick box
  ticks in the list: the line becomes `- [x]` in the entry's own words, the words it had are kept under Earlier versions
  (as any change of an entry is), the message offers Undo and focus stays on the box; "1 of 2 ticked" under a list of
  two or more. Under Write (and under More → Edit the words) a format bar — Bold, Italics, Heading, List, Tick box, Quote,
  Highlight with a colour — writes the marks round the chosen words or at the start of the caret's lines (pressing
  Heading, List or Quote again takes the mark off); focus returns to the words with them still chosen. A plain entry
  (no mark) keeps its one plain paragraph, exactly as before; no Showcase entry changes (unit-tested).
- ZIGi's replies: the marks come from round 3's notes-only parser marks (`parseBlocks(text, {notes: true})`); the new
  `breaks` option (keep a paragraph's line breaks) is honoured only together with `notes: true`. ZIGi's and NOVA's
  renderers pass no options and get exactly the old tree (unit test both ways; `safe-render.test.ts` and
  `r3-safe-render-notes.test.ts` unchanged and green).
- Files: `lib/ai/safe-render.ts` (`breaks`), `lib/journal/has-marks.ts` (no imports, the first chunk's check),
  `lib/journal/marks.ts`, `components/journal/entry-rich-text.tsx` (lazy; now draws the marks too),
  `components/journal/journal-format.tsx` (lazy), `components/journal/entry-format.css` (new; imported by the two lazy
  chunks only), `components/journal/journal-compose.tsx`, `components/journal/entry-more.tsx`,
  `components/journal/journal-page.tsx`.
- Tests: `lib/journal/r4-marks.test.ts`. Spec: `tests/av2-journal-format.spec.ts`.
- Stored: nothing new (the marks and the ticks live in the entry's text; a tick keeps an earlier version as an edit does).
- Help (EN). Q: "Can I format a journal entry or add tick boxes?" A: "Yes. Under the entry's words, the format bar makes
  chosen words bold, italic or highlighted, and a line a heading, a list item, a quote or a tick box. You can also type
  the marks yourself, as in Notes: **bold**, *italics*, ## a heading, - a list, > a quote, - [ ] a tick box. In your
  entries a tick box ticks with one tap; the words it had are kept under More → Earlier versions, and Undo is in the
  message. Your entry is kept as you wrote it, so exports and other apps read the same words."
- What's new: "Journal: headings, bold, lists, quotes, highlights and tick boxes in an entry, with a format bar."
- Showcase: none added (the Showcase journal's words are read by NOVA's pinned corpus).
- Device keys / catalogue / export / erase: none.
- CSS touched: new `components/journal/entry-format.css` (please regenerate the theme sheets if they cover it).
- Today: nothing added (the format bar is only on the Journal page, not on Today's compact Write).
