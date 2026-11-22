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

