# Session AL — Part 13: the Showcase and a fresh start, one fact one figure

Owner's plan, Part 13: "The Showcase and a fresh start must both be flawless. Each §3 row is fixed at its shared source."
Guard tests: `apps/web/lib/consistency/showcase-consistency.test.ts` (Showcase on 2026-10-31, UTC) and
`apps/web/lib/consistency/fresh-consistency.test.ts` (empty device). Spec (written, not run):
`apps/web/tests/grok53/consistency/p13-showcase-consistency.spec.ts`. No new storage key.

## Facts checked, where each is computed, what disagreed, how it was fixed

| fact | computed by (shared source) | read by | disagreement found | fix |
|---|---|---|---|---|
| Active / finished goals | `goalCounts` (lib/numbers/counts.ts) over `unifiedGoalSummaries` + average goals | Today ("N goals in motion", "Your financial progress"), Goals strip (`GoalsFigures`), goals widget | Showcase: Today/Goals/widget 7 · 3; **NOVA left panel 5** (components/nova/use-counts.ts counts stored `platform.goals` status) and **ZIGi/NOVA goals answer "5 active goals … 1 goal completed"** (ToolSources holds no average goals) | Today, Goals and the widget agree (guard). New `activeGoalCount` helper. NOVA + ZIGi: requested (below); guard holds a `test.todo`. Empty device: widget said "0 active goals" → "No active goal yet" / "Plan a goal to see it here." (lib/dashboard-metrics.ts:106) |
| Today's habits (due, done, left) | `habitsOnDay`, new `habitsLeftOn` (lib/numbers/counts.ts) | Today focus, Today line, habits widget, NOVA core (`habitsHud`), ZIGi `habits_due` / "habits left" | none on the Showcase (7 due, 4 done, 3 left everywhere). Edge: NOVA's `habitsLeft` (due/partial) and `due − done` differ by a failed quit/limit habit | `habitsLeftOn` names the one rule (failed is not "left"); guard pins all five surfaces |
| Streaks | `habitStats` (lib/habits.ts) | habit card, streak widget, NOVA rings, ZIGi | none | pinned per habit |
| Water today / "Drink water" (PR-002, PR-019) | `waterSummary` / `waterToday` (lib/health-daily.ts); habit link (lib/habit-health-links) | Today tile, water widget, NOVA card + core, ZIGi, Checklist, the habit card | Showcase: habit "4 / 8 glasses" with no link while Health, Today and NOVA said nothing logged; 12 water days of 750 mL against 27 ticked habit days; the finished "Drink 2 litres a day" goal read 38 % (PR-023) | lib/showcase-data.ts: Drink water is 2 liters (quantity), linked `{measure:'water', rule:'at-least', target:2000}`; every ticked day holds ≥ 2 L (two entries 2,000–2,500 mL) with an auto-check-in marker; skip days hold none; today 400 + 600 mL = the habit's 1 of 2 liters; Health target 2,000 mL. Guard: habit 1 L = 1,000 mL on Today, widget, NOVA, ZIGi; no pending tick or take-back; the water average goal is met |
| Water, nothing logged (NOVA review M5 / review 2 m6) | `NO_WATER_TODAY` (lib/health-units.ts) | Today tile, water widget, NOVA, ZIGi | Today tile "0 mL"; widget "No water recorded"; ZIGi "Today you logged 0 mL" | Today tile "—" + reason (components/dashboard/today-focus.tsx:124); widget `NO_WATER_TODAY` (dashboard-metrics.ts:135); ZIGi "No water logged yet today." (lib/ai/local-answers/nova-overview.ts `waterAnswer`) |
| Water units | `waterText` (lib/health-units.ts) | Today, Health, NOVA holo, widget | ZIGi/NOVA chat said "1 L to go: 1 L of 2 L" beside Today's "1,000 mL"; the widget used `formatNumber` (3 decimals) for mL, Today `waterText` (1) | ZIGi water answer and the widget use `waterText`. NOVA's own `waterAmount` (lib/nova/widgets/words.ts, "1.2 L") is L8f's: requested |
| Exercise counters, nothing counted | lib/dashboard-metrics.ts | exercise widget | empty device "0 of 3 counted" | "Nothing counted yet today" (pin updated deliberately) |
| Sleep goal (PR-022) | average goal (lib/goal-extras/showcase.ts, 8 h) and Health sleep goal (lib/sleep/showcase.ts, 480 min) | Goals, Health, ZIGi | none since sweep 2 | pinned: 8 h = 480 min = "8 h 00 min" |
| Tracked wealth | `wealthOverview` (lib/wealth.ts) | Wealth widget, NOVA `wealthHud`, ZIGi `totals_per_currency` and net-worth answer | none (501,800.00 USD, 8,000.00 EUR) | pinned |
| Fresh device | — | goals, habits, water, wealth, NOVA core, every non-entity Today widget | the two "0 …" widgets above | guard: no widget value starts with a measured 0; NOVA core four unknowns, each with a reason |

## Showcase pins changed deliberately (comment `Session AL (Part 13, deliberate)`)
- lib/ai/local-answers/engine.test.ts:54 — "glasses of water yesterday" is answered from the water journal.
- lib/dashboard-metrics.test.ts:27, lib/dashboard-widgets-design-pass.test.ts:58 — empty water and counter widgets in words.
- tests/zigi-local-answers.spec.ts:63 — "Drink water: 2 liters yesterday".
- tests/grok53/today/nb-081-water-undo.spec.ts:20,27 — tile "0 mL" → "—".

## Pins outside this lane that the Showcase water change moves (exact new values, computed with the new Showcase)
- lib/insights/engine.test.ts (Showcase test, DAY 2026-10-01, TZ UTC): cards `['exercise-water:health_counter-pushups', 'weight-steps']`; sentences "On 9 of 9 days you counted Push-ups, you also logged water; on other days 18 of 21." (withA 9/9, withoutA 18/21, sampleDays 30) and "On 4 of 8 days you recorded your weight, you also walked at least 8,000 steps; on other days 8 of 22." (withA 4/8, withoutA 8/22; no `threshold` change). With `steps-water` hidden: `['exercise-water:health_counter-pushups', 'weight-steps']` (unchanged).
- lib/insights/cross-pillar.test.ts (2026-10-12): ready `[['steps-sleep',24,31,'early'], ['sleep-habits',19,37,'early']]` (sentences unchanged for those two); unclear `[['water-sleep', 42, 14, …]]` (water-habits moves to pending: `{id:'water-habits', withA: 47, withoutA: 13, need: 14}` before `late-food-sleep` 7/19).
- tests/insights.spec.ts (2026-09-15 Brussels): PUSHUPS "On 9 of 9 days you counted Push-ups, you also logged water; on other days 18 of 21." ("With the first: 9 of 9 days. Without: 18 of 21 days."); STEPS → "On 4 of 8 days you recorded your weight, you also walked at least 8,000 steps; on other days 8 of 22."; after dismissing PUSHUPS the next card is that weight one, then "On 10 of 12 days you walked at least 8,000 steps, you also logged water; on other days 17 of 18."
- lib/ai/actions/plan-v.test.ts:75–76: the habit is in liters, so `quantity: 3, unit: 'glasses'` is refused ("This habit is measured in liters, not glasses, so nothing was proposed."); `quantity: 1.5, unit: 'liters'` plans "Set the day's count to 1.5 liters (target 2 liters), was 1".
- XP of the Showcase rises 60 (water entries; 3,487 → 3,547 on 2026-10-05, level 8 unchanged).

## Requests (not this lane's files)
1. **L8f** — components/nova/use-counts.ts `goals`: `activeGoalCount(unifiedGoalSummaries(...), averageGoals)` instead of stored `status === 'active'`; `habitsLeft`: `habitsLeftOn(...)`. lib/nova/widgets/words.ts `waterAmount`: delegate to `waterText` (lib/health-units.ts) so NOVA never says "1 L" beside Today's "1,000 mL"; lib/nova/holo/goals.ts `goalArcs(...).active` count likewise includes average goals when it is shown as "N active".
2. **L7 / integrator** — `ToolSources` (lib/ai/tools/env.ts) gains the average goals; `list_goals` lists them; the goals answer's head and "N completed" then read `goalCounts`. Then turn the guard's `test.todo` into a test.
3. **L7** — lib/ai/actions/plan.ts check-in: convert mL ↔ liters for a liters habit ("1500 ml" is refused today).
4. Integrator — update the pins listed above (insights unit tests and spec, plan-v).
5. Noted, not changed: Today's Health ring (components/platform/today-intelligence.tsx) counts water as 0 % with a target and nothing logged, while NOVA's core says "—".
