import 'server-only';
import * as z from 'zod';
import {div, fixed, rounded, text, units} from '../../earn/decimal';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import type {ValdoraData} from '../../earn/live/types';
import {valdoraFailures} from '../../earn/live/ranges.mjs';
import {chainSource} from './chain';
import {LCD_NAMES, UpstreamFailure, ensure, readAtOneHeight, shape, smartPath, type Fetcher} from './upstream';

/**
 * Session AF (ADR-028 H26, H44, H88; `TIER 3 (egress routes)`): GET /api/earn/valdora. Valdora's liquid staking (stZIG)
 * on ZIGChain mainnet, read from the chain at one block height and pinned to what the chain reported on 2026-10-18:
 * staker contract, code 179 and its checksum, contract `stzig-staker` 1.1.0 and the stZIG denom. Any difference is
 * PIN_MISMATCH: ZIGoals then shows nothing from a contract it did not check.
 *
 * The stZIG→ZIG rate comes from the staker's `reverse_st_zig_price` (its units are not published by Valdora: they are read
 * as 18-decimal ZIG in, 6-decimal stZIG out, the reading DefiLlama's tracker uses, and labelled so) and is shown only when
 * OroSwap's stZIG/ZIG pool agrees within 2 % (H44); otherwise it is `unavailable` (SOURCES_DISAGREE). The contract admin
 * and the kind of key behind it are read live, so the single-key fact is stated from the chain with its block (H88).
 */
export const VALDORA_MAINNET = Object.freeze({
  staker: 'zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55', codeId: '179',
  checksum: '2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C', contract: 'stzig-staker', version: '1.1.0',
  stZigDenom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', stZigDecimals: 6,
  /** OroSwap's deep stZIG/ZIG pool (xyk), the second source of the rate. */
  dexPool: 'zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq',
  /** 1,000 ZIG, the probe amount of reverse_st_zig_price. */
  probeAzig: '1000000000000000000000',
});
export const RATE_AGREEMENT = '0.02';
const int = z.string().regex(/^\d{1,60}$/), address = z.string().regex(/^zig1[02-9ac-hj-np-z]{38,58}$/);
const data = <T extends z.ZodRawShape>(shape: T) => z.object({data: z.strictObject(shape)});
const asset = z.strictObject({info: z.strictObject({native_token: z.strictObject({denom: z.string().max(200)})}), amount: int});
const schemas = {
  contract: z.object({address, contract_info: z.object({code_id: int, admin: z.string().max(100), label: z.string().max(200)})}),
  code: z.object({code_id: int, checksum: z.string().regex(/^[0-9A-F]{64}$/)}),
  version: data({version: z.string().max(40), contract: z.string().max(80)}),
  paused: data({paused: z.boolean()}),
  emergency: data({emergency_mode: z.boolean(), initiated_by: z.string().nullable(), initiated_at: z.unknown(), emergency_unbonded_ledgers: z.array(z.unknown()).max(100)}),
  protocol: data({token_name: z.string().max(40), token_denom: z.string().max(200), minting_cap: int, min_stzig: int, min_deposit: int, max_withdrawal_scan_limit: z.number().int(), withdrawal_request_limit: z.number().int(), fees_percentage: int, treasury_address: address}),
  supply: data({total_supply: int}),
  daily: data({rewards_earned_today: int, fees_minted_today: int}),
  reverse: data({stzig_amount: int, uzig_amount: int}),
  account: z.object({account: z.object({'@type': z.string().max(120), pub_key: z.object({'@type': z.string().max(120)}).nullable().optional()})}),
  pool: z.object({data: z.strictObject({assets: z.tuple([asset, asset]), total_share: int})}),
};
const KEY_KIND = (type: string | null): ValdoraData['admin']['key'] => type === null ? 'none' : /secp256k1\.PubKey$|ed25519\.PubKey$|ethsecp256k1\.PubKey$/.test(type) ? 'single-key' : /multisig\.LegacyAminoPubKey$/.test(type) ? 'multisig' : 'contract-or-other';

export async function readValdora(fetcher: Fetcher, now: () => number = Date.now): Promise<LiveEnvelope<ValdoraData>> {
  const pin = VALDORA_MAINNET;
  try {
    const {origin, latest, value} = await readAtOneHeight(fetcher, 'mainnet', async get => {
      const q = (query: unknown) => get(smartPath(pin.staker, query));
      const [contract, code, version, paused, emergency, protocol, supply, daily, reverse, pool] = await Promise.all([
        get(`/cosmwasm/wasm/v1/contract/${pin.staker}`), get(`/cosmwasm/wasm/v1/code-info/${pin.codeId}`), q({contract_version: {}}), q({paused: {}}), q({emergency_status: {}}),
        q({protocol_info: {}}), q({total_supply: {}}), q({daily_rewards_and_fees: {}}), q({reverse_st_zig_price: {amount: pin.probeAzig}}), get(smartPath(pin.dexPool, {pool: {}})),
      ]);
      const info = shape(schemas.contract, contract).contract_info;
      // The pins first: nothing else is read from a contract that is not the one checked.
      ensure(info.code_id === pin.codeId && shape(schemas.code, code).checksum === pin.checksum, 'PIN_MISMATCH');
      const v = shape(schemas.version, version).data;
      ensure(v.contract === pin.contract && v.version === pin.version, 'PIN_MISMATCH');
      const p = shape(schemas.protocol, protocol).data;
      ensure(p.token_denom === pin.stZigDenom, 'PIN_MISMATCH');
      const admin = info.admin;
      const account = admin ? shape(schemas.account, await get(`/cosmos/auth/v1beta1/accounts/${shape(z.object({a: address}), {a: admin}).a}`)).account : null;
      return {info, paused: shape(schemas.paused, paused).data.paused, emergency: shape(schemas.emergency, emergency).data.emergency_mode, p,
        supply: shape(schemas.supply, supply).data.total_supply, daily: shape(schemas.daily, daily).data, reverse: shape(schemas.reverse, reverse).data,
        pool: shape(schemas.pool, pool).data, admin, keyType: account?.pub_key?.['@type'] ?? null};
    });
    ensure(value.reverse.uzig_amount === pin.probeAzig && BigInt(value.reverse.stzig_amount) > 0n, 'MALFORMED');
    const contractRatio = div(units(pin.probeAzig, 18), units(value.reverse.stzig_amount, pin.stZigDecimals));
    const [a, b] = value.pool.assets, stzig = [a, b].find(x => x.info.native_token.denom === pin.stZigDenom), zig = [a, b].find(x => x.info.native_token.denom === 'azig');
    ensure(!!stzig && !!zig && BigInt(stzig.amount) > 0n && BigInt(zig.amount) > 0n, 'PIN_MISMATCH');
    const dexRatio = div(units(zig.amount, 18), units(stzig.amount, pin.stZigDecimals));
    const difference = div(contractRatio > dexRatio ? contractRatio - dexRatio : dexRatio - contractRatio, contractRatio);
    const data: ValdoraData = {
      pins: {staker: pin.staker, codeId: pin.codeId, checksum: pin.checksum, contract: pin.contract, version: pin.version},
      paused: value.paused, emergencyMode: value.emergency,
      feeOfRewards: text(div(fixed(value.p.fees_percentage), fixed('10000'))),
      minDepositAzig: value.p.min_deposit, minStZigUnits: value.p.min_stzig, stZigDenom: pin.stZigDenom, stZigDecimals: 6,
      stZigSupplyUnits: value.supply, rewardsEarnedTodayAzig: value.daily.rewards_earned_today,
      admin: {address: value.admin, key: KEY_KIND(value.keyType), keyType: value.keyType},
      rate: difference <= fixed(RATE_AGREEMENT)
        ? {status: 'ok', zigPerStZig: rounded(contractRatio, 6), dexZigPerStZig: rounded(dexRatio, 6), difference: rounded(difference, 6), basis: 'reverse_st_zig_price, read as 18-decimal ZIG in and 6-decimal stZIG out (the reading DefiLlama’s tracker uses)'}
        : {status: 'unavailable', reason: 'SOURCES_DISAGREE'},
    };
    // Both rates are range-checked whether or not they agree; only an agreeing rate is ever in the answer (H44).
    ensure(valdoraFailures({...data, contractZigPerStZig: rounded(contractRatio, 6), dexZigPerStZig: rounded(dexRatio, 6)}).length === 0, 'OUT_OF_RANGE');
    return liveOk({name: LCD_NAMES[origin] ?? 'ZIGChain mainnet LCD', origin}, data, {height: latest.height, observedAt: new Date(latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), fetchedAt: new Date(now()).toISOString()});
  } catch (error) {
    if (error instanceof UpstreamFailure) return liveUnavailable(chainSource('mainnet'), error.reason, new Date(now()).toISOString());
    throw error;
  }
}
