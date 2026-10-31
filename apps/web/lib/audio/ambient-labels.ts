import type {AmbientSound} from '../music/schema';
import type {SoundLayer} from '../music/mix-store';

/** The ambient sounds' names (Session W Part 6), shared by the player and the shell's Stop pill without loading the player. */
export const AMBIENT_LABELS: Record<AmbientSound, string> = {white: 'White noise', pink: 'Pink noise', brown: 'Brown noise', rain: 'Rain-like', ocean: 'Ocean-like', drone: 'Soft drone'};
/** Session AK: every sound a mix can layer, by name. */
export const LAYER_LABELS: Record<SoundLayer, string> = {...AMBIENT_LABELS, pad: 'Soft synth pad', tones: 'Focus tones'};
/** The order the mix offers its sounds in. */
export const MIX_ORDER: readonly SoundLayer[] = ['rain', 'ocean', 'brown', 'pink', 'white', 'pad', 'tones', 'drone'];
/** The focus tones' honest description, word for word as the owner decided (Session AK, MUSIC). */
export const TONES_NOTE = 'Focus tones (binaural-style) — for relaxation, not therapy; use headphones';
/** What plays, in words: one sound's name, or a mix's names joined with "+". */
export function playingLabel(state: {sound: SoundLayer; layers?: readonly SoundLayer[] | undefined}): string {
  return state.layers?.length ? state.layers.map(s => LAYER_LABELS[s]).join(' + ') : LAYER_LABELS[state.sound];
}
