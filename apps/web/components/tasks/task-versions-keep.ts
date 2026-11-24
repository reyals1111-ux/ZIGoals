'use client';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {TASK_PLAN, type TaskVersion} from '../../lib/tasks/plan-record';
import {dropTaskVersions, keepTaskVersion, putBackTaskVersions} from '../../lib/tasks/versions';
import type {Task} from '../../lib/tasks/schema';

/**
 * Session AV lane 2 (rest, LEDGER #33): after a save that changed a task's title or notes, the words it replaced are kept
 * as an earlier version in this device's planning record. Loaded on its own after such a save, so the pages that edit
 * tasks carry none of it. Nothing is written over a planning record this device cannot read.
 */
export function keepVersion(before: Task, after: Pick<Task, 'title' | 'notes'>, liveIds: ReadonlySet<string>): void {
  try {
    const storage = getAppStorage();
    if (readDeviceRecord(storage, TASK_PLAN).unreadable) return;
    updateDeviceRecord(storage, TASK_PLAN, plan => keepTaskVersion(plan, before, after, {liveIds}));
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASK_PLAN.key}));
  } catch { /* the save itself stands; this version is not kept */ }
}
/**
 * Review b2a #5 (privacy): removing tasks removes their earlier versions from this device's planning record (so they are
 * not left in Export everything with no screen to show or delete them); returns them for the removal's Undo. Nothing is
 * written over a planning record this device cannot read.
 */
export function dropVersions(taskIds: ReadonlySet<string>): TaskVersion[] {
  try {
    const storage = getAppStorage();
    if (readDeviceRecord(storage, TASK_PLAN).unreadable) return [];
    let removed: TaskVersion[] = [];
    updateDeviceRecord(storage, TASK_PLAN, plan => { const out = dropTaskVersions(plan, taskIds); removed = out.removed; return out.plan; });
    if (removed.length) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASK_PLAN.key}));
    return removed;
  } catch { return []; /* the removal itself stands */ }
}
/** The removal's Undo: the versions back with their tasks. */
export function putBackVersions(versions: readonly TaskVersion[]): void {
  if (!versions.length) return;
  try {
    const storage = getAppStorage();
    if (readDeviceRecord(storage, TASK_PLAN).unreadable) return;
    updateDeviceRecord(storage, TASK_PLAN, plan => putBackTaskVersions(plan, versions));
    window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: TASK_PLAN.key}));
  } catch { /* the tasks are back; their versions are not */ }
}
