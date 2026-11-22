# Lane 2 registry: fixes for review B3C (`lane2/revb3c`)

Fix builder for the fresh review of round 3's notes and journal work (review rows B3C-1 to B3C-14; the feature's
registry is `r3-notes.md`). Branch `lane2/revb3c` from `lane2/batch3`. One commit per finding, Blocker first.
**Stored formats: none changed.** No new device key, catalogue, export, erase or restore entry. No help-page.tsx edit.

## B3C-1 (Blocker): Write as a grid never loses words

- **Verdict:** confirmed and fixed. `gridOf` found the first heading with `startsWith`, `splitAtHeadings` with a stricter
  rule; the lines between fell in no box and were dropped when the grid was written back.
- **Fix:** one heading rule, `headingOf` in `lib/journal/prompt-answers.ts`, used by both. A heading on its own line, or
  a heading ending in a mark (`:` `?` `,` `…`) with words after it on the same line. "Dear future me, I hope you are
  well." now puts "I hope you are well." in the first box. Headings that end in a letter or digit (your own templates)
  count only on their own line, so a sentence that starts with the same word is not taken for a heading; such lines stay
  above the grid. Every line before the first heading goes above the grid; every line after it falls in a box.
- **Tests:** `lib/journal/revb3c-grid.test.ts`: the letter template with words on the heading's line and the line after,
  in English and Dutch; lines before the first heading; own templates' headings; every template in both languages with
  words before, on and under headings and a heading written twice: no word is lost through the grid.
- **Spec:** `tests/av2-revb3c-grid.spec.ts`.
- **Help/corpus:** none.
