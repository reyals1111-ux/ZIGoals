import {describe, expect, it} from 'vitest';
import {chooseDayGoal} from '../../checklist/day-goal';
import {emptyDayGoal} from '../../checklist/day-goal-core';
import {addCountdown, emptyCountdowns} from '../../countdowns/schema';
import {chooseDayEnd, emptyDayEnds} from '../../day-boundary';
import {createHabit, emptyHabitData, logHabitValue, type HabitData, type HabitInput} from '../../habits';
import {perfectMonth, perfectRun} from '../../habits-extras/perfect-days';
import {wordsThisYear, writingStreak} from '../../journal/stats';
import {tasksSchema} from '../../tasks/schema';
import {showcaseTasks} from '../../tasks/showcase';
import {emptyTaskWhen, putInSomeday, putOnEvening} from '../../tasks/when';
import {CATALOGUE_AREAS, TEMPLATE_CATALOGUE} from '../../templates/library';
import {TEMPLATE_COUNTS, templatePickHref, countdownsCard, countdownsRows, dayRulesCard, dayRulesRows, journalNumbersCard, journalNumbersRows, perfectDaysCard, perfectDaysRows, tasksLaterCard, tasksLaterRows, templatesCard, templatesRows} from './life-insights';

/**
 * Session AM-2 (step 3, "NOVA connected"): the day, habits, mind and library widgets of what Sessions AO and AP added.
 * Each selector is checked against the page's own rule; a record that was not read is null, never a default.
 */
const TODAY = '2026-11-12', START = '2026-11-02'; // START is a Monday
const at = (date: string) => new Date(`${date}T10:00:00Z`);
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const done = (d: HabitData, id: string, date: string) => logHabitValue(d, id, date, 1, {}, at(TODAY));

describe('perfect days: the Habits page’s own month, as a lattice', () => {
  function habits(): HabitData {
    let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
    d = createHabit(d, input('Stretch'), at(START), A);
    d = createHabit(d, input('Read', {schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}), at(START), B);
    for (const day of ['2026-11-09', '2026-11-10', '2026-11-11']) d = done(done(d, A, day), B, day); // Mon–Wed: both
    d = done(d, A, '2026-11-03'); // Tue the 3rd: 1 of 2
    return done(d, A, TODAY); // today: 1 of 2 so far
  }
  it('counts, the run and the cells are the page’s own; today unfinished is never a miss', () => {
    const h = habits().habits, c = perfectDaysCard(h, TODAY), m = perfectMonth(h, '2026-11', TODAY);
    expect([c.count, c.month, c.perfect, c.dueDays, c.run]).toEqual([2, '2026-11', m.perfect, m.dueDays, perfectRun(h, TODAY)]);
    expect([c.perfect, c.run]).toEqual([3, 3]);
    expect(c.today).toMatchObject({kind: 'partly', done: 1, due: 2});
    expect(c.todayWords).toBe('1 of 2 due habits done so far');
    expect(c.firstMonday).toBe('2026-10-26');
    // The week of Mon 2 Nov: a day with nothing logged, a day partly done, three days with no record, two more with none.
    expect(c.weeks[1]).toEqual({key: '2026-11-02', cells: ['missed', 'part', 'missed', 'missed', 'missed', 'missed', 'missed']});
    // The week of Mon 9 Nov: three perfect days, today (Thu) partly, then days still to come.
    expect(c.weeks[2]).toEqual({key: '2026-11-09', cells: ['done', 'done', 'done', 'part', 'ahead', 'ahead', 'ahead'], today: 3});
    expect(c.weeks[0]!.cells.slice(0, 6)).toEqual(['rest', 'rest', 'rest', 'rest', 'rest', 'rest']); // October's days are outside the month
    expect(perfectDaysRows(c)[3]).toEqual(['The perfect days', 'Nov 9, Nov 10, Nov 11']);
  });
  it('today with nothing logged yet is still to come, not a miss; no habit teaches', () => {
    let d: HabitData = {...emptyHabitData(), timeZone: 'UTC'};
    d = createHabit(d, input('Stretch'), at(START), A);
    const c = perfectDaysCard(d.habits, TODAY);
    expect(c.weeks[2]!.cells[3]).toBe('ahead');
    expect(c.today.kind).toBe('no-record');
    expect(perfectDaysCard([], TODAY)).toMatchObject({count: 0, perfect: 0, run: 0});
  });
});

describe('your day’s rules: two settings, read out', () => {
  it('the defaults are said as such; a setting that was not read is null, never the default', () => {
    expect(dayRulesCard(emptyDayGoal(), emptyDayEnds(), TODAY)).toEqual({goal: {need: null, words: 'Every dot', since: null}, ends: {minutes: 0, words: 'Midnight', changedAt: null}});
    expect(dayRulesCard(null, undefined, TODAY)).toEqual({goal: null, ends: null});
    expect(dayRulesRows(dayRulesCard(null, null, TODAY)).map(r => r[1])).toEqual(['Not read on this device', 'Not read on this device']);
  });
  it('"A day counts as done at 4" since its day, and a day that ends at 3:00; a later change does not apply before its day', () => {
    const goal = chooseDayGoal(chooseDayGoal(emptyDayGoal(), '2026-11-05', 4), '2026-11-20', 6), ends = chooseDayEnd(emptyDayEnds(), 180, at('2026-11-06'));
    const c = dayRulesCard(goal, ends, TODAY);
    expect(c.goal).toEqual({need: 4, words: '4 dots', since: '2026-11-05'});
    expect(c.ends).toEqual({minutes: 180, words: '3:00', changedAt: '2026-11-06T10:00:00.000Z'});
    expect(dayRulesCard(goal, ends, '2026-11-04').goal).toEqual({need: null, words: 'Every dot', since: null});
    expect(dayRulesCard(chooseDayGoal(emptyDayGoal(), TODAY, 1), ends, TODAY).goal?.words).toBe('1 dot');
    expect(dayRulesRows(c)[0]![1]).toMatch(/^4 dots lit, or every dot on a shorter day; since /);
  });
});

describe('this evening and Someday: the Tasks page’s own lists', () => {
  const record = tasksSchema.parse({version: 1, tasks: [
    {id: 't1', title: 'Call the plumber', priority: 'normal', due: TODAY, createdAt: '2026-11-10T08:00:00.000Z'},
    {id: 't2', title: 'Sort photos', priority: 'low', createdAt: '2026-11-09T08:00:00.000Z'},
    {id: 't3', title: 'Old and done', priority: 'low', createdAt: '2026-11-01T08:00:00.000Z', doneAt: '2026-11-02T08:00:00.000Z'},
  ]});
  it('tonight’s list holds for today only, Someday only without a day; a finished task is on neither', () => {
    const when = putInSomeday(putOnEvening(emptyTaskWhen(), record, TODAY, 't1'), record, TODAY, 't2'), c = tasksLaterCard(when, record, TODAY);
    expect([c.state, c.open]).toEqual(['live', 2]);
    expect(c.evening.map(l => l.id)).toEqual(['t1']); expect(c.someday.map(l => [l.id, l.due])).toEqual([['t2', null]]);
    expect(c.evening[0]!.dueText).toMatch(/Nov 12/);
    const tomorrow = tasksLaterCard(when, record, '2026-11-13');
    expect([tomorrow.evening, tomorrow.someday.length, tomorrow.state]).toEqual([[], 1, 'live']);
    expect(tasksLaterRows(c)).toEqual([['This evening (1)', 'Call the plumber'], ['Someday (1)', 'Sort photos']]);
  });
  it('open tasks on neither list is quiet; no open task teaches', () => {
    expect(tasksLaterCard(emptyTaskWhen(), record, TODAY).state).toBe('quiet');
    expect(tasksLaterCard(emptyTaskWhen(), tasksSchema.parse({version: 1, tasks: []}), TODAY)).toMatchObject({state: 'empty', open: 0});
    expect(tasksLaterCard(emptyTaskWhen(), showcaseTasks(TODAY), TODAY).open).toBe(5);
  });
});

describe('days until: countdowns, never a negative count', () => {
  const add = (r: ReturnType<typeof emptyCountdowns>, id: string, title: string, date: string, note?: string) => addCountdown(r, {title, date, ...(note ? {note} : {})}, {id, at: at('2026-11-01')});
  it('soonest first, today as "Today", a passed one only counted', () => {
    let r = emptyCountdowns();
    r = add(r, 'c1', 'Trip to Lisbon', '2026-11-27', 'Pack light'); r = add(r, 'c2', 'Race day', TODAY); r = add(r, 'c3', 'Old party', '2026-11-01'); r = add(r, 'c4', 'New year', '2027-01-01');
    const c = countdownsCard(r, TODAY);
    expect([c.state, c.total, c.passed]).toEqual(['live', 4, 1]);
    expect(c.upcoming.map(l => [l.id, l.days, l.words])).toEqual([['c2', 0, 'Today'], ['c1', 15, 'In 15 days'], ['c4', 50, 'In 50 days']]);
    expect(c.next).toMatchObject({title: 'Race day', near: 1});
    expect(c.upcoming[1]).toMatchObject({note: 'Pack light', near: 0.5});
    expect(c.upcoming[2]!.dateText).toMatch(/2027/); // another year is named
    expect(c.upcoming.every(l => l.days >= 0)).toBe(true);
    expect(countdownsRows(c, 2).map(r2 => r2[0])).toEqual(['Next: Race day', 'Trip to Lisbon', 'More countdowns', 'Passed']);
  });
  it('none teaches; only passed ones say nothing is ahead', () => {
    expect(countdownsCard(emptyCountdowns(), TODAY)).toMatchObject({state: 'empty', next: null});
    const c = countdownsCard(add(emptyCountdowns(), 'c3', 'Old party', '2026-11-01'), TODAY);
    expect([c.state, c.next, c.passed]).toEqual(['live', null, 1]);
    expect(countdownsRows(c)[0]).toEqual(['Coming up', 'Nothing ahead']);
  });
});

describe('journal numbers: the Journal page’s own streak and words', () => {
  const entries = [
    {date: '2026-11-11', text: 'One two three four'}, {date: '2026-11-12', text: 'Five six.'}, {date: '2026-09-03', text: 'Seven'}, {date: '2025-12-31', text: 'last year’s words do not count'}, {date: '2026-12-01', text: 'the future is not read'},
  ];
  it('the streak and this year’s words are the page’s; a month without an entry is a gap, never zero', () => {
    const c = journalNumbersCard(entries, TODAY), past = entries.filter(e => e.date <= TODAY);
    expect(c.streak).toEqual(writingStreak(past, TODAY));
    expect([c.words, c.entries]).toEqual([wordsThisYear(past, TODAY).words, 3]);
    expect([c.total, c.year, c.words, c.average, c.lastDate]).toEqual([4, '2026', 7, 2, TODAY]);
    expect(c.months.map(m => [m.key, m.words])).toEqual([['2026-06', null], ['2026-07', null], ['2026-08', null], ['2026-09', 1], ['2026-10', null], ['2026-11', 6]]);
    expect(journalNumbersRows(c).find(r => r[1] === 'No entry')).toBeTruthy();
    // Session AM-3 (round 6): the last fourteen days, today last; a day without an entry is a gap (null), never a zero, and the future is not read.
    expect(c.days.length).toBe(14);
    expect(c.days[13]!.date).toBe(TODAY);
    expect(c.days.filter(d => d.words !== null).map(d => [d.date, d.words])).toEqual([['2026-11-11', 4], ['2026-11-12', 2]]);
    expect(c.days.every(d => d.date <= TODAY)).toBe(true);
  });
  it('the months cross a year’s end; entries without text count as written with no words; nothing written teaches', () => {
    const c = journalNumbersCard([{date: '2026-01-02'}, {date: '2025-11-30', text: 'a b'}], '2026-02-10');
    expect(c.months.map(m => m.key)).toEqual(['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02']);
    expect([c.months[2]!.words, c.months[4]!.words, c.words, c.entries, c.average]).toEqual([2, 0, 0, 1, 0]);
    expect(journalNumbersCard([], TODAY)).toMatchObject({total: 0, average: null, lastDate: null});
  });
});

describe('templates: the library by area', () => {
  it('the counts NOVA’s line states are the library’s own (lib/templates/library.ts)', () => {
    expect(TEMPLATE_COUNTS).toEqual({goals: TEMPLATE_CATALOGUE.filter(e => e.kind === 'goal').length, habits: TEMPLATE_CATALOGUE.filter(e => e.kind === 'habit').length, areas: CATALOGUE_AREAS.length});
  });
  it('every area with its goals and habits, the largest first; three goal templates to start from, which rotate with the day', () => {
    const c = templatesCard(TEMPLATE_CATALOGUE, CATALOGUE_AREAS, TODAY);
    expect([c.goals, c.habits, c.total]).toEqual([TEMPLATE_COUNTS.goals, TEMPLATE_COUNTS.habits, TEMPLATE_CATALOGUE.length]);
    expect(c.areas.reduce((n, a) => n + a.total, 0)).toBe(c.total);
    expect(c.areas[0]!.share).toBe(1);
    expect(c.areas.every((a, i) => i === 0 || a.total <= c.areas[i - 1]!.total)).toBe(true);
    expect(c.picks).toHaveLength(3);
    expect(new Set(c.picks.map(p => p.id)).size).toBe(3);
    for (const p of c.picks) { expect(p.href).toMatch(/^\/app\/goals\/new\?template=[a-z0-9-]+$/); expect(TEMPLATE_CATALOGUE.some(e => e.id === p.id && e.kind === 'goal')).toBe(true); }
    // A template opens the form the Goal templates page opens for it: an average goal its own form, a weight goal Health goals.
    expect([templatePickHref('goal:run-10k', 'project'), templatePickHref('goal:sleep-7h', 'average'), templatePickHref('goal:lose-weight', 'health-weight'), templatePickHref('goal:x y')])
      .toEqual(['/app/goals/new?template=run-10k', '/app/goals/average/new?template=sleep-7h', '/app/goals?health-goal=weight#goals-health', '/app/goals/new?template=x%20y']);
    const kinds = templatesCard(TEMPLATE_CATALOGUE.map(e => ({kind: e.kind, id: e.id, area: e.area, title: e.title, ...(e.kind === 'goal' ? {goalKind: e.goal.kind} : {})})), CATALOGUE_AREAS, TODAY, 400).picks;
    expect(kinds.filter(p => p.href.startsWith('/app/goals/average/new?template=')).length).toBe(TEMPLATE_CATALOGUE.filter(e => e.kind === 'goal' && e.goal.kind === 'average').length);
    expect(templatesCard(TEMPLATE_CATALOGUE, CATALOGUE_AREAS, '2026-11-13').picks.map(p => p.id)).not.toEqual(c.picks.map(p => p.id));
    expect(templatesRows(c, 2)).toHaveLength(3);
  });
  it('an empty library gives no pick and no area', () => {
    expect(templatesCard([], CATALOGUE_AREAS, TODAY)).toEqual({goals: 0, habits: 0, total: 0, areas: [], picks: []});
  });
});
