import type {GoalExtra, GoalExtras} from '../goal-extras/store';

/** Puts one goal's extras back as they were (or removes them when there were none): the goal extras' one Undo. */
export function restoreGoal(current: GoalExtras, goalKey: string, before: GoalExtra | undefined): GoalExtras {
  const goals = {...current.goals};
  if (before) goals[goalKey] = before; else delete goals[goalKey];
  return {...current, goals};
}
