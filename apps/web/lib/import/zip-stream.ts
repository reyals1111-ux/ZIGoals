/**
 * A streaming ZIP reader for imports (Session W Part 7), written to the ZIP specification (PKWARE APPNOTE 6.3.x: end of
 * central directory, Zip64 locator and record, central directory headers, local headers, the Zip64 extra field 0x0001,
 * data descriptors). It reads only what it needs from a `Blob` (`slice`): the tail for the directory, then one entry at a
 * time, inflated by the browser's own `DecompressionStream('deflate-raw')`; the CRC-32 is checked as the bytes pass, so
 * a large export (an Apple Health export can be gigabytes) is never held in memory. Encrypted entries and compression
 * methods other than stored (0) and deflate (8) are refused with a plain message. No library is used.
 */
export type ZipEntry = {name: string; method: number; flags: number; crc: number; compressed: number; uncompressed: number; localOffset: number};
export const ZIP_ERRORS = {
  notZip: 'This file is not a ZIP archive. Choose the export file as you downloaded it.',
  damaged: 'This ZIP archive is damaged or incomplete. Download the export again.',
  encrypted: 'This ZIP archive is password-protected. Export it again without a password.',
  method: 'This ZIP archive uses a compression this browser cannot open.',
  crc: 'A file inside the ZIP archive does not match its checksum. Download the export again.',
  noStream: 'This browser cannot unpack ZIP archives. Try a current Chrome, Edge, Firefox or Safari.',
} as const;
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
/** One step of the IEEE CRC-32: start with 0xFFFFFFFF, finish with `^ 0xFFFFFFFF >>> 0`. */
export function crcStep(crc: number, bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length; i++) crc = TABLE[(crc ^ bytes[i]!) & 0xFF]! ^ (crc >>> 8);
  return crc;
}
const fail = (message: string): never => { throw Error(message); };
async function bytesAt(file: Blob, start: number, end: number): Promise<DataView> {
  if (start < 0 || end > file.size || end < start) fail(ZIP_ERRORS.damaged);
  return new DataView(await file.slice(start, end).arrayBuffer());
}
const u64 = (v: DataView, at: number) => { const value = Number(v.getBigUint64(at, true)); return Number.isSafeInteger(value) ? value : fail(ZIP_ERRORS.damaged); };

/** The archive's entries, from its central directory (Zip64 included). */
export async function listZip(file: Blob): Promise<ZipEntry[]> {
  if (file.size < 22) fail(ZIP_ERRORS.notZip);
  // The end record is in the last 22 bytes plus a comment of up to 65,535 bytes.
  const tailStart = Math.max(0, file.size - 22 - 65_535), tail = await bytesAt(file, tailStart, file.size);
  let end = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054B50 && i + 22 + tail.getUint16(i + 20, true) === tail.byteLength) { end = i; break; }
  if (end < 0) fail(ZIP_ERRORS.notZip);
  let count = tail.getUint16(end + 10, true), size = tail.getUint32(end + 12, true), offset = tail.getUint32(end + 16, true);
  if (count === 0xFFFF || size === 0xFFFFFFFF || offset === 0xFFFFFFFF) {
    // Zip64: a 20-byte locator just before the end record points at the Zip64 end record.
    const locatorAt = tailStart + end - 20;
    const locator = await bytesAt(file, locatorAt, locatorAt + 20);
    if (locator.getUint32(0, true) !== 0x07064B50) fail(ZIP_ERRORS.damaged);
    const recordAt = u64(locator, 8), record = await bytesAt(file, recordAt, recordAt + 56);
    if (record.getUint32(0, true) !== 0x06064B50) fail(ZIP_ERRORS.damaged);
    count = u64(record, 32); size = u64(record, 40); offset = u64(record, 48);
  }
  if (offset + size > file.size) fail(ZIP_ERRORS.damaged);
  const dir = await bytesAt(file, offset, offset + size), entries: ZipEntry[] = [], utf8 = new TextDecoder('utf-8'), latin = new TextDecoder('latin1');
  let at = 0;
  for (let n = 0; n < count; n++) {
    if (at + 46 > dir.byteLength || dir.getUint32(at, true) !== 0x02014B50) fail(ZIP_ERRORS.damaged);
    const flags = dir.getUint16(at + 8, true), method = dir.getUint16(at + 10, true), crc = dir.getUint32(at + 16, true);
    let compressed = dir.getUint32(at + 20, true), uncompressed = dir.getUint32(at + 24, true), localOffset = dir.getUint32(at + 42, true);
    const nameLength = dir.getUint16(at + 28, true), extraLength = dir.getUint16(at + 30, true), commentLength = dir.getUint16(at + 32, true);
    const nameBytes = new Uint8Array(dir.buffer, dir.byteOffset + at + 46, nameLength), name = (flags & 0x0800 ? utf8 : latin).decode(nameBytes);
    // The Zip64 extra field holds, in this order, only the values that read 0xFFFFFFFF above.
    let extra = at + 46 + nameLength;
    const extraEnd = extra + extraLength;
    while (extra + 4 <= extraEnd) {
      const id = dir.getUint16(extra, true), length = dir.getUint16(extra + 2, true);
      if (id === 0x0001) {
        let field = extra + 4;
        if (uncompressed === 0xFFFFFFFF) { uncompressed = u64(dir, field); field += 8; }
        if (compressed === 0xFFFFFFFF) { compressed = u64(dir, field); field += 8; }
        if (localOffset === 0xFFFFFFFF) { localOffset = u64(dir, field); }
      }
      extra += 4 + length;
    }
    entries.push({name, method, flags, crc, compressed, uncompressed, localOffset});
    at = extraEnd + commentLength;
  }
  return entries;
}
/** The entry's bytes as a stream, inflated if needed; the stream errors if the archive is damaged or the CRC is wrong. */
export async function entryStream(file: Blob, entry: ZipEntry): Promise<ReadableStream<Uint8Array>> {
  if (entry.flags & 0x0001) fail(ZIP_ERRORS.encrypted);
  if (entry.method !== 0 && entry.method !== 8) fail(ZIP_ERRORS.method);
  const local = await bytesAt(file, entry.localOffset, entry.localOffset + 30);
  if (local.getUint32(0, true) !== 0x04034B50) fail(ZIP_ERRORS.damaged);
  const start = entry.localOffset + 30 + local.getUint16(26, true) + local.getUint16(28, true);
  if (start + entry.compressed > file.size) fail(ZIP_ERRORS.damaged);
  let raw = file.slice(start, start + entry.compressed).stream() as ReadableStream<Uint8Array>;
  if (entry.method === 8) {
    if (typeof DecompressionStream === 'undefined') fail(ZIP_ERRORS.noStream);
    raw = raw.pipeThrough(new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  }
  let crc = 0xFFFFFFFF, seen = 0;
  return raw.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) { crc = crcStep(crc, chunk); seen += chunk.length; if (seen > entry.uncompressed) controller.error(Error(ZIP_ERRORS.damaged)); else controller.enqueue(chunk); },
    flush(controller) { if (seen !== entry.uncompressed) controller.error(Error(ZIP_ERRORS.damaged)); else if (((crc ^ 0xFFFFFFFF) >>> 0) !== entry.crc) controller.error(Error(ZIP_ERRORS.crc)); },
  }));
}
/** A small entry as text (a CSV, a JSON file), refused above `limit` bytes so a surprise never fills memory. */
export async function entryText(file: Blob, entry: ZipEntry, limit = 64 * 1024 * 1024): Promise<string> {
  if (entry.uncompressed > limit) throw Error(`${entry.name} is larger than ZIGoals reads in one piece.`);
  const reader = (await entryStream(file, entry)).pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>).getReader();
  let text = '';
  for (;;) { const {done, value} = await reader.read(); if (done) break; text += value; }
  return text;
}
