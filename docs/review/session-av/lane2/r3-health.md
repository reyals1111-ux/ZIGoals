# Lane 2 round 3 — health (Waterllama, Way of Life, Carb Manager, Nike Training Club): builder registry

Branch `lane2/r3-health`, from `lane2/batch2` at `3d27688e`. Rows: LEDGER "Round 3: rows #256–#299", groups T2
(Waterllama, #280–#283), T4 (Way of Life, #275, #276), T7 (Carb Manager and Nike Training Club, #284, #286–#289). One
section per feature. Every stored change is listed under "Stored changes" for the lead's TIER 3 (stored formats) label;
every notification-plan change under "TIER 3 (PWA)".

Health's rules kept throughout: every Health part sits inside the Health route (its gate and consent); no calorie
expenditure is estimated anywhere new; no medical claim, range or verdict. Every new Health UI is in the lazy
`components/health/r3/health-r3.tsx` entry (one `lazy()` line each in `health-app.tsx` and `daily-tools.tsx`; the first
chunk carries only those lines, two small props and the water form's two-line handle on the energy fields).

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:notify:v1` (existing, device-only, loose) | optional `waterSpread` `{on, from, to, every: 60 \| 120 \| 180}` and `weighIn` `{time, repeat: daily \| weekdays \| monthly, weekdays? (mask 1–127), day? (1–28)}`, each `.optional().catch(undefined)` (a part of `weighIn` it cannot read is dropped alone). Commit `cec6b6ee`. | Kept untouched; an older build keeps its one water time and has no weigh-in type. |
| `zigoals:habit-extras:v1` (existing, loose, synced with the habit extras) | optional `reminderMore` `{habitId: {words? (≤ 80), times? (≤ 2 "HH:MM")}}`, `.optional().catch(undefined)`, each entry checked where read (`lib/habit-reminder-words.ts`). Commit `790a8490`. | Kept untouched; older builds remind at the one time with the habit's name. |
| `zigoals:health-numbers:v1` (existing, device-only, loose) | a reading gains optional `meal` (Breakfast \| Lunch \| Dinner \| Snacks), `mealWhen` (before \| after) and `time` ("HH:MM"), each `.optional().catch(undefined)` on the loose reading. Commit `bf032010`. | Kept untouched; older builds show the reading without its meal. |
| `zigoals:health-goals-more:v1` (NEW, device-only, loose, versioned) | `{version: 1, goals[≤ 50]: {id, name (1–60), source: nutrient \| body \| number, key, unit?, target, direction: at-least \| at-most, windowDays: 7 \| 14 \| 30, status: active \| closed, createdAt}}`; an unreadable goal is dropped, the others kept; unknown top-level parts kept. Commit `f6fe645e`. | New key; older builds never read it. |
| `zigoals:workout-circuits:v1` (NEW, device-only, loose, versioned) | `{version: 1, circuits[≤ 30]: {id, name (1–60), moves[1–12]: {exerciseId}, workSeconds 5–600, restSeconds 0–300, rounds 1–20, roundRestSeconds 0–600, createdAt}}`; an unreadable circuit is dropped, the others kept. Commit `802e4604`. | New key; older builds never read it. A logged circuit is an ordinary finished workout (timed sets) in `zigoals:workouts`, readable by every build. |
| `zigoals:health-extras:v1` (existing, device-only, loose) | optional `ownDrinks` (≤ 30 `{id, name 1–24, type (a fixed drink type), sizeMl 1–2000, symbol?, colour?, caffeineMg?, kcal? 0–2000, sugarG? 0–300}`; an unreadable drink is dropped, the others kept), `waterTips` (boolean); a drink note gains optional `own` (its own drink's id), `kcal`, `sugarG`, each `.optional().catch(undefined)`. Commit `cec6b6ee`. | A drink note keeps its fixed `type` and `caffeineMg`, so an older build reads every entry as before. |

## TIER 3 (PWA)

- `lib/notify/plan.ts`: `waterSpread` items (the `water` kind, ids `water-1`…`water-12`, recurring wakes; skipped today
  once on pace; refused inside quiet hours; when present they stand in for the one water time). The service worker's
  existing water line composes them (`Water: 400 mL to be on pace`); `public/sw.js` unchanged. Feature 1.
- `lib/notify/plan.ts` and `lib/notify/sync.ts`: a habit's own reminder words (as its `label`, so only where names are
  allowed, never for a Health-linked habit) and up to two more times a day (each a recurring wake, the same habit id, so
  Done and Snooze work as before). `public/sw.js` unchanged. Feature 2.
- `lib/notify/prefs.ts`, `lib/notify/plan.ts`, `lib/notify/sync.ts`, `public/sw.js`: a new notification type and kind
  `weighIn` (on by default; the reminder itself is off until set in Health → Weight): a recurring wake on its weekdays, or
  a one-off on a monthly reminder's day; quiet once a weight is logged that day; the service worker's one new line "Time to
  weigh in" (never a weight). Settings → Notifications gains one switch, "Weigh-in". Feature 3.

## Summary: rows and verdicts

| LEDGER row | verdict | feature |
|---|---|---|
| #280 Waterllama: reminders through the day | built | 1 |
| #281 Waterllama: your own drinks | built | 1 |
| #282 Waterllama: calories from drinks | built (only as typed; never guessed) | 1 |
| #283 Waterllama: hydration tips | built (opt-in; no health claims) | 1 |
| #275 Way of Life: reminders in your own words | built | 2 |
| #276 Way of Life: trend per habit | built | 2 |
| #286 Carb Manager: weigh-in reminders | built | 3 |
| #284 Carb Manager: glucose and ketones beside meals | built; part Carried: the glucose-ketone index (against the no-medical-advice rule) | 4 |
| #287 Carb Manager: goals on any health number | built; part Carried: ketone (and glucose, insulin, HbA1c) targets and a BMI goal (against the no-medical-advice rule) | 5 |
| #288 Nike Training Club: find a workout by length, muscle and place | built | 6 |
| #289 Nike Training Club: timed circuit workouts | built (never calories) | 7 |

Specs for the shard lists (none run here): `tests/av2-water-day.spec.ts`, `tests/av2-habit-words-trend.spec.ts`,
`tests/av2-weigh-in.spec.ts`, `tests/av2-meal-readings.spec.ts`, `tests/av2-more-health-goals.spec.ts`,
`tests/av2-library-filters.spec.ts`, `tests/av2-circuits.spec.ts`.

QUALITY Minors: none were in this task's list (rows T2, T4, T7 only); none were taken up.

Seen in passing, not changed (for the lead): Health → Activity already shows "About N kcal used — an estimate" for a
manual activity of a known type (`components/health/health-app.tsx`, `lib/health-activity-types.ts activityKcalEstimate`,
Session AL fourth pass, C-MO-39). It is an energy-expenditure estimate, which this lane's brief says is never made. Nothing
in this branch adds one (a logged circuit's activity is named "Timed circuit: …", which matches no activity type); whether
the existing one stays is the owner's call.

## Shared to-do for the lead (all features)

- engine.ts wiring: see "Answers" at the end.
- Search (static.ts): see each feature.
- Showcase hook: see "Showcase" at the end.
- CSS files touched (for the theme sheets): `components/health/r3/health-r3.css` (new) and those listed per feature.
- Today: nothing new is always visible. A habit's reminder card (only when it is due) says the person's own words
  instead of "Not done yet today." alone (feature 2); this adds the small `lib/habit-reminder-words.ts` reader (no schema)
  to Today's reminder-cards chunk and no Tab stop.

## 1. Water: reminders through the day, your own drinks, energy and sugar from drinks, a tip a day — LEDGER #280 built, #281 built, #282 built, #283 built

- What: Health → Diary → the Water card, under the one-tap row (its own chunk):
  - Your own drinks as one-tap buttons (symbol, name, usual size; the colour as an edge), each a water entry with its
    drink, its caffeine, energy and sugar copied on, and Undo. "Your drinks (n of 30)" makes, edits, moves and removes
    them: a name, what it counts as (one of the fixed drink types, so older builds read it), a usual size, caffeine,
    energy (kcal) and sugar (g), a symbol and a colour (each named for screen readers). The empty state teaches. Removing
    a drink keeps what was logged with it.
  - The water form gains "Energy (kcal, optional)" and "Sugar (g, optional)" (blank is unknown, never zero), kept with the
    entry; Edit shows them again. The card says "From today's drinks, as you typed them: 250 kcal · 21.5 g sugar", and the
    food day's summary gets a drink line ("Drinks: 250 kcal · 21.5 g sugar from 2 drinks as you typed them (1 more
    without an amount, not counted). Food and drinks together: 1,980 kcal."). The food total, its ring and the targets
    stay food only, as before: nothing pinned moves. Nothing is looked up or guessed.
  - "Show a water tip each day" (a pressed button, off by default) shows one practical tip a day from 28 written in the
    repository in English and Dutch ("Put a glass by the kettle…"), with Another tip and In het Nederlands. No health
    claims (a unit test bans the words).
  - "Reminders through the day": from, to, every 1, 2 or 3 hours (default 09:00–21:00 every 2 hours); each reminder is
    skipped when today is on pace (a straight line from nothing at the start to the whole target at the end; the first
    once anything is logged); the card lists today's times with "skipped: you are on pace", "400 mL to be on pace" or
    "inside your quiet hours, not sent"; with no target every reminder comes and the card says so. Switching it on
    switches the Water notification type on; the card says when notifications are off on this device or Water is muted.
- Files: `lib/water-spread.ts`, `lib/own-drinks.ts`, `lib/water-tips.ts` (new, pure); `lib/health-extras.ts`,
  `lib/notify/prefs.ts` (stored commit); `lib/notify/plan.ts`, `lib/notify/sync.ts`; `components/health/r3/health-r3.tsx`,
  `water-more.tsx`, `drink-fields.tsx`, `health-r3.css` (new); `components/health/daily-tools.tsx` (one lazy line, the
  form's handle), `components/health/health-app.tsx` (one lazy line, the drink line).
- Tests: `lib/av2-r3-water.test.ts`, `lib/notify/av2-r3-health-stored.test.ts`; existing notify, health-extras and sw
  tests unchanged and green. Spec: `tests/av2-water-day.spec.ts`.
- Stored: see the table (commit `cec6b6ee`).
- Help (EN): **Can I make my own drinks?** Yes. In Health → Water, open "Your drinks" and add up to 30: a name, a symbol
  and colour, a usual size, and the caffeine, calories and sugar if you know them. Each one is a button above: one tap logs
  it. **Are calories from drinks counted?** Only when you type them, on one of your drinks or in the water form. The day's
  drinks show as their own line beside your food, with food and drinks together; nothing is guessed, and every drink still
  counts as water as you logged it. **Can water reminders follow my day?** Yes. "Reminders through the day" reminds you
  every one, two or three hours between the times you choose, and skips a reminder when you are on pace for your target.
  Quiet hours are kept. Notifications must be on for this device. **What are the water tips?** One small, practical idea a
  day for having water at hand, in English or Dutch. They are off until you choose "Show a water tip each day".
- What's new: "Water: your own drinks in one tap, calories and sugar from drinks as you type them, reminders that follow
  your pace, and a tip a day."
- Search (static.ts): "own drinks", "drink calories", "water reminders", "water tip" → `/app/health#water`.
- Device keys / catalogue / export / erase: nothing new (both records are registered).
- CSS: `components/health/r3/health-r3.css`. Nothing on Today.

## 2. Habits: a reminder in your own words with more times a day, and a trend per habit — LEDGER #275 built, #276 built

- What: a habit's editor (for a saved habit), under its reminder time: "Your own words and more times" (its own chunk)
  — a line of the person's own for the reminder (up to 80 characters, with a count) and up to two more times a day,
  saved with its own button in the habit extras. Today's reminder card says "Shoes by the door? Not done yet today."; a
  notification shows the words in place of the name where names are allowed (never for a Health-linked habit), and wakes
  at each extra time with the same Done. Under the habits' history ("Your last 30 days"), "Trend per habit": every active
  habit's share of decided scheduled days in the last 30 days beside the 30 before, grouped More often (the biggest rise
  first), About the same (within 10 points), Less often, Not enough days yet (each window needs 5); each habit's
  Consistency & trends says it in a sentence ("100% (29 of 29 days) in the last 30 days, 50% (15 of 30 days) the 30 before:
  more often."). No "needs attention" wording anywhere; skipped, paused and rest days count for nothing.
- Files: `lib/habits-extras/schema.ts` (stored commit), `lib/habit-reminder-words.ts`, `lib/habits-v2/trend.ts` (new,
  pure); `lib/notify/plan.ts`, `lib/notify/sync.ts`; `components/habits/reminder-more.tsx`,
  `components/habits/habit-trend-list.tsx`, `components/habits/habit-r3.css` (new); `components/habits/habit-editor.tsx`
  (one lazy line), `components/habits/habit-consistency.tsx`, `components/habits/habit-patterns.tsx` (both lazy chunks
  already), `components/reminders/reminder-cards.tsx` (the card's words).
- Tests: `lib/av2-r3-habits.test.ts` (reads, the editor's checks, export → erase → restore, the plan and the service
  worker's line with names on and off, the trend words and order); existing habit-extras, notify and reminders tests green.
  Spec: `tests/av2-habit-words-trend.spec.ts`.
- Stored: `reminderMore` on the habit extras (see the table).
- Help (EN): **Can a habit reminder say something of my own?** Yes. Edit the habit and open "Your own words and more
  times" under its reminder time: write a line like "Shoes by the door?" and, if you like, up to two more times a day.
  Today's reminder card shows your words; a notification shows them only if names are on in Settings → Notifications.
  **What does a habit's trend mean?** It compares the share of scheduled days you did in the last 30 days with the 30
  days before: more often, about the same (within 10 points) or less often. Skipped, paused and rest days don't count.
- What's new: "Habits: reminders in your own words, up to three a day, and a trend for each habit."
- Search (static.ts): "reminder words", "habit trend" → `/app/habits`.
- Showcase hook: none needed (the Showcase's habits have two months of history, so the trend list shows there under the
  labelled "Showcase example history"; no pinned count reads it).
- Device keys / catalogue / export / erase: nothing new (the habit extras are registered).
- CSS: `components/habits/habit-r3.css` (new).

## 3. Weigh-in reminders — LEDGER #286 built

- What: Health → Weight → "Weigh-in reminder" (its own chunk): off until set and says so; every day, on chosen weekdays
  (Mon…Sun, each named for screen readers) or once a month on a day 1–28, at a chosen time; skipped on a day a weight is
  already logged (the card says so that day); a time inside quiet hours is said on the card. Saving switches the new
  "Weigh-in" notification type on; the card says when notifications are off on this device or the type is muted. Turn it
  off removes it. The reminder never says a weight; a tap opens Health → Weight.
- Files: `lib/weigh-in.ts` (new, pure); `lib/notify/prefs.ts` (the type; the stored field is in commit `cec6b6ee`),
  `lib/notify/plan.ts`, `lib/notify/sync.ts`, `public/sw.js`; `components/health/r3/weigh-in.tsx` (new),
  `components/health/r3/health-r3.tsx`, `components/health/health-app.tsx` (one lazy line in the Weight view).
- Tests: `lib/av2-r3-weigh-in.test.ts` (and the stored test of feature 1); existing notify, push and sw tests green (run
  `lib/push` from the repository root: from `apps/web`, `not-configured-answers.test.ts` cannot resolve `server-only`, as
  before this branch). Spec: `tests/av2-weigh-in.spec.ts`.
- Help (EN): **Can ZIGoals remind me to weigh in?** Yes. In Health → Weight, "Weigh-in reminder" reminds you every day, on
  the days you choose, or once a month, at your time. It stays quiet on a day you already logged a weight, and never says
  a number. Notifications must be on for this device.
- What's new: "Weight: a weigh-in reminder every day, on your days or once a month, quiet once you have weighed in."
- Search (static.ts): "weigh-in reminder" → `/app/health?view=weight`.
- Showcase hook: none (the Showcase plans no notification).
- Device keys / catalogue / export / erase: nothing new. Settings → Notifications lists the new type by itself.
- CSS: `components/health/r3/health-r3.css`.

## 4. Glucose, ketones and other readings beside a meal — LEDGER #284 built (part Carried: the glucose-ketone index, against the no-medical-advice rule)

- What: Health → Measurements → Your numbers → "Add lab values" gains "With a meal (optional)" (Before / After breakfast,
  lunch, dinner, a snack) and "Time taken (optional)" for the sheet day's values; each value's history says "after lunch,
  13:45". The Diary shows, under each of the four meals, "Your readings: Glucose 5.2 mmol/L before (12:00) · Glucose 7.8
  mmol/L after (13:45) · Ketones 0.6 mmol/L after (13:45). As you typed them in Your numbers." Only the readings: no range,
  no verdict, no index beside the meal (the Your numbers card keeps its own "inside / outside the range you copied").
  Carried: the glucose-ketone index the ledger row names is left out — working one out and showing it beside a meal is
  medical advice (the lead's brief for this lane: "no glucose-ketone index, no range or verdict"). Insulin doses stay with
  medication (Bearable's row).
- Files: `lib/health-numbers/store.ts` (stored commit), `lib/health-numbers/meals.ts` (new, pure),
  `lib/health-numbers/engine.ts` (`labEntry` keeps the meal and time), `components/health-numbers/your-numbers.tsx`,
  `components/health-numbers/your-numbers.css`, `components/health/r3/meal-readings.tsx` (new),
  `components/health/r3/health-r3.tsx`, `components/health/health-app.tsx` (one lazy line in each meal section).
- Tests: `lib/health-numbers/av2-r3-meals.test.ts`, `lib/health-numbers/av2-r3-stored.test.ts`; existing health-numbers
  tests green. Spec: `tests/av2-meal-readings.spec.ts`; `tests/g1a-health-numbers.spec.ts` still reads (its status filter
  "Saved 2 values" is kept; nothing it asserts moved).
- Help (EN): **Can I see my glucose beside a meal?** Yes. When you add a value in Health → Measurements → Your numbers,
  choose "With a meal", for example "After lunch", and the time. The Diary then shows it under that meal, exactly as you
  typed it. ZIGoals shows the numbers only; it does not judge them or work anything out from them.
- What's new: "Your numbers: readings before or after a meal, shown beside that meal in the Diary."
- Search (static.ts): "glucose", "ketones", "readings by meal" → `/app/health?tab=measurements`.
- Showcase hook: see "Showcase" at the end (one marked reading).
- Device keys / catalogue / export / erase: nothing new.
- CSS: `components/health/r3/health-r3.css`, `components/health-numbers/your-numbers.css`.

## 5. Goals on a nutrient, a body measurement or your own number — LEDGER #287 built (part Carried: a ketone target, against the no-medical-advice rule; a BMI goal left out)

- What: Goals → Health goals → "Goals on a nutrient, a measurement or your own number" (a fold, its own chunk; open at
  once on a device that keeps some): at least or at most your own target, as an average over the last 7, 14 or 30 days —
  from the food log a day (protein, fibre, carbs, fat, sugars, sodium, calories eaten; the last full days, today counted
  once it ends; a day with a food whose value is unknown is left out), a body measurement (waist, hips, chest, arm, thigh,
  in cm, each day's latest), or one of your own numbers (by its name and unit). The line says the average, how many days
  or readings it rests on, the goal and "Met."; a bar shows the share. Close, Reopen, Remove with Undo. The empty state
  teaches. Nothing is suggested. Carried: targets on ketones, glucose, insulin and HbA1c are not offered (the ledger's
  carried part names ketones; glucose, insulin and HbA1c for the same reason), and a BMI goal is left out (Yazio's row:
  the number only). No calorie expenditure anywhere: "Calories eaten" is the food log's own sum.
- Files: `lib/health-goals/more.ts` (new: the record, pure progress; stored commit), `components/health-goals/more-goals.tsx`
  (new), `components/health-goals/health-goals-section.tsx` (the fold), `components/health-goals/health-goals.css`.
- Tests: `lib/health-goals/av2-r3-more.test.ts` (its export → erase → restore case is `skipIf(!registered)` and runs once
  the key is in `DEVICE_KEYS`); existing health-goals tests green. Spec: `tests/av2-more-health-goals.spec.ts`.
- Help (EN): **Can I set a goal on protein, fibre or my waist?** Yes. Under Goals → Health goals, open "Goals on a nutrient,
  a measurement or your own number": choose what, at least or at most, your target and 7, 14 or 30 days. The goal is an
  average of the days that have a value; days without one are left out, never counted as zero. A target on ketones,
  glucose or BMI is not offered, because setting one is medical advice.
- What's new: "Health goals: protein, fibre, your waist or your own numbers, as an average over 7, 14 or 30 days."
- Search (static.ts): "protein goal", "fibre goal", "waist goal" → `/app/goals#goals-health`.
- Registries for the NEW key `zigoals:health-goals-more:v1` (the lead): `lib/av-device-keys.ts` (a device key, personal
  and health-describing), `lib/export/everything.ts` `DEVICE_KEYS` (e.g. `healthGoalsMore`), restore plan (replace),
  `lib/erase-everything.ts`, `lib/data-health/catalog.ts` (Health, device-only), the frozen-reader fixture if it lists
  device keys. AK tool sources: `healthGoalsMore: one(MORE_GOALS)` behind the Health gate (for the answers, below).
- Showcase hook: see "Showcase" at the end (one protein goal).
- CSS: `components/health-goals/health-goals.css`.

## 6. Find a ready-made routine by length, muscle group, level and place — LEDGER #288 built

- What: Health → Workouts → Start a workout → Ready-made routines gains "Find a routine" (in the library's chunk): How
  long (Any length, Up to 30, 45 or 60 min), Main muscle group (the groups with a quarter of a routine's sets or more),
  Level (A good start, For steady training), and Place (one of your places: every exercise of the routine can be done with
  what it has; disabled, with a line on how to add one, while there is none). "n of 12 routines" is said as a status;
  "Clear the filters"; with nothing left, a line says what to try. Each routine card now names its main muscle groups.
  English and Dutch with the library's own language switch. Choices last while the page is open; nothing is stored (the
  ledger allowed a device preference; it is not needed).
- Files: `lib/workouts/library-filter.ts` (new, pure), `components/health/workouts/library-filters.tsx` (new),
  `components/health/workouts/routine-library-view.tsx`, `components/health/r3/health-r3.css`.
- Tests: `lib/workouts/av2-r3-library-filter.test.ts`; existing workouts tests green. Spec: `tests/av2-library-filters.spec.ts`;
  `tests/av2-routine-library.spec.ts` still reads (no new button shares its names).
- Help (EN): **Can I find a workout by length or muscle?** Yes. In Health → Workouts, open Ready-made routines and use
  "Find a routine": how long, the main muscle group, the level and one of your places. Only routines whose every exercise
  can be done with that place's equipment are shown.
- What's new: "Workouts: find a ready-made routine by length, muscle group, level and place."
- Search (static.ts): "find a workout", "workout by muscle" → `/app/health?view=workouts`.
- Showcase hook: none needed. Device keys / catalogue / export / erase: nothing new.
- CSS: `components/health/r3/health-r3.css`.

## 7. Timed circuit workouts — LEDGER #289 built

- What: Health → Workouts → Start a workout → "Timed circuits: work, rest and rounds" (a fold, its own chunk): the empty
  state teaches ("40 seconds on and 20 off, three rounds, is a good start"); "+ New circuit": a name, moves in order from
  the exercise library (all but distance cardio; up to 12; move earlier, later, take out), work seconds, rest after a
  move, rounds and rest between rounds, with the total time. Saved circuits list with Play, Edit, Remove (with Undo).
  The player takes focus on its heading and shows the round and move, the move's name, a big countdown (`role="timer"`,
  `aria-live="off"`: not read every second), "Next: …" and a progress bar; each change is said once in a polite status
  ("Squat, 40 seconds, round 1 of 3. Next: Push-up.") and rings the meditation chime (Bell, a pressed toggle, turns it
  off). Pause / Resume, Skip this part, Stop and log what I did, Stop without logging. At the end "Log as a workout" adds a
  finished workout (one timed set per round reached for each move; its real minutes) and writes the minutes to Health's
  activity as a finished workout does, named "Timed circuit: …" (so no activity type, and no energy estimate, matches
  it). Never calories. With Motion Off or reduced motion the bar does not glide (`data-motion`); nothing else moves.
  Focus returns to the circuit's Play button on Close.
- Files: `lib/workouts/circuits.ts` (new: the record, the timeline, the workout; stored commit),
  `components/health/workouts/circuits.tsx` (new), `components/health/workouts/workouts-view.tsx` (one lazy line, the
  fold), `components/health/r3/health-r3.css`.
- Tests: `lib/workouts/av2-r3-circuits.test.ts` (its export → erase → restore case is `skipIf(!registered)`); existing
  workouts tests green. Spec: `tests/av2-circuits.spec.ts` (drives the page clock).
- Help (EN): **Can I do a timed circuit?** Yes. In Health → Workouts, open "Timed circuits": choose a few moves, how many
  seconds of work and rest, and how many rounds. Play counts down each part, names the next move and rings a soft chime;
  at the end, log it as a workout with its minutes. ZIGoals never counts calories for it.
- What's new: "Workouts: timed circuits — work, rest and rounds with a countdown and a chime, logged with their minutes."
- Search (static.ts): "circuit", "interval workout", "HIIT" → `/app/health?view=workouts`.
- Registries for the NEW key `zigoals:workout-circuits:v1` (the lead): `lib/av-device-keys.ts`, `lib/export/everything.ts`
  `DEVICE_KEYS` (e.g. `workoutCircuits`), restore plan (replace), `lib/erase-everything.ts`, `lib/data-health/catalog.ts`
  (Health → Workouts, device-only), the frozen-reader fixture if it lists device keys. AK tool sources:
  `workoutCircuits: one(CIRCUITS)` (for the answers, below).
- Showcase hook: see "Showcase" at the end (one circuit).
- CSS: `components/health/r3/health-r3.css`.

## Answers (NOVA and ZIGi, on the device)

- File: `lib/ai/local-answers/av2-r3-health.ts` exporting `av2R3HealthAnswer(question, env)`; cases
  `lib/ai/evals/as/cases-av2-r3-health.ts` (`AV2_R3_HEALTH`, 9 intents, 18 English and 18 Dutch questions); test
  `lib/ai/local-answers/av2-r3-health.test.ts` (every phrasing answered on the Showcase, wired and fresh; Health closed →
  the Health refusal; an action in the question → left alone; the figures from the features' own functions).
- Questions: calories and sugar from drinks today (only as typed); the water reminders and today's pace; today's water
  tip; the weigh-in reminder (never a weight); which habits are done more or less often; readings marked with a meal today
  (the numbers only, no verdict); a goal on protein, fibre, waist…; the saved circuits; routines that fit in N minutes.
- engine.ts wiring (one line, after `av2BodymindR2Answer`, same shape):
  `if (!subject) { const own = av2R3HealthAnswer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2R3HealthAnswer} from './av2-r3-health';`.
- Corpus: add `AV2_R3_HEALTH` to `CORPUS` in `cases.ts` and record `expected.json`.
- AK tool sources (`lib/ai/tools/ak-sources.ts` and `AkToolSources`): `healthExtras: one(HEALTH_EXTRAS)`,
  `notifyPrefs: one(NOTIFY_PREFS)`, `healthGoalsMore: one(MORE_GOALS)`, `workoutCircuits: one(CIRCUITS)` — the Health ones
  read only behind the Health gate (each answer calls `closed(env, 'health')` first). Until they are wired, those answers
  say "I can't read … here yet" (still an answer). Your numbers come from NOVA's sources (`nova.healthNumbers`), habits from
  the habits env.

## Showcase

- One line in `lib/showcase-data.ts`, after the Health records are written (e.g. after line 278's health numbers):
  `withR3HealthShowcase(records, day);` with `import {withR3HealthShowcase} from './r3-health-showcase';`.
- It writes two own drinks "Oat latte (Showcase)" and "Juice (Showcase)" into the health extras (no entry logged with
  them, so no water, caffeine or food total moves), the goal "Protein at least 90 g (Showcase)"
  (`zigoals:health-goals-more:v1`) and the circuit "Thirteen-minute legs (Showcase)" (`zigoals:workout-circuits:v1`). No
  pinned count reads them. Test: `lib/r3-health-showcase.test.ts`. The Showcase plans no notification, so the reminders
  (water, weigh-in, habit words) have no Showcase example; the habit trend shows on the Showcase's own history.
