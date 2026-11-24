'use client';
import {useState, type FormEvent} from 'react';
import type {DeviceRecordState} from '../ai/use-device-record';
import {centsText, firstPaymentMonth, parseCents, payoffMonth, rateE4, runPlan, type Lump, type PlanDebt, type PlanResult, type Strategy} from '../../lib/debt-planner/plan';
import {METHOD_WORDS, cashFlowIndex, consolidation, extraFor, methodOrder, scheduleCsv, targetChecks} from '../../lib/debt-planner/more';
import {MORE_METHODS, type DebtPlannerRecord, type MoreMethod} from '../../lib/debt-planner/store';
import {formatMoney, formatMonth} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * Session AV lane 2 (money; Undebt.it): the planner's further tools, under its month-by-month table — further orders
 * (highest monthly interest, highest payment, Cash Flow Index, by your paid-off-by months), each debt's promo rate,
 * note and paid-off-by month, Debt Blaster (the extra rising every few months), the reverse what-if ("debt-free by …":
 * the extra it takes), one consolidation loan against the plan, and the plan as CSV or printed. Kept on this device
 * (`zigoals:debt-planner:v1`) as the person saves each. A model, not advice; nothing moves money. Lazy.
 */
type Props = {debts: readonly PlanDebt[]; extra: bigint; order: readonly string[]; lumps: readonly Lump[]; shown: Strategy; today: string; currency: string; example: boolean; stored: DeviceRecordState<DebtPlannerRecord>; onOrder: (order: string[]) => void};
const monthText = (m: string | null) => m ? formatMonth(m) : 'not within 100 years';
export default function DebtPlannerTools({debts, extra, order, lumps, shown, today, currency, example, stored, onOrder}: Props) {
  const money = (c: bigint) => formatMoney(centsText(c), currency), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const kept = stored.data.debts ?? {}, payoffBy = Object.fromEntries(Object.entries(kept).map(([k, v]) => [k, v.payoffBy]));
  const stepUp = !example && stored.data.stepUp && parseCents(stored.data.stepUp.amount) ? {cents: parseCents(stored.data.stepUp.amount)!, every: stored.data.stepUp.every} : undefined;
  const options = {order: [...order], lumps: [...lumps], ...(stepUp ? {stepUp} : {})};
  const plan: PlanResult = runPlan(debts, extra, shown === 'custom' && !order.length ? 'avalanche' : shown, {...options, schedule: true});
  const save = (fn: (r: DebtPlannerRecord) => DebtPlannerRecord, words: string) => { setProblem(''); if (example) { setStatus('Example figures are never kept.'); return; } try { stored.update(fn); setStatus(words); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); } };
  // Further orders, each worked out as "your order".
  const methods = MORE_METHODS.filter(m => m !== 'targets' || Object.values(payoffBy).some(Boolean)).map(m => { const o = methodOrder(debts, m, payoffBy); return {m, o, r: runPlan(debts, extra, 'custom', {...options, order: o})}; });
  const use = (m: MoreMethod, o: string[]) => { onOrder(o); save(r => ({...r, method: m, order: o, shown: 'custom'}), `${METHOD_WORDS[m]}: this order is now “Your order” and kept on this device.`); };
  const checks = targetChecks(debts, plan, today, payoffBy);
  const [blast, setBlast] = useState(stored.data.stepUp?.amount ?? ''), [every, setEvery] = useState<1 | 3 | 6 | 12>((stored.data.stepUp?.every as 1) ?? 3);
  const blastCents = blast.trim() ? parseCents(blast) : null, blasted = blastCents && blastCents > 0n ? runPlan(debts, extra, shown === 'custom' && !order.length ? 'avalanche' : shown, {order: [...order], lumps: [...lumps], stepUp: {cents: blastCents, every}}) : null;
  const [by, setBy] = useState(''), needed = by && /^\d{4}-\d{2}$/.test(by) ? extraFor(debts, shown === 'custom' && !order.length ? 'avalanche' : shown, by, today, {order: [...order], lumps: [...lumps]}) : undefined;
  const [rate, setRate] = useState(''), [term, setTerm] = useState('60'), [fee, setFee] = useState('0');
  const consol = (() => { if (!rate.trim()) return null; try { return consolidation(debts, plan, rate.trim().replace(',', '.'), Number(term), parseCents(fee || '0') ?? -1n); } catch (cause) { return cause instanceof Error ? cause.message : 'Check the figures.'; } })();
  const csv = () => { const url = URL.createObjectURL(new Blob([scheduleCsv(debts, plan, today)], {type: 'text/csv;charset=utf-8'})), a = document.createElement('a'); a.href = url; a.download = `debt-plan-${today}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus(`The plan was saved as a file (debt-plan-${today}.csv).`); };
  const print = () => { document.documentElement.classList.add('zg-print-debts'); const done = () => { document.documentElement.classList.remove('zg-print-debts'); window.removeEventListener('afterprint', done); }; window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60_000); };
  return <div className="debt-tools">
    <details className="debt-tools-fold"><summary>More orders</summary>
      <div className="money-table-wrap"><table className="money-table debt-plan-table"><caption className="fine">The same payments in four more orders, an estimate</caption>
        <thead><tr><th scope="col">Order</th><th scope="col">Debt-free by</th><th scope="col">Interest</th><th scope="col"><span className="visually-hidden">Use</span></th></tr></thead>
        <tbody>{methods.map(({m, o, r}) => <tr key={m}><th scope="row">{METHOD_WORDS[m]}</th><td>{monthText(payoffMonth(today, r.months))}</td><td>{money(r.totalInterest)}</td><td><button type="button" className="quiet" aria-label={`Use ${METHOD_WORDS[m]}`} onClick={() => use(m, o)}>Use</button></td></tr>)}</tbody>
      </table></div>
      <p className="fine">Cash Flow Index: what is owed ÷ its minimum; the lowest first frees a monthly payment soonest ({debts.map(d => `${d.name} ${cashFlowIndex(d)}`).join(', ')}).</p>
    </details>
    {!example && <details className="debt-tools-fold"><summary>Each debt: promo rate, note, paid off by</summary>
      <ul className="debt-tools-debts">{debts.map(d => <DebtExtras key={d.id} debt={d} kept={kept[d.id] ?? {}} onSave={(next, words) => save(r => { const all = {...(r.debts ?? {})}, base = {...(all[d.id] ?? {})} as Record<string, unknown>; for (const [k, v] of Object.entries(next)) { if (v === undefined || v === '') delete base[k]; else base[k] = v; } all[d.id] = base as never; return {...r, debts: all}; }, words)}/>)}</ul>
      {checks.length > 0 && <ul className="debt-tools-targets" aria-label="Paid off by your months">{checks.map(c => <li key={c.id}><strong>{c.name}</strong>: by {formatMonth(c.by)} — {c.onTrack ? `on track (the plan clears it in ${monthText(c.plannedMonth)})` : `the plan clears it ${c.plannedMonth ? `in ${formatMonth(c.plannedMonth)}` : 'later'}; alone it needs about ${money(c.needs)} a month`}.</li>)}</ul>}
      {checks.length > 0 && !checks.every(c => c.onTrack) && <p className="fine">“By your paid-off-by months” under More orders pays those first.</p>}
    </details>}
    <details className="debt-tools-fold"><summary>Debt Blaster</summary>
      <form className="debt-tools-form" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!blast.trim()) { save(r => { const {stepUp: _s, ...rest} = r; void _s; return rest; }, 'Debt Blaster is off.'); return; } if (!blastCents || blastCents <= 0n) { setProblem('Enter the step as an amount above zero, for example 25.'); return; } save(r => ({...r, stepUp: {amount: centsText(blastCents), every}}), `Debt Blaster: the extra rises by ${money(blastCents)} every ${every === 1 ? 'month' : `${every} months`}.`); }} aria-label="Debt Blaster">
        <label className="field"><span>Raise the extra by ({currency})</span><input inputMode="decimal" autoComplete="off" value={blast} placeholder="25" onChange={e => setBlast(e.target.value)}/></label>
        <label className="field"><span>Every</span><select value={every} onChange={e => setEvery(Number(e.target.value) as 1)}><option value={1}>month</option><option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option></select></label>
        <button type="submit" className="secondary">{blast.trim() ? 'Use it in my plan' : 'Turn it off'}</button>
      </form>
      {blasted && <p role="status">With it: debt-free by <strong>{monthText(payoffMonth(today, blasted.months))}</strong>, {money(blasted.totalInterest)} in interest{plan.months !== null && blasted.months !== null ? ` (${plan.months - blasted.months} months sooner, ${money(plan.totalInterest - blasted.totalInterest)} less than without it)` : ''}.</p>}
    </details>
    <details className="debt-tools-fold"><summary>Debt-free by a month?</summary>
      <label className="field"><span>Debt-free by</span><input type="month" value={by} min={firstPaymentMonth(today)} onChange={e => setBy(e.target.value)}/></label>
      {needed === null ? <p className="fine" role="status">Choose next month or later; a much later month may already be reached with the minimums.</p> : needed !== undefined && <p role="status">{needed === 0n ? 'Your payments as they are already get there.' : <>An extra of about <strong>{money(needed)}</strong> a month on top of the minimums gets there (now: {money(extra)}).</>}</p>}
    </details>
    <details className="debt-tools-fold"><summary>One consolidation loan?</summary>
      <p className="fine">A model to compare, not an offer or advice: one loan for everything owed, at a rate and term you type, with its fee added.</p>
      <div className="debt-tools-form">
        <label className="field"><span>Yearly rate (%)</span><input inputMode="decimal" autoComplete="off" value={rate} placeholder="9.9" onChange={e => setRate(e.target.value)}/></label>
        <label className="field"><span>Term (months)</span><input inputMode="numeric" value={term} onChange={e => setTerm(e.target.value)}/></label>
        <label className="field"><span>Fee ({currency})</span><input inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)}/></label>
      </div>
      {typeof consol === 'string' ? <p className="fine" role="status">{consol}</p> : consol && <p role="status">One loan: {money(consol.payment)} a month for {consol.months} months, {money(consol.totalPaid)} paid in all ({money(consol.interest)} interest, {money(consol.fee)} fee). Your plan: {money(consol.plan.totalPaid)} paid, {money(consol.plan.interest)} interest, debt-free by {monthText(payoffMonth(today, consol.plan.months))}. {consol.difference > 0n ? `The loan costs ${money(consol.difference)} more.` : consol.difference < 0n ? `The loan costs ${money(-consol.difference)} less.` : 'They cost the same.'}</p>}
    </details>
    <div className="money-actions debt-tools-actions"><button type="button" className="quiet" onClick={csv}>Download the plan (CSV)</button><button type="button" className="quiet" onClick={print}>Print the plan</button></div>
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </div>;
}
function DebtExtras({debt, kept, onSave}: {debt: PlanDebt; kept: NonNullable<DebtPlannerRecord['debts']>[string]; onSave: (next: Record<string, string | undefined>, words: string) => void}) {
  const [promoRate, setPromoRate] = useState(kept.promoRate ?? ''), [promoUntil, setPromoUntil] = useState(kept.promoUntil ?? ''), [note, setNote] = useState(kept.note ?? ''), [by, setBy] = useState(kept.payoffBy ?? ''), [problem, setProblem] = useState('');
  const save = (e: FormEvent) => {
    e.preventDefault(); setProblem('');
    const rate = promoRate.trim().replace(',', '.');
    if (rate && (rateE4(rate) === null || !promoUntil)) { setProblem('A promo rate needs a rate from 0 to 100 and the month it ends.'); return; }
    onSave({promoRate: rate || undefined, promoUntil: rate ? promoUntil : undefined, note: note.trim().slice(0, 300) || undefined, payoffBy: by || undefined}, `${debt.name} saved.`);
  };
  return <li><form className="debt-tools-form" onSubmit={save} aria-label={`${debt.name}: promo rate, note, paid off by`}>
    <strong className="debt-tools-name">{debt.name}</strong>
    <label className="field"><span>Promo rate (%) — optional</span><input inputMode="decimal" autoComplete="off" value={promoRate} placeholder="0" onChange={e => setPromoRate(e.target.value)}/></label>
    <label className="field"><span>Until (month)</span><input type="month" value={promoUntil} onChange={e => setPromoUntil(e.target.value)}/></label>
    <label className="field"><span>Paid off by — optional</span><input type="month" value={by} onChange={e => setBy(e.target.value)}/></label>
    <label className="field debt-tools-note"><span>Note — optional</span><input maxLength={300} value={note} placeholder="0 % on purchases until March" onChange={e => setNote(e.target.value)}/></label>
    <button type="submit" className="secondary">Save</button>
    {problem && <p role="alert" className="field-error">{problem}</p>}
  </form></li>;
}
