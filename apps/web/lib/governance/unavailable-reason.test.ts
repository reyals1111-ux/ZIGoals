import {afterEach, describe, expect, it, vi} from 'vitest';
import {readProposals} from '../server/chain-governance';
import {GOVERNANCE_REASONS, governanceFailure, governanceReason} from './unavailable-reason';

// Session AL (P-BN-30, BN-073/BN-093): the proposals route names which failure it was; an empty list is no failure.
const HEIGHT = '8290600';
const headers = {'x-cosmos-block-height': HEIGHT};
const latest = (chainId = 'zig-test-2') => Response.json({block: {header: {height: HEIGHT, chain_id: chainId, time: '2026-10-19T00:15:28Z'}}}, {headers});
const caught = async (fetcher: typeof fetch) => { try { await readProposals('zig-test-2', fetcher); return null; } catch (e) { return e; } };

describe('governanceFailure', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  it('unreachable: the network refuses or the endpoint is down', async () => {
    expect(governanceFailure(await caught((async () => { throw new TypeError('fetch failed'); }) as typeof fetch))).toBe('unreachable');
    expect(governanceFailure(await caught((async () => new Response('busy', {status: 503})) as typeof fetch))).toBe('unreachable');
  });
  it('unreadable: an answer in a shape ZIGoals does not read (bad JSON, or a field it expects is missing)', async () => {
    expect(governanceFailure(await caught((async () => new Response('{not json', {headers})) as typeof fetch))).toBe('unreadable');
    expect(governanceFailure(await caught((async () => Response.json({block: {}}, {headers})) as typeof fetch))).toBe('unreadable');
  });
  it('inconsistent: another network or another block', async () => {
    expect(governanceFailure(await caught((async () => latest('zigchain-1')) as typeof fetch))).toBe('inconsistent');
  });
  it('the three sentences differ and fit the wire (300 characters)', () => {
    const all = Object.values(GOVERNANCE_REASONS);
    expect(new Set(all).size).toBe(3);
    for (const r of all) expect(r.length).toBeLessThanOrEqual(300);
    expect(governanceReason(new Error('anything else'))).toBe(GOVERNANCE_REASONS.unreachable);
  });
  it('the route answers 200 "unavailable" with the reason that fits', async () => {
    vi.stubGlobal('fetch', async () => new Response('{oops', {headers}));
    const {GET} = await import('../../app/api/chain/proposals/route');
    const res = await GET(new Request('http://localhost/api/chain/proposals?network=zigchain-1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({status: 'unavailable', reason: GOVERNANCE_REASONS.unreadable, proposals: []});
  });
});
