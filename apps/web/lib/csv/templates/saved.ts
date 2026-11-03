import * as z from 'zod';
import type {DeviceRecordSpec} from '../../device-record';
import {normalizeHeader} from '../mapping';
import type {CsvDelimiter} from '../parse';
import type {DateFormat} from '../dates';
import type {NumberStyle} from '../numbers';
import type {ImportTarget} from './presets';

/**
 * Session AK (7.1): the person's own saved column mappings, TIER 3 (stored format). A NEW device-only key, loose and
 * versioned. A mapping is kept by column NAME (not position), so it applies again to next month's file from the same
 * bank even if a column moved; it applies only when every named column is in the new header. No file content is kept.
 */
export const CSV_MAPPINGS_KEY = 'zigoals:csv-mappings:v1';
export const MAX_SAVED_MAPPINGS = 50;
const savedSchema = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  name: z.string().trim().min(1).max(60),
  target: z.enum(['money', 'transactions', 'holdings']),
  /** field id → the column's name as the file wrote it. */
  columns: z.record(z.string().max(40), z.string().max(120)).refine(c => Object.keys(c).length <= 64, 'Up to 64 columns.'),
  delimiter: z.enum([',', ';', '\t']).optional(),
  numberStyle: z.enum(['point', 'comma']).optional(),
  dateFormat: z.enum(['iso', 'dmy', 'mdy', 'dmy-dot', 'month-name']).optional(),
  savedAt: z.iso.datetime({offset: true}),
});
export const csvMappingsSchema = z.looseObject({version: z.literal(1), mappings: z.array(savedSchema).max(MAX_SAVED_MAPPINGS)});
export type SavedMapping = z.infer<typeof savedSchema>;
export type CsvMappingsRecord = z.infer<typeof csvMappingsSchema>;
export const emptyCsvMappings = (): CsvMappingsRecord => ({version: 1, mappings: []});
export const CSV_MAPPINGS: DeviceRecordSpec<CsvMappingsRecord> = {key: CSV_MAPPINGS_KEY, schema: csvMappingsSchema, empty: emptyCsvMappings};

export type MappingToSave = {name: string; target: ImportTarget; header: readonly string[]; mapping: Partial<Record<string, number>>; delimiter?: CsvDelimiter; numberStyle?: NumberStyle; dateFormat?: DateFormat};
/** Saves (or replaces, by name and target) a mapping; the oldest goes beyond the cap. */
export function saveMapping(record: CsvMappingsRecord, input: MappingToSave, id: string, now: Date): CsvMappingsRecord {
  const columns: Record<string, string> = {};
  for (const [field, index] of Object.entries(input.mapping)) if (index !== undefined && input.header[index]) columns[field] = input.header[index]!.slice(0, 120);
  if (!Object.keys(columns).length) throw Error('Match at least one column before saving.');
  const name = input.name.trim().slice(0, 60);
  if (!name) throw Error('Give the mapping a name.');
  const entry: SavedMapping = {id, name, target: input.target, columns, ...(input.delimiter ? {delimiter: input.delimiter} : {}), ...(input.numberStyle ? {numberStyle: input.numberStyle} : {}), ...(input.dateFormat ? {dateFormat: input.dateFormat} : {}), savedAt: now.toISOString()};
  const rest = record.mappings.filter(m => !(m.target === input.target && m.name.toLowerCase() === name.toLowerCase()));
  return csvMappingsSchema.parse({...record, mappings: [...rest, entry].slice(-MAX_SAVED_MAPPINGS)});
}
export const removeMapping = (record: CsvMappingsRecord, id: string): CsvMappingsRecord => csvMappingsSchema.parse({...record, mappings: record.mappings.filter(m => m.id !== id)});
/** The mapping as column indexes for this header, or null when a named column is missing. */
export function applySaved(header: readonly string[], saved: SavedMapping): Partial<Record<string, number>> | null {
  const normalized = header.map(normalizeHeader), mapping: Partial<Record<string, number>> = {};
  for (const [field, column] of Object.entries(saved.columns)) {
    const index = normalized.indexOf(normalizeHeader(column));
    if (index < 0) return null;
    mapping[field] = index;
  }
  return mapping;
}
/** The newest saved mapping for this target that fits the header, with its indexes. */
export function findSaved(record: CsvMappingsRecord, header: readonly string[], target: ImportTarget): {saved: SavedMapping; mapping: Partial<Record<string, number>>} | null {
  for (const saved of [...record.mappings].reverse()) {
    if (saved.target !== target) continue;
    const mapping = applySaved(header, saved);
    if (mapping) return {saved, mapping};
  }
  return null;
}
