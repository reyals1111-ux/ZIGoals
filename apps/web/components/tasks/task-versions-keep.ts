'use client';
import {readDeviceRecord, updateDeviceRecord} from '../../lib/device-record';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {getAppStorage} from '../../lib/showcase-storage';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {keepTaskVersion} from '../../lib/tasks/versions';
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
