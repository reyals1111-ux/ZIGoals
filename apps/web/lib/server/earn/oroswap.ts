import 'server-only';
import * as z from 'zod';
import {div, rounded, units} from '../../earn/decimal';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import type {OroswapData} from '../../earn/live/types';
import {oroswapFailures} from '../../earn/live/ranges.mjs';
import {chainSource} from './chain';
import {LCD_NAMES, UpstreamFailure, ensure, readAtOneHeight, shape, smartPath, type Fetcher} from './upstream';

/**
 * Session AF (ADR-028 H84; `TIER 3 (egress routes)`): GET /api/earn/oroswap. OroSwap's pools as the chain holds them,
 * at one block height: the factory's fee tiers, four pools' depth with each pool's own fee from the factory's
 * `fee_info` for its pair type (OroSwap's docs say "1 %", the chain says otherwise per tier), and whether any farm is
 * running (the incentives contract's `active_pools`). OroSwap's own data API is behind a bot wall, so the chain is the
 * source. Pools and denoms are pinned: a pool answering with another pair is PIN_MISMATCH.
 *
 * Session AF chunk 2: the factory itself vouches for every pinned pool: its `pairs_by_assets` for the pool's two tokens
 * must list that very contract with that pair type (the factory's plain `pairs` list does not return the main ZIG pairs).
 * The USDC.inj / ZIG pool (created 2026-10-09, the USDC Circle and the bridges point new money to) joins the three.
 */
export const OROSWAP_MAINNET = Object.freeze({
  factory: 'zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85',
  incentives: 'zig10v0hrjvwwlqwvk2yhwagm9m9h385spxa4s54f4aekhap0lxyekysf2ekwz',
});
const USDC = 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4', ATOM = 'ibc/EF48E6B1A1A19F47ECAEA62F5670C37C0580E86A9E88498B7E393EB6F49F33C0';
const USDC_INJ = 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B';
const STZIG = 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig';
/** Each pool: its contract, its two assets (symbol, denom, decimals), and which asset prices the other. */
export const OROSWAP_POOLS = Object.freeze([
  {id: 'zig-usdc', label: 'ZIG / USDC.n (Noble)', contract: 'zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h', assets: [{symbol: 'ZIG', denom: 'azig', decimals: 18}, {symbol: 'USDC.n', denom: USDC, decimals: 6}], base: 'ZIG', quote: 'USDC.n'},
  {id: 'zig-usdc-inj', label: 'ZIG / USDC.inj (Injective)', contract: 'zig1ewkl2peqhupyfhm6pm7xlufucde7le9zer0wa867u08cveuts2asm0l2z3', assets: [{symbol: 'ZIG', denom: 'azig', decimals: 18}, {symbol: 'USDC.inj', denom: USDC_INJ, decimals: 6}], base: 'ZIG', quote: 'USDC.inj'},
  {id: 'zig-atom', label: 'ZIG / ATOM', contract: 'zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45', assets: [{symbol: 'ZIG', denom: 'azig', decimals: 18}, {symbol: 'ATOM', denom: ATOM, decimals: 6}], base: 'ATOM', quote: 'ZIG'},
  {id: 'stzig-zig', label: 'stZIG / ZIG', contract: 'zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq', assets: [{symbol: 'stZIG', denom: STZIG, decimals: 6}, {symbol: 'ZIG', denom: 'azig', decimals: 18}], base: 'stZIG', quote: 'ZIG'},
] as const);
const int = z.string().regex(/^\d{1,60}$/);
const pairType = z.union([z.strictObject({xyk: z.strictObject({})}), z.strictObject({stable: z.strictObject({})}), z.strictObject({custom: z.string().regex(/^[a-z0-9_]{1,40}$/)})]);
const info = z.strictObject({native_token: z.strictObject({denom: z.string().max(200)})});
const schemas = {
  config: z.object({data: z.object({pair_configs: z.array(z.object({pair_type: pairType, total_fee_bps: z.number().int(), maker_fee_bps: z.number().int(), is_disabled: z.boolean()})).max(50)})}),
  fee: z.object({data: z.object({total_fee_bps: z.number().int(), maker_fee_bps: z.number().int()})}),
  pool: z.object({data: z.object({assets: z.tuple([z.strictObject({info, amount: int}), z.strictObject({info, amount: int})]), total_share: int})}),
  pair: z.object({data: z.object({asset_infos: z.tuple([info, info]), contract_addr: z.string(), pair_type: pairType})}),
  active: z.object({data: z.array(z.unknown()).max(500)}),
  byAssets: z.object({data: z.object({pairs: z.array(z.object({asset_infos: z.tuple([info, info]), contract_addr: z.string().max(100), pair_type: pairType})).max(100)})}),
};
const typeName = (t: z.infer<typeof pairType>) => 'custom' in t ? t.custom : 'xyk' in t ? 'xyk' : 'stable';

export async function readOroswap(fetcher: Fetcher, now: () => number = Date.now): Promise<LiveEnvelope<OroswapData>> {
  try {
    const {origin, latest, value} = await readAtOneHeight(fetcher, 'mainnet', async get => {
      const [config, active, ...pools] = await Promise.all([
        get(smartPath(OROSWAP_MAINNET.factory, {config: {}})), get(smartPath(OROSWAP_MAINNET.incentives, {active_pools: {}})),
        ...OROSWAP_POOLS.flatMap(p => [get(smartPath(p.contract, {pool: {}})), get(smartPath(p.contract, {pair: {}})), get(smartPath(OROSWAP_MAINNET.factory, {pairs_by_assets: {asset_infos: p.assets.map(a => ({native_token: {denom: a.denom}}))}}))]),
      ]);
      const read = OROSWAP_POOLS.map((p, i) => ({p, pool: shape(schemas.pool, pools[i * 3]).data, pair: shape(schemas.pair, pools[i * 3 + 1]).data, listed: shape(schemas.byAssets, pools[i * 3 + 2]).data.pairs}));
      const types = [...new Map(read.map(r => [typeName(r.pair.pair_type), r.pair.pair_type])).entries()];
      const fees = new Map(await Promise.all(types.map(async ([name, type]) => [name, shape(schemas.fee, await get(smartPath(OROSWAP_MAINNET.factory, {fee_info: {pair_type: type}}))).data] as const)));
      return {config: shape(schemas.config, config).data, active: shape(schemas.active, active).data, read, fees};
    });
    const pools = value.read.map(({p, pool, pair, listed}) => {
      const denoms = p.assets.map(a => a.denom);
      const same = (infos: readonly {native_token: {denom: string}}[]) => infos.every(x => denoms.includes(x.native_token.denom as never)) && new Set(infos.map(x => x.native_token.denom)).size === 2;
      // The pinned pair, in either order, and nothing else.
      ensure(pair.contract_addr === p.contract && same(pair.asset_infos) && pool.assets.every(x => denoms.includes(x.info.native_token.denom as never)) && new Set(pool.assets.map(x => x.info.native_token.denom)).size === 2, 'PIN_MISMATCH');
      // The factory lists this very contract, for these two tokens and this pair type.
      ensure(listed.some(l => l.contract_addr === p.contract && same(l.asset_infos) && typeName(l.pair_type) === typeName(pair.pair_type)), 'PIN_MISMATCH');
      const reserves = p.assets.map(a => ({symbol: a.symbol, denom: a.denom, decimals: a.decimals, amount: pool.assets.find(x => x.info.native_token.denom === a.denom)!.amount}));
      ensure(reserves.every(r => BigInt(r.amount) > 0n), 'OUT_OF_RANGE');
      const amount = (symbol: string) => { const r = reserves.find(x => x.symbol === symbol)!; return units(r.amount, r.decimals); };
      const fee = value.fees.get(typeName(pair.pair_type))!;
      return {id: p.id, label: p.label, contract: p.contract, pairType: typeName(pair.pair_type), feeBps: fee.total_fee_bps, makerFeeBps: fee.maker_fee_bps, reserves, totalShare: pool.total_share,
        price: {base: p.base, quote: p.quote, value: rounded(div(amount(p.quote), amount(p.base)), 8)}};
    });
    const data: OroswapData = {
      pairTypes: value.config.pair_configs.map(c => ({name: typeName(c.pair_type), totalFeeBps: c.total_fee_bps, makerFeeBps: c.maker_fee_bps, disabled: c.is_disabled})),
      pools, farms: {active: value.active.length > 0, activePools: value.active.length},
    };
    ensure(oroswapFailures(data).length === 0, 'OUT_OF_RANGE');
    return liveOk({name: LCD_NAMES[origin] ?? 'ZIGChain mainnet LCD', origin}, data, {height: latest.height, observedAt: new Date(latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), fetchedAt: new Date(now()).toISOString()});
  } catch (error) {
    if (error instanceof UpstreamFailure) return liveUnavailable(chainSource('mainnet'), error.reason, new Date(now()).toISOString());
    throw error;
  }
}
