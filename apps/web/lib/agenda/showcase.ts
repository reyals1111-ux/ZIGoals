import {addLocalDays} from '../local-date';
import type {AgendaPlanned, AgendaUnbonding} from './build';

/**
 * Session AK (F5d): the Showcase's fictional agenda extras, deterministic for a day. Every other agenda item in the
 * Showcase comes from the Showcase's own records (habits, goals, bills, meal plans, workouts, the reminders plan); these
 * two kinds have no record of their own yet (planned workouts, unbonding dates), so the agenda page adds them only while
 * the Showcase is on (`isShowcase()`), each labelled "Example". Never written anywhere.
 */
export function showcaseAgendaExtras(day: string): {plannedWorkouts: AgendaPlanned[]; unbonding: AgendaUnbonding[]} {
  return {
    plannedWorkouts: [
      {id: 'showcase-plan-upper', date: addLocalDays(day, 1), time: '07:30', minutes: 45, title: 'Example · Upper body session', example: true},
      {id: 'showcase-plan-run', date: addLocalDays(day, 3), time: '18:00', minutes: 30, title: 'Example · Easy 5 km run', example: true},
    ],
    unbonding: [{id: 'showcase-unbonding-1', date: addLocalDays(day, 9), title: 'Example · ZIG unbonding ends', detail: 'Fictional: the stake becomes liquid on this day', example: true}],
  };
}
