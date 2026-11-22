# Lane 2 round 5 — gym (Gentler Streak, Bevel): builder registry

Branch `lane2/r5-gym`, from `lane2/batch4` at `6008ae44`. Rows: LEDGER "Round 5: rows #348–#390", group V4 (#372–#378).
Built on the Workouts registries (`body.md`, `bodymind-r2.md`, `r3-health.md`, `r4-health.md`); nothing here repeats
them: the suggestion is bodymind-r2's #240, the plan and "Away until" are r4's #330, the streak is body's #118, the
training load body's #111, the plate calculator Session AK's.

Health's rules kept throughout: every part sits inside Health's route (its gate and consent); no calorie expenditure is
estimated anywhere new; no medical claim, reading of the body or advice ("fresh, normal, tired, sore" are everyday words,
as the ledger's owner note under #372 asks). Every new Workouts part loads lazily (`components/health/r5/`, each by one
`lazy()` line in the Workouts chunk, which was lazy already); the Health page's first chunk gains one `lazy()` line on the
Workouts card and the everyday-movement words (#376, a short constant list).

**Owner's decision (ledger note under #376):** `lib/health-activity-types.ts` already shows "a labelled estimate of the
energy an activity used" from MET values for the twelve types (Session AL fourth pass, C-MO-39). This branch neither
extends nor reuses it: the new everyday types have no MET entry, so no energy figure is shown for them (a unit test pins
that). Whether the existing estimate stays under the no-calorie-burn-guessing rule is the owner's decision.

## Stored changes (TIER 3 (stored formats), all additive) — commit `8393f575`

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:workouts:v1` (existing, device-only, loose) | routine: optional `keepWeights` (boolean); workout: optional `photos` (≤ 4 ids `wph-…`) and `star` (boolean); plate set: optional `oneSide` (boolean) and `start` (0–500, the machine's or sled's own weight in the set's unit). Each `.optional().catch(undefined)` on a loose object (a bad value is dropped alone). | Loose objects keep them untouched; an older build counts plates for each side and shows no photo or star. |
| `zigoals:planned-workouts:v1` (round 4's, device-only, loose) | optional `statuses[≤ 50]` `{id, kind: ill, injured, break or travel, from, to?, createdAt}`; an unreadable status is dropped, the others kept; `.optional().catch(undefined)`. | A round 4 build keeps the list untouched (its "away" is unchanged). |
| IndexedDB `zigoals-workout-photos-v1`, store `photos` (NEW, device-only) | `<scope>:<photoId>` → `{blob, type: image/webp or image/jpeg, bytes ≤ 200 kB, at, orphanSince?}`; at most 300 a scope. | New database; older builds never open it. |

The splits record (`zigoals:workout-splits:v1`, strict) is not touched.

## Summary: rows and verdicts

| LEDGER row | verdict | feature | commit |
|---|---|---|---|
| #372 Gentler Streak: how you feel changes the suggestion | built (everyday words; nothing stored) | 2 | `39df9f4c` |
| #373 Bevel: a routine that keeps your last weights | built | 4 | `3c724539` |
| #374 Gentler Streak: a status for ill, injured or a break | built (never in a notification) | 1 | `ec898ba3` |
| #375 Gentler Streak: how much movement suits this week | built (facts only; no calories, no "you must rest") | 7 | `6da48814` |
| #376 Gentler Streak: everyday movement as activities | built (no energy figure; the existing MET estimate is the owner's decision) | 3 | `f13b3936` |
| #377 Gentler Streak: photos and favourites | built; part Carried: photos pinned on a map (needs an outside service: map tiles) | 6 | `36f6e048` |
| #378 Bevel: plates on one side | built | 5 | `729fd45f` |

Stored formats: `8393f575` (TIER 3). Answers: `692314b0`.

Specs for the shard lists (none run here): `tests/av2-r5-status.spec.ts`, `tests/av2-r5-feel.spec.ts`,
`tests/av2-r5-everyday.spec.ts`, `tests/av2-r5-keep-weights.spec.ts`, `tests/av2-r5-one-side.spec.ts`,
`tests/av2-r5-photos.spec.ts`, `tests/av2-r5-movement.spec.ts`.

QUALITY Minors: none of the open "Not fixed" Minors is in Workouts; none taken up.

## Shared to-do for the lead (all features)

- engine.ts wiring and the corpus: see "Answers" at the end.
- Search (static.ts), Help and What's new: see each feature.
- CSS files touched (for the theme sheets): `components/health/r5/gym-r5.css` (new).
- Today: nothing new is always visible on Today.
- Route weights: /app/health's first chunk gains one `lazy()` line on the Workouts card (`r5/card-status`) and the
  everyday-movement list (#376); everything else is in the Workouts chunk, lazy already. Please measure /app/health.
- New device store (one): `lib/av2-r5-gym-keys.ts` — the IndexedDB `zigoals-workout-photos-v1` into Erase everything
  (`AV2_R5_GYM_ERASE_DBS`, lib/erase-everything.ts's database names), Restore's media stores
  (`AV2_R5_GYM_RESTORE_MEDIA` into `RESTORE_MEDIA_STORES`, `workout-photos` into `MEDIA_ENTRY`, and lib/restore/media.ts
  indexing each `photos` id of each workout of `zigoals:workouts:v1` under `workoutPhotoFileName(id, type)` for both
  types, store `putWorkoutPhoto`, cap 200 kB), Export everything (lib/export/make-everything.ts: `...workoutPhotos` from
  `import('../workouts/photos').exportWorkoutPhotoEntries(photoScope(), now)`, as the food photos are), and the data
  catalogue (`AV2_R5_GYM_CATALOG_LABEL`, Health, device-only). No new localStorage key.
- `zigoals:planned-workouts:v1` is already in the AK tool sources (`plannedWorkouts`); the answers read the statuses from it.

## 1. A status for when you are ill, injured or on a break — LEDGER #374 built

- What: Health → Workouts → Start a workout → "Your status: ill, injured, a break or travelling" (a fold, its own chunk;
  its face says "Your status: on a break since Mon, Nov 16" while one is set). Choose Ill, Injured, On a break or
  Travelling and the day it started (today or earlier, within a year), "Set this status". While it is set: its days'
  planned workouts are set aside on the plan (round 4's "set aside", never "missed", so no "I missed some" note and the
  realign skips them), its weeks pass over the week streak (a week it touches without a workout neither counts nor breaks
  it, also after it is cleared), and the training load says "Your status is set, so these days are not compared with your
  usual week." "I'm back: clear the status" ends it on yesterday (Undo in the toast); for the five weeks after, the load
  says "Back after a break: the weeks around it are not compared, so there is no usual for now." and the fold says when it
  ended. "Change it" switches the status (the old one ends the day before). The Health page's Workouts card says "Paused
  since Mon, Nov 16: planned workouts are set aside until you clear your status in Workouts." — never the reason. The
  status is read by nothing in the notification plan (no planned workout has a notification), so the reason never goes in
  one. Everyday words, no advice.
- Files: `lib/workouts/status.ts` (new, pure), `lib/workouts/planned.ts` (a status day is set aside; realign skips it),
  `lib/workouts/calendar.ts` (`weekStreak(…, pauses)`), `lib/workouts/runs.ts` (`trainingLoad(…, pauses)`, two words),
  `components/health/r5/workout-status.tsx`, `components/health/r5/card-status.tsx`, `components/health/r5/gym-r5.css`
  (new), `components/health/workouts/workouts-view.tsx` (the fold; pauses to the calendar and the load),
  `components/health/workouts/workout-calendar.tsx`, `components/health/workouts/distance-goals.tsx`,
  `components/health/workouts/workouts-card.tsx` (one lazy line), `components/health/r4/planned-workouts.tsx` (the set-aside
  words gain "or a status is set"; round 4's spec matches it by regex, unchanged), `lib/ai/local-answers/av2-body.ts` (the
  streak and load answers pass the pauses; Dutch words for the two new load words).
- Tests: `lib/workouts/av2-r5-status.test.ts`, `lib/workouts/av2-r5-stored.test.ts`; existing planned, calendar, runs,
  av2-body and r4 answers tests green. Spec: `tests/av2-r5-status.spec.ts`.
- Stored: `statuses` on the planned-workouts record (see the table).
- Help (EN): **Can I pause my training when I'm ill or away?** Yes. In Health → Workouts, open "Your status" and choose
  Ill, Injured, On a break or Travelling and the day it started. Until you clear it, planned workouts are set aside (never
  missed), those weeks do not break your week streak, and your training load is not compared. Choose "I'm back" when you
  are. The status stays on this device and is never put in a notification.
- What's new: "Workouts: set a status when you are ill, injured, on a break or travelling — your streak and plan wait for you."
- Search (static.ts): "ill", "injured", "injury", "training break", "pause training", "travelling" →
  `/app/health?view=workouts`.
- Showcase hook: none (a status would set aside the Showcase's planned workouts that the Agenda and Day Timeline draw).
- Device keys / catalogue / export / erase: nothing new (in the registered planned-workouts record). CSS: `gym-r5.css`.

## 2. How you feel today changes the suggestion — LEDGER #372 built

- What: Health → Workouts → Start a workout → "Suggest a workout for today" asks "How do you feel today?" (Fresh, Normal,
  Tired, Sore; one tap, a radio group of 44 px chips). Fresh and Normal keep the suggestion as it was. Tired makes it
  shorter and easier: one exercise and one set fewer each (at least three exercises and two sets) and every weight held
  at the heaviest you lifted last time ("An easier day: fewer sets and one exercise fewer, with the weights you lifted last
  time (no increase today)."). Sore makes it shorter and lighter: three exercises, two sets each, about 10 % less weight,
  rounded down to what plates make. On a tired or sore day "Or start an easy walk instead" starts an ordinary cardio
  workout with Walking. Everyday words only (the ledger's owner note): no symptom list, no reading of the body, no advice.
  The choice is kept for that suggestion only: nothing is stored (the spec checks no key is written).
- Files: `lib/workouts/feel.ts` (new, pure), `components/health/workouts/suggest-workout.tsx`.
- Tests: `lib/workouts/av2-r5-feel.test.ts`; spec `tests/av2-r5-feel.spec.ts`.
- Stored: nothing.
- Help (EN): **Can the suggested workout be easier on a tired day?** Yes. In Health → Workouts, open "Suggest a workout
  for today" and choose how you feel. Tired gives fewer sets and one exercise fewer at last time's weights; Sore gives
  three exercises of two sets, about 10 % lighter. On those days you can start an easy walk instead. Your answer is used
  for that suggestion only and is not kept.
- What's new: "Workouts: tell the suggestion how you feel — a tired or sore day gets a shorter, lighter workout or a walk."
- Search (static.ts): "how I feel", "tired workout", "easier workout", "sore" → `/app/health?view=workouts`.
- Showcase hook: none needed (the Showcase's log already makes a suggestion). Device keys: none. CSS: `gym-r5.css`.

## 3. Everyday movement as activities — LEDGER #376 built (no energy figure; the existing MET estimate is the owner's decision)

- What: Health → Activity's "Activity name" offers, beside the twelve types, everyday movement in English and Dutch:
  Gardening / Tuinieren, Housework / Huishouden, Walking the dog / De hond uitlaten, Wheelchair push / Rolstoel duwen,
  Carrying a child / Een kind dragen, Commuting by bike / Op de fiets naar het werk, Taking the stairs / De trap nemen,
  Playing with the kids / Spelen met de kinderen. Their minutes count as active minutes everywhere activity minutes count
  (the Activity view, Today, and the Workouts movement band, #375). They have no MET value, and no name starts with one of
  the twelve types' words, so `activityTypeOf` finds none and no energy figure is ever shown for them (the bike commute is
  named "Commuting by bike", not "Cycling to work", for that reason). The form's fine print says so. The person's own
  words still work, as before.
- Owner's decision: the existing MET estimate for the twelve types (`lib/health-activity-types.ts:12-25`, C-MO-39) is
  neither extended nor reused here; whether it stays is for the owner.
- Files: `lib/health-everyday-moves.ts` (new, constants only), `components/health/health-app.tsx` (the datalist and one
  sentence of fine print; Health's first chunk: the list, about 300 bytes).
- Tests: `lib/av2-r5-everyday.test.ts` (every name in both languages, no type found, no estimate); existing
  `lib/health-al-l2-pass3.test.ts`, `pass4` green. Spec: `tests/av2-r5-everyday.spec.ts`.
- Stored: nothing (the activity keeps the words typed).
- Help (EN): **Does everyday movement count?** Yes. In Health → Activity, name it — gardening, housework, walking the dog,
  a wheelchair push, carrying a child, commuting by bike — or type your own words, with its minutes. The minutes count as
  active minutes. ZIGoals shows no energy figure for it.
- What's new: "Activity: everyday movement — gardening, housework, walking the dog and more — in English and Dutch."
- Search (static.ts): "gardening", "housework", "walking the dog", "wheelchair", "everyday movement" →
  `/app/health?view=activity`.
- Showcase hook: none (the Showcase's activity minutes are pinned by other specs). CSS: none.

## 4. A routine that keeps your last weights — LEDGER #373 built

- What: Health → Workouts → Your routines → Edit has "Keep my last weights" (a checkbox with its line: "When you finish a
  workout started from this routine, its done sets' weights and reps are written back into it, with Undo."). The routine's
  row then says "Keeps your last weights". Finishing a workout started from it writes its done sets' values into the
  routine set by set — warm-ups into warm-ups, working sets into working sets, in order; weight and reps (and time,
  distance, added weight or help, as the exercise measures). The routine keeps its exercises, their order and its number
  of sets: an exercise added during the workout is not added, one left out keeps its sets, a set not done keeps its
  values. The finish toast says "… Fictional press keeps these weights for next time." with Undo, which puts the routine's
  own values back. A routine with a progression rule still starts at the rule's targets (the rule reads the history).
  Saving under the routine's name by hand (`saveTemplate`) works as before.
- Files: `lib/workouts/keep-weights.ts` (new, pure), `components/health/workouts/routine-library-view.tsx` (`RoutineEdit`),
  `components/health/workouts/workouts-view.tsx` (finish and its toast; the row's line), `lib/workouts/showcase.ts`.
- Tests: `lib/workouts/av2-r5-keep-weights.test.ts`, `lib/workouts/av2-r5-stored.test.ts`; existing progression, library,
  shoes, fitbod and NOVA card tests green. Spec: `tests/av2-r5-keep-weights.spec.ts`.
- Stored: `keepWeights` on the routine (see the table).
- Help (EN): **Can a routine remember the weights I lifted?** Yes. In Health → Workouts, choose Edit on a routine and tick
  "Keep my last weights". Each time you finish a workout started from it, the weights and reps you did are written back
  into the routine, so it starts there next time. The message after finishing has Undo.
- What's new: "Workouts: a routine can keep the weights you lifted last time."
- Search (static.ts): "keep last weights", "update routine", "auto update template" → `/app/health?view=workouts`.
- Showcase hook: in `lib/workouts/showcase.ts` (already in the Showcase): Leg day keeps its last weights; the same commit
  also stars the last Showcase leg day (#377's Favourites). No pinned count reads either.
- Device keys / catalogue / export / erase: nothing new. CSS: none.

## 5. Plates on one side — LEDGER #378 built

- What: in a workout, under a weighted exercise, "Warm-up and plates" → "Your bar and plates" gains "Loaded on one side"
  (a checkbox: "For a machine or a sled where every plate goes on one horn: all your plates (both of each pair) can go
  there, and its own weight takes the bar's place.") and "The machine's or sled's own weight (kg, optional)", 0 to 500,
  kept with the plate set. The sheet then says "Loaded on one side: the machine's own 40 kg; plates …", the heading
  "Plates on the one side" and "20 + 20 + 20 + 10 kg on the one side, with the machine's own 40 kg." (or the nearest the
  plates make, a tie to the lighter, the fewest plates: the same search as the bar's). The warm-up ramp rounds to what
  the one horn loads and starts from the machine alone (left out without its own weight). Unticked, everything is as
  before.
- Files: `lib/workouts/one-side.ts` (new, pure), `lib/workouts/depth.ts` (`savePlates` keeps `oneSide` and `start`),
  `components/health/workouts/workouts-tools.tsx`.
- Tests: `lib/workouts/av2-r5-one-side.test.ts`, `lib/workouts/av2-r5-stored.test.ts`; `lib/workouts/depth.test.ts` green.
  Spec: `tests/av2-r5-one-side.spec.ts`.
- Stored: `oneSide` and `start` on the plate set (see the table).
- Help (EN): **Can the plate calculator do a machine loaded on one side?** Yes. Under an exercise, open "Warm-up and
  plates", then "Your bar and plates", tick "Loaded on one side" and type the machine's or sled's own weight. ZIGoals then
  lists the plates for that one horn, using both plates of each pair.
- What's new: "Workouts: the plate calculator for machines and sleds loaded on one side."
- Search (static.ts): "single sided", "one side", "sled", "plate loaded machine" → `/app/health?view=workouts`.
- Showcase hook: none (the Showcase keeps no plate set). Device keys: none. CSS: `gym-r5.css` (`.r5-plates-side`).

## 6. Photos and favourites in the workout journal — LEDGER #377 built; part Carried: photos pinned on a map (needs an outside service: map tiles; a route's points are never kept, `lib/workouts/import-file.ts:9`)

- What: Health → Workouts → Your workouts. Above the list, "All" and "Favourites (n)" (a pressed-button group; with none
  yet: "No favourites yet. Under All, open a workout and choose Favourite to keep it here."). Each finished workout,
  opened, has "☆ Favourite" (pressed when starred; its name says which workout) and its summary carries a ★ (read as ", a
  favourite"). Under it, "Add a photo (0 of 4)" takes or chooses a photo: shrunk on the device to at most 200 kB and kept
  only in this browser (IndexedDB `zigoals-workout-photos-v1`), never uploaded or synced, and nothing reads it; up to four
  thumbnails ("Photo 1 of Fictional legs on Nov 18") each with Remove (Undo in the toast; focus goes to the add field). A
  photo another browser kept shows "This photo is not in this browser." Deleting a workout keeps its photos until the
  arrival sweep has found no workout naming them for 30 days (as the note photos'), so Undo of a delete or of a Restore
  finds them again. A Showcase's workout photos are cleared when it starts and ends (`lib/showcase-storage.ts`).
- Files: `lib/workouts/journal.ts` (new, pure: star, photo ids), `lib/workouts/photos.ts` (the store, stored commit;
  `deleteAllWorkoutPhotos` here), `components/health/r5/workout-photos.tsx` (new), `components/health/workouts/workouts-view.tsx`
  (filter, star, the lazy photos part, the sweep), `lib/showcase-storage.ts` (one line), `lib/workouts/showcase.ts` (the
  star, in commit `3c724539`).
- Tests: `lib/workouts/av2-r5-journal.test.ts` (fake IndexedDB: scopes, cap, sweep, export files), `lib/workouts/av2-r5-stored.test.ts`
  (export → erase → restore of `photos` and `star`), `lib/av2-r5-gym-keys.test.ts`; `lib/showcase-photos.test.ts` green.
  Spec: `tests/av2-r5-photos.spec.ts` (sets a small PNG on the file field).
- Stored: `photos` and `star` on the workout; the new photo database (see the table).
- Export everything / Restore / Erase of the photo bytes: the lead's lines, listed in the shared to-do above
  (`lib/av2-r5-gym-keys.ts`). Until then the ids travel in the workout log and the photos stay in this browser only.
- Help (EN): **Can I add photos to a workout?** Yes. In Health → Workouts → Your workouts, open a finished workout and
  choose "Add a photo": up to four. They stay in this browser, are never uploaded or synced, and nothing reads them.
  **Can I keep favourite workouts?** Yes. Open a workout and choose Favourite; "Favourites" above the list shows only those.
- What's new: "Workouts: up to four photos on a workout, kept in this browser, and Favourites."
- Search (static.ts): "workout photos", "favourite workouts", "starred workouts" → `/app/health?view=workouts`.
- Showcase hook: the last Showcase leg day is starred (no photo: photos are the person's own). No pinned count reads it.
- CSS: `gym-r5.css` (photos, star, filter).

## 7. How much movement suits this week — LEDGER #375 built

- What: Health → Workouts → "Distance goals and training load" gains a second fold, "Your movement band: this week beside
  your usual range" (its own chunk; the page's layout is otherwise as it was, nothing on Today). The usual weekly range is
  read from the last six whole weeks of workouts and Health activity minutes together (walks, chores, everyday movement,
  #376): weeks a status covered (#374) and weeks before the first one with any movement are left out; with five or more
  weeks the lowest and highest are set aside, with three or four the band runs from the lowest to the highest, under three
  it teaches ("Your usual range needs three of your last six weeks with movement logged; …"). A bar shades the range and
  fills with this week's minutes (named for screen readers); "This week so far: 105 min (0 min of workouts, 105 min of
  other movement). Below your usual range (120–180 min a week) so far; the week runs to Sunday." (or Inside / Above); the
  seven days with their minutes; "The last 30 days" as bars, a line with the six weeks, and a table (workouts, other
  movement, in all). A workout that wrote its minutes into Health counts once, as a workout. Facts only: no calorie
  figure, no "you must rest" (the ledger's owner note), no advice. The fill has no motion (Motion Off and reduced motion
  respected).
- Files: `lib/workouts/movement.ts` (new, pure), `components/health/workouts/movement-band.tsx` (new),
  `components/health/workouts/workouts-view.tsx` (the fold, with Health's activity), `components/health/r5/gym-r5.css`.
  The weekly chart (`weekly-chart.tsx`) is unchanged: the band is its own part.
- Tests: `lib/workouts/av2-r5-movement.test.ts`; spec `tests/av2-r5-movement.spec.ts`.
- Stored: nothing (derived).
- Help (EN): **What is the movement band?** In Health → Workouts, under "Distance goals and training load", the movement
  band shows your usual week from your last six weeks — workouts and other movement such as walks and chores together —
  and this week's minutes filling it day by day, with the last 30 days below. It says only where this week stands.
- What's new: "Workouts: your movement band — this week beside your usual range, workouts and everyday movement together."
- Search (static.ts): "movement band", "activity range", "how much movement", "active minutes" →
  `/app/health?view=workouts`.
- Showcase hook: none needed (the Showcase's workouts and walks already make a band; no pinned count reads it).
- Device keys: none. CSS: `gym-r5.css` (`.r5-band*`).

## Answers (NOVA and ZIGi, on the device)

- File: `lib/ai/local-answers/av2-r5-gym.ts` exporting `av2R5GymAnswer(question, env)`; cases
  `lib/ai/evals/as/cases-av2-r5-gym.ts` (`AV2_R5_GYM`, 7 intents, 14 English and 14 Dutch questions); test
  `lib/ai/local-answers/av2-r5-gym.test.ts`: every phrasing answered on the Showcase and fresh; Health closed → the Health
  refusal; an action in the question → left alone; the figures from the features' own functions. Checked here: no
  question of the existing corpus (`CORPUS`) is claimed by these answers.
- Questions: your workout status (open, ended — "back after a break" — or none); the movement band this week (workouts
  and other movement, inside, below or above the usual range; never calories); everyday movement this week by name; your
  favourite workouts (with their photo counts); the routines that keep their last weights; how a tired or sore day changes
  the suggestion (how it works; nothing stored); plates on one side (how, and the kept set-up).
- engine.ts wiring (one line, after `av2R4HealthAnswer`, same shape):
  `if (!subject) { const own = av2R5GymAnswer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2R5GymAnswer} from './av2-r5-gym';`.
- Corpus: add `AV2_R5_GYM` to `CORPUS` in `cases.ts` and record `expected.json`.
- AK tool sources: nothing new (`workouts` and `plannedWorkouts` are wired). `lib/ai/local-answers/av2-body.ts`'s streak
  and load answers now pass the status's days (#374), as the page does.

## Review B5J fixes (one commit, with unit tests)

| id | fix |
|---|---|
| B5J-1 (Major) | `realign` jumps away days and a closed status to the day after they end; under an open status it moves nothing (`held`), and the plan's note says "Your status is set, so they stay where they are until you clear it; then you can move them on." (no "I missed some" button). Never a day years ahead. Test with an open, a cleared and a later closed status. |
| B5J-2 (Major, a11y) | "Change it" moves focus to the form's checked choice; Cancel moves it back to "Change it". Spec step added. |
| B5J-3 | A status cleared on its first day is removed (it covered no whole day): today's planned workouts count again, no pause, the load is not "paused"; the toast says so. The unit test's "keeps that day" case is a labelled deliberate change with a stricter replacement. |
| B5J-4 | Sore rounds down in the person's own unit to their own plates (the smallest plate on each side or on the one horn, from the saved set, else 2.5 kg / 5 lb; below the bar 1 kg / 2.5 lb). Tests in kg, lb and on one side. |
| B5J-5 | The line under a tired or sore suggestion says only what changed (`easierLine`), or that a short suggestion stays as it is; the general words (answers) say "up to". The feel spec's line follows. |
| B5J-6 | A workout's photos load only once its row in Your workouts is opened. |

