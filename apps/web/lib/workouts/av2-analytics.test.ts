import {describe, expect, test} from 'vitest';
import {exerciseSeries, monthFigures, muscleWeeks, nextMonth, previousMonth, trainingYear} from './analytics';
import {categoryLookup} from './depth';
import {exerciseHistory} from './engine';
import {EXERCISES} from './library';
import {workoutsSchema} from './schema';
import {buildWrapped} from '../wrapped/build';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import {createEmptyHealth} from '../health';
import {emptyPlatform} from '../positions';
import {addLocalDays} from '../local-date';

/** Session AV lane 2 (body; LEDGER #117, Hevy's progress analytics): from the person's own sets, warm-ups left out. */
const set = (id: string, kg: number, reps: number, kind = 'normal') => ({id, kind, weightKg: kg, reps, done: true});
const bench = (id: string, date: string, kg: number, reps: number) => ({id, name: 'Push', date, type: 'strength', startedAt: `${date}T08:00:00.000Z`, endedAt: `${date}T08:50:00.000Z`,
  exercises: [{id: `${id}-e`, exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [set(`${id}-w`, 40, 10, 'warmup'), set(`${id}-a`, kg, reps), set(`${id}-b`, kg, reps)]},
    {id: `${id}-s`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [set(`${id}-c`, 80, 5)]}]});
const run = (id: string, date: string, km: number) => ({id, name: 'Run', date, type: 'cardio', startedAt: `${date}T18:00:00.000Z`, endedAt: `${date}T18:30:00.000Z`, exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds: 1800, done: true}]}]});
const w = workoutsSchema.parse({version: 1, templates: [], exercises: [], restSeconds: 90, workouts: [bench('a', '2026-10-05', 60, 8), bench('b', '2026-11-02', 62.5, 8), bench('c', '2026-11-16', 65, 6), run('r', '2026-11-18', 10)]});
const lookup = categoryLookup(EXERCISES), TODAY = '2026-11-20';

describe('analytics', () => {
  test('sets per muscle group by week: Monday first, oldest first, warm-ups left out', () => {
    const m = muscleWeeks(w, lookup, TODAY);
    expect(m.weeks).toHaveLength(8);
    expect(m.weeks.at(-1)).toBe('2026-11-16');
    expect(m.rows.find(r => r.muscle === 'Chest')).toMatchObject({sets: [0, 2, 0, 0, 0, 2, 0, 2], total: 6});
    expect(m.rows.find(r => r.muscle === 'Legs')!.total).toBe(3);
  });
  test('a month beside the month before; new bests counted against every earlier workout', () => {
    const nov = monthFigures(w, '2026-11', lookup, TODAY), oct = monthFigures(w, '2026-10', lookup, TODAY);
    expect(nov).toMatchObject({workouts: 3, days: 3, sets: 7, volumeKg: 2*62.5*8 + 80*5 + 2*65*6 + 80*5, distanceKm: 10, topMuscle: 'Chest', topExercise: 'Bench press'});
    expect(nov.bests).toBe(3); // Nov 2: heavier and a higher estimate than Oct 5; Nov 16: heavier again (its estimate is lower)
    expect(oct).toMatchObject({workouts: 1, bests: 0});
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(nextMonth('2026-12')).toBe('2027-01');
  });
  test('a series per exercise: estimated one-rep max, heaviest set, volume', () => {
    const h = exerciseHistory(w, 'bench-press')!;
    expect(exerciseSeries(h, 'heaviest').map(p => p.v)).toEqual([60, 62.5, 65]);
    expect(exerciseSeries(h, 'volume').map(p => p.v)).toEqual([960, 1000, 780]);
    expect(exerciseSeries(h, 'e1rm').map(p => p.v)).toEqual([76, 79.2, 78]);
  });
  test('the year in training, and its Wrapped card (counts as lines, weight and distance as numbers)', () => {
    expect(trainingYear(w, '2026-01-01', '2026-12-31')).toMatchObject({workouts: 4, days: 4, hours: 3, topExercise: 'Bench press', bestMonth: '2026-11', distanceKm: 10});
    const today = '2026-12-03';
    let habits = createHabit(emptyHabitData(), {title: 'Fictional stretch', category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, new Date('2026-01-01T06:00:00Z'), 'ffffffff-0000-4000-8000-0000000000f1');
    for (let i = 0; i < 5; i++) habits = logHabitValue(habits, 'ffffffff-0000-4000-8000-0000000000f1', addLocalDays(today, -i), 1, {}, new Date(`${today}T08:00:00Z`));
    const make = (workouts: typeof w | null) => buildWrapped({year: 2026, today, records: {habits, health: createEmptyHealth(), platform: emptyPlatform(), today}, review: null, focus: null, workouts});
    expect(make(null).cards.map(c => c.id)).not.toContain('training');
    const card = make(w).cards.find(c => c.id === 'training')!;
    expect(card).toMatchObject({pillar: 'health', title: '4 workouts', big: '4', lines: ['3 hours on 4 days.', 'Done most often: Bench press.', 'Busiest month: Nov 2026.', '3 new personal bests.'], numbers: [`Weight lifted: ${(960 + 400 + 1000 + 400 + 780 + 400).toLocaleString('en-US')} kg`, 'Distance: 10 km']});
  });
});
