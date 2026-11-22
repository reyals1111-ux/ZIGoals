import type {AudioLike} from './context';

/**
 * Session AV lane 2 (rest, LEDGER #79; Calm's Shift, its slow left-right sound): a soft sound that moves slowly from one
 * ear to the other, made on the device with Web Audio — no recording, nothing fetched. A few seconds of gentle brown
 * noise (each sample a small random step from the last, so it is deep and soft, like distant surf), looped, under a
 * low-pass, through a StereoPannerNode whose pan is moved by a slow sine (an LFO), in step with the gliding light
 * (`shiftPosition`: -1 left at the start of each glide, +1 right one glide later). It fades in and out; volume is the
 * person's (1–100, on the bells' curve). Without a stereo panner the browser cannot move a sound, so nothing plays.
 * For relaxation, not therapy.
 */
type Param = AudioLike extends {createGain(): {gain: infer P}} ? P : never;
type Wave = unknown;
type Ctx = AudioLike & {createPeriodicWave?(real: Float32Array, imag: Float32Array, options?: {disableNormalization?: boolean}): Wave};
export const SHIFT_FADE_IN_S = 2, SHIFT_FADE_OUT_S = 1.2, SHIFT_NOISE_S = 4, SHIFT_LOWPASS_HZ = 520, SHIFT_PAN_DEPTH = 0.9;
/** Volume 1–100 to the layer's peak gain: squared, as the bells, and quieter than a bell at the same number. */
export const shiftGain = (volume: number) => 0.22 * (Math.min(100, Math.max(0, volume)) / 100) ** 2;
/** Brown noise: a random walk, kept within ±1 and drawn back towards the middle so it never drifts or clicks. */
export function brownNoise(length: number, random: () => number = Math.random): Float32Array {
  const out = new Float32Array(length);
  let last = 0;
  for (let i = 0; i < length; i++) { last = (last + 0.02 * (random() * 2 - 1)) / 1.02; out[i] = last * 3.5; }
  // The loop's two ends meet: a short crossfade over the last 2 % so the repeat has no click.
  const tail = Math.max(1, Math.floor(length * 0.02));
  for (let i = 0; i < tail; i++) { const k = i / tail; out[length - tail + i] = out[length - tail + i]! * (1 - k) + out[i]! * k; }
  return out;
}
/**
 * The pan's phase at the start, so that the sound is where the light is: the light's position is -cos(2πe/P); a sine LFO
 * started now with phase φ gives sin(2πt/P + φ). Returns the two Fourier coefficients for a PeriodicWave (real: cos,
 * imag: sin) that start at that phase.
 */
export function panWave(elapsedMs: number, glideSeconds: number): {real: number; imag: number} {
  const period = glideSeconds * 2, phase = (2 * Math.PI * (elapsedMs / 1000)) / period - Math.PI / 2;
  return {real: Math.sin(phase), imag: Math.cos(phase)};
}
/** Where the sound is (-1 left … 1 right) `seconds` after it started at `elapsedMs` into the session: as the light. */
export const panAt = (elapsedMs: number, glideSeconds: number, seconds: number) => {
  const {real, imag} = panWave(elapsedMs, glideSeconds), x = (2 * Math.PI * seconds) / (glideSeconds * 2);
  return SHIFT_PAN_DEPTH * (real * Math.cos(x) + imag * Math.sin(x));
};
export type ShiftSound = {stop: () => void};
/** Starts the layer now; null when this browser cannot make it (no stereo panner, no buffers). */
export function startShiftSound(ctx: Ctx, {volume, glideSeconds, elapsedMs, random}: {volume: number; glideSeconds: number; elapsedMs: number; random?: () => number}): ShiftSound | null {
  if (volume <= 0 || !ctx.createStereoPanner || !ctx.createBuffer || !ctx.createBufferSource || !ctx.createBiquadFilter) return null;
  const t = ctx.currentTime, rate = ctx.sampleRate ?? 44_100, length = Math.round(rate * SHIFT_NOISE_S);
  const buffer = ctx.createBuffer(1, length, rate);
  buffer.getChannelData(0).set(brownNoise(length, random));
  const source = ctx.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(SHIFT_LOWPASS_HZ, t); filter.Q.setValueAtTime(0.5, t);
  const gain = ctx.createGain(), peak = shiftGain(volume);
  gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(peak, t + SHIFT_FADE_IN_S);
  const panner = ctx.createStereoPanner(); panner.pan.setValueAtTime(0, t);
  // The slow sine that moves the pan, one full left-right-left cycle per two glides, started in step with the light.
  const lfo = ctx.createOscillator(), depth = ctx.createGain();
  lfo.frequency.setValueAtTime(1 / (glideSeconds * 2), t);
  const {real, imag} = panWave(elapsedMs, glideSeconds);
  if (ctx.createPeriodicWave) {
    const wave = ctx.createPeriodicWave(new Float32Array([0, real]), new Float32Array([0, imag]), {disableNormalization: true});
    (lfo as unknown as {setPeriodicWave(w: Wave): void}).setPeriodicWave(wave);
  } else lfo.type = 'sine';
  depth.gain.setValueAtTime(SHIFT_PAN_DEPTH, t);
  lfo.connect(depth); depth.connect(panner.pan);
  source.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(ctx.destination);
  source.start(t); lfo.start(t);
  let stopped = false;
  return {stop: () => {
    if (stopped) return; stopped = true;
    const now = ctx.currentTime, g = gain.gain as Param & {cancelScheduledValues?(t: number): unknown};
    try { g.cancelScheduledValues?.(now); g.setValueAtTime(Math.max(0.0001, g.value ?? peak), now); g.exponentialRampToValueAtTime(0.0001, now + SHIFT_FADE_OUT_S); } catch { /* fades as it can */ }
    for (const node of [source, lfo]) { try { node.stop(now + SHIFT_FADE_OUT_S + 0.05); } catch { /* already stopped */ } }
  }};
}
