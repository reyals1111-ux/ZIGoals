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
/**
 * Session AV lane 2, round 6 (r6-body; LEDGER #423, AutoSleep's sleep efficiency): time asleep out of time in bed for a
 * night ("Asleep 6 h 50 of 7 h 40 in bed (89 %)"), an estimate when the time to fall asleep or the time awake was not
 * typed (asleep's own `estimated`). A fact, never a judgement of the number. Null for a running night or no time in bed.
 */
export type Efficiency = {asleep: number; inBed: number; percent: number; estimated: boolean};
export function efficiency(n: SleepNight): Efficiency | null {
  const a = asleep(n), bed = n.end ? inBedMinutes(n) : 0;
  return a && bed > 0 ? {asleep: a.minutes, inBed: bed, percent: Math.min(100, Math.round(a.minutes / bed * 100)), estimated: a.estimated} : null;
}
/** Bedtime as minutes after noon on the evening it began (23:30 → 690, 00:30 → 750), so nights around midnight compare. */
export const bedClock = (n: Pick<SleepNight, 'start' | 'timeZone'>) => (wallClock(Date.parse(n.start), n.timeZone).minutes + 720) % 1440;
export const wakeClock = (n: Pick<SleepNight, 'end' | 'timeZone'>) => n.end ? wallClock(Date.parse(n.end), n.timeZone).minutes : null;
