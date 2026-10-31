import {toBech32} from '@cosmjs/encoding';

/**
 * Session AK (F4) test fixtures: LCD answers in the shapes ZIGChain's two live networks gave on 31 Oct 2026 —
 * zigchain-1 on v5.1.2 and zig-test-2 on v6.0.0 (both Cosmos SDK 0.53.8, ibc-go v10 denoms API; v6 adds the fee market's
 * base fee) — with fictional addresses and amounts. Captured field sets: docs/research/session-ak/ZIGCHAIN_ECOSYSTEM.md.
 */
const bytes = (seed: number) => Uint8Array.from({length: 20}, (_, i) => (seed * 31 + i * 7) & 0xff);
export const DELEGATOR = toBech32('zig', bytes(1));
export const VAL_A = toBech32('zigvaloper', bytes(2));
export const VAL_B = toBech32('zigvaloper', bytes(3));
export type Shape = 'v5.1' | 'v6.0';
export const NETWORK: Record<Shape, {chainId: 'zigchain-1' | 'zig-test-2'; rest: string; version: string; mode: 'MAINNET_READ_ONLY' | 'TESTNET_READ_ONLY'}> = {
  'v5.1': {chainId: 'zigchain-1', rest: 'https://api.zigchain.com', version: 'v5.1.2', mode: 'MAINNET_READ_ONLY'},
  'v6.0': {chainId: 'zig-test-2', rest: 'https://testnet-api.zigchain.com', version: 'v6.0.0', mode: 'TESTNET_READ_ONLY'},
};
export const HEIGHT = '13400000', BLOCK_TIME = '2026-10-31T21:00:00.123456789Z';
const ZIG = (n: string) => n + '0'.repeat(18);
const validatorRow = (operator: string, moniker: string, tokens: string) => ({
  operator_address: operator, consensus_pubkey: {'@type': '/cosmos.crypto.ed25519.PubKey', key: 'q83vEjRWeJAbHjJDRWeJq83vEjRWeJAbHjJDRWeJq80='},
  jailed: false, status: 'BOND_STATUS_BONDED', tokens, delegator_shares: tokens + '.000000000000000000',
  description: {moniker, identity: '', website: '', security_contact: '', details: ''},
  unbonding_height: '0', unbonding_time: '1970-01-01T00:00:00Z',
  commission: {commission_rates: {rate: '0.050000000000000000', max_rate: '0.200000000000000000', max_change_rate: '0.010000000000000000'}, update_time: '2025-09-17T16:00:38.206163930Z'},
  min_self_delegation: '1', unbonding_on_hold_ref_count: '0', unbonding_ids: [],
});
/** The answers readNativePositions asks for, keyed by path (without the query for paginated reads). */
export function lcdAnswers(shape: Shape): Record<string, unknown> {
  const n = NETWORK[shape];
  const stzig = shape === 'v5.1' ? 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig' : 'coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig';
  return {
    '/cosmos/base/tendermint/v1beta1/blocks/latest': {block_id: {}, block: {header: {version: {block: '11'}, chain_id: n.chainId, height: HEIGHT, time: BLOCK_TIME}}},
    '/cosmos/base/tendermint/v1beta1/node_info': {default_node_info: {network: n.chainId, version: '0.38.19'}, application_version: {name: 'zigchain', app_name: 'zigchaind', version: n.version, cosmos_sdk_version: 'v0.53.8'}},
    '/cosmos/staking/v1beta1/params': {params: {unbonding_time: '1814400s', max_validators: 14, max_entries: 7, historical_entries: 10000, bond_denom: 'azig', min_commission_rate: '0.000000000000000000'}},
    '/cosmos/bank/v1beta1/denoms_metadata/azig': {metadata: {description: 'The native staking and gas token of ZIGChain (18-decimal base denom azig).', denom_units: [{denom: 'azig', exponent: 0, aliases: []}, {denom: 'zig', exponent: 18, aliases: []}], base: 'azig', display: 'zig', name: 'ZIG', symbol: 'ZIG', uri: '', uri_hash: ''}},
    [`/cosmos/bank/v1beta1/balances/${DELEGATOR}/by_denom?denom=azig`]: {balance: {denom: 'azig', amount: ZIG('12')}},
    [`/cosmos/bank/v1beta1/balances/${DELEGATOR}/by_denom?denom=${encodeURIComponent(stzig)}`]: {balance: {denom: stzig, amount: '0'}},
    [`/cosmos/staking/v1beta1/delegations/${DELEGATOR}`]: {delegation_responses: [{delegation: {delegator_address: DELEGATOR, validator_address: VAL_A, shares: ZIG('100') + '.000000000000000000'}, balance: {denom: 'azig', amount: ZIG('100')}}], pagination: {next_key: null, total: '0'}},
    [`/cosmos/staking/v1beta1/delegators/${DELEGATOR}/unbonding_delegations`]: {unbonding_responses: [
      {delegator_address: DELEGATOR, validator_address: VAL_A, entries: [
        {creation_height: '13300000', completion_time: '2026-11-11T09:26:34.722349467Z', initial_balance: ZIG('30'), balance: ZIG('30'), unbonding_id: '2740', unbonding_on_hold_ref_count: '0'},
        {creation_height: '13350000', completion_time: '2026-11-11T18:00:00.000000001Z', initial_balance: ZIG('5'), balance: ZIG('5'), unbonding_id: '2741', unbonding_on_hold_ref_count: '0'},
      ]},
      {delegator_address: DELEGATOR, validator_address: VAL_B, entries: [{creation_height: '13390000', completion_time: '2026-11-20T07:00:00Z', initial_balance: ZIG('7'), balance: ZIG('7'), unbonding_id: '2790', unbonding_on_hold_ref_count: '0'}]},
    ], pagination: {next_key: null, total: '0'}},
    [`/cosmos/distribution/v1beta1/delegators/${DELEGATOR}/rewards`]: {rewards: [
      {validator_address: VAL_A, reward: [{denom: 'azig', amount: '1500000000000000000.987654321000000000'}]},
      {validator_address: VAL_B, reward: [{denom: 'azig', amount: '250000000000000000.5'}]},
    ], total: [{denom: 'azig', amount: '1750000000000000001.487654321000000000'}]},
    '/cosmos/staking/v1beta1/validators': {validators: [validatorRow(VAL_A, 'Fictional Alpha', ZIG('600000')), validatorRow(VAL_B, 'Fictional Beta', ZIG('400000'))], pagination: {next_key: null, total: '0'}},
    // v6 only: the fee market; v5.1 answers "Not Implemented" (code 12).
    '/cosmos/evm/feemarket/v1/base_fee': shape === 'v6.0' ? {base_fee: '2500000000.000000000000000000'} : {code: 12, message: 'Not Implemented', details: []},
  };
}
/** A fetch that answers from `lcdAnswers`, pinned to HEIGHT like the official LCD. */
export function lcdFetch(shape: Shape, extra: Record<string, unknown> = {}): typeof fetch {
  const answers = {...lcdAnswers(shape), ...extra}, rest = NETWORK[shape].rest;
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.startsWith(rest)) return new Response('{}', {status: 403});
    const full = url.slice(rest.length), path = full.replace(/\?pagination\.limit=100.*$/, '');
    const body = Object.hasOwn(answers, full) ? answers[full] : Object.hasOwn(answers, path) ? answers[path] : undefined;
    if (body === undefined) return new Response(JSON.stringify({code: 5, message: 'not found', details: []}), {status: 404});
    const code = (body as {code?: unknown}).code;
    return new Response(JSON.stringify(body), {status: code === 12 ? 501 : 200, headers: {'x-cosmos-block-height': HEIGHT, 'content-type': 'application/json'}});
  }) as typeof fetch;
}
