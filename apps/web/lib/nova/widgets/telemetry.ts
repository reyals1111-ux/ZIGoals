import {formatNumber} from '../../visual-format';

/**
 * Session AK (owner follow-up 3, N12; lane NA): the facts NOVA's right panel ("Behind the intelligence") shows, read only
 * from what really answers: the browser's own device facts where it exposes them, Ollama's own /api/ps for the models it
 * has loaded and their memory, and whether on-device speech recognition exists for a wake phrase. Unknown is said as
 * unknown, never guessed. Nothing leaves this computer: every address is localhost, asked only when the person asks or
 * already connected that server.
 */
export type DeviceFacts = {cores: number | null; memoryGb: number | null; online: boolean | null; battery: {level: number; charging: boolean} | null};
type NavLike = {hardwareConcurrency?: number; deviceMemory?: number; onLine?: boolean};
export function deviceFacts(nav: NavLike | undefined, battery: {level: number; charging: boolean} | null = null): DeviceFacts {
  const cores = typeof nav?.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 ? Math.floor(nav.hardwareConcurrency) : null;
  const memoryGb = typeof nav?.deviceMemory === 'number' && nav.deviceMemory > 0 ? nav.deviceMemory : null;
  const level = battery && Number.isFinite(battery.level) ? Math.max(0, Math.min(1, battery.level)) : null;
  return {cores, memoryGb, online: typeof nav?.onLine === 'boolean' ? nav.onLine : null, battery: level === null ? null : {level, charging: !!battery!.charging}};
}
/** The device facts as label and value pairs; each unknown says so (deviceMemory is rounded by the browser: "about"). */
export function factLines(f: DeviceFacts): {label: string; value: string}[] {
  return [
    {label: 'Processor cores', value: f.cores === null ? 'Unknown in this browser' : `${f.cores} logical`},
    {label: 'Memory', value: f.memoryGb === null ? 'Unknown in this browser' : `About ${formatNumber(f.memoryGb)} GB or more`},
    {label: 'Battery', value: f.battery === null ? 'Unknown in this browser' : `${Math.round(f.battery.level * 100)} %${f.battery.charging ? ', charging' : ''}`},
    {label: 'Connection', value: f.online === null ? 'Unknown' : f.online ? 'Online' : 'Offline'},
  ];
}

/** Bytes in plain words ("4.1 GB", "820 MB"). */
export function bytesWords(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size';
  if (bytes >= 1e9) return `${formatNumber(Math.round(bytes / 1e8) / 10, {maximumFractionDigits: 1})} GB`;
  return `${formatNumber(Math.max(1, Math.round(bytes / 1e6)))} MB`;
}
export type LoadedModel = {name: string; size: number | null; vram: number | null};
/** Ollama's /api/ps answer: the models loaded now, each with its memory (and how much of it sits on the GPU). */
export function parseOllamaPs(json: unknown): LoadedModel[] | null {
  const models = (json as {models?: unknown} | null)?.models;
  if (!Array.isArray(models)) return null;
  return models.slice(0, 20).flatMap(m => {
    const e = (m ?? {}) as Record<string, unknown>, name = typeof e.name === 'string' ? e.name : typeof e.model === 'string' ? e.model : null;
    if (!name) return [];
    const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
    return [{name: name.slice(0, 200), size: num(e.size), vram: num(e.size_vram)}];
  });
}
export const loadedLine = (m: LoadedModel) => m.size === null ? `${m.name}: loaded` : `${m.name}: ${bytesWords(m.size)} in memory${m.vram !== null && m.size > 0 ? `, ${Math.round(m.vram / m.size * 100)} % on the GPU` : ''}`;
/** Asks a local Ollama what it has loaded; null when it does not answer or answers something else. */
export async function ollamaLoaded(baseUrl: string, {fetcher = (i, init) => fetch(i, init), signal}: {fetcher?: (input: string, init?: RequestInit) => Promise<Response>; signal?: AbortSignal} = {}): Promise<LoadedModel[] | null> {
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?(\/[\w./-]*)?$/.test(baseUrl)) return null;
  try {
    const r = await fetcher(`${baseUrl.replace(/\/+$/, '')}/api/ps`, {signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
    return r.ok ? parseOllamaPs(await r.json()) : null;
  } catch { return null; }
}

/** Whether a "Hey NOVA" wake phrase can listen on this device: only on-device recognition qualifies. */
export type WakeSupport = {ok: true} | {ok: false; reason: string};
type RecognitionCtor = {available?: (options: {langs: string[]; processLocally: boolean}) => Promise<string>};
export async function wakeSupport(win: unknown, lang = 'en-US'): Promise<WakeSupport> {
  const w = (win ?? {}) as {SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor};
  const ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!ctor) return {ok: false, reason: 'This browser has no speech recognition, so a wake phrase is not offered.'};
  if (typeof ctor.available !== 'function') return {ok: false, reason: 'This browser recognises speech only through its maker’s servers, so NOVA does not listen for a wake phrase here.'};
  try {
    const state = await ctor.available({langs: [lang], processLocally: true});
    if (state === 'available') return {ok: true};
    if (state === 'downloadable' || state === 'downloading') return {ok: false, reason: 'On-device speech recognition can be added to this browser; until its language pack is installed, a wake phrase is not offered.'};
    return {ok: false, reason: 'On-device speech recognition is not available here, so a wake phrase is not offered.'};
  } catch { return {ok: false, reason: 'This browser could not say whether it recognises speech on the device, so a wake phrase is not offered.'}; }
}
/** Whether a heard phrase is the wake phrase for this persona ("hey nova", "hi nova", "ok nova"), any case and punctuation. */
export function isWakePhrase(heard: string, persona: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const name = norm(persona), said = norm(heard);
  return !!name && new RegExp(`(?:^| )(?:hey|hi|ok|okay) ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`).test(said);
}
