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
