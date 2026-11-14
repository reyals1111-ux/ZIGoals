import {describe, expect, it} from 'vitest';
import {addLocalDays} from '../../local-date';
import {emptyWorkouts, workoutsSchema, type Workout, type Workouts} from '../../workouts/schema';
import {showcaseWorkouts} from '../../workouts/showcase';
import {rangeOf} from './weight';
import {bucketsOf, workoutsCard, workoutsRows} from './workouts';

/** Session AM (ADR-038): the Workouts widget's figures. Fictional workouts; 2026-11-11 is a Wednesday; locale en-US. */
const DAY = '2026-11-11';
const workout = (offset: number, name: string, minutes: number | null, hour = 7): Workout => {
  const date = addLocalDays(DAY, offset), start = Date.parse(`${date}T${String(hour).padStart(2, '0')}:00:00Z`);
  return {id: `w-${offset}-${hour}`, name, date, type: 'strength', startedAt: new Date(start).toISOString(), ...(minutes === null ? {} : {endedAt: new Date(start + minutes * 60_000).toISOString()}), exercises: []};
};
const log = (...workouts: Workout[]): Workouts => workoutsSchema.parse({...emptyWorkouts(), workouts});

describe('the columns of a range', () => {
  it('a week by day, a month and a quarter by Monday weeks inside the range, a year by calendar month', () => {
    const week = bucketsOf(rangeOf('week', DAY));
    expect(week.by).toBe('day'); expect(week.spans).toHaveLength(7); expect(week.spans.at(-1)).toEqual({from: DAY, to: DAY});
    const month = bucketsOf(rangeOf('month', DAY));
    expect(month.by).toBe('week');
    expect(month.spans).toEqual([{from: '2026-10-13', to: '2026-10-18'}, {from: '2026-10-19', to: '2026-10-25'}, {from: '2026-10-26', to: '2026-11-01'}, {from: '2026-11-02', to: '2026-11-08'}, {from: '2026-11-09', to: '2026-11-11'}]);
    expect(bucketsOf(rangeOf('quarter', DAY)).spans).toHaveLength(14);
    const year = bucketsOf(rangeOf('year', DAY));
    expect(year.by).toBe('month'); expect(year.spans).toHaveLength(13);
    expect(year.spans[0]).toEqual({from: '2025-11-12', to: '2025-11-30'}); expect(year.spans[3]).toEqual({from: '2026-02-01', to: '2026-02-28'}); expect(year.spans.at(-1)).toEqual({from: '2026-11-01', to: DAY});
    // The columns cover every day of the range once.
    for (const r of ['week', 'month', 'quarter', 'year'] as const) { const w = rangeOf(r, DAY), s = bucketsOf(w).spans; expect(s[0]!.from).toBe(w.from); expect(s.at(-1)!.to).toBe(w.to); s.slice(1).forEach((x, i) => expect(x.from).toBe(addLocalDays(s[i]!.to, 1))); }
  });
});

describe('workoutsCard', () => {
  it('an empty log: nothing counted, nothing recent, no as-of', () => {
    const card = workoutsCard(emptyWorkouts(), DAY);
    expect(card).toMatchObject({count: 0, minutes: 0, all: 0, recent: [], asOf: null, by: 'week'});
    expect(card.buckets.every(b => b.count === 0 && b.text === 'None logged')).toBe(true);
    expect(workoutsRows(card)[0]).toEqual(['Workouts in the last 30 days', 'None logged']);
  });
  it('one workout: counted once, its minutes, singular words', () => {
    const card = workoutsCard(log(workout(-2, 'Leg day', 55)), DAY);
    expect(card).toMatchObject({count: 1, countWord: 'workout', minutes: 55, minutesText: '55 min', all: 1, asOf: 'latest log Nov 9'});
    expect(card.recent).toEqual([{id: 'w--2-7', name: 'Leg day', date: '2026-11-09', dateText: 'Nov 9', minutes: 55, minutesText: '55 min'}]);
    expect(card.buckets.map(b => b.count)).toEqual([0, 0, 0, 0, 1]);
    expect(card.buckets.at(-1)).toMatchObject({name: 'Week of Nov 9', text: '1 workout, 55 min'});
  });
  it('a range: the count and minutes in it, per week, the newest three; a workout in progress or dated later is left out', () => {
    const record = log(workout(-40, 'Old run', 30), workout(-23, 'Push day', 52), workout(-22, 'Pull day', 48), workout(-9, 'Easy run', 28, 18), workout(-2, 'Leg day', 57), workout(-1, 'Push day', 49),
      workout(0, 'Not finished', null), workout(2, 'Planned ahead', 60));
    const card = workoutsCard(record, DAY, 'month');
    expect(card).toMatchObject({count: 5, countWord: 'workouts', minutes: 234, minutesText: '3 h 54 min', all: 6});
    expect(card.buckets.map(b => b.count)).toEqual([0, 2, 0, 1, 2]);
    expect(card.buckets.map(b => b.label)).toEqual(['Oct 12', 'Oct 19', 'Oct 26', 'Nov 2', 'Nov 9']);
    // A quarter's fourteen weeks have no room for a date each: the first and last are named under the field instead.
    const quarter = workoutsCard(record, DAY, 'quarter');
    expect(quarter.buckets.every(b => b.label === '')).toBe(true); expect(quarter.edges).toEqual(['Week of Aug 10', 'This week']); expect(quarter.count).toBe(6);
    expect(card.buckets.map(b => b.text)).toEqual(['None logged', '2 workouts, 1 h 40 min', 'None logged', '1 workout, 28 min', '2 workouts, 1 h 46 min']);
    expect(card.recent.map(w => `${w.name} · ${w.dateText} · ${w.minutesText}`)).toEqual(['Push day · yesterday · 49 min', 'Leg day · Nov 9 · 57 min', 'Easy run · Nov 2 · 28 min']);
    expect(card.edges).toEqual(['Week of Oct 12', 'This week']); expect(card.asOf).toBe('latest log yesterday');
    const rows = workoutsRows(card);
    expect(rows[0]).toEqual(['Workouts in the last 30 days', '5 workouts, 3 h 54 min in total']);
    expect(rows.at(-3)).toEqual(['Latest workout', 'Push day, yesterday, 49 min']);
  });
  it('a week is by day with weekday letters; a year by month; nothing in the range still names the latest workouts', () => {
    const record = log(workout(-40, 'Old run', 30), workout(-1, 'Push day', 49), workout(-1, 'Evening stretch', 15, 19));
    const week = workoutsCard(record, DAY, 'week');
    expect(week.by).toBe('day'); expect(week.buckets.map(b => b.label)).toEqual(['Th', 'Fr', 'Sa', 'Su', 'Mo', 'Tu', 'We']);
    expect(week.buckets.map(b => b.count)).toEqual([0, 0, 0, 0, 0, 2, 0]); expect(week.count).toBe(2); expect(week.minutes).toBe(64);
    const year = workoutsCard(record, DAY, 'year');
    expect(year.by).toBe('month'); expect(year.buckets.map(b => b.label).join('')).toBe('NDJFMAMJJASON');
    expect(year.buckets.at(-1)).toMatchObject({name: 'Nov 2026', count: 2}); expect(year.buckets.at(-2)).toMatchObject({name: 'Oct 2026', count: 1}); expect(year.count).toBe(3);
    const stale = workoutsCard(log(workout(-40, 'Old run', 30)), DAY, 'week');
    expect(stale).toMatchObject({count: 0, all: 1, asOf: 'latest log Oct 2'}); expect(stale.recent).toHaveLength(1);
  });
  it('reads the Showcase\'s fictional log as the workout engine does', () => {
    const card = workoutsCard(showcaseWorkouts(DAY), DAY);
    expect(card.count).toBe(9); expect(card.minutes).toBe(52 + 48 + 55 + 28 + 50 + 47 + 57 + 34 + 49);
    expect(card.recent.map(w => w.name)).toEqual(['Push day', 'Easy run', 'Leg day']);
  });
});
