import {beforeAll, describe, expect, test} from 'vitest';
import {loadAaPlanner} from './plan';
beforeAll(() => loadAaPlanner());
import {emptyHabitData, type HabitData} from '../../habits';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyPlatform} from '../../positions';
import {emptyReminders} from '../../reminders/schema';
import {presetSettings} from '../../dashboard-settings';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import type {Handle} from '../context/types';
import {planAction, type Env, type Stores} from './plan';
import {actionSchema, expandComposite, compositeSchema} from './schema';
import {applyDeviceWrite, DEVICE_WRITE_KEYS} from './device-writes';
import {GOAL_EXTRAS, GOAL_EXTRAS_KEY, emptyGoalExtras, childrenOf} from '../../goal-extras/store';
import {AVERAGE_GOALS_KEY, emptyAverageGoals} from '../../average-goals/store';
import {CALCULATOR_KEY, emptyCalculator} from '../../compound/store';
import {LIFE_REVIEW_KEY, emptyLifeReview} from '../../life-review/store';
import {AUTO_ACCEPT_NEVER} from './auto-accept';

/** Session AA-Local, merged second (ADR-022 B53): ZIGi's cards for AA-Cloud's features, each a device write through the store's own function, or a navigation. */
const DAY = '2026-10-07', now = new Date('2026-10-07T19:00:00Z');
const stores = (): Stores => ({habits: {...emptyHabitData(), timeZone: 'UTC'} as HabitData, health: healthSchema.parse({...createEmptyHealth(), schemaVersion: 4}), platform: emptyPlatform(), fasting: {version: 1, sessions: []}, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: emptyWeeklyReview(), memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}});
const handles: Handle[] = [{handle: 'g1', kind: 'goal', id: 'private:goal-1', label: 'Emergency fund'}, {handle: 'g2', kind: 'goal', id: 'private:goal-2', label: 'Holiday fund'}];
const env = (): Env => ({stores: stores(), handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC'});
const plan = (raw: Record<string, unknown>) => { const r = planAction(actionSchema.parse(raw), env()); if (!r.ok) throw new Error(r.message); return r.plan; };
const refused = (raw: Record<string, unknown>) => { const r = planAction(actionSchema.parse(raw), env()); if (r.ok) throw new Error('planned'); return r.message; };

describe('goal extras (zigoals:goal-extras:v1)', () => {
  test('set-goal-area files a goal under an area through setGoalArea; null removes it', () => {
    const p = plan({kind: 'set-goal-area', goal: 'g1', area: 'wealth'});
    expect(p.device).toMatchObject({key: GOAL_EXTRAS_KEY, patch: {area: {goalKey: 'private:goal-1', areaId: 'wealth'}}});
    expect(p.undo).toBeNull(); expect(p.card.title).toBe('Emergency fund → wealth');
    const after = applyDeviceWrite(GOAL_EXTRAS_KEY, emptyGoalExtras(), p.device!.patch) as ReturnType<typeof emptyGoalExtras>;
    expect(after.goals['private:goal-1']?.area).toBe('wealth');
    const cleared = applyDeviceWrite(GOAL_EXTRAS_KEY, after, plan({kind: 'set-goal-area', goal: 'g1', area: null}).device!.patch) as ReturnType<typeof emptyGoalExtras>;
    expect(cleared.goals['private:goal-1']?.area).toBeUndefined();
  });
  test('an unknown area or goal is refused', () => {
    expect(refused({kind: 'set-goal-area', goal: 'g1', area: 'sports'})).toMatch(/Areas are/);
    expect(refused({kind: 'set-goal-area', goal: 'g9', area: 'health'})).toMatch(/goal/i);
  });
  test('set-goal-plan keeps the why, the obstacle and the if-then plan in the person\'s own words', () => {
    const p = plan({kind: 'set-goal-plan', goal: 'g1', why: 'Peace of mind', ifThen: 'If I want to buy something, then I wait a day'});
    expect(p.device).toMatchObject({key: GOAL_EXTRAS_KEY, patch: {reasons: {goalKey: 'private:goal-1', why: 'Peace of mind', ifThen: 'If I want to buy something, then I wait a day'}}});
    expect(p.card.lines[0]).toBe('Why: Peace of mind');
    const after = applyDeviceWrite(GOAL_EXTRAS_KEY, emptyGoalExtras(), p.device!.patch) as ReturnType<typeof emptyGoalExtras>;
    expect(after.goals['private:goal-1']).toMatchObject({why: 'Peace of mind', ifThen: 'If I want to buy something, then I wait a day'});
    expect(() => actionSchema.parse({kind: 'set-goal-plan', goal: 'g1'})).toThrow();
  });
  test('set-sub-goal places a goal under another; null takes it out; a goal is never its own parent', () => {
    const p = plan({kind: 'set-sub-goal', goal: 'g2', parent: 'g1'});
    expect(p.device).toMatchObject({key: GOAL_EXTRAS_KEY, patch: {parent: {goalKey: 'private:goal-2', parentKey: 'private:goal-1'}}});
    const after = applyDeviceWrite(GOAL_EXTRAS_KEY, emptyGoalExtras(), p.device!.patch) as ReturnType<typeof emptyGoalExtras>;
    expect(childrenOf(after, 'private:goal-1')).toEqual(['private:goal-2']);
    expect(refused({kind: 'set-sub-goal', goal: 'g1', parent: 'g1'})).toMatch(/own parent/);
    expect(plan({kind: 'set-sub-goal', goal: 'g2', parent: null}).device).toMatchObject({patch: {parent: {parentKey: null}}});
  });
});

describe('average goals (zigoals:average-goals:v1)', () => {
  test('create-average-goal adds through addAverageGoal with the metric\'s unit; log-average finds the goal by name', () => {
    const p = plan({kind: 'create-average-goal', name: 'Sleep 7 hours', metric: 'sleep-hours', target: 7, windowDays: 14});
    expect(p.device).toMatchObject({key: AVERAGE_GOALS_KEY, patch: {add: {name: 'Sleep 7 hours', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 14}}});
    expect(p.card.lines[0]).toBe('At least 7 h a night on average over 14 days');
    const after = applyDeviceWrite(AVERAGE_GOALS_KEY, emptyAverageGoals(), p.device!.patch) as ReturnType<typeof emptyAverageGoals>;
    expect(after.goals).toHaveLength(1); expect(after.goals[0]).toMatchObject({name: 'Sleep 7 hours', status: 'active', entries: []});
    const custom = applyDeviceWrite(AVERAGE_GOALS_KEY, after, plan({kind: 'create-average-goal', name: 'Pages read', metric: 'custom', target: 30, unit: 'pages'}).device!.patch) as ReturnType<typeof emptyAverageGoals>;
    const logged = applyDeviceWrite(AVERAGE_GOALS_KEY, custom, plan({kind: 'log-average', goal: 'pages read', value: 32, day: 'today'}).device!.patch) as ReturnType<typeof emptyAverageGoals>;
    expect(logged.goals.find(g => g.name === 'Pages read')!.entries).toEqual([{day: DAY, value: 32}]);
    expect(() => applyDeviceWrite(AVERAGE_GOALS_KEY, custom, {log: {goal: 'Nothing', day: DAY, value: 1}})).toThrow(/No average goal/);
  });
});

describe('the calculator, search and the Life review', () => {
  test('calculator-scenario remembers the figures on this device and opens the calculator; the card says estimate', () => {
    const p = plan({kind: 'calculator-scenario', start: 1000, contribution: 200, frequency: 'monthly', ratePercent: 5, years: 20});
    expect(p.navigate).toEqual({href: '/app/wealth/calculator', label: 'Wealth → Compound interest calculator'});
    expect(p.card.estimate).toBe(true); expect(p.card.lines.join(' ')).toMatch(/estimate, never a promise/);
    const after = applyDeviceWrite(CALCULATOR_KEY, emptyCalculator(), p.device!.patch) as ReturnType<typeof emptyCalculator>;
    expect(after.last).toMatchObject({start: '1000', contribution: '200', frequency: 'monthly', ratePercent: 5, years: 20, compounding: 'monthly'});
    expect(() => actionSchema.parse({kind: 'calculator-scenario'})).toThrow();
  });
  test('open-search navigates with the query; open-review sets the period then opens the page', () => {
    expect(plan({kind: 'open-search', query: 'sleep'}).navigate).toEqual({href: '/app?search=sleep', label: 'Search'});
    const r = plan({kind: 'open-review', period: 'month'});
    expect(r.navigate).toEqual({href: '/app/review', label: 'Life review'});
    expect(applyDeviceWrite(LIFE_REVIEW_KEY, emptyLifeReview(), r.device!.patch)).toMatchObject({period: 'month'});
    const o = plan({kind: 'open-page', page: 'review', view: 'week'});
    expect(o.navigate?.href).toBe('/app/review'); expect(o.device).toMatchObject({key: LIFE_REVIEW_KEY, patch: {period: 'week'}});
    expect(plan({kind: 'open-page', page: 'wealth', view: 'calculator'}).navigate?.href).toBe('/app/wealth/calculator');
    expect(plan({kind: 'open-page', page: 'goals', view: 'templates'}).navigate?.href).toBe('/app/goals/templates');
    expect(plan({kind: 'open-page', page: 'settings', view: 'data'}).navigate?.href).toBe('/app/settings/data');
    expect(plan({kind: 'open-page', page: 'share'}).navigate?.href).toBe('/app/share');
  });
  test('the three navigations are never automatic; the five device records are in the registry', () => {
    for (const k of ['calculator-scenario', 'open-search', 'open-review']) expect(AUTO_ACCEPT_NEVER).toContain(k);
    for (const k of [GOAL_EXTRAS_KEY, AVERAGE_GOALS_KEY, CALCULATOR_KEY, LIFE_REVIEW_KEY]) expect(DEVICE_WRITE_KEYS).toContain(k);
    expect(GOAL_EXTRAS.key).toBe(GOAL_EXTRAS_KEY);
  });
});

describe('goal-from-template (a composite)', () => {
  test('a project template becomes a create-goal with its milestones; an average template becomes an average goal; a weight template opens Health', () => {
    expect(expandComposite(compositeSchema.parse({kind: 'goal-from-template', template: 'run-10k'}), () => 'new1')).toEqual([{kind: 'create-goal', name: 'Run a 10K', type: 'PROJECT', milestones: ['Run 3 km without stopping', 'Run 5 km', 'Run 8 km', 'Run 10 km'], notes: 'From your first easy run to 10 km.'}]);
    expect(expandComposite(compositeSchema.parse({kind: 'goal-from-template', template: 'Sleep 7 hours a night'}), () => 'new1')).toEqual([{kind: 'create-average-goal', name: 'Sleep 7 hours a night', metric: 'sleep-hours', target: 7, direction: 'at-least', windowDays: 14, unit: 'h a night'}]);
    expect(expandComposite(compositeSchema.parse({kind: 'goal-from-template', template: 'lose-5kg'}), () => 'new1')).toEqual([{kind: 'open-page', page: 'health'}]);
    expect(expandComposite(compositeSchema.parse({kind: 'goal-from-template', template: 'no such template at all'}), () => 'new1')[0]).toMatchObject({kind: 'goal-from-template', missing: true});
  });
});
