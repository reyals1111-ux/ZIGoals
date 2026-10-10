import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {analyserAllowed, engineErrorText, unlockSpeech, VoiceEngine, type EngineEnd} from '../components/ai/voice-engine';

/** Session Z-Cloud Part 3: the one listening session of a page, with a fake recognition and a fake microphone. */
type Fake = {lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; processLocally?: boolean; started: number; stopped: number; aborted: number;
  onresult: ((e: unknown) => void) | null; onerror: ((e: {error: string}) => void) | null; onend: (() => void) | null; [k: string]: unknown; start(): void; stop(): void; abort(): void};
const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
function scope(ua: string, {throwOnStart = false} = {}) {
  const made: Fake[] = [], tracks: {stopped: boolean}[] = [];
  class Recognition {
    lang = ''; interimResults = false; continuous = true; maxAlternatives = 3; started = 0; stopped = 0; aborted = 0;
    onresult = null; onerror = null; onend = null;
    constructor() { made.push(this as unknown as Fake); }
    start() { if (throwOnStart) throw Error('not allowed'); this.started++; }
    stop() { this.stopped++; queueMicrotask(() => (this as unknown as Fake).onend?.()); }
    abort() { this.aborted++; }
  }
  let frames = 0;
  const win = {
    SpeechRecognition: Recognition,
    navigator: {userAgent: ua, onLine: true, mediaDevices: {getUserMedia: vi.fn(async () => { const t = {stopped: false, stop() { t.stopped = true; }}; tracks.push(t); return {getTracks: () => [t]}; })}},
    AudioContext: class { state = 'running'; createAnalyser() { return {fftSize: 0, smoothingTimeConstant: 0, getByteTimeDomainData(d: Uint8Array) { d.fill(160); }}; } createMediaStreamSource() { return {connect() {}}; } close() { this.state = 'closed'; return Promise.resolve(); } },
    setTimeout: (f: () => void, ms: number) => setTimeout(f, ms) as unknown as number, clearTimeout: (id: number) => clearTimeout(id), setInterval: (f: () => void, ms: number) => setInterval(f, ms) as unknown as number, clearInterval: (id: number) => clearInterval(id),
    requestAnimationFrame: (f: () => void) => { frames++; return setTimeout(f, 16) as unknown as number; }, cancelAnimationFrame: (id: number) => clearTimeout(id),
  };
  return {win: win as unknown as Window, made, tracks, frames: () => frames, getUserMedia: win.navigator.mediaDevices.getUserMedia};
}
const result = (text: string, final: boolean) => ({resultIndex: 0, results: Object.assign([Object.assign([{transcript: text}], {isFinal: final})], {})});
beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('start() runs synchronously, inside the caller\'s gesture', () => {
  it('the recognition has started before start() returns, in the chosen language, single-shot with interim words', () => {
    const s = scope(CHROME), engine = new VoiceEngine(s.win as never);
    expect(engine.supported).toBe(true);
    expect(engine.start({lang: 'nl-BE', origin: 'composer'})).toBe(true);
    expect(s.made).toHaveLength(1);
    expect(s.made[0]).toMatchObject({started: 1, lang: 'nl-BE', interimResults: true, continuous: false, maxAlternatives: 1});
    expect(engine.current).toMatchObject({state: 'listening', origin: 'composer', lang: 'nl-BE'});
  });
  it('a browser without recognition, or one that refuses to start, says so and keeps nothing open', () => {
    const none = new VoiceEngine({navigator: {userAgent: 'Firefox/150'}} as never);
    expect(none.supported).toBe(false);
    expect(none.start({lang: 'en-GB', origin: 'composer'})).toBe(false);
    expect(none.current.error).toMatch(/isn’t offered/);
    const s = scope(CHROME, {throwOnStart: true}), engine = new VoiceEngine(s.win as never);
    expect(engine.start({lang: 'en-GB', origin: 'composer'})).toBe(false);
    expect(engine.current.state).toBe('idle');
    expect(engine.current.error).toMatch(/keyboard’s dictation/);
  });
});

describe('the words, the end and the microphone', () => {
  it('interim and final words are shown, and the end delivers the final words once', async () => {
    const s = scope(IPHONE), engine = new VoiceEngine(s.win as never), ends: EngineEnd[] = [];
    engine.onEnd(e => ends.push(e));
    engine.start({lang: 'en-GB', origin: 'launcher'});
    s.made[0]!.onresult!(result('a glass', false));
    expect(engine.current.interim).toBe('a glass');
    s.made[0]!.onresult!(result('a glass of water', true));
    expect(engine.current.final).toBe('a glass of water');
    engine.stop();
    await vi.runAllTimersAsync();
    expect(ends).toEqual([{text: 'a glass of water', origin: 'launcher', cancelled: false, error: ''}]);
    expect(engine.current).toMatchObject({state: 'idle', interim: '', final: '', origin: null});
  });
  it('Escape (cancel) drops the words and ends at once', () => {
    const s = scope(IPHONE), engine = new VoiceEngine(s.win as never), ends: EngineEnd[] = [];
    engine.onEnd(e => ends.push(e));
    engine.start({lang: 'en-US', origin: 'composer'});
    s.made[0]!.onresult!(result('delete everything', true));
    engine.cancel();
    expect(s.made[0]!.aborted).toBe(1);
    expect(ends).toEqual([{text: '', origin: 'composer', cancelled: true, error: ''}]);
    s.made[0]!.onend?.();
    expect(ends).toHaveLength(1);
  });
  it('on Chromium the level comes from an analyser on the microphone, and every track stops when listening ends', async () => {
    const s = scope(CHROME), engine = new VoiceEngine(s.win as never);
    engine.start({lang: 'en-GB', origin: 'composer'});
    await vi.advanceTimersByTimeAsync(50);
    expect(s.getUserMedia).toHaveBeenCalledTimes(1);
    expect(engine.current.level).toBeGreaterThan(0.1);
    expect(s.tracks.map(t => t.stopped)).toEqual([false]);
    engine.stop(); await vi.runAllTimersAsync();
    expect(s.tracks.map(t => t.stopped)).toEqual([true]);
    engine.start({lang: 'en-GB', origin: 'composer'}); await vi.advanceTimersByTimeAsync(50);
    s.made[1]!.onerror!({error: 'network'}); s.made[1]!.onend!();
    expect(s.tracks.map(t => t.stopped)).toEqual([true, true]);
    engine.start({lang: 'en-GB', origin: 'composer'}); await vi.advanceTimersByTimeAsync(50);
    engine.cancel();
    expect(s.tracks.every(t => t.stopped)).toBe(true);
  });
  it('on iOS no second capture is opened: the waves follow the recognition\'s own events', () => {
    const s = scope(IPHONE), engine = new VoiceEngine(s.win as never);
    engine.start({lang: 'en-GB', origin: 'composer'});
    expect(s.getUserMedia).not.toHaveBeenCalled();
    (s.made[0]!.onspeechstart as () => void)();
    expect(engine.current.level).toBeCloseTo(0.8);
    vi.advanceTimersByTime(400);
    expect(engine.current.level).toBeLessThan(0.8);
    expect(engine.current.level).toBeGreaterThanOrEqual(0.12);
  });
  it('listening stops by itself after a minute', async () => {
    const s = scope(IPHONE), engine = new VoiceEngine(s.win as never);
    engine.start({lang: 'en-GB', origin: 'composer'});
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.made[0]!.stopped).toBe(1);
    expect(engine.current.state).toBe('idle');
  });
});

describe('plain words and platforms', () => {
  it('errors read as gentle, plain sentences; offline says so', () => {
    expect(engineErrorText('no-speech', true)).toBe('I didn’t hear anything. Tap the microphone and try again.');
    expect(engineErrorText('network', false)).toMatch(/^You’re offline/);
    expect(engineErrorText('network', true)).toMatch(/speech service could not be reached/);
    expect(engineErrorText('aborted', true)).toBe('');
  });
  it('a second capture only on Chromium outside iOS', () => {
    expect(analyserAllowed(CHROME)).toBe(true);
    expect(analyserAllowed('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141.0 Safari/537.36 Edg/141.0')).toBe(true);
    expect(analyserAllowed(IPHONE)).toBe(false);
    expect(analyserAllowed('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1')).toBe(false);
    expect(analyserAllowed('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15')).toBe(false);
    expect(analyserAllowed('Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0')).toBe(false);
  });
  it('speech synthesis is unlocked once per page with a silent utterance', () => {
    const spoken: {text: string; volume: number}[] = [];
    (globalThis as unknown as {SpeechSynthesisUtterance: unknown}).SpeechSynthesisUtterance = class { volume = 1; constructor(public text: string) {} };
    const win = {speechSynthesis: {speak: (u: {text: string; volume: number}) => spoken.push(u)}} as unknown as Window;
    unlockSpeech(win); unlockSpeech(win);
    expect(spoken).toEqual([expect.objectContaining({text: '', volume: 0})]);
  });
});
