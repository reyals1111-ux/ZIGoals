import {expect, test} from 'vitest';
import {parseBodyComposition, parseHeartRate, parseWeight} from './gatt';
import {heartReading, heartSummary, resetHeartForTests} from './heart-store';

// Session W Part 8: Bluetooth readings parsed to the SIG's GATT Specification Supplement (little-endian, table order).
const view = (...bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);
const u16 = (n: number) => [n & 0xFF, (n >> 8) & 0xFF];

test('heart rate: 8- and 16-bit values, sensor contact, energy skipped, RR intervals in milliseconds', () => {
  expect(parseHeartRate(view(0x00, 72))).toEqual({bpm: 72, contact: 'unsupported', rrMs: []});
  expect(parseHeartRate(view(0x06, 64))).toEqual({bpm: 64, contact: 'detected', rrMs: []});
  expect(parseHeartRate(view(0x04, 64))).toEqual({bpm: 64, contact: 'lost', rrMs: []});
  expect(parseHeartRate(view(0x01, ...u16(181)))).toEqual({bpm: 181, contact: 'unsupported', rrMs: []});
  // Energy expended (bit 3) is skipped; RR intervals (bit 4) are 1/1024 s: 1024 → 1000 ms, 820 → 801 ms.
  expect(parseHeartRate(view(0x18, 60, ...u16(1234), ...u16(1024), ...u16(820)))).toEqual({bpm: 60, contact: 'unsupported', rrMs: [1000, 801]});
  expect(parseHeartRate(view(0x01, 60))).toBeNull();
  expect(parseHeartRate(view(0x00, 3))).toBeNull();
});
test('weight: SI and imperial, the optional time stamp, user and BMI with height; "unsuccessful" is null', () => {
  expect(parseWeight(view(0x00, ...u16(14040)))).toEqual({kg: 70.2, unit: 'kg'});
  expect(parseWeight(view(0x01, ...u16(15430)))).toEqual({kg: 69.989, unit: 'lb'});
  expect(parseWeight(view(0x0E, ...u16(14040), ...u16(2026), 10, 7, 7, 30, 0, 3, ...u16(229), ...u16(1750)))).toEqual({kg: 70.2, unit: 'kg', userId: 3, bmi: 22.9, heightM: 1.75});
  expect(parseWeight(view(0x04, ...u16(14040), 0xFF))).toEqual({kg: 70.2, unit: 'kg'});
  expect(parseWeight(view(0x00, 0xFF, 0xFF))).toBeNull();
  expect(parseWeight(view(0x02, ...u16(14040), 1, 2))).toBeNull();
});
test('body composition: body fat, the weight field after the optional ones, the two-packet mark', () => {
  // Flags: weight (bit 10) and time stamp (bit 1); body fat 18.4 %; 7-byte stamp; weight 70.2 kg.
  expect(parseBodyComposition(view(...u16(0x0402), ...u16(184), ...u16(2026), 10, 7, 7, 30, 0, ...u16(14040)))).toEqual({fatPct: 18.4, kg: 70.2, unit: 'kg', continued: false});
  expect(parseBodyComposition(view(...u16(0x1000), ...u16(0xFFFF)))).toEqual({fatPct: null, kg: null, unit: 'kg', continued: true});
  expect(parseBodyComposition(view(...u16(0x0400), ...u16(200)))).toBeNull();
});
test('the summary a meditation may keep: lowest, average and highest of the readings inside its window, at least ten', () => {
  resetHeartForTests();
  const t0 = Date.parse('2026-10-07T07:00:00Z');
  for (let i = 0; i < 12; i++) heartReading({bpm: 60 + i, contact: 'detected', rrMs: []}, t0 + i * 5000);
  heartReading({bpm: 150, contact: 'lost', rrMs: []}, t0 + 30_000);
  expect(heartSummary(t0, t0 + 60_000)).toEqual({min: 60, avg: 66, max: 71, n: 12});
  expect(heartSummary(t0 + 30_000, t0 + 60_000)).toBeNull();
});
