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
