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

### B3C-4 (Major): ZIGi's and NOVA's journal tool

- **Verdict:** confirmed and fixed.
- **Fix:** `lib/ai/tools/journal-ai.ts` reads `unsealed(entries, habitDay)` for the entries it sends (text, follow-up
  question and answer) and for the patterns. A sealed letter in the days asked is only counted:
  `lettersFoldedAway: n` with `lettersNote` ("1 letter to open later is folded away until its day: never quote, guess or
  ask about its words."). With sharing off, nothing changed (the count of entries only).
- **Tests:** a sealed letter's words, follow-up question and answer never appear in the tool's output; it is counted;
  an open letter is read like any entry on its day; sharing off unchanged.
- **Help/corpus:** none (the tool output shape only gains two optional keys; the NOVA corpus is untouched).

### B3C-14 (Minor): journal search

- **Verdict:** confirmed and fixed; the same leak was also in Search everything (and NOVA's search over this device,
  `lib/search/notes-everything.ts`), fixed with it.
- **Fix:** `filterEntries(journal, filter, today, readEarly)` matches a sealed letter's words only after "Read it now"
  on this visit (the page passes its `readEarly` set) or from its day; its tags (shown on the folded row), its day and
  the calendar still find it. `readEverythingSources` reads `unsealed(entries, today)` for the journal.
- **Tests:** `lib/journal/revb3c-search.test.ts` (jsdom): words find nothing, an opened letter is found, tags and day
  still find it, Read it now and its day make the words searchable; Search everything gives no hit from a sealed letter.
- **Help/corpus:** none.

## B3C-5 (Major): the Markdown journal import doubles nothing

- **Verdict:** confirmed and fixed.
- **Fix:** export and import agree on the follow-up's form. `entryMarkdown` writes ZIGi's question and answer after the
  words as a quote block, every line marked `> ` (a multi-line answer was not quoted before), the question and answer
  apart by an empty `>` line, and says so in the front matter (`follow-up: quote`). On import of a ZIGoals file
  (`app: ZIGoals`) with that line, `followUpOfQuote` takes the trailing quote block off the words and gives it back as the
  entry's follow-up. The duplicate check also knows a ZIGoals Markdown entry by its day and creation time (`created:`),
  so an entry edited since the export is not doubled either. A quote of the person's own before the follow-up, or at the
  end of an entry without one, stays words; another app's file is read as before.
- **Not a stored format:** the device record is unchanged; the export file gains one front-matter line.
- **Tests:** `lib/journal/revb3c-markdown-followup.test.ts`: the file's form; read back; into the journal they came from
  (all already there); into an empty journal (words and follow-up as they were, then a second import adds nothing); an
  entry changed since; another app's file. Existing `r3-markdown-export` and `av2-import` tests pass unchanged.
- **Spec:** `tests/av2-revb3c-markdown-import.spec.ts`.
- **Help/corpus:** none.

## B3C-6 (Major): note properties survive the Markdown round trip in full

- **Verdict:** confirmed, and worse at the maximum: ten long text properties written twice (readable lines plus the
  JSON copy) did not fit the 8,000-character front matter, so the whole front matter (title included) came back as body.
- **Fix:** each value is written once, on its own readable line (`Due date: 2026-12-01`, `Status: "In progress"`,
  `Code: "0042"`; a text single-quoted when that is shorter, so quotes do not double its length), and `zigoals-props`
  holds only the names and types (`[["Due date","date"],["Status","choice"],["Code","text"]]`, at most about 600
  characters, under the 1,000-character value cut). The front-matter reader (`lib/notes/markdown.ts` `FM_KEY`) now
  accepts a key with letters of any language, digits, spaces, `-` and `_` (a property name as Obsidian writes it);
  quoted keys, YAML tags and `__proto__`/`constructor`/`prototype` are still dropped (the existing safety test passes
  unchanged). Import reads each value by the type `zigoals-props` names; a value that does not fit is left out. A
  round-3 export (values inside `zigoals-props`) still reads back. Another app's keys with spaces now become properties.
- **Not a stored format:** the device record is unchanged; only the export file's front-matter lines.
- **Tests:** `lib/notes/revb3c-props.test.ts`: ten properties (names with spaces and in Dutch, a choice, "0042",
  "2026-01-01" and "true" as text, numbers, a tick, long texts with quotes, colons, "#", backslashes and line breaks)
  come back exactly through `noteToMarkdown` → `planImport`; ten texts of 500 characters fit and come back; the written
  form; a round-3 file; odd keys dropped; a value that does not fit is not guessed. All `lib/notes` tests pass.
- **Spec:** none (it shows only through a file export and import; the unit test runs the same `planImport` the
  Notes → Files import calls).
- **Help/corpus:** none.

## B3C-7 (Major): Encheiridion 22 as printed

- **Verdict:** confirmed and fixed. Checked against Wikisource's transcription of Long's 1877 Encheiridion (section
  XXII), which reads "Do you not show a supercilious look; but hold on to the things which seem to you best as one
  appointed by God to this station." (the review quoted "and do you hold on"; the Wikisource text has "but hold on").
- **Fix:** `ep-22` is now "…hold on to the things which seem to you best as one appointed by God to this station." — the
  original's own small letter after "…" (it starts inside the sentence), ending at its full stop. Dutch: "…houd vast aan
  wat jou het beste lijkt, als iemand die door God op deze plek is gezet." Same id and place, so the day's order stays.
- **Tests:** `lib/journal/revb3c-quotes.test.ts` pins the line word for word; every line ends at a full stop; an excerpt
  marked "…" in English is marked in Dutch.
- **Help/corpus:** none (no corpus case or spec pins a quote's words).

## B3C-8 (Minor): Seneca 1 and Meditations VII.67 start where the original does

- **Verdict:** confirmed and fixed (checked on Wikisource: Gummere's letter 1, "Therefore, Lucilius, do as you write me
  that you are doing: hold every hour in your grasp."; Long's VII.67, "Always bear this in mind; and another thing too,
  that very little indeed is necessary for living a happy life.").
- **Fix:** `se-1-a` starts at the sentence start: "Therefore, Lucilius, do as you write me that you are doing: hold every
  hour in your grasp. Lay hold of to-day’s task, and you will not need to depend so much upon to-morrow’s." (Dutch:
  "Doe dus, Lucilius, wat je me schrijft dat je doet: houd elk uur vast. …"). `ma-7-67` keeps the original's small
  letter after "…": "…very little indeed is necessary for living a happy life." (Dutch with "…" too).
- **Tests:** `lib/journal/revb3c-quotes.test.ts` pins both word for word and checks every line: a capital at a sentence
  start, or "…" and a small letter inside one.
- **Help/corpus:** none.

## B3C-9 (Minor): one fence rule for Open tick boxes and the reading view

- **Verdict:** confirmed and fixed.
- **Fix:** the fence rule moved to `lib/markdown-fence.ts` (constants only): `FENCE_OPEN` (three or more backticks or
  tildes, at most a language name after) and `closesFence(marker, line)` (the same character, at least as many,
  nothing else). `parseBlocks` (lib/ai/safe-render.ts, behaviour unchanged) and `tickLines` (lib/notes/ticks.ts) both
  use it, so a `- [ ]` inside a four-backtick block is code in both, and a box after the block is found.
- **Tests:** `lib/notes/revb3c-ticks.test.ts`: the review's case; a "```js some words" line; the close rules; mixed
  notes where Open tick boxes and the reading view list the same lines; ticking from the list never rewrites code. The
  safe-render tests pass unchanged.
- **Help/corpus:** none.

## B3C-10 (Minor): a box whose words are on the next line

- **Verdict:** confirmed and fixed.
- **Fix:** the reading view's parser (`lib/ai/safe-render.ts`, notes only) makes a tick box only when the item's own
  first line has words after `[ ]`/`[x]` — the line `setTick` rewrites and `tickLines` lists. `- [ ]` with its words on
  the next line is a plain item ("[ ] words"), so no box is drawn that cannot be ticked. ZIGi's and NOVA's replies are
  untouched (no tick boxes there).
- **Tests:** `lib/notes/revb3c-ticks.test.ts`: such an item is plain; every box the reading view draws can be ticked and
  matches Open tick boxes.
- **Help/corpus:** none.

## B3C-11 (Minor): the Tick box button at caret 0

- **Verdict:** confirmed and fixed.
- **Fix:** `insertTick` (`lib/notes/marks.ts`) takes the line start as 0 when the caret is at 0.
- **Tests:** `lib/notes/revb3c-marks.test.ts`: caret 0 on an empty first line of a text that starts with a newline marks
  the first line; caret 0 with words; caret after the newline; two leading newlines. The round-3 tests pass unchanged.
- **Help/corpus:** none.
