import {describe, expect, test} from 'vitest';
import {ZIP_TOO_LARGE, buildStoredZip, crc32, dosDateTime} from './zip';

const bytes = (text: string) => new TextEncoder().encode(text);
const u16 = (b: Uint8Array, at: number) => b[at]! | (b[at + 1]! << 8);
const u32 = (b: Uint8Array, at: number) => (b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16) | (b[at + 3]! << 24)) >>> 0;
/** An independent reader: finds the end record, walks the central directory, checks every local header, size and CRC. */
export function readStoredZip(archive: Uint8Array): {name: string; data: Uint8Array; time: number; date: number; utf8: boolean}[] {
  let end = -1;
  for (let i = archive.length - 22; i >= 0; i--) if (u32(archive, i) === 0x06054B50) { end = i; break; }
  if (end < 0) throw Error('no end record');
  const count = u16(archive, end + 10), size = u32(archive, end + 12), offset = u32(archive, end + 16);
  expect(u16(archive, end + 8)).toBe(count); expect(u16(archive, end + 20)).toBe(0); expect(end).toBe(offset + size);
  const entries: ReturnType<typeof readStoredZip> = [];
  let at = offset;
  for (let n = 0; n < count; n++) {
    expect(u32(archive, at)).toBe(0x02014B50);
    const flags = u16(archive, at + 8), method = u16(archive, at + 10), time = u16(archive, at + 12), date = u16(archive, at + 14), crc = u32(archive, at + 16), compressed = u32(archive, at + 20), uncompressed = u32(archive, at + 24), nameLength = u16(archive, at + 28), extraLength = u16(archive, at + 30), commentLength = u16(archive, at + 32), local = u32(archive, at + 42);
    expect(method).toBe(0); expect(compressed).toBe(uncompressed); expect(extraLength).toBe(0); expect(commentLength).toBe(0);
    const name = new TextDecoder().decode(archive.subarray(at + 46, at + 46 + nameLength));
    expect(u32(archive, local)).toBe(0x04034B50);
    expect(u16(archive, local + 8)).toBe(0); expect(u32(archive, local + 14)).toBe(crc); expect(u32(archive, local + 18)).toBe(uncompressed); expect(u32(archive, local + 22)).toBe(uncompressed);
    const localNameLength = u16(archive, local + 26), localExtra = u16(archive, local + 28);
    expect(new TextDecoder().decode(archive.subarray(local + 30, local + 30 + localNameLength))).toBe(name); expect(localExtra).toBe(0);
    const start = local + 30 + localNameLength, data = archive.subarray(start, start + uncompressed);
    expect(crc32(data)).toBe(crc);
    entries.push({name, data: new Uint8Array(data), time, date, utf8: (flags & 0x0800) !== 0});
    at += 46 + nameLength;
  }
  expect(at).toBe(offset + size);
  return entries;
}

describe('T4 stored ZIP writer', () => {
  test('crc32 matches the IEEE vectors', () => {
    expect(crc32(bytes(''))).toBe(0);
    expect(crc32(bytes('123456789'))).toBe(0xCBF43926);
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(0x414FA339);
  });
  test('three entries round-trip byte-identically through an independent reader', () => {
    const big = 'x'.repeat(70_000), modified = new Date(2026, 9, 1, 12, 34, 56);
    const archive = buildStoredZip([{name: 'empty.txt', data: '', modified}, {name: 'big.txt', data: big, modified}, {name: 'ünïcode.txt', data: new Uint8Array([0, 1, 2, 255]), modified}]);
    const entries = readStoredZip(archive);
    expect(entries.map(e => e.name)).toEqual(['empty.txt', 'big.txt', 'ünïcode.txt']);
    expect(entries[0]!.data.length).toBe(0);
    expect(new TextDecoder().decode(entries[1]!.data)).toBe(big);
    expect([...entries[2]!.data]).toEqual([0, 1, 2, 255]);
    expect(entries.every(e => e.utf8)).toBe(true);
    const {time, date} = dosDateTime(modified);
    expect(entries[0]!.time).toBe(time); expect(entries[0]!.date).toBe(date);
    expect([time >> 11, (time >> 5) & 63, (time & 31) * 2]).toEqual([12, 34, 56]);
    expect([(date >> 9) + 1980, (date >> 5) & 15, date & 31]).toEqual([2026, 10, 1]);
  });
  test('an empty archive is an end record only', () => {
    const archive = buildStoredZip([]);
    expect(archive.length).toBe(22); expect(readStoredZip(archive)).toEqual([]);
  });
  test('refusals: too many entries, an entry over the cap, unsafe names', () => {
    const modified = new Date();
    expect(() => buildStoredZip(Array.from({length: 65_536}, (_, i) => ({name: `f${i}`, data: '', modified})))).toThrow(ZIP_TOO_LARGE);
    const huge = {length: 100 * 1024 * 1024 + 1} as Uint8Array;
    expect(() => buildStoredZip([{name: 'huge.bin', data: huge, modified}])).toThrow(ZIP_TOO_LARGE);
    for (const name of ['', '../x', '/x', 'a/../b', 'C:\\x', 'x'.repeat(256)]) expect(() => buildStoredZip([{name, data: '', modified}]), name).toThrow();
  });
  test('years before 1980 clamp and seconds round down to even', () => {
    const {time, date} = dosDateTime(new Date(1970, 0, 1, 1, 2, 3));
    expect((date >> 9) + 1980).toBe(1980); expect((time & 31) * 2).toBe(2);
  });
});
