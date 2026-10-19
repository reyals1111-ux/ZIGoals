import {proposalsWireSchema, voteWireSchema, type GovNetwork, type ProposalsWire, type VoteWire} from './wire';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16): the Governance page's reads, all to ZIGoals' own routes (same origin, no
 * cookies, no referrer, never cached). Proposals are address-free; the vote read carries the connected address to the
 * read-only relay, as /api/positions does, and is asked only for a proposal in its voting period. Every answer is parsed
 * against its fixed wire shape; anything else reads as unavailable with a plain reason, never as an empty list.
 */
export type Read<T> = {phase: 'ok'; wire: T} | {phase: 'unavailable'; reason: string};
const GET = {method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'} as const;
async function read<T>(url: string, parse: (value: unknown) => T, unavailable: (wire: T) => string | undefined): Promise<Read<T>> {
  try {
    const response = await fetch(url, {...GET, signal: AbortSignal.timeout(45_000)});
    if (response.status === 429) return {phase: 'unavailable', reason: 'Too many reads just now. Try again in a minute.'};
    if (!response.ok) return {phase: 'unavailable', reason: 'ZIGoals could not read this just now.'};
    const wire = parse(await response.json());
    const reason = unavailable(wire);
    return reason ? {phase: 'unavailable', reason} : {phase: 'ok', wire};
  } catch { return {phase: 'unavailable', reason: 'ZIGoals could not read this just now.'}; }
}
export const readProposals = (network: GovNetwork): Promise<Read<ProposalsWire>> =>
  read(`/api/chain/proposals?network=${network}`, v => proposalsWireSchema.parse(v), w => w.status === 'unavailable' ? w.reason : undefined);
export const readVote = (network: GovNetwork, proposalId: string, voter: string): Promise<Read<VoteWire>> =>
  read(`/api/chain/vote?${new URLSearchParams({network, proposal: proposalId, voter})}`, v => voteWireSchema.parse(v), w => w.status === 'unavailable' ? w.reason : w.proposalId !== proposalId ? 'The answer was for another proposal.' : undefined);
