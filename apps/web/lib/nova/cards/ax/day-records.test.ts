import {expect, test} from 'vitest';
import {focusTrack, journalTrack} from '../../../ai/local-answers/exact/day';
import {tally} from '../../../ai/local-answers/exact/series';
import {focusSessionsSchema} from '../../../focus-sessions/schema';
import {habitDataSchema} from '../../../habits';
import {journalSchema} from '../../../journal/schema';
import {notesSchema} from '../../../notes/schema';
import {buildShowcase} from '../../../showcase-data';
import {tasksSchema} from '../../../tasks/schema';
import type {ClockInput} from '../../holo/agenda';
import {widgetPeriod} from './calendar';
import {dayTimeline} from './day-agenda';
import {focusGauge, focusHeat} from './day-focus';
import {dayScan, lifeRadar} from './day-life';
import {notesConstellation, starPlaces} from './day-notes';
import {NOVA_ANSWER_GROUPS, NOVA_ANSWERS_LINE} from './day-nova';
import {trackStreak} from './day-streaks';
import {taskLoad, taskOverdue, taskTimeline, taskTitle, tasksMonth} from './day-tasks';

/**
 * Session AS (ADR-042 Part 2): the answer widgets of the day's own records read what the pages hold (the Showcase on
 * 17 November 2026, 19:00 UTC; the figures below were read from its records: six tasks, one of them finished on
 * 16 November; focus sessions on thirteen days since 22 September; a journal entry on ten days of November; eight notes).
 */
const DAY = '2026-11-17', CLOCK = '19:00', records = buildShowcase(DAY, 'UTC').records, doneDay = (iso: string) => iso.slice(0, 10);
const tasks = tasksSchema.parse(JSON.parse(records['zigoals:tasks:v1']!)), focus = focusSessionsSchema.parse(JSON.parse(records['zigoals:focus-sessions:v1']!)).sessions;
const journal = journalSchema.parse(JSON.parse(records['zigoals:journal:v1']!)).entries, notes = notesSchema.parse(JSON.parse(records['zigoals:notes:v1']!));
const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)).habits;
const NONE = tasksSchema.parse({version: 1, tasks: []});

test('the journal and focus streaks: days in a row ending today, and the longest run of the year', () => {
  const written = trackStreak(journalTrack(journal, DAY), DAY);
  expect(written).toMatchObject({current: 4, best: 4, bestEnded: '2026-11-17', todayDone: true, recent: 10}); // 14–17 November
  expect(written.days).toHaveLength(14); expect(written.days.map(d => d.done ? 1 : 0).join('')).toBe('01101101101111'); expect(written.days.at(-1)).toMatchObject({date: DAY, today: true});
  // One session day in a row (16 November); today is still open and does not break it.
  expect(trackStreak(focusTrack(focus, DAY), DAY)).toMatchObject({current: 1, best: 1, todayDone: false, recent: 4});
  expect(trackStreak(journalTrack([], DAY), DAY)).toMatchObject({current: 0, best: 0, bestEnded: null, todayDone: false, recent: 0});
});
test('the journal map’s figures: ten days written in November, 107 words', () => {
  const T = tally(journalTrack(journal, DAY).points(widgetPeriod('this-month', DAY).days));
  expect(T).toMatchObject({done: 10, total: 107, decided: 17});
});
test('focus heat: thirteen weeks, a cell a day, the best day brightest', () => {
  const view = focusHeat(focus, DAY);
  expect(view.weeks).toHaveLength(13); expect(view.from).toBe('2026-08-24');
  expect(view).toMatchObject({days: 13, minutes: 795, sessions: 32, best: {date: '2026-11-16', minutes: 150}});
  const cells = view.weeks.flatMap(w => w.cells), of = (date: string) => cells.find(c => c.date === date)!;
  expect(of('2026-11-16')).toMatchObject({minutes: 150, level: 4, words: 'Mon, Nov 16: 150 minutes'}); expect(of('2026-11-14')).toMatchObject({minutes: 86, level: 3}); expect(of('2026-11-01')).toMatchObject({minutes: 21, level: 1});
  expect(of('2026-11-15')).toMatchObject({minutes: null, level: 0, words: 'Sun, Nov 15: no focus session'}); expect(of('2026-11-17')).toMatchObject({today: true, level: 0}); expect(of('2026-11-18').ahead).toBe(true);
  expect(view.weeks.filter(w => w.month).map(w => w.month)).toEqual(['Sep', 'Oct', 'Nov']);
  expect(focusHeat([], DAY)).toMatchObject({days: 0, minutes: 0, sessions: 0, best: null});
});
test('the focus gauge: this week so far beside the whole of last week', () => {
  expect(focusGauge(focus, DAY)).toMatchObject({now: {minutes: 150, sessions: 6, days: 1, from: '2026-11-16'}, before: {minutes: 136, sessions: 6, days: 2, from: '2026-11-09', to: '2026-11-15'}, nowShare: 1, delta: 14});
  expect(focusGauge(focus, DAY).beforeShare).toBeCloseTo(136 / 150, 5);
  expect(focus.filter(s => s.day.startsWith('2026-11'))).toHaveLength(16); // the sessions of November
  // A week without a session is unknown on the dial, never a zero-length arc.
  expect(focusGauge([], DAY)).toMatchObject({now: {minutes: 0, sessions: 0}, nowShare: null, beforeShare: null, delta: 0});
});
test('tasks: the Tasks page’s one overdue rule, with the clock', () => {
  expect(taskLoad(tasks, DAY, CLOCK)).toEqual({open: 5, overdue: 2, today: 0, ahead: 2, someday: 1});
  expect(taskLoad(tasks, DAY, '09:00')).toEqual({open: 5, overdue: 1, today: 1, ahead: 2, someday: 1}); // the dentist's 10:30 has not passed
  const late = taskOverdue(tasks, DAY, CLOCK);
  expect(late.rows.map(r => [r.label, r.days, r.text])).toEqual([['Sketch the garden bed', 1, '1 day · due Nov 16'], ['Book the dentist', 0, 'due today at 10:30 AM']]);
  expect(late).toMatchObject({open: 5, max: 1});
  expect(taskTitle('Example · Book the dentist')).toBe('Book the dentist'); expect(taskTitle('Rent · SHOWCASE DATA')).toBe('Rent');
  expect(taskOverdue(NONE, DAY, CLOCK)).toEqual({rows: [], open: 0, max: 1}); expect(taskLoad(NONE, DAY, CLOCK)).toEqual({open: 0, overdue: 0, today: 0, ahead: 0, someday: 0});
});
test('the task timeline: from the oldest overdue day to a week ahead, done tasks of the period as ticks', () => {
  const view = taskTimeline(tasks, widgetPeriod('this-week', DAY), DAY, CLOCK, doneDay);
  expect(view).toMatchObject({from: '2026-11-16', to: '2026-11-24', todayAt: 0.125});
  expect(view.ticks).toEqual([{at: 0.125, label: 'Today'}, {at: 1, label: 'Nov 24'}]); // the first day is one day back: no room for its own label
  expect(view.marks.map(m => [m.title, m.kind, m.at])).toEqual([['Sketch the garden bed', 'overdue', 0], ['Book the dentist', 'overdue', 0.125], ['Compare two savings accounts', 'ahead', 0.375], ['Draft the trip budget', 'ahead', 0.75]]);
  expect(view.done.map(m => [m.title, m.at, m.words])).toEqual([['Renew the library card', 0, 'Renew the library card: done Mon, Nov 16']]);
  expect(view.counts).toEqual({open: 5, overdue: 2, today: 0, ahead: 2, someday: 1, later: 0, done: 1, earlier: 0});
  expect(view.oldest).toMatchObject({label: 'Sketch the garden bed', days: 1});
  const empty = taskTimeline(NONE, widgetPeriod('this-week', DAY), DAY, CLOCK, doneDay);
  expect(empty).toMatchObject({from: DAY, marks: [], done: [], oldest: null, todayAt: 0}); expect(empty.ticks.map(t => t.label)).toEqual(['Today', 'Nov 24']);
});
test('the tasks calendar: the days of November with a task due or done', () => {
  const month = tasksMonth(tasks, widgetPeriod('this-month', DAY), DAY, CLOCK, doneDay);
  expect(month.view.title).toMatch(/Nov/); expect(month.view.weeks).toHaveLength(6);
  expect(month).toMatchObject({dueDays: ['2026-11-19', '2026-11-22'], overdueDays: ['2026-11-16', '2026-11-17'], doneDays: ['2026-11-16'], taskDays: 4, due: 4, done: 1});
  expect(month.view.lit).toEqual(['2026-11-16', '2026-11-19', '2026-11-22']); // today is ringed, never lit
  const cells = month.view.weeks.flat(), of = (date: string) => cells.find(c => c.date === date)!;
  expect(of('2026-11-16')).toMatchObject({state: 'missed', words: 'Mon, Nov 16: 1 overdue, 1 done'}); expect(of('2026-11-17')).toMatchObject({state: 'missed', today: true});
  expect(of('2026-11-19')).toMatchObject({state: 'part', inPeriod: true}); expect(of('2026-11-20').state).toBe('ahead'); expect(of('2026-11-10').state).toBe('rest'); expect(of('2026-10-30').inPeriod).toBe(false);
  expect(tasksMonth(NONE, widgetPeriod('this-month', DAY), DAY, CLOCK, doneDay)).toMatchObject({taskDays: 0, due: 0, done: 0, dueDays: [], doneDays: []});
});
test('today on a 24-hour line: timed items at their time, the rest counted, now marked', () => {
  const item = (id: string, time: string | null, state: ClockInput['state']): ClockInput => ({id, source: 'habit', pillar: 'habits', title: id, time, href: null, state});
  const view = dayTimeline([item('Walk', '07:00', 'done'), item('Read', '12:00', 'open'), item('Stretch', '12:10', 'skipped'), item('Meditate', '21:00', 'open'), item('Water', null, 'open')], CLOCK);
  expect(view).toMatchObject({total: 5, done: 1, skipped: 1, left: 3, timed: 4, anytime: 1, now: '19:00', next: {title: 'Meditate', time: '21:00'}});
  expect(view.nowAt).toBeCloseTo(19 / 24, 5);
  expect(view.marks.map(m => [m.title, m.kind, m.lane])).toEqual([['Walk', 'done', 0], ['Read', 'earlier', 0], ['Stretch', 'skipped', 1], ['Meditate', 'open', 0]]);
  expect(view.marks[1]!.at).toBe(0.5); expect(view.ticks.map(t => t.label)).toEqual(['00', '06', '12', '18', '24']);
  expect(dayTimeline([], 'no clock')).toMatchObject({marks: [], total: 0, left: 0, nowAt: null, next: null});
});
test('the notes constellation: a star a note, grouped by kind; counts only', () => {
  const sky = notesConstellation(notes, 'UTC');
  expect(sky.total).toBe(8); expect(sky.newest).toBe('2026-11-17');
  expect(sky.groups.map(g => [g.kind, g.label, g.count, g.stars.length, g.more])).toEqual([['inbox', 'Inbox', 2, 2, 0], ['daily', 'Daily', 3, 3, 0], ['topic', 'Topic', 3, 3, 0]]);
  expect(JSON.stringify(sky)).not.toMatch(/body|title/);
  expect(starPlaces(1)).toEqual([{x: 50, y: 50, r: 3.4}]); expect(starPlaces(60)).toHaveLength(24);
  for (const s of starPlaces(24)) { expect(s.x).toBeGreaterThanOrEqual(8); expect(s.x).toBeLessThanOrEqual(92); expect(s.y).toBeGreaterThanOrEqual(8); expect(s.y).toBeLessThanOrEqual(92); }
  expect(notesConstellation({notes: []})).toMatchObject({total: 0, newest: null}); expect(notesConstellation({notes: []}).groups.every(g => g.count === 0 && !g.stars.length)).toBe(true);
});
test('the life radar: this period beside the one before, as facts; an unread or empty spoke is unknown', () => {
  const view = lifeRadar({habits, tasks, focus, checklist: null}, widgetPeriod('this-week', DAY), DAY, doneDay);
  expect(view.spokes.map(s => [s.key, s.figure, s.unit, s.now.text, s.before.text])).toEqual([
    ['habits', '11', 'of 11', '11 of 11 due check-ins done', '12 of 12 due check-ins done'],
    ['tasks', '1', '', '1 task done', '0 tasks done'],
    ['focus', '150', 'min', '150 minutes focused', '0 minutes focused'],
    ['checklist', '—', '', 'Nothing recorded', 'Nothing recorded'],
  ]);
  expect(view.known).toBe(3); expect(view.beforeWords).toBe('Nov 9 – Nov 10');
  expect(view.spokes.map(s => [s.now.share, s.before.share])).toEqual([[1, 1], [1, 0], [1, 0], [null, null]]);
  expect(JSON.stringify(view)).not.toMatch(/score|grade|good|bad|better|worse/i);
  // The Checklist's kept days and today's live count; done tasks are kept 30 days, so an older period is unknown.
  const kept = lifeRadar({checklist: {days: {'2026-11-16': {done: 5, total: 6}, '2026-11-09': {done: 3, total: 6}}, today: {date: DAY, done: 2, total: 6}}, tasks}, widgetPeriod('this-week', DAY), DAY, doneDay);
  expect(kept.spokes[3]).toMatchObject({figure: '7', unit: 'of 12', now: {text: '7 of 12 Checklist dots done'}, before: {text: '3 of 6 Checklist dots done', share: 0.5}});
  expect(lifeRadar({tasks}, widgetPeriod('this-month', DAY), DAY, doneDay).spokes[1]).toMatchObject({now: {value: 1}, before: {value: null, share: null}});
  expect(lifeRadar({}, widgetPeriod('this-week', DAY), DAY, doneDay).known).toBe(0);
  expect(lifeRadar({habits: [], tasks: NONE, focus: [], checklist: null}, widgetPeriod('this-week', DAY), DAY, doneDay).known).toBe(0); // nothing kept is unknown, not four zeros
});
test('the day scan: today across habits, tasks, focus and the agenda; a part that was not read is left out', () => {
  const lanes = dayScan({habits, tasks, focus, agenda: [{state: 'done'}, {state: 'open'}, {state: 'open'}]}, DAY, CLOCK);
  expect(lanes.map(l => [l.key, l.figure, l.unit, l.text])).toEqual([['habits', '4', 'of 7', '4 of 7 done, 3 open'], ['tasks', '5', 'open', '5 open, 2 overdue'], ['focus', '0', 'min', 'No session yet today'], ['agenda', '2', 'of 3', '2 of 3 items left, 1 done']]);
  expect(lanes[0]!.pips).toEqual(['lit', 'lit', 'lit', 'lit', 'open', 'open', 'open']); expect(lanes[1]!.pips).toEqual(['late', 'late', 'open', 'open', 'open']); expect(lanes[2]!.pips).toEqual([]);
  expect(dayScan({tasks}, DAY, CLOCK).map(l => l.key)).toEqual(['tasks']);
  expect(dayScan({habits: [], tasks: NONE, focus: [], agenda: []}, DAY, CLOCK)).toEqual([]); expect(dayScan({}, DAY)).toEqual([]);
});
test('what NOVA answers: six groups, two plain questions each, and one fixed sentence in each language', () => {
  expect(NOVA_ANSWER_GROUPS.map(g => g.label)).toEqual(['Habits', 'Health', 'Goals', 'Money', 'Tasks and agenda', 'Journal and focus']);
  for (const g of NOVA_ANSWER_GROUPS) { expect(g.asks).toHaveLength(2); for (const ask of g.asks) expect(ask).toMatch(/^[A-Z][^<>*_]+\?$/); }
  expect(NOVA_ANSWER_GROUPS[0]!.asks[0]).toBe('Which days did I skip meditation this month?');
  for (const line of Object.values(NOVA_ANSWERS_LINE)) { expect(line.endsWith('.')).toBe(true); expect(line.length).toBeLessThanOrEqual(190); }
});
