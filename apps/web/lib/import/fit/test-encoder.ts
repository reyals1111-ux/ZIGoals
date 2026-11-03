import {fitCrc} from './decode';

/**
 * Session AK (4.7), tests only: writes small synthetic FIT files byte by byte (header, definitions, data, CRC) so the
 * decoder is tested against the protocol, not against itself. Fictional readings only.
 */
const SIZE: Record<number, number> = {0x00: 1, 0x01: 1, 0x02: 1, 0x83: 2, 0x84: 2, 0x85: 4, 0x86: 4, 0x07: 1, 0x88: 4, 0x89: 8, 0x0A: 1, 0x8B: 2, 0x8C: 4, 0x0D: 1, 0x8E: 8, 0x8F: 8, 0x90: 8};
export const T = {enum: 0x00, sint8: 0x01, uint8: 0x02, sint16: 0x83, uint16: 0x84, sint32: 0x85, uint32: 0x86, string: 0x07, float32: 0x88, uint32z: 0x8C} as const;
type Field = [num: number, base: number, size?: number];
type Def = {fields: {num: number; base: number; size: number}[]; little: boolean; devSize: number};
export const FIT_EPOCH_S = 631_065_600;
/** A Unix time (ISO) as FIT seconds. */
export const fitTime = (iso: string) => Date.parse(iso) / 1000 - FIT_EPOCH_S;

export class FitWriter {
  private bytes: number[] = [];
  private defs = new Map<number, Def>();
  define(local: number, global: number, fields: Field[], {big = false, dev = []}: {big?: boolean; dev?: [num: number, size: number, index: number][]} = {}): this {
    const header = 0x40 | (dev.length ? 0x20 : 0) | (local & 0x0F);
    this.bytes.push(header, 0, big ? 1 : 0, ...(big ? [global >> 8, global & 0xFF] : [global & 0xFF, global >> 8]), fields.length);
    const list = fields.map(([num, base, size]) => ({num, base, size: size ?? SIZE[base]!}));
    for (const f of list) this.bytes.push(f.num, f.size, f.base);
    if (dev.length) { this.bytes.push(dev.length); for (const [num, size, index] of dev) this.bytes.push(num, size, index); }
    this.defs.set(local, {fields: list, little: !big, devSize: dev.reduce((t, [, s]) => t + s, 0)});
    return this;
  }
  /** A data message: values in the definition's field order (null writes the type's invalid value). */
  data(local: number, values: (number | string | null)[], {compressedOffset}: {compressedOffset?: number} = {}): this {
    const def = this.defs.get(local);
    if (!def) throw Error(`no definition for local ${local}`);
    this.bytes.push(compressedOffset !== undefined ? 0x80 | ((local & 0x3) << 5) | (compressedOffset & 0x1F) : local & 0x0F);
    def.fields.forEach((f, i) => this.bytes.push(...encode(values[i] ?? null, f.base, f.size, def.little)));
    for (let i = 0; i < def.devSize; i++) this.bytes.push(0xAB);
    return this;
  }
  /** Raw bytes in the data section (for damaged-file tests). */
  raw(...b: number[]): this { this.bytes.push(...b); return this; }
  /** The whole file: header (12 or 14 bytes, with or without its CRC), data and the file CRC. */
  file({headerSize = 14, headerCrc = true, badCrc = false}: {headerSize?: 12 | 14; headerCrc?: boolean; badCrc?: boolean} = {}): Uint8Array {
    const data = this.bytes, out = new Uint8Array(headerSize + data.length + 2), view = new DataView(out.buffer);
    out[0] = headerSize; out[1] = 0x20; view.setUint16(2, 2132, true); view.setUint32(4, data.length, true);
    out.set([0x2E, 0x46, 0x49, 0x54], 8);
    if (headerSize === 14) view.setUint16(12, headerCrc ? fitCrc(out, 0, 12) : 0, true);
    out.set(data, headerSize);
    const crc = fitCrc(out, 0, headerSize + data.length);
    view.setUint16(headerSize + data.length, badCrc ? crc ^ 0x1234 : crc, true);
    return out;
  }
}
function encode(value: number | string | null, base: number, size: number, little: boolean): number[] {
  const out = new Uint8Array(size), view = new DataView(out.buffer);
  if (base === 0x07) { if (typeof value === 'string') out.set(new TextEncoder().encode(value).subarray(0, size - 1)); return [...out]; }
  const n = SIZE[base]!;
  for (let at = 0; at < size; at += n) {
    const v = at === 0 ? value : null;
    if (v === null) {
      if (base === 0x0A || base === 0x8B || base === 0x8C || base === 0x90) continue; // z types: invalid is 0
      if (base === 0x01) view.setInt8(at, 0x7F); else if (base === 0x83) view.setInt16(at, 0x7FFF, little); else if (base === 0x85) view.setInt32(at, 0x7FFFFFFF, little);
      else for (let i = 0; i < n; i++) out[at + i] = 0xFF;
      continue;
    }
    const x = Number(v);
    switch (base) {
      case 0x00: case 0x02: case 0x0A: case 0x0D: view.setUint8(at, x); break;
      case 0x01: view.setInt8(at, x); break;
      case 0x83: view.setInt16(at, x, little); break;
      case 0x84: case 0x8B: view.setUint16(at, x, little); break;
      case 0x85: view.setInt32(at, x, little); break;
      case 0x86: case 0x8C: view.setUint32(at, x, little); break;
      case 0x88: view.setFloat32(at, x, little); break;
      case 0x89: view.setFloat64(at, x, little); break;
      default: view.setBigUint64(at, BigInt(x), little);
    }
  }
  return [...out];
}
