# Session AK — file formats, protocols and platform limits (lane R, read 2026-10-31)

Research only. **Docs** = the vendor's own page or file. **Source** = the vendor's own source code (read as data, never run).
**Secondary** = third-party tool or article. **Unverified** = not confirmable today. All read on 2026-10-31.

## (a) Competitor export formats (for the AK importers)

| App | How to export | File | Columns / structure | Confidence |
|---|---|---|---|---|
| **Strong** | Settings → Export Strong Data (in app) | CSV, one row per set | `Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds, Notes, Workout Notes, RPE`. Older versions also had `Weight Unit`, `Distance Unit` and used `;` | **Low.** Strong publishes no column spec. Secondary sources confirm only "Exercise Name", "Set Order", "Weight", "Reps" and that "exported workout CSV files cannot be imported back into Strong" (<https://repstack.pages.dev/import/strong-csv/>). Detect the delimiter; accept decimal commas; units come from the user's setting, not the file. |
| **Hevy** | Profile → Settings → Export & Import Data → Export Data → "Export Workouts" (and "Export Measurements" separately) | CSV, one row per set | Observed in real exports: `title, start_time, end_time, description, exercise_title, superset_id, exercise_notes, set_index, set_type, weight_kg` (or `weight_lbs`), `reps, distance_km` (or `distance_miles`), `duration_seconds, rpe` (14 columns) | **Low/Medium.** The menu path is Hevy help (via search snippet; the page answered 403 to direct fetch: <https://help.hevyapp.com/hc/en-us/articles/38001424401943>). One parser says "The header must carry all 14 verified columns" (secondary). The names come from real-export knowledge, not a published spec. `set_type` ∈ normal/warmup/dropset/failure maps onto ZIGoals' set kinds. |
| **Daylio** | More → Export Entries → CSV | CSV | `full_date, date, weekday, time, mood, activities, note_title, note` (activities `\|`-separated); newer versions may add `scales` | **Medium (secondary)**: obsidian-daylio-parser docs (<https://pypi.org/project/obsidian-daylio-parser/>) and Journey's import help (which shows an older 7-column layout without `full_date` and `note_title`). Mood labels are the user's own (custom moods), so map by the 5 mood groups, not by name. Notes contain commas, so use a real CSV quote parser. |
| **Habitica** | Settings → Site Data → Export (web) | `/export/userdata.json`, `/export/userdata.xml`, `/export/history.csv`, `/export/inbox.html` | **history.csv:** header exactly `Task Name,Task ID,Task Type,Date,Value`, with dates `YYYY-MM-DD HH:mm:ss`, habits and dailies only ("todos and rewards won't be included"). **userdata.json:** the user object plus `tasks.{habits,dailys,todos,rewards}`. Each task has `text, notes, type, priority, value, tags, history[{date,value,…}], streak, completed, checklist[{text,completed}], frequency ('daily'\|'weekly'\|'monthly'\|'yearly'), everyX, startDate, repeat{m,t,w,th,f,s,su}, daysOfMonth, weeksOfMonth, isDue, nextDue, up, down, counterUp, counterDown, date` (todo due date), `dateCompleted` | **High (Source)**: `website/server/controllers/top-level/dataexport.js` and `website/server/models/task.js` (HabitRPG/habitica `develop`). The source says these routes "are part of the private API and may change at any time". Old history is compressed to averages (fan wiki, <https://habitica.fandom.com/wiki/Task_History_Compression>), so import history as "approximate before date X". |
| **YNAB** | Web only: plan name (top of left sidebar) → **Export Plan** → ZIP with two files: plan (categories) + register (transactions). Or select transactions → More → Export # Transactions | CSV, or **TSV "for currencies that use a comma"** | Register (observed): `Account, Flag, Date, Payee, Category Group/Category, Category Group, Category, Memo, Outflow, Inflow, Cleared`. Plan: `Month, Category Group/Category, Category Group, Category, Assigned, Activity, Available` | **Docs** for the path and the CSV/TSV rule (<https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9>, updated 2026-08-18). **Low** for the column names (the article lists none). Amounts carry the plan's currency format (e.g. `€1.234,56`), so parse with the plan's locale. |
| **Bearable** | Settings → Data + Security → My Data → choose period (3 months, 6 months, All time) and categories | CSV | **Not documented.** A 2019 developer post: mood 1–10, symptoms 0–4 | **Docs** for the path (<https://bearable.app/support/common-questions/how-to-share-data-with-a-doctor-therapist-or-other-medical-team-member/>). **Columns unknown**: ask the owner for a sample export before building. |

## (b) What target apps really import (for "export bridges")

| Target | Imports | Evidence |
|---|---|---|
| **Loop Habit Tracker** | **Yes: Loop's own full backup (`.db`, SQLite) and files from Tickmate, HabitBull and Rewire.** Its CSV export "cannot be imported back". **A HabitBull-format CSV is importable**, which makes a realistic ZIGoals → Loop bridge without SQLite. | **Source**: `uhabits-android/src/main/res/values/strings.xml`: "Supports full backups exported by this app, as well as files generated by Tickmate, HabitBull or Rewire", and "Export full backup … can be imported back". `uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/io/HabitBullCSVImporter.kt` (branch `dev`): `canHandle` = first line `startsWith("HabitName,HabitDescription,HabitCategory")`. Columns by index: 0 name, 1 description, 2 category, **3 date** (`YYYY-MM-DD` or `MM/DD/YYYY`), **4 value** (0 → NO, 1 → YES_MANUAL, >1 → numerical habit, stored ×1000), **5 notes**. Every imported habit is created **daily**, so schedules do not carry over. |
| **Cronometer** | **No documented diary import.** Forum staff: "We don't have a way to import this data directly". Users have asked for CSV import for years. | Secondary/forum: <https://forums.cronometer.com/discussion/4901/more-general-import-upload-functionality>, <https://forums.cronometer.com/discussion/6325/import-food-data-from-apple-health>. Bridge = none; offer the CSV for people's own records. |
| **Habitify** | **No CSV import.** Imports Habitify backups (`.sqlite`), **Streaks (`.streaks`)** and **Productive (`.sqlite`)**, plus integrations (historical sync, Zapier from Google Sheets). Its own export: CSV `Habit, Date, Total log, Unit, Status, Habit ID`, or a `.sqlite` backup. | **Docs**: <https://intercom.help/habitify-app/en/articles/11113954-how-to-import-data-into-habitify-account> ("Habitify doesn't have a direct file import feature (like uploading a CSV file)"), <https://intercom.help/habitify-app/en/articles/10501738-export-your-data>, changelog Oct 2025 (<https://feedback.habitify.me/changelog/habitify-ios-290-ai-creation-live-reminders-data-control-and>). |
| **Streaks** | CSV export **and import** exist (release note 11.3.6: "a column for local time instead of UTC"). The column spec is in-app only. | As recorded in `docs/product/IMPORT_FORMATS.md` [K1–K3]. Not re-verified today. Columns **unknown**. |
| **MyFitnessPal** | **No documented diary import.** Export (Premium) is the e-mailed ZIP of 3 CSVs already handled by ZIGoals. | No MFP help article for import was found. Treat as **no** (Low confidence, absence of evidence). |

## (c) Lichess Board API (for "Lichess play")

Source: Lichess OpenAPI `doc/specs/lichess-api.yaml` v2.0.178 and its `tags/*.yaml` (github.com/lichess-org/api, `master`, read 2026-10-31). CORS checked live.

- **OAuth PKCE, no registration:** "Lichess supports unregistered and public clients (no client authentication, choose any
  unique client id). The only accepted code challenge method is `S256`. Access tokens are long-lived (expect one year),
  unless they are revoked. Refresh tokens are not supported."
  - Authorize: `GET https://lichess.org/oauth?response_type=code&client_id=<any unique id, e.g. the app origin>&redirect_uri=<absolute URL>&code_challenge_method=S256&code_challenge=…&scope=board:play&state=…`.
    `client_id`: "Arbitrary identifier that uniquely identifies your application" (example `example.com`).
  - Token: `POST https://lichess.org/api/token` (form) with `grant_type=authorization_code`, `code`, `code_verifier`,
    `redirect_uri` ("Must match"), `client_id` ("Must match"). The response has `token_type`, `access_token`,
    `expires_in`. Revoke: `DELETE https://lichess.org/api/token` with the Bearer token.
  - The spec says to keep `code_verifier` in session storage and never in URLs. "It is fine if the user themselves can
    extract `code_verifier`, which will always be possible for fully client-side apps."
- **Scopes:** Board endpoints require `board:play`. `/api/stream/event` lists `["challenge:read","bot:play","board:play"]`.
  `/api/challenge/ai` and `/api/challenge/{username}` list `["challenge:write","bot:play","board:play"]`. Request
  **`board:play challenge:write`** (and `challenge:read` for the event stream to be safe), then test which are truly needed.
- **Endpoints:**

  | Action | Endpoint |
  |---|---|
  | Event stream (game start/finish, challenges) | `GET /api/stream/event`, ndjson, "An empty line is sent every 7 seconds for keep alive", "Only one global event stream can be active at a time" |
  | Seek a random opponent | `POST /api/board/seek` (form: `rated`, `time` 0–180 min, `increment` 0–180 s, `variant`, `color`, `ratingRange`; or `days` for correspondence). "Keep the connection open to keep the seek active". Open the event stream **first** |
  | Challenge a player | `POST /api/challenge/{username}` |
  | Play the Lichess AI | `POST /api/challenge/ai` (`level` 1–8, `clock.limit` 0–10800 s, `clock.increment`, `days`, `color`, `variant`, `fen`) |
  | Stream a game | `GET /api/board/game/stream/{gameId}`, ndjson. "The first line is always of type `gameFull`", then `gameState`, `chatLine`, `opponentGone`. Closed when the game ends |
  | Move | `POST /api/board/game/{gameId}/move/{move}` (UCI, e.g. `e2e4`; optional `offeringDraw=true`) |
  | Resign / abort | `POST /api/board/game/{gameId}/resign`, `…/abort` |
  | Draw | `POST /api/board/game/{gameId}/draw/{accept}` (`yes` offers or accepts; `no` declines). Also `…/claim-draw`, `…/claim-victory`, `…/takeback/{accept}`, `…/berserk` |
- **Time controls:** "Rapid, Classical and Correspondence only. For direct challenges, games vs AI, and bulk pairing,
  Blitz is also possible." **Seeks: no Blitz or Bullet.**
- **Rules:** "Engine assistance, or any kind of outside help, is forbidden". Rate limits: "Only make one request at a
  time"; on 429 wait about a minute.
- **Daily puzzle, no key:** `GET https://lichess.org/api/puzzle/daily` (`security: []`). **Checked:** 200,
  `access-control-allow-origin: *`, body `{"game":{"id":…,"perf":{"key":"rapid"…},…},"puzzle":{…}}`.
- **CORS (checked, preflights with `Origin: https://zigoals.example`):** `/api/token`, `/api/board/seek`,
  `/api/stream/event` and `/api/board/game/{id}/resign` all → 204 with `access-control-allow-origin: *`,
  `access-control-allow-headers: Origin, Authorization, If-Modified-Since, Cache-Control, Content-Type`, methods
  `OPTIONS, GET, POST, PUT, DELETE`. **The whole flow works from the browser; no relay is needed.**

## (d) Cloudflare: `wrangler deploy` with a service binding to a Worker that does not exist

**Docs** (<https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/>, "Deployment" section):

> "Workers using Service bindings are deployed separately. When getting started and deploying for the first time, this
> means that the target Worker (Worker B in the examples above) must be deployed first, before Worker A. Otherwise, when
> you attempt to deploy Worker A, deployment will fail, because Worker A declares a binding to Worker B, which does not
> yet exist."

The upload-error table (<https://developers.cloudflare.com/workers/observability/errors/>) lists **`10056` "Binding not
found."** **The deploy fails; it does not warn and continue.** In a multi-Worker deploy workflow, deploy the target
first, and only add the binding in the commit after the target exists. No changelog entry changing this was found.

## (e) Cloudflare free plan: sizing a push Worker

**Docs** (Workers limits <https://developers.cloudflare.com/workers/platform/limits/>; Durable Objects pricing
<https://developers.cloudflare.com/durable-objects/platform/pricing/> (dateModified 2026-10-18) and limits
<https://developers.cloudflare.com/durable-objects/platform/limits/>):

| Limit (Workers Free) | Value |
|---|---|
| Worker requests | **100,000/day** (resets 00:00 UTC; over → Error 1027) |
| CPU per HTTP request / per Cron Trigger | **10 ms** |
| Subrequests per invocation | 50 |
| Cron Triggers per account | **5** |
| Durable Objects | **SQLite backend only** on Free |
| DO requests (HTTP, RPC, WebSocket messages, **alarm invocations**) | **100,000/day** |
| DO duration | **13,000 GB-s/day** |
| DO SQL rows read / written | **5 million / 100,000 per day**. "Each `setAlarm()` is billed as a single row written"; deletes count as writes; KV-style `put()` counts as a row write |
| DO stored data | **5 GB total** (account); **1 GB per object** on Free (10 GB on Paid) |
| DO alarm handler wall time | 15 min |
| Over any free limit | "further operations of that type will fail with an error" |

**Sizing (about 10 wakes per device per day; one DO per device or a sharded queue; each wake = 1 alarm + 1 push fetch
+ 1 state write + 1 `setAlarm`):**

| | 100 devices | 1,000 devices | Free limit | Headroom at 1,000 |
|---|---|---|---|---|
| Wakes/day | 1,000 | 10,000 | — | — |
| DO requests (alarms + ~3 device calls/day each) | ~1,300 | ~13,000 | 100,000 | 13% used |
| Rows written (setAlarm + state) | ~2,000 | ~20,000 | 100,000 | **20% used: the first limit to bind** (~5,000 devices) |
| Worker HTTP requests (subscribe, Done/Snooze) | ~300–500 | ~3,000–5,000 | 100,000 | <5% |
| DO duration (≈1 s wall per wake × 128 MB) | ~125 GB-s | ~1,250 GB-s | 13,000 | ~10% |
| Storage (≈1 KB per device) | ~0.1 MB | ~1 MB | 5 GB | negligible |

Risks: (1) **10 ms CPU per invocation**. Web Push needs ECDH P-256 + HKDF + AES-128-GCM payload encryption and an ES256
VAPID JWT per send. With native WebCrypto that is likely a few ms (**an estimate; measure it**). Send content-free
"tickle" pushes, or reuse the VAPID JWT for its 12–24 h validity. (2) A cron every minute uses 1,440 requests/day of
the 100,000 and 1 of the 5 cron slots. Prefer DO alarms. (3) Grouping wakes per minute into one alarm per shard divides
alarm invocations and rows written by the batch size.

## (f) Garmin FIT protocol (hand-written decoder)

**Docs:** FIT Protocol <https://developer.garmin.com/fit/protocol/> (content served from
<https://developer.garmin.com/fit/articles/fit-protocol/fit_protocol.html>); Activity file
<https://developer.garmin.com/fit/file-types/activity/>; Decoding cookbook
<https://developer.garmin.com/fit/cookbook/decoding-activity-files/>. **Profile numbers** from Garmin's own JS SDK
`@garmin/fitsdk@21.218.0` `src/profile.js` (© 2026 Garmin, FIT Protocol License), read as text and not executed.

**File header** (12 or 14 bytes, little endian): byte 0 header size (12 or 14; "Minimum size is 12"); 1 protocol
version; 2–3 profile version; **4–7 data size** ("Length of the Data Records section in bytes, does not include Header
or CRC"); **8–11 ASCII ".FIT"**; 12–13 header CRC ("of Bytes 0 through 11, or may be set to 0x0000"). The file ends
with a 2-byte CRC (little endian) over all preceding bytes.

**Record header (1 byte):**
- **Normal** (bit 7 = 0): bit 6 = 1 definition / 0 data; bit 5 = developer-data flag (definitions); bit 4 reserved;
  bits 0–3 local message type (0–15).
- **Compressed timestamp** (bit 7 = 1, data messages only): bits 5–6 local type (0–3); bits 0–4 time offset (s). "The
  actual timestamp value is determined by concatenating the most significant 27 bits of the previous timestamp value and
  the 5 bit value of the time offset field". If `offset >= (prev & 0x1F)`, then `ts = (prev & ~0x1F) + offset`; else
  `ts = (prev & ~0x1F) + offset + 0x20` (rollover).

**Definition message:** byte 0 reserved; 1 architecture (0 little, 1 big endian); 2–3 global message number; 4 number
of fields; then 3 bytes per field = field definition number, size (bytes; a multiple of the base size means an array),
base type byte. If the developer flag is set: 1 byte count, then 3 bytes per developer field (field number, size,
developer data index). Data messages follow the most recent definition for their local type. Local types can be
redefined mid-file.

**Base types and invalid values** (base type byte → name, invalid, size): `0x00` enum 0xFF 1; `0x01` sint8 0x7F 1;
`0x02` uint8 0xFF 1; `0x83` sint16 0x7FFF 2; `0x84` uint16 0xFFFF 2; `0x85` sint32 0x7FFFFFFF 4; `0x86` uint32
0xFFFFFFFF 4; `0x07` string 0x00 (UTF-8, null-terminated); `0x88` float32 0xFFFFFFFF 4; `0x89` float64 all-FF 8;
`0x0A` uint8z 0x00 1; `0x8B` uint16z 0x0000 2; `0x8C` uint32z 0x00000000 4; `0x0D` byte 0xFF ("invalid if all bytes are
invalid"); `0x8E` sint64; `0x8F` uint64; `0x90` uint64z. Bit 7 = "endian ability". Field number 255 = invalid.

**Messages and fields** (value = raw ÷ scale − offset):

| Message (global #) | Field # : name — type (scale, units) |
|---|---|
| **file_id (0)** | 0 type — enum `file` (**4 = activity**); 1 manufacturer — uint16; 2 product — uint16; 3 serial_number — uint32z; 4 time_created — date_time |
| **session (18)** | 253 timestamp; 2 start_time; 3/4 start_position_lat/long — sint32 semicircles; **5 sport** — enum; 6 sub_sport; **7 total_elapsed_time** — uint32 (1000, s); **8 total_timer_time** — uint32 (1000, s); **9 total_distance** — uint32 (100, m); **11 total_calories** — uint16 (kcal); **16 avg_heart_rate**, **17 max_heart_rate** — uint8 (bpm); 22 total_ascent — uint16 (m); 124 enhanced_avg_speed — uint32 (1000, m/s) |
| **lap (19)** | 253 timestamp; 2 start_time; 7 total_elapsed_time (1000, s); 8 total_timer_time (1000, s); 9 total_distance (100, m); 11 total_calories (kcal); **15 avg_heart_rate**, **16 max_heart_rate** (bpm). **Lap HR numbers differ from session's 16/17.** |
| **record (20)** | 253 timestamp; **0 position_lat**, **1 position_long** — sint32 semicircles; 2 altitude — uint16 (scale 5, offset 500, m); **3 heart_rate** — uint8 bpm; 4 cadence — uint8 rpm; **5 distance** — uint32 (100, m); 6 speed — uint16 (1000, m/s); 7 power — uint16 W; 73 enhanced_speed — uint32 (1000, m/s); **78 enhanced_altitude** — uint32 (5, offset 500, m). Prefer enhanced_* when present |
| **activity (34)** | 253 timestamp; 0 total_timer_time (1000, s); 1 num_sessions; 2 type; 3 event; 5 local_timestamp — local_date_time |

- **Sport enum (excerpt):** 0 generic, 1 running, 2 cycling, 4 fitness_equipment, 5 swimming, 10 training, 11 walking,
  13 alpine_skiing, 15 rowing, 17 hiking, 19 paddling, 21 e_biking.
- **Time:** "seconds since the Garmin Epoch 1989–12–31T00:00:00Z" (cookbook), so Unix = FIT + **631,065,600**.
  `activity.local_timestamp − timestamp` gives the device's UTC offset.
- **Semicircles → degrees:** `deg = semicircles × (180 / 2^31)` (standard conversion; the profile gives the unit
  `semicircles`).
- **"Summary last":** the cookbook notes Session, Lap and Length are summary messages spanning `start_time` +
  `total_elapsed_time`, while Record and Event are points in time.

**CRC-16** (Docs, verbatim algorithm): table `{0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001,
0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400}`. Per byte: `tmp = T[crc & 0xF]; crc = (crc >> 4) & 0x0FFF;
crc = crc ^ tmp ^ T[byte & 0xF]; tmp = T[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ tmp ^ T[(byte >> 4) & 0xF];`
starting from 0. A whole file including its trailing CRC gives 0.

## (g) Strava bulk export ZIP

- **Docs** (<https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export>): Settings → My
  Account → "Download your account" → Get Started → **Request download**, then an email link ("may take a few hours").
  **The article does not describe the archive.**
- **Layout (secondary):** about 40+ CSVs at the top level, including `activities.csv`, `bikes.csv`, `comments.csv` and
  `profile.csv`, plus folders `activities/` (one file per activity: `.fit.gz`, `.gpx`, `.gpx.gz`, `.tcx.gz` or `.fit`),
  `clubs/`, `media/` and `routes/` (Redback Operations, last updated 2024-04-12,
  <https://redback-operations.github.io/redback-documentation/docs/project-3/research/strava-bulk-export-data-description>).
- **activities.csv (secondary):** includes `Activity ID, Activity Date, Activity Name, Activity Type, Activity Description,
  Elapsed Time, Distance, …, Activity Gear, Filename, Media` (Endurain importer docs, <https://docs.endurain.com/features/importing/>).
  **`Filename` links a row to its file** (e.g. `activities/1234567890.fit.gz`). The numeric file name does **not** always
  equal `Activity ID` (<https://communityhub.strava.com/developers-api-7/strava-bulk-data-activity-file-ids-don-t-match-the-activities-csv-activity-id-1805>).
  The header language follows the account's display language ("must be set to English", rOpenSci Athlytics). Some
  column names are reported to repeat (e.g. a second `Elapsed Time`/`Distance` block in different units). **Unverified:
  key columns by name+position, and test against a real export.**
- **Build note:** `.gz` members are handled with `DecompressionStream('gzip')`; ZIP via the existing `lib/import/zip-stream.ts`.

## (h) Bank statement files: minimum fields for a transaction list

| Need | **CAMT.053** (ISO 20022 `camt.053.001.02`…`.08`) | **OFX** (v1 SGML / v2 XML) | **MT940** (SWIFT) |
|---|---|---|---|
| File marker | XML `Document/BkToCstmrStmt` (namespace `urn:iso:std:iso:20022:tech:xsd:camt.053.001.NN`) | v1: plain-text header `OFXHEADER:100`, `DATA:OFXSGML`, `VERSION:102`… then SGML **with optional closing tags**. v2: `<?xml …?>` + `<?OFX OFXHEADER="200" VERSION="220" …?>`, well-formed XML | `:20:` reference, `:25:` account (IBAN), `:28C:` statement no. |
| Statement / account | `Stmt/Id`, `Stmt/Acct/Id/IBAN`, `Acct/Ccy` | `<BANKACCTFROM>` (`<BANKID>`, `<ACCTID>`), `<CURDEF>` | `:25:` |
| Opening / closing balance | `Stmt/Bal` with `Tp/CdOrPrtry/Cd` = **OPBD** (opening booked), **CLBD** (closing booked), also PRCD, CLAV; each `Amt Ccy=…`, `CdtDbtInd`, `Dt/Dt` | `<LEDGERBAL>` (`<BALAMT>`, `<DTASOF>`), `<AVAILBAL>` | `:60F:` opening (`C230428EUR17900,`), `:62F:` closing booked, `:64:` closing available, `:65:` forward available. Format = D/C mark + YYMMDD + currency + amount with **decimal comma** |
| One transaction | `Stmt/Ntry` (0..*) | `<BANKTRANLIST>` (`<DTSTART>`, `<DTEND>`) → `<STMTTRN>` | `:61:` line (+ its `:86:`) |
| Booking date | `Ntry/BookgDt/Dt` (value date `Ntry/ValDt/Dt`) | `<DTPOSTED>` (value date `<DTAVAIL>`, user date `<DTUSER>`) | `:61:` sub 1 value date `YYMMDD`, sub 2 entry date `MMDD` (optional in SWIFT; ING always sends it) |
| Amount | `Ntry/Amt` (always ≥ 0) + `@Ccy` | `<TRNAMT>` **signed** ("signed from the perspective of the customer") | `:61:` sub 5 amount `15d` (decimal comma) |
| Credit/debit | `Ntry/CdtDbtInd` = `CRDT`/`DBIT` | sign of `<TRNAMT>` (`<TRNTYPE>` is informative: "does not change the effect … upon the balance") | `:61:` sub 3 `C`/`D` (also `RC`/`RD` reversals) |
| Currency | `Amt/@Ccy` | `<CURDEF>` (per statement), `<CURRENCY>`/`<ORIGCURRENCY>` per transaction | in `:60F:`/`:62F:`; `:61:` optional funds code |
| Counterparty / payee | `NtryDtls/TxDtls/RltdPties/Dbtr/Nm` (for credits) or `Cdtr/Nm` (for debits); accounts `DbtrAcct`/`CdtrAcct/Id/IBAN` | `<NAME>` (A-32) **or** `<PAYEE>` aggregate; `<EXTDNAME>` (A-100) | `:86:` free text or code words, e.g. ING `/CNTP/<account>/<BIC>/<name>/<city>/`, `/NAME/…/` |
| Reference / description | `TxDtls/Refs/EndToEndId`, `Ntry/AcctSvcrRef`, `RmtInf/Ustrd` (unstructured, 0..*, 140 chars) / `RmtInf/Strd/CdtrRefInf/Ref` | **`<FITID>`** (dedupe key: "Used to detect duplicate downloads"), `<CHECKNUM>`, `<REFNUM>`, `<MEMO>`; correction `<CORRECTFITID>`/`<CORRECTACTION>` | `:61:` sub 7 reference for account owner (e.g. `EREF`/`NONREF`), sub 8 `//bank reference`, sub 9 supplementary details; `:86:` `/EREF/…/`, `/REMI/USTD//<text>/` or `/REMI/STRD/CUR/<ref>/` |
| Dates format | ISO `YYYY-MM-DD` | `YYYYMMDDHHMMSS.XXX [gmt offset[:tz name]]`; date-only = midnight **GMT** | `YYMMDD` (century inferred) |
| Dedupe key | `AcctSvcrRef` (or hash of date+amount+ref) | `FITID` | `:61:` sub 8 bank ref, else a hash |

Parsing notes: CAMT is namespaced XML with several versions in use, so match on local names and ignore the version.
OFX v1 is not XML (unclosed leaf tags), so it needs a small tokenizer, not `DOMParser`. MT940 is line-based:
`:86:` continues across lines until the next `:NN:` tag, the file may hold several statements, `-}` blocks may wrap it,
and encoding is often Latin-1.

**Sources (h):** ING "Format Description CGI version CAMT 053 001 02"
(<https://assets.ing.com/m/db4c6ca1e0e59abb/original/ING-Format-Description-CGI-version-CAMT-053-001-02.pdf>, 364 kB,
read); ING "Format Description Structured MT940 & MT942, Version 4 Strategic v6.0, 01 Aug 2023"
(<https://assets.ing.com/m/4dac40a51dd3ec00/original/ING-Format-Description-Structured-MT940-MT942-1.pdf>, 307 kB, read);
**OFX Banking Specification v2.3** (FDX; dated 10/16/2020 inside), section 11.4.4.1 `<STMTTRN>` and section 2 headers,
<https://financialdataexchange.org/wp-content/uploads/2025/12/OFX-Banking-Specification-v2.3.pdf> (6.8 MB, read), listed on
<https://financialdataexchange.org/about-fdx/ofx-work-group/>. **Note: `ofx.net` now redirects to a parked "/lander"
page.** Do not link it in-app. The SWIFT MT940 standard itself is behind MyStandards. Rabobank's descriptions also sit
in SWIFT MyStandards (login) per <https://www.rabobank.nl/en/business/making-and-receiving-payments/online-bankieren/internetbankieren-professional/support/bestanden>.

## Sources (all read 2026-10-31)

- Habitica source: <https://raw.githubusercontent.com/HabitRPG/habitica/develop/website/server/controllers/top-level/dataexport.js>, `…/website/server/models/task.js`
- Loop source: <https://raw.githubusercontent.com/iSoron/uhabits/dev/uhabits-android/src/main/res/values/strings.xml>, <https://raw.githubusercontent.com/iSoron/uhabits/dev/uhabits-core/src/commonMain/kotlin/org/isoron/uhabits/core/io/HabitBullCSVImporter.kt>
- YNAB: <https://support.ynab.com/en_us/how-to-export-plan-data-Sy_CouWA9>
- Habitify: links in (b)
- Daylio (secondary): <https://pypi.org/project/obsidian-daylio-parser/>, <https://help.journey.cloud/en/article/import-daylio-uo8e3m/>
- Strong/Hevy (secondary): <https://repstack.pages.dev/import/strong-csv/>, <https://repstack.pages.dev/import/hevy-csv/>, Hevy help (search snippet)
- Bearable: support page in (a); <https://www.choosingtherapy.com/bearable-app-review/> (secondary)
- Lichess: <https://raw.githubusercontent.com/lichess-org/api/master/doc/specs/lichess-api.yaml> and `tags/board/*`, `tags/oauth/*`, `tags/challenges/*`, `tags/puzzles/api-puzzle-daily.yaml`; live preflights to lichess.org
- Cloudflare: service bindings, errors, Workers limits, DO pricing and limits (URLs above; fetched as `index.md`)
- Garmin FIT: protocol article and cookbook (URLs above); `https://unpkg.com/@garmin/fitsdk@21.218.0/src/profile.js`
- Strava: support article and secondary sources in (g)
