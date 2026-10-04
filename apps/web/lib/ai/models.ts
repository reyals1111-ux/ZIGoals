import {AiError, mapHttpError, mapNetworkError} from './errors';
import {PROVIDERS, openAiBase, type ProviderId} from './providers';
import type {ModelInfo} from './types';
import {anthropicHeaders} from './adapters/anthropic';
import {geminiModelId} from './adapters/gemini';

/**
 * The person's own model list, from each provider's listing endpoint (docs/product/YOUR_AI_V1.md §1). No model is ever
 * hard-coded as best: the list is shown and the person picks. Where a provider gives no capability field, the kind is
 * a cautious reading of the id (embeddings, images, audio, moderation and transcription models are not chat models);
 * the interface shows chat models first and lets the person type any id.
 */
export type ListRequest = {provider: ProviderId; key: string | null; baseUrl?: string; localServer?: 'ollama' | 'openai-compatible'; signal?: AbortSignal; fetcher?: typeof fetch};
const NOT_CHAT = /embed|embedding|tts|whisper|transcri|dall-e|image|moderation|realtime|audio|sora|veo|imagen|aqa|rerank|guard|computer-use|speech|vision-preview$/i;
const TRANSCRIPTION = /whisper|transcri/i;
export function kindOf(id: string): ModelInfo['kind'] { if (TRANSCRIPTION.test(id)) return 'transcription'; return NOT_CHAT.test(id) ? 'other' : 'chat'; }
const fetcherOf = (request: Pick<ListRequest, 'fetcher'>) => request.fetcher ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
async function getJson(request: ListRequest, url: string, headers: Record<string, string>, local: boolean): Promise<unknown> {
  let response: Response;
  try { response = await fetcherOf(request)(url, {headers, signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'}); }
  catch (error) { throw mapNetworkError(request.provider, error, {local, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); }
  if (!response.ok) throw mapHttpError(request.provider, response.status, await response.text().catch(() => ''), response.headers);
  try { return await response.json() as unknown; } catch { throw new AiError('unreadable', 'The model list could not be read.', {provider: request.provider}); }
}
const str = (value: unknown): string | null => typeof value === 'string' && value ? value : null;
const dedupe = (models: ModelInfo[]) => { const seen = new Set<string>(); return models.filter(m => !seen.has(m.id) && seen.add(m.id)); };
/** The OpenAI shape, `{data: [{id}]}`, shared by OpenAI, xAI, OpenRouter, LM Studio and Ollama's /v1. */
function fromOpenAiList(value: unknown, kind: (id: string, entry: Record<string, unknown>) => ModelInfo['kind']): ModelInfo[] {
  const data = (value as {data?: unknown} | null)?.data;
  if (!Array.isArray(data)) throw new AiError('unreadable', 'The model list could not be read.');
  return dedupe(data.flatMap(entry => { const e = (entry ?? {}) as Record<string, unknown>, id = str(e.id); return id ? [{id, label: str(e.name) ?? id, kind: kind(id, e)}] : []; }));
}
function openRouterKind(id: string, entry: Record<string, unknown>): ModelInfo['kind'] {
  const arch = entry.architecture as {input_modalities?: unknown; output_modalities?: unknown} | undefined;
  const outputs = Array.isArray(arch?.output_modalities) ? arch.output_modalities : null, inputs = Array.isArray(arch?.input_modalities) ? arch.input_modalities : null;
  if (outputs && !outputs.includes('text')) return 'other';
  if (inputs && !inputs.includes('text')) return 'other';
  return kindOf(id);
}
export async function listModels(request: ListRequest): Promise<ModelInfo[]> {
  const provider = PROVIDERS[request.provider];
  switch (request.provider) {
    case 'anthropic': {
      const value = await getJson(request, `${provider.origin}/v1/models?limit=1000`, anthropicHeaders(request.key), false) as {data?: unknown};
      if (!Array.isArray(value.data)) throw new AiError('unreadable', 'The model list could not be read.', {provider: 'anthropic'});
      return dedupe(value.data.flatMap(entry => { const e = (entry ?? {}) as Record<string, unknown>, id = str(e.id); return id ? [{id, label: str(e.display_name) ?? id, kind: 'chat' as const}] : []; }));
    }
    case 'gemini': {
      const models: ModelInfo[] = []; let pageToken: string | null = null;
      do {
        const url: string = `${provider.origin}/v1beta/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const value = await getJson(request, url, {'x-goog-api-key': request.key ?? ''}, false) as {models?: unknown; nextPageToken?: unknown};
        if (!Array.isArray(value.models)) throw new AiError('unreadable', 'The model list could not be read.', {provider: 'gemini'});
        for (const entry of value.models) {
          const e = (entry ?? {}) as Record<string, unknown>, name = str(e.name); if (!name) continue;
          const methods = Array.isArray(e.supportedGenerationMethods) ? e.supportedGenerationMethods as unknown[] : [];
          const id = geminiModelId(name);
          models.push({id, label: str(e.displayName) ?? id, kind: methods.includes('generateContent') && kindOf(id) === 'chat' ? 'chat' : 'other'});
        }
        pageToken = str(value.nextPageToken);
      } while (pageToken && models.length < 2000);
      return dedupe(models);
    }
    case 'local': {
      if (!request.baseUrl) throw new AiError('local-unreachable', 'Enter the local server\'s address first.', {provider: 'local'});
      const server = request.localServer ?? await detectLocalServer(request);
      if (server === 'ollama') {
        const value = await getJson(request, `${request.baseUrl}/api/tags`, {}, true) as {models?: unknown};
        if (!Array.isArray(value.models)) throw new AiError('unreadable', 'The model list could not be read.', {provider: 'local'});
        return dedupe(value.models.flatMap(entry => { const e = (entry ?? {}) as Record<string, unknown>, id = str(e.name) ?? str(e.model); return id ? [{id, label: id, kind: kindOf(id)}] : []; }));
      }
      return fromOpenAiList(await getJson(request, `${request.baseUrl}/v1/models`, request.key ? {authorization: `Bearer ${request.key}`} : {}, true), id => kindOf(id));
    }
    case 'openrouter': return fromOpenAiList(await getJson(request, `${openAiBase(provider)}/v1/models`, request.key ? {authorization: `Bearer ${request.key}`} : {}, false), openRouterKind);
    case 'openai': case 'xai': return fromOpenAiList(await getJson(request, `${provider.origin}/v1/models`, {authorization: `Bearer ${request.key ?? ''}`}, false), id => kindOf(id));
  }
}
/** Which wire a local server speaks: Ollama answers `GET /api/version`; otherwise an OpenAI-compatible `/v1/models` must answer. */
export async function detectLocalServer(request: Pick<ListRequest, 'baseUrl' | 'key' | 'signal' | 'fetcher'>): Promise<'ollama' | 'openai-compatible'> {
  const fetcher = fetcherOf(request), base = request.baseUrl ?? '';
  const probe = async (url: string, headers: Record<string, string>) => { try { return await fetcher(url, {headers, signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'}); } catch (error) { throw mapNetworkError('local', error, {local: true, online: typeof navigator === 'undefined' ? undefined : navigator.onLine}); } };
  const version = await probe(`${base}/api/version`, {});
  if (version.ok) { const value = await version.json().catch(() => null) as {version?: unknown} | null; if (value && typeof value.version === 'string') return 'ollama'; }
  const models = await probe(`${base}/v1/models`, request.key ? {authorization: `Bearer ${request.key}`} : {});
  if (models.ok) return 'openai-compatible';
  if (models.status === 401) throw mapHttpError('local', 401, '', models.headers);
  throw new AiError('local-unreachable', 'A server answered, but neither Ollama\'s nor an OpenAI-compatible model list was found at that address.', {provider: 'local', status: models.status});
}
/** Listing the models is the connection test: it proves the address, the key and the browser's permission in one request. */
export const testConnection = (request: ListRequest) => listModels(request);
