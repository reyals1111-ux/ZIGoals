'use client';
import {Suspense, lazy, useEffect, useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NETWORTH_MILESTONES, addAmount, checkCrossings, milestoneAmounts, markShown, nextMilestone, pendingCelebration, removeAmount, setDefaults, turnOff, turnOn, type NetRow, type NetworthMilestones as Record_} from '../../lib/networth-milestones/milestones';
import {formatDate, formatMoney} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import './networth-milestones.css';
// Session AK (BUILD list 2 #17): share a net-worth moment, amounts hidden by default (its own chunk, on the tap).
const NetWorthShare = lazy(() => import('../networth-share/networth-share'));

/**
 * Session AK (F5a, item 3): net-worth milestones on Wealth, under the net worth. Off by default; the person picks the
 * currency and the amounts (or the usual round numbers). What is already passed is remembered quietly; the first time
 * the tracked net worth passes an amount after that, one calm card says so, once (no motion needed to understand it;
 * its gentle fade is off under reduced motion and Motion Off). `zigoals:networth-milestones:v1`, this device only.
 */
const amountText = (amount: string, currency: string) => formatMoney(amount, currency);
export default function NetWorthMilestones({rows, today}: {rows: readonly NetRow[]; today: string}) {
  const id = useId(), store = useDeviceRecord(NETWORTH_MILESTONES), [typed, setTyped] = useState(''), [status, setStatus] = useState(''), [error, setError] = useState('');
  const r = store.data, writable = store.loaded && !store.unreadable, currencies = rows.map(x => x.currency);
  const rowsKey = rows.map(x => `${x.currency}:${x.net.value}:${x.net.decimals}`).join('|');
  // A look at Wealth: the first crossing since the last look is remembered (and celebrated below, once).
  useEffect(() => {
    if (!writable || !r.enabled) return;
    if (checkCrossings(r, rows, today) === r) return;
    try { store.update(current => checkCrossings(current, rows, today)); } catch { /* tried again on the next look */ }
  }, [writable, r, rowsKey, today]); // eslint-disable-line react-hooks/exhaustive-deps -- rows is read through rowsKey
  const change = (fn: (current: Record_) => Record_, words: string) => {
    try { store.update(fn); setStatus(words); setError(''); return true; } catch (cause) { setStatus(''); setError(plainErrorMessage(cause, 'Not saved on this device.')); return false; }
  };
  const pending = pendingCelebration(r), currency = r.currency ?? currencies[0] ?? '', next = r.enabled ? nextMilestone(r, rows) : null;
  const reachedOf = (amount: string) => (r.reached ?? []).find(x => x.currency === currency && x.amount === amount);
  return <div className="nwm">
    {pending && <section className="nwm-celebration" role="status" aria-labelledby={`${id}-cele`}>
      <span className="nwm-symbol" aria-hidden="true">◆</span>
      <div>
        <p className="eyebrow">A NET-WORTH MILESTONE</p>
        <h3 id={`${id}-cele`}>{pending.amount === '0' ? `Your net worth in ${pending.currency} is above zero` : `Past ${amountText(pending.amount, pending.currency)}`}</h3>
        <p>Your tracked net worth passed a milestone you picked, on {formatDate(pending.on)}. Steady steps add up.{r.note ? ` ${r.note}.` : ''}</p>
        <button type="button" className="secondary" onClick={() => change(x => markShown(x, pending, new Date().toISOString()), 'Remembered. This milestone will not be celebrated again.')}>Thanks</button>
      </div>
    </section>}
    {pending && <Suspense fallback={null}><NetWorthShare currencies={currencies} preferred={pending.currency} milestone={pending} label="Share this moment"/></Suspense>}
    <details className="nwm-settings">
      <summary>Net-worth milestones <small>{r.enabled && r.currency ? `On · ${r.currency}${next ? ` · next ${amountText(next, r.currency)}` : ''}` : 'Off'}</small></summary>
      {!store.loaded ? <p className="fine" aria-busy="true">Reading…</p> : store.unreadable ? <p role="alert">Your milestones on this device could not be read. Their bytes are kept; nothing was changed.</p>
        : <div className="nwm-body">
          <p className="fine">Pick round amounts that mean something to you. The first time your net worth passes one, a quiet card says so, once. Amounts already passed are remembered without a celebration. Net worth moves with prices, so it can pass an amount, dip and pass it again; it is celebrated only the first time.{r.note ? ` ${r.note}.` : ''}</p>
          {rows.length === 0 ? <p>Add an account with a balance first (above). Then you can pick your milestones here.</p> : <>
            <div className="nwm-row">
              <label className="nwm-check"><input type="checkbox" checked={r.enabled} disabled={!writable} onChange={e => e.target.checked ? change(x => turnOn(x, currency, rows, today), `Milestones on, in ${currency}.`) : change(turnOff, 'Milestones off. What you picked is kept.')}/><span>Celebrate when my net worth first passes a milestone</span></label>
              {currencies.length > 1 && <label className="field nwm-currency"><span>In</span><select value={currency} disabled={!writable} onChange={e => { const c = e.target.value; change(x => x.enabled ? turnOn(x, c, rows, today) : {...x, currency: c}, `Milestones in ${c}.`); }}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
            </div>
            <form className="nwm-add" onSubmit={e => { e.preventDefault(); if (change(x => addAmount({...x, currency: x.currency ?? currency}, typed, rows, today), 'Milestone added.')) setTyped(''); }}>
              <label className="field"><span>A milestone ({currency}, whole amount)</span><input inputMode="numeric" autoComplete="off" value={typed} onChange={e => setTyped(e.target.value)} placeholder="for example 25000"/></label>
              <button type="submit" className="secondary" disabled={!writable || !typed.trim()}>Add</button>
            </form>
            <label className="nwm-check"><input type="checkbox" checked={!!r.useDefaults} disabled={!writable} onChange={e => change(x => setDefaults({...x, currency: x.currency ?? currency}, e.target.checked, rows, today), e.target.checked ? 'The usual round numbers are on.' : 'The usual round numbers are off.')}/><span>Also use the usual round numbers (zero, 1,000, 5,000, 10,000 … 1,000,000)</span></label>
            {milestoneAmounts(r).length > 0 && <ul className="nwm-list" aria-label="Your milestones">{milestoneAmounts(r).map(a => { const done = reachedOf(a), own = (r.amounts ?? []).includes(a); return <li key={a}>
              <span><strong>{a === '0' ? 'Above zero' : amountText(a, currency)}</strong> <small>{done ? `passed ${formatDate(done.on)}` : 'ahead'}</small></span>
              {own && <button type="button" className="quiet" aria-label={`Remove the milestone ${a === '0' ? 'above zero' : amountText(a, currency)}`} onClick={() => change(x => removeAmount(x, a), 'Milestone removed.')}>Remove</button>}
            </li>; })}</ul>}
          </>}
          <p className="fine">Kept on this device only. Information, not advice.</p>
        </div>}
    </details>
    {!pending && rows.length > 0 && <Suspense fallback={null}><NetWorthShare currencies={currencies} preferred={r.currency}/></Suspense>}
    <p className="nwm-status" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
