/**
 * A small stored-ZIP writer (Session P, PR 3, T4; docs/product/features/T4-export-everything.md): method 0 (no
 * compression), CRC-32, UTF-8 names (flag 0x0800), no data descriptors, no ZIP64, no extra fields. Pure, no dependency;
 * every spreadsheet, archiver and operating system opens the result. Independent readers in the tests verify it.
 */
export type ZipEntry = {name: string; data: Uint8Array | string; modified: Date};
export const ZIP_TOO_LARGE = 'The export is larger than ZIGoals can write.';
export const ZIP_MAX_ENTRIES = 65_535, ZIP_MAX_BYTES = 100 * 1024 * 1024;
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
/** IEEE CRC-32 (polynomial 0xEDB88320), as ZIP, PNG and gzip use it. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]!) & 0xFF]! ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
const encoder = new TextEncoder();
/** DOS time and date (local time; years before 1980 become 1980, seconds are even). */
export function dosDateTime(modified: Date): {time: number; date: number} {
  const year = Math.min(Math.max(modified.getFullYear(), 1980), 2107);
  const time = (modified.getHours() << 11) | (modified.getMinutes() << 5) | (modified.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((modified.getMonth() + 1) << 5) | modified.getDate();
  return {time, date};
}
function checkName(name: string): Uint8Array {
  if (!name || name.length > 255) throw Error(`ZIP entry name "${name.slice(0, 40)}" is empty or too long.`);
  if (name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.startsWith('\\')) throw Error(`ZIP entry name "${name}" must be relative.`);
  if (name.split(/[/\\]/).some(part => part === '..')) throw Error(`ZIP entry name "${name}" must not leave the archive.`);
  const bytes = encoder.encode(name);
  if (bytes.length > 255) throw Error(`ZIP entry name "${name.slice(0, 40)}" is too long.`);
  return bytes;
}
class Writer {
  parts: Uint8Array[] = []; length = 0;
  push(bytes: Uint8Array) { this.parts.push(bytes); this.length += bytes.length; }
  u16(n: number) { this.push(new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF])); }
  u32(n: number) { this.push(new Uint8Array([n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF])); }
  bytes(): Uint8Array { const out = new Uint8Array(this.length); let offset = 0; for (const part of this.parts) { out.set(part, offset); offset += part.length; } return out; }
}
/** The archive bytes: local headers and data in order, then the central directory and the end record. */
export function buildStoredZip(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length > ZIP_MAX_ENTRIES) throw Error(ZIP_TOO_LARGE);
  const prepared = entries.map(entry => {
    const name = checkName(entry.name), data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    if (data.length > ZIP_MAX_BYTES) throw Error(ZIP_TOO_LARGE);
    return {name, data, crc: crc32(data), ...dosDateTime(entry.modified)};
  });
  if (prepared.reduce((sum, e) => sum + e.data.length, 0) > ZIP_MAX_BYTES) throw Error(ZIP_TOO_LARGE);
  const out = new Writer(), offsets: number[] = [];
  for (const e of prepared) {
    offsets.push(out.length);
    out.u32(0x04034B50); out.u16(10); out.u16(0x0800); out.u16(0); out.u16(e.time); out.u16(e.date); out.u32(e.crc); out.u32(e.data.length); out.u32(e.data.length); out.u16(e.name.length); out.u16(0); out.push(e.name); out.push(e.data);
  }
  const directoryOffset = out.length;
  prepared.forEach((e, index) => {
    out.u32(0x02014B50); out.u16(20); out.u16(10); out.u16(0x0800); out.u16(0); out.u16(e.time); out.u16(e.date); out.u32(e.crc); out.u32(e.data.length); out.u32(e.data.length); out.u16(e.name.length); out.u16(0); out.u16(0); out.u16(0); out.u16(0); out.u32(0); out.u32(offsets[index]!); out.push(e.name);
  });
  const directorySize = out.length - directoryOffset;
  out.u32(0x06054B50); out.u16(0); out.u16(0); out.u16(prepared.length); out.u16(prepared.length); out.u32(directorySize); out.u32(directoryOffset); out.u16(0);
  return out.bytes();
}
