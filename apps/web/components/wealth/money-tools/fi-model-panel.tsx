'use client';
import {useDeferredValue, useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {balanceOn} from '../../../lib/accounts/net-worth';
import {localDate} from '../../../lib/local-date';
import {FI_DEFAULTS, fiIssue, fiTarget, runFiModel, type FiInput, type FiResult} from '../../../lib/fi-model/model';
import {FI_MODEL} from '../../../lib/fi-model/store';
import {fiIssueField, fiSummary, type FiField} from '../../../lib/fi-model/summary';
import {plainErrorMessage} from '../../../lib/plain-error';
import {money} from './format';
import {useChartWidth} from '../../charts/use-chart-width';
import {ChartLookDefs, useChartLook} from '../../charts/chart-defs';
import './money-tools.css';
import {parseNumberInput} from '../../../lib/numbers/parse';

/**
 * Session AK (lane M, item 12): "Financial freedom" — the target (yearly spending ÷ withdrawal rate), today's invested
 * amount, a monthly contribution and an expected return and volatility, run through 1,000 seeded paths; the 10–90 %
 * band, the middle path and the years to the target. Every input is editable; only the inputs are kept, and only when
 * the person asks. A model, not advice. Lazy-loaded on the calculator page.
 */
type Draft = {invested: string; yearlySpend: string; withdrawalPct: string; monthlyContribution: string; returnPct: string; volatilityPct: string; years: string; currency: string};
const num = (raw: string) => { const r = parseNumberInput(raw, {allowNegative: true}); return r.ok ? r.value : Number.NaN; }; // Session AL (PRIMITIVES 3f): the one number reader (decimal commas, unambiguous grouping)
const START: Draft = {invested: '20000', yearlySpend: '30000', withdrawalPct: String(FI_DEFAULTS.withdrawalPct), monthlyContribution: '500', returnPct: String(FI_DEFAULTS.returnPct), volatilityPct: String(FI_DEFAULTS.volatilityPct), years: '40', currency: 'EUR'};
// The chart is drawn at its measured width (FiChart), so its labels stay 14 px on every screen.
const H = 196, PAD = 10, BOTTOM = 26;
const years = (n: number | null) => n === null ? null : `${n} ${n === 1 ? 'year' : 'years'}`;

export default function FiModelPanel() {
  const id = useId(), stored = useDeviceRecord(FI_MODEL), accounts = useDeviceRecord(ACCOUNTS);
  const [draft, setDraft] = useState<Draft | null>(null), [status, setStatus] = useState('');
  useEffect(() => {
    if (!stored.loaded || draft) return;
    const i = stored.data.inputs;
    queueMicrotask(() => setDraft(i ? {invested: String(i.invested ?? START.invested), yearlySpend: String(i.yearlySpend ?? START.yearlySpend), withdrawalPct: String(i.withdrawalPct ?? START.withdrawalPct), monthlyContribution: String(i.monthlyContribution ?? START.monthlyContribution), returnPct: String(i.returnPct ?? START.returnPct), volatilityPct: String(i.volatilityPct ?? START.volatilityPct), years: String(i.years ?? START.years), currency: i.currency ?? START.currency} : START));
  }, [stored.loaded, stored.data.inputs, draft]);
  const d = draft ?? START, deferred = useDeferredValue(d);
  const input: FiInput = useMemo(() => ({invested: num(deferred.invested), yearlySpend: num(deferred.yearlySpend), withdrawalPct: num(deferred.withdrawalPct), monthlyContribution: num(deferred.monthlyContribution), returnPct: num(deferred.returnPct), volatilityPct: num(deferred.volatilityPct), years: num(deferred.years)}), [deferred]);
  const issue = fiIssue(input);
  const result: FiResult | null = useMemo(() => issue ? null : runFiModel(input), [issue, input]);
  // Today's invested amount from the person's investment and pension accounts in this currency, when they have balances.
  const fromAccounts = useMemo(() => {
    if (!accounts.loaded || accounts.unreadable) return null;
    let cents = 0n, n = 0;
    for (const a of accounts.data.items) {
      if (a.archivedAt || a.currency !== d.currency || (a.kind !== 'investment' && a.kind !== 'pension')) continue;
      const b = balanceOn(a, localDate()); if (!b) continue;
      cents += b.decimals >= 2 ? b.value / 10n ** BigInt(b.decimals - 2) : b.value * 10n ** BigInt(2 - b.decimals); n++;
    }
    return n ? (Number(cents) / 100).toFixed(2) : null;
  }, [accounts.loaded, accounts.unreadable, accounts.data.items, d.currency]);
  const set = (key: keyof Draft) => (e: {target: {value: string}}) => { setStatus(''); setDraft(x => ({...(x ?? START), [key]: e.target.value})); };
  const issueField: FiField | null = issue ? fiIssueField(input) : null;
  const field = (key: FiField, label: string, hint: string, mode: 'decimal' | 'numeric' = 'decimal') => <label className="field" htmlFor={`${id}-${key}`}>
    <span>{label}</span>
    <input id={`${id}-${key}`} inputMode={mode} autoComplete="off" spellCheck={false} enterKeyHint="next" value={d[key]} onChange={set(key)}
      aria-describedby={`${id}-${key}-hint${issueField === key ? ` ${id}-issue` : ''}`} {...(issueField === key ? {'aria-invalid': true as const} : {})}/>
    <small id={`${id}-${key}-hint`} className="fi-hint">{hint}</small>
  </label>;
  const keep = () => {
    if (issue) return;
    try { stored.update(r => ({...r, inputs: {invested: input.invested, yearlySpend: input.yearlySpend, withdrawalPct: input.withdrawalPct, monthlyContribution: input.monthlyContribution, returnPct: input.returnPct, volatilityPct: input.volatilityPct, years: input.years, currency: d.currency}})); setStatus('These inputs are kept on this device.'); }
    catch (cause) { setStatus(plainErrorMessage(cause, 'Not kept on this device.')); }
  };
  const forget = () => { try { stored.clear(); setStatus('The kept inputs are removed from this device.'); } catch { setStatus('Not removed.'); } };
  const target = Number.isFinite(input.yearlySpend) && Number.isFinite(input.withdrawalPct) && input.withdrawalPct > 0 ? fiTarget(input.yearlySpend, input.withdrawalPct) : null;
  return <section className="money-panel fi-model" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">A MODEL, NOT ADVICE</p>
    <h3 id={`${id}-title`}>Financial freedom</h3>
    <p className="fine">When could your investments cover your yearly spending? The target is your yearly spending ÷ the withdrawal rate. 1,000 possible paths are drawn from the return and volatility you choose, after inflation. A model, not advice: real returns can be very different.</p>
    <div className="money-grid fi-fields">
      <label className="field"><span>Currency</span><select value={d.currency} onChange={set('currency')}>{['EUR', 'USD', 'GBP', 'CHF'].map(c => <option key={c} value={c}>{c}</option>)}</select></label>
      {field('invested', `Invested today (${d.currency})`, 'What your investments and pension are worth now.')}
      {field('yearlySpend', `Your yearly spending (${d.currency})`, 'What a year of your life costs, in today’s money.')}
      {field('withdrawalPct', 'Withdrawal rate a year (%)', '4 is a common rule of thumb; a lower rate is more cautious. From 1 to 10.')}
      {field('monthlyContribution', `Added each month (${d.currency})`, 'Zero or more.')}
      {field('returnPct', 'Expected return a year, after inflation (%)', 'An assumption, not a promise. From −10 to 20.')}
      {field('volatilityPct', 'Ups and downs a year, volatility (%)', 'About 15 is typical of a broad share fund. From 0 to 60.')}
      {field('years', 'Years to look ahead', 'Whole years, from 1 to 60.', 'numeric')}
    </div>
    {fromAccounts && fromAccounts !== String(num(d.invested).toFixed(2)) && <div className="money-actions"><button type="button" className="quiet" onClick={() => setDraft(x => ({...(x ?? START), invested: fromAccounts}))}>Use my investment and pension accounts ({money(fromAccounts, d.currency)})</button></div>}
    {issue ? <p role="alert" id={`${id}-issue`}>{issue}</p> : result && <>
      <p className="fi-summary">{fiSummary(result, input.years, v => money(v.toFixed(0), d.currency))}</p>
      <p className="fi-result" aria-live="polite">Target: <strong>{money(result.target.toFixed(2), d.currency)}</strong>. {result.yearsTo.p50 !== null
        ? <>In half of the paths it is reached within <strong>{years(result.yearsTo.p50)}</strong>{result.yearsTo.p10 !== null ? `; in the fastest tenth of paths within ${years(result.yearsTo.p10)}` : ''}{result.yearsTo.p90 !== null ? `; in nine of ten within ${years(result.yearsTo.p90)}` : `; one path in ten or more does not reach it within ${input.years} years`}.</>
        : <>Fewer than half of the paths reach it within {input.years} years ({Math.round(result.reached * 100)} % do).</>}</p>
      <FiChart result={result} years={input.years} currency={d.currency}/>
      <ul className="fine money-legend fi-legend zg-legend" data-pillar="wealth" aria-label="How to read the chart">
        <li><span className="money-key money-key-band" aria-hidden="true"/>Shaded band: the middle 8 in 10 paths (from the 10th to the 90th percentile)</li>
        <li><span className="money-key" aria-hidden="true"/>Solid line: the middle path (the 50th percentile)</li>
        <li><span className="money-key money-key-target" aria-hidden="true"/>Dashed line: your target{target !== null ? ` (${money(target.toFixed(0), d.currency)})` : ''}</li>
      </ul>
      <div className="money-table-wrap"><table className="money-table fi-table"><caption className="fine">Possible values, an estimate</caption>
        <thead><tr><th scope="col">After</th><th scope="col">Low <small>(1 in 10 below)</small></th><th scope="col">Middle</th><th scope="col">High <small>(1 in 10 above)</small></th></tr></thead>
        <tbody>{result.bands.filter(b => b.year > 0 && (b.year % 10 === 0 || b.year === input.years)).map(b => <tr key={b.year}><th scope="row">{years(b.year)}</th><td>{money(b.p10.toFixed(0), d.currency)}</td><td>{money(b.p50.toFixed(0), d.currency)}</td><td>{money(b.p90.toFixed(0), d.currency)}</td></tr>)}</tbody></table></div>
    </>}
    <div className="money-actions">
      <button type="button" className="secondary" disabled={!!issue || !stored.loaded || stored.unreadable} onClick={keep}>Keep these inputs on this device</button>
      {stored.data.inputs && <button type="button" className="quiet" onClick={forget}>Forget them</button>}
    </div>
    <p className="money-status" role="status" aria-live="polite">{status}</p>
  </section>;
}

function FiChart({result, years: span, currency}: {result: FiResult; years: number; currency: string}) {
  const [plot, W] = useChartWidth(340, 220), look = useChartLook();
  const max = Math.max(result.target * 1.15, ...result.bands.map(b => Math.min(b.p90, result.target * 3)));
  const x = (y: number) => PAD + (W - 2 * PAD) * y / Math.max(1, span), yv = (v: number) => H - BOTTOM - (H - BOTTOM - PAD) * Math.min(v, max) / max;
  return <div ref={plot}><svg className="money-chart zg-chart" data-pillar="wealth" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`A band of possible values over ${span} years. After ${span} years the middle path is at ${money(result.bands.at(-1)!.p50.toFixed(0), currency)}; the target is ${money(result.target.toFixed(0), currency)}.`}>
    <ChartLookDefs id={look.id} width={W} height={H}/>
    <path className="money-chart-band zgc-band" style={{fill: look.stroke('band')}} d={`${result.bands.map((b, i) => `${i ? 'L' : 'M'}${x(b.year).toFixed(1)} ${yv(b.p90).toFixed(1)}`).join(' ')} ${[...result.bands].reverse().map(b => `L${x(b.year).toFixed(1)} ${yv(b.p10).toFixed(1)}`).join(' ')} Z`}/>
    <path className="money-chart-mid zgc-line" style={{stroke: look.stroke('a')}} filter={look.glow} d={result.bands.map((b, i) => `${i ? 'L' : 'M'}${x(b.year).toFixed(1)} ${yv(b.p50).toFixed(1)}`).join(' ')}/>
    <line className="money-chart-target" x1={PAD} x2={W - PAD} y1={yv(result.target)} y2={yv(result.target)}/>
    <line className="money-chart-axis" x1={PAD} x2={W - PAD} y1={H - BOTTOM} y2={H - BOTTOM}/>
    <text x={PAD} y={H - 8}>Now</text>
    <text x={W - PAD} y={H - 8} textAnchor="end">{years(span)}</text>
    <text x={W - PAD} y={Math.max(16, yv(result.target) - 6)} textAnchor="end">Target</text>
  </svg></div>;
}
