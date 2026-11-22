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
| #323 Atoms The person behind the habits | built | F5 |
| #327 Atoms Start small, then step up | built | F5 |
| #324 How We Feel What a feeling word means | built | F6 |
| #325 How We Feel Strategies for a feeling | built; the strategy videos Carried: needs content made for ZIGoals | F6 |
| #326 How We Feel Where you feel it | built (plain words, no medical meaning, per the owner note) | F6 |
| NOVA and ZIGi answers for all of the above | built | F7 |

## For the lead (shared files this branch does not edit)

1. **Engine wiring** (`lib/ai/local-answers/engine.ts`, one line beside the other `av2…Answer` calls, with the same
   `!subject` guard and `groupUnits` / `novaWording` handling): `import {av2R4MindAnswer} from './av2-r4-mind';` and try
   `av2R4MindAnswer(question, env)` before `av2JournalAnswer` and `avAnswer` (its "how many photos can an entry have" must
   come before the journal's photo count). Corpus: add `...AV2_R4_MIND` from `lib/ai/evals/as/cases-av2-r4-mind.ts`
   (10 intents, 40 questions, EN and NL) to `CORPUS` and record `expected.json`. Unit test:
   `lib/ai/local-answers/av2-r4-mind.test.ts`, which also checks that no question of today's CORPUS is answered by it, so
   wiring it first moves nothing.
2. **Restore of photos five to twelve**: `lib/restore/media.ts` line 56 should read `morePhotos` beside `photos` (F3).
3. **Help**: the Q+As below, and the existing `ak-journal-more` answer's "or a month ago" → "a month ago and a week ago" (F4).
4. **No new device key, database, catalogue, export, erase or restore entry.** Every new field is in an existing record
   (`zigoals:journal:v1`, `zigoals:journal-display:v1`, `zigoals:habit-extras:v1`, `zigoals:energy:v1`), already in
   Export everything, the backup, restore and the erase; round trips unit-tested with those helpers
   (`lib/journal/r4-stored.test.ts`, `lib/habit-intentions/r4-stored.test.ts`). The habit extras' new fields sync with
   that section (its deny-list syncs any field it does not name), as `intentions` does — TIER 3 (auth/sync) by reach only:
   no sync code changed.
5. **Specs for the shard lists** (none run here): `tests/av2-journal-format.spec.ts`, `av2-journal-favourites.spec.ts`,
   `av2-journal-more-photos.spec.ts`, `av2-journal-throwback.spec.ts`, `av2-habit-identity.spec.ts`,
   `av2-feelings-more.spec.ts`.
6. **CSS for the theme sheets**: new `components/journal/entry-format.css`, `components/habits/habit-mind.css`; changed
   `components/journal/journal.css`, `components/mood-words/mood-words.css`.
7. **Route weight** (not measured; no build here): every new UI part is a lazy chunk — the entry's Markdown and the format
   bar, the list's Favourites / Mood / Order, who you are becoming, the step-up card, a habit's sizes (inside the lazy
   when-and-where chunk), the feeling choices and where you feel it (inside the lazy feeling-word grid). The first chunks
   gained: Journal — `has-marks.ts` (two regexes), `list-options.ts` (a constant), `favourites.ts` (`starEntry`), the star
   button and the empty-list line, three lazy imports and the #write-it-out / #thought-check fold opener; Habits — two
   lazy imports and their two JSX lines (about 0.3 kB, inside its ~5.6 kB headroom); Today — nothing (Write's format bar
   is only on the Journal page; the compact Write gains one lazy import line). Please check `/app/journal` and `/app/habits`.
8. **TIER 3 commits**: `9d4e8a51` (stored formats: journal `star`, `morePhotos`, journal-display `memoryNotify`), `0ebb9350`
   (stored formats: habit extras `identities`, `stepUp`; mood-word day `body`; check-in `ownMeanings`), and the
   #309 feature commit `0191a086` (PWA: memory wakes in the notification plan and `public/sw.js`'s line).
9. **Today**: nothing is always visible; Showcase Today's Tab stops do not change.
10. **Showcase**: nothing added, so no pinned count or corpus answer moves; the hooks are listed per feature.

## Stored changes (TIER 3 stored formats; all additive, optional, on loose objects; a value this build cannot read is dropped or left out where read)

| record | field | what |
|---|---|---|
| `zigoals:journal:v1` entry | `star` | `true` when the person starred the entry (LEDGER #310) |
| entry | `morePhotos` | photos five to twelve, up to 8 media ids; `photos` keeps the first four (LEDGER #317) |
| `zigoals:journal-display:v1` | `memoryNotify` | the person asked for the morning memory notification (LEDGER #309) |
| `zigoals:habit-extras:v1` | `identities` | up to 5 `{id: id-…, text ≤ 80, habits: [habitId ≤ 30]}` (LEDGER #323) |
| habit extras | `stepUp` | per habit `{small?, next? (≤ 60), now?: small/next, since?, card?: true, later?}` (LEDGER #327) |
| `zigoals:energy:v1` mood-word day | `body` | up to 3 `{area: head/jaw/throat/chest/shoulders/stomach/hands/legs, feel: tight/warm/heavy/buzzing/calm}` (LEDGER #326) |
| energy `checkin` | `ownMeanings` | `{ownWord: line ≤ 120}`, up to 48 (LEDGER #324) |

Older builds keep every field untouched (the records are loose; the check-in and the habit extras are written by
read-modify-write that keeps unknown fields) and show the journal, the habits and the feelings as before.

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

### F5 The person behind the habits, and start small then step up — LEDGER #323, #327 (Atoms)

- Verdict: **built** (both).
- What (#323): Habits → "Who you are becoming" (below "Your areas this week"): up to five lines in the person's own words,
  each joined to the habits that serve it (checkboxes), with this month's and this week's ticks counted toward it ("22
  times this month · 3 times this week") and the habits named. Counts only: no score, level or streak. Add, Edit and
  Remove (Undo, back in its place); focus goes to the form's first field and back. The empty state teaches with an
  example line. A habit that is gone drops from a line; the line stays.
- What (#327): a habit's Details → "Start small, then step up": write a small version ("one page") and a next step ("two
  pages"); choose which you are doing now (the small version, the habit itself, the next step) — only these words
  change, never the habit's target. An opt-in "Offer a step up…" (off by default) lets one quiet card on Habits say,
  after four weeks at a size done on at least 80 % of at least four due days, "You did Read on 23 of 26 due days in the
  last four weeks. Try “Two pages”?", and after two thin weeks (under half of at least four due days) "Make it “One
  page” for now?". Yes changes the size (Undo); Not now rests the card for two weeks. Nothing changes by itself; only
  the first offer shows.
- Files: `lib/habit-intentions/identity.ts`, `lib/habits-v2/step-up.ts`, `components/habits/habit-identity.tsx` (lazy),
  `components/habits/step-up-card.tsx` (lazy), `components/habits/habit-step-up.tsx` (lazy, inside the when-and-where
  chunk), `components/habits/intention.tsx`, `components/habits/habits-workspace.tsx`, `components/habits/habit-mind.css`
  (new, imported by the lazy chunks only), `lib/habits-extras/schema.ts` (declarations).
- Tests: `lib/habit-intentions/r4-identity-step-up.test.ts`, `lib/habit-intentions/r4-stored.test.ts`.
  Spec: `tests/av2-habit-identity.spec.ts`.
- Stored: habit extras `identities`, `stepUp` (TIER 3 commit `0ebb9350`).
- Help (EN). Q: "What is “Who you are becoming” on Habits?" A: "A few lines in your own words about the person you want to
  be — “I am someone who moves every day” — each joined to the habits that serve it. Each tick of those habits counts
  toward the line: you see how many times this month and this week. It is a count, never a score, and it stays with
  your habits." Q: "Can a habit start small and grow?" A: "Yes. In a habit's Details, under Start small, then step up,
  write a small version for busy days and, if you like, the next step. Choose which one you are doing now. Switch on
  the step-up card and, after four steady weeks, Habits asks if you want the next size; after two thin weeks it offers
  the small version again. You decide each time; nothing changes by itself."
- What's new: "Habits: who you are becoming, in your own words, and start small, then step up."
- Showcase: none added (Habits' Showcase cards and counts are pinned); the hook would be one `identities` line and one
  `stepUp` entry in the Showcase habit extras, if the Habits specs are re-recorded.
- CSS touched: new `components/habits/habit-mind.css`.
- Today: nothing added.

### F6 What a feeling word means, choices for a feeling, and where you feel it — LEDGER #324, #325, #326 (How We Feel)

- Verdict: **built**; #325's strategy videos Carried: needs content made for ZIGoals. #326 follows the owner note: plain
  words for where a feeling sits, never symptoms, nothing read from them, no medical meaning.
- What (#324): in the feeling words (the Journal's Write and the daily check-in), "What the words mean" shows one plain
  line under each of the 48 words ("restless: can’t settle; the body wants to move"), and pressing and holding a word says
  its line without picking it. The day's word shows its line under the grid. For the person's own word there is "Add
  what it means to you" (up to 120 characters), shown with it from then on. English only, as the words are.
- What (#325): under the day's word, "If you like, one of these:" two or three choices for its corner — for a high,
  unpleasant word its one small step as before (Breathe for a minute), then Check a thought and Step outside for a few
  minutes; for a low, unpleasant word Write three lines (or a short walk), Text someone you like, Stretch for a minute;
  for pleasant words "savour it" choices (note one detail, tell someone, three good things). Links open Health's
  meditation, the Journal's Write it out, Check a thought or Three good things (those folds open from their address);
  the one-line actions are just words. Nothing is stored or counted.
- What (#326): "Where do you feel it? · optional" (a fold under the day's word): eight places (head, jaw, throat, chest,
  shoulders, stomach, hands, legs), each with a word (tight, warm, heavy, buzzing, calm), up to three a day, kept on the
  day's feeling word (a new word for the day keeps them). Below, "Where you have felt it, the last 90 days": per corner,
  the most common place and word, as counts.
- Files: `lib/mood-words/meanings.ts`, `lib/mood-words/strategies.ts`, `lib/mood-words/body.ts`,
  `lib/mood-words/schema.ts` (`body`), `components/mood-words/mood-words-grid.tsx`, `components/mood-words/feeling-choices.tsx`
  (lazy), `components/mood-words/mood-body.tsx` (lazy), `components/mood-words/mood-words.css`,
  `components/journal/journal-page.tsx` (`#write-it-out`, `#thought-check` open their folds).
- Tests: `lib/mood-words/r4-feelings.test.ts` (every line checked against the app's tone-forbidden words, the check-in's
  forbidden words and a clinical-word list), `lib/habit-intentions/r4-stored.test.ts`. Spec: `tests/av2-feelings-more.spec.ts`.
- Stored: mood-word day `body`, check-in `ownMeanings` (TIER 3 commit `0ebb9350`).
- Help (EN). Q: "What do the feeling words mean?" A: "Open the feeling words and press What the words mean: each word has
  one plain line under it. You can also press and hold a word. For a word of your own, add what it means to you." Q:
  "Does ZIGoals suggest something for a feeling?" A: "Under the word you picked there are two or three choices, if you
  like: breathe for a minute, write it out, check a thought, text someone, or, for a good feeling, savour it. They are
  choices, not advice, and nothing is counted." Q: "What is “Where do you feel it?”" A: "An optional note of where a
  feeling sits — up to three places, such as tight shoulders — with the day's word. ZIGoals counts which places come up
  most for each kind of feeling over 90 days. It reads nothing into them and they are not a health measure."
- What's new: "Feelings: what each word means, choices that may help, and where you feel it."
- Showcase: none added (the Showcase energy record is read by NOVA's pinned corpus).
- CSS touched: `components/mood-words/mood-words.css`.
- Today: nothing always visible (the feeling words on Today's check-in open on a tap, as before).

### F7 NOVA's and ZIGi's answers — all rows above

- `lib/ai/local-answers/av2-r4-mind.ts` exporting `av2R4MindAnswer(question, env)`; cases
  `lib/ai/evals/as/cases-av2-r4-mind.ts` (`AV2_R4_MIND`, 10 intents × 2 EN + 2 NL); test
  `lib/ai/local-answers/av2-r4-mind.test.ts`. Open tick boxes in the journal by day and how to format; favourites by day;
  a week / a month / a year back by day (never the words); how many photos an entry holds; who you are becoming with its
  counts; habits' sizes and the step on offer; what a feeling word means; the choices for a feeling (never advice);
  where feelings were felt, as counts. The journal only where shared, habits under their switch, feelings under
  Health's gate. Wiring: see "For the lead" 1.
