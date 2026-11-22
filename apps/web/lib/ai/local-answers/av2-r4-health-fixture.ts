import {createEmptyHealth, saveActivity, type HealthData} from '../../health';
import {addWater} from '../../health-daily';
import {addLocalDays} from '../../local-date';
import {withHealthGroup} from '../../vault/w-homes';
import type {Sleep} from '../../sleep/schema';
import {DAY, showcaseAll} from '../evals/as/harness';
import type {ToolSources} from '../tools/env';

/**
 * Session AV lane 2, round 4 (health): a fictional profile for the answers' tests (test-only; nothing in the app imports
 * it) — the Showcase with 40 days ending yesterday of a drink and a walk a day and the night after: on even days a 160 mg
 * coffee at 16:05, 11,000 steps and a 6 h night; on odd days a 60 mg tea at 09:05, 4,000 steps and an 8 h night — and the
 * round's records in the AK sources, as the lead wires them. `more` adds records to the AK sources.
 */
export function wiredR4(more: Record<string, unknown> = {}): ToolSources {
  const s = showcaseAll(), AT = `${DAY}T08:00:00.000Z`;
  let health: HealthData = createEmptyHealth();
  const drinks: Record<string, {type: 'coffee' | 'tea'; caffeineMg: number}> = {}, nights: Sleep['nights'] = [];
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(DAY, -40 + i), even = i % 2 === 0, id = `health_drink-${String(i).padStart(4, '0')}`;
    health = addWater(health, {id, date: day, amountMilli: 250_000, unit: 'ml'}, `${day}T${even ? '16' : '09'}:05:00.000Z`);
    drinks[id] = even ? {type: 'coffee', caffeineMg: 160} : {type: 'tea', caffeineMg: 60};
    health = saveActivity(health, {id: `health_walk-${String(i).padStart(4, '0')}`, date: day, name: 'Fictional walk', steps: even ? 11_000 : 4000, minutes: 30}, `${day}T20:00:00.000Z`);
    nights.push({id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${day}T${even ? '23:30' : '22:30'}:00.000Z`, end: `${addLocalDays(day, 1)}T${even ? '05:30' : '06:30'}:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
  }
  return {...s, health: withHealthGroup(health, 'sleep', {version: 1, nights} as Sleep, false), ak: {...s.ak, healthExtras: {version: 1, drinks}, ...more} as typeof s.ak};
}
