import {describe, expect, it} from 'vitest';
import {createEmptyHealth} from '../health';
import {AVERAGE_GOALS, addAverageGoal, averageProgress, emptyAverageGoals, logAverageValue, removeAverageValue, setAverageStatus} from './store';
import {readDeviceRecord} from '../device-record';
import type {HealthData} from '../health';

const at = '2026-10-11T08:00:00.000Z', today = '2026-10-11';
const base = () => addAverageGoal(emptyAverageGoals(), {id: 'steps', name: '8,000 steps a day', metric: 'steps', unit: 'steps a day', target: 8000, direction: 'at-least', windowDays: 7, createdAt: at});
const withSteps = (days: [string, number][]): HealthData => ({...createEmptyHealth(), activity: days.map(([date, steps], i) => ({id: `a${i}`, date, type: 'walk', steps, minutes: 30, createdAt: at, updatedAt: at}))} as unknown as HealthData);

describe('G8 average goals (Session AA-Cloud Part 2)', () => {
  it('a missing record reads as empty; the stored shape round-trips', () => {
    expect(readDeviceRecord({getItem: () => null}, AVERAGE_GOALS)).toEqual({data: emptyAverageGoals(), unreadable: false});
    const s = base();
    expect(readDeviceRecord({getItem: () => JSON.stringify(s)}, AVERAGE_GOALS).data).toEqual(s);
  });
  it('averages Health’s days; a day without a value is left out, never zero', () => {
    const health = withSteps([['2026-10-11', 9000], ['2026-10-10', 7000], ['2026-10-08', 8000]]);
    const p = averageProgress(base().goals[0]!, health, today);
    expect(p.days).toBe(3);
    expect(p.average).toBe(8000);
    expect(p.met).toBe(true);
    expect(p.share).toBe(1);
    expect(p.series.filter(d => d.value === null)).toHaveLength(4);
    expect(p.source).toBe('health');
  });
  it('the person’s own entry for a day wins over Health’s', () => {
    let s = base();
    s = logAverageValue(s, 'steps', {day: '2026-10-11', value: 3000});
    const p = averageProgress(s.goals[0]!, withSteps([['2026-10-11', 9000], ['2026-10-10', 7000]]), today);
    expect(p.average).toBe(5000);
    expect(p.met).toBe(false);
    expect(p.share).toBeCloseTo(5000 / 8000, 9);
    expect(p.source).toBe('both');
    s = removeAverageValue(s, 'steps', '2026-10-11');
    expect(s.goals[0]!.entries).toEqual([]);
  });
  it('nothing recorded: no average, no verdict', () => {
    const p = averageProgress(base().goals[0]!, undefined, today);
    expect(p).toMatchObject({average: null, days: 0, met: null, share: null});
  });
  it('"at most" goals compare the other way', () => {
    let s = addAverageGoal(emptyAverageGoals(), {id: 'screen', name: 'Screen time', metric: 'custom', unit: 'h a day', target: 2, direction: 'at-most', windowDays: 7, createdAt: at});
    s = logAverageValue(s, 'screen', {day: '2026-10-10', value: 3});
    s = logAverageValue(s, 'screen', {day: '2026-10-11', value: 1});
    const p = averageProgress(s.goals[0]!, undefined, today);
    expect(p.average).toBe(2);
    expect(p.met).toBe(true);
    s = logAverageValue(s, 'screen', {day: '2026-10-09', value: 5});
    const q = averageProgress(s.goals[0]!, undefined, today);
    expect(q.met).toBe(false);
    expect(q.share).toBeCloseTo(2 / 3, 9);
  });
  it('refuses a duplicate, an unknown goal and a negative value; completing stamps the time', () => {
    expect(() => addAverageGoal(base(), {id: 'steps', name: 'x', metric: 'steps', unit: '', target: 1, direction: 'at-least', windowDays: 7, createdAt: at})).toThrow('already exists');
    expect(() => logAverageValue(base(), 'nope', {day: today, value: 1})).toThrow('not on this device');
    expect(() => logAverageValue(base(), 'steps', {day: today, value: -1})).toThrow();
    expect(setAverageStatus(base(), 'steps', 'completed', at).goals[0]).toMatchObject({status: 'completed', completedAt: at});
  });
});
