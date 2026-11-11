import {describe, expect, it} from 'vitest';
import {forecastWords, paceForecast} from '../../goal-forecast';
import type {GoalSummary} from '../../goal-summary';
import {formatDate} from '../../visual-format';
import {goalArcs} from '../holo/goals';
import {paceWords, wholePercent} from '../widgets/words';
import {estimateWords, focusGoal} from './goal-focus';

const g = (key: string, progressPct: string, more: Partial<GoalSummary> = {}): GoalSummary => ({key: `private:${key}`, id: key, href: `/app/goals/tracked/${key}`, name: `Fictional ${key}`, type: 'Value Goal', source: '', status: 'active', scene: 'garden', current: '2500', target: '6000', remaining: '3500', currency: 'USD', progressPct, fundingHealth: 'ON TRACK', requiresReview: false, metadata: [], ...more});
const arcsOf = (goals: GoalSummary[], averages: Parameters<typeof goalArcs>[2] = []) => goalArcs(goals, 7, averages).arcs;

describe('Goal: one goal, through the same functions as the Goals HUD and the goal\'s page', () => {
  it('no goals: nothing to show', () => {
    expect(focusGoal([], [], undefined, null)).toBeNull();
    expect(focusGoal([], [], 'gone', null)).toBeNull();
    // Only finished goals: there is no lead goal.
    const done = [g('a', '100', {status: 'completed'})];
    expect(focusGoal(done, arcsOf(done), undefined, null)).toBeNull();
  });

  it('without a ref: the HUD\'s lead goal — the one its pace line is about, else its first arc', () => {
    const goals = [g('a', '10'), g('b', '41.66'), g('c', '80')];
    expect(focusGoal(goals, arcsOf(goals), undefined, null)!.key).toBe('private:a');
    expect(focusGoal(goals, arcsOf(goals), undefined, '/app/goals/tracked/b')!.key).toBe('private:b');
    // A lead that is no longer active is not shown in its place.
    const closed = [g('a', '10', {status: 'closed'}), g('b', '20')];
    expect(focusGoal(closed, arcsOf(closed), undefined, '/app/goals/tracked/a')!.key).toBe('private:b');
  });

  it('with a ref: that goal, by its id or its key; a goal removed since falls back to the lead goal', () => {
    const goals = [g('a', '10'), g('b', '41.66'), {...g('7', '55'), key: 'legacy:7', href: '/app/goals/7'}];
    expect(focusGoal(goals, arcsOf(goals), 'b', null)!.key).toBe('private:b');
    expect(focusGoal(goals, arcsOf(goals), 'private:b', null)!.key).toBe('private:b');
    expect(focusGoal(goals, arcsOf(goals), '7', null)!.key).toBe('legacy:7');
    expect(focusGoal(goals, arcsOf(goals), 'no-longer-here', null)!.key).toBe('private:a');
    expect(focusGoal(goals, arcsOf(goals), 'no-longer-here', '/app/goals/tracked/b')!.key).toBe('private:b');
  });

  it('the percent, the pace words and the amounts are the shared ones', () => {
    const goals = [g('a', '41.66')], f = focusGoal(goals, arcsOf(goals), 'a', null)!;
    expect(f).toMatchObject({name: 'Fictional a', href: '/app/goals/tracked/a', status: 'active', pct: 41.66, text: '42%', figure: '42%', atLeast: false, saved: '$2,500.00 of $6,000.00', left: '$3,500.00', targetDate: null});
    expect(f.text).toBe(wholePercent('41.66', undefined, false));
    expect(f.text).toBe(arcsOf(goals)[0]!.text);
    expect(f.pace).toEqual(paceWords('ON TRACK'));
    expect(focusGoal([g('a', '5', {fundingHealth: 'AHEAD'})], [], 'a', null)!.pace.words).toBe('Ahead of plan');
    expect(focusGoal([g('a', '5', {fundingHealth: 'BEHIND'})], [], 'a', null)!.pace).toEqual({words: 'Behind plan', tone: 'attention'});
    expect(focusGoal([g('a', '5', {targetDate: '2028-01-14'})], [], 'a', null)!.targetDate).toBe('2028-01-14');
  });

  it('an unknown value is never a number; a lower bound says so', () => {
    const unknown = focusGoal([g('a', '0', {progressBound: 'unavailable'})], [], 'a', null)!;
    expect(unknown).toMatchObject({pct: null, text: 'Unavailable', figure: '—', atLeast: false, left: null});
    expect(unknown.saved).toBe('Value unavailable of $6,000.00');
    const bound = focusGoal([g('a', '45', {progressBound: 'at-least', current: '2700', remaining: '3300'})], [], 'a', null)!;
    expect(bound).toMatchObject({pct: 45, text: 'At least 45%', figure: '45%', atLeast: true, saved: 'At least $2,700.00 of $6,000.00', left: 'At most $3,300.00'});
    // A plan in money that holds an unpriced asset shows what is held, never a converted value.
    expect(focusGoal([g('a', '0', {progressBound: 'unavailable', heldAsset: 'ZIG', current: '12'})], [], 'a', null)!.saved).toBe('12 ZIG of $6,000.00');
    expect(focusGoal([g('a', '0', {target: undefined, remaining: undefined})], [], 'a', null)).toMatchObject({saved: '$2,500.00 · no target saved', left: null});
  });

  it('a finished goal reads as reached (100% only then), with nothing left to go', () => {
    const active = focusGoal([g('a', '100')], [], 'a', null)!;
    expect([active.text, active.pct]).toEqual(['99%', 100]);
    const done = focusGoal([g('a', '104', {status: 'completed', current: '6240', remaining: '0'})], [], 'a', null)!;
    expect(done).toMatchObject({status: 'completed', text: '100%', pct: 100, left: null, pace: {words: 'Reached', tone: 'good'}});
    expect(focusGoal([g('a', '30', {status: 'closed'})], [], 'a', null)!.pace).toEqual({words: 'Closed', tone: 'calm'});
    expect(focusGoal([g('a', '100', {status: 'closed', reached: true})], [], 'a', null)!.pace.words).toBe('Reached');
  });

  it('an average goal can be the lead (it counts no amount): its arc as the HUD draws it', () => {
    const arcs = arcsOf([], [{id: 'sleep', name: 'Fictional sleep average', status: 'active', share: 0.86, met: false}]);
    const f = focusGoal([], arcs, undefined, null)!;
    expect(f).toMatchObject({name: 'Fictional sleep average', pct: 86, text: '86%', figure: '86%', saved: null, left: null, pace: {words: 'Not on target yet'}});
    expect(focusGoal([], arcs, arcs[0]!.key, null)!.key).toBe(arcs[0]!.key);
    const unknown = arcsOf([], [{id: 'steps', name: 'Fictional steps average', status: 'active', share: null, met: null}]);
    expect(focusGoal([], unknown, undefined, null)).toMatchObject({pct: null, figure: '—', text: 'Unavailable'});
  });

  it('the estimate is the forecast\'s own words, marked as an estimate only when it is one', () => {
    expect(estimateWords(null)).toBeNull();
    const points = [{day: '2026-09-01', value: 1000}, {day: '2026-10-01', value: 1700}, {day: '2026-11-01', value: 2400}];
    const forecast = paceForecast(points, 2500, 6000, '2026-11-11'), words = estimateWords(forecast)!;
    expect(forecast.state).toBe('estimate');
    expect(words.estimate).toBe(true);
    expect(words.headline).toBe(forecastWords(forecast, day => formatDate(day)).headline);
    expect(words.headline).toMatch(/^At this pace: about /);
    expect(words.detail).toMatch(/not a promise/);
    const thin = estimateWords(paceForecast(points.slice(0, 1), 2500, 6000, '2026-11-11'))!;
    expect(thin).toMatchObject({estimate: false, headline: 'Not enough history yet'});
    expect(estimateWords(paceForecast(points, 6000, 6000, '2026-11-11'))).toMatchObject({estimate: false, headline: 'Target reached'});
  });
});
