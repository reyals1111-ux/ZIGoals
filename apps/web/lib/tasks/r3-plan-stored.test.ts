// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {eraseEverything} from '../erase-everything';
import {planParts} from '../restore/plan';
import {openBackup} from '../restore/read-backup';
import {applyRestore, forgetRestoreUndo} from '../restore/apply';
import {TASKS_KEY, tasksSchema} from './schema';
import {TASK_PLAN_KEY, setPlanPrefs, setTimerNote, startTimer, stopTimer, taskPlanSchema, emptyTaskPlan} from './plan-record';
import {DAY_TIMELINE, DATED_TIME_KEY, dayTimelineSchema, datedTimeKey, dropPastDated, setTime, timeOn, TIME_KEY} from '../timeline/store';
import {FOCUS_SESSIONS_KEY, focusSessionsSchema} from '../focus-sessions/schema';
import {CYCLE_KEY, cycleOnPlan, cycleSchema} from '../cycle/store';
import {setCycleOnPlan} from '../cycle/engine';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema} from '../ui-prefs/schema';

/**
 * Session AV lane 2 (r3-plan; TIER 3 (stored formats), additive only): every new optional field of round 3's planning rows
 * survives Export everything → Erase everything → Restore (replace), read back exactly as written; a value this build
 * cannot read is dropped on read, never failing its record; older readers' keys stay as they are.
 */
const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
async function roundTrip(records: Record<string, unknown>): Promise<Record<string, unknown>> {
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)]));
  const zip = buildEverythingZip(collectEverything(values, APP), {date: '2026-11-22', showcase: false, now: NOW});
  const opened = await openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  await eraseEverything({localStorage, sessionStorage, indexedDB: null});
  for (const k of Object.keys(values)) expect(localStorage.getItem(k)).toBeNull();
  const parts = planParts(opened.json).filter(p => Object.keys(values).includes(p.key));
  expect(parts.length).toBe(Object.keys(values).length);
  const outcome = await applyRestore(opened, parts.map(part => ({part, mode: 'replace' as const})), {vision: false, progress: false});
  expect(outcome.failed).toEqual([]);
  return Object.fromEntries(Object.keys(values).map(k => [k, JSON.parse(localStorage.getItem(k) ?? 'null')]));
}
/** The Day Timeline's moves and display choices are exported and erased, never restored (lib/restore/plan.ts NEVER_RESTORED). */
async function exportAndErase(records: Record<string, unknown>, names: Record<string, string>): Promise<Record<string, unknown>> {
  const values = Object.fromEntries(Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)]));
  const device = collectEverything(values, APP).json.device as Record<string, unknown>;
  for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
  await eraseEverything({localStorage, sessionStorage, indexedDB: null});
  for (const k of Object.keys(values)) expect(localStorage.getItem(k)).toBeNull();
  return Object.fromEntries(Object.entries(names).map(([k, name]) => [k, device[name]]));
}
const at = '2026-11-20T10:00:00.000Z', HABIT = '0f8fad5b-d9cb-469f-a165-70867728950e';
const TASKS = tasksSchema.parse({version: 1, tasks: [
  {id: 't1', title: 'Fictional run', priority: 'normal', createdAt: at, due: '2026-11-23', look: {glyph: '★', colour: 'teal'}, energy: 'heavy', minutes: 60},
  {id: 't2', title: 'Fictional nap', priority: 'normal', createdAt: at, energy: 'restful'},
]});
const PLAN = setTimerNote(startTimer(setPlanPrefs(emptyTaskPlan(), {planTime: '07:15', energyAmount: 24}), 't1', 1_000), 't1', 'Halfway: the hill');
const TIMELINE = setTime(setTime({version: 1, times: {}}, `habit:${HABIT}`, '07:00'), datedTimeKey('2026-11-24', `habit:${HABIT}`), '09:30', 45);
const FOCUS = focusSessionsSchema.parse({version: 1, sessions: [{id: 'focus_abcdefgh-1', startedAt: at, endedAt: '2026-11-20T10:25:00.000Z', day: '2026-11-20', plannedMinutes: 25, focusedSeconds: 1500, awaySeconds: 0, outcome: 'grown', mode: 'pomodoro', block: 1, taskId: 't1', note: 'Call Noor about the fictional draft'}]});
const CYCLE = setCycleOnPlan(cycleSchema.parse({version: 1, on: true, days: {'2026-11-02': {flow: 'medium'}}}), true);
const PREFS = uiPrefsSchema.parse({version: 1, look: {font: 'reading'}});

describe('Session AV lane 2 (r3-plan): new fields survive export, erase and restore', () => {
  test('tasks: look and energy; the planning record: the plan-your-day time, the energy amount, a timer note', async () => {
    const back = await roundTrip({[TASKS_KEY]: TASKS, [TASK_PLAN_KEY]: PLAN});
    expect(tasksSchema.parse(back[TASKS_KEY])).toEqual(TASKS);
    expect(taskPlanSchema.parse(back[TASK_PLAN_KEY])).toEqual(PLAN);
    expect(PLAN).toMatchObject({planReminder: {time: '07:15'}, energyAmount: 24, timers: [{taskId: 't1', note: 'Halfway: the hill'}]});
    expect(TASKS.tasks[0]).toMatchObject({look: {glyph: '★', colour: 'teal'}, energy: 'heavy'});
  });
  test('focus notes and the cycle on the plan round-trip; a dated timeline move and the reading font are exported and erased (never restored, as before)', async () => {
    const back = await roundTrip({[FOCUS_SESSIONS_KEY]: FOCUS, [CYCLE_KEY]: CYCLE});
    expect(focusSessionsSchema.parse(back[FOCUS_SESSIONS_KEY])).toEqual(FOCUS);
    expect(cycleSchema.parse(back[CYCLE_KEY])).toEqual(CYCLE);
    const kept = await exportAndErase({[DAY_TIMELINE.key]: TIMELINE, [UI_PREFS_KEY]: PREFS}, {[DAY_TIMELINE.key]: 'dayTimeline', [UI_PREFS_KEY]: 'uiPrefs'});
    expect(dayTimelineSchema.parse(kept[DAY_TIMELINE.key])).toEqual(TIMELINE);
    expect(uiPrefsSchema.parse(kept[UI_PREFS_KEY])).toEqual(PREFS);
  });
});
describe('tolerant reads and older readers', () => {
  test('a value this build cannot read is dropped, never the record', () => {
    const odd = tasksSchema.parse({version: 1, tasks: [{id: 'x', title: 'Odd', priority: 'normal', createdAt: at, look: {glyph: '☃', colour: 'teal'}, energy: 'extreme'}]});
    expect(odd.tasks[0]!.look).toBeUndefined(); expect(odd.tasks[0]!.energy).toBeUndefined();
    const plan = taskPlanSchema.parse({version: 1, planReminder: {time: '25:00'}, energyAmount: 0, timers: [{taskId: 't1', since: 5, note: 7}]});
    expect(plan.planReminder).toBeUndefined(); expect(plan.energyAmount).toBeUndefined(); expect(plan.timers?.[0]?.note).toBeUndefined();
    expect(focusSessionsSchema.parse({...FOCUS, sessions: [{...FOCUS.sessions[0]!, note: 'x'.repeat(3000)}]}).sessions[0]!.note).toBeUndefined();
    expect(cycleSchema.parse({version: 1, days: {}, plan: 'yes'}).plan).toBeUndefined();
    expect(uiPrefsSchema.parse({version: 1, look: {font: 'comic'}}).look?.font).toBeUndefined();
  });
  test('a dated move is not a key an older build reads; it wins on its date only and leaves once its day has passed', () => {
    const dated = datedTimeKey('2026-11-24', `habit:${HABIT}`);
    expect(TIME_KEY.test(dated)).toBe(false);
    expect(DATED_TIME_KEY.test(dated)).toBe(true);
    expect(timeOn(TIMELINE.times, `habit:${HABIT}`, '2026-11-24')).toEqual({time: '09:30', minutes: 45});
    expect(timeOn(TIMELINE.times, `habit:${HABIT}`, '2026-11-25')).toEqual({time: '07:00'});
    expect(Object.keys(dropPastDated(TIMELINE, '2026-11-25').times)).toEqual([`habit:${HABIT}`]);
    expect(dropPastDated(TIMELINE, '2026-11-24')).toBe(TIMELINE);
  });
  test('the planning choices set and clear; a timer note leaves with its timer', () => {
    const plan = setPlanPrefs(PLAN, {planTime: null, energyAmount: null});
    expect(plan.planReminder).toBeUndefined(); expect(plan.energyAmount).toBeUndefined();
    expect(() => setPlanPrefs(PLAN, {planTime: '7am'})).toThrow();
    const stopped = stopTimer(PLAN, 't1', 61_000);
    expect(stopped.note).toBe('Halfway: the hill'); expect(stopped.plan.timers).toBeUndefined();
    expect(setTimerNote(PLAN, 't1', '  ').timers?.[0]?.note).toBeUndefined();
    expect(cycleOnPlan(CYCLE)).toBe(true); expect(cycleOnPlan(setCycleOnPlan(CYCLE, false))).toBe(false);
  });
});
