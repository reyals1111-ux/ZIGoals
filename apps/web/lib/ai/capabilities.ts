import {AiError} from './errors';
import {PROVIDERS, openAiBase, type ProviderId} from './providers';
import type {ToolMode} from './store/records';

/**
 * Whether ZIGi offers its read-only tools to the person's model (Session V Part 6, ADR-014 S11). The facts, read
 * 2026-10-05 (docs/product/YOUR_AI_V2.md, research §A1–A7):
 * - OpenAI, Anthropic, Gemini and xAI document function calling for their chat models: tools are tried;
 * - OpenRouter publishes `supported_parameters` per model (`tools` = function calling) in its model list;
 * - Ollama answers `POST /api/show` with the model's `capabilities` (`tools`, `vision`, …);
 * - LM Studio answers `GET /api/v1/models` with `capabilities.trained_for_tool_use` and `capabilities.vision`;
 * - any other local server publishes nothing: tools are tried.
 * A model the metadata names as without tools gets the records attached instead (question-aware context). A request
 * with tools that the provider rejects as malformed (400, 422, or a 404 that names tools) is sent again without them,
 * and that model stays on "attach" for the rest of the session. Nothing is stored: the metadata is read again in the
 * next session, by the person's next message (a user action), from the provider they already use.
 */
export type Capability = {tools: boolean | null; vision: boolean | null};
export const UNKNOWN: Capability = {tools: null, vision: null};
export type CapabilityRequest = {provider: ProviderId; model: string; key: string | null; baseUrl?: string | null; localServer?: 'ollama' | 'openai-compatible' | null; signal?: AbortSignal; fetcher?: typeof fetch};
const DOCUMENTED: readonly ProviderId[] = ['openai', 'anthropic', 'gemini', 'xai'];
const list = (value: unknown): unknown[] | null => Array.isArray(value) ? value : null;
async function json(request: CapabilityRequest, url: string, init: RequestInit): Promise<unknown> {
  const fetcher = request.fetcher ?? ((input: RequestInfo | URL, options?: RequestInit) => fetch(input, options));
  const response = await fetcher(url, {...init, signal: request.signal, cache: 'no-store', credentials: 'omit', mode: 'cors'});
  if (!response.ok) throw new AiError('request', 'No metadata.', {status: response.status, provider: request.provider});
  return response.json() as Promise<unknown>;
}
/** What the provider publishes about this model; unknown (never a guess) when it publishes nothing or cannot be read. */
export async function readCapability(request: CapabilityRequest): Promise<Capability> {
  if (DOCUMENTED.includes(request.provider)) return {tools: true, vision: null};
  try {
    if (request.provider === 'openrouter') {
      const value = await json(request, `${openAiBase(PROVIDERS.openrouter)}/v1/models`, {headers: {accept: 'application/json'}}) as {data?: unknown};
      const entry = (list(value.data) ?? []).find(m => (m as {id?: unknown} | null)?.id === request.model) as {supported_parameters?: unknown; architecture?: {input_modalities?: unknown}} | undefined;
      if (!entry) return UNKNOWN;
      const params = list(entry.supported_parameters), inputs = list(entry.architecture?.input_modalities);
      return {tools: params ? params.includes('tools') : null, vision: inputs ? inputs.includes('image') : null};
    }
    if (request.provider === 'local' && request.baseUrl) {
      if (request.localServer === 'ollama') {
        const value = await json(request, `${request.baseUrl}/api/show`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({model: request.model})}) as {capabilities?: unknown};
        const caps = list(value.capabilities);
        return caps ? {tools: caps.includes('tools'), vision: caps.includes('vision')} : UNKNOWN;
      }
      // LM Studio's list: `models[]` with `key`, `loaded_instances[].id` and, for language models, `capabilities`.
      const value = await json(request, `${request.baseUrl}/api/v1/models`, {headers: request.key ? {authorization: `Bearer ${request.key}`} : {}}) as {models?: unknown};
      const entry = (list(value.models) ?? []).find(m => { const e = (m ?? {}) as {key?: unknown; loaded_instances?: unknown}; return e.key === request.model || (list(e.loaded_instances) ?? []).some(i => (i as {id?: unknown} | null)?.id === request.model); }) as {capabilities?: {trained_for_tool_use?: unknown; vision?: unknown}} | undefined;
      const caps = entry?.capabilities;
      return caps ? {tools: typeof caps.trained_for_tool_use === 'boolean' ? caps.trained_for_tool_use : null, vision: typeof caps.vision === 'boolean' ? caps.vision : null} : UNKNOWN;
    }
  } catch (error) { if (request.signal?.aborted) throw error; }
  return UNKNOWN;
}
export type DataMode = 'tools' | 'attach';
/** How this message gets the person's data: the setting, then what the session learned, then the metadata. */
export function dataMode(setting: ToolMode | undefined, capability: Capability | null, fellBack: boolean): DataMode {
  if (setting === 'attach' || fellBack) return 'attach';
  if (setting === 'tools') return 'tools';
  return capability?.tools === false ? 'attach' : 'tools';
}
/** A rejected tools request that is worth one more try without tools (the provider did not take the tool fields). */
export function isToolRejection(error: unknown): boolean {
  if (!(error instanceof AiError) || error.status === null) return false;
  if (error.status === 400 || error.status === 422) return true;
  return error.status === 404 && /tool|function/i.test(error.message);
}
/**
 * One line for the context bar and Settings: which way the data travels for this message. With tools, the list of tool
 * definitions travels with every request of the answer, so its size is said (estimated at four characters a token).
 */
export function dataModeLine(mode: DataMode, fellBack: boolean, toolTokens?: number): string {
  if (mode === 'tools') return `Your AI asks ZIGi for the records it needs (tools); each lookup is shown under the answer.${toolTokens ? ` The tool list adds about ${(Math.ceil(toolTokens / 100) * 100).toLocaleString('en-US')} tokens to each request.` : ''}`;
  return fellBack ? 'Your model did not take ZIGi\'s tools, so the records chosen from your question are attached instead.' : 'The records chosen from your question are attached to your message.';
}
/** The tool list's size in tokens as a provider would count it roughly (four characters a token). */
export const toolListTokens = (tools: readonly {name: string; description: string; parameters: unknown}[]) => tools.length ? Math.ceil(JSON.stringify(tools).length / 4) : 0;
/** The session's memory of models that refused tools: "provider:model", in memory only. */
export const fallbackKey = (provider: ProviderId, model: string) => `${provider}:${model}`;
