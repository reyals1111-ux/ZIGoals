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

## F3 — Targets by weekday; sugar alcohols in net carbs

- LEDGER rows: **#88** MyFitnessPal Custom macro goals by day and Net Carbs mode — built (macro grams per weekday; a
  sugar-alcohols field for net carbs). **#97** Cronometer Macro Scheduler — built (same build). **#107** MacroFactor
  Per-day targets — the per-day part built here; its goal ETA and the coach's chosen pace are F4. Fasting days stay
  under the 1,200 kcal floor by design (LEDGER: not asked).
- What it does: Health → Targets → "Targets by weekday (optional)": calories, protein, carbs and fat for each weekday
  (Monday first), blank keeps the Targets' value (shown as the placeholder); "Same as Monday for Tuesday to Friday",
  "Clear weekday targets", the week's calories by these targets. The Diary's summary (ring, remaining, macro tiles) and
  Today's Health module use the day's own targets and say "(Saturday’s)". Health → Targets → "Sugar alcohols for net
  carbs (optional)": grams per serving of each library food with carbs; in macro mode "Net carbs" or "Keto" they are
  taken off the day's carbs (as fiber is).
- Files: `lib/food-plus/day-target.ts` (a schema-free reader for the first chunks, `dayTargets`, `sugarAlcoholMg`),
  `lib/food-plus/weekdays.ts`, `components/health/food-plus/use-day-targets.ts`,
  `components/health/food-plus/weekday-targets.tsx` (parts `weekdays`, `sugar-alcohols`),
  `components/health/health-app.tsx` (HealthSummary reads the day's targets; two LazyFolds in Targets),
  `components/health/health-today.tsx` (Today's module reads the day's calorie target), `lib/health-aa/macro-mode.ts`
  (`netCarbs(nutrients, sugarAlcoholMg = 0)`, additive).
- Tests: `lib/food-plus/av2-weekdays.test.ts`, `lib/ai/local-answers/av2-food.test.ts`. Spec: `tests/av2-weekday-targets.spec.ts`.
- Stored changes: the `weekdays` and `sugarAlcohols` parts of `zigoals:food-plus:v1` (in the TIER 3 commit `69db6bb3`).
- Weight: Health's and Today's first chunks gain the small reader (`day-target.ts` + `use-day-targets.ts`, no schema
  library); every form is lazy.
- Help (EN). Q: "Can I have different targets on different days?" A: "Yes. Health → Targets → Targets by weekday gives a
  weekday its own calories, protein, carbs or fat. A blank field keeps your usual target. The Diary and Today then show
  each day against its own targets." Q: "How are net carbs counted?" A: "In the Net carbs and Keto modes, carbs minus
  fiber (when every entry has it) and minus the sugar alcohols you gave for a food in Targets → Sugar alcohols for net
  carbs. Nothing is guessed."
- What's new: "Targets by weekday, and sugar alcohols in net carbs."
- Answers: intents `av2-food-weekday-targets`, `av2-food-net-carbs` (same wiring as F2).
- Showcase: none (Showcase targets are pinned by other answers' corpus figures, "2,200 kcal"; a weekday target would
  move Today's and the corpus's target lines).
- Device keys: none new (the F2 key).
- CSS touched: none new.
- Always visible on Today: nothing new (Today's Health module's existing target line reads the day's target).

## F4 — A microphone on the meal field

- LEDGER rows: **#85** MyFitnessPal Voice Log — the remainder built (the mic on Health's meal field). #94 Cronometer
  Voice Logging was already built; its mic is this.
- What it does: Health → Log a meal → "Just describe it" has "Speak your meal" beside "What did you eat?" where the
  browser has speech recognition (SpeechRecognition or webkitSpeechRecognition); where it has none, nothing is shown.
  The browser's recognition, English or Dutch by the device language, read the spoken way (fillers out, numbers as
  digits), fills the field (appended to what is there); nothing is logged until "Log in words". "Stop listening",
  aria-pressed, a Listening status, and "Speech is handled by your browser, not by ZIGoals" with the browser's own words.
  No model reads the words.
- Files: `components/health/food-plus/meal-mic.tsx`, `components/health/meal-words.tsx` (a lazy MealMic, in HealthPlus's
  chunk), `food-plus.css`.
- Tests: `lib/food-plus/av2-meal-mic.test.ts`. Spec: `tests/av2-meal-mic.spec.ts` (a FAKE recognition; and a browser
  without one).
- Stored changes: none.
- Help (EN). Q: "Can I say what I ate?" A: "Yes, where your browser can turn speech into text. In Health → Log a meal →
  Just describe it, press Speak your meal and say it. The words land in the field so you can check them; nothing is
  logged until you press Log in words. Your browser handles the speech, not ZIGoals."
- What's new: "Say what you ate: a microphone on the meal field."
- Answers: none new (the words are the existing meal-words record).
- Showcase: none (speech needs the person's own voice).
- Device keys: none. CSS touched: `food-plus.css`. Always visible on Today: nothing.

## F5 — The Oracle with protein and the vitamins

- LEDGER rows: **#100** Cronometer Oracle nutrient search and food suggestions — the remainder built (protein and the
  vitamins; the minerals, omega-3 and the B vitamins the offline library carries too).
- What it does: Health → Insights → "Foods high in a nutrient (the Oracle)" (a fold): any of 19 nutrients the offline
  library carries (protein, fiber, potassium, calcium, iron, magnesium, zinc, vitamins A, C, D, E, K, B1, B2, B3, B6, B12,
  folate, omega-3); the richest foods as people eat them (no dried herbs, spices, seaweed or powders), ranked by a usual
  portion or per 100 kcal (nutrient density), with the per-100 g value; for protein with a target, today's gap and what a
  portion covers of it. The library loads on the fold's first opening.
- Files: `lib/food-plus/oracle.ts`, `components/health/food-plus/oracle.tsx` (part `oracle`), `health-app.tsx` (a LazyFold
  in Insights).
- Tests: `lib/food-plus/av2-oracle.test.ts`, `lib/ai/local-answers/av2-food.test.ts`. Spec: `tests/av2-oracle.spec.ts`.
- Stored changes: none.
- Help (EN). Q: "Which foods are high in protein or a vitamin?" A: "Health → Insights → Foods high in a nutrient lists the
  offline food library's richest foods in the nutrient you choose, by a usual portion or per 100 kcal. Dried herbs,
  spices and powders are left out. It comes from public food tables and is information, not advice."
- What's new: "The Oracle: foods high in protein, vitamins and minerals."
- Answers: intents `av2-food-oracle-protein` (own foods highest in protein, and where the library's list is) and
  `av2-food-oracle-vitamin` (where the list is; the library is not read by the answers, it loads in the page).
- Showcase: the Oracle reads the app's own offline library, so the Showcase shows it filled; nothing to seed.
- Device keys: none. CSS touched: `food-plus.css`. Always visible on Today: nothing.

## F6 — Meal reminders on the device, and a weekly logging challenge

- LEDGER rows: **#90** MyFitnessPal Today screen, streaks, habit challenges and meal reminders — built (meal reminders as
  device notifications; a weekly logging challenge).
- What it does: Settings → Notifications → "Meal reminders" (off by default): once the meal reminders are on in Health
  (Diary → "Name your meals and set their times"), a daily wake at each meal's usual time; today's is left out once the
  meal is logged or "Not today" was chosen (as Today's in-app card). The notification reads "Time for Lunch" with names
  on, else "A meal reminder you set in Health"; it opens the Diary; never what was eaten. Inside quiet hours it is said
  on the card and wakes nothing (the plan's rule). Health → Insights → "Weekly logging challenge": 1 to 7 days a week,
  Monday to Sunday; the week day by day (✓ logged), "N more to go" or "can’t reach it any more", weeks met in a row and
  in all; change or stop; the Diary shows one line with "See the week" while it runs.
- Files: `lib/food-plus/meal-notify.ts`, `lib/notify/prefs.ts` (type `meals`, off), `lib/notify/plan.ts` (kind `meal`,
  input `meals`), `lib/notify/sync.ts` (reads health-extras + Health), `public/sw.js` (the line), `lib/food-plus/challenge.ts`,
  `components/health/food-plus/challenge.tsx` (parts `challenge-line`, `challenge`), `components/health/meal-names.tsx`
  (the status line points to Settings → Notifications), `components/health/health-app.tsx` (the Diary line; an Insights
  fold that opens on `#health-challenge`; `LazyFold` takes `open`).
- Tests: `lib/notify/av2-meal-notify.test.ts` (plan, prefs, the worker's words), `lib/food-plus/av2-challenge.test.ts`,
  `lib/ai/local-answers/av2-food.test.ts`. Spec: `tests/av2-logging-challenge.spec.ts`.
- Stored changes: the notify prefs' loose `types` record gains the key `meals` when switched (the record already keeps
  any type name); the `challenge` part of `zigoals:food-plus:v1`. The food-plus `notify` part is reserved, not written
  (the notify prefs carry the switch).
- TIER 3 (PWA): the notification plan and `public/sw.js` — own commit.
- Help (EN). Q: "Can meal reminders come as notifications?" A: "Yes. Turn on the meal reminders in Health → Diary → Name
  your meals and set their times, then turn on Meal reminders in Settings → Notifications. Each comes at the meal's time
  until that meal is logged that day. It never says what you ate." Q: "What is the logging challenge?" A: "A goal you
  set yourself in Health → Insights → Weekly logging challenge: log your food on a number of days a week. A day counts
  when the Diary has an entry. Each week starts afresh."
- What's new: "Meal reminders as notifications, and a weekly logging challenge."
- Answers: intents `av2-food-meal-reminders`, `av2-food-challenge`; `readFoodSources` now also reads `zigoals:health-extras:v1`.
- Showcase: none (a running challenge would add a line to the Showcase Diary that other Health specs pin by text; the
  Showcase has no meal times, so no reminder).
- Device keys: none new. CSS touched: `food-plus.css`. Always visible on Today: nothing (no Today change).
- Settings: the Notifications card lists one more switch (Settings' tab stops grow by one).
