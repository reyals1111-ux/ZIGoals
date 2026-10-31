import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {AMBIENT_SOUNDS} from './schema';

/**
 * The focus-sound mix's choices on this device (Session AK, owner decision MUSIC; `TIER 3 (stored format)`): a new device
 * key `zigoals:music-mix:v1`, so the music player's own record (`zigoals:music:v1`, read strictly by older builds) stays
 * exactly as it was. Up to three sounds with a level each (0–1), whether the player plays the mix, the mix's own master
 * volume and sleep timer, the last ready-made soundscape chosen, and "Play when the phone is on silent". A display
 * preference with nothing personal in it; device-only, never synced.
 *
 * Loose and versioned, as `lib/ui-prefs/schema.ts`: fields this build does not know are kept as they are; every field is
 * optional, so `{version: 1}` is a complete record, and each one falls back to "not set" on its own when it does not
 * parse (`.catch`), so the rest of the record stays readable. Another version, or bytes that do not parse, read as empty.
 */
export const MUSIC_MIX_KEY = 'zigoals:music-mix:v1';
/** Every sound a mix can layer: the six ambient sounds, a soft synth pad and the binaural-style focus tones. */
export const SOUND_LAYERS = [...AMBIENT_SOUNDS, 'pad', 'tones'] as const;
export type SoundLayer = typeof SOUND_LAYERS[number];
/** At most three sounds in a mix. */
export const MAX_MIX_LAYERS = 3;
/** The ready-made soundscapes' names (lib/audio/mix.ts holds what each plays). */
export const SOUNDSCAPE_PRESET_NAMES = ['focus', 'wind-down', 'sleep'] as const;
const layerSchema = z.looseObject({sound: z.enum(SOUND_LAYERS), level: z.number().min(0).max(1)});
export const musicMixSchema = z.looseObject({
  version: z.literal(1),
  /** The sounds and their levels, and whether the panel's play button plays the mix (true) or one sound. */
  mix: z.looseObject({layers: z.array(layerSchema).max(MAX_MIX_LAYERS), active: z.boolean().optional()}).optional().catch(undefined),
  /** The mix's master volume, 0–100 (unset: the player's own volume). */
  master: z.number().int().min(0).max(100).optional().catch(undefined),
  /** The mix's sleep timer in minutes (unset: no timer). */
  timerMin: z.number().int().min(1).max(480).optional().catch(undefined),
  /** The last ready-made soundscape chosen in the mix. */
  preset: z.enum(SOUNDSCAPE_PRESET_NAMES).optional().catch(undefined),
  /** "Play when the phone is on silent" (iPhone and iPad; off by default). */
  playOnSilent: z.boolean().optional().catch(undefined),
});
export type MusicMixPrefs = z.infer<typeof musicMixSchema>;
export const emptyMusicMix = (): MusicMixPrefs => ({version: 1});
export const MUSIC_MIX: DeviceRecordSpec<MusicMixPrefs> = {key: MUSIC_MIX_KEY, schema: musicMixSchema, empty: emptyMusicMix};
