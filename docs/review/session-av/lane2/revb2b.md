# Lane 2 batch 2: fresh-review B fixes (slug `revb2b`, branch `lane2/revb2b`)

The findings: fresh review B of lane2/batch2 @ 23eaf493, numbered as there. B2B-1 and B2B-2 are the lead's (fixed
there). One commit per finding. No stored format changes in any of them; no new key; nothing new on Today.

## B2B-3 Major: the BMI answer gave the BMI and height while "Hide calories and weight" was on

- Verdict: fixed.
- Fix: `bmiAnswer` (lib/ai/local-answers/av2-body.ts) reads the device switch (`bodyFiguresHidden()`, the same read
  engine.ts uses for `withHiddenFigures`) and, with it on, says neither the BMI, the height nor the reading's day: "Your
  BMI is hidden with your weight figures on this device; Health → “Show calories and weight” brings it back." / "Je BMI
  is verborgen, samen met je gewichtscijfers op dit apparaat; Health → “Show calories and weight” zet hem terug." A
  missing height or weight still says what is missing (no figure in those lines). As a safety net for any other answer,
  `hideBodyFigures` (av2-hide-figures.ts) now also hides a number right after "BMI" ("BMI 24.3", "BMI is 24,3", "BMI:
  22.1"), as the page hides the same figure (`data-body-figure`).
- Tests: `lib/ai/local-answers/av2-body.test.ts` → "BMI under hidden figures (review b2b #3)": EN and NL with the switch
  on (no digit at all in the reply), off (the number as before), the missing-height line, and the generic BMI hiding in
  EN, NL and on a lifting line. av2-hide-figures and revb1-hide-figures tests still pass unchanged.
- Spec: none (a chat answer only; the page's own BMI is already hidden by `data-body-figure`, av2-bmi-milestones.spec).
- Help (EN), one sentence for the hide-figures answer (av-hide-figures): "With them hidden, NOVA and ZIGi do not say
  your BMI either."
- What's new: none needed (a fix).

## B2B-4 Major: net carbs disagreed between the Carbs tile, Targets → Macro mode and ZIGi

- Verdict: fixed.
- The one rule (new pure module `apps/web/lib/health-aa/net-carbs-day.ts`: `netCarbsOfDay(diary, date, sugarAlcohols)`
  and `netCarbsWords(n, lang)`): fiber is taken off only when every entry of the day carries a fiber value (a part-known
  fiber total would be a guess); the sugar alcohols set per library food are always taken off, scaled by the servings
  eaten; the words name what was taken off ("carbs minus fiber and 10 g sugar alcohols", "after fiber and 10 g sugar
  alcohols", "plain carbs" when nothing was), and when fiber was not taken off they say so: "Fiber is not taken off: 2 of
  3 entries carry it." (NL: "Vezels zijn er niet af gehaald: 2 van 3 items hebben ze."). `netCarbs` in macro-mode.ts is
  unchanged (the new module builds on it).
- Used by: the Carbs tile (`HealthSummary` in components/health/health-app.tsx: the net line shows whenever something
  was taken off, worded by what was; the fiber note shows beside it instead of the old silent switch), Targets → Macro
  mode (components/health/macro-mode-panel.tsx, lazy: now reads the sugar alcohols through `useDayTargets`), and
  NOVA/ZIGi (`netCarbsAnswer` in lib/ai/local-answers/av2-food.ts, same sentences as before, now from the shared words).
- Health's first chunk: the tile now imports the small pure module in place of `netCarbs` + `sugarAlcoholMg` (both
  already in that chunk through it); nothing new is lazy-loaded into it.
- Tests: `apps/web/lib/health-aa/net-carbs-day.test.ts` (the review's day, servings scaling and recipes, fiber missing on
  one entry, plain carbs and unknown, EN and NL words, ZIGi's answer from the function in EN and NL, and both components
  reading the one rule). health-aa, av2-weekdays and av2-food tests pass unchanged.
- Spec (lead runs): `apps/web/tests/av2-revb2b-net-carbs.spec.ts` (tile and Macro mode give 94 g naming fiber and 10 g
  sugar alcohols, three themes, 390/1440, axe, 320; then an entry without fiber: both say so and still take off the
  sugar alcohols). health-aa.spec's "Net carbs today: 222 g" is unchanged (no sugar alcohols there).
- Help (EN), to add to "How are net carbs counted?" (av2-food-how-are-net-carbs-counted): "The Carbs tile, Targets and
  ZIGi count them the same way, and say so when fiber could not be taken off."
- What's new: none needed (a fix).

## B2B-5 Major: "Skip this day" in the week grid overwrote the day's note

- Verdict: fixed.
- Fix: `applyDayChoice` (apps/web/lib/habits-order/week-day-edit.ts) skips with the day's own note, as the History's
  skip does (habit-history.tsx passes `day.note`); the words "Skipped from the week" are written only on a day that had
  no note. Undo (`restoreHabitEntry` with the entry read before) already put back the whole entry, note included; now
  the note is never lost in the first place. No stored change (the same `note` field, the same values).
- Tests: `apps/web/lib/habits-order/week-day-edit.test.ts` → "a skip from the week keeps the day's note (review b2b #5)":
  a noted, logged day is skipped with its note unchanged, and Undo restores count, disposition and note; a day with no
  note gets the skip words, and a second skip keeps them.
- Spec (lead runs): `apps/web/tests/av2-revb2b-week-skip-note.spec.ts`.
- Seen in passing, not changed (outside this finding): Checklist's skip (components/checklist/list-extras.tsx:90, "Skipped
  from the Checklist") writes its words over a day's note the same way.
- Help / What's new: none needed (a fix).

## B2B-6 Minor: four daily challenges needed another person

- Verdict: fixed (the list now keeps its own rule).
- Fix: in apps/web/lib/journal/challenges.ts the four challenges that needed someone else are replaced, in the same
  places in English and Dutch (so a day's challenge and its Dutch line stay paired; 28 in each): "Smile at yourself in
  the mirror." / "Glimlach naar jezelf in de spiegel."; "Write down one thing you are thankful for today." / "Schrijf één
  ding op waar je vandaag dankbaar voor bent."; "Give yourself one honest compliment." / "Geef jezelf één eerlijk
  compliment."; "Ask yourself how you are, and listen to the answer." / "Vraag jezelf hoe het gaat en luister naar het
  antwoord." Stored: nothing (the journal keeps only the day of Done, `challengeDone`).
- Tests: `apps/web/lib/journal/av2-challenges.test.ts` → "review b2b #6: nothing needs anyone else to take part" (no
  someone/anyone/friend/others/people/together, NL iemand/anderen/mensen/samen; the pairs stay in place). The existing
  length, kindness and word checks pass unchanged.
- Spec: none needed (av2-challenge-write-out.spec reads the card, not a given line).
- Help / What's new: none needed.
