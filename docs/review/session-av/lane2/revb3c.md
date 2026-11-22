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

## Sealed letters (B3C-2, B3C-3, B3C-4, B3C-14): one rule everywhere

All four read through `isSealed(entry, today)` and `unsealed(entries, today)` in `lib/journal/letters.ts` (a letter
whose `opensOn` is after today). Shared unit tests: `lib/journal/revb3c-sealed.test.ts`; spec:
`tests/av2-revb3c-sealed.spec.ts`.

### B3C-2 (Major): On this day and Today's line

- **Verdict:** confirmed and fixed.
- **Fix:** `journalMemories(entries, today)` in `lib/journal/today.ts` (On this day without sealed letters) is used by
  the Journal page's On this day (`components/journal/on-this-day.tsx`) and by `journalToday` (Today's journal line).
  Today's opt-in first lines are built by the new pure `journalLines(day, today)`, which leaves out a sealed letter
  written today (it is still counted in "Written today: 1 entry"; the count shows no words).
- **Tests:** a letter written a month ago and one a year ago, both sealed, are no memory; on its opening day the letter
  is a memory again; Today's lines carry no sealed words.
- **Help/corpus:** none.

### B3C-3 (Major): Every answer to a prompt

- **Verdict:** confirmed and fixed.
- **Fix:** `answersTo(journal, template, lang, today)` splits only `unsealed` entries; the letters still folded away
  come back as `sealed` (their opening days only). The fold says "1 letter is folded away until Nov 22, 2027; its words
  show here from that day." (or the count and the next day). `promptsUsed` still counts them in the picker (a count,
  no words). An entry's More → Every answer to this prompt opens the same view.
- **Tests:** no sealed words in the result; the opening days listed; on the opening day the words are there; the picker
  counts without words.
- **Help/corpus:** none. Help could add to the "Every answer to a prompt" answer: "A letter folded away is counted here
  and shows its words from its day."
