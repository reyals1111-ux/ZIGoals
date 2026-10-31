import type {StakingJournalEntry} from '../staking/journal';

/**
 * Session AK (F4, testnet practice journey polish): the practice round on ZIGChain's test network (zig-test-2) as six
 * plain steps, each ticked from what the device already knows — the staking journal's confirmed entries on zig-test-2
 * and whether a practice wallet is connected. Test ZIG has no value; nothing here signs or reads anything new. The
 * practice badge (a 1-azig self-send with a memo, opt-in, D4/H48) stays exactly as Staking makes it; this only says
 * whether one was confirmed.
 */
export const PRACTICE_CHAIN = 'zig-test-2';
export const FAUCET_URL = 'https://faucet.zigchain.com/';
export type PracticeStepId = 'faucet' | 'connect' | 'delegate' | 'claim' | 'undelegate' | 'badge';
export type PracticeStep = {id: PracticeStepId; title: string; how: string; done: boolean; optional?: boolean};
export type PracticeFacts = {journal: readonly Pick<StakingJournalEntry, 'chainId' | 'action' | 'state'>[]; practiceWallet: boolean; badgesOn: boolean};
const confirmed = (facts: PracticeFacts, ...actions: string[]) => facts.journal.some(e => e.chainId === PRACTICE_CHAIN && e.state === 'CONFIRMED' && actions.includes(e.action));
export function practiceSteps(facts: PracticeFacts): PracticeStep[] {
  const delegated = confirmed(facts, 'delegate', 'redelegate');
  const steps: PracticeStep[] = [
    {id: 'faucet', title: 'Get free test ZIG', how: 'Open ZIGChain’s faucet and paste your address. Test ZIG has no value.', done: facts.practiceWallet && (delegated || confirmed(facts, 'claim', 'sweep', 'undelegate', 'attest'))},
    {id: 'connect', title: 'Connect your wallet on the practice network', how: 'On Staking, the practice network is chosen first. Press “Connect Keplr”.', done: facts.practiceWallet || delegated},
    {id: 'delegate', title: 'Stake some test ZIG', how: 'Choose a validator, enter an amount, press Review and sign in Keplr.', done: delegated},
    {id: 'claim', title: 'Claim your test rewards', how: 'After a few minutes, claim what your stake earned. Review shows every validator first.', done: confirmed(facts, 'claim', 'sweep')},
    {id: 'undelegate', title: 'Unstake a little', how: 'See how unbonding works: the test ZIG comes back after the unbonding period, shown in your unbonding calendar.', done: confirmed(facts, 'undelegate')},
    {id: 'badge', title: 'Earn your practice badge', how: facts.badgesOn ? 'On Staking, make your practice badge: one test transaction of the smallest unit to yourself, with a note only you can prove.' : 'Optional: turn on practice badges in Settings, then make one on Staking.', done: confirmed(facts, 'attest'), optional: true},
  ];
  // The faucet is done once anything later is done (you could not have staked without test ZIG).
  if (steps.slice(2).some(s => s.done && !s.optional)) steps[0]!.done = true;
  return steps;
}
export function practiceProgress(steps: readonly PracticeStep[]): {done: number; total: number; next: PracticeStep | null; complete: boolean} {
  const required = steps.filter(s => !s.optional);
  const done = required.filter(s => s.done).length;
  return {done, total: required.length, next: steps.find(s => !s.done) ?? null, complete: done === required.length};
}
