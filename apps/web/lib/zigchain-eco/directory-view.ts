import {directoryStatusOf, type DirectoryStatusKind} from './directory-status';

/**
 * Session AL (Part 15, P-BN-82 / P-BN-83; BN-096, C-BN-17, C-BN-18): the Ecosystem's status filter and sort. Statuses
 * are the dated lines of directory-status.ts; a project without one counts as "Not live yet or listed". Pure.
 */
export const STATUS_FILTERS = [['any', 'Any status'], ['live', 'Live'], ['ending', 'Closing or paused'], ['other', 'Not live yet or listed']] as const;
export type StatusFilter = typeof STATUS_FILTERS[number][0];
// Session AL (P14-A, C-BN-18 run 2): no sort option starts with "Status", so the Sort list never reads as a second Status
// control (a label that wraps its select carries the options' words too).
export const SORTS = [['directory', 'Directory order'], ['name', 'Name, A to Z'], ['status', 'Live projects first']] as const;
export type DirectorySort = typeof SORTS[number][0];
const GROUP: Readonly<Record<DirectoryStatusKind, Exclude<StatusFilter, 'any'>>> = {live: 'live', tool: 'live', closing: 'ending', paused: 'ending', 'winding-down': 'ending', 'not-live': 'other', partner: 'other', private: 'other'};
const RANK: Readonly<Record<DirectoryStatusKind, number>> = {live: 0, tool: 1, closing: 2, 'winding-down': 3, paused: 4, private: 5, 'not-live': 6, partner: 7};
const groupOf = (id: string) => { const s = directoryStatusOf(id); return s ? GROUP[s.kind] : 'other'; };
const rankOf = (id: string) => { const s = directoryStatusOf(id); return s ? RANK[s.kind] : 8; };
export function viewDirectory<E extends {id: string; name: string}>(entries: readonly E[], status: StatusFilter, sort: DirectorySort): E[] {
  const kept = entries.filter(e => status === 'any' || groupOf(e.id) === status);
  if (sort === 'name') return [...kept].sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
  if (sort === 'status') return kept.map((e, i) => [e, i] as const).sort((a, b) => rankOf(a[0].id) - rankOf(b[0].id) || a[1] - b[1]).map(([e]) => e);
  return kept;
}
