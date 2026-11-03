/**
 * Security reviews Z1A-3 and Z1A-12 (lane ZF): speech under the privacy mode. Strict sends nothing away, so:
 * - reading aloud uses only a voice the browser reports as running on this device (`localService`); with none for the
 *   language nothing is spoken and the person is told why (the browser's default voice may itself be an online one);
 * - speech input uses only the browser's on-device recognition where it offers it; otherwise it stays off, with the reason;
 * - recordings never go to a cloud transcription model in Strict, nor in Guarded (audio cannot be redacted, as a photo cannot).
 * Pure; the hooks (components/ai/use-voice.ts, use-talk.ts) read the mode at the moment of use.
 */
export type SpeechVoiceLike = {name: string; lang: string; localService: boolean; default?: boolean};
/** The best voice for the language: an exact match first, then the same language; in `localOnly`, only voices on this device. */
export function pickVoice<V extends SpeechVoiceLike>(voices: readonly V[], language: string, localOnly: boolean): V | null {
  const lc = language.toLowerCase(), base = lc.slice(0, 2), pool = voices.filter(v => !localOnly || v.localService);
  const score = (v: SpeechVoiceLike) => (v.lang.replace('_', '-').toLowerCase() === lc ? 4 : v.lang.toLowerCase().startsWith(base) ? 2 : 0) + (v.localService ? 1 : 0) + (v.default ? 0.5 : 0);
  return [...pool].sort((a, b) => score(b) - score(a)).find(v => score(v) >= 2) ?? null;
}
export const STRICT_NO_LOCAL_VOICE = 'Not read aloud: Strict privacy uses only voices on this device, and this browser has none for this language.';
/**
 * The voice to read with. Outside Strict: the device's first voice for the language, else the default voice (as before).
 * In Strict: a local voice for the language, else nothing (`refused` with the reason).
 */
export function readAloudVoice<V extends SpeechVoiceLike>(voices: readonly V[], language: string, strict: boolean): {voice: V | null; refused: string | null} {
  if (strict) { const voice = pickVoice(voices, language, true); return voice ? {voice, refused: null} : {voice: null, refused: STRICT_NO_LOCAL_VOICE}; }
  const lc = language.toLowerCase();
  return {voice: voices.find(v => v.lang.replace('_', '-').toLowerCase() === lc) ?? voices.find(v => v.lang.toLowerCase().startsWith(lc.slice(0, 2))) ?? null, refused: null};
}
export const STRICT_NO_LOCAL_SPEECH = 'Speech input is off in Strict privacy: this browser does not offer recognition on this device for your language, and Strict sends no audio away.';
/** Whether speech input may start: always outside Strict; in Strict only with on-device recognition. */
export const speechInputAllowed = (strict: boolean, onDevice: boolean): {allowed: boolean; reason: string | null} => !strict || onDevice ? {allowed: true, reason: null} : {allowed: false, reason: STRICT_NO_LOCAL_SPEECH};
export const TRANSCRIPTION_REFUSAL: Readonly<Record<'strict' | 'guarded', string>> = {
  strict: 'Not sent: Strict privacy sends no recording to a cloud transcription model. Use your browser’s speech on this device instead, or type.',
  guarded: 'Not sent: Guarded privacy sends no recording to a cloud model, because a recording cannot be redacted. Use your browser’s speech on this device instead, or type.',
};
/** Provider transcription (a recording sent to a cloud model) under the mode: refused in Strict and Guarded. */
export const transcriptionRefusal = (mode: 'strict' | 'guarded' | 'relaxed' | null): string | null => mode === 'strict' || mode === 'guarded' ? TRANSCRIPTION_REFUSAL[mode] : null;
