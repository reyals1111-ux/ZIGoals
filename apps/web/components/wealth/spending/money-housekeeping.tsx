'use client';
import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../../ai/use-device-record';
import {changeWithUndo} from '../../ui/remove-with-undo';
import {showUndo} from '../../ui/undo-toast';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {BUDGETS, type BudgetsRecord} from '../../../lib/budgets/schema';
import type {MoneyEntry, MoneyLog} from '../../../lib/money-log/schema';
import {categoryChoices} from '../../../lib/money-log/counted';
import {addBackCategory, addBackSub, checkRecords, clearSub, dropBudget, dropSplit, forgetAccount, keepFirst, moveCategory, undoAddBackCategory, undoAddBackSub, unforgetAccount, unlinkRefund, untransfer, type CheckIssue} from '../../../lib/money-log/check';
import {bringBack, pastYears, putAwayPlan, putAwayYear, readable, yearCsv} from '../../../lib/money-log/put-away';
import {saveFile} from '../../../lib/notes/doc-image';
import {formatDate, formatNumber} from '../../../lib/visual-format';
import {moneyCents} from '../money-tools/format';
import {minorUnits} from '../../../lib/money-split/parts';
import './money-r6.css';

/**
 * Session AV lane 2, round 6 (money; Banktivity's Check Ledger Health and Remove Historical Data, LEDGER #430, #431):
 * Wealth → Spending → "Check and tidy your money records", its own chunk: a read-only check of the records with the
 * repairs the person chooses (each with Undo), and old years put away (nothing deleted; Bring back returns them).
 * Reached from Settings → Your data too (/app/wealth#money-check opens it).
 */
export default function MoneyHousekeeping({log, today, showcase = false}: {log: DeviceRecordState<MoneyLog>; today: string; showcase?: boolean}) {
  const [open, setOpen] = useState(false), box = useRef<HTMLDetailsElement>(null);
  useEffect(() => { try { if (window.location.hash === '#money-check' && box.current) { box.current.open = true; box.current.querySelector('summary')?.focus(); } } catch { /* no location: stays shut */ } }, []);
  return <details ref={box} id="money-check" className="money-sheet-fold" onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}><summary>Check and tidy your money records</summary>
    {open && <div className="money-r6">{showcase && <p className="fine">In the Showcase, changes here last until the tab closes.</p>}<CheckPanel log={log}/><PutAwayPanel log={log} today={today}/></div>}
  </details>;
}

const ISSUE_TITLE: Record<CheckIssue['kind'], string> = {
  duplicate: 'These look like the same entry twice', category: 'In a category that is no longer one of yours', sub: 'A subcategory no longer in its list',
  split: 'A split whose parts do not add up', transfer: 'A transfer whose other side is gone', 'refund-link': 'A refund naming a purchase that is gone',
  account: 'Kept for an account that is gone', budget: 'A budget of a category no longer offered',
};
function CheckPanel({log}: {log: DeviceRecordState<MoneyLog>}) {
  const id = useId(), budgets = useDeviceRecord(BUDGETS), accounts = useDeviceRecord(ACCOUNTS), [ran, setRan] = useState(false), [said, setSaid] = useState(''), head = useRef<HTMLHeadingElement>(null);
  const issues = useMemo(() => ran && log.loaded ? checkRecords(log.data, {budgets: budgets.loaded && !budgets.unreadable ? budgets.data : null, accountIds: accounts.loaded && !accounts.unreadable ? new Set(accounts.data.items.map(a => a.id)) : null}) : [], [ran, log.loaded, log.data, budgets.loaded, budgets.unreadable, budgets.data, accounts.loaded, accounts.unreadable, accounts.data]);
  const failed = (cause: unknown) => setSaid(cause instanceof Error ? cause.message : 'This could not be saved on this device. Nothing was changed.');
  const fix = (fn: (l: MoneyLog) => MoneyLog, words: string) => { void changeWithUndo(log.update, fn, words, {undone: 'Put back as it was.', undoLabel: 'Undo the repair'}).then(() => { setSaid(words); head.current?.focus(); }, failed); };
  // Review B6O-6: a repair that changes no entry ("Forget it", "Add … back") has its own Undo, in the same toast: it puts back
  // only what the repair changed, into the latest record (lib/money-log/check.ts unforgetAccount, undoAddBack…).
  const fixOwn = (fn: (l: MoneyLog) => MoneyLog, undo: (latest: MoneyLog, before: MoneyLog) => MoneyLog, words: string) => {
    let before: MoneyLog | undefined;
    void Promise.resolve(log.update(l => { before = l; return fn(l); })).then(() => {
      setSaid(words); head.current?.focus();
      if (before) { const was = before; showUndo({message: words, undoLabel: 'Undo the repair', restore: async () => { await log.update(latest => undo(latest, was)); return {undone: 'Put back as it was.'}; }}); }
    }, failed);
  };
  const entryWords = (e: Pick<MoneyEntry, 'date' | 'amount' | 'currency' | 'note' | 'category'>) => `${(e.note ?? e.category).split(' · ')[0]} · ${moneyCents(minorUnits(e.amount), e.currency)} · ${formatDate(e.date)}`;
  if (log.unreadable) return <p role="alert">This device’s money log could not be read, so it is not checked; nothing was changed.</p>;
  return <section className="money-r6" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`} ref={head} tabIndex={-1}>Check my money records</h4>
    <p className="fine">Reads your money log, budgets and accounts and lists what looks wrong, each with the repairs you can choose. Nothing changes without a tap, and each repair has Undo.</p>
    <p><button type="button" className="secondary" onClick={() => { setRan(true); setSaid(''); requestAnimationFrame(() => head.current?.focus()); }}>{ran ? 'Check again' : 'Check my money records'}</button></p>
    {ran && (issues.length ? <ul className="money-r6-list" aria-label="What the check found">{issues.slice(0, 50).map(i => <li key={i.key}>
      <span className="money-r6-what"><strong>{ISSUE_TITLE[i.kind]}</strong><br/><span className="fine">{
        i.kind === 'duplicate' ? i.entries.map(entryWords).join('; ')
        : i.kind === 'category' || i.kind === 'sub' ? `${i.kind === 'sub' ? `${i.category} › ${i.sub}` : i.category}: ${i.entries.length} ${i.entries.length === 1 ? 'entry' : 'entries'}`
        : i.kind === 'account' ? 'A note, a place in your order or a checked day'
        : i.kind === 'budget' ? `${i.category} (${i.currency})${i.archived ? ', an archived category' : ''}`
        : entryWords(i.entry)}</span></span>
      <span className="money-r6-actions">{repairs(i, log.data, fix, fixOwn, budgets, setSaid)}</span>
    </li>)}</ul> : <p role="status">Nothing looks wrong: {formatNumber(log.data.entries.length)} entries checked.</p>)}
    {issues.length > 50 && <p className="fine">The first 50 are shown; check again after repairing them.</p>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
function repairs(i: CheckIssue, log: MoneyLog, fix: (fn: (l: MoneyLog) => MoneyLog, words: string) => void, fixOwn: (fn: (l: MoneyLog) => MoneyLog, undo: (latest: MoneyLog, before: MoneyLog) => MoneyLog, words: string) => void, budgets: DeviceRecordState<BudgetsRecord>, onSaid: (w: string) => void) {
  const ids = 'entries' in i ? new Set(i.entries.map(e => e.id)) : new Set<string>();
  switch (i.kind) {
    case 'duplicate': return <button type="button" className="secondary" onClick={() => fix(l => keepFirst(l, i.entries.map(e => e.id)), `Kept the first; ${i.entries.length - 1} ${i.entries.length === 2 ? 'copy' : 'copies'} removed.`)}>Keep the first, remove {i.entries.length === 2 ? 'the copy' : 'the copies'}</button>;
    case 'category': return <>
      <button type="button" className="secondary" onClick={() => fixOwn(l => addBackCategory(l, i.entryKind, i.category), (l, was) => undoAddBackCategory(l, was, i.entryKind, i.category), `${i.category} is one of your categories again.`)}>Add {i.category} back</button>
      <label className="money-r6-field"><span className="visually-hidden">Move these entries to</span><select value="" aria-label={`Move the ${i.category} entries to another category`} onChange={e => { const to = e.target.value; if (to) fix(l => moveCategory(l, ids, to), `${i.entries.length} moved to ${to}.`); }}><option value="">Move to…</option>{categoryChoices(log, i.entryKind).map(c => <option key={c} value={c}>{c}</option>)}</select></label>
    </>;
    case 'sub': return <>
      <button type="button" className="secondary" onClick={() => fixOwn(l => addBackSub(l, i.category, i.sub), (l, was) => undoAddBackSub(l, was, i.category, i.sub), `${i.sub} is back under ${i.category}.`)}>Add {i.sub} back</button>
      <button type="button" className="quiet" onClick={() => fix(l => clearSub(l, ids), `${i.entries.length} now in ${i.category} without a subcategory.`)}>Clear the subcategory</button>
    </>;
    case 'split': return <button type="button" className="secondary" onClick={() => fix(l => dropSplit(l, i.entry.id), 'The split is removed; the entry counts whole, as it already did.')}>Remove the split</button>;
    case 'transfer': return <button type="button" className="secondary" onClick={() => fix(l => untransfer(l, i.entry.id), 'Counted again: no longer a transfer.')}>Count it again</button>;
    case 'refund-link': return <button type="button" className="secondary" onClick={() => fix(l => unlinkRefund(l, i.entry.id), 'The link is gone; the refund still lowers its category.')}>Remove the link</button>;
    case 'account': return <button type="button" className="secondary" onClick={() => fixOwn(l => forgetAccount(l, i.accountId), (l, was) => unforgetAccount(l, was, i.accountId), 'What was kept for that account is gone.')}>Forget it</button>;
    case 'budget': return <button type="button" className="secondary" onClick={() => { void changeWithUndo(budgets.update, b => dropBudget(b, i.budgetId), `The ${i.category} budget is removed.`, {undone: `The ${i.category} budget is back.`, undoLabel: `Undo removing the ${i.category} budget`}).then(() => onSaid(`The ${i.category} budget is removed.`), () => onSaid('This could not be saved on this device.')); }}>Remove the budget</button>;
  }
}

function PutAwayPanel({log, today}: {log: DeviceRecordState<MoneyLog>; today: string}) {
  const id = useId(), budgets = useDeviceRecord(BUDGETS), years = useMemo(() => pastYears(log.data, today), [log.data, today]), [year, setYear] = useState(''), [said, setSaid] = useState(''), head = useRef<HTMLHeadingElement>(null);
  const chosen = year || years[0]?.year || '';
  const plan = useMemo(() => { try { return chosen ? putAwayPlan(log.data, budgets.loaded ? budgets.data : null, chosen, today) : null; } catch { return null; } }, [chosen, log.data, budgets.loaded, budgets.data, today]);
  const away = log.data.putAway?.years ?? [];
  const put = () => { if (!plan) return; const words = `${chosen}: ${plan.moving.length} entries put away. Bring back returns them.`; void changeWithUndo(log.update, l => putAwayYear(l, budgets.loaded ? budgets.data : null, chosen, today, new Date().toISOString(), `y_${crypto.randomUUID().slice(0, 12)}`), words, {undone: `${chosen} is back in your money log.`, undoLabel: `Undo putting ${chosen} away`}).then(() => { setSaid(words); setYear(''); head.current?.focus(); }, cause => setSaid(cause instanceof Error ? cause.message : 'This could not be saved on this device. Nothing was changed.')); };
  const back = (yid: string, y: string) => { void changeWithUndo(log.update, l => bringBack(l, yid), `${y} is back in your money log.`, {undone: `${y} is put away again.`, undoLabel: `Undo bringing ${y} back`}).then(() => { setSaid(`${y} is back in your money log.`); head.current?.focus(); }, cause => setSaid(cause instanceof Error ? cause.message : 'This could not be saved on this device. Nothing was changed.')); };
  const figures = (rows: {currency: string; spent: number; received: number}[]) => rows.map(c => `spent ${moneyCents(c.spent, c.currency)}, received ${moneyCents(c.received, c.currency)}`).join('; ');
  return <section className="money-r6" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`} ref={head} tabIndex={-1}>Put old entries away</h4>
    <p className="fine">A past year’s entries leave your lists, search and figures, and are kept as they were on this device and in Export everything. Nothing is deleted: Bring back returns them. Your account balances do not change: they come from each account’s own balances.</p>
    {years.length ? <>
      <label className="money-r6-field"><span>Year to put away</span><select value={chosen} onChange={e => setYear(e.target.value)}>{years.map(y => <option key={y.year} value={y.year}>{y.year} · {y.count} {y.count === 1 ? 'entry' : 'entries'}</option>)}</select></label>
      {plan && <div className="money-r6" role="group" aria-label={`What putting ${chosen} away does`}>
        <p>{plan.moving.length} {plan.moving.length === 1 ? 'entry goes' : 'entries go'}{plan.byCurrency.length ? <> · <span data-private-amount="">{figures(plan.byCurrency)}</span> in {chosen}</> : null}. {chosen} in review and its months will show nothing until you bring it back.</p>
        {plan.kept.length > 0 && <p className="fine">{plan.kept.length} {plan.kept.length === 1 ? 'entry stays' : 'entries stay'}: {[...new Set(plan.kept.map(k => k.why))].map(w => w === 'spread' ? 'a cost spread into a later year' : w === 'transfer' ? 'a transfer whose other side stays' : 'a purchase a later refund names').join(', ')}.</p>}
        {plan.carry.length > 0 && <p className="fine">Budgets that roll over carry a different amount into this month: {plan.carry.map(c => `${c.category} ${moneyCents(c.now, c.currency)} → ${moneyCents(c.after, c.currency)}`).join(' · ')}.</p>}
        <p><button type="button" className="secondary" disabled={!plan.moving.length} onClick={put}>Put {chosen} away</button></p>
      </div>}
    </> : <p className="fine">Only years before {today.slice(0, 4)} can be put away; your log has none yet.</p>}
    {away.length > 0 && <ul className="money-r6-list" aria-label="Years put away">{away.map(y => { const r = readable(y); return <li key={y.id}>
      <span className="money-r6-what"><strong>{y.year}</strong><span className="fine"> · {y.entries.length} {y.entries.length === 1 ? 'entry' : 'entries'} put away on {formatDate(y.at.slice(0, 10))}{r.unreadable ? ` · ${r.unreadable} this build cannot read stay put away` : ''}</span></span>
      <span className="money-r6-actions"><button type="button" className="quiet" onClick={() => { try { saveFile(yearCsv(y), `zigoals-money-${y.year}.csv`, 'text/csv;charset=utf-8'); setSaid(`${y.year} saved as a CSV file.`); } catch { setSaid('The file could not be made on this device.'); } }}>Save {y.year} as a file</button>
        <button type="button" className="secondary" onClick={() => back(y.id, y.year)}>Bring {y.year} back</button></span>
    </li>; })}</ul>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
