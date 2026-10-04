# T4 · Export everything (optional)

## Purpose
One tap in Settings makes one ZIP with everything the person has saved in ZIGoals: a JSON file of all records, and a CSV per area for a spreadsheet. Nobody needs it: sync and the encrypted backup keep records safe. It is there for people who like to hold a readable copy, and it is the first place the device-only records of this PR appear outside the device.

## Owner principles applied
Never a chore (optional, one tap, no questions beyond the privacy tick). Private by design (readable, so the copy says to keep it private; made entirely on the device; nothing is written on view). Honest numbers (the export copies stored records as they are; it computes nothing new; unknown values export as empty cells, never 0). Consumer first (file names are plain words). No new dependency: the ZIP is written by a small in-repo stored-ZIP writer.

## Scope in PR 3
- `lib/export/zip.ts` (stored ZIP, CRC-32), `lib/export/everything.ts` (what goes in and the CSVs), the Settings section, the phone settings row, the Help entry.
Out of scope: restoring from this file (the encrypted backup and the module backups remain the restore paths; the JSON says so), compression, encryption, scheduling, a per-area selection, images.

## Data
No new device key; the export reads and writes nothing to storage. What it reads, through `getAppStorage()` (`lib/showcase-storage.ts:32`):
- the four modules, each as its exact stored text: `exportDurableStore(storage, key)` when `isDurableMarker(storage.getItem(key))` else `storage.getItem(key)` (`lib/vault/local.ts:10`, `:70`), for `zigoals:platform:v1`, `zigoals:habits:v1`, `zigoals:health:v1`, `zigoals:settings:v1`;
- Portfolio `zigoals:portfolio:v1`; the legacy local simulation through `exportLocalSimulation(storage)` (`lib/vault/local-simulation-backup.ts:26`);
- every device key of this PR plus reminders: `zigoals:reminders:v1`, `zigoals:habit-health-links:v1`, `zigoals:health-goals:v1`, `zigoals:weekly-review:v1`, `zigoals:fasting:v1`, `zigoals:insights:v1`, `zigoals:import-undo:v1` (`DEVICE_RECORD_KEYS` from `lib/onboarding.ts` plus `REMINDERS_KEY`).
Showcase: the same, from the tab's session storage, with the Showcase file name.

## Engine
### `lib/export/zip.ts` (pure, no dependency)
```
crc32(bytes: Uint8Array): number                       // IEEE polynomial 0xEDB88320, 256-entry table built once
buildStoredZip(entries: {name: string, data: Uint8Array | string, modified: Date}[]): Uint8Array
```
Method 0 (stored), one local file header (`0x04034b50`, version needed 10, flags `0x0800` so names are UTF-8, DOS time and date from `modified` in local time, CRC-32, sizes), the data, then the central directory (`0x02014b50`, version made by 20, external attributes 0) and the end record (`0x06054b50`). No data descriptors, no ZIP64, no extra fields. Refusals: more than 65,535 entries, any entry or the total above 100 MB ("The export is larger than ZIGoals can write."), a name that is empty, longer than 255 bytes, absolute or containing `..`. Strings are UTF-8 encoded; names are ASCII here.
### `lib/export/everything.ts` (pure given the read values)
```
collectEverything(read: (key) => string | null, {now, version, commit, localSimulation}) → {json: EverythingJson, csv: Record<fileName, string>, unreadable: string[]}
buildEverythingZip(collected, {date, showcase}) → {name: string, bytes: Uint8Array}
```
`EverythingJson`:
```
{
  format: "zigoals-everything", version: 1, exportedAt: ISO instant, app: {version, commit},
  note: "Readable export of your ZIGoals records. It contains personal information: keep it private. It is not a restore format; use Settings → Keep a protected copy for that.",
  modules: {finance?, habits?, health?, settings?: the stored JSON, parsed with JSON.parse only (no schema transform, no migration, so the bytes are faithful)},
  portfolio?: the stored JSON,
  device: {reminders?, habitHealthLinks?, healthGoals?, weeklyReview?, fasting?, insights?, importUndo?: the stored JSON},
  localSimulation?: the section `exportLocalSimulation` returns (a `{…, omitted: "damaged"}` marker when it is damaged),
  unreadable: string[]                      // keys whose text was not JSON; listed here and included nowhere else
}
```
A key that is absent is absent from the JSON. A key whose text is not JSON is listed under `unreadable` with its name only (never its bytes) and the UI says "Some records on this device could not be read and were left out: {keys}. They were not changed."
CSVs (UTF-8, CRLF, every cell quoted, `""` for a quote, a leading `'` before `=`, `+`, `-`, `@`, tab or CR, the `csvCell` rule of `lib/health-daily.ts:183`; empty cell for unknown or absent; no BOM, like `exportHealthCsv`; a header row even when there are no rows):
| File | Rows | Columns |
|---|---|---|
| `goals.csv` | `platform.goals[]` and legacy plans | `source` (private/local-simulation), `id`, `name`, `type`, `status`, `asset`, `decimals`, `target`, `target_date`, `category`, `created_at_utc`, `plan_amount`, `plan_asset`, `plan_cadence`, `plan_next_date`, `plan_active`, `notes` |
| `contributions.csv` | `platform.contributions[]` | `id`, `goal_id`, `goal_scope`, `direction`, `quantity`, `asset`, `decimals`, `occurred_at_utc`, `provenance`, `funding_mode`, `scheduled_date`, `position_id`, `reverses_id`, `note` |
| `habits.csv` | `habits.habits[]` | `id`, `title`, `category`, `type`, `measurement`, `unit`, `target`, `target_period`, `schedule`, `state`, `start_date`, `time_of_day`, `goal_link`, `created_at_utc`, `updated_at_utc`, `description`, `notes` |
| `check-ins.csv` | every `entries[]` of every habit | `habit_id`, `habit_title`, `date`, `count`, `disposition`, `mood`, `note`, `updated_at_utc`, `source` (always empty before the H7 write switch; the H7 markers add `auto_applied_at` from the device key when one matches) |
| `health-diary.csv` | `exportHealthCsv(health, "1900-01-01", "2199-12-31")` | as that function (`lib/health-daily.ts:184`) |
| `weights.csv` | `health.weights[]` and timed weight measurements | `id`, `date`, `grams`, `source` (manual-date-only / measurement), `observed_at_utc`, `timezone`, `created_at_utc`, `updated_at_utc` |
| `water.csv` | `daily.water[]` | `id`, `date`, `amount`, `unit`, `millilitres`, `created_at_utc`, `updated_at_utc` |
| `activity.csv` | `health.activity[]` and exercise counter days | `id`, `date`, `kind` (activity / counter), `name`, `steps`, `minutes`, `count`, `created_at_utc`, `updated_at_utc` |
| `wealth-positions.csv` | `platform.positions[]` | `id`, `name`, `asset`, `asset_class`, `source_type`, `network`, `quantity`, `decimals`, `valuation_value`, `valuation_currency`, `valuation_decimals`, `valuation_source`, `observed_at_utc`, `archived_at_utc`, `provenance`, `notes` |
Numbers are the stored integers and decimals strings exactly (no locale formatting). The ZIP name is `exportFileName("zigoals-export-<localDate>.zip", isShowcase())` (`lib/showcase-detect.ts:22`), so Showcase gives `zigoals-showcase-demo-export-….zip`. Entry order: `everything.json`, then the CSVs in the table's order; `modified` is `now`.
Edge cases: an empty device → a JSON with no modules and nine header-only CSVs; a module held durably in IndexedDB is read through its durable path; an account that is locked → the export refuses with the existing locked message (`getAppStorage` throws); a damaged local simulation → the marker and the warning (`LOCAL_SIMULATION_DAMAGED`); a 2 MB-module device → a few MB, well under the cap.

## UI
### Settings, section `export-everything` (after `PrivateBackups`, `app/app/settings/page.tsx:66`)
Eyebrow `OPTIONAL`, heading "Everything you've saved, in one file.", text "You never need this: sync and the encrypted backup keep your records. If you'd like a readable copy for yourself, this makes one ZIP with a JSON file of everything and a CSV per area (goals, contributions, habits, check-ins, Health diary, weights, water, activity, wealth)." Checkbox (44 px label) "I understand this file is readable and holds my personal records, including Health." Button "Export everything" (primary, disabled until ticked; `disabled` while any store is still loading). Status (`role="status"`): "Your export is ready and downloading. Keep it private." Warnings as `notice` lines (unreadable keys, damaged local simulation). Fine print: "Made on this device. Nothing is uploaded. This is not a restore format."
Phone settings row (`components/phone/phone-settings.tsx`, group "Data & backups"): ["Export everything", "Optional: one readable ZIP of all your records", "export-everything"].
### Phone, desktop, tablet
Phone first: the section is a normal panel; the row in the list. Authorized desktop differences: the section (README item 5).
### Motion, keyboard, screen reader
None new; the download is a programmatic anchor click as the module backups do (`components/private-backups.tsx:34`), with `URL.revokeObjectURL` after one second.

## Showcase data
No fixture of its own: in Showcase the export holds the Showcase records of every feature (each already labelled) and the file name says `showcase-demo`.

## Help entry (`help-export-everything`)
**Can I get all my data out?** Yes, any time: Settings → "Export everything" makes one ZIP on your device with a JSON file of every record and a CSV per area that opens in a spreadsheet. You never need it: sync and the encrypted backup keep your records. It is readable, so keep it private, and it is not a restore format.

## Tests
Unit (`lib/export/zip.test.ts`, `lib/export/everything.test.ts`):
1. `crc32("")` → 0; `crc32("123456789")` → `0xCBF43926`; `crc32("The quick brown fox jumps over the lazy dog")` → `0x414FA339`.
2. Round trip: `buildStoredZip` with three entries (an empty file, a 70,000-byte text, a UTF-8 name "ünïcode.txt") is read by an **independent reader written in the test** (finds the end record, walks the central directory, reads each local header, checks signatures, sizes, CRC-32 and the UTF-8 flag) and every byte comes back identical; the DOS time of `2026-10-01T12:34:56` local is encoded as 12:34:56 and 2026-10-01.
3. Refusals: 65,536 entries; an entry of 100 MB + 1; names `""`, `"../x"`, `"/x"`.
4. `collectEverything` on an empty storage → `modules {}`, `device {}`, nine CSVs of one header line each, `unreadable []`.
5. On the Showcase records plus every feature's Showcase fixture → `modules.habits` deep-equals `JSON.parse` of the stored text; `device.fasting.sessions[0].id === "fast_showcase-1"`; `check-ins.csv` has one row per Showcase entry (6 × 30 + the planned skip) with `auto_applied_at` filled on the 12 H7 marker days; `water.csv` has 24 rows; `health-diary.csv` equals `exportHealthCsv` over the full range.
6. CSV escaping: a note `=SUM(A1)` → `"'=SUM(A1)"`; a title with `"` → doubled; a note with CRLF stays one cell; `-5` as a note → `"'-5"`; unknown kcal → empty cell, never `0`.
7. A key holding `not json` → listed under `unreadable`, absent elsewhere, bytes untouched; a damaged local simulation → the `omitted` marker.
8. The file name: `zigoals-export-2026-10-01.zip`; in Showcase `zigoals-showcase-demo-export-2026-10-01.zip`.
Browser (`tests/export-everything.spec.ts`, desktop and mobile):
- Local Demo seeded with `buildShowcase('2026-09-20')` records (as `tests/export-roundtrip.spec.ts` does): the button is disabled until the tick; click → a download named `zigoals-export-<today>.zip`; the test reads the download, parses it with the same independent reader, and asserts `everything.json`'s `modules.habits` equals `localStorage["zigoals:habits:v1"]` parsed, and that nine CSVs exist with the expected headers.
- Nothing written on view and nothing written by the export: every `zigoals:` key is byte-identical before and after; no request is made.
- Showcase: the name carries `showcase-demo`.
- 390×844: the phone settings row jumps to the section; the checkbox label and button are ≥ 44 px.

## Risks and open questions
- A readable file of health records on a shared computer is a risk the copy names twice ("keep it private"); no further gate is proposed.
- Open: whether the export should also include the raw stored text of each module next to the parsed JSON for byte-exact archival. Recommendation: no; the encrypted backup is the byte-exact format, and `JSON.parse` of valid JSON loses nothing but formatting.
