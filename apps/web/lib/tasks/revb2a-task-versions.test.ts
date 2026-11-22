// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from 'vitest';
import {TASK_PLAN, emptyTaskPlan, type TaskPlan, type TaskVersion} from './plan-record';
import {dropTaskVersions, putBackTaskVersions} from './versions';
import {readDeviceRecord} from '../device-record';
import {dropVersions, putBackVersions} from '../../components/tasks/task-versions-keep';

/**
 * Session AV lane 2 (review b2a #5, privacy): removing a task removes its earlier versions (and its subtasks') from the
 * planning record, so the old words do not stay in Export everything with no screen to show or delete them; the
 * removal's Undo puts them back. No stored change: `versions` is the existing field, only its entries go.
 */
const v = (id: string, taskId: string, savedAt: string, notes?: string): TaskVersion => ({id, taskId, title: `Title ${id}`, ...(notes ? {notes} : {}), savedAt});
const plan: TaskPlan = {...emptyTaskPlan(), versions: [v('v1', 'task_a', '2026-11-20T08:00:00.000Z', 'a private line'), v('v2', 'task_b', '2026-11-20T09:00:00.000Z'), v('v3', 'task_sub', '2026-11-20T10:00:00.000Z'), v('v4', 'task_a', '2026-11-21T08:00:00.000Z')]};

describe('a removed task’s versions go with it', () => {
  it('pure: the removed tasks’ versions leave, the others stay; Undo puts them back in order', () => {
    const out = dropTaskVersions(plan, new Set(['task_a', 'task_sub']));
    expect(out.plan.versions!.map(x => x.id)).toEqual(['v2']);
    expect(out.removed.map(x => x.id)).toEqual(['v1', 'v3', 'v4']);
    expect(putBackTaskVersions(out.plan, out.removed).versions!.map(x => x.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    expect(dropTaskVersions(plan, new Set(['task_none'])).plan).toBe(plan);
    expect(dropTaskVersions({...emptyTaskPlan(), versions: [v('v9', 'task_z', '2026-11-20T08:00:00.000Z')]}, new Set(['task_z'])).plan.versions).toBeUndefined();
  });
  describe('on the device', () => {
    beforeEach(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(TASK_PLAN.key, JSON.stringify(plan)); });
    it('the planning record no longer holds the words; Undo writes them back', () => {
      const removed = dropVersions(new Set(['task_a']));
      expect(removed.map(x => x.id)).toEqual(['v1', 'v4']);
      expect(localStorage.getItem(TASK_PLAN.key)).not.toContain('a private line');
      expect(readDeviceRecord(localStorage, TASK_PLAN).data.versions!.map(x => x.id)).toEqual(['v2', 'v3']);
      putBackVersions(removed);
      expect(readDeviceRecord(localStorage, TASK_PLAN).data.versions!.map(x => x.id)).toEqual(['v1', 'v2', 'v3', 'v4']);
    });
    it('a planning record this device cannot read is never written over', () => {
      localStorage.setItem(TASK_PLAN.key, '{not json');
      expect(dropVersions(new Set(['task_a']))).toEqual([]);
      expect(localStorage.getItem(TASK_PLAN.key)).toBe('{not json');
    });
  });
});
