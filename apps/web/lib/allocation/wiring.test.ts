// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {EXCHANGES_KEY} from '../exchanges/record';

// The exchange vault is IndexedDB and signing is Web Crypto: both stand-ins here; the relay call is a stubbed fetch.
vi.mock('../exchanges/vault', () => ({openExchangeKey: vi.fn(async () => ({keyId: 'k', secret: 's'})), sealExchangeKey: vi.fn(), forgetExchangeKey: vi.fn()}));
vi.mock('../exchanges/sign', () => ({signCall: vi.fn(async (exchange: string) => ({exchange}))}));
const {takeAmountParam} = await import('../../components/platform/goal-intelligence');
const {ExchangesPanel} = await import('../../components/exchanges/exchanges-panel');
await import('../../components/wealth/allocation/last-synced');

/**
 * Session AK (lane WW): the wiring of lane W's pieces. "Fill in" from the contribution rhythm reads `amount` once and
 * takes it off the URL (it only fills the form; the person still previews and confirms); a connected exchange shows
 * "Last synced … · Refresh now" and answers the offline queue's `zigoals:exchange-refresh` for that exchange only.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

describe('the contribution amount from the URL', () => {
  test('a whole base-unit amount is read once and removed; other params, the hash and the history state stay', () => {
    window.history.replaceState({kept: 'yes', __NA: true}, '', '/app/goals/tracked/12?view=history&amount=2500000#funding-wealth');
    expect(takeAmountParam()).toBe('2500000');
    expect(window.location.search + window.location.hash).toBe('?view=history#funding-wealth');
    expect(window.history.state).toEqual({kept: 'yes'});
    expect(takeAmountParam()).toBeUndefined();
  });
  test('a malformed amount fills nothing and is still taken off the URL', () => {
    for (const bad of ['0', '012', '-5', '1.5', '1e9', 'abc', '9'.repeat(79)]) {
      window.history.replaceState(null, '', `/app/goals/tracked/12?amount=${encodeURIComponent(bad)}`);
      expect(takeAmountParam(), bad).toBeUndefined();
      expect(window.location.search, bad).toBe('');
    }
    window.history.replaceState(null, '', '/app/goals/tracked/12');
    expect(takeAmountParam()).toBeUndefined();
  });
});

describe('a connected exchange', () => {
  const connected = (at: string) => localStorage.setItem(EXCHANGES_KEY, JSON.stringify({version: 1, connections: {kraken: {connectedAt: at, read: {at, balances: [{asset: 'BTC', amount: '0.5'}]}}}}));
  const stored = () => JSON.parse(localStorage.getItem(EXCHANGES_KEY)!).connections as Record<string, {error?: string; read?: unknown}>;
  const settle = async () => { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };

  test('shows when it was last synced with Refresh now, instead of the bare read time', async () => {
    connected(new Date(Date.now() - 4 * 60_000).toISOString());
    await act(async () => root.render(h(ExchangesPanel, {showcase: false})));
    await settle();
    const article = element.querySelector('article[aria-label="Kraken"]')!;
    expect(article.textContent).toContain('Kraken · read-only');
    expect(article.textContent).not.toMatch(/· read \d/);
    expect(article.querySelector('.last-synced')?.textContent).toMatch(/Refresh (now|in \d+ s)/);
    expect(article.querySelector('button[aria-label="Refresh Kraken now"]')).not.toBeNull();
  });

  test('the offline queue’s refresh event reads that exchange only (a failed read records its error and keeps the last good read)', async () => {
    const relay = vi.fn(async () => { throw Error('The relay could not be reached.'); });
    vi.stubGlobal('fetch', relay);
    connected(new Date(Date.now() - 4 * 60_000).toISOString());
    await act(async () => root.render(h(ExchangesPanel, {showcase: false})));
    await settle();
    await act(async () => { window.dispatchEvent(new CustomEvent('zigoals:exchange-refresh', {detail: 'coinbase'})); });
    await settle();
    expect(stored().kraken!.error).toBeUndefined();
    expect(relay).not.toHaveBeenCalled();
    await act(async () => { window.dispatchEvent(new CustomEvent('zigoals:exchange-refresh', {detail: 'kraken'})); });
    await settle();
    expect(relay).toHaveBeenCalledTimes(1);
    expect(stored().kraken!.error).toBe('The relay could not be reached.');
    expect(stored().kraken!.read).toBeDefined();
  });

  test('the Showcase reads nothing on the event', async () => {
    const relay = vi.fn(async () => { throw Error('no'); });
    vi.stubGlobal('fetch', relay);
    connected(new Date().toISOString());
    await act(async () => root.render(h(ExchangesPanel, {showcase: true})));
    await settle();
    expect(element.textContent).toContain('Exchanges are not connected in the Showcase.');
    await act(async () => { window.dispatchEvent(new CustomEvent('zigoals:exchange-refresh', {detail: 'kraken'})); });
    await settle();
    expect(relay).not.toHaveBeenCalled();
    expect(stored().kraken!.error).toBeUndefined();
  });
});
