import {addLocalDays} from '../local-date';
import {firstWeekSchema, type FirstWeek} from './store';

/**
 * Session AK (BUILD list 2 #5): "Your first week" — seven small steps, one suggested per day, done in any order.
 * Skipping costs nothing: the card never counts what was not done and never says "missed". It ends after day 7, on
 * Hide, and it does not start for a person who already has a week or more of records (there is no first week to walk).
 * Day numbers come from calendar keys (the journal zone's day, computed by the caller), so a zone change never moves a
 * step. Pure; the card stores only the person's taps.
 */
export const FIRST_WEEK_DAYS = 7;
/** A person with records on this many different days before starting already knows their way around. */
export const ALREADY_ACTIVE_DAYS = 7;
export const STEP_IDS = ['habit', 'log', 'goal', 'checkin', 'backup', 'compare', 'review'] as const;
export type StepId = typeof STEP_IDS[number];
export type Step = {id: StepId; title: string; line: string; href: string; cta: string};
export const STEPS: readonly Step[] = [
  {id: 'habit', title: 'Tick a habit', line: 'One tick is enough. If you have no habit yet, add a small one first.', href: '/app/habits', cta: 'Open Habits'},
  {id: 'log', title: 'Log water or a meal', line: 'A glass of water counts.', href: '/app/health#diary', cta: 'Open Health'},
  {id: 'goal', title: 'Add a goal step or a contribution', line: 'Any goal, any size. Nothing moves money.', href: '/app/goals', cta: 'Open Goals'},
  {id: 'checkin', title: 'Try the check-in', line: 'Rate today’s energy from 1 to 5, and add a line if you like.', href: '/app/journal', cta: 'Open the Journal'},
  {id: 'backup', title: 'Test a backup', line: 'Make a copy of your records and check it, without changing anything here.', href: '/app/settings/data', cta: 'Open Your data'},
  {id: 'compare', title: 'Open Compare', line: 'See which days go together. It fills in over a few weeks.', href: '/app/health#insights', cta: 'Open Insights'},
  {id: 'review', title: 'Open the weekly review', line: 'Your week across goals, habits, health and wealth.', href: '/app/review', cta: 'Open the review'},
];
export const DAY_SEVEN_LINE = 'A week of showing up.';
export const celebrationId = (startedOn: string) => `first-week:${startedOn}`;

const dayIndex = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
/** Different days with any record strictly before `before` (unknown or malformed dates are left out). */
export function activeDaysBefore(dates: Iterable<string>, before: string): number {
  const seen = new Set<string>();
  for (const d of dates) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && d < before) seen.add(d);
  return seen.size;
}

export type FirstWeekView =
  | {phase: 'not-started'; alreadyActive: boolean}
  | {phase: 'hidden'}
  | {phase: 'ended'; doneCount: number}
  | {phase: 'active'; day: number; today: Step | null; done: ReadonlySet<StepId>; doneCount: number; lastDay: boolean};
/**
 * What the card shows today. `detected` are steps the records already show done (a habit ticked, today's energy rated)
 * since the start; they count like a tap. Today's suggestion is the day's own step, or, if that one is done, the first
 * step still open (any order is fine).
 */
export function firstWeekView(state: FirstWeek, today: string, {activeDays = 0, detected = {}}: {activeDays?: number; detected?: Partial<Record<StepId, string>>} = {}): FirstWeekView {
  if (state.hidden) return {phase: 'hidden'};
  if (!state.startedOn) return {phase: 'not-started', alreadyActive: activeDays >= ALREADY_ACTIVE_DAYS};
  const doneDates = {...detected, ...(state.done ?? {})} as Record<string, string>;
  const done = new Set(STEP_IDS.filter(id => doneDates[id] && doneDates[id]! >= state.startedOn! && doneDates[id]! <= today));
  const day = dayIndex(state.startedOn, today) + 1;
  if (day > FIRST_WEEK_DAYS) return {phase: 'ended', doneCount: done.size};
  // A start date after today (a zone moved back across midnight) reads as day 1.
  const n = Math.max(1, day), own = STEPS[n - 1]!;
  const suggestion = !done.has(own.id) ? own : STEPS.find(s => !done.has(s.id)) ?? null;
  return {phase: 'active', day: n, today: suggestion, done, doneCount: done.size, lastDay: n === FIRST_WEEK_DAYS};
}
export const startFirstWeek = (state: FirstWeek, today: string): FirstWeek => firstWeekSchema.parse({...state, startedOn: today, hidden: false, done: {}});
export const markStep = (state: FirstWeek, id: StepId, today: string, on = true): FirstWeek => {
  const done = {...(state.done ?? {})};
  if (on) done[id] = today; else delete done[id];
  return firstWeekSchema.parse({...state, done});
};
export const hideFirstWeek = (state: FirstWeek): FirstWeek => firstWeekSchema.parse({...state, hidden: true});
export const showFirstWeek = (state: FirstWeek): FirstWeek => firstWeekSchema.parse({...state, hidden: false});
/** The last day of the week, for the card's "until" line. */
export const lastDayOf = (startedOn: string) => addLocalDays(startedOn, FIRST_WEEK_DAYS - 1);
