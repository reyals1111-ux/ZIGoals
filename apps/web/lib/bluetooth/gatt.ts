/**
 * Bluetooth GATT readings (Session W Part 8), parsed to the Bluetooth SIG's GATT Specification Supplement (version date
 * 2026-09-09) and the Heart Rate, Weight Scale and Body Composition service specifications (docs/product/
 * DEVICE_LINKS.md): every field little-endian, in table order. A reading that cannot be parsed, or that the device marks
 * "Measurement Unsuccessful" (0xFFFF), is null: nothing is guessed.
 */
export type HeartRateReading = {bpm: number; contact: 'detected' | 'lost' | 'unsupported'; rrMs: number[]};
/**
 * Heart Rate Measurement (0x2A37): flags (bit 0 value format uint8/uint16, bit 1 sensor contact detected, bit 2 contact
 * supported, bit 3 energy expended present, bit 4 RR intervals present), the rate, then the optional fields. Energy
 * expended is skipped: the specifications disagree on its unit (joule or kilojoule), and ZIGoals never estimates energy.
 * RR intervals are in 1/1024 s, oldest first; they are returned in milliseconds.
 */
export function parseHeartRate(view: DataView): HeartRateReading | null {
  if (view.byteLength < 2) return null;
  const flags = view.getUint8(0), wide = (flags & 0x01) !== 0;
  let at = 1;
  if (view.byteLength < at + (wide ? 2 : 1)) return null;
  const bpm = wide ? view.getUint16(at, true) : view.getUint8(at);
  at += wide ? 2 : 1;
  if ((flags & 0x08) !== 0) { if (view.byteLength < at + 2) return null; at += 2; }
  const rrMs: number[] = [];
  if ((flags & 0x10) !== 0) for (; at + 1 < view.byteLength; at += 2) rrMs.push(Math.round(view.getUint16(at, true) * 1000 / 1024));
  if (bpm < 20 || bpm > 250) return null;
  const supported = (flags & 0x04) !== 0, detected = (flags & 0x02) !== 0;
  return {bpm, contact: supported ? (detected ? 'detected' : 'lost') : 'unsupported', rrMs};
}
export type WeightReading = {kg: number; unit: 'kg' | 'lb'; userId?: number; bmi?: number; heightM?: number};
const LB = 0.45359237;
/**
 * Weight Measurement (0x2A9D): flags (bit 0 imperial, bit 1 time stamp, bit 2 user ID, bit 3 BMI and height), weight in
 * 0.005 kg or 0.01 lb, then a 7-byte time stamp, a user ID (0xFF unknown), BMI (0.1 kg/m²) and height (0.001 m or 0.1 in).
 * The scale's time stamp has no zone, so the reading's time is when ZIGoals received it.
 */
export function parseWeight(view: DataView): WeightReading | null {
  if (view.byteLength < 3) return null;
  const flags = view.getUint8(0), imperial = (flags & 0x01) !== 0, raw = view.getUint16(1, true);
  if (raw === 0xFFFF) return null;
  let at = 3;
  if ((flags & 0x02) !== 0) { if (view.byteLength < at + 7) return null; at += 7; }
  let userId: number | undefined;
  if ((flags & 0x04) !== 0) { if (view.byteLength < at + 1) return null; const id = view.getUint8(at); at += 1; if (id !== 0xFF) userId = id; }
  let bmi: number | undefined, heightM: number | undefined;
  if ((flags & 0x08) !== 0) {
    if (view.byteLength < at + 4) return null;
    bmi = view.getUint16(at, true) / 10;
    const h = view.getUint16(at + 2, true);
    heightM = imperial ? h * 0.1 * 0.0254 : h / 1000;
  }
  const kg = imperial ? raw * 0.01 * LB : raw * 0.005;
  if (!(kg >= 1 && kg <= 1000)) return null;
  return {kg: Math.round(kg * 1000) / 1000, unit: imperial ? 'lb' : 'kg', ...(userId !== undefined ? {userId} : {}), ...(bmi !== undefined ? {bmi} : {}), ...(heightM !== undefined ? {heightM: Math.round(heightM * 1000) / 1000} : {})};
}
export type BodyCompositionReading = {fatPct: number | null; kg: number | null; unit: 'kg' | 'lb'; continued: boolean};
/**
 * Body Composition Measurement (0x2A9C): 16-bit flags, body fat in 0.1 % (always present; 0xFFFF unsuccessful), then the
 * optional fields in order: time stamp (7), user ID (1), basal metabolism, muscle %, muscle mass, fat-free mass, soft lean
 * mass, body water mass, impedance, weight, height (2 each; masses in 0.005 kg or 0.01 lb). Bit 12 marks a measurement
 * split over two indications (the second without time stamp or user ID); `continued` says so.
 */
export function parseBodyComposition(view: DataView): BodyCompositionReading | null {
  if (view.byteLength < 4) return null;
  const flags = view.getUint16(0, true), imperial = (flags & 0x0001) !== 0, fat = view.getUint16(2, true);
  let at = 4;
  const skip = (bit: number, bytes: number) => { if ((flags & bit) !== 0) at += bytes; };
  skip(0x0002, 7); skip(0x0004, 1); skip(0x0008, 2); skip(0x0010, 2); skip(0x0020, 2); skip(0x0040, 2); skip(0x0080, 2); skip(0x0100, 2); skip(0x0200, 2);
  let kg: number | null = null;
  if ((flags & 0x0400) !== 0) { if (view.byteLength < at + 2) return null; const w = view.getUint16(at, true); kg = w === 0xFFFF ? null : Math.round((imperial ? w * 0.01 * LB : w * 0.005) * 1000) / 1000; }
  const fatPct = fat === 0xFFFF ? null : fat / 10;
  if (fatPct !== null && (fatPct < 0 || fatPct > 100)) return null;
  return {fatPct, kg, unit: imperial ? 'lb' : 'kg', continued: (flags & 0x1000) !== 0};
}
