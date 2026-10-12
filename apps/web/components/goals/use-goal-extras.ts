'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS, type GoalExtra, type GoalExtras} from '../../lib/goal-extras/store';
import {getAccountScope} from '../../lib/account-session';
import {showToast} from '../ui/undo-toast';

/** This device's goal extras (Session AA-Cloud Part 2). Edits are refused while the record cannot be read, so an unreadable record is never overwritten. */
export function useGoalExtras() {
  const record = useDeviceRecord(GOAL_EXTRAS);
  const writable = record.loaded && !record.unreadable;
  /** Applies a pure change and offers Undo, which puts back only that goal's extras as they were. */
  function change(goalKey: string, next: (current: GoalExtras) => GoalExtras, message: string) {
    if (!writable) { showToast({message: 'Your goal details on this device could not be read, so nothing was changed.'}); return; }
    const before: GoalExtra | undefined = record.data.goals[goalKey];
    try {
      record.update(next);
      showToast({message, undo: () => record.update(current => restoreGoal(current, goalKey, before)), undone: 'Change undone.'});
    } catch (e) {
      showToast({message: e instanceof Error && e.message ? e.message : 'That change could not be saved on this device.'});
    }
  }
  return {...record, writable, change};
}
/** Puts one goal's extras back as they were (or removes them when there were none). */
export function restoreGoal(current: GoalExtras, goalKey: string, before: GoalExtra | undefined): GoalExtras {
  const goals = {...current.goals};
  if (before) goals[goalKey] = before; else delete goals[goalKey];
  return {...current, goals};
}
export {useAverageGoals} from './use-average-goals';

/** The scope a vision photo is kept under: the signed-in account, or "local". */
export const visionScope = () => getAccountScope() ?? 'local';
