import 'server-only';
import * as z from 'zod';
import {aprBreakdown, type AprBreakdown} from '../../earn/apr';
import type {ChainData} from '../../earn/live/types';
import {div, fixed, text} from '../../earn/decimal';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import {chainFailures} from '../../earn/live/ranges.mjs';
import {LCD_NAMES, LCDS, UpstreamFailure, ensure, readAtOneHeight, shape, type Fetcher, type LcdNetwork} from './upstream';

/**
 * Session AF (ADR-028 H9, H16, H51; `TIER 3 (egress routes)`): GET /api/earn/chain?network=mainnet|testnet. The staking
 * network's own parameters, read from ZIGChain's LCD at one block height: the mint module (inflation, its bounds and goal,
 * blocks_per_year, annual provisions), the staking pool and supply of azig, staking, distribution and slashing parameters,
 * and two block headers 10,000 blocks apart for the real block time. From them, lib/earn/apr.ts gives the native staking
 * APR before a validator's commission. No address of a person is read or sent.
 */
export const BLOCK_WINDOW = 10_000;
const dec = z.string().regex(/^\d{1,60}(\.\d{1,60})?$/), int = z.string().regex(/^\d{1,60}$/);
const duration = z.string().regex(/^\d{1,12}(\.\d{1,9})?s$/);
const schemas = {
  node: z.object({default_node_info: z.object({network: z.string().max(100)}), application_version: z.object({version: z.string().max(60)}).optional()}),
  mintParams: z.object({params: z.object({mint_denom: z.string(), inflation_rate_change: dec, inflation_max: dec, inflation_min: dec, goal_bonded: dec, blocks_per_year: int})}),
  inflation: z.object({inflation: dec}),
  provisions: z.object({annual_provisions: dec}),
  pool: z.object({pool: z.object({not_bonded_tokens: int, bonded_tokens: int})}),
  staking: z.object({params: z.object({unbonding_time: duration, max_validators: z.number().int().nonnegative(), max_entries: z.number().int().nonnegative(), bond_denom: z.string(), min_commission_rate: dec})}),
  distribution: z.object({params: z.object({community_tax: dec})}),
  slashing: z.object({params: z.object({signed_blocks_window: int, min_signed_per_window: dec, downtime_jail_duration: duration, slash_fraction_double_sign: dec, slash_fraction_downtime: dec})}),
  supply: z.object({amount: z.object({denom: z.literal('azig'), amount: int})}),
  block: z.object({block: z.object({header: z.object({height: int, time: z.string().max(40), chain_id: z.string()})})}),
};
const seconds = (d: string) => Number(d.slice(0, -1));
export function chainSource(network: LcdNetwork, origin: string = LCDS[network].origins[0]!) { return {name: LCD_NAMES[origin] ?? 'ZIGChain LCD', origin}; }

export async function readChain(fetcher: Fetcher, network: LcdNetwork, now: () => number = Date.now): Promise<LiveEnvelope<ChainData>> {
  try {
    const {chainId} = LCDS[network];
    const {origin, latest, value} = await readAtOneHeight(fetcher, network, async (get, at) => {
      const earlierHeight = BigInt(at.height) - BigInt(BLOCK_WINDOW);
      ensure(earlierHeight > 0n, 'MALFORMED');
      const [node, mintParams, inflation, provisions, pool, staking, distribution, slashing, supply, earlier] = await Promise.all([
        get('/cosmos/base/tendermint/v1beta1/node_info', 100_000), get('/cosmos/mint/v1beta1/params'), get('/cosmos/mint/v1beta1/inflation'), get('/cosmos/mint/v1beta1/annual_provisions'),
        get('/cosmos/staking/v1beta1/pool'), get('/cosmos/staking/v1beta1/params'), get('/cosmos/distribution/v1beta1/params'), get('/cosmos/slashing/v1beta1/params'),
        get('/cosmos/bank/v1beta1/supply/by_denom?denom=azig'), get(`/cosmos/base/tendermint/v1beta1/blocks/${earlierHeight}`),
      ]);
      const before = shape(schemas.block, earlier).block.header;
      ensure(before.height === earlierHeight.toString() && before.chain_id === chainId, 'MALFORMED');
      return {node: shape(schemas.node, node), mintParams: shape(schemas.mintParams, mintParams).params, inflation: shape(schemas.inflation, inflation).inflation, provisions: shape(schemas.provisions, provisions).annual_provisions,
        pool: shape(schemas.pool, pool).pool, staking: shape(schemas.staking, staking).params, distribution: shape(schemas.distribution, distribution).params, slashing: shape(schemas.slashing, slashing).params,
        supply: shape(schemas.supply, supply).amount.amount, earlier: {height: before.height, time: before.time}};
    });
    ensure(value.node.default_node_info.network === chainId, 'WRONG_NETWORK');
    ensure(value.staking.bond_denom === 'azig' && value.mintParams.mint_denom === 'azig', 'WRONG_NETWORK');
    const earlier = value.earlier;
    let apr: AprBreakdown;
    try { apr = aprBreakdown({annualProvisions: value.provisions, bondedTokens: value.pool.bonded_tokens, communityTax: value.distribution.community_tax, mintBlocksPerYear: value.mintParams.blocks_per_year, latest, earlier}); }
    catch { throw new UpstreamFailure('MALFORMED'); }
    const data: ChainData = {
      network, chainId, nodeVersion: value.node.application_version?.version ?? null, bondDenom: 'azig', decimals: 18,
      mint: {inflation: value.inflation, inflationMin: value.mintParams.inflation_min, inflationMax: value.mintParams.inflation_max, goalBonded: value.mintParams.goal_bonded, inflationRateChange: value.mintParams.inflation_rate_change, blocksPerYear: value.mintParams.blocks_per_year, annualProvisions: value.provisions},
      staking: {bondedTokens: value.pool.bonded_tokens, notBondedTokens: value.pool.not_bonded_tokens, supply: value.supply, bondedShare: BigInt(value.supply) > 0n ? text(div(fixed(value.pool.bonded_tokens), fixed(value.supply))) : '0', unbondingSeconds: seconds(value.staking.unbonding_time), maxValidators: value.staking.max_validators, maxEntries: value.staking.max_entries, minCommissionRate: value.staking.min_commission_rate},
      distribution: {communityTax: value.distribution.community_tax},
      slashing: {signedBlocksWindow: value.slashing.signed_blocks_window, minSignedPerWindow: value.slashing.min_signed_per_window, downtimeJailSeconds: seconds(value.slashing.downtime_jail_duration), slashFractionDoubleSign: value.slashing.slash_fraction_double_sign, slashFractionDowntime: value.slashing.slash_fraction_downtime},
      blocks: {latest: {height: latest.height, time: latest.time}, earlier: {height: earlier.height, time: earlier.time}},
      apr,
    };
    ensure(chainFailures(data).length === 0, 'OUT_OF_RANGE');
    return liveOk(chainSource(network, origin), data, {height: latest.height, observedAt: new Date(latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), fetchedAt: new Date(now()).toISOString()});
  } catch (error) {
    if (error instanceof UpstreamFailure) return liveUnavailable(chainSource(network), error.reason, new Date(now()).toISOString());
    throw error;
  }
}
