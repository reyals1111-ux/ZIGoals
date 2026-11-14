import type {SleepNight} from './schema';
import {wallClock} from '../zone-time';

const MIN = 60_000;
export const nightDay = (n: Pick<SleepNight, 'end' | 'timeZone'>): string | null => n.end ? wallClock(Date.parse(n.end), n.timeZone).date : null;
export const inBedMinutes = (n: Pick<SleepNight, 'start' | 'end'>, now = Date.now()) => Math.round(((n.end ? Date.parse(n.end) : now) - Date.parse(n.start)) / MIN);
export type Asleep = {minutes: number; estimated: boolean};
export function asleep(n: SleepNight): Asleep | null {
  if (!n.end) return null;
  const s = n.stages;
  if (s?.deepMin !== undefined && s.remMin !== undefined && s.coreMin !== undefined) return {minutes: s.deepMin + s.remMin + s.coreMin, estimated: false};
  return {minutes: Math.max(0, inBedMinutes(n) - (n.latencyMin ?? 0) - (n.awakeMin ?? 0)), estimated: n.latencyMin === undefined || n.awakeMin === undefined};
}
/** Bedtime as minutes after noon on the evening it began (23:30 → 690, 00:30 → 750), so nights around midnight compare. */
export const bedClock = (n: Pick<SleepNight, 'start' | 'timeZone'>) => (wallClock(Date.parse(n.start), n.timeZone).minutes + 720) % 1440;
export const wakeClock = (n: Pick<SleepNight, 'end' | 'timeZone'>) => n.end ? wallClock(Date.parse(n.end), n.timeZone).minutes : null;
