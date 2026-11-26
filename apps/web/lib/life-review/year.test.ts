import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {emptyPlatform, privateGoalSchema, type Platform} from '../positions';
import {earliestRecord, habitYear, recordYears, yearReport, yearWindow} from './year';

/** Session AW (X4, LEDGER #446): the year's (and all time's) report — done of due, longest runs, goals start → end, by area. */
const TODAY = '2026-11-25';
const at = (d: string) => new Date(`${d}T10:00:00`);
const A = '00000000-0000-4000-8000-0000000000a1', B = '00000000-0000-4000-8000-0000000000b2';
function habits(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, {title: 'Walk', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, at('2026-11-01'), A);
  d = createHabit(d, {title: 'Read', category: 'Mind', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, at('2026-11-20'), B);
  // Walk: 1–5 November done (a run of five), the 6th missed, 7–9 done; Read: the 21st and 22nd done.
  for (let i = 0; i < 9; i++) if (i !== 5) d = logHabitValue(d, A, addLocalDays('2026-11-01', i), 1, {}, at(TODAY));
  for (const x of ['2026-11-21', '2026-11-22']) d = logHabitValue(d, B, x, 1, {}, at(TODAY));
  return habitDataSchema.parse(JSON.parse(JSON.stringify(d)));
}
const goal = (id: string, name: string, createdAt: string) => privateGoalSchema.parse({id, name, type: 'PROJECT', status: 'active', asset: 'milestones', denom: 'milestones', decimals: 0, target: '4', notes: '', createdAt, milestones: [{id: 'a', title: 'One', done: true}, {id: 'b', title: 'Two', done: true}, {id: 'c', title: 'Three', done: false}, {id: 'd', title: 'Four', done: false}]});
function platform(): Platform {
  const p: Platform = {...emptyPlatform(), goals: [goal('1', 'Studio', '2025-03-01T10:00:00.000Z'), goal('2', 'Garden', '2026-06-01T10:00:00.000Z')]};
  p.goalHistory = [{id: 'h1', goalId: '1', kind: 'valuation', capturedAt: '2025-12-20T10:00:00.000Z', current: '1', target: '4', asset: 'milestones', decimals: 0, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: []}];
  return p;
}
const AREAS = [{id: 'health', label: 'Health'}, {id: 'mind', label: 'Habits & Mind'}, {id: 'career', label: 'Career'}];

describe('the window', () => {
  test('a year runs from 1 January to today (or 31 December); all time from the first record', () => {
    expect(yearWindow({kind: 'year', year: 2026}, TODAY, '2025-03-01')).toMatchObject({start: '2026-01-01', end: TODAY, key: 'year:2026'});
    expect(yearWindow({kind: 'year', year: 2025}, TODAY, '2025-03-01')).toMatchObject({start: '2025-01-01', end: '2025-12-31'});
    expect(yearWindow({kind: 'all'}, TODAY, '2025-03-01')).toMatchObject({start: '2025-03-01', end: TODAY, key: 'all'});
    expect(earliestRecord(habits().habits, platform().goals)).toBe('2025-03-01');
    expect(recordYears('2025-03-01', TODAY)).toEqual([2026, 2025]);
    expect(recordYears(null, TODAY)).toEqual([2026]);
  });
});

describe('a habit over the year', () => {
  test('done of due, and the longest run of done days', () => {
    const w = yearWindow({kind: 'year', year: 2026}, TODAY, null), walk = habitYear(habits().habits[0]!, w, TODAY)!;
    expect(walk).toMatchObject({title: 'Walk', done: 8, longest: 5, unit: 'days'});
    // 1–24 November are due and past; today is open and still counts as due (as the Life review's other figures).
    expect(walk.due).toBe(25);
  });
  test('a habit that began after the window is left out', () => {
    expect(habitYear(habits().habits[1]!, yearWindow({kind: 'year', year: 2025}, TODAY, null), TODAY)).toBeNull();
  });
});

describe('the report', () => {
  test('groups habits and goals by life area; a goal made inside the period is "new", one with no snapshot "not recorded"', () => {
    const report = yearReport({window: yearWindow({kind: 'year', year: 2026}, TODAY, '2025-03-01'), habits: habits().habits, platform: platform(), today: TODAY, habitAreas: {[A]: 'health', [B]: 'mind'}, goalAreas: {'private:1': 'career'}, areas: AREAS});
    expect(report.areas.map(a => [a.label, a.habits.map(h => h.title), a.goals.map(g => g.name)])).toEqual([['Health', ['Walk'], []], ['Habits & Mind', ['Read'], []], ['Career', [], ['Studio']], ['No area yet', [], ['Garden']]]);
    const studio = report.goals.find(g => g.name === 'Studio')!, garden = report.goals.find(g => g.name === 'Garden')!;
    expect([studio.start, studio.end]).toEqual([25, 50]);
    expect(garden.start).toBe('new');
    expect(report.totals).toEqual({done: 10, due: report.habits.reduce((n, h) => n + h.due, 0)});
    // Last year: the studio's last snapshot (1 of 4), nothing before it was made; the garden did not exist yet.
    const last = yearReport({window: yearWindow({kind: 'year', year: 2025}, TODAY, '2025-03-01'), habits: habits().habits, platform: platform(), today: TODAY, habitAreas: {}, goalAreas: {}, areas: AREAS});
    expect(last.goals.map(g => [g.name, g.start, g.end])).toEqual([['Studio', 'new', 25]]);
    expect(last.habits).toEqual([]);
  });
  test('nothing recorded: no areas, no zero rows', () => {
    const empty = yearReport({window: yearWindow({kind: 'all'}, TODAY, null), habits: [], platform: emptyPlatform(), today: TODAY, habitAreas: {}, goalAreas: {}, areas: AREAS});
    expect(empty.areas).toEqual([]);
    expect(empty.totals).toEqual({done: 0, due: 0});
  });
});
