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
