import {describe, expect, it} from 'vitest';
import {emptyLifeReview, setFocus} from '../../life-review/store';
import {emptyPlatform, type Platform} from '../../positions';
import {matrix} from '../../tasks/matrix';
import {tasksSchema} from '../../tasks/schema';
import {emptyWeeklyReview, type WeeklyReview} from '../../weekly-review/schema';
import {reviewState, reviewWindow} from '../../weekly-review/window';
import {hourGridCard, hourGridRows, matrixCard, matrixRows, milestonesCard, milestonesRows, reviewsCard, reviewsRows, type HourItem} from './plan-insights';

/**
 * Session AM-2 (step 3, round 2): the priority matrix, today by the hour, reviews and goal milestones. Each selector is
 * checked against its page's own rule; a record that was not read is null, an empty hour is not a row.
 */
const TODAY = '2026-11-12';
const task = (id: string, extra: Record<string, unknown> = {}) => ({id, title: `Task ${id}`, priority: 'normal', createdAt: '2026-11-01T08:00:00.000Z', ...extra});

describe('priority matrix: the Tasks page’s four boxes', () => {
  const record = tasksSchema.parse({version: 1, tasks: [
    task('a', {priority: 'high', due: TODAY}), task('b', {priority: 'high', due: '2026-11-10'}), task('c', {priority: 'high', due: '2026-12-01'}),
    task('d', {due: '2026-11-14'}), task('e', {priority: 'low'}), task('f', {due: '2026-11-20'}), task('done', {priority: 'high', due: TODAY, doneAt: '2026-11-12T09:00:00.000Z'}),
  ]});
  it('the counts are the page’s own, in the page’s order; a finished task is in no box', () => {
    const c = matrixCard(record, TODAY), page = matrix(record.tasks, TODAY);
    expect(c.boxes.map(b => [b.id, b.count])).toEqual([['do', page.do.length], ['plan', page.plan.length], ['quick', page.quick.length], ['later', page.later.length]]);
    expect(c.boxes.map(b => b.count)).toEqual([2, 1, 1, 2]);
    expect([c.state, c.open, c.most]).toEqual(['live', 6, 2]);
    expect(c.boxes[0]!.top.map(t => t.id)).toEqual(['b', 'a']); // the overdue one leads, as on Tasks
    expect(c.boxes[0]!.title).toBe('Urgent and important');
    expect(matrixRows(c)[0]).toEqual(['Urgent and important', '2 tasks: Task b; Task a']);
    expect(matrixCard(record, TODAY, 1).boxes[0]!.top).toHaveLength(1);
    expect(matrixRows(matrixCard(record, TODAY, 1))[0]![1]).toBe('2 tasks: Task b; and 1 more');
  });
  it('no open task teaches; an empty box says "None", never a dash for a number', () => {
    expect(matrixCard(tasksSchema.parse({version: 1, tasks: []}), TODAY)).toMatchObject({state: 'empty', open: 0, most: 0});
    expect(matrixRows(matrixCard(tasksSchema.parse({version: 1, tasks: [task('x', {priority: 'low'})]}), TODAY)).map(r => r[1])).toEqual(['None', 'None', 'None', '1 task: Task x']);
  });
});

describe('today by the hour: the Agenda’s hour grid', () => {
  const item = (id: string, time: string | null, state: HourItem['state'] = 'open'): HourItem => ({id, title: `Item ${id}`, time, state});
  const items = [item('run', '05:30', 'done'), item('standup', '09:00'), item('call', '09:30'), item('dinner', '19:00'), item('water', null), item('read', null, 'done')];
  it('the grid runs from 06:00 to 23:00, earlier for an earlier item; only hours that hold something are rows', () => {
    const c = hourGridCard(items, '09:15');
    expect([c.state, c.total, c.timed, c.untimed, c.done]).toEqual(['live', 6, 4, 2, 2]);
    expect(c.rows.map(r => [r.clock, r.items.map(i => i.id)])).toEqual([['05:00', ['run']], ['09:00', ['standup', 'call']], ['19:00', ['dinner']]]);
    expect([c.load[0], c.load.at(-1), c.load.length]).toEqual([{hour: 5, label: '', count: 1}, {hour: 23, label: '', count: null}, 19]);
    expect(c.load.filter(h => h.count !== null).map(h => [h.hour, h.count])).toEqual([[5, 1], [9, 2], [19, 1]]); // an empty hour is null, never 0
    expect(c.load.filter(h => h.label).map(h => h.label)).toEqual(['06', '09', '12', '15', '18', '21']);
    expect(c.nowIndex).toBe(4); // 09:00 is the fifth hour of a grid that starts at 05:00
    expect(c.next?.id).toBe('call'); // the next open item at or after now
    expect(hourGridRows(c)[2]).toEqual(['09:00', '09:00 Item standup; 09:30 Item call']);
  });
  it('a day with only untimed items has no row and no next; nothing at all teaches; a clock that is not a time reads as the day’s start', () => {
    const c = hourGridCard([item('water', null)], '10:00');
    expect([c.rows, c.next, c.timed, c.load[0]!.hour, c.nowIndex]).toEqual([[], null, 0, 6, 4]);
    expect(hourGridCard([], '10:00').state).toBe('empty');
    expect(hourGridCard(items, 'soon').next?.id).toBe('standup');
    expect(hourGridCard(items, '02:00').nowIndex).toBeNull(); // before the grid starts
  });
});

describe('reviews: the weekly review’s window and state, and the Life review’s focus', () => {
  it('a review that was never opened is due; the next review day is a week after this window’s', () => {
    const weekly: WeeklyReview = {...emptyWeeklyReview(), weekday: 0}, c = reviewsCard(weekly, emptyLifeReview(), TODAY), w = reviewWindow(0, TODAY);
    expect(c.weekly).toMatchObject({state: reviewState(weekly, w.weekStart), stateWords: 'Due', weekStart: w.weekStart, weekEnd: w.weekEnd, reviewDay: '2026-11-08', nextDay: '2026-11-15', lastDone: null, finished: 0});
    expect(c.life).toEqual({period: 'week', focus: null, chosen: 0});
  });
  it('done, skipped and started are said as such; the last finished review is the newest one', () => {
    const w = reviewWindow(0, TODAY);
    const done: WeeklyReview = {version: 1, weekday: 0, reviews: [{weekStart: w.weekStart, completedAt: '2026-11-08T19:00:00.000Z'}, {weekStart: '2026-10-26', completedAt: '2026-11-01T19:00:00.000Z'}]};
    expect(reviewsCard(done, null, TODAY).weekly).toMatchObject({state: 'done', stateWords: 'Done', lastDone: '2026-11-08', finished: 2});
    expect(reviewsCard({version: 1, weekday: 0, reviews: [{weekStart: w.weekStart, skipped: true}]}, null, TODAY).weekly?.stateWords).toBe('Skipped');
    expect(reviewsCard({version: 1, weekday: 0, reviews: [{weekStart: w.weekStart, notes: {wentWell: 'x'}}]}, null, TODAY).weekly?.stateWords).toBe('Started');
  });
  it('the Life review’s latest focus is the person’s own words; a record that was not read is null, never a default', () => {
    let life = setFocus(emptyLifeReview(), 'week:2026-11-02', 'A walk after lunch', '2026-11-08T19:30:00.000Z');
    life = setFocus(life, 'month:2026-10', 'Bed by 23:00', '2026-10-31T19:30:00.000Z');
    expect(reviewsCard(null, life, TODAY)).toEqual({weekly: null, life: {period: 'week', focus: {text: 'A walk after lunch', setAt: '2026-11-08T19:30:00.000Z'}, chosen: 2}});
    expect(reviewsCard(undefined, undefined, TODAY)).toEqual({weekly: null, life: null});
    expect(reviewsRows(reviewsCard(null, null, TODAY), d => d).map(r => r[1])).toEqual(['Not read on this device', 'Not read on this device']);
  });
});

describe('goal milestones: the person’s own ticks', () => {
  const goal = (id: string, name: string, ticks: boolean[], status = 'active') => ({...(emptyPlatform().goals[0] ?? {}), id, name, status, milestones: ticks.map((done, i) => ({id: `${id}-m${i}`, title: `Step ${i + 1}`, done}))});
  const platform = (goals: ReturnType<typeof goal>[]) => ({goals} as unknown as Pick<Platform, 'goals'>);
  it('each open goal with its ticks and its next open milestone; the goal closest to done leads', () => {
    const c = milestonesCard(platform([goal('1', 'Japan', [true, false, false]), goal('2', 'Home', [true, true, false]), goal('3', 'Done one', [true, true]), goal('4', 'No steps', []), goal('5', 'Closed', [true], 'closed')]));
    expect([c.state, c.done, c.total]).toEqual(['live', 5, 8]);
    expect(c.goals.map(g => [g.name, g.done, g.total, g.next])).toEqual([['Home', 2, 3, 'Step 3'], ['Japan', 1, 3, 'Step 2'], ['Done one', 2, 2, null]]);
    expect(c.lead?.name).toBe('Home');
    expect(c.goals[0]!.share).toBeCloseTo(2 / 3);
    expect(milestonesRows(c, 2).map(r => r[0])).toEqual(['Milestones ticked', 'Home', 'Japan', 'More goals']);
  });
  it('no open goal teaches; open goals without a milestone say so; every milestone ticked has no "next"', () => {
    expect(milestonesCard(platform([])).state).toBe('empty');
    expect(milestonesCard(platform([goal('5', 'Closed', [true], 'closed')])).state).toBe('empty');
    expect(milestonesCard(platform([goal('4', 'No steps', [])]))).toMatchObject({state: 'none', goals: [], total: 0});
    expect(milestonesCard(platform([goal('3', 'Done one', [true, true])])).lead).toBeNull();
  });
});
