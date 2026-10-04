# A2 · Quick-add line

## Purpose
"drank 2 glasses of water", "weight 78.4", "ran 5k in 28 min", "+2 pushups", "meditated": one line typed into Quick add becomes the right record in the right journal. ZIGoals always shows what it understood ("Will save: Water · 2 glasses (500 mL) · today") before anything is saved, and when it does not understand, it says so kindly with three examples.

## Owner principles applied
Honest numbers (the preview is exact; a glass is a stated 250 mL; steps are never derived from a distance; nothing is saved without "Save"). Never a chore (one field, Enter, Save). Private by design (parsing runs on the device; the records are ordinary Health and Habit records; nothing is stored about the typed text). Consumer first (English phrases, the units the person already uses in Health). Owner decision P6: English only now, with the grammar as a locale table so a second language is a second table.

## Scope in PR 3
- `lib/quick-add/parse.ts` with `parse(text, locale, context)` and `lib/quick-add/locales/en.ts`; the preview sentence; the save mapping onto existing mutators.
- The line field in the Quick add dialog on every page (desktop dialog and the phone sheet, `components/quick-add.tsx`); Help entry.

Out of scope: other locales, free-text notes, dates other than today and yesterday, meals and foods ("ate an apple" needs the library and is answered with the Health link), goals and contributions (the existing Quick add actions keep those), voice input.

## Data
No new device key. Writes go through existing mutators only:
| Kind | Mutator | Record |
|---|---|---|
| water | `addWater(health, {id: newHealthId(), date, amountMilli: mL × 1000, unit: "ml"}, at)` (`lib/health-daily.ts:135`) | a water entry in mL (the journal's own unit stays the display preference) |
| weight | `saveWeight(health, {id, date, grams}, at)` (`lib/health.ts:208`); grams from `bodyWeightGrams(text, unit)` (`health-daily.ts:164`) | the day's reading (saving again corrects it, as the Weight view says) |
| steps | `saveActivity(health, {id, date, name: "Walk", steps, minutes: 0}, at)` (`lib/health.ts:214`) | an activity record |
| activity | `saveActivity(…, {name: "Run" | "Walk" | "Cycle" | "Swim", steps: 0, minutes})`; the distance goes into the name ("Run · 5 km") | an activity record; steps are never inferred |
| sleep | `saveActivity(…, {name: "Sleep", steps: 0, minutes})` | an activity record named Sleep (plan 3.10) |
| exercise | `changeCount(health, counterId, date, +n)` (`lib/health-counters.ts:47`) | a counter day |
| habit | `logHabitValue(habits, habitId, date, value, {mode: "add"})` (`lib/habits.ts:287`) | an ordinary logged entry |
Days: Health records use `healthDay(dailyData(health).preferences.timezone, now)` (`lib/health-daily.ts:157`); habit entries use `habitCalendarDay(habits, now)` (`lib/habits.ts:120`); "yesterday" is `addLocalDays(day, -1)` of the respective day. The parser itself never reads a clock.

## Engine (`lib/quick-add/parse.ts`, pure)
```
parse(text: string, locale: "en", context: QuickAddContext): QuickAddResult
QuickAddContext = { habits: {id, title, unit: string, kind: "boolean" | "count" | "duration" | "quantity" | "custom", target: number}[],
                    counters: {id, name}[], waterUnit: "ml" | "fl-oz-us", weightUnit: "kg" | "lb" }
QuickAddResult =
  | {kind: "water", millilitres: number, shown: {amount: number, unit: "glasses" | "mL" | "L" | "US fl oz"}, day}
  | {kind: "weight", grams: number, shown: {amount: number, unit: "kg" | "lb"}, day}
  | {kind: "steps", steps: number, day}
  | {kind: "activity", name: "Run" | "Walk" | "Cycle" | "Swim", minutes: number, distanceKm?: number, day}
  | {kind: "sleep", minutes: number, day}
  | {kind: "exercise", counterId, name, count: number, day}
  | {kind: "habit", habitId, title, value: number, unit: string, day}
  | {kind: "ambiguous", choices: QuickAddResult[]}
  | {kind: "needs-more", hint: string}
  | {kind: "unknown", examples: [string, string, string]}
day: "today" | "yesterday"
```
The signature of plan 3.10 is `parse(text, locale)`; `context` is the one addition, because habit titles and counter names are the person's own words and are needed to match them. The locale table (`locales/en.ts`, exported as `const en: QuickAddLocale`) holds: `numbers` (one … twenty, half → 0.5, a/an → 1, "a couple" → 2), `units` (glass/glasses/cup/cups → 250 mL each; ml, mL, millilitre(s), milliliter(s); l, L, litre(s), liter(s); oz, fl oz, floz → US fl oz; kg, kilo(s), kilogram(s); lb, lbs, pound(s); step(s); km, kilometre(s), kilometer(s); mi, mile(s); min, mins, minute(s); h, hr, hrs, hour(s)), `verbs` (water: drank, drink, had, water; weight: weight, weigh, weighed, weighs; steps: walked, walk, steps; run: ran, run, jog, jogged, jogging; cycle: cycled, cycle, biked, bike, rode; swim: swam, swim; sleep: slept, sleep), `dayWords` (today, yesterday), `stems` (meditated → meditate, walked → walk, exercised → exercise, journaled → journal, stretched → stretch, studied → study, read → read, practised/practiced → practise/practice), `examples` (the three strings for unknown input). Numbers accept a decimal point or comma through `normalizeDecimalInput` (`lib/decimal-input.ts:7`: "78,4" is 78.4; "1,234" is refused as unclear).
Resolution order: (1) a day word is removed and remembered; (2) an explicit water, weight, steps, distance, sleep phrase by its verb or unit; (3) `+N name` / `N name` / `did N name` against the counters (names normalised: lower-case, hyphens and spaces removed, trailing s dropped: "pushups" = "Push-ups"); (4) the remaining words against habit titles (normalised the same way plus `stems`; a match is a whole-title match or the title's first word); (5) `unknown`. Several habits or counters matching → `ambiguous` with the choices. A distance without minutes → `needs-more` ("Add the minutes, for example ran 5k in 28 min"). A number without a unit after a water verb → the water unit from `context.waterUnit`; after a weight verb → `context.weightUnit`. A habit value without a number → 1 (count or boolean: the target for boolean), a duration habit takes minutes/hours words, a quantity habit its own unit word. "5k" is 5,000 after a steps word and 5 km after a run/walk/cycle verb; "8k steps" → 8,000.
Edge cases: empty or whitespace → `unknown`; more than 200 characters → `unknown`; a value above a journal's limit (`waterSchema` 10,000,000 milli, weight 1,000 kg, steps 1,000,000, minutes 1,440, counter 100,000, habit 1e9) → `needs-more` with "That number is outside what the journal keeps."; "yesterday" for a habit not scheduled yesterday → the save fails with the habit's own message ("Choose a scheduled, active day up to today."), shown as "That habit wasn't scheduled yesterday."

## UI
### The Quick add dialog (`components/quick-add.tsx`; desktop dialog and the phone sheet, `components/phone/phone-sheets.css`)
Above the existing actions: a `form` with label "Type a line" (visible, 15 px), text input (16 px, `autoComplete="off"`, `enterKeyHint="go"`, placeholder "drank 2 glasses of water"), and a quiet button "Preview". Enter or Preview shows the preview card under the field:
- understood: "Will save: {sentence} · {today | yesterday}" in 16 px, with the exact forms "Water · 2 glasses (500 mL)", "Weight · 78.4 kg", "Walk · 8,000 steps", "Run · 5 km · 28 min", "Sleep · 7 h 30 min", "Push-ups · +2 reps", "Meditate · +1 time"; fine print "A glass is counted as 250 mL." when glasses were used; buttons "Save" (primary, 44 px) and "Clear" (quiet). Nothing is saved before Save.
- ambiguous: "Did you mean…" with one button per choice ("Meditate (habit)", "Meditation minutes (habit)").
- needs-more: the hint in 15 px.
- unknown: "I didn't understand that yet. Try: drank 2 glasses of water · weight 78.4 · ran 5k in 28 min" (`role="status"`).
After Save: a `role="status"` line "Saved: Water · 500 mL · today" (and for a habit "Saved: Meditate · 1 of 10 minutes today"), the field clears and keeps focus for the next line; the dialog stays open. Errors from the store use `saveFailureMessage`; a refusal by a mutator shows its message in plain words.
The field is reachable on every page: the desktop sidebar's Quick add, the Today hero's, and the phone top bar's all open the same dialog (`tests/logo-quickadd-goals-header.spec.ts:10`).
### Phone, desktop, tablet
Phone first: the sheet already rises from the bottom; the field is the first focusable (`data-sheet-focus`), 16 px so Safari does not zoom. Authorized desktop differences: the field and preview inside the dialog (README item 6, including the `dialog-quick-add` capture).
### Motion, keyboard, screen reader
No new motion. Enter previews, a second Enter on the Save button saves; Escape closes the dialog as today; the preview is `aria-live="polite"`; the three example phrases are text, not buttons.

## Showcase data
None of its own: in Showcase the line works against the Showcase habits and counters on the tab's session copy (for example "meditated" matches "Meditate"), and the Health day is the Showcase day.

## Help entry (`help-quick-add`)
**What can I type into Quick add?** A short English line about water, weight, steps, a run, walk, cycle or swim with its minutes, sleep, one of your exercise counters, or a habit by its name: "drank 2 glasses of water", "weight 78.4", "walked 8,000 steps", "ran 5k in 28 min", "slept 7h", "+2 pushups", "meditated". ZIGoals shows what it will save before you tap Save, and tells you when it did not understand. Add "yesterday" to log for yesterday.

## Tests
Unit (`lib/quick-add/parse.test.ts`): the grammar table below, run with a context of habits "Meditate" (count, times, 10), "Read" (duration, minutes, 30), "Drink water" (quantity, glasses, 8), "Exercise" (duration, minutes, 30), counters "Push-ups", "Squats", water unit mL, weight unit kg unless stated. Expected values are the result fields; `→ unknown` means `kind: "unknown"`.
| # | Phrase | Expected |
|---|---|---|
| 1 | `drank 2 glasses of water` | water 500 mL, shown 2 glasses, today |
| 2 | `2 glasses of water` | water 500 |
| 3 | `a glass of water` | water 250, shown 1 glass |
| 4 | `drank 500ml` | water 500, shown 500 mL |
| 5 | `drank 500 ml of water` | water 500 |
| 6 | `water 1.5l` | water 1500, shown 1.5 L |
| 7 | `water 0,5 l` | water 500 |
| 8 | `had 8 oz of water` | water 236.588, shown 8 US fl oz |
| 9 | `drank water` | water 250, shown 1 glass |
| 10 | `drank 2 cups water` | water 500, shown 2 glasses |
| 11 | `drank 3 glasses yesterday` | water 750, yesterday |
| 12 | `water 400` (unit mL) | water 400 |
| 13 | `water 12` (unit fl oz) | water 354.882, shown 12 US fl oz |
| 14 | `half a glass of water` | water 125 |
| 15 | `drank twenty glasses` | water 5000 |
| 16 | `weight 78.4` | weight 78,400 g, shown 78.4 kg |
| 17 | `78,4 kg` | weight 78,400 g |
| 18 | `weighed 78.4kg` | weight 78,400 g |
| 19 | `weight 172 lb` | weight 78,018 g, shown 172 lb |
| 20 | `172 lbs` | weight 78,018 g |
| 21 | `weight 80` (unit lb) | weight 36,287 g, shown 80 lb |
| 22 | `weigh 1500 kg` | needs-more (outside the journal) |
| 23 | `weight yesterday 78` | weight 78,000 g, yesterday |
| 24 | `8000 steps` | steps 8000 |
| 25 | `walked 8000 steps` | steps 8000 |
| 26 | `8k steps` | steps 8000 |
| 27 | `walked 12,345 steps` | steps 12345 |
| 28 | `steps 6500 yesterday` | steps 6500, yesterday |
| 29 | `2,000,000 steps` | needs-more |
| 30 | `ran 5k in 28 min` | activity Run, 28 min, 5 km |
| 31 | `ran 5 km in 28 minutes` | activity Run, 28, 5 |
| 32 | `run 10km 55min` | activity Run, 55, 10 |
| 33 | `ran 30 min` | activity Run, 30 |
| 34 | `jogged for 20 minutes` | activity Run, 20 |
| 35 | `ran 5k` | needs-more (add the minutes) |
| 36 | `cycled 40 min` | activity Cycle, 40 |
| 37 | `biked 15 km in 45 min` | activity Cycle, 45, 15 |
| 38 | `rode 1h` | activity Cycle, 60 |
| 39 | `walked 30 min` | activity Walk, 30 |
| 40 | `walked 3 miles in 50 min` | activity Walk, 50, 4.828 km |
| 41 | `swam 45 minutes` | activity Swim, 45 |
| 42 | `ran 1500 min` | needs-more (above 1,440) |
| 43 | `slept 7h` | sleep 420 |
| 44 | `slept 7.5 hours` | sleep 450 |
| 45 | `slept 7h30` | sleep 450 |
| 46 | `sleep 8 hours yesterday` | sleep 480, yesterday |
| 47 | `slept 6 h 45 min` | sleep 405 |
| 48 | `slept 25 hours` | needs-more |
| 49 | `+2 pushups` | exercise Push-ups, +2 |
| 50 | `20 push-ups` | exercise Push-ups, +20 |
| 51 | `did 10 squats` | exercise Squats, +10 |
| 52 | `pushups` | exercise Push-ups, +1 |
| 53 | `+15 Push ups` | exercise Push-ups, +15 |
| 54 | `200000 squats` | needs-more |
| 55 | `meditated` | habit Meditate, +1 time |
| 56 | `meditate` | habit Meditate, +1 |
| 57 | `meditated 2 times` | habit Meditate, +2 |
| 58 | `+3 meditate` | habit Meditate, +3 |
| 59 | `read 20 min` | habit Read, +20 minutes |
| 60 | `read 1 hour` | habit Read, +60 minutes |
| 61 | `read` | habit Read, +1 minute (no number: 1 in the unit) |
| 62 | `exercised 45 minutes` | habit Exercise, +45 |
| 63 | `drink water 2 glasses` | ambiguous: water 500 mL or habit Drink water +2 glasses |
| 64 | `meditated yesterday` | habit Meditate, +1, yesterday |
| 65 | `Meditated.` | habit Meditate, +1 (punctuation ignored) |
| 66 | `MEDITATE 5` | habit Meditate, +5 |
| 67 | `read 2000000000 min` | needs-more |
| 68 | `` (empty) | unknown |
| 69 | `   ` | unknown |
| 70 | `hello` | unknown |
| 71 | `ate an apple` | unknown |
| 72 | `bought 100 ZIG` | unknown (Quick add's Contribution action covers it) |
| 73 | `5` | unknown |
| 74 | `kg` | unknown |
| 75 | `drank` | water 250 (a glass) |
| 76 | `water` | water 250 |
| 77 | `ran` | needs-more (add the minutes) |
| 78 | `weight` | unknown |
| 79 | `steps` | unknown |
| 80 | `slept` | unknown |
| 81 | `drank 2 glasses of water and ran 5k` | unknown (one record per line) |
| 82 | `glass of water 2` | water 500 |
| 83 | `two glasses water` | water 500 |
| 84 | `a couple of glasses of water` | water 500 |
| 85 | `1e3 steps` | unknown (no exponent notation) |
| 86 | `-5 pushups` | unknown (no negatives) |
| 87 | `0 steps` | needs-more (a number above zero) |
| 88 | a 201-character line | unknown |
| 89 | `walked 8000 steps in 70 min` | steps 8000 with 70 min (one Walk record with both) |
| 90 | `yesterday` | unknown |
Also: the `en` table has no duplicate keys (a test over the object); every `examples` phrase parses to a known kind; the forbidden-words guard of M3 is not needed here, but the preview sentences never contain "great" or "well done".
Save mapping (`lib/quick-add/save.test.ts`): each kind writes exactly the record in the Data table, on the right journal day: Health zone `Pacific/Kiritimati` and Habits zone `Etc/GMT+12` at `2026-10-01T11:30:00Z` → water on 2026-10-02, a habit entry on 2026-09-30; "yesterday" one day earlier in each; the eleven host zones give the same results; DST day 2026-10-25 (Europe/Brussels) is one day; a water save in Showcase writes to the tab's session copy.
Browser (`tests/quick-add-line.spec.ts`, desktop and mobile):
- Today → "+ Quick add" → type `drank 2 glasses of water`, Enter → "Will save: Water · 2 glasses (500 mL) · today"; the Health key is unchanged; "Save" → "Saved: Water · 500 mL · today", the key holds a 500,000 milli water entry dated today; Health's water journal shows "500 mL recorded".
- `hello` → the unknown line with the three examples; nothing written.
- A habit "Meditate" exists → `meditated` → "Will save: Meditate · +1 time · today" → Save → the Habits record has today's entry count 1; the Today habits list shows 1 / 10.
- Phone top bar's Quick add at 390×844: the field is focused first, 16 px, no zoom; Save ≥ 44 px; the sheet stays open after Save.
- The desktop freeze capture `dialog-quick-add` differs only by the new field and its label.

## Risks and open questions
- English stems are a short table, not a stemmer; a habit titled in another language is matched only by its exact title. Documented in Help ("by its name").
- Open: whether a water line should respect the person's water unit for the *stored* unit (`fl-oz-us`) rather than converting to mL. Recommendation: store mL (the stored amount is exact; the journal already converts for display and keeps "original quantities" only for typed entries).
