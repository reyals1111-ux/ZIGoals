import {AiError, mapHttpError, mapNetworkError} from './errors';
import {PROVIDERS, type ProviderId} from './providers';

/**
 * Voice (ADR-012, Part 7), two honest routes and nothing else:
 * - provider transcription where the provider documents an endpoint (OpenAI's /v1/audio/transcriptions, multipart,
 *   25 MiB): the recording goes from this browser to the provider with the same key, nothing through ZIGoals;
 * - the browser's own speech recognition, with a disclosure per browser (Chrome may send audio to Google unless
 *   on-device recognition is available; Safari may send audio to Apple; Firefox has none).
 * Recordings last at most a minute; the transcript is editable before it is sent. Read-aloud uses the browser's
 * speech synthesis and is off by default.
 */
export const MAX_RECORDING_MS = 60_000;
/** MediaRecorder containers in order of preference; Safari records MP4/AAC, Chrome and Firefox WebM/Opus. */
export const RECORDER_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus'] as const;
export function recorderMimeType(isTypeSupported: (type: string) => boolean): string | null {
  for (const type of RECORDER_MIME_CANDIDATES) { try { if (isTypeSupported(type)) return type; } catch { /* a recorder that cannot answer */ } }
  return null;
}
/** The upload's file name, from the container (OpenAI reads the format from the extension). */
export function transcriptionFileName(mime: string | null): string {
  const type = (mime ?? '').toLowerCase();
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'speech.m4a';
  if (type.includes('ogg')) return 'speech.ogg';
  if (type.includes('wav')) return 'speech.wav';
  if (type.includes('mpeg') || type.includes('mp3')) return 'speech.mp3';
  return 'speech.webm';
}
/** OpenAI's transcription models (developers.openai.com, speech-to-text guide, 2026-10-04); the person picks one. */
export const TRANSCRIPTION_MODELS = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'] as const;
export type Browser = 'chrome' | 'safari' | 'firefox' | 'other';
export function detectBrowser(userAgent: string): Browser {
  const ua = userAgent.toLowerCase();
  if (ua.includes('firefox/') || ua.includes('fxios/')) return 'firefox';
  if (ua.includes('edg/') || ua.includes('chrome/') || ua.includes('crios/') || ua.includes('chromium/')) return 'chrome';
  if (ua.includes('safari/') && ua.includes('applewebkit/')) return 'safari';
  return 'other';
}
/** What happens to the audio with browser recognition, said before the first use and in Settings. */
export function browserSpeechDisclosure(browser: Browser, onDevice: boolean): string {
  switch (browser) {
    case 'chrome': return onDevice ? 'Speech recognition runs on this device: Chrome keeps the audio here.' : 'Speech recognition by Chrome: the audio is sent to Google\'s speech service while you speak (on-device recognition is used where Chrome offers it). Nothing goes through ZIGoals.';
    case 'safari': return 'Speech recognition by Safari: Apple says the audio may be sent to Apple to be processed. Nothing goes through ZIGoals.';
    case 'firefox': return 'Firefox has no speech recognition yet; type instead, or use your provider\'s transcription.';
    default: return 'Speech recognition by your browser: the audio may be sent to the browser maker\'s speech service. Nothing goes through ZIGoals.';
  }
}
/** The recognition language: the person's choice, else the app or device language, else English. */
export function speechLanguage(setting: string | null | undefined, navigatorLanguage: string | null | undefined): string {
  const pick = (value: string | null | undefined) => value && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i.test(value.trim()) ? value.trim() : null;
  return pick(setting) ?? pick(navigatorLanguage) ?? 'en-US';
}
/** ISO 639-1 for the transcription endpoint (it takes the language, not the region). */
export const iso639 = (language: string): string => language.split('-')[0]!.toLowerCase();
export type TranscribeRequest = {provider: ProviderId; key: string | null; blob: Blob; mime: string | null; model: string; language?: string | null; signal?: AbortSignal; fetcher?: typeof fetch};
/** Sends a recording to the provider's documented transcription endpoint and returns the words. */
export async function transcribe({provider, key, blob, mime, model, language, signal, fetcher = fetch}: TranscribeRequest): Promise<string> {
  const spec = PROVIDERS[provider];
  if (!spec.transcription) throw new AiError('request', `${spec.name} documents no transcription endpoint; use your browser's speech recognition instead.`, {provider});
  if (!key) throw new AiError('bad-key', 'Your key is not on this device, so the recording was not sent.', {provider});
  if (blob.size > spec.transcription.maxBytes) throw new AiError('request', `The recording is larger than ${spec.name} accepts (${Math.round(spec.transcription.maxBytes / 1024 / 1024)} MB); keep it shorter.`, {provider});
  if (blob.size === 0) throw new AiError('request', 'Nothing was recorded.', {provider});
  const form = new FormData();
  form.append('file', blob, transcriptionFileName(mime));
  form.append('model', model);
  form.append('response_format', 'json');
  if (language) form.append('language', iso639(language));
  let response: Response;
  try { response = await fetcher(`${spec.origin}${spec.transcription.path}`, {method: 'POST', headers: {authorization: `Bearer ${key}`}, body: form, signal}); }
  catch (error) { throw mapNetworkError(provider, error, {local: false, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(provider, response.status, await response.text().catch(() => ''), response.headers);
  let text: unknown;
  try { text = ((await response.json()) as {text?: unknown}).text; } catch { throw new AiError('unreadable', 'The transcription could not be read.', {provider}); }
  if (typeof text !== 'string') throw new AiError('unreadable', 'The transcription could not be read.', {provider});
  return text.trim();
}
/** Minimal typing for the Web Speech API recognition interface (not in lib.dom), including Chrome 139's on-device switch. */
export type RecognitionResultList = ArrayLike<ArrayLike<{transcript: string}> & {isFinal: boolean}>;
export type RecognitionLike = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; processLocally?: boolean;
  onresult: ((event: {resultIndex: number; results: RecognitionResultList}) => void) | null;
  onerror: ((event: {error: string; message?: string}) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
export type RecognitionConstructor = (new () => RecognitionLike) & {available?: (options: {langs: string[]; processLocally?: boolean}) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>};
export function recognitionConstructor(scope: {SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown}): RecognitionConstructor | null {
  const ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return typeof ctor === 'function' ? ctor as RecognitionConstructor : null;
}
/** Joins the final and interim parts of a recognition event into one editable text. */
export function recognitionText(results: RecognitionResultList): {final: string; interim: string} {
  let final = '', interim = '';
  for (let i = 0; i < results.length; i++) { const result = results[i]!, piece = result[0]?.transcript ?? ''; if (result.isFinal) final += piece; else interim += piece; }
  return {final: final.trim(), interim: interim.trim()};
}
/** Plain words for recognition errors (the Web Speech error codes). */
export function recognitionErrorText(code: string): string {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed': return 'The microphone was not allowed. Allow it for this site in the browser, then try again.';
    case 'no-speech': return 'No speech was heard.';
    case 'audio-capture': return 'No microphone was found.';
    case 'network': return 'The browser\'s speech service could not be reached.';
    case 'language-not-supported': return 'This language is not supported by the browser\'s speech recognition; choose another in Settings.';
    case 'aborted': return '';
    default: return 'Speech recognition stopped unexpectedly.';
  }
}
