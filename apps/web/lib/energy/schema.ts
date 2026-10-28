import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AI (B3 competitor gap "a daily energy rating"), TIER 3 (stored format): one energy rating per day, 1 (drained) to
 * 5 (full of energy), stamped. The owner asked for it beside the mood record; the mood record (Health v4 `moods`) is a
 * strict schema in every released build, so a new field there would make builds #37–#50 refuse Health's moods. It is a
 * separate device-only key instead, read beside the moods by day (ADR-034 N19). Under the Health gate wherever ZIGi reads
 * it, like the mood. In Export everything and the backup; not synced.
 */
export const ENERGY_KEY = 'zigoals:energy:v1';
export const MAX_ENERGY_DAYS = 1100;
export const energyDaySchema = z.looseObject({energy: z.number().int().min(1).max(5), at: z.iso.datetime({offset: true})});
export const energySchema = z.looseObject({version: z.literal(1), days: z.record(z.iso.date(), energyDaySchema)}).refine(r => Object.keys(r.days).length <= MAX_ENERGY_DAYS, `Up to ${MAX_ENERGY_DAYS} days.`);
export type EnergyDay = z.infer<typeof energyDaySchema>;
export type Energy = z.infer<typeof energySchema>;
export const emptyEnergy = (): Energy => ({version: 1, days: {}});
export const ENERGY: DeviceRecordSpec<Energy> = {key: ENERGY_KEY, schema: energySchema, empty: emptyEnergy};
export const ENERGY_WORDS = {en: ['drained', 'low', 'okay', 'good', 'full of energy'], nl: ['leeg', 'laag', 'oké', 'goed', 'vol energie']} as const;
/** The day's rating set (the newest wins); the oldest days drop past the cap. */
export function rateEnergy(record: Energy, day: string, energy: number, at: string): Energy {
  const days = {...record.days, [day]: {energy: Math.max(1, Math.min(5, Math.round(energy))), at}};
  const keys = Object.keys(days).sort(), drop = keys.slice(0, Math.max(0, keys.length - MAX_ENERGY_DAYS));
  for (const k of drop) delete days[k];
  return {...record, days};
}
