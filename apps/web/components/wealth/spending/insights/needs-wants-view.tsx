'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {MONEY_LOG, NEED_WANT, type NeedWant} from '../../../../lib/money-log/schema';
import {categoriesToMark, markOf, NEED_WANT_WORDS, needWantMonth, setMark, shareOfIncome, type NeedWantMonth} from '../../../../lib/money-insights/needs-wants';
import {shiftMonth} from '../../../../lib/budgets/engine';
import {formatPercent} from '../../../../lib/visual-format';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's needs, wants and savings, LEDGER #295): Wealth → Spending → "Your money
 * over time" → "Needs, wants and saving". The person marks each spending category need, want or saving (kept on the
 * money log); the month's spending in each mark shows as a share of that month's income, per currency, as facts. No split
 * is offered as a target: only the person's own shares. Its own chunk.
 */
const PARTS = [...NEED_WANT, 'unmarked'] as const;
const LABEL: Record<typeof PARTS[number], string> = {need: NEED_WANT_WORDS.need.en, want: NEED_WANT_WORDS.want.en, saving: NEED_WANT_WORDS.saving.en, unmarked: 'Not marked'};
export default function NeedsWantsView({entries, today}: InsightProps) {
  const id = useId(), log = useDeviceRecord(MONEY_LOG), marks = log.data.needWant, thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const rows = useMemo(() => needWantMonth(entries, marks, month), [entries, marks, month]);
  const cats = useMemo(() => categoriesToMark(entries, marks, today), [entries, marks, today]);
  const mark = (category: string, value: string) => {
    setProblem('');
    try { log.update(l => setMark(l, category, value ? value as NeedWant : null)); setStatus(value ? `${category}: ${LABEL[value as NeedWant].toLowerCase()}.` : `${category}: not marked.`); }
    catch { setProblem('Not saved on this device.'); }
  };
  if (!log.loaded) return <p className="fine" aria-busy="true">Loading…</p>;
  return <section className="money-insights-currency" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>Needs, wants and saving</h4>
    <p className="fine">Mark each spending category as a need, a want or saving: your own choice. The month then shows what went to each, as a share of the income you logged. Your figures only; nothing here is a target.</p>
    <div className="money-insights-views" role="group" aria-label="Month">
      {[thisMonth, shiftMonth(thisMonth, -1)].map(m => <button key={m} type="button" className="quiet" aria-pressed={month === m} onClick={() => setMonth(m)}>{m === thisMonth ? 'This month' : monthName(m)}</button>)}
    </div>
    {!rows.length ? <p className="fine">Nothing logged in {monthName(month)} yet. Once you log spending and income, the shares appear here.</p> : rows.map(r => <Shares key={r.currency} r={r}/>)}
    {log.unreadable ? <p role="alert">Your money log could not be read on this device, so marks cannot be kept now.</p>
      : !cats.length ? <p className="fine">No spending in the last 90 days to mark yet.</p>
      : <details className="needs-wants-marks"><summary>Mark your categories ({cats.filter(c => markOf(marks, c)).length} of {cats.length} marked)</summary>
        <div className="needs-wants-grid">{cats.map(c => <label key={c} className="field"><span>{c}</span>
          <select value={markOf(marks, c) ?? ''} onChange={e => mark(c, e.target.value)}><option value="">Not marked</option>{NEED_WANT.map(n => <option key={n} value={n}>{LABEL[n]}</option>)}</select>
        </label>)}</div>
      </details>}
    <p className="fine" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
function Shares({r}: {r: NeedWantMonth}) {
  const c = r.currency, share = (cents: number) => { const s = shareOfIncome(cents, r); return s === null ? '' : ` · ${formatPercent(s * 100)} of income`; };
  return <table className="money-insights-table needs-wants-table">
    <caption>{monthName(r.month)} in {c}: {r.income ? `${money(r.income, c)} income logged` : 'no income logged, so no shares'}</caption>
    <thead><tr><th scope="col">Part</th><th scope="col">Spent</th></tr></thead>
    <tbody>
      {PARTS.filter(p => p !== 'unmarked' || r.parts.unmarked.cents > 0).map(p => <tr key={p}><th scope="row">{LABEL[p]}{r.parts[p].categories.length ? <small className="fine"> {r.parts[p].categories.join(', ')}</small> : null}</th><td>{money(r.parts[p].cents, c)}{share(r.parts[p].cents)}</td></tr>)}
      {r.notSpent !== null && <tr><th scope="row">Not spent</th><td>{r.notSpent < 0 ? `${money(-r.notSpent, c)} more spent than came in` : `${money(r.notSpent, c)}${share(r.notSpent)}`}</td></tr>}
    </tbody>
  </table>;
}
