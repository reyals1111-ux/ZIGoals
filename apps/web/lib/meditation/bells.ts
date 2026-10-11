import type {BELL_SOUNDS} from './schema';
import {audioContext, type AudioLike} from '../audio/context';
export {audioContext, audioReady, resetAudioForTests, wakeAudio, type AudioLike} from '../audio/context';

/**
 * Meditation bells (Session W Part 5), made on the device with the Web Audio API: a few sine partials under a gain
 * envelope, so there is no sound file to fetch (no new request, nothing for the content policy to allow). The partials
 * of the bowl follow a struck singing bowl's uneven overtones; the chime is brighter and shorter; the soft tone is one
 * gentle sine. Volume is the person's choice (0–100), applied on a curve so the low end stays usable.
 */
export type BellSound = typeof BELL_SOUNDS[number];
type Voice = {base: number; partials: readonly [ratio: number, level: number][]; attack: number; decay: number};
export const BELLS: Record<Exclude<BellSound, 'silent'>, Voice & {label: string}> = {
  bowl: {label: 'Singing bowl', base: 196, partials: [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]], attack: 0.02, decay: 7},
  chime: {label: 'Chime', base: 880, partials: [[1, 1], [2, 0.35], [3, 0.15]], attack: 0.005, decay: 2.6},
  soft: {label: 'Soft tone', base: 440, partials: [[1, 1]], attack: 0.08, decay: 1.6},
};
/** Volume 0–100 to a peak gain: squared, so 50 is a quarter of the loudest, and never above 0.35 overall. */
export const peakGain = (volume: number) => 0.35 * (Math.min(100, Math.max(0, volume)) / 100) ** 2;

export type Strike = {end: number; stop: () => void};
/**
 * Schedules one strike at `when` on the context's own clock (which keeps time in a background tab, unlike page timers);
 * returns when it has faded out and how to cancel it (a pause or an early end), or null for silence.
 */
export function strike(ctx: AudioLike, sound: BellSound, volume: number, when = ctx.currentTime): Strike | null {
  if (sound === 'silent' || volume <= 0) return null;
  const voice = BELLS[sound], peak = peakGain(volume), end = when + voice.attack + voice.decay;
  const total = voice.partials.reduce((t, [, level]) => t + level, 0), oscillators: {stop(t: number): void}[] = [];
  for (const [ratio, level] of voice.partials) {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(voice.base * ratio, when);
    // Higher partials fade sooner, as a struck bowl's do.
    const fade = when + voice.attack + voice.decay / Math.sqrt(ratio);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak * level / total, when + voice.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, fade);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(fade + 0.05);
    oscillators.push(osc);
  }
  return {end, stop: () => { for (const osc of oscillators) { try { osc.stop(0); } catch { /* already stopped */ } } }};
}

/** Rings a bell now, waking the audio context if the browser suspended it. Never throws: a bell is a nicety. */
export async function ring(sound: BellSound, volume: number): Promise<boolean> {
  const ctx = sound === 'silent' ? null : audioContext();
  if (!ctx) return false;
  try { if (ctx.state === 'suspended') await ctx.resume?.(); return strike(ctx, sound, volume) !== null; } catch { return false; }
}
