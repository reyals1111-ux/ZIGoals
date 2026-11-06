import {expect, test} from 'vitest';
import {filterCount, filterProposals} from './filter';

// Session AL (Part 15, P-BN-74/P-BN-75; BN-175): Open / Passed / Rejected filters and a search on Governance.
const list = [
  {id: '44', state: 'voting' as const, title: 'Raise the active set', summary: 'More validators'},
  {id: '43', state: 'passed' as const, title: 'Community pool spend', summary: 'Fund the explorer'},
  {id: '42', state: 'rejected' as const, title: 'Lower the fee', summary: 'Café fees'},
  {id: '41', state: 'failed' as const, title: '[COMPANY_NAME] test', summary: ''},
  {id: '40', state: 'deposit' as const, title: 'Upgrade v6', summary: 'Software upgrade'},
];
test('BN-175: each filter keeps its states', () => {
  expect(filterProposals(list, 'open', '').map(p => p.id)).toEqual(['44', '40']);
  expect(filterProposals(list, 'passed', '').map(p => p.id)).toEqual(['43']);
  expect(filterProposals(list, 'rejected', '').map(p => p.id)).toEqual(['42', '41']);
  expect(filterProposals(list, 'all', '')).toHaveLength(5);
  expect(filterCount(list, 'open')).toBe(2);
});
test('C-BN-10: search by number, title or summary, accents and case ignored', () => {
  expect(filterProposals(list, 'all', '#43').map(p => p.id)).toEqual(['43']);
  expect(filterProposals(list, 'all', '42').map(p => p.id)).toEqual(['42']);
  expect(filterProposals(list, 'all', 'CAFE').map(p => p.id)).toEqual(['42']);
  expect(filterProposals(list, 'all', 'upgrade software').map(p => p.id)).toEqual(['40']);
  expect(filterProposals(list, 'passed', 'fee')).toEqual([]);
});
