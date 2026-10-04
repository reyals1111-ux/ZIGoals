# H1 · Streak protection: planned skips, vacation days, rest days

## Purpose
A streak should measure what a person set out to do, not punish a holiday or a day they chose to rest. A skipped day no longer breaks a streak; a skip can be planned ahead for a trip or a rest, a whole vacation can be marked in one go, and both can be undone. Rest days are what the schedule already says: pick the weekdays you do this, or a number of times per week, and the days in between never count against you.

## Owner principles applied
Never a chore (one action for a whole vacation). Honest numbers (a skipped day is neither a success nor a failure, and the stats say how many there were). Private by design (planned skips are ordinary `skipped` entries, so they sync and back up as today). Consumer first (the words are "planned skip" and "vacation", not dispositions).

## Scope in PR 3
- Streak maths: `skipped` outcomes are neutral in `computeHabitStats` (`lib/habits.ts:308`).
- New mutators `planSkip`, `unplanSkip`, `setVacation`, `clearVacation`, allowed up to 366 days ahead.
- A `planned-skip` day status for future skipped days, calendar label and legend.
- Editor shortcuts for rest days; a "Plan a skip" and "Vacation" control on the card; no reminder on a skipped day (already true, proven).

Out of scope: a vacation that pauses reminders on other devices (reminders are device-only), skipping aggregate-period habits per day (a frequency habit has no per-day streak), changes to weekly consistency or completion percentage (see Risks).

## Data
No new device key. Planned skips and vacation days are `entries[]` of the synced Habits record (`habitDataSchema`, `lib/habits.ts:57`): `{date, count: 0, disposition: "skipped", note, updatedAt}` where `note` carries the reason: `"Planned skip"`, `"Planned skip · {reason}"` or `"Vacation"` (the note is the person's text field, ≤ 2,000, and stays theirs to edit). The schema already allows entries on any date on or after `startDate` (`lib/habits.ts:75`), so no format change and nothing to migrate; an older build reads a future skipped entry and shows the day as "Future" until it arrives, then "Skipped".

## Engine (`lib/habits.ts`, additive)
- `computeHabitStats`: in the outcome loop (`:330`) a `skipped` outcome increments `skipDecisions` and leaves `streak.current` as it is (neither `++` nor `= 0`). `bestStreak`, `successCount`, `failCount`, `skipCount`, `completionPercentage` and `weeklyConsistency` keep their formulas. A streak therefore can only be equal or longer than before for the same data.
- `HabitDayStatus` gains `"planned-skip"`: `computeHabitDay` (`:263`) returns `{status: "planned-skip", scheduled: false, note, …}` when `date > today` and the entry's disposition is `skipped`; every other future day stays `"future"`. `dueReminders` (`lib/reminders/due.ts:24`) shows a card only for `due` or `partial`, so a skipped or planned-skip day never gets one.
- New mutators (all return validated `HabitData`, accept `now` for tests, and use `habitCalendarDay(data, now)` for today):
  - `planSkip(data, id, date, reason = "", now)`: `today < date ≤ addLocalDays(today, 366)`, the rule on `date` is active and `scheduledOn` (else "Choose a scheduled day within the next year."); writes a skipped entry with note `"Planned skip" + (reason ? " · " + reason : "")`, replacing any skipped entry on that date; refuses with "A check-in is already saved for that day." when the day has a `logged` entry with count > 0.
  - `unplanSkip(data, id, date, now)`: removes the skipped entry on a future date (`date > today`); today's or a past skip is corrected through the existing day editor and `setHabitEntryStatus`.
  - `setVacation(data, {from, to, habitIds?}, now)`: `today ≤ from ≤ to ≤ addLocalDays(today, 366)`; for each habit in `habitIds` (default: every habit whose latest rule is `active`), for each scheduled day in the range without a logged entry with count > 0, writes a skipped entry noted `"Vacation"`; today's day goes through the same rule as `setHabitEntryStatus`. Refuses with "This habit's history is full." if a habit would pass 20,000 entries; nothing is written then (all or nothing per `update`).
  - `clearVacation(data, {from, to, habitIds?}, now)`: removes skipped entries noted `"Vacation"` in the range on days `≥ today`.
- Edge cases: `addLocalDays` is pure calendar arithmetic, so the 366-day limit and the ranges are DST-safe; a leap day in the range is a day; a weekday schedule only skips scheduled weekdays; an interval schedule uses its anchor; frequency and target-period habits are not per-day and `planSkip` refuses them with "This habit counts per {period}; skip a day in its History instead." A paused habit is left alone by `setVacation`.

## UI
### Habit card (`components/habits/habit-card.tsx`)
- Under "History & reflection", a row "Plan a skip" (quiet button, 44 px) opening an inline form: date (`type="date"`, min tomorrow, max today + 366), "Reason (optional)" (text, 100), "Save skip" / "Cancel". Status "Skip planned for {long date}." Planned skips are listed under the form as "Planned: {date} · {reason}" with "Remove" each.
- Calendar: a future skipped day renders class `habit-day-planned-skip` (hollow circle, dimmed) with `aria-label` "{date}: Planned skip"; the legend (`:110`) gains "◌ Planned skip". The day editor stays disabled for future days as today.
- The 28-day cadence dots are unchanged (they show the past).
- Stats: "○ {n} skipped" stays; "Current streak" no longer resets on a skip.
### Habits page header: "Vacation"
A quiet button "Vacation" next to "+ New habit" (`components/habits/habits-workspace.tsx:104`) opening a sheet on phones (`PhoneFormSheet` "Vacation days") and an in-page panel on desktop: "From" and "To" dates (min today, max today + 366), a checklist of active habits (all ticked), fine print "Scheduled days in this range are marked as skipped. Streaks don't break on skipped days, and reminders stay quiet on them. Check-ins you already saved are kept." Buttons "Mark vacation" / "Cancel"; afterwards "Vacation marked for {n} habits, {d} days." and a "Clear vacation days" row for the same range.
### Editor, rest days
Under "Schedule" (`habit-editor.tsx:122`) a fine-print line: "Rest days are simply the days off your schedule: choose the weekdays you do this, or X times per period. Days off the schedule never count against you." with a quiet button "Weekdays only" that sets the schedule to `weekdays` Mon–Fri.
### Phone, desktop, tablet
Phone first: the skip form and the vacation sheet use 16 px inputs and 44 px controls; the checklist rows are 44 px labels. Authorized desktop differences: the card controls, calendar label and legend, the header button, the editor line (README item 2).
### Motion, keyboard, screen reader
No new motion. The inline form is a `<form>` with labelled fields; status lines are `role="status"`; calendar buttons already carry full labels.

## Showcase data
"Exercise" (`92000000-0000-4000-8000-000000000002`) gets a skipped entry dated `day + 3` with note `"Planned skip · SHOWCASE DATA · fictional travel day"`, so the card lists "Planned: {date} · SHOWCASE DATA · fictional travel day" and the calendar shows the hollow circle. The existing Showcase skips (every ninth day) are unchanged and, with the new maths, lengthen the Showcase streaks (pinned values in `lib/showcase.test.ts` are updated in the same commit).

## Help entry (`help-skips`)
**I'm away for a week. Will my streak break?** No. A skipped day is neutral: it neither adds to a streak nor breaks it. Plan a skip from a habit's "History & reflection" for a single day, or mark a whole range with "Vacation" at the top of Habits. Reminders stay quiet on skipped days, and you can remove a planned skip at any time. Rest days need no marking at all: the days off your schedule never count against you.

## Tests
Unit (`lib/habits.test.ts` additions, `lib/habit-skips.test.ts`):
1. Streak neutral: daily habit, entries complete on days 1–3, skipped on day 4, complete on day 5 → `currentStreak: 4` (was 1), `bestStreak: 4`, `skipCount: 1`, `completionPercentage: 80`.
2. A skip at the start, then three completes → streak 3; two consecutive skips between completes → the run continues; a `failed` day still resets to 0.
3. "An existing streak never breaks from the change": for every habit in `buildShowcase('2026-10-01')` and `powerUserRecords('2026-10-01')` (`lib/vault/power-user-fixture.ts:10`), `currentStreak` and `bestStreak` under the new rule are ≥ the values of a reference implementation of the old rule kept in the test (skip resets).
4. `planSkip` tomorrow → entry `{date, count: 0, disposition: "skipped", note: "Planned skip"}`; with reason → `"Planned skip · Dentist"`; on a day with a logged count 3 → refused; today → refused ("Choose a scheduled day…"); +367 days → refused; a Saturday for a Mon–Fri habit → refused; a frequency habit → refused with the per-period message.
5. `habitDay` on that future date → `status: "planned-skip"`, `scheduled: false`; on the day itself (`today === date`) → `"skipped"`, `scheduled: true`; `dueReminders` on that day with a reminder time passed → no card.
6. `unplanSkip` removes exactly that entry; the day returns to `"future"`.
7. `setVacation` 2026-10-05 … 2026-10-11 on the Showcase data: "Contribute" and the other five get skipped entries only on scheduled days without a logged count; existing logged entries are kept; `clearVacation` removes exactly the `"Vacation"` entries; a paused habit untouched.
8. Zones: on the eleven host zones with `data.timeZone` set to each, `planSkip` for `habitCalendarDay(data, now) + 1` succeeds and the limit day `+ 366` succeeds while `+ 367` fails; Habits zone `Pacific/Kiritimati` at `2026-10-01T11:30:00Z` → tomorrow is 2026-10-03.
9. DST: a vacation spanning 2026-03-29 and 2026-10-25 (Europe/Brussels) writes one entry per calendar day, no duplicate and no gap; `habitSchema` refuses duplicate dates anyway.
10. Limits: a habit with 19,999 entries and a 7-day vacation → refused, data unchanged.
Browser (`tests/habit-skips.spec.ts`, desktop and mobile):
- Local Demo: create a daily habit, complete today, plan a skip for tomorrow with a reason; the row lists it; the calendar's tomorrow button has the planned-skip label; "Remove" clears it; the stored Habits record holds exactly the expected entry between the steps.
- Showcase: the "Exercise" card shows the fictional planned skip; the Walk streak value equals the new pinned number.
- Vacation: mark 3 days from today for two habits; "Vacation marked for 2 habits, 3 days."; `page.clock` moves to day 2 with a reminder time passed → no reminder card on Today; "Clear vacation days" removes them.
- 390×844: the vacation sheet, 16 px inputs, 44 px rows; keyboard reaches every control.

## Risks and open questions
- `weeklyConsistency` and `completionPercentage` still count a skipped day in their denominators (`lib/habits.ts:327`, `:334`), so a vacation lowers them while the streak holds. Recommendation for the owner: exclude skipped days from both in a follow-up (behaviour change on existing numbers, so not in PR 3 unless approved).
- An older build shows a planned skip as "Future" until the day arrives; no harm, documented in Help as "stays on this device" is not needed because the entry syncs.
