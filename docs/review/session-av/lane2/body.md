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
