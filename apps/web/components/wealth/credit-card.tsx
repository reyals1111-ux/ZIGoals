'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord, type DeviceRecordState} from '../ai/use-device-record';
import type {Account} from '../../lib/accounts/schema';
import {BILLS} from '../../lib/bills/schema';
import {addManualBill} from '../../lib/bills/store';
import {WEALTH_SHEET, type WealthSheet} from '../../lib/wealth-sheet/schema';
import {cardState, hasReminder, reminderBill, reminderId, withCard, type CardState} from '../../lib/wealth-sheet/cards';
import {readMoneyAmount} from '../../lib/money-log/form';
import {formatDate, formatPercent} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {moneyCents} from './money-tools/format';

/**
 * Session AV lane 2, round 3 (money; Simplifi's credit card dashboard, LEDGER #293): a credit card's limit and use. The
 * row line (lazy, on each credit card in What you owe) says what is used of the limit, the share and what is still
 * available, and the next statement and due days; the card's Sheet has the form (limit, statement day, due day) and "Add
 * a payment reminder", an ordinary bill on the due day that Upcoming bills and Today's money line then name. From the
 * numbers the person types; facts, not advice.
 */
export function cardWords(s: CardState): string[] {
  const m = (c: number) => moneyCents(c, s.currency), out: string[] = [];
  if (s.limit !== null && s.owed !== null) out.push(`${m(s.owed)} of ${m(s.limit)} used (${formatPercent((s.share ?? 0) * 100)})`, s.available! >= 0 ? `${m(s.available!)} available` : `${m(-s.available!)} over the limit`);
  else if (s.limit !== null) out.push(`limit ${m(s.limit)}; add a balance to see how much is used`);
  if (s.nextStatement) out.push(`statement ${formatDate(s.nextStatement)}`);
  if (s.nextDue) out.push(`due ${formatDate(s.nextDue)}`);
  return out;
}
export default function CardLine({account, today}: {account: Account; today: string}) {
  const sheet = useDeviceRecord(WEALTH_SHEET);
  if (!sheet.loaded || sheet.unreadable) return null;
  const words = cardWords(cardState(account, sheet.data, today));
  return words.length ? <small className="accounts-card-line">{words.join(' · ')}</small> : <small className="accounts-card-line fine">Add its limit and days under Sheet to see how much of it is used.</small>;
}
/**
 * In a credit card's Sheet: its limit, statement day and due day, and a payment reminder. Review b3a #3: the fields start
 * from the record once it has loaded (the form is drawn only then), so they show what is kept and Keep never erases it.
 */
export function CardForm({account, today}: {account: Account; today: string}) {
  const sheet = useDeviceRecord(WEALTH_SHEET);
  if (!sheet.loaded || sheet.unreadable) return null;
  return <CardFields key={account.id} account={account} today={today} sheet={sheet}/>;
}
function CardFields({account: a, today, sheet}: {account: Account; today: string; sheet: DeviceRecordState<WealthSheet>}) {
  const bills = useDeviceRecord(BILLS), now = sheet.data.cards?.[a.id];
  const [limit, setLimit] = useState(now?.limit ?? ''), [statement, setStatement] = useState(now?.statementDay ? String(now.statementDay) : ''), [due, setDue] = useState(now?.dueDay ? String(now.dueDay) : '');
  const [said, setSaid] = useState(''), [problem, setProblem] = useState(''), [added, setAdded] = useState(false), done = useRef<HTMLParagraphElement>(null);
  // The reminder button is replaced by its confirmation, so focus moves there instead of dropping to the page.
  const hasNow = bills.loaded && hasReminder(bills.data, a.id);
  useEffect(() => { if (added && hasNow && done.current) { done.current.focus(); setAdded(false); } }, [added, hasNow]);
  const day = (raw: string) => raw.trim() ? Number(raw.trim()) : null;
  const save = (e: FormEvent) => {
    e.preventDefault(); setProblem('');
    const l = limit.trim() ? readMoneyAmount(limit) : null;
    if (limit.trim() && !l) { setProblem('Enter the limit above zero, with at most two decimals, or leave it empty.'); return; }
    try { sheet.update(r => withCard(r, a.id, {limit: l, statementDay: day(statement), dueDay: day(due)})); setSaid(l || statement || due ? `${a.name}: kept. Its row in What you owe shows how much is used.` : `${a.name}: no limit or days.`); }
    catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); }
  };
  const state = cardState(a, sheet.data, today), bill = reminderBill(state), has = bills.loaded && hasReminder(bills.data, a.id);
  const remind = () => {
    if (!bill) return;
    try { bills.update(r => addManualBill(r, bill, reminderId(a.id), new Date())); setAdded(true); setSaid(`A payment reminder for ${moneyCents(Math.round(Number(bill.amount) * 100), a.currency)} on ${formatDate(bill.nextDue)} is in Upcoming bills. Change or remove it there.`); }
    catch (cause) { setProblem(plainErrorMessage(cause, 'The reminder was not added.')); }
  };
  return <form className="wealth-sheet-form account-limit-form" onSubmit={save} aria-label={`${a.name}: limit and days`} noValidate>
    <label className="field"><span>Credit limit ({a.currency})</span><input inputMode="decimal" autoComplete="off" value={limit} placeholder="2000" onChange={e => setLimit(e.target.value)}/></label>
    <label className="field"><span>Statement day (1–31)</span><input inputMode="numeric" autoComplete="off" value={statement} placeholder="5" onChange={e => setStatement(e.target.value.replace(/\D/g, '').slice(0, 2))}/></label>
    <label className="field"><span>Payment due day (1–31)</span><input inputMode="numeric" autoComplete="off" value={due} placeholder="25" onChange={e => setDue(e.target.value.replace(/\D/g, '').slice(0, 2))}/></label>
    <button type="submit" className="secondary">Keep</button>
    {bills.loaded && !bills.unreadable && (has ? <p className="fine" ref={done} tabIndex={-1}>A payment reminder is in Upcoming bills.</p>
      : bill ? <button type="button" className="quiet" onClick={remind}>Add a payment reminder on {formatDate(bill.nextDue)}</button>
      : <p className="fine">{state.dueDay ? 'With a balance owed, a payment reminder can be added for the due day.' : 'Keep a due day to add a payment reminder.'}</p>)}
    <p className="fine" role="status">{said || 'Used is what the card owes now, from its latest balance less the payments you recorded.'}</p>
    {problem && <p role="alert">{problem}</p>}
  </form>;
}
