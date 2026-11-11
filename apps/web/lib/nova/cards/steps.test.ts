import {describe, expect, it} from 'vitest';
import {createEmptyHealth, dailyHealthSummary, saveActivity, setHealthTargets, type HealthData} from '../../health';
import {addLocalDays} from '../../local-date';
import {stepsByDay, stepsCard, stepsRows} from './steps';

/** Session AM (ADR-038): the Steps widget's figures. Fictional entries; the display locale is the default (en-US). */
const DAY = '2026-11-11', AT = '2026-11-11T12:00:00.000Z';
const hid = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
let n = 0;
const walk = (d: HealthData, offset: number, steps: number, minutes = 0, name = 'Walk') => saveActivity(d, {id: hid(++n), date: addLocalDays(DAY, offset), name, steps, minutes}, AT);
const withTarget = (d: HealthData, steps: number | null) => setHealthTargets(d, {...d.targets, steps});

describe('stepsCard', () => {
  it('nothing logged: today unknown ("—", never 0), every day a gap, no average', () => {
    const card = stepsCard(createEmptyHealth(), DAY);
    expect(card.window).toMatchObject({range: 'week', days: 7});
    expect(card.today).toEqual({steps: null, text: '—', share: null, note: 'No steps logged today'});
    expect(card.values).toEqual([null, null, null, null, null, null, null]);
    expect(card.average).toBeNull(); expect(card.best).toBeNull(); expect(card.latest).toBeNull(); expect(card.asOf).toBeNull();
    expect(card.target).toBeNull(); expect(card.logged).toMatchObject({days: 0, of: 7, atTarget: null});
  });
  it('one day: today is the Health page\'s own total (entries of one day add up); no target, no share', () => {
    let d = walk(createEmptyHealth(), 0, 4321, 30); d = walk(d, 0, 1000, 10, 'Evening walk');
    const card = stepsCard(d, DAY);
    expect(card.today).toEqual({steps: 5321, text: '5,321', share: null, note: null});
    expect(card.today.steps).toBe(dailyHealthSummary(d, DAY).steps);
    expect(card.values).toEqual([null, null, null, null, null, null, 5321]);
    expect(card.average).toEqual({steps: 5321, text: '5,321'}); expect(card.logged.text).toBe('1 of 7 days logged');
    expect(card.asOf).toBe('latest log today');
    expect(Object.fromEntries(stepsRows(card, DAY))['Your step target']).toBe('Not set');
  });
  it('a week against the target: to go, the average of the logged days only, days at the target, the weekdays', () => {
    let d = withTarget(createEmptyHealth(), 8000);
    d = walk(d, -6, 9000); d = walk(d, -4, 6000); d = walk(d, -1, 12_000); d = walk(d, 0, 6412);
    const card = stepsCard(d, DAY, 'week');
    expect(card.values).toEqual([9000, null, 6000, null, null, 12_000, 6412]);
    expect(card.weekdays).toEqual(['Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We']);
    expect(card.today).toMatchObject({steps: 6412, text: '6,412', note: '1,588 to go'}); expect(card.today.share).toBeCloseTo(0.8015);
    expect(card.target).toEqual({steps: 8000, text: '8,000'});
    expect(card.average).toEqual({steps: 8353, text: '8,353'});
    expect(card.best).toMatchObject({date: '2026-11-10', text: '12,000'});
    expect(card.logged).toMatchObject({days: 4, of: 7, atTarget: 2});
    const rows = Object.fromEntries(stepsRows(card, DAY));
    expect(rows['Steps today']).toBe('6,412 of 8,000 (1,588 to go)');
    expect(rows['Average a day in the last 7 days']).toBe('8,353 (4 of 7 days logged)');
    expect(rows['Days at your target']).toBe('2 of 4 logged');
    expect(rows['Fri, Nov 6']).toBe('No steps logged');
    expect(stepsCard(walk(d, 0, 2000), DAY).today.note).toBe('Target reached');
  });
  it('a day with only a workout\'s minutes has no step figure: a gap, not 0', () => {
    let d = walk(createEmptyHealth(), -1, 7000); d = walk(d, 0, 0, 45, 'Push day');
    const card = stepsCard(d, DAY);
    expect(stepsByDay(d).has(DAY)).toBe(false);
    expect(card.today).toMatchObject({steps: null, text: '—', note: 'No steps logged today'});
    expect(card.values.at(-1)).toBeNull(); expect(card.average?.steps).toBe(7000); expect(card.asOf).toBe('latest log yesterday');
  });
  it('a longer range: one value a day, edge labels, older and later days left out', () => {
    let d = withTarget(createEmptyHealth(), 10_000);
    d = walk(d, -45, 20_000); d = walk(d, -29, 4000); d = walk(d, -3, 7000); d = walk(d, 2, 30_000);
    const month = stepsCard(d, DAY, 'month');
    expect(month.values).toHaveLength(30); expect(month.values[0]).toBe(4000); expect(month.values.filter(v => v !== null)).toEqual([4000, 7000]);
    expect(month.average?.steps).toBe(5500); expect(month.edges).toEqual({min: '4,000', dates: ['Oct 13', 'Today']});
    expect(month.today.steps).toBeNull(); expect(month.latest).toBe('2026-11-08');
    const quarter = stepsCard(d, DAY, 'quarter');
    expect(quarter.values).toHaveLength(90); expect(quarter.best?.text).toBe('20,000'); expect(quarter.edges.max).toBe('20,000');
    // A long range's table lists its logged days only.
    expect(stepsRows(quarter, DAY).filter(([, v]) => v === 'No steps logged')).toHaveLength(0);
    const week = stepsCard(d, DAY, 'week');
    expect(week.average?.steps).toBe(7000); expect(week.values.filter(v => v !== null)).toEqual([7000]);
    // Nothing in the range, something before it: the range is empty, the latest log is still named.
    expect(stepsCard(walk(createEmptyHealth(), -20, 5000), DAY, 'week')).toMatchObject({average: null, latest: '2026-10-22', asOf: 'latest log Oct 22'});
  });
});
