import {healthSchema, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import type {SleepNight} from '../sleep/schema';

/**
 * Showcase (Session AA-Cloud Part 8): an earlier, fictional season of walks, nights and water, 60 to 89 days before the
 * Showcase day, so the cross-pillar pairings (90 days, 14 days a side) have real counts to show. It sits outside the
 * 60-day window of the older insights (lib/insights/engine.ts) and before the Showcase habits begin, so every count
 * pinned for the last 30 days stays as it was. Deterministic: the same day always gives the same records.
 */
export const EARLIER_FIRST = -89, EARLIER_LAST = -60;
const ZONE = 'Europe/Brussels';
const clock = (minutes: number) => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export function withEarlierSeason(health: HealthData, day: string): HealthData {
  const out = healthSchema.parse(structuredClone(health));
  const nights: SleepNight[] = [];
  for (let k = 0; k <= EARLIER_LAST - EARLIER_FIRST; k++) {
    const date = addLocalDays(day, EARLIER_FIRST + k), stamp = `${date}T20:00:00.000Z`, id = String(k).padStart(3, '0');
    // A longer walk on every other day; on those days the night that follows is longer too (a pairing, as people live it).
    const long = k % 2 === 0, steps = long ? 9200 + (k % 3) * 300 : 5400 + (k % 4) * 250;
    out.activity.push({id: `health_activity-earlier-${id}`, date, name: 'Showcase walk (earlier season)', steps, minutes: long ? 70 : 40, createdAt: stamp, updatedAt: stamp});
    if (k % 3 !== 0 && out.daily) {
      const water = `health_water-earlier-${id}`;
      out.daily.water.push({id: water, date, amountMilli: 500000, unit: 'ml', createdAt: stamp, updatedAt: stamp});
      out.daily.waterOperations.push(water);
    }
    // The night that ends on this day (none after the season's last day, so nothing reaches the last 60 days).
    if (k === 0) continue;
    const prev = addLocalDays(date, -1), longNight = (k - 1) % 2 === 0, asleep = longNight ? 480 + (k % 4) * 8 : 405 + (k % 5) * 6;
    const wakeAt = 6 * 60 + 40 + (k % 3) * 10, bedAt = wakeAt + 24 * 60 - asleep - 12;
    nights.push({id: `health_sleep-earlier-${id.padStart(4, '0')}`, kind: 'night', start: new Date(instantAt(bedAt >= 1440 ? date : prev, clock(bedAt), ZONE)).toISOString(), end: new Date(instantAt(date, clock(wakeAt), ZONE)).toISOString(), timeZone: ZONE,
      latencyMin: 12, awakeMin: 0, awakenings: 0, quality: longNight ? 4 : 3, source: 'manual', createdAt: `${date}T08:00:00.000Z`, updatedAt: `${date}T08:00:00.000Z`});
  }
  if (out.sleep) out.sleep = {...out.sleep, nights: [...nights, ...out.sleep.nights]};
  return healthSchema.parse(out);
}
