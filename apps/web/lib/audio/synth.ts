import type {AudioLike} from './context';

/**
 * Session AK (owner decision MUSIC): two sounds made from oscillators, for the mix. Nothing is downloaded or recorded.
 *
 * The soft synth pad: a slow, evolving minor-ninth chord. Each note is two oscillators a few cents apart (so they drift
 * against each other), each note breathes on its own slow cycle (13–29 s, never in step), and the whole chord sits under
 * a low-pass whose cutoff wanders slowly, so the colour keeps changing without ever moving fast.
 *
 * The focus tones (binaural-style): one sine in the left ear and one a few hertz higher in the right, over a quiet low
 * pad. Said plainly in the player: for relaxation, not therapy; use headphones (through speakers the two tones simply mix).
 */
type Src = {start(t: number): void; stop(t: number): void};
type Out = {connect(to: unknown, output?: number, input?: number): unknown};
export const PAD_NOTES = [110, 164.81, 196, 246.94, 261.63] as const;
export const PAD_DETUNE_CENTS = 6;
export const TONE_CARRIER = 200;
export const TONE_BEAT = 6;
const cents = (frequency: number, c: number) => frequency * 2 ** (c / 1200);
function lfo(ctx: AudioLike, target: unknown, rate: number, depth: number): Src {
  const osc = ctx.createOscillator(), amount = ctx.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(rate, ctx.currentTime); amount.gain.setValueAtTime(depth, ctx.currentTime);
  osc.connect(amount); amount.connect(target);
  return osc;
}
function lowpass(ctx: AudioLike, frequency: number, q = 0.7) {
  const f = ctx.createBiquadFilter!();
  f.type = 'lowpass'; f.frequency.setValueAtTime(frequency, ctx.currentTime); f.Q.setValueAtTime(q, ctx.currentTime);
  return f;
}
/** The pad's nodes into `out`; the oscillators are returned (not started). */
export function buildPad(ctx: AudioLike, out: Out): Src[] {
  const t = ctx.currentTime, filter = lowpass(ctx, 820, 0.8), sources: Src[] = [];
  filter.connect(out);
  sources.push(lfo(ctx, filter.frequency, 1 / 23, 320));
  PAD_NOTES.forEach((frequency, i) => {
    const voice = ctx.createGain();
    voice.gain.setValueAtTime(0.11, t); voice.connect(filter);
    for (const [type, c] of [['sawtooth', -PAD_DETUNE_CENTS], ['triangle', PAD_DETUNE_CENTS]] as const) {
      const osc = ctx.createOscillator();
      osc.type = type; osc.frequency.setValueAtTime(cents(frequency, c), t);
      osc.connect(voice); sources.push(osc);
    }
    // Each note swells and settles on its own slow cycle, so the chord's balance keeps shifting.
    sources.push(lfo(ctx, voice.gain, 1 / (13 + i * 4), 0.07));
  });
  return sources;
}
/** The focus tones' nodes into `out`: left and right sines `TONE_BEAT` Hz apart, and a quiet low pad. */
export function buildTones(ctx: AudioLike, out: Out): Src[] {
  const t = ctx.currentTime, sources: Src[] = [];
  const left = ctx.createOscillator(), right = ctx.createOscillator(), leftGain = ctx.createGain(), rightGain = ctx.createGain();
  left.type = 'sine'; right.type = 'sine';
  left.frequency.setValueAtTime(TONE_CARRIER, t); right.frequency.setValueAtTime(TONE_CARRIER + TONE_BEAT, t);
  leftGain.gain.setValueAtTime(0.32, t); rightGain.gain.setValueAtTime(0.32, t);
  left.connect(leftGain); right.connect(rightGain);
  if (ctx.createStereoPanner) {
    const l = ctx.createStereoPanner(), r = ctx.createStereoPanner();
    l.pan.setValueAtTime(-1, t); r.pan.setValueAtTime(1, t);
    leftGain.connect(l); rightGain.connect(r); l.connect(out); r.connect(out);
  } else if (ctx.createChannelMerger) {
    const merger = ctx.createChannelMerger(2);
    leftGain.connect(merger, 0, 0); rightGain.connect(merger, 0, 1); merger.connect(out);
  } else { leftGain.connect(out); rightGain.connect(out); }
  sources.push(left, right);
  // The gentle pad underneath: a low fifth, softened.
  const bed = lowpass(ctx, 480), bedGain = ctx.createGain();
  bedGain.gain.setValueAtTime(0.14, t); bed.connect(bedGain); bedGain.connect(out);
  for (const frequency of [100, 150]) { const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(frequency, t); osc.connect(bed); sources.push(osc); }
  sources.push(lfo(ctx, bedGain.gain, 1 / 17, 0.05));
  return sources;
}
