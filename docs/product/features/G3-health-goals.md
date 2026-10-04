# G3 · Goals that track a Health measure

## Purpose
A goal can be about the body as well as money: "walk 8,000 steps a day on average this month", "drink water on 25 days", "reach 72 kg by June". A health goal watches one measure in the person's own Health journal and shows how far along it is, from real records only. It never suggests a target and never says what a number means.

## Owner principles applied
Health safety: no suggested targets, no medical wording, no judgement of a weight direction (the copy is "towards 72 kg", never "lose"). Honest numbers: progress is computed from records, never stored, and "No data yet" is shown when there is nothing to count. Private by design: device-only until the write switch. Consumer first: it sits with the other goals, in the Health units the person already chose.

## Scope in PR 3
- Create, edit, close and reopen health goals on the Goals page (section "Health goals · on this device").
- Five measures, three directions, two kinds of window; progress from `lib/health-goals/progress.ts`.
- A "Health goals" card in Today's "For you" area (the owner's addition at plan approval supersedes plan 3.2's rows inside "Your goals": one card, so Today stays short). Help entry, Showcase fixture.

Out of scope: body measurements other than weight, nutrition measures (kcal, protein), reminders for health goals, linking a health goal to a habit, a chart, the write switch to finance v4.

## Data
**Device key `zigoals:health-goals:v1`** (`lib/health-goals/schema.ts`): `{version: 1, goals: HealthGoal[]}`, ≤ 200, ids unique.
`HealthGoal` is byte-for-byte `healthGoalSchema` of `lib/positions.ts` (PR 2):
```
{
  version: 1, id: uuid, name: string 1–100 (visible text, lib/visible-text.ts),
  measure: "weight" | "steps" | "water" | "exercise" | "activeMinutes",
  direction: "down" | "up" | "at-least",
  target: { value: integer string (units pattern ^(0|[1-9]\d*)$, ≤ 78 digits), decimals: 0–18 },
  unit: string 1–24,                                   // "kg" | "lb" | "mL" | "US fl oz" | "steps" | "reps" | "minutes" | "days"
  window: { kind: "by", date: "YYYY-MM-DD" } | { kind: "rolling", weeks: 1–104 },
  exerciseId?: string ≤ 100,                           // required for "exercise"
  status: "active" | "done" | "closed", notes?: string ≤ 2000, createdAt, updatedAt: ISO instants
}
```
Measure, direction, unit and target meaning:
| measure | directions | unit (from Health preferences) | target means |
|---|---|---|---|
| weight | down, up | `weightUnit` kg or lb (`dailyData(health).preferences`) | the 30-day trend value to reach (`weightTrend`, `lib/health.ts:238`) |
| steps | at-least | steps | average steps per day over the window, counting days with an activity record only |
| water | at-least | days | days in the window on which water reached the personal water target (or any water, when no target is set) |
| exercise | at-least | reps | the sum of a counter's daily counts over the window |
| activeMinutes | at-least | minutes | the sum of activity minutes over the window |
`target.value` with `decimals` is the number in `unit` (72.5 kg → `{value: "72500", decimals: 3}`); progress converts to grams or mL with the Health constants (`bodyWeightGrams`, `lib/health-daily.ts:164`: 0.45359237; water 29.5735295625) so a later unit change in Health never moves a goal.

**Through existing mutators:** none. Health goals read Health; they write only their own key.

**Read tolerance:** `readHealthGoals(storage)` → `{data, unreadable}`; unreadable shows the calm notice on the Goals section and hides the Today card; "Start over…" per README.

**Write switch (finance v4):** `goals[]` is copied as-is into `platform.healthGoals` (same schema), `schemaVersion` 3 → 4 on that first write (`financeVersion`, `lib/positions.ts` in PR 2), the key deleted after a successful write and kept readable one release longer. Two devices creating goals before the switch keep separate lists; the migration merges by id (both lists are copied, ids never collide since they are uuids).

## Engine (`lib/health-goals/progress.ts`, pure)
```
windowDays(goal, today: string): { start: string; end: string }
```
`by`: `start = createdAt`'s Health day, `end = window.date`; `rolling`: `end = today`, `start = addLocalDays(today, -(7 * weeks) + 1)` (`lib/local-date.ts:12`, pure date arithmetic, DST-safe). `today` is `healthDay(preferences.timezone, now)`.
```
healthGoalProgress(goal, health: HealthData, today): HealthGoalProgress
HealthGoalProgress = { kind: "no-data" } | { kind: "value", current: number, target: number, unit: string, percent: number | null, days: number, done: boolean, detail: string }
```
- weight: `weightTrend(health, min(today, end))`; `no-data` when `count === 0`; `current = averageGrams` converted to `unit`; `done` when (down: `current <= target`) or (up: `current >= target`); `percent` null for weight (a body is not a progress bar); `detail` "30-day average of {n} readings · latest {x} {unit} on {date}".
- steps: days in the window with ≥ 1 activity record; `no-data` when none; `current = round(sum steps / days)`; `percent = min(100, current / target * 100)`; `detail` "{days} days with activity recorded · {sum} steps in total".
- water: `current` = days where `waterSummary(health, day).entries > 0` and (`targetMl === null` or `millilitres >= targetMl`); `no-data` when no water entry in the window; `detail` "{current} of {daysSoFar} days so far".
- exercise: `current = sum countOn(...)` over the window, `no-data` when every day is `null`; a counter that no longer exists → `{kind: "no-data"}` with detail "This counter was deleted."
- activeMinutes: `current = sum minutes` over days with activity; `no-data` when none.
- `done` for at-least: `current >= target`. Reaching `done` never changes `status` by itself; the card offers "Mark done" (status `done`, `updatedAt`), so nothing is written on view.
Edge cases: a `by` date in the past shows "Ended {date}" with the final figure; a window starting before the first Health record counts only recorded days; limits: 200 goals; `target.value` must be above zero for at-least and up; weight targets must be within 1 g … 1,000,000 g after conversion.

## UI
### Goals page, section "Health goals · on this device"
A `LayoutRegion` item `goals:health` after the goal grid (`app/app/goals/page.tsx`). Eyebrow `YOUR BODY, YOUR MEASURE`, heading "Health goals", lede "Progress from your own Health journal. Nothing is suggested, and nothing is scored." Button "+ Health goal" (primary, 44 px). Empty state: "No health goals yet. Choose a measure you already record in Health, and a target you've chosen yourself."
Rows (one per active goal, done and closed behind a "Show done and closed (n)" fold): name · "{current} of {target} {unit}" or "No data yet" · a `GlassBar` for `percent` when not null · `detail` in 15 px · "Edit", "Mark done" (when `done`), "Close". A closed goal row: "Closed {date} · Reopen".
### Creator (phone: `PhoneFormSheet` "New health goal"; desktop: in-page panel, the Goal creator style)
Fields: "Name" (text, 100), "Measure" (select: Steps per day · Water days · Exercise counter · Active minutes · Weight), "Counter" (select, exercise only), "Direction" (weight only: "Towards a lower weight" / "Towards a higher weight"; others fixed "At least"), "Target" (text, `inputMode="decimal"`, 16 px, unit shown after it), "Window" (radio: "By a date" + date input; "Rolling" + "weeks" number 1–104, default 4), "Notes (optional)" (textarea 2000). Fine print: "Units follow your Health journal settings ({unit}). ZIGoals never suggests a target and does not give medical advice." Buttons "Create health goal" / "Cancel"; errors: "Give the goal a name." · "Enter a target above zero." · "Choose a date after today." · "Choose an exercise counter." · unreadable notice.
### Today, "For you" card "Health goals"
Up to three active goals, each one line: name · "{current} of {target} {unit}" or "No data yet"; link "All health goals →" to `/app/goals#goals-health`. Priority 5 in the area (README). Hidden when there is no active goal or the key is unreadable.
### Phone, desktop, tablet
Phone first: rows are one column, 44 px actions, the creator is a sheet. Authorized desktop differences: the Goals section and creator, the Today card (README items 1 and 3).
### Motion, keyboard, screen reader
`GlassBar` grows once (existing behaviour, final state under reduced motion). The section is `aria-labelledby`; rows are a list; each row's buttons carry the goal name in `aria-label` ("Edit Walk more").

## Showcase data
One goal with a fixed id in the Showcase habit range: `{version: 1, id: "92000000-0000-4000-8000-0000000000a1", name: "Walk more (Showcase)", measure: "steps", direction: "at-least", target: {value: "8000", decimals: 0}, unit: "steps", window: {kind: "rolling", weeks: 4}, status: "active", notes: "SHOWCASE DATA · fictional health goal", createdAt: start, updatedAt: start}`. With the Showcase walks (6,000 + 700 × (n mod 5) steps on each of the 30 days) the rolling 4-week window holds the 28 days n = 2 … 29, 209,300 steps in all, so it reads "7,475 of 8,000 steps" (`detail`: "28 days with activity recorded · 209,300 steps in total"), and the row adds "Showcase example".

## Help entry (`help-health-goals`)
**What is a health goal, and where does its progress come from?** A health goal watches one thing you already record in Health: steps, water, an exercise counter, active minutes, or your weight trend. You choose the target and the window; ZIGoals only counts your own entries, and shows "No data yet" when there is nothing to count. It never suggests a target, never grades a result and gives no medical advice. Health goals stay on this device for now.

## Tests
Unit (`lib/health-goals/progress.test.ts`, `schema.test.ts`):
1. Showcase on its day, "Walk more": `{kind: "value", current: 7475, target: 8000, percent: 93.4375, days: 28, done: false}` (sum 209,300 over 28 recorded days).
2. steps with no activity in the window → `no-data`; one day of 12,000 steps in a 4-week window → `current: 12000` (average over recorded days, never over 28).
3. water: target 2,000 mL, days with 750 / 2,000 / 2,250 mL → `current: 2`; no target set, any entry counts → `3`; no entries → `no-data`.
4. exercise: counter days 20, 26, null, 30 → `current: 76`; deleted counter → `no-data` with the deletion detail.
5. activeMinutes: 35 + 40 → `75`.
6. weight down to 72 kg: readings 74.6 … 73.44 → `current` is the 30-day average in kg, `done: false`; readings averaging 71.9 → `done: true`; lb unit: target 158.7 lb stored as `{value: "1587", decimals: 1}` compares in grams.
7. Windows: rolling 4 weeks ending 2026-10-01 → start 2026-09-04; `by` 2026-09-20 viewed on 2026-10-01 → ended, final figure; DST days 2026-03-29 and 2026-10-25 in Europe/Brussels through `healthDay` give consecutive window days.
8. Zones: `today` from `healthDay('Pacific/Kiritimati', 2026-10-01T11:30:00Z)` → window ends 2026-10-02; `Etc/GMT+12` → 2026-09-30.
9. Schema: 201 goals refused; `at-least` with target 0 refused; `exercise` without `exerciseId` refused; a version 2 key unreadable and untouched.
Browser (`tests/health-goals.spec.ts`, desktop and mobile):
- Showcase: the Goals section lists "Walk more (Showcase)" with "7,475 of 8,000 steps · Showcase example"; the Today "Health goals" card shows the same line; the key is unchanged after viewing Goals and Today.
- Local Demo: create "Water days" (water, at least 5 days, rolling 2 weeks) → "No data yet"; log 250 mL on Health → "1 of 5 days"; the stored key equals the expected object; "Close" then "Reopen".
- 390×844: the creator is a sheet with 16 px inputs; every control ≥ 44 px; the Goals section fits without horizontal scroll at 320 px.

## Risks and open questions
- Weight goals: the copy avoids every judgement, but a goal "towards a lower weight" is still a weight goal. The safety line in the creator and Help is the mitigation; no further guardrail is proposed.
- Open: whether a health goal should appear in `unifiedGoalSummaries` (`lib/goal-summary.ts:66`) later. Not in PR 3: that list is financial and synced.
