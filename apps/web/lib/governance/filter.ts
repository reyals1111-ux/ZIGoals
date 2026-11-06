import type {ProposalState} from './wire';

/**
 * Session AL (Part 15, P-BN-74 / P-BN-75; BN-175, C-BN-09, C-BN-10): Governance's list filters, Open / Passed / Rejected,
 * and a search over the proposal's number, title and summary. Pure; the page keeps the choice for the visit only.
 */
export const PROPOSAL_FILTERS = [['all', 'All'], ['open', 'Open'], ['passed', 'Passed'], ['rejected', 'Rejected or failed']] as const;
export type ProposalFilter = typeof PROPOSAL_FILTERS[number][0];
type Listed = {id: string; state: ProposalState; title: string; summary: string};
const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const inFilter = (state: ProposalState, filter: ProposalFilter) =>
  filter === 'all' || (filter === 'open' ? state === 'voting' || state === 'deposit' : filter === 'passed' ? state === 'passed' : state === 'rejected' || state === 'failed');
/** The proposals that fit the filter and every word of the query ("#43" or "43" finds proposal 43). */
export function filterProposals<P extends Listed>(list: readonly P[], filter: ProposalFilter, query: string): P[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return list.filter(p => inFilter(p.state, filter) && words.every(w => {
    const n = w.replace(/^#/, '');
    return (/^\d+$/.test(n) && p.id === n) || fold(`${p.title} ${p.summary}`).includes(w);
  }));
}
export const filterCount = (list: readonly Listed[], filter: ProposalFilter) => list.filter(p => inFilter(p.state, filter)).length;
