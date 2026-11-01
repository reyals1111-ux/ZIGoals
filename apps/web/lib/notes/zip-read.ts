import {crc32} from '../export/zip';

/**
 * Session AK (B5): a careful ZIP reader for importing Markdown notes — the archive is the person's file, so it is read as
 * untrusted bytes. Stored (method 0) and deflated (method 8, through the browser's own DecompressionStream) entries
 * only; no encryption, no ZIP64. Caps hold before and during reading: the archive's size, the number of entries, each
 * file's declared and REAL size (inflation stops the moment it passes the cap, so a zip bomb never fills memory), the
 * total, and the compression ratio. Names that leave the archive, absolute paths, hidden files and folders are skipped.
 * Every entry's CRC-32 is checked. Nothing in the archive is ever run: the caller only reads text out of it.
 */
export type ZipCaps = {maxArchive: number; maxEntries: number; maxFile: number; maxTotal: number; maxRatio: number};
export const NOTE_ZIP_CAPS: ZipCaps = {maxArchive: 25 * 1024 * 1024, maxEntries: 2000, maxFile: 1024 * 1024, maxTotal: 30 * 1024 * 1024, maxRatio: 100};
export type ZipFile = {name: string; data: Uint8Array};
export type ZipSkip = {name: string; reason: string};
export type Inflate = (compressed: Uint8Array, max: number) => Promise<Uint8Array>;

const u16 = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u32 = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;
export class ZipError extends Error {}
const TOO_BIG = 'larger than ZIGoals reads';

/** Inflates raw DEFLATE bytes with the platform's DecompressionStream, refusing past `max` bytes of output. */
export const inflateRaw: Inflate = async (compressed, max) => {
  if (typeof DecompressionStream === 'undefined') throw new ZipError('This browser cannot open compressed ZIP files. Choose the .md files instead.');
  const stream = new Blob([compressed as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  const reader = stream.getReader(), parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.length;
      if (total > max) { await reader.cancel().catch(() => undefined); throw new ZipError(TOO_BIG); }
      parts.push(value);
    }
  } catch (e) { if (e instanceof ZipError) throw e; throw new ZipError('damaged'); }
  const out = new Uint8Array(total); let at = 0; for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
};

/** A safe, relative name ("Notes/Japan.md"), or null for one that must be skipped. */
export function safeEntryName(raw: string): string | null {
  const name = raw.replace(/\\/g, '/');
  if (!name || name.length > 400 || name.endsWith('/') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || /[\0-\x1f]/.test(name)) return null;
  const parts = name.split('/');
  if (parts.some(p => p === '..' || p === '.' || p === '' || p.startsWith('.') || p === '__MACOSX')) return null;
  return name;
}

/**
 * Reads the entries `wanted` accepts. Entries not wanted are never inflated. Returns the files and, for wanted entries
 * that could not be read, why. Throws a ZipError when the archive itself cannot be read.
 */
export async function readZip(archive: Uint8Array, wanted: (name: string) => boolean, {caps = NOTE_ZIP_CAPS, inflate = inflateRaw}: {caps?: ZipCaps; inflate?: Inflate} = {}): Promise<{files: ZipFile[]; skipped: ZipSkip[]}> {
  if (archive.length > caps.maxArchive) throw new ZipError(`This ZIP is over ${Math.round(caps.maxArchive / 1024 / 1024)} MB. Choose a smaller one.`);
  let end = -1;
  for (let i = archive.length - 22; i >= Math.max(0, archive.length - 22 - 65_535); i--) if (u32(archive, i) === 0x06054B50) { end = i; break; }
  if (end < 0) throw new ZipError('This file is not a ZIP archive ZIGoals can read.');
  const count = u16(archive, end + 10), size = u32(archive, end + 12), offset = u32(archive, end + 16);
  if (count === 0xFFFF || offset === 0xFFFFFFFF || u16(archive, end + 4) !== 0) throw new ZipError('This ZIP uses a format ZIGoals does not read (ZIP64 or split).');
  if (count > caps.maxEntries) throw new ZipError(`This ZIP holds more than ${caps.maxEntries} entries. Choose a smaller one.`);
  if (offset + size > end) throw new ZipError('This ZIP archive is damaged.');
  const files: ZipFile[] = [], skipped: ZipSkip[] = [];
  let at = offset, total = 0;
  for (let n = 0; n < count; n++) {
    if (at + 46 > end || u32(archive, at) !== 0x02014B50) throw new ZipError('This ZIP archive is damaged.');
    const flags = u16(archive, at + 8), method = u16(archive, at + 10), crc = u32(archive, at + 16), compressed = u32(archive, at + 20), uncompressed = u32(archive, at + 24);
    const nameLength = u16(archive, at + 28), extraLength = u16(archive, at + 30), commentLength = u16(archive, at + 32), local = u32(archive, at + 42);
    const rawName = new TextDecoder('utf-8').decode(archive.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    const name = safeEntryName(rawName);
    if (!name || !wanted(name)) continue;
    const skip = (reason: string) => { skipped.push({name, reason}); };
    if (flags & 0x0001) { skip('it is encrypted'); continue; }
    if (method !== 0 && method !== 8) { skip('it uses a compression ZIGoals does not read'); continue; }
    if (uncompressed > caps.maxFile) { skip(`it is ${TOO_BIG}`); continue; }
    if (method === 8 && uncompressed > caps.maxRatio * compressed + 1024) { skip('it is compressed more than a text file can be'); continue; }
    if (total + uncompressed > caps.maxTotal) { skip('the archive holds more than ZIGoals reads at once'); continue; }
    if (local + 30 > archive.length || u32(archive, local) !== 0x04034B50) { skip('it is damaged'); continue; }
    const start = local + 30 + u16(archive, local + 26) + u16(archive, local + 28);
    if (start + compressed > archive.length) { skip('it is damaged'); continue; }
    const body = archive.subarray(start, start + compressed);
    let data: Uint8Array;
    try { data = method === 0 ? new Uint8Array(body) : await inflate(body, caps.maxFile); }
    catch (e) { skip(e instanceof ZipError && e.message === TOO_BIG ? `it is ${TOO_BIG}` : 'it is damaged'); continue; }
    if (data.length !== uncompressed || crc32(data) !== crc) { skip('it is damaged (its check does not match)'); continue; }
    total += data.length;
    files.push({name, data});
  }
  return {files, skipped};
}
