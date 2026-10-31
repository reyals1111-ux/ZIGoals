/**
 * Session AK (4.7): a hand-written reader for Garmin's FIT files (the "original" file from Garmin, Suunto, COROS, Wahoo
 * and Strava), written to the FIT Protocol document (docs/research/session-ak/FORMATS.md section f): the file header and
 * its optional CRC, the file CRC-16, normal and compressed-timestamp record headers, definition and data messages in
 * either byte order, the base types and their invalid values, and developer fields (skipped by their declared size).
 * Chained files (one FIT file after another) are read in turn. No library is used, and nothing here keeps the data:
 * every data message is handed to the caller once and forgotten, so a long ride's points are never held.
 *
 * Every refusal is a plain sentence. The size and message caps keep a damaged or hostile file from running long.
 */
export const FIT_MAX_BYTES = 30 * 1024 * 1024;
export const FIT_MAX_MESSAGES = 1_500_000;
export const FIT_ERRORS = {
  empty: 'This file is empty. Choose a FIT file from your watch or app.',
  tooLarge: 'This FIT file is larger than 30 MB, which is more than one workout holds. Export one workout at a time.',
  notFit: 'This is not a FIT file. Choose a .fit file exported from a watch, bike computer or fitness app.',
  incomplete: 'This FIT file is incomplete (it ends early). Export or download it again.',
  headerCrc: 'This FIT file’s header does not match its checksum, so it may be damaged. Export or download it again.',
  crc: 'This FIT file does not match its checksum, so it may be damaged. Export or download it again.',
  damaged: 'This FIT file is damaged: a part of it cannot be read. Export or download it again.',
  tooMany: 'This FIT file holds more records than one workout can. Export one workout at a time.',
} as const;

const refuse = (sentence: string): never => { throw new Error(sentence); };

/** The FIT CRC-16 (the protocol document's own nibble table). A whole file, its trailing CRC included, gives 0. */
const CRC_TABLE = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
export function fitCrc(bytes: Uint8Array, start = 0, end = bytes.length, crc = 0): number {
  for (let i = start; i < end; i++) {
    const byte = bytes[i]!;
    let tmp = CRC_TABLE[crc & 0xF]!;
    crc = (crc >> 4) & 0x0FFF; crc = crc ^ tmp ^ CRC_TABLE[byte & 0xF]!;
    tmp = CRC_TABLE[crc & 0xF]!;
    crc = (crc >> 4) & 0x0FFF; crc = crc ^ tmp ^ CRC_TABLE[(byte >> 4) & 0xF]!;
  }
  return crc;
}

/** Base types by their number (the low 5 bits of the base type byte): size in bytes and how a value is read. */
type Kind = 'enum' | 'sint' | 'uint' | 'uintz' | 'string' | 'float' | 'byte';
const BASE: Record<number, {size: number; kind: Kind}> = {
  0: {size: 1, kind: 'enum'}, 1: {size: 1, kind: 'sint'}, 2: {size: 1, kind: 'uint'}, 3: {size: 2, kind: 'sint'}, 4: {size: 2, kind: 'uint'},
  5: {size: 4, kind: 'sint'}, 6: {size: 4, kind: 'uint'}, 7: {size: 1, kind: 'string'}, 8: {size: 4, kind: 'float'}, 9: {size: 8, kind: 'float'},
  10: {size: 1, kind: 'uintz'}, 11: {size: 2, kind: 'uintz'}, 12: {size: 4, kind: 'uintz'}, 13: {size: 1, kind: 'byte'},
  14: {size: 8, kind: 'sint'}, 15: {size: 8, kind: 'uint'}, 16: {size: 8, kind: 'uintz'},
};
export type FitValue = number | string | null;
/** A data message: its global number and its fields by field number (invalid values are null; arrays give their first value). */
export type FitMessage = {global: number; fields: Map<number, FitValue>};
type FieldDef = {num: number; size: number; base: number};
type Definition = {global: number; little: boolean; fields: FieldDef[]; devSize: number};

const utf8 = new TextDecoder('utf-8', {fatal: false});
/** One value of a base type at `at`, or null when it is the type's invalid value. */
function readValue(view: DataView, at: number, base: number, size: number, little: boolean): FitValue {
  const type = BASE[base & 0x1F];
  if (!type) return null;
  if (type.kind === 'string') {
    const bytes = new Uint8Array(view.buffer, view.byteOffset + at, size), end = bytes.indexOf(0);
    const text = utf8.decode(end < 0 ? bytes : bytes.subarray(0, end)).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
    return text || null;
  }
  if (size < type.size || size % type.size !== 0) return null;
  if (type.kind === 'byte') return null; // raw bytes: nothing this reader needs
  const n = type.size;
  if (type.kind === 'float') {
    if (n === 4) { if (view.getUint32(at, little) === 0xFFFFFFFF) return null; const v = view.getFloat32(at, little); return Number.isFinite(v) ? v : null; }
    if (view.getUint32(at, little) === 0xFFFFFFFF && view.getUint32(at + 4, little) === 0xFFFFFFFF) return null;
    const v = view.getFloat64(at, little); return Number.isFinite(v) ? v : null;
  }
  if (n === 8) {
    if (type.kind === 'sint') { const v = view.getBigInt64(at, little); return v === 0x7FFFFFFFFFFFFFFFn || v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER) ? null : Number(v); }
    const v = view.getBigUint64(at, little);
    return v === 0xFFFFFFFFFFFFFFFFn || (type.kind === 'uintz' && v === 0n) || v > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(v);
  }
  if (type.kind === 'sint') {
    const v = n === 1 ? view.getInt8(at) : n === 2 ? view.getInt16(at, little) : view.getInt32(at, little);
    return v === (n === 1 ? 0x7F : n === 2 ? 0x7FFF : 0x7FFFFFFF) ? null : v;
  }
  const v = n === 1 ? view.getUint8(at) : n === 2 ? view.getUint16(at, little) : view.getUint32(at, little);
  if (type.kind === 'uintz') return v === 0 ? null : v;
  return v === (n === 1 ? 0xFF : n === 2 ? 0xFFFF : 0xFFFFFFFF) ? null : v;
}

/** Field 253 is every message's timestamp (seconds since the FIT epoch). */
export const TIMESTAMP_FIELD = 253;

/**
 * Reads a FIT file (or chained files) and hands each data message to `onMessage`, in file order. Returns how many data
 * messages it read. Throws a plain sentence for anything that is not a whole, intact FIT file.
 */
export function decodeFit(bytes: Uint8Array, onMessage: (message: FitMessage) => void, {maxMessages = FIT_MAX_MESSAGES}: {maxMessages?: number} = {}): number {
  if (!bytes.length) refuse(FIT_ERRORS.empty);
  if (bytes.length > FIT_MAX_BYTES) refuse(FIT_ERRORS.tooLarge);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fileStart = 0, messages = 0, at = 0, dataEnd = 0;
  do {
    if (bytes.length - fileStart < 12) refuse(fileStart === 0 ? FIT_ERRORS.notFit : FIT_ERRORS.damaged);
    const headerSize = bytes[fileStart]!;
    if (headerSize < 12 || String.fromCharCode(...bytes.subarray(fileStart + 8, fileStart + 12)) !== '.FIT') refuse(FIT_ERRORS.notFit);
    if (fileStart + headerSize > bytes.length) refuse(FIT_ERRORS.incomplete);
    if (headerSize >= 14) {
      const stored = view.getUint16(fileStart + 12, true);
      if (stored !== 0 && stored !== fitCrc(bytes, fileStart, fileStart + 12)) refuse(FIT_ERRORS.headerCrc);
    }
    const dataSize = view.getUint32(fileStart + 4, true), dataStart = fileStart + headerSize;
    dataEnd = dataStart + dataSize;
    if (dataEnd + 2 > bytes.length) refuse(FIT_ERRORS.incomplete);
    if (fitCrc(bytes, fileStart, dataEnd) !== view.getUint16(dataEnd, true)) refuse(FIT_ERRORS.crc);

    const definitions: (Definition | undefined)[] = new Array(16);
    let lastTimestamp: number | null = null;
    at = dataStart;
    const need = (n: number) => { if (at + n > dataEnd) refuse(FIT_ERRORS.damaged); };
    while (at < dataEnd) {
      const header = bytes[at++]!;
      if (header & 0x80) {
        // Compressed timestamp header: a data message, local type in bits 5–6, a 5-bit time offset in bits 0–4.
        const def = definitions[(header >> 5) & 0x3] ?? refuse(FIT_ERRORS.damaged);
        const offset = header & 0x1F;
        let timestamp: number | null = null;
        if (lastTimestamp !== null) {
          const low: number = lastTimestamp % 32;
          timestamp = lastTimestamp - low + offset + (offset >= low ? 0 : 0x20);
          lastTimestamp = timestamp;
        }
        const message = readData(def);
        if (timestamp !== null && !message.fields.has(TIMESTAMP_FIELD)) message.fields.set(TIMESTAMP_FIELD, timestamp);
        deliver(message);
      } else if (header & 0x40) {
        need(5);
        const little = bytes[at + 1] === 0;
        if (bytes[at + 1]! > 1) refuse(FIT_ERRORS.damaged);
        const global = view.getUint16(at + 2, little), count = bytes[at + 4]!;
        at += 5;
        need(count * 3);
        const fields: FieldDef[] = [];
        for (let i = 0; i < count; i++, at += 3) {
          const size = bytes[at + 1]!;
          if (size === 0) refuse(FIT_ERRORS.damaged);
          fields.push({num: bytes[at]!, size, base: bytes[at + 2]!});
        }
        let devSize = 0;
        if (header & 0x20) {
          need(1);
          const devCount = bytes[at++]!;
          need(devCount * 3);
          for (let i = 0; i < devCount; i++, at += 3) devSize += bytes[at + 1]!;
        }
        definitions[header & 0x0F] = {global, little, fields, devSize};
      } else {
        const def = definitions[header & 0x0F] ?? refuse(FIT_ERRORS.damaged);
        const message = readData(def);
        const ts = message.fields.get(TIMESTAMP_FIELD);
        if (typeof ts === 'number') lastTimestamp = ts;
        deliver(message);
      }
    }
    if (at !== dataEnd) refuse(FIT_ERRORS.damaged);
    fileStart = dataEnd + 2;
    // A chained file follows only when a whole header could; trailing padding shorter than that is ignored.
  } while (bytes.length - fileStart >= 14 && String.fromCharCode(...bytes.subarray(fileStart + 8, fileStart + 12)) === '.FIT');
  return messages;

  function readData(def: Definition): FitMessage {
    const fields = new Map<number, FitValue>();
    for (const f of def.fields) {
      if (at + f.size > dataEnd) refuse(FIT_ERRORS.damaged);
      if (f.num !== 255) fields.set(f.num, readValue(view, at, f.base, f.size, def.little));
      at += f.size;
    }
    if (at + def.devSize > dataEnd) refuse(FIT_ERRORS.damaged);
    at += def.devSize; // developer fields: skipped by their declared size
    return {global: def.global, fields};
  }
  function deliver(message: FitMessage) {
    if (++messages > maxMessages) refuse(FIT_ERRORS.tooMany);
    onMessage(message);
  }
}
