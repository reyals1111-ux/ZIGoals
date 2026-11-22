'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import type {MoneyLog} from '../../../lib/money-log/schema';
import {monthGrid, rangeOf, SHEET_RANGES, sheetCsv, sheetFileName, sheetRows, sheetWorkbook, sortRows, type SheetRange, type SortKey} from '../../../lib/money-log/sheet';
import {XLSX_TYPE} from '../../../lib/export/xlsx';
import {saveFile} from '../../../lib/notes/doc-image';
import {formatDate, formatMonth, formatNumber} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import './money-r5.css';

/**
 * Session AV lane 2, round 5 (money; Tiller's Foundation Template, LEDGER #389): Wealth → Spending → "Your money as a
 * spreadsheet", its own chunk, opened from its fold: the money log as a sortable table for a range (this month, the last
 * 3 months, this year, everything), each category month by month, and two files made on this device — a CSV through the
 * export's own guard and one .xlsx workbook (Entries, Categories, Accounts, Month by month with SUM formulas), written
 * by hand with no package (lib/money-log/sheet.ts, lib/export/xlsx.ts). "Counted" and every month figure are the shared
 * rule's (`countedCents`, `countedByCategoryBetween`). Nothing is stored.
 */
const RANGE_WORDS: Record<SheetRange, string> = {month: 'This month', '3m': 'Last 3 months', year: 'This year', all: 'Everything'};
const SHOWN = 200;
const AS_WORDS = {counted: 'counted', 'left out': 'left out', transfer: 'a transfer'} as const;
export default function MoneySheet({log, today, label}: {log: MoneyLog; today: string; label: string}) {
  const id = useId(), accounts = useDeviceRecord(ACCOUNTS), [range, setRange] = useState<SheetRange>('month'), [sort, setSort] = useState<{key: SortKey; dir: 'ascending' | 'descending'}>({key: 'date', dir: 'descending'}), [said, setSaid] = useState('');
  const {from, to} = rangeOf(range, today, log.entries), all = sheetRows(log.entries, from, to), rows = sortRows(all, sort.key, sort.dir), grids = monthGrid(log.entries, from, to);
  const by = (key: SortKey) => setSort(s => ({key, dir: s.key === key && s.dir === 'descending' ? 'ascending' : 'descending'}));
  const head = (key: SortKey, words: string) => <th scope="col" aria-sort={sort.key === key ? sort.dir : 'none'}><button type="button" className="text-link money-sheet-sort" onClick={() => by(key)}>{words}<span aria-hidden="true">{sort.key === key ? (sort.dir === 'ascending' ? ' ↑' : ' ↓') : ''}</span></button></th>;
  const csv = () => { if (!all.length) { setSaid('No entries in this range to put in a file.'); return; } try { saveFile(sheetCsv(all), sheetFileName(from, to, 'csv'), 'text/csv;charset=utf-8'); setSaid(`A CSV of ${formatNumber(all.length)} ${all.length === 1 ? 'entry' : 'entries'} was made on this device.`); } catch { setSaid('The file could not be made on this device.'); } };
  const xlsx = () => { if (!all.length) { setSaid('No entries in this range to put in a file.'); return; } try { saveFile(sheetWorkbook({log, accounts: label !== 'business' && accounts.loaded && !accounts.unreadable ? accounts.data : null, business: label === 'business', from, to, today, modified: new Date()}), sheetFileName(from, to, 'xlsx'), XLSX_TYPE); setSaid(`A workbook of ${formatNumber(all.length)} ${all.length === 1 ? 'entry' : 'entries'} was made on this device: Entries, Categories, Accounts and Month by month.`); } catch { setSaid('The file could not be made on this device.'); } };
  return <div className="money-sheet" role="group" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`} className="visually-hidden">Your money as a spreadsheet</h4>
    <div className="money-sheet-ranges" role="group" aria-label="Which entries">{SHEET_RANGES.map(r => <button key={r} type="button" className="secondary" aria-pressed={range === r} onClick={() => setRange(r)}>{RANGE_WORDS[r]}</button>)}</div>
    <p className="fine">{formatDate(from)} to {formatDate(to)} · {formatNumber(all.length)} {all.length === 1 ? 'entry' : 'entries'}{all.length > SHOWN ? `; the newest ${SHOWN} are shown here, the files hold all of them` : ''}. “Counted” is what your figures count: your share of a shared cost, nothing for an entry left out or a transfer.</p>
    {all.length ? <div className="money-sheet-scroll" role="region" aria-label={`Entries table, ${label}`} tabIndex={0}><table className="money-sheet-table">
      <caption className="visually-hidden">Entries from {formatDate(from)} to {formatDate(to)}</caption>
      <thead><tr>{head('date', 'Date')}<th scope="col">Kind</th>{head('category', 'Category')}<th scope="col">Note</th>{head('amount', 'Amount')}<th scope="col">Counted</th><th scope="col">Account</th></tr></thead>
      <tbody>{rows.slice(0, SHOWN).map(r => <tr key={r.id}>
        <td>{formatDate(r.date, {year: false})}</td><td>{r.kind === 'income' ? 'in' : 'out'}</td><td>{r.category}{r.sub ? ` › ${r.sub}` : ''}</td><td>{r.note}</td>
        <td data-private-amount="">{r.kind === 'income' ? '+' : '−'}{moneyCents(r.amount, r.currency)}</td>
        <td data-private-amount="">{r.as === 'counted' ? moneyCents(r.counted, r.currency) : AS_WORDS[r.as]}{r.spread > 1 ? <span className="fine"> · over {r.spread} months</span> : null}</td><td>{r.account}</td>
      </tr>)}</tbody>
    </table></div> : <p className="fine">No entries in this range. Log spending or income, or choose a longer range.</p>}
    {grids.map(g => <div key={g.currency} className="money-sheet-scroll" role="region" aria-label={`Month by month, ${g.currency}`} tabIndex={0}><table className="money-sheet-table">
      <caption>Spending by category, month by month, {g.currency} — counted as your budgets count it</caption>
      <thead><tr><th scope="col">Category</th>{g.months.map(m => <th key={m} scope="col">{formatMonth(`${m}-01`, {year: g.months.length > 12 || m.slice(0, 4) !== today.slice(0, 4)})}</th>)}<th scope="col">Total</th></tr></thead>
      <tbody>{g.spending.map(r => <tr key={r.category}><th scope="row">{r.category}</th>{r.cents.map((c, i) => <td key={i} data-private-amount="">{c ? moneyCents(c, g.currency) : '—'}</td>)}<td data-private-amount="">{moneyCents(r.cents.reduce((s, x) => s + x, 0), g.currency)}</td></tr>)}</tbody>
    </table></div>)}
    <div className="money-sheet-files" role="group" aria-label="Files">
      <button type="button" className="secondary" onClick={csv} aria-disabled={!all.length || undefined}>Download as CSV</button>
      <button type="button" className="secondary" onClick={xlsx} aria-disabled={!all.length || undefined}>Download for Excel, Numbers or Sheets (.xlsx)</button>
    </div>
    <p className="fine">Made on this device, never sent. A formula sign at the start of a note is kept as text. The workbook&rsquo;s Month by month sheet adds up with formulas you can change.</p>
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </div>;
}
