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
export const NO_LOCAL_VOICE = 'Not read aloud: ZIGoals reads aloud only with a voice on this device, and this browser has none for this language.';
/**
 * The voice to read with: a voice on this device for the language (`localService`), in every privacy mode; with none,
 * nothing is spoken (`refused` with the reason, Strict's own wording in Strict). Session AW (owner decision 1d and
 * amendment 3; Part 6 privacy audit; TIER 3 AI tools): before, outside Strict an online voice (or the browser's default,
 * which may be online) could read a reply, so its text went to the browser maker's speech service.
 */
export function readAloudVoice<V extends SpeechVoiceLike>(voices: readonly V[], language: string, strict: boolean): {voice: V | null; refused: string | null} {
  const voice = pickVoice(voices, language, true);
  return voice ? {voice, refused: null} : {voice: null, refused: strict ? STRICT_NO_LOCAL_VOICE : NO_LOCAL_VOICE};
}
export const STRICT_NO_LOCAL_SPEECH = 'Speech input is off in Strict privacy: this browser does not offer recognition on this device for your language, and Strict sends no audio away.';
/** Whether speech input may start: always outside Strict; in Strict only with on-device recognition. */
export const speechInputAllowed = (strict: boolean, onDevice: boolean): {allowed: boolean; reason: string | null} => !strict || onDevice ? {allowed: true, reason: null} : {allowed: false, reason: STRICT_NO_LOCAL_SPEECH};
export const TRANSCRIPTION_REFUSAL: Readonly<Record<'strict' | 'guarded', string>> = {
  strict: 'Not sent: Strict privacy sends no recording to a cloud transcription model. Use your browser’s speech on this device instead, or type.',
  guarded: 'Not sent: Guarded privacy sends no recording to a cloud model, because a recording cannot be redacted. Use your browser’s speech on this device instead, or type.',
};
/** Provider transcription (a recording sent to a cloud model) under the mode: refused in Strict and Guarded. */
// Session AV (PK-18, TIER 3 AI tools): no mode chosen counts as Guarded here too: no recording goes to a cloud model.
export const transcriptionRefusal = (chosen: 'strict' | 'guarded' | 'relaxed' | null): string | null => { const mode = chosen ?? 'guarded'; return mode === 'strict' || mode === 'guarded' ? TRANSCRIPTION_REFUSAL[mode] : null; };
