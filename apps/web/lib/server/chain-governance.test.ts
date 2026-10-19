import {toBech32} from '@cosmjs/encoding';
import {afterEach, describe, expect, it, vi} from 'vitest';
import recorded from '../../tests/fixtures/chain/governance-lcd-2026-10-19.json' with {type: 'json'};
import {proposalsWireSchema, voteWireSchema} from '../governance/wire';
import {chainRelay} from './chain-relay';
import {plainText, proposalsTtl, readProposal, readProposals, readVote, unavailableProposals, unavailableVote} from './chain-governance';

// Session AF chunk 3 (lane L2a; ADR-028 H16, H58): the governance reads behind /api/chain/proposals, /proposal and /vote,
// against the LCD's own answers recorded on 2026-10-19 (tests/fixtures/chain/governance-lcd-2026-10-19.json). The voting
// proposal and the found vote are fictional, in the chain's shape (none was open at the read).
const VOTER = toBech32('zig', new Uint8Array(20).fill(9));
const HEIGHT = '8290600';
type Over = {voting?: boolean; height?: (path: string) => string; vote?: 'none' | 'yes' | 'other-voter'; chainId?: string};
const votingProposal = () => ({...recorded.testnet.proposals.proposals[0]!, id: '122', status: 'PROPOSAL_STATUS_VOTING_PERIOD', title: 'Fictional: raise the active set to 15', final_tally_result: {yes_count: '0', abstain_count: '0', no_count: '0', no_with_veto_count: '0'}, voting_end_time: '2026-10-19T00:25:00Z', messages: [{'@type': '/cosmos.staking.v1beta1.MsgUpdateParams', authority: 'zig10d07y265gmmuvt4z0w9aw880jnsr700jmgkh5m'}]});
function lcd(network: 'testnet' | 'mainnet' = 'testnet', over: Over = {}) {
  const host = network === 'mainnet' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com';
  const chainId = over.chainId ?? (network === 'mainnet' ? 'zigchain-1' : 'zig-test-2');
  const urls: string[] = [];
  const fetcher = (async (input: string, init?: RequestInit) => {
    urls.push(input);
    const url = new URL(input), path = url.pathname;
    expect(url.origin).toBe(host);
    expect(init?.method).toBe('GET');
    expect(init?.credentials).toBe('omit');
    if (!path.endsWith('/blocks/latest')) expect(new Headers(init?.headers).get('x-cosmos-block-height')).toBe(HEIGHT);
    const headers = {'x-cosmos-block-height': over.height?.(path) ?? HEIGHT};
    const r = recorded[network];
    if (path.endsWith('/blocks/latest')) return Response.json({block: {header: {height: HEIGHT, chain_id: chainId, time: '2026-10-19T00:15:28.123456789Z'}}}, {headers});
    if (path === '/cosmos/gov/v1/proposals') {
      expect(url.searchParams.get('pagination.reverse')).toBe('true'); expect(url.searchParams.get('pagination.limit')).toBe('20');
      return Response.json(over.voting ? {...r.proposals, proposals: [votingProposal(), ...r.proposals.proposals]} : r.proposals, {headers});
    }
    if (path === '/cosmos/gov/v1/params/tallying') return Response.json(r.paramsTallying, {headers});
    if (path === '/cosmos/staking/v1beta1/pool') return Response.json({pool: {not_bonded_tokens: '1', bonded_tokens: '1000000000000000000000000'}}, {headers});
    if (path === '/cosmos/gov/v1/proposals/122/tally') return Response.json({tally: {yes_count: '300000000000000000000000', abstain_count: '10000000000000000000000', no_count: '50000000000000000000000', no_with_veto_count: '0'}}, {headers});
    if (path === '/cosmos/gov/v1/proposals/43') return Response.json(recorded.mainnet.proposal43, {headers});
    if (path === '/cosmos/gov/v1/proposals/121') return Response.json(recorded.testnet.proposal121, {headers});
    if (path === '/cosmos/gov/v1/proposals/999999') return Response.json(recorded.mainnet.proposalNotFound.body, {status: 404, headers});
    if (path.startsWith('/cosmos/gov/v1/proposals/') && path.includes('/votes/')) {
      if (over.vote === 'yes' || over.vote === 'other-voter') return Response.json({vote: {proposal_id: '122', voter: over.vote === 'yes' ? VOTER : toBech32('zig', new Uint8Array(20).fill(8)), options: [{option: 'VOTE_OPTION_YES', weight: '1.000000000000000000'}], metadata: ''}}, {headers});
      return Response.json(recorded.mainnet.vote43NotFound.body, {status: 400, headers});
    }
    throw Error('unexpected ' + path);
  }) as unknown as typeof fetch;
  return {urls, fetcher};
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('readProposals', () => {
  it('the recorded mainnet proposals, in plain fields, read at one height from api.zigchain.com only', async () => {
    const {urls, fetcher} = lcd('mainnet');
    const wire = await readProposals('zigchain-1', fetcher);
    expect(proposalsWireSchema.parse(wire)).toEqual(wire);
    expect(wire).toMatchObject({version: 1, status: 'ok', network: 'zigchain-1', source: 'https://api.zigchain.com', height: HEIGHT, observedAt: '2026-10-19T00:15:28.123Z', bondedTotal: '1000000000000000000000000'});
    expect(wire.params).toEqual({votingPeriodSeconds: 345600, expeditedVotingPeriodSeconds: 86400, depositPeriodSeconds: 1209600, minDeposit: '10000000000000000000000', expeditedMinDeposit: '5000000000000000000000000', quorum: '0.334', threshold: '0.51', vetoThreshold: '0.334', expeditedThreshold: '0.667', burnVoteVeto: true});
    expect(wire.proposals.map(p => [p.id, p.state, p.tallyKind])).toEqual([['43', 'passed', 'final'], ['42', 'passed', 'final'], ['41', 'passed', 'final'], ['40', 'passed', 'final'], ['39', 'rejected', 'final']]);
    expect(wire.proposals[0]).toMatchObject({title: 'Memesdotfun Whitelist address for Wasm uploads', messageTypes: ['/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses'], totalDeposit: '10000000000000000000000', votingEndTime: '2026-10-06T13:52:34.396Z', tally: {yes: '332734190843669966300468389', no: '0', abstain: '0', noWithVeto: '0'}});
    expect(wire.proposals[4]!.failedReason).toBe('proposal did not get enough votes to pass');
    // Ended proposals need no tally read: four reads (block, list, params, pool), every one at the same block.
    expect(urls.map(u => new URL(u).pathname)).toEqual(['/cosmos/base/tendermint/v1beta1/blocks/latest', '/cosmos/gov/v1/proposals', '/cosmos/gov/v1/params/tallying', '/cosmos/staking/v1beta1/pool']);
    expect(urls.every(u => u.startsWith('https://api.zigchain.com/cosmos/'))).toBe(true);
    expect(proposalsTtl(wire)).toBe(120_000);
  });
  it('a proposal in its voting period carries the live tally at the same height, and is kept 30 seconds', async () => {
    const {urls, fetcher} = lcd('testnet', {voting: true});
    const wire = await readProposals('zig-test-2', fetcher);
    expect(wire.params?.votingPeriodSeconds).toBe(600);
    expect(wire.params?.minDeposit).toBe('100000000000000000000');
    expect(wire.proposals[0]).toMatchObject({id: '122', state: 'voting', tallyKind: 'live', tally: {yes: '300000000000000000000000', no: '50000000000000000000000', abstain: '10000000000000000000000', noWithVeto: '0'}});
    expect(wire.proposals[3]).toMatchObject({id: '119', state: 'rejected', messageTypes: [], title: 'Test Proposal'});
    expect(urls.filter(u => u.endsWith('/tally'))).toHaveLength(1);
    expect(proposalsTtl(wire)).toBe(30_000);
  });
  it('fails closed on another network, another block, a refused answer or an unknown network', async () => {
    await expect(readProposals('zig-test-2', lcd('testnet', {chainId: 'zigchain-1'}).fetcher)).rejects.toThrow('another network');
    await expect(readProposals('zig-test-2', lcd('testnet', {height: p => p.endsWith('/pool') ? '8290601' : HEIGHT}).fetcher)).rejects.toThrow('different block');
    await expect(readProposals('zig-test-2', (async () => new Response('', {status: 503})) as unknown as typeof fetch)).rejects.toThrow('did not answer');
    await expect(readProposals('staging' as 'zig-test-2', lcd().fetcher)).rejects.toThrow('Unsupported');
  });
  it('the proposer\'s text stays plain text: no control or direction-override characters, capped', () => {
    expect(plainText('Fair‮evil\u0007 title\r\nline', 300)).toBe('Fairevil title\nline');
    expect(plainText('x'.repeat(400), 300)).toHaveLength(300);
    expect(plainText(42, 300)).toBe('');
  });
});
describe('readProposal and readVote', () => {
  it('one proposal by number; an unknown number is an empty list, not an error', async () => {
    const one = await readProposal('zigchain-1', '43', lcd('mainnet').fetcher);
    expect(one.proposals.map(p => p.id)).toEqual(['43']);
    expect((await readProposal('zigchain-1', '999999', lcd('mainnet').fetcher)).proposals).toEqual([]);
    await expect(readProposal('zigchain-1', '01', lcd('mainnet').fetcher)).rejects.toThrow('Unsupported');
  });
  it('the person\'s vote: none (the chain\'s own "not found"), or the options; another voter\'s answer is refused', async () => {
    const none = await readVote('zig-test-2', '122', VOTER, lcd().fetcher);
    expect(voteWireSchema.parse(none)).toMatchObject({status: 'ok', proposalId: '122', vote: null, height: HEIGHT});
    const yes = await readVote('zig-test-2', '122', VOTER, lcd('testnet', {vote: 'yes'}).fetcher);
    expect(yes.vote).toEqual({options: [{option: 'yes', weight: '1.000000000000000000'}]});
    await expect(readVote('zig-test-2', '122', VOTER, lcd('testnet', {vote: 'other-voter'}).fetcher)).rejects.toThrow('another vote');
    await expect(readVote('zig-test-2', '122', 'cosmos1abc', lcd().fetcher)).rejects.toThrow('Unsupported');
  });
  it('the unavailable answers are the wire shapes with a reason', () => {
    expect(proposalsWireSchema.parse(unavailableProposals('zigchain-1'))).toMatchObject({status: 'unavailable', proposals: [], source: 'https://api.zigchain.com'});
    expect(voteWireSchema.parse(unavailableVote('zig-test-2', '5'))).toMatchObject({status: 'unavailable', vote: null, proposalId: '5'});
  });
});
describe('the relay keeps each answer for its own time', () => {
  it('ttl from the answer: 30 s while voting, otherwise 2 minutes', async () => {
    let t = 1_000_000, reads = 0, voting = true;
    const relay = chainRelay<{voting: boolean}>({now: () => t, read: async () => { reads++; return {voting}; }, ttl: v => v.voting ? 30_000 : 120_000});
    await relay('k', 'a'); t += 29_999; await relay('k', 'a'); expect(reads).toBe(1);
    t += 1; voting = false; await relay('k', 'a'); expect(reads).toBe(2);
    t += 119_999; await relay('k', 'a'); expect(reads).toBe(2);
    t += 1; await relay('k', 'a'); expect(reads).toBe(3);
  });
});
describe('the routes', () => {
  it('GET /api/chain/proposals: strict query; upstream failure 200 unavailable; no-store', async () => {
    const {GET} = await import('../../app/api/chain/proposals/route');
    for (const bad of ['', '?network=zigchain-2', '?network=zig-test-2&network=zigchain-1', '?network=zig-test-2&voter=' + VOTER, '?net=zig-test-2'])
      expect((await GET(new Request(`http://localhost/api/chain/proposals${bad}`))).status, bad).toBe(400);
    vi.stubGlobal('fetch', async () => { throw Error('offline'); });
    const down = await GET(new Request('http://localhost/api/chain/proposals?network=zigchain-1'));
    expect(down.status).toBe(200); expect(down.headers.get('cache-control')).toBe('no-store');
    expect(await down.json()).toMatchObject({version: 1, status: 'unavailable', network: 'zigchain-1', proposals: []});
    vi.stubGlobal('fetch', lcd().fetcher);
    const up = await GET(new Request('http://localhost/api/chain/proposals?network=zig-test-2', {headers: {'cf-connecting-ip': '203.0.113.9'}}));
    expect(proposalsWireSchema.parse(await up.json()).proposals.length).toBe(5);
  });
  it('GET /api/chain/proposal and /api/chain/vote: strict queries (the voter a public zig1 address); failures 200 unavailable', async () => {
    const proposal = (await import('../../app/api/chain/proposal/route')).GET, vote = (await import('../../app/api/chain/vote/route')).GET;
    for (const bad of ['?network=zig-test-2', '?network=zig-test-2&id=0', '?network=zig-test-2&id=1&id=2', '?network=zig-test-2&id=1&x=1', '?network=zig-test-3&id=1'])
      expect((await proposal(new Request(`http://localhost/api/chain/proposal${bad}`))).status, bad).toBe(400);
    for (const bad of ['?network=zig-test-2&proposal=1', `?network=zig-test-2&proposal=1&voter=${VOTER.toUpperCase()}`, `?network=zig-test-2&proposal=x&voter=${VOTER}`, `?network=zig-test-2&proposal=1&voter=${VOTER}&voter=${VOTER}`, `?network=zig-test-2&proposal=1&voter=${VOTER}&minHeight=1`, `?network=zig-test-2&proposal=1&voter=${toBech32('zigvaloper', new Uint8Array(20).fill(9))}`])
      expect((await vote(new Request(`http://localhost/api/chain/vote${bad}`))).status, bad).toBe(400);
    vi.stubGlobal('fetch', async () => { throw Error('offline'); });
    expect(await (await proposal(new Request('http://localhost/api/chain/proposal?network=zigchain-1&id=43'))).json()).toMatchObject({status: 'unavailable'});
    const down = await vote(new Request(`http://localhost/api/chain/vote?network=zig-test-2&proposal=122&voter=${VOTER}`));
    expect(down.status).toBe(200);
    expect(await down.json()).toMatchObject({status: 'unavailable', vote: null, proposalId: '122'});
  });
  it('the route files log nothing and reach no host but through the LCD reader', async () => {
    const {readFileSync} = await import('node:fs'), {join} = await import('node:path');
    for (const file of ['app/api/chain/proposals/route.ts', 'app/api/chain/proposal/route.ts', 'app/api/chain/vote/route.ts', 'lib/server/chain-governance.ts', 'lib/server/chain-lcd.ts']) {
      const text = readFileSync(join(__dirname, '..', '..', file), 'utf8');
      expect(text, file).not.toMatch(/console\.|https?:\/\/(?!api\.zigchain\.com|testnet-api\.zigchain\.com)[a-z]/);
    }
  });
});
