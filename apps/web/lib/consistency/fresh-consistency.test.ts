import {describe, expect, test} from 'vitest';
import {emptyPlatform} from '../positions';
import {emptyHabitData} from '../habits';
import {createEmptyHealth} from '../health';
import {waterSummary, waterToday} from '../health-daily';
import {NO_WATER_TODAY} from '../health-units';
import {unifiedGoalSummaries} from '../goal-summary';
import {activeGoalCount, checkInsOn, goalCounts, habitsLeftOn, habitsOnDay} from '../numbers/counts';
import {widgetMetric, type DashboardSources} from '../dashboard-metrics';
import {WIDGET_CATALOG, type DashboardWidget} from '../dashboard-settings';
import {coreRings} from '../nova/holo/core';
import {goalArcs} from '../nova/holo/goals';
import {habitsHud} from '../nova/holo/habits';
import {healthHud} from '../nova/holo/health';
import {wealthHud} from '../nova/holo/wealth';
import {wealthOverview} from '../wealth';
import {toolEnv, type ToolSources} from '../ai/tools/env';
import {gatesFor} from '../ai/tools/fixtures';
import {Handles} from '../ai/handles';
import {localAnswer, zigiOverview, type LocalReply} from '../ai/local-answers/engine';

/**
 * Session AL Part 13: a fresh, empty device. Every surface that would show a figure says "—" or "nothing yet" with a
 * reason instead, never a 0 presented as measured (unknown is not zero), and no surface counts something another one
 * says is not there.
 */
const DAY = '2026-11-05', NOW = new Date(`${DAY}T10:00:00Z`);
const platform = emptyPlatform(), habits = emptyHabitData(), health = createEmptyHealth();
const summaries = unifiedGoalSummaries([], {}, platform, [], NOW.getTime());
const sources: DashboardSources = {platform, goals: summaries, averages: [], habits, health, quotes: [], now: NOW.getTime(), today: DAY, healthDate: DAY};
const widget = (kind: DashboardWidget['kind'], metric: string) => widgetMetric({id: 'p13', kind, metric, title: '', size: 'compact', hidden: false, revision: 1}, sources);
const toolSources: ToolSources = {now: NOW, habitDay: DAY, healthDay: DAY, habitZone: 'UTC', healthZone: 'UTC', habits, health, fasting: null, platform, localGoals: [], metadata: {}, quotes: [], localActivity: null, portfolio: null, weekly: null, notes: null, accounts: null, milestoneDates: null, chess: null, linksCount: 0, showcase: false} as unknown as ToolSources;
const env = () => toolEnv(toolSources, gatesFor(true, 'goals', '/app/goals'), 'local', new Handles());
const textOf = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
/** A figure shown as if it were measured: a leading 0 with a unit or "of" ("0 mL", "0 of 0", "0 kcal", "$0.00"). */
const FAKE_ZERO = /^(?:[$€]\s?)?0(?:[.,]0+)?(?:\s|$)/;

describe('fresh device: counts are zero only where zero is the truth, and every page says the same', () => {
  test('goals: none on Today, Goals, the widget, NOVA and ZIGi', () => {
    expect(goalCounts(summaries, [])).toEqual({active: 0, finished: 0});
    expect(activeGoalCount(summaries)).toBe(0);
    expect(goalArcs(summaries)).toEqual({arcs: [], more: 0, active: 0});
    expect(widget('goals', 'overview').value).not.toMatch(FAKE_ZERO);
    expect(textOf(zigiOverview('How far am I on my goals?', env()))).toMatch(/^You have no active goals yet/);
  });
  test('habits: nothing due anywhere, said in words', () => {
    expect(habitsOnDay(habits.habits, DAY, DAY)).toEqual({due: 0, done: 0});
    expect(checkInsOn(habits.habits, DAY, DAY)).toBe(0);
    expect(habitsLeftOn(habits.habits, DAY, DAY)).toBe(0);
    expect(habitsHud(habits.habits, DAY)).toMatchObject({due: 0, done: 0, rings: [], count: 0});
    expect(widget('habits', 'overview').value).toBe('No Habits due today');
    expect(textOf(zigiOverview('How many habits are left today?', env()))).toMatch(/^No habit is kept yet/);
  });
  test('water: no entry is "—" and "No water logged yet today" on Today\'s widget, NOVA and ZIGi, never "0 mL"', () => {
    expect(waterSummary(health, DAY)).toMatchObject({entries: 0, targetMl: null});
    expect(waterToday(health, NOW)).toMatchObject({entries: 0, reached: null});
    expect(healthHud(health, DAY).water).toMatchObject({value: null, share: null, text: '—', note: NO_WATER_TODAY});
    expect(widget('health', 'water').value).toBe(NO_WATER_TODAY);
    const zigi = textOf(zigiOverview('How much water do I still need today?', env()));
    expect(zigi).toContain(`${NO_WATER_TODAY}.`); expect(zigi).not.toMatch(/\b0 mL\b/);
  });
  test('wealth: no holding means no total, not $0.00', () => {
    const o = wealthOverview(platform, NOW.getTime(), []);
    expect(o.rows).toEqual([]);
    expect(wealthHud(o)).toMatchObject({primary: null, purpose: null, holdings: 0});
    expect(widget('wealth', 'USD').value).toBe('No recorded value');
    expect(textOf(localAnswer('What is my net worth?', env()))).not.toMatch(/\b0\.00 USD\b/);
  });
  test('NOVA\'s core: four unknowns, each with its reason', () => {
    const o = wealthOverview(platform, NOW.getTime(), []), hud = healthHud(health, DAY).water;
    const rings = coreRings({water: {share: hud.share, text: hud.text, targetText: hud.targetText, logged: hud.value !== null}, habits: {due: 0, done: 0}, goal: null, wealth: wealthHud(o).purpose});
    expect(rings.map(r => [r.pillar, r.text, r.share])).toEqual([['health', '—', null], ['habits', '—', null], ['goals', '—', null], ['wealth', '—', null]]);
    for (const r of rings) expect(r.reason, r.pillar).toBeTruthy();
  });
  test('no Today widget presents a measured 0 on an empty device', () => {
    const seen: string[] = [];
    for (const [kind, spec] of Object.entries(WIDGET_CATALOG)) {
      if (['goal', 'habit', 'asset', 'staking', 'allocation', 'food-entry', 'meal', 'ecosystem', 'links', 'music', 'chess'].includes(kind)) continue; // need a chosen record or are not figures
      for (const metric of spec.metrics) { const v = widget(kind as DashboardWidget['kind'], metric).value; seen.push(`${kind}/${metric}`); expect(v, `${kind}/${metric}: ${v}`).not.toMatch(FAKE_ZERO); }
    }
    expect(seen.length).toBeGreaterThan(15);
  });
});
