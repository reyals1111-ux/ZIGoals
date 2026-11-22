import {ENERGY_AMOUNT_DEFAULT} from './plan-record';
import {TASK_ENERGY, type Task, type TaskEnergy} from './schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): how much the day's tasks ask, from each task's own
 * energy (restful, neutral, light, medium, heavy) and its length. Points per half hour: restful −1 (it gives some back),
 * neutral 0, light 1, medium 2, heavy 3; a task without minutes counts as half an hour; background tasks are left out. The
 * total is held against the amount the person set (20 when not set) and said in calm words — room for more, near your
 * amount, more than your amount — never in red and never as a warning. A heavy task with a time outside the day's focus
 * window (lib/sleep/focus-window.ts, from the person's own sleep) gets a quiet mark. Pure.
 */
export const ENERGY_POINTS: Record<TaskEnergy, number> = {restful: -1, neutral: 0, light: 1, medium: 2, heavy: 3};
export const ENERGY_WORDS: Record<TaskEnergy, string> = {restful: 'Restful', neutral: 'Neutral', light: 'Light', medium: 'Medium', heavy: 'Heavy'};
export const ENERGY_HINTS: Record<TaskEnergy, string> = {restful: 'gives some energy back (a walk, a nap, a call with a friend)', neutral: 'neither tiring nor restful', light: 'easy going', medium: 'takes some effort', heavy: 'takes a lot out of you'};
export const NEAR_SHARE = 0.75, HALF_HOUR = 30;
export {TASK_ENERGY, ENERGY_AMOUNT_DEFAULT};
export type EnergyState = 'room' | 'near' | 'over';
export type DayEnergy = {total: number; amount: number; state: EnergyState; rated: number; unrated: number; heavyOutside: Task[]};
/** One task's points: its energy's points for each half hour it takes (at least one half hour). */
export function taskPoints(task: Pick<Task, 'energy' | 'minutes'>): number {
  if (!task.energy) return 0;
  return ENERGY_POINTS[task.energy] * Math.max(1, Math.round((task.minutes ?? HALF_HOUR) / HALF_HOUR));
}
const minutesOf = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
/** The day's energy from its open tasks (subtasks and background tasks left out). */
export function dayEnergy(tasks: readonly Task[], amount: number = ENERGY_AMOUNT_DEFAULT, window: {from: number; to: number} | null = null): DayEnergy {
  const open = tasks.filter(t => !t.doneAt && !t.parentId && !t.parallel), rated = open.filter(t => t.energy);
  const total = Math.max(0, rated.reduce((n, t) => n + taskPoints(t), 0)), safe = Math.max(1, amount);
  const state: EnergyState = total > safe ? 'over' : total >= safe * NEAR_SHARE ? 'near' : 'room';
  const heavyOutside = window ? rated.filter(t => t.energy === 'heavy' && t.time && (minutesOf(t.time) < window.from || minutesOf(t.time) >= window.to)) : [];
  return {total, amount: safe, state, rated: rated.length, unrated: open.length - rated.length, heavyOutside};
}
/** The day's line, in plain calm words. */
export function energyLine(e: DayEnergy): string {
  const said = e.state === 'room' ? 'room for more' : e.state === 'near' ? 'near your amount' : 'more than your amount: a restful task, or moving one to another day, gives some room';
  return `Energy today: about ${e.total} of your ${e.amount} — ${said}.`;
}
