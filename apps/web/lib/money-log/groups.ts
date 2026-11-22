import {totals, type Totals} from './engine';
import {MAX_GROUP, type MoneyEntry, type MoneyLog} from './schema';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's grouped transactions, LEDGER #341): up to 20 entries — a weekend away,
 * a purchase and its refund — shown as one line with a name and their total, opened to show each. Grouping changes how a
 * list shows them, never what the figures count: every total, budget, report and insight still counts each entry on its
 * own, as it is. The group lives on each entry (`group: {id, name}`, loose and optional). Pure.
 */
export const GROUP_ID = /^[A-Za-z0-9_-]{1,80}$/;
/** The entries of the selection put in one group with this name (entries of another group move to this one). */
export function groupEntries(log: MoneyLog, ids: ReadonlySet<string>, name: string, groupId: string): MoneyLog {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean) throw new Error('Give the group a name, for example Weekend in Ghent.');
  if (clean.length > 40) throw new Error('A group name has at most 40 characters.');
  if (!GROUP_ID.test(groupId)) throw new Error('This group could not be made.');
  const picked = log.entries.filter(e => ids.has(e.id));
  if (picked.length < 2) throw new Error('Select at least two entries to group.');
  if (picked.length > MAX_GROUP) throw new Error(`A group holds up to ${MAX_GROUP} entries.`);
  return {...log, entries: log.entries.map(e => ids.has(e.id) ? {...e, group: {id: groupId, name: clean}} : e)};
}
/** Takes every entry out of the group; the entries themselves stay as they are. */
export function ungroup(log: MoneyLog, groupId: string): MoneyLog {
  return {...log, entries: log.entries.map(e => { if (e.group?.id !== groupId) return e; const {group: _g, ...rest} = e; void _g; return rest; })};
}
export function renameGroup(log: MoneyLog, groupId: string, name: string): MoneyLog {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 40) throw new Error('A group name has 1 to 40 characters.');
  return {...log, entries: log.entries.map(e => e.group?.id === groupId ? {...e, group: {...e.group, name: clean}} : e)};
}
export type GroupSummary = {id: string; name: string; entries: MoneyEntry[]; from: string; to: string;
  /** Wealth → Spending's own `totals` over the group's entries (left out, transfers and refunds not counted; a shared cost by the person's share). */
  totals: Totals[]; leftOut: number};
/** Every group in the log, its entries oldest first, newest group first. */
export function groupsOf(entries: readonly MoneyEntry[]): GroupSummary[] {
  const by = new Map<string, MoneyEntry[]>();
  for (const e of entries) if (e.group) by.set(e.group.id, [...(by.get(e.group.id) ?? []), e]);
  return [...by.entries()].map(([id, list]) => summary(id, list)).sort((a, b) => b.to.localeCompare(a.to) || a.name.localeCompare(b.name));
}
function summary(id: string, list: readonly MoneyEntry[]): GroupSummary {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)), from = sorted[0]!.date, to = sorted.at(-1)!.date;
  const name = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]!.group!.name;
  const counted = totals(list, from, to);
  return {id, name, entries: sorted, from, to, totals: counted, leftOut: list.length - counted.reduce((n, t) => n + t.count, 0)};
}
export type ListRow = {kind: 'entry'; entry: MoneyEntry} | {kind: 'group'; group: GroupSummary; shown: MoneyEntry[]};
/**
 * A list as shown (`list`, in its own order) with each group's entries folded into one row where its first entry is.
 * The row's total is over the whole group in the log (`all`), and it shows the group's entries that are in this list.
 * A group with one entry in the list still folds, so the person sees it belongs to a group.
 */
export function groupRows(list: readonly MoneyEntry[], all: readonly MoneyEntry[] = list): ListRow[] {
  const groups = new Map(groupsOf(all.filter(e => e.group)).map(g => [g.id, g])), seen = new Set<string>(), rows: ListRow[] = [];
  for (const e of list) {
    const g = e.group ? groups.get(e.group.id) : undefined;
    if (!g) { rows.push({kind: 'entry', entry: e}); continue; }
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    rows.push({kind: 'group', group: g, shown: list.filter(x => x.group?.id === g.id)});
  }
  return rows;
}
/** "4 entries · spent €182.40, received €20.00" for each currency (never converted); entries left out are said apart. */
export function groupLine(g: GroupSummary, money: (cents: number, currency: string) => string): string {
  const parts = g.totals.map(t => [t.expenses ? `spent ${money(t.expenses, t.currency)}` : '', t.income ? `received ${money(t.income, t.currency)}` : ''].filter(Boolean).join(', ')).filter(Boolean);
  return `${g.entries.length} ${g.entries.length === 1 ? 'entry' : 'entries'}${parts.length ? ` · ${parts.join(' · ')}` : ' · nothing counted'}${g.leftOut ? ` · ${g.leftOut} left out of the figures` : ''}`;
}
