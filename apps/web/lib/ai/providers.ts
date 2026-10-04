import egress from '../egress-policy.json';

/**
 * The providers ZIGi can talk to (ADR-012, docs/product/YOUR_AI_V1.md §1). Every fact here was read from the official
 * documentation on `verified`; the origins come from egress-policy.json, the one list the content security policy also
 * reads. Nothing here is a secret. Browser-direct means the browser calls the provider itself: ZIGoals runs no proxy.
 */
export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'xai' | 'openrouter' | 'local';
export type Wire = 'openai' | 'anthropic' | 'gemini' | 'ollama';
export type Provider = {
  id: ProviderId;
  name: string;
  /** The API origin, or '' for the local provider (its base URL is the person's setting). */
  origin: string;
  /** How the key travels; local servers usually need none (LM Studio can require a bearer token). */
  auth: 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'optional-bearer';
  /** The request/response format; the local provider's wire is detected at setup (Ollama or OpenAI-compatible). */
  wire: Wire | 'detected';
  /** Where the person manages keys and sees usage; null where there is none. Never carries personal data. */
  keysUrl: string | null;
  usageUrl: string | null;
  docsUrl: string;
  /** The provider's own chat app, for the launcher's "Open <app>" button (a text label, never a logo). */
  app: {name: string; url: string} | null;
  /** Speech-to-text through the same key, where the provider documents an endpoint; the size limit is the provider's. */
  transcription: {path: string; maxBytes: number} | null;
  /** An official user-scoped sign-in documented for third-party browser apps, where one exists. */
  signIn: 'openrouter-pkce' | null;
  verified: string;
};
const ORIGINS = egress.aiProviderOrigins;
export const PROVIDERS: Record<ProviderId, Provider> = {
  openai: {id: 'openai', name: 'OpenAI', origin: ORIGINS.openai, auth: 'bearer', wire: 'openai', keysUrl: 'https://platform.openai.com/api-keys', usageUrl: 'https://platform.openai.com/usage', docsUrl: 'https://developers.openai.com/api/docs/api-reference/chat/create', app: {name: 'ChatGPT', url: 'https://chatgpt.com/'}, transcription: {path: '/v1/audio/transcriptions', maxBytes: 25 * 1024 * 1024}, signIn: null, verified: '2026-10-04'},
  anthropic: {id: 'anthropic', name: 'Anthropic', origin: ORIGINS.anthropic, auth: 'x-api-key', wire: 'anthropic', keysUrl: 'https://platform.claude.com/settings/keys', usageUrl: 'https://platform.claude.com/settings/usage', docsUrl: 'https://platform.claude.com/docs/en/api/messages', app: {name: 'Claude', url: 'https://claude.ai/new'}, transcription: null, signIn: null, verified: '2026-10-04'},
  gemini: {id: 'gemini', name: 'Google Gemini', origin: ORIGINS.gemini, auth: 'x-goog-api-key', wire: 'gemini', keysUrl: 'https://aistudio.google.com/apikey', usageUrl: 'https://aistudio.google.com/usage', docsUrl: 'https://ai.google.dev/api/generate-content', app: {name: 'Gemini', url: 'https://gemini.google.com/app'}, transcription: null, signIn: null, verified: '2026-10-04'},
  xai: {id: 'xai', name: 'xAI', origin: ORIGINS.xai, auth: 'bearer', wire: 'openai', keysUrl: 'https://console.x.ai/', usageUrl: 'https://console.x.ai/', docsUrl: 'https://docs.x.ai/developers/rest-api-reference', app: {name: 'Grok', url: 'https://grok.com/'}, transcription: null, signIn: null, verified: '2026-10-04'},
  openrouter: {id: 'openrouter', name: 'OpenRouter', origin: ORIGINS.openrouter, auth: 'bearer', wire: 'openai', keysUrl: 'https://openrouter.ai/settings/keys', usageUrl: 'https://openrouter.ai/activity', docsUrl: 'https://openrouter.ai/docs/api-reference/overview', app: {name: 'OpenRouter', url: 'https://openrouter.ai/chat'}, transcription: null, signIn: 'openrouter-pkce', verified: '2026-10-04'},
  local: {id: 'local', name: 'A local model', origin: '', auth: 'optional-bearer', wire: 'detected', keysUrl: null, usageUrl: null, docsUrl: 'https://docs.ollama.com/faq', app: null, transcription: null, signIn: null, verified: '2026-10-04'},
};
export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
export const isProviderId = (value: unknown): value is ProviderId => typeof value === 'string' && value in PROVIDERS;
/** The API path prefix of an OpenAI-compatible provider, so `${base}/v1/chat/completions` is right for each. */
export function openAiBase(provider: Provider, baseUrl?: string): string {
  if (provider.id === 'openrouter') return `${provider.origin}/api`;
  if (provider.id === 'local') return baseUrl ?? '';
  return provider.origin;
}
/**
 * The consumer chat apps the subscription-only path can open (docs/product/YOUR_AI_V1.md §1). Fixed addresses with
 * nothing appended: personal data never goes into a URL.
 */
export const SUBSCRIPTION_APPS = [
  {id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/'},
  {id: 'claude', name: 'Claude', url: 'https://claude.ai/new'},
  {id: 'grok', name: 'Grok', url: 'https://grok.com/'},
  {id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app'},
] as const;
export type SubscriptionAppId = typeof SUBSCRIPTION_APPS[number]['id'];
export const isSubscriptionAppId = (value: unknown): value is SubscriptionAppId => SUBSCRIPTION_APPS.some(app => app.id === value);

/**
 * A local server address the content security policy allows: plain http on localhost or 127.0.0.1, any port, an
 * optional path prefix, no credentials, query or fragment. Returned without a trailing slash. Throws in plain words.
 */
export function normalizeLocalBaseUrl(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw Error('Enter the server address, for example http://localhost:11434.'); }
  if (url.protocol !== 'http:') throw Error('Local servers are reached over plain http on this computer (http://localhost:… or http://127.0.0.1:…).');
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw Error('Only a server on this computer can be used: localhost or 127.0.0.1. A phone cannot reach a computer\'s localhost; use a cloud provider there.');
  if (url.username || url.password || url.search || url.hash) throw Error('Leave out credentials, a query and a fragment: just the address and port.');
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
/** The default addresses the setup offers, by server (docs/product/YOUR_AI_V1.md §3). */
export const LOCAL_SERVER_DEFAULTS = {ollama: 'http://127.0.0.1:11434', 'openai-compatible': 'http://localhost:1234'} as const;
