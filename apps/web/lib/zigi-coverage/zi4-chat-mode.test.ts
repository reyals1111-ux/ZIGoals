import {describe, expect, it} from 'vitest';
import {chatMode} from '../../components/ai/chat-mode';
import {defaultAiSettings} from '../ai/settings';

// Session AK F0 (ADR-034 ZI4, Grok's N-067 / N-022; the "no dedicated test" row): a consumer subscription (the copy path)
// is no AI connection, so the device's own answers, cards and examples stay and the copy path is offered above them.
const base = defaultAiSettings();
describe('ZI4: how the chat answers', () => {
  it('a subscription is the copy path AND keeps the device answers (local only), never "connected"', () => {
    expect(chatMode(false, {...base, enabled: true, mode: 'subscription', provider: null, model: null})).toEqual({connected: false, bridge: true, localOnly: true});
    // Even with a provider and model left over from an earlier setup, a subscription never counts as connected.
    expect(chatMode(false, {...base, enabled: true, mode: 'subscription', provider: 'openai', model: 'gpt-x'})).toEqual({connected: false, bridge: true, localOnly: true});
  });
  it('an API or local model with a model chosen is connected (no device-only answers, no bridge)', () => {
    expect(chatMode(false, {...base, enabled: true, mode: 'api', provider: 'openai', model: 'gpt-x'})).toEqual({connected: true, bridge: false, localOnly: false});
    expect(chatMode(false, {...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat'})).toEqual({connected: true, bridge: false, localOnly: false});
  });
  it('nothing set up, switched off, or a provider without a model: answers on this device', () => {
    expect(chatMode(false, base)).toEqual({connected: false, bridge: false, localOnly: true});
    expect(chatMode(false, {...base, enabled: false, mode: 'api', provider: 'openai', model: 'gpt-x'})).toEqual({connected: false, bridge: false, localOnly: true});
    expect(chatMode(false, {...base, enabled: true, mode: 'api', provider: 'openai', model: null})).toEqual({connected: false, bridge: false, localOnly: true});
    expect(chatMode(false, {...base, enabled: false, mode: 'subscription', provider: null, model: null})).toEqual({connected: false, bridge: false, localOnly: true});
  });
  it('ZIGoals hosted stands in for the person\'s AI: connected, never the bridge', () => {
    expect(chatMode(true, base)).toEqual({connected: true, bridge: false, localOnly: false});
    expect(chatMode(true, {...base, enabled: true, mode: 'subscription', provider: null, model: null})).toEqual({connected: true, bridge: false, localOnly: false});
  });
});
