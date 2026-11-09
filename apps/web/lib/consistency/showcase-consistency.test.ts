import {describe, expect, test} from 'vitest';
import {formatUnits} from '@zigoals/chain-config';
import {buildShowcase} from '../showcase-data';
import {unifiedGoalSummaries} from '../goal-summary';
import {platformSchema} from '../positions';
import {habitDataSchema, habitDay, habitStats} from '../habits';
import {healthSchema} from '../health';
import {dailyData, waterSummary, waterToday} from '../health-daily';
import {AVERAGE_GOALS_KEY, averageGoalsSchema} from '../average-goals/store';
import {averageProgress} from '../average-goals/progress';
import {isFinished} from '../goals/finished';
import {activeGoalCount, checkInsOn, goalCounts, habitsLeftOn, habitsOnDay} from '../numbers/counts';
import {widgetMetric, type DashboardSources} from '../dashboard-metrics';
import type {DashboardWidget} from '../dashboard-settings';
import {goalArcs} from '../nova/holo/goals';
import {habitsHud} from '../nova/holo/habits';
import {healthHud} from '../nova/holo/health';
import {wealthHud} from '../nova/holo/wealth';
import {wealthOverview} from '../wealth';
import {homeRecordsIn} from '../sync-homes-store';
import {healthGroupIn} from '../vault/w-homes';
import {autoCompletions, autoRevocations} from '../habit-health-links/engine';
import type {HabitHealthLinksV4} from '../habit-health-links/schema';
import {toolEnv} from '../ai/tools/env';
import {gatesFor, showcaseSources} from '../ai/tools/fixtures';
import {runTool} from '../ai/tools/registry';
import {Handles} from '../ai/handles';
import {localAnswer, zigiOverview, type LocalReply} from '../ai/local-answers/engine';

/**
 * Session AL Part 13 (the owner's plan: "The Showcase and a fresh start must both be flawless"): one fact, one number on
 * every surface that shows it. Each block builds the Showcase once and reads the same fact through every function a page,
 * a widget, NOVA's HUD or ZIGi's local answers uses, so two pages can never show it differently again. Where a surface
 * still reads its own copy of a fact (NOVA's left-panel goal count), the
 * test names it as a todo for the lane that owns it (docs/review/session-al/PART13_CONSISTENCY.md).
 */
const DAY = '2026-10-31', NOW = new Date(`${DAY}T19:00:00Z`);
const {records} = buildShowcase(DAY, 'UTC');
const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!));
const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!));
const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!));
const averages = averageGoalsSchema.parse(JSON.parse(records[AVERAGE_GOALS_KEY]!)).goals;
const summaries = unifiedGoalSummaries([], {}, platform, [], NOW.getTime());
const links = (homeRecordsIn(records) as {habitLinks?: HabitHealthLinksV4}).habitLinks!;
const sources: DashboardSources = {platform, goals: summaries, averages, habits, health, quotes: [], now: NOW.getTime(), today: DAY, healthDate: DAY};
const widget = (kind: DashboardWidget['kind'], metric: string, entity?: string) => widgetMetric({id: 'p13', kind, metric, entity, title: '', size: 'compact', hidden: false, revision: 1}, sources);
const env = () => toolEnv(showcaseSources(DAY), gatesFor(true, 'goals', '/app/goals'), 'local', new Handles());
const textOf = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const drinkWater = habits.habits.find(h => h.title === 'Drink water')!;

describe('Showcase: active and finished goals', () => {
  test('Today, the Goals strip and the goals widget read one count (summaries by derived status, plus average goals)', () => {
    const c = goalCounts(summaries, averages);
    expect(c).toEqual({active: 7, finished: 3});
    // components/goals/goals-overview.tsx GoalsFigures: a finished summary counted as completed first.
    expect(goalCounts(summaries.map(g => isFinished(g) ? {status: 'completed'} : g), averages)).toEqual(c);
    // components/dashboard/today-dashboard.tsx ("N goals in motion", "Your financial progress").
    expect(activeGoalCount(summaries, averages)).toBe(c.active);
    expect(widget('goals', 'overview')).toMatchObject({value: '7 active goals', detail: '3 completed · recorded progress'});
  });
  test('NOVA\'s goal arcs and ZIGi\'s goals answer list the same Goals-page goals, in the same order', () => {
    const active = summaries.filter(g => g.status === 'active');
    expect(goalArcs(summaries, 99).arcs.map(a => a.name)).toEqual(active.map(g => g.name));
    const answer = textOf(zigiOverview('How far am I on my goals?', env()));
    expect(answer.split('\n')[0]).toBe(`${active.length} active goals, from your own records:`);
    for (const g of active) expect(answer).toContain(`• ${g.name}: `);
  });
  test('ZIGi\'s goals answer counts the average goals too: 7 active and 3 finished, as Today and Goals say', () => {
    // Session AL (Part 13, L7): the tool sources carry the average goals (ToolSources.averageGoals); list_goals lists them
    // after the Goals-page goals, so ZIGi's count is goalCounts' count.
    const c = goalCounts(summaries, averages), withAverages = toolEnv(showcaseSources(DAY, {averageGoals: averages}), gatesFor(true, 'goals', '/app/goals'), 'local', new Handles());
    const listed = runTool('list_goals', {}, withAverages);
    expect(listed.ok).toBe(true);
    const rows = (listed as unknown as {data: {goals: {name: string; status: string}[]}}).data.goals;
    expect(goalCounts(rows)).toEqual(c);
    expect(rows.filter(r => r.status === 'active').map(r => r.name)).toEqual([...summaries, ...averages].filter(g => g.status === 'active').map(g => g.name));
    const answer = textOf(zigiOverview('How far am I on my goals?', withAverages));
    expect(answer.split('\n')[0]).toBe(`${c.active} active goals, from your own records:`);
    expect(answer).toContain(`\n${c.finished} goals completed.`);
    for (const g of averages.filter(a => a.status === 'active')) expect(answer).toContain(`• ${g.name}: `);
  });
  test.todo('NOVA\'s left-panel count (components/nova/use-counts.ts) counts the average goals too (activeGoalCount): today 5 there vs 7 on Today and Goals (lane L8f)');
});

describe('Showcase: today\'s habits', () => {
  const {due, done} = habitsOnDay(habits.habits, DAY, DAY);
  test('Today\'s focus, the habits widget, NOVA\'s core and ZIGi agree on due, done and left', () => {
    expect({due, done}).toEqual({due: 7, done: 4});
    expect(checkInsOn(habits.habits, DAY, DAY)).toBe(done);
    const hud = habitsHud(habits.habits, DAY);
    expect({due: hud.due, done: hud.done}).toEqual({due, done});
    expect(widget('habits', 'overview').value).toBe(`${done} of ${due} complete`);
    // Nothing failed today in the Showcase, so "left" is due minus done on every surface.
    const left = habitsLeftOn(habits.habits, DAY, DAY);
    expect(left).toBe(due - done);
    const tool = runTool('habits_due', {}, env());
    expect(tool.ok && (tool.data as {count: number}).count).toBe(left);
    expect(textOf(zigiOverview('How many habits are left today?', env())).split('\n')[0]).toBe(`${left} habits left today:`);
  });
  test('each habit\'s streak is the same on the card, the streak widget, NOVA\'s rings and ZIGi', () => {
    const hud = habitsHud(habits.habits, DAY, 99);
    for (const h of habits.habits.filter(x => habitStats(x, DAY).currentStreak > 0)) {
      const s = habitStats(h, DAY), ring = hud.rings.find(r => r.id === h.id);
      expect(ring?.streak, h.title).toBe(s.currentStreak);
      expect(widget('habit', 'streak', h.id).value, h.title).toMatch(new RegExp(`^${s.currentStreak} `));
    }
    const exercise = habits.habits.find(h => h.title === 'Exercise')!, s = habitStats(exercise, DAY);
    // Session AL final pass (Z-021, 13a7c83b, deliberate): the answer adds why a streak can outrun a month's check-ins; the
    // figures are still the habit's own (same exact first line).
    const answer = textOf(localAnswer('What is my current Exercise streak?', env()));
    expect(answer.split('\n')[0]).toBe(`Your current Exercise streak is ${s.currentStreak} days (longest: ${s.bestStreak} days).`);
    expect(answer).toMatch(/a streak counts scheduled days in a row across months, and a skipped day keeps it going/);
  });
});

describe('Showcase: water (PR-002, PR-019, PR-023)', () => {
  test('"Drink water" is 2 liters a day, linked to the water journal at the Health target of 2,000 mL', () => {
    const rule = drinkWater.rules.at(-1)!;
    expect(rule).toMatchObject({target: 2, measurement: {kind: 'quantity', unit: 'liters'}});
    expect(links.links[drinkWater.id]).toMatchObject({version: 1, measure: 'water', rule: 'at-least', target: 2000});
    expect(dailyData(health).preferences.waterTargetMl).toBe(2000);
  });
  test('every day the habit is ticked, the journal holds its 2 liters; a skipped day holds none; markers match', () => {
    for (const e of drinkWater.entries.filter(x => x.date < DAY)) {
      const w = waterSummary(health, e.date), marker = links.applied.find(a => a.habitId === drinkWater.id && a.date === e.date);
      if (e.disposition === 'logged' && e.count >= 2) { expect(w.millilitres, e.date).toBeGreaterThanOrEqual(2000); expect(marker?.value, e.date).toBe(w.millilitres); }
      else { expect(w.entries, e.date).toBe(0); expect(marker, e.date).toBeUndefined(); }
    }
    // No day in the journal without its habit day, and Health would tick or take back nothing on loading the Showcase.
    for (const d of new Set(dailyData(health).water.map(w => w.date))) if (d >= drinkWater.startDate && d <= DAY) expect(habitDay(drinkWater, d, DAY).status, d).not.toBe('skipped');
    expect(autoCompletions({links, habits, health, now: NOW})).toEqual([]);
    expect(autoRevocations({links, habits, health, now: NOW})).toEqual([]);
  });
  test('today: the habit\'s 1 of 2 liters is the 1,000 mL Today, the widget, NOVA and ZIGi show', () => {
    const day = habitDay(drinkWater, DAY, DAY), today = waterToday(health, NOW);
    expect({status: day.status, count: day.count, target: day.target}).toEqual({status: 'partial', count: 1, target: 2});
    expect(today).toMatchObject({millilitres: day.count * 1000, entries: 2, targetMl: 2000, reached: false});
    expect(waterSummary(health, DAY)).toMatchObject({millilitres: 1000, targetMl: 2000});
    expect(healthHud(health, DAY).water).toMatchObject({value: 1000, target: 2000, share: 0.5, text: '1,000 mL', targetText: '2,000 mL', note: null});
    expect(widget('health', 'water')).toMatchObject({value: '1,000 mL', detail: expect.stringContaining('Personal target 2,000 mL')});
    expect(textOf(localAnswer('How much water did I drink today?', env()))).toMatch(/^You logged 1,000 mL of water today/);
    expect(textOf(zigiOverview('How much water do I still need today?', env()))).toBe('1,000 mL to go today: 1,000 mL of 2,000 mL logged.');
    expect(textOf(zigiOverview('How many habits are left today?', env()))).toContain('• Drink water: 1 of 2 liters');
  });
  test('the finished "Drink 2 litres a day" average goal reads as met from the same journal', () => {
    const goal = averages.find(g => g.id === 'showcase-water')!;
    expect(goal.status).toBe('completed');
    expect(averageProgress(goal, health, DAY)).toMatchObject({met: true, share: 1});
  });
});

describe('Showcase: sleep goal (PR-022)', () => {
  test('Goals\' average goal says 8 h, Health\'s sleep goal 480 minutes, ZIGi "8 h 00 min"', () => {
    const avg = averages.find(g => g.id === 'showcase-sleep')!, sleep = healthGroupIn(health, 'sleep')!;
    expect({name: avg.name, target: avg.target, metric: avg.metric}).toEqual({name: 'Sleep 8 hours a night', target: 8, metric: 'sleep-hours'});
    expect(sleep.goal?.minutes).toBe(avg.target * 60);
    expect(textOf(localAnswer('What is my sleep goal?', env()))).toContain('Your goal: 8 h 00 min a night');
  });
});

describe('Showcase: tracked wealth', () => {
  test('Wealth\'s totals, the wealth widget, NOVA\'s HUD and ZIGi\'s totals read one figure per currency', () => {
    const o = wealthOverview(platform, NOW.getTime(), []);
    const usd = o.subtotals.find(s => s.currency === 'USD')!, eur = o.subtotals.find(s => s.currency === 'EUR')!;
    expect(widget('wealth', 'USD').value).toBe(`$${Number(formatUnits(usd.value.toString(), 2)).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
    expect(widget('wealth', 'EUR').value).toBe(`€${Number(formatUnits(eur.value.toString(), 2)).toLocaleString('en-US', {minimumFractionDigits: 2})}`);
    expect(wealthHud(o).primary).toMatchObject({currency: 'USD', value: usd.value});
    const tool = runTool('totals_per_currency', {}, env());
    const totals = tool.ok ? (tool.data as {totals: {currency: string; total: string}[]}).totals : [];
    expect(totals.map(t => [t.currency, t.total.replace(/[^\d.]/g, '')])).toEqual(o.subtotals.map(s => [s.currency, formatUnits(s.value.toString(), 2).replace(/^(\d+)$/, '$1.00')]));
    expect(textOf(localAnswer('What is my net worth?', env()))).toContain(`${Number(formatUnits(usd.value.toString(), 2)).toLocaleString('en-US', {minimumFractionDigits: 2})} USD`);
  });
});
