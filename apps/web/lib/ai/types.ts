import type {ProviderId} from './providers';

/**
 * Session V Part 6 (native tool calling, read-only tools only, owner decision D1): a call the model asked for, with its
 * arguments as the model wrote them (JSON text; Ollama sends an object, which is written as JSON), and the turn that
 * carried it. Writes never come this way: they stay action blocks and proposal cards.
 */
export type ToolCallPart = {id: string; name: string; arguments: string};
/** A tool the provider may call: the portable JSON Schema form of lib/ai/tools (no `strict`, no forced choice). */
export type ToolSpec = {name: string; description: string; parameters: Record<string, unknown>};
/**
 * Session V Part 7: a photo the person attached to one message (a meal), downscaled in the browser to a JPEG of at most
 * 1024 px. It goes to their provider with that message only and is never stored by ZIGoals.
 */
export type ChatImage = {mime: 'image/jpeg'; data: string};
/** One turn of a conversation as the provider sees it. The system prompt travels separately. */
export type ChatMessage =
  | {role: 'user'; content: string; toolCalls?: undefined; images?: readonly ChatImage[]}
  | {role: 'assistant'; content: string; toolCalls?: undefined}
  /** An assistant turn that asked for tools; `raw` is the provider's own turn when it must be echoed unchanged (Gemini's parts with thought signatures). */
  | {role: 'assistant'; content: string; toolCalls: ToolCallPart[]; raw?: unknown}
  /** A tool's result for one call, as text (the tool's compact JSON). */
  | {role: 'tool'; content: string; toolCallId: string; name: string};
/**
 * What a streaming reply yields, in order: text deltas, usage when the provider reports it, then exactly one done.
 * Session Z-Local Part 3: `cacheWrite` and `cacheRead` are the prompt-cache counts a wire reports beside `input`
 * (Anthropic's `cache_creation_input_tokens` / `cache_read_input_tokens`; OpenAI's `prompt_tokens_details.cached_tokens`
 * as reads); absent or null where a wire has none. `input` stays what the provider calls input: on Anthropic the
 * uncached remainder, so the whole prompt is input + cacheWrite + cacheRead.
 */
export type ChatEvent =
  | {type: 'text'; delta: string}
  | {type: 'usage'; input: number | null; output: number | null; cacheWrite?: number | null; cacheRead?: number | null}
  /** A complete tool call (Session V Part 6), emitted once its arguments are whole. */
  | {type: 'tool-call'; call: ToolCallPart}
  /** The model's whole turn, for wires that need it echoed back unchanged (Gemini). */
  | {type: 'model-turn'; raw: unknown}
  | {type: 'done'; reason: string | null};
export type ChatRequest = {
  provider: ProviderId;
  /** For the local provider: which wire the server speaks (detected at setup). Ignored elsewhere. */
  localServer?: 'ollama' | 'openai-compatible';
  model: string;
  system: string;
  /**
   * Session Z-Local Part 3 (ADR-020 L3): the system prompt in blocks whose texts concatenate to exactly `system`; a block
   * with `cache: true` ends a stable prefix (the frame, protocol and examples; the page's records) that Anthropic's
   * prompt cache may keep. Other wires ignore it; a list that does not concatenate to `system` is ignored too.
   */
  systemBlocks?: readonly {text: string; cache?: boolean}[];
  /** `false` sends no cache marker at all (the before/after measurement only); absent, the wire caches as it can. */
  cache?: boolean;
  messages: ChatMessage[];
  /** Per-reply output cap (ADR-012 spend protection); every wire has a field for it. */
  maxOutputTokens: number;
  /** Read-only tools the model may call (Session V Part 6); absent or empty, every wire's body is T's, byte for byte. */
  tools?: readonly ToolSpec[];
  /**
   * Session X-Local Part 6d: whether a model that can "think" may do so. Ollama's wire gets `think: false` unless this
   * is true (a thinking model otherwise spends the output cap on hidden thought and its cards arrive cut off: gemma4
   * answered in 22 tokens and 0.8 s with it off, in 200 tokens of hidden thought and 12.7 s with it on). "Think deeper"
   * sets it. Other wires have no field for it today.
   */
  think?: boolean;
  /** Session X-Local Phase 2 (P2.2b): structured output for one reply, as a JSON schema the wire enforces (Ollama's `format`); only the repair round sets it. Other wires ignore it. */
  format?: Record<string, unknown>;
  /** The person's key or token; null for a local server without authentication. */
  key: string | null;
  /** Local provider only: the server's base URL (http://localhost:11434, http://127.0.0.1:1234, …). */
  baseUrl?: string;
  /** This page's origin, sent to OpenRouter as HTTP-Referer (it identifies the app, never the person). */
  appOrigin?: string;
  signal?: AbortSignal;
  fetcher?: typeof fetch;
};
export type ModelKind = 'chat' | 'transcription' | 'other';
export type ModelInfo = {id: string; label: string; kind: ModelKind};
