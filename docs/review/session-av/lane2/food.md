# Lane 2 — Food (branch `lane2/food`)

Session AV lane 2, the Food builder: LEDGER.md group 4 (food logging), group 13 (recipes and meal planning), group 16
(nutrient depth and charts), then q3.md's open food Minors. One entry per feature, in build order. Every new UI part is
in Health's one new lazy entry `components/health/food-plus/food-plus.tsx` (one `lazy()` line in `health-app.tsx`),
or in an existing lazy part; CSS in `components/health/food-plus/food-plus.css` (theme variables only).

Shared-file needs for the lead are collected at the end ("For the lead").

## F1 — Quick add with macros; "Save this meal" in a meal's ⋯ menu

- LEDGER rows: **#86** MyFitnessPal Quick Add — built (the optional protein, carbs and fat). #105 MacroFactor Quick-add
  was already built; its macros part is this. q3 #18 check 8 (Minor) — built. q3 #3 check 8 (Minor, QUALITY.md "Not
  fixed": "Save this meal" in each meal's ⋯ menu) — built.
- What it does: Health → Log a meal → "Just the calories" has a "Protein, carbs and fat (optional)" group; each blank one
  stays unknown, never zero, and the Diary row reads "Quick add · 520 kcal · P 32 g · C 41.5 g · F not given". A meal's ⋯
  menu in the Diary offers "Save this meal" while it has entries: a name (the meal's name and the day, to change), Save
  or Cancel (Escape), focus back to ⋯. The saved meal is the one Meals & planning makes (`saveMealFromDiary`).
- Files: `lib/health-quick/calories.ts` (`quickMacro`, `QUICK_ADD_PREFIX`, `quickAddSourceId`),
  `components/health/quick-calories.tsx`, `components/health/health-app.tsx` (the ⋯ item, the "Quick add" row words,
  "not given" for a blank quick-add macro, the FoodPlus lazy line), `components/health/food-plus/food-plus.tsx`,
  `components/health/food-plus/save-meal.tsx`, `components/health/food-plus/food-plus.css`.
- Tests: `lib/health-quick/av2-quick-macros.test.ts`. Spec: `tests/av2-quick-macros.spec.ts` (3 themes; 390 + 1440).
- Stored changes: none. A quick add's diary entry keeps the strict snapshot (its macros were always nullable); its
  `sourceId` now starts `health_quickadd-` (still a valid Health id), so the row can say "Quick add".
- Help (EN). Q: "Can I add protein, carbs and fat to a quick add?" A: "Yes. In Health → Log a meal → Just the calories,
  type the calories and, if you know them, the protein, carbs and fat. A blank one stays unknown, never zero. Nothing is
  added to your food library." Q: "How do I save a meal I just logged?" A: "In the Diary, open the meal's ⋯ menu and choose
  Save this meal. Give it a name and save. Log it again any day from Health → Meals & planning."
- What's new: "Quick add takes protein, carbs and fat; save a meal from its ⋯ menu."
- Answers: none new (saved meals are already answered by av-life.ts `savedMeals`).
- Showcase: none (the quick-add example stays out, ADR; the Showcase already has saved meals).
- Device keys / catalogue / export / erase: none.
- CSS touched: `components/health/food-plus/food-plus.css` (new; theme variables only).
- Always visible on Today: nothing.

## F2 — Diary times and nutrient timing

- LEDGER rows: **#101** Cronometer Diary timestamps — built. **#108** MacroFactor Micronutrients and top contributors —
  the remainder (nutrient timing, which needed entry times) built; the rest was built in `71bed717`.
- What it does: every Diary entry shows when it was eaten, as a small button in its row: the clock time it was logged at
  when logged on its own day (by the Health journal's zone), else "Add time". The button opens "Eaten at" (a time field)
  with Save time, Use the logged time, No time and Cancel (Escape); focus returns to the time. Under the meals, the
  day's eating window ("07:45 to 19:30 (11 h 45 min)"). Health → Insights → "When you eat": calories, protein, carbs, fat
  or fiber by part of the day (early, morning, midday, afternoon, evening, late), today or over 7 or 30 days, as bars,
  a table (entries, amount a day, share) and the entries left out for lack of a time. Nothing is estimated; a stamp of
  exactly midnight (a day's stamp, as the Showcase's today) carries no clock.
- Files: `lib/food-plus/schema.ts` (the record), `lib/food-plus/times.ts`, `lib/av2-food-keys.ts` (registry literals),
  `components/health/food-plus/entry-times.tsx`, `components/health/food-plus/nutrient-timing.tsx`,
  `components/health/food-plus/food-plus.tsx` (parts `times`, `timing`), `components/health/health-app.tsx` (an empty
  `data-food-time` slot per entry row; the two FoodPlus parts), `food-plus.css`.
- Tests: `lib/food-plus/av2-times.test.ts` (times, timing, the record's round trip export → erase → restore),
  `lib/ai/local-answers/av2-food.test.ts`. Spec: `tests/av2-diary-times.spec.ts`.
- Stored changes (TIER 3 stored formats, own commit): the new device key `zigoals:food-plus:v1` (loose, versioned; every
  part optional and dropped alone when unreadable). This feature writes only its `times` part (entry id → "HH:MM" or
  "none"; ids no longer in the diary are dropped on the next write).
- Help (EN). Q: "Can I see when I ate something?" A: "Yes. Each entry in the Diary shows the time you logged it. Tap the
  time to change it, go back to the logged time, or take it off. An entry logged for another day has no time until you
  add one." Q: "What does “When you eat” show?" A: "Health → Insights → When you eat shows how your calories, protein,
  carbs, fat or fiber spread over the parts of the day, today or over 7 or 30 days. Only entries with a time count; it
  is information, not advice."
- What's new: "Diary times: when you ate each food, your eating window, and When you eat in Insights."
- Answers wiring (engine.ts, beside `avAnswer`, same wrapper): `const found = av2FoodAnswer(question, env, readFoodSources(getAppStorage()))`
  (in node/tests pass `{}`); intents `av2-food-when-eaten`, `av2-food-eating-window`, `av2-food-timing`
  (`lib/ai/evals/as/cases-av2-food.ts`, `AV2_FOOD`; add to `CORPUS` and record expected.json).
- Showcase: earlier days' entries carry clock times already (`showcaseMoment`), so yesterday's timeline, the eating
  window and "When you eat" over 7 days are filled; today's Showcase entries are stamped at midnight and read "Add time".
- Device keys / catalogue / export / erase / restore: `lib/av2-food-keys.ts` — spread `AV2_FOOD_PERSONAL_KEYS` into the
  personal keys, `AV2_FOOD_EXPORT_KEYS` into `DEVICE_KEYS`, `AV2_FOOD_CATALOG_LABELS` into the catalog (area Health),
  `AV2_FOOD_RESTORE` as a `dev('foodPlus', …, FOOD_PLUS, true)` row with "Health", `AV2_FOOD_ERASE_KEYS` into the erase.
- CSS touched: `components/health/food-plus/food-plus.css`.
- Always visible on Today: nothing.
