import * as z from 'zod';
import {MEASUREMENTS_CUSTOM_KEY} from '../aa-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * N9: measurements beyond the synced kinds (waist, hips, chest, arm, thigh live in Health v4 `measurements`): the
 * person's own kinds (neck, calf, shoulders, anything) with their readings, on this device (ADR-022 B1: the synced kind
 * list is strict, so a new kind cannot enter it). Millimetres or hundredths of an inch, converted for display.
 */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const customKindSchema = z.looseObject({id: z.string().regex(/^[a-z0-9-]{1,40}$/), label: z.string().min(1).max(40), unit: z.enum(['cm', 'in'])});
export const customReadingSchema = z.looseObject({id: z.string().min(1).max(80), kind: z.string().regex(/^[a-z0-9-]{1,40}$/), date: day, valueMilli: z.number().int().min(1).max(5_000_000), at: z.iso.datetime()});
export const measurementsCustomSchema = z.looseObject({version: z.literal(1), kinds: z.array(customKindSchema).max(20).optional(), readings: z.array(customReadingSchema).max(5000).optional()});
export type MeasurementsCustom = z.infer<typeof measurementsCustomSchema>;
export const emptyMeasurementsCustom = (): MeasurementsCustom => ({version: 1});
export const MEASUREMENTS_CUSTOM: DeviceRecordSpec<MeasurementsCustom> = {key: MEASUREMENTS_CUSTOM_KEY, schema: measurementsCustomSchema, empty: emptyMeasurementsCustom};
export const kindId = (label: string) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'custom';
export function addCustomKind(r: MeasurementsCustom, label: string, unit: 'cm' | 'in'): MeasurementsCustom {
  const id = kindId(label); if ((r.kinds ?? []).some(k => k.id === id)) throw new Error('That measurement already exists.');
  return measurementsCustomSchema.parse({...r, kinds: [...(r.kinds ?? []), {id, label: label.trim(), unit}]});
}
export function removeCustomKind(r: MeasurementsCustom, id: string): MeasurementsCustom {
  return measurementsCustomSchema.parse({...r, kinds: (r.kinds ?? []).filter(k => k.id !== id), readings: (r.readings ?? []).filter(x => x.kind !== id)});
}
export function addCustomReading(r: MeasurementsCustom, kind: string, date: string, value: number, at: string, id = `custom_${crypto.randomUUID()}`): MeasurementsCustom {
  if (!(r.kinds ?? []).some(k => k.id === kind)) throw new Error('Choose a measurement first.');
  const readings = (r.readings ?? []).filter(x => !(x.kind === kind && x.date === date));
  return measurementsCustomSchema.parse({...r, readings: [...readings, {id, kind, date, valueMilli: Math.round(value * 1000), at}]});
}
export const removeCustomReading = (r: MeasurementsCustom, id: string): MeasurementsCustom => measurementsCustomSchema.parse({...r, readings: (r.readings ?? []).filter(x => x.id !== id)});
export const customHistory = (r: MeasurementsCustom, kind: string) => (r.readings ?? []).filter(x => x.kind === kind).sort((a, b) => a.date.localeCompare(b.date));
