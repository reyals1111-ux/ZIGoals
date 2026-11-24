# Lane 2 round 5 — body and through the day (Bevel, Clue, Productive, Tiimo): builder registry

Branch `lane2/r5-body`, from `lane2/batch4`. Rows: LEDGER "Round 5: rows #348–#390", groups V5 (Bevel and Clue: #371,
#379–#383) and V3 (Productive and Tiimo: #369, #370). One section per feature. Every stored change is listed under
"Stored changes" for the lead's TIER 3 (stored formats) label; the notification-plan change (#369) is TIER 3 (PWA).

Rules kept throughout: every cycle and food part sits inside Health (its gate and consent) and the cycle log's own
switch; the moods on the Day Timeline show only while Health is shown. The cycle work is a look back only: `CYCLE_LINE`
stays, no phase, no forecast of symptoms, no fertile window, no new prediction of a period (the existing next-period
range is only read less: a cycle left out is not in it, and "No period" hides it). No contraception or fertility advice,
no medical reading of any word logged. No calorie expenditure anywhere. Compare's rules are unchanged (90 days, 14 days
a side, never a cause).

## Stored changes (TIER 3 (stored formats), all additive; no new key)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:cycle:v1` (existing, device-only, loose) | optional `own` `[{id (a–z and -, 1–30, the form a day's symptoms keep), word (1–24), gone?: true}]` (≤ 60; an unreadable item is dropped alone), `hidden` `[id]` (≤ 60), `order` `[id]` (≤ 120), `leftOut` `[a cycle's first day]` (≤ 200), `noPeriod: true`, `peri: true`; each `.optional().catch(undefined)`. A day's own word is stored in its `symptoms` as its id, so the strict-looking day schema of older builds reads it. | Kept untouched (the record is loose); an older build shows an own word as its id ("migraine") and still offers flow and the estimate. |
| `zigoals:food-plus:v1` (existing, device-only, loose) | optional `lateMeal` `{hours 1–6, kcal 50–3000}`, `.optional().catch(undefined)`. | Kept untouched; older builds have no late-meal factor. |
| `zigoals:notify:v1` (existing, device-only, loose) | optional `habitParts` `{on, morning?, afternoon?, evening? ("HH:MM", each dropped alone when unreadable)}`, `.optional().catch(undefined)`. Exported, never restored (as before). | Kept untouched; an older build sends one reminder per habit, as before. |

Test: `lib/av2-r5-body-stored.test.ts` (old records read, a bad value drops alone, Export everything → erase → Restore
keeps the cycle and food-plus fields; the notification prefs are exported and not restored, as before).

## Summary: rows and verdicts

| LEDGER row | verdict | feature |
|---|---|---|
| #379 Clue: your cycles listed, with averages | built (a look back; the averages and their spread; list and table) | 1 |
| #380 Clue: your own things to track, chosen and ordered | built (up to 30 own words, built-ins hidden or ordered, three more everyday words; EN for the page, NL for the answers) | 1 |
| #381 Clue: a cycle at a glance | built (a look back, never a forecast; letters as well as colour) | 1 |
| #382 Clue: leave a cycle out of the averages | built (the averages and the existing estimate read the others) | 1 |
| #383 Clue: tracking without a period, and perimenopause | built (two plain choices; words to log with no reading of them) | 1 |
| #371 Bevel: a late meal read from the food log | built (a Compare factor beside the hand-set tag; the person's own two numbers; a fact, never a cause) | 2 |
| #369 Productive: one reminder for each part of the day | built (opt-in; TIER 3 (PWA)) | 3 |
| #370 Tiimo: moods on the day | built (marks on the Day Timeline, under the Health gate) | 4 |

Nothing was left. QUALITY Minors: none of the open q1–q4 Minors are in V3 or V5; none were taken up.

Specs for the shard lists (none run here): `tests/av2-cycle-r5.spec.ts`, `tests/av2-compare-late-meal.spec.ts`,
`tests/av2-habit-parts.spec.ts`, `tests/av2-timeline-moods.spec.ts`.

## Shared to-do for the lead (all features)

- engine.ts wiring (one line, beside `av2R4HealthAnswer`):
  `if (!subject) { const own = av2R5BodyAnswer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2R5BodyAnswer} from './av2-r5-body';`. Corpus: `AV2_R5_BODY` from `lib/ai/evals/as/cases-av2-r5-body.ts`
  into `CORPUS`; its expected facts into expected.json. None of the existing corpus phrasings is claimed by it (checked
  against the whole CORPUS on the Showcase). It reads `env.nova.cycle`, `env.foodPlus`, `env.energy`, `env.habits` and
  `env.health`, all already in the environment.
- Device keys / catalogue / export / erase / restore: nothing new (no new key; the three records changed are registered).
- Search (static.ts): see each feature.
- CSS files touched (for the theme sheets): `components/cycle/cycle.css`, `components/timeline/timeline.css`,
  `components/notify/notifications.css` (theme variables only: `--line`, `--violet`, `--pink`, `--cyan`, `--muted`).
- Today: nothing new is always visible on Today (the mood marks are registered on /app/timeline only, not Today's card).
- Route weights: /app/health's first chunk is unchanged except the cycle store's few schema lines (`own`, `hidden`,
  `order`, `leftOut`, `noPeriod`, `peri`), which every page with the cycle switch already loads; the cycle log stays its
  own chunk and its three new parts are each `lazy()` inside it. /app/settings gains one `lazy()` line (the part-of-day
  choice). /app/timeline gains the mark row (a few lines in `timeline-block.tsx`, `build.ts`) and one registration
  component; the mood source loads only when the timeline reads it. Compare's chunk (already lazy) gains
  `lib/compare/late-meal.ts`. Please measure /app/health, /app/settings and /app/timeline.
- Showcase: nothing to write. The Showcase's cycle (`lib/cycle/showcase.ts`, five periods) already fills Your cycles and
  A cycle at a glance under its "Showcase: fictional example entries." line; its moods and energy fill the timeline's
  marks. No pinned count moves (`[data-kind=checklist]` stays 2 on timeline-af: the marks are `data-kind="mark"`).

## 1. The cycle log: your cycles, a cycle at a glance, your own words, a cycle left out, No period and perimenopause — LEDGER #379–#383 built

- What (Health → Diary → Cycle log, each fold its own chunk; `CYCLE_LINE` stays at the top):
  - "Your cycles": the average cycle ("29 days (28 days to 32 days, so they vary by 4 days; from 4 cycles)") and the
    average period, then each cycle newest first (began, length or "so far (still going)", period length), as a List or a
    Table (a focusable scrolling region). A gap over 90 days is "a pause in logging, not counted as a cycle". "Leave out"
    (a pressed button) on any cycle: it stays listed, and the averages and the existing next-period range read the others.
    "A look back at the days you logged, not a forecast."
  - "A cycle at a glance": a chosen cycle (newest by default) as a row of its days, with the same cycle days of up to five
    earlier cycles below it; each cell marked L, M or H for flow and a dot for words or a note (a key above it; full words
    for screen readers), and that cycle "day by day" in words. Only days that happened.
  - "What you track": "No period" (hides the flow buttons and the next-period line; every word and note kept; the day
    plan shows no estimated days) and "Perimenopause words" (hot flushes, night sweats, joint aches, brain fog; "Nothing is
    read into them"); the words for a day with ↑ ↓ (focus stays on the moved word's button), Hide for a built-in word and
    Remove for an own one (its past days keep it and its name), and "Add your own word (n of 30)". Three more everyday
    words: Low energy, Lots of energy, Slept badly. An own word is kept in a day's `symptoms` as an id in the day's own
    form (`migraine`), so older builds read the day.
  - NOVA's `cycle_log` tool and the NOVA cycle card say "not shown: you chose No period" instead of an estimate; the tool
    names own and new words by their words.
- Files: `lib/cycle/words.ts`, `lib/cycle/history.ts` (new, pure); `lib/cycle/engine.ts` (`cycleLengths` skips a cycle
  left out; `nextPeriodEstimate` gains `{kind: 'off'}` for No period); `lib/cycle/plan-days.ts` (reads the two fields);
  `components/cycle/cycle-history.tsx`, `cycle-glance.tsx`, `cycle-words.tsx` (new); `components/cycle/cycle-log.tsx`,
  `components/cycle/cycle.css`; `lib/ai/tools/g1-tools.ts`, `lib/nova/cards/health-more.ts`.
- Tests: `lib/cycle/av2-r5-cycle.test.ts`, `lib/av2-r5-body-stored.test.ts`; existing cycle, NOVA card and tool tests
  green. Spec: `tests/av2-cycle-r5.spec.ts` (320 / 390 / 1440, three themes, axe, keyboard focus after a move).
- Stored: `own`, `hidden`, `order`, `leftOut`, `noPeriod`, `peri` on `zigoals:cycle:v1` (see the table).
- Help (EN): **Can I see my past cycles?** Yes. In Health → Diary → Cycle log, "Your cycles" lists each cycle with its
  length and its period's length, with the average cycle and period and how much they vary. It is a look back at what you
  logged, not a forecast. **Can I leave a cycle out?** Yes: "Leave out" on a cycle in Your cycles. It stays listed, but the
  averages and the next-period range no longer count it. **Can I see one cycle at a glance?** Yes: "A cycle at a glance"
  shows a cycle as a row of its days, with the same days of earlier cycles below it. **Can I track my own words?** Yes:
  under "What you track", add up to 30 words of your own, hide the built-in ones you don't use, and put them in your
  order. A day keeps up to 12 words. Removing a word keeps the days that have it. **Can I track without a period, or perimenopause?** Yes: "No period"
  hides the flow buttons and the next-period line and keeps everything else; "Perimenopause words" adds hot flushes, night
  sweats, joint aches and brain fog to log. They are words to note for yourself; nothing is read into them.
- What's new: "Cycle log: your cycles with their averages, a cycle at a glance, your own words, and No period."
- Search (static.ts): "cycle length", "average period", "perimenopause", "no period" → `/app/health?view=diary#cycle-log`.
- Rules: no phase, no fertile window, no symptom forecast, no new prediction; no contraception or fertility advice; the
  words offered are checked against "fertile", "ovulation", "PMS", "predict" and "phase" by a unit test.

## 2. A late meal from the food log in Compare — LEDGER #371 built

- What: Health → Insights → Compare → On days with… → Sleep tags → "Late meal (from your food log)", beside the hand-set
  "Night tagged “late meal”". A day is "with" when food of at least the person's number of kcal is logged within their
  number of hours before that night's bedtime (3 hours and 300 kcal until changed: "Late meal: within this time before
  bed" 1–6 hours and "Late meal: at least (kcal)" 50–3,000, kept on this device); "without" when the day's food is all
  timed and none reaches it; otherwise unknown (no food logged, an entry without a time or without calories). The
  eaten-at time is the one set in the diary, else the time logged on its own day. With "Time asleep" (the night after the
  day) it reads "On days with 300 kcal or more logged in the 3 hours before bed, you slept 6 h that night on average; on
  other days, 8 h." with its own "something else could explain it" (late evenings, plans with others, busy days). Compare's
  rules are unchanged; no causal word.
- Files: `lib/compare/late-meal.ts` (new, pure), `lib/compare/engine.ts` (`FactorKind` + `late-meal`, `CompareSources`
  `foodPlus` and `zone`), `components/insights/compare/compare-explorer.tsx` (reads `zigoals:food-plus:v1`; the two
  fields).
- Tests: `lib/compare/av2-r5-late-meal.test.ts`; existing compare, experiments and insights tests green. Spec:
  `tests/av2-compare-late-meal.spec.ts`.
- Stored: `lateMeal` on `zigoals:food-plus:v1` (see the table).
- Help (EN): **Can Compare read late meals from my food log?** Yes. In Health → Insights → Compare, choose "Late meal (from
  your food log)" and "Time asleep". A day counts when you logged food of at least your calorie number within your number
  of hours before bed (3 hours and 300 kcal until you change them). It shows what happened together, never a cause. Days
  with no food logged, or food without a time, are left out.
- What's new: "Compare: a late meal read from your food log, beside your nights."
- Search (static.ts): "late meal and sleep" → `/app/health?view=insights`.

## 3. One reminder for each part of the day — LEDGER #369 built (TIER 3 (PWA))

- What: Settings → Notifications, under the switches while "Habits due" is on: "One reminder for each part of the day"
  (off by default). When ticked: "Morning starts at" (08:30), "Afternoon starts at" (12:30), "Evening starts at" (18:00),
  each the person's to change; a time inside quiet hours says it will not ring. At each start one notification says
  "Morning: 3 habits still open" (names, " · Walk · Read", only with names on and never when a Health-linked habit is
  open in that part); a part with nothing open stays quiet (the wake is skipped). The habits in a part (morning,
  afternoon, evening) then get no reminder of their own; Anytime habits keep theirs. Snooze 1 h, no Done (it stands for
  several habits). The service worker composes the line on the device as before; the registration carries only minutes.
- Files: `lib/notify/habit-parts.ts` (new, pure), `lib/notify/plan.ts` (`ItemKind` + `habitPart`, `PlanInput.habitParts`),
  `lib/notify/sync.ts` (one line), `public/sw.js` (one composer line), `components/notify/habit-parts-choice.tsx` (new),
  `components/notify/notifications-card.tsx` (one lazy line), `components/notify/notifications.css`.
- Tests: `lib/notify/av2-r5-habit-parts.test.ts` (plan, quiet hours, names, the composer); existing notify tests green.
  Spec: `tests/av2-habit-parts.spec.ts`.
- Stored: `habitParts` on `zigoals:notify:v1` (see the table). TIER 3 (PWA): the plan and the composer.
- Help (EN): **Can I get one reminder per part of the day instead of one per habit?** Yes. In Settings → Notifications,
  tick "One reminder for each part of the day". At the start of the morning, the afternoon and the evening (times you
  choose) one notification says how many of that part's habits are still open. Anytime habits keep their own reminders.
  Quiet hours still apply.
- What's new: "Notifications: one reminder for each part of the day, if you like."
- Search (static.ts): "reminder per part of the day" → `/app/settings#notifications`.

## 4. Moods on the Day Timeline — LEDGER #370 built

- What: /app/timeline shows the day's check-ins as small marks at their times: "Mood: Good (4 of 5)" (Mood check-in),
  "Energy: 2 of 5" (Energy check-in) and "Feeling: calm (quite), grateful" (a pleasant or an unpleasant feeling word), each
  a dot in a calm theme colour by level plus its words, and a link to Health; no Done, no move, never in the Replan. A
  check-in answered on a later day has no time on that day and sits on the Anytime shelf. Only while Health is shown
  (the source returns nothing with Health hidden). Checked against the protected baseline: the timeline's own blocks,
  bands and the now line are unchanged; the marks are rows of their own kind (`data-kind="mark"`).
- Files: `lib/timeline/mood-source.ts`, `components/timeline/mood-source.tsx` (new); `lib/timeline/sources.ts` (`mark`),
  `lib/timeline/build.ts` (kind `mark`), `components/timeline/timeline-block.tsx` (the mark row),
  `components/timeline/timeline.css`, `app/app/timeline/page.tsx` (one registration line).
- Tests: `lib/timeline/av2-r5-moods.test.ts`; existing timeline tests green. Spec: `tests/av2-timeline-moods.spec.ts`.
- Stored: nothing.
- Help (EN): **Can I see my moods on the Day Timeline?** Yes. The mood, energy and feeling words you note show on the Day
  Timeline as small marks at the time you gave them, in words as well as colour, while Health is shown.
- What's new: "Day Timeline: your mood check-ins at their times."
- Search (static.ts): "moods on the timeline" → `/app/timeline`.

## 6. Review B5H fixes (one commit each)

| id | fix | commit |
|---|---|---|
| B5H-1 (Major) | A day still keeps up to 12 words: the day's `symptoms` is `.max(12)` without a catch in every older build, so raising it would make their whole `zigoals:cycle:v1` unreadable. A 13th tick is now refused with "Choose up to 12 words for one day: untick one first." (`TOO_MANY_WORDS`, `setCycleDay` throws, nothing changes); the log says "A day keeps up to 12 words; untick one to choose another." once a day has 12. Never dropped silently. Unit test in `lib/cycle/av2-r5-cycle.test.ts`. | `9941b202` |
| B5H-2 (Major) | The NOVA cycle card's visible readout reads `cycleReadout` (`lib/nova/cards/health-more.ts`): with No period, "Not shown · You chose No period in the cycle log." Only the text changed (`components/nova/widgets/cycle.tsx`, two spans); layout and look unchanged. Test `lib/nova/cards/av2-r5-cycle-card.test.ts`. | `868b2356` |
| B5H-3 (Major) | After ↑/↓, once the list has its new order, focus goes to the moved word's button for that direction, or to its other button where that one is disabled (top or bottom). Spec `tests/av2-cycle-r5.spec.ts` now moves a word to the bottom and one to the top; unit test for the ends. | `cec48d56` |
| B5H-4 (Minor) | The toggle says "Leave out" in both states (a tick when pressed, `aria-pressed`), with " the cycle from <date>" as an sr-only suffix; no aria-label over the words. Spec name updated to `/^Leave out the cycle from Jul 29/`. | `8d28cef2` |
| B5H-5 (Minor) | `pause` only for a complete cycle; the open one reads "175 days so far (still going)" and shows at a glance (60 days). | `21753b64` |
| B5H-6 (Minor) | `setCycleDay` carries a `leftOut` entry to the new first day of the same period (`carryLeftOut`); a period cleared entirely takes its cycle with it. | `e3dfe06d` |
| B5H-7 (Minor) | Mood, energy and feeling marks open `/app/health?date=<their day>`; `?mood=ask` stays the reminder's. | `f3abc26a` |

Help text change for #380: add "A day keeps up to 12 words." to the answer "Can I track my own words?".

## 5. NOVA's and ZIGi's answers (all features)

- `lib/ai/local-answers/av2-r5-body.ts` (`av2R5BodyAnswer`), cases `lib/ai/evals/as/cases-av2-r5-body.ts` (`AV2_R5_BODY`,
  seven intents, EN and NL), test `lib/ai/local-answers/av2-r5-body.test.ts` (every phrasing on the Showcase, a cycle
  fixture, a fresh profile and a late-meal world; Health closed gives the Health refusal; an action in the question is
  left alone; "when is my next period" and "what day of my cycle is it" are not claimed).
- Answers: the averages and spread with cycles left out; your words and the two choices; a cycle at a glance (words and
  their days); the late meal (Compare's own sentence); where the part-of-day reminders are, with today's open habits by
  part; the moods on today's timeline.
