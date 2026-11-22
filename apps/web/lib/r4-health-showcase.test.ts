import {describe, expect, test} from 'vitest';
import {withR4HealthShowcase} from './r4-health-showcase';
import {PLANNED_KEY, plannedRecordSchema} from './workouts/planned';
import {RACES_KEY, racesSchema} from './workouts/races';
import {showcaseAgendaExtras} from './agenda/showcase';

/** Session AV lane 2, round 4 (health): the Showcase's labelled examples, written only where nothing is kept yet. */
describe('round 4 health Showcase examples', () => {
  test('two planned workouts matching the Agenda’s own Showcase examples, and one race, each labelled', () => {
    const r = withR4HealthShowcase({}, '2026-11-17');
    const plan = plannedRecordSchema.parse(JSON.parse(r[PLANNED_KEY]!)), races = racesSchema.parse(JSON.parse(r[RACES_KEY]!));
    expect(plan.items.every(i => i.name.endsWith('(Showcase)'))).toBe(true);
    expect(plan.items.map(i => [i.date, i.time])).toEqual(showcaseAgendaExtras('2026-11-17').plannedWorkouts.map(p => [p.date, p.time]));
    expect(races.races).toMatchObject([{name: 'City 10K (Showcase)', date: '2026-12-11', distanceKm: 10}]);
  });
  test('an existing record is kept', () => {
    const r = withR4HealthShowcase({[PLANNED_KEY]: '{"version":1,"items":[]}'}, '2026-11-17');
    expect(r[PLANNED_KEY]).toBe('{"version":1,"items":[]}');
  });
});
