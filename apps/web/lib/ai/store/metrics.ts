import * as z from 'zod';
import {updateDeviceRecord, type DeviceRecordSpec} from '../../device-record';
import {getAppStorage} from '../../showcase-storage';

/**
 * Session AI (G14, ZIGi value metrics and events; `TIER 3 (stored format)`): what ZIGi did for the person, counted on this
 * device only and only once they switch it on — answers made on the device, answers from their own AI, cards added and
 * cards dismissed, per month. Counts only: never a message, a card's content, an amount or anything from Health; never
 * sent anywhere (no analytics). A new device-only key, loose and versioned; erased with the account; "Forget the counts"
 * clears it. ADR-034 N38.
 */
export const ZIGI_METRICS_KEY = 'zigoals:zigi-metrics:v1';
export const METRIC_EVENTS = ['device-answer', 'ai-answer', 'card-added', 'card-dismissed'] as const;
export type MetricEvent = (typeof METRIC_EVENTS)[number];
const month = z.looseObject(Object.fromEntries(METRIC_EVENTS.map(e => [e, z.number().int().min(0).max(1_000_000).optional()])) as Record<MetricEvent, z.ZodOptional<z.ZodNumber>>);
export const metricsSchema = z.looseObject({version: z.literal(1), on: z.boolean().optional(), months: z.record(z.string().regex(/^\d{4}-\d{2}$/), month).optional()});
export type ZigiMetrics = z.infer<typeof metricsSchema>;
export const ZIGI_METRICS: DeviceRecordSpec<ZigiMetrics> = {key: ZIGI_METRICS_KEY, schema: metricsSchema, empty: () => ({version: 1})};
export const MAX_MONTHS = 24;
/** One event counted in its month, only while the person has the counts on; the oldest months go past 24. */
export function countEvent(record: ZigiMetrics, event: MetricEvent, now: Date): ZigiMetrics {
  if (!record.on) return record;
  const key = now.toISOString().slice(0, 7), months = {...record.months ?? {}};
  months[key] = {...months[key], [event]: (months[key]?.[event] ?? 0) + 1};
  for (const old of Object.keys(months).sort().slice(0, Math.max(0, Object.keys(months).length - MAX_MONTHS))) delete months[old];
  return metricsSchema.parse({...record, months});
}
export const setMetricsOn = (record: ZigiMetrics, on: boolean): ZigiMetrics => metricsSchema.parse(on ? {...record, on} : {version: 1, on: false});
/** Counts an event from anywhere in ZIGi, quietly: off, unreadable or refused storage counts nothing and never throws. */
export function countZigi(event: MetricEvent, now = new Date()): void {
  try { updateDeviceRecord(getAppStorage(), ZIGI_METRICS, r => r.on ? countEvent(r, event, now) : r); } catch { /* a count is a convenience */ }
}
