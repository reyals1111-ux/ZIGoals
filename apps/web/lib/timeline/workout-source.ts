import {showcaseAgendaExtras} from '../agenda/showcase';
import {isShowcase} from '../showcase-storage';
import type {TimelineSource, TimelineSourceItem} from './sources';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258; Structured's timeline for any day): planned workouts on the Day Timeline of their
 * day, from the same place the Agenda reads them (components/agenda/agenda-extras.ts): the workout log keeps only finished
 * workouts, so planned ones exist only as the Showcase's labelled examples until a feature keeps them; a workout that is a
 * habit shows as its habit. A read only. Registered by components/timeline/planned-workouts-source.tsx.
 */
export function plannedWorkoutItems(showcase: boolean, date: string, today: string): TimelineSourceItem[] {
  if (!showcase) return [];
  return showcaseAgendaExtras(today).plannedWorkouts.filter(p => p.date === date).map(p => ({
    id: p.id, title: p.title, done: false, href: p.href ?? '/app/health?view=workouts', band: 'anytime' as const, ...(p.time ? {time: p.time} : {}), pillar: 'health' as const, label: 'Planned workout',
  }));
}
export const plannedWorkoutsSource: TimelineSource = ({date, stores}) => plannedWorkoutItems(isShowcase(), date, typeof stores.habitsDay === 'string' ? stores.habitsDay : date);
export default plannedWorkoutsSource;
