# Lane 2 round 6 — body and mind (Medito, Moodfit, AutoSleep, Lifesum, Caliber): builder registry

Branch `lane2/r6-body`, from `lane2/batch5` at `fb449c2c`. Rows: LEDGER "Round 6: rows #391–#431", groups W4 (Medito and
Moodfit, #411–#417), W5 (AutoSleep and Lifesum, #418, #419, #423) and W7 (Caliber, #420–#422, #424). Built on the Health,
mind and workouts registries (`habits.md`, `bodymind-r2.md`, `r3-health.md`, `r4-health.md`, `r5-gym.md`, `r5-body.md`);
the strict splits record (`zigoals:workout-splits:v1`) is not touched, nor the strict synced Health groups.

Rules kept throughout: every part sits inside Health (its gate and consent) or, for the visit report, in Settings → Your
data beside it; no calorie expenditure is estimated anywhere; no medical claim, range, verdict or clinical guidance; the
person's own words stay their own (nothing is read into them, scored or suggested from them); Health content is never in
a notification (no notification plan changes). Every new UI part loads lazily from `components/health/r6/` or its own
chunk; CSS uses theme variables only.

## Summary: rows and verdicts

| LEDGER row | verdict | feature | commit |
|---|---|---|---|
| #411 Medito: when a meditation day ends | built (a fix: sessions follow "My day ends at"; read only) | 1 | `0428e071` |
| #412 Moodfit: your own things that lift you | built (the person's own lines; one tap to today's task) | 3 | `3da1a461` |
| #413 Medito: your consistency | built (derived; never a fall) | 1 | `0428e071` |
| #414 Moodfit: grounding | built (a fixed exercise, EN and NL; nothing kept unless saved) | 4 | `dd42788b` |
| #415 Medito: log a range of past days | built (≤ 31 days, skips, one Undo) | 1 | `0428e071` |
| #416 Moodfit: a plan for a low day | built as the person's own written plan (no clinician content; the app has no support contacts to point to); if the owner reads it as a safety plan needing clinician content, that remainder is Carried: needs content made for ZIGoals | 4 | `dd42788b` |
| #417 Moodfit: things to bring up at an appointment | built (a new device record; printed at the top of the report) | 5 | `30a40b8e` |
| #418 Lifesum: fruit, vegetables and fish counted | built (none on by default; no "off track") | 6 | `ca74a7f9` |
| #419 AutoSleep: tonight's bedtime | built (derived; not on Today, see feature 2) | 2 | `465903dd` |
| #420 Caliber: favourite exercises | built | 7 | `bacc28d1` |
| #421 Caliber: a workout left out of your bests | built | 7 | `bacc28d1` |
| #422 Caliber: your bests with their days, and a fresh start | built | 7 | `bacc28d1` |
| #423 AutoSleep: time asleep out of time in bed | built (derived; an estimate when it is one) | 2 | `465903dd` |
| #424 Caliber: an exercise's own defaults | built (one defaults map for library and own exercises) | 7 | `bacc28d1` |

Stored formats: `cc266c2b` (TIER 3). Answers: `f1d6d14a`.

Specs for the shard lists (none run here): `tests/av2-r6-meditation.spec.ts`, `tests/av2-r6-sleep.spec.ts`,
`tests/av2-r6-lifts.spec.ts`, `tests/av2-r6-calm.spec.ts`, `tests/av2-r6-bring-up.spec.ts`, `tests/av2-r6-portions.spec.ts`,
`tests/av2-r6-gym.spec.ts`.

QUALITY Minors: none of the open "Not fixed" Minors is in W4, W5 or W7's areas; none taken up.

Known red until the lead spreads the keys: `lib/erase-coverage.test.ts` lists `zigoals:bring-up:v1` and
`zigoals:low-day:v1` as unplaced (this branch may not edit the export, catalogue or erase registries).

## Stored changes (TIER 3 (stored formats), all additive) — commit `cc266c2b`

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:energy:v1` (existing, device-only, loose) | optional top-level `lifts` (`[string]`, ≤ 24 held, 12 read, each 1–80 characters; checked where read, `lib/mood-words/lifts.ts liftsOf`, so one bad line drops alone), `.optional().catch(undefined)`. | Kept untouched (the record is loose); older builds offer only the built-in choices. |
| `zigoals:food-plus:v1` (existing, device-only, loose) | optional `portions` `{counters?: [{id: fruit, veg, fish or own-…, name? (own only, 1–24), aim? {n 1–50, per: day or week}}], days?: {date: {counterId: 1–50}}}` (≤ 3 own counters, ≤ 400 days; each counter, day and count checked where read, `lib/food-plus/portions.ts readPortions`). | Kept untouched; older builds show no counters. |
| `zigoals:workouts:v1` (existing, device-only, loose) | workout: optional `light` (boolean); top level: optional `favouriteExercises` (`[exercise id]`, ≤ 100, repeats and bad ids dropped alone), `bestsFrom` (`{exercise id or "*": date}`, ≤ 300), `exerciseDefaults` (`{exercise id: {sets 1–20, reps? 1–100, seconds? 1–3600, restSeconds? 0–900}}`, ≤ 300); each entry checked alone, each part `.optional().catch(undefined)`. One defaults map for library and own exercises alike (the ledger offered a field on the custom exercise plus a map; one map is one reader and the same additive change). | Kept untouched (loose); older builds count every workout in the bests and add an exercise as before. |
| `zigoals:low-day:v1` (NEW, device-only, loose, versioned) | `{version: 1, helps?: [line], people?: [line], later?: [line], note? (≤ 600), updatedAt?}` (lines 1–120 characters; ≤ 12, 8, 12; a bad line dropped alone). | New key; older builds never read it. |
| `zigoals:bring-up:v1` (NEW, device-only, loose, versioned) | `{version: 1, items: [{id bu-…, text 1–200, from: typed, journal or checkin, day?, createdAt, doneAt?}]}` (≤ 20; a bad item dropped alone, an unknown `from` reads as typed). | New key; older builds never read it. |

Test: `lib/av2-r6-body-stored.test.ts` (old records read, bad values drop alone, Export everything → erase → Restore keeps
the energy, food-plus and workouts fields; the two new keys' round trips run once registered).

## Shared to-do for the lead

- **New device keys (two):** spread `lib/av2-r6-body-keys.ts` into the registries as `lib/av2-r4-health-keys.ts` is
  (`AV2_R6_BODY_PERSONAL_KEYS` into the welcome check, `AV2_R6_BODY_EXPORT_KEYS` into `DEVICE_KEYS`,
  `AV2_R6_BODY_CATALOG_LABELS` into the catalogue (Health, device-only), `AV2_R6_BODY_RESTORE` into the restore plan
  (replace), `AV2_R6_BODY_ERASE_KEYS` into the erase), and the frozen-reader fixture if it lists device keys. Until then
  `lib/erase-coverage.test.ts` names the two keys as unplaced, and the two round trips in `lib/av2-r6-body-stored.test.ts`
  are skipped.
- engine.ts wiring and the corpus: see "Answers" at the end.
- Help, What's new and Search (static.ts): see each feature.
- CSS files touched (for the theme sheets): `components/health/r6/body-r6.css` (new).
- Today: nothing new is always visible on Today (see feature 2 for why tonight's bedtime is not on Today's wind-down card).
- Route weights: see each feature; please measure /app/health and /app/settings/data.

## 1. The meditation day, your consistency, several past days — LEDGER #411, #413, #415 built

- What:
  - #411 (a fix of a real inconsistency): a meditation session now counts on the day "My day ends at" gives, as habits,
    the Checklist and streaks do. With the day ending at 03:00 a 01:00 session counts on the evening's day in the
    minutes, the weekly bars, the days in a row, the milestones, the weekly goal, the habit links and the meditation
    reminder's "done today". Read only: `sessionDay` (lib/meditation/stats.ts) reads each session's stored start and zone
    under the setting (`activityDay`); the strict, synced Health group is unchanged. Owner rule 1 holds: a session started
    before the latest change of the setting counts under the end in force then. With midnight (the default) it is the
    calendar day exactly as before. The view's "today" follows the setting too, and a new end applies at once.
  - #413 "Your consistency" (Meditation → Your practice): "18 of the last 30 days had a session" (or "… of the 12 days
    since your first session"), Last 30 days / Last 90 days, a plain bar, and "How this is counted": up to yesterday while
    today has no session yet; a rest day only moves the window on and never takes away a day already counted; with a
    weekly goal, the weeks it was met ("your weekly goal met in 2 of 3 weeks"). No streak, no fall, no warning.
  - #415 "Several days: log a range of past days" (under Log mindful minutes): a first and a last day (at most 31, never
    after today), a time and minutes; one manual session a day; a day that already has a session at that time is skipped
    and so is one that would end after now; "2 sessions logged … 1 day was skipped …" with one Undo that removes them all.
- Files: `lib/meditation/stats.ts` (`sessionDayUnder`, `sessionDay`), `lib/meditation/consistency.ts` (new, pure; its own
  module so Today's and the dashboard's imports of stats.ts carry nothing more), `lib/meditation/engine.ts`
  (`saveManualRange`, `removeSessions`, `rangeDays`), `components/health/meditation/use-meditation.ts` (today),
  `components/health/meditation/meditation-view.tsx` (one `lazy()` line, two places), `components/health/r6/med-parts.tsx`
  (new), `components/health/r6/body-r6.css` (new), `components/reminders/reminder-cards.tsx` and
  `lib/ai/knock/compute.ts` (the meditation reminder's "done today" compares with the day "My day ends at" gives).
- Tests: `lib/meditation/av2-r6-meditation.test.ts`; existing meditation and knock tests green. Spec:
  `tests/av2-r6-meditation.spec.ts`.
- Stored: nothing (ordinary sessions; no new field).
- Help (EN): **Which day does a late meditation count on?** The day your "My day ends at" setting gives, as for habits:
  with the day ending at 3:00, a session at 1:00 counts on the evening before. **What is "Your consistency"?** In Health →
  Meditation, the days with a session out of the last 30 or 90 days (from your first session if that is later). A rest
  day never takes away a day already counted. With a weekly goal it also says how many weeks you met it. **Can I log
  several past days at once?** Yes. Under "Log mindful minutes", open "Several days", choose the first and the last day
  (up to 31), the time and the minutes. Days that already have a session at that time are skipped, and one Undo takes them
  all away.
- What's new: "Meditation: late sessions count on your day, your consistency over 30 or 90 days, and several past days at once."
- Search (static.ts): "meditation consistency", "log several days", "past meditation" → `/app/health?view=meditation`.
- Showcase hook: none needed (the Showcase's sessions already fill "Your consistency"; no pinned count reads it).
- Device keys / catalogue / export / erase: nothing new. Route weight: the meditation view (lazy already) gains one
  `lazy()` line; `lib/meditation/stats.ts` gains `day-boundary-core` (already in the shell).

## 2. Tonight's bedtime, and time asleep of time in bed — LEDGER #419, #423 built

- What:
  - #419 Health → Sleep → Tonight: "Tonight's bedtime — Bed by 23:00 for your 7 h 30 min before your usual 06:45 wake, with
    your usual 15 min to fall asleep." From the goal's hours, the middle wake time of the last 14 nights (at least 4) and
    the middle of the times to fall asleep typed in those nights (at least 3; else left out, and a line says so). "Waking
    at another time tomorrow? (tonight only)" takes a wake time for tomorrow, kept on the page for that night only
    (nothing stored; the ledger's "kept for that night only" without a stored field, as its "Derived; nothing stored"
    asks), with "Use my usual wake time". The bedtime window the person typed in their goal wins when set ("Your bedtime
    window: 22:30–23:30, for your 7 h 30 min."). Empty states teach (no goal; too few nights). "How this is worked out"
    says it is a fact from the person's own log, not advice. The Health page's Sleep card says "Tonight: Bed by …" from
    17:00 in the person's zone while no night is running (one line, no tab stop).
  - #423 each night in Recent nights and naps: "Asleep 6 h 50 min of 7 h 40 min in bed (89 %)", ", an estimate" when the
    time to fall asleep or the time awake was not typed; under Your last 7 days: "Asleep of time in bed, a night on
    average: … (n %)" with the same estimate words. Never a judgement of the number.
- Today: not added to Today's wind-down card. That card (components/reminders/reminder-cards.tsx) is shown without the
  Health gate, and the bedtime is derived from the Health sleep record, so it stays inside Health (the ledger listed "the
  Today sleep card"; there is no Today sleep card other than this reminder).
- Files: `lib/sleep/tonight.ts` (new, pure), `lib/sleep/night.ts` (`efficiency`), `lib/sleep/longer.ts` (`efficiencyOf`),
  `components/health/r6/sleep-parts.tsx` (new), `components/health/sleep/sleep-view.tsx` (one `lazy()` line, three places;
  the night's efficiency inline), `components/health/sleep/sleep-card.tsx` (one `lazy()` line), `body-r6.css`.
- Tests: `lib/sleep/av2-r6-sleep.test.ts`; existing sleep tests green (the night line is unchanged; the efficiency is its
  own line, so `tests/sleep.spec.ts` reads as before). Spec: `tests/av2-r6-sleep.spec.ts`.
- Stored: nothing.
- Help (EN): **What time should I go to bed for my sleep goal?** Health → Sleep → Tonight works it out from your own log:
  your sleep goal back from your usual wake time (the middle one of your last 14 nights), with your usual time to fall
  asleep when you have typed it. Waking at another time tomorrow? Type it there; it is used for tonight only. If you set a
  bedtime window in your goal, that is shown instead. **What is "asleep of time in bed"?** Each night shows how much of your
  time in bed you were asleep ("Asleep 6 h 50 min of 7 h 40 min in bed (89 %)"), and the last 7 days their average. It is
  an estimate when you did not type the time to fall asleep or the time awake.
- What's new: "Sleep: tonight's bedtime from your goal and usual wake time, and time asleep of time in bed."
- Search (static.ts): "bedtime tonight", "what time to go to bed", "sleep efficiency", "time in bed" → `/app/health?view=sleep`.
- Showcase hook: none needed (the Showcase's nights and goal fill both; no pinned count reads them).
- Device keys / catalogue / export / erase: nothing new. Route weight: /app/health's first chunk gains one `lazy()` line
  on the Sleep card and `wallClock` (zone-time, already there); the rest is in the Sleep view's chunk and `r6/sleep-parts`.

## 3. What lifts me — LEDGER #412 built

- What: on an unpleasant feeling word (the check-in's word in the Journal, ZIGi's check-in and the evening check-in, all
  through the shared feeling words), "What lifts you · your own list" comes first, above the built-in choices: the
  person's own short lines (up to 12, each up to 80 characters), each with "Make it a task for today" (a task due today,
  with Undo and "Open Tasks"). Empty, it teaches ("Write down a few small things that lift you, on a good day, so they
  are here on a harder one"). "Edit what lifts you" adds, moves (↑ ↓, focus stays on the moved line) and removes (Undo;
  focus to the next line or the field). Under it a calm link to the person's own "On a low day" page (#416). A pleasant
  word shows the built-in choices only. Their own words: nothing is suggested from them, nothing is scored, and they are
  never put in a notification (no notification reads the energy record's `lifts`).
- Owner note (#412 close to the no-medical-advice rule): only the person's own lines and the existing built-in choices;
  no new advice text.
- Files: `lib/mood-words/lifts.ts` (pure; stored commit), `components/health/r6/lifts.tsx` (new),
  `components/mood-words/feeling-choices.tsx` (one `lazy()` line; the built-in choices unchanged), `body-r6.css`.
  `lib/mood-words/strategies.ts` is unchanged (the built-in choices stay as round 4 wrote them).
- Tests: `lib/mood-words/av2-r6-lifts.test.ts`, `lib/av2-r6-body-stored.test.ts`; existing mood-words tests green. Spec:
  `tests/av2-r6-lifts.spec.ts`.
- Stored: `lifts` on `zigoals:energy:v1` (see the table).
- Help (EN): **Can I keep my own list of things that lift me?** Yes. When you choose an unpleasant feeling word, "What lifts
  you" shows your own list first. Add a few small things on a good day — a walk, a call, a song — and on a harder day tap
  "Make it a task for today". The list stays on this device and is never put in a notification.
- What's new: "Feeling words: your own list of what lifts you, first on a harder day, one tap to make it today's task."
- Search (static.ts): "what lifts me", "my own coping list", "things that help me" → `/app/journal`.
- Showcase hook: none (the list is the person's own; a Showcase list would put words in their mouth).
- Device keys / catalogue / export / erase: nothing new (the energy record is registered). Route weight: the feeling words'
  choices chunk gains one `lazy()` line; the rest is `r6/lifts`. /app/journal and /app/health are otherwise unchanged.

## 4. Grounding, and your own page for a low day — LEDGER #414 built, #416 built (as the person's own written plan)

- What:
  - #414 Health → Meditation → "Five, four, three, two, one: a grounding exercise" (a fold beside the calm visual): five
    things you can see, four you can touch, three you can hear, two you can smell, one you can taste — one sense at a time
    (focus moves to each step's heading), a word in each field or "Skip this one", Back, and "In het Nederlands". At the
    end: "You noticed what is around you, one sense at a time." and the words in one line; nothing is kept unless the
    person chooses "Save these words as a journal line" (an ordinary journal entry). A fixed exercise: no reading of the
    answers, no score, no clinical word (a unit test bans them).
  - #416 Health → Meditation → "On a low day: your own page" (`#low-day`; one tap from an unpleasant check-in's "What lifts
    you", feature 3, and from the Calm folds): "Small things that help me" (up to 12), "People I could message" (up to 8),
    "Things that can wait for another day" (up to 12) and "A line for yourself" — the person's own words only, written on a
    good day; Remove with Undo. Under it the help lines the app already shows (the same numbers as ZIGi's reply to
    distress words; a unit test checks each number is in both). It says it stays on this device and is never sent to
    ZIGi's AI (no AI source reads `zigoals:low-day:v1`; the on-device answer only says where the page is).
- Owner notes: built only as the person's own written plan of small things that help them (LEDGER owner note under #416);
  nothing suggested, no safety-plan steps, no clinician content. The app has no support contacts of its own, so there is
  no pointer to them; the person's own "People I could message" stands in their place. If the owner reads this page as a
  safety plan that needs a clinician's content, the remainder is Carried: needs content made for ZIGoals.
- Files: `lib/calm/grounding.ts`, `lib/calm/help-line.ts` (new, pure), `lib/calm/low-day.ts` (stored commit),
  `components/health/r6/calm-parts.tsx` (new), `components/health/meditation/meditation-view.tsx` (one `lazy()` line, two
  folds, the `#low-day` opener), `body-r6.css`. `calm-chooser.tsx` is unchanged (the grounding sits beside it as its own
  fold, not inside the calm-visual chooser).
- Tests: `lib/calm/av2-r6-calm.test.ts`, `lib/av2-r6-body-stored.test.ts`. Spec: `tests/av2-r6-calm.spec.ts`.
- Stored: `zigoals:low-day:v1` (new key, see the table and the shared to-do); grounding stores nothing (a saved line is an
  ordinary journal entry).
- Help (EN): **Is there a grounding exercise?** Yes. In Health → Meditation, open "Five, four, three, two, one": notice five
  things you can see, four you can touch, three you can hear, two you can smell and one you can taste, a word each or
  skip. Nothing is kept unless you save the words as a journal line. It is also in Dutch. **What is "On a low day"?** A
  page of your own in Health → Meditation, written on a good day for a harder one: small things that help you, people you
  could message, things that can wait, and a line for yourself. Only your words; it stays on this device and is never sent
  to ZIGi's AI. The help lines are under it.
- What's new: "Calm: a five-senses grounding exercise, and your own page for a low day."
- Search (static.ts): "grounding", "5 4 3 2 1", "five senses" → `/app/health?view=meditation`; "low day", "bad day plan",
  "things that help me" → `/app/health?view=meditation#low-day`.
- Showcase hook: none (the low-day page is the person's own; a Showcase page would put words in their mouth).
- Device keys / catalogue / export / erase: `zigoals:low-day:v1` via `lib/av2-r6-body-keys.ts` (shared to-do). Route weight:
  the meditation view (lazy already) gains one `lazy()` line; the rest is `r6/calm-parts`.

## 5. Things to bring up at a visit — LEDGER #417 built

- What: Settings → Your data → Report for a visit → "To bring up at your next visit" (a fold; it opens by itself at
  `#report-visit-title`, the toast's "Open the list"): the lines the person wants to mention, kept between visits (up to
  20, each up to 200 characters), typed there or added in one tap — "Bring this up at my next visit" in a journal entry's
  More (its first sentence, cut at a word) and under a feeling word in the check-in ("Felt tense", with its day). Each line
  says where it came from; Remove with Undo. "Make a report" offers "At the top: what you want to bring up (n lines)"
  (ticked while there are open lines) and the report prints them first, under "To bring up — in the person's own words,
  written before this visit". After the visit each is ticked off; "Clear the ticked lines (n)" makes room, with Undo. The
  person's own words, as written; nothing is interpreted or suggested.
- Owner note (#417 close to the no-medical-advice rule): only the person's own lines; the report's header still says it is
  not a medical record and holds no advice.
- The ledger named "the report's own device record"; the visit report had none (it is built fresh each time), so the list
  is a new device record, `zigoals:bring-up:v1`.
- Files: `lib/clinician-report/bring-up.ts` (stored commit), `components/report/bring-up-list.tsx`,
  `components/health/r6/bring-up-add.tsx` (new), `components/report/report-launcher.tsx` (one `lazy()` line, the fold),
  `components/report/report-builder.tsx` (the record, the choice), `components/report/report-document.tsx` (the section at
  the top, an optional prop), `components/journal/entry-more.tsx` and `components/mood-words/feeling-choices.tsx` (one
  `lazy()` line each), `components/mood-words/mood-words-grid.tsx` (passes the day), `body-r6.css`.
  `lib/clinician-report/build.ts` is unchanged (the lines are not part of the log summary; they are passed beside it).
- Tests: `lib/clinician-report/av2-r6-bring-up.test.ts`, `lib/av2-r6-body-stored.test.ts`; existing report tests green.
  Spec: `tests/av2-r6-bring-up.spec.ts`.
- Stored: `zigoals:bring-up:v1` (new key, see the table and the shared to-do).
- Help (EN): **Can I keep a list of things to bring up at my next appointment?** Yes. In Settings → Your data → Report for
  a visit, open "To bring up at your next visit" and add a line, or tap "Bring this up at my next visit" on a journal entry
  (under More) or under a feeling word. The lines print at the top of your report. Tick them off after the visit and clear
  them. They stay on this device.
- What's new: "Report for a visit: a list of things to bring up, added from your journal or a check-in, printed at the top."
- Search (static.ts): "bring up at appointment", "questions for my doctor", "visit list" → `/app/settings/data#report-visit-title`.
- Showcase hook: none (the list is the person's own).
- Device keys / catalogue / export / erase: `zigoals:bring-up:v1` via `lib/av2-r6-body-keys.ts` (shared to-do). Route
  weight: /app/settings/data's first chunk gains one `lazy()` line and the fold; /app/journal's More chunk and the feeling
  words' choices chunk one `lazy()` line each; the report builder (lazy already) the record's schema.

## 6. Portion counters — LEDGER #418 built

- What: Health → Diary (the food day), under the day's entries: "Portions today" (or "on <day>" for a past diary day).
  Nothing is on by default: it teaches ("Count portions of fruit, vegetables or fish with one tap, or something of your
  own. None is on until you choose it, and there is no “off track”.") and "Choose what to count" opens the choices —
  Fruit, Vegetables, Fish (checkboxes) and up to three of the person's own ("such as nuts or legumes"); each counter can
  have its own aim, a number a day or a week ("Save the aim for …"), or none. Each counter is a card with − and + (44 px,
  named "One more: Vegetables"), the count, and a plain line: "2 today · your aim 5 a day", "0 today · 2 this week · your
  aim 2 a week · reached". No "off track", no "behind", nothing on by default (Lifesum's fish tracker told a vegetarian they
  were off track: the ledger's owner note). Turning a built-in counter off keeps its days; removing an own one takes its
  days. A portion is what the person counts as one; nothing is read from the diary and no calorie figure is involved.
- Checked against the protected baseline (docs/STATUS.md "Current accepted baseline"): nothing there covers the Food diary's
  layout; the counters are one panel after the day's entries, the rest of the page is unchanged.
- Files: `lib/food-plus/portions.ts` (pure; stored commit), `components/health/food-plus/portion-counters.tsx` (new),
  `components/health/food-plus/food-plus.tsx` (a `portions` part, one `lazy()` line), `components/health/health-app.tsx`
  (one `<FoodPlus part="portions" …/>` element), `body-r6.css`.
- Tests: `lib/food-plus/av2-r6-portions.test.ts`, `lib/av2-r6-body-stored.test.ts`. Spec: `tests/av2-r6-portions.spec.ts`.
- Stored: `portions` on `zigoals:food-plus:v1` (see the table); in Export everything and the erase with Food (the record is
  registered already).
- Help (EN): **Can I count portions of fruit, vegetables or fish?** Yes. In Health → Diary, choose "Choose what to count"
  and pick fruit, vegetables, fish or up to three things of your own. Tap + for each portion. You can give each an aim a
  day or a week; it only says when it is reached. None is on until you choose it.
- What's new: "Food: one-tap portion counters for fruit, vegetables, fish or your own — none on until you choose."
- Search (static.ts): "portions", "fruit and vegetables", "fish per week", "count portions" → `/app/health?view=diary`.
- Showcase hook: none (a Showcase counter would show on the Diary that other specs pin; nothing is on by default).
- Device keys / catalogue / export / erase: nothing new. Route weight: /app/health's first chunk gains one element; the
  counters are their own chunk through the food-plus entry (lazy already). Please measure /app/health.

## 7. Favourite exercises, a light week out of the bests, bests with their days, an exercise's defaults — LEDGER #420, #421, #422, #424 built

- What (Health → Workouts):
  - #420 a star on an exercise: "☆ Favourite" in "Exercises and how-tos" (the exercise's card; a ★ on its row in the list,
    read as ", a favourite") and on every row of "+ Add an exercise" (a 44 px pressed button, "Favourite: Squat"). When
    adding one, "Favourites" comes first (in the order starred), then "All exercises"; the search, the muscle group and the
    place filter apply to both.
  - #421 "Light week (not in my bests)" on a finished workout (Your workouts, opened; pressed while on; its row says
    "· light week"): its sets stay in the history, the calendar, the volume, the weekly summary and the progress chart, but
    are left out of the bests, the "new best" marks (none in that workout, and it is not one to beat), the progression's
    next weights and the first sets of an exercise added later (the last workout that counts fills them). The exercise's
    card says "1 light week is left out of these bests; it stays in your history."
  - #422 the exercise's card: "Your bests and their days" — "Heaviest: 100 kg · Mon, Oct 12", "Estimated one-rep max: …",
    and so on for what it measures, each with the day it was first reached; "Count bests from today" for this exercise or
    "for all exercises" (after an injury or a new gym): the history stays; the bests and the "new best" marks start again
    from that day, and the earlier bests show greyed under "Before <day>: … (before)"; "Count every workout again" undoes it.
  - #424 the exercise's card: "Its own defaults" — sets, reps each (or seconds each for a timed exercise) and rest
    ("Now: 3 × 8, 2 min rest."), used when it is added to a workout and has no earlier sets; earlier sets still win (as
    Hevy's row has it). Out-of-range values say a sentence.
- Files: `lib/workouts/engine.ts` (`countsForBests`, `bestsFromOf`, `exerciseHistory` with `bestDays`, `from`, `before`,
  `lightLeftOut` and each session's `counts`; `personalBests`; `lastEntryFor(…, {skipLight})`; `addExercise` with the
  defaults), `lib/workouts/progression.ts` (a light week is not built on), `lib/workouts/r6-gym.ts` (new, pure),
  `components/health/r6/exercise-own.tsx` (new), `components/health/workouts/exercise-library.tsx` (one `lazy()` line, the
  ★ on a row), `components/health/workouts/workouts-view.tsx` (the picker's Favourites and stars, the light-week button,
  `body-r6.css`), `body-r6.css`. The strict splits record is not touched.
- Tests: `lib/workouts/av2-r6-gym.test.ts`, `lib/av2-r6-body-stored.test.ts`; the existing workouts, set-best, progression,
  analytics and answers tests green (the answers' bests now follow the light weeks and fresh starts, as the page does).
  Spec: `tests/av2-r6-gym.spec.ts`.
- Stored: `light`, `favouriteExercises`, `bestsFrom`, `exerciseDefaults` on `zigoals:workouts:v1` (see the table).
- Help (EN): **Can I star exercises I do often?** Yes. Choose ☆ Favourite on an exercise in "Exercises and how-tos" or in
  the list when you add one; your favourites come first when you add an exercise. **Can a light week stay out of my
  bests?** Yes. Open the workout under Your workouts and choose "Light week (not in my bests)". Its sets stay in your
  history and volume, but your bests, the "new best" marks and the next weights leave it out. **Can I see when I set a
  best, or start my bests again?** In "Exercises and how-tos", an exercise shows each best with the day you set it.
  "Count bests from today", for that exercise or all of them, starts your bests again after an injury or a new gym; earlier
  ones stay, greyed as "before". **Can an exercise have its own sets and rest?** Yes: under "Its own defaults" set the
  sets, reps (or seconds) and rest. They are used when you add it with no earlier sets; your last sets still win.
- What's new: "Workouts: favourite exercises first, a light week out of your bests, bests with their days and a fresh start, and an exercise's own defaults."
- Search (static.ts): "favourite exercises", "deload", "light week", "personal best date", "reset bests", "exercise
  defaults", "default sets and reps" → `/app/health?view=workouts`.
- Showcase hook: none (a Showcase star would change the add-exercise list that Showcase specs walk; no pinned count moves).
- Device keys / catalogue / export / erase: nothing new (the workouts record is registered). Route weight: the Workouts
  chunk (lazy already) gains `r6-gym.ts` (small) and the CSS; the card's part is `r6/exercise-own`.

## Answers (NOVA and ZIGi, on the device)

- File: `lib/ai/local-answers/av2-r6-body.ts` exporting `av2R6BodyAnswer(question, env)`; cases
  `lib/ai/evals/as/cases-av2-r6-body.ts` (`AV2_R6_BODY`, 14 intents, 28 English and 28 Dutch questions); test
  `lib/ai/local-answers/av2-r6-body.test.ts`: every phrasing answered on the Showcase and fresh; Health closed → the Health
  refusal; an action in the question → left alone; a Dutch answer holds no English filler; the figures from the features'
  own functions; and none of the corpus questions (`CORPUS`, this round's own intents left out) is claimed.
- Questions: which day a late meditation counts on (the "My day ends at" in force); your meditation consistency (30 or
  90 days, the weeks the goal was met); several past days at once (how); the grounding exercise (how; nothing kept);
  what lifts me (the person's own lines, as written); the low-day page (where it is, never its words, with the help lines);
  what to bring up (counted, never quoted); tonight's bedtime (a fact from the goal and the last 14 nights, never "you
  must"); time asleep of time in bed (the last 7 days, an estimate when it is one); portions counted today (by counter or
  all, with the aim; never "off track"); favourite exercises; light weeks; the days of the heaviest sets; the exercises'
  own defaults. Never a calorie figure, a medical reading or advice.
- engine.ts wiring (one line, after `av2R5GymAnswer`, same shape):
  `if (!subject) { const own = av2R6BodyAnswer(question, env); if (own) { const info = novaEnvInfo(env); return info ? novaWording(own, info, questionLanguage(question) === 'nl' ? 'nl' : 'en') : own; } }`
  with `import {av2R6BodyAnswer} from './av2-r6-body';`.
- Corpus: add `AV2_R6_BODY` to `CORPUS` in `cases.ts` and record `expected.json`.
- AK tool sources (`lib/ai/tools/ak-sources.ts`): `bringUp: one(BRING_UP)` (from `lib/clinician-report/bring-up.ts`; Health
  gate checked by the answer). Until it is wired the bring-up answer says where the list is. The low-day page
  (`zigoals:low-day:v1`) must NOT be added to any AI source: it is never sent to ZIGi's AI. The rest reads `env.health`
  (meditation, sleep), `env.energy`, `env.foodPlus` and `ak.workouts`, all wired already.
