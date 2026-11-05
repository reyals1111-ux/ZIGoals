import {readDeviceRecord} from '../device-record';
import {hermesNeedsRedaction, isHermesBase, localModelStillConfirmed, readHermes} from '../nova/hermes-record';
import {NOVA_SETUP, readPrivacyMode, type PrivacyMode} from '../nova/setup';
import {isKnownCloudModel} from '../nova/cloud-models';
import {getAppStorage} from '../showcase-storage';
import {hideRecoveryWordsInRequest} from '../secret-guard/redact-span';
import {AiError} from './errors';
import {PROVIDERS, type ProviderId} from './providers';
import {AI_MEMORY} from './store/records';
import type {ChatMessage, ChatRequest} from './types';

/**
 * Session AK, owner follow-up 2 (N3 step 2, N9; lane NC): the privacy mode, enforced where every request of ZIGi and NOVA
 * leaves the device (components/ai/use-chat-session.ts, `counted`: the one wrapper every chat, tool round, repair round
 * and ZIGoals hosted request goes through). One engine, one rule:
 * - no mode chosen (every person who never opened "Build your own NOVA"): the request goes exactly as before, the same
 *   object, untouched;
 * - Relaxed: the same: the granted scopes go as they are, the person's informed choice;
 * - Strict: only a model on this computer (the local provider) is reached; a cloud provider or ZIGoals hosted is refused
 *   before anything is sent;
 * - Guarded: a cloud model gets the request with secrets, account numbers, addresses, exact amounts and names redacted
 *   (lib/nova/redact.ts, loaded only then), and no photo; a local model gets it as it is.
 * - The person's Hermes Agent (lib/nova/hermes-record.ts) counts as local only once they confirmed it runs a local model;
 *   until then Strict and Guarded send it the redacted copy.
 * The mode lives in `zigoals:nova-setup:v1` (lib/nova/setup.ts; a damaged record reads as Strict). Chrome's on-device
 * model and ZIGi's own local answers never send anything, so no mode stops them.
 */
export type SendDecision = 'send' | 'redact' | 'refuse';
/**
 * Ollama's cloud models (docs/research/session-ak/NOVA.md §2.2): reached through the local server, but run on ollama.com.
 * Their names end in "cloud" (`gemma4:cloud`, `gpt-oss:120b-cloud`); the setup's scan also reads `remote_host` from
 * /api/tags (lib/nova/local-servers.ts). A renamed copy (`ollama cp`) is not recognised here by name.
 */
export const isOllamaCloudModel = (model: string | null | undefined): boolean => !!model && /(?:^|[:-])cloud$/i.test(model.trim());
/** Where a request goes: the local provider is this computer, unless its model is one of Ollama's cloud models; every other provider, and ZIGoals hosted, is a cloud. */
export const isCloudTarget = (provider: ProviderId | null | undefined, hosted = false, model?: string | null): boolean => hosted || (!!provider && provider !== 'local') || (provider === 'local' && isOllamaCloudModel(model));
/**
 * `hermesUnconfirmed` (owner follow-up 3, N11): the request goes to the person's Hermes Agent, which may itself call a cloud
 * model, and they have not confirmed it runs a local one: Strict and Guarded then redact it (never refuse: Hermes is on
 * this computer), as for a cloud in Guarded.
 */
/**
 * `knownCloud` (security review Z1A-7): Ollama's own list marked this local model as one of its cloud models (a renamed
 * copy keeps that mark: lib/nova/cloud-models.ts), so it is a cloud whatever its name says.
 */
export function sendDecision(mode: PrivacyMode | null, target: {provider: ProviderId | null | undefined; hosted?: boolean; model?: string | null; hermesUnconfirmed?: boolean; knownCloud?: boolean}): SendDecision {
  const knownCloud = target.provider === 'local' && !target.hosted && target.knownCloud === true;
  if (target.provider === 'local' && !target.hosted && target.hermesUnconfirmed && !isOllamaCloudModel(target.model) && !knownCloud && hermesNeedsRedaction(mode, false)) return 'redact';
  if (!mode || mode === 'relaxed' || !(knownCloud || isCloudTarget(target.provider, target.hosted, target.model))) return 'send';
  return mode === 'strict' ? 'refuse' : 'redact';
}
export const targetName = (provider: ProviderId | null | undefined, hosted = false, model?: string | null): string => hosted ? 'ZIGoals hosted' : provider === 'local' && isOllamaCloudModel(model) ? 'Ollama\'s cloud (ollama.com)' : provider ? PROVIDERS[provider].name : 'your AI';
export const STRICT_REFUSAL = 'Not sent: Strict privacy keeps your AI on this computer.';
export const GUARDED_PHOTO_REFUSAL = 'Not sent: Guarded privacy sends no photos to a cloud model.';
/** What the model is told when something was redacted, so it keeps the placeholders instead of guessing. */
export const REDACTION_NOTE = '\n\nPrivacy note: before this request left the person\'s device, ZIGoals replaced private details with placeholders such as [name], [address] and [account number], and wrote exact amounts as rounded figures ("about €1,200"). Keep the placeholders as they are and never ask for what they hide.';

/** The names the person told ZIGi or NOVA in their own notes (read from this device; the redaction finds names after a cue). */
export function noteTexts(storage?: Pick<Storage, 'getItem'>): string[] {
  try { return (readDeviceRecord(storage ?? getAppStorage(), AI_MEMORY).data.notes ?? []).map(n => n.text); } catch { return []; }
}
type Redactor = typeof import('../nova/redact');
function appStorageOrRefusal(): Pick<Storage, 'getItem'> {
  try { return getAppStorage(); } catch { return {getItem: () => { throw Error('Storage is unavailable.'); }}; }
}
/**
 * Session AL Part 14 (lane P14-B; security review Z1A-I3): every string value inside a model's own earlier turn — a tool
 * call's arguments (JSON text) and a provider's raw turn echoed back (Gemini's parts) — through `clean`; keys, the call's
 * name, the role and anything named a signature (Gemini's thought signatures must come back unchanged) are left as they are.
 */
const KEEP = /^(?:role|name|id|type|call_?id|tool_?call_?id|thought_?signature|signature)$/i;
export function mapStrings(value: unknown, clean: (text: string) => string, key = ''): unknown {
  if (typeof value === 'string') return KEEP.test(key) ? value : clean(value);
  if (Array.isArray(value)) return value.map(v => mapStrings(v, clean, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, clean, k)]));
  return value;
}
/** A tool call's arguments: its JSON with each string value cleaned, or the whole text when it is not JSON. */
export function mapArguments(text: string, clean: (text: string) => string): string {
  try { return JSON.stringify(mapStrings(JSON.parse(text), clean)); } catch { return clean(text); }
}
/** The request a cloud model may receive in Guarded mode, and what was taken out. Pure, given the redaction module. */
export function redactRequest<R extends ChatRequest>(request: R, redactor: Redactor, knownNames: readonly string[]): {request: R; redacted: number} {
  let redacted = 0;
  const clean = (text: string) => { const out = redactor.redactText(text, {knownNames}); redacted += redactor.totalRedactions(out.found); return out.text; };
  const blocksValid = !!request.systemBlocks?.length && request.systemBlocks.map(b => b.text).join('') === request.system;
  const blocks = blocksValid ? request.systemBlocks!.map(b => ({...b, text: clean(b.text)})) : undefined;
  let system = blocks ? blocks.map(b => b.text).join('') : clean(request.system);
  const messages = request.messages.map(m => (m.role === 'assistant' && m.toolCalls ? {...m, content: clean(m.content), toolCalls: m.toolCalls.map(c => ({...c, arguments: mapArguments(c.arguments, clean)})), ...(m.raw !== undefined ? {raw: mapStrings(m.raw, clean)} : {})} : {...m, content: clean(m.content)}) as ChatMessage);
  let systemBlocks = blocks;
  if (redacted > 0) { system += REDACTION_NOTE; systemBlocks = blocks ? [...blocks, {text: REDACTION_NOTE}] : undefined; }
  const next = {...request, system, messages} as R;
  if (systemBlocks) next.systemBlocks = systemBlocks; else delete next.systemBlocks;
  return {request: next, redacted};
}
/**
 * The engine hook: the request as the privacy mode allows it, or an AiError('blocked') with nothing sent. With no mode,
 * Relaxed, or a model on this computer, the very same request object comes back.
 */
/**
 * Session AL Part 14 (lane P14-B; security review Z1A-6 last line, Z1A-7 alternative): optional live checks the chat passes
 * (lib/ai/privacy-probes.ts), asked only when a mode would redact or refuse and only for a model on this computer:
 * - `hermes`: the server's /health says `platform: hermes-agent`, so an address the person never connected through the
 *   guide is still treated as their (unconfirmed) Hermes;
 * - `ollamaCloud`: Ollama's /api/show marks a model it never listed as one of its cloud models (`remote_host`).
 * A check that cannot answer changes nothing (the name and saved rules still apply).
 */
export type PrivacyProbes = {hermes?: (baseUrl: string) => Promise<boolean>; ollamaCloud?: (baseUrl: string, model: string) => Promise<boolean | null>};
export async function guardRequest<R extends ChatRequest>(request: R, options: {hosted?: boolean; mode?: PrivacyMode | null; knownNames?: readonly string[]; storage?: Pick<Storage, 'getItem'>; probes?: PrivacyProbes} = {}): Promise<R> {
  // Security review F10 R1-F7 (G7): recovery words saved in a note never leave inside tool results, ZIGi's earlier answers
  // or the system text, in every mode and for every brain; only the matching run is replaced.
  request = await hideRecoveryWordsInRequest(request);
  const hosted = !!options.hosted;
  // The app storage is read only when needed; a storage that cannot be reached reads as Strict and unconfirmed (fail closed).
  let storage = options.storage ?? null;
  const store = () => storage ??= appStorageOrRefusal();
  const mode = options.mode !== undefined ? options.mode : readPrivacyMode(store());
  const hermes = request.provider === 'local' && !hosted && !!request.baseUrl && !!mode && mode !== 'relaxed' ? readHermes(store()) : null;
  const savedHermes = !!hermes && isHermesBase(request.baseUrl, hermes.data);
  // Z1A-6 (AL Part 14): an OpenAI-compatible server on this computer whose /health says it is Hermes counts as an unconfirmed Hermes.
  const probedHermes = !!hermes && !savedHermes && request.localServer !== 'ollama' && !!options.probes?.hermes && await options.probes.hermes(request.baseUrl!).catch(() => false);
  const hermesUnconfirmed = probedHermes || (savedHermes && (hermes!.unreadable || !localModelStillConfirmed(hermes!.data)));
  // Z1A-7: a local model Ollama's list marked as running in its cloud (read only when a mode would refuse or redact it).
  let knownCloud = request.provider === 'local' && !hosted && !!mode && mode !== 'relaxed' && (() => { try { return isKnownCloudModel(readDeviceRecord(store(), NOVA_SETUP).data, request.model); } catch { return false; } })();
  // Z1A-7 alternative (AL Part 14): a model the listing never showed, asked once of Ollama itself (/api/show).
  if (!knownCloud && request.provider === 'local' && !hosted && !!mode && mode !== 'relaxed' && request.localServer === 'ollama' && request.baseUrl && request.model && !isOllamaCloudModel(request.model) && options.probes?.ollamaCloud) {
    knownCloud = (await options.probes.ollamaCloud(request.baseUrl, request.model).catch(() => null)) === true;
  }
  const decision = sendDecision(mode, {provider: request.provider, hosted, model: request.model, hermesUnconfirmed, knownCloud});
  // Hermes Agent runs its own tools and ignores a client's (docs/research/session-ak/HERMES_AGENT.md §2.5): ZIGi's tool
  // definitions never go to it. Only for a Hermes the person connected through the guide (its saved address).
  if (request.tools?.length && request.provider === 'local' && !hosted && request.baseUrl) {
    const saved = readHermes(store()).data;
    if (probedHermes || (saved.baseUrl && isHermesBase(request.baseUrl, saved))) { const {tools: _tools, ...rest} = request; void _tools; return guardRequest(rest as R, {...options, mode, storage: store()}); }
  }
  if (decision === 'send') return request;
  if (decision === 'refuse') throw new AiError('blocked', STRICT_REFUSAL, {provider: request.provider});
  if (request.messages.some(m => m.role === 'user' && m.images?.length)) throw new AiError('blocked', GUARDED_PHOTO_REFUSAL, {provider: request.provider});
  const redactor = await import('../nova/redact');
  const known = options.knownNames ?? redactor.knownNamesFrom(noteTexts(store()));
  return redactRequest(request, redactor, known).request;
}
