import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import type {Position, ValuationSnapshot} from '../positions';

/**
 * Session AJ (item 6, CO6; owner decision D7; `TIER 3 (stored format)`): where each wealth reading came from. Wealth's
 * readings (`valuationSnapshots` in zigoals:platform:v1) are a strict schema in every released build, so their sources
 * live beside them in this device key, keyed by the reading's id: a market price, your own value, verified from a wallet,
 * an exchange, or staking. `since` is when this device began recording; a reading captured before it shows "Source not
 * recorded" (D7), never a guess. Loose and versioned (a newer build's fields survive); device-only (not synced); in
 * Export everything and its restore; erased with the account. At most 20,000 readings, the oldest dropped first.
 */
export const READING_SOURCES_KEY = 'zigoals:reading-sources:v1';
export const READING_SOURCE_KINDS = ['market', 'own', 'wallet', 'exchange', 'staking'] as const;
export type ReadingSource = (typeof READING_SOURCE_KINDS)[number];
export const MAX_READING_SOURCES = 20_000;
export const readingSourcesSchema = z.looseObject({
  version: z.literal(1),
  since: z.iso.datetime().nullable().default(null),
  readings: z.record(z.string().min(1).max(250), z.enum(READING_SOURCE_KINDS).catch('market')).default({}),
}).refine(r => Object.keys(r.readings).length <= MAX_READING_SOURCES, `Up to ${MAX_READING_SOURCES} readings.`);
export type ReadingSources = z.infer<typeof readingSourcesSchema>;
export const emptyReadingSources = (): ReadingSources => ({version: 1, since: null, readings: {}});
export const READING_SOURCES: DeviceRecordSpec<ReadingSources> = {key: READING_SOURCES_KEY, schema: readingSourcesSchema, empty: emptyReadingSources};
export const READING_SOURCE_LABEL: Readonly<Record<ReadingSource | 'unrecorded', string>> = {
  market: 'Market price', own: 'Your own value', wallet: 'Verified from a wallet', exchange: 'From an exchange', staking: 'Staking', unrecorded: 'Source not recorded',
};
const STAKING_TYPES: ReadonlySet<Position['sourceType']> = new Set(['NATIVE_STAKING', 'NATIVE_UNBONDING', 'NATIVE_REWARDS', 'LIQUID_STAKING']);
const EXCHANGES = /\b(kraken|coinbase|binance)\b/i;
/** A reading's source from the reading itself and its holding: a price read is "market", a typed value "own"; a verified one is staking, an exchange or a wallet. */
export function classifyReading(position: Pick<Position, 'sourceType' | 'providerId'> | undefined, snapshot: Pick<ValuationSnapshot, 'source'>): ReadingSource {
  if (snapshot.source === 'COINGECKO') return 'market';
  if (snapshot.source === 'MANUAL') return 'own';
  if (position && STAKING_TYPES.has(position.sourceType)) return 'staking';
  if (position && EXCHANGES.test(position.providerId)) return 'exchange';
  return 'wallet';
}
/**
 * The record with every reading captured since `since` given its source, written once (a reading already named keeps its
 * name). The first call on a device sets `since` to `now`, so earlier readings stay "not recorded". Returns the same object
 * when nothing changed.
 */
export function recordReadingSources(record: ReadingSources, positions: readonly Pick<Position, 'id' | 'sourceType' | 'providerId'>[], snapshots: readonly Pick<ValuationSnapshot, 'id' | 'positionId' | 'source' | 'capturedAt'>[], now: string): ReadingSources {
  const since = record.since ?? now, byId = new Map(positions.map(p => [p.id, p]));
  const fresh = snapshots.filter(s => s.capturedAt >= since && !record.readings[s.id]);
  if (!fresh.length) return record.since ? record : {...record, since};
  const readings = {...record.readings};
  for (const s of fresh) readings[s.id] = classifyReading(byId.get(s.positionId), s);
  const keys = Object.keys(readings);
  if (keys.length > MAX_READING_SOURCES) for (const k of keys.slice(0, keys.length - MAX_READING_SOURCES)) delete readings[k];
  return {...record, since, readings};
}
/** The source a reading shows: its recorded one, else "unrecorded" (captured before this device recorded sources). */
export const readingSource = (record: ReadingSources | null, snapshotId: string): ReadingSource | 'unrecorded' => record?.readings[snapshotId] ?? 'unrecorded';
