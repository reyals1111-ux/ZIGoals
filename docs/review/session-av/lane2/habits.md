# Lane 2 — habits pillar (Habits, mood and written practices)

Branch `lane2/habits`. One section per feature. The lead wires the answers into `engine.ts`, adds the cases to the
corpus, regenerates theme sheets, edits Help / What's new / search / shard lists and the registries listed here.

## Feature 1 — Habit options and the game's own rules (LEDGER #45, #48, #49, #50, #52, #57)

**Verdict: built.**

| row | what was built |
|---|---|
| #45 Habitica difficulty | Each build habit: "How hard is it?" Tiny 5 · Easy 10 (default, as before) · Medium 15 · Hard 20 XP a done day (game layer on). |
| #48 Habitica Orb of Rebirth | Journey → "Start again at level 1": the level counts XP from that day; badges, freezes, streaks, XP history and every record stay; each level celebrates once more after it; the rewards shelf keeps unlocking by lifetime XP. |
| #49 Streaks 2-Day Rule | Per-habit opt-in "Never miss twice": one missed day keeps the streak (adds nothing), two missed scheduled days in a row end it; skipped days neutral. Off by default — the streak and the "Never missed twice" line are unchanged. |
| #50 Streaks unscheduled | "Whenever, no set days" (daily build habits): logged any day; a day with nothing done is not scheduled (never missed), today is open but never due (no reminder, no Today count); the card says "Whenever" and "Any day you like". |
| #52 Finch Goal of the Day reward | Today's focus habit done earns 5 XP more; the focus of each day is kept (`focusDays`) so a past day's bonus stays earned. Also QUALITY "Not fixed": XP for the focus habit. |
| #57 Habitify auto-skip | "A day I don't log counts as skipped": a past scheduled day with nothing logged (or an undone 0) is skipped (neutral); a day marked failed stays failed. |

- Where: a habit card → Details → **Habit options** (a fold, loaded with the Details: `components/habits/habit-options.tsx`,
  lazy). Journey → **Start again at level 1** (a fold, lazy: `components/game/rebirth.tsx`). Journey → "What earns XP" lists
  the difficulty and focus rows.
- Engine: `lib/habits.ts` gains `setHabitDayOverlay` (as `setHabitScheduleOverlay`); the browser installs it from the
  habit extras (`lib/habit-options/install.ts`, in `use-habits.ts`). With none installed (server, tests, older builds)
  every habit reads exactly as stored. `lib/game/xp.ts`: `GameStores.habitExtras`, `rebirthFrom`, `countedXp`,
  `XpSummary.lifetime`.
- Files: `lib/habit-options/{rule,install}.ts`, `lib/habits.ts`, `lib/habit-focus.ts`, `lib/habits-extras/schema.ts`,
  `lib/game/{xp,schema,celebrate}.ts`, `components/habits/{habit-options.tsx,habit-options.css,habit-card-full.tsx,habit-completion.tsx,use-habits.ts}`,
  `components/game/{rebirth.tsx,journey.tsx,use-game.ts}`, `lib/ai/tools/{ak-sources,ak-tools,env}.ts`,
  `components/ai/use-ai-context.ts`, `lib/ai/local-answers/exact/journey.ts` (NOVA's level follows the rebirth).
- Tests: `lib/habit-options/habit-options.test.ts` (options read/write/prune, focus days, the three engine options, XP
  difficulty and focus bonus, rebirth level and celebration id, export → erase → restore of both records),
  `lib/ai/local-answers/av2-habits.test.ts`.
- Spec: `tests/av2-habit-options.spec.ts` (3 themes; 390 and 1440 by project; 320 no sideways scroll; axe; focus kept on
  the checkbox).
- **Stored changes (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `options` ({habitId: {twoDay?, unloggedSkip?, whenever?, difficulty?}}, ≤ 400, each entry checked where read) and
  `focusDays` ({date: habitId}, the latest 400 days, checked where read). `zigoals:game:v1` gains optional
  `rebirth` ({from, times}, `.catch(undefined)` on the loose object). Both keys are already exported, erased, restored
  and synced as they are; no new key, no registry change needed. Older builds keep the fields through a
  read-modify-write and simply do not show them; a whenever habit reads there as an ordinary daily habit.
- Help (EN): **Q: Can a habit keep its streak through one missed day, or have no set days?** A: Open the habit's
  Details → Habit options. "Never miss twice" keeps your streak through one missed day; two in a row end it. "A day I
  don't log counts as skipped" makes an unlogged day neutral. "Whenever" (daily habits) lets you log it any day: it is
  never due and never missed. "How hard is it?" sets the XP a done day earns when the game layer is on, and today's
  focus habit earns 5 XP more. **Q: Can I start my level again?** A: Journey → Start again at level 1. Your level counts
  from that day; badges, freezes, streaks and every record stay.
- What's new: "Habit options: never miss twice, whenever habits, skipped when unlogged, and how hard a habit is."
  · "Start again at level 1, keeping every badge."
- Answers wiring (engine.ts, beside `avAnswer`): `import {av2HabitsAnswer} from './av2-habits';` and, in the same
  `if (!subject)` branch, try `av2HabitsAnswer(question, env)` before `avAnswer` (same `groupUnits`/`novaWording`
  wrapping). Cases: `lib/ai/evals/as/cases-av2-habits.ts` (`AV2_HABITS`) for `cases.ts`.
- Showcase hook: none added (the Showcase's habit counts and XP are pinned by other tests; a Showcase habit with an
  option would change the Showcase's streaks/XP). Reported, not changed.
- Device keys / catalogue / export / erase: nothing new (existing keys).
- CSS touched: `components/habits/habit-options.css` (new; theme variables only).
- Always visible on Today: nothing added.

## Feature 2 — Areas' week with milestones, and the monthly theme (LEDGER #53, #55)

**Verdict: built.**

| row | what was built |
|---|---|
| #53 Finch Self-Care Areas and Weekly Milestones | Habits → "Your areas this week" (a fold, lazy): each life area that holds a habit — "Health: 9 of 12 this week", Monday to Sunday (skipped, unscheduled and whenever days add nothing due; an "N times a week" habit counts its N), a bar, the weekly milestone (every check-in due, or the person's own number 1–500, set by keyboard, Escape cancels, focus back on its button), "reached ✓" and "N weeks in a row". Empty state teaches "◈ Choose an area". |
| #55 Finch Seasonal events | Journey → "This month's theme" (a fold, lazy): twelve calm themes (EN/NL), each tied to a built-in life area (November: Gratitude, Habits & Mind); 15 days with a check-in on a habit in that area (any habit while none is in it) earn the new "Theme month" badge (❋) in `lib/game/badges.ts`; the months reached are listed. "Hide the monthly theme" (no pet; the badge is not earned while hidden, one earned stays). |

- Files: `lib/habit-areas/week.ts`, `lib/game/month-theme.ts`, `lib/game/{badges,schema,xp}.ts`,
  `components/habits/{habit-areas-week.tsx,habits-workspace.tsx,habit-options.css}`,
  `components/game/{month-theme-panel.tsx,av2-journey.css,journey.tsx,use-game.ts}`, `lib/ai/tools/env.ts`,
  `components/ai/use-ai-context.ts` (`game.monthTheme`), `lib/ai/local-answers/av2-habits.ts`.
- Tests: `lib/habit-areas/week.test.ts` (week counts, own milestone and weeks in a row, the twelve themes, the area
  rule, the badge on/hidden/kept, the switch, export → erase → restore of both records), `av2-habits.test.ts`.
- Spec: `tests/av2-areas-theme.spec.ts`.
- **Stored changes (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `areaGoals` ({areaId: 1…500}, ≤ 100, checked where read); `zigoals:game:v1` gains optional `monthTheme` (false =
  hidden, `.catch(undefined)`). Existing keys; no registry change.
- Badge cabinet: one more badge ("Theme month"), so the cabinet reads "N of 17". No test pins 16 (journey.spec reads
  `\d+ of \d+`); the Showcase may earn it if its Mind habit has 15 November days — the lead's Showcase runs will show it.
- Help (EN): **Q: How do I see how each part of my life is doing this week?** A: Give your habits a life area (a habit's
  Details → ◈ Choose an area). Habits → Your areas this week then shows each area's check-ins done of those due,
  Monday to Sunday, and its weekly milestone: every check-in due, or a number you set. **Q: What is the monthly
  theme?** A: With the game layer on, each month has a calm theme tied to a life area. A check-in on 15 days of the
  month on a habit in that area earns the Theme month badge. Journey → This month's theme shows it, or hides it.
- What's new: "Your areas this week, with a weekly milestone per area." · "A calm theme each month, with its own badge."
- Answers: `av2HabitsAnswer` now also answers "how are my areas doing this week" / "hoe gaan mijn levensgebieden
  deze week" and "what is this month's theme" / "wat is het thema van deze maand" (cases in `AV2_HABITS`).
- Showcase hook: the Showcase's habits already carry areas, so "Your areas this week" shows them with no new data.
- CSS touched: `components/habits/habit-options.css`, `components/game/av2-journey.css` (new; theme variables only).
- Always visible on Today: nothing added. Habits page first chunk: one fold row (`<details>` + lazy import).

## Feature 3 — Hidden prompts and exercises (LEDGER #56)

**Verdict: built.**

- Finch's muted tags and exercises as one device list: "Don't ask this again" under the Journal's question of the day
  (the next question shows; focus stays); Journal → Start from a prompt → "Hidden prompts and exercises" (a fold, lazy)
  lists the hidden questions to bring back (an unticked one stays listed while the fold is open) and hides any ready
  template; Health → Meditation → Breathe with a guide → "Hide a pattern" (a fold, lazy) hides breathing patterns. A
  hidden item is only left out of what is offered (all patterns hidden: all offered; all questions hidden: none skipped);
  nothing already written changes.
- Files: `lib/muted/{rule,write}.ts` (the writer loads on the tap), `components/muted/{muted-panel.tsx,muted-panel.css}`,
  `lib/journal-prompts/daily.ts` (`questionIndexOfTheDay`, an optional `skip` for `questionOfTheDay`; callers without
  it are unchanged), `components/journal/journal-compose.tsx`, `components/journal-prompts/prompt-picker.tsx`,
  `components/health/meditation/meditation-forms.tsx` (the hidden list is read after mount, never on the server).
  Note for the journal lane's builder: these three journal/meditation files gained small, separate edits.
- Tests: `lib/muted/muted.test.ts` (hide/read/bring back, odd entries, the question passed over, export → erase →
  restore, the answers EN and NL). Spec: `tests/av2-muted.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit):** `zigoals:habit-extras:v1` gains optional
  `muted` ({questions?: number[], templates?: string[], breathing?: string[]}, ≤ 200 each, a loose object checked where
  read). Existing key: exported, erased, restored and synced with the extras; no registry change.
- Help (EN): **Q: Can I stop seeing a journal question, a template or a breathing pattern?** A: Yes. Under today's
  question, "Don't ask this again" hides it. Journal → Start from a prompt → Hidden prompts and exercises lists what you
  hid, to bring back, and hides ready templates; in Meditation, Breathe with a guide → Hide a pattern hides a breathing
  pattern. Nothing you already wrote changes.
- What's new: "Hide journal questions, templates and breathing patterns you don't want offered."
- Answers: "which prompts have I hidden" / "welke vragen heb ik verborgen" (cases in `AV2_HABITS`, id `av2-habits-hidden`).
- Showcase hook: none (the Showcase hides nothing; a hidden question would change the Showcase's question of the day).
- CSS touched: `components/muted/muted-panel.css` (new). Always visible on Today: nothing (the compact journal card on
  Today shows no question).

## Feature 4 — The evening check-in (LEDGER #60, #61, #62, #63, #68)

**Verdict: built** (one part of #62 left as named below; #63's weather stays Carried: needs an outside service).

| row | what was built |
|---|---|
| #60 Bearable daily check-in | Health → Diary → "Evening check-in (optional)" (a fold, loaded through the Health page's one lazy entry, `health-plus`): six steps, each skippable with Back / Skip / Next / Stop here — the day (mood, energy, and a mood per part of the day), a feeling word, symptoms and factors, last night (the logged night, or a link to log it), supplements and medication (Taken / Skipped per dose), a note (the mood's note). Every answer saves into its own record the moment it is given; focus moves to each step's heading. |
| #61 own feeling words | In the feeling-word grid (also on Today's and the Journal's word fold): "Your own word" adds a word to the open corner (≤ 12 a corner) and chooses it for the day; × removes it from the list (days that used it keep it). |
| #62 symptoms by part of the day | A level above None offers Morning / Afternoon / Evening / Night; items can have a group (shown grouped); the day's total ("1 noted, 1 strong · day total 5 of 9"); a mood per part of the day (step 1). |
| #63 factor list | "Add from a ready list": 18 common factors and symptoms (EN/NL names) to pick or search; a "Why I track this" note per item. |
| #68 Mark day complete | "Finish: day logged" marks the day; "✓ Day logged" under Health's date bar; the check-in shows the last 14 days as a strip, each gap a link to that day ("Not logged after all" unmarks). |

- Stays as it was by the owner rule (not a gap): symptoms are still read by no ZIGi or NOVA path (`symptoms-panel.tsx`
  "ZIGi and NOVA do not read it"); the check-in's answers read only the energy record's day-logged marks and own words.
- Files: `lib/checkin-extras/rule.ts`, `components/health/plus/{evening-checkin.tsx,evening-checkin.css,health-plus.tsx}`,
  `components/health/{day-logged.tsx,health-app.tsx,health-day.css}`, `components/mood-words/{mood-words-grid.tsx,mood-words.css}`,
  `lib/energy/schema.ts` (bound only), `lib/ai/local-answers/av2-habits.ts`.
- Tests: `lib/checkin-extras/checkin-extras.test.ts` (every field set/read/cleared, unknown fields kept, `rateEnergy`
  keeps them, own words and their cap, odd values left out, the strip, the day total, the ready list EN/NL, export →
  erase → restore of `zigoals:energy:v1`, the answers EN/NL and the Health gate). Spec: `tests/av2-checkin.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit):** `zigoals:energy:v1` (loose, device-only, never
  synced) gains optional `checkin` ({logged?, ownWords?, times?, notes?, groups?, moments?}; a loose object checked
  where read); a feeling-word day picked from an own word carries `own: true` (the `words` days are loose). No new key.
- Help (EN): **Q: Is there one evening check-in for everything?** A: Health → Diary → Evening check-in goes through
  the day in six short steps: mood and energy, a feeling word, symptoms and factors (with the part of the day), last
  night, supplements and a note. Skip any step; each answer is saved at once. Finishing marks the day "Day logged", and
  the last 14 days show which days still have a gap. **Q: Can I add my own feeling words?** A: Yes: open a corner of the
  feeling-word grid and type "Your own word". It is kept on this device.
- What's new: "An evening check-in in six skippable steps, with Day logged." · "Your own feeling words, symptoms by part
  of the day and a ready list of factors."
- Answers: "did i log today" / "welke dagen heb ik niet gelogd", "what are my own feeling words" / "welke eigen
  gevoelswoorden heb ik" (Health gate; cases `av2-habits-day-logged`, `av2-habits-own-words`).
- Showcase hook: none (the Showcase's energy record would change the Showcase's own answers; reported).
- Left from #62 with its cause: "more than one mood a day" as Health's mood itself — Health v4 `moods` is a strict
  record in every released build (lib/moods/schema.ts), so a second mood a day there would make builds #37–#57 refuse
  Health: against the named rule "Readers of records written by releases #37–#57 must keep working". Built instead: a
  mood per part of the day in the check-in's own field, beside the day's one mood.
- CSS touched: `components/health/plus/evening-checkin.css` (new), `components/health/health-day.css` (one line),
  `components/mood-words/mood-words.css` (own words). Always visible on Today: nothing.

## Feature 5 — Your usual, and week by week (LEDGER #66, #67)

**Verdict: built.**

- #66: Health → Activity → "How you felt, and week by week" (a fold, lazy): mood, energy and each symptom or factor,
  the last 90 days against "your usual" (the last 365), with the days answered on each side, an arrow and a word (Up,
  Down, About the same), "not enough days yet" with the counts needed (20 recent, 60 a year). An unanswered day is never
  none. Beside the existing Trends card (steps, sleep, weight, resting heart rate), unchanged.
- #67: "Week by week": up to four measures the person chooses — mood, energy, sleep, steps, any symptom or factor, any
  habit's share of due days done — over the same twelve Monday-to-Sunday weeks, drawn as small multiples (one row each
  with its own scale on a shared week axis: one axis per chart, never two scales on one), each point named on hover
  (`<title>`), each row's whole series in its accessible name, and "As a table" with the same numbers. The choice is
  kept on this device. (Bearable overlays lines on one chart; small multiples keep the one-scale rule.)
- Files: `lib/feeling-trends/trends.ts`, `lib/checkin-extras/rule.ts` (`graph`, `setGraph`),
  `components/health/plus/{feelings-card.tsx,feelings-card.css,activity-plus.tsx}`, `lib/ai/local-answers/av2-habits.ts`.
- Tests: `lib/feeling-trends/trends.test.ts` (usual against recent, pending counts, symptoms, weekly values and gaps, a
  habit's share without today's open day, the graph choice and its limits, the answers EN and NL). The energy record's
  export → erase → restore is proven in `lib/checkin-extras/checkin-extras.test.ts`. Spec: `tests/av2-feelings-graph.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit):** the energy record's loose `checkin` gains
  `graph` (≤ 4 measure ids, checked where read).
- Help (EN): **Q: How do I see whether my mood is lower than usual?** A: Health → Activity → How you felt, and week by
  week. It sets the last 90 days beside your usual over the year, for mood, energy and anything you follow in Symptoms
  and factors, with the days counted. "Week by week" puts up to four measures you choose over the same twelve weeks.
- What's new: "Mood, energy and symptoms against your usual, and a week-by-week graph you choose."
- Answers: "how is my mood compared to usual" / "hoe is mijn stemming vergeleken met normaal" (mood and energy only,
  Health gate; symptoms stay unread by ZIGi and NOVA). Case `av2-habits-usual-mood`. Lead: put it after any existing
  mood-trend intent in engine.ts if one claims the same words.
- Showcase hook: the Showcase's own moods fill it with no new data. CSS: `components/health/plus/feelings-card.css`.
  Always visible on Today: nothing.

## Feature 6 — Hidden figures in NOVA and ZIGi, Settings and Export (LEDGER #69; QUALITY "Not fixed")

**Verdict: built in part; one part left with its cause.**

- NOVA's and ZIGi's on-device answers: `lib/ai/local-answers/av2-hide-figures.ts` — `withHiddenFigures(reply, on, lang)`
  turns every calorie and body-weight figure into "—" (kcal, calories, calorieën, kg, lb, stone, "weight 72.4",
  "gewicht 72,4") and adds one plain line (EN/NL) saying why and where to switch back; steps, minutes, sleep and other
  numbers stay. `bodyFiguresHidden()` reads the device switch (false on the server).
  **Wiring line for engine.ts (lead):** at the end of `localAnswer`, `return withHiddenFigures(reply, bodyFiguresHidden(),
  questionLanguage(question) === 'nl' ? 'nl' : 'en');` (import both from './av2-hide-figures'). The same applies to the
  no-model reply path (`noModelReply`) if it can say a calorie or weight figure.
- Settings → Data & privacy → "Calories and weight on screen": the same `HideFiguresToggle` as Health (one device switch,
  `zigoals:hide-body-figures`, unchanged). Export everything says, while it is on, that the file still holds the figures.
- Left with its cause: the figures drawn inside NOVA's own widgets and cards (`components/nova/widgets/*`,
  `components/nova/cards/ax/*`: calorie trend, nutrition gauges, the health HUD, food days, health compare) — a
  protected area (AR's NOVA composition); marking them `data-body-figure` there is the lead's call. Every text answer is
  covered.
- Files: `lib/ai/local-answers/av2-hide-figures.ts`, `app/app/settings/page.tsx`, `components/export-everything.tsx`.
- Tests: `lib/ai/local-answers/av2-hide-figures.test.ts` (EN and NL figures, other numbers kept, the note only when
  something was hidden, the Showcase's own calorie answer). Spec: `tests/av2-hide-figures.spec.ts`.
- Stored changes: none (the existing device switch).
- Help (EN): **Q: Do ZIGi and NOVA show my calories and weight when I hid them?** A: No. While "Hide calories and
  weight" is on (in Health or in Settings → Data & privacy), their answers show a dash instead of those figures. Your
  records and your exports still hold them.
- What's new: "Hidden calories and weight stay hidden in ZIGi's and NOVA's answers; the switch is in Settings too."
- Device keys / catalogue: nothing new. CSS: none. Always visible on Today: nothing. Settings gains one panel in Data &
  privacy (three Tab stops on Settings, none on Today).

## Feature 7 — Experiments with several outcomes, and symptoms in them (LEDGER #64)

**Verdict: built.**

- Health → Insights → Experiments: under each experiment, "Follow more outcomes (up to 8)" adds outcomes beside its
  first; each is worked out exactly as the first (Compare's day test, the same 14 days a side, the same labels), one
  line each under the card. A followed symptom or factor (Symptoms and factors) is now a change to try ("“Pollen”
  noted" against "answered None"; an unanswered day is neither) and an outcome ("Headache (0–3)", its level), in
  Compare and in Experiments.
- Files: `lib/compare/engine.ts` (`symptoms` source, `symptom` factor kind and its confounder line, `symptom:<id>`
  outcomes with their gap 0.5, label, words), `lib/experiments/engine.ts` (`MAX_OUTCOMES`, `outcomesOf`,
  `experimentResults`, `setMoreOutcomes`; `symptom` in `EXPERIMENT_FACTOR_KINDS`), `components/insights/experiments.tsx`,
  `components/insights/experiments.css`. Compare's explorer (`components/insights/compare/compare-explorer.tsx`) does
  not pass `symptoms` yet: one line for the lead or the body lane (`symptoms: ok(useDeviceRecord(SYMPTOMS))`), then
  symptoms show in Compare too.
- Tests: `lib/experiments/av2-outcomes.test.ts` (symptom factor and outcome words, several outcomes each worked out, a
  symptom as the change, the cap of eight, export → erase → restore of `zigoals:experiments:v1`). Existing compare,
  experiments and insights tests unchanged and green. Spec: `tests/av2-experiment-outcomes.spec.ts`.
- **Stored change (TIER 3 stored formats, additive):** an experiment in the loose `zigoals:experiments:v1` may carry
  `more` (up to seven more outcome ids); an older build reads its first outcome and keeps the rest (loose object). The
  schema file is unchanged, so there is no separate schema commit; the lead labels this commit TIER 3 stored formats.
- Help (EN): **Q: Can one experiment follow more than one result?** A: Yes. Under an experiment, "Follow more
  outcomes" adds up to eight in all, such as mood, sleep or a symptom you follow; each is worked out the same way. A
  symptom or factor can also be the change you try.
- What's new: "Experiments follow up to eight outcomes, and symptoms can be the change or the result."
- Answers: none new (Experiments are not read by NOVA or ZIGi today; symptoms stay unread by them, owner rule).
- Showcase hook: the Showcase's example experiment shows "Follow more outcomes" with no new data.

## Feature 8 — Today's practice, written guides (LEDGER #71, #77 daily part)

**Verdict: built** (#77's meditation library stays Carried: needs content made for ZIGoals, recorded audio courses).

- Health → Meditation → "Today's practice, a short written guide" (a fold, lazy): one of twelve practices written for
  ZIGoals in English and Dutch (`lib/meditation/guides.ts`: arriving, counting breaths, a short body scan, noting,
  kind wishes, listening, hands, a longer out-breath, open sky, walking slowly, three good moments, letting the day go),
  3, 5 or 10 minutes, each in four plain steps; "Another one"; "In het Nederlands" / "In English"; "Begin · N min with
  the bell" starts the existing timer and its bell. Relaxation wording, never treatment; no audio.
- Files: `lib/meditation/guides.ts`, `components/health/meditation/{today-practice.tsx,meditation-view.tsx,meditation.css}`,
  `lib/ai/local-answers/av2-habits.ts`.
- Tests: `lib/meditation/guides.test.ts` (Dutch twins, lengths, no treatment words, one a day and Another one, the
  answers EN and NL). Spec: `tests/av2-todays-practice.spec.ts`.
- Stored changes: none (a session it begins is the existing meditation session).
- Help (EN): **Q: Is there a meditation for today?** A: Yes. Health → Meditation → Today's practice gives one short
  written practice a day, in English or Dutch, with "Another one". "Begin" starts the timer with your bell for its
  minutes. It is text to read, not audio.
- What's new: "Today's practice: a short written meditation each day, in English and Dutch."
- Answers: "what is today's meditation" / "wat is de meditatie van vandaag" (case `av2-habits-todays-practice`).
- Showcase hook: shows for every profile with no data. CSS: `meditation.css` (a few lines). Today: nothing added.

## Feature 9 — Calm visuals behind a sitting, and Move gently (LEDGER #79, #80, #81)

Second builder (branch `lane2/habits2`, from `lane2/habits`).

**Verdict: built.**

| row | what was built |
|---|---|
| #79 Calm Shift | As the lead scoped it, a visual: "Slow left and right", a soft light that glides from side to side above the clock or the breathing guide (an eased cosine, never a jump), at a pace you choose (Steady 1.5 s, Slow 3 s, Slower 5 s a side). Relaxation to rest the eyes on, worded as such, no therapy claim; nothing flashes. No sound is made or changed. |
| #80 Calm Scenes | Four scenes drawn on the device (Dusk, Sea, Forest, Night sky): layered gradients and shapes, no picture or video. They drift very slowly (48–64 s) only while motion is allowed; under the app's Motion Off or the device's reduced motion they stand still and the caption says so. "Hide the visual" hides it for the session (focus moves to "Show the visual"). |
| #81 Calm Daily Move | "Move gently": five short stretch sequences written for ZIGoals in English and Dutch (Morning wake-up, Desk break, Neck and shoulders, Hips and lower back, Evening unwind; 3–5 min, 5–6 steps each) played one step at a time: the step's name and written cue, its seconds left (`role=timer`), a bar, the step list, Pause / Resume, Back, Next step, End now, your meditation bell between steps, the screen kept on, a polite announcement per step (never per second), focus on each step's heading. At the end the minutes actually moved are saved to Health's activity log as "Stretch: …" (steps 0), where Today, the weekly review and a linked exercise habit count them. Minutes only, never calories. A reload ends a sequence (nothing half-saved); closing the fold keeps it going. The "routine player" of the row: a player of its own beside the meditation timer, since the habit routine player keeps habit steps in the synced journal and a stretch is not a habit. |

- Where: Health → Meditation: two folds under Begin, "Behind your sitting: a calm visual" (`calm-chooser.tsx`, lazy) and
  "Move gently: a short guided stretch" (`daily-move.tsx`, lazy). The running session loads `calm-layer.tsx` lazily.
- Files: `lib/calm/{visuals,stretches,write}.ts`, `components/health/meditation/{calm-layer.tsx,calm-chooser.tsx,daily-move.tsx,calm.css,meditation-view.tsx,meditation-session.tsx,breathing-visual.tsx}`
  (`useMotionAllowed` and `useWakeLock` exported for reuse; no behaviour change), `lib/habits-extras/schema.ts`,
  `lib/ai/local-answers/av2-habits.ts`, `lib/ai/evals/as/cases-av2-habits.ts`.
- Tests: `lib/calm/calm.test.ts` (choose/read/clear, later fields kept, odd values, the glide's path and smoothness, the
  steps by time, Next/Back/pause, a long background, minutes moved, the Dutch twins and no calorie or treatment words,
  export → erase → restore of the extras' `calm`, the answers EN and NL). Spec: `tests/av2-calm-move.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit 0b4fbf87):** `zigoals:habit-extras:v1` gains optional
  `calm` ({visual?: shift|dusk|sea|forest|night, pace?: steady|slow|slower}, a loose object checked where read). Existing
  key: exported, erased, restored and synced with the extras; no registry change. Move gently writes ordinary Health
  activity rows (no new field).
- Help (EN): **Q: Can something calm show while I meditate?** A: Health → Meditation → Behind your sitting. Choose a slow
  light that glides left and right (and its pace) or a scene: dusk, sea, forest or a night sky. It shows above the timer
  or the breathing guide, and stands still while Motion Off or reduced motion is on. **Q: Are there guided stretches?**
  A: Health → Meditation → Move gently has five short stretches with written steps and a timer, in English or Dutch. At
  the end you can save the minutes to your Health activity. No calories are counted.
- What's new: "A calm visual behind your sitting: a slow left-right light or a scene." · "Move gently: short guided
  stretches, saved as activity minutes."
- Answers: "what visual is behind my meditation" / "welke achtergrond heb ik bij het mediteren" and "how many minutes
  did i stretch this week" / "hoeveel minuten heb ik deze week gerekt" (Health gate; cases `av2-habits-calm-visual`,
  `av2-habits-stretch-minutes`). Same wiring line as Feature 1.
- Showcase hook: none needed (both show for every profile with no data; a Showcase stretch would add Health activity
  minutes that the Showcase's Today and weekly review pin).
- CSS touched: `components/health/meditation/calm.css` (new; theme variables for controls and text, the scenes are
  pictures). Always visible on Today: nothing. Meditation's first chunk: two fold rows and three lazy imports.

## Feature 10 — Skip and an amount per day in the week grid (q4 #30 Minor; QUALITY "Not fixed")

**Verdict: built.**

- Habits → This week, Monday to Sunday: "A tap on a day" — "Marks it done" (as before, the default) or "Opens Skip
  and amount". In the second, a build habit's scheduled day up to today (open, done, missed or skipped) opens that day's
  panel under the table (its own chunk): Done, Skip this day (a habit counted per day; one counted per week or month
  says its History skips it, as the planned skip does), an amount with the habit's unit (times, pages, minutes or "1 h
  30 min", a quantity; Health's decimal-comma rule), Clear the day, Close. Each choice uses the journal's own mutators
  and the app's toast with Undo. A right-click (a long press on Android) on a cell opens the panel in either mode. The
  focus moves to the panel's heading and back to the cell on Close or Escape. A skipped cell is a button in this mode,
  so a skip can be undone from the week.
- Files: `lib/habits-order/week-day-edit.ts` (pure: what a day can become, the change, the toast words),
  `components/habits/{week-day-editor.tsx,habit-week-grid.tsx,habit-week-grid.css}`.
- Tests: `lib/habits-order/week-day-edit.test.ts` (what a day can be, skip → amount → done → clear, Undo, a note kept, a
  later day refused, the words). Existing `av-week-grid.test.ts` unchanged and green. Spec: `tests/av2-week-day.spec.ts`.
- Stored changes: none (ordinary habit entries: skipped, logged).
- Help (EN): **Q: Can I skip a day or log an amount from the week grid?** A: Yes. In Habits → This week, choose "A tap
  on a day: Opens Skip and amount", then tap a day: skip it, set an amount, mark it done or clear it, with Undo.
- What's new: "The week grid skips a day and logs an amount, with Undo."
- Answers: none new (the days read as before). Showcase hook: the Showcase's habits show it with no new data.
- CSS touched: `components/habits/habit-week-grid.css`. Always visible on Today: nothing. Habits first chunk: unchanged
  (the grid is already lazy; the panel is its own chunk).

## Feature 11 — Daylio's check-in: own mood words, activities in groups, each tag month by month (LEDGER #178, #179, #188)

**Verdict: built** (#178's "wherever the mood is" has the parts named below that keep ZIGoals' words, each with its cause).

| row | what was built |
|---|---|
| #178 Custom moods | Health → Diary → How does today feel? → "Your own words for the moods" (a fold, lazy): your own word (≤ 16 characters) and a symbol from a fixed set of twelve for each of the five moods; a blank word keeps ZIGoals' word; "Use ZIGoals' words again". Shown on Health's mood card (buttons and the folded row), the evening wrap-up card, ZIGi's check-in, the evening check-in (step 1 and the parts of the day), the Journal's On this day, Insights' tag statistics, and NOVA's and ZIGi's answer "what are my mood words". The stored mood stays 1–5 (Health v4 `moods` untouched). |
| #179 Activities with icons and groups | Under "What went with it?" on the day's mood: your activities in your own groups, each with one of 24 symbols, one tap adds it as that day's mood tag (pressed state; again takes it off); "Edit your activities" adds (name, group with a list of your groups, symbol) and removes (days that had it keep it). At most 60. |
| #188 Activity and mood statistics | Health → Insights → What goes with your good days → "Each tag, month by month" (a fold, lazy): per tag (activities included), the days this month and last month, and the moods on its days over the last year as counts in words ("Great 2 · Good 1 — mostly great") with a small bar (numbers in the text). The 30 most used; "goes with, not a cause". |

- Parts that keep ZIGoals' words, with cause: NOVA's mood heat card (`lib/nova/cards/ax/health-heat.ts`) — a protected area
  (AR's NOVA composition), the lead's call; the Year in pixels key (`lib/year-pixels/grid.ts` `levelWord`) and the
  Journal page's screen-reader day line (`components/journal/journal-page.tsx:113`) — the journal lane's files; one line
  each for the lead (`useMoodLook().words` from `components/mood-look/use-mood-look.ts`).
- Owner rule kept: tags and activities stay unread by ZIGi and NOVA (as `mood-tags` says); only the mood words are read.
- Files: `lib/daylio/rule.ts`, `components/mood-look/{use-mood-look.ts,mood-look-editor.tsx,activities.tsx,tag-stats.tsx,mood-look.css}`,
  `components/health/{mood-chip.tsx,plus/mood-tags.tsx,plus/insights-plus.tsx,plus/evening-checkin.tsx}`,
  `components/for-you/wrap-up-card.tsx`, `components/ai/zigi-checkin.tsx`, `components/journal/on-this-day.tsx`,
  `lib/ai/local-answers/av2-habits.ts`, `lib/ai/evals/as/cases-av2-habits.ts`.
- Tests: `lib/daylio/daylio.test.ts` (words and symbols set/read/reset, the stored mood untouched, other check-in fields
  kept, odd values; activities add/group/remove/cap/odd entries; export → erase → restore of `zigoals:energy:v1` with
  both; the tag statistics; the answers EN and NL and the Health gate). Spec: `tests/av2-mood-look.spec.ts`.
- **Stored change (TIER 3 stored formats, additive):** the loose `checkin` of `zigoals:energy:v1` (device-only, never
  synced) gains `moodLook` ({"1"…"5": {word?, symbol?}}) and `activities` ([{id, name, symbol, group}], ≤ 60), both
  checked where read. The schema file is unchanged (`checkin` is already a loose object), so this commit is labelled
  TIER 3 stored formats itself; no new key, no registry change.
- Help (EN): **Q: Can I name the moods my own way?** A: Yes. Health → Diary → How does today feel? → Your own words for
  the moods: a word and a symbol for each of the five. Your mood is still kept as 1 to 5, so charts and history read the
  same. **Q: Can I tap my usual activities?** A: Under "What went with it?" on a day's mood, Edit your activities adds
  them in your own groups with a symbol; one tap puts one on the day. Health → Insights → Each tag, month by month shows
  how often each came this month and last, and the moods on its days.
- What's new: "Your own words and symbols for the moods." · "Activities in your own groups, one tap on the day's mood." ·
  "Each tag, month by month, with the moods on its days."
- Answers: "what are my mood words" / "wat zijn mijn stemmingswoorden" (case `av2-habits-mood-words`, Health gate).
- Showcase hook: none (the Showcase's moods and tags show the statistics with no new data; own words would change the
  Showcase's mood buttons that other specs read).
- CSS touched: `components/mood-look/mood-look.css` (new; theme variables only). Always visible on Today: nothing new
  (the wrap-up card shows the same five buttons, with your words).

## Feature 12 — Each scale's statistics (LEDGER #189)

**Verdict: built.**

- Journal → Your own scales → "How your scales went" (a fold, lazy; not in ZIGi's compact check-in): choose the scale
  and the last 30, 90 or 365 days; the days rated of the span, the average, the lowest and highest, the level most
  often (in your own end words), how often each level came (a count per level with a bar), and a dot per rated day on one
  1–5 axis (each dot titled; the chart named with the latest twelve ratings). An unrated day is a gap, never a level.
  This is the first reader of `scaleSeries` in the UI.
- Files: `lib/scales/stats.ts`, `components/scales/{scale-stats.tsx,your-scales.tsx,your-scales.css}`.
- Tests: `lib/scales/stats.test.ts`. Spec: `tests/av2-scale-stats.spec.ts`.
- Stored changes: none (derived from `zigoals:scales:v1`).
- Help (EN): **Q: How do I see how a scale went?** A: Journal → Your own scales → How your scales went: pick a scale
  and 30, 90 or 365 days to see the days rated, the average and how often each level came.
- What's new: "Statistics for each of your own scales: 30, 90 or 365 days."
- Answers: none (scales are not read by ZIGi or NOVA today; giving them that would widen what they read, the owner's
  call).
- Showcase hook: the Showcase's own scales (`lib/scales/showcase.ts`) show it with no new data.
- CSS touched: `components/scales/your-scales.css`. Always visible on Today: nothing.

## Feature 13 — The mood check-in reminder (LEDGER #180)

**Verdict: built.**

- Settings → Notifications → "Mood check-in" (a switch of its own, off by default): at its time (20:00 unless set) and,
  with "A second mood check-in", a second time; inside quiet hours it is said on the card and wakes nothing, as the
  others. The first stays quiet once today's mood is answered; the second asks again (the newer answer wins). The
  notification says "How does today feel? One tap answers it." — never a mood or a name — and opens
  `/app/health?mood=ask`: Health's mood card opens (also folded on a phone), comes into view and its first mood takes the
  focus. Works with the existing wake registration (recurring minutes on a weekday mask); nothing new reaches the push
  Worker.
- Files: `lib/notify/{prefs,plan,sync}.ts`, `public/sw.js` (one line), `components/notify/notifications-card.tsx`,
  `components/health/mood-chip.tsx`.
- Tests: `lib/notify/av2-mood-notify.test.ts` (the switch off by default, times and the second one, older prefs, wakes at
  both times, the first quiet once answered, quiet hours, the composer's words and link). Existing notify, sw and push
  tests unchanged and green. Spec: `tests/av2-mood-notify.spec.ts`.
- **Stored change (TIER 3 stored formats, additive, separate commit):** `zigoals:notify:v1` (loose, device-only) gains
  optional `mood` ({time, second?}) and the type name `mood` in `types` (the record already keeps any type name). An older
  build keeps both and has no mood type. **TIER 3 (PWA):** the service worker's composer gains the `mood` kind.
- Help (EN): **Q: Can ZIGoals remind me to log my mood?** A: Yes. Settings → Notifications → Mood check-in, with its time
  and an optional second one. The notification never says your mood; a tap opens the mood question.
- What's new: "A mood check-in reminder, once or twice a day, that opens the mood question."
- Answers: none new. Showcase hook: none (notifications are this device's). Device keys / catalogue: nothing new
  (`zigoals:notify:v1` is already exported, erased and restored).
- CSS touched: none. Always visible on Today: nothing. Settings gains one switch (two more fields while it is on).

## Not built yet (next for this pillar, in order)

- Group 14 rest: **#79** Calm Shift (the slow left-right layer as a visual, no audio content), **#80** Scenes (calm
  visuals with Motion Off respected), **#81** Daily Move (written stretch cues with a timer, minutes logged only, never
  calories). Next row: **#79**.
- q4 / QUALITY "Not fixed" Minors for habits and mood: Skip and amount per week-grid cell
  (`components/habits/habit-week-grid.tsx`), a paused-until note, grouped repeat plans, a symptom chart in the visit
  report (q3 #48).
- Lead's added groups (LEDGER "Ten more apps", pillar Habits and mind): N1 Daylio (#178, #179, #180, #188, #189), N2
  Insight Timer (#184, #186), N3 Fabulous (#181, #182, #183; Lock Screen native-only), N5 Loop (#185 rolling schedule
  as a separate TIER 3 commit, #187, #190, #194).
