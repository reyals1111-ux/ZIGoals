import {describe, expect, it} from 'vitest';
import {dayStreak, habitsByStreak, perfectWeeks, periodCounts, periodStart, weekStart, weeklyCounts} from './report';
import {createHabit, emptyHabitData, logHabitCount, type HabitInput} from '../../lib/habits';

// Session AL third pass (L4): Activity's report (GAP-124/122/125) and its two new kinds of row (DV-172, DV-206).
const ID = '11111111-1111-4111-8111-111111111111';
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Walk', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});

describe('report periods and streaks', () => {
  it('weeks start on Monday; each period counts its own rows up to today', () => {
    expect(weekStart('2026-11-05')).toBe('2026-11-02');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(periodStart('month', '2026-11-05')).toBe('2026-11-01');
    const rows = [{category: 'GOAL', dayKey: '2026-11-05'}, {category: 'GOAL', dayKey: '2026-11-01'}, {category: 'HABIT', dayKey: '2026-10-20'}, {category: 'HEALTH', dayKey: '2025-12-31'}, {category: 'GOAL', dayKey: '2026-11-06'}];
    expect(periodCounts(rows, 'week', '2026-11-05')).toEqual({GOAL: 1});
    expect(periodCounts(rows, 'month', '2026-11-05')).toEqual({GOAL: 2});
    expect(periodCounts(rows, 'year', '2026-11-05')).toEqual({GOAL: 2, HABIT: 1});
    expect(periodCounts(rows, 'all', '2026-11-05')).toEqual({GOAL: 2, HABIT: 1, HEALTH: 1});
  });
  it('a goal-day streak runs to today, or to yesterday while today has none yet', () => {
    expect(dayStreak(new Set(['2026-11-05', '2026-11-04', '2026-11-02']), '2026-11-05')).toBe(2);
    expect(dayStreak(new Set(['2026-11-04', '2026-11-03']), '2026-11-05')).toBe(2);
    expect(dayStreak(new Set(['2026-11-02']), '2026-11-05')).toBe(0);
  });
  it('the last 12 weeks of goal steps, oldest first, this week last', () => {
    const w = weeklyCounts(['2026-11-05', '2026-11-03', '2026-10-27', '2026-01-01'], '2026-11-05');
    expect(w).toHaveLength(12);
    expect(w.at(-1)).toEqual({weekStart: '2026-11-02', count: 2});
    expect(w.at(-2)).toEqual({weekStart: '2026-10-26', count: 1});
    expect(w.reduce((n, x) => n + x.count, 0)).toBe(3);
  });
  it('habits rank by their current streak; perfect weeks count finished weeks with nothing missed', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-10-12T08:00:00Z'), ID);
    for (let day = 12; day <= 31; day++) d = logHabitCount(d, ID, `2026-10-${day}`, 1, '', new Date(`2026-10-${day}T20:00:00Z`));
    for (let day = 1; day <= 4; day++) d = logHabitCount(d, ID, `2026-11-0${day}`, 1, '', new Date(`2026-11-0${day}T20:00:00Z`));
    const ranked = habitsByStreak(d.habits, '2026-11-05');
    expect(ranked[0]).toMatchObject({title: 'Walk', unit: 'days'});
    expect(ranked[0]!.streak).toBeGreaterThanOrEqual(24);
    const p = perfectWeeks(d.habits, '2026-11-05', 4);
    // 12–18 Oct, 19–25 Oct and 26 Oct–1 Nov were full; the week before the habit existed says nothing.
    expect(p.total).toBe(3);
    expect(p.byCategory).toEqual([{category: 'Health', perfect: 3}]);
  });
});
