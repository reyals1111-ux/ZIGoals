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
