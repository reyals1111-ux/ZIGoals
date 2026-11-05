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
/**
 * Session AL fourth pass (C-BN-17): "Value locked, largest first", from the page's one DefiLlama read. Only some projects
 * have a read (DefiLlama tracks five of eighteen); the rest follow in directory order, and the option's own words say so.
 * The page offers it beside SORTS and passes `valueLocked` (a project id → its value locked in USD, or null when unknown).
 */
export const VALUE_SORT = ['value', 'Value locked, largest first (projects with a read)'] as const;
export type ValueSort = typeof VALUE_SORT[0];
export function viewDirectory<E extends {id: string; name: string}>(entries: readonly E[], status: StatusFilter, sort: DirectorySort | ValueSort, valueLocked?: (id: string) => number | null): E[] {
  const kept = entries.filter(e => status === 'any' || groupOf(e.id) === status);
  if (sort === 'value') {
    const v = (id: string) => { const x = valueLocked?.(id); return typeof x === 'number' && Number.isFinite(x) ? x : null; };
    return kept.map((e, i) => [e, i, v(e.id)] as const).sort((a, b) => a[2] === null && b[2] === null ? a[1] - b[1] : a[2] === null ? 1 : b[2] === null ? -1 : b[2] - a[2] || a[1] - b[1]).map(([e]) => e);
  }
  if (sort === 'name') return [...kept].sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}));
  if (sort === 'status') return kept.map((e, i) => [e, i] as const).sort((a, b) => rankOf(a[0].id) - rankOf(b[0].id) || a[1] - b[1]).map(([e]) => e);
  return kept;
}
/**
 * Session AL third pass (Part 15, C-BN-15 / P-BN-80): "Only projects with an audit report listed" — the registry's own
 * audit references (provider.audits). A listed report is a dated review of some code, never a safety rating; the page
 * says so beside the box.
 */
export function withAuditReports<E extends {provider: {audits: readonly unknown[]}}>(entries: readonly E[], only: boolean): E[] {
  return only ? entries.filter(e => e.provider.audits.length > 0) : [...entries];
}

/**
 * Session AL fourth pass (BN-027, B-122): the header's "Sources last read" is the newest read on the page: the directory's
 * own dated sources, or the live value-locked read when it is newer (a local day, as the cards show it).
 */
export function sourcesReadDay(directoryDay: string, liveFetchedAt: string | null | undefined, localDay: (iso: string) => string): string {
  if (!liveFetchedAt || Number.isNaN(Date.parse(liveFetchedAt))) return directoryDay;
  const live = localDay(liveFetchedAt);
  return /^\d{4}-\d{2}-\d{2}$/.test(live) && live > directoryDay ? live : directoryDay;
}
