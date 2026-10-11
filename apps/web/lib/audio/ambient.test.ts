// @vitest-environment jsdom
import {afterEach, describe, expect, test, vi} from 'vitest';
import {AMBIENT_LABELS, ambientGain, buildAmbient, noise, playAmbient, resetAmbientForTests, setAmbientVolume, stopAmbient} from './ambient';
import {ambientState, subscribeAmbient} from './ambient-state';
import {resetAudioForTests, type AudioLike} from './context';
import {AMBIENT_SOUNDS} from '../music/schema';

// Session W Part 6: the ambient sounds are made on the device; a MOCK AudioContext records the graph and the schedule.
function seeded(seed = 42) { let s = seed; return () => { s = (s * 48271) % 2147483647; return s / 2147483647; }; }
type Call = {node: string; what: string; value?: number | string; at?: number};
function mockContext(time = 100) {
  const calls: Call[] = [];
  const param = (node: string) => ({value: 0.2, setValueAtTime: (v: number, t: number) => calls.push({node, what: 'set', value: v, at: t}), linearRampToValueAtTime: (v: number, t: number) => calls.push({node, what: 'ramp', value: v, at: t}), exponentialRampToValueAtTime: (v: number, t: number) => calls.push({node, what: 'exp', value: v, at: t}), cancelScheduledValues: (t: number) => calls.push({node, what: 'cancel', at: t}), setTargetAtTime: (v: number, t: number) => calls.push({node, what: 'target', value: v, at: t})});
  let n = 0;
  const ctx: AudioLike & {currentTime: number} = {
    currentTime: time, destination: {}, state: 'running', sampleRate: 8000,
    createOscillator: () => { const id = `osc${n++}`; return {type: '', frequency: param(`${id}.frequency`), connect: () => undefined, start: (t: number) => calls.push({node: id, what: 'start', at: t}), stop: (t: number) => calls.push({node: id, what: 'stop', at: t})}; },
    createGain: () => { const id = `gain${n++}`; return {gain: param(`${id}.gain`), connect: () => undefined}; },
    createBiquadFilter: () => { const id = `filter${n++}`; const f = {type: '', frequency: param(`${id}.frequency`), Q: param(`${id}.Q`), connect: () => undefined}; calls.push({node: id, what: 'filter'}); return new Proxy(f, {set: (t, k, v) => { (t as Record<string, unknown>)[k as string] = v; if (k === 'type') calls.push({node: id, what: 'type', value: v}); return true; }}); },
    createBuffer: (_c: number, length: number) => { const data = new Float32Array(length); calls.push({node: 'buffer', what: 'length', value: length}); return {getChannelData: () => data}; },
    createBufferSource: () => { const id = `src${n++}`; return {buffer: null, loop: false, connect: () => undefined, start: (t: number) => calls.push({node: id, what: 'start', at: t}), stop: (t: number) => calls.push({node: id, what: 'stop', at: t})}; },
  };
  return {ctx, calls};
}
afterEach(() => { resetAmbientForTests(); resetAudioForTests(); delete (globalThis as {AudioContext?: unknown}).AudioContext; vi.useRealTimers(); });

describe('noise, made here', () => {
  const stats = (x: Float32Array) => { let sum = 0, sq = 0, diff = 0; for (let i = 0; i < x.length; i++) { sum += x[i]!; sq += x[i]! ** 2; if (i) diff += Math.abs(x[i]! - x[i - 1]!); } return {mean: sum / x.length, rms: Math.sqrt(sq / x.length), roughness: diff / (x.length - 1)}; };
  test('every colour stays within the speaker\'s range and around zero; pink and brown are smoother than white', () => {
    const white = stats(noise('white', 40_000, seeded())), pink = stats(noise('pink', 40_000, seeded())), brown = stats(noise('brown', 40_000, seeded()));
    for (const x of [noise('white', 40_000, seeded()), noise('pink', 40_000, seeded()), noise('brown', 40_000, seeded())]) for (const v of x) { expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1); }
    expect(Math.abs(white.mean)).toBeLessThan(0.02);
    expect(pink.roughness / pink.rms).toBeLessThan(white.roughness / white.rms);
    expect(brown.roughness / brown.rms).toBeLessThan(pink.roughness / pink.rms);
  });
  test('the same random source gives the same noise', () => {
    expect(noise('pink', 1000, seeded(7))).toEqual(noise('pink', 1000, seeded(7)));
  });
});

describe('the sounds', () => {
  test('each sound builds a graph that starts at once and stays silent until it fades in', () => {
    for (const sound of AMBIENT_SOUNDS) {
      const {ctx, calls} = mockContext();
      const graph = buildAmbient(ctx, sound, seeded());
      expect(graph.sources.length, sound).toBeGreaterThan(0);
      expect(calls.filter(c => c.what === 'start').every(c => c.at === 100), sound).toBe(true);
      expect(calls.find(c => c.what === 'set' && c.value === 0), sound).toBeTruthy();
    }
  });
  test('rain is pink noise with the low end removed; the ocean is darkened brown noise that swells; the drone is soft sines', () => {
    const rain = mockContext(); buildAmbient(rain.ctx, 'rain', seeded());
    expect(rain.calls.filter(c => c.what === 'type').map(c => c.value)).toEqual(['highpass', 'lowpass']);
    const ocean = mockContext(); buildAmbient(ocean.ctx, 'ocean', seeded());
    expect(ocean.calls.filter(c => c.what === 'type').map(c => c.value)).toEqual(['lowpass']);
    expect(ocean.calls.some(c => c.node.endsWith('.frequency') && c.value === 1 / 12)).toBe(true);
    const drone = mockContext(); buildAmbient(drone.ctx, 'drone', seeded());
    expect(drone.calls.filter(c => c.node.endsWith('.frequency') && typeof c.value === 'number' && c.value > 50).map(c => c.value)).toEqual(expect.arrayContaining([110, 110.4, 165, 220]));
    expect(drone.calls.some(c => c.what === 'length')).toBe(false);
  });
  test('the names and the volume curve', () => {
    expect(Object.keys(AMBIENT_LABELS)).toEqual([...AMBIENT_SOUNDS]);
    expect(ambientGain(100)).toBe(0.5);
    expect(ambientGain(50)).toBeCloseTo(0.125, 10);
    expect(ambientGain(-5)).toBe(0);
  });
});

describe('the player', () => {
  function withContext(time = 100) {
    const mock = mockContext(time);
    (globalThis as {AudioContext?: unknown}).AudioContext = function () { return mock.ctx; };
    return mock;
  }
  test('without Web Audio nothing plays and the state stays off', async () => {
    expect(await playAmbient({sound: 'rain', volume: 60, stopOnHide: false})).toBe(false);
    expect(ambientState()).toEqual({playing: false});
  });
  test('play fades in, tells the shell, and Stop fades out and stops every source', async () => {
    const {calls} = withContext(), seen: unknown[] = [];
    const off = subscribeAmbient(() => seen.push(ambientState()));
    expect(await playAmbient({sound: 'brown', volume: 100, stopOnHide: false})).toBe(true);
    expect(ambientState()).toEqual({playing: true, sound: 'brown'});
    expect(calls.some(c => c.what === 'ramp' && c.value === 0.5 && c.at === 101.5)).toBe(true);
    setAmbientVolume(50);
    expect(calls.some(c => c.what === 'target' && c.value === 0.125)).toBe(true);
    stopAmbient();
    expect(calls.some(c => c.what === 'ramp' && c.value === 0 && c.at === 101.5)).toBe(true);
    expect(calls.filter(c => c.what === 'stop').every(c => c.at === 101.55)).toBe(true);
    expect(ambientState()).toEqual({playing: false});
    expect(seen).toEqual([{playing: true, sound: 'brown'}, {playing: false}]);
    off();
  });
  test('the timer fades out on the audio clock over its last 30 seconds, and says when it ends', async () => {
    vi.useFakeTimers({now: Date.parse('2026-10-21T20:00:00Z')});
    const {calls} = withContext(100);
    await playAmbient({sound: 'rain', volume: 100, timerMin: 15, stopOnHide: false});
    expect(ambientState()).toEqual({playing: true, sound: 'rain', endsAt: Date.parse('2026-10-21T20:15:00Z')});
    expect(calls.some(c => c.what === 'set' && c.value === 0.5 && c.at === 100 + 15 * 60 - 30)).toBe(true);
    expect(calls.some(c => c.what === 'ramp' && c.value === 0 && c.at === 100 + 15 * 60)).toBe(true);
    vi.advanceTimersByTime(15 * 60_000 + 600);
    expect(ambientState()).toEqual({playing: false});
  });
  test('"Stop when I leave ZIGoals": hiding the page stops it; otherwise it keeps playing', async () => {
    withContext();
    let hidden = false;
    Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => hidden ? 'hidden' : 'visible'});
    await playAmbient({sound: 'pink', volume: 60, stopOnHide: false});
    hidden = true; document.dispatchEvent(new Event('visibilitychange'));
    expect(ambientState().playing).toBe(true);
    hidden = false;
    await playAmbient({sound: 'pink', volume: 60, stopOnHide: true});
    hidden = true; document.dispatchEvent(new Event('visibilitychange'));
    expect(ambientState()).toEqual({playing: false});
  });
  test('a new sound replaces the one playing', async () => {
    const {calls} = withContext();
    await playAmbient({sound: 'white', volume: 60, stopOnHide: false});
    await playAmbient({sound: 'ocean', volume: 60, stopOnHide: false});
    expect(ambientState()).toEqual({playing: true, sound: 'ocean'});
    expect(calls.filter(c => c.what === 'stop').length).toBeGreaterThan(0);
  });
});
