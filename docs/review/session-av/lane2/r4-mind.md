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
| #310 Journey Favourites, mood and order in the list | built | F2 |
| #317 Journey More photos in an entry | built | F3 |
| #309 Journey Throwback a week, a month and a year back | built | F4 |

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

### F2 Favourites, mood and order in the list — LEDGER #310 (Journey)

- Verdict: **built**.
- What: each entry has a ☆ Favourite button (pressed: ★; a second press takes the star off), stored as the entry's
  optional `star`. Above the list, "Show entries": Favourites (with how many), a Mood choice — the day's mood 1–5 in the
  person's own mood words (while Health is shown), Pleasant feelings, Unpleasant feelings and each feeling word used on a
  day with an entry, each with its count of days (every word of the day counts, round 2's two more words too) — and
  Order (Newest first, Oldest first). An empty choice teaches ("No favourite yet. Press ☆ Favourite on an entry…") with
  Show every entry. They sit beside the tag chips, the date search and round 3's prompt filter (#265).
- Files: `lib/journal/favourites.ts`, `lib/journal/mood-filter.ts`, `lib/journal/list-options.ts` (constants only),
  `lib/journal/search.ts` (`star`, `days`, `order`), `components/journal/entry-list-options.tsx` (lazy),
  `components/journal/journal-page.tsx`, `components/journal/journal.css`. (The page's one-line `morePhotos` check of F3
  is in this commit too: both change the same lines.)
- Tests: `lib/journal/r4-favourites.test.ts`; stored: `lib/journal/r4-stored.test.ts`. Spec: `tests/av2-journal-favourites.spec.ts`.
- Stored: entry `star` (TIER 3 commit `9d4e8a51`). The journal ZIP writes it as Day One's `starred` and the Markdown front
  matter's `starred: true`, and Import reads both back.
- Help (EN). Q: "Can I star journal entries, or see them by mood?" A: "Yes. Press ☆ Favourite on an entry to star it, and
  Favourites above the list to see only starred entries. Mood shows the entries of the days you rated a mood or picked a
  feeling word, and Order turns the list to oldest first. The star is kept with the entry, in your exports too."
- What's new: "Journal: star an entry, see your favourites, find entries by mood or feeling word, and read oldest first."
- Showcase: none added (a starred Showcase entry would change NOVA's pinned journal answers; the hook would be one
  `star: true` on `showcase-journal-0` in `lib/journal/showcase.ts`, if the corpus is re-recorded).
- CSS touched: `components/journal/journal.css`.
- Today: nothing added.

### F3 More photos in an entry — LEDGER #317 (Journey)

- Verdict: **built** (12 photos, as the row names it; Journey's videos stay out, as the row does).
- What: Write → "Photos and a voice note" takes up to 12 photos ("6 of 12 photos"). On Save the room is checked first —
  the journal media store's 400 photos and voice notes, and the browser's storage quota where it says
  (`navigator.storage.estimate`, a 10 % margin at 200 kB a photo) — with a plain line and nothing saved when it is full.
  The first four stay in `photos` (older builds read `photos` as `.max(4)` and would drop a longer list whole, the
  LEDGER's photo-limit note), photos five to twelve go in the new `morePhotos`. All show under the entry ("3 of 6"
  names); taking one off moves the next up, with Undo. The 30-day media sweep and Export everything name `morePhotos`
  (`namedMedia`), so nothing is swept or left out; the journal ZIP puts all twelve in Day One's one `photos` list (and
  the Markdown file's photo lines), and Import splits them back; NOVA's photo count includes them.
- Files: `lib/journal/more-photos.ts`, `lib/journal/media.ts` (`namedMedia`), `lib/journal/export.ts`,
  `lib/journal/import.ts`, `components/journal/compose-media.tsx`, `components/journal/entry-media.tsx`,
  `components/journal/journal-compose.tsx`, `components/journal/journal-files.tsx`, `lib/ai/local-answers/av2-journal.ts`
  (the photo count).
- Tests: `lib/journal/r4-more-photos.test.ts`, `lib/journal/r4-stored.test.ts`. Spec: `tests/av2-journal-more-photos.spec.ts`.
- Stored: entry `morePhotos` (TIER 3 commit `9d4e8a51`). No new key or database (the bytes stay in
  `zigoals-journal-media-v1`, already in Export everything and the erase).
- **For the lead (restore of the photo bytes)**: `lib/restore/media.ts` `indexMedia` lists a journal entry's `photos`
  only; please let it read `morePhotos` too, so a backup's photos five to twelve come back:
  `for (const id of [...(Array.isArray(e.photos) ? e.photos : []), ...(Array.isArray(e.morePhotos) ? e.morePhotos : [])]) …`
  (line 56). Until then the entry keeps their ids and says "This photo is not in this browser" for them after a Restore.
- Help (EN). Q: "How many photos can a journal entry have?" A: "Up to 12, kept on this device only. Before they are kept,
  ZIGoals checks there is room; if the device is nearly full it says so and keeps nothing. Older versions of ZIGoals show
  the first four."
- What's new: "Journal: up to 12 photos in an entry."
- Showcase: none.
- CSS touched: none.
- Today: nothing added.

### F4 A week, a month and a year back — LEDGER #309 (Journey)

- Verdict: **built**.
- What: the Journal's "On this day" shows the years back first (as before), then the same day a month ago, then a week
  ago, side by side ("1 year ago and 2 more"); "Not this one" sets any of them aside. Today's journal line keeps
  `onThisDay` exactly as it was (years, else a month; pinned by `av-journal-today`). Under Privacy, beside "Show On this
  day", an opt-in "Tell me in the morning when there is a memory" (off by default, gone while On this day is hidden):
  on a day with a memory the device wakes at the morning time (the end of quiet hours when the morning is quiet), under
  the Journal notification switch, and says only "A memory from a year ago" (a month, a week) — never a word of it.
- Files: `lib/on-this-day/throwback.ts`, `components/journal/on-this-day.tsx`, `components/journal/on-this-day-switch.tsx`,
  `lib/notify/plan.ts` (`memories`), `lib/notify/sync.ts`, `public/sw.js` (its line; the reminder-to-write line now leaves
  `memory:` ids out as it does `letter:` ones).
- Tests: `lib/on-this-day/r4-throwback.test.ts` (with the plan and the worker's words), `lib/journal/r4-stored.test.ts`.
  Spec: `tests/av2-journal-throwback.spec.ts`.
- Stored: `zigoals:journal-display:v1` `memoryNotify` (TIER 3 commit `9d4e8a51`). TIER 3 (PWA): the notification plan's
  journal kind gains memory wakes (`memory:<day>` ids, a day and how long ago only), in this feature's commit.
- Help (EN). Q: "Can the journal show me what I wrote a week or a month ago?" A: "Yes. On this day, at the top of the
  Journal, shows what you wrote on this date in earlier years, the same day a month ago and a week ago. Under Journal →
  Privacy you can ask to be told in the morning when there is a memory; the notification says only how long ago, never
  your words." **Please also update** the existing Help answer `ak-journal-more` ("…in earlier years, or a month ago")
  to "…in earlier years, a month ago and a week ago".
- What's new: "Journal: On this day shows a week and a month back too, and can tell you in the morning (opt-in)."
- Showcase: none needed (the Showcase's two year-back memories show as before).
- CSS touched: none.
- Today: nothing added (Today's line is unchanged).
