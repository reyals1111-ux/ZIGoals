import {showcaseAgendaExtras} from '../agenda/showcase';
import {isShowcase} from '../showcase-storage';
import type {TimelineSource, TimelineSourceItem} from './sources';
import {readDeviceRecord, type DeviceRecordSpec} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {agendaPlanned, PLANNED_WORKOUTS, type PlannedRecord} from '../workouts/planned';
import {WORKOUTS, type Workouts} from '../workouts/schema';

/**
 * Session AV lane 2 (r3-plan, LEDGER #258; Structured's timeline for any day): planned workouts on the Day Timeline of their
 * day, from the same place the Agenda reads them (components/agenda/agenda-extras.ts): the workout log keeps only finished
 * workouts, so planned ones exist only as the Showcase's labelled examples until a feature keeps them; a workout that is a
 * habit shows as its habit. A read only. Registered by components/timeline/planned-workouts-source.tsx.
 * Session AV lane 2, round 4 (health; LEDGER #330): outside the Showcase, the person's own planned workouts
 * (zigoals:planned-workouts:v1), those still to do or missed on that day; a finished one shows as the workout it became.
 */
export function plannedWorkoutItems(showcase: boolean, date: string, today: string, own?: {planned: PlannedRecord | null; workouts: Workouts | null}): TimelineSourceItem[] {
  if (!showcase) return agendaPlanned(own?.planned ?? null, own?.workouts ?? null, today).filter(p => p.date === date).map(p => ({
    id: `plan-${p.id}`, title: p.title, done: false, href: p.href, band: 'anytime' as const, ...(p.time ? {time: p.time} : {}), pillar: 'health' as const, label: 'Planned workout',
  }));
  return showcaseAgendaExtras(today).plannedWorkouts.filter(p => p.date === date).map(p => ({
    id: p.id, title: p.title, done: false, href: p.href ?? '/app/health?view=workouts', band: 'anytime' as const, ...(p.time ? {time: p.time} : {}), pillar: 'health' as const, label: 'Planned workout',
  }));
}
function one<T>(spec: DeviceRecordSpec<T>): T | null { try { const r = readDeviceRecord(getAppStorage(), spec); return r.unreadable ? null : r.data; } catch { return null; } }
const readOwn = () => ({planned: one(PLANNED_WORKOUTS), workouts: one(WORKOUTS)});
export const plannedWorkoutsSource: TimelineSource = ({date, stores}) => { const showcase = isShowcase(); return plannedWorkoutItems(showcase, date, typeof stores.habitsDay === 'string' ? stores.habitsDay : date, showcase ? undefined : readOwn()); };
export default plannedWorkoutsSource;
