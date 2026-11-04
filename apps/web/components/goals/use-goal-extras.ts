'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS, type GoalExtra, type GoalExtras} from '../../lib/goal-extras/store';
import {getAccountScope} from '../../lib/account-session';
import {showStatus, showUndo} from '../ui/undo-toast';
import {restoreGoal} from '../../lib/goals/extras-restore';

/** This device's goal extras (Session AA-Cloud Part 2). Edits are refused while the record cannot be read, so an unreadable record is never overwritten. */
export function useGoalExtras() {
  const record = useDeviceRecord(GOAL_EXTRAS);
  const writable = record.loaded && !record.unreadable;
  /** Applies a pure change and offers Undo, which puts back only that goal's extras as they were. */
  function change(goalKey: string, next: (current: GoalExtras) => GoalExtras, message: string) {
    if (!writable) { showStatus('Your goal details on this device could not be read, so nothing was changed.'); return; }
    const before: GoalExtra | undefined = record.data.goals[goalKey];
    try {
      record.update(next);
      showUndo({message, restore: () => record.update(current => restoreGoal(current, goalKey, before)), undone: 'Change undone.'}); // Session AL (A7): the one Undo
    } catch (e) {
      showStatus(e instanceof Error && e.message ? e.message : 'That change could not be saved on this device.');
    }
  }
  return {...record, writable, change};
}
export {restoreGoal} from '../../lib/goals/extras-restore';
export {useAverageGoals} from './use-average-goals';

/** The scope a vision photo is kept under: the signed-in account, or "local". */
export const visionScope = () => getAccountScope() ?? 'local';
