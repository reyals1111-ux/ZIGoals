// @vitest-environment jsdom
import {afterEach, describe, expect, test, vi} from 'vitest';
import {LAYER_TRIM, MIX_HEADROOM, ambientGain, buildAmbient, playAmbient, playMix, resetAmbientForTests, setAmbientVolume, setLayerLevel, stopAmbient} from './ambient';
import {ambientState} from './ambient-state';
import {applyPlayOnSilent, resetAudioSessionForTests} from './audio-session';
import {resetAudioForTests, type AudioLike} from './context';
import {PAD_DETUNE_CENTS, PAD_NOTES, TONE_BEAT, TONE_CARRIER} from './synth';
import {playSoundscapePreset} from './soundscape';
import {MUSIC_KEY} from '../music/schema';
import {MUSIC_MIX_KEY} from '../music/mix-store';

// Session AK (owner decision MUSIC): the soft synth pad, the focus tones and the mix, made on the device. A MOCK
// AudioContext (as lib/audio/ambient.test.ts) records each node, what it connects to, and the schedule.
type Call = {node: string; what: string; value?: number | string; at?: number; to?: string; channel?: number};
function mockContext(time = 100, {stereo = true}: {stereo?: boolean} = {}) {
  const calls: Call[] = [];
  let n = 0;
  const node = (id: string, extra: object) => ({id, connect: (to: {id?: string} | undefined, _o?: number, input?: number) => calls.push({node: id, what: 'connect', to: to?.id ?? 'param', ...(input !== undefined ? {channel: input} : {})}), ...extra});
  const param = (id: string) => ({id, value: 0.2, setValueAtTime: (v: number, t: number) => calls.push({node: id, what: 'set', value: v, at: t}), linearRampToValueAtTime: (v: number, t: number) => calls.push({node: id, what: 'ramp', value: v, at: t}), exponentialRampToValueAtTime: () => undefined, cancelScheduledValues: (t: number) => calls.push({node: id, what: 'cancel', at: t}), setTargetAtTime: (v: number, t: number) => calls.push({node: id, what: 'target', value: v, at: t})});
  const typed = <T extends object>(id: string, target: T) => new Proxy(target, {set: (t, k, v) => { (t as Record<string, unknown>)[k as string] = v; if (k === 'type') calls.push({node: id, what: 'type', value: v}); return true; }});
  const ctx: AudioLike & {currentTime: number} = {
    currentTime: time, destination: {id: 'destination'}, state: 'running', sampleRate: 8000,
    createOscillator: () => { const id = `osc${n++}`; return typed(id, node(id, {type: '', frequency: param(`${id}.frequency`), start: (t: number) => calls.push({node: id, what: 'start', at: t}), stop: (t: number) => calls.push({node: id, what: 'stop', at: t})})) as never; },
    createGain: () => { const id = `gain${n++}`; return node(id, {gain: param(`${id}.gain`)}) as never; },
    createBiquadFilter: () => { const id = `filter${n++}`; return typed(id, node(id, {type: '', frequency: param(`${id}.frequency`), Q: param(`${id}.Q`)})) as never; },
    createBuffer: (_c: number, length: number) => { const data = new Float32Array(length); return {getChannelData: () => data}; },
    createBufferSource: () => { const id = `src${n++}`; return node(id, {buffer: null, loop: false, start: (t: number) => calls.push({node: id, what: 'start', at: t}), stop: (t: number) => calls.push({node: id, what: 'stop', at: t})}) as never; },
    createChannelMerger: () => { const id = `merger${n++}`; return node(id, {}) as never; },
    ...(stereo ? {createStereoPanner: () => { const id = `pan${n++}`; return node(id, {pan: param(`${id}.pan`)}) as never; }} : {}),
  };
  return {ctx, calls};
}
const frequencies = (calls: Call[]) => calls.filter(c => c.node.endsWith('.frequency') && c.what === 'set').map(c => c.value as number);
function withContext(time = 100) { const mock = mockContext(time); (globalThis as {AudioContext?: unknown}).AudioContext = function () { return mock.ctx; }; return mock; }
afterEach(() => { resetAmbientForTests(); resetAudioForTests(); resetAudioSessionForTests(); delete (globalThis as {AudioContext?: unknown}).AudioContext; vi.useRealTimers(); localStorage.clear(); });

describe('the soft synth pad', () => {
  test('a slow chord of detuned pairs under a wandering low-pass, silent until it fades in, every source started at once', () => {
    const {ctx, calls} = mockContext();
    const graph = buildAmbient(ctx, 'pad');
    // Two oscillators per note, a few cents apart; one slow cycle per note and one for the filter.
    expect(graph.sources).toHaveLength(PAD_NOTES.length * 3 + 1);
    const heard = frequencies(calls).filter(f => f > 50);
    for (const note of PAD_NOTES) {
      expect(heard.some(f => Math.abs(f - note * 2 ** (-PAD_DETUNE_CENTS / 1200)) < 1e-9)).toBe(true);
      expect(heard.some(f => Math.abs(f - note * 2 ** (PAD_DETUNE_CENTS / 1200)) < 1e-9)).toBe(true);
    }
    // Every cycle is slower than one in ten seconds: it evolves, it never pulses.
    expect(frequencies(calls).filter(f => f < 1).every(f => f <= 1 / 10)).toBe(true);
    expect(calls.filter(c => c.what === 'type').map(c => c.value)).toContain('lowpass');
    expect(calls.filter(c => c.what === 'start').every(c => c.at === 100)).toBe(true);
    expect(calls.some(c => c.what === 'set' && c.value === 0 && c.node.endsWith('.gain'))).toBe(true);
  });
});

describe('the focus tones', () => {
  test('one sine in each ear, a few hertz apart, panned hard left and right, over a quiet low pad', () => {
    const {ctx, calls} = mockContext();
    buildAmbient(ctx, 'tones');
    expect(TONE_BEAT).toBeGreaterThanOrEqual(2); expect(TONE_BEAT).toBeLessThanOrEqual(10);
    expect(frequencies(calls)).toEqual(expect.arrayContaining([TONE_CARRIER, TONE_CARRIER + TONE_BEAT, 100, 150]));
    expect(calls.filter(c => c.node.endsWith('.pan')).map(c => c.value)).toEqual([-1, 1]);
    const types = calls.filter(c => c.what === 'type' && c.node.startsWith('osc')).map(c => c.value);
    expect(new Set(types)).toEqual(new Set(['sine']));
  });
  test('without a stereo panner, a channel merger puts one tone in each channel', () => {
    const {ctx, calls} = mockContext(100, {stereo: false});
    buildAmbient(ctx, 'tones');
    expect(calls.filter(c => c.to?.startsWith('merger')).map(c => c.channel)).toEqual([0, 1]);
  });
});

describe('the mix player', () => {
  test('up to three sounds, each at its level into one master that fades in under the volume', async () => {
    const {calls} = withContext();
    expect(await playMix({layers: [{sound: 'rain', level: 1}, {sound: 'pad', level: 0.5}, {sound: 'tones', level: 0.5}, {sound: 'ocean', level: 1}], volume: 100, stopOnHide: false})).toBe(true);
    expect(ambientState()).toEqual({playing: true, sound: 'rain', layers: ['rain', 'pad', 'tones']});
    expect(calls.some(c => c.what === 'set' && c.value === LAYER_TRIM.rain && c.at === 100)).toBe(true);
    expect(calls.some(c => c.what === 'set' && c.value === 0.25 * LAYER_TRIM.pad)).toBe(true);
    expect(calls.some(c => c.what === 'ramp' && c.value === ambientGain(100) * MIX_HEADROOM && c.at === 101.5)).toBe(true);
    setLayerLevel('pad', 1);
    expect(calls.some(c => c.what === 'target' && c.value === LAYER_TRIM.pad)).toBe(true);
    expect(setLayerLevel('ocean', 1)).toBe(false);
    setAmbientVolume(50);
    expect(calls.some(c => c.what === 'target' && c.value === ambientGain(50) * MIX_HEADROOM)).toBe(true);
    stopAmbient();
    expect(ambientState()).toEqual({playing: false});
    expect(calls.filter(c => c.what === 'stop').every(c => c.at === 101.55)).toBe(true);
  });
  test('an empty mix plays nothing; a mix replaces one sound, and one sound replaces a mix', async () => {
    withContext();
    expect(await playMix({layers: [], volume: 60, stopOnHide: false})).toBe(false);
    await playAmbient({sound: 'white', volume: 60, stopOnHide: false});
    await playMix({layers: [{sound: 'ocean', level: 0.7}], volume: 60, stopOnHide: false});
    expect(ambientState()).toEqual({playing: true, sound: 'ocean', layers: ['ocean']});
    await playAmbient({sound: 'brown', volume: 60, stopOnHide: false});
    expect(ambientState()).toEqual({playing: true, sound: 'brown'});
  });
  test('the sleep timer fades the mix to silence over its last 30 seconds, on the audio clock', async () => {
    vi.useFakeTimers({now: Date.parse('2026-10-31T21:00:00Z')});
    const {calls} = withContext(100), gain = ambientGain(100) * MIX_HEADROOM;
    await playMix({layers: [{sound: 'rain', level: 0.7}, {sound: 'pad', level: 0.5}], volume: 100, timerMin: 30, stopOnHide: false});
    expect(ambientState()).toMatchObject({playing: true, endsAt: Date.parse('2026-10-31T21:30:00Z')});
    expect(calls.some(c => c.what === 'set' && c.value === gain && c.at === 100 + 30 * 60 - 30)).toBe(true);
    expect(calls.some(c => c.what === 'ramp' && c.value === 0 && c.at === 100 + 30 * 60)).toBe(true);
    vi.advanceTimersByTime(30 * 60_000 + 600);
    expect(ambientState()).toEqual({playing: false});
  });
});

describe('startSoundscape presets and the silent switch', () => {
  test('a preset plays its sounds and timer at the player\'s volume, or the mix\'s own, without touching what was saved', async () => {
    vi.useFakeTimers({now: Date.parse('2026-10-31T21:00:00Z')});
    const {calls} = withContext();
    const music = JSON.stringify({version: 1, source: 'ambient', mini: false, volume: 40, ambient: {sound: 'rain', stopOnHide: false}});
    localStorage.setItem(MUSIC_KEY, music);
    expect(await playSoundscapePreset('sleep', localStorage)).toBe(true);
    expect(ambientState()).toEqual({playing: true, sound: 'ocean', layers: ['ocean', 'brown'], endsAt: Date.parse('2026-10-31T22:00:00Z')});
    expect(calls.some(c => c.what === 'ramp' && c.value === ambientGain(40) * MIX_HEADROOM)).toBe(true);
    const mix = JSON.stringify({version: 1, master: 80, mix: {layers: [{sound: 'white', level: 0.2}]}});
    localStorage.setItem(MUSIC_MIX_KEY, mix);
    expect(await playSoundscapePreset('focus', localStorage)).toBe(true);
    expect(ambientState()).toEqual({playing: true, sound: 'brown', layers: ['brown', 'tones']});
    expect(calls.some(c => c.what === 'ramp' && c.value === ambientGain(80) * MIX_HEADROOM)).toBe(true);
    expect([localStorage.getItem(MUSIC_KEY), localStorage.getItem(MUSIC_MIX_KEY)]).toEqual([music, mix]);
    expect(await playSoundscapePreset('nope' as never, localStorage)).toBe(false);
  });
  test('"Play when the phone is on silent" asks for playback only when on, and hands the choice back when turned off', () => {
    const session = {type: 'auto'};
    Object.defineProperty(navigator, 'audioSession', {configurable: true, value: session});
    applyPlayOnSilent(false); expect(session.type).toBe('auto');
    applyPlayOnSilent(true); expect(session.type).toBe('playback');
    applyPlayOnSilent(false); expect(session.type).toBe('auto');
    session.type = 'ambient'; applyPlayOnSilent(false); expect(session.type).toBe('ambient');
    delete (navigator as {audioSession?: unknown}).audioSession;
    expect(() => applyPlayOnSilent(true)).not.toThrow();
  });
});
