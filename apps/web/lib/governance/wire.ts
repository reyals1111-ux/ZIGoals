import * as z from 'zod';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H46, H58; P6.5): the answers of `GET /api/chain/proposals?network=…`,
 * `GET /api/chain/proposal?network=…&id=…` and `GET /api/chain/vote?network=…&proposal=…&voter=…`, shared by the routes
 * (lib/server/chain-governance.ts) and the Governance page. Chain data read by ZIGoals' server from the network's official
 * LCD at one block height. The shape is fixed: strict objects; amounts are integer strings of azig; quorum, threshold and
 * veto are decimal strings as the chain writes them; times ISO. Proposal titles and summaries are the proposer's own text,
 * kept as plain text only (control characters removed, length capped) and never rendered as markup or links.
 * - `status: 'ok'` carries `height`, `observedAt` and the governance `params`; `status: 'unavailable'` carries a plain
 *   `reason` and no proposals (HTTP 200, H58).
 * - `tally` is the chain's final tally for an ended proposal, the live tally at `height` for one in its voting period
 *   (`tallyKind: 'live'`), and zero before voting starts (`'none'`). Counts before ZIGChain's v5 redenomination (6 to 18
 *   decimals) were stored in the old unit, so only shares of one proposal's own votes are compared, never counts across
 *   proposals; turnout against `bondedTotal` is shown for live tallies only.
 */
export const GOV_NETWORKS = ['zigchain-1', 'zig-test-2'] as const;
export type GovNetwork = typeof GOV_NETWORKS[number];
export const GOV_SOURCES = ['https://api.zigchain.com', 'https://testnet-api.zigchain.com'] as const;
export const sourceOf = (network: GovNetwork) => network === 'zigchain-1' ? GOV_SOURCES[0] : GOV_SOURCES[1];
export const MAX_PROPOSALS = 20;
export const PROPOSAL_STATES = ['deposit', 'voting', 'passed', 'rejected', 'failed', 'unknown'] as const;
export type ProposalState = typeof PROPOSAL_STATES[number];
export const VOTE_CHOICES = ['yes', 'abstain', 'no', 'no_with_veto'] as const;
export type VoteChoiceWire = typeof VOTE_CHOICES[number];
const azig = z.string().regex(/^(0|[1-9]\d{0,77})$/);
/** A non-negative decimal the chain writes ("0.334", "0.51", "1.000000000000000000"), at most 18 places. */
export const chainDecimal = z.string().regex(/^\d{1,3}(\.\d{1,18})?$/);
const iso = z.iso.datetime({offset: true});
const id = z.string().regex(/^[1-9]\d{0,18}$/);
export const tallySchema = z.object({yes: azig, no: azig, abstain: azig, noWithVeto: azig}).strict();
export type Tally = z.infer<typeof tallySchema>;
export const proposalWireSchema = z.object({
  id,
  state: z.enum(PROPOSAL_STATES),
  title: z.string().max(300),
  summary: z.string().max(4000),
  /** The type URLs of the messages the proposal would execute (data from the chain; empty for a text proposal). */
  messageTypes: z.array(z.string().max(200)).max(20),
  submitTime: iso,
  depositEndTime: iso.nullable(),
  votingStartTime: iso.nullable(),
  votingEndTime: iso.nullable(),
  totalDeposit: azig,
  expedited: z.boolean(),
  failedReason: z.string().max(300),
  tally: tallySchema,
  tallyKind: z.enum(['final', 'live', 'none']),
}).strict();
export type ProposalWire = z.infer<typeof proposalWireSchema>;
export const govParamsSchema = z.object({
  votingPeriodSeconds: z.number().int().positive().max(10 ** 9),
  expeditedVotingPeriodSeconds: z.number().int().min(0).max(10 ** 9),
  depositPeriodSeconds: z.number().int().min(0).max(10 ** 9),
  minDeposit: azig,
  expeditedMinDeposit: azig,
  quorum: chainDecimal,
  threshold: chainDecimal,
  vetoThreshold: chainDecimal,
  expeditedThreshold: chainDecimal,
  burnVoteVeto: z.boolean(),
}).strict();
export type GovParams = z.infer<typeof govParamsSchema>;
const envelope = {
  version: z.literal(1),
  status: z.enum(['ok', 'unavailable']),
  reason: z.string().max(300).optional(),
  network: z.enum(GOV_NETWORKS),
  source: z.enum(GOV_SOURCES),
  height: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  observedAt: iso.optional(),
};
const sameSource = (wire: {network: GovNetwork; source: string}, context: z.RefinementCtx) => {
  if (wire.source !== sourceOf(wire.network)) context.addIssue({code: 'custom', message: 'The source is the network\'s own LCD.'});
};
export const proposalsWireSchema = z.object({
  ...envelope,
  params: govParamsSchema.optional(),
  /** The bonded ZIG at `height` (staking pool), for a live tally's turnout against the quorum. */
  bondedTotal: azig.optional(),
  proposals: z.array(proposalWireSchema).max(MAX_PROPOSALS),
}).strict().superRefine((wire, context) => {
  sameSource(wire, context);
  if (wire.status === 'ok' && (!wire.height || !wire.observedAt || !wire.params || wire.bondedTotal === undefined || wire.reason !== undefined))
    context.addIssue({code: 'custom', message: 'An ok answer carries height, observedAt, params and bondedTotal, and no reason.'});
  if (wire.status === 'unavailable' && (!wire.reason || wire.proposals.length > 0)) context.addIssue({code: 'custom', message: 'An unavailable answer carries a reason and no proposals.'});
  if (new Set(wire.proposals.map(p => p.id)).size !== wire.proposals.length) context.addIssue({code: 'custom', message: 'Each proposal once.'});
});
export type ProposalsWire = z.infer<typeof proposalsWireSchema>;
export const voteWireSchema = z.object({
  ...envelope,
  proposalId: id,
  /** The address's vote as the chain holds it during the voting period; null when it has not voted (or the vote was
   *  already counted and removed at the end of voting: the chain keeps no votes after the tally). */
  vote: z.object({options: z.array(z.object({option: z.enum(VOTE_CHOICES), weight: chainDecimal}).strict()).min(1).max(4)}).strict().nullable(),
}).strict().superRefine((wire, context) => {
  sameSource(wire, context);
  if (wire.status === 'ok' && (!wire.height || !wire.observedAt || wire.reason !== undefined)) context.addIssue({code: 'custom', message: 'An ok answer carries height and observedAt, and no reason.'});
  if (wire.status === 'unavailable' && (!wire.reason || wire.vote !== null)) context.addIssue({code: 'custom', message: 'An unavailable answer carries a reason and no vote.'});
});
export type VoteWire = z.infer<typeof voteWireSchema>;
