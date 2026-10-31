'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {ACCOUNTS, isDebtKind} from '../../lib/accounts/schema';
import {balanceOn} from '../../lib/accounts/net-worth';
import {localDate} from '../../lib/local-date';
import {formatDate, formatMoney, formatMonth} from '../../lib/visual-format';
import {EXAMPLE_DEBTS, EXAMPLE_EXTRA, addMonths, centsText, comparePlans, comparisonWords, firstPaymentMonth, parseCents, payoffMonth, planIssue, rateE4, toCents, type PlanComparison, type PlanDebt, type PlanResult} from '../../lib/debt-planner/plan';
import {DEBT_PLANNER} from '../../lib/debt-planner/store';
import {plainErrorMessage} from '../../lib/plain-error';
import './money-tools/money-tools.css';
import './debt-planner.css';

/**
 * Session AK (F5a, item 1): the debt payoff planner, snowball against avalanche, from the person's own debts in
 * Wealth → Accounts, debts & net worth (`zigoals:accounts:v1`, read only): what each debt owes now and its yearly rate
 * (the person's own figure), with the minimum payment and an extra amount a month typed here. Both orders and "minimums
 * only" are worked out in exact cents (lib/debt-planner/plan.ts); the date each is debt-free, the interest and what each
 * saves. Information only: a model, not advice; nothing moves money. With no debts it teaches and offers labelled
 * example figures (never stored). Its own figures are kept only on "Keep" (`zigoals:debt-planner:v1`). Lazy-loaded.
 */
type Draft = {extra: string; minimums: Record<string, string>; rates: Record<string, string>};
type Row = {id: string; name: string; owed: bigint; on: string; accountRate?: string};
const W = 340, H = 190, PAD = 12, TOP = 18;
const months = (n: number) => `${n} ${n === 1 ? 'month' : 'months'}`;

export default function DebtPlanner() {
  const id = useId(), accounts = useDeviceRecord(ACCOUNTS), stored = useDeviceRecord(DEBT_PLANNER), today = localDate();
  const [draft, setDraft] = useState<Draft | null>(null), [example, setExample] = useState(false), [status, setStatus] = useState('');
  const [currencyPick, setCurrencyPick] = useState<string | null>(null);
  // The person's debts with a balance above zero, per currency (never converted).
  const byCurrency = useMemo(() => {
    const out = new Map<string, Row[]>();
    if (!accounts.loaded || accounts.unreadable) return out;
    for (const a of accounts.data.items) {
      if (a.archivedAt || !isDebtKind(a.kind)) continue;
      const b = balanceOn(a, today); if (!b || b.value <= 0n) continue;
      const list = out.get(a.currency) ?? [];
      list.push({id: a.id, name: a.name, owed: toCents(b.value, b.decimals), on: b.date, ...(a.ratePercent ? {accountRate: a.ratePercent} : {})});
      out.set(a.currency, list);
    }
    return out;
  }, [accounts.loaded, accounts.unreadable, accounts.data.items, today]);
  const currencies = [...byCurrency.keys()].sort();
  const currency = currencyPick ?? (stored.data.currency && byCurrency.has(stored.data.currency) ? stored.data.currency : currencies[0]) ?? 'EUR';
  useEffect(() => {
    if (!stored.loaded || draft) return;
    const s = stored.data, minimums: Record<string, string> = {}, rates: Record<string, string> = {};
    for (const [k, v] of Object.entries(s.debts ?? {})) { if (v.minimum) minimums[k] = v.minimum; if (v.ratePercent) rates[k] = v.ratePercent; }
    queueMicrotask(() => setDraft({extra: s.extra ?? '', minimums, rates}));
  }, [stored.loaded, stored.data, draft]);
  const d = draft ?? {extra: '', minimums: {}, rates: {}};
  const rows = example ? [] : byCurrency.get(currency) ?? [];
  const extraCents = d.extra.trim() === '' ? 0n : parseCents(d.extra);
  // The plan's inputs, or the first field that is missing (unknown is never zero).
  const input = ((): {debts: PlanDebt[]; issue: string | null} => {
    if (example) return {debts: [...EXAMPLE_DEBTS], issue: extraCents === null ? 'Enter the extra amount a month as a number, for example 100.' : null};
    const debts: PlanDebt[] = [];
    for (const r of rows) {
      const rate = r.accountRate ?? d.rates[r.id]?.trim() ?? '', min = d.minimums[r.id]?.trim() ?? '';
      if (!rate) return {debts, issue: `Enter the yearly rate for ${r.name}, your own figure from your statement.`};
      if (rateE4(rate) === null) return {debts, issue: `The yearly rate for ${r.name} is a number from 0 to 100.`};
      if (!min) return {debts, issue: `Enter the minimum monthly payment for ${r.name}, from your statement.`};
      const minimum = parseCents(min);
      if (minimum === null || minimum <= 0n) return {debts, issue: `The minimum monthly payment for ${r.name} is an amount above zero, for example 25.00.`};
      debts.push({id: r.id, name: r.name, balance: r.owed, ratePercent: rate, minimum});
    }
    if (extraCents === null) return {debts, issue: 'Enter the extra amount a month as a number, for example 100, or leave it empty.'};
    return {debts, issue: planIssue(debts, extraCents)};
  })();
  // Three plans of at most 1,200 months each: a few milliseconds, worked out on each change (the compiler memoizes).
  const comparison: PlanComparison | null = input.issue || !input.debts.length ? null : comparePlans(input.debts, example ? (extraCents ?? EXAMPLE_EXTRA) : extraCents ?? 0n);
  const shown = example ? 'EUR' : currency, money = (cents: bigint) => formatMoney(centsText(cents), shown);
  const setExtra = (value: string) => { setStatus(''); setDraft(x => ({...(x ?? d), extra: value})); };
  const setField = (kind: 'minimums' | 'rates', rowId: string) => (e: {target: {value: string}}) => { setStatus(''); setDraft(x => { const base = x ?? d; return {...base, [kind]: {...base[kind], [rowId]: e.target.value}}; }); };
  const keep = () => {
    try {
      stored.update(r => {
        const debts = {...(r.debts ?? {})};
        for (const row of rows) {
          const min = d.minimums[row.id]?.trim(), rate = row.accountRate ? undefined : d.rates[row.id]?.trim();
          const minimum = min && parseCents(min) !== null ? centsText(parseCents(min)!) : undefined;
          const next = {...(minimum ? {minimum} : {}), ...(rate && rateE4(rate) !== null ? {ratePercent: rate.replace(',', '.')} : {})};
          if (Object.keys(next).length) debts[row.id] = next; else delete debts[row.id];
        }
        // Debts that are no longer in the accounts are dropped.
        const live = new Set(accounts.data.items.map(a => a.id));
        for (const k of Object.keys(debts)) if (!live.has(k)) delete debts[k];
        const {extra: _e, ...rest} = r; void _e;
        return {...rest, currency, debts, ...(extraCents !== null && extraCents > 0n ? {extra: centsText(extraCents)} : {})};
      });
      setStatus('These figures are kept on this device.');
    } catch (cause) { setStatus(plainErrorMessage(cause, 'Not kept on this device.')); }
  };
  const forget = () => { try { stored.clear(); setDraft({extra: '', minimums: {}, rates: {}}); setStatus('The kept figures are removed from this device.'); } catch { setStatus('Not removed.'); } };
  const hasDebts = byCurrency.size > 0;

  return <section className="money-panel debt-planner" aria-labelledby={`${id}-title`}>
    <p className="eyebrow">A MODEL, NOT ADVICE</p>
    <h3 id={`${id}-title`}>Paying off debts: snowball or avalanche</h3>
    <p className="fine">Two common orders for paying off several debts. <strong>Snowball</strong>: pay the minimums, and put every extra amount on the smallest balance first. <strong>Avalanche</strong>: the same, but the highest rate first. When a debt is cleared, its minimum rolls on to the next one.</p>
    {!accounts.loaded ? <p className="fine" aria-busy="true">Reading your debts…</p>
      : accounts.unreadable ? <p role="alert">Your accounts on this device could not be read, so the planner cannot use them. Nothing was changed.</p>
      : !hasDebts && !example ? <div className="debt-planner-empty">
        <p><strong>No debts with a balance yet.</strong> Add a loan, mortgage or credit card under Wealth → Accounts, debts &amp; net worth, with what you owe and your yearly rate. Then come back here to compare the two orders and see when you could be debt-free.</p>
        <div className="money-actions"><button type="button" className="secondary" onClick={() => { setExample(true); setDraft(x => ({...(x ?? d), extra: x?.extra || centsText(EXAMPLE_EXTRA)})); }}>Try it with example figures</button></div>
      </div>
      : <>
        {example ? <p className="notice debt-planner-example" role="note">Example figures, not yours: three fictional debts in euros. Nothing here is stored. {hasDebts && <button type="button" className="text-link" onClick={() => setExample(false)}>Use my debts instead</button>}{!hasDebts && <button type="button" className="text-link" onClick={() => setExample(false)}>Close the example</button>}</p>
          : currencies.length > 1 && <label className="field debt-planner-currency"><span>Debts in</span><select value={currency} onChange={e => { setCurrencyPick(e.target.value); setStatus(''); }}>{currencies.map(c => <option key={c} value={c}>{c}</option>)}</select></label>}
        {currencies.length > 1 && !example && <p className="fine">Each currency is planned on its own; amounts are never converted.</p>}
        <ul className="debt-planner-list" aria-label="Your debts">
          {(example ? EXAMPLE_DEBTS.map(e => ({id: e.id, name: e.name, owed: e.balance, on: today, accountRate: e.ratePercent, minimum: e.minimum})) : rows).map(r => <li key={r.id} className="debt-planner-row">
            <div className="debt-planner-what"><strong>{r.name}</strong><small>{money(r.owed)} owed{example ? '' : ` on ${formatDate(r.on)}`}{r.accountRate ? ` · ${r.accountRate} % a year${example ? '' : ' (your figure)'}` : ''}</small></div>
            {'minimum' in r ? <p className="fine debt-planner-fixed">Minimum {money(r.minimum as bigint)} a month</p> : <div className="debt-planner-fields">
              {!r.accountRate && <label className="field"><span>Yearly rate for {r.name} (%)</span><input inputMode="decimal" autoComplete="off" enterKeyHint="next" value={d.rates[r.id] ?? ''} onChange={setField('rates', r.id)} placeholder="from your statement"/></label>}
              <label className="field"><span>Minimum a month for {r.name} ({currency})</span><input inputMode="decimal" autoComplete="off" enterKeyHint="next" value={d.minimums[r.id] ?? ''} onChange={setField('minimums', r.id)} placeholder="from your statement"/></label>
            </div>}
          </li>)}
        </ul>
        <label className="field debt-planner-extra"><span>Extra each month, on top of the minimums ({shown})</span><input inputMode="decimal" autoComplete="off" enterKeyHint="done" value={d.extra} onChange={e => setExtra(e.target.value)} placeholder="0"/></label>
        {input.issue ? <p role="status" className="debt-planner-issue">{input.issue}</p> : comparison && <Results c={comparison} money={money} today={today}/>}
        {!example && <div className="money-actions">
          <button type="button" className="secondary" disabled={!stored.loaded || stored.unreadable || !rows.length} onClick={keep}>Keep these figures on this device</button>
          {(stored.data.extra || stored.data.debts) && <button type="button" className="quiet" onClick={forget}>Forget them</button>}
        </div>}
        <p className="fine">A model, not advice. It assumes your rates and payments stay the same, interest is added each month at your yearly rate ÷ 12, and nothing new is borrowed. Your lender&rsquo;s figures can differ. Nothing here moves money.</p>
      </>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
  </section>;
}

function Results({c, money, today}: {c: PlanComparison; money: (cents: bigint) => string; today: string}) {
  const month = (r: PlanResult) => { const m = payoffMonth(today, r.months); return m ? formatMonth(m) : null; };
  const card = (r: PlanResult, title: string, how: string, saved: bigint | null) => <article className="debt-plan-card" aria-label={title}>
    <h4>{title}</h4><p className="fine">{how}</p>
    {r.months === null ? <p>Not cleared within 100 years with these payments.</p> : <>
      <p className="debt-plan-date">Debt-free by <strong>{month(r)}</strong></p>
      <p className="fine">after {months(r.months)}</p>
      <dl><div><dt>Interest</dt><dd>{money(r.totalInterest)}</dd></div>
        <div><dt>Saved against minimums only</dt><dd>{saved === null ? (c.minimums.months === null ? 'Minimums alone do not clear it' : '—') : money(saved)}</dd></div></dl>
    </>}
  </article>;
  return <div className="debt-plan-results">
    <p className="debt-plan-summary" aria-live="polite">{comparisonWords(c, money)}</p>
    <div className="debt-plan-cards">
      {card(c.snowball, 'Snowball', 'Smallest balance first', c.savedSnowball)}
      {card(c.avalanche, 'Avalanche', 'Highest rate first', c.savedAvalanche)}
    </div>
    <p className="fine">Minimums only: {c.minimums.months === null ? 'not cleared within 100 years' : <>debt-free by {month(c.minimums)} ({months(c.minimums.months)}), {money(c.minimums.totalInterest)} in interest</>}.</p>
    <Chart c={c} money={money} today={today}/>
    <details className="debt-plan-order"><summary>When each debt is paid off</summary>
      <div className="money-table-wrap"><table className="money-table"><caption className="fine">The month each debt is cleared, an estimate</caption>
        <thead><tr><th scope="col">Debt</th><th scope="col">Snowball</th><th scope="col">Avalanche</th></tr></thead>
        <tbody>{c.avalanche.order.map(debtId => { const at = (r: PlanResult) => { const p = r.payoffs.find(x => x.id === debtId); return p ? formatMonth(addMonths(firstPaymentMonth(today), p.month - 1)) : 'Not within 100 years'; };
          const name = c.avalanche.payoffs.find(p => p.id === debtId)?.name ?? c.snowball.payoffs.find(p => p.id === debtId)?.name ?? c.minimums.payoffs.find(p => p.id === debtId)?.name ?? '';
          return <tr key={debtId}><th scope="row">{name || 'A debt'}</th><td>{at(c.snowball)}</td><td>{at(c.avalanche)}</td></tr>; })}</tbody></table></div>
    </details>
  </div>;
}

function Chart({c, money, today}: {c: PlanComparison; money: (cents: bigint) => string; today: string}) {
  const longest = Math.max(c.snowball.balances.length, c.avalanche.balances.length) - 1;
  const span = Math.max(1, Math.min(c.minimums.months ?? longest * 3, longest * 3, 1200)), start = c.avalanche.balances[0]!;
  const top = Number(start) || 1, x = (m: number) => PAD + (W - 2 * PAD) * Math.min(m, span) / span, y = (v: bigint) => H - PAD - (H - PAD - TOP) * Math.min(Number(v), top) / top;
  const path = (values: readonly bigint[]) => { const n = Math.min(values.length - 1, span), step = Math.max(1, Math.ceil(n / 240)), pts: string[] = [];
    for (let m = 0; m <= n; m += step) pts.push(`${pts.length ? 'L' : 'M'}${x(m).toFixed(1)} ${y(values[m]!).toFixed(1)}`);
    if (n % step) pts.push(`L${x(n).toFixed(1)} ${y(values[n]!).toFixed(1)}`);
    return pts.join(' '); };
  const end = formatMonth(addMonths(firstPaymentMonth(today), span - 1));
  return <figure className="debt-plan-chart">
    <svg className="money-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`What you owe over time, from ${money(start)} today. Snowball reaches zero ${c.snowball.months === null ? 'not within 100 years' : `after ${months(c.snowball.months)}`}; avalanche ${c.avalanche.months === null ? 'not within 100 years' : `after ${months(c.avalanche.months)}`}; minimums only ${c.minimums.months === null ? 'not within 100 years' : `after ${months(c.minimums.months)}`}.`}>
      <line className="money-chart-axis" x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD}/>
      <path className="debt-chart-min" d={path(c.minimums.balances)}/>
      <path className="money-chart-a" d={path(c.snowball.balances)}/>
      <path className="money-chart-b" d={path(c.avalanche.balances)}/>
      <text x={PAD} y={12}>{money(start)}</text>
      <text x={PAD} y={H - 1} className="debt-chart-tick">Now</text>
      <text x={W - PAD} y={H - 1} textAnchor="end" className="debt-chart-tick">{end}</text>
    </svg>
    <figcaption className="fine money-legend"><span className="money-key money-key-a" aria-hidden="true"/>Snowball <span className="money-key money-key-b" aria-hidden="true"/>Avalanche, dashed <span className="money-key debt-key-min" aria-hidden="true"/>Minimums only, dotted{c.minimums.months === null || c.minimums.months > span ? ' (continues past the chart)' : ''}</figcaption>
  </figure>;
}
