/**
 * The chat apps ZIGi can point at (ADR-012, docs/product/YOUR_AI_V1.md §1): each provider's own consumer app for the
 * launcher's "Open <app>" pill, and the four consumer subscriptions the bridge covers. Fixed addresses with nothing
 * appended: personal data never goes into a URL. This file is tiny on purpose: the launcher shell ships it on every
 * app page, so the provider registry (providers.ts) imports it rather than the other way round.
 */
export type ChatApp = {name: string; url: string};
export const PROVIDER_APPS: Record<'openai' | 'anthropic' | 'gemini' | 'xai' | 'openrouter' | 'local', ChatApp | null> = {
  openai: {name: 'ChatGPT', url: 'https://chatgpt.com/'},
  anthropic: {name: 'Claude', url: 'https://claude.ai/new'},
  gemini: {name: 'Gemini', url: 'https://gemini.google.com/app'},
  xai: {name: 'Grok', url: 'https://grok.com/'},
  openrouter: {name: 'OpenRouter', url: 'https://openrouter.ai/chat'},
  local: null,
};
export const SUBSCRIPTION_APPS = [
  {id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com/'},
  {id: 'claude', name: 'Claude', url: 'https://claude.ai/new'},
  {id: 'grok', name: 'Grok', url: 'https://grok.com/'},
  {id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com/app'},
] as const;
export type SubscriptionAppId = typeof SUBSCRIPTION_APPS[number]['id'];
export const isSubscriptionAppId = (value: unknown): value is SubscriptionAppId => SUBSCRIPTION_APPS.some(app => app.id === value);
export const subscriptionApp = (id: SubscriptionAppId | string | null | undefined): ChatApp | null => SUBSCRIPTION_APPS.find(app => app.id === id) ?? null;
/** The app the launcher's pill opens for a saved record, or null: the subscription's app, else the connected provider's. */
export function launcherApp(record: {mode: string | null; provider: string | null; subscriptionApp: string | null; enabled: boolean}): ChatApp | null {
  if (record.mode === 'subscription') return subscriptionApp(record.subscriptionApp);
  return record.enabled && record.provider && record.provider in PROVIDER_APPS ? PROVIDER_APPS[record.provider as keyof typeof PROVIDER_APPS] : null;
}
