import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {chainRelay, CHAIN_CLIENT_READS_PER_MINUTE} from './chain-relay';
import {marketClientGroup} from './market-client-address';

// Session AF Gate C, the security review's S7 (ADR-028 H133; `TIER 3 (egress routes)`): the chain relays count their
// per-client limit by the client's address group (an IPv4 address, an IPv6 /48), as the Earn and Ramp routes do, so one
// network rotating its IPv6 addresses cannot use up the server's reads for everyone.
const WEB = join(__dirname, '..', '..');
const ROUTES = ['app/api/chain/validators/route.ts', 'app/api/chain/proposals/route.ts', 'app/api/chain/proposal/route.ts', 'app/api/chain/vote/route.ts', 'app/api/chain/grants/route.ts', 'app/api/chain/attestations/route.ts', 'app/api/positions/route.ts'];

describe('the chain relays count clients by address group', () => {
  it('every relay route keys its client by marketClientGroup, never the raw connecting address', () => {
    for (const route of ROUTES) {
      const text = readFileSync(join(WEB, route), 'utf8');
      expect(text, route).toMatch(/marketClientGroup\(request\.headers\.get\('cf-connecting-ip'\)\)/);
      expect(text.replace(/marketClientGroup\(request\.headers\.get\('cf-connecting-ip'\)\)/g, ''), route).not.toMatch(/cf-connecting-ip/);
    }
  });
  it('two addresses in one IPv6 /48 share one budget; another /48 has its own', async () => {
    let t = 0, reads = 0;
    const relay = chainRelay({now: () => t, read: async () => { reads++; return 'ok'; }});
    const a = marketClientGroup('2001:db8:1:2::a')!, b = marketClientGroup('2001:db8:1:9::b')!, other = marketClientGroup('2001:db8:2::c')!;
    expect(a).toBe(b);
    for (let i = 0; i < CHAIN_CLIENT_READS_PER_MINUTE; i++) expect(await relay(`key-${i}`, i % 2 ? a : b)).toEqual({value: 'ok'});
    expect(await relay('key-next', a)).toHaveProperty('retryAfter');
    expect(await relay('key-other', other)).toEqual({value: 'ok'});
    expect(reads).toBe(CHAIN_CLIENT_READS_PER_MINUTE + 1);
    t += 61_000;
    expect(await relay('key-later', b)).toEqual({value: 'ok'});
  });
});
