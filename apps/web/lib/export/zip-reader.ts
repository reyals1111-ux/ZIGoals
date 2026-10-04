import {crc32} from './zip';

/**
 * An independent stored-ZIP reader for tests and verification only (T4): finds the end record, walks the central
 * directory and checks every local header, size and CRC-32. It shares nothing with the writer but the CRC table.
 */
const u16 = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u32 = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;
const check = (ok: boolean, what: string) => { if (!ok) throw Error(`ZIP: ${what}`); };
export function readStoredZip(archive: Uint8Array): {name: string; data: Uint8Array; time: number; date: number; utf8: boolean}[] {
  let end = -1;
  for (let i = archive.length - 22; i >= 0; i--) if (u32(archive, i) === 0x06054B50) { end = i; break; }
  check(end >= 0, 'no end record');
  const count = u16(archive, end + 10), size = u32(archive, end + 12), offset = u32(archive, end + 16);
  check(u16(archive, end + 8) === count && u16(archive, end + 20) === 0 && end === offset + size, 'end record');
  const entries: ReturnType<typeof readStoredZip> = [];
  let at = offset;
  for (let n = 0; n < count; n++) {
    check(u32(archive, at) === 0x02014B50, 'central header signature');
    const flags = u16(archive, at + 8), method = u16(archive, at + 10), time = u16(archive, at + 12), date = u16(archive, at + 14), crc = u32(archive, at + 16), compressed = u32(archive, at + 20), uncompressed = u32(archive, at + 24), nameLength = u16(archive, at + 28), extraLength = u16(archive, at + 30), commentLength = u16(archive, at + 32), local = u32(archive, at + 42);
    check(method === 0 && compressed === uncompressed && extraLength === 0 && commentLength === 0, 'stored entry');
    const name = new TextDecoder().decode(archive.subarray(at + 46, at + 46 + nameLength));
    check(u32(archive, local) === 0x04034B50 && u16(archive, local + 8) === 0 && u32(archive, local + 14) === crc && u32(archive, local + 18) === uncompressed && u32(archive, local + 22) === uncompressed, `local header of ${name}`);
    const localNameLength = u16(archive, local + 26);
    check(new TextDecoder().decode(archive.subarray(local + 30, local + 30 + localNameLength)) === name && u16(archive, local + 28) === 0, `local name of ${name}`);
    const start = local + 30 + localNameLength, data = archive.subarray(start, start + uncompressed);
    check(crc32(data) === crc, `CRC of ${name}`);
    entries.push({name, data: new Uint8Array(data), time, date, utf8: (flags & 0x0800) !== 0});
    at += 46 + nameLength;
  }
  check(at === offset + size, 'central directory size');
  return entries;
}
