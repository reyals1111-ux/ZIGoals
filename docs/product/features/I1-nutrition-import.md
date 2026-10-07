# I1 · Nutrition CSV import

## Purpose
A food diary kept elsewhere can come along: choose the file, say which column holds the date, the meal, the food and the nutrients, check the preview, confirm. Foods with a known serving measure join the library; every row becomes a diary entry on the day the file says, with the nutrients the file gives and nothing more. Blank stays unknown. One tap undoes the import while nothing has been touched.

## Owner principles applied
Honest numbers (blank ≠ zero: a missing nutrient is `null`, shown as "Unknown", as the rest of Health does, `lib/health.ts:51`; no serving weight is invented; no calorie or nutrient is estimated). Health safety (no targets, no advice; the import copies, it does not interpret). Private by design (read on the device, never uploaded; the created records are ordinary Health records, so they follow the person's Health consent in sync as today). Never a chore (optional, preview, undo).

## Scope in PR 3
- `lib/import/nutrition.ts` on top of `lib/csv/` (W3): mapping for 16 fields, the per-row plan, the atomic apply into Health, undo.
- Entry point in Health's Diary; Help entry (shared with W3); the Showcase example import.
- **No MyFitnessPal preset** (superseded in Session W Part 7: the owner's Session W brief asks for MyFitnessPal and Cronometer presets flagged community-documented; see `docs/product/IMPORT_FORMATS.md` and ADR-015 S61. The original note follows.) UNVERIFIED: the MyFitnessPal export documentation at `https://support.myfitnesspal.com/hc/en-us/articles/360032273352-Data-Export-FAQs` answered HTTP 403 from the sandbox on 2026-10-03 (as in Session O), so its column names and units could not be confirmed. The generic import with explicit mapping covers such a file once the person matches the columns; a preset may follow when the format is verified from a real export.

Out of scope: recipes, saved meals and plans from a file; water, weight or activity columns (W3 and A2 cover other entries; a later import may add them); images; barcode lookups during import; merging with existing foods by name (an imported food is always new, labelled "imported").

## Data
**Device key:** the shared undo ledger `zigoals:import-undo:v1` (W3), `kind: "nutrition"`, `createdIds` holding the new food ids and diary ids.

**Through existing mutators:** foods through `saveFood` (`lib/health.ts:168`) and diary entries through a new pure `appendDiaryEntries(data, entries)` that validates the whole record with `healthSchema` (the existing `logHealthItem` needs a library source, which rows without a serving measure do not have; see Engine). Every created record is an ordinary Health record (`health_` ids, UTC `createdAt`/`updatedAt` = the import instant, the file's local dates). Diary snapshots are immutable copies, as for any entry.

**Read tolerance:** as W3. **No write switch** (Health records already sync with consent).

## Engine (`lib/import/nutrition.ts`, pure)
Fields (`guessMapping` synonyms in brackets): `date` (date, day; required), `meal` (meal, meal type), `food` (food, food name, item, description; required), `brand` (brand), `quantity` (servings, quantity, qty, amount; default 1), `servingAmount` (serving size, serving weight, weight, volume), `servingUnit` (unit; or the unit inside the serving-size cell: "100 g", "250 ml"), `kcal` (calories, kcal, energy), `protein` (protein, protein (g)), `carbs` (carbohydrates, carbs, carbohydrates (g)), `fat` (fat, total fat), `fibre` (fiber, fibre), `sugars` (sugar, sugars), `saturatedFat` (saturated fat, sat fat, saturated), `sodium` (sodium), `potassium` (potassium), `calcium` (calcium), `iron` (iron).
```
planNutritionImport({rows, mapping, numberStyle, dateFormat, basis, mealMap}) → NutritionPlan
basis: "serving" | "per-100g" | "per-100ml"       // what the nutrient cells describe
NutritionPlan = { foods: PlannedFood[], entries: PlannedEntry[], withoutMeasure: number, refused: {row, reason}[], days: number }
```
- Nutrients: `kcal` whole kcal (`parseHealthNumber(cell, 1, 0, 1_000_000)`), the macros and fibre, sugars, saturated fat in grams with up to three decimals → mg (`parseHealthNumber(cell, 1000, 0, 1e9)`), sodium, potassium, calcium, iron in mg (the `additionalNutrients` table, `lib/health.ts:42`). Blank → `null` for the four core nutrients and absent for the seven additional ones (never 0). A cell that is not a number → the row is refused with "Row {n}: {field} is not a number."
- Serving measure: from `servingAmount` + `servingUnit` (g or mL; "1 serving" is not a measure) when mapped, else from `basis`: per-100g → `servingGrams: 100`, per-100ml → `servingMl: 100`; `basis: "serving"` without a measure column → **no measure**: such rows are logged with a snapshot `{servingGrams: null}` and no `servingMl`, which `snapshotSchema` allows and the diary shows as "Serving measure unknown" (`formatServingMeasure`, `lib/health.ts:85`); no library food is created for them (`foodSchema` requires a measure, `lib/health.ts:30`).
- With a measure: one `PlannedFood` per distinct `(food name, brand, measure, nutrients)` tuple, id `health_imp-{importId}-f{n}`, `name` through `visibleName`, `brand` "{brand} · imported" (or "Imported" when blank; ≤ 80 chars); the entry's snapshot is `foodSnapshot(food)`.
- Quantity: `quantity` is servings (`parseHealthNumber(cell, 1000, 1, 1_000_000)`, default 1,000 milli); with a per-100 basis and a mapped weight column the quantity is `servingsFromGrams(weight, 100)` (`lib/health-daily.ts:170`), so "150 g" becomes 1.5 servings of a 100 g food; blank quantity with a per-100 basis → the row is refused ("Row {n}: give the amount eaten or a serving count.").
- Meals: distinct values of the `meal` column are mapped in the UI to `Breakfast | Lunch | Dinner | Snacks` (`HEALTH_MEALS`); `mealMap` carries the choices; a blank meal → `Snacks`, shown in the preview.
- Dates: W3's `parseDateCell`; a future date is refused; a date before 1900 refused (`healthDateSchema`).
- Limits: the plan refuses when foods would pass 1,000 or diary entries 10,000 ("This import would take your diary past its limit of 10,000 entries. Nothing was imported.") and when the result exceeds the 2 MB module limit (`PRIVATE_MAX_BYTES`), both checked by `healthSchema` and `updatePrivateStore` before any write.
```
applyNutritionImport(data: HealthData, plan, {importId, at}) → HealthData
```
`saveFood` for each planned food, then `appendDiaryEntries` with ids `health_imp-{importId}-e{n}`; one `healthSchema.parse` of the result; atomic through the store's single write.
```
undoNutritionImport(data, record) → HealthData | UndoRefused
```
Removes diary entries whose id is in `createdIds` and whose `updatedAt === record.at`, and foods whose id is in `createdIds` and `updatedAt === record.at`; an edited entry or food (a later `updatedAt`), or a food used since by a recipe or a saved meal, refuses the whole undo: "Some imported entries were edited or used since. Remove them one by one in Health." A food removed by hand already is skipped.
Edge cases: the Health journal's zone is irrelevant (the file's dates are literal days); an entry on today's date shows at once in Today's Health card; duplicate rows are duplicate entries (as typing twice would be), counted in the preview; a 0 in a cell is a known zero.

## UI
### Entry point: Health → Diary
Next to "Scan or look up a food barcode" (`components/health/health-app.tsx:143`): `<details><summary>Import a nutrition CSV</summary>` with one line "From any app's export with a header row. Read on this device only." and the button "Choose a file" that opens the import panel (phone: `PhoneFormSheet` "Import meals"; desktop: an in-page panel in the same `details`).
### The panel, four steps (W3's panel with these fields)
2. **Match the columns:** the 16 selects above (Date, Meal, Food, Brand, Servings, Serving size, Serving unit, Calories, Protein, Carbs, Fat, Fibre, Sugars, Saturated fat, Sodium, Potassium, Calcium, Iron); "Nutrient values are per" radio: "the row's serving" (default when a serving-size column is matched) / "100 g" / "100 mL"; fine print under it: "Without a serving weight or volume, entries are logged with an unknown serving measure, and no food is added to your library."; "Meals in this file" mapping rows: each distinct value with a select of the four meals (pre-filled by name; blank → Snacks); the date and number choices as in W3.
3. **Preview:** "{foods} foods will be added to your library · {entries} diary entries on {days} days · {withoutMeasure} entries without a serving measure · {refused} rows refused"; the first 50 rows as "{date} · {meal} · {food} · {quantity} servings · {kcal} kcal · P {g} · C {g} · F {g}" with "Unknown" for blanks (`formatNutrient`); refused rows with their reasons.
4. **Confirm:** "Import {entries} entries" (primary). After apply: the banner "{entries} entries and {foods} foods imported. Undo" on the Health page (`role="status"`), the "Recent imports" rows inside the details.
Errors: the storage message, the limit messages, "Nothing to import: every row was refused."
### Phone, desktop, tablet
Phone first: the sheet, 16 px selects, the preview inside a scrolling box. Authorized desktop differences: the details in Diary, the panel, the banner and the "Recent imports" rows (README item 4).
### Motion, keyboard, screen reader
As W3.

## Showcase data
One imported food `health_food-0009` `{name: "Showcase imported oats", brand: "Showcase import (fictional)", servingGrams: 100, nutrients: {kcal: 380, proteinMg: 13000, carbsMg: 67000, fatMg: 7000, fiberMg: 10000}}` and two diary entries `health_import-showcase-0` (date `-6`, Breakfast, 0.5 servings) and `health_import-showcase-1` (date `-5`, Breakfast, 0.5 servings) with the food's snapshot; the undo ledger `{version: 1, imports: [{id: "showcase-import-1", kind: "nutrition", at: start, label: "SHOWCASE DATA · fictional example import", createdIds: ["health_food-0009", "health_import-showcase-0", "health_import-showcase-1"], expiresAt: far future}]}` so "Recent imports" shows "SHOWCASE DATA · fictional example import · 2 entries · 1 food · Undo" (undo works on the tab's session copy and is labelled). `isShowcaseBackup` keeps recognising the record (`health_food-0000` with "Showcase kitchen" is still present).

## Help entry (`help-imports`)
Shared with W3 (see W3; the Health sentence there covers this import).

## Tests
Unit (`lib/import/nutrition.test.ts`):
1. Fixture A (`Date,Meal,Food,Calories,Protein (g),Carbohydrates (g),Fat (g)`, no serving column, basis serving): every row → an entry with `servingGrams: null`, nutrients from the file (`proteinMg: 13000` from "13"), `withoutMeasure` = rows, `foods: []`.
2. Fixture B with `Serving size` "100 g" and basis serving → one food per distinct tuple (two rows of the same oats → one food, two entries), snapshot equals `foodSnapshot(food)`.
3. Basis per-100g with a `Weight (g)` column "150" → `quantityMilli: 1500` of a 100 g food; blank weight → refused with the amount message.
4. Blank ≠ zero: a blank "Fat (g)" → `fatMg: null`; "0" → `0`; blank "Sodium" → absent; "120" sodium → `sodiumMg: 120`; "abc" → the row refused.
5. Meals: "Morning Snack" mapped to Snacks through `mealMap`; blank → Snacks.
6. Dates: `2026-09-28` ready; `28/09/2026` with dmy ready; `2027-01-01` refused; the entries' `date` equals the file's day whatever the Health zone.
7. Limits: 9,999 existing entries + 2 rows → refused before writing, data unchanged; the serialized result over 2 MB → refused by the store.
8. Apply is atomic and validated: the result passes `healthSchema`; ids unique; `createdAt === updatedAt === at`.
9. Undo: removes exactly the created ids; after `editDiaryEntry` on one → refused with the message and nothing removed; after a recipe used the food → refused; a hand-removed food → skipped.
10. Showcase: the fixture parses, the ledger record exists, undo on the session copy removes the three ids.
Browser (`tests/nutrition-import.spec.ts`, desktop and mobile; `**/api/**` → 503):
- Health → Diary → "Import a nutrition CSV" → upload fixture A (3 rows, two days) → mapping pre-filled, "Nutrient values are per: the row's serving" → preview "0 foods will be added to your library · 3 diary entries on 2 days · 3 entries without a serving measure · 0 rows refused" → "Import 3 entries" → the diary for the first date lists the two foods with "Serving measure unknown" and "Unknown" for the blank fat; the banner "3 entries and 0 foods imported. Undo"; the Health key holds the three entries; Undo removes them and the key equals the bytes before the import.
- Fixture B: "2 foods will be added…"; the foods appear in Foods & recipes with the brand "… · imported".
- Network: no request carries any cell; the only requests are the 503-routed ones.
- Showcase: "Recent imports" shows the labelled fictional import; nothing written on view.
- 390×844: the sheet, 16 px selects, the preview box scrolls, Undo ≥ 44 px.

## Risks and open questions
- Entries without a serving measure cannot be re-logged from the library and cannot be copied to a grocery list; the preview says so in its count line and Help explains it. This is the honest alternative to inventing 100 g.
- Open: a "merge with an existing food of the same name" option. Recommendation: later; an imported food is clearly labelled and can be removed.
