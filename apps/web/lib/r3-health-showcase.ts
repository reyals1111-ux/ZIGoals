import {HEALTH_EXTRAS_KEY, healthExtrasSchema, type HealthExtras} from './health-extras';
import {MORE_GOALS_KEY, moreGoalsSchema} from './health-goals/more';
import {CIRCUITS_KEY, circuitsSchema} from './workouts/circuits';

/**
 * Session AV lane 2 (health r3): the Showcase's labelled examples for this round — two of your own drinks (no entry is
 * logged with them, so no water, caffeine or food total moves), one protein goal and one timed circuit, each named
 * "(Showcase)". Writes only keys nothing pinned reads; an existing health extras record keeps all it has. Pure on the
 * records map the Showcase builds (lib/showcase-data.ts: one line, `withR3HealthShowcase(records, day);`).
 */
export function withR3HealthShowcase(records: Record<string, string>, day: string): Record<string, string> {
  const at = `${day}T08:00:00.000Z`;
  let extras: HealthExtras = {version: 1};
  try { if (records[HEALTH_EXTRAS_KEY]) extras = healthExtrasSchema.parse(JSON.parse(records[HEALTH_EXTRAS_KEY]!)); } catch { extras = {version: 1}; }
  if (!extras.ownDrinks?.length) records[HEALTH_EXTRAS_KEY] = JSON.stringify(healthExtrasSchema.parse({...extras, ownDrinks: [
    {id: 'oat-latte-showcase', name: 'Oat latte (Showcase)', type: 'coffee', sizeMl: 300, symbol: '☕', colour: 'yellow', caffeineMg: 80, kcal: 130, sugarG: 7.5},
    {id: 'orange-juice-showcase', name: 'Juice (Showcase)', type: 'juice', sizeMl: 250, symbol: '🧃', colour: 'orange', kcal: 110, sugarG: 21},
  ]}));
  records[MORE_GOALS_KEY] ??= JSON.stringify(moreGoalsSchema.parse({version: 1, goals: [{id: 'more_showcase_protein', name: 'Protein at least 90 g (Showcase)', source: 'nutrient', key: 'proteinMg', target: 90, direction: 'at-least', windowDays: 7, status: 'active', createdAt: at}]}));
  records[CIRCUITS_KEY] ??= JSON.stringify(circuitsSchema.parse({version: 1, circuits: [{id: 'circuit-showcase-legs', name: 'Twenty-minute legs (Showcase)', moves: [{exerciseId: 'squat'}, {exerciseId: 'lunge'}, {exerciseId: 'hip-thrust'}, {exerciseId: 'plank'}], workSeconds: 40, restSeconds: 20, rounds: 3, roundRestSeconds: 60, createdAt: at}]}));
  return records;
}
