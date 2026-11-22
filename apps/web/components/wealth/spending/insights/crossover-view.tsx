'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {logSpec} from '../../../../lib/money-more/spaces';
import {CROSSOVER_MONTHS, crossover, incomeCategoriesUsed, isMarked, withInvestMark} from '../../../../lib/money-insights/crossover';
import {formatPercent} from '../../../../lib/visual-format';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AV lane 2, round 4 (money; Actual's crossover report, LEDGER #345): under Month by month, "Investment income
 * beside spending" — the person marks the income categories that are investment income (interest, dividends, staking
 * rewards; kept on the space's own money log, `investIncome`); each of the last 24 months then sets that income beside
 * the month's spending, as a share ("covers 6 % of spending"), per currency, with a table. Facts from their own records:
 * no projection, no "years to freedom" (that stays the FI model, labelled a model), never a target. Figures:
 * lib/money-insights/crossover.ts (`byCategory` for the marked income, `totals` for spending).
 */
const pct = (share: number | null) => share === null ? '—' : formatPercent(share * 100, {decimals: share < 0.1 && share > 0 ? 1 : 0});
export default function CrossoverView({entries, today, space = 'personal'}: InsightProps) {
  const id = useId(), log = useDeviceRecord(logSpec(space)), [note, setNote] = useState('');
  const marks = log.data.investIncome, cats = useMemo(() => incomeCategoriesUsed(entries, marks ?? []), [entries, marks]);
  const currencies = useMemo(() => [...new Set(entries.filter(e => e.date <= today).map(e => e.currency))].sort(), [entries, today]);
  const rows = useMemo(() => marks?.length ? currencies.map(c => crossover(entries, marks, c, today)).filter(r => r.recordedMonths > 0 && (r.invest > 0 || r.spending > 0)) : [], [entries, marks, currencies, today]);
  if (!log.loaded) return null;
  const toggle = (c: string, on: boolean) => { try { log.update(l => withInvestMark(l, c, on)); setNote(on ? `${c} is marked as investment income.` : `${c} is no longer marked.`); } catch (e) { setNote(e instanceof Error ? e.message : 'This could not be saved on this device.'); } };
  return <section className="money-insights-currency money-cross" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Investment income beside spending</h4>
    {!cats.length ? <p className="fine">Log interest, dividends or staking rewards as money received (in their own category, such as Interest), then mark that category here to see how much of each month’s spending it covers.</p> : <>
      <fieldset className="money-cross-marks"><legend className="fine">Which income is investment income? Your own choice.</legend>
        {cats.map(c => <label key={c}><input type="checkbox" checked={isMarked(marks, c)} onChange={e => toggle(c, e.target.checked)}/><span>{c}</span></label>)}
      </fieldset>
      <p className="fine" role="status">{note}</p>
      {!marks?.length ? <p className="fine">Mark the categories that are investment income (interest, dividends, staking rewards) to set them beside your spending each month.</p>
      : !rows.length ? <p className="fine">Nothing logged in the last {CROSSOVER_MONTHS} months in the marked categories or as spending yet.</p>
      : rows.map(r => <div key={r.currency} className="money-saved-chart">
        <p className="money-saved-total">{r.currency}, the last {CROSSOVER_MONTHS} months ({r.recordedMonths} with records): <strong data-private-amount>{money(r.invest, r.currency)}</strong> investment income beside <strong data-private-amount>{money(r.spending, r.currency)}</strong> spending{r.share !== null ? ` — it covers ${pct(r.share)} of spending` : ''}.{r.latest && r.latest.share !== null ? ` In ${monthName(r.latest.month)}: ${pct(r.latest.share)}.` : ''}</p>
        <table className="money-insights-table">
          <caption>Investment income beside spending in {r.currency}, month by month</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Investment income</th><th scope="col">Spending</th><th scope="col">Covers</th></tr></thead>
          <tbody>{[...r.months].reverse().map(m => m.recorded ? <tr key={m.month}><th scope="row">{monthName(m.month)}</th><td data-private-amount>{money(m.invest, r.currency)}</td><td data-private-amount>{money(m.spending, r.currency)}</td><td>{pct(m.share)}</td></tr>
            : <tr key={m.month} className="money-insights-gap"><th scope="row">{monthName(m.month)}</th><td colSpan={3}>No records</td></tr>)}</tbody>
        </table>
      </div>)}
      <p className="fine">Your own records and marks, month by month (a cost spread over months counts its share in each month, as your budgets do); not a forecast and not advice. The Financial freedom model in Money tools is where a projection lives, labelled as a model.</p>
    </>}
  </section>;
}
