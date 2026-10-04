import type {ProviderId} from './providers';

/** One turn of a conversation as the provider sees it. The system prompt travels separately. */
export type ChatMessage = {role: 'user' | 'assistant'; content: string};
/** What a streaming reply yields, in order: text deltas, usage when the provider reports it, then exactly one done. */
export type ChatEvent =
  | {type: 'text'; delta: string}
  | {type: 'usage'; input: number | null; output: number | null}
  | {type: 'done'; reason: string | null};
export type ChatRequest = {
  provider: ProviderId;
  /** For the local provider: which wire the server speaks (detected at setup). Ignored elsewhere. */
  localServer?: 'ollama' | 'openai-compatible';
  model: string;
  system: string;
  messages: ChatMessage[];
  /** Per-reply output cap (ADR-012 spend protection); every wire has a field for it. */
  maxOutputTokens: number;
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
