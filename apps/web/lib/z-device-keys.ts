/**
 * The names of Session Z-Cloud's device keys ([TIER 3] (storage keys), ADR-019), in a module with no imports so the shell,
 * the welcome check and the export can name them without shipping a schema (the pattern of lib/ai/store/keys.ts and
 * lib/w-device-keys.ts). Both go through `getAppStorage()` (per account; the tab's session storage in Showcase), are never
 * synced and are part of "Export everything". Builds #32–#35 never read them: an unknown key is ignored there.
 * - `zigoals:zigi-suggestions:v1`: the person's own frequent questions to ZIGi, kept on this device only
 *   (lib/zigi-suggestions.ts). Personal: a device with any is not new.
 * - `zigoals:zigi-voice:v1`: how the person talks to ZIGi (show the microphone, language, send when they stop talking,
 *   read spoken replies aloud, tap ZIGi to talk, mute, the disclosure seen) (lib/zigi-voice.ts). A display preference.
 */
export const ZIGI_SUGGESTIONS_KEY = 'zigoals:zigi-suggestions:v1';
export const ZIGI_VOICE_KEY = 'zigoals:zigi-voice:v1';
/** The person's own records: a device with any of them is not new. */
export const Z_PERSONAL_KEYS: readonly string[] = [ZIGI_SUGGESTIONS_KEY];
/** Display preferences with nothing personal in them. */
export const Z_DISPLAY_KEYS: readonly string[] = [ZIGI_VOICE_KEY];
