/**
 * Session AL fifth pass (N-167, AL-COPY-036): a goal's records in plain words. The goal timeline's Record details said
 * "Evidence source LOCAL_EDIT" and a raw record id ("change:1749…:allocation:bc1c…"), its rows "local edit" and
 * "retained milestone"; the Wealth module "UNKNOWN · MANUAL". A completed project's row read "4 USD" (DV-041b, NB-098):
 * a project counts milestones, never money.
 */
import {formatGoalAmount} from '../goal-summary';
import {formatUnits} from '@zigoals/chain-config';
import {plural} from '../plural';

const PROVENANCE_WORDS: Record<string, string> = {
  LOCAL_EDIT: 'Your change, on this device',
  LOCAL_CONFIRMED: 'Recorded by you, on this device',
  MANUAL_ATTRIBUTION: 'Added by you',
  CHAIN_CONFIRMED: 'Confirmed on ZIGChain',
  REWARD_INCOME: 'Reward or income you recorded',
  RETAINED_PLAN_REVISION: 'Kept from your plan’s changes',
  RETAINED_MILESTONE: 'Kept in the goal’s history',
  PRIVATE_SNAPSHOT: 'A value reading on this device',
  INCOMPLETE_EVIDENCE: 'A value reading with something missing',
  PRIVATE_EDIT: 'Your change, on this device',
  MANUAL: 'Entered by you',
};

/** Where a goal record comes from, in words; an unknown code reads as a sentence, never in capitals with underscores. */
export function provenanceWords(code: string): string {
  const known = PROVENANCE_WORDS[code];
  if (known) return known;
  const text = code.replaceAll('_', ' ').trim().toLowerCase();
  return text ? text[0]!.toUpperCase() + text.slice(1) : 'Not recorded';
}

const LIQUIDITY_WORDS: Record<string, string> = {LIQUID: 'Can be moved', BONDED: 'Staked', UNBONDING: 'Unbonding', LOCKED: 'Locked', UNKNOWN: 'Liquidity not known'};
const VERIFICATION_WORDS: Record<string, string> = {VERIFIED_READ_ONLY: 'Read from the chain', MANUAL: 'Entered by you', RESEARCH_ONLY: 'Not connected', EXECUTION_READY: 'Connected', EXECUTABLE: 'Connected'};
/** A source's liquidity and how it is known ("Liquidity not known · Entered by you", not "UNKNOWN · MANUAL"). */
export function sourceStateWords(liquidity: string, verification: string): string {
  return `${LIQUIDITY_WORDS[liquidity] ?? provenanceWords(liquidity)} · ${VERIFICATION_WORDS[verification] ?? provenanceWords(verification)}`;
}

/** A timeline row's amount: milestones for a project, otherwise the goal's own amount ("3 books", "US$4.00"). */
export function timelineAmount(event: {quantity?: string; asset?: string; decimals?: number}, goal: {type: string; asset: string; decimals: number}): string {
  if (!event.quantity) return '';
  if (goal.type === 'PROJECT') { const n = Number(formatUnits(event.quantity, event.decimals ?? goal.decimals)); return Number.isFinite(n) ? `${n} ${plural(n, 'milestone')}` : ''; }
  return formatGoalAmount(formatUnits(event.quantity, event.decimals ?? goal.decimals), event.asset ?? goal.asset);
}
