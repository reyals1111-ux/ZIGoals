import {describe, expect, it} from 'vitest';
import {emptyTasks, TASKS, TASKS_KEY} from './schema';
import {BUILT_IN_TEMPLATES, MAX_REPEATS, TASK_TEMPLATES, emptyTaskTemplates, taskTemplatesSchema} from './templates';
import {addRepeat, dueRepeats, markRepeats, nextRepeat, pauseRepeat, removeRepeat, repeatIssue, repeatPeriod, repeatProjectName, repeatWords, restoreRepeat, runRepeats} from './repeat-projects';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (rest, LEDGER #17; Things' repeating projects): a project from a template comes round by itself. */
const reset = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-reset')!, moving = BUILT_IN_TEMPLATES.find(t => t.id === 'builtin-moving')!;
const at = new Date('2026-11-23T08:00:00Z');
let seq = 0;
const ids = () => `x${++seq}`;
const weekly = (madeFor?: string) => addRepeat(emptyTaskTemplates(), {name: 'Weekly reset', every: 'week', start: '2026-11-23', items: reset.items}, {id: 'r1', ...(madeFor ? {madeFor} : {})});

describe('periods', () => {
  it('a week, a number of days and a month, each counted from the first day', () => {
    expect(repeatPeriod({every: 'week', start: '2026-11-23'}, '2026-11-22')).toBeNull();
    expect(repeatPeriod({every: 'week', start: '2026-11-23'}, '2026-11-23')).toBe('2026-11-23');
    expect(repeatPeriod({every: 'week', start: '2026-11-23'}, '2026-12-06')).toBe('2026-11-30');
    expect(repeatPeriod({every: 'days', days: 10, start: '2026-11-23'}, '2026-12-13')).toBe('2026-12-13');
    expect(repeatPeriod({every: 'days', days: 10, start: '2026-11-23'}, '2026-12-12')).toBe('2026-12-03');
    expect(repeatPeriod({every: 'month', start: '2026-11-15'}, '2027-01-14')).toBe('2026-12-15');
    expect(repeatPeriod({every: 'month', start: '2026-12-15'}, '2027-01-20')).toBe('2027-01-15');
    // A first day after the 28th comes round on the 28th; its first period is the first day itself.
    expect(repeatPeriod({every: 'month', start: '2026-11-30'}, '2026-11-30')).toBe('2026-11-30');
    expect(repeatPeriod({every: 'month', start: '2026-11-30'}, '2027-02-28')).toBe('2027-02-28');
    expect(nextRepeat({every: 'week', start: '2026-11-23'}, '2026-11-25')).toBe('2026-11-30');
    expect(nextRepeat({every: 'month', start: '2026-12-05'}, '2026-12-31')).toBe('2027-01-05');
    expect(nextRepeat({every: 'week', start: '2026-12-01'}, '2026-11-25')).toBe('2026-12-01');
    expect([repeatWords({every: 'week'}), repeatWords({every: 'month'}, 'nl'), repeatWords({every: 'days', days: 3})]).toEqual(['every week', 'elke maand', 'every 3 days']);
  });
});

describe('making the project when its time comes (on open)', () => {
  it('made once per period, named with its day, its tasks counted from that day; never for missed periods; never twice', () => {
    const t = weekly('2026-11-23');
    expect(dueRepeats(t, '2026-11-29')).toEqual([]);
    expect(dueRepeats(t, '2026-11-30').map(r => r.id)).toEqual(['r1']);
    const first = runRepeats(emptyTasks(), t, {today: '2026-12-15', at, ids});
    // Three weeks closed: one project, for the current week only.
    // Session AV lane 2 (review b2a #7: the project is named with the day as the app writes days, not an ISO day, deliberate)
    expect(first.made.map(m => m.name)).toEqual(['Weekly reset · Dec 14, 2026']);
    expect(first.tasks.projects!.map(p => p.name)).toEqual(['Weekly reset · Dec 14, 2026']);
    expect(first.tasks.tasks.filter(x => x.projectId === first.made[0]!.projectId).map(x => x.title)).toEqual(reset.items.map(i => i.title));
    expect(first.templates.repeats![0]!.lastMade).toBe('2026-12-14');
    const again = runRepeats(first.tasks, first.templates, {today: '2026-12-16', at, ids});
    expect(again.made).toEqual([]);
    expect(again.tasks).toBe(first.tasks);
    // A project an older build made ("Weekly reset · 2026-12-14") counts as made: never a second one for the period.
    const older = {...first.tasks, projects: first.tasks.projects!.map(p => ({...p, name: 'Weekly reset · 2026-12-14'}))};
    expect(runRepeats(older, weekly('2026-11-23'), {today: '2026-12-15', at, ids}).made).toEqual([]);
  });
  it('days come from the period start; a project of that name already there counts as made', () => {
    const t = addRepeat(emptyTaskTemplates(), {name: 'Moving house', every: 'month', start: '2026-11-01', items: moving.items}, {id: 'm'});
    const out = runRepeats(emptyTasks(), t, {today: '2026-11-23', at, ids});
    expect(out.tasks.tasks.find(x => x.title === 'Hand over the keys')!.due).toBe('2026-12-13');
    const twin = runRepeats(out.tasks, t, {today: '2026-11-23', at, ids});
    expect(twin.made).toEqual([]);
    expect(twin.templates.repeats![0]!.lastMade).toBe('2026-11-01');
    expect(markRepeats(t, '2026-11-23').repeats![0]!.lastMade).toBe('2026-11-01');
  });
  it('a paused repeat makes nothing; resumed, its current period comes', () => {
    const p = pauseRepeat(weekly('2026-11-23'), 'r1', true);
    expect(dueRepeats(p, '2026-12-01')).toEqual([]);
    const back = pauseRepeat(p, 'r1', false);
    expect(back.repeats![0]!.paused).toBeUndefined();
    expect(dueRepeats(back, '2026-12-01').map(r => r.id)).toEqual(['r1']);
  });
  it('names stay inside the project name limit', () => {
    expect(repeatProjectName({name: 'A'.repeat(60)}, '2026-11-23').length).toBeLessThanOrEqual(55);
  });
});

describe('adding, stopping and Undo', () => {
  it('checks the input; stop and its Undo put it back in place', () => {
    expect(repeatIssue(emptyTaskTemplates(), {name: ' ', every: 'week', start: '2026-11-23'})).toMatch(/name/);
    expect(repeatIssue(emptyTaskTemplates(), {name: 'A', every: 'days', days: 1, start: '2026-11-23'})).toMatch(/2 to 365/);
    expect(repeatIssue(weekly(), {name: 'weekly RESET', every: 'week', start: '2026-11-23'})).toMatch(/already repeats/);
    let full = emptyTaskTemplates();
    for (let i = 0; i < MAX_REPEATS; i++) full = addRepeat(full, {name: `R${i}`, every: 'week', start: '2026-11-23', items: reset.items}, {id: `r${i}`});
    expect(() => addRepeat(full, {name: 'One more', every: 'week', start: '2026-11-23', items: reset.items}, {id: 'z'})).toThrow(/Up to 10/);
    const two = addRepeat(weekly(), {name: 'Garden', every: 'days', days: 14, start: '2026-11-23', items: reset.items}, {id: 'r2'});
    const gone = removeRepeat(two, 'r1');
    expect(gone.record.repeats!.map(r => r.id)).toEqual(['r2']);
    expect(restoreRepeat(gone.record, gone.removed!, gone.at).repeats!.map(r => r.id)).toEqual(['r1', 'r2']);
  });
  it('older records without repeats read as none; a broken repeat is dropped, the rest kept', () => {
    expect(taskTemplatesSchema.parse({version: 1, items: []}).repeats).toBeUndefined();
    const parsed = taskTemplatesSchema.parse({version: 1, items: [], repeats: [{id: 'bad'}, weekly().repeats![0]]});
    expect(parsed.repeats!.map(r => r.id)).toEqual(['r1']);
    expect(taskTemplatesSchema.parse({version: 1, items: [], repeats: 'nonsense'}).repeats).toBeUndefined();
  });
});

describe('export, erase and restore keep the repeats', () => {
  it('round-trips through the export helpers', async () => {
    const templates = pauseRepeat(weekly('2026-11-23'), 'r1', true);
    const m = new Map<string, string>([[TASKS_KEY, JSON.stringify(emptyTasks())], [TASK_TEMPLATES.key, JSON.stringify(templates)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage);
    const exported = texts[TASK_TEMPLATES.key] ?? storage.getItem(TASK_TEMPLATES.key)!;
    storage.clear();
    expect(readDeviceRecord(storage, TASK_TEMPLATES).data.repeats).toBeUndefined();
    storage.setItem(TASK_TEMPLATES.key, exported);
    expect(readDeviceRecord(storage, TASK_TEMPLATES).data).toEqual(templates);
    expect(readDeviceRecord(storage, TASKS).data.tasks).toEqual([]);
  });
});
