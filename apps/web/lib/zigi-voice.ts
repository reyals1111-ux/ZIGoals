import * as z from 'zod';
import type {DeviceRecordSpec} from './device-record';
import {ZIGI_VOICE_KEY} from './z-device-keys';
import type {VoiceLanguage} from './zigi-voice-lang';

/**
 * How the person talks to ZIGi (Session Z-Cloud Part 3, `[TIER 3] (storage)`, ADR-019): `zigoals:zigi-voice:v1`, a display
 * preference on this device (through `getAppStorage()`, never synced, in "Export everything"). Every field is optional and
 * reads as its default, so an empty or unreadable record is the default experience and a later field survives here.
 * The recognition language is not here: it is `voice.language` in ZIGi's settings (lib/ai/settings.ts), one of the four
 * below or the device's own; any other value (an old French one) reads as the device default.
 */
export {VOICE_LANGUAGES, deviceVoiceLanguage, isVoiceLanguage, resolveVoiceLanguage, type VoiceLanguage} from './zigi-voice-lang';
export const VOICE_LANGUAGE_LABELS: Record<VoiceLanguage, string> = {'en-GB': 'English (UK)', 'en-US': 'English (US)', 'nl-BE': 'Nederlands (België)', 'nl-NL': 'Nederlands (Nederland)'};
const BROWSERS = ['chrome', 'safari', 'firefox', 'other'] as const;
export const voiceSchema = z.looseObject({
  version: z.literal(1),
  /** Show the microphone where the browser offers speech recognition (default on). */
  micShown: z.boolean().optional(),
  /** When the person stops talking, the words go to ZIGi (default on); off: they stay in the box to edit. */
  sendOnStop: z.boolean().optional(),
  /** Read ZIGi's reply aloud when the question was spoken (default on; never in quiet hours). */
  readSpoken: z.boolean().optional(),
  /** A tap on ZIGi's button starts listening instead of opening the panel (default off; a hold always talks). */
  tapToTalk: z.boolean().optional(),
  /** The panel's mute: nothing is read aloud until the person unmutes. */
  muted: z.boolean().optional(),
  /** When the person saw this browser's disclosure (which service hears the audio), once before the first use. */
  disclosed: z.partialRecord(z.enum(BROWSERS), z.iso.datetime()).optional(),
});
export type VoiceRecord = z.infer<typeof voiceSchema>;
export const ZIGI_VOICE: DeviceRecordSpec<VoiceRecord> = {key: ZIGI_VOICE_KEY, schema: voiceSchema, empty: () => ({version: 1})};
export type VoicePrefs = {micShown: boolean; sendOnStop: boolean; readSpoken: boolean; tapToTalk: boolean; muted: boolean};
export function voicePrefs(record: VoiceRecord): VoicePrefs {
  return {micShown: record.micShown ?? true, sendOnStop: record.sendOnStop ?? true, readSpoken: record.readSpoken ?? true, tapToTalk: record.tapToTalk ?? false, muted: record.muted ?? false};
}
