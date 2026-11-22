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

## F7 — The weekly check-in day, partly logged days, the chosen pace and the goal date

- LEDGER rows: **#106** MacroFactor Weekly check-in with coaching modules — built (choosing the check-in day; marking a
  day partly logged so the estimate leaves it out). **#107** MacroFactor Per-day macro targets and fasting days — the
  rest built (a goal ETA date; the coach using the pace chosen on the energy card). Fasting days: unchanged by design
  (the 1,200 kcal floor; LEDGER says not asked).
- What it does: Health → Weight → "Your coach": "Check-in day" (Monday unless chosen; the week's answer is kept per
  check-in week), "Goal 72 kg: at your trend (−0.3 kg/week), about 26 Dec; at your chosen pace (−0.25 kg/week), about 31
  Dec. A date from the trend so far, not a promise." (also on Today's compact coach), and how many partly logged days are
  left out. The maintenance-estimate card keeps the Pace you choose (the coach's suggestion uses it) and says how many
  partly logged days it leaves out. The Diary: "This day is only partly logged (leave it out of the maintenance
  estimate)" once the day has an entry.
- Files: `lib/health-aa/coach.ts` (`weekStartOf(day, startWeekday)`, `CoachOptions`, `goalDate`, `eta`, `partialLeftOut`;
  additive, defaults unchanged), `lib/health-aa/energy.ts` (`energyEstimate(…, partial?)`, additive),
  `lib/food-plus/checkin.ts`, `lib/food-plus/day-target.ts` (`coachPrefsOf`), `components/health/food-plus/use-day-targets.ts`
  (`useCoachPrefs`), `components/health/food-plus/partial-day.tsx` (part `partial`), `components/health/coach-card.tsx`,
  `components/health/energy-card.tsx`, `components/health/health-highlights.tsx`, `components/health/health-app.tsx`.
- Tests: `lib/food-plus/av2-checkin.test.ts`, `lib/ai/local-answers/av2-food.test.ts`. Spec: `tests/av2-coach-checkin.spec.ts`.
- Stored changes: `checkIn.weekday`, `checkIn.partial` (in `69db6bb3`) and `pace` (TIER 3 commit `1bdf0099`) of
  `zigoals:food-plus:v1`. The coach's answers record is unchanged (still keyed by the week's start day).
- Not changed (named for the lead): NOVA's coach tool (`lib/ai/tools/coach-ai.ts`) and `lib/ai/actions/plan-aa.ts` call
  `coachCheckIn` without the options, so they keep Monday and the fixed pace; pass `readFoodSources`' record to them to
  follow the person's choices.
- Help (EN). Q: "Can I choose my check-in day?" A: "Yes. Health → Weight → Your coach → Check-in day. The coach asks once
  a week from that day." Q: "What if I didn't log everything one day?" A: "Under the Diary's meals, tick This day is only
  partly logged. The maintenance estimate then leaves that day out; its food still counts everywhere else." Q: "When will
  I reach my goal weight?" A: "Your coach shows a date at your trend and, once you choose a pace on the maintenance
  estimate, at that pace. It comes from your trend so far and is not a promise."
- What's new: "Choose your check-in day, mark a partly logged day, and see your goal date."
- Answers: intents `av2-food-goal-date`, `av2-food-check-in`.
- Showcase: the Showcase's goal weight and trend already give a goal date (Health's coach shows it); no seed.
- Device keys: none new. CSS touched: `food-plus.css`. Always visible on Today: nothing (the goal date and the check-in
  day are on Health's coach card only; Today's compact coach is unchanged, for its 390 px ceilings).

## F8 — A front-of-pack photo kept with a food

- LEDGER rows: **#103** MacroFactor Custom food from product photos — built (a front-of-pack photo kept with the custom
  food). Part Carried, as the LEDGER says: **needs a model** — reading the name and brand (or the label) from the photo.
  No model reads the photo.
- What it does: Health → Foods & recipes → "Package photos (optional)": choose a library food, take or choose a photo
  (`capture="environment"` on phones); it is shrunk on the device to 200 kB and kept in IndexedDB (at most 500), shown as
  a 72 px thumbnail beside the food's name in the Foods list with "Remove photo" (focus goes to the row's Edit). Photos
  of removed foods are listed and deleted on request. Empty state: "Add a food to your library first…". Never in
  localStorage, never synced or uploaded.
- Files: `lib/food-plus/photos.ts`, `components/health/food-plus/pack-photos.tsx` (parts `pack-photos`, `pack-thumbs`),
  `components/health/health-app.tsx` (an empty `data-food-photo` slot per library row; the parts), `lib/av2-food-keys.ts`
  (`FOOD_PHOTO_DB_LITERAL`, `AV2_FOOD_DATABASES`).
- Tests: `lib/food-plus/av2-photos.test.ts` (fake IndexedDB). Spec: `tests/av2-pack-photos.spec.ts`.
- Stored changes: a new IndexedDB database `zigoals-food-photos-v1` (one store `photos`, `<scope>:<foodId>` →
  `{blob, type, bytes, at}`). The food-plus `photos` part stays unwritten (IndexedDB holds the list).
- For the lead (registries): add `zigoals-food-photos-v1` to the erased databases (Erase everything and the account
  erase), `exportFoodPhotoEntries(scope)` beside the meal photos in Export everything (`food-photos/…`), and
  `deleteAllFoodPhotos('showcase')` to `clearShowcasePhotos` (lib/showcase-storage.ts). Restore does not read photos back
  (as the meal photos; Help says so).
- Help (EN). Q: "Can I keep a photo of a food's package?" A: "Yes. Health → Foods & recipes → Package photos: choose the
  food and take or choose a photo of its front. It shows beside the food in your list. It stays in this browser only,
  is never uploaded, and nothing reads it: the food's name and numbers stay what you typed."
- What's new: "Keep a photo of a food's package with it."
- Answers: intent `av2-food-pack-photos` (where they are; the photos are not read).
- Showcase: none (no photo fixture is shipped for foods; the Showcase photo stores are cleared on entry and exit).
- CSS touched: `food-plus.css`. Always visible on Today: nothing.

## F9 — Recipe import: ingredients from the offline food library

- LEDGER rows: **#87** MyFitnessPal Saved meals, recipes and Recipe Importer — built. **#95** Cronometer Custom recipes and
  Recipe Importer — built (sharing with other people: against a named rule, nothing shared between people, as the
  LEDGER says). **#104** MacroFactor Recipe importer — the import part built; part Carried: **needs a model** — a
  cookbook photo.
- What it does: Health → Import → a pasted recipe or a web address: each ingredient that matches none of your foods is
  looked up in the offline food library with the same matcher as "Find these foods" (the plain food first, best 5);
  the first is chosen and said ("From the offline food library, check it: Lentils, red, raw (330 kcal per 100 g,
  CIQUAL)"); the row's picker lists the library's foods, "A new food (nutrition unknown)" and your own foods; a bare count
  ("1 onion") gets grams at a usual portion. Save makes each library food a food of yours per 100 g with the library's
  values (as the words-match flow does) and says how many came from the library.
- Files: `lib/food-plus/recipe-library.ts`, `components/health/recipe-import.tsx`.
- Tests: `lib/food-plus/av2-recipe-library.test.ts`. Spec: `tests/av2-recipe-import-library.spec.ts`.
- Stored changes: none (ordinary foods and a recipe).
- Help (EN). Q: "Why do imported recipes now have calories?" A: "When an ingredient matches none of your foods, ZIGoals
  looks it up in its offline food library and picks the closest plain food. Check each row before you save: you can
  choose another library food, one of your own, or a new food whose nutrition stays unknown."
- What's new: "Imported recipes get their nutrition from the offline food library."
- Answers: none new (recipes are already answered from the library the person saved).
- Showcase: none (Import is a flow; nothing to seed).
- Device keys: none. CSS touched: none. Always visible on Today: nothing.

## F10 — Recipes to start from (EN and NL), and a cooking view with the method

- LEDGER rows: **#91** MyFitnessPal Plan tab — built (a built-in recipe collection from offline generic foods, filtered
  by diet style). **#200** Yazio Recipes with a cooking mode — built (the method kept by recipe id; a cooking view one
  step at a time that keeps the screen on where the browser can).
- What it does: Health → Foods & recipes → "Recipes to start from (English and Dutch)": 20 plain recipes written in the
  repository in English and Dutch (`lib/food-plus/recipe-book.ts`), of the diet templates' library foods; Language
  (English / Nederlands, from the device language), Style (vegetarian, vegan, Mediterranean, and high protein / low carb
  worked out from each serving's nutrition — 20 g protein and a quarter of the calories; 15 g carbs or less, with at
  most 15 % of the grams without a value); each shows a serving's kcal and macros from the library ("12+ g" when an
  ingredient gives no value), ingredients and method; "Save to my recipes" adds the foods per 100 g (reused when there)
  and the recipe with its method. Every recipe in the Foods list gets "Cook (N steps)" or "Add the method": the cooking
  view shows the ingredients, then each step in 20 px type with Previous / Next (and the arrow keys), "Keep the screen
  on" (Screen Wake Lock, only where the browser has it), "Change the method", Close and Escape; focus returns to Cook.
  A pasted recipe's method lines and a page's schema.org `recipeInstructions` (HowToStep, HowToSection, text; no HTML;
  at most 60 of 600 characters) are kept with the imported recipe instead of being left aside.
- Files: `lib/food-plus/recipe-book.ts` (content), `lib/food-plus/recipe-book-apply.ts`, `lib/food-plus/steps.ts`,
  `components/health/food-plus/recipe-book.tsx` (part `recipe-book`), `components/health/food-plus/cook-view.tsx` (part
  `recipe-cook`), `components/health/recipe-import.tsx` (keeps the method), `lib/health-aa/recipe-text.ts` (`stepLines`,
  additive), `lib/server/recipe-import.ts` (`instructions` in the reply, `instructionLines`), `components/health/health-app.tsx`
  (an empty `data-recipe-cook` slot per recipe row; the fold and the part).
- Tests: `lib/food-plus/av2-recipe-book.test.ts` (against the shipped CIQUAL file), `lib/server/recipe-import.test.ts`
  (deliberate change, labelled: the exact object now carries `instructions`), `lib/ai/local-answers/av2-food.test.ts`.
  Spec: `tests/av2-recipe-book.spec.ts`.
- Stored changes: the `steps` part of `zigoals:food-plus:v1` (TIER 3 commit `e5c2a049`). The strict recipe record is
  unchanged. The recipe-import API reply gains `instructions` (older clients ignore it).
- Help (EN). Q: "Are there recipes in ZIGoals?" A: "Yes: Health → Foods & recipes → Recipes to start from has twenty
  plain recipes in English and Dutch, by style, each with its nutrition from the offline food library. Save one to
  your recipes and change it as you like." Q: "Can I cook step by step?" A: "Yes. Beside a recipe in Foods & recipes,
  press Cook: you see the ingredients, then one step at a time in large type. Where your browser allows it, Keep the
  screen on stops the screen going dark. Add or change the method with Add the method."
- What's new: "Twenty recipes to start from, in English and Dutch, and a step-by-step cooking view."
- Answers: intent `av2-food-recipe-ideas` (the collection's names by style); a recipe's method (`recipeMethod`, from the
  device record) — not in the corpus (the Showcase recipes have no method).
- Showcase: the collection is built in, so the Showcase shows it filled; nothing seeded (a seeded method would change
  the Showcase's recipe rows other specs read).
- Device keys: none new. CSS touched: `food-plus.css`. Always visible on Today: nothing.

## F11 — A day planned from your recipes that fits your targets

- LEDGER rows: **#89** MyFitnessPal Meal Planner and grocery list — built (a meal plan from your recipes to fit your kcal
  and macro targets). Part Carried, as the LEDGER says: **needs an outside service** — grocery delivery. The plan's
  groceries are in the planner's existing list.
- What it does: Health → Planner → "Plan a day that fits my targets" (a fold): a day (tomorrow by default; any date),
  breakfast, lunch and dinner from your recipes with known calories (at most 30, the latest first), each at ½, 1, 1½ or
  2 servings, chosen together to come closest to that day's calorie target (×3 weight) and the protein, carbs and fat
  targets you set (a weekday's own targets count); a table (meal, recipe, servings, kcal, P/C/F; the day's total and
  "within 5 %" or "N kcal over/under"); "Another plan" (the next best, distinct recipes); "Plan this day" writes saved
  meals (reused for the same recipe and amount) and ordinary plans — logged only when eaten. Empty states: no target;
  fewer than three recipes (points to "Recipes to start from").
- Files: `lib/food-plus/fit-plan.ts`, `components/health/food-plus/fit-plan.tsx` (part `fit-plan`),
  `components/health/health-app.tsx` (the fold in Planner).
- Tests: `lib/food-plus/av2-fit-plan.test.ts`. Spec: `tests/av2-fit-plan.spec.ts`.
- Stored changes: none (ordinary saved meals and plans).
- Help (EN). Q: "Can ZIGoals plan my meals to fit my targets?" A: "Yes, from your own recipes. Health → Planner → Plan a
  day that fits my targets picks a breakfast, lunch and dinner and their servings to come close to your calories and
  the macros you set. Press Plan this day to add them to the planner; nothing is logged until you eat it."
- What's new: "Plan a day from your recipes that fits your targets."
- Answers: intent `av2-food-fit-plan` (the best plan for tomorrow, or what it needs).
- Showcase: the Showcase has one recipe, so the fold shows its teaching state there; seeding two more recipes would move
  the Showcase's recipe counts other answers pin (listed for the lead, not done).
- Device keys: none. CSS touched: none new. Always visible on Today: nothing.

## F12 — Nutrient depth and charts: every library nutrient kept, Compare with food, weight, symptoms and doses, a nutrition report section

- LEDGER rows: **#93** Cronometer Food diary with 95 nutrients — built for every nutrient the offline data has (25: the
  label's eleven, seven vitamins, magnesium, zinc, B1, B2, B3, B6, omega-3; all already in the app's model): foods saved
  from the library by the new flows (recipe import, recipes to start from) now keep their vitamins and extras beside them
  (`zigoals:health-vitamins:v1`, `zigoals:nutrient-extras:v1`), as the barcode and library lookup do, so the nutrient
  report and the Oracle count them. Part left — **needs an outside service**: the ~45 further nutrients of Cronometer's
  list are not in the shipped tables; adding them means downloading the public source datasets again at build time
  (`scripts/food/build-generic-db.mjs` fetches them; the raw files are not in the repository) and widening the strict
  file format. **#98** Cronometer Custom Charts and Reports — built: calories, protein and weight as Compare outcomes;
  a "Nutrition (from the food diary)" section in the visit report (days logged; average a day over the days whose every
  entry gives the value, for eleven nutrients). Blood pressure (upper, mmHg) and each lab value by its marker
  name (its gap a twentieth of its own average) from "Your numbers" are Compare outcomes too (follow-up commit); they were
  already their own report section. **#92** MyFitnessPal
  GLP-1 support — built: a dose taken (supplements and medication log: taken against skipped, no mark unknown) and a
  symptom logged are Compare factors, and each symptom's level 0–3 is an outcome — "On days you took “X”, your
  “nausea” level that day averaged 0.0 of 3; on other days, 2.0 of 3", under Compare's own rules (14 days a side).
- Files: `lib/food-plus/library-extras.ts`, `lib/food-plus/recipe-library.ts`, `lib/food-plus/recipe-book-apply.ts`
  (`made` callback), `components/health/recipe-import.tsx`, `components/health/food-plus/recipe-book.tsx`,
  `lib/compare/engine.ts` (outcomes `kcal`, `protein`, `weight`, `symptom:<id>`; factors `dose:<id>`, `symptom:<id>`;
  sources `symptoms`, `supplements`; additive), `components/insights/compare/compare-explorer.tsx` (reads the two logs),
  `lib/experiments/engine.ts` (says the new outcomes by Compare's label), `lib/clinician-report/build.ts` (section
  `nutrition`), `components/report/report-document.tsx`.
- Tests: `lib/compare/av2-compare-food.test.ts`, `lib/clinician-report/build.test.ts` (deliberate, labelled: the
  fixture gains a diary entry so every section has data, the assertion unchanged; plus the nutrition rows),
  `lib/food-plus/av2-recipe-book.test.ts` (library extras), `lib/food-plus/av2-recipe-library.test.ts`. Specs:
  `tests/av2-compare-report.spec.ts`; `tests/av-report-more.spec.ts` (deliberate, labelled: nine section boxes, not eight).
- Stored changes: none new (the existing vitamins and extras records gain values for new library foods; Compare's saved
  pair may now name a new outcome id, which older builds treat as unknown and fall back to the first outcome).
- Help (EN). Q: "Can I compare a symptom with the days I took a dose?" A: "Yes. Health → Insights → Compare: choose Took
  (your supplement or medication) and, under what was, the symptom's level. After 14 days on each side it says how the
  levels differed. It shows what went together, never what caused it." Q: "Can the visit report include what I ate?"
  A: "Yes: tick Nutrition (from the food diary) in Make a report. It gives the average a day of calories, protein,
  carbs, fat, fiber and more over the days you logged."
- What's new: "Compare doses, symptoms, calories and weight; nutrition in the visit report."
- Answers: none new (Compare is a page of its own; the symptoms log is never read by the answers, by design).
- Showcase: the Showcase's symptoms, supplements, diary and weights make the new options appear in Compare there.
- Device keys: none. CSS touched: none. Always visible on Today: nothing.
