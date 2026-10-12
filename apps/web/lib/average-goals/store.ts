import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * G8, "keep an average" (Session AA-Cloud Part 2, `[TIER 3] (storage)`): a fifth kind of goal, such as 7 h of sleep a
 * night or 8,000 steps a day, over a rolling window. It lives on this device only, in its own key, so the synced goal
 * record (four types, strict) is untouched and #32–#37 never meet it (ADR-021 A3). Where Health already records the
 * measure (sleep, steps, water) the days come from Health; otherwise, and for a "custom" measure, from the person's own
 * entries here. A day without a value is left out of the average, never counted as zero, and the average says how
 * many days it rests on. Mutators are pure (for ZIGi card kinds later, docs/handoff/AA_CLOUD_TO_LOCAL.md). The averages
 * themselves, read from Health, are in ./progress.ts, so a page that only lists the goals loads no Health engine.
 */
export const AVERAGE_GOALS_KEY = 'zigoals:average-goals:v1';
export const AVERAGE_METRICS = {
  'sleep-hours': {label: 'Sleep', unit: 'h a night', source: 'health', decimals: 1},
  steps: {label: 'Steps', unit: 'steps a day', source: 'health', decimals: 0},
  'water-ml': {label: 'Water', unit: 'mL a day', source: 'health', decimals: 0},
  custom: {label: 'Your own measure', unit: '', source: 'manual', decimals: 1},
} as const;
export type AverageMetric = keyof typeof AVERAGE_METRICS;
export const WINDOWS = [7, 14, 30] as const;
const day = z.iso.date();
const entrySchema = z.looseObject({day, value: z.number().finite().min(0).max(1_000_000)});
export const averageGoalSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(100),
  metric: z.enum(Object.keys(AVERAGE_METRICS) as [AverageMetric, ...AverageMetric[]]),
  unit: z.string().max(30),
  target: z.number().finite().positive().max(1_000_000),
  direction: z.enum(['at-least', 'at-most']),
  windowDays: z.union([z.literal(7), z.literal(14), z.literal(30)]),
  status: z.enum(['active', 'completed', 'closed']),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  entries: z.array(entrySchema).max(3660),
});
export const averageGoalsSchema = z.looseObject({version: z.literal(1), goals: z.array(averageGoalSchema).max(100)});
export type AverageGoal = z.infer<typeof averageGoalSchema>;
export type AverageGoals = z.infer<typeof averageGoalsSchema>;
export const emptyAverageGoals = (): AverageGoals => ({version: 1, goals: []});
export const AVERAGE_GOALS: DeviceRecordSpec<AverageGoals> = {key: AVERAGE_GOALS_KEY, schema: averageGoalsSchema, empty: emptyAverageGoals};
/** The key Goals uses for an average goal (and the goal-extras record). */
export const averageKey = (id: string) => `average:${id}`;

export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function addAverageGoal(state: AverageGoals, goal: Omit<AverageGoal, 'status' | 'entries' | 'createdAt'> & {createdAt: string}): AverageGoals {
  if (state.goals.some(g => g.id === goal.id)) throw Error('This goal already exists.');
  return averageGoalsSchema.parse({...state, goals: [...state.goals, {...goal, status: 'active', entries: []}]});
}
export function editAverageGoal(state: AverageGoals, id: string, change: Partial<Pick<AverageGoal, 'name' | 'target' | 'direction' | 'windowDays' | 'unit'>>): AverageGoals {
  if (!state.goals.some(g => g.id === id)) throw Error('That goal is not on this device.');
  return averageGoalsSchema.parse({...state, goals: state.goals.map(g => g.id === id ? {...g, ...change} : g)});
}
/** A day's own value (replaces that day's earlier entry); for a measure Health does not record, or as a correction. */
export function logAverageValue(state: AverageGoals, id: string, entry: {day: string; value: number}): AverageGoals {
  const goal = state.goals.find(g => g.id === id);
  if (!goal) throw Error('That goal is not on this device.');
  const entries = [...goal.entries.filter(e => e.day !== entry.day), entrySchema.parse(entry)].sort((a, b) => a.day.localeCompare(b.day));
  return averageGoalsSchema.parse({...state, goals: state.goals.map(g => g.id === id ? {...g, entries} : g)});
}
export function removeAverageValue(state: AverageGoals, id: string, entryDay: string): AverageGoals {
  return averageGoalsSchema.parse({...state, goals: state.goals.map(g => g.id === id ? {...g, entries: g.entries.filter(e => e.day !== entryDay)} : g)});
}
export function setAverageStatus(state: AverageGoals, id: string, status: AverageGoal['status'], at: string): AverageGoals {
  return averageGoalsSchema.parse({...state, goals: state.goals.map(g => g.id === id ? {...g, status, ...(status === 'completed' ? {completedAt: at} : {completedAt: undefined})} : g)});
}
export function removeAverageGoal(state: AverageGoals, id: string): AverageGoals {
  return averageGoalsSchema.parse({...state, goals: state.goals.filter(g => g.id !== id)});
}
