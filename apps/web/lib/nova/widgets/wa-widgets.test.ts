import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {tasksSchema, type Tasks} from '../../tasks/schema';
import {showcaseTasks} from '../../tasks/showcase';
import {POMODORO_DEFAULTS, startRun, skipBreak} from '../../focus-sessions/pomodoro';
import {WIDGETS, widgetSpec} from './catalog';
import {tasksHeadline, tasksWidgetView} from './tasks';
import {focusClock, focusWidgetView} from './focus';

/** Session AK WA (T1, T3, N1, N2): NOVA's Tasks and Focus widgets, and the Duo on NOVA's dashboard. */
const TODAY = '2026-11-01', doneDay = (iso: string) => iso.slice(0, 10), at = (d: string) => `${d}T08:00:00.000Z`;
const task = (id: string, extra: Record<string, unknown> = {}) => ({id, title: `Task ${id}`, priority: 'normal', createdAt: at('2026-10-20'), ...extra});
const record = (tasks: unknown[]): Tasks => tasksSchema.parse({version: 1, tasks});

describe('the Tasks widget', () => {
  it('a fresh start is empty (it teaches), never "0 to do"', () => {
    const view = tasksWidgetView(record([]), TODAY, doneDay, 'M');
    expect(view).toMatchObject({state: 'empty', today: [], next: [], todo: 0});
    expect(tasksHeadline(view)).toBe('No tasks yet.');
  });
  it('today\'s list is the Agenda\'s: due today and overdue carried over, then the ones done today; goal next actions after', () => {
    const r = record([
      task('a', {due: TODAY, priority: 'high'}), task('b', {due: '2026-10-30'}), task('c', {due: '2026-11-03', goal: 'private:g1'}),
      task('d', {goal: 'private:g2'}), task('e', {due: TODAY, doneAt: '2026-11-01T09:00:00.000Z'}), task('f', {due: '2026-11-09'}),
    ]);
    const view = tasksWidgetView(r, TODAY, doneDay, 'M');
    expect(view.state).toBe('some');
    expect(view.today.map(t => t.id)).toEqual(['b', 'a', 'e']);
    expect(view.todo).toBe(2); expect(view.carried).toBe(1);
    expect(view.next.map(t => t.id)).toEqual(['c', 'd']);
    expect(tasksHeadline(view)).toBe('2 to do today, 1 carried over.');
  });
  it('the size bounds each list; Small shows no goal actions; the rest is counted, not dropped silently', () => {
    const r = record(Array.from({length: 7}, (_, i) => task(`t${i}`, {due: TODAY, goal: i > 4 ? 'private:g' : undefined})).concat([task('n1', {goal: 'private:g'}), task('n2', {goal: 'private:g'}), task('n3', {goal: 'private:g'})]));
    const s = tasksWidgetView(r, TODAY, doneDay, 'S'), m = tasksWidgetView(r, TODAY, doneDay, 'M'), l = tasksWidgetView(r, TODAY, doneDay, 'L');
    expect([s.today.length, s.moreToday, s.next.length]).toEqual([3, 4, 0]);
    expect([m.today.length, m.moreToday, m.next.length]).toEqual([4, 3, 2]);
    expect([l.today.length, l.moreToday, l.next.length]).toEqual([7, 0, 3]);
    // A goal-linked task due today is on today's list, never twice.
    expect(l.next.map(t => t.id)).toEqual(['n1', 'n2', 'n3']);
  });
  it('everything done today: said plainly', () => {
    const view = tasksWidgetView(record([task('a', {due: TODAY, doneAt: '2026-11-01T10:00:00.000Z'})]), TODAY, doneDay, 'M');
    expect(view.state).toBe('clear'); expect(tasksHeadline(view)).toBe('Nothing left to do today.');
  });
  it('the Showcase\'s labelled example tasks fill it (every title starts "Example · ")', () => {
    const view = tasksWidgetView(showcaseTasks(TODAY, ['g1', 'g2']), TODAY, doneDay, 'L');
    expect(view.state).toBe('some');
    expect([...view.today, ...view.next].every(t => t.title.startsWith('Example · '))).toBe(true);
    expect(view.next.length).toBeGreaterThan(0);
  });
  it('is in the gallery with its page, and its body never repeats its own link', () => {
    expect(widgetSpec('tasks')).toMatchObject({href: '/app/tasks', open: 'Open your tasks', pillar: 'goals'});
    expect(WIDGETS.filter(w => w.id === 'tasks')).toHaveLength(1);
  });
});

describe('the Focus widget', () => {
  const settings = POMODORO_DEFAULTS;
  it('no run and no session this week: it teaches with a Start, never a zero', () => {
    expect(focusWidgetView({run: null, last: null, now: 0, week: {minutes: 0, sessions: 0}, settings})).toEqual({kind: 'empty', start: 'Start a 25-minute Pomodoro'});
    expect(focusWidgetView({run: null, last: null, now: 0, week: null, settings}).kind).toBe('empty');
  });
  it('a week with focus shows it, with the person\'s own length on Start', () => {
    expect(focusWidgetView({run: null, last: null, now: 0, week: {minutes: 100, sessions: 4}, settings: {...settings, work: 50}})).toEqual({kind: 'week', minutes: 100, sessions: 4, start: 'Start a 50-minute Pomodoro'});
  });
  it('a running Pomodoro shows its phase, its time left and its task; a break says so', () => {
    const t0 = Date.parse('2026-11-01T09:00:00.000Z'), run = startRun(settings, t0, {id: 'p1', taskId: 'task_1', taskTitle: 'Example · Book the dentist'});
    expect(focusWidgetView({run, last: null, now: t0 + 65_000, week: null, settings})).toEqual({kind: 'running', clock: '23:55', phase: 'Focus', block: 1, blocks: 4, task: 'Example · Book the dentist', onBreak: false});
    const onBreak = {...run, index: 1, phaseStartedAt: t0 + 25 * 60_000};
    expect(focusWidgetView({run: onBreak, last: null, now: t0 + 25 * 60_000, week: null, settings})).toMatchObject({kind: 'running', phase: 'Short break', clock: '5:00', onBreak: true});
    expect(skipBreak(onBreak, t0 + 26 * 60_000).run.index).toBe(2);
  });
  it('after a run: what grew, and the task it ticked (for Undo)', () => {
    expect(focusWidgetView({run: null, last: {runId: 'p', grown: 3, withered: 1, ticked: true, taskTitle: 'Read', endedEarly: false}, now: 0, week: null, settings}))
      .toEqual({kind: 'result', line: 'Run finished: 3 grown, 1 withered (kept).', ticked: 'Read'});
    expect(focusWidgetView({run: null, last: {runId: 'p', grown: 0, withered: 0, ticked: false, endedEarly: true}, now: 0, week: null, settings}))
      .toEqual({kind: 'result', line: 'Run ended: 0 grown.', ticked: null});
  });
  it('the clock', () => { expect(focusClock(0)).toBe('0:00'); expect(focusClock(61)).toBe('1:01'); expect(focusClock(25 * 60)).toBe('25:00'); });
  it('opens Focus Sessions on the Pomodoro', () => { expect(widgetSpec('focus')).toMatchObject({href: '/app/journey?focus=pomodoro#focus', open: 'Open Focus Sessions'}); });
});

describe('wired, not dead code (WIRING_AUDIT_2 N1, N2, T1, T3)', () => {
  const web = join(__dirname, '../../..'), read = (p: string) => readFileSync(join(web, p), 'utf8');
  it('every gallery widget has its body on the stage', () => {
    const grid = read('components/nova/widget-grid.tsx');
    for (const w of WIDGETS) expect(grid, w.id).toMatch(new RegExp(`['"]?${w.id}['"]?: lazy\\(\\(\\) => import\\('./widgets/${w.id}'\\)\\)`));
  });
  it('the Tasks and Focus bodies use the Tasks page\'s rows and the page\'s one Pomodoro run (one engine, not a copy)', () => {
    expect(read('components/nova/widgets/tasks.tsx')).toMatch(/useTaskList\(\)/);
    expect(read('components/nova/widgets/tasks.tsx')).toMatch(/TaskRow/);
    expect(read('components/nova/widgets/focus.tsx')).toMatch(/usePomodoro\(\)/);
    expect(read('components/nova/widgets/focus.tsx')).toMatch(/startPomodoro\(/);
  });
  it('NOVA\'s dashboard mounts the Duo (lazily) from the duo state NOVA\'s chat writes', () => {
    const dash = read('components/nova/nova-dashboard.tsx');
    expect(dash).toMatch(/lazy\(\(\) => import\('\.\/chat\/nova-duo'\)\)/);
    expect(dash).toMatch(/useSyncExternalStore\(subscribeDuo, duoState/);
    expect(dash).toMatch(/<NovaDuo persona=\{persona\}\/>/);
  });
});
