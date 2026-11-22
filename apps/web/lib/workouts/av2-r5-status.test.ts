import {describe, expect, test} from 'vitest';
import {weekStreak} from './calendar';
import {emptyPlanned, missedThisWeek, planStates, planWorkout, realign, type PlannedRecord} from './planned';
import {LOAD_WORDS, trainingLoad} from './runs';
import {emptyWorkouts, type Workout, type Workouts} from './schema';
import {clearStatus, currentStatus, lastEnded, pausesOf, setStatus, withStatuses} from './status';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #374, Gentler Streak's activity status): a status from a day until cleared sets
 * the planned workouts aside (never missed), passes over the week streak and changes the training load's words.
 */
const TODAY = '2026-11-20', AT = '2026-11-20T08:00:00.000Z';
const workout = (date: string, minutes = 40): Workout => ({id: `w-${date}`, name: 'Push day', date, type: 'strength', startedAt: `${date}T07:00:00.000Z`, endedAt: new Date(Date.parse(`${date}T07:00:00.000Z`) + minutes * 60_000).toISOString(), exercises: []} as Workout);
const log = (...dates: string[]): Workouts => ({...emptyWorkouts(), workouts: dates.map(d => workout(d))});
const set = (r: PlannedRecord, kind: 'ill' | 'injured' | 'break' | 'travel', from: string, today = TODAY, id = `st-${kind}-${from}`) => setStatus(r, {kind, from, today, id, now: AT});
const plan = (r: PlannedRecord, date: string, name = 'Easy run') => { const out = planWorkout(r, {kind: 'other', name, date, time: ''}, `p-${date}-${name.length}`, AT); if (!out.ok) throw Error(out.issue.message); return out.value; };

describe('setting and clearing a status', () => {
  test('a status runs from its day until cleared; clearing ends it yesterday', () => {
    const r = set(emptyPlanned(), 'injured', '2026-11-16');
    expect(currentStatus(r, TODAY)).toMatchObject({kind: 'injured', from: '2026-11-16'});
    expect(pausesOf(r, TODAY)).toEqual([{from: '2026-11-16', to: TODAY}]);
    const cleared = clearStatus(r, TODAY);
    expect(currentStatus(cleared, TODAY)).toBeNull();
    expect(cleared.statuses![0]!.to).toBe('2026-11-19');
    expect(lastEnded(cleared, TODAY)).toMatchObject({kind: 'injured'});
    expect(lastEnded(cleared, '2027-01-01')).toBeNull();
  });
  test('cleared on its first day it keeps that day; Undo puts the statuses back', () => {
    const r = set(emptyPlanned(), 'ill', TODAY), cleared = clearStatus(r, TODAY);
    expect(cleared.statuses![0]!.to).toBe(TODAY);
    expect(withStatuses(cleared, r.statuses)).toEqual(r);
    expect(withStatuses(r, undefined).statuses).toBeUndefined();
  });
  test('another status ends the open one the day before; the same status takes the new day', () => {
    const r = set(set(emptyPlanned(), 'ill', '2026-11-10'), 'break', '2026-11-15');
    expect(r.statuses!.map(s => [s.kind, s.from, s.to])).toEqual([['ill', '2026-11-10', '2026-11-14'], ['break', '2026-11-15', undefined]]);
    expect(set(r, 'break', '2026-11-12').statuses!.at(-1)).toMatchObject({kind: 'break', from: '2026-11-12'});
  });
  test('a day in the future or over a year back is refused', () => {
    expect(() => set(emptyPlanned(), 'ill', '2026-11-21')).toThrow('Choose today or a day before.');
    expect(() => set(emptyPlanned(), 'ill', '2025-01-01')).toThrow('Choose a day in the last year.');
  });
});

describe('what a status changes', () => {
  test('planned workouts in its days are set aside, never missed, and are not moved on', () => {
    let r = plan(plan(emptyPlanned(), '2026-11-17'), '2026-11-22', 'Leg day');
    expect(missedThisWeek(r, null, TODAY)).toHaveLength(1);
    r = set(r, 'ill', '2026-11-16');
    const states = planStates(r, null, TODAY);
    expect([...states.values()]).toEqual(['aside', 'aside']);
    expect(missedThisWeek(r, null, TODAY)).toEqual([]);
    expect(realign(r, null, TODAY).moved).toBe(0);
    // Once cleared, a later planned workout counts again; the ones in its days stay set aside.
    const back = clearStatus(r, TODAY);
    expect([...planStates(back, null, TODAY).values()]).toEqual(['aside', 'planned']);
  });
  test('its weeks pass over the streak; without a status the streak is as before', () => {
    // Workouts in the weeks of Oct 19 and Oct 26, none in Nov 2 and Nov 9, one this week (Nov 16).
    const w = log('2026-10-20', '2026-10-27', '2026-11-18');
    expect(weekStreak(w, TODAY)).toEqual({current: 1, best: 2, thisWeek: true});
    const r = clearStatus(set(emptyPlanned(), 'injured', '2026-11-03', '2026-11-12'), '2026-11-12');
    expect(weekStreak(w, TODAY, pausesOf(r, TODAY))).toEqual({current: 3, best: 3, thisWeek: true});
  });
  test('the training load: not compared while set, "back after a break" after, as before without', () => {
    const w = log('2026-10-20', '2026-10-27', '2026-11-03', '2026-11-18');
    expect(trainingLoad(w, TODAY).words).not.toBe('paused');
    const open = set(emptyPlanned(), 'break', '2026-11-10');
    expect(trainingLoad(w, TODAY, 'minutes', pausesOf(open, TODAY)).words).toBe('paused');
    const cleared = clearStatus(open, '2026-11-17');
    expect(trainingLoad(w, TODAY, 'minutes', pausesOf(cleared, TODAY)).words).toBe('after-break');
    expect(LOAD_WORDS['after-break']).toMatch(/^Back after a break/);
    expect(trainingLoad(w, '2026-12-30', 'minutes', pausesOf(cleared, '2026-12-30')).words).not.toBe('after-break');
  });
});
