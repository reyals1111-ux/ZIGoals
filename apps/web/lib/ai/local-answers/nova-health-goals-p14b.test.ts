import {describe, expect, it} from 'vitest';
import type {HealthGoal} from '../../health-goals/schema';
import {novaToolEnv} from '../context-pack/nova';
import {toolEnv} from '../tools/env';
import {gatesFor, showcaseSources} from '../tools/fixtures';
import {novaOverviewAnswer} from './nova-overview';

/**
 * Session AL Part 14 (Denver DV-027c, P-DV-24): "How far am I on my goals?" in NOVA names the Health goals too (they live in
 * Goals → Health goals and read the Health journal), only while Health is shared; with Health closed they are not read.
 */
const at = '2026-10-01T09:00:00.000Z';
const goal = (over: Partial<HealthGoal>): HealthGoal => ({version: 1, id: '6f2c1c4e-1d3b-4c55-9a4e-0d6c1f6b2a01', name: '10k steps', measure: 'steps', direction: 'at-least', target: {value: '10000', decimals: 0}, unit: 'steps', window: {kind: 'rolling', weeks: 4}, status: 'active', createdAt: at, updatedAt: at, ...over});
const GOALS = [goal({}), goal({id: '6f2c1c4e-1d3b-4c55-9a4e-0d6c1f6b2a02', name: 'Old water goal', measure: 'water', unit: 'ml', target: {value: '2000', decimals: 0}, status: 'closed'})];
const info = {healthScope: true, healthGate: true};
const ask = (health: boolean) => {
  const env = toolEnv({...showcaseSources(), healthGoals: GOALS}, gatesFor(health), 'local');
  const r = novaOverviewAnswer('How far am I on my goals?', env, info);
  return r && 'text' in r ? r.text : '';
};
describe('DV-027c: NOVA’s goals overview and the Health goals', () => {
  it('names each active Health goal with its progress and where it lives; a closed one is left out', () => {
    const text = ask(true);
    expect(text).toMatch(/active goal/);
    expect(text).toContain('1 health goal (Goals → Health goals, from your Health journal):');
    expect(text).toMatch(/• 10k steps: (?:[\d,]+ of 10,000 steps a day on average|no data yet)/);
    expect(text).not.toContain('Old water goal');
  });
  it('with Health not shared, the Health goals are not read at all', () => {
    expect(ask(false)).not.toMatch(/health goal|10k steps/);
  });
  it('NOVA with its own Health permission off does not name them either', () => {
    const scopes = {today: true, goals: true, habits: true, health: false, wealth: true, notes: false, journal: false, earn: true};
    const env = novaToolEnv({...showcaseSources(), healthGoals: GOALS}, gatesFor(true), scopes, false);
    expect(novaToolEnv({...showcaseSources(), healthGoals: GOALS}, gatesFor(true), {...scopes, health: true}, false).healthGoals).toHaveLength(2);
    expect(env.healthGoals).toBeNull();
    const r = novaOverviewAnswer('How far am I on my goals?', env, {healthScope: false, healthGate: true});
    expect(r && 'text' in r ? r.text : '').not.toMatch(/health goal|10k steps/);
  });
});
