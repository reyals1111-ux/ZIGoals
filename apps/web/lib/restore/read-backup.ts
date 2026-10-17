import {ZIP_ERRORS, entryStream, entryText, listZip, type ZipEntry} from '../import/zip-stream';
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
  // Session AD item 11 (ADR-026): the other files a person may pick here by mistake, and a file that was cut short.
  older: 'This export comes from an early test version of ZIGoals that this app no longer reads, so nothing was changed. Export everything again from a current ZIGoals, then restore that file.',
  incomplete: 'This ZIP stops part-way, as when a download or copy did not finish, so nothing was read or changed. Export everything again, then restore that file.',
  encrypted: 'This is an encrypted backup, not an “Export everything” ZIP. Restore it under Settings → Keep a protected copy. Nothing was changed.',
  unzipped: 'This is the everything.json from inside an export. Choose the zigoals-export ZIP itself, as you downloaded it. Nothing was changed.',
} as const;
const MODULE_BACKUP_NAMES: Record<string, string> = {'zigoals-platform': 'Positions and Goals', 'zigoals-habits': 'Habits', 'zigoals-health': 'Health'};
/** A single module's backup file (Settings → "… backup") picked here instead of an Export everything ZIP. */
export const moduleBackupMessage = (name: string) => `This is a single ${name} backup, not an “Export everything” ZIP. Restore it in Settings under “${name} backup”. Nothing was changed.`;
/**
 * Before the ZIP is read: a file that is not a ZIP but one of ZIGoals' own JSON files gets its own sentence, and a ZIP
 * whose end is missing (its first bytes are a ZIP's) is called incomplete instead of "not a ZIP". Reads 512 bytes at most.
 */
async function foreignFileMessage(file: Blob): Promise<string | null> {
  const head = new TextDecoder().decode(await file.slice(0, 512).arrayBuffer());
  if (head.startsWith('PK\u0003\u0004')) return null;
  if (/"format"\s*:\s*"zigoals-encrypted-backup"/.test(head)) return RESTORE_ERRORS.encrypted;
  if (/"format"\s*:\s*"zigoals-everything"/.test(head)) return RESTORE_ERRORS.unzipped;
  const kind = /"kind"\s*:\s*"(zigoals-(?:platform|habits|health))"/.exec(head)?.[1];
  return kind ? moduleBackupMessage(MODULE_BACKUP_NAMES[kind]!) : null;
}
export type EverythingFile = {format: 'zigoals-everything'; version: 1; exportedAt: string; app?: {version?: string; commit?: string}; modules: Record<string, unknown>; device: Record<string, unknown>; portfolio?: unknown};
/** `oversized`: photos in the file above the restore's size limit, left out and counted for the preview. */
export type OpenedBackup = {file: Blob; json: EverythingFile; vision: ZipEntry[]; photos: ZipEntry[]; oversized: number; demo: boolean};
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export async function openBackup(file: Blob): Promise<OpenedBackup> {
  if (file.size > RESTORE_LIMITS.fileBytes) throw Error(RESTORE_ERRORS.tooLarge);
  const foreign = await foreignFileMessage(file);
  if (foreign) throw Error(foreign);
  let entries: ZipEntry[];
  try { entries = await listZip(file); } catch (error) {
    if (error instanceof Error && error.message === ZIP_ERRORS.notZip && await isZipStart(file)) throw Error(RESTORE_ERRORS.incomplete);
    throw error;
  }
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
  if (typeof json.version === 'number' && json.version < 1) throw Error(RESTORE_ERRORS.older);
  if (json.version !== 1 || typeof json.exportedAt !== 'string' || !isObject(json.modules) || !isObject(json.device)) throw Error(RESTORE_ERRORS.damaged);
  const record = json as unknown as EverythingFile, modules = record.modules;
  const demo = isShowcaseBackup('platform', modules.finance) || isShowcaseBackup('habits', modules.habits) || isShowcaseBackup('health', modules.health);
  const vision = entries.filter(e => /^vision\/img-[A-Za-z0-9-]{1,80}\.(jpg|png|webp)$/.test(e.name)), photos = entries.filter(e => /^photos\/\d{4}-\d{2}-\d{2}-(front|side|back|other)-[a-z0-9-]{8,80}\.(webp|jpg)$/.test(e.name));
  return {
    file, json: record, demo,
    vision: vision.filter(e => e.uncompressed <= RESTORE_LIMITS.visionBytes),
    photos: photos.filter(e => e.uncompressed <= RESTORE_LIMITS.photoBytes),
    oversized: vision.filter(e => e.uncompressed > RESTORE_LIMITS.visionBytes).length + photos.filter(e => e.uncompressed > RESTORE_LIMITS.photoBytes).length,
  };
}
async function isZipStart(file: Blob) { const b = new Uint8Array(await file.slice(0, 4).arrayBuffer()); return b[0] === 0x50 && b[1] === 0x4b && b[2] === 3 && b[3] === 4; }
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
