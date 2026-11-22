'use client';
import {useId, useMemo, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import type {Accounts} from '../../lib/accounts/schema';
import {WEALTH_SHEET} from '../../lib/wealth-sheet/schema';
import {groupTotals, oneTotal, setRate, shareTotals, staleAccounts} from '../../lib/wealth-sheet/sheet';
import {centsText} from '../../lib/debt-planner/plan';
import {formatDate, formatMoney} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * Session AV lane 2 (money; Kubera's net-worth sheet): "Your sheet" under Accounts, debts & net worth — net worth at your
 * shares (a joint account at 50 %), a subtotal for each of your own groups, the accounts due for an update by your own
 * "update every", and one total in a currency you choose from exchange rates you type (each with its day, labelled as
 * yours; nothing is fetched: a live rate needs an outside service). Per currency otherwise, never converted. Lazy.
 */
const m = (c: bigint, cur: string) => `${c < 0n ? '−' : ''}${formatMoney(centsText(c < 0n ? -c : c), cur)}`;
export default function WealthSheetPanel({accounts, today}: {accounts: Accounts; today: string}) {
  const id = useId(), sheet = useDeviceRecord(WEALTH_SHEET), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const shares = useMemo(() => shareTotals(accounts, sheet.data, today), [accounts, sheet.data, today]);
  const groups = useMemo(() => groupTotals(accounts, sheet.data, today), [accounts, sheet.data, today]);
  const stale = useMemo(() => staleAccounts(accounts, sheet.data, today), [accounts, sheet.data, today]);
  const currencies = [...new Set(accounts.items.map(a => a.currency))].sort(), totalIn = sheet.data.total ?? currencies[0] ?? 'EUR';
  const total = oneTotal(shares.map(x => ({currency: x.currency, cents: x.net})), sheet.data.rates, totalIn);
  const [from, setFrom] = useState(currencies.find(c => c !== totalIn) ?? 'USD'), [rate, setRateText] = useState(''), [on, setOn] = useState(today);
  const save = (fn: Parameters<typeof sheet.update>[0], words: string) => { setProblem(''); try { sheet.update(fn); setStatus(words); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); } };
  const addRate = (e: FormEvent) => { e.preventDefault(); try { const next = setRate(sheet.data, from, totalIn, rate.trim().replace(',', '.'), on); save(() => next, `Your rate kept: 1 ${from} = ${rate.trim()} ${totalIn} (${formatDate(on)}).`); setRateText(''); } catch (cause) { setProblem(plainErrorMessage(cause, 'Check the rate.')); } };
  if (!sheet.loaded) return null;
  if (sheet.unreadable) return <p role="alert">Your sheet could not be read on this device; nothing was changed.</p>;
  const multi = shares.length > 1, anyShare = shares.some(s => s.shared > 0), anyGroup = groups.some(g => g.group);
  return <section className="wealth-sheet" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your sheet</h3>
    {anyShare && <p>At your shares: {shares.map(s => <strong key={s.currency} className="wealth-sheet-figure">{m(s.net, s.currency)}</strong>)} <span className="fine">(all of each account: {shares.map(s => m(s.whole, s.currency)).join(' · ')})</span></p>}
    {anyGroup ? <div className="money-table-wrap"><table className="money-table wealth-sheet-groups"><caption className="fine">Your groups, at your shares</caption>
      <thead><tr><th scope="col">Group</th><th scope="col">Net</th><th scope="col">Accounts</th></tr></thead>
      <tbody>{groups.map(g => <tr key={`${g.group}-${g.currency}`}><th scope="row">{g.group || 'Not in a group'}</th><td>{m(g.net, g.currency)}</td><td>{g.accounts}</td></tr>)}</tbody></table></div>
      : <p className="fine">Give an account a group (its “Sheet” options) to see a subtotal for each, such as Home, Savings or Business.</p>}
    {stale.length > 0 && <div className="wealth-sheet-stale" role="group" aria-label="Due for an update"><p><strong>Due for an update:</strong> {stale.map(s => `${s.name} (${s.last ? `last ${formatDate(s.last)}` : 'no balance yet'})`).join(' · ')}</p></div>}
    {multi && <div className="wealth-sheet-total">
      <p>One total in <strong>{totalIn}</strong>: <strong>{m(total.cents, totalIn)}</strong>{total.missing.length ? <span className="fine"> · without {total.missing.join(', ')} (no rate of yours yet)</span> : null}</p>
      {total.used.length > 0 && <p className="fine">From your own rates: {total.used.map(u => u.inverse ? `1 ${totalIn} = ${u.rate} ${u.from}` : `1 ${u.from} = ${u.rate} ${totalIn}`).join(' · ')}, typed by you{total.used.length ? ` (${formatDate([...total.used].sort((a, b) => a.on.localeCompare(b.on))[0]!.on)} the oldest)` : ''}. Not live rates.</p>}
      <form className="wealth-sheet-form" onSubmit={addRate} aria-label="Your exchange rate">
        <label className="field"><span>Total in</span><select value={totalIn} onChange={e => save(r => ({...r, total: e.target.value}), `The one total is in ${e.target.value}.`)}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="field"><span>1 of</span><select value={from} onChange={e => setFrom(e.target.value)}>{currencies.filter(c => c !== totalIn).map(c => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="field"><span>is ({totalIn})</span><input inputMode="decimal" autoComplete="off" value={rate} placeholder="0.92" onChange={e => setRateText(e.target.value)}/></label>
        <label className="field"><span>On</span><input type="date" value={on} max={today} onChange={e => setOn(e.target.value)}/></label>
        <button type="submit" className="secondary">Keep my rate</button>
      </form>
    </div>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
