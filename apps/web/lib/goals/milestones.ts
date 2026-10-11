import type {PrivateGoal} from '../positions';
import {milestoneDatesSchema, type MilestoneDates} from './milestone-dates';

/**
 * Milestones as a real feature (Session W Part 11). A milestone keeps its title, done and optional target value where
 * the Goal keeps them (finance v4's existing fields); its target date lives in this device's `zigoals:milestone-dates:v1`
 * (finance v5's milestone `targetDate` is its synced home, written by a later switch PR). A milestone with a target value
 * shows where it sits on the Goal's progress bar and reads "reached" once the recorded progress passes it; "done" stays
 * the person's own tick. A reached or done milestone gets one calm note per device.
 */
export type Milestone = PrivateGoal['milestones'][number];
export type MilestoneState = 'done' | 'reached' | 'open';
export function milestoneState(m: Milestone, current: bigint): MilestoneState {
  if (m.done) return 'done';
  return m.target !== undefined && current >= BigInt(m.target) ? 'reached' : 'open';
}
/** Where milestones with a target value sit along the bar, as fractions of the Goal's target (0–1), in order. */
export function milestoneMarks(goal: PrivateGoal): {id: string; title: string; at: number}[] {
  const target = BigInt(goal.target);
  if (goal.type === 'PROJECT' || target <= 0n) return [];
  return goal.milestones.filter(m => m.target !== undefined && BigInt(m.target) > 0n && BigInt(m.target) <= target)
    .map(m => ({id: m.id, title: m.title, at: Number(BigInt(m.target!) * 10_000n / target) / 10_000}))
    .sort((a, b) => a.at - b.at);
}
export const milestoneDateOf = (dates: MilestoneDates, goalId: string, milestoneId: string): string | undefined => dates.dates[goalId]?.[milestoneId];
/** Sets or clears one milestone's target date on this device. */
export function setMilestoneDate(dates: MilestoneDates, goalId: string, milestoneId: string, date: string | null): MilestoneDates {
  const goal = {...(dates.dates[goalId] ?? {})};
  if (date) goal[milestoneId] = date; else delete goal[milestoneId];
  const next = {...dates.dates};
  if (Object.keys(goal).length) next[goalId] = goal; else delete next[goalId];
  return milestoneDatesSchema.parse({...dates, dates: next});
}
/** Dates whose milestone or Goal no longer exists, removed (a tidy-up after a milestone is deleted). */
export function pruneMilestoneDates(dates: MilestoneDates, goals: readonly Pick<PrivateGoal, 'id' | 'milestones'>[]): MilestoneDates {
  const next: MilestoneDates['dates'] = {};
  for (const [goalId, byMilestone] of Object.entries(dates.dates)) {
    const goal = goals.find(g => g.id === goalId); if (!goal) continue;
    const kept = Object.fromEntries(Object.entries(byMilestone).filter(([id]) => goal.milestones.some(m => m.id === id)));
    if (Object.keys(kept).length) next[goalId] = kept;
  }
  return JSON.stringify(next) === JSON.stringify(dates.dates) ? dates : milestoneDatesSchema.parse({...dates, dates: next});
}
export const milestoneNoteId = (goalId: string, milestoneId: string) => `milestone:${goalId}:${milestoneId}`;
