# M3 · Insight cards

## Purpose
Over a couple of months the journals hold enough to notice simple pairings in a person's own records: on the days they walked more, did they also log water? Did a habit go better on weekdays? An insight card says so in counts ("On 6 of 12 days you walked at least 8,000 steps, you also logged water; on other days 6 of 18"), shows exactly how it was counted, and can be dismissed. It never says why, and it never tells anyone what to do.

## Owner principles applied
Honest numbers (counts, not percentages; thresholds from the person's own target or their own middle value; minimum samples; "How this is calculated" on every card). No causal claims, no health or money advice (the sentences are observations with "also"; a copy guard test forbids causal words). Never a chore (at most two insights, dismiss per card, no badge counts). Private by design (the engine runs on the device over device data; dismissals are the only thing stored).

## Scope in PR 3
- `lib/insights/`: the pure engine over the last 60 days, five pairs, thresholds, wording, the dismissal store.
- The "Something you might notice" card in Today's "For you" area; Help entry; Showcase water so one insight meets its thresholds.

Out of scope: nutrition pairs (kcal, protein), money pairs, trends over time, charts, anything that reads other people's data, a write switch (dismissals stay device-only).

## Data
**Device key `zigoals:insights:v1`** (`lib/insights/schema.ts`): `{version: 1, dismissed: Record<cardId, "YYYY-MM-DD">}` ≤ 200 entries; `cardId` ≤ 120 chars. A dismissed card stays hidden for 28 days from its date; older dismissals are pruned on the next save (the reminders pattern, `lib/reminders/store.ts:20`). Written only by "Dismiss". **Stays device-only:** it is a view preference with no personal content beyond a card id, like reminder dismissals; nothing to sync.

**Through existing mutators:** none. The engine reads `HabitData` and `HealthData` and writes nothing.

**Read tolerance:** unreadable bytes mean "nothing dismissed" and are never rewritten; "Dismiss" then refuses with "This card could not be dismissed on this device." (as `ReminderCards` does, `components/reminders/reminder-cards.tsx:28`) until the person chooses "Start over…" in the card's "How this is calculated" details.

## Engine (`lib/insights/engine.ts`, pure)
Constants: `WINDOW_DAYS = 60`, `MIN_DAYS = 14` (days in the sample), `MIN_SIDE = 5` (days on each side of the split), `MAX_SHOWN = 2`, `DISMISS_DAYS = 28`.
```
insightCards({habits, health, today, links?, dismissed, now}): InsightCard[]
InsightCard = {
  id: string,                           // "steps-water" | "steps-habit:<habitId>" | "weight-steps" | "exercise-water:<counterId>" | "habit-weekday:<habitId>"
  sentence: string,                     // the count sentence, exact templates below
  detail: { window: {start, end}, sampleDays: number, withA: {yes, total}, withoutA: {yes, total}, threshold?: {source: "target" | "usual", value: number, unit: string}, pairedBy: string },
  contrast: number                      // |withA.yes/withA.total − withoutA.yes/withoutA.total|, used only for ordering
}
```
- Window: the 60 days ending `today` (`healthDay` of the Health zone for Health measures; habit days as recorded). Days are paired by their stored date strings: a check-in dated 2026-10-01 pairs with Health records dated 2026-10-01, whatever zone each journal used (`pairedBy: "calendar date, as each journal recorded it"`).
- Step threshold: `health.targets.steps` when set (`source: "target"`), else the median of the window's recorded daily step totals (`source: "usual"`, the middle value; with an even count the lower middle). "Recorded" means the day has at least one activity record; other days are unknown and left out.
- Pairs (A splits the sample; B is counted on each side):
  1. `steps-water`: sample = days with an activity record; A = steps ≥ threshold; B = any water entry (`waterSummary(...).entries > 0`).
  2. `steps-habit:<id>`: for each daily-scheduled `build` habit without a steps Health link (H7; a link would make the pair circular), sample = days with an activity record where the habit is scheduled and not skipped; A = steps ≥ threshold; B = `habitDay(...).status === "complete"`. Only the habit with the largest sample is kept.
  3. `weight-steps`: sample = days with an activity record; A = a weight reading that day (`weights` or a timed measurement whose day it is, `latestWeightObservation`); B = steps ≥ threshold.
  4. `exercise-water:<counterId>`: sample = days with any Health record (diary, water, weight, activity or a counter day); A = the counter has a day record with count > 0; B = any water entry. The counter with the most recorded days is used.
  5. `habit-weekday:<id>`: sample = scheduled, non-skipped days of the habit; A = Monday–Friday (`localWeekday` 1–5); B = complete. The habit with the largest sample.
- A pair yields a card only when `sampleDays ≥ 14`, `withA.total ≥ 5` and `withoutA.total ≥ 5`. Dismissed ids (within 28 days) are removed. Cards are ordered by `contrast` descending, then by the pair order above; the first `MAX_SHOWN` are returned.
- Sentence templates (exact, counts only):
  1. "On {a} of {n} days you walked at least {threshold} steps, you also logged water; on other days {b} of {m}."
  2. "On {a} of {n} days you walked at least {threshold} steps, you also completed {habit}; on other days {b} of {m}."
  3. "On {a} of {n} days you recorded your weight, you also walked at least {threshold} steps; on other days {b} of {m}."
  4. "On {a} of {n} days you counted {counter}, you also logged water; on other days {b} of {m}."
  5. "On {a} of {n} weekdays you completed {habit}; at weekends {b} of {m}."
  Numbers use `formatNumber` (`lib/visual-format.ts:124`). No percentages, no "more", "better", "because", "helps", "leads to", "improves", "causes", "should".
- Edge cases: empty data → `[]`; fewer than 14 sample days → `[]`; a threshold of 0 (no steps recorded) → pairs 1–3 skipped; a counter deleted → its pair skipped; DST and zones are irrelevant inside (date strings only); the window start before the first record simply has fewer days.

## UI
### Today, "For you" card (priority 6)
`aria-label="Something you might notice"`, eyebrow `FROM YOUR OWN RECORDS`, heading "Something you might notice." Up to two insights, each an `article`:
- the sentence (16 px);
- a `details` "How this is calculated" (summary ≥ 44 px) with: "Window: {start} – {end} · {sampleDays} days with the records this needs." · "With {A}: {yes} of {total} days. Without: {yes} of {total} days." · the threshold line "{threshold} steps is your step target." or "{threshold} steps is your usual: the middle of your recorded days." · "Paired by calendar date, as each journal recorded it." · "Counts of your own records. Not a cause, not advice." · the "Start over…" row only when the dismissal key is unreadable;
- a quiet button "Dismiss" (44 px) → the card id with today's date; the article leaves at once (no animation).
The card is absent when the engine returns nothing. One fine-print line at the bottom: "Shown when at least 14 days have both records, with at least 5 days on each side."
### Phone, desktop, tablet
Phone first: the two articles stack; `details` summary is a 44 px row. Authorized desktop difference: the card itself (README item 1).
### Motion, keyboard, screen reader
No new motion; the card arrives with the page's one-time arrival. "Dismiss" moves focus to the next article or the card heading. The `details` is native.

## Showcase data
Water entries are added to the Showcase Health record for days `n` with `n % 5` of 4 or 1 (12 of the 30 days): two entries each, `health_water-{n}-a` 250 mL and `health_water-{n}-b` 500 mL (`amountMilli` 250,000 and 500,000, unit `ml`), with `waterOperations` listing their ids. With the step target 8,000 and walks of 6,000 + 700 × (n mod 5) steps, pair 1 reads exactly "On 6 of 12 days you walked at least 8,000 steps, you also logged water; on other days 6 of 18." (contrast 0.167) and pair 3 reads "On 4 of 8 days you recorded your weight, you also walked at least 8,000 steps; on other days 8 of 22." (contrast 0.136); pairs 2 and 5 have zero contrast and pair 4 (0.086) is third, so Showcase shows those two. The card adds "Showcase example" under its heading when `isShowcase()`. No dismissals are seeded.

## Help entry (`help-insights`)
**What are the "Something you might notice" cards?** When your journals hold at least two weeks of matching records, Today may show a simple pairing in them, in counts: for example, on how many of the days you walked more you also logged water, compared with the other days. The numbers are only your own entries, and the card shows exactly how it counted them. A pairing is not a cause and not advice. Dismiss a card and it stays away for four weeks.

## Tests
Unit (`lib/insights/engine.test.ts`, `schema.test.ts`):
1. Showcase on its day → two cards in this order: `steps-water` with `withA {6, 12}`, `withoutA {6, 18}`, `threshold {target, 8000}`, the exact sentence above; `weight-steps` with `{4, 8}` and `{8, 22}`.
2. Below the minimum: 13 sample days → `[]`; 14 days with 4 on one side → `[]`; 14 days with 5 and 9 → one card.
3. Threshold source: no step target and totals [5,000, 6,000, 7,000, 9,000] → `usual` 6,000 (lower middle of an even count); a target set → `target`.
4. Unknown is not zero: a day without an activity record is absent from pair 1's sample even when water was logged; a day without any Health record is absent from pair 4.
5. Pair 2 skips a habit linked to steps through H7's links and picks the habit with the largest sample; skipped days are left out.
6. Pair 5: a Mon–Fri habit has no weekend sample → no card; a daily habit over 60 days → weekdays and weekends counted with `localWeekday`.
7. Wording: every sentence of every fixture is free of the forbidden words (a shared `FORBIDDEN_INSIGHT_WORDS` list exported for the browser copy guard); numbers formatted with the display locale (de-DE "8.000").
8. Dismissal: `dismissInsight(storage, id, today)` writes `{version: 1, dismissed: {[id]: today}}`; a dismissal 29 days old is pruned on the next save and the card returns; unreadable bytes are read as empty and left untouched; 201 entries refused.
9. Ordering: three eligible pairs with contrasts 0.2, 0.3, 0.1 → the 0.3 and 0.2 cards, in that order.
Browser (`tests/insights.spec.ts`, desktop and mobile):
- Showcase: the card shows the two exact sentences; "How this is calculated" lists the window and the counts; "Dismiss" on the first → it disappears, the key holds `{"steps-water": day}`, reload keeps it hidden; the second stays.
- Local Demo with no data: no card and no key written after viewing Today.
- Copy guard: the card's text matches none of `FORBIDDEN_INSIGHT_WORDS`.
- 390×844: both articles visible within the "For you" limit, the summary and Dismiss ≥ 44 px.

## Risks and open questions
- Ordering by contrast is a mild form of emphasis; it never changes the sentence. Alternative: fixed pair order. Recommendation: keep contrast ordering, because two cards from five pairs should be the two with something to see.
- Open: whether the card should appear at all for a person who never opens Health (habit-weekday is the only pair possible). Recommendation: yes, it is still their own records.
