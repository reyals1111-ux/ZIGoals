import * as z from 'zod';
import {UNIVERSE_KEY} from '../af-extras-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AF (L5b; TIER 3 storage, ADR-028 H77): My Universe's one record, `zigoals:universe:v1` — the ids of the
 * milestones already celebrated on this device and the day each was celebrated. Everything else is derived live from the
 * person's records (lib/universe/model.ts). Device only, versioned and loose (a newer build's fields survive a write),
 * never synced; bytes that do not parse read as empty and unreadable and are never rewritten by a read
 * (lib/device-record.ts). Its own map, independent of the game layer's `zigoals:celebrations:v1`, so the Universe
 * celebrates with Gamify off. Written only when the person acknowledges a milestone, never on view.
 */
export const MAX_CELEBRATED = 500;
export const universeRecordSchema = z.looseObject({
  version: z.literal(1),
  celebrated: z.record(z.string().min(1).max(80), z.iso.date()).refine(c => Object.keys(c).length <= MAX_CELEBRATED, `Up to ${MAX_CELEBRATED} milestones.`).default({}),
});
export type UniverseRecord = z.infer<typeof universeRecordSchema>;
export const emptyUniverseRecord = (): UniverseRecord => ({version: 1, celebrated: {}});
export const UNIVERSE: DeviceRecordSpec<UniverseRecord> = {key: UNIVERSE_KEY, schema: universeRecordSchema, empty: emptyUniverseRecord};

/** Remembers a milestone as celebrated today; past the cap the oldest celebrations go first. */
export function markCelebrated(record: UniverseRecord, id: string, today: string): UniverseRecord {
  if (record.celebrated[id]) return record;
  const celebrated = {...record.celebrated, [id]: today};
  const ids = Object.keys(celebrated).sort((a, b) => celebrated[a]!.localeCompare(celebrated[b]!) || a.localeCompare(b));
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX_CELEBRATED))) delete celebrated[old];
  return universeRecordSchema.parse({...record, celebrated});
}
export const celebratedIds = (record: UniverseRecord): string[] => Object.keys(record.celebrated);
