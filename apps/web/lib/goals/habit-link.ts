/**
 * Session AL third pass (L4; MO-126, P-MO-91): link a habit the person already has to a Goal (the goal page only offered
 * "Add weekly Goal review habit"). The habit's existing optional `goalLink` is set, as Habits and Delete already do; its
 * rules, check-ins and history are unchanged. Only a habit with no goal link and not archived is offered.
 */
import {goalLinkMatches, latestHabitRule, type Habit, type HabitData} from '../habits';

export type GoalLink = NonNullable<Habit['goalLink']>;
export const privateGoalLink = (goalId: string): GoalLink => ({chainId: 'private', owner: 'local', goalId});

/** Habits that can be linked to a Goal now: active or paused, no goal link yet; alphabetical. */
export function linkableHabits(data: HabitData): Habit[] {
 return data.habits.filter(h => !h.goalLink && latestHabitRule(h).state !== 'archived').sort((a, b) => a.title.localeCompare(b.title));
}

/** Links `habitId` to `goalId`. Refuses a habit that is gone or already supports a Goal (never moves it silently). */
export function linkHabitToGoal(data: HabitData, habitId: string, goalId: string, now = new Date()): HabitData {
 const habit = data.habits.find(h => h.id === habitId);
 if (!habit) throw Error('This habit is no longer available. Refresh and try again.');
 if (habit.goalLink && !goalLinkMatches(habit.goalLink, privateGoalLink(goalId))) throw Error('This habit already supports another goal. Unlink it there first.');
 if (habit.goalLink) return data;
 const at = now.toISOString() > habit.updatedAt ? now.toISOString() : habit.updatedAt;
 return {...data, habits: data.habits.map(h => h.id === habitId ? {...h, goalLink: privateGoalLink(goalId), updatedAt: at} : h)};
}

/** Undo of a link made here: only while it still points at this Goal. */
export function unlinkHabitFromGoal(data: HabitData, habitId: string, goalId: string, now = new Date()): HabitData {
 const habit = data.habits.find(h => h.id === habitId);
 if (!habit || !goalLinkMatches(habit.goalLink, privateGoalLink(goalId))) return data;
 const at = now.toISOString() > habit.updatedAt ? now.toISOString() : habit.updatedAt;
 return {...data, habits: data.habits.map(h => h.id === habitId ? {...h, goalLink: undefined, updatedAt: at} : h)};
}
