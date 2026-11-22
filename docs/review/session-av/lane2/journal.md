# Lane 2 registry: Journal and notes (`lane2/journal`)

Builder: the Journal-and-notes builder. Scope: LEDGER group 7 (Day One: #32, #35, #38, #39, #40, #42, #43, #44), #33
(version history, journal and notes parts), the notes parts of #29 and #30, then q4's open Journal Minors.

## For the lead, before merging (shared files this branch does not edit)

1. **A new IndexedDB database `zigoals-journal-media-v1`** (`apps/web/lib/journal/media.ts`; journal photos and audio
   notes). Until it is placed, `lib/erase-coverage.test.ts` "every database the code names is in KNOWN_DATABASES" fails
   (by design, it forces the placement). Add it to:
   - `apps/web/lib/erase-everything.ts` `KNOWN_DATABASES` (comment: "Session AV lane 2 (journal): photos and audio notes
     in journal entries, on this device only");
   - the device database list the session keeps (`AK_DATABASES` in `lib/ak-device-keys.ts`, or an AV list), and the
     expected list in `lib/aa-device-keys.test.ts` / `lib/ak-device-keys.test.ts`;
   - the data catalogue (`lib/data-health/catalog.ts`), if it lists databases: "Journal photos and audio notes",
     Today and Life, device only, not in Export everything (as the notes' photos).
2. No new localStorage key: every other new field lives in the existing `zigoals:journal:v1` and `zigoals:notes:v1`
   records (restored with "Today and Life").

## Stored changes (TIER 3 stored formats; all additive, optional, `.catch(undefined)` or item-filtered, loose objects)

| record | field | what |
|---|---|---|
| `zigoals:journal:v1` entry | `journal` | the journal the entry is in (`j-…`; absent: the main Journal) |
| entry | `photos` | up to 4 media ids (bytes in `zigoals-journal-media-v1`) |
| entry | `audio` | up to 3 `{id, seconds}` (bytes in `zigoals-journal-media-v1`) |
| entry | `imported` | `dayone` / `text` / `markdown` |
| own template | `body`, `tags` | the whole text and tags of a template saved from an entry |
| journal | `journals` | up to 10 `{id, name, theme}` (theme: violet, cyan, magenta, teal, gold, green) |
| journal | `packs` | prompt pack ids switched on |
| journal | `reminder` | `{on, time, days}` a reminder to write (days: weekday mask, bit 0 Monday … bit 6 Sunday, as the push Workers) |
| journal | `defaultTemplate` | the template a new entry starts from |
| journal | `versions` | earlier texts of changed entries: `{id, entryId, text, tags?, savedAt}`, ≤ 10 per entry, ≤ 200, ≤ 200,000 chars |
| `zigoals:notes:v1` | `versions` | earlier words of changed notes: `{id, noteId, title, body, savedAt}`, ≤ 10 per note, ≤ 300, ≤ 300,000 chars |
| notes | `dailyTemplate` | the words a new daily note starts from (≤ 4,000) |
| notes | `schedules` | up to 10 `{id, title, body, every: day/week/month, weekday?, monthDay?, lastMade?, paused?}` |
| IndexedDB | `zigoals-journal-media-v1` | store `media`, key `<scope>:<mediaId>`, a photo (≤ 200 kB, webp/jpeg) or audio (≤ 3 MB, ≤ 5 min, webm/mp4/ogg), ≤ 400 per scope, 30-day orphan sweep |

Round trip: `apps/web/lib/journal/av2-stored.test.ts` (Export everything zip → Restore, Replace and Merge, every field).

## Features

### Engine wiring (all features; one line)

In `apps/web/lib/ai/local-answers/engine.ts`, beside the `avAnswer` call (line ~225, same `!subject` guard and the same
`groupUnits` / `novaWording` handling): `import {av2JournalAnswer} from './av2-journal';` and try
`av2JournalAnswer(question, env)` before `avAnswer(question, env)`. Corpus: add `...AV2_JOURNAL` from
`lib/ai/evals/as/cases-av2-journal.ts` to `CORPUS` and record `expected.json`. Unit test:
`lib/ai/local-answers/av2-journal.test.ts`.

### F1 Reminder to write and the streak line — LEDGER #40 (Day One: journaling reminders and streaks)

- Verdict: **built**. The writing streak itself was already shown (`writingStreak`, Session AP); added: a line that says
  what writing today does to it, and the reminder to write as a notification (TIER 3 PWA commit `4c9b3aee`).
- Files: `lib/journal/reminder.ts`, `components/journal/journal-reminder.tsx` (lazy), `components/journal/journal-fold.tsx`,
  `components/journal/journal-page.tsx`, `components/journal/journal.css`; `lib/notify/plan.ts`, `prefs.ts`, `sync.ts`,
  `public/sw.js` (kind `journal`, type `journal`, label "Reminder to write").
- Tests: `lib/journal/av2-reminder.test.ts`, `lib/notify/av2-journal-notify.test.ts`, answers in `av2-journal.test.ts`.
- Spec: `tests/av2-journal-reminder.spec.ts`.
- Stored: `journal.reminder` (see the table above).
- Help (EN). Q: "Can the Journal remind me to write?" A: "Yes. Journal → Entries → Reminder to write: switch it on,
  choose a time and the days. It reaches you through this device's notifications (Settings → Notifications), only on a
  day you have not written yet, and it never shows a word of your journal. Under your streak, the Journal says what a
  few lines today do to it."
- What's new: "Journal: a reminder to write, and your streak in plain words."
- Showcase: `lib/journal/showcase.ts` sets the reminder on at 21:00 every day (the Showcase sends no notification). No
  count changes.
- Device keys / catalogue / export / erase: none new (inside `zigoals:journal:v1`).
- CSS touched: `components/journal/journal.css`.
- Today: nothing added.

### F2 Several journals with a colour each, search by date and the calendar — LEDGER #43 (Day One: collections, themes and search)

- Verdict: **built** (tags and tag search were built earlier, `1f67dbc9`). Search "with media" comes with F5/F6 (photos, audio).
- What: Journal → Entries → "Your journals" (make up to ten beside the main one, each with a name and one of six
  colours from the theme's tokens; rename; colour; remove, its entries moving to the main Journal, with Undo); "Show a
  journal" filter chips with counts; Write's "Journal" choice (the shown journal by default); an entry's colour stripe
  and journal name; an entry's "More" → Move to another journal; "Search by date" (From / To, a month calendar with
  the days you wrote as buttons), a typed date in the search box ("3 nov", "2026-11", "november 2026"), and
  `/app/journal?day=YYYY-MM-DD` / `?journal=<id>` in the address.
- Files: `lib/journal/books.ts`, `lib/journal/search.ts`, `components/journal/journal-books.tsx` (lazy),
  `components/journal/journal-calendar.tsx` (lazy), `components/journal/entry-more.tsx` (lazy),
  `components/journal/journal-page.tsx`, `components/journal/journal-compose.tsx`, `components/journal/journal.css`.
- Tests: `lib/journal/av2-books.test.ts`; answers in `lib/ai/local-answers/av2-journal.test.ts` ("which journals do I
  have", "what did I write on 14 nov", EN and NL).
- Spec: `tests/av2-journal-books.spec.ts`.
- Stored: entry `journal`, record `journals` (F0 table).
- Help (EN). Q: "Can I keep more than one journal?" A: "Yes. Journal → Entries → Your journals makes up to ten beside
  your main Journal, each with a colour. Choose one when you write, or move an entry there with More → Move. Removing a
  journal keeps its entries: they go back to your main Journal." Q: "How do I find what I wrote on a day?" A: "Type the
  date in Search your journal (3 nov, 2026-11) or open Search by date: choose From and To, or tap a day on the calendar;
  the days you wrote are buttons."
- What's new: "Journal: several journals with their own colour, and search by date with a calendar."
- Showcase: `lib/journal/showcase.ts` adds the journal "Example · Runs" (teal) holding the two run entries; entry
  count unchanged (10).
- Search palette (`lib/search/static.ts`, the lead's): "Journal on a day" → `/app/journal?day=` could be offered; optional.
- CSS touched: `components/journal/journal.css`. Today: nothing added.

### F3 Prompt packs — LEDGER #38 (Day One: Prompt Packs)

- Verdict: **built**. Six packs written in the repository, EN and NL (Sleep, Training, Gratitude, Creativity, Work and
  life, The year; eight questions each). Switched on in Journal → Write → "Prompt packs"; a switched-on pack takes turns
  with the everyday question as today's question (labelled "· Sleep pack"); "Another question" steps on; each pack's
  questions can be used one by one. With no pack on, today's question is exactly as before.
- Files: `lib/journal-prompts/packs.ts` (loaded on demand: only once a pack is on, or the fold opens),
  `components/journal-prompts/prompt-packs.tsx` + `prompt-packs.css` (lazy), `components/journal/journal-compose.tsx`.
- Tests: `lib/journal-prompts/av2-packs.test.ts`; answers ("which prompt packs are on"; today's question while a pack is
  on — with none on, av-life.ts keeps answering, so expected.json does not move).
- Spec: `tests/av2-journal-packs.spec.ts`.
- Stored: `journal.packs` (F0 table).
- Help (EN). Q: "What are prompt packs?" A: "Sets of journal questions on one theme — sleep, training, gratitude,
  creativity, work and life, the year — in English and Dutch. Switch one on in Journal → Write → Prompt packs and its
  questions take turns with the everyday question. You can also open a pack and use any of its questions straight away."
- What's new: "Journal: prompt packs — sleep, training and more, in English and Dutch."
- Showcase: none on purpose (a pack on would change the Showcase's question of the day, which the corpus pins).
- CSS: `components/journal-prompts/prompt-packs.css` (new). Today: nothing added (the compact Today card shows no question).
