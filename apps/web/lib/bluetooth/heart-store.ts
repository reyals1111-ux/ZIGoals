import type {HeartRateReading} from './gatt';

/**
 * The heart-rate monitor connected on this page (Session W Part 8): its latest reading and the readings of the last
 * six hours, in memory only. Nothing is stored or sent; a meditation session may keep a three-number summary of the
 * readings taken during it, only if the person ticks the box when saving it.
 */
export type HeartSample = {at: number; bpm: number};
export type HeartState = {connected: boolean; device: string | null; latest: (HeartRateReading & {at: number}) | null; error: string | null};
const KEEP_MS = 6 * 3_600_000, MAX_SAMPLES = 30_000;
let state: HeartState = {connected: false, device: null, latest: null, error: null};
let samples: HeartSample[] = [];
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };
export const heartSnapshot = () => state;
export const SERVER_HEART: HeartState = {connected: false, device: null, latest: null, error: null};
export function subscribeHeart(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function heartConnected(device: string) { state = {connected: true, device, latest: null, error: null}; emit(); }
export function heartDisconnected(error: string | null = null) { state = {...state, connected: false, error}; emit(); }
export function heartReading(reading: HeartRateReading, at = Date.now()) {
  if (reading.contact !== 'lost') { samples.push({at, bpm: reading.bpm}); if (samples.length > MAX_SAMPLES || samples[0]!.at < at - KEEP_MS) samples = samples.filter(s => s.at >= at - KEEP_MS).slice(-MAX_SAMPLES); }
  state = {...state, latest: {...reading, at}}; emit();
}
/** Lowest, average and highest of the readings between two instants (at least 10 of them), or null. */
export function heartSummary(from: number, to: number): {min: number; avg: number; max: number; n: number} | null {
  const inside = samples.filter(s => s.at >= from && s.at <= to);
  if (inside.length < 10) return null;
  let min = Infinity, max = -Infinity, sum = 0;
  for (const s of inside) { min = Math.min(min, s.bpm); max = Math.max(max, s.bpm); sum += s.bpm; }
  return {min, avg: Math.min(max, Math.max(min, Math.round(sum / inside.length))), max, n: inside.length};
}
/** Tests only. */
export function resetHeartForTests() { state = {...SERVER_HEART}; samples = []; emit(); }
