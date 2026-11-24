import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {bandWords, movementBand, movementDays, type ActivityMinutes} from './movement';
import {emptyWorkouts, type Workout, type Workouts} from './schema';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #375, Gentler Streak's Activity Path): the usual weekly range from the last six
 * weeks (the lowest and highest set aside), this week filling it, workouts and other movement counted once each.
 */
const TODAY = '2026-11-19'; // a Thursday; this week starts Mon, Nov 16
const workout = (date: string, minutes: number, activityId?: string): Workout => ({id: `w-${date}-${minutes}`, name: 'Push day', date, type: 'strength', startedAt: `${date}T07:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T07:00:00.000Z`) + minutes * 60_000).toISOString(), exercises: [], ...(activityId ? {activityId} : {})} as Workout);
const log = (list: Workout[]): Workouts => ({...emptyWorkouts(), workouts: list});
/** One walk on each Monday of the six weeks before this one, of these minutes (oldest first). */
const weeksOf = (minutes: number[]): ActivityMinutes[] => minutes.map((m, i) => ({id: `walk-${i}`, date: addLocalDays('2026-11-16', -7 * (6 - i)), minutes: m}));

describe('the movement band', () => {
  test('six weeks: the lowest and highest set aside; this week fills it', () => {
    const activity = [...weeksOf([60, 150, 180, 200, 240, 400]), {id: 'today-walk', date: TODAY, minutes: 30}, {id: 'mon-garden', date: '2026-11-16', minutes: 45}];
    const b = movementBand(log([workout('2026-11-17', 60)]), activity, TODAY);
    expect([b.low, b.high, b.counted]).toEqual([150, 240, 6]);
    expect(b.weekTotal).toBe(135);
    expect([b.weekWorkouts, b.weekOther]).toEqual([60, 75]);
    expect(b.word).toBe('below');
    expect(b.week.map(d => d.total)).toEqual([45, 105, 105, 135, 135, 135, 135]);
    expect(b.week.slice(4).every(d => d.future && d.minutes === 0)).toBe(true);
    expect(bandWords(b)).toBe('Below your usual range (150–240 min a week) so far; the week runs to Sunday.');
    expect(b.last30).toHaveLength(30);
    expect(b.last30.at(-1)).toMatchObject({date: TODAY, minutes: 30});
  });
  test('inside and above; with three or four weeks (the weeks before the first movement left out), the lowest to the highest', () => {
    const four = weeksOf([0, 0, 100, 120, 140, 160]).slice(2);
    const inside = movementBand(log([]), [...four, {id: 'x', date: TODAY, minutes: 130}], TODAY);
    expect([inside.low, inside.high, inside.counted, inside.word]).toEqual([100, 160, 4, 'inside']);
    const above = movementBand(log([]), [...weeksOf([100, 120, 140, 160, 180, 200]), {id: 'x', date: TODAY, minutes: 300}], TODAY);
    expect([above.low, above.high, above.word]).toEqual([120, 180, 'above']);
  });
  test('a workout written into Health counts once, as a workout; one without counts its own length', () => {
    const w = log([workout('2026-11-17', 50, 'act-1'), workout('2026-11-18', 40)]);
    const d = movementDays(w, [{id: 'act-1', date: '2026-11-17', minutes: 50}, {id: 'act-2', date: '2026-11-17', minutes: 20}], '2026-11-16', '2026-11-22');
    expect(d.get('2026-11-17')).toMatchObject({workouts: 50, other: 20, minutes: 70});
    expect(d.get('2026-11-18')).toMatchObject({workouts: 40, other: 0});
  });
  test('weeks a status covered are left out; under three weeks there is no band yet', () => {
    const activity = weeksOf([100, 120, 140, 160, 180, 200]);
    const b = movementBand(log([]), activity, TODAY, [{from: '2026-10-05', to: '2026-11-01'}]);
    expect(b.weeks.filter(k => k.paused)).toHaveLength(4);
    expect([b.low, b.word]).toEqual([null, 'few']);
    expect(bandWords(b)).toContain('2 of those weeks can be counted so far');
    expect(movementBand(log([]), [], TODAY).word).toBe('few');
  });
  test('the words are facts: no calories, no rest orders', () => {
    for (const minutes of [[100, 120, 140, 160, 180, 200], [0, 0, 0, 0, 0, 0]]) {
      const words = bandWords(movementBand(log([]), [...weeksOf(minutes), {id: 'x', date: TODAY, minutes: 500}], TODAY));
      expect(words).not.toMatch(/kcal|calorie|must|should|rest day/i);
    }
  });
});
