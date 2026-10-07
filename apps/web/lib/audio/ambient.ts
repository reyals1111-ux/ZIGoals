import type {AmbientSound} from '../music/schema';
import {audioContext, type AudioLike} from './context';
import {setAmbientState} from './ambient-state';

/**
 * Ambient focus sounds (Session W Part 6), made on the device with Web Audio: white, pink and brown noise, a rain-like
 * and an ocean-like sound shaped from them, and a soft drone. No sound file, no request, nothing for the content policy
 * to allow. One player for the whole page: it keeps playing while you move around ZIGoals (a reload stops it), unless
 * you chose to stop it when you leave ZIGoals. A sleep timer fades it out on the audio clock, so it ends on time even in
 * a background tab.
 */
export {AMBIENT_LABELS} from './ambient-labels';
export const TIMER_CHOICES = [15, 30, 45, 60, 90] as const;
const FADE_IN = 1.5, FADE_OUT = 1.5, TIMER_FADE = 30;
/** Volume 0–100 to the master gain: squared, never above 0.5. */
export const ambientGain = (volume: number) => 0.5 * (Math.min(100, Math.max(0, volume)) / 100) ** 2;

/**
 * Seconds of noise of a colour, from a source of random numbers in [0, 1): white is flat; pink falls 3 dB an octave
 * (Paul Kellet's refined filter); brown is white noise integrated with a slight leak, so it rumbles.
 */
export function noise(color: 'white' | 'pink' | 'brown', length: number, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(length);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    if (color === 'white') out[i] = white * 0.5;
    else if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856; b4 = 0.55 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11; b6 = white * 0.115926;
    } else { last = (last + 0.02 * white) / 1.02; out[i] = last * 3.5; }
  }
  return out;
}
type Graph = {master: ReturnType<AudioLike['createGain']>; sources: {stop(t: number): void}[]};
function noiseSource(ctx: AudioLike, color: 'white' | 'pink' | 'brown', random?: () => number) {
  const rate = ctx.sampleRate ?? 44_100, seconds = 4, buffer = ctx.createBuffer!(1, rate * seconds, rate);
  buffer.getChannelData(0).set(noise(color, rate * seconds, random));
  const source = ctx.createBufferSource!();
  source.buffer = buffer; source.loop = true;
  return source;
}
function filter(ctx: AudioLike, type: string, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter!();
  f.type = type; f.frequency.setValueAtTime(frequency, ctx.currentTime); f.Q.setValueAtTime(q, ctx.currentTime);
  return f;
}
/** A slow wobble of a gain (the ocean's waves, the drone's breath): an oscillator through a small gain into the param. */
function wobble(ctx: AudioLike, target: {gain: unknown}, rate: number, depth: number) {
  const lfo = ctx.createOscillator(), amount = ctx.createGain();
  lfo.type = 'sine'; lfo.frequency.setValueAtTime(rate, ctx.currentTime); amount.gain.setValueAtTime(depth, ctx.currentTime);
  lfo.connect(amount); amount.connect(target.gain);
  return lfo;
}
/** The nodes of one sound, ending in a master gain (silent until faded in). Exported for tests. */
export function buildAmbient(ctx: AudioLike, sound: AmbientSound, random?: () => number): Graph {
  const master = ctx.createGain(), shape = ctx.createGain(), sources: {stop(t: number): void; start(t: number): void}[] = [];
  master.gain.setValueAtTime(0, ctx.currentTime); shape.gain.setValueAtTime(1, ctx.currentTime);
  shape.connect(master); master.connect(ctx.destination);
  if (sound === 'white' || sound === 'pink' || sound === 'brown') { const src = noiseSource(ctx, sound, random); src.connect(shape); sources.push(src); }
  else if (sound === 'rain') {
    // Pink noise with the low end taken away and a little hiss on top: a steady rain on a roof.
    const src = noiseSource(ctx, 'pink', random), high = filter(ctx, 'highpass', 900), soft = filter(ctx, 'lowpass', 9000);
    src.connect(high); high.connect(soft); soft.connect(shape); sources.push(src);
  } else if (sound === 'ocean') {
    // Brown noise, darkened, swelling and settling about every twelve seconds.
    const src = noiseSource(ctx, 'brown', random), low = filter(ctx, 'lowpass', 650);
    shape.gain.setValueAtTime(0.65, ctx.currentTime);
    src.connect(low); low.connect(shape); sources.push(src, wobble(ctx, shape, 1 / 12, 0.35));
  } else {
    // Three soft sines (a fifth and its octave), slightly detuned so they beat slowly, under a gentle low-pass.
    const low = filter(ctx, 'lowpass', 900);
    low.connect(shape);
    for (const [frequency, level] of [[110, 0.5], [110.4, 0.35], [165, 0.25], [220, 0.12]] as const) {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, ctx.currentTime); g.gain.setValueAtTime(level, ctx.currentTime);
      osc.connect(g); g.connect(low); sources.push(osc);
    }
    sources.push(wobble(ctx, shape, 1 / 9, 0.15));
  }
  for (const s of sources) s.start(ctx.currentTime);
  return {master, sources};
}

let playing: {graph: Graph; ctx: AudioLike; sound: AmbientSound; timer: number | null; onHide: (() => void) | null} | null = null;
function finish(entry: NonNullable<typeof playing>, at: number) {
  for (const s of entry.graph.sources) { try { s.stop(at); } catch { /* already stopped */ } }
  if (entry.onHide) document.removeEventListener('visibilitychange', entry.onHide);
  if (entry.timer !== null) clearTimeout(entry.timer);
  if (playing === entry) { playing = null; setAmbientState({playing: false}); }
}
/** Starts a sound (replacing one already playing) at a volume, with an optional timer in minutes. False without Web Audio. */
export async function playAmbient({sound, volume, timerMin, stopOnHide, now = Date.now()}: {sound: AmbientSound; volume: number; timerMin?: number; stopOnHide: boolean; now?: number}): Promise<boolean> {
  const ctx = audioContext();
  if (!ctx || !ctx.createBuffer || !ctx.createBufferSource || !ctx.createBiquadFilter) return false;
  try { if (ctx.state === 'suspended') await ctx.resume?.(); } catch { return false; }
  if (playing) stopAmbient();
  const graph = buildAmbient(ctx, sound), t = ctx.currentTime, gain = ambientGain(volume);
  graph.master.gain.setValueAtTime(0, t);
  graph.master.gain.linearRampToValueAtTime(gain, t + FADE_IN);
  const entry: NonNullable<typeof playing> = {graph, ctx, sound, timer: null, onHide: null};
  let endsAt: number | undefined;
  if (timerMin) {
    // The fade is on the audio clock (on time in a background tab); the page timer only tidies up afterwards.
    const end = t + timerMin * 60;
    graph.master.gain.setValueAtTime(gain, Math.max(t + FADE_IN, end - TIMER_FADE));
    graph.master.gain.linearRampToValueAtTime(0, end);
    endsAt = now + timerMin * 60_000;
    entry.timer = setTimeout(() => finish(entry, ctx.currentTime), timerMin * 60_000 + 500) as unknown as number;
  }
  if (stopOnHide) { entry.onHide = () => { if (document.visibilityState === 'hidden') stopAmbient(); }; document.addEventListener('visibilitychange', entry.onHide); }
  playing = entry;
  setAmbientState({playing: true, sound, ...(endsAt ? {endsAt} : {})});
  return true;
}
/** Fades the sound out and stops it. */
export function stopAmbient(): void {
  const entry = playing;
  if (!entry) return;
  const t = entry.ctx.currentTime, gain = entry.graph.master.gain;
  gain.cancelScheduledValues?.(t);
  gain.setValueAtTime(typeof gain.value === 'number' ? gain.value : 0.2, t);
  gain.linearRampToValueAtTime(0, t + FADE_OUT);
  finish(entry, t + FADE_OUT + 0.05);
}
/** Changes the volume of what is playing, smoothly. */
export function setAmbientVolume(volume: number): void {
  const entry = playing;
  if (!entry) return;
  const gain = entry.graph.master.gain, t = entry.ctx.currentTime;
  if (gain.setTargetAtTime) gain.setTargetAtTime(ambientGain(volume), t, 0.15); else gain.setValueAtTime(ambientGain(volume), t);
}
/** Tests only. */
export function resetAmbientForTests(): void { playing = null; setAmbientState({playing: false}); }
