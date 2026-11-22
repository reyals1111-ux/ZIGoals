# Lane 2 round 2 — body and mind (Rise, Reflectly, Moodnotes, Fitbod): builder registry

Branch `lane2/bodymind-r2`, from `lane2/batch2` at `dddaace8`. Rows: LEDGER "Round 2: rows #223–#255", groups R2 (Rise,
#235–#238), R3 (Reflectly, #230, #231), R4 (Moodnotes, #232, #233), R6 (Fitbod, #239–#241). One section per commit.
Every stored change is listed under "Stored changes" for the lead's TIER 3 (stored formats) label.

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:notify:v1` (existing, device-only, loose) | optional `energy` `{focus?, dip?, windDown?}` (booleans, each `.optional().catch(undefined)`, the object `.optional().catch(undefined)`), and the type name `energy` in `types` (the record already keeps any type name; off by default). Commit `5d44cc3e`. | Kept untouched; an older build has no energy type. |
| `zigoals:workout-places:v1` (NEW, device-only, loose, versioned) | `{version: 1, places[≤ 5]: {id, name (1–40), equipment: string[] (≤ 40), createdAt}, current?}`; an unreadable place is dropped, the others kept; a later build's equipment tag is kept as written. Commit `53db4101`. | New key; older builds never read it. |
| `zigoals:journal:v1` (existing, device-only, loose) | optional `challenges` (boolean) and `challengeDone` (a date), each `.optional().catch(undefined)`. Commit `e3d0b78f`. | Kept untouched; older builds show no challenge. |
| `zigoals:energy:v1` `words` day (existing, loose) | optional `strength` (`little` \| `quite` \| `very`) and `more` (up to two `{energy, pleasantness, word, strength?}`; unreadable items filtered on read). Commit `e3d0b78f`. | Older builds keep reading the one `word` and keep both fields. |
| `zigoals:evening-plan:v1` (existing, device-only, loose) | optional `morning` `{steps[1–6]: {id, label, minutesAfter 0–360}, updatedAt}`, `mornings` (date → ticked ids, ≤ 120 dates), `remind` (step ids, ≤ 14); each `.optional().catch(undefined)`. Commit `5d44cc3e`. | Kept untouched; older builds show the evening plan only. |

## Summary: rows and verdicts

| LEDGER row | verdict | feature |
|---|---|---|
| #235 Rise: energy schedule and its reminders | built; part Carried: the schedule on an outside calendar needs an outside service | 2 |
| #236 Rise: habits at suggested times | built | 2 |
| #237 Rise: naps and their effect | built | 1 |
| #238 Rise: sleep need from your own nights | built | 1 |
| #230 Reflectly: morning motivation and a daily challenge | built | 3 |
| #231 Reflectly: a space to vent | built | 3 |
| #232 Moodnotes: feelings with a strength | built | 4 |
| #233 Moodnotes: thinking traps and the thought checker | built (self-reflection, never treatment) | 5 |
| #234 Moodnotes: self-awareness articles | Carried (the ledger's verdict): needs content made for ZIGoals | — |
| #239 Fitbod: gym profiles and equipment | built | 6 |
| #240 Fitbod: a workout made for today | built (no programme written; only the 48 written exercises; never calories) | 6 |
| #241 Fitbod: replace an exercise | built | 6 |

Specs for the shard lists (none run here): `tests/av2-naps-need.spec.ts`, `tests/av2-curve-reminders.spec.ts`,
`tests/av2-challenge-write-out.spec.ts`, `tests/av2-feelings-strength.spec.ts`, `tests/av2-thought-check.spec.ts`,
`tests/av2-places-suggest-replace.spec.ts`.

TIER 3 commits on this branch: `5d44cc3e` (stored formats: notify `energy`, evening-plan morning steps and reminders),
`e3d0b78f` (stored formats: journal challenge, feeling-word strength and more words), `53db4101` (stored formats: the new
`zigoals:workout-places:v1` key); `0f642e0e` carries TIER 3 (PWA): the notification plan's `energy` kind and one
service-worker composer line.

Seen while testing, not from this branch: `lib/illustrations/pillar-art.test.ts` ("components/journal/journal.css: the
richer cards name theme tokens only") fails at `lane2/batch2` HEAD already (a `#…` in journal.css's header comment matches
its hex check); this branch does not touch `journal.css`.

## Shared to-do for the lead (all features)

- engine.ts wiring (one line, after `av2BodyAnswer`, same shape; av2-body's "suggest a workout" and its other questions
  keep theirs — this file never claims a question av2-body answers):
  `if (!subject) { const own = av2BodymindR2Answer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2BodymindR2Answer} from './av2-bodymind-r2';`.
- Corpus: add `AV2_BODYMIND_R2` (`lib/ai/evals/as/cases-av2-bodymind-r2.ts`) to `CORPUS` in `cases.ts` and record `expected.json`.
- New specs for the shard lists: see the summary above.
- AK tool sources: `workoutPlaces: one(WORKOUT_PLACES)` (feature 6). `eveningPlan` is already there (the body lane's).
- Registries for the new key `zigoals:workout-places:v1`: see feature 6.
- CSS files touched (for the theme sheets): see each feature.

## 1. Naps in the sleep balance and on the energy curve; a sleep need from your own nights — LEDGER #237 built, #238 built

- What: Health → Sleep → "Your last 7 days" → Sleep balance gains a line when a nap fell on a logged day in the last 14
  days: "With your 2 naps counted (55 min, each on the day it ended, marked as naps): about … a night." The nights-only
  balance and the sleep debt stay as they were (pinned figures unchanged); the debt's note now says it is nights only
  (it said "Naps count toward the day they end on", which the code never did). A nap only counts on a day with a logged
  night, so it never stands in for a missing night. Today's naps sit on the energy curve as a "Nap" band, with a small
  estimated lift after each (a groggy dip first after a nap over 40 minutes), named in the key, listed under the curve
  ("Your nap today 13:00–13:25 · 25 min"), in the chart's spoken summary and in Why?. Under "Your sleep goal", "Your sleep
  need, an estimate": the middle of the person's weekend nights over the last 30 days (at least four; else the longer half
  of at least ten nights), rounded to 15 minutes, between 5 and 11 hours, labelled an estimate and not medical advice,
  with "Use 8 h 30 min as my goal" (the existing goal write, the bedtime window kept, with Undo). The empty state says how
  many nights it needs.
- Files: `lib/sleep/naps-need.ts` (new, pure), `lib/energy-curve/curve.ts` (`naps`, `napLiftAt`, summary and Why),
  `components/sleep/energy-curve.tsx`, `components/sleep/energy-curve.css` (the nap band), `components/health/sleep/sleep-view.tsx`
  (the balance line, the debt note, the lazy need card), `components/health/sleep/sleep-need.tsx` (new, its own chunk),
  `components/health/sleep/av2-bodymind-sleep.css` (new).
- Tests: `lib/sleep/av2-naps-need.test.ts`, `lib/ai/local-answers/av2-bodymind-r2.test.ts`; existing `lib/energy-curve/*`
  and `lib/sleep/*` tests unchanged and green. Spec: `tests/av2-naps-need.spec.ts`.
- Stored: nothing (derived; keeping the estimate is the existing goal write).
- Help (EN): **Do naps count in my sleep?** Yes. A nap on a day you also logged a night is added to the sleep balance on
  the day it ended, marked as a nap, beside the nights-only balance. Today's nap also shows on the energy curve with a
  small lift after it, an estimate. **How much sleep do I need?** Health → Sleep → Your sleep goal shows an estimate from
  your own log: the middle of your weekend nights over the last 30 days, when most people wake without an alarm. "Use … as
  my goal" keeps it; nothing changes until you do. It is an estimate, not medical advice.
- What's new: "Sleep: naps count in your balance and lift your energy curve, and an estimate of your own sleep need."
- Answers: "what is my sleep need" / "wat is mijn slaapbehoefte", "how much sleep do I need" / "hoeveel slaap heb ik
  nodig", "do my naps count in my sleep balance" / "tellen mijn dutjes mee in de slaapbalans".
- Showcase hook: none needed (the Showcase's sleep already has a nap two days back and weekend nights: the balance line
  and the estimate show there; no pinned count reads them).
- Device keys / catalogue / export / erase: nothing new. Search (static.ts): "sleep need", "naps" → `/app/health?view=sleep`.
- CSS: `components/sleep/energy-curve.css`, `components/health/sleep/av2-bodymind-sleep.css` (new). Nothing on Today.

## 2. Reminders from the energy curve; morning steps from the wake time and a reminder at each step — LEDGER #235 built (part Carried: the schedule on an outside calendar needs an outside service), #236 built

- What: under the energy curve (Health → Sleep → the energy curve fold), "Remind me from my curve": when the good focus
  window starts, 15 minutes before the likely dip, and when it is time to start winding down (45 minutes before the
  curve's suggested bedtime window), each with today's time, each off until ticked; ticking one switches the new
  "Energy curve and plan steps" notification type on. The times follow each day's curve (today's from today's wake,
  tomorrow's from the usual wake), so they are one-off wakes for today and tomorrow, refused inside quiet hours and said on
  the card as task reminders are. Health → Sleep → Tonight → "Your morning steps": "Choose morning steps" offers five
  written steps (a glass of water, daylight in the first hour, a few minutes of movement, looking at today's plan, the
  first coffee once the grogginess has passed), daylight and coffee ticked by default; each is timed from today's wake
  time (or the usual one, said so), ticked each morning. "Reminders at your steps" lists every evening and morning step
  with "Remind me" (an evening step at its clock time each evening, quiet once ticked; a morning step at its minutes after
  the wake time). The cards say plainly when notifications are off on this device or the type is muted. The notification
  says the app's own words ("Your good focus window starts now (an estimate from your sleep)", "Morning step: Daylight
  outside…"); an own habit used as an evening step is named only where names are allowed; never a sleep figure. Opens
  Health → Sleep.
- Files: `lib/notify/prefs.ts`, `lib/evening-plan/schema.ts` (stored commit), `lib/evening-plan/morning.ts` (new, pure),
  `lib/evening-plan/morning-showcase.ts` (new), `lib/notify/energy-items.ts` (new, pure), `lib/notify/plan.ts` (the
  `energy` kind), `lib/notify/sync.ts` (gathers it when the type is on), `public/sw.js` (one composer line),
  `components/sleep/curve-reminders.tsx` (new, in the energy-curve chunk), `components/sleep/energy-curve.tsx`,
  `components/health/sleep/morning-steps.tsx` (new, its own chunk), `components/health/sleep/sleep-view.tsx`,
  `components/health/sleep/av2-bodymind-sleep.css`.
- Tests: `lib/notify/av2-energy-notify.test.ts`, `lib/notify/av2-bodymind-stored.test.ts` (the export carries the prefs —
  they are exported, not restored, as every notification pref; the evening plan's round trip is `skipIf(!registered)`, as the body lane's, and
  runs once the key is in `DEVICE_KEYS`), `lib/ai/local-answers/av2-bodymind-r2.test.ts`; existing notify, sw, push and
  evening-plan tests unchanged and green. Spec: `tests/av2-curve-reminders.spec.ts`.
- TIER 3 (PWA): the plan's new `energy` kind and the service worker's composer line (`public/sw.js`). Nothing new reaches
  the push Worker beyond wake minutes.
- Help (EN): **Can ZIGoals remind me from my energy curve?** Yes. Open the energy curve in Health → Sleep and tick what you
  want under "Remind me from my curve": when your good focus window starts, 15 minutes before the likely dip, or when it is
  time to wind down. The times move with your wake time each day. **Can I get reminders for morning steps?** Yes. Under
  Tonight, "Choose morning steps" times a few small steps from your wake time — daylight in the first hour, the first
  coffee once the grogginess has passed — and "Reminders at your steps" reminds you at any morning or evening step you
  choose. Notifications must be on for this device (Settings → Notifications).
- What's new: "Sleep: reminders from your energy curve, and morning steps timed from your wake time."
- Answers: "what are my morning steps" / "wat zijn mijn ochtendstappen", "when should I get daylight" / "wanneer moet ik
  daglicht pakken".
- Showcase hook (one line in `lib/showcase-data.ts`, for the lead): change the evening plan line to
  `records[EVENING_PLAN_KEY]=JSON.stringify(withShowcaseMorning(showcaseEvening(day), day));` with
  `import {withShowcaseMorning} from './evening-plan/morning-showcase';` (daylight and coffee, daylight ticked today; no
  reminder: the Showcase plans no notification). No pinned count reads it.
- Settings → Notifications gains one switch ("Energy curve and plan steps", off by default) — the card lists every type.
- Device keys / catalogue / export / erase: nothing new (both records are registered already). Search (static.ts):
  "morning steps", "energy reminders" → `/app/health?view=sleep`.
- CSS: `components/health/sleep/av2-bodymind-sleep.css`. Nothing on Today.

## 3. A small daily challenge beside the affirmation; "Write it out", a page that is never saved — LEDGER #230 built, #231 built

- What: Journal → Privacy → "Show a small daily challenge on Today, with Done and Another one (off by default; nothing is
  counted)". When on, Today's journal card ("How was today?") shows under the affirmation one small challenge a day from
  28 written in the repository in English and Dutch ("Send someone a kind message.", "Be outside for ten minutes."), in
  the daily question's language, with "Done" (kept as today's own mark only: no count, streak or score; tapping again
  unmarks it) and "Another one". Off, nothing renders (no Tab stop on Today). Journal → Write → "Write it out · a page that
  is never saved" (a fold, its own chunk): a page whose words live only in the page's memory — no draft, no storage,
  nothing sent; "Let it go" fades the words (only when motion is allowed: reduced motion and Motion Off are respected),
  clears them and says one calm closing line ("It is out of your head now. Nothing was kept."), focus staying on the page;
  "Keep as an entry" is the only way it is stored, as an ordinary journal entry (template id `write-it-out`). EN and NL.
- Files: `lib/journal/schema.ts` (stored commit), `lib/journal/challenges.ts` (new), `lib/journal/write-it-out.ts` (new),
  `components/journal/today-challenge.tsx` (new, lazy), `components/journal/today-journal-card.tsx` (one lazy line),
  `components/journal/today-affirmation.css`, `components/journal/write-it-out.tsx` + `write-it-out.css` (new, lazy),
  `components/journal/journal-page.tsx` (the switch, the fold).
- Tests: `lib/journal/av2-challenges.test.ts`, `lib/journal/av2-challenge-stored.test.ts` (the fields' round trip),
  `lib/ai/local-answers/av2-bodymind-r2.test.ts`. Spec: `tests/av2-challenge-write-out.spec.ts` (also checks the typed words
  never reach localStorage or sessionStorage).
- Stored: `journal.challenges`, `journal.challengeDone` (see Stored changes). Write it out stores nothing.
- Help (EN): **Can Today give me a small challenge?** Yes, if you want one: Journal → Privacy → Show a small daily
  challenge on Today. One small, kind thing a day beside the affirmation, with Done and Another one. Nothing is counted
  and a day without one is fine. **Is there a page I can write on without saving it?** Yes: Journal → Write → Write it
  out. What you type there is never saved. Let it go clears it; Keep as an entry saves it as a normal journal entry.
- What's new: "Journal: a small daily challenge on Today, and Write it out, a page that is never saved."
- Answers: "what is today's challenge" / "wat is de uitdaging van vandaag", "where can I vent" / "waar kan ik mijn hart
  luchten".
- Showcase: off (it would add Tab stops to Showcase Today, pinned at ≤ 90); Write it out holds nothing to show.
- **Always visible on Today: nothing by default**; when switched on, one line and two buttons on the journal card (a For
  you card), not in Today's top part.
- Device keys / catalogue / export / erase: nothing new (inside `zigoals:journal:v1`). Search (static.ts): "daily
  challenge", "write it out", "vent" → `/app/journal`.
- CSS: `components/journal/today-affirmation.css`, `components/journal/write-it-out.css` (new).

## 4. Feelings with a strength: up to three words a day — LEDGER #232 built

- What: wherever the feeling word fold opens (the Journal's Write and ZIGi's check-in, after today's energy or mood), once
  the day's word is chosen the grid shows "Today's words and how strong each feels": each word with "a little", "quite"
  and "very" (one tap sets it, the same tap clears it), and "Add another word": the next word tapped (or an own word added)
  joins the day instead of replacing it, up to three words, each removable. Changing the day's word keeps the others. The
  fold's line reads "Feeling: calm (quite) · tired (a little)". The day's word stays in `word`, so every older reader
  (the week line, the year in pixels, older builds) keeps reading it.
- Files: `lib/mood-words/schema.ts` (stored commit), `lib/mood-words/more.ts` (new, pure),
  `components/mood-words/mood-words-grid.tsx`, `components/mood-words/mood-words-fold.tsx`, `components/mood-words/mood-words.css`.
- Tests: `lib/mood-words/av2-more.test.ts`, `lib/mood-words/av2-more-stored.test.ts` (round trip),
  `lib/ai/local-answers/av2-bodymind-r2.test.ts`; existing mood-words and check-in tests unchanged and green. Spec:
  `tests/av2-feelings-strength.spec.ts`.
- Stored: `zigoals:energy:v1` `words` day `strength`, `more` (see Stored changes).
- Help (EN): **Can I pick more than one feeling?** Yes. After choosing a feeling word, tap "Add another word" to add up to
  three for the day, and set how strong each feels: a little, quite or very.
- What's new: "Feelings: up to three words a day, each with how strong it feels."
- Answers: "what feelings did I log today" / "welke gevoelens heb ik vandaag", "which feeling words do I have" / "welke
  gevoelswoorden heb ik".
- Showcase hook: none (the Showcase has no feeling words; adding some would change what the check-in shows on Today).
- Device keys / catalogue / export / erase: nothing new (inside `zigoals:energy:v1`).
- CSS: `components/mood-words/mood-words.css`. Nothing new always visible on Today (the strengths show only inside the open
  grid).

## 5. Thinking traps and the thought check — LEDGER #233 built (#234 self-awareness articles stays Carried: needs content made for ZIGoals)

- What: Journal → Write → "Check a thought · thinking traps, as self-reflection" (a fold, its own chunk). Four short
  parts: 1. What happened? 2. What went through your mind? 3. Do you notice a thinking trap? — twelve written in the
  repository in English and Dutch (All or nothing, Expecting the worst, Always and never, Mind reading, Fortune telling,
  Feelings as facts, Shoulds and musts, Labelling, Taking all the blame, Blaming others, Only the bad, That does not
  count), each with one plain line; the checker points at the traps whose usual words appear in the thought ("Some words
  in your thought often go with: …. You decide whether that fits.") and never ticks one; 4. Another way to see it, with
  the chosen traps' own questions as prompts ("Can you think of a time it went differently?"). "Save as an entry" keeps it
  as an ordinary journal entry (template id `thought-check`, four headed lines, in the daily question's language); an empty
  thought is asked for with focus on it. Worded as self-reflection throughout, never a diagnosis, a treatment or medical
  advice, with one gentle line: talking to someone you trust or a health professional can help. Nothing is stored until
  Save.
- Files: `lib/journal/thinking-traps.ts` (new, pure), `components/journal/thought-check.tsx` + `thought-check.css` (new,
  lazy), `components/journal/journal-page.tsx` (the fold).
- Tests: `lib/journal/av2-thinking-traps.test.ts`, `lib/ai/local-answers/av2-bodymind-r2.test.ts`. Spec:
  `tests/av2-thought-check.spec.ts`.
- Stored: nothing new (an ordinary entry in `zigoals:journal:v1`, with the existing optional `template`).
- Note for the owner: worded as self-reflection, never as treatment (the no-medical-advice rule), as the ledger asks.
- Help (EN): **What is "Check a thought"?** A short writing exercise in Journal → Write: what happened, the thought, any
  thinking traps that seem to fit (such as "Expecting the worst" or "Always and never"), and another way to see it. It is
  saved as a normal journal entry. It is for self-reflection, not a diagnosis or a treatment.
- What's new: "Journal: Check a thought, with twelve thinking traps in English and Dutch."
- Answers: "what are thinking traps" / "wat zijn denkvalkuilen" (with the person's own count and the traps noticed most,
  when the journal is shared with the answer).
- Showcase hook: none (an example would add a journal entry, which journal counts read).
- Device keys / catalogue / export / erase: nothing new. Search (static.ts): "thinking traps", "thought check",
  "denkvalkuilen" → `/app/journal`.
- CSS: `components/journal/thought-check.css` (new). Nothing on Today.

## 6. Fitbod gym days: places and equipment, a workout made for today, replace an exercise — LEDGER #239 built, #240 built, #241 built

- What (#239): every built-in exercise has an equipment tag — one or more ways to do it from fifteen pieces (barbell,
  dumbbells, kettlebell, bench, cable, machines, pull-up bar, dip bars, bands, bike, rower, elliptical or treadmill, pool,
  jump rope, foam roller; the floor and body weight are always there; own exercises have no tag and show everywhere).
  Health → Workouts → Start a workout → "Places and equipment" (a fold, its own chunk): up to five places, from a
  ready-made set (Full gym, Home with dumbbells, Body weight only) or empty, each with ticked equipment, renamed or removed
  (with Undo), and one "Place for now". The exercise picker has a "Place" choice (the place for now unless changed) and says
  "Showing what Home has, and your own exercises."; the library has "Only what Home has" and lists what each exercise needs.
- What (#240): "Suggest a workout for today, from your own sets" (a fold, its own chunk): choose where and how long (30, 45
  or 60 minutes); four to six built-in exercises for the freshest muscle groups (the freshness estimate with the person's
  own recovery days), only what the place allows, preferring exercises already in the log; each with sets from the
  person's own last sessions through a progression rule — the routine's own rule where the exercise is in one, else 8 to
  12 reps then +2.5 kg — and why ("One more rep than on Nov 16 (8 to 12 reps, then +2.5 kg)."); an exercise new to the log
  gets reps only ("choose a weight you could lift a few more times"). Labelled "Suggestion … not a programme"; says when
  everything is still recovering. Leave out or Replace any exercise, then "Start this workout" (an ordinary workout,
  still editable). No programme is written and nothing is invented (only the 48 written exercises); never calories.
- What (#241): "Replace" on each exercise of a running workout (and on each suggested one): similar built-in exercises —
  the same main muscle, the same kind of sets (in a running workout, so the typed sets fit), what the place for now has,
  not already in the workout — ranked by shared muscles and the person's own log, each saying what it works and "in your
  log". Choosing one swaps it in keeping the sets typed so far, the note and the rest time, with Undo; focus returns to
  the exercise's Replace button.
- Files: `lib/workouts/places-schema.ts` (stored commit), `lib/workouts/equipment.ts`, `lib/workouts/places.ts`,
  `lib/workouts/suggest.ts`, `lib/workouts/replace.ts`, `lib/workouts/replace-entry.ts` (new, pure),
  `components/health/workouts/places.tsx`, `suggest-workout.tsx`, `replace-exercise.tsx` (new, each lazy),
  `components/health/workouts/av2-bodymind-workouts.css` (new), `components/health/workouts/workouts-view.tsx` (the folds,
  the picker's place, Replace), `components/health/workouts/exercise-library.tsx` (the place filter, what it needs).
- Tests: `lib/workouts/av2-fitbod.test.ts`, `lib/workouts/av2-places-stored.test.ts`, `lib/ai/local-answers/av2-bodymind-r2.test.ts`;
  existing workouts tests unchanged and green. Spec: `tests/av2-places-suggest-replace.spec.ts`.
- Stored: `zigoals:workout-places:v1` (NEW key; see Stored changes). The suggestion stores nothing until started (an
  ordinary workout in `zigoals:workouts:v1`).
- **Registries the lead needs for `zigoals:workout-places:v1`** (personal, Health, "Workout places and equipment"):
  device-key list (`lib/av-device-keys.ts`), data catalogue (`lib/data-health/catalog.ts`, area Health), Export everything
  `DEVICE_KEYS` (`workoutPlaces`), the restore plan (`dev('workoutPlaces', 'Workout places and equipment', 'Health',
  WORKOUT_PLACES)`), erase (`lib/erase-everything.ts`). Until then `lib/erase-coverage.test.ts` ("every key is in Export
  everything and the data catalog") names the key, by design; once placed, the skipped round trip in
  `lib/workouts/av2-places-stored.test.ts` runs. AK tool sources: `workoutPlaces: one(WORKOUT_PLACES)` in
  `lib/ai/tools/ak-sources.ts` and `AkToolSources`, so the answers filter by the place (they read any place until then).
- Route weight: the workouts view's first chunk gains only `lib/workouts/equipment.ts` (constants), the places schema, the
  small write `replace-entry.ts` and the fold markup; the written how-tos load only with Replace. Not measured here.
- Help (EN): **Can ZIGoals show only exercises I can do where I am?** Yes. In Health → Workouts, open "Places and
  equipment", add a place (home, the gym, a hotel) and tick what it has. Choose it as your place for now: the exercise
  list and the library then show only what you can do there. **Can ZIGoals suggest a workout?** Yes. "Suggest a workout
  for today" picks four to six exercises for your freshest muscle groups, with the equipment where you are and a length
  you choose, and fills in sets from your own last sessions. It is a suggestion: leave out or replace anything, then
  start it. **Can I swap an exercise?** Yes. Replace on an exercise offers similar ones for the same muscles with your
  equipment, and keeps the sets you already typed.
- What's new: "Workouts: places with their equipment, a suggested workout for today, and Replace an exercise."
- Answers: "what should I train today" / "wat zal ik vandaag trainen", "what equipment does the bench press need" / "welk
  materiaal heb ik nodig voor bankdrukken", "what can I do instead of the bench press" / "wat kan ik doen in plaats van
  bankdrukken".
- Showcase hook: none needed (the Showcase's log makes a suggestion; a Showcase place is not needed and would add a
  record no pinned count reads — offered if wanted).
- CSS: `components/health/workouts/av2-bodymind-workouts.css` (new). Nothing on Today.
