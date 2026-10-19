import {expect, type Page, type Route} from '@playwright/test';
import {createHash} from 'node:crypto';
import {fromBase64, fromHex, toBase64, toBech32} from '@cosmjs/encoding';
import {BaseAccount} from 'cosmjs-types/cosmos/auth/v1beta1/auth';
import {QueryAccountResponse} from 'cosmjs-types/cosmos/auth/v1beta1/query';
import {QueryBalanceResponse} from 'cosmjs-types/cosmos/bank/v1beta1/query';
import {MsgWithdrawDelegatorReward} from 'cosmjs-types/cosmos/distribution/v1beta1/tx';
import {MsgVote} from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import {MsgRevoke} from 'cosmjs-types/cosmos/authz/v1beta1/tx';
import {MsgSend} from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import {MsgBeginRedelegate, MsgDelegate, MsgUndelegate} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import {SimulateResponse} from 'cosmjs-types/cosmos/tx/v1beta1/service';
import {TxBody, TxRaw} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import recorded from './fixtures/chain/testnet-rpc-sign.json' with {type: 'json'};

/**
 * Session AF (L2a): the staking specs' doubles — never a real wallet, never a real node, never a broadcast.
 * - fakeKeplr: an injected Keplr test double; a Proxy that records EVERY method asked of it (and of the signer it hands
 *   out), so a signer request before the Sign press shows in the list (the pattern of tests/wallet-menu.spec.ts).
 * - fakeChain: the network's RPC (testnet-rpc or rpc.zigchain.com) answered from tests/fixtures/chain/testnet-rpc-sign.json
 *   (recorded 2026-10-18) plus per-test answers for the account, balance, simulation, broadcast and receipt; it records
 *   every JSON-RPC method and every transaction "broadcast" to it (kept in the test, never sent anywhere).
 * - relay: ZIGoals' own /api/positions and /api/chain/validators answered with fixtures; every other /api answers 503.
 */
export const ME = toBech32('zig', new Uint8Array(20).fill(9));
export const V1 = toBech32('zigvaloper', new Uint8Array(20).fill(2)), V2 = toBech32('zigvaloper', new Uint8Array(20).fill(3));
export const ZIG = (n: number | string) => (BigInt(Math.round(Number(n) * 1e6)) * 10n ** 12n).toString();
const PUBKEY = toBase64(new Uint8Array([2, ...new Array(32).fill(7)]));
const CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, GET'};
export const RPC = {practice: 'https://testnet-rpc.zigchain.com', real: 'https://rpc.zigchain.com'} as const;
export const CHAIN = {practice: 'zig-test-2', real: 'zigchain-1'} as const;

export async function fakeKeplr(page: Page, options: {address?: string; ledger?: boolean} = {}) {
  const calls: string[] = [];
  await page.exposeFunction('__recordStakingCall', (call: string) => { calls.push(call); });
  await page.addInitScript(({address, ledger, pubkey}) => {
    const record = (call: string) => (Reflect.get(window, '__recordStakingCall') as (c: string) => Promise<void>)(call);
    const bytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const control = {reject: false};
    Object.assign(window, {__stakingKeplr: control});
    const signer = new Proxy({}, {get(_, property) {
      if (typeof property !== 'string' || property === 'then' || property === 'toJSON') return undefined;
      if (property === 'getAccounts') return async () => { await record('signer.getAccounts'); return [{address, algo: 'secp256k1', pubkey: bytes(pubkey)}]; };
      if (property === 'signDirect') return async (_signer: string, signDoc: unknown) => {
        await record('signer.signDirect');
        if (control.reject) throw Error('Request rejected');
        return {signed: signDoc, signature: {pub_key: {type: 'tendermint/PubKeySecp256k1', value: pubkey}, signature: btoa(String.fromCharCode(...new Array(64).fill(5)))}};
      };
      return async () => { await record(`signer.${property}`); throw Error(`signer.${property} is not allowed in this test`); };
    }});
    const impl: Record<string, (...args: unknown[]) => unknown> = {
      enable: async () => undefined,
      experimentalSuggestChain: async () => undefined,
      getKey: async () => ({name: 'Fictional', algo: 'secp256k1', pubKey: bytes(pubkey), address: new Uint8Array(20).fill(9), bech32Address: address, isNanoLedger: ledger}),
      getOfflineSignerAuto: async () => signer,
      disable: async () => undefined,
    };
    Object.assign(window, {keplr: new Proxy({}, {get(_, property) {
      if (typeof property !== 'string' || property === 'then' || property === 'toJSON') return undefined;
      return async (...args: unknown[]) => { await record(`keplr.${property}`); if (property in impl) return impl[property]!(...args); throw Error(`keplr.${property} is not allowed in this test`); };
    }})});
  }, {address: options.address ?? ME, ledger: options.ledger ?? false, pubkey: PUBKEY});
  return calls;
}
/** What a fake broadcast answers: CheckTx accepted (code 0) or refused with a code; and what the receipt says. */
export type ChainScript = {
  liquid?: string;
  broadcast?: (n: number) => {code: number; log: string} | undefined;
  receipt?: (n: number) => 'never' | {code: number; log?: string} | undefined;
};
const typeOf = (any: {typeUrl: string; value: Uint8Array}) => any.typeUrl;
function eventsFor(tx: Uint8Array) {
  const body = TxBody.decode(TxRaw.decode(tx).bodyBytes);
  return body.messages.flatMap((m, i) => {
    const at = {key: 'msg_index', value: String(i), index: true};
    switch (typeOf(m)) {
      case '/cosmos.staking.v1beta1.MsgDelegate': { const v = MsgDelegate.decode(m.value); return [{type: 'delegate', attributes: [{key: 'validator', value: v.validatorAddress, index: true}, {key: 'delegator', value: v.delegatorAddress, index: true}, {key: 'amount', value: `${v.amount!.amount}azig`, index: true}, at]}]; }
      case '/cosmos.staking.v1beta1.MsgUndelegate': { const v = MsgUndelegate.decode(m.value); return [{type: 'unbond', attributes: [{key: 'validator', value: v.validatorAddress, index: true}, {key: 'amount', value: `${v.amount!.amount}azig`, index: true}, at]}]; }
      case '/cosmos.staking.v1beta1.MsgBeginRedelegate': { const v = MsgBeginRedelegate.decode(m.value); return [{type: 'redelegate', attributes: [{key: 'source_validator', value: v.validatorSrcAddress, index: true}, {key: 'destination_validator', value: v.validatorDstAddress, index: true}, at]}]; }
      case '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': { const v = MsgWithdrawDelegatorReward.decode(m.value); return [{type: 'withdraw_rewards', attributes: [{key: 'validator', value: v.validatorAddress, index: true}, {key: 'amount', value: '12000000000000000000azig', index: true}, at]}]; }
      case '/cosmos.gov.v1beta1.MsgVote': { const v = MsgVote.decode(m.value); return [{type: 'proposal_vote', attributes: [{key: 'proposal_id', value: v.proposalId.toString(), index: true}, at]}]; }
      // Session AF chunk 3: authz's typed revoke event (JSON-quoted values, as the chain writes them) and a bank send's transfer.
      case '/cosmos.authz.v1beta1.MsgRevoke': { const v = MsgRevoke.decode(m.value); return [{type: 'cosmos.authz.v1beta1.EventRevoke', attributes: [{key: 'grantee', value: JSON.stringify(v.grantee), index: true}, {key: 'granter', value: JSON.stringify(v.granter), index: true}, {key: 'msg_type_url', value: JSON.stringify(v.msgTypeUrl), index: true}, at]}]; }
      case '/cosmos.bank.v1beta1.MsgSend': { const v = MsgSend.decode(m.value); return [{type: 'transfer', attributes: [{key: 'recipient', value: v.toAddress, index: true}, {key: 'sender', value: v.fromAddress, index: true}, {key: 'amount', value: `${v.amount[0]?.amount}${v.amount[0]?.denom}`, index: true}, at]}]; }
      default: return [];
    }
  });
}
export async function fakeChain(page: Page, network: 'practice' | 'real' = 'practice', script: ChainScript = {}) {
  const methods: string[] = [], broadcasts: {hash: string; tx: Uint8Array; height: number}[] = [];
  let sequence = 3, height = 8290600;
  const chainId = CHAIN[network];
  const status = JSON.parse(JSON.stringify(recorded.status).replaceAll('zig-test-2', chainId));
  const query = (value: Uint8Array | string) => ({response: {...recorded.abciQueryShape, value: typeof value === 'string' ? value : toBase64(value)}});
  const handler = async (route: Route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({status: 204, headers: CORS});
    const url = new URL(request.url());
    if (request.method() === 'GET') {
      methods.push(`GET ${url.pathname}`);
      if (url.pathname === '/status') return route.fulfill({headers: CORS, json: {jsonrpc: '2.0', id: -1, result: status}});
      if (url.pathname === '/abci_info') return route.fulfill({headers: CORS, json: {jsonrpc: '2.0', id: -1, result: recorded.abciInfo}});
      return route.fulfill({status: 404, headers: CORS, body: ''});
    }
    const {id, method, params} = JSON.parse(request.postData() ?? '{}') as {id: number; method: string; params: Record<string, unknown>};
    methods.push(method === 'abci_query' ? `abci_query ${params.path}` : method);
    const reply = (result: unknown) => route.fulfill({headers: CORS, json: {jsonrpc: '2.0', id, result}});
    switch (method) {
      case 'status': return reply(status);
      case 'abci_info': return reply(recorded.abciInfo);
      case 'abci_query': switch (params.path) {
        case '/cosmos.auth.v1beta1.Query/Account': return reply(query(QueryAccountResponse.encode({account: {typeUrl: '/cosmos.auth.v1beta1.BaseAccount', value: BaseAccount.encode(BaseAccount.fromPartial({address: ME, accountNumber: 42n, sequence: BigInt(sequence)})).finish()}}).finish()));
        case '/cosmos.staking.v1beta1.Query/Params': return reply(query(recorded.stakingParamsValue));
        case '/cosmos.bank.v1beta1.Query/DenomMetadata': return reply(query(recorded.denomMetadataValue));
        case '/cosmos.bank.v1beta1.Query/Balance': return reply(query(QueryBalanceResponse.encode(QueryBalanceResponse.fromPartial({balance: {denom: 'azig', amount: script.liquid ?? ZIG(100)}})).finish()));
        case '/cosmos.tx.v1beta1.Service/Simulate': return reply(query(SimulateResponse.encode(SimulateResponse.fromPartial({gasInfo: {gasWanted: 0n, gasUsed: 187701n}, result: {data: new Uint8Array(), log: '', events: [], msgResponses: []}})).finish()));
        default: return reply({response: {...recorded.abciQueryShape, code: 6, log: `unknown query path ${String(params.path)}`, value: null}});
      }
      case 'broadcast_tx_sync': {
        const tx = fromBase64(String(params.tx)), hash = createHash('sha256').update(tx).digest('hex').toUpperCase();
        const refused = script.broadcast?.(broadcasts.length + 1);
        broadcasts.push({hash, tx, height: ++height});
        if (!refused) sequence++;
        return reply({code: refused?.code ?? 0, data: '', log: refused?.log ?? '[]', codespace: refused ? 'sdk' : '', hash});
      }
      case 'tx_search': {
        const wanted = /tx\.hash='([0-9A-F]{64})'/.exec(String(params.query))?.[1];
        const found = broadcasts.find(b => b.hash === wanted), n = found ? broadcasts.indexOf(found) + 1 : 0;
        const receipt = found ? script.receipt?.(n) : undefined;
        if (!found || receipt === 'never') return reply({txs: [], total_count: '0'});
        const code = receipt?.code ?? 0;
        return reply({txs: [{hash: found.hash, height: String(found.height), index: 0, tx_result: {code, data: '', log: receipt?.log ?? '', info: '', gas_wanted: '244012', gas_used: '187701', events: code ? [] : eventsFor(found.tx), codespace: code ? 'sdk' : ''}, tx: toBase64(found.tx)}], total_count: '1'});
      }
      default: return reply({});
    }
  };
  await page.route(new RegExp(`^${RPC[network].replaceAll('.', '\\.')}(/|$)`), handler);
  return {methods, broadcasts, fromHex};
}
type Pos = Record<string, unknown>;
const validatorOf = (address: string, name: string) => ({address, name, status: 'BOND_STATUS_BONDED', commission: '0.050000000000000000', votingTokens: ZIG(300000)});
export function positionsFor(network: 'practice' | 'real', block: number, amounts: {liquid?: string; staked?: Record<string, string>; rewards?: Record<string, string>} = {}): Pos[] {
  const chainId = CHAIN[network], rest = network === 'real' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com';
  const base = {providerId: 'native-zig', network: chainId, account: ME, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-18T21:00:00.000Z', provenance: `${rest} · block ${block}`, notes: '', risk: '', executionAuthority: 'NONE'};
  const names: Record<string, string> = {[V1]: 'Fictional Alpha', [V2]: 'Fictional Beta'};
  return [
    {...base, id: `${chainId}:${ME}:liquid`, sourceType: 'WALLET_LIQUID', quantity: amounts.liquid ?? ZIG(100), liquidity: 'LIQUID'},
    ...Object.entries(amounts.staked ?? {[V1]: ZIG(50)}).map(([v, q]) => ({...base, id: `${chainId}:${ME}:stake:${v}`, sourceType: 'NATIVE_STAKING', quantity: q, principal: q, liquidity: 'BONDED', validator: validatorOf(v, names[v]!), risk: 'Bonded stake is not liquid. Validator and slashing risk apply.'})),
    ...Object.entries(amounts.rewards ?? {[V1]: ZIG(1.5), [V2]: ZIG(0.25)}).map(([v, q]) => ({...base, id: `${chainId}:${ME}:reward:${v}`, sourceType: 'NATIVE_REWARDS', quantity: q, unclaimedRewards: q, liquidity: 'LOCKED', validator: validatorOf(v, names[v]!), notes: 'Unclaimed rewards; fractional base units excluded. Not liquid until claimed externally.'})),
  ];
}
export function validatorsWire(network: 'practice' | 'real') {
  const v = (operator: string, moniker: string, share: string) => ({operator, moniker, website: 'https://example.invalid', status: 'bonded', jailed: false, tombstoned: false, tokens: ZIG(300000), votingPowerShare: share, commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-01-18T21:24:58.055Z'}, selfBond: ZIG(10), uptime: {window: 35000, missed: 12, signedShare: '0.999657142857142857'}});
  return {version: 1, status: 'ok', network: CHAIN[network], height: '8290599', observedAt: '2026-10-18T21:00:00.000Z', source: network === 'real' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com', bondedTotal: ZIG(600000), validators: [v(V1, 'Fictional Alpha', '0.5'), v(V2, 'Fictional Beta', '0.5')]};
}
/** ZIGoals' own routes: positions (recording the minHeight asked) and validators; everything else under /api answers 503. */
export async function relay(page: Page, network: 'practice' | 'real' = 'practice', amounts: () => Parameters<typeof positionsFor>[2] = () => ({})) {
  const positionsAsked: URL[] = [];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/positions') {
      positionsAsked.push(url);
      expect(url.searchParams.get('address')).toBe(ME);
      const block = Number(url.searchParams.get('minHeight') ?? 8290599);
      return route.fulfill({json: {positions: positionsFor(network, block, amounts())}});
    }
    if (url.pathname === '/api/chain/validators') return route.fulfill({json: validatorsWire(network)});
    return route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}});
  });
  return positionsAsked;
}
/** The staking page with the Keplr double, the chain double and the relay; the panel ready. */
export async function openStaking(page: Page) {
  await page.goto('/app/staking');
  await expect(page.getByRole('heading', {level: 1, name: 'Staking'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  const panel = page.getByRole('region', {name: 'Stake, unstake and claim'});
  await expect(panel).toBeVisible();
  return panel;
}
/** No wallet signer was asked for, and nothing was signed or sent. */
export const SIGNER_CALLS = /getOfflineSigner|signDirect|signAmino|sendTx|signArbitrary|signEthereum/;
