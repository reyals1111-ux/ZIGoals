import type {Position} from '../positions';
import {stakingEntriesOf, type StakingJournal, type StakingJournalEntry} from '../staking/journal';
import {CHOICE_OF_OPTION} from './plain-words';
import type {VoteChoiceWire} from './wire';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H46, H63; P6.6): who may vote, and the votes this device signed.
 * - **Eligibility** is a bonded delegation on that network: a vote counts with the ZIG staked behind it, and only stake
 *   with a bonded (active) validator is counted by the chain's tally. Read from the connected address's own positions
 *   (the read-only relay), never guessed.
 * - **The vote journal** is the staking journal's `vote` entries (`zigoals:staking-journal:v1`): the chain removes every
 *   vote when it counts a proposal, so after the voting period this device's own record is the only one ZIGoals keeps.
 */
export type Eligibility = {eligible: boolean; bonded: string; validators: number};
export function eligibilityOf(positions: readonly Position[], chainId: string, address: string): Eligibility {
  const stake = positions.filter(p => p.network === chainId && p.account === address && p.providerId === 'native-zig' && p.asset === 'ZIG' && p.sourceType === 'NATIVE_STAKING' && !p.archivedAt && /^[1-9]\d*$/.test(p.quantity) && p.validator?.status === 'BOND_STATUS_BONDED');
  const bonded = stake.reduce((n, p) => n + BigInt(p.quantity), 0n);
  return {eligible: bonded > 0n, bonded: bonded.toString(), validators: new Set(stake.map(p => p.validator!.address)).size};
}
export type JournalVote = {proposalId: string; choice: VoteChoiceWire; state: StakingJournalEntry['state']; at: string; hash?: string; chainId: string; wallet: string};
/** The votes signed on this device for one network (and address, when given), newest first; unreadable entries skipped. */
export function votesOf(journal: StakingJournal, chainId: string, address?: string): JournalVote[] {
  return stakingEntriesOf(journal).filter(e => e.action === 'vote' && e.chainId === chainId && (!address || e.wallet === address) && e.proposalId && e.option && CHOICE_OF_OPTION[e.option])
    .map(e => ({proposalId: e.proposalId!, choice: CHOICE_OF_OPTION[e.option!]!, state: e.state, at: e.at, chainId: e.chainId, wallet: e.wallet, ...(e.hash ? {hash: e.hash} : {})}));
}
/** The latest confirmed vote on a proposal from this device, if any (a later confirmed vote replaces an earlier one). */
export const confirmedVote = (votes: readonly JournalVote[], proposalId: string) => votes.find(v => v.proposalId === proposalId && v.state === 'CONFIRMED');
