import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {PLATFORM_KEY, platformSchema, type Platform} from '../positions';
import {nextStep} from '../today/goal-roles';
import {createHabit, emptyHabitData, logHabitCount, setHabitState, type HabitInput} from '../habits';
import {earliestHabitChange, earliestHabitEdit, keepsToday, scheduleHabitEdit, scheduleHabitState} from '../habit-actions';
import {habitLifecycleRows} from '../habit-lifecycle';
import {getCounterActivities} from '../health-counter-activities';
import {changeCount} from '../health-counters';
import {createEmptyHealth} from '../health';
import {wealthOverview} from '../wealth';
import {assetCounts} from '../numbers/counts';
import {newOwnUnitPosition} from '../goals/goal-units';
import {greetingWords} from '../zigi-personality';
import {dismissMeal, mealsDue, setMealReminders} from '../meal-reminders';
import {healthExtrasSchema, setMealPref} from '../health-extras';
import {FAVOURITES_MAX, addMore, allFavourites, reinsertMore, removeMore, watchlistMoreSchema, WATCHLIST_MORE_KEY} from '../markets-watchlist-more';
import {readDeviceRecord} from '../device-record';
import {WATCHLIST_MORE} from '../markets-watchlist-more';

/** Session AL sweep 3 (lane SW3): requests the fourth passes sent to other lanes. Fictional data only. */
const ID = '33333333-3333-4333-8333-333333333333';
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Fictional water', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'count', unit: 'times'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});

describe('DV-057b: a count goal of your own unit is not asked for a contribution plan', () => {
  const summary = {key: 'private:1', requiresReview: false, fundingHealth: 'NO_PLAN', nextContributionDate: null, targetDate: null} as unknown as Parameters<typeof nextStep>[0];
  const base = {id: '1', name: 'Read books', status: 'active', pinned: false, plan: undefined, milestones: [], targetDate: undefined};
  test('a books goal asks for a plan of books; a savings goal keeps its contribution plan', () => {
    expect(nextStep(summary, {...base, type: 'QUANTITY', asset: 'books', denom: 'manual:books'} as never, '2026-11-05')).toEqual({kind: 'plan', unit: 'books'});
    expect(nextStep(summary, {...base, type: 'VALUE', asset: 'USD', denom: 'USD'} as never, '2026-11-05')).toEqual({kind: 'plan'});
    expect(nextStep(summary, {...base, type: 'QUANTITY', asset: 'BTC', denom: 'bitcoin'} as never, '2026-11-05')).toEqual({kind: 'plan'});
  });
});

describe('DV-169/DV-206: archiving a habit always leaves its "Habit archived" row', () => {
  test('archived the day it was made (no check-in): the first rule is read as a change from active', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-05T08:00:00Z'), ID);
    d = setHabitState(d, ID, 'archived', new Date('2026-11-05T09:00:00Z'));
    expect(d.habits[0]!.rules).toHaveLength(1);
    expect(habitLifecycleRows(d.habits).map(r => r.title)).toEqual(['Habit archived']);
  });
  test('archived after today\'s check-in (from tomorrow): the row sits at the moment it was done, and says from when', () => {
    const now = new Date('2026-11-05T15:02:00Z');
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-05T08:00:00Z'), ID);
    const today = d.habits[0]!.startDate;
    d = logHabitCount(d, ID, today, 1, '', now);
    const from = earliestHabitChange(d.habits[0]!, today, {allowToday: true});
    d = scheduleHabitState(d, ID, 'archived', from, now);
    const rows = habitLifecycleRows(d.habits);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({title: 'Habit archived', at: now.toISOString()});
    expect(rows[0]!.day).toBeUndefined();
    expect(rows[0]!.detail).toMatch(/· from /);
  });
  test('archive then Undo the same day leaves no row (the habit is active as before)', () => {
    const now = new Date('2026-11-05T15:02:00Z');
    let d = createHabit(emptyHabitData(), input(), new Date('2026-10-01T08:00:00Z'), ID);
    d = scheduleHabitState(d, ID, 'archived', '2026-11-05', now);
    d = scheduleHabitState(d, ID, 'active', '2026-11-05', now);
    expect(habitLifecycleRows(d.habits)).toEqual([]);
  });
});

describe('D-044: a rule change may begin today, when it keeps today\'s record as it is', () => {
  const now = new Date('2026-11-05T15:00:00');
  const made = () => { let d = createHabit(emptyHabitData(), input(), new Date('2026-10-01T08:00:00'), ID); d = logHabitCount(d, ID, '2026-11-05', 1, '', now); return d; };
  test('a schedule change that keeps today scheduled, with the same type, unit and target, starts today', () => {
    const d = made(), weekdays = input({schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}); // 5 Nov 2026 is a Thursday
    expect(earliestHabitEdit(d.habits[0]!, weekdays, '2026-11-05')).toBe('2026-11-05');
    const next = scheduleHabitEdit(d, ID, weekdays, '2026-11-05', now);
    expect(next.habits[0]!.rules.at(-1)).toMatchObject({from: '2026-11-05', schedule: {kind: 'weekdays'}});
  });
  test('a new target, or a schedule that leaves today out, still begins tomorrow', () => {
    const d = made();
    expect(earliestHabitEdit(d.habits[0]!, input({target: 2}), '2026-11-05')).toBe('2026-11-06');
    expect(earliestHabitEdit(d.habits[0]!, input({schedule: {kind: 'weekdays', days: [1]}}), '2026-11-05')).toBe('2026-11-06');
    expect(() => scheduleHabitEdit(d, ID, input({target: 2}), '2026-11-05', now)).toThrow(/keeps today/);
  });
  test('keepsToday never allows a paused or archived rule', () => {
    const d = made(), rule = {...d.habits[0]!.rules[0]!, state: 'paused' as const};
    expect(keepsToday(d.habits[0]!, rule, '2026-11-05')).toBe(false);
  });
});

describe('DV-047c: a quick-counter day is an Activity row under Health', () => {
  test('"Increase Push-ups" gives a row with its count and day; no counters, no rows', () => {
    const health = createEmptyHealth();
    expect(getCounterActivities(health)).toEqual([]);
    const tapped = changeCount(changeCount(health, 'health_counter-pushups', '2026-11-05', 1), 'health_counter-pushups', '2026-11-05', 1);
    const rows = getCounterActivities(tapped);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({category: 'HEALTH', title: 'Push-ups', day: '2026-11-05'});
    expect(rows[0]!.detail).toMatch(/^2 counted · /);
  });
});

describe('DV-147: a count goal\'s own tally is not wealth', () => {
  test('left out of the Wealth rows and the asset counts', () => {
    const p = platformSchema.parse(JSON.parse(buildShowcase('2026-11-05', 'UTC').records[PLATFORM_KEY]!)) as Platform;
    const goal = {...p.goals[0]!, id: '777', name: 'Read 40 pages', type: 'QUANTITY' as const, asset: 'pages', denom: 'manual:pages', decimals: 0};
    const tally = {...newOwnUnitPosition(goal, '7f0c2d6e-0000-4000-8000-000000000777'), quantity: '40'};
    const before = wealthOverview(p).rows.length, counted = assetCounts(p).assets;
    const withTally = {...p, goals: [...p.goals, goal], positions: [...p.positions, tally]} as Platform;
    expect(wealthOverview(withTally).rows.length).toBe(before);
    expect(wealthOverview(withTally).rows.some(r => r.position.id === tally.id)).toBe(false);
    expect(assetCounts(withTally).assets).toBe(counted);
    // Without its goal it is an ordinary asset you track.
    expect(assetCounts({positions: [...p.positions, tally]}).assets).toBe(counted + 1);
  });
});

describe('NB-006: ZIGi greets by the name from setup', () => {
  test('with a name, by it; without one, as before; never on a private screen', () => {
    expect(greetingWords('calm', 'local', 'Sam')).toBe('Hi Sam, I’m ZIGi. Ask about your records: I answer right here, privately, on this device.');
    expect(greetingWords('direct', 'connected', 'Sam')).toMatch(/^ZIGi here, Sam\./);
    expect(greetingWords('calm', 'connected')).toBe('Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.');
    expect(greetingWords('cheerful', 'private', 'Sam')).not.toContain('Sam');
  });
});

describe('C-MO-10/C-MO-37: a reminder at a meal\'s usual time', () => {
  const lunchAt = (time: string) => { const r = setMealPref({version: 1}, 'Lunch', {name: '', time}); if (!r.ok) throw Error('fixture'); return r.value; };
  const health = createEmptyHealth();
  test('off by default; on, it shows once the time has passed, until dismissed for the day', () => {
    const extras = lunchAt('12:30'), at = new Date();
    at.setHours(13, 0, 0, 0);
    expect(mealsDue({extras, health, now: at})).toEqual([]);
    const on = setMealReminders(extras, true);
    const due = mealsDue({extras: on, health, now: at});
    expect(due.map(m => [m.meal, m.time])).toEqual([['Lunch', '12:30']]);
    const early = new Date(at); early.setHours(12, 0, 0, 0);
    expect(mealsDue({extras: on, health, now: early})).toEqual([]);
    expect(mealsDue({extras: dismissMeal(on, 'Lunch', due[0]!.day), health, now: at})).toEqual([]);
    expect(setMealReminders(on, false).mealReminders).toBeUndefined();
  });
  test('the record stays loose: an unreadable reminder part is dropped on its own, the meals kept', () => {
    const read = healthExtrasSchema.parse({version: 1, meals: {Lunch: {time: '12:30'}}, mealReminders: 'garbled'});
    expect(read.meals?.Lunch?.time).toBe('12:30');
    expect(read.mealReminders).toBeUndefined();
  });
});

describe('C-TK-20: favourites past the synced 8, on this device', () => {
  const fav = (id: string) => ({ref: {provider: 'coingecko' as const, kind: 'coin' as const, id}, name: id, symbol: id.slice(0, 3)});
  const synced = Array.from({length: 8}, (_, i) => fav(`coin-${i}`));
  test('added after the 8, listed after them, removed and put back in place', () => {
    let more = watchlistMoreSchema.parse({version: 1, items: []});
    more = addMore(more, synced, fav('extra-a'));
    more = addMore(more, synced, fav('extra-b'));
    expect(addMore(more, synced, fav('coin-1'))).toBe(more); // already synced
    expect(allFavourites(synced, more.items).map(f => f.name).slice(-2)).toEqual(['extra-a', 'extra-b']);
    const removed = removeMore(more, 'coingecko:coin:extra-a');
    expect(removed.items.map(f => f.name)).toEqual(['extra-b']);
    expect(reinsertMore(removed, fav('extra-a'), 0).items.map(f => f.name)).toEqual(['extra-a', 'extra-b']);
    expect(FAVOURITES_MAX).toBe(50);
  });
  test('a tolerant read: one bad item is dropped, not the list; a duplicate is kept once', () => {
    const raw = JSON.stringify({version: 1, items: [fav('extra-a'), {ref: 'broken'}, fav('extra-a'), fav('extra-c')], later: true});
    const read = readDeviceRecord({getItem: k => k === WATCHLIST_MORE_KEY ? raw : null}, WATCHLIST_MORE);
    expect(read.unreadable).toBe(false);
    expect(read.data.items.map(f => f.name)).toEqual(['extra-a', 'extra-c']);
  });
});
