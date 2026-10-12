import type {HabitInput} from '../habits';
import type {TemplateHabit} from './goal-library';
import {BUILT_IN_AREAS} from '../goal-extras/store';

/**
 * A library template's suggested habit as Habits' own input (Session AA-Cloud Part 2, G6): Habits' public `createHabit`
 * makes it, exactly as a habit typed in Habits would be made (this lane never edits Habits' files). The habit's category
 * is the template's life area; its target is one check-in.
 */
export function templateHabitInput(h: TemplateHabit, area: string): HabitInput {
  const schedule = h.schedule === 'daily' ? {kind: 'daily' as const} : h.schedule === 'weekdays' ? {kind: 'weekdays' as const, days: [1, 2, 3, 4, 5]} : {kind: 'frequency' as const, times: 3, period: 'week' as const};
  return {title: h.title, category: BUILT_IN_AREAS.find(a => a.id === area)?.label ?? 'Personal', description: h.why, notes: '', schedule, target: 1};
}
