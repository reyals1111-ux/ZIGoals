import * as z from 'zod';
import {MUSIC_KEY} from '../w-device-keys';
import type {DeviceRecordSpec} from '../device-record';

/**
 * The music player's choices on this device (Session W Part 20; `zigoals:music:v1`, device-only, a display preference):
 * which source the panel shows, whether it is folded into the mini-bar, the volume, and the ambient sound's settings.
 * Spotify's tokens never live here: they are sealed in IndexedDB (`lib/links/token-store.ts`).
 */
export {MUSIC_KEY};
export const MUSIC_SOURCES = ['ambient', 'spotify', 'apple'] as const;
export const AMBIENT_SOUNDS = ['white', 'pink', 'brown', 'rain', 'ocean', 'drone'] as const;
export type AmbientSound = typeof AMBIENT_SOUNDS[number];
export const musicSchema = z.strictObject({
  version: z.literal(1), source: z.enum(MUSIC_SOURCES), mini: z.boolean(), volume: z.number().int().min(0).max(100),
  ambient: z.strictObject({sound: z.enum(AMBIENT_SOUNDS), timerMin: z.number().int().min(1).max(480).optional(), stopOnHide: z.boolean()}),
});
export type MusicPrefs = z.infer<typeof musicSchema>;
export const emptyMusic = (): MusicPrefs => ({version: 1, source: 'ambient', mini: false, volume: 60, ambient: {sound: 'brown', stopOnHide: false}});
export const MUSIC: DeviceRecordSpec<MusicPrefs> = {key: MUSIC_KEY, schema: musicSchema, empty: emptyMusic};
