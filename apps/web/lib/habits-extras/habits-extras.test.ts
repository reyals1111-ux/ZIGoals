import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitValue, setHabitEntryStatus, type HabitData, type HabitInput} from '../habits';
import {habitExtrasSchema, emptyHabitExtras, HABIT_EXTRAS} from './schema';
import {habitArea, habitQuitCost, habitsByArea, setHabitArea, setQuitCost, setSectionFold, setTimerBell} from './store';
import {DEFAULT_AREA_IDS, readLifeAreas} from './areas-mirror';
import {currentSection, groupByTimeOfDay, openSection} from './sections';
import {quitSummary, slipMonth} from './quit';
import {habitYear, monthStarts, overviewYear, yearWeeks} from './year';
import {readDeviceRecord} from '../device-record';

const AT = new Date('2026-09-01T06:00:00.000Z');
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
const ID = {a: '11111111-1111-4111-8111-111111111111', b: '22222222-2222-4222-8222-222222222222', q: '33333333-3333-4333-8333-333333333333'};
function journal(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, input('Stretch', {timeOfDay: 'morning'}), AT, ID.a);
  d = createHabit(d, input('Read', {timeOfDay: 'evening', measurement: {kind: 'duration', unit: 'minutes'}, target: 20}), AT, ID.b);
  d = createHabit(d, input('No late snacks', {type: 'quit', target: 0, measurement: {kind: 'count', unit: 'times'}}), AT, ID.q);
  return d;
}
const memory = (): Storage => { const m = new Map<string, string>(); return {get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, clear: () => m.clear()}; };

describe('habit extras (device-only, loose)', () => {
  test('areas, quit cost and bells are set per habit, read back, and pruned to the journal', () => {
    let r = emptyHabitExtras();
    r = setHabitArea(r, ID.a, 'health'); r = setHabitArea(r, ID.b, 'learning'); r = setQuitCost(r, ID.q, {perDay: 3.5, currency: 'EUR'}); r = setTimerBell(r, ID.b, true);
    expect(habitArea(r, ID.a)).toBe('health'); expect(habitQuitCost(r, ID.q)).toEqual({perDay: 3.5, currency: 'EUR'}); expect(habitsByArea([ID.a, ID.b, ID.q], r)).toEqual({health: [ID.a], learning: [ID.b]});
    r = setHabitArea(r, ID.a, null, new Set([ID.q])); // keep only q: b's area goes with it
    expect(r.areas).toBeUndefined(); expect(habitQuitCost(r, ID.q)).not.toBeNull();
    r = setTimerBell(r, ID.b, false); expect(r.bells).toBeUndefined();
    r = setSectionFold(r, 'evening', true); expect(r.folds).toEqual({evening: true});
  });
  test('a later build\'s fields survive a read, unknown bytes read as empty, the schema refuses a bad currency', () => {
    const s = memory();
    s.setItem(HABIT_EXTRAS.key, JSON.stringify({version: 1, areas: {[ID.a]: 'fun'}, later: {x: 1}}));
    const read = readDeviceRecord(s, HABIT_EXTRAS);
    expect(read.unreadable).toBe(false); expect((read.data as Record<string, unknown>).later).toEqual({x: 1});
    s.setItem(HABIT_EXTRAS.key, 'not json'); expect(readDeviceRecord(s, HABIT_EXTRAS)).toEqual({data: emptyHabitExtras(), unreadable: true});
    expect(habitExtrasSchema.safeParse({version: 1, quitCost: {[ID.q]: {perDay: 1, currency: 'GBP'}}}).success).toBe(false);
  });
});
describe('life areas mirror (AA-Cloud\'s ids, read-only)', () => {
  test('the seven default ids, the person\'s custom areas joined, unreadable bytes read as the defaults', () => {
    const s = memory();
    expect(readLifeAreas(s).map(a => a.id)).toEqual([...DEFAULT_AREA_IDS]);
    s.setItem('zigoals:goal-extras:v1', JSON.stringify({version: 1, goals: {}, areas: [{id: 'custom-garden', label: 'Garden', color: '#aabbcc'}, {id: 'health', label: 'dup', color: '#000000'}]}));
    const areas = readLifeAreas(s); expect(areas.at(-1)).toEqual({id: 'custom-garden', label: 'Garden', color: '#aabbcc', custom: true}); expect(areas.filter(a => a.id === 'health')).toHaveLength(1);
    s.setItem('zigoals:goal-extras:v1', '{'); expect(readLifeAreas(s)).toHaveLength(7);
    expect(readLifeAreas(null)).toHaveLength(7);
  });
});
describe('time-of-day sections (H1)', () => {
  test('groups by the rule\'s time of day, counts due and done, opens the clock\'s section when it has habits', () => {
    let d = journal(); d = logHabitValue(d, ID.a, '2026-09-10', 1, {mode: 'set'}, new Date('2026-09-10T07:00:00Z'));
    const sections = groupByTimeOfDay(d.habits, '2026-09-10');
    expect(sections.map(s => [s.id, s.habits.length, s.due, s.done])).toEqual([['morning', 1, 1, 1], ['afternoon', 0, 0, 0], ['evening', 1, 1, 0], ['anytime', 1, 1, 0]]);
    expect(currentSection(7)).toBe('morning'); expect(currentSection(13)).toBe('afternoon'); expect(currentSection(21)).toBe('evening'); expect(currentSection(2)).toBe('evening');
    expect(openSection(sections, 8)).toBe('morning'); expect(openSection(sections, 14)).toBe('morning'); // afternoon empty → first with due
    expect(openSection(groupByTimeOfDay([], '2026-09-10'), 14)).toBe('anytime');
  });
});
describe('days since for a quit habit (H3)', () => {
  test('counts from the day after the last slip, keeps the longest run, estimates money from the person\'s own cost', () => {
    let d = journal();
    d = logHabitValue(d, ID.q, '2026-09-05', 1, {mode: 'set'}, new Date('2026-09-05T22:00:00Z'));
    d = setHabitEntryStatus(d, ID.q, '2026-09-12', 'failed', 'party', new Date('2026-09-12T22:00:00Z'));
    const q = d.habits.find(h => h.id === ID.q)!;
    const s = quitSummary(q, '2026-09-30', {perDay: 3.5, currency: 'EUR'});
    expect(s.slips).toEqual(['2026-09-05', '2026-09-12']); expect(s.lastSlip).toBe('2026-09-12'); expect(s.since).toBe('2026-09-13');
    expect(s.daysSince).toBe(18); expect(s.longestRun).toBe(18); expect(s.moneySaved).toBe(63);
    const none = quitSummary(journal().habits.find(h => h.id === ID.q)!, '2026-09-30');
    expect(none.daysSince).toBe(30); expect(none.moneySaved).toBeNull(); expect(none.longestRun).toBe(30);
    const month = slipMonth(s, q, '2026-09', '2026-09-30');
    expect(month).toHaveLength(30); expect(month.find(c => c.date === '2026-09-05')?.state).toBe('slip'); expect(month.find(c => c.date === '2026-09-20')?.state).toBe('clean');
    expect(slipMonth(s, q, '2026-08', '2026-09-30').every(c => c.state === 'before')).toBe(true);
  });
});
describe('year view (H8)', () => {
  test('53 weeks from the Monday on or before 1 January, month labels, counts and a readable summary', () => {
    const weeks = yearWeeks(2026);
    expect(weeks[0]![0]).toBe('2025-12-29'); expect(weeks.at(-1)![6]! >= '2026-12-31').toBe(true); expect(weeks.length).toBeGreaterThanOrEqual(53);
    expect(monthStarts(weeks, 2026)[0]).toEqual({label: 'Jan', week: 0}); expect(monthStarts(weeks, 2026)).toHaveLength(12);
    let d = journal(); for (const day of ['2026-09-01', '2026-09-02', '2026-09-04']) d = logHabitValue(d, ID.a, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`));
    const y = habitYear(d.habits.find(h => h.id === ID.a)!, 2026, '2026-09-05');
    expect(y.counts).toEqual({complete: 3, partial: 0, skipped: 0, failed: 1, scheduled: 5});
    expect(y.summary).toBe('Stretch, 2026: 3 of 5 scheduled days complete, 0 partial, 0 skipped, 1 missed.');
    expect(y.weeks[0]![0]!.status).toBe('outside');
    expect(habitYear(journal().habits[0]!, 2025, '2026-09-05').summary).toContain('no scheduled days yet');
    const o = overviewYear(d.habits, 2026, '2026-09-05');
    expect(o.days).toBe(5); expect(o.fullDays).toBe(0); expect(o.weeks.flat().find(c => c.date === '2026-09-01')!.share!).toBeCloseTo(1 / 3);
  });
});
