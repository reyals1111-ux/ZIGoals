import {entryStream, entryText, listZip, type ZipEntry} from '../import/zip-stream';
import {isShowcaseBackup} from '../showcase-detect';

/**
 * Session AB-Cloud Part 5 ([TIER 3] (data formats), ADR-023 C22): opens an Export everything ZIP for "Restore from a
 * backup" with the streaming reader imports already use (lib/import/zip-stream.ts: CRC checked, stored and deflate only,
 * Zip64 read, no library). Only `everything.json`, `vision/…` and `photos/…` are read; the CSVs are copies of the same
 * records and are never read back. A file that is not an Export everything, is damaged, or comes from a newer format is
 * refused with a plain sentence and nothing is changed.
 */
export const RESTORE_LIMITS = {fileBytes: 400 * 1024 * 1024, jsonBytes: 64 * 1024 * 1024, visionBytes: 2_000_000, photoBytes: 2_000_000} as const;
export const RESTORE_ERRORS = {
  tooLarge: 'This file is larger than a ZIGoals export can be. Choose the zigoals-export ZIP you downloaded.',
  notExport: 'This file is not a ZIGoals “Export everything” ZIP. Choose the zigoals-export ZIP you downloaded.',
  damaged: 'everything.json inside this ZIP is damaged, so nothing was read. Export again, then restore that file.',
  newer: 'This export was made by a newer ZIGoals. Update the app on this device, then restore it.',
} as const;
export type EverythingFile = {format: 'zigoals-everything'; version: 1; exportedAt: string; app?: {version?: string; commit?: string}; modules: Record<string, unknown>; device: Record<string, unknown>; portfolio?: unknown};
export type OpenedBackup = {file: Blob; json: EverythingFile; vision: ZipEntry[]; photos: ZipEntry[]; demo: boolean};
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export async function openBackup(file: Blob): Promise<OpenedBackup> {
  if (file.size > RESTORE_LIMITS.fileBytes) throw Error(RESTORE_ERRORS.tooLarge);
  const entries = await listZip(file);
  const main = entries.find(e => e.name === 'everything.json');
  if (!main) throw Error(RESTORE_ERRORS.notExport);
  if (main.uncompressed > RESTORE_LIMITS.jsonBytes) throw Error(RESTORE_ERRORS.tooLarge);
  let json: unknown;
  try { json = JSON.parse(await entryText(file, main, RESTORE_LIMITS.jsonBytes)); } catch (error) {
    if (error instanceof Error && /checksum|damaged|password|compression|unpack/.test(error.message)) throw error;
    throw Error(RESTORE_ERRORS.damaged);
  }
  if (!isObject(json) || json.format !== 'zigoals-everything') throw Error(RESTORE_ERRORS.notExport);
  if (typeof json.version === 'number' && json.version > 1) throw Error(RESTORE_ERRORS.newer);
  if (json.version !== 1 || typeof json.exportedAt !== 'string' || !isObject(json.modules) || !isObject(json.device)) throw Error(RESTORE_ERRORS.damaged);
  const record = json as unknown as EverythingFile, modules = record.modules;
  const demo = isShowcaseBackup('platform', modules.finance) || isShowcaseBackup('habits', modules.habits) || isShowcaseBackup('health', modules.health);
  return {
    file, json: record, demo,
    vision: entries.filter(e => /^vision\/img-[A-Za-z0-9-]{1,80}\.(jpg|png|webp)$/.test(e.name) && e.uncompressed <= RESTORE_LIMITS.visionBytes),
    photos: entries.filter(e => /^photos\/\d{4}-\d{2}-\d{2}-(front|side|back|other)-[a-z0-9-]{8,80}\.(webp|jpg)$/.test(e.name) && e.uncompressed <= RESTORE_LIMITS.photoBytes),
  };
}
/** One entry's bytes, refused above `limit`. */
export async function entryBytes(file: Blob, entry: ZipEntry, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (entry.uncompressed > limit) throw Error(`${entry.name} is larger than ZIGoals restores.`);
  const reader = (await entryStream(file, entry)).getReader(), parts: Uint8Array[] = [];
  let size = 0;
  for (;;) { const {done, value} = await reader.read(); if (done) break; size += value.length; if (size > limit) throw Error(`${entry.name} is larger than ZIGoals restores.`); parts.push(value); }
  const out = new Uint8Array(size); let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}
