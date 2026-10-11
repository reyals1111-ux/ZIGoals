/**
 * Chrome's on-device model (Session V Part 15): the Prompt API, `LanguageModel`, on the open web since Chrome 148 on
 * computers (read 2026-10-05; YOUR_AI_V2.md has the quotes). The model runs inside Chrome on this computer: nothing is
 * sent anywhere. Chrome downloads it once, only after the person clicks (a download needs the page's sticky activation),
 * and it needs about 22 GB of free space; Chrome removes it again when space runs low. Where the API is missing
 * (Safari, Firefox, Android, iOS, older Chrome) or says "unavailable", ZIGoals hides every on-device choice.
 * The model is used for short, plain-language work only: "Say it nicer", sorting a question that the lookup rules did
 * not recognise, and short chats. Numbers always come from ZIGi's own lookups, never from the model.
 */
export type OnDeviceAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';
type Message = {role: 'system' | 'user' | 'assistant'; content: string};
type CreateOptions = {signal?: AbortSignal; initialPrompts?: Message[]; monitor?: (m: EventTarget) => void; expectedInputs?: unknown; expectedOutputs?: unknown};
export type OnDeviceSession = {prompt: (input: string, options?: {signal?: AbortSignal}) => Promise<string>; promptStreaming: (input: string, options?: {signal?: AbortSignal}) => ReadableStream<string>; destroy: () => void};
type LanguageModelStatic = {availability: (options?: Omit<CreateOptions, 'signal' | 'monitor' | 'initialPrompts'>) => Promise<OnDeviceAvailability>; create: (options?: CreateOptions) => Promise<OnDeviceSession>};
export const ON_DEVICE_LABEL = 'Answered by Chrome’s on-device model';
export const ON_DEVICE_DOWNLOAD_NOTE = 'A large one-time download by Chrome: it needs about 22 GB of free space on this computer, and Chrome removes the model again if space runs low.';
/** The same options for availability() and create(), as the documentation asks: English text in, text out. */
export const ON_DEVICE_OPTIONS = {expectedInputs: [{type: 'text', languages: ['en']}], expectedOutputs: [{type: 'text', languages: ['en']}]} as const;
/** The browser's LanguageModel, or null. */
export function languageModel(scope: unknown = globalThis): LanguageModelStatic | null {
  const found = (scope as {LanguageModel?: Partial<LanguageModelStatic>} | null)?.LanguageModel;
  return found && typeof found.availability === 'function' && typeof found.create === 'function' ? found as LanguageModelStatic : null;
}
/** What Chrome says about its model here; any failure reads as unavailable. Asks nothing of the person, downloads nothing. */
export async function onDeviceAvailability(scope: unknown = globalThis): Promise<OnDeviceAvailability> {
  const api = languageModel(scope); if (!api) return 'unavailable';
  try {
    const answer = await api.availability(ON_DEVICE_OPTIONS);
    return answer === 'downloadable' || answer === 'downloading' || answer === 'available' ? answer : 'unavailable';
  } catch { return 'unavailable'; }
}
/**
 * A session, from the person's click: Chrome downloads the model first when it has to (`onProgress` gets 0 to 1).
 * The instructions go in as the session's system prompt; the person's words are data after them.
 */
export async function onDeviceSession({system, signal, onProgress, scope = globalThis}: {system: string; signal?: AbortSignal; onProgress?: (share: number) => void; scope?: unknown}): Promise<OnDeviceSession> {
  const api = languageModel(scope); if (!api) throw new Error('Chrome’s on-device model is not available in this browser.');
  return api.create({...ON_DEVICE_OPTIONS, signal, initialPrompts: [{role: 'system', content: system}],
    monitor: m => m.addEventListener('downloadprogress', event => { const loaded = (event as Event & {loaded?: number}).loaded; if (typeof loaded === 'number') onProgress?.(Math.max(0, Math.min(1, loaded))); })});
}
/** Plain words for the state of Chrome's model, for Settings. */
export function availabilityLine(state: OnDeviceAvailability): string {
  switch (state) {
    case 'available': return 'Ready on this computer.';
    case 'downloading': return 'Chrome is downloading its model.';
    case 'downloadable': return 'Chrome can download its model when you choose.';
    case 'unavailable': return 'Not available in this browser or on this computer.';
  }
}
