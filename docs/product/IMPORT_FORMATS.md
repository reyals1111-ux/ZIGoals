# Switch to ZIGoals: the export formats ZIGoals reads

Session W Part 7. Settings → Data & privacy → "Switch to ZIGoals" (code: `apps/web/lib/import/switch/`, UI:
`apps/web/components/import/switch-import.tsx`). Every source below was read on **2026-10-07**; the bracketed tags point to
the list at the end. "Community" means third-party code, documentation or real exports posted publicly, never confirmed
by the vendor. Decisions: ADR-015 S60–S69.

## The rule

ZIGoals reads an export only where the vendor describes its fields: official help or developer documentation, the API
documentation the vendor says its export follows, README files the vendor ships inside the export, the DTD inside the
file, or the app's own source code. Where only the file's wrapper is community-documented (Samsung's metadata line, Oura's
semicolons), the preview shows a few records exactly as they will be saved so the person can check them against what they
remember. Where the fields themselves are not described (Garmin, Streaks, Fitbit's older JSON), nothing is read and the
importer says why.

| App | State | Why we can read it (or not) |
|---|---|---|
| Apple Health | **read** | HealthKit identifiers, units, sleep values and the time-zone key are Apple's documented names [A2–A7]; the file carries its own layout (the DTD inside export.xml, "HealthKit Export Version 13/14") [A8]. |
| Fitbit / Google Health | **read (CSV only)** | Each CSV comes with Google's own README describing every column [F3][F4]; times are UTC, sleep rows add the night's offset. |
| Samsung Health | **read** | The CSV column names are the Samsung Health SDK's documented field names and meanings [S2]; the file wrapper (first line, prefixes) is community-documented [S3–S6]. |
| Oura | **read** | Oura states the export follows its API v2 data models [O1], documented in its OpenAPI file [O3]; the file layout is community-documented [O4][O5]. |
| Loop Habit Tracker | **read** | Loop's open-source exporter is the documentation (v2.3.1) [L1–L8]. |
| MyFitnessPal | **meals import preset** | MyFitnessPal documents the export, not the columns [M1]; the preset pre-fills community-documented columns [M2–M4] for the person to check in Health → Import meals. |
| Cronometer | **meals import preset** | Cronometer documents the export, not the columns [C1–C3]; same approach with community-documented columns [C4][C5]. |
| Garmin | **recognised, not read** | Garmin publishes nothing about the archive's layout; its help page answered HTTP 403 to the sandbox [G1]. The reader exists (`garmin.ts`, tested on example files [G3–G8]) and ships off (`GARMIN_READS = false` in `formats.ts`). Garmin Connect can share data with Apple Health or Health Connect, whose exports ZIGoals reads. |
| Streaks | **not read** | The CSV export exists (release notes) [K2], its columns are not published [K1]. |

## What every import does

- **Read on the device, in a Web Worker** (bundled by Turbopack under `/_next/static/`; no request, no CSP change). The
  ZIP reader (`zip-stream.ts`) and the XML scanner (`xml-scan.ts`) stream, so a multi-gigabyte Apple export is never held
  in memory; a test streams 500 MB of generated records through the scanner.
- **A preview before anything is written:** per kind, what would be added, what is already here (same record, same id)
  and what stays out (that night or that day's steps or weight is already in the journal; or the journal is full), a few
  nights to check, what is kept as summaries, notes about skipped rows, and the Health module's size after the import.
- **Never twice:** deterministic ids (`health_sleep-<source>-<hash>`, `health_med-…`, `health_imp-…`, `health_imw-…`,
  `health_vital-<source>-<day>`; habits get version-8 UUIDs from the export), so the same file on another device, or
  imported again, is recognised.
- **One source per day** for steps, energy, heart rate and weight: the source that counted the most that day (Samsung:
  its own all-devices total), never two added together.
- **Time:** instants are exact; a record's day comes from the zone it was lived in (Apple's `HKTimeZone`; otherwise the
  file's offset: the person's zone when it had that offset then, a fixed `Etc/GMT±h` zone for another whole hour, the
  person's zone for a half-hour offset elsewhere, counted).
- **Summaries, always:** heart rate becomes each day's lowest, average and highest; sleep stages become minutes per night.
  Raw samples are never stored.
- **Size (owner decision D):** browser storage keeps the Health module up to 2,000,000 bytes, an account's durable store up
  to 32,000,000. Past three quarters, the preview offers the newest window that fits and imports only that; lists never go
  past what the journal holds (5,000 nights, 10,000 sessions, 10,000 days of vitals, 10,000 activity lines, 5,000 weights):
  the newest are kept, the rest counted.
- **Health consent:** Health records are written only after an unticked box is ticked; with an account and Health sync
  on they sync like the rest of Health. Showcase never imports.
- **Undo:** each import is remembered on this device (`zigoals:import-batches:v1`); "Undo this import" removes the records
  it added that are still there, naming any changed since and removing them only after confirmation.

## Apple Health

- **Export:** Health → your picture → Export All Health Data → share [A1]. It arrives as `export.zip` with
  `apple_health_export/` [A9][A11]. The main file's name is translated (Norwegian `eksport.xml`), so ZIGoals picks the
  top-level `.xml` whose start contains `<!DOCTYPE HealthData` [A11]; `export_cda.xml`, `clinical-records/` and
  `workout-routes/` are never read [A15][A16].
- **Read:** `HKQuantityTypeIdentifierStepCount` (steps per day), `…ActiveEnergyBurned` / `…BasalEnergyBurned` (kcal, Cal,
  kJ; active and resting energy per day), `…RestingHeartRate` and `…HeartRate` (count/min; resting heart rate and the
  daily summary), `…BodyMass` (kg, g, lb, st; the day's last reading), `HKCategoryTypeIdentifierSleepAnalysis` (nights and
  naps), `HKCategoryTypeIdentifierMindfulSession` (sessions, length = end − start; the value is
  `HKCategoryValueNotApplicable` or missing [A7][A14]), `Workout` (type and duration; an activity line) [A2][A5][A6].
- **Dates:** `2019-04-10 08:10:34 -0500` [A9]; every timestamp carries the phone's offset at export time (summer records
  exported as −0800 [A12][A9]), so the wall-clock time is never used; `HKTimeZone` (an IANA name, recommended by Apple for
  sleep as `HKMetadataKeyTimeZone`) decides the day when present [A4][A13].
- **Sleep:** values `…InBed`, `…AsleepUnspecified`, `…AsleepCore`, `…AsleepDeep`, `…AsleepREM`, `…Awake`, and the legacy
  `…Asleep` (deprecated in iOS 16, still in old data) [A3][A12][A13]. Each source's segments less than an hour apart form
  one night; the window is the first to the last segment; time to fall asleep is the window's start to the first asleep
  segment; asleep is the union of asleep segments; stages only when every asleep minute has one. Other apps write sleep
  into Health too (AutoSleep, Sleep++ [A12]): of two sources recording the same night, the one with stages is kept.
- **Pitfalls handled:** iPhone and Watch both count steps (one source per day) [A9]; iOS 16.0 wrote `WorkoutStatistics`
  with `startDate` twice, the second being the end [A10]: the scanner keeps both (`startDate`, `startDate#2`); files of
  gigabytes (3.2 GB, 13 M lines [A15]; a 79 MB zip unpacked to 2.45 GB [A9]) stream through.
- **Not kept:** body fat and other measurements (no home in the journal yet, ADR-015 S68), and every other record type
  (counted in the preview).

## Fitbit / Google Health

- **Export:** Google Takeout with "Google Health" (Fitbit became the Google Health app in May 2026 [F11]) or the Fitbit
  account archive [F1]; Takeout may split a large export into several ZIPs [F10]: choose them all together.
- **Read (CSV only):** `Health Fitness Data_GoogleData/UserSleeps_*.csv` (sleep_id, minutes_to_fall_asleep,
  minutes_asleep, sleep_start/sleep_end in UTC, end_utc_offset) and `UserSleepStages_*.csv` (sleep_stage_type AWAKE /
  LIGHT / DEEP / REM) [F4]; `Physical Activity_GoogleData/steps_*`, `heart_rate_*`, `daily_resting_heart_rate.csv`,
  `weight.csv` (timestamp UTC, value, data source) [F3]. Daily rows at `T00:00:00Z` name the local date [F5].
- **Not read:** the older `Global Export Data/*.json` files: their times have no zone and sources disagree about them
  (steps UTC, calories local, heart rate "local") [F5][F6][F7]; Takeout repeats the same data in JSON and CSV, never
  combined [F6]. The resting heart rate JSON is padded with zeros [F5] (zeros are skipped in the CSV too).
- **Pitfalls handled:** the steps CSV mixes phone, band and Health Connect rows; summing roughly triples steps, so one
  source per day [F5]. The legacy Fitbit Web API: support ended on 2026-09-30, and the API is turned off on 2026-10-30
  ("Support for the legacy Fitbit Web API ends on September 30, 2026 … On October 30, 2026, the Fitbit Web API will be
  turned off and will no longer function" [F12], read 2026-10-08). Neither date affects Takeout files.

## Samsung Health

- **Export:** Samsung Health → ⋮ → Settings → Download personal data [S1]. It is a **folder** (`samsunghealth_<user>_<id>`
  [S5]), so the importer also accepts a folder (or a ZIP the person makes).
- **Files:** `<type>.<YYYYMMDDHHMMSS>.csv`; line 1 describes the file (`com.samsung.shealth.sleep,7006003,11`), line 2 is
  the header; a BOM and trailing commas; some columns prefixed `com.samsung.health.<type>.` [S3][S4][S5].
- **Read:** `com.samsung.shealth.step_daily_trend` (DAY_TIME = midnight UTC of the date, COUNT; only SOURCE_TYPE −2, all
  sources together [S2][S3]), `com.samsung.shealth.sleep` (start_time, end_time, time_offset, datauuid, sleep_latency in
  ms [S4][S5]) with `com.samsung.health.sleep_stage` (stage 40001 awake, 40002 light, 40003 deep, 40004 REM per the SDK
  [S2]; community pages publishing other mappings [S6][S7] are wrong, the SDK's reproduces the totals [S4]),
  `com.samsung.health.weight` (kg) and `com.samsung.shealth.tracker.heart_rate` (heart_rate, min, max).
- **Times:** formatted like `2025-10-21 21:00:00.000`, UTC (the SDK keeps UTC milliseconds [S2]; two community sources
  agree, one with a worked example [S4][S5], one says local [S8]); the preview's sample nights let the person check one
  bedtime they remember.
- **Not read:** `sleep_combined` (the same nights merged [S5]), per-device step rows, the per-minute JSON files.

## Oura

- **Export:** Membership Hub (Oura app → Settings → Account → Manage membership) → Export data → Request your data [O1][O2];
  Oura on the Web closed on 2026-10-05 [O2].
- **Read:** `App Data/sleepmodel.csv` (day; bedtime_start and bedtime_end with offsets; total_sleep_duration,
  deep_sleep_duration, rem_sleep_duration, light_sleep_duration, latency in seconds; lowest_heart_rate; type long_sleep |
  sleep | late_nap kept, rest | deleted skipped) and `App Data/dailyactivity.csv` (day, steps, active_calories) [O3][O4].
  Files are semicolon-delimited with unquoted JSON in some cells [O4]; the delimiter is taken from each header [O5].
- **Resting heart rate** is the lowest heart rate of the main sleep (`long_sleep`), as Oura defines it; it can differ
  slightly from the app [O3]. The readiness contributor `resting_heart_rate` is a 1–100 score, never read as bpm.
- **Not kept:** the five-minute heart rate and HRV arrays inside each night; `Subscriptions/`.

## Loop Habit Tracker

- **Export:** Settings → Database → Export as CSV [L5] → `Loop Habits CSV <yyyy-MM-dd>.zip` [L1].
- **Read:** `Habits.csv` (Position, Name, Type YES_NO | NUMERICAL, Question, Description, FrequencyNumerator,
  FrequencyDenominator, Unit, Target Type AT_LEAST | AT_MOST, Target Value, Archived?) [L2] and each habit's
  `<NNN> <name>/Checkmarks.csv` (Date, Value, Notes; matched by NNN because non-Latin names are stripped) [L1][L4].
- **Values:** YES_MANUAL (2) → done; SKIP (3) → a skipped day; NO (0), YES_AUTO (1, "not done but not due") and UNKNOWN
  (−1) → no entry [L3]; measurable values are stored ×1000 [L6]. Dates are `yyyy-MM-dd` [L7].
- **Not read:** Scores.csv, the root Checkmarks.csv (names unescaped, breaks on commas [L1]), colours.

## MyFitnessPal (meals import preset)

- **Export (Premium):** Nutrition → Export (or Reports → Export on the web); an e-mailed ZIP with three CSVs [M1].
- **Nutrition-Summary** (header from a real 2026 file [M3]): Date, Meal, Calories, Fat (g), Saturated Fat, …, Sodium (mg),
  Potassium, Carbohydrates (g), Fiber, Sugar, Protein (g), Vitamin A, Vitamin C, Calcium, Iron, Note. No food names; meal
  names are the person's own [M2]: each meal becomes one entry named after it. Vitamin A, Vitamin C, Calcium and Iron are a
  percentage of a daily value, not amounts [M2]: never matched.
- Exercise-Summary and Measurement-Summary (no unit in the file [M2]) are not read.

## Cronometer (meals import preset)

- **Export:** Settings → Account → Export Data → Food & Recipe Entries [C1][C3]; free accounts can export [C2].
- **servings.csv:** Day, Time, Group, Food Name, Amount (`58.00 g`), nutrient columns such as Energy (kcal), Protein (g),
  Carbs (g), Fat (g) [C4][C5]. Times and categories are not kept; an amount that is not grams or millilitres leaves the
  serving measure unknown.

## Garmin (recognised, not read)

- **Export:** Garmin Account → Data Management → Export Your Data; the link "usually arrives within 48 hours, but it can
  take up to 30 days" [G2]. A ZIP with `DI_CONNECT/` [G3].
- **What the off reader would read** (from example files only): `DI-Connect-Aggregator/UDSFile_*.json` (calendarDate,
  totalSteps, restingHeartRate, min/maxHeartRate, active/bmrKilocalories, wellnessStartTimeGmt/Local) [G5][G6],
  `DI-Connect-Wellness/*_sleepData.json` (sleepStart/EndTimestampGMT, deep/light/rem seconds, napList) [G4][G6],
  `*_userBioMetrics.json` (weight in grams) [G8]. Body fat's location is unverified [G8]; workouts are not read.
- **Switching it on** is one line once the layout can be checked against Garmin or a real export the owner provides.

## Streaks (not read)

The only web help is in-app [K1]; release notes confirm a CSV export/import ("a column for local time instead of UTC",
11.3.6) [K2]; backups live under Settings > Manage Data > Backups [K3]. The menu path, file name and columns are unknown.

## Sources (each read 2026-10-07)

Apple
- [A1] https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios
- [A2] https://developer.apple.com/documentation/healthkit/hkquantitytypeidentifier/stepcount · …/activeenergyburned · …/basalenergyburned · …/bodymass · …/bodyfatpercentage · …/waistcircumference · …/restingheartrate · …/heartrate · https://developer.apple.com/documentation/healthkit/hkcategorytypeidentifier/sleepanalysis · …/mindfulsession
- [A3] https://developer.apple.com/documentation/healthkit/hkcategoryvaluesleepanalysis · …/asleep
- [A4] https://developer.apple.com/documentation/healthkit/hkmetadatakeytimezone
- [A5] https://developer.apple.com/documentation/healthkit/hkunit/init(from:)-9qont · https://developer.apple.com/documentation/healthkit/hkunit/percent()
- [A6] https://developer.apple.com/documentation/healthkit/hkworkout/totalenergyburned · …/totaldistance · …/allstatistics
- [A7] https://developer.apple.com/documentation/healthkit/hkcategoryvalue/notapplicable
- [A8] DTD copies (community): https://github.com/AbhikChowdhury6/dataImport/blob/HEAD/appleHK/exampleExportBits.xml (v13) · https://github.com/grll/apple-health-mcp/blob/HEAD/tests/data/export.xml (v14; synthetic values)
- [A9] https://www.r-bloggers.com/2020/02/apple-health-export-part-i/
- [A10] https://developer.apple.com/forums/thread/714063
- [A11] https://github.com/dogsheep/healthkit-to-sqlite (README, cli.py, issue 11)
- [A12] https://github.com/opendroid/hk/blob/HEAD/export/tags.go
- [A13] https://github.com/SebastianLJ/SleepStages_PM/blob/HEAD/data/AW/GoodSleep/sleep_nov_3.xml
- [A14] https://github.com/meditationmind/bloomparse-gui/blob/HEAD/src/main.rs
- [A15] https://github.com/aslobodnik/health-sync/blob/HEAD/EXPORT-FORMAT.md
- [A16] https://github.com/mm909/oddish/blob/HEAD/oddish/apple_health_kit.py

Fitbit / Google Health
- [F1] https://support.google.com/googlehealth/answer/14236615?hl=en
- [F2] https://dev.fitbit.com/build/reference/web-api/sleep/get-sleep-log-by-date/
- [F3] Vendor READMEs and CSVs from a December 2025 Takeout (public copy): https://github.com/Utsavi7609/btp2 (…/Takeout/Fitbit/Physical Activity_GoogleData)
- [F4] https://github.com/Arohasina/patina-engraver/tree/HEAD/Fitbit/Health%20Fitness%20Data_GoogleData (UserSleeps and UserSleepStages READMEs)
- [F5] https://github.com/blakster/air-health/blob/HEAD/docs/takeout-format.md
- [F6] https://github.com/kabaka/oscar-export-analyzer/blob/HEAD/docs/developer/reports/2026-06-wearable-export-planning/data-catalog.md
- [F7] https://github.com/eshirvana/fitbit2garmin/blob/HEAD/fitbit2garmin/ingest/exercise_json.py
- [F8] https://github.com/RikEnde/fitbit-dashboard/blob/HEAD/README.md · https://github.com/damirarh/FitbitExportParser/blob/HEAD/README.md
- [F9] https://github.com/stephenostermiller/health/blob/HEAD/jobs/health-data-etl/readme.md
- [F10] https://support.google.com/accounts/answer/3024190?hl=en
- [F11] https://support.myfitnesspal.com/hc/en-us/articles/45836466715405
- [F12] https://dev.fitbit.com/build/reference/web-api/ (the page's legacy notice; Session X, read 2026-10-08)

Garmin
- [G1] https://support.garmin.com/en-US/?faq=W1TvTPW8JZ6LfJSfK512Q8 (HTTP 403) · https://www.garmin.com/account/datamanagement/ (sign-in)
- [G2] https://gadgetbridge.org/basics/topics/garmin/import-garmin-connect/
- [G3] https://github.com/ohadre/inner-loop/blob/HEAD/GARMIN_DATA_GUIDE.md
- [G4] https://github.com/liu-kenny/garmin-sleep-project (sleepData example)
- [G5] https://github.com/WonderBeat/datasets (UDSFile example)
- [G6] https://github.com/krto-chas/crow-health/blob/HEAD/docs/GARMIN_JSON_PROFILE.json
- [G7] https://github.com/arpanghosh8453/garmin-grafana/blob/main/src/garmin_grafana/garmin_bulk_importer.py
- [G8] https://github.com/Pr0zak/myvitals (imports.py) · https://github.com/mstraa/open-fit-project (garmin.rs)

Samsung
- [S1] https://www.samsung.com/us/support/answer/ANS10001379/
- [S2] https://developer.samsung.com/health/android/data/api-reference/com/samsung/android/sdk/healthdata/HealthConstants.StepDailyTrend.html · …Sleep.html · …SleepStage.html · …Weight.html · …HeartRate.html · …/constant-values.html
- [S3] https://github.com/bastide/galaxy_watch_data (samsung_watch_data/samsunghealth_galaxy6)
- [S4] https://github.com/Jonathan-A-White/night-stack/blob/HEAD/specs/home-experiments/samsung-bulk-import.md
- [S5] https://github.com/oleg-aristeev/samsung-sleep-analyzer/blob/HEAD/docs/DATA_GUIDE.md
- [S6] https://github.com/LyonMoncef/SamsungHealth/blob/HEAD/docs/vault/specs/samsung-health-csv-schema.md
- [S7] https://github.com/bastide/galaxy_watch_data/blob/HEAD/data_dictionary.md
- [S8] https://github.com/Santie-a/health-tracker/blob/HEAD/server/SAMSUNG_FILES.md

Oura
- [O1] https://support.ouraring.com/hc/en-us/articles/360025441594-Export-Share-Your-Oura-Data (updated 2026-10-06)
- [O2] https://support.ouraring.com/hc/en-us/articles/4409086524819-Oura-Membership
- [O3] https://cloud.ouraring.com/v2/static/json/openapi-1.41.json (from https://cloud.ouraring.com/v2/docs)
- [O4] https://github.com/addymmoran/data/tree/HEAD/oura/09-2025_11-2025
- [O5] https://github.com/KotvicCodes/Phibo/blob/HEAD/README.md

MyFitnessPal
- [M1] https://support.myfitnesspal.com/hc/en-us/articles/360032273352 (read through the Help Center API, updated 2026-08-27; the HTML page answers 403)
- [M2] https://github.com/tairqaldy/fitness-pwa/blob/HEAD/docs/research/r10-import-export-formats.md
- [M3] https://github.com/rosgood98/personal-health-intelligence (Nutrition-Summary-2026-06-04-to-2026-07-21.csv)
- [M4] https://github.com/johnzastrow/garminview/blob/HEAD/backend/garminview/ingestion/mfp_zip_parser.py

Cronometer
- [C1] https://support.cronometer.com/hc/en-us/articles/360018760151-Account-Settings (updated 2026-09-25)
- [C2] https://support.cronometer.com/hc/en-us/articles/360028026971-Subscription-Types
- [C3] https://support.cronometer.com/hc/en-us/articles/360020618211-Crono-Hacks-for-Power-Users
- [C4] https://github.com/ekelly95/cronometer-personal-mcp/blob/HEAD/DATA_MODEL.md
- [C5] https://github.com/jeffreyruoss/cgm-food-repsonse-assessment (sample-data)

Loop Habit Tracker (tag v2.3.1 = commit 516bf394f85a5a3ab25f476da230ae2a93815a40, https://github.com/iSoron/uhabits)
- [L1] uhabits-core/src/jvmMain/java/org/isoron/uhabits/core/io/HabitsCSVExporter.kt
- [L2] …/core/models/HabitList.kt
- [L3] …/core/models/Entry.kt
- [L4] uhabits-core/assets/test/csv_export/
- [L5] uhabits-android/src/main/res/xml/preferences.xml · values/strings.xml
- [L6] …/core/models/Habit.kt
- [L7] …/core/utils/DateFormats.kt
- [L8] dev branch HabitsCSVExporter.kt (7e993e17)

Streaks
- [K1] https://streaks.app/support/
- [K2] https://apps.apple.com/us/app/streaks/id963034692 (Version History)
- [K3] https://crunchybagel.com/streaks-7-5-and-icloud-sync/
