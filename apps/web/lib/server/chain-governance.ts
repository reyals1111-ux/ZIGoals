import * as z from 'zod';
import {MAX_PROPOSALS, proposalsWireSchema, sourceOf, voteWireSchema, type GovParams, type ProposalWire, type ProposalsWire, type ProposalState, type Tally, type VoteChoiceWire, type VoteWire} from '../governance/wire';
import {azigOf, lcdReader, secondsOf, type ChainNetwork} from './chain-lcd';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H42, H46, H58; P6.5, P6.6; `TIER 3 (egress routes)`): the governance reads
 * behind GET /api/chain/proposals, /api/chain/proposal and /api/chain/vote. Read by ZIGoals' server from the network's
 * official LCD only (api.zigchain.com, testnet-api.zigchain.com), every read at one block height (lib/server/chain-lcd.ts).
 * Paths (each read once live on 2026-10-19 00:15 UTC to confirm its shape; docs/handoff/af-lanes/L2a.md "Chunk 3"):
 *   /cosmos/gov/v1/proposals?pagination.reverse=true&pagination.limit=20 · /cosmos/gov/v1/proposals/{id} ·
 *   /cosmos/gov/v1/proposals/{id}/tally (voting proposals only) · /cosmos/gov/v1/params/tallying (its `params` carries
 *   every governance parameter) · /cosmos/staking/v1beta1/pool · /cosmos/gov/v1/proposals/{id}/votes/{voter}.
 * The proposer's title and summary are kept as plain text (control and direction-override characters removed, capped).
 * Nothing here logs; the vote read is the only one that takes an address, and only to ask the chain for that vote.
 */
const units = z.string().regex(/^(0|[1-9]\d{0,77})$/);
const decimal = z.string().regex(/^\d{1,3}(\.\d{1,18})?$/);
const time = z.iso.datetime({offset: true});
const tallyRow = z.object({yes_count: units, abstain_count: units, no_count: units, no_with_veto_count: units});
const proposalRow = z.object({
  id: z.string().regex(/^[1-9]\d{0,18}$/),
  messages: z.array(z.object({'@type': z.string().max(300)}).loose()).max(100),
  status: z.string().max(60),
  final_tally_result: tallyRow.nullable().optional(),
  submit_time: time,
  deposit_end_time: time.nullable().optional(),
  total_deposit: z.array(z.unknown()).max(50).nullable().optional(),
  voting_start_time: time.nullable().optional(),
  voting_end_time: time.nullable().optional(),
  metadata: z.string().max(20_000).nullable().optional(),
  title: z.string().max(20_000).nullable().optional(),
  summary: z.string().max(200_000).nullable().optional(),
  expedited: z.boolean().nullable().optional(),
  failed_reason: z.string().max(20_000).nullable().optional(),
}).loose();
type ProposalRow = z.infer<typeof proposalRow>;
const paramsRow = z.object({params: z.object({
  min_deposit: z.array(z.unknown()).max(50), max_deposit_period: z.string(), voting_period: z.string(),
  quorum: decimal, threshold: decimal, veto_threshold: decimal,
  expedited_voting_period: z.string().optional(), expedited_threshold: decimal.optional(), expedited_min_deposit: z.array(z.unknown()).max(50).optional(),
  burn_vote_veto: z.boolean().optional(),
}).loose()});
const poolRow = z.object({pool: z.object({bonded_tokens: units})});
const STATES: Readonly<Record<string, ProposalState>> = {
  PROPOSAL_STATUS_DEPOSIT_PERIOD: 'deposit', PROPOSAL_STATUS_VOTING_PERIOD: 'voting', PROPOSAL_STATUS_PASSED: 'passed',
  PROPOSAL_STATUS_REJECTED: 'rejected', PROPOSAL_STATUS_FAILED: 'failed',
};
/** The proposer's text as plain text: no control characters (line breaks kept), no direction overrides, capped. */
export function plainText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩﻿]/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}
/** The title from the proposal, or from its JSON metadata (older proposals), or "Proposal #id". */
function titleOf(row: ProposalRow): string {
  const own = plainText(row.title, 300);
  if (own) return own;
  if (typeof row.metadata === 'string' && row.metadata.trimStart().startsWith('{')) {
    try { const meta = JSON.parse(row.metadata) as {title?: unknown}; const fromMeta = plainText(meta?.title, 300); if (fromMeta) return fromMeta; } catch { /* not JSON */ }
  }
  return `Proposal #${row.id}`;
}
function summaryOf(row: ProposalRow): string {
  const own = plainText(row.summary, 4000);
  if (own) return own;
  if (typeof row.metadata === 'string' && row.metadata.trimStart().startsWith('{')) {
    try { const meta = JSON.parse(row.metadata) as {summary?: unknown}; return plainText(meta?.summary, 4000); } catch { /* not JSON */ }
  }
  return '';
}
const ZERO: Tally = {yes: '0', no: '0', abstain: '0', noWithVeto: '0'};
const tallyOf = (row: z.infer<typeof tallyRow> | null | undefined): Tally => row ? {yes: row.yes_count, no: row.no_count, abstain: row.abstain_count, noWithVeto: row.no_with_veto_count} : ZERO;
/** The chain writes "never" as a zero time or null; both mean no time yet. */
const timeOrNull = (value: string | null | undefined) => !value || value.startsWith('0001-01-01') ? null : new Date(value).toISOString();
function proposalOf(row: ProposalRow, live?: Tally): ProposalWire {
  const state = STATES[row.status] ?? 'unknown';
  const messageTypes = row.messages.slice(0, 20).map(m => /^\/[A-Za-z0-9_.]{1,199}$/.test(m['@type']) ? m['@type'] : '/unknown');
  return {
    id: row.id, state, title: titleOf(row), summary: summaryOf(row), messageTypes,
    submitTime: new Date(row.submit_time).toISOString(), depositEndTime: timeOrNull(row.deposit_end_time),
    votingStartTime: timeOrNull(row.voting_start_time), votingEndTime: timeOrNull(row.voting_end_time),
    totalDeposit: azigOf(row.total_deposit), expedited: row.expedited === true, failedReason: plainText(row.failed_reason, 300),
    tally: state === 'voting' ? live ?? ZERO : state === 'deposit' ? ZERO : tallyOf(row.final_tally_result),
    tallyKind: state === 'voting' ? 'live' : state === 'deposit' ? 'none' : 'final',
  };
}
function paramsOf(value: unknown): GovParams {
  const p = paramsRow.parse(value).params;
  return {
    votingPeriodSeconds: secondsOf(p.voting_period), expeditedVotingPeriodSeconds: p.expedited_voting_period ? secondsOf(p.expedited_voting_period) : 0,
    depositPeriodSeconds: secondsOf(p.max_deposit_period), minDeposit: azigOf(p.min_deposit), expeditedMinDeposit: azigOf(p.expedited_min_deposit ?? []),
    quorum: p.quorum, threshold: p.threshold, vetoThreshold: p.veto_threshold, expeditedThreshold: p.expedited_threshold ?? p.threshold, burnVoteVeto: p.burn_vote_veto === true,
  };
}
async function liveTallies(read: ReturnType<typeof lcdReader>, height: string, rows: readonly ProposalRow[]): Promise<Map<string, Tally>> {
  const voting = rows.filter(r => r.status === 'PROPOSAL_STATUS_VOTING_PERIOD').slice(0, MAX_PROPOSALS);
  const tallies = await Promise.all(voting.map(async r => tallyOf(z.object({tally: tallyRow}).parse(await read.get(`/cosmos/gov/v1/proposals/${r.id}/tally`, height)).tally)));
  return new Map(voting.map((r, i) => [r.id, tallies[i]!]));
}
/** The newest proposals (any state), the governance parameters and the bonded total, at one height. */
export async function readProposals(network: ChainNetwork, fetcher: typeof fetch = fetch): Promise<ProposalsWire> {
  const read = lcdReader(network, fetcher);
  const {height, observedAt} = await read.latest();
  const [list, params, pool] = await Promise.all([
    read.get(`/cosmos/gov/v1/proposals?pagination.reverse=true&pagination.limit=${MAX_PROPOSALS}`, height),
    read.get('/cosmos/gov/v1/params/tallying', height),
    read.get('/cosmos/staking/v1beta1/pool', height),
  ]);
  const rows = z.object({proposals: z.array(proposalRow).max(MAX_PROPOSALS)}).parse(list).proposals;
  const live = await liveTallies(read, height, rows);
  return proposalsWireSchema.parse({version: 1, status: 'ok', network, source: read.source, height, observedAt, params: paramsOf(params), bondedTotal: poolRow.parse(pool).pool.bonded_tokens, proposals: rows.map(r => proposalOf(r, live.get(r.id)))});
}
/** One proposal by number (an empty list when the chain has none with that number). */
export async function readProposal(network: ChainNetwork, id: string, fetcher: typeof fetch = fetch): Promise<ProposalsWire> {
  if (!/^[1-9]\d{0,18}$/.test(id)) throw Error('Unsupported proposal number.');
  const read = lcdReader(network, fetcher);
  const {height, observedAt} = await read.latest();
  const [one, params, pool] = await Promise.all([
    read.get(`/cosmos/gov/v1/proposals/${id}`, height, [5]),
    read.get('/cosmos/gov/v1/params/tallying', height),
    read.get('/cosmos/staking/v1beta1/pool', height),
  ]);
  const rows = one === null ? [] : [z.object({proposal: proposalRow}).parse(one).proposal];
  if (rows[0] && rows[0].id !== id) throw Error('The chain answered for another proposal.');
  const live = await liveTallies(read, height, rows);
  return proposalsWireSchema.parse({version: 1, status: 'ok', network, source: read.source, height, observedAt, params: paramsOf(params), bondedTotal: poolRow.parse(pool).pool.bonded_tokens, proposals: rows.map(r => proposalOf(r, live.get(r.id)))});
}
const OPTIONS: Readonly<Record<string, VoteChoiceWire>> = {
  VOTE_OPTION_YES: 'yes', VOTE_OPTION_ABSTAIN: 'abstain', VOTE_OPTION_NO: 'no', VOTE_OPTION_NO_WITH_VETO: 'no_with_veto',
};
/** The address's vote on a proposal during its voting period (null: none; the chain keeps no votes after the tally). */
export async function readVote(network: ChainNetwork, id: string, voter: string, fetcher: typeof fetch = fetch): Promise<VoteWire> {
  if (!/^[1-9]\d{0,18}$/.test(id) || !/^zig1[02-9ac-hj-np-z]{38}$/.test(voter)) throw Error('Unsupported vote query.');
  const read = lcdReader(network, fetcher);
  const {height, observedAt} = await read.latest();
  const value = await read.get(`/cosmos/gov/v1/proposals/${id}/votes/${voter}`, height, [3, 5]);
  if (value === null) return voteWireSchema.parse({version: 1, status: 'ok', network, source: read.source, height, observedAt, proposalId: id, vote: null});
  const vote = z.object({vote: z.object({proposal_id: z.string(), voter: z.string(), options: z.array(z.object({option: z.string().max(40), weight: decimal})).min(1).max(4)}).loose()}).parse(value).vote;
  if (vote.proposal_id !== id || vote.voter !== voter) throw Error('The chain answered for another vote.');
  const options = vote.options.map(o => { const option = OPTIONS[o.option]; if (!option) throw Error('A vote option this build does not know.'); return {option, weight: o.weight}; });
  return voteWireSchema.parse({version: 1, status: 'ok', network, source: read.source, height, observedAt, proposalId: id, vote: {options}});
}
export const GOVERNANCE_UNAVAILABLE = 'The chain did not answer just now, so proposals are unavailable. Try again in a minute.';
export const VOTE_UNAVAILABLE = 'The chain did not answer just now, so your vote could not be read. Try again in a minute.';
export const unavailableProposals = (network: ChainNetwork, reason = GOVERNANCE_UNAVAILABLE): ProposalsWire =>
  proposalsWireSchema.parse({version: 1, status: 'unavailable', reason, network, source: sourceOf(network), proposals: []});
export const unavailableVote = (network: ChainNetwork, proposalId: string, reason = VOTE_UNAVAILABLE): VoteWire =>
  voteWireSchema.parse({version: 1, status: 'unavailable', reason, network, source: sourceOf(network), proposalId, vote: null});
/** How long an answer is kept: 30 s while any proposal in it is being voted on, otherwise 2 minutes. */
export const proposalsTtl = (wire: ProposalsWire) => wire.proposals.some(p => p.state === 'voting') ? 30_000 : 120_000;
