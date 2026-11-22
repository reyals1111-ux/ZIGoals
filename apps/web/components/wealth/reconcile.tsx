'use client';
import {useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_LOG, type MoneyEntry} from '../../lib/money-log/schema';
import type {Account} from '../../lib/accounts/schema';
import {balanceOn, moneyText} from '../../lib/accounts/net-worth';
import {isDebtKind} from '../../lib/accounts/schema';
import {balanceCents, bankAccountNames, difference, lastChecked, markChecked, movement, toCheck} from '../../lib/money-log/reconcile';
import {readMoneyAmount} from '../../lib/money-log/form';
import {addLocalDays} from '../../lib/local-date';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {moneyCents} from './money-tools/format';
import {changeWithUndo} from '../ui/remove-with-undo';
import {CalcHint} from '../money-calc/calc-hint';
import './spending/money-r4.css';

/**
 * Session AV lane 2, round 4 (money; Actual's reconcile, LEDGER #340): "Check against my bank" on an account in What you
 * own or What you owe — the statement's last day, its opening and closing balance (the opening starts from this account's
 * own balance before the statement, when one is kept), the money-log entries in the account's currency not yet checked in
 * that time (narrowed to one bank file's account name when the log has them), ticked one by one or all at once, and the
 * difference until it is zero. Then "Mark N as checked" (with Undo) marks them with the statement's day; Spending shows a
 * quiet "checked" mark. Every entry counts whole and as it is, as a bank statement lists it (lib/money-log/reconcile.ts):
 * not a spending figure. Personal space only (accounts are personal). Lazy.
 */
const signed = (cents: number, currency: string) => `${cents < 0 ? '−' : cents > 0 ? '+' : ''}${moneyCents(Math.abs(cents), currency)}`;
export default function Reconcile({account, today}: {account: Account; today: string}) {
  const id = useId(), log = useDeviceRecord(MONEY_LOG), debt = isDebtKind(account.kind), currency = account.currency;
  const [bank, setBank] = useState(''), [through, setThrough] = useState(today), [note, setNote] = useState(''), markButton = useRef<HTMLButtonElement>(null);
  const last = log.loaded ? lastChecked(log.data.entries, currency, bank) : null;
  const [fromDraft, setFrom] = useState<string | null>(null), from = fromDraft ?? (last ? addLocalDays(last, 1) : addLocalDays(through, -30));
  const before = balanceOn(account, addLocalDays(from, -1));
  const [opening, setOpening] = useState<string | null>(null), [closing, setClosing] = useState('');
  const openingText = opening ?? (before ? moneyText(before) : '');
  const names = log.loaded ? bankAccountNames(log.data.entries, currency) : [];
  const list = log.loaded ? toCheck(log.data.entries, {currency, from, through, account: bank}) : [];
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const picked = list.filter(e => ticked.has(e.id));
  const open = balanceCents(openingText, readMoneyAmount), close = balanceCents(closing, readMoneyAmount);
  const diff = open !== null && close !== null ? difference({opening: open, closing: close, debt}, picked) : null;
  if (!log.loaded) return <p className="fine" aria-busy="true">Opening your money log…</p>;
  const toggle = (e: MoneyEntry) => setTicked(t => { const n = new Set(t); if (!n.delete(e.id)) n.add(e.id); return n; });
  const mark = () => {
    if (diff !== 0 || !picked.length) { setNote(diff === null ? 'Type the statement’s opening and closing balance first.' : !picked.length ? 'Tick the entries your statement shows first.' : `There is still a difference of ${signed(diff, currency)}. Tick or untick entries until it is zero.`); return; }
    const ids = new Set(picked.map(e => e.id)), n = ids.size;
    void changeWithUndo(log.update, current => markChecked(current, ids, through), `${formatNumber(n)} ${n === 1 ? 'entry' : 'entries'} checked against your bank for ${formatDate(through)}.`, {undone: 'The checked marks are taken off again.', undoLabel: 'Undo checking against the bank'})
      .then(() => { setTicked(new Set()); setNote(`${formatNumber(n)} ${n === 1 ? 'entry' : 'entries'} checked against your statement of ${formatDate(through)}. They carry a quiet “checked” mark in Spending.`); requestAnimationFrame(() => markButton.current?.focus()); }, () => setNote('This could not be saved on this device. Nothing was changed.'));
  };
  const words = debt ? 'owed' : 'balance';
  return <section className="money-reconcile" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Check {account.name} against your bank</h4>
    <p className="fine">Type your statement’s balances, then tick the entries it shows. The difference is shown until it is zero. Every entry counts whole here, as your bank lists it.</p>
    <div className="spending-own-row">
      <label className="field"><span>Statement from</span><input type="date" value={from} max={through} onChange={e => setFrom(e.target.value || null)}/></label>
      <label className="field"><span>Statement to</span><input type="date" value={through} max={today} onChange={e => setThrough(e.target.value || today)}/></label>
    </div>
    <div className="spending-own-row">
      <label className="field"><span>Opening {words} ({currency})</span><input inputMode="decimal" autoComplete="off" value={openingText} onChange={e => setOpening(e.target.value)} aria-describedby={`${id}-open`}/></label>
      <label className="field"><span>Closing {words} ({currency})</span><input inputMode="decimal" autoComplete="off" value={closing} onChange={e => setClosing(e.target.value)} aria-describedby={`${id}-close`}/></label>
    </div>
    <p id={`${id}-open`} className="fine">{before ? `Started from your own balance on ${formatDate(before.date)}: ${moneyCents(Math.round(Number(moneyText(before)) * 100), currency)}.` : 'No balance of yours from before this statement: type the opening one.'}{openingText && open === null ? ' The opening balance is not a number yet.' : ''}</p>
    <CalcHint value={closing} id={`${id}-close`}/>
    {names.length > 0 && <label className="field"><span>Entries from the bank file’s account</span><select value={bank} onChange={e => { setBank(e.target.value); setTicked(new Set()); }}><option value="">Every entry in {currency}</option>{names.map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
    {last && <p className="fine">Last checked up to {formatDate(last)}; entries from then on are listed.</p>}
    {list.length ? <>
      <div className="money-select-head"><span className="fine">{formatNumber(list.length)} not yet checked from {formatDate(from)} to {formatDate(through)}</span>
        <button type="button" className="quiet" onClick={() => setTicked(picked.length === list.length ? new Set() : new Set(list.map(e => e.id)))}>{picked.length === list.length ? 'Untick all' : 'Tick all'}</button></div>
      <ul className="spending-entries money-reconcile-list" aria-label="Entries to check">{list.map(e => <li key={e.id}>
        <label className="money-select-check"><input type="checkbox" checked={ticked.has(e.id)} onChange={() => toggle(e)} aria-label={`On the statement: ${e.note ? e.note.split(' · ')[0] : e.category} ${e.kind === 'income' ? '+' : '−'}${e.amount} ${e.currency} on ${formatDate(e.date)}`}/></label>
        <span className="spending-entry-what"><strong>{e.note ? e.note.split(' · ')[0] : e.category}</strong><span className="fine"> · {formatDate(e.date)}{e.account ? ` · ${e.account}` : ''}</span></span>
        <span className={`spending-amount${e.kind === 'income' ? ' spending-in' : ''}`} data-private-amount>{e.kind === 'income' ? '+' : '−'}{moneyCents(Math.round(Number(e.amount) * 100), e.currency)}</span>
      </li>)}</ul>
    </> : <p className="fine">No entry in {currency} waits to be checked from {formatDate(from)} to {formatDate(through)}.</p>}
    <p className="money-select-total" aria-live="polite" data-private-amount>{picked.length ? `${formatNumber(picked.length)} ticked · ${signed(movement(picked), currency)}` : 'Nothing ticked'}{diff === null ? '' : diff === 0 ? ' · it matches your statement' : ` · difference ${signed(diff, currency)}`}</p>
    <button ref={markButton} type="button" className="secondary" aria-disabled={diff !== 0 || !picked.length || undefined} onClick={mark}>{picked.length ? `Mark ${formatNumber(picked.length)} as checked` : 'Mark as checked'}</button>
    <p className="fine" role="status">{note}</p>
  </section>;
}
