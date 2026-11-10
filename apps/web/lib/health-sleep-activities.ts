import type {HealthData} from './health';
import type {Sleep} from './sleep/schema';
import {asleep, nightDay} from './sleep/engine';
import {formatMinutes} from './zone-time';
import {formatDate} from './visual-format';

/**
 * Session AL third pass (DV-172, P-DV-73): sleep nights and naps as Activity rows, the shape getHealthActivities gives
 * (lib/health.ts), so Activity can list them under Health. Kept out of lib/health.ts, which every page loads, because it
 * needs the sleep engine. A night still running is not listed (it has no end yet); a night's day is its wake date in the
 * zone it was lived, as on Sleep; its time is when it ended. Sources other than you are said ("from Oura").
 */
export type HealthActivityRow = {id: string; category: 'HEALTH'; title: string; detail: string; at: string; day: string; href: string; source?: string};
const SOURCE_WORDS: Record<string, string> = {'apple-health': 'Apple Health', fitbit: 'Fitbit', garmin: 'Garmin', samsung: 'Samsung Health', oura: 'Oura', 'oura-link': 'Oura', 'withings-link': 'Withings', 'polar-link': 'Polar', 'strava-link': 'Strava'};
const sleepOf = (data: HealthData | Sleep | null | undefined): Sleep | null => !data ? null : 'nights' in data ? data : ('sleep' in data && data.sleep ? data.sleep : null);

export function getSleepActivities(data: HealthData | Sleep | null | undefined): HealthActivityRow[] {
  const sleep = sleepOf(data);
  if (!sleep) return [];
  const rows: HealthActivityRow[] = [];
  for (const n of sleep.nights) {
    const day = n.end ? nightDay(n) : null, slept = asleep(n);
    if (!n.end || !day || !slept) continue;
    const from = SOURCE_WORDS[n.source];
    rows.push({
      id: `sleep:${n.id}`, category: 'HEALTH', title: n.kind === 'nap' ? 'Nap recorded' : 'Night’s sleep recorded',
      detail: `${formatMinutes(slept.minutes)} asleep${slept.estimated ? ' (estimated)' : ''}${n.quality ? ` · quality ${n.quality}/5` : ''} · ${formatDate(day)}`,
      at: n.end, day, href: `/app/health?view=sleep&date=${day}`, ...(from ? {source: `Imported from ${from}`} : {}),
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
