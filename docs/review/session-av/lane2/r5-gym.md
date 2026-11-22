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

