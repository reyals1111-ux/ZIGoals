import type {Position} from '../positions';
import {unbondingEvents} from '../zigchain-eco/staking-clarity';

/**
 * Session AL sweep 4 (C-DVG-68, C-BN-06): the staking items of this device's notification plan, from the positions last
 * read and kept on this device (Wealth's platform record). Pure; never a name, an amount or an address:
 * - `unbonding`: the day unstaked ZIG is back in the wallet (the chain's own completion day, in the person's zone);
 * - `validator`: a validator the person's staked positions point to was not in the active set at the last read (jailed,
 *   or otherwise not bonded), so it earns nothing; one item a day while that read stands.
 * The plan puts both at the morning time of their day and registers no wake of their own (lib/notify/plan.ts).
 */
export type StakingItem = {kind: 'unbonding' | 'validator'; id: string; date: string};
const BONDED = 'BOND_STATUS_BONDED';

export function stakingItems(positions: readonly Position[], {now, timeZone, today}: {now: number; timeZone: string; today: string}): StakingItem[] {
  const out: StakingItem[] = unbondingEvents(positions, {now, timeZone}).map(e => ({kind: 'unbonding', id: e.id, date: e.date}));
  const resting = positions.some(p => p.sourceType === 'NATIVE_STAKING' && !p.archivedAt && /^[1-9]\d*$/.test(p.quantity) && p.validator?.status && p.validator.status !== BONDED);
  if (resting) out.push({kind: 'validator', id: 'validator-not-earning', date: today});
  return out;
}
