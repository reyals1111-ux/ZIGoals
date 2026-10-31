import type {AiSettings} from '../../lib/ai/settings';

/**
 * How ZIGi's chat answers (Session AI ZI4, moved here verbatim from ai-chat.tsx in Session AK F0 so it has its own test):
 * `connected` — an AI the browser may call (ZIGoals hosted, or the person's own API or local model with a model chosen);
 * `bridge` — a consumer subscription (the copy path: ZIGoals writes the prompt, the person pastes it); `localOnly` — no
 * AI connection, so ZIGi answers lookups from the records on this device and keeps its cards and examples. A
 * subscription is no AI connection (Grok's N-067, N-022): the device's answers stay, the copy path is offered above them.
 */
export type ChatMode = {connected: boolean; bridge: boolean; localOnly: boolean};
export function chatMode(hosted: boolean, data: Pick<AiSettings, 'enabled' | 'mode' | 'provider' | 'model'>): ChatMode {
  const connected = hosted || (data.enabled && data.mode !== 'subscription' && !!data.provider && !!data.model);
  return {connected, bridge: !hosted && data.enabled && data.mode === 'subscription', localOnly: !connected};
}
