# G1 · Weekly review

## Purpose
Once a week, on a day the person chooses, Today offers a short look back: what went well, the goals, the habits, the health journal, the wealth picture, and one small intention for the week ahead. Every step is pre-filled with the person's own numbers for that week; the words are theirs and optional. It is one card, once a week, and it can be skipped.

## Owner principles applied
Never a chore (six short steps, every field optional, "Skip this week" is one tap, no streak of reviews). Honest numbers (every figure is recomputed from records by the existing engines; nothing is scored or compared with other people). Health and money safety (the health and wealth steps show counts and totals only, no advice). Private by design (reflections are device-only until the write switch). Consumer first (it reads like a journal page, not a report).

## Scope in PR 3
- The weekday setting, the Today card, the six-step review (phone: sheet; desktop: panel), the stored reflections, the Help entry, the Showcase fixture.
- PR 4's Guide adds a seventh, read-only summary step when the Guide is on; the review's data and steps here do not depend on it.

Out of scope: a review history page (the last review is reachable from the card), reminders or push for the review, editing a past week's notes after it is completed (they are shown read-only), the write switch to settings v2.

## Data
**Device key `zigoals:weekly-review:v1`** (`lib/weekly-review/schema.ts`), byte-for-byte `weeklyReviewSchema` of `lib/dashboard-settings.ts` (PR 2):
```
{
  version: 1,
  weekday: 0–6 (0 = Sunday; default 0),
  reviews: Review[] ≤ 520, one per weekStart
}
Review = {
  weekStart: "YYYY-MM-DD",                 // the first of the seven days reviewed (reviewDay − 6)
  completedAt?: ISO instant,               // set by "Finish review"
  skipped?: true,                          // set by "Skip this week"
  notes?: { wentWell?, goals?, habits?, health?, wealth?, intention?: string ≤ 2000 }   // strict, only typed words
}
```
The numbers of a week are never stored. A review that has `notes` but neither `completedAt` nor `skipped` is a draft ("Continue your review"). Reviews older than 520 weeks are refused on write (the cap), not trimmed.

**Through existing mutators:** none. The review reads Habits, Health and the platform; it writes only its own key. The weekday field in Settings writes the same key.

**Read tolerance:** `readWeeklyReview(storage)` → `{data, unreadable}`; unreadable hides the card, shows the calm notice in Settings next to the weekday field, and offers "Start over…" (README).

**Write switch (settings v2):** the whole object is copied unchanged into `dashboardSettings.weeklyReview`, `schemaVersion` 1 → 2 on that write; settings merge field by field in sync (`mergeValue`, TIMEZONE_DESIGN.md), so two devices' review lists become a field conflict for review only when both wrote the same week. The key is deleted after the write and readable one release longer.

## Engine (`lib/weekly-review/engine.ts`, pure)
```
reviewWindow(weekday: 0–6, today: string): { reviewDay: string; weekStart: string; weekEnd: string; due: boolean }
```
`today` is the device's local day (`useLocalToday`, `lib/local-date.ts:2`, the clock reminders also follow). `reviewDay` = the most recent date ≤ today whose `localWeekday` is `weekday`; `weekEnd = reviewDay`, `weekStart = addLocalDays(reviewDay, -6)`; `due` is true from `reviewDay` for six days (`today ≤ addLocalDays(reviewDay, 6)` always holds, so `due` is simply "the current review is neither completed nor skipped"). The next review replaces it when the next `reviewDay` arrives. Pure date arithmetic, DST-safe.
```
weekSummary({weekStart, weekEnd, habits, health, platform, quotes, now, financial}): WeekSummary
```
Read-only figures for the six steps, from existing engines:
- went well: `weekAcross` (`lib/bottom-insights.ts:21`) totals of goal contributions, habit check-ins and Health entries over the seven days; "best day" is the day with the most records, or none.
- goals: per active goal from `unifiedGoalSummaries` (`lib/goal-summary.ts:66`): name, `fundingHealth`, `nextContributionDate`, progress text (`progressText`).
- habits: per habit scheduled at least once in the week: `done / scheduled` from `habitDay` (`lib/habits.ts:262`) over the seven days, `currentStreak` from `habitStats`, planned skips counted as "skipped" not "missed".
- health: days with diary entries, total steps and minutes (`dailyHealthSummary`), days with water (`waterSummary`), the latest weight reading in the week (`latestWeightObservation`); each line only when it has data.
- wealth (only when `financial`): `wealthOverview(platform, now, quotes).subtotals` and the count of rows needing attention; contributions in the week from `platform.contributions` by `occurredAt` day.
- intention: the previous completed review's `notes.intention`, shown as "Last week you wrote: …" when present.
Edge cases: no habits → "No habits were scheduled this week."; no Health entries → "Nothing in the Health journal this week."; a week before the first record shows zeros as words ("No records yet"), never invented averages; days are paired by their stored date strings (each journal's own day). A weekday change in Settings takes effect for the next review; the current draft keeps its `weekStart`.

## UI
### Settings
In the "Habits" settings section (`app/app/settings/page.tsx:61`, id `habits-settings`) a field "Weekly review day — on this device" (select Sunday … Saturday, 16 px on phones) with fine print "Today shows your review card on this day. The review is optional and can be skipped." Phone list row under "Sources & modules": ["Weekly review day", "The day Today offers your review", "habits-settings"].
### Today, "For you" card (priority 3)
- Due: eyebrow `YOUR WEEK`, title "A short look back at your week.", text "{weekStart} – {weekEnd}. Six small steps, all optional." Buttons "Start review" (primary), "Skip this week" (quiet). Draft: title "Continue your review." with "Continue" and "Skip this week". Completed or skipped: no card until the next review day.
- Skipping writes `{weekStart, skipped: true}`; nothing else is written until "Finish review".
### The review (phone: `PhoneFormSheet` "Your week"; desktop and tablet: a `dashboard-dialog` modal, like the widget editor)
Header "Your week · {weekStart} – {weekEnd}" and "Step {n} of 6". Each step: a read-only summary block (15–16 px, `aria-live` off) and one textarea (16 px, 2,000 chars, placeholder "Your words, if you like"). Buttons "Back", "Next"; on step 6 "Finish review"; "Close" at any time keeps the draft (the typed words are saved on each "Next" and on "Close").
1. **What went well** — "{n} habit check-ins · {m} Health entries · {k} Goal contributions this week" (counts only, zero as "no …"); textarea `wentWell`.
2. **Goals** — one line per active goal: "{name} · {funding health} · next {date}"; "No active goals." when none; textarea `goals`.
3. **Habits** — one line per habit: "{title} · {done} of {scheduled} · streak {n} {unit}"; textarea `habits`.
4. **Health** — the available lines: "{d} days with meals logged", "{steps} steps · {minutes} min movement", "{w} days with water", "latest weight {x} {unit} on {date}"; textarea `health`. Fine print: "Counts of your own entries. Not advice."
5. **Wealth** — only when the financial domain is visible on Today (`visibleDomains`, `lib/dashboard-settings.ts:80`); otherwise the step is skipped and the header reads "Step n of 5". Lines: "Known tracked wealth: {subtotals}", "{a} assets need attention", "{c} contributions this week"; textarea `wealth`.
6. **One intention** — "Last week you wrote: {intention}" when present; a single textarea `intention`, placeholder "One small thing for next week".
After "Finish review": the card closes; a `role="status"` line "Review saved on this device." The last completed review opens read-only from a quiet "Last review" link on the card's place in Settings → Habits.
### Phone, desktop, tablet
Phone first: the sheet with its grabber, 16 px textareas, 44 px buttons kept in reach. Authorized desktop differences: the Today card, the modal, the Settings field (README items 1 and 5).
### Motion, keyboard, screen reader
The sheet and modal are the existing dialogs (focus starts in the first field, returns on close, Escape closes and keeps the draft). Step changes move focus to the step heading (`tabIndex={-1}`). No new motion.

## Showcase data
With `reviewDay = reviewWindow(0, day).reviewDay` (the Sunday on or before the Showcase day): `{version: 1, weekday: 0, reviews: [{weekStart: addLocalDays(reviewDay, -13), completedAt: addLocalDays(reviewDay, -7) + "T19:30:00.000Z", notes: {wentWell: "SHOWCASE DATA · fictional reflection: three walks and a calm week", intention: "SHOWCASE DATA · fictional intention: one short walk after lunch"}}]}`, the review of the week before the current one. The current week's review is therefore due in Showcase, so the card shows; its step summaries use the Showcase records, and step 6 reads "Last week you wrote: SHOWCASE DATA · fictional intention …".

## Help entry (`help-weekly-review`)
**What is the weekly review?** On the day you choose in Settings, Today offers a short look back at your week: what went well, your goals, habits, health and wealth, and one intention for next week. Every step shows your own numbers for that week, and every field is optional. Finish it, or skip it with one tap; it never nags. Your review is kept with your Today settings and your words about health with your Health records: with encrypted sync on, the review syncs with your settings, and the health words only when Health sync is on. *(Session U Part 9, with the sync writes on; switched off: "Your words stay on this device for now.")*

## Tests
Unit (`lib/weekly-review/engine.test.ts`, `schema.test.ts`):
1. `reviewWindow(0, "2026-10-01")` (Thursday) → `reviewDay 2026-09-27`, `weekStart 2026-09-21`, `weekEnd 2026-09-27`; `(4, "2026-10-01")` → `reviewDay 2026-10-01`, `weekStart 2026-09-25`.
2. Across DST: `(0, "2026-03-30")` → `2026-03-29`, `weekStart 2026-03-23` (seven calendar days); `(0, "2026-10-26")` → `2026-10-25`.
3. `weekSummary` on the Showcase week ending 2026-10-01 with weekday 4: habit lines "Walk · 7 of 7" and so on per the Showcase pattern (exact expected values pinned from the fixture), Health "7 days with meals logged", steps as the sum of the seven "Showcase walk" entries, wealth subtotals equal to `wealthOverview`'s.
4. Empty data → every line is its "No …" sentence; no NaN, no "0 of 0".
5. `financial: false` → no wealth block; step count 5.
6. Store: "Skip this week" → `{version: 1, weekday: 0, reviews: [{weekStart, skipped: true}]}`; "Next" on step 1 with words → a draft with `notes.wentWell` only (no empty strings); "Finish" → `completedAt`; a second review of the same `weekStart` replaces, never duplicates; 521 reviews refused; version 2 refused; unreadable untouched.
7. Zones: `today` comes from the device; the test fixes `TZ` to the eleven host zones and checks `reviewWindow` is unaffected (pure strings).
Browser (`tests/weekly-review.spec.ts`, desktop and mobile):
- Local Demo with a daily habit completed twice: `page.clock` on the review day → the card shows; "Start review" → six steps; step 3 lists the habit "2 of 7"; type an intention; "Finish review" → the key holds the expected object; the card is gone; reload keeps it gone.
- "Skip this week" writes `skipped: true` and no notes; the next week's day brings a new card.
- Showcase: the card is due; "Last week you wrote: SHOWCASE DATA · fictional intention …" on step 6; nothing written on view.
- 390×844: the sheet, 16 px textareas, buttons ≥ 44 px, Escape keeps the draft; desktop: the modal returns focus to "Continue".

## Risks and open questions
- The device's local day decides the review day while Habits and Health may use their own zones; the figures inside are per journal day. Acceptable for a weekly rhythm; stated in Settings copy ("on this device").
- Open: whether a completed review should be editable for the rest of its week. Recommendation: read-only after "Finish review" (simpler, and the words remain visible).
