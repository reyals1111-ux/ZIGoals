import {describe, expect, it} from 'vitest';
import {parseTaskLine} from './parse';
import {dueReminders, reminderInstants} from './reminders';
import {addTask} from './engine';
import {emptyTasks, tasksSchema, type Tasks} from './schema';
import {TASK_PLAN_KEY, defaultReminderOf, withDefaultReminder, withDeviceDefault} from './plan-key';
import {splitSuggestion, spokenTasks} from './split';
import {remindersInNote, noteReminders} from '../notes/reminders';
import {sinceWords, splitWithExtras, withExtra, yearsMonthsSince, yearsOnNext, emptyCountdownExtras} from '../countdowns/extras';
import {instantAt} from '../zone-time';
import {buildPlan} from '../notify/plan';
import {emptyNotifyPrefs} from '../notify/prefs';

/** Session AV lane 2 (tasks, LEDGER #1, #3, #4, #11, #15, #31): reminders and capture. */
const ZONE = 'Europe/Amsterdam', today = '2026-11-23', at = new Date('2026-11-23T08:00:00Z');
const memory = (entries: Record<string, string> = {}) => { const m = new Map(Object.entries(entries)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };
const add = (r: Tasks, input: Parameters<typeof addTask>[1], id: string) => addTask(r, input, {id, at, today, allowPast: true});

describe('LEDGER #3: "!2h" and "!18:30" in the task line', () => {
  it('reads a reminder before the task time, at a clock time, and up to three', () => {
    const a = parseTaskLine('Call the bank tomorrow 10:00 !2h', today);
    expect([a.title, a.due, a.time, a.reminders]).toEqual(['Call the bank', '2026-11-24', '10:00', [{before: 120}]]);
    const b = parseTaskLine('Pay rent friday !18:30 !1d', today);
    expect(b.title).toBe('Pay rent');
    expect(b.reminders).toEqual([{before: 0, at: '2026-11-27T18:30'}, {before: 1440}]);
    expect(parseTaskLine('Bake !30m !1h !2h !3h', today).reminders).toHaveLength(3);
    // "!1" is still priority 1; a "!" alone stays the old priority mark.
    expect(parseTaskLine('Bake !1', today).level).toBe(1);
    expect(parseTaskLine('Bake !1', today).reminders).toBeUndefined();
  });
  it('a clock reminder alone needs no day; "!2h" alone plans the task for today', () => {
    const a = parseTaskLine('Water the plants !20:00', today);
    expect([a.due, a.reminders]).toEqual([undefined, [{before: 0, at: '2026-11-23T20:00'}]]);
    expect(parseTaskLine('Stretch !15m', today).due).toBe(today);
  });
});

describe('LEDGER #3: a reminder at its own date and time', () => {
  it('goes off at its own instant, also on a task with no day, next to the relative ones', () => {
    let r = add(emptyTasks(), {title: 'Fictional call', reminders: [{before: 0, at: '2026-11-23T20:00'}]}, 'a');
    r = add(r, {title: 'Fictional rent', due: '2026-11-24', time: '10:00', reminders: [{before: 60}, {before: 0, at: '2026-11-23T21:15'}]}, 'b');
    const list = reminderInstants(r, ZONE).map(x => [x.task.id, x.at]);
    expect(list).toEqual([['a', instantAt('2026-11-23', '20:00', ZONE)], ['b', instantAt('2026-11-23', '21:15', ZONE)], ['b', instantAt('2026-11-24', '09:00', ZONE)]]);
    expect(dueReminders(r, instantAt('2026-11-23', '20:05', ZONE), ZONE).map(x => x.task.id)).toEqual(['a']);
  });
  it('drops an "at" this build cannot read, keeping the reminder', () => {
    const read = tasksSchema.parse({version: 1, tasks: [{id: 't', title: 'x', priority: 'normal', createdAt: at.toISOString(), due: today, reminders: [{before: 5, at: 'tomorrow'}]}]});
    expect(read.tasks[0]!.reminders).toEqual([{before: 5}]);
  });
});

describe('LEDGER #11: the default reminder', () => {
  it('a new task with a day and no reminder takes it; a choice of its own wins', () => {
    expect(withDefaultReminder({due: today}, 15)).toEqual({due: today, reminders: [{before: 15}]});
    expect(withDefaultReminder({due: today, reminders: [{before: 60}]}, 15).reminders).toEqual([{before: 60}]);
    expect(withDefaultReminder({}, 15)).toEqual({});
    expect(withDefaultReminder({due: today}, null)).toEqual({due: today});
  });
  it('reads this device\'s choice without a schema, and nothing from a value it cannot read', () => {
    expect(defaultReminderOf(memory({[TASK_PLAN_KEY]: JSON.stringify({version: 1, defaultReminder: 0})}))).toBe(0);
    expect(defaultReminderOf(memory({[TASK_PLAN_KEY]: '{bad'}))).toBeNull();
    expect(defaultReminderOf(memory({[TASK_PLAN_KEY]: JSON.stringify({version: 2, defaultReminder: 5})}))).toBeNull();
    expect(withDeviceDefault<{due: string; reminders?: {before: number}[]}>({due: today}, memory({[TASK_PLAN_KEY]: JSON.stringify({version: 1, defaultReminder: 30})})).reminders).toEqual([{before: 30}]);
  });
});

describe('LEDGER #4 and #1: several tasks from one utterance, and the split suggestion', () => {
  it('splits speech at the words between to-dos and at "and" before a to-do verb', () => {
    expect(spokenTasks('buy milk and then call mum and also book the dentist on friday')!.items).toEqual(['buy milk', 'call mum', 'book the dentist on friday']);
    expect(spokenTasks('buy bread and butter and call the bank')!.items).toEqual(['buy bread and butter', 'call the bank']);
    expect(spokenTasks('koop melk en dan bel oma daarna betaal de huur')!.items).toEqual(['koop melk', 'bel oma', 'betaal de huur']);
    expect(spokenTasks('buy bread and butter')).toBeNull();
  });
  it('"remove that" takes the to-do said just before it away', () => {
    expect(spokenTasks('buy milk and then call mum remove that and then pay rent')).toEqual({items: ['buy milk', 'pay rent'], removed: ['call mum']});
    expect(spokenTasks('bel oma, haal dat weg, en dan koop melk')).toEqual({items: ['koop melk'], removed: ['bel oma']});
  });
  it('offers a long typed line as several tasks, never a short one', () => {
    expect(splitSuggestion('Call the bank about the new card and then book the dentist for Friday')).toEqual(['Call the bank about the new card', 'book the dentist for Friday']);
    expect(splitSuggestion('Call mum and then shop')).toBeNull();
  });
});

describe('LEDGER #31: reminders written inside notes', () => {
  const note = {id: 'n1', kind: 'topic' as const, title: 'Fictional house', body: 'Boiler\n@remind tomorrow 9:30 call the plumber\n⏰ friday\nno reminder here', createdAt: at.toISOString(), updatedAt: at.toISOString()};
  it('reads the moment and what it is about; a day alone is 09:00', () => {
    const list = remindersInNote(note as never, today, ZONE);
    expect(list.map(r => [r.line, r.day, r.time, r.what])).toEqual([[1, '2026-11-24', '09:30', 'call the plumber'], [2, '2026-11-27', '09:00', 'Fictional house']]);
  });
  it('lists those still ahead and reaches the notification plan as a note reminder (no Done)', () => {
    const now = instantAt(today, '10:00', ZONE), list = noteReminders({version: 1, notes: [note], voice: false} as never, today, ZONE, now);
    expect(list).toHaveLength(2);
    const plan = buildPlan({now, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '23:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], tasks: list.map(r => ({id: r.note.id, note: r.note.id, title: r.what, at: r.at}))});
    expect(plan.snapshot.items.filter(i => i.kind === 'task')[0]).toEqual({at: list[0]!.at, kind: 'task', id: `note:n1@${list[0]!.at}`, href: '/app/notes?note=n1', actionable: false});
  });
});

describe('LEDGER #15: a "years since" countdown', () => {
  it('counts up in days, years and months, never negative', () => {
    expect(yearsMonthsSince('2020-02-29', '2026-02-28')).toEqual({years: 6, months: 0});
    expect(yearsMonthsSince('2025-10-24', '2026-11-23')).toEqual({years: 1, months: 0});
    expect(sinceWords('2025-10-01', '2026-11-23')).toBe('418 days since · 1 year, 1 month');
    expect(sinceWords('2026-11-23', '2026-11-23')).toBe('Today: day 1');
    expect(sinceWords('2026-11-25', '2026-11-23')).toBe('In 2 days');
  });
  it('a "since" countdown leaves Passed for its own list; a yearly one says the years it marks', () => {
    const record = {version: 1 as const, items: [{id: 'q', title: 'Fictional quit day', date: '2025-10-01', createdAt: at.toISOString()}, {id: 'w', title: 'Fictional wedding', date: '2000-06-01', createdAt: at.toISOString()}]};
    const extras = withExtra(withExtra(emptyCountdownExtras(), 'q', {since: true}), 'w', {yearly: true});
    const s = splitWithExtras(record, extras, today);
    expect([s.since.map(c => c.id), s.passed.map(c => c.id), s.upcoming.map(c => c.id)]).toEqual([['q'], [], ['w']]);
    expect(yearsOnNext(record.items[1]!, s.upcoming[0]!.shown)).toBe(27);
    // An older caller that does not name `since` keeps it.
    expect(withExtra(extras, 'q', {yearly: false, remindDays: 7}).items.q).toEqual({remindDays: 7, since: true});
  });
});
