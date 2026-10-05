# H7 · Habits that tick themselves off from Health

## Purpose
Some habits are already written down somewhere else in ZIGoals: a walk is in the Health activity log, water is in the water journal, press-ups are in a quick counter. With a Health link, such a habit ticks itself off once the day's Health records reach what the person asked for, so the same thing is never logged twice. A tap always wins, and undoing a tick keeps it off for the day.

## Owner principles applied
Consumer first (the card says "from your water journal", never where the rule is stored). Private by design (the rules and the markers are device-only; the check-ins they create are ordinary habit entries). Honest numbers (a day without a Health record is unknown and never completes anything; a weight link needs a real reading, never a guess). Never a chore (nothing to confirm each day).

## Scope in PR 3
- A Health link per habit: one measure, one rule, saved from the habit editor.
- The pure engine `autoCompletions` and the hook that applies it on Today, Habits and Health after both stores have loaded.
- The card badge, the editor section, the Help entry, the Showcase fixture.

Out of scope: links to body measurements other than weight, links to diary nutrition (kcal, protein), links that *un*-complete a habit, more than one link per habit, retroactive application to past days, the write switch to habits v3.

## Data
**Device key `zigoals:habit-health-links:v1`** (`lib/habit-health-links/schema.ts`), zod `strictObject`:
```
{
  version: 1,
  links: Record<habitId (uuid), HabitHealthLink>          // ≤ 200 entries
  applied: AppliedCheckIn[]                                // ≤ 5,000, newest last
}
HabitHealthLink = {                                       // byte-for-byte the fields of habitHealthLinkSchema (lib/habits.ts, PR 2)
  version: 1,
  measure: "water" | "steps" | "activeMinutes" | "weight" | "exercise",
  rule: "at-least" | "recorded",
  target?: number (0 … 1e9, in the measure's own unit: mL, steps, minutes, a count), required when rule is "at-least",
  exerciseId?: string ≤ 100 (a counter id, `health_…`), required when measure is "exercise",
  updatedAt: ISO instant
}
AppliedCheckIn = {
  habitId: uuid, date: "YYYY-MM-DD" (the habit journal's day), healthDate: "YYYY-MM-DD" (the Health journal's day read),
  measure, value: number (what was measured; 1 for "recorded"), appliedAt: ISO instant, undone?: true
}
```
Refinements: `weight` only with rule `recorded`; `at-least` needs `target > 0`; `exercise` needs `exerciseId`; one marker per `habitId + date`.

**Through existing mutators:** the check-in itself is written with `logHabitValue(data, habitId, date, smartDoneValue(rule))` (`lib/habits.ts:287`, `:355`): an ordinary `logged` entry at the day's target, exactly what the card's "Complete" button writes. Nothing else in Habits or Health changes.

**Read tolerance:** `readHabitHealthLinks(storage)` → `{data, unreadable}`; unreadable means no links apply, the editor section shows "Your saved Health links on this device could not be read. They were not changed." and offers "Start over…" (README rule 2). Links of habits that no longer exist are dropped on the next save (as `setHabitReminder` does with `habitIds`).

**Write switch (habits v3, SYNC_HOMES.md):** `links[habitId]` becomes `habits[].healthLink` unchanged (same five fields). Each marker whose entry still exists at the same `date` with `disposition: "logged"` and no `undone` sets that entry's `source: "health"`; every other entry gets no `source` (absent means manual; the enum value `"manual"` is reserved for entries written after the switch). Markers are not copied; the key is then retired after one release. Until then the markers are the only record of "done automatically".

## Engine (`lib/habit-health-links/engine.ts`, pure)
```
measureValue(health: HealthData, healthDate: string, link: HabitHealthLink): number | null
```
- `water`: `waterSummary(health, healthDate).millilitres` when `entries > 0`, else `null` (`lib/health-daily.ts:151`).
- `steps`: `dailyHealthSummary(health, healthDate).steps` when the day has at least one activity record, else `null`.
- `activeMinutes`: the same summary's `minutes`, same condition.
- `weight`: `1` when `health.weights.some(w => w.date === healthDate)` or `latestWeightObservation(health, healthDate)?.date === healthDate` (`lib/body-measurements.ts:52`), else `null`.
- `exercise`: `countOn(health, link.exerciseId, healthDate)` (`lib/health-counters.ts:43`), `null` when there is no entry.
Unknown is `null`, never `0`: a day with no record never satisfies a rule.
```
ruleMet(link, value: number | null): boolean   // null → false; "recorded" → value > 0; "at-least" → value >= target
autoCompletions({links, applied, habits, health, now}): {habitId, date, healthDate, measure, value}[]
```
For each link whose habit exists and is `build` type: `date = habitCalendarDay(habits, now)` (`lib/habits.ts:120`), `healthDate = healthDay(dailyData(health).preferences.timezone, now)`; skip when a marker exists for `habitId + date` (applied or undone); skip unless `habitDay(habit, date, date).status === "due"` (scheduled, nothing logged yet; `partial`, `skipped`, `failed` and `complete` all mean the person already acted); include when `ruleMet`. Habits of kind `quit` or `limit` are never linked (the editor hides the section for them).
```
applyAutoCompletion(data: HabitData, item, now): HabitData   // the updater passed to habits.update
```
Re-checks inside the updater, on the latest locked data, that the day still has no entry (another tab may have written one); returns `data` unchanged otherwise. The marker is written to the device key only after the update changed the data.

Edge cases: the two journals may compute different days (Habits in its own zone, Health in its own, `lib/habits.ts:120` and `lib/health-daily.ts:157`); both are computed at the same instant and both are stored in the marker. DST: pure date strings, no arithmetic. A habit paused, archived or not scheduled today: `habitDay` is not `due`, nothing happens. A target of 0 for "at-least" is refused by the schema. Water in US fl oz: the editor converts the typed target with the journal's constant 29.5735295625 and stores mL.

## Hook (`components/habits/use-auto-checkins.ts`)
`useAutoCheckIns()` is mounted once in Today, Habits and Health (not in widgets). When `habits.loaded && !habits.error && health.loaded && !health.error` and the links are loaded and readable, it computes `autoCompletions` on mount, on each store change, on focus and every 30 s (`useLocalToday`'s rhythm). Items are applied one at a time through `habits.update(applyAutoCompletion)`; a refusal (storage blocked, limit) is shown once as a quiet notice on the habit card ("This habit could not be ticked off automatically. {saveFailureMessage}") and retried on the next run. It never applies the same `habitId + date` twice.

## UI
### Habit editor, section "Done automatically from Health"
Placed after the reminder field (`components/habits/habit-editor.tsx:127`), only for `build` habits, and saved apart from the habit through a new optional `healthLink` argument of `onSave` (the reminder pattern, `habits-workspace.tsx:98`).
- Eyebrow `FROM YOUR HEALTH JOURNAL`; label "Done automatically when" with a select: "Nothing · I tick it off myself" (default), "Water", "Steps", "Active minutes", "A weight reading", "Exercise counter: {name}" (one option per counter from `exerciseData(health).counters`).
- Rule, shown for every measure except weight: radio "the day reaches at least" + number field (text, `inputMode="decimal"`, 16 px, `aria-label="Target"`) + unit ("mL" or "US fl oz" per the Health water unit, "steps", "minutes", "reps"), or radio "anything is recorded". Weight shows the single line "When a weight reading is recorded that day."
- Fine print (15 px): "ZIGoals checks your Health journal when you open Today, Habits or Health, and ticks this habit off once per day. A tap always wins; Undo keeps it off for that day. Kept with your Health records." (Session U Part 9; "Kept on this device." with the sync writes off)
- Errors: "Enter a target above zero." · "Choose an exercise counter." · unreadable notice (Data).
### Habit card and Today
- Badge under the completion row (`habit-card.tsx:148`, also in `HabitsToday`): "Done automatically · from your {water journal | activity log | weight journal | {counter name} counter} · {value}" where value is "2,250 mL", "8,800 steps", "42 minutes", "a reading" or "24 reps". Font 15 px, `role="status"`.
- After Undo (count back to 0): "Undone · it won't be ticked off again today." The marker gets `undone: true`.
### Phone, desktop, tablet
Phone first: the section sits in the editor sheet (`PhoneFormSheet`), fields 16 px, radios inside 44 px labels. Authorized desktop differences: the editor section, the card badge, and the Showcase fixtures (README list, item 2).
### Motion, keyboard, screen reader
No new motion. The select and radios are native; the badge is `role="status"` so a tick announced once; the undo notice is `aria-live="polite"`.

## Showcase data
`buildShowcase` adds a link for "Walk" (`92000000-0000-4000-8000-000000000003`): `{version: 1, measure: "steps", rule: "at-least", target: 8000, updatedAt: start}` and markers for every past day whose "Showcase walk" has ≥ 8,000 steps and whose Walk entry is logged (`n % 5` is 3 or 4, that is 8,100 or 8,800 steps; the skipped days n = 7, 16, 25 never qualify), value the steps of that day, `appliedAt` that day's stamp: 12 markers including today. Today's marker (8,800 steps) makes the Walk card read "Done automatically · from your activity log · 8,800 steps · Showcase example". The key's Showcase bytes carry no free text, so the badge adds "Showcase example" when `isShowcase()`.

## Help entry (`help-auto-checkins`)
**Can a habit tick itself off from my Health journal?** Yes. Edit the habit and choose what completes it under "Done automatically from Health": water, steps, active minutes, a weight reading or one of your exercise counters, with a target if you like. When you open Today, Habits or Health and the day's Health records reach it, the habit is ticked off once, and the card says so. Tapping the habit yourself always wins, and Undo keeps it off for that day. The rule and the marks it leaves are kept with your Health records, so with Health sync on another device won't tick the same day off again; the check-ins it makes are ordinary check-ins. *(Session U Part 9, with the sync writes on; switched off: "The rule stays on this device; the check-ins it makes are ordinary check-ins.")*

## Tests
Unit (`lib/habit-health-links/engine.test.ts`, `schema.test.ts`):
1. `measureValue` water 250 + 500 mL on the day → 750; no entries → `null`; 8 US fl oz → 236.588.
2. steps 6,000 + 2,800 across two activities → 8,800; a day with no activity → `null` (not 0).
3. weight: date-only reading today → 1; a timed measurement whose `readingDay` is today → 1; yesterday's → `null`.
4. exercise: counter day 24 → 24; no counter day → `null`; a deleted counter → `null`.
5. `ruleMet`: at-least 8000 with 8000 → true, 7999 → false, `null` → false; recorded with 0 → false.
6. `autoCompletions` with Showcase on its day → exactly one item (Walk, 8,800 steps); with the Walk entry already logged → none; with a marker for today → none; with the habit paused today → none; with a `quit` habit link → none (schema refuses it anyway).
7. No double count: `applyAutoCompletion` twice on the same data → the second returns the same object; the entry count is the target (8,000), disposition `logged`.
8. Override: after `logHabitValue(…, 0)` (Undo) and a marker, `autoCompletions` → none; a manual tap before the hook runs → none (`partial`).
9. Zones: Habits zone `Pacific/Kiritimati`, Health zone `Etc/GMT+12`, `now = 2026-10-01T11:30:00Z` → `date = 2026-10-02`, `healthDate = 2026-09-30`; both stored in the marker; the entry lands on `2026-10-02`. The same on the eleven host zones with equal zones → `date === healthDate`.
10. DST: Europe/Brussels 2026-10-25 02:30 local (the repeated hour) → the day is `2026-10-25` once, one marker.
11. Schema: 201 links refused; `at-least` without target refused; weight with `at-least` refused; version 2 refused; unreadable bytes read as empty with `unreadable: true` and are untouched.
Browser (`tests/auto-checkins.spec.ts`, desktop and mobile):
- Showcase: the Walk card shows the badge with "8,800 steps"; `zigoals:habit-health-links:v1` in session storage is unchanged after viewing Today, Habits and Health.
- Local Demo: create "Drink water" with a water link "at least 500 mL"; log 250 mL on Health → no tick; log another 250 → open Today → the habit reads "✓ Done" with the badge; the stored key holds exactly one marker; Undo on the card → "Undone …", and reloading Today does not tick it again.
- Editor on 390×844: the section is inside the sheet, every control ≥ 44 px, inputs 16 px; keyboard: Tab reaches the select, both radios and the target.
- No network request beyond the 503-routed fixture during the whole flow.

## Risks and open questions
- A person with two devices before the write switch sees the marker only on the device that applied it; the other device shows the ordinary check-in without the badge. Stated in Help ("stays on this device").
- Open: should an `at-least` link also *un*-complete when a Health record is deleted later that day? Recommendation: no (a tap always wins, and a deletion is a correction, not a failure).
