'use client';
import type {ReactNode} from 'react';
import type {MoneyEntry} from '../../../lib/money-log/schema';
import {groupLine, type GroupSummary} from '../../../lib/money-log/groups';
import {formatDate} from '../../../lib/visual-format';
import './money-r4.css';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's grouped transactions, LEDGER #341): one line for a group of entries in
 * a list (This week, search results): its name, how many, what they add up to by Wealth → Spending's `totals`, and its
 * days; opened, each entry as the list shows it, and "Ungroup". The figures elsewhere still count each entry.
 */
export function GroupItem({group, shown, entry, onUngroup, money}: {group: GroupSummary; shown: readonly MoneyEntry[]; entry: (e: MoneyEntry) => ReactNode; onUngroup?: (g: GroupSummary) => void; money: (cents: number, currency: string) => string}) {
  const days = group.from === group.to ? formatDate(group.from) : `${formatDate(group.from)} – ${formatDate(group.to)}`;
  return <li className="money-group">
    <details>
      <summary><span className="money-group-what"><strong>{group.name}</strong> <span className="fine">· a group · {days}</span></span><span className="money-group-line fine" data-private-amount>{groupLine(group, money)}</span></summary>
      {shown.length < group.entries.length && <p className="fine">{shown.length} of its {group.entries.length} entries are in this list.</p>}
      <ul className="spending-entries money-group-entries" aria-label={`Entries in ${group.name}`}>{shown.map(e => entry(e))}</ul>
      {onUngroup && <button type="button" className="quiet" aria-label={`Ungroup ${group.name}`} onClick={() => onUngroup(group)}>Ungroup</button>}
    </details>
  </li>;
}
