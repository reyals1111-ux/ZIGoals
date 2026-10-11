# HE6 · Fasting timer

## Purpose
A plain clock for people who already fast: start, see the elapsed time against a target they chose, stop. It keeps a short history of hours and targets, and can add the hours to a duration habit. It does not count calories, keep streaks, rank fasts or praise a longer one, and it says clearly who should not fast without medical advice.

## Owner principles applied
Health safety (owner decision P5): presets 12:12, 14:10 and 16:8 only; a custom target capped at 18 hours; a session stopped automatically at 24 hours with a plain note; no streaks, no "longest fast", no calories; the safety note always visible; copy never praises a longer fast; eating-disorder care in the note and in the absence of any comparison. Honest numbers (the clock only, from the device's time; a clock change is shown, not hidden). Private by design (device-only until the write switch; since Session U Part 9 kept in Health v2 and synced only with Health sync, docs/product/SYNC_HOMES.md). Never a chore (one tap to start, one to stop).

## Scope in PR 3
- `lib/fasting/`: schema, store, pure session engine (start, stop, elapsed, auto-stop, history), the optional linked duration habit.
- Health page module "Fasting timer"; the Today line while a fast is running; Help entry; Showcase fixture.

Out of scope: eating windows and meal reminders, notifications (PR 4's push is reminders only), charts, weekly totals, a fasting habit template, the write switch to health v2.

## Data
**Device key `zigoals:fasting:v1`** (`lib/fasting/schema.ts`), byte-for-byte `fastingSchema` of `lib/health.ts` (PR 2):
```
{ version: 1, sessions: FastingSession[] ≤ 2,000, ids unique }
FastingSession = {
  id: string 1–100 ("fast_" + uuid),
  startedAt: ISO instant, endedAt: ISO instant | null (null = running; at most one running session),
  targetHours: integer 1–24 (presets 12, 14, 16; custom 1–18; the schema's 24 is the format's room, the UI never offers above 18),
  timeZone: IANA name (the Health journal's zone, else the device zone at start),
  habitId?: uuid (the linked duration habit), note?: string ≤ 500, stoppedBy?: "person" | "limit"
}
```
`endedAt ≥ startedAt` (schema refinement). The store refuses a second running session ("A fast is already running.").

**Through existing mutators:** on stop, when `habitId` is set, `logHabitValue(habits, habitId, habitCalendarDay(habits, endedAt), value, {mode: "add"}, now)` (`lib/habits.ts:287`) with `value` the elapsed time in the habit's unit (`rule.measurement.unit` hours → hours to two decimals; minutes → whole minutes). It is an ordinary logged entry; when the day is not scheduled the log is skipped and said so (UI).

**Read tolerance:** `readFasting(storage)` → `{data, unreadable}`; unreadable disables the module with the calm notice and "Start over…" (README).

**Write switch (health v2):** `sessions[]` is copied unchanged into `health.fasting.sessions`, `schemaVersion` 1 → 2 on that write (Health syncs only with the person's Health consent, as today), the key deleted and readable one release longer. Two devices' lists are merged by id at migration.

## Engine (`lib/fasting/engine.ts`, pure, `now: Date` always passed)
- `MAX_HOURS = 24`, `MAX_CUSTOM_HOURS = 18`, `PRESETS = [{label: "12:12", hours: 12}, {label: "14:10", hours: 14}, {label: "16:8", hours: 16}]`.
- `runningSession(data)`: the session with `endedAt === null`, or `undefined`.
- `startFast(data, {id, now, targetHours, timeZone, habitId?})`: refuses when one is running; `targetHours` integer 1–18 (presets or custom) else "Choose a target up to 18 hours."; appends `{id, startedAt: now, endedAt: null, targetHours, timeZone, habitId?}`; refuses at 2,000 sessions with "Your fasting history is full. Remove old sessions to continue."
- `elapsedMs(session, now)`: `max(0, min(now, limit) − startedAt)` where `limit = startedAt + 24 h`; `clockMovedBack` is `now < startedAt`.
- `autoStopDue(session, now)`: running and `now ≥ startedAt + 24 h`.
- `stopFast(data, id, now, stoppedBy)`: sets `endedAt = min(now, startedAt + 24 h)` and `stoppedBy`; `endedAt` never before `startedAt` (a clock moved back stops at `startedAt`, elapsed 0, note in UI).
- `applyAutoStop(data, now)`: every running session past the limit gets `endedAt = startedAt + 24 h`, `stoppedBy: "limit"`; called by the hook on load and each tick; written once.
- `history(data, limit = 20)`: ended sessions, newest first, each with `hours = elapsed / 3,600,000` to one decimal, `day = healthDay(session.timeZone, new Date(session.startedAt))` (`lib/health-daily.ts:157`).
- `habitLogValue(session, rule)`: hours or minutes per `rule.measurement.unit`; 0 when elapsed is 0 (then nothing is logged).
Edge cases: DST during a fast changes nothing (instants); a device zone change after start keeps the stored zone; `now` earlier than `startedAt` shows "Your clock changed" and still allows Stop; a running session found at load older than 24 h is stopped at exactly 24 h with the limit note before anything renders.

## UI
### Health page module "Fasting timer" (`components/health/fasting-timer.tsx`)
A `LayoutRegion` item `health:fasting` after `health:journal` (`components/health/health-app.tsx:133`); on phones inside `PhoneFold` labelled "Fasting timer" unless a fast is running (then open). Eyebrow `A CLOCK, NOTHING MORE`, heading "Fasting timer".
- **Safety note, always visible, above the controls** (15 px, `role="note"`): "Fasting isn't for everyone. If you're pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first. Stop if you feel unwell." Below it: "ZIGoals shows the clock only. It gives no medical or nutritional advice."
- Idle: segmented buttons "12:12", "14:10", "16:8", "Custom" (`aria-pressed`); Custom reveals "Target hours (1–18)" (text, `inputMode="numeric"`, 16 px). "Log the hours to a habit (optional)" select listing duration habits (`measurement.kind === "duration"`, active), default "Don't log". Button "Start fast" (primary).
- Running: "Fasting · 3 h 20 min of 16 h" (the elapsed digits update once a minute while the page is visible, no animation), "Started {time} · target reached at {time}" (the target instant in the session's zone), a `GlassBar` of `elapsed / target` capped at 1 that moves in steps (no transition under reduced motion or Motion Off), "Stop fast" (secondary, 44 px). When past the target: "Target reached · 16 h 00 min of 16 h" and the bar full; no further wording. At 24 h: the session ends by itself and the module says "This fast was stopped automatically at 24 hours."
- Clock moved back: "Your device clock changed; the time shown may be off. Stop and start again if you like."
- After Stop: "Stopped at {h} h {m} min. Your target was {t} h." (the same sentence whether under or over the target), plus when a habit was linked: "{h} hours added to {habit}." or "Not logged: {habit} isn't scheduled today." Nothing praises.
- History: "Recent fasts" list, up to 20: "{day} · {hours} h · target {t} h · {stopped by you | stopped at 24 h}" with a "Remove" (quiet) per row; no totals, no best, no average.
- Errors: the storage message (`saveFailureMessage`), "A fast is already running.", "Choose a target up to 18 hours."
### Today, "For you" line (priority 1 while running)
One-line card: "Fasting · 3 h 20 min of 16 h" and a link "Open Health →" (`/app/health#fasting`); hidden when nothing is running.
### Phone, desktop, tablet
Phone first: 44 px segmented buttons, 16 px field, the fold. Authorized desktop differences: the Health module and the Today line (README items 1 and 4).
### Motion, keyboard, screen reader
The elapsed text is `aria-live="off"` (it changes every minute; the stop result is `role="status"`). The segmented buttons are a `role="group"` with `aria-label="Fasting target"`. No loops, no pulsing.

## Showcase data
One completed session built with the fixture's own `at(offset)` helper (`lib/showcase-data.ts:12`): `{id: "fast_showcase-1", startedAt: at(-1) + 20 h, endedAt: at(0) + 12 h, targetHours: 16, timeZone: "UTC", note: "SHOWCASE DATA · fictional session", stoppedBy: "person"}` (16.0 h) → "Recent fasts" shows "{yesterday} · 16.0 h · target 16 h · stopped by you · Showcase example". No running session, so the Today line is absent in Showcase.

## Help entry (`help-fasting`)
**How does the fasting timer work, and is it right for me?** It is a clock: choose 12:12, 14:10, 16:8 or your own target up to 18 hours, start, and stop when you decide. It keeps your last fasts as hours and targets, nothing more: no streaks, no records, no calories, and it never compares one fast with another. A fast is stopped automatically at 24 hours. Fasting isn't for everyone: if you're pregnant, under 18, have a medical condition or an eating disorder, or take medication, talk to a doctor first, and stop if you feel unwell. ZIGoals gives no medical advice.

## Tests
Unit (`lib/fasting/engine.test.ts`, `schema.test.ts`):
1. `startFast` with preset 16 at `2026-10-01T20:00:00Z` → one running session; a second start → refused; custom 18 → accepted; custom 19 → refused; 0 → refused.
2. `elapsedMs` at +3 h 20 min → 12,000,000; at +25 h → 86,400,000 (capped); `now` before start → 0 with `clockMovedBack: true`.
3. `autoStopDue` at +23 h 59 min → false; +24 h → true; `applyAutoStop` sets `endedAt = startedAt + 24 h`, `stoppedBy: "limit"`; a second call changes nothing.
4. `stopFast` at +15 h 42 min → `endedAt` that instant, `stoppedBy: "person"`; at +30 h → `endedAt = startedAt + 24 h`.
5. `history` returns at most 20, newest first, `hours` 15.7; `day` is the start day in the session's zone: a fast started `2026-10-01T23:30:00Z` in `Pacific/Kiritimati` → `2026-10-02`; in `Etc/GMT+12` → `2026-10-01`; the same across the eleven host zones with the host `TZ` irrelevant.
6. DST: a fast from `2026-10-25T00:30:00+02:00` to `2026-10-25T08:30:00+01:00` (Europe/Brussels) → 9.0 h elapsed, not 8.
7. Linked habit: a duration habit in hours, scheduled daily → after stop at 15.7 h the entry on `habitCalendarDay(habits, endedAt)` holds `15.7` (two decimals), disposition logged, mode add (a second fast the same day adds); a minutes habit → 942; the habit not scheduled that day → no entry, the UI message; elapsed 0 → nothing logged.
8. Schema: 2,001 sessions refused; `endedAt` before `startedAt` refused; two running sessions refused by the store; version 2 refused; unreadable untouched.
Browser (`tests/fasting.spec.ts`, desktop and mobile, `page.clock` installed):
- Health: the safety note is visible before any tap (exact text); choose 16:8, "Start fast" → "Fasting · 0 h 00 min of 16 h"; the key holds one running session; Today shows the line "Fasting · 0 h 00 min of 16 h"; `clock.runFor` 3 h 20 min → "3 h 20 min"; "Stop fast" → "Stopped at 3 h 20 min. Your target was 16 h."; history has one row; Today's line is gone.
- Auto-stop: start, `clock.runFor` 25 h, reload → "This fast was stopped automatically at 24 hours." and the row says "stopped at 24 h".
- No praise: the page text after a 17 h stop contains neither "well done" nor "congratulations" nor "record" (a copy guard, like `tests/copy-polish.spec.ts`).
- Showcase: the fictional row is labelled; nothing written on view.
- 390×844: the fold, 44 px buttons, 16 px custom field; reduced motion → the bar has no transition.

## Risks and open questions
- Copy and thresholds are the mitigation for a feature that can be misused; the owner may still choose to hide the module behind an opt-in in Settings. Not proposed here (the safety note is unconditional).
- Open: whether "Remove" on a history row should ask for confirmation. Recommendation: no (it is the person's own record and it is the only destructive action here, undone by nothing; an "Undo" status line for 10 s instead).
