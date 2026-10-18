import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {VERIFIED_URLS} from '@zigoals/ecosystem-registry/verified-links';
import {BUY_ASSETS, NETWORKS, providerCodes, watchedAssetId} from './assets';
import {NEXT_STEPS} from './next-steps';
import {OFFERED_RAMP_CODES} from './ramp-assets';
import {L2B_URLS, L2B_LINKS} from '../wallets/links';
import {chainById} from '../wallets/balances/chains';

// Session AF (L2b, Part 4, ADR-028 H83; A2.1, A2.8, A2.9): the asset × network × provider table.
const WEB = join(__dirname, '..', '..');
const sources = (dir: string): string[] => readdirSync(join(WEB, dir)).flatMap(name => {
  const path = `${dir}/${name}`;
  return statSync(join(WEB, path)).isDirectory() ? sources(path) : /\.(ts|tsx)$/.test(name) && !/\.test\.|\.spec\./.test(name) ? [path] : [];
});

describe('the table', () => {
  test('USDC, USDT, ETH, SOL, BTC, ATOM and ZIG via ATOM, each on its own networks, the recommended one among them', () => {
    expect(BUY_ASSETS.map(a => [a.id, a.symbol, a.offers.map(o => o.network), a.recommended])).toEqual([
      ['usdc', 'USDC', ['base', 'ethereum', 'arbitrum', 'optimism', 'polygon', 'solana'], 'base'],
      ['usdt', 'USDT', ['solana', 'ethereum'], 'solana'],
      ['eth', 'ETH', ['base', 'ethereum', 'arbitrum', 'optimism'], 'base'],
      ['sol', 'SOL', ['solana'], 'solana'],
      ['btc', 'BTC', ['bitcoin'], 'bitcoin'],
      ['atom', 'ATOM', ['cosmos-hub'], 'cosmos-hub'],
      ['zig-via-atom', 'ATOM', ['cosmos-hub'], 'cosmos-hub'],
    ]);
    for (const a of BUY_ASSETS) {
      expect(a.plain.length, a.id).toBeLessThan(80); expect(a.more.length, a.id).toBeGreaterThan(60); expect(a.recommendation, a.id).toMatch(/\w/);
      // A recommendation states no fee number ZIGoals did not read (H35).
      expect(a.recommendation, a.id).not.toMatch(/\d\s*(%|€|\$|USD|EUR|cents?)/);
    }
    expect(BUY_ASSETS.find(a => a.id === 'usdc')!.plain).toBe('USDC: a digital dollar, stays about 1 USD.');
  });
  test('every purchase can be watched arriving: each network is a tracked chain, and the asset one of its tracked assets', () => {
    for (const a of BUY_ASSETS) for (const o of a.offers) {
      const chain = chainById(NETWORKS[o.network].chainId);
      expect(chain, `${a.id} ${o.network}`).toBeDefined();
      expect(watchedAssetId(a, o.network), `${a.id} ${o.network}`).not.toBeNull();
    }
    expect(watchedAssetId(BUY_ASSETS.find(a => a.id === 'usdc')!, 'base')).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
    expect(watchedAssetId(BUY_ASSETS.find(a => a.id === 'zig-via-atom')!, 'cosmos-hub')).toBe('uatom');
  });
  test('every provider code has a status and a source; nothing is marked confirmed before a checkout has shown it', () => {
    const codes = providerCodes();
    expect(codes.length).toBe(16 + 2 * 16);
    for (const c of codes) { expect(['documented', 'inferred'], `${c.provider} ${c.asset} ${c.network}`).toContain(c.code.status); expect(c.code.source).toMatch(/read 2026-10-18/); }
    expect(codes.filter(c => c.provider === 'ramp').map(c => `${c.code.value}:${c.code.status}`)).toEqual(expect.arrayContaining(['BASE_USDC:documented', 'ETH_ETH:documented', 'BTC_BTC:documented', 'COSMOS_ATOM:inferred', 'MATIC_USDC:inferred', 'SOLANA_USDT:inferred']));
    expect(codes.filter(c => c.provider === 'banxa' && c.field === 'blockchain').map(c => `${c.asset}@${c.code.value}`)).toEqual(['usdc@BASE', 'usdc@ETH', 'usdc@ARB', 'usdc@OPTIMISM', 'usdc@MATIC', 'usdc@SOL', 'usdt@SOL', 'usdt@ETH', 'eth@BASE', 'eth@ETH', 'eth@ARB', 'eth@OPTIMISM', 'sol@SOL', 'btc@BTC', 'atom@ATOM', 'zig-via-atom@ATOM']);
    expect([...OFFERED_RAMP_CODES].sort()).toEqual(['ARBITRUM_ETH', 'ARBITRUM_USDC', 'BASE_ETH', 'BASE_USDC', 'BTC_BTC', 'COSMOS_ATOM', 'ETH_ETH', 'ETH_USDC', 'ETH_USDT', 'MATIC_USDC', 'OPTIMISM_ETH', 'OPTIMISM_USDC', 'SOLANA_SOL', 'SOLANA_USDC', 'SOLANA_USDT']);
  });
});

describe('A2.9: no ZIGoals address, no payment code, every outgoing link verified', () => {
  const files = [...sources('lib/onramps'), ...sources('components/add-money'), ...sources('app/app/wealth/add-money'), ...sources('app/api/onramps')];
  test('no address literal of any chain exists in the Add money files (ZIGoals has none to send to)', () => {
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const text = readFileSync(join(WEB, f), 'utf8');
      expect(text, f).not.toMatch(/\b0x[0-9a-fA-F]{40}\b|\bzig1[02-9ac-hj-np-z]{38,}|\bcosmos1[02-9ac-hj-np-z]{38,}|\bbc1[02-9ac-hj-np-z]{25,}|\b[13][1-9A-HJ-NP-Za-km-z]{25,34}\b/);
    }
  });
  test('no payment, framing or popup: no iframe, no window.open, no form posting anywhere; the only request is ZIGoals\' own asset route', () => {
    for (const f of files) {
      const text = readFileSync(join(WEB, f), 'utf8');
      expect(text, f).not.toMatch(/<iframe|window\.open|<form|sendBeacon|XMLHttpRequest|WebSocket|eth_sendTransaction|signAndBroadcast|personal_sign/);
      for (const call of text.match(/\bfetch\([^,)]*/g) ?? []) expect(f.startsWith('lib/onramps/server/') || call === 'fetch(`/api/onramps/ramp-assets?currency=${currency}`' || call === 'fetch(input', `${f}: ${call}`).toBe(true);
    }
  });
  test('every literal https address is a verified link, a provider\'s documented API, or a sandbox host used by tests only', () => {
    const prefixes = Object.values(L2B_LINKS).filter(l => 'prefix' in l).map(l => l.url);
    const allowed = new Set(['https://api.rampnetwork.com', 'https://api.rampnetwork.com/api/host-api/v3/assets', 'https://app.demo.rampnetwork.com/']);
    for (const f of files) for (const url of readFileSync(join(WEB, f), 'utf8').match(/https:\/\/[^\s'"`)<>\\$]+/g) ?? []) {
      expect(L2B_URLS.has(url) || VERIFIED_URLS.has(url) || prefixes.some(p => url.startsWith(p)) || allowed.has(url) || /^https:\/\/[a-z0-9-]+\.banxa(-sandbox)?\.com\/?$/.test(url), `${f}: ${url}`).toBe(true);
    }
    // The sandbox host appears in the builder only, behind environment 'sandbox'.
    expect(files.filter(f => readFileSync(join(WEB, f), 'utf8').includes('app.demo.rampnetwork.com'))).toEqual(['lib/onramps/urls.ts']);
  });
  test('"What can I do with it now?": a guide per asset; every link from a verified list or ZIGoals\' own pages; route claims sourced', () => {
    for (const a of BUY_ASSETS) {
      const guides = NEXT_STEPS[a.id];
      expect(guides.length, a.id).toBeGreaterThan(1);
      expect(guides.at(-1)!.id, a.id).toBe('earn');
      for (const link of guides.flatMap(g => g.links)) {
        if (link.source === 'l2b') expect(L2B_LINKS[link.id]).toBeDefined();
        if (link.source === 'app') expect(link.href).toMatch(/^\/app\/[a-z/-]+$/);
      }
    }
    for (const id of ['usdc', 'usdt'] as const) expect(NEXT_STEPS[id][0]!.body).toMatch(/issuer.*depeg.*wrong network/s);
    expect(NEXT_STEPS.atom.find(g => g.id === 'bridge')!.body).toContain('channel-1555');
    expect(NEXT_STEPS.usdc.find(g => g.id === 'bridge')!.body).toMatch(/does not recommend a route.*Noble/s);
  });
});
