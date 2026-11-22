# Lane 2 round 4 — health (Pillow, Runna, Noom): builder registry

Branch `lane2/r4-health`, from `lane2/batch3` at `f6cc7798`. Rows: LEDGER "Round 4: rows #300–#347", groups U6 (Pillow,
#332–#335) and U7 (Runna and Noom, #328–#331, #336, #337). One section per feature. Every stored change is listed under
"Stored changes" for the lead's TIER 3 (stored formats) label; this branch changes no notification plan (no TIER 3 PWA).

Health's rules kept throughout: every Health part sits inside the Health route (its gate and consent); no calorie
expenditure is estimated anywhere new; no medical claim, range or verdict; Compare's rules are unchanged (90 days, 14 days
a side, never a cause). Every new Health UI loads lazily from `components/health/r4/` (the `health-r4.tsx` entry on the
Health page and the Sleep view; `planned-workouts.tsx`, `runna-parts.tsx` and `noom-parts.tsx` by one `lazy()` line each
in chunks that were lazy already); the first chunk of /app/health carries only the entry's line and small props.

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:health-extras:v1` (existing, device-only, loose) | optional `sleepTips` (boolean) and `returnNote` `{text (1–400), closedFor? (a date)}`, each `.optional().catch(undefined)` (a bad `closedFor` is dropped alone). | Kept untouched; older builds show no sleep tip and no note. |
| `zigoals:health-goals-more:v1` (round 3's, device-only, loose) | optional top-level `weightBand` `{lowGrams, highGrams (20–500 kg, at least 0.5 kg apart), createdAt}`, `.optional().catch(undefined)`. A top-level part, not a new goal kind ("between", as the ledger wrote): a round 3 reader drops a goal it cannot read but keeps an unknown top-level part as written. | A round 3 build keeps the band untouched; older builds never read the key. |
| `zigoals:calorie-week:v1` (existing, device-only, loose) | optional `freeDay` `{date, extraKcal 50–2000, plannedOn}`, `.optional().catch(undefined)`. | Kept untouched; an older build shows the week without the free day (its own target, as before). |
| `zigoals:planned-workouts:v1` (NEW, device-only, loose, versioned) | `{version: 1, items[≤ 300]: {id, date, time?, kind: routine, circuit, run or other, refId?, name (1–80), distanceKm?, effort? (easy, steady or fast), minutes? (5–600), createdAt}, away? {from, to}}`; an unreadable item is dropped, the others kept. | New key; older builds never read it. |
| `zigoals:races:v1` (NEW, device-only, loose, versioned) | `{version: 1, races[≤ 50]: {id, name (1–60), date, distanceKm 0.1–500, goalSeconds?, priority: main or b, createdAt}}`; an unreadable race is dropped. A race may also make an ordinary countdown (`zigoals:countdowns:v1`, unchanged). | New key; older builds never read it. |
| `zigoals:workout-hr:v1` (NEW, device-only, loose, versioned) | `{version: 1, maxHr? (100–230, typed), runs: {workoutId: {from (bpm), seconds[] (seconds at each whole bpm)}} (≤ 2000)}`; an unreadable run is dropped. Its own key because the splits record (`zigoals:workout-splits:v1`) is strict: the ledger's "additive on the loose splits record" would make an older build refuse every run's splits. | New key; older builds never read it. The import summary gains `hrSeconds` in memory only. |

## Summary: rows and verdicts

| LEDGER row | verdict | feature |
|---|---|---|
| #332 Pillow: sleep beside caffeine and steps | built (derived; never a cause) | 1 |
| #333 Pillow: your sleep timing on free days | built (an estimate, its measure and source named) | 2 |
| #334 Pillow: a sleep tip a day | built (opt-in; practical habits, no health claims) | 2 |
| #335 Pillow: a nap timer | built; part Carried: ringing with the screen locked or the app closed (native-only) | 2 |
| #330 Runna: plan, move and realign workouts | built (also corrects Strong's "Workout scheduling"); Runna's own programme realignment stays with #113 (Carried: needs content) | 3 |
| #331 Noom: keep your weight in a band | built (a band on the trend; no Harris-Benedict zone) | 4 |
| #328 Noom: a planned free day | built (never below the coach's floor; no coins) | 4 |
| #329 Noom: a note for a harder week | built (never a count of days); texts and emails left out (a server service) | 4 |
| #336 Runna: heart-rate zones | built (the maximum typed, never from age; the split and its source named; an estimate); stored in a new key, not the strict splits record | 5 |
| #337 Runna: races ahead in one view | built (facts only, no prediction) | 5 |

Specs for the shard lists (none run here): `tests/av2-compare-sleep.spec.ts`, `tests/av2-sleep-r4.spec.ts`,
`tests/av2-planned-workouts.spec.ts`, `tests/av2-noom-r4.spec.ts`, `tests/av2-runna-r4.spec.ts`.

QUALITY Minors: none of the open q1–q4 Minors are in this task's rows (U6, U7); none were taken up.

## Shared to-do for the lead (all features)

- engine.ts wiring: see "Answers" at the end.
- Search (static.ts), Help and What's new: see each feature.
- CSS files touched (for the theme sheets): `components/health/r4/health-r4.css` (new); it reuses `components/health/r3/health-r3.css`.
- Today: nothing new is always visible on Today. A race's countdown (only when the person ticks "Also make a countdown")
  is an ordinary countdown card.
- Route weights: /app/health's first chunk gains one `lazy()` line for `r4/health-r4` (health-app.tsx), two short part
  elements (the food-day line, the note's fold) and one lazy line on the Sleep card; everything else loads in the Sleep,
  Workouts, Insights, Targets and Goals chunks that were lazy already. /app/agenda's chunk gains `lib/workouts/planned.ts`
  (a small zod record read by `use-agenda.ts`). Please measure /app/health and /app/agenda.
- New device keys (three): spread `lib/av2-r4-health-keys.ts` into the registries as `lib/av2-food-keys.ts` is
  (`AV2_R4_HEALTH_PERSONAL_KEYS` into the welcome check, `AV2_R4_HEALTH_EXPORT_KEYS` into `DEVICE_KEYS`,
  `AV2_R4_HEALTH_CATALOG_LABELS` into the catalogue (Health, device-only), `AV2_R4_HEALTH_RESTORE` into the restore plan
  (replace), `AV2_R4_HEALTH_ERASE_KEYS` into the erase), and the frozen-reader fixture if it lists device keys. The three
  export → erase → restore tests (`lib/workouts/av2-r4-planned.test.ts`, `lib/workouts/av2-r4-runna.test.ts`) are
  `skipIf(!registered)` and run once the keys are in `DEVICE_KEYS`.
- AK tool sources (`lib/ai/tools/ak-sources.ts`, `AkToolSources`): `plannedWorkouts: one(PLANNED_WORKOUTS)`,
  `races: one(RACES)`, `workoutHr: one(WORKOUT_HR)`, `calorieWeek: one(CALORIE_WEEK)` (each answer checks the Health gate
  first). `lib/ai/tools/f9-tools.ts` already reads `env.ak.plannedWorkouts` for the agenda answers (behind the Health gate,
  as before); until the source is wired it reads none, as before.

## 1. Sleep beside caffeine and steps in Compare — LEDGER #332 built

- What: Health → Insights → Compare gains three factors (group "Days"), offered only when the records hold them:
  "Caffeine above an amount" (that day's caffeine as typed for drinks, above N mg; a coffee, tea or soft drink without an
  amount makes the day unknown unless the known part is already above), "Caffeine after a time" (a drink with caffeine
  logged at or after 10:00…20:00, 14:00 by default; a drink logged later for an earlier day has no known hour), and
  "Steps above an amount" (a past day with activity logged). Each amount starts at the person's usual day (the middle day
  of the 90, rounded) and is this visit's choice only: nothing new is stored. Steps above an amount is never set beside
  steps itself. The outcome "Time asleep" is the night after the day, as before. Each has its own "something else could
  explain it" line. The words use no causal word (the existing FORBIDDEN_INSIGHT_WORDS test).
- Files: `lib/compare/engine.ts` (`FactorKind` +3, `CompareSources.drinks`, `dayFactorBasis`, the factor tests),
  `components/insights/compare/compare-explorer.tsx` (reads the health extras' drinks; the amount and hour fields).
- Tests: `lib/compare/av2-r4-sleep-factors.test.ts`; existing compare and experiments tests green. Spec:
  `tests/av2-compare-sleep.spec.ts`.
- Stored: nothing (the pair record keeps the chosen factor id as before).
- Help (EN): **Can I see my sleep beside caffeine or steps?** Yes. In Health → Insights → Compare, choose "Caffeine above an
  amount", "Caffeine after a time" or "Steps above an amount", and "Time asleep". Compare sets the nights after those days
  beside the other nights, once each side has 14 days. It shows what happened together, never a cause. Caffeine counts as
  you typed it for a drink; a day with no drink logged is left out.
- What's new: "Compare: your nights beside caffeine, late coffee and steps."
- Search (static.ts): "caffeine and sleep", "steps and sleep" → `/app/health?view=insights`.
- Showcase hook: none needed. Device keys / catalogue / export / erase: nothing new. CSS: none.

## 2. Sleep: your timing on free days, a sleep tip a day, a nap timer — LEDGER #333 built, #334 built, #335 built (part Carried: native-only)

- What:
  - Health → Sleep → "Your timing" (after "Your usual", its own chunk): the middle of sleep on weekend nights (the nights
    before Saturday and Sunday) beside weekday nights over the last 30 days ("On weekends you sleep about 1 h 20 min later
    than on weekdays."), and "From your weekend nights you look like an earlier sleeper / in the middle / a later sleeper",
    tagged "an estimate from your own nights". "How this is worked out" names the measure and its source (the middle of
    sleep on free days, the Munich ChronoType Questionnaire's measure; Roenneberg, Wirz-Justice and Merrow, 2003), the word's
    edges (before 3:00 earlier, after 5:00 later) and "not a type to change, not medical advice". The empty state says it
    needs 4 weekend and 4 weekday nights. Naps are left out.
  - The Health page's Sleep card: "Show a sleep tip each day" (a pressed button, off by default) shows one practical tip a
    day from 28 written in English and Dutch ("Charge your phone outside the bedroom tonight…", "the same wake time on
    Saturday…"), with Another tip and In het Nederlands. A unit test bans health claims, pills, supplements and the like.
  - Health → Sleep → Log a night or a nap → "Start a nap": A short nap 20 min, A rest 30 min, A long nap 90 min. The heading
    takes focus; a countdown (`role="timer"`, not read every second) and a progress bar (no glide with Motion Off or reduced
    motion); the screen stays on where the browser allows a wake lock (said either way). At the end a soft singing-bowl
    bell rings ("Bell at the end", a pressed toggle) and the nap is logged as a normal nap record from its start to its end,
    with Undo; "I'm up: log the nap" logs it until now; "Stop without logging". Under ten minutes logs nothing. Carried:
    ringing with the screen locked or the app closed (native-only); the card says so.
- Files: `lib/sleep/timing.ts`, `lib/sleep-tips.ts`, `lib/sleep/nap.ts` (new, pure); `lib/health-extras.ts` (stored
  commit); `components/health/r4/health-r4.tsx`, `components/health/r4/sleep-parts.tsx`, `components/health/r4/health-r4.css`
  (new); `components/health/sleep/sleep-view.tsx`, `components/health/sleep/sleep-card.tsx` (one lazy line each).
- Tests: `lib/sleep/av2-r4-sleep.test.ts`, `lib/av2-r4-health-stored.test.ts`; existing sleep tests green. Spec:
  `tests/av2-sleep-r4.spec.ts` (drives the page clock).
- Stored: `sleepTips` on the health extras (see the table).
- Help (EN): **What is "Your timing"?** Health → Sleep sets the middle of your sleep on weekend nights beside weekday nights,
  over the last 30 days, and says whether you look like an earlier or a later sleeper. It is an estimate from your own
  nights, not a type to change. **Can I get a sleep tip?** Yes. On the Sleep card in Health, choose "Show a sleep tip each
  day": one small, practical idea a day, in English or Dutch. **Is there a nap timer?** Yes. In Health → Sleep, "Start a
  nap" counts down 20, 30 or 90 minutes, rings a soft bell at the end and logs the nap. Keep the page open: with the screen
  locked or the app closed it cannot ring.
- What's new: "Sleep: your timing on weekends and weekdays, a tip a day, and a nap timer that logs the nap."
- Search (static.ts): "sleep timing", "chronotype", "sleep tip", "nap timer", "power nap" → `/app/health?view=sleep`.
- Showcase hook: none needed (the Showcase keeps 30 nights, weekends among them, so "Your timing" can show there; no pinned count reads it).
- Device keys / catalogue / export / erase: nothing new (the health extras are registered). CSS: `components/health/r4/health-r4.css`.

## 3. Plan, move and realign workouts — LEDGER #330 built

- What: Health → Workouts → Start a workout → "Your plan: planned workouts on a calendar" (a fold, its own chunk; it opens
  by itself when the address is `#workouts-plan`, the Agenda's link). "Plan a workout": one of your routines, one of your
  circuits, a run (a distance and Easy, Steady or Fast; named "Easy 5 km run") or something else by name; a day, an
  optional time and about how long. Four weeks from this Monday, Monday first (one row per day on a phone); each planned
  workout is a button that can be dragged to another day (the day under it is marked) or opened to "Move to" a date or
  "Remove from the plan" (with Undo), for keyboard and touch. A planned workout is done once a workout is logged that day
  (one each, in time order), missed once its day passed without one. When this week has missed ones a note names them
  ("Easy 5 km run on Mon, Nov 16 was not done.") with "I missed some: move them on": they move on in order from today, one
  a day, and a later planned workout moves on a day only when one reaches it; Undo puts the plan back. "Away until …" sets
  the planned workouts in that range aside (shown as set aside, skipped by the realign, never missed); "I'm back" ends it.
  The Agenda and the Day Timeline now draw the person's planned workouts (still to do or missed; never one set aside or
  done) outside the Showcase too; ZIGi's agenda answers read them once the AK source is wired. The empty state teaches.
  The drag is on the plan's own four-week calendar (the existing month Calendar of finished workouts stays as it was).
- Files: `lib/workouts/planned.ts` (new: the record and its pure functions; stored commit),
  `components/health/r4/planned-workouts.tsx` (new), `components/health/workouts/workouts-view.tsx` (the fold),
  `components/agenda/agenda-extras.ts`, `components/agenda/use-agenda.ts`, `lib/timeline/workout-source.ts`,
  `lib/ai/tools/f9-tools.ts`.
- Tests: `lib/workouts/av2-r4-planned.test.ts` (plan, move, states, realign with away days, the Agenda's and the timeline's
  items, unreadable items, export → erase → restore); `lib/timeline` and `lib/agenda` tests unchanged and green. Spec:
  `tests/av2-planned-workouts.spec.ts` (includes a drag).
- Help (EN): **Can I plan workouts on days?** Yes. In Health → Workouts, open "Your plan" and plan a routine, a circuit, a run
  or anything of your own on a day and time. Drag it to another day, or open it to move it. Planned workouts show on the
  Agenda and the Day Timeline. **What does "I missed some" do?** When a planned workout's day passed without a workout, it
  moves this week's missed ones on in order from today, and moves later ones only where they would meet. Undo puts your
  plan back. "Away until …" sets the days you are away aside.
- What's new: "Workouts: plan your week, drag a workout to another day, and move missed ones on in one tap."
- Search (static.ts): "plan workouts", "training plan", "missed workout", "workout calendar" →
  `/app/health?view=workouts#workouts-plan`.
- Showcase hook: see "Showcase" at the end. CSS: `components/health/r4/health-r4.css`.

## 4. Noom's week: a weight band, a planned free day, a note for a harder week — LEDGER #331 built, #328 built, #329 built

- What:
  - Goals → Health goals → "Goals on a nutrient, a measurement or your own number" → "Keep my weight between …": From and To
    in the person's weight unit (kg or lb), "Keep this band", "Remove the band" with Undo; the line says "In the last 30
    days the trend was inside your band on 22 of 30 days." Health → Weight → Weight trend shades the band on the chart
    (named in its key and in the chart's spoken summary) and repeats the line. Nothing is suggested; no calorie zone.
  - Health → Targets → Weekly calorie budget → "A planned free day": a day from today on and the extra (50–2,000 kcal); the
    week's other days from the day it is planned on give evenly, never below the coach's floor (a day with less room gives
    what it has and the rest is spread; too much is refused, saying what they can give). The week's rows show "(+600 free
    day)" and "(−150 for the free day)"; the weekly total stays the same; the food day says "A planned free day: 600 kcal
    more today, taken evenly from this week's other days." on that day only; gone the week after; Cancel with Undo. No coins.
  - Health → Diary → "A note for a harder week (optional)": a few lines (up to 400, with a count). When the person comes back
    after three or more days without a food log, the food day shows "Your note for a harder week" with the words and
    "Thanks, close it" (focus goes to the summary's button); it shows again only after the next such return, and never
    once food is logged that day. It never says how many days were missed. Texts and emails (Noom's way) are left out: a
    server service.
- Files: `lib/health-goals/band.ts`, `lib/food-log/return-note.ts` (new, pure); `lib/health-goals/more.ts`,
  `lib/health-aa/calorie-week.ts` (`freeDayShares`, `planFreeDay`, `clearFreeDay`, the budget's rows), `lib/health-extras.ts`
  (stored commit); `components/health/r4/noom-parts.tsx` (new); `components/health/weight-trend.tsx` (the band),
  `components/health/calorie-week-card.tsx` (one lazy line, the rows' words), `components/health-goals/more-goals.tsx` (one
  lazy line), `components/health/health-app.tsx` (the lazy entry line, the food-day part and the note's fold).
- Tests: `lib/health-aa/av2-r4-noom.test.ts`, `lib/av2-r4-health-stored.test.ts`; existing calorie-week, health-aa and
  health-goals tests green. Spec: `tests/av2-noom-r4.spec.ts`.
- Help (EN): **Can I keep my weight in a range instead of a target?** Yes. Under Goals → Health goals, open "Goals on a
  nutrient, a measurement or your own number" and set "Keep my weight between …". The weight trend shades your band and
  counts the days inside it. **Can I plan a day with more calories?** Yes. In Health → Targets → Weekly calorie budget, plan
  a free day with the extra you choose; the week's other days each give a little, never below the floor, and the weekly
  total stays the same. **What is "A note for a harder week"?** A few lines you write to yourself in the Diary. When you
  come back after a few days without logging food, they show on your food day, once.
- What's new: "Weight and food: keep your weight in a band, plan a free day in your week, and a note to yourself for a harder week."
- Search (static.ts): "weight band", "maintenance" → `/app/goals#goals-health`; "free day", "treat day" →
  `/app/health?view=targets`; "harder week", "note to myself" → `/app/health`.
- Showcase hook: none (a band or a free day would move the Showcase's weight and calorie cards, which other specs read).
- CSS: `components/health/r4/health-r4.css`; the trend's band is drawn with `currentColor` at 12 %.

## 5. Runna: heart-rate zones and races ahead — LEDGER #336 built, #337 built

- What:
  - A GPX or TCX import now also counts the seconds at each heart rate from the file's own points (each point to the next,
    a pause counted at most 30 s) and keeps them with the run in `zigoals:workout-hr:v1` (never the route; older imports keep
    their average only). Under such a run in Health → Workouts → Your workouts: "Heart-rate zones for …": until a maximum
    is typed, a line asks for it ("from a test or your watch, never guessed from age"); with it, a bar (named for screen
    readers with each zone's minutes) and "Zone 2 (114–132 bpm): 24 min" for each zone and below zone 1. The text names the
    formula and its source: 50–60, 60–70, 70–80, 80–90 and 90–100 % of the maximum you typed, the five-zone split of Sally
    Edwards' Heart Zones Training (The Heart Rate Monitor Book, 1993), "an estimate, not medical advice", and "ZIGoals never
    works the maximum out from your age". Changing the maximum re-counts every run. Deleting a run removes its zones (Undo
    brings them back).
  - Health → Workouts → "Races ahead" (a fold): "+ Add a race": a name, the day, 5 km / 10 km / Half marathon / Marathon or
    another distance, an optional goal time ("1:55:00"), Main race or B race, and "Also make a countdown for it". The list
    gives each race's mark, distance and day and "In 3 weeks · 4 weeks after the race before."; after race day the
    finished run that day within 5 % of the distance shows as "Result: 25:00 for 5 km, 1:00 under your goal."; Edit and
    Remove (with Undo). Facts only: no prediction, no pace advice.
- Files: `lib/workouts/hr-zones.ts`, `lib/workouts/races.ts` (new: records and pure functions; stored commit),
  `lib/workouts/import-file.ts` (`hrSeconds` on the summary), `components/health/r4/runna-parts.tsx` (new),
  `components/health/workouts/workouts-view.tsx` (the record's write at import and delete, the zones under a run, the
  races section).
- Tests: `lib/workouts/av2-r4-runna.test.ts`; `lib/workouts/import-file.test.ts` unchanged and green. Spec:
  `tests/av2-runna-r4.spec.ts`.
- Help (EN): **Can I see heart-rate zones?** Yes, for runs imported from a GPX or TCX file with heart rate. Open the run in
  Health → Workouts and type your maximum heart rate (from a test or your watch). The zones are 50 to 100 % of that maximum
  in steps of 10, the five-zone split of Sally Edwards' Heart Zones Training. It is an estimate, not medical advice, and
  ZIGoals never works your maximum out from your age. **Can I keep my races?** Yes. In Health → Workouts → Races ahead, add
  a race with its day, distance and goal time, as a main race or a B race. You see the weeks between your races, and after
  race day the run that matches shows as the result beside your goal.
- What's new: "Runs: heart-rate zones from your own maximum, and your races ahead with their results."
- Search (static.ts): "heart rate zones", "zone 2", "races", "race calendar", "B race" → `/app/health?view=workouts`.
- Showcase hook: see "Showcase" (one race). The Showcase's runs have no heart-rate points, so no zones show there.
- CSS: `components/health/r4/health-r4.css`.

## Answers (NOVA and ZIGi, on the device)

- File: `lib/ai/local-answers/av2-r4-health.ts` exporting `av2R4HealthAnswer(question, env)`; cases
  `lib/ai/evals/as/cases-av2-r4-health.ts` (`AV2_R4_HEALTH`, 10 intents, 18 English and 18 Dutch questions); test
  `lib/ai/local-answers/av2-r4-health.test.ts` with its fixture `lib/ai/local-answers/av2-r4-health-fixture.ts` (test-only):
  every phrasing answered on the Showcase, wired and fresh; Health closed → the Health refusal; an action in the question →
  left alone; the figures from the features' own functions.
- Questions: caffeine (or late coffee) and sleep, steps and sleep (Compare's own result, never a cause); your sleep timing
  (an estimate); today's sleep tip; planned workouts this week and next, and the missed ones; the weight band and its days
  inside; the free day; the last run's heart-rate zones (from the typed maximum, never from age); races coming up and the
  last result.
- engine.ts wiring (one line, after `av2R3HealthAnswer`, same shape):
  `if (!subject) { const own = av2R4HealthAnswer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2R4HealthAnswer} from './av2-r4-health';`.
- Corpus: add `AV2_R4_HEALTH` to `CORPUS` in `cases.ts` and record `expected.json`.
- AK tool sources: see the shared to-do (`plannedWorkouts`, `races`, `workoutHr`, `calorieWeek`; `healthExtras` and
  `healthGoalsMore` are wired already). Until then those answers say "I can't read … here yet" (still an answer).

## Showcase

- One line in `lib/showcase-data.ts`, after `withR3HealthShowcase(records,day);`: `withR4HealthShowcase(records, day);` with
  `import {withR4HealthShowcase} from './r4-health-showcase';`.
- It writes two planned workouts, "Upper body session (Showcase)" and "Easy 5 km run (Showcase)", on the same days and
  times as the Agenda's own Showcase examples (`lib/agenda/showcase.ts`; the Showcase's Agenda and Day Timeline keep
  drawing those, so no Agenda count moves), and one race, "City 10K (Showcase)", 24 days ahead. Test:
  `lib/r4-health-showcase.test.ts`. No pinned count reads these keys.

## Commits

See the report; each feature is one commit, and the stored formats are in their own TIER 3 commit.
