'use client';
import {useMemo} from 'react';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {markFine, unusualEntries} from '../../../lib/money-more/alerts';
import {formatDate} from '../../../lib/visual-format';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {moneyCents} from '../money-tools/format';

/**
 * Session AV lane 2, round 2 (money; Emma's unusual-transaction alerts): one calm line in Spending when an entry of the
 * last two weeks is well above its payee's (or category's) usual — a fact from the log, with "That's fine" (Undo takes
 * the mark off). Its own chunk.
 */
export default function UnusualLine({entries, today, update, onEdit}: {entries: readonly MoneyEntry[]; today: string; update: (fn: (log: MoneyLog) => MoneyLog) => unknown; onEdit: (e: MoneyEntry) => void}) {
  const found = useMemo(() => unusualEntries(entries, today), [entries, today]);
  if (!found.length) return null;
  return <ul className="spending-unusual" aria-label="Entries above their usual">{found.slice(0, 3).map(u => <li key={u.entry.id}>
    <span><strong>{u.name}</strong> {moneyCents(u.cents, u.entry.currency)} on {formatDate(u.entry.date, {year: false})} is well above its usual {moneyCents(u.usual, u.entry.currency)} <span className="fine">(the middle of its last {u.seen} {u.basis === 'payee' ? 'at this payee' : `in ${u.entry.category}`})</span>.</span>
    <span className="spending-unusual-actions">
      <button type="button" className="text-link" aria-label={`Open ${u.name} of ${formatDate(u.entry.date)}`} onClick={() => onEdit(u.entry)}>Open</button>
      <button type="button" className="quiet" aria-label={`That's fine: ${u.name} of ${formatDate(u.entry.date)}`} onClick={() => { void changeWithUndo(update, log => markFine(log, u.entry.id), `${u.name}: marked fine. It is not named again.`, {undone: 'Named again.', undoLabel: `Undo: ${u.name} fine`}); }}>That&rsquo;s fine</button>
    </span>
  </li>)}</ul>;
}
