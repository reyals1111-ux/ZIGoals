# Lane 2 — body (sleep, workouts and body): builder registry

Branch `lane2/body`, from `feature/session-av-2` at `fbeb3e54`. One section per commit. Every stored change is listed
under "Stored changes" for the lead's TIER 3 (stored formats) label.

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:workouts:v1` (existing, device-only, loose) | routine (`templates[]`): `folder?` (1–40 chars), `note?` (≤ 500), `guideId?` (the library routine it came from), `progression?` `{kind: 'double' \| 'linear', minReps?, maxReps?, stepKg}`; log: `pinnedNotes?` (exercise id → note, ≤ 300), `distanceGoals?` (≤ 12 `{id, sport: run\|ride\|swim\|walk\|any, period: week\|month\|year, km, createdAt}`). Each `.optional().catch(undefined)` on loose objects. | Loose objects keep the keys untouched; nothing they read changed. |
| `zigoals:evening-plan:v1` (NEW, device-only, loose, versioned) | `{version: 1, plan?: {bedtime, windDown, hindrances[], steps[1–8]: {id, label, minutesBefore, habitId?}, updatedAt}, days: {evening date → ticked step ids} (≤ 120)}` | New key; older builds never read it. |

Registries the lead needs for `zigoals:evening-plan:v1` (personal, Health): device-key list (`lib/av-device-keys.ts`),
data catalogue (`lib/data-health/catalog.ts`, area Health, "Evening plan"), Export everything `DEVICE_KEYS`
(`eveningPlan`), the restore plan (`lib/restore/plan.ts` `dev('eveningPlan', 'Evening plan', 'Health', EVENING_PLAN)`), and
erase (`lib/erase-everything.ts`). Once `DEVICE_KEYS` holds it, the skipped round trip in
`lib/workouts/av2-stored.test.ts` runs (it is `skipIf(!registered)`, nothing else changes). The workout log's new fields
ride on the existing key, so export, restore and erase need nothing new; the round trip is tested.

Commit: `TIER 3 (stored formats): …` — files `apps/web/lib/workouts/schema.ts`, `apps/web/lib/evening-plan/schema.ts`,
test `apps/web/lib/workouts/av2-stored.test.ts`.

Second stored commit (N8, N9; `TIER 3 (stored formats): …` again):

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:workouts:v1` | set: `addedKg?`, `assistKg?` (0–500 kg); exercise entry, routine exercise and own exercise: `load?: 'weighted' \| 'assisted'` (the measure stays `reps`: a new `MEASURES` value would make older builds refuse the log); workout: `shoeId?`; log: `exerciseUnits?` (exercise id → `kg`/`lb`, ≤ 300; sets stay in kg), `shoes?` (≤ 30 `{id, name, startKm, retireKm, createdAt, retiredAt?}`), `seenBests?` (≤ 100 `"<workout id>:<km>"`). All `.optional().catch(undefined)` on loose objects. | Kept untouched by loose objects; older builds show an assisted or weighted set as plain reps. |
| `zigoals:body-extras:v1` (NEW, device-only, loose, versioned) | `{version: 1, heightCm? (50–272), milestones?: {step: '2kg' \| '10pct', startGrams, goalGrams, startedOn, reached: [{index, on, quiet?, shownAt?}] (≤ 100)}}` | New key. |

Registries for `zigoals:body-extras:v1` (personal, Health, "Height and weight milestones"): the same five as the evening
plan (device keys, catalogue, `DEVICE_KEYS.bodyExtras`, restore `dev('bodyExtras', 'Height and weight milestones', 'Health', BODY_EXTRAS)`,
erase); its skipped round trip in `av2-stored.test.ts` then runs. Hide figures: the BMI and the milestone figures carry
`data-body-figure` (they hide with "Hide calorie and weight figures").

## Shared to-do for the lead (all features)

- engine.ts wiring (one line, beside `avAnswer`, same shape):
  `if (!subject) { const found = av2BodyAnswer(question, env), own = found && 'text' in found ? {...found, text: groupUnits(found.text)} : found; if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2BodyAnswer} from './av2-body';`. Put it after `avAnswer` (av-life's `exerciseBest`, `running` and
  `sleepLong` keep their questions; av2 never claims a question those answer).
- Corpus: add `AV2_BODY` (`lib/ai/evals/as/cases-av2-body.ts`) to `CORPUS` in `cases.ts` and record `expected.json`.
- `lib/ai/tools/ak-sources.ts` / `ak-tools.ts`: add `eveningPlan: one(EVENING_PLAN)` (from `lib/evening-plan/schema.ts`) to
  the AK tool sources, so the evening-plan answers read it (they say "not set up" until then).
- CSS files touched (for the theme sheets): `components/health/workouts/av2-body.css` (new),
  `components/health/sleep/av2-sleep.css` (new), see each feature.
- Nothing is added to Today (no new Tab stop, nothing always visible there).

## 1. Exercise library with written how-tos, and pinned notes — LEDGER #116 built, #119 built in part (pinned note; the routine note is in feature 2)

- What: Health → Workouts → "Exercises and how-tos" (a fold; its own chunk). Search by name or muscle group; every one of
  the 48 built-in exercises has its muscles (works most / also works), what it needs, three written steps and a form tip,
  in English and Dutch ("In het Nederlands", `lang` set), plus the person's numbers from their own log (heaviest,
  estimated one-rep max, most reps, longest, farthest, sessions) and a pinned note. While training, each exercise shows its
  pinned note, "Pin this note to …" turns the session note into the pinned one, and "How to do …" opens the how-to in
  place. An own exercise says it has no written steps and that its pinned note is its how-to. Videos: not needed (text).
- Files: `lib/workouts/howto.ts` (the written how-tos, EN+NL), `lib/workouts/notes.ts`, `components/health/workouts/exercise-library.tsx`,
  `components/health/workouts/av2-body.css`, `components/health/workouts/workouts-view.tsx` (the panel, the fold, the
  pinned line), `lib/workouts/showcase.ts` (Showcase: "Example · safety bars at hole 6" pinned to the squat).
- Tests: `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-exercise-library.spec.ts`.
- Stored: `pinnedNotes` (see Stored changes).
- Help (EN): **Where can I see how an exercise is done?** In Health → Workouts, open "Exercises and how-tos". Find an
  exercise by name or muscle group: it lists the muscles it works, what you need, three steps and a form tip, in English
  or Dutch, with your own best from your log. Pin a note to it (seat height, grip) and it shows every time you do that
  exercise; while you train, "How to do …" opens the steps under the exercise.
- What's new: "Workouts: written how-tos for every exercise, and notes you pin to an exercise."
- Answers: "how do I do a squat" / "hoe doe ik een squat", "what muscles does the deadlift work" / "welke spieren traint de
  deadlift", "what are my pinned notes" / "wat zijn mijn vastgezette notities", "which exercises work my glutes" / "welke
  oefeningen trainen mijn billen".
- Device keys / catalogue / export / erase: nothing new (inside `zigoals:workouts:v1`). Search (static.ts): "Exercise
  library", "how-to", "pinned note" → `/app/health?view=workouts`.

## 2. Ready-made routines (written guided workouts, EN+NL), routine folders, routine notes — LEDGER #112 built, #115 built, #119 built (with feature 1)

- What: Health → Workouts → Start a workout → "Ready-made routines" (a fold; its own chunk): twelve routines written in
  the repository (Full body A/B, Push/Pull/Leg day, Upper/Lower body, Body weight at home, Dumbbells only, Core in ten
  minutes, Strength for runners, Easy mobility), each with what it is for, its minutes and level, every exercise's sets ×
  reps or seconds, rest and one cue, and a suggested progression, in English or Dutch. "Save to my routines" copies it
  into the person's routines in its folder; "Start it now" saves and starts it. While training, each exercise of a library
  routine shows "Plan: 3 × 8 · rest 2:00 · cue" (in the language it was saved in) and its rest timer is the plan's.
  "Your routines" is grouped by folder; Edit sets a folder (new or one in use, the same name typed another way is the same
  folder) and a routine note, shown under the routine and at the top of a workout started from it. Not a multi-week
  programme (#113, #120 stay Carried: needs content made for ZIGoals).
- Files: `lib/workouts/routine-library.ts` (the written routines), `lib/workouts/routines.ts`, `lib/workouts/notes.ts`
  (`setRoutineNote`), `components/health/workouts/routine-library-view.tsx` (+ `RoutineEdit`),
  `components/health/workouts/workouts-view.tsx`, `components/health/workouts/workouts.css` (view-level lines),
  `components/health/workouts/av2-body.css`, `lib/workouts/showcase.ts` (Showcase: both routines in "Gym"; Push day's
  note "Example · 90 s rest between sets").
- Tests: `lib/workouts/av2-library.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-routine-library.spec.ts`.
- Stored: routine `folder`, `note`, `guideId`, `progression` (see Stored changes).
- Help (EN): **Are there ready-made workouts?** Yes. In Health → Workouts, open "Ready-made routines": twelve written
  routines, from full body to ten minutes of core, in English or Dutch, with sets, reps, rest and a cue for each exercise.
  "Save to my routines" makes it yours to change; "Start it now" starts it. **Can I sort routines into folders?** Yes:
  Edit a routine to put it in a folder (Gym, At home…) and give it a note that shows when you start it.
- What's new: "Workouts: twelve ready-made routines in English and Dutch, routine folders and routine notes."
- Answers: "what routines do I have" / "welke routines heb ik" (by folder, with notes), "which ready-made routines are
  there" / "welke kant-en-klare routines zijn er", "suggest a strength routine for at home" / "stel een routine voor thuis voor".
- Search (static.ts): "Ready-made routines", "routine folders", "guided workout" → `/app/health?view=workouts`.

## 3. A progression rule on a routine — LEDGER #109 built (part Carried: Live Activity, native-only)

- What: a routine's Edit has "Progression": None, a rep range ("double": when every working set reaches the top, add the
  step and start again at the bottom; otherwise one more rep on each set below the top) or "Add weight every session all
  sets are done" ("linear"; a missed set keeps the weight). The step is typed in the Health weight unit and kept in kg.
  Starting the routine fills each set with today's target from the last time that routine's exercise was done (else
  the exercise's last session), and the exercise says why ("Progression: 62.5 kg × 8 today. Every set reached its target
  on Nov 20, so the weight goes up."). Reps-only exercises add a rep, timed ones five seconds; a first session has no
  target. Ready-made routines come with a suggested rule. Nothing new is stored beyond the rule.
- Files: `lib/workouts/progression.ts`, `components/health/workouts/workouts-view.tsx` (start at targets; the line per
  exercise; the routine's rule line), `components/health/workouts/routine-library-view.tsx` (`RoutineEdit`),
  `components/health/workouts/av2-body.css`, `lib/workouts/showcase.ts` (Showcase: Push day keeps "6–10 reps, then +2.5 kg").
- Tests: `lib/workouts/av2-progression.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-progression.spec.ts`.
- Stored: routine `progression` (see Stored changes).
- Help (EN): **Can a routine tell me what to lift next time?** Yes. Edit a routine and choose a progression: a rep range
  (say 8 to 12: when every set reaches 12, the weight goes up by your step and you start again at 8) or a step every
  session. When you start the routine, each set is filled with today's target from your last sets, and the exercise says why.
- What's new: "Workouts: a progression rule on a routine fills in next time's weights and reps."
- Answers: "what is my next target for bench press" / "wat is mijn volgende doel voor bankdrukken".

## 4. Progress analytics: a month's report, sets per muscle across weeks, a line per metric, Wrapped's training card — LEDGER #117 built

- What: Health → Workouts → "Progress" (a fold; its own chunk): a month's report beside the month before (workouts, days
  trained, time, working sets, weight lifted, distance, new personal bests, the most trained muscle group and exercise),
  earlier months by the arrows; and working sets per muscle group over the last 8 weeks as a table, each cell shaded by
  its count (a focusable, named scroll region). Exercise history's line now shows the estimated one-rep max (as before,
  the default), the heaviest set or the volume, session by session. ZIGoals Wrapped gets a "Training" card (workouts,
  hours, days, the exercise done most, the busiest month and new bests as lines; weight lifted and distance only as
  numbers, behind "Include numbers").
- Files: `lib/workouts/analytics.ts`, `lib/workouts/depth.ts` (exports `CategoryLookup`), `components/health/workouts/workouts-progress.tsx`,
  `components/health/workouts/workouts-view.tsx`, `components/health/workouts/av2-body.css`, `lib/wrapped/build.ts` (an
  optional `workouts` input and the `training` card; without it every card is as before), `components/wrapped/use-wrapped.ts`.
- Tests: `lib/workouts/av2-analytics.test.ts` (with the Wrapped card), `lib/ai/local-answers/av2-body.test.ts`; spec
  `tests/av2-workout-progress.spec.ts`. The existing `lib/wrapped/wrapped.test.ts` passes unchanged.
- Stored: nothing.
- Help (EN): **How do I see my training month by month?** In Health → Workouts, open "Progress": this month beside the
  last (workouts, time, sets, weight lifted, distance and new bests), earlier months by the arrows, and your working sets
  per muscle group over the last 8 weeks. Exercise history draws each exercise's estimated one-rep max, heaviest set or volume.
- What's new: "Workouts: a monthly report, sets per muscle group over 8 weeks, and a Training card in Wrapped."
- Answers: "how did my training go this month" / "hoe ging mijn training deze maand", "show my sets per muscle group" /
  "laat mijn sets per spiergroep zien". (Never "how many workouts this month": the corpus's `workouts-month` keeps it.)
- Showcase: the Showcase's two weeks of training fill the report and the table (no new records).

## 5. The year calendar and the week streak — LEDGER #118 built

- What: Health → Workouts → Calendar has "Month" (as before) and "Year": the twelve months of a year as small grids
  (Monday first), each day trained a filled square, today ringed, each month's days trained beside its name, earlier
  years by the arrows; every cell is named for a screen reader ("Mon, Nov 2: Fictional push"). Above both: the week
  streak — weeks in a row with at least one workout (an open week never breaks it) and the longest run.
- Files: `lib/workouts/calendar.ts` (`workoutYear`, `weekStreak`), `components/health/workouts/workout-calendar.tsx`
  (the view switch and the streak line; the month view unchanged), `components/health/workouts/workout-year.tsx` (its own
  chunk), `components/health/workouts/av2-body.css`, `components/health/workouts/workouts.css`.
- Tests: `lib/workouts/av2-calendar-year.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-workout-year.spec.ts`
  (`tests/av-workout-calendar.spec.ts` still holds: the month view and its texts are as they were).
- Stored: nothing.
- Help (EN): **Can I see a whole year of workouts?** Yes: in Health → Workouts, open Calendar and choose "Year". Each day
  you trained is filled in, month by month. Above it, "weeks in a row" counts the weeks with at least one workout; a week
  that is not over yet never breaks it.
- What's new: "Workouts: a year calendar and your weeks in a row."
- Answers: "how many weeks in a row have I trained" / "hoeveel weken op rij heb ik getraind", "how many days did I train
  this year" / "hoeveel dagen heb ik dit jaar getraind".

## 6. A run's summary, distance goals and the training load — LEDGER #110 built, #111 built (challenges with friends: against a named rule, nothing shared between people)

- What: every run in "Your workouts" says, with no model, its distance and pace beside the average of up to five runs
  before it, its fastest kilometre (from the splits) and a running best it set. "Distance goals and training load" (a
  panel; its content its own chunk): distance goals for a week, a month or a year, for running, cycling, swimming,
  walking or every sport — a bar, what is left, the kilometres a day to get there, on pace or not; the first two show on
  the panel's face. The training load: minutes (or kilometres) in the last 7 days beside the usual week (the average of
  the 4 weeks before), in plain words ("About your usual week", "Well above your usual week: a big step up…"), with 12
  weeks as bars and the usual as a dashed line, and a table. Never calories.
- Files: `lib/workouts/runs.ts`, `components/health/workouts/distance-goals.tsx`, `components/health/workouts/workouts-view.tsx`,
  `components/health/workouts/av2-body.css`, `lib/workouts/showcase.ts` (Showcase: a 30 km running goal this month).
- Tests: `lib/workouts/av2-runs.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-distance-goals.spec.ts`.
- Stored: `distanceGoals` (see Stored changes).
- Help (EN): **Can I set a distance goal?** Yes: in Health → Workouts, open "Distance goals and training load" and set a
  distance for a week, a month or a year — running, cycling, swimming, walking or all sports. It counts your distance sets
  and imported files. **What is the training load?** Your minutes (or kilometres) in the last 7 days beside your usual
  week, the average of the four weeks before. It never counts calories. **What does a run's summary say?** Its pace and
  distance beside your last few runs, its fastest kilometre and any running best it set.
- What's new: "Workouts: distance goals, a training load beside your usual week, and a summary under each run."
- Answers: "how is my running goal going" / "hoe gaat mijn hardloopdoel", "what is my training load" / "wat is mijn
  trainingsbelasting", "how did my last run compare" / "hoe was mijn laatste loop".

## 7. Sleep: time to fall asleep and quality as charts, "your usual" from your own nights — LEDGER #123 built, #124 built (from the person's own nights, as the task names it: no outside data)

- What: Health → Sleep gets "Your week beside your usual": the last 7 days' time asleep, bedtime, wake time, time to fall
  asleep and quality beside "your usual" — the median of the person's own nights in the 90 days before this week (at
  least 7), "a line to compare with, not a target and not anyone else's". Over time: the time-asleep chart draws the
  usual as a dotted line (keyed "Your usual 7 h 50 min (your own nights)"); a new "Time to fall asleep" chart per night
  (7 and 30 days) or by week / month (90 days, a year) with its usual and a table; at 90 days and a year, "Your quality
  ratings" by week or month as a line. A night without a value stays empty. LEDGER #124 named "published population
  averages"; this lane's task says "a benchmark line from your own nights (no outside data)", so no outside figure is used.
- Files: `lib/sleep/usual.ts`, `components/health/sleep/sleep-usual.tsx` (its own chunk), `components/health/sleep/sleep-charts.tsx`
  (an optional `usual` line), `components/health/sleep/sleep-view.tsx`, `components/health/sleep/av2-sleep.css` (new),
  `components/health/sleep/sleep.css` (the usual line, key and latency bars).
- Seen in passing (COMPETITORS.md): `sleep-view.tsx`'s header said "No score" while the page shows the score card;
  corrected in this commit. The clinician report's header (`lib/clinician-report/build.ts`) was already corrected at
  `fbeb3e54` (it names the symptoms and supplements sections); nothing left.
- Tests: `lib/sleep/av2-usual.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-sleep-usual.spec.ts`.
  Watch: `tests/sleep.spec.ts` lines 151 and 202 pin the time-asleep chart's key text exactly; their fixtures hold fewer
  than 7 nights before the week, so no usual line is drawn there (if a run shows "Your usual" in that key, that is why).
- Stored: nothing.
- Help (EN): **What is "your usual" in Sleep?** The middle value of your own nights in the 90 days before this week —
  time asleep, bedtime, wake time, time to fall asleep and your quality rating. It needs at least 7 logged nights. It is
  a line to compare your week with, never a target and never anyone else's figures. **Can I see how long I take to fall
  asleep?** Yes: add "time to fall asleep" when you log a night (or import it); Sleep → Over time draws it per night, by
  week or by month.
- What's new: "Sleep: time to fall asleep and quality over time, and your week beside your usual."
- Answers: "how long do I take to fall asleep" / "hoe lang duurt het voor ik in slaap val", "how did I sleep this week
  compared to usual" / "hoe sliep ik deze week vergeleken met normaal".
- Showcase: its 30 nights (with time to fall asleep and ratings) fill the card and the charts; no new records.

## 8. The evening plan with a "Ready for bed" bar — LEDGER #83 built (part Carried: wearable sync, native-only)

- What: Health → Sleep → Tonight → "Your evening plan" (its own chunk). "Make an evening plan" asks three plain questions
  — when do you want to be asleep, what gets in the way most evenings (screens, a busy head, coffee or tea late, no fixed
  bedtime, light or noise, eating late), how long to wind down — and suggests four to six steps (lights low, a wind-down
  sound or slow breaths and lights out always; "Screens away", "Write down what is on your mind", "Nothing with caffeine
  from now", "Last meal or snack", "Room dark and cool" for the answers given), each at its time before bedtime. The
  person keeps, drops or adds steps (up to 8), and can add an own habit as a step (named, never ticked for them). Each
  evening (until 05:00 the evening is still the day before) the steps are listed with their times and checkboxes, the
  "Ready for bed" bar fills ("Ready for bed: 2 of 5 steps." → "Ready for bed. Sleep well."), and the last 7 evenings are
  counted. Change or remove the plan any time (ticked evenings stay). No medical claim.
- Files: `lib/evening-plan/schema.ts` (stored commit), `lib/evening-plan/plan.ts`, `lib/evening-plan/showcase.ts`,
  `components/health/sleep/evening-plan.tsx`, `components/health/sleep/sleep-view.tsx`, `components/health/sleep/av2-sleep.css`.
- Tests: `lib/evening-plan/plan.test.ts`, `lib/workouts/av2-stored.test.ts` (the record; its export round trip runs once
  registered), `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-evening-plan.spec.ts`.
- Stored: `zigoals:evening-plan:v1` (NEW key; see Stored changes and the registries it needs).
- Showcase hook (one line in `lib/showcase-data.ts`, for the lead): `records[EVENING_PLAN_KEY] = JSON.stringify(showcaseEvening(day));`
  with `import {showcaseEvening} from './evening-plan/showcase'` and `import {EVENING_PLAN_KEY} from './evening-plan/schema'`
  (asleep by 23:00, five steps, two ticked tonight, four full evenings this week). It adds a record no pinned count reads.
- AK sources (for the answers): `eveningPlan: one(EVENING_PLAN)` in `lib/ai/tools/ak-sources.ts` and the field in
  `AkToolSources` (`lib/ai/tools/ak-tools.ts`). Until then the answer says where the plan lives.
- Help (EN): **Can ZIGoals help me get ready for bed?** Yes. In Health → Sleep, under Tonight, "Make an evening plan"
  asks when you want to be asleep, what gets in the way and how long you like to wind down, then suggests a few steps
  with their times. Tick them as you go and the "Ready for bed" bar fills. You can add one of your habits as a step, and
  change or remove the plan any time. It is kept on this device and is not medical advice.
- What's new: "Sleep: an evening plan from three questions, with a Ready for bed bar."
- Answers: "what is my evening plan" / "wat is mijn avondplan", "am I ready for bed" / "ben ik klaar voor bed".
- Nothing on Today.

## 9. Open q3 Minors (sleep, workouts, body) — the symptom chart built; the rest already fixed or another lane's

- Built: **q3 #48 Minor, "a small symptom line chart"** (QUALITY.md "Not fixed": "a symptom chart"). The visit report's
  "Symptoms and factors" draws up to four symptoms' daily levels (0 None to 3 Strong) as lines told apart by line style
  and marker shape, never colour alone, named in a key under it; a day not rated is a gap; the table stays beside it.
  Files: `lib/clinician-report/build.ts` (an optional `chart` on the section; the rows unchanged), `components/report/report-document.tsx`,
  `components/report/report.css`. Tests: `lib/clinician-report/av2-symptom-chart.test.ts` (the existing
  `av-more.test.ts` and `tests/av-report-more.spec.ts` hold unchanged); spec `tests/av2-report-symptoms.spec.ts`.
  Answers: none new (the symptoms log stays private to NOVA and ZIGi, av-life's rule). Help (EN): **Does the visit report
  show my symptoms over time?** Yes: "Symptoms and factors" draws each symptom's daily rating as a line (up to four), with
  the counts in the table beside it. What's new: "Visit report: your symptoms as lines over the range."
- Already fixed at `fbeb3e54` (checked in the code, nothing left): #11 the weekly chart's teaching line, week labels and
  distance per sport (`workouts-view.tsx:189`, `weekly-chart.tsx`); #27 unknown regularity and debt left out and the
  weeks before (`lib/health-aa/sleep-score.ts`, `sleep-score-card.tsx`); #40 one star per best (`withEarlier`) and the
  bench answer (`av-life.ts exerciseBest`); #41 the calendar on phones; #46 bedtime and wake per group (the long chart's
  table) — and now quality and time to fall asleep by week or month too (feature 7); #48 the local date of doses.
- Another lane's row: q3 #36 Minor "hide figures offered in Settings and in Export" is LEDGER #69 (group 6, Bearable),
  which this lane's task does not list; left to that group's builder (not a cause from the list: it is in their scope).
- Not this lane's area: q3's food Minors (#3, #18, #25, #29, #47) and #8 (Insights) are the food and mood lanes'.

## 10. N8: a unit per exercise; assisted and weighted bodyweight — LEDGER #201 built, #202 built

- What: while training, a weight exercise has "Unit: As Health (kg) / kg / lb" (a machine in lb beside the barbell in
  kg); its sets, last time, history and past workouts read in that unit, and the log keeps kilograms. A reps exercise has
  "Body weight: Body weight only / With added weight / Assisted (help taken off)", which adds an "Added kg" or "Help kg"
  column; last time fills it; a routine and the next session keep it. Bests read the right way round: more weight added
  beats, less help beats ("least help yet" on the set row and at the finish); volume counts the added weight only, an
  assisted set none. Exercise history shows "Most weight added" and "Least help (less is stronger)".
- Files: `lib/workouts/bodyweight.ts`, `lib/workouts/engine.ts` (volume, history, bests, carry the load),
  `lib/workouts/set-best.ts`, `components/health/workouts/units.ts` (`8 reps +10 kg`, `8 reps, 20 kg help`),
  `components/health/workouts/workouts-view.tsx`, `components/health/workouts/workouts.css`.
- Tests: `lib/workouts/av2-bodyweight.test.ts` (and the existing workouts tests, unchanged and green); spec
  `tests/av2-bodyweight-units.spec.ts`.
- Stored: `load`, `addedKg`, `assistKg`, `exerciseUnits` (second stored commit).
- Help (EN): **Can one exercise use pounds while the rest use kilograms?** Yes: while you train, choose its Unit (kg or
  lb). Your log still keeps kilograms, so nothing is converted twice. **How do I log assisted pull-ups or weighted dips?**
  Under the exercise, choose "Body weight": with added weight, or assisted. A column for the added weight or the help
  appears; less help counts as a best, and so does more added weight.
- What's new: "Workouts: a unit per exercise, and assisted or weighted bodyweight sets."
- Answers: "how much help do I use on pull-ups" / "hoeveel hulp gebruik ik bij optrekken", "what is my weighted dip
  record" / "wat is mijn record dips met extra gewicht".

## 11. N8: shoes, a beaten run best marked once, running tips — LEDGER #203 built, #204 built, #208 built

- What: Health → Workouts → "Shoes" (a panel; its content its own chunk): add a pair with the distance it already has and
  a distance to retire it at (700 km offered); each pair shows its distance (start + the runs it was picked on) as a bar,
  its runs and last run, "Near its limit: 70 km to go." from 90 % and "Past its retire distance…" after; retire a pair
  (kept, under "Retired shoes", "Use again" or Remove). A run in "Your workouts" picks its pair; a finished or imported
  run takes the usual pair (the one on the latest run still in use). "Your running bests" marks a best beaten since the
  last look once, quietly ("★ A new running best: 5 km in 24:10 (…). Well run." with "Noted"); bests from before the
  mark existed are never marked (the first run added keeps them as seen). "A running tip": one of twenty short tips
  written in the repository in English and Dutch, one a day, "Another tip", "In het Nederlands"; not medical advice (the
  pain tip says a doctor or physio can help).
- Files: `lib/workouts/shoes.ts`, `lib/workouts/run-tips.ts`, `components/health/workouts/shoes.tsx`,
  `components/health/workouts/run-tip.tsx`, `components/health/workouts/run-bests.tsx`, `components/health/workouts/workouts-view.tsx`,
  `components/health/workouts/av2-body.css`, `components/health/workouts/workouts.css`, `lib/workouts/showcase.ts`
  (Showcase: "Example · blue trainers" on both runs, 631 of 700 km, near its limit).
- Tests: `lib/workouts/av2-shoes.test.ts`, `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-shoes-tips.spec.ts`.
- Stored: `shoes`, `shoeId`, `seenBests` (second stored commit).
- Always visible on Workouts (not Today): the running tip card (three Tab stops: two buttons; the region).
- Help (EN): **Can I track my running shoes?** Yes: in Health → Workouts, open "Shoes", add a pair with the distance it
  already has and when you retire shoes. Pick it on a run (new runs take your usual pair); its distance adds up, and it
  says when it nears its limit. **What does the star in Your running bests mean?** A running best you beat since you last
  looked, shown once; "Noted" puts it away. **Are there running tips?** One a day on the Workouts page, in English or Dutch.
- What's new: "Workouts: shoes with their distance, a once-only mark for a new running best, and a running tip a day."
- Answers: "how far have my running shoes gone" / "hoeveel km hebben mijn hardloopschoenen", "when should I replace my
  shoes" / "wanneer moet ik mijn schoenen vervangen", "give me a running tip" / "geef me een looptip".

## 12. N8: routines shared as a small file; workout-sets.csv with RPE and notes — LEDGER #206 built, #207 built in code (one line for the lead)

- What: a routine's Edit has "Share this routine as a file": "Save routine file" writes `<name>.zigoals-workout.json`
  with the exercises (a built-in one by its id, an own one by its name, group and measure), the planned sets, rest and
  the progression rule; the weights only with "Include my weights" (off by default); never a workout done, a date, a note,
  a folder or an id of the person's. "Ready-made routines, and routines shared with you" starts with "Add a routine
  someone shared": the file is read strictly (fixed shape, 32 KB, plain-text names, a newer version refused with a plain
  reason), previewed, and added as a new routine in "Shared with me" ("(shared)" when the name is taken), with any own
  exercise it needs. No server. CSV: `lib/workouts/csv.ts` keeps the 13 columns in their order and adds `rpe`,
  `added_kg`, `assist_kg`, `exercise_note`, `workout_note`, `shoes`.
- For the lead (export catalogue, a registry file): in `lib/export/everything.ts` set `CSV_HEADERS['workout-sets.csv']`
  to `[...WORKOUT_SET_COLUMNS]` and the line `out['workout-sets.csv'] = csv(CSV_HEADERS['workout-sets.csv'], workoutSetRows(workouts));`
  with `import {WORKOUT_SET_COLUMNS, workoutSetRows} from '../workouts/csv';`. The records are unchanged; the existing
  `csv()` keeps escaping every cell (notes with commas and quotes are tested in `av2-share-csv.test.ts`).
- Files: `lib/workouts/share.ts`, `lib/workouts/csv.ts`, `components/health/workouts/routine-library-view.tsx`
  (`ShareRoutine`, `RoutineImport`), `components/health/workouts/workouts-view.tsx`, `components/health/workouts/av2-body.css`.
- Tests: `lib/workouts/av2-share-csv.test.ts`; spec `tests/av2-routine-share.spec.ts`.
- Stored: nothing new (a shared routine is an ordinary routine).
- Answers: none (no new data to answer from; "what routines do I have" lists the shared ones in their folder).
- Help (EN): **Can I share a workout routine?** Yes: Edit the routine and choose "Save routine file". It holds the
  exercises, sets, rest and the progression rule — your weights only if you tick "Include my weights", never your
  workouts or notes. Whoever gets it opens "Ready-made routines, and routines shared with you" and adds it under "Add a
  routine someone shared". **Does the workout CSV include RPE and notes?** Yes: workout-sets.csv has RPE, the added weight
  or help, the exercise's note, the workout's note and the shoes as extra columns.
- What's new: "Workouts: share a routine as a small file; the workout CSV now carries RPE and notes."

## 13. N9: a BMI figure and weight milestones — LEDGER #210 built (part Carried: ideal weight against the no-medical-advice rule; calories burned against the no-calorie-burn rule), #205 built

- What: Health → Weight → "BMI and milestones" (its own chunk). A height the person types (kept on this device) gives a
  BMI figure from the latest reading — the number only, with how it is worked out and "it says nothing on its own about
  one person's health"; no category word, no range, no ideal weight. Opt-in milestones on the way to the Health weight
  goal (Targets): every 2 kg or every 10 % of the way from the latest reading; each step is listed, the next one named,
  a reading past one shows "★ A milestone reached: 82 kg. Step by step." until "Thanks", once — a step back and forward
  again is never a second celebration. Off until turned on; "Turn milestones off" any time. Every figure carries
  `data-body-figure` (hidden with "Hide calorie and weight figures").
- Files: `lib/body-extras/schema.ts` (stored commit), `lib/body-extras/body.ts`, `components/health/body-figures.tsx`,
  `components/health/body-figures.css` (new), `components/health/health-app.tsx` (one lazy line in the Weight view).
- Route weight: `/app/health`'s first chunk gains one `lazy(() => import("./body-figures"))` and one `<Suspense>` line;
  the panel, its CSS and the record schema load with the Weight view's chunk on demand.
- Tests: `lib/body-extras/body.test.ts`, `lib/workouts/av2-stored.test.ts` (the record; its round trip once registered),
  `lib/ai/local-answers/av2-body.test.ts`; spec `tests/av2-bmi-milestones.spec.ts`.
- Stored: `zigoals:body-extras:v1` (NEW key; registries listed under Stored changes).
- AK sources (for the answers): `bodyExtras: one(BODY_EXTRAS)` beside `eveningPlan`. Until then the answers say where it lives.
- Help (EN): **Can ZIGoals show my BMI?** Yes, as a number only: type your height in Health → Weight → "BMI and
  milestones" and it is worked out from your latest reading. No label, no range and no ideal weight are given: on its
  own it says nothing about your health. **What are weight milestones?** Steps on the way to your weight goal — every 2 kg
  or every tenth of the way. Turn them on there; each step is marked once when you reach it.
- What's new: "Weight: a BMI figure from your height, and milestones on the way to your goal."
- Answers: "what is my BMI" / "wat is mijn BMI" (never a judgement word), "how are my weight milestones" / "hoe gaan mijn
  gewichtsmijlpalen".

## Summary: rows and verdicts

| LEDGER row | verdict | commit (feature) |
|---|---|---|
| #109 MacroFactor Workouts | built (rep progression); Live Activity Carried: native-only | 3 |
| #110 Strava Athlete Intelligence | built (a no-model run summary) | 6 |
| #111 Strava goals and Fitness Score | built (distance goals, training load); challenges with friends: against a named rule (nothing shared between people) | 6 |
| #112 Strava coach-designed strength workouts | built (12 written routines, EN+NL, plan and cue per exercise) | 2 |
| #115 Hevy routines, folders and library | built | 2 |
| #116 Hevy exercise library | built (48 written how-tos, EN+NL, muscles) | 1 |
| #117 Hevy progress analytics | built (month report, sets per muscle across 8 weeks, a line per metric, Wrapped's Training card) | 4 |
| #118 Hevy calendar and streaks | built (year view, weeks in a row) | 5 |
| #119 Hevy three-level notes | built (pinned exercise note, routine note; the session note was there) | 1, 2 |
| #83 Calm Sleep evening plan | built; wearable sync Carried: native-only | 8 |
| #123 Sleep Cycle statistics | built (time to fall asleep and quality charted, 7 days to a year) | 7 |
| #124 Sleep Cycle benchmarks | built from the person's own nights (the task's wording; no outside data) | 7 |
| COMPETITORS.md "seen in passing" | sleep-view header corrected (7); clinician-report header already correct at `fbeb3e54` | 7 |
| q3 #48 Minor (a symptom chart) | built | 9 |
| q3 #36 Minor (hide figures in Settings/Export) | LEDGER #69, group 6: not in this lane's list | — |
| N8 #201 unit per exercise, #202 assisted/weighted | built | 10 |
| N8 #203 shoes, #204 run-best mark, #208 running tips | built | 11 |
| N8 #206 shared routine files, #207 CSV columns | built (#207's two export lines for the lead) | 12 |
| N9 #205 weight milestones, #210 BMI | built (#210: ideal weight against the no-medical-advice rule; calories burned against the no-calorie-burn rule) | 13 |

Lead's one-line items, collected: engine.ts `av2BodyAnswer` wiring; `AV2_BODY` into the corpus and `expected.json`;
`eveningPlan` and `bodyExtras` in `lib/ai/tools/ak-sources.ts`/`ak-tools.ts`; the five registries for
`zigoals:evening-plan:v1` and `zigoals:body-extras:v1`; `showcaseEvening(day)` in `lib/showcase-data.ts`;
`workout-sets.csv` → `WORKOUT_SET_COLUMNS`/`workoutSetRows`; theme sheets for `components/health/workouts/av2-body.css`,
`components/health/workouts/workouts.css`, `components/health/sleep/av2-sleep.css`, `components/health/sleep/sleep.css`,
`components/health/body-figures.css`, `components/report/report.css`; Help and What's new texts above; search entries
("exercise library", "ready-made routines", "routine folder", "progression", "training load", "distance goal",
"shoes", "running tip", "time to fall asleep", "evening plan", "BMI", "weight milestones").

Not run here (the brief's limits): Playwright (14 new `tests/av2-*.spec.ts`), next build, the theme build. Unit runs: the
workouts, sleep, evening-plan, body-extras, wrapped, clinician-report, local-answers, evals, nova cards, restore, export
and health-aa folders green (1,226 tests); `router-coverage.test.ts` failed once in that big parallel run and passed
alone and in its folder (load on a shared machine).
