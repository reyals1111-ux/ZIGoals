import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, planSkip, logHabitValue, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth} from '../health';
import {setPlanItem, emptyRemindersPlan} from '../reminders-plan/schema';
import {billsSchema} from '../bills/schema';
import {emptyWorkouts} from '../workouts/schema';
import {buildShowcase} from '../showcase-data';
import {emptyPlatform, PLATFORM_KEY, type Platform} from '../positions';
import {AGENDA_SOURCES, agendaRange, buildAgenda, compareItems, countBySource, shiftAnchor, sourcesWithRecords, weekStartOf, type AgendaInput} from './build';
import {AGENDA, agendaSchema, emptyAgenda, setAgendaView, setSourceShown} from './store';
import {showcaseAgendaExtras} from './showcase';
import {readDeviceRecord} from '../device-record';

const TODAY = '2026-11-04'; // a Wednesday
const ID = {daily: 'aaaaaaaa-0000-4000-8000-0000000000a1', mwf: 'aaaaaaaa-0000-4000-8000-0000000000a2', weekly3: 'aaaaaaaa-0000-4000-8000-0000000000a3', interval: 'aaaaaaaa-0000-4000-8000-0000000000a4', paused: 'aaaaaaaa-0000-4000-8000-0000000000a5'};
const habit = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
function habits(): HabitData {
  let d = emptyHabitData(); const made = new Date('2026-10-01T06:00:00Z');
  d = createHabit(d, habit('Fictional stretch', {timeOfDay: 'morning'}), made, ID.daily);
  d = createHabit(d, habit('Fictional swim', {schedule: {kind: 'weekdays', days: [1, 3, 5]}}), made, ID.mwf);
  d = createHabit(d, habit('Fictional run', {schedule: {kind: 'frequency', times: 3, period: 'week'}}), made, ID.weekly3);
  d = createHabit(d, habit('Fictional plants', {schedule: {kind: 'interval', every: 3, anchor: '2026-11-01'}}), made, ID.interval);
  return d;
}
const base = (over: Partial<AgendaInput> = {}): AgendaInput => ({today: TODAY, now: Date.parse(`${TODAY}T12:00:00Z`), zone: 'UTC', habits: habits(), ...over});
const ids = (input: AgendaInput, from: string, to: string) => buildAgenda(input, from, to).flatMap(d => d.items.map(i => i.id));

describe('agenda views', () => {
  it('a day, a Monday-to-Sunday week and a month of whole weeks', () => {
    expect(agendaRange('day', TODAY)).toMatchObject({from: TODAY, to: TODAY});
    expect(agendaRange('week', TODAY)).toMatchObject({from: '2026-11-02', to: '2026-11-08'});
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
    expect(agendaRange('month', TODAY)).toEqual({from: '2026-10-26', to: '2026-12-06', first: '2026-11-01', last: '2026-11-30'});
    expect(agendaRange('month', '2026-02-10')).toMatchObject({first: '2026-02-01', last: '2026-02-28'});
    expect(() => agendaRange('day', '2026-13-01x')).toThrow();
  });
  it('moves by a day, a week or a month, keeping a month day the next month has', () => {
    expect(shiftAnchor('day', '2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftAnchor('week', TODAY, -1)).toBe('2026-10-28');
    expect(shiftAnchor('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftAnchor('month', '2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftAnchor('month', '2026-12-05', 1)).toBe('2027-01-05');
  });
});

describe('the agenda from the person\'s own records (Session AK, F5d)', () => {
  it('habits fall on their scheduled days, with their time, done or skipped state', () => {
    let d = habits();
    d = logHabitValue(d, ID.daily, '2026-11-03', 1, {}, new Date('2026-11-03T08:00:00Z'));
    d = planSkip(d, ID.daily, '2026-11-06', 'Fictional trip', new Date('2026-11-04T08:00:00Z'));
    const week = buildAgenda(base({habits: d}), '2026-11-02', '2026-11-08');
    const day = (date: string) => week.find(x => x.date === date)!.items;
    expect(day('2026-11-02').map(i => i.title)).toEqual(['Fictional run', 'Fictional swim', 'Fictional stretch']);
    expect(day('2026-11-03').find(i => i.title === 'Fictional stretch')).toMatchObject({state: 'done', time: '08:00', href: `/app/habits#habit-${ID.daily}`});
    expect(day('2026-11-06').find(i => i.title === 'Fictional stretch')!.state).toBe('skipped');
    expect(week.filter(x => x.items.some(i => i.title === 'Fictional swim')).map(x => x.date)).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(week.filter(x => x.items.some(i => i.title === 'Fictional plants')).map(x => x.date)).toEqual(['2026-11-04', '2026-11-07']);
    // "3 times a week" has no fixed days: once, on the first day of its week in view.
    const run = week.flatMap(x => x.items).filter(i => i.title === 'Fictional run');
    expect(run).toHaveLength(1);
    expect(run[0]).toMatchObject({date: '2026-11-02', detail: '3 times this week, any day'});
    expect(buildAgenda(base(), TODAY, TODAY)[0]!.items.some(i => i.title === 'Fictional run')).toBe(true);
  });
  it('a habit\'s own time outranks its reminder, which outranks its part of the day', () => {
    const one = (over: Partial<AgendaInput>) => buildAgenda(base(over), TODAY, TODAY)[0]!.items.find(i => i.title === 'Fictional stretch')!.time;
    expect(one({})).toBe('08:00');
    expect(one({habitReminders: {[ID.daily]: {time: '07:15'}}})).toBe('07:15');
    expect(one({habitReminders: {[ID.daily]: {time: '07:15'}}, habitTimes: {[ID.daily]: '06:30'}})).toBe('06:30');
    expect(one({habitTimes: {[ID.daily]: 'nonsense'}})).toBe('08:00');
  });
  it('items without a time lead the day, then by time', () => {
    const items = buildAgenda(base(), TODAY, TODAY)[0]!.items;
    expect(items.map(i => i.time)).toEqual([...items].sort(compareItems).map(i => i.time));
    expect(items.at(-1)!.time).toBe('08:00');
  });
  it('planned contributions, bills (never a figure), meal plans, workouts, unbonding and reviews', () => {
    const platform = JSON.parse(buildShowcase('2026-11-01').records[PLATFORM_KEY]!) as Platform;
    const bills = billsSchema.parse({version: 1, dismissed: [], bills: [{id: 'bill-1', title: 'Fictional rent', amount: '950.00', currency: 'EUR', cadence: 'monthly', nextDue: '2026-10-05', origin: 'manual', cancelBy: '2026-11-20', cancelNote: 'Fictional', createdAt: '2026-10-01T00:00:00Z'}]});
    const health = createEmptyHealth();
    health.daily = {version: 1, favorites: [], savedMeals: [], water: [], waterOperations: [], copyOperations: [], preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg'}, groceryNotes: '',
      plans: [{id: 'plan-1', savedMealId: 'meal-1', name: 'Fictional soup', date: '2026-11-05', meal: 'Lunch', items: [{sourceId: 'f1', sourceKind: 'food', name: 'Soup', grams: 300}] as never, createdAt: '2026-11-01T00:00:00.000Z'}]};
    const workouts = {...emptyWorkouts(), workouts: [{id: 'w-1', name: 'Fictional legs', date: '2026-11-03', type: 'strength' as const, startedAt: '2026-11-03T18:00:00Z', endedAt: '2026-11-03T18:50:00Z', exercises: []}]};
    const plan = setPlanItem(setPlanItem(emptyRemindersPlan(), 'review', {on: true, time: '19:00'}), 'goal-checkin', {on: true, weekday: 5});
    const input = base({platform, bills, health, workouts, plan, weeklyReview: {weekday: 0, reviews: [{weekStart: '2026-11-02', completedAt: '2026-11-08T19:30:00.000Z'}]},
      plannedWorkouts: [{id: 'p1', date: '2026-11-06', title: 'Fictional upper body', time: '07:30'}], unbonding: [{id: 'u1', date: '2026-11-12', title: 'Fictional ZIG unbonding ends'}]});
    const month = buildAgenda(input, '2026-10-26', '2026-12-06'), all = month.flatMap(d => d.items);
    const by = (s: string) => all.filter(i => i.source === s);
    expect(by('contribution').length).toBeGreaterThan(0);
    expect(by('contribution').every(i => i.title.startsWith('Contribution · ') && i.href.startsWith('/app/goals/tracked/') && i.time === null)).toBe(true);
    expect(by('bill').map(i => [i.date, i.title])).toEqual([['2026-11-05', 'Fictional rent'], ['2026-11-20', 'Decide on Fictional rent'], ['2026-12-05', 'Fictional rent']]);
    expect(JSON.stringify(by('bill'))).not.toMatch(/950|€|EUR/);
    expect(by('bill').every(i => i.state === 'open')).toBe(true);
    expect(by('meal')).toEqual([expect.objectContaining({date: '2026-11-05', time: '12:30', title: 'Lunch: Fictional soup', state: 'open'})]);
    expect(by('workout').map(i => [i.date, i.time, i.state, i.minutes])).toEqual([['2026-11-03', '18:00', 'done', 50], ['2026-11-06', '07:30', 'open', 45]]);
    expect(by('unbonding')).toEqual([expect.objectContaining({date: '2026-11-12', href: '/app/staking', state: 'open'})]);
    const reviews = by('review').filter(i => i.title === 'Weekly review');
    expect(reviews.map(i => i.date)).toEqual(['2026-11-01', '2026-11-08', '2026-11-15', '2026-11-22', '2026-11-29', '2026-12-06']);
    expect(reviews.find(i => i.date === '2026-11-08')!.state).toBe('done');
    expect(reviews[0]!.time).toBe('19:00');
    expect(by('review').filter(i => i.title === 'Goal check-in').every(i => i.date.length === 10 && new Date(`${i.date}T12:00:00Z`).getUTCDay() === 5)).toBe(true);
    const counts = countBySource(month);
    expect(Object.keys(counts)).toEqual([...AGENDA_SOURCES]);
    expect(counts.bill).toBe(3);
    expect(sourcesWithRecords(input)).toEqual(new Set(AGENDA_SOURCES));
  });
  it('hidden sources are left out; an empty start has no sources; a plan that cannot be read is left out', () => {
    expect(ids(base({hidden: ['habit']}), '2026-11-02', '2026-11-08')).toEqual([]);
    expect(sourcesWithRecords({today: TODAY, now: 0})).toEqual(new Set());
    expect(buildAgenda({today: TODAY, now: 0}, TODAY, TODAY)).toEqual([{date: TODAY, items: []}]);
    const broken = emptyPlatform();
    broken.goals = [{id: '1', name: 'Fictional broken', network: 'zigchain-1', type: 'VALUE', status: 'active', asset: 'USD', denom: 'usd', decimals: 2, target: '100', notes: '', createdAt: '2026-01-01T00:00:00.000Z', milestones: [], plan: {amount: '10', asset: 'ZIG', decimals: 6, cadence: 'weekly', nextDate: '2026-11-01', active: true}}] as Platform['goals'];
    expect(() => buildAgenda(base({platform: broken, habits: null}), '2026-11-02', '2026-11-08')).not.toThrow();
  });
  it('bounds: at most 62 days; a backwards or unreal range is refused', () => {
    expect(buildAgenda(base(), '2026-01-01', '2026-12-31')).toHaveLength(62);
    expect(() => buildAgenda(base(), '2026-11-08', '2026-11-02')).toThrow();
    expect(() => buildAgenda(base(), 'x', '2026-11-02')).toThrow();
  });
  it('ids are stable and unique within a range', () => {
    const a = ids(base(), '2026-10-26', '2026-12-06');
    expect(new Set(a).size).toBe(a.length);
    expect(ids(base(), '2026-10-26', '2026-12-06')).toEqual(a);
  });
});

describe('the agenda record and the Showcase extras', () => {
  it('keeps the view and the hidden sources; a strange record reads as empty', () => {
    let r = setAgendaView(emptyAgenda(), 'month');
    expect(setAgendaView(r, 'month')).toBe(r);
    r = setSourceShown(setSourceShown(r, 'bill', false), 'habit', false);
    expect(r.hidden).toEqual(['habit', 'bill']);
    r = setSourceShown(r, 'habit', true);
    expect(r).toEqual({version: 1, view: 'month', hidden: ['bill']});
    expect(agendaSchema.safeParse({version: 1, hidden: ['bill', 'bill']}).success).toBe(false);
    expect(agendaSchema.safeParse({version: 1, view: 'year'}).success).toBe(false);
    const store = {getItem: () => '{"version":2}'};
    expect(readDeviceRecord(store, AGENDA)).toEqual({data: emptyAgenda(), unreadable: true});
  });
  it('the Showcase extras are labelled examples on fixed days', () => {
    const x = showcaseAgendaExtras(TODAY);
    expect([...x.plannedWorkouts, ...x.unbonding].every(i => i.example && i.title.startsWith('Example · '))).toBe(true);
    const items = buildAgenda(base({...x, habits: null}), TODAY, '2026-11-20').flatMap(d => d.items);
    expect(items.map(i => [i.date, i.source, i.example])).toEqual([['2026-11-05', 'workout', true], ['2026-11-07', 'workout', true], ['2026-11-13', 'unbonding', true]]);
  });
});
