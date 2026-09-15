# Habits V1

Habits are private browser data, independent of Goals and wallet accounts. No habit is seeded, submitted to a server, or stored on chain. Creating, counting, pausing, archiving, restoring or linking a habit never moves funds.

## Calendar and progress semantics

- A habit starts on the device's current local calendar date. Earlier dates are outside its history, never missed. Dates are literal `YYYY-MM-DD` calendar keys, supported from 2000 through 2199. Changing timezone does not rename stored dates.
- Schedules are every day or explicitly selected weekdays (0 = Sunday). Targets are whole counts from 1 to 10,000. A day completes when its count reaches its historical target; counts above target remain recorded. A completion can be undone or corrected to zero without losing its day note.
- The rule history stores schedule, target and active/paused/archived state with an effective local date. Changes apply **today onward**; all earlier dates retain their rules. Multiple changes on the same date replace that date's rule. Consequently changing today's rule can change today's status, but earlier history is untouched. Counts/notes already logged today are retained even when a pause, archive or schedule change makes today ineligible; History shows them as previously logged.
- A missed day is a scheduled active day before today whose count is below target. An unfinished scheduled day today is due, with time to finish. Unscheduled, paused, archived, future and pre-start days have separate labels.
- Current streak counts consecutive completed scheduled days. Unscheduled, paused and archived dates neither advance nor break it. An incomplete scheduled date before today resets it. Today has grace until the next local midnight. Best streak is the greatest such run in the full history; both recalculate after a completion correction.
- Weekly consistency is completed / scheduled active dates from Monday through today, rounded to a whole percentage. Today is included in the denominator; future days are excluded. No scheduled days shows 0% and 0/0, not an invented perfect score.
- History has a monthly calendar, earlier/later month controls, a direct date chooser and a count/note editor. Past scheduled active days can be corrected even after a habit is paused or archived. Off-schedule/paused/archived days and future days cannot receive new check-ins.
- Archive is reversible and keeps the entire history. All lists exclude archives except the Archived filter. Completed means complete today. Today contains currently scheduled active habits. All includes paused and unscheduled habits.

## Identity, scope and validation

`lib/habits.ts` exports `habitDataSchema`, `HabitData`, `emptyHabitData` and `HABITS_KEY` (`zigoals:habits:v1`). The strict root is `{schemaVersion: 1, kind: "zigoals-habits", habits: [...]}`. Each habit has a stable UUID, title, category, description, private notes, optional `{chainId, owner, goalId}` Goal link, start date, ISO created/updated timestamps, rule history and unique dated entries. Strict nested Zod schemas reject unknown fields, invalid calendar dates, duplicate identifiers/entries/rules, unordered history and invalid counts. Limits: 200 habits, 2,000 rule versions per habit, 20,000 entries per habit; the shared store separately enforces a 2 MB serialized limit.

Goal selections come only from the active Goal scope. An unmatched existing link remains stored until explicitly removed and is described as another scope or unavailable Goal; a numeric ID alone is insufficient to associate a habit. Standalone habits are fully functional. No Goal metadata, balances, providers or existing storage keys are changed.

Separate Habits exports contain **all** habit titles, descriptions, notes, Goal scope links, dates, histories and logged counts, including archives. Treat the exported JSON as private. Import validates the complete envelope before replacement through the shared private store; malformed/future-version/oversized data fails closed, and originals are preserved. No partial merge or automatic migration is performed. The shared store handles durable locked writes, cross-tab updates, recovery, and failure messages; UI never reports a successful save before its promise resolves.

## Integration API

- Pure functions: `createHabit`, `editHabit`, `setHabitState`, `logHabitCount`, `habitDay`, `habitStats`, `habitRuleOn`, `latestHabitRule`, `goalLinkMatches`, `getHabitActivities`. Mutators return validated new `HabitData`; each accepts an optional `Date` for deterministic tests. Creation optionally accepts an injected UUID.
- `components/habits/use-habits.ts`: `useHabits()` exposes the generic store (`data`, `loaded`, `error`, `update`, `importData`, `exportData`, `refresh`), `today`, and async `create`, `edit`, `setState`, `setCount`, `adjustCount`, `toggle`. Increment and toggle transformations read the latest locked state, rather than a stale rendered count.
- `HabitsToday` renders up to three scheduled habits with functioning count/completion controls and a link to the full page. `HabitGoalLinks({goalId, chainId, owner})` renders only matched, non-archived supporting habits. `getHabitActivities(data)` projects actual positive-count logs, ordered by recorded update time, with stable IDs, category `HABIT`, and href always `/app/habits`; private values never enter activity URLs. Undo removes a zero-count entry from this current-state activity projection.

Unit coverage exercises validation, CRUD, daily/weekday schedules, counted completion/undo, pause/archive/resume history, historical schedule targets, grace/missed days, current/best streak, weekly consistency, daylight-saving boundaries, local midnight, link scoping and activity URLs. Browser coverage verifies durable reload, count controls, notes/history, filters, archives, malformed storage preservation and private request isolation.
