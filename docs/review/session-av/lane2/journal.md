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
