import {describe, expect, it} from 'vitest';
import {PROVIDER_APPS, SUBSCRIPTION_APPS} from './apps';
import {PROVIDERS} from './providers';

describe('the app table (follow-up part A)', () => {
  it('is the one source of the providers\' own apps and of the subscription apps', () => {
    for (const provider of Object.values(PROVIDERS)) expect(provider.app).toBe(PROVIDER_APPS[provider.id]);
    expect(SUBSCRIPTION_APPS.map(a => a.id)).toEqual(['chatgpt', 'claude', 'grok', 'gemini']);
  });
  it('holds fixed https addresses with nothing appended', () => {
    for (const app of [...Object.values(PROVIDER_APPS).filter((a): a is NonNullable<typeof a> => !!a), ...SUBSCRIPTION_APPS]) {
      const url = new URL(app.url);
      expect(url.protocol).toBe('https:'); expect(url.search).toBe(''); expect(url.hash).toBe('');
    }
  });
});
