import {describe, expect, it} from 'vitest';
import {addTask, editTask} from './engine';
import {emptyTasks, TASKS_KEY} from './schema';
import {TASK_PLAN, emptyTaskPlan, taskPlanSchema, TASK_VERSIONS_PER_TASK} from './plan-record';
import {capTaskVersions, deleteTaskVersion, deleteTaskVersions, keepTaskVersion, putBackTaskVersions, taskVersionsOf} from './versions';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (rest, LEDGER #33; Notion's version history for a task, as notes and the journal have it). */
const at = new Date('2026-11-23T08:00:00Z'), today = '2026-11-23';
const base = addTask(emptyTasks(), {title: 'Fictional draft', notes: 'First words'}, {id: 'task_a', at, today});
const task = base.tasks[0]!;
const edited = (title: string, notes?: string) => editTask(base, 'task_a', {title, notes: notes ?? null}, today).tasks[0]!;

describe('keeping versions', () => {
  it('a save that changes the title or notes keeps what it replaced; an unchanged save keeps nothing', () => {
    expect(keepTaskVersion(emptyTaskPlan(), task, task)).toEqual(emptyTaskPlan());
    const p = keepTaskVersion(emptyTaskPlan(), task, edited('Fictional draft', 'Second words'), {id: 'v1'});
    expect(p.versions).toEqual([{id: 'v1', taskId: 'task_a', title: 'Fictional draft', notes: 'First words', savedAt: task.createdAt}]);
    // The same words are not kept twice.
    expect(keepTaskVersion(p, task, edited('Other'), {id: 'v2'}).versions!.map(v => v.id)).toEqual(['v1']);
    expect(taskVersionsOf(p, 'task_a')[0]!.notes).toBe('First words');
  });
  it('at most ten per task, newest kept; none for a task that is gone; the characters bounded', () => {
    let p = emptyTaskPlan();
    for (let i = 0; i < TASK_VERSIONS_PER_TASK + 3; i++) p = keepTaskVersion(p, {...task, title: `T${i}`}, {title: `T${i + 1}`}, {id: `v${i}`});
    expect(p.versions!.map(v => v.title)).toEqual(Array.from({length: 10}, (_, i) => `T${i + 3}`));
    expect(taskVersionsOf(p, 'task_a')[0]!.title).toBe('T12');
    expect(keepTaskVersion(p, {...task, id: 'task_b', title: 'B'}, {title: 'B2'}, {id: 'vb', liveIds: new Set(['task_b'])}).versions!.map(v => v.id)).toEqual(['vb']);
    const big = Array.from({length: 60}, (_, i) => ({id: `w${i}`, taskId: `t${i}`, title: 'x'.repeat(140), notes: 'y'.repeat(5000), savedAt: at.toISOString()}));
    expect(capTaskVersions(big).length).toBe(38);
  });
});

describe('deleting versions, with Undo', () => {
  const p = keepTaskVersion(keepTaskVersion(emptyTaskPlan(), task, edited('B'), {id: 'v1'}), {...task, title: 'B', updatedAt: '2026-11-23T09:00:00.000Z'}, {title: 'C'}, {id: 'v2'});
  it('deletes one version and puts it back in its place', () => {
    const out = deleteTaskVersion(p, 'v1');
    expect(out.plan.versions!.map(v => v.id)).toEqual(['v2']);
    expect(putBackTaskVersions(out.plan, [out.removed!]).versions!.map(v => v.id)).toEqual(['v1', 'v2']);
    expect(deleteTaskVersion(p, 'nope').removed).toBeNull();
  });
  it('deletes all of a task’s earlier versions, and Undo brings them all back', () => {
    const out = deleteTaskVersions(p, 'task_a');
    expect(out.plan.versions).toEqual([]);
    expect(out.removed.map(v => v.id)).toEqual(['v1', 'v2']);
    expect(putBackTaskVersions(out.plan, out.removed)).toEqual(p);
  });
  it('older planning records read without versions; a broken version is dropped, the rest kept', () => {
    expect(taskPlanSchema.parse({version: 1}).versions).toBeUndefined();
    expect(taskPlanSchema.parse({version: 1, versions: [{id: 'bad'}, p.versions![0]]}).versions!.map(v => v.id)).toEqual(['v1']);
    expect(taskPlanSchema.parse({version: 1, versions: 7}).versions).toBeUndefined();
  });
});

describe('export, erase and restore keep the versions', () => {
  it('round-trips through the export helpers', async () => {
    const plan = keepTaskVersion(emptyTaskPlan(), task, edited('B'), {id: 'v1'});
    const m = new Map<string, string>([[TASKS_KEY, JSON.stringify(base)], [TASK_PLAN.key, JSON.stringify(plan)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage);
    const exported = texts[TASK_PLAN.key] ?? storage.getItem(TASK_PLAN.key)!;
    storage.clear();
    expect(readDeviceRecord(storage, TASK_PLAN).data.versions).toBeUndefined();
    storage.setItem(TASK_PLAN.key, exported);
    expect(readDeviceRecord(storage, TASK_PLAN).data).toEqual(plan);
  });
});
