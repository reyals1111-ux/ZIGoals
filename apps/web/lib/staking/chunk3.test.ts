import {createHash} from 'node:crypto';
import {toBech32} from '@cosmjs/encoding';
import {afterEach, describe, expect, test, vi} from 'vitest';
import recorded from '../../tests/fixtures/chain/governance-lcd-2026-10-19.json' with {type: 'json'};
import {ATTESTATION_MEMO} from '../app-environment';
import {ATTESTATION_SOURCE, attestationsWireSchema, cleanNote, commitmentMatches, makeAttestation} from './attestation';
import {allowanceWords, grantWords, grantsWireSchema, type Grant} from './grants';
import {STAKING_TYPE_URLS, StakingInputError, assertStakingMessages, attest, liquidSpend, revoke} from './messages';
import {readGrants, unavailableGrants} from '../server/chain-grants';
import {readAttestations, unavailableAttestations} from '../server/chain-attestations';

// Session AF chunk 3 (lane L2a; ADR-028 D4, H45, H48): practice badges (testnet only) and the permissions panel.
const ME = toBech32('zig', new Uint8Array(20).fill(9)), OTHER = toBech32('zig', new Uint8Array(20).fill(7));
afterEach(() => { vi.unstubAllGlobals(); });

describe('practice badges: only a salted code or a random id ever reaches the memo', () => {
  test('a commitment is salted (32 random bytes): never the plain hash of the note, different every time, provable with the salt', async () => {
    const note = 'Fictional: thirty days of walking';
    const a = await makeAttestation('commitment', note), b = await makeAttestation('commitment', note);
    for (const x of [a, b]) { expect(x.memo).toMatch(ATTESTATION_MEMO); expect(x.memo).toMatch(/^zigoals:att:v1:c:[0-9a-f]{64}$/); expect(x.salt).toMatch(/^[0-9a-f]{64}$/); }
    expect(a.memo).not.toBe(b.memo);
    const plain = createHash('sha256').update(note).digest('hex');
    expect(a.memo).not.toContain(plain);
    expect(a.memo.toLowerCase()).not.toContain('walking');
    expect(a.memo.length).toBeLessThanOrEqual(256);
    expect(await commitmentMatches(a.memo, a.salt!, note)).toBe(true);
    expect(await commitmentMatches(a.memo, b.salt!, note)).toBe(false);
    expect(await commitmentMatches(a.memo, a.salt!, 'Fictional: another note')).toBe(false);
    // The commitment is exactly SHA-256 of the domain tag, the salt and the note (reproducible by anyone with both).
    const fixed = await makeAttestation('commitment', note, bytes => bytes.fill(1));
    expect(fixed.memo).toBe(`zigoals:att:v1:c:${createHash('sha256').update(`zigoals-attestation-v1\n${'01'.repeat(32)}\n${note}`).digest('hex')}`);
  });
  test('a badge is 16 random bytes, nothing of the note; notes are one line, 1–120 characters', async () => {
    const badge = await makeAttestation('badge', 'Fictional: first practice stake');
    expect(badge.memo).toMatch(/^zigoals:att:v1:b:[0-9a-f]{32}$/);
    expect(badge.salt).toBeUndefined();
    expect(cleanNote('  two\nlines‮  ')).toBe('two lines');
    expect(() => cleanNote('')).toThrow(); expect(() => cleanNote('x'.repeat(121))).toThrow();
    await expect(makeAttestation('other' as 'badge', 'x')).rejects.toThrow();
  });
  test('the message: 1 azig to the sender itself, alone; it spends 1 azig', () => {
    const m = attest({address: ME});
    expect(m).toEqual({typeUrl: STAKING_TYPE_URLS.attest, value: {fromAddress: ME, toAddress: ME, amount: [{denom: 'azig', amount: '1'}]}});
    expect(Object.isFrozen(m) && Object.isFrozen(m.value) && Object.isFrozen(m.value.amount)).toBe(true);
    expect(liquidSpend([m])).toBe(1n);
    expect(() => assertStakingMessages([m], ME)).not.toThrow();
    expect(() => assertStakingMessages([m], OTHER)).toThrow(StakingInputError);
    expect(() => assertStakingMessages([m, m], ME)).toThrow(StakingInputError);
    expect(() => assertStakingMessages([{...m, value: {...m.value, toAddress: OTHER}}], ME)).toThrow(StakingInputError);
    expect(() => assertStakingMessages([{...m, value: {...m.value, amount: [{denom: 'azig', amount: '2'}]}}], ME)).toThrow(StakingInputError);
    expect(() => attest({address: 'cosmos1abc'})).toThrow(StakingInputError);
  });
});
describe('revoke: the granter is the signer; the grantee and the grant\'s message type as the chain read them', () => {
  test('builds MsgRevoke and refuses anything else', () => {
    const m = revoke({granter: ME, grantee: OTHER, msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate'});
    expect(m).toEqual({typeUrl: '/cosmos.authz.v1beta1.MsgRevoke', value: {granter: ME, grantee: OTHER, msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate'}});
    expect(() => assertStakingMessages([m], ME)).not.toThrow();
    expect(() => assertStakingMessages([m], OTHER)).toThrow(StakingInputError);
    expect(liquidSpend([m])).toBe(0n);
    const contract = toBech32('zig', new Uint8Array(32).fill(4));
    expect(() => revoke({granter: ME, grantee: contract, msgTypeUrl: '/cosmos.bank.v1beta1.MsgSend'})).not.toThrow();
    for (const bad of [{grantee: 'zigvaloper1x', msgTypeUrl: '/x.Msg'}, {grantee: OTHER, msgTypeUrl: 'not a type'}, {grantee: OTHER, msgTypeUrl: '/a b'}]) expect(() => revoke({granter: ME, ...bad})).toThrow(StakingInputError);
  });
});
describe('the permissions panel\'s words', () => {
  const grant = (over: Partial<Grant>): Grant => ({grantee: OTHER, kind: 'generic', authorization: '/cosmos.authz.v1beta1.GenericAuthorization', msgTypeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', limit: null, validators: null, expiration: null, ...over});
  test('who may do what, how much, until when', () => {
    expect(grantWords(grant({}))).toBe(`${OTHER.slice(0, 10)}…${OTHER.slice(-6)} may claim your staking rewards, with no end date.`);
    expect(grantWords(grant({kind: 'send', msgTypeUrl: '/cosmos.bank.v1beta1.MsgSend', limit: '1500000000000000000', expiration: '2027-01-01T00:00:00.000Z'}))).toMatch(/may send tokens from your wallet, up to 1\.5 ZIG more, until 2027-01-01\.$/);
    expect(grantWords(grant({kind: 'stake', msgTypeUrl: '/cosmos.staking.v1beta1.MsgDelegate', limit: '2000000000000000000000', validators: {allow: ['a', 'b'], deny: []}}))).toMatch(/may stake your ZIG, up to 2,000 ZIG, only with 2 chosen validators, with no end date\.$/);
    expect(grantWords(grant({kind: 'other', msgTypeUrl: null}))).toMatch(/may act for you in a way ZIGoals cannot name/);
    expect(allowanceWords({grantee: OTHER, kind: 'basic', allowance: '/cosmos.feegrant.v1beta1.BasicAllowance', limit: null, expiration: null, allowedMessages: []})).toMatch(/may use your ZIG to pay its own network fees, with no limit, with no end date\.$/);
  });
});
describe('readGrants (the official LCD, one height) and readAttestations (Polkachu\'s testnet mirror)', () => {
  const lcd = (granterGrants: unknown[], allowances: unknown[] = [], chainId = 'zigchain-1') => (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    expect(url.origin).toBe(chainId === 'zigchain-1' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com'); expect(init?.method).toBe('GET'); expect(init?.credentials).toBe('omit');
    const headers = {'x-cosmos-block-height': '13050000'};
    if (url.pathname.endsWith('/blocks/latest')) return Response.json({block: {header: {height: '13050000', chain_id: chainId, time: '2026-10-19T00:16:00Z'}}}, {headers});
    if (url.pathname === `/cosmos/authz/v1beta1/grants/granter/${ME}`) return Response.json({grants: granterGrants, pagination: {next_key: null, total: String(granterGrants.length)}}, {headers});
    if (url.pathname === `/cosmos/feegrant/v1beta1/issued/${ME}`) return Response.json({allowances, pagination: {next_key: null}}, {headers});
    throw Error('unexpected ' + url.pathname);
  }) as unknown as typeof fetch;
  test('the recorded grants (as the chain shapes them, granter here this address) in plain fields; the recorded empty answers', async () => {
    const asGranter = recorded.mainnet.grantsGranteeWithGrants.grants.map(g => ({...g, granter: ME, grantee: OTHER}));
    const stake = {granter: ME, grantee: OTHER, authorization: {'@type': '/cosmos.staking.v1beta1.StakeAuthorization', max_tokens: {denom: 'azig', amount: '5'}, allow_list: {address: [toBech32('zigvaloper', new Uint8Array(20).fill(2))]}, authorization_type: 'AUTHORIZATION_TYPE_DELEGATE'}, expiration: '2027-01-01T00:00:00Z'};
    const send = {granter: ME, grantee: OTHER, authorization: {'@type': '/cosmos.bank.v1beta1.SendAuthorization', spend_limit: [{denom: 'azig', amount: '7'}], allow_list: []}, expiration: null};
    const fee = {granter: ME, grantee: OTHER, allowance: {'@type': '/cosmos.feegrant.v1beta1.AllowedMsgAllowance', allowance: {'@type': '/cosmos.feegrant.v1beta1.BasicAllowance', spend_limit: [{denom: 'azig', amount: '9'}], expiration: null}, allowed_messages: ['/cosmos.gov.v1beta1.MsgVote']}};
    const wire = await readGrants('zigchain-1', ME, lcd([...asGranter, stake, send], [fee]));
    expect(grantsWireSchema.parse(wire)).toEqual(wire);
    expect(wire.grants.map(g => [g.kind, g.msgTypeUrl, g.limit])).toEqual([['generic', '/cosmos.bank.v1beta1.MsgSend', null], ['generic', '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward', null], ['generic', '/cosmos.distribution.v1beta1.MsgWithdrawValidatorCommission', null], ['stake', '/cosmos.staking.v1beta1.MsgDelegate', '5'], ['send', '/cosmos.bank.v1beta1.MsgSend', '7']]);
    expect(wire.grants[3]!.validators?.allow).toHaveLength(1);
    expect(wire.allowances).toEqual([{grantee: OTHER, kind: 'allowed-messages', allowance: '/cosmos.feegrant.v1beta1.AllowedMsgAllowance', limit: '9', expiration: null, allowedMessages: ['/cosmos.gov.v1beta1.MsgVote']}]);
    const empty = await readGrants('zigchain-1', ME, lcd(recorded.mainnet.grantsGranterEmpty.grants, recorded.mainnet.feegrantIssuedEmpty.allowances));
    expect(empty).toMatchObject({status: 'ok', grants: [], allowances: [], height: '13050000'});
    await expect(readGrants('zigchain-1', ME, lcd([{...send, granter: OTHER}]))).rejects.toThrow('another address');
    await expect(readGrants('zigchain-1', 'cosmos1x', lcd([]))).rejects.toThrow('Unsupported');
    expect(grantsWireSchema.parse(unavailableGrants('zig-test-2'))).toMatchObject({status: 'unavailable', grants: []});
  });
  test('badges read back: only 1 azig self-sends, alone, succeeded, with the code format; the mirror must be zig-test-2', async () => {
    const memo = `zigoals:att:v1:c:${'ab'.repeat(32)}`;
    const tx = (over: {from?: string; to?: string; amount?: string; memo?: string; code?: number; two?: boolean}) => ({txhash: 'a'.repeat(64), height: '8290700', code: over.code ?? 0, timestamp: '2026-10-19T00:20:00Z', tx: {'@type': '/cosmos.tx.v1beta1.Tx', body: {memo: over.memo ?? memo, messages: [{'@type': '/cosmos.bank.v1beta1.MsgSend', from_address: over.from ?? ME, to_address: over.to ?? ME, amount: [{denom: 'azig', amount: over.amount ?? '1'}]}, ...(over.two ? [{'@type': '/cosmos.bank.v1beta1.MsgSend'}] : [])]}}});
    let network = 'zig-test-2';
    const asked: string[] = [];
    const mirror = (async (input: string, init?: RequestInit) => {
      const url = new URL(input); asked.push(url.pathname + url.search);
      expect(url.origin).toBe(ATTESTATION_SOURCE); expect(init?.method).toBe('GET');
      if (url.pathname.endsWith('/node_info')) return Response.json({default_node_info: {network}, application_version: {version: 'v5.1.0'}});
      expect(url.searchParams.get('query')).toBe(`message.sender='${ME}' AND message.action='/cosmos.bank.v1beta1.MsgSend'`);
      return Response.json({...recorded.testnet.txSearchPolkachuEmpty, tx_responses: [tx({}), tx({to: OTHER}), tx({amount: '2'}), tx({memo: 'Fictional: my goal'}), tx({code: 5}), tx({two: true}), tx({from: OTHER})]});
    }) as unknown as typeof fetch;
    const wire = await readAttestations(ME, mirror);
    expect(attestationsWireSchema.parse(wire)).toEqual(wire);
    expect(wire.items).toEqual([{hash: 'A'.repeat(64), height: '8290700', at: '2026-10-19T00:20:00.000Z', memo}]);
    network = 'zigchain-1';
    await expect(readAttestations(ME, mirror)).rejects.toThrow('another network');
    expect(attestationsWireSchema.parse(unavailableAttestations())).toMatchObject({status: 'unavailable', items: []});
  });
  test('the routes: strict queries; attestations refuse every network but zig-test-2; failures answer 200 unavailable', async () => {
    const grants = (await import('../../app/api/chain/grants/route')).GET, attestations = (await import('../../app/api/chain/attestations/route')).GET;
    for (const bad of [`?network=zigchain-1`, `?network=zigchain-1&address=${ME}&address=${ME}`, `?network=zigchain-9&address=${ME}`, `?network=zigchain-1&address=${ME}&x=1`]) expect((await grants(new Request(`http://localhost/api/chain/grants${bad}`))).status, bad).toBe(400);
    for (const bad of [`?network=zigchain-1&address=${ME}`, `?address=${ME}`, `?network=zig-test-2`, `?network=zig-test-2&address=${ME}&minHeight=1`]) expect((await attestations(new Request(`http://localhost/api/chain/attestations${bad}`))).status, bad).toBe(400);
    vi.stubGlobal('fetch', async () => { throw Error('offline'); });
    expect(await (await grants(new Request(`http://localhost/api/chain/grants?network=zigchain-1&address=${ME}`))).json()).toMatchObject({status: 'unavailable', grants: []});
    const down = await attestations(new Request(`http://localhost/api/chain/attestations?network=zig-test-2&address=${ME}`));
    expect(down.status).toBe(200); expect(down.headers.get('cache-control')).toBe('no-store');
    expect(await down.json()).toMatchObject({status: 'unavailable', items: []});
  });
});
