import 'server-only';
import {fromBech32, toBech32} from '@cosmjs/encoding';
import * as z from 'zod';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import type {MeasuredData} from '../../earn/live/types';
import {measuredRate} from '../../earn/live/measured.mjs';
import {measuredFailures} from '../../earn/live/ranges.mjs';
import {chainSource} from './chain';
import {LCD_NAMES, LCDS, UpstreamFailure, ensure, getJson, shape, type EarnOrigin, type Fetcher} from './upstream';

/**
 * Session AF chunk 2 (ADR-028 H97; `TIER 3 (egress routes)`): GET /api/earn/measured. The measured native staking figure:
 * what one named validator's own stake (its self-delegation) accrued in pending rewards over the last 10,000 blocks, read
 * at the latest block and 10,000 blocks earlier, annualised over the real time between the two blocks and divided by its
 * self-bond (lib/earn/live/measured.mjs). The validator is ZIG Sentinel - Foundation 1, one of the four validators the
 * ZIGChain Foundation runs; its name and commission are read live. Its account is a public chain identifier (the
 * validator's own), never a person's wallet.
 *
 * The earlier block's state must still be kept by the LCD that answers: if the official LCD does not keep it, the
 * rotation host is asked; if none does, HISTORY_NOT_KEPT. If the rewards fell in the window (they were claimed) or the
 * self-bond changed, the figure is `unavailable` with REWARDS_CLAIMED and the rest of the answer (the validator, both
 * blocks) stays, so the page can say why.
 */
export const MEASURED_VALIDATOR = 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl';
export const MEASURED_WINDOW = 10_000n;
/** The validator's own account: the operator's 20 bytes with the account prefix. */
export const MEASURED_DELEGATOR = toBech32('zig', fromBech32(MEASURED_VALIDATOR, 90).data);
const int = z.string().regex(/^\d{1,40}$/), dec = z.string().regex(/^\d{1,40}(\.\d{1,30})?$/);
const schemas = {
  block: z.object({block: z.object({header: z.object({height: int, time: z.string().max(40), chain_id: z.string().max(40)})})}),
  validator: z.object({validator: z.object({operator_address: z.string(), jailed: z.boolean(), status: z.string().max(40), description: z.object({moniker: z.string().max(200)}), commission: z.object({commission_rates: z.object({rate: dec})})})}),
  delegation: z.object({delegation_response: z.object({delegation: z.object({delegator_address: z.string(), validator_address: z.string()}), balance: z.object({denom: z.literal('azig'), amount: int})})}),
  rewards: z.object({rewards: z.array(z.object({denom: z.string().max(200), amount: dec})).max(50)}),
};
const azigOf = (rewards: z.infer<typeof schemas.rewards>['rewards']) => rewards.find(r => r.denom === 'azig')?.amount ?? '0';
type Point = {height: string; time: string; pendingRewards: string; selfBond: string};

async function readFrom(fetcher: Fetcher, origin: EarnOrigin): Promise<{latest: Point; earlier: Point | 'history'; validator: MeasuredData['validator']}> {
  const {chainId} = LCDS.mainnet, deadline = AbortSignal.timeout(30_000);
  const at = async (path: string, height?: string) => (await getJson(fetcher, origin + path, {maxChars: 200_000, height, signal: deadline})).value;
  const header = shape(schemas.block, await at('/cosmos/base/tendermint/v1beta1/blocks/latest')).block.header;
  ensure(header.chain_id === chainId, 'WRONG_NETWORK');
  const h = header.height, rewardsPath = `/cosmos/distribution/v1beta1/delegators/${MEASURED_DELEGATOR}/rewards/${MEASURED_VALIDATOR}`, bondPath = `/cosmos/staking/v1beta1/validators/${MEASURED_VALIDATOR}/delegations/${MEASURED_DELEGATOR}`;
  const [validator, bond, rewards] = await Promise.all([at(`/cosmos/staking/v1beta1/validators/${MEASURED_VALIDATOR}`, h), at(bondPath, h), at(rewardsPath, h)]);
  const v = shape(schemas.validator, validator).validator;
  ensure(v.operator_address === MEASURED_VALIDATOR, 'PIN_MISMATCH');
  const d = shape(schemas.delegation, bond).delegation_response;
  ensure(d.delegation.delegator_address === MEASURED_DELEGATOR && d.delegation.validator_address === MEASURED_VALIDATOR, 'PIN_MISMATCH');
  const latest: Point = {height: h, time: header.time, pendingRewards: azigOf(shape(schemas.rewards, rewards).rewards), selfBond: d.balance.amount};
  const out = {latest, validator: {operator: v.operator_address, moniker: v.description.moniker, commission: v.commission.commission_rates.rate, jailed: v.jailed, status: v.status}};
  const e = (BigInt(h) - MEASURED_WINDOW).toString();
  ensure(BigInt(e) > 0n, 'MALFORMED');
  try {
    // The block header at the earlier height comes from the block store; the rewards and the bond need that block's state.
    const [block, bondThen, rewardsThen] = await Promise.all([at(`/cosmos/base/tendermint/v1beta1/blocks/${e}`, h), at(bondPath, e), at(rewardsPath, e)]);
    const b = shape(schemas.block, block).block.header;
    ensure(b.height === e && b.chain_id === chainId, 'MALFORMED');
    const then = shape(schemas.delegation, bondThen).delegation_response;
    return {...out, earlier: {height: e, time: b.time, pendingRewards: azigOf(shape(schemas.rewards, rewardsThen).rewards), selfBond: then.balance.amount}};
  } catch (error) {
    if (!(error instanceof UpstreamFailure)) throw error;
    // A wrong network is never history; anything else at the earlier height means this LCD does not answer for it.
    if (error.reason === 'WRONG_NETWORK') throw error;
    return {...out, earlier: 'history'};
  }
}

export async function readMeasured(fetcher: Fetcher, now: () => number = Date.now): Promise<LiveEnvelope<MeasuredData>> {
  let last: UpstreamFailure = new UpstreamFailure('UPSTREAM_DOWN'), historyMissing = false;
  try {
    for (const origin of LCDS.mainnet.origins) {
      let got: Awaited<ReturnType<typeof readFrom>>;
      try { got = await readFrom(fetcher, origin); }
      catch (error) {
        if (!(error instanceof UpstreamFailure)) throw error;
        if (error.reason !== 'UPSTREAM_DOWN' && error.reason !== 'TIMEOUT') throw error;
        last = error; continue;
      }
      if (got.earlier === 'history') { historyMissing = true; continue; }
      let result: ReturnType<typeof measuredRate>;
      try { result = measuredRate({latest: got.latest, earlier: got.earlier}); } catch { throw new UpstreamFailure('MALFORMED'); }
      const data: MeasuredData = {validator: got.validator, delegator: MEASURED_DELEGATOR, latest: got.latest, earlier: got.earlier,
        measured: result.status === 'ok' ? {status: 'ok', accrued: result.accrued, windowBlocks: result.windowBlocks, windowSeconds: result.windowSeconds, rate: result.rate} : {status: 'unavailable', reason: result.reason}};
      if (measuredFailures(data).includes('commission') || measuredFailures(data).includes('selfBond')) throw new UpstreamFailure('OUT_OF_RANGE');
      if (measuredFailures(data).includes('measuredApr')) data.measured = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
      return liveOk({name: LCD_NAMES[origin] ?? 'ZIGChain mainnet LCD', origin}, data, {height: got.latest.height, observedAt: new Date(got.latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), fetchedAt: new Date(now()).toISOString()});
    }
    throw historyMissing ? new UpstreamFailure('HISTORY_NOT_KEPT') : last;
  } catch (error) {
    if (error instanceof UpstreamFailure) return liveUnavailable(chainSource('mainnet'), error.reason, new Date(now()).toISOString());
    throw error;
  }
}
