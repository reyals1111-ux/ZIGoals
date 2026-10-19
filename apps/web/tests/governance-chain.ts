import {expect, type Page} from '@playwright/test';
import recorded from './fixtures/chain/governance-lcd-2026-10-19.json' with {type: 'json'};
import {CHAIN, ME, ZIG, relay} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a): the governance specs' doubles. ZIGoals' own /api/chain/proposals and /api/chain/vote
 * answered with wire answers built from the LCD reads recorded on 2026-10-19 (tests/fixtures/chain/governance-lcd-
 * 2026-10-19.json) — the ended proposals as the chain answered — plus one FICTIONAL proposal in its voting period on the
 * practice network (none was open at the read), in the same shape. Positions and validators come from staking-chain.ts.
 * Every request the page makes to /api/chain/* is recorded; nothing reaches a chain host.
 */
type Network = 'practice' | 'real';
const rows = (network: Network) => network === 'real' ? recorded.mainnet : recorded.testnet;
const iso = (t: string | null | undefined) => !t ? null : new Date(t).toISOString();
const STATE: Record<string, string> = {PROPOSAL_STATUS_VOTING_PERIOD: 'voting', PROPOSAL_STATUS_PASSED: 'passed', PROPOSAL_STATUS_REJECTED: 'rejected', PROPOSAL_STATUS_FAILED: 'failed', PROPOSAL_STATUS_DEPOSIT_PERIOD: 'deposit'};
export const VOTING_ID = '122';
export const VOTING_TITLE = 'Fictional: raise the active validator set to 15';
type Row = {id: string; messages: {'@type': string}[]; status: string; final_tally_result: {yes_count: string; abstain_count: string; no_count: string; no_with_veto_count: string}; submit_time: string; deposit_end_time: string; total_deposit: {denom: string; amount: string}[]; voting_start_time: string; voting_end_time: string; title: string; summary: string; expedited: boolean; failed_reason: string};
function wireOf(row: Row) {
  const t = row.final_tally_result;
  return {id: row.id, state: STATE[row.status] ?? 'unknown', title: row.title, summary: row.summary, messageTypes: row.messages.map(m => m['@type']), submitTime: iso(row.submit_time)!, depositEndTime: iso(row.deposit_end_time), votingStartTime: iso(row.voting_start_time), votingEndTime: iso(row.voting_end_time),
    totalDeposit: row.total_deposit.find(c => c.denom === 'azig')?.amount ?? '0', expedited: row.expedited, failedReason: row.failed_reason, tally: {yes: t.yes_count, no: t.no_count, abstain: t.abstain_count, noWithVeto: t.no_with_veto_count}, tallyKind: 'final'};
}
const params = (network: Network) => { const p = rows(network).paramsTallying.params; return {votingPeriodSeconds: parseInt(p.voting_period), expeditedVotingPeriodSeconds: parseInt(p.expedited_voting_period), depositPeriodSeconds: parseInt(p.max_deposit_period), minDeposit: p.min_deposit[0]!.amount, expeditedMinDeposit: p.expedited_min_deposit[0]!.amount, quorum: p.quorum, threshold: p.threshold, vetoThreshold: p.veto_threshold, expeditedThreshold: p.expedited_threshold, burnVoteVeto: p.burn_vote_veto}; };
/** The fictional open proposal: 10 minutes of voting left; 36 % turnout, passing so far. */
export function votingProposal(summary = 'Fictional proposal for the tests: one more active validator.') {
  const start = Date.now() - 2 * 60_000;
  return {id: VOTING_ID, state: 'voting', title: VOTING_TITLE, summary, messageTypes: ['/cosmos.staking.v1beta1.MsgUpdateParams'], submitTime: new Date(start).toISOString(), depositEndTime: new Date(start + 1_209_600_000).toISOString(), votingStartTime: new Date(start).toISOString(), votingEndTime: new Date(start + 600_000).toISOString(),
    totalDeposit: ZIG(100), expedited: false, failedReason: '', tally: {yes: ZIG(300000), no: ZIG(50000), abstain: ZIG(10000), noWithVeto: '0'}, tallyKind: 'live'};
}
export function proposalsWire(network: Network, {voting = network === 'practice', summary}: {voting?: boolean; summary?: string} = {}) {
  return {version: 1, status: 'ok', network: CHAIN[network], source: network === 'real' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com', height: network === 'real' ? '13050000' : '8290599', observedAt: '2026-10-19T00:15:28.123Z',
    params: params(network), bondedTotal: ZIG(1_000_000), proposals: [...(voting ? [votingProposal(summary)] : []), ...(rows(network).proposals.proposals as unknown as Row[]).map(wireOf)]};
}
export type GovScript = {
  proposals?: (network: string) => unknown;
  /** The chain's vote answer for the connected address (null: not voted). */
  vote?: (proposal: string) => {option: string} | null;
  staked?: Record<string, string>;
};
/** Positions (staking-chain's relay) plus the governance routes; returns every /api/chain/* request made. */
export async function governanceRelay(page: Page, network: Network = 'practice', script: GovScript = {}) {
  await relay(page, network, () => ({...(script.staked ? {staked: script.staked} : {})}));
  const asked: URL[] = [];
  await page.route('**/api/chain/proposals?**', route => {
    const url = new URL(route.request().url()); asked.push(url);
    const answer = script.proposals?.(url.searchParams.get('network')!) ?? proposalsWire(url.searchParams.get('network') === 'zigchain-1' ? 'real' : 'practice');
    return route.fulfill({json: answer});
  });
  await page.route('**/api/chain/vote?**', route => {
    const url = new URL(route.request().url()); asked.push(url);
    expect(url.searchParams.get('voter')).toBe(ME);
    const id = url.searchParams.get('proposal')!, network = url.searchParams.get('network')!;
    const vote = script.vote?.(id) ?? null;
    return route.fulfill({json: {version: 1, status: 'ok', network, source: network === 'zigchain-1' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com', height: '8290600', observedAt: '2026-10-19T00:16:00.000Z', proposalId: id, vote: vote ? {options: [{option: vote.option, weight: '1.000000000000000000'}]} : null}});
  });
  return asked;
}
export async function openGovernance(page: Page) {
  await page.goto('/app/governance');
  await expect(page.getByRole('heading', {level: 1, name: 'Governance'})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  return page.locator('.governance-page');
}
