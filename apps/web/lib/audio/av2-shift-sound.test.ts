import {describe, expect, test} from 'vitest';
import {SHIFT_FADE_IN_S, SHIFT_PAN_DEPTH, brownNoise, panAt, shiftGain, startShiftSound} from './shift-sound';
import type {AudioLike} from './context';
import {shiftPosition, PACE_SECONDS, readCalm, withCalm, NO_CALM, SHIFT_PACES} from '../calm/visuals';
import {habitExtrasSchema, HABIT_EXTRAS} from '../habits-extras/schema';
import {readDeviceRecord} from '../device-record';
import {readEverything} from '../export/everything';

/** Session AV lane 2 (rest, LEDGER #79; Calm's Shift): the slow left-right sound, made on the device. */
type Call = [string, ...unknown[]];
function fakeContext({panner = true, wave = true} = {}) {
  const calls: Call[] = [], params = new Map<string, {value: number; ramps: Call[]}>();
  const param = (name: string) => { const p = {value: 0, ramps: [] as Call[], setValueAtTime(v: number, t: number) { p.value = v; p.ramps.push(['set', v, t]); }, linearRampToValueAtTime(v: number, t: number) { p.ramps.push(['linear', v, t]); }, exponentialRampToValueAtTime(v: number, t: number) { p.ramps.push(['exp', v, t]); }, cancelScheduledValues(t: number) { p.ramps.push(['cancel', t]); }}; params.set(name, p); return p; };
  let n = 0;
  const node = (kind: string, extra: Record<string, unknown> = {}) => { const id = `${kind}${n++}`; return {id, ...extra, connect(to: {id?: string} | unknown) { calls.push(['connect', id, (to as {id?: string}).id ?? (to as {name?: string}).name ?? 'destination']); }, start(t: number) { calls.push(['start', id, t]); }, stop(t: number) { calls.push(['stop', id, t]); }}; };
  const ctx = {
    currentTime: 10, sampleRate: 8000, destination: {id: 'destination'}, state: 'running',
    createOscillator: () => { const o = node('osc', {type: 'sine'}); return Object.assign(o, {frequency: param(`${o.id}.frequency`), setPeriodicWave(w: unknown) { calls.push(['wave', o.id, w]); }}); },
    createGain: () => { const g = node('gain'); return Object.assign(g, {gain: Object.assign(param(`${g.id}.gain`), {name: `${g.id}.gain`})}); },
    createBiquadFilter: () => { const f = node('filter', {type: ''}); return Object.assign(f, {frequency: param(`${f.id}.frequency`), Q: param(`${f.id}.Q`)}); },
    createBuffer: (_c: number, length: number) => { const data = new Float32Array(length); calls.push(['buffer', length]); return {getChannelData: () => data}; },
    createBufferSource: () => node('source', {buffer: null, loop: false}),
    ...(panner ? {createStereoPanner: () => { const p = node('pan'); return Object.assign(p, {pan: Object.assign(param(`${p.id}.pan`), {id: `${p.id}.pan`})}); }} : {}),
    ...(wave ? {createPeriodicWave: (real: Float32Array, imag: Float32Array, options: unknown) => ({real: [...real], imag: [...imag], options})} : {}),
  };
  return {ctx: ctx as unknown as AudioLike, calls, params};
}

describe('the slow left-right sound', () => {
  test('moves with the light: -1 left at the start of each glide, +1 right a glide later, at every pace and start', () => {
    for (const pace of SHIFT_PACES) for (const elapsed of [0, 700, 4321, 61_000]) for (const s of [0, 0.4, 1.3, 2.9, 7.7]) {
      expect(panAt(elapsed, PACE_SECONDS[pace], s)).toBeCloseTo(SHIFT_PAN_DEPTH * shiftPosition(elapsed + s * 1000, pace), 6);
    }
  });
  test('soft brown noise: bounded, never jumping, its loop joined', () => {
    let seed = 1; const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const noise = brownNoise(32_000, random);
    expect(Math.max(...noise.map(Math.abs))).toBeLessThan(1);
    for (let i = 1; i < noise.length; i++) expect(Math.abs(noise[i]! - noise[i - 1]!)).toBeLessThan(0.08);
  });
  test('built with a stereo panner moved by a slow sine in step; fades in; volume on a curve; stop fades out', () => {
    const {ctx, calls, params} = fakeContext();
    const s = startShiftSound(ctx, {volume: 50, glideSeconds: 3, elapsedMs: 1500, random: () => 0.5});
    expect(s).not.toBeNull();
    expect(calls).toContainEqual(['buffer', 32_000]);
    // A 3 s glide: one left-right-left cycle in 6 s.
    expect(params.get('osc4.frequency')!.ramps[0]).toEqual(['set', 1 / 6, 10]);
    const wave = calls.find(c => c[0] === 'wave')![2] as {real: number[]; imag: number[]; options: unknown};
    // 1.5 s into a 3 s glide the light is in the middle, going right: sin(0) start, rising.
    expect(wave.real[1]).toBeCloseTo(0); expect(wave.imag[1]).toBeCloseTo(1); expect(wave.options).toEqual({disableNormalization: true});
    expect(calls).toContainEqual(['connect', 'gain5', 'pan3.pan']);
    expect(calls).toContainEqual(['connect', 'pan3', 'destination']);
    const gain = params.get('gain2.gain')!;
    expect(gain.ramps).toEqual([['set', 0.0001, 10], ['linear', shiftGain(50), 10 + SHIFT_FADE_IN_S]]);
    expect(shiftGain(50)).toBeCloseTo(0.055); expect(shiftGain(100)).toBeCloseTo(0.22);
    s!.stop(); s!.stop();
    expect(gain.ramps.filter(r => r[0] === 'exp')).toHaveLength(1);
    expect(calls.filter(c => c[0] === 'stop').map(c => c[1]).sort()).toEqual(['osc4', 'source0']);
  });
  test('never without a stereo panner, never at volume 0; a plain sine where there is no periodic wave', () => {
    expect(startShiftSound(fakeContext({panner: false}).ctx, {volume: 50, glideSeconds: 3, elapsedMs: 0})).toBeNull();
    expect(startShiftSound(fakeContext().ctx, {volume: 0, glideSeconds: 3, elapsedMs: 0})).toBeNull();
    const plain = fakeContext({wave: false});
    expect(startShiftSound(plain.ctx, {volume: 20, glideSeconds: 5, elapsedMs: 0})).not.toBeNull();
    expect(plain.calls.some(c => c[0] === 'wave')).toBe(false);
  });
});

describe('the choice, kept with the calm visual (opt-in, additive)', () => {
  test('off unless chosen; a volume 1–100; cleared; other fields kept; odd values ignored', () => {
    const base = habitExtrasSchema.parse({version: 1, calm: {visual: 'shift', pace: 'slower', later: 1}});
    expect(readCalm(base)).toEqual({visual: 'shift', pace: 'slower'});
    const on = withCalm(base, {sound: 35});
    expect(readCalm(on)).toEqual({visual: 'shift', pace: 'slower', sound: 35});
    expect((on as {calm: Record<string, unknown>}).calm.later).toBe(1);
    expect(readCalm(withCalm(on, {sound: null}))).toEqual({visual: 'shift', pace: 'slower'});
    expect(readCalm(withCalm(on, {visual: null})).sound).toBe(35);
    for (const odd of [0, 101, 2.5, '40', -3]) expect(readCalm({calm: {sound: odd}}).sound).toBeUndefined();
    expect(() => withCalm(base, {sound: 0})).toThrow(/1 to 100/);
    expect(readCalm({calm: {sound: 60}})).toEqual({...NO_CALM, sound: 60});
  });
  test('export → erase → restore keeps it', async () => {
    const extras = withCalm(habitExtrasSchema.parse({version: 1}), {visual: 'sea', sound: 22});
    const m = new Map<string, string>([[HABIT_EXTRAS.key, JSON.stringify(extras)]]);
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const {texts} = await readEverything(storage);
    const exported = texts[HABIT_EXTRAS.key] ?? storage.getItem(HABIT_EXTRAS.key)!;
    storage.clear();
    expect(readCalm(readDeviceRecord(storage, HABIT_EXTRAS).data).sound).toBeUndefined();
    storage.setItem(HABIT_EXTRAS.key, exported);
    expect(readCalm(readDeviceRecord(storage, HABIT_EXTRAS).data)).toEqual({visual: 'sea', pace: 'slow', sound: 22});
  });
});
