import {addLocalDays} from './local-date';
import {PLANNED_KEY, plannedRecordSchema} from './workouts/planned';
import {RACES_KEY, racesSchema} from './workouts/races';

/**
 * Session AV lane 2, round 4 (health): the Showcase's labelled examples for this round — two planned workouts in Health →
 * Workouts → Your plan (the same two the Agenda's Showcase already draws from lib/agenda/showcase.ts, so the Agenda shows
 * no more items than before: the Showcase's agenda keeps its own examples) and one race ahead, each named "(Showcase)".
 * Writes only keys nothing pinned reads. Pure on the records map the Showcase builds (lib/showcase-data.ts: one line,
 * `withR4HealthShowcase(records, day);`).
 */
export function withR4HealthShowcase(records: Record<string, string>, day: string): Record<string, string> {
  const at = `${day}T08:00:00.000Z`;
  records[PLANNED_KEY] ??= JSON.stringify(plannedRecordSchema.parse({version: 1, items: [
    {id: 'plan-showcase-upper', date: addLocalDays(day, 1), time: '07:30', kind: 'other', name: 'Upper body session (Showcase)', minutes: 45, createdAt: at},
    {id: 'plan-showcase-run', date: addLocalDays(day, 3), time: '18:00', kind: 'run', name: 'Easy 5 km run (Showcase)', distanceKm: 5, effort: 'easy', minutes: 30, createdAt: at},
  ]}));
  records[RACES_KEY] ??= JSON.stringify(racesSchema.parse({version: 1, races: [{id: 'race-showcase-10k', name: 'City 10K (Showcase)', date: addLocalDays(day, 24), distanceKm: 10, goalSeconds: 2910, priority: 'main', createdAt: at}]}));
  return records;
}
