'use client';
import {useId} from 'react';
import {paymentsLeft, type EndsChoice} from '../../../lib/bills/ends';
import type {Bill} from '../../../lib/bills/schema';
import {formatDate} from '../../../lib/visual-format';
import './aw-x7-bills.css';

/**
 * Session AW, round 7 X7 (money; Cashew's "ends after", LEDGER #462): the "Ends" fields of a bill's form (Add a bill by
 * hand, and Edit in the Bill tracker) and the words a bill that ends shows ("3 of 24 left · the last on 5 Feb 2027").
 * After its last payment the bill leaves Upcoming, the calendar, the month's bills and the reminders (lib/bills/ends.ts).
 */
export function EndsFields({choice, onChange, nextDue}: {choice: EndsChoice; onChange: (c: EndsChoice) => void; nextDue: string}) {
  const id = useId();
  return <fieldset className="bills-ends">
    <legend>Ends</legend>
    <label className="field"><span>When it ends</span><select value={choice.kind} onChange={e => { const k = e.target.value as EndsChoice['kind']; onChange(k === 'after' ? {kind: 'after', count: choice.kind === 'after' ? choice.count : '', from: choice.kind === 'after' ? choice.from : nextDue} : k === 'on' ? {kind: 'on', date: choice.kind === 'on' ? choice.date : ''} : {kind: 'never'}); }}>
      <option value="never">It keeps going</option><option value="after">After a number of payments</option><option value="on">On a date</option>
    </select></label>
    {choice.kind === 'after' && <>
      <label className="field"><span>Number of payments</span><input inputMode="numeric" autoComplete="off" maxLength={3} value={choice.count} placeholder="24" aria-describedby={`${id}-after`} onChange={e => onChange({...choice, count: e.target.value.replace(/\D/g, '').slice(0, 3)})}/></label>
      <label className="field"><span>First payment on</span><input type="date" value={choice.from} onChange={e => onChange({...choice, from: e.target.value})}/></label>
      <p id={`${id}-after`} className="fine">For a contract of 24 months, enter 24 and the day of its first payment.</p>
    </>}
    {choice.kind === 'on' && <label className="field"><span>Last payment on or before</span><input type="date" value={choice.date} onChange={e => onChange({...choice, date: e.target.value})}/></label>}
  </fieldset>;
}
/** "3 of 24 left · the last on 5 Feb 2027", "Ended: the last payment was on 5 Oct 2026", or null when it keeps going. */
export function endsWords(bill: Pick<Bill, 'nextDue' | 'cadence' | 'ends'>, today: string): string | null {
  const left = paymentsLeft(bill, today);
  if (!left) return null;
  const last = formatDate(left.last);
  if (left.ended) return `Ended: the last payment was on ${last}`;
  const n = left.of !== null ? `${left.left} of ${left.of} left` : `${left.left} ${left.left === 1 ? 'payment' : 'payments'} left`;
  return `${n} · the last on ${last}`;
}
